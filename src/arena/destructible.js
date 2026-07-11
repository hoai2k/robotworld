// Chunk-based destructible buildings + instanced debris simulation.
// Buildings are hollow shells of box chunks in a global InstancedMesh;
// destroyed chunks turn into ballistic debris instances, unsupported
// chunks cascade-collapse.
import * as THREE from 'three';
import { rand, makeRng } from '../core/utils.js';

// segment vs AABB (slab method), with padding
function segmentHitsAabb(from, to, a, pad = 0) {
  let tMin = 0, tMax = 1;
  const lo = [a.minX - pad, a.minY - pad, a.minZ - pad];
  const hi = [a.maxX + pad, a.maxY + pad, a.maxZ + pad];
  const f = [from.x, from.y, from.z];
  const d = [to.x - from.x, to.y - from.y, to.z - from.z];
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-8) {
      if (f[i] < lo[i] || f[i] > hi[i]) return false;
    } else {
      let t1 = (lo[i] - f[i]) / d[i];
      let t2 = (hi[i] - f[i]) / d[i];
      if (t1 > t2) { const tmp = t1; t1 = t2; t2 = tmp; }
      tMin = Math.max(tMin, t1);
      tMax = Math.min(tMax, t2);
      if (tMin > tMax) return false;
    }
  }
  return true;
}

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();

export class DestructibleSystem {
  constructor(scene, material, capacity = 1400) {
    this.scene = scene;
    this.capacity = capacity;      // per-cell chunk budget
    // toroidal arenas: every chunk gets 8 ghost copies in the neighbor
    // cells (index blocks of `capacity`), so the city is visible across
    // the wrap seam. Ghosts activate when setWrapPeriod() is called.
    this.totalCap = capacity * 9;
    this.wrapPeriod = 0;
    this.ghostOffsets = [];

    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.mesh = new THREE.InstancedMesh(geo, material, this.totalCap);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    _m.compose(_p.set(0, -500, 0), _q.identity(), _s.set(0.0001, 0.0001, 0.0001));
    for (let i = 0; i < this.totalCap; i++) this.mesh.setMatrixAt(i, _m);
    this.mesh.count = this.totalCap;
    scene.add(this.mesh);

    this.chunks = [];      // {x,y,z (center), w,h,d, alive, bIdx, gx,gy,gz, hp}
    this.buildings = [];   // {gridIndex Map "gx,gy,gz"->chunk, aabb, chunkCount}
    this.count = 0;

    // debris ring buffer
    const DEB = 340;
    this.debris = {
      mesh: new THREE.InstancedMesh(geo, (Array.isArray(material) ? material[0] : material).clone(), DEB),
      pos: new Float32Array(DEB * 3),
      vel: new Float32Array(DEB * 3),
      rot: new Float32Array(DEB * 3),
      rotVel: new Float32Array(DEB * 3),
      scale: new Float32Array(DEB * 3),
      life: new Float32Array(DEB),
      head: 0,
      cap: DEB,
    };
    this.debris.mesh.castShadow = true;
    this.debris.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.debris.mesh.frustumCulled = false;
    scene.add(this.debris.mesh);
    for (let i = 0; i < DEB; i++) {
      _m.compose(_p.set(0, -100, 0), _q.identity(), _s.set(0.001, 0.001, 0.001));
      this.debris.mesh.setMatrixAt(i, _m);
    }
    this.pendingCollapse = []; // {chunk, t}
    this.world = null;

    // ---- camera see-through: per-instance dither fade ----
    // buildings between a follow-cam and its mech ghost to ~25% coverage so
    // the player never loses their mech behind cover. Dithered discard (no
    // alpha blending) keeps instancing + depth simple.
    // NOTE: patched AFTER the debris material clone so debris stays solid.
    this.fadeAttr = new THREE.InstancedBufferAttribute(new Float32Array(this.totalCap).fill(1), 1);
    this.mesh.geometry.setAttribute('aFade', this.fadeAttr);
    const mats = Array.isArray(material) ? [...new Set(material)] : [material];
    for (const mat of mats) {
      mat.onBeforeCompile = (shader) => {
        shader.vertexShader = shader.vertexShader
          .replace('#include <common>', '#include <common>\nattribute float aFade;\nvarying float vFade;')
          .replace('#include <begin_vertex>', '#include <begin_vertex>\nvFade = aFade;');
        shader.fragmentShader = shader.fragmentShader
          .replace('#include <common>', '#include <common>\nvarying float vFade;')
          .replace('#include <clipping_planes_fragment>', `
    if (vFade < 0.999) {
      float dgd = fract(sin(dot(floor(gl_FragCoord.xy), vec2(12.9898, 78.233))) * 43758.5453);
      if (dgd > vFade) discard;
    }
    #include <clipping_planes_fragment>`);
      };
    }
  }

  // Activate ghost tiling for a toroidal arena of the given period.
  setWrapPeriod(P) {
    this.wrapPeriod = P;
    this.ghostOffsets = [];
    for (let gx = -1; gx <= 1; gx++) {
      for (let gz = -1; gz <= 1; gz++) {
        if (gx || gz) this.ghostOffsets.push([gx * P, gz * P]);
      }
    }
    for (const c of this.chunks) {
      if (c.alive) this.writeChunk(c);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
  }

  // write a chunk's matrix (and its 8 ghost copies)
  writeChunk(chunk) {
    _m.compose(
      _p.set(chunk.x, chunk.y, chunk.z), _q.identity(),
      _s.set(chunk.w * 1.001, chunk.h * 1.001, chunk.d * 1.001)
    );
    this.mesh.setMatrixAt(chunk.i, _m);
    for (let g = 0; g < this.ghostOffsets.length; g++) {
      _m.compose(
        _p.set(chunk.x + this.ghostOffsets[g][0], chunk.y, chunk.z + this.ghostOffsets[g][1]),
        _q.identity(),
        _s.set(chunk.w * 1.001, chunk.h * 1.001, chunk.d * 1.001)
      );
      this.mesh.setMatrixAt(this.capacity * (g + 1) + chunk.i, _m);
    }
  }

  writeFade(b, v) {
    for (const chunk of b.grid.values()) {
      if (!chunk.alive) continue;
      this.fadeAttr.array[chunk.i] = v;
      for (let g = 1; g <= 8; g++) this.fadeAttr.array[this.capacity * g + chunk.i] = v;
    }
    this.fadeAttr.needsUpdate = true;
  }

  hideChunk(chunk) {
    _m.compose(_p.set(0, -500, 0), _q.identity(), _s.set(0.0001, 0.0001, 0.0001));
    this.mesh.setMatrixAt(chunk.i, _m);
    for (let g = 0; g < 8; g++) {
      this.mesh.setMatrixAt(this.capacity * (g + 1) + chunk.i, _m);
    }
  }

  // Fade any building whose AABB crosses a camera->player segment.
  // segments: [{from: Vector3, to: Vector3}], refreshed every frame.
  setOccluders(segments) {
    for (const b of this.buildings) {
      let hit = false;
      if (b.alive > 0) {
        const a = b.aabb;
        for (const s of segments) {
          if (segmentHitsAabb(s.from, s.to, a, 1.5)) { hit = true; break; }
        }
      }
      b.fadeTarget = hit ? 0.15 : 1;
    }
  }

  // Build a hollow tower of chunks. Returns building record.
  addBuilding(cx, cz, nx, ny, nz, cw, ch, cd, { tint = 0xffffff, rng = null } = {}) {
    rng = rng || makeRng((cx * 13 + cz * 7) | 0);
    const b = { grid: new Map(), chunkCount: 0, aabb: null, alive: 0 };
    const w = nx * cw, d = nz * cd;
    const x0 = cx - w / 2, z0 = cz - d / 2;
    for (let gy = 0; gy < ny; gy++) {
      for (let gx = 0; gx < nx; gx++) {
        for (let gz = 0; gz < nz; gz++) {
          // hollow: only shell chunks
          const isShell = gx === 0 || gx === nx - 1 || gz === 0 || gz === nz - 1 || gy === ny - 1;
          if (!isShell) continue;
          if (this.count >= this.capacity) continue;
          const i = this.count++;
          const chunk = {
            i,
            x: x0 + (gx + 0.5) * cw,
            y: (gy + 0.5) * ch,
            z: z0 + (gz + 0.5) * cd,
            w: cw, h: ch, d: cd,
            gx, gy, gz,
            alive: true,
            hp: 30 + rng() * 25,
            b,
          };
          this.chunks.push(chunk);
          b.grid.set(`${gx},${gy},${gz}`, chunk);
          b.chunkCount++;
          b.alive++;
          // slight per-chunk color variance (ghost copies match)
          const v = 1.25 + rng() * 0.3;
          _c.set(tint).multiplyScalar(v);
          this.mesh.setColorAt(i, _c);
          for (let g = 1; g <= 8; g++) this.mesh.setColorAt(this.capacity * g + i, _c);
          this.writeChunk(chunk);
        }
      }
    }
    b.aabb = {
      minX: x0 - 0.5, maxX: x0 + w + 0.5,
      minY: 0, maxY: ny * ch + 0.5,
      minZ: z0 - 0.5, maxZ: z0 + d + 0.5,
    };
    this.buildings.push(b);
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    return b;
  }

  killChunk(chunk, vel = null, silent = false) {
    if (!chunk.alive) return;
    chunk.alive = false;
    chunk.b.alive--;
    this.hideChunk(chunk);
    this.mesh.instanceMatrix.needsUpdate = true;

    // spawn 1-2 debris pieces
    const n = silent ? 1 : 2;
    for (let k = 0; k < n; k++) {
      this.spawnDebris(
        chunk.x + rand(-0.3, 0.3), chunk.y + rand(-0.3, 0.3), chunk.z + rand(-0.3, 0.3),
        (vel ? vel.x * rand(3, 7) : rand(-4, 4)) + rand(-2, 2),
        (vel ? vel.y * rand(2, 5) : 0) + rand(1, 6),
        (vel ? vel.z * rand(3, 7) : rand(-4, 4)) + rand(-2, 2),
        chunk.w * rand(0.3, 0.55), chunk.h * rand(0.3, 0.55), chunk.d * rand(0.3, 0.55)
      );
    }
    if (!silent && this.world) {
      this.world.effects.dustPuff(_p.set(chunk.x, chunk.y, chunk.z), 3, 0x9a9284);
    }

    // unsupported chunks above (this one may have been their diagonal
    // support too) will fall shortly
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const above = chunk.b.grid.get(`${chunk.gx + dx},${chunk.gy + 1},${chunk.gz + dz}`);
      if (above && above.alive && !this.hasSupport(above)) {
        this.pendingCollapse.push({ chunk: above, t: rand(0.06, 0.22) });
      }
    }

    // structural integrity: a building that's lost too much of itself —
    // or most of its ground floor — gives way and falls into rubble
    const b = chunk.b;
    if (!b.collapsing && b.alive > 0) {
      const ratio = b.alive / b.chunkCount;
      let unstable = ratio < 0.45;
      if (!unstable && ratio < 0.9) {
        let base = 0, base0 = 0;
        for (const c of b.grid.values()) {
          if (c.gy === 0) { base0++; if (c.alive) base++; }
        }
        unstable = base0 > 0 && base / base0 < 0.4;
      }
      if (unstable) this.collapseBuilding(b);
    }
  }

  // progressive bottom-up demolition: every remaining chunk falls, floor by
  // floor, so a gutted tower crumbles instead of hovering on nothing
  collapseBuilding(b) {
    if (b.collapsing) return;
    b.collapsing = true;
    for (const c of b.grid.values()) {
      if (!c.alive) continue;
      this.pendingCollapse.push({
        chunk: c, t: 0.1 + c.gy * 0.09 + rand(0, 0.14), force: true,
      });
    }
    if (this.world) {
      this.world.audio?.play('crumbleBig');
      this.world.effects.addShake(0.8);
      const a = b.aabb;
      _p.set((a.minX + a.maxX) / 2, 1, (a.minZ + a.maxZ) / 2);
      this.world.effects.dustPuff(_p, 16, 0x9a9284);
    }
  }

  hasSupport(chunk) {
    const { gx, gy, gz, b } = chunk;
    if (gy === 0) return true;
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = b.grid.get(`${gx + dx},${gy - 1},${gz + dz}`);
      if (c && c.alive) return true;
    }
    return false;
  }

  spawnDebris(x, y, z, vx, vy, vz, sw, sh, sd) {
    const D = this.debris;
    const i = D.head;
    D.head = (D.head + 1) % D.cap;
    D.pos[i * 3] = x; D.pos[i * 3 + 1] = y; D.pos[i * 3 + 2] = z;
    D.vel[i * 3] = vx; D.vel[i * 3 + 1] = vy; D.vel[i * 3 + 2] = vz;
    D.rot[i * 3] = rand(Math.PI * 2); D.rot[i * 3 + 1] = rand(Math.PI * 2); D.rot[i * 3 + 2] = 0;
    D.rotVel[i * 3] = rand(-6, 6); D.rotVel[i * 3 + 1] = rand(-6, 6); D.rotVel[i * 3 + 2] = rand(-6, 6);
    D.scale[i * 3] = sw; D.scale[i * 3 + 1] = sh; D.scale[i * 3 + 2] = sd;
    D.life[i] = rand(2.6, 4);
  }

  // ---- queries ----
  pointHits(p) {
    for (const b of this.buildings) {
      if (b.alive <= 0) continue;
      const a = b.aabb;
      if (p.x < a.minX || p.x > a.maxX || p.y < a.minY || p.y > a.maxY || p.z < a.minZ || p.z > a.maxZ) continue;
      for (const c of b.grid.values()) {
        if (!c.alive) continue;
        if (Math.abs(p.x - c.x) < c.w / 2 && Math.abs(p.y - c.y) < c.h / 2 && Math.abs(p.z - c.z) < c.d / 2) return c;
      }
    }
    return null;
  }

  raySolid(origin, dir, range, step = 1.4) {
    const d = _p.copy(dir).normalize();
    for (let t = step; t < range; t += step) {
      const x = origin.x + d.x * t, y = origin.y + d.y * t, z = origin.z + d.z * t;
      const c = this.pointHits({ x, y, z });
      if (c) return { point: new THREE.Vector3(x, y, z), chunk: c, t };
      if (y < 0) return null;
    }
    return null;
  }

  damageSphere(pos, radius, dmg, dir = null, structural = false) {
    let destroyed = 0;
    for (const b of this.buildings) {
      if (b.alive <= 0) continue;
      const a = b.aabb;
      if (pos.x < a.minX - radius || pos.x > a.maxX + radius ||
          pos.y < a.minY - radius || pos.y > a.maxY + radius ||
          pos.z < a.minZ - radius || pos.z > a.maxZ + radius) continue;
      for (const c of b.grid.values()) {
        if (!c.alive) continue;
        const dx = c.x - pos.x, dy = c.y - pos.y, dz = c.z - pos.z;
        const d2 = dx * dx + dy * dy + dz * dz;
        if (d2 < radius * radius) {
          c.hp -= dmg * (1 - Math.sqrt(d2) / (radius * 1.4));
          if (c.hp <= 0) {
            const v = dir || _p.set(dx, dy * 0.4 + 0.4, dz).normalize();
            this.killChunk(c, v);
            destroyed++;
          }
        }
      }
    }
    if (destroyed > 2 && this.world) {
      this.world.audio?.play(destroyed > 8 ? 'crumbleBig' : 'crumble');
      this.world.effects.addShake(Math.min(0.6, destroyed * 0.04));
    }
    return destroyed;
  }

  // Fighter vs buildings: horizontal AABB pushout for walls PLUS rooftop
  // support — mechs land on and fight across exposed chunk tops.
  collideFighter(f) {
    let support = -Infinity;
    for (const b of this.buildings) {
      if (b.alive <= 0) continue;
      const a = b.aabb;
      if (f.pos.x < a.minX - f.radius || f.pos.x > a.maxX + f.radius ||
          f.pos.z < a.minZ - f.radius || f.pos.z > a.maxZ + f.radius ||
          f.pos.y > a.maxY + 1) continue;
      for (const c of b.grid.values()) {
        if (!c.alive) continue;
        const top = c.y + c.h / 2;
        const hw = c.w / 2 + f.radius, hd = c.d / 2 + f.radius;
        const dx = f.pos.x - c.x, dz = f.pos.z - c.z;
        if (Math.abs(dx) >= hw || Math.abs(dz) >= hd) continue;
        // feet at/above an EXPOSED top while descending: that's a floor.
        // (chunks with a live chunk directly above are wall interior — no
        // footing, or falling mechs would stick to facades)
        if (f.pos.y >= top - 0.9 && f.vel.y <= 0.01) {
          const above = b.grid.get(`${c.gx},${c.gy + 1},${c.gz}`);
          if ((!above || !above.alive) &&
              Math.abs(dx) < c.w / 2 + f.radius * 0.4 &&
              Math.abs(dz) < c.d / 2 + f.radius * 0.4) {
            support = Math.max(support, top);
          }
          continue;
        }
        // vertical overlap of capsule with chunk → side pushout
        if (f.pos.y > top || f.pos.y + f.height < c.y - c.h / 2) continue;
        const px = hw - Math.abs(dx), pz = hd - Math.abs(dz);
        if (px < pz) { f.pos.x += Math.sign(dx || 1) * px; f.vel.x *= 0.4; }
        else { f.pos.z += Math.sign(dz || 1) * pz; f.vel.z *= 0.4; }
      }
    }
    // stand on the highest rooftop found underfoot
    if (support > -Infinity && f.pos.y <= support + 0.9) {
      const fallSpeed = -f.vel.y;
      f.pos.y = support;
      if (f.vel.y < 0) f.vel.y = 0;
      if (!f.grounded) {
        f.grounded = true;
        if (fallSpeed > 9 && this.world) {
          this.world.effects.dustPuff(f.pos, Math.min(16, fallSpeed));
          this.world.audio?.play('land');
        }
      }
    }
  }

  update(dt) {
    // camera see-through fades ease toward their targets
    const fk = 1 - Math.exp(-10 * dt);
    for (const b of this.buildings) {
      const target = b.fadeTarget ?? 1;
      const cur = b.fade ?? 1;
      if (Math.abs(cur - target) > 0.005) {
        b.fade = cur + (target - cur) * fk;
        this.writeFade(b, b.fade);
      } else if (b.fade !== target) {
        b.fade = target;
        this.writeFade(b, target);
      }
    }

    // pending collapses cascade
    for (let i = this.pendingCollapse.length - 1; i >= 0; i--) {
      const pc = this.pendingCollapse[i];
      pc.t -= dt;
      if (pc.t <= 0) {
        this.pendingCollapse.splice(i, 1);
        if (pc.chunk.alive && (pc.force || !this.hasSupport(pc.chunk))) {
          this.killChunk(pc.chunk, _p.set(0, -0.5, 0), true);
        }
      }
    }

    // debris sim
    const D = this.debris;
    let any = false;
    for (let i = 0; i < D.cap; i++) {
      if (D.life[i] <= 0) continue;
      any = true;
      D.life[i] -= dt;
      D.vel[i * 3 + 1] -= 30 * dt;
      let x = D.pos[i * 3] + D.vel[i * 3] * dt;
      let y = D.pos[i * 3 + 1] + D.vel[i * 3 + 1] * dt;
      let z = D.pos[i * 3 + 2] + D.vel[i * 3 + 2] * dt;
      const hh = D.scale[i * 3 + 1] / 2;
      if (y < hh) {
        y = hh;
        D.vel[i * 3 + 1] *= -0.3;
        D.vel[i * 3] *= 0.6;
        D.vel[i * 3 + 2] *= 0.6;
        D.rotVel[i * 3] *= 0.5; D.rotVel[i * 3 + 1] *= 0.5; D.rotVel[i * 3 + 2] *= 0.5;
      }
      D.pos[i * 3] = x; D.pos[i * 3 + 1] = y; D.pos[i * 3 + 2] = z;
      D.rot[i * 3] += D.rotVel[i * 3] * dt;
      D.rot[i * 3 + 2] += D.rotVel[i * 3 + 2] * dt;
      const fade = Math.min(1, D.life[i] / 0.6);
      _e.set(D.rot[i * 3], D.rot[i * 3 + 1], D.rot[i * 3 + 2]);
      _m.compose(
        _p.set(x, y, z),
        _q.setFromEuler(_e),
        _s.set(D.scale[i * 3] * fade, D.scale[i * 3 + 1] * fade, D.scale[i * 3 + 2] * fade)
      );
      D.mesh.setMatrixAt(i, _m);
    }
    if (any) D.mesh.instanceMatrix.needsUpdate = true;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.scene.remove(this.debris.mesh);
    this.mesh.dispose();
    this.debris.mesh.dispose();
  }
}
