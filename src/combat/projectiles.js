// Pooled projectiles: bullets, rockets, homing missiles, plasma, darts,
// waves, shells, mortars, ice shards + hitscan helpers (rail, lightning).
import * as THREE from 'three';
import { rand, clamp } from '../core/utils.js';

const _v = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _probe = new THREE.Vector3();

const VISUALS = {
  bullet: { geo: () => new THREE.SphereGeometry(0.22, 6, 5), scaleZ: 4, light: false },
  rocket: { geo: () => new THREE.CylinderGeometry(0.16, 0.28, 1.4, 8), rot: true, trail: 'smoke' },
  missile: { geo: () => new THREE.CylinderGeometry(0.1, 0.16, 0.9, 6), rot: true, trail: 'smoke' },
  plasma: { geo: () => new THREE.SphereGeometry(0.55, 10, 8), pulse: true, trail: 'glow' },
  glob: { // FROGGER: lumpy gel wad — normally blended MATTER, not a light ball
    geo: () => {
      const g = new THREE.IcosahedronGeometry(0.52, 2);
      const pos = g.attributes.position;
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
        const n = 1 + 0.26 * Math.sin(x * 7.1 + 1) * Math.sin(y * 6.3 + 2) * Math.sin(z * 5.7 + 3);
        pos.setXYZ(i, x * n, y * n, z * n);
      }
      g.computeVertexNormals();
      return g;
    },
    pulse: true, rot: true, normalBlend: true,
  },
  dart: { geo: () => new THREE.ConeGeometry(0.09, 1.1, 6), rot: true },
  blade: { // VIPER: a thrown energy sword tumbling end-over-end
    geo: () => {
      const g = new THREE.OctahedronGeometry(1);
      g.scale(0.05, 0.26, 1.35);
      return g;
    },
    tumble: true, trail: 'glow', doubleSide: true,
  },
  spear: { // AEGIS: the hurled lance — a long javelin flying point-first
    geo: () => new THREE.ConeGeometry(0.15, 3.6, 6), rot: true, trail: 'glow',
  },
  wave: { geo: () => new THREE.TorusGeometry(1.4, 0.16, 6, 14, Math.PI * 0.7), waveRot: true, trail: 'glow' },
  shell: { geo: () => new THREE.CylinderGeometry(0.14, 0.2, 0.8, 8), rot: true, trail: 'glow' },
  mortar: { geo: () => new THREE.SphereGeometry(0.42, 8, 6), trail: 'smoke' },
  shard: { geo: () => new THREE.ConeGeometry(0.22, 1.3, 5), rot: true, trail: 'glow' },
  bat: { // WRAITH: flat bat silhouette — nose +Z, wings spread on X; flaps in update()
    geo: () => {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.BufferAttribute(new Float32Array([
        0, 0, 0.34, -0.72, 0.05, -0.1, -0.16, 0, -0.34,
        0, 0, 0.34, 0.16, 0, -0.34, 0.72, 0.05, -0.1,
        -0.16, 0, -0.34, 0.16, 0, -0.34, 0, 0, 0.34,
      ]), 3));
      return g;
    },
    doubleSide: true, flap: true, faceVel: true, trail: 'glow', normalBlend: true,
  },
};

export class ProjectileSystem {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.pool = new Map(); // type -> mesh[]
    this.active = [];
  }

  obtain(type, color) {
    let list = this.pool.get(type);
    if (!list) { list = []; this.pool.set(type, list); }
    let mesh = list.pop();
    if (!mesh) {
      const vis = VISUALS[type];
      mesh = new THREE.Mesh(vis.geo(), new THREE.MeshBasicMaterial({
        transparent: true, depthWrite: false,
        // dark bodies (bats) need normal blending — additive dark = invisible
        blending: vis.normalBlend ? THREE.NormalBlending : THREE.AdditiveBlending,
      }));
      mesh.userData.vis = vis;
      if (vis.doubleSide) mesh.material.side = THREE.DoubleSide;
      this.scene.add(mesh);
    }
    mesh.material.color.set(color);
    mesh.material.opacity = 1;
    mesh.scale.set(1, 1, 1);
    mesh.visible = true;
    return mesh;
  }

  /**
   * spawn(type, owner, origin, dir, spec)
   * spec: dmg, speed, splash, knock, color, homing(target), arc (mortar),
   *       maxDist, pierce, onHit
   */
  spawn(type, owner, origin, dir, spec) {
    const mesh = this.obtain(type, spec.color ?? 0xffd080);
    mesh.position.copy(origin);
    const p = {
      type, owner, mesh,
      vel: new THREE.Vector3().copy(dir).normalize().multiplyScalar(spec.speed || 40),
      dmg: spec.dmg || 20,
      splash: spec.splash || 0,
      knock: spec.knock ?? 8,
      color: spec.color ?? 0xffd080,
      gravity: spec.arcTo || type === 'mortar' ? 26 : 0, // lobbed shots arc
      homing: spec.homing || null,
      retarget: !!spec.retarget,
      turnRate: spec.turnRate || 3.2,
      life: spec.life ?? 3.2,
      dist: 0,
      maxDist: spec.maxDist || 130,
      pierce: !!spec.pierce,
      hitSet: new Set(),
      trailT: 0,
      launch: spec.launch || 0,
      status: spec.status || null,
      size: spec.size || 1,
      wobble: spec.wobble || 0,
      goop: !!spec.goop,
      soft: !!spec.soft,
      age: rand(0, 6.28), // desyncs flap/wobble phase across a swarm
    };
    if (p.size !== 1) p.mesh.scale.multiplyScalar(p.size);
    if (spec.arcTo) {
      // ballistic solve toward a ground target
      const dt = spec.arcTime || 1.4;
      p.vel.set(
        (spec.arcTo.x - origin.x) / dt,
        (spec.arcTo.y - origin.y) / dt + 0.5 * p.gravity * dt,
        (spec.arcTo.z - origin.z) / dt
      );
    }
    this.orient(p);
    this.active.push(p);
    return p;
  }

  orient(p) {
    const vis = p.mesh.userData.vis;
    if (vis.rot) {
      _dir.copy(p.vel).normalize();
      p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), _dir);
    } else if (vis.waveRot) {
      p.mesh.rotation.set(0, Math.atan2(p.vel.x, p.vel.z), 0);
      p.mesh.rotateX(Math.PI / 2);
    } else if (vis.scaleZ) {
      _dir.copy(p.vel).normalize();
      p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _dir);
      p.mesh.scale.set(1, 1, vis.scaleZ);
    }
  }

  update(dt) {
    const world = this.world;
    for (let i = this.active.length - 1; i >= 0; i--) {
      const p = this.active[i];
      p.life -= dt;

      // homing: retargeting projectiles re-acquire the nearest living enemy
      // whenever their target is gone, so pop-up volleys always curve down
      // onto someone instead of sailing into the sky.
      if (p.retarget && !p.committed && (!p.homing || !p.homing.alive)) {
        let best = null, bestD = Infinity;
        for (const f of world.fighters) {
          if (f === p.owner || !f.alive) continue;
          const d = f.center().distanceToSquared(p.mesh.position);
          if (d < bestD) { best = f; bestD = d; }
        }
        p.homing = best;
      }
      if (p.homing && p.homing.alive && !p.committed) {
        _v.copy(p.homing.center());
        // chase the nearest image across the arena seam
        _v.x = p.mesh.position.x + world.wrapDelta(_v.x - p.mesh.position.x);
        _v.z = p.mesh.position.z + world.wrapDelta(_v.z - p.mesh.position.z);
        const sp = p.vel.length();
        const dist = _v.distanceTo(p.mesh.position);
        // terminal commit: in the last ~0.15s of flight the missile stops
        // steering — a well-timed dash sidesteps it, casual drift doesn't
        if (dist < Math.max(2.5, sp * 0.15)) {
          p.committed = true;
        } else {
          // lead pursuit: aim at the intercept point, not the tailpipe —
          // steady strafing gets hit, only a real direction change dodges
          _v.addScaledVector(p.homing.vel, Math.min(dist / sp, 0.5) * 0.8);
          _v.sub(p.mesh.position).normalize();
          p.vel.normalize().lerp(_v, clamp(p.turnRate * dt, 0, 1)).normalize().multiplyScalar(sp);
        }
      }
      if (p.gravity) p.vel.y -= p.gravity * dt;

      const step = _v.copy(p.vel).multiplyScalar(dt);
      const stepLen = step.length();
      p.dist += stepLen;
      const px = p.mesh.position.x, py = p.mesh.position.y, pz = p.mesh.position.z;
      const sdx = step.x, sdy = step.y, sdz = step.z;
      p.mesh.position.add(step);
      if (world.wrapHalf) {
        p.mesh.position.x = world.wrapCoord(p.mesh.position.x);
        p.mesh.position.z = world.wrapCoord(p.mesh.position.z);
      }
      p.age += dt;
      // erratic hunting wobble (bats): steer the velocity in a figure-8
      // jitter without losing overall speed
      if (p.wobble) {
        const sp = p.vel.length();
        p.vel.x += Math.sin(p.age * 11) * p.wobble * sp * dt;
        p.vel.y += Math.cos(p.age * 7.3) * p.wobble * sp * 0.5 * dt;
        p.vel.z += Math.cos(p.age * 11) * p.wobble * sp * dt;
        p.vel.normalize().multiplyScalar(sp);
      }
      if (p.mesh.userData.vis.rot || p.gravity) this.orient(p);
      if (p.mesh.userData.vis.faceVel) {
        _dir.copy(p.vel).normalize();
        p.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _dir);
      }
      if (p.mesh.userData.vis.pulse) {
        const s = (1 + Math.sin(performance.now() * 0.02) * 0.15) * p.size;
        p.mesh.scale.set(s, s, s);
      }
      if (p.mesh.userData.vis.flap) {
        const fl = Math.abs(Math.sin(p.age * 16));
        p.mesh.scale.set((0.55 + 0.65 * fl) * p.size, p.size, p.size);
      }
      if (p.mesh.userData.vis.tumble) {
        // thrown-blade spin: face the flight line, cartwheel end-over-end
        p.mesh.rotation.order = 'YXZ';
        p.mesh.rotation.set(p.age * 11, Math.atan2(p.vel.x, p.vel.z), 0);
      }

      // trails
      p.trailT -= dt;
      if (p.trailT <= 0 && world.effects) {
        p.trailT = 0.016;
        const vis = p.mesh.userData.vis;
        if (vis.trail === 'smoke') {
          world.effects.smoke.emit(p.mesh.position.x, p.mesh.position.y, p.mesh.position.z,
            rand(-0.5, 0.5), rand(0.5, 1.5), rand(-0.5, 0.5),
            { life: 0.55, size: rand(0.8, 1.3), color: 0x3a3a40, alpha: 0.45, grow: 2 });
          world.effects.glows.emit(p.mesh.position.x, p.mesh.position.y, p.mesh.position.z,
            0, 0, 0, { life: 0.1, size: 1.2, color: 0xffb050, alpha: 0.8 });
        } else if (p.goop) {
          // thick liquid: lumpy globs sag off the bolt and drip down
          world.effects.goop.emit(p.mesh.position.x, p.mesh.position.y, p.mesh.position.z,
            rand(-0.6, 0.6), rand(-1.5, 0.2), rand(-0.6, 0.6),
            { life: rand(0.35, 0.6), size: rand(0.8, 1.5), color: 0x9fe23a, color2: 0x3c7410,
              alpha: 0.95, gravity: 16, spin: 1.5, fadeIn: 0.05 });
        } else if (vis.trail === 'glow') {
          world.effects.glows.emit(p.mesh.position.x, p.mesh.position.y, p.mesh.position.z,
            0, 0, 0, { life: 0.18, size: rand(0.9, 1.5), color: p.color, alpha: 0.6 });
        }
      }

      // ---- collision ----
      let dead = false;

      // fighters (nearest-image distance across the seam)
      for (const f of world.fighters) {
        if (f === p.owner || !f.alive || p.hitSet.has(f)) continue;
        if (f.iframes > 0) continue;
        const c = f.center();
        const rr = f.hitRadius + 0.5;
        const cdx = world.wrapDelta(c.x - p.mesh.position.x);
        const cdy = c.y - p.mesh.position.y;
        const cdz = world.wrapDelta(c.z - p.mesh.position.z);
        if (cdx * cdx + cdy * cdy + cdz * cdz < rr * rr) {
          p.hitSet.add(f);
          if (p.splash) {
            world.explode(p.mesh.position, p.splash, p.dmg, { owner: p.owner, knock: p.knock, color: p.color, launch: p.launch, status: p.status });
          } else {
            f.takeHit(p.dmg, p.owner, { knock: p.knock, launch: p.launch, srcPos: p.mesh.position, status: p.status, soft: p.soft });
            world.effects.impactSparks(p.mesh.position, p.color, 10, 8);
          }
          if (p.goop) { // gel wad BURSTS on them: blotch stuck on, spatter
            world.effects.blotchOn(f);
            world.effects.slime(p.mesh.position, 7, 5);
          }
          if (!p.pierce) { dead = true; break; }
        }
      }

      // ground
      if (!dead && p.mesh.position.y <= 0.15) {
        if (p.splash) world.explode(p.mesh.position, p.splash, p.dmg, { owner: p.owner, knock: p.knock, color: p.color, launch: p.launch, status: p.status });
        else world.effects.impactSparks(p.mesh.position, p.color, 6, 5);
        dead = true;
      }

      // buildings — substepped so fast rounds can't tunnel through a wall
      if (!dead && world.arena) {
        let bHit = world.arena.pointHits(p.mesh.position) ? p.mesh.position : null;
        if (!bHit && stepLen > 1.1) {
          const n = Math.ceil(stepLen);
          for (let k = 1; k < n && !bHit; k++) {
            _probe.set(px + sdx * k / n, py + sdy * k / n, pz + sdz * k / n);
            if (world.arena.pointHits(_probe)) bHit = _probe;
          }
        }
        if (bHit) {
          if (p.splash) {
            world.explode(bHit, p.splash, p.dmg, { owner: p.owner, knock: p.knock, color: p.color, launch: p.launch });
          } else {
            world.arena.damageSphere(bHit, 2.2, p.dmg * 1.4, _v.copy(p.vel).normalize());
            world.effects.impactSparks(bHit, p.color, 8, 6);
          }
          dead = true;
        }
        // solid props stop rounds too (and break under them)
        if (!dead && world.arena.propAt && world.arena.propAt(p.mesh.position)) {
          if (p.splash) {
            world.explode(p.mesh.position, p.splash, p.dmg, { owner: p.owner, knock: p.knock, color: p.color, launch: p.launch });
          } else {
            world.arena.damageProps(p.mesh.position, 1.6, p.dmg * 1.3, _v.copy(p.vel).normalize());
            world.effects.impactSparks(p.mesh.position, p.color, 8, 6);
          }
          dead = true;
        }
      }

      if (p.life <= 0 || p.dist > p.maxDist) dead = true;

      if (dead) {
        if (p.goop) { // goo goes SPLAT wherever it dies: a puddle that stays
          world.effects.puddle(p.mesh.position, { slime: true });
          world.effects.slime(p.mesh.position, 6, 5);
        }
        p.mesh.visible = false;
        p.mesh.scale.set(1, 1, 1);
        this.pool.get(p.type).push(p.mesh);
        this.active.splice(i, 1);
      }
    }
  }

  // ---- hitscan helpers ----

  // returns hit point; damages first fighter in the ray (or all if pierce)
  railshot(owner, origin, dir, { dmg = 80, range = 90, pierce = false, color = 0xff5050, knock = 10, radius = 1.6 } = {}) {
    const world = this.world;
    let end = _v.copy(dir).normalize().multiplyScalar(range).add(origin).clone();
    // building clip
    if (world.arena) {
      const hit = world.arena.raySolid(origin, dir, range);
      if (hit) { end = hit.point; world.arena.damageSphere(end, 2, dmg * 0.7, dir); }
    }
    const rayLen = end.distanceTo(origin);
    const hits = [];
    for (const f of world.fighters) {
      if (f === owner || !f.alive || f.iframes > 0) continue;
      const c = f.center();
      // point-line distance
      const t = clamp(_dir.copy(c).sub(origin).dot(_v.copy(end).sub(origin).normalize()), 0, rayLen);
      const closest = _v.copy(end).sub(origin).normalize().multiplyScalar(t).add(origin);
      if (closest.distanceToSquared(c) < (f.hitRadius + radius) ** 2) hits.push({ f, t });
    }
    hits.sort((a, b) => a.t - b.t);
    const victims = pierce ? hits : hits.slice(0, 1);
    for (const { f, t } of victims) {
      f.takeHit(dmg, owner, { knock, srcPos: origin });
      world.effects.impactSparks(f.center(), color, 14, 10);
      if (!pierce) { end = _v.copy(dir).normalize().multiplyScalar(t).add(origin).clone(); }
    }
    world.effects.beams.spawn(origin, end, { radius: 0.28, dur: 0.28, color });
    world.effects.glows.emit(end.x, end.y, end.z, 0, 0, 0, { life: 0.2, size: 3, color, alpha: 0.9 });
    return end;
  }

  // instant lightning zap at nearest enemy in cone + chain
  lightningZap(owner, origin, dir, { dmg = 40, range = 26, chainRange = 8, color = 0x8fe8ff, knock = 6 } = {}) {
    const world = this.world;
    let best = null, bestD = Infinity;
    for (const f of world.fighters) {
      if (f === owner || !f.alive) continue;
      const c = f.center();
      _dir.copy(c).sub(origin);
      const d = _dir.length();
      if (d > range) continue;
      const dot = _dir.normalize().dot(_v.copy(dir).normalize());
      if (dot > 0.55 && d < bestD) { best = f; bestD = d; }
    }
    if (best) {
      best.takeHit(dmg, owner, { knock, srcPos: origin, status: { slow: 0.75, slowT: 0.6 } });
      world.effects.lightning.spawn(origin, best.center(), { color, jag: 1.1, thick: 0.14 });
      world.effects.impactSparks(best.center(), color, 12, 9);
      world.effects.staticCling(best, 0.9);
      // chain to one nearby enemy
      let chain = null, chainD = Infinity;
      for (const f of world.fighters) {
        if (f === owner || f === best || !f.alive) continue;
        const d = f.center().distanceTo(best.center());
        if (d < chainRange && d < chainD) { chain = f; chainD = d; }
      }
      if (chain) {
        chain.takeHit(dmg * 0.6, owner, { knock: knock * 0.6, srcPos: best.center() });
        world.effects.lightning.spawn(best.center(), chain.center(), { color, jag: 0.9, thick: 0.1 });
        world.effects.impactSparks(chain.center(), color, 8, 7);
        world.effects.staticCling(chain, 0.6);
      }
      return true;
    }
    // whiff: bolt into the air
    const end = _v.copy(dir).normalize().multiplyScalar(range * 0.6).add(origin);
    world.effects.lightning.spawn(origin, end, { color, jag: 1.4, dur: 0.15 });
    return false;
  }
}
