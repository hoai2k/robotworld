// Chunk-based destructible buildings + instanced debris simulation.
// Buildings are hollow shells of box chunks in a global InstancedMesh;
// destroyed chunks turn into ballistic debris instances, unsupported
// chunks cascade-collapse.
import * as THREE from 'three';
import { rand, makeRng } from '../core/utils.js';

const _m = new THREE.Matrix4();
const _q = new THREE.Quaternion();
const _p = new THREE.Vector3();
const _s = new THREE.Vector3();
const _e = new THREE.Euler();
const _c = new THREE.Color();

export class DestructibleSystem {
  constructor(scene, material, capacity = 2600) {
    this.scene = scene;
    this.capacity = capacity;

    const geo = new THREE.BoxGeometry(1, 1, 1);
    this.mesh = new THREE.InstancedMesh(geo, material, capacity);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.mesh.frustumCulled = false;
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
          // slight per-chunk color variance
          const v = 1.25 + rng() * 0.3;
          _c.set(tint).multiplyScalar(v);
          this.mesh.setColorAt(i, _c);
          _m.compose(
            _p.set(chunk.x, chunk.y, chunk.z),
            _q.identity(),
            _s.set(cw * 1.001, ch * 1.001, cd * 1.001)
          );
          this.mesh.setMatrixAt(i, _m);
        }
      }
    }
    b.aabb = {
      minX: x0 - 0.5, maxX: x0 + w + 0.5,
      minY: 0, maxY: ny * ch + 0.5,
      minZ: z0 - 0.5, maxZ: z0 + d + 0.5,
    };
    this.buildings.push(b);
    this.mesh.count = this.count;
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.mesh.instanceColor) this.mesh.instanceColor.needsUpdate = true;
    return b;
  }

  killChunk(chunk, vel = null, silent = false) {
    if (!chunk.alive) return;
    chunk.alive = false;
    chunk.b.alive--;
    _m.compose(_p.set(0, -500, 0), _q.identity(), _s.set(0.001, 0.001, 0.001));
    this.mesh.setMatrixAt(chunk.i, _m);
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

    // unsupported chunks above will fall shortly
    const above = chunk.b.grid.get(`${chunk.gx},${chunk.gy + 1},${chunk.gz}`);
    if (above && above.alive) {
      const below = above.gy === 0 ? true : this.hasSupport(above);
      if (!below) this.pendingCollapse.push({ chunk: above, t: rand(0.06, 0.22) });
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

  // AABB pushout for fighter capsule (2D + head check)
  collideFighter(f) {
    for (const b of this.buildings) {
      if (b.alive <= 0) continue;
      const a = b.aabb;
      if (f.pos.x < a.minX - f.radius || f.pos.x > a.maxX + f.radius ||
          f.pos.z < a.minZ - f.radius || f.pos.z > a.maxZ + f.radius ||
          f.pos.y > a.maxY) continue;
      for (const c of b.grid.values()) {
        if (!c.alive) continue;
        // vertical overlap of capsule with chunk
        if (f.pos.y > c.y + c.h / 2 || f.pos.y + f.height < c.y - c.h / 2) continue;
        const hw = c.w / 2 + f.radius, hd = c.d / 2 + f.radius;
        const dx = f.pos.x - c.x, dz = f.pos.z - c.z;
        if (Math.abs(dx) < hw && Math.abs(dz) < hd) {
          const px = hw - Math.abs(dx), pz = hd - Math.abs(dz);
          if (px < pz) { f.pos.x += Math.sign(dx || 1) * px; f.vel.x *= 0.4; }
          else { f.pos.z += Math.sign(dz || 1) * pz; f.vel.z *= 0.4; }
        }
      }
    }
  }

  update(dt) {
    // pending collapses cascade
    for (let i = this.pendingCollapse.length - 1; i >= 0; i--) {
      const pc = this.pendingCollapse[i];
      pc.t -= dt;
      if (pc.t <= 0) {
        this.pendingCollapse.splice(i, 1);
        if (pc.chunk.alive && !this.hasSupport(pc.chunk)) {
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
