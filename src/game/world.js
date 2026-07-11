// World: binds engine, arena, fighters, projectiles, FX, audio. Owns the
// scheduler, ranged-fire dispatch, explosions and area effects.
import * as THREE from 'three';
import { Effects } from '../combat/effects.js';
import { ProjectileSystem } from '../combat/projectiles.js';
import { rand, clamp } from '../core/utils.js';

const _v = new THREE.Vector3();

class Emitter {
  constructor() { this.map = new Map(); }
  on(name, fn) {
    if (!this.map.has(name)) this.map.set(name, []);
    this.map.get(name).push(fn);
    return () => {
      const arr = this.map.get(name);
      const i = arr.indexOf(fn);
      if (i >= 0) arr.splice(i, 1);
    };
  }
  emit(name, data) {
    const arr = this.map.get(name);
    if (arr) for (const fn of [...arr]) fn(data);
  }
}

export class World {
  constructor(engine, audio) {
    this.engine = engine;
    this.scene = engine.scene;
    this.audio = audio;
    this.effects = new Effects(this.scene);
    this.projectiles = new ProjectileSystem(this.scene, this);
    this.events = new Emitter();
    this.fighters = [];
    this.arena = null;
    this.input = null;
    this.tasks = [];        // {t, fn}
    this.firePatches = [];  // {pos, radius, t, dps, owner}
    this.iceBlocks = [];    // {mesh, t, fighter}
    this.pickups = [];      // ammo crates {mesh, pos, active, respawnT}
    this.time = 0;
    // toroidal arena: coordinates wrap at ±wrapHalf on X and Z (0 = off).
    // Set from the arena in bind(); all combat queries use nearest-image
    // deltas so opponents are "close" straight through the seam.
    this.wrapHalf = 0;
  }

  // shortest signed delta on a wrapped axis (nearest image)
  wrapDelta(d) {
    const W = this.wrapHalf;
    if (!W) return d;
    const P = W * 2;
    let x = (d + W) % P;
    if (x < 0) x += P;
    return x - W;
  }

  // fold a coordinate into [-wrapHalf, wrapHalf)
  wrapCoord(v) {
    const W = this.wrapHalf;
    if (!W) return v;
    return this.wrapDelta(v);
  }

  // nearest-image position of `pos` as seen from `ref` (fresh Vector3)
  nearestImage(pos, ref) {
    return new THREE.Vector3(
      ref.x + this.wrapDelta(pos.x - ref.x),
      pos.y,
      ref.z + this.wrapDelta(pos.z - ref.z)
    );
  }

  // ---- per-view render wrapping ----
  // Before each viewport renders, shift every dynamic entity to its nearest
  // image relative to that view's camera, so opponents/projectiles are seen
  // straight across the wrap seam (the static world is ghost-tiled).
  // Restored immediately after the render — physics never sees the shift.
  applyViewWrap(camera) {
    // per-view building see-through: stamp THIS view's fade values so a
    // building only ghosts on the screen of the player it actually hides
    this.arena?.applyViewFade?.(camera);
    if (!this.wrapHalf) return;
    const cx = camera.position.x, cz = camera.position.z;
    this._viewShifted = this._viewShifted || [];
    const shift = (obj) => {
      const dx = this.wrapDelta(obj.position.x - cx) - (obj.position.x - cx);
      const dz = this.wrapDelta(obj.position.z - cz) - (obj.position.z - cz);
      if (dx || dz) {
        obj.position.x += dx;
        obj.position.z += dz;
        this._viewShifted.push(obj, dx, dz);
      }
    };
    for (const f of this.fighters) shift(f.group);
    for (const p of this.projectiles.active) shift(p.mesh);
    for (const p of this.pickups) shift(p.mesh);
  }

  clearViewWrap() {
    const s = this._viewShifted;
    if (!s || !s.length) return;
    for (let i = 0; i < s.length; i += 3) {
      s[i].position.x -= s[i + 1];
      s[i].position.z -= s[i + 2];
    }
    s.length = 0;
  }

  schedule(delay, fn) {
    this.tasks.push({ t: this.time + delay, fn });
  }

  // ---- ammo crates: every mech's ranged weapon runs on ammo now ----
  spawnAmmoBoxes(count = 6, radius = 60) {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2 + rand(-0.4, 0.4);
      const r = radius * rand(0.45, 1);
      const pos = new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r);
      const grp = new THREE.Group();
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(1.6, 1.1, 1.1),
        new THREE.MeshStandardMaterial({ color: 0x3a4a30, roughness: 0.6, metalness: 0.4 })
      );
      box.position.y = 0.8;
      box.castShadow = true;
      grp.add(box);
      const band = new THREE.Mesh(
        new THREE.BoxGeometry(1.7, 0.24, 1.16),
        new THREE.MeshBasicMaterial({ color: 0xffd23c })
      );
      band.position.y = 0.8;
      grp.add(band);
      const glow = new THREE.Mesh(
        new THREE.RingGeometry(1.3, 1.6, 24),
        new THREE.MeshBasicMaterial({ color: 0xffd23c, transparent: true, opacity: 0.5, side: THREE.DoubleSide })
      );
      glow.rotation.x = -Math.PI / 2;
      glow.position.y = 0.05;
      grp.add(glow);
      grp.position.copy(pos);
      this.scene.add(grp);
      this.pickups.push({ mesh: grp, pos, active: true, respawnT: 0, t: rand(0, 6) });
    }
  }

  updatePickups(dt) {
    for (const p of this.pickups) {
      p.t += dt;
      if (!p.active) {
        p.respawnT -= dt;
        if (p.respawnT <= 0) {
          p.active = true;
          p.mesh.visible = true;
          this.effects.rings.spawn(p.pos, { from: 0.4, to: 2.6, dur: 0.4, color: 0xffd23c, y: 0.3 });
        }
        continue;
      }
      p.mesh.rotation.y = p.t * 1.4;
      p.mesh.position.y = Math.sin(p.t * 2.2) * 0.18 + 0.05;
      for (const f of this.fighters) {
        if (!f.alive || f.ammoMax === undefined) continue;
        if (f.ammo >= f.ammoMax) continue;
        const dx = this.wrapDelta(f.pos.x - p.pos.x), dz = this.wrapDelta(f.pos.z - p.pos.z);
        if (dx * dx + dz * dz < 10.5 && f.pos.y < 4) {
          f.ammo = f.ammoMax;
          p.active = false;
          p.mesh.visible = false;
          p.respawnT = 10;
          this.audio?.play('powerup');
          this.effects.rings.spawn(p.pos, { from: 2.2, to: 0.4, dur: 0.35, color: 0xffd23c, y: 0.6 });
          this.events.emit('ammo', { fighter: f });
          break;
        }
      }
    }
  }

  update(dt) {
    this.time += dt;
    // scheduler
    for (let i = this.tasks.length - 1; i >= 0; i--) {
      if (this.tasks[i].t <= this.time) {
        const { fn } = this.tasks[i];
        this.tasks.splice(i, 1);
        fn();
      }
    }
    for (const f of this.fighters) f.update(dt);
    this.projectiles.update(dt);
    this.effects.update(dt);
    this.arena?.update(dt);
    this.updatePickups(dt);

    // fire patches
    for (let i = this.firePatches.length - 1; i >= 0; i--) {
      const p = this.firePatches[i];
      p.t -= dt;
      if (p.t <= 0) { this.firePatches.splice(i, 1); continue; }
      this.effects.firePatch(p.pos, p.radius);
      p.tick -= dt;
      if (p.tick <= 0) {
        p.tick = 0.4;
        for (const f of this.fighters) {
          if (f === p.owner || !f.alive) continue;
          if (f.grounded && f.pos.distanceTo(p.pos) < p.radius + f.radius) {
            f.takeHit(p.dps, p.owner, { knock: 1, srcPos: p.pos, status: { burn: 6, burnT: 1.5 } });
          }
        }
      }
    }

    // ice blocks track frozen fighters
    for (let i = this.iceBlocks.length - 1; i >= 0; i--) {
      const ib = this.iceBlocks[i];
      ib.t -= dt;
      ib.mesh.position.copy(ib.fighter.pos);
      ib.mesh.position.y += ib.fighter.height * 0.5;
      if (ib.t <= 0 || !ib.fighter.alive) {
        this.scene.remove(ib.mesh);
        ib.mesh.geometry.dispose();
        ib.mesh.material.dispose();
        this.iceBlocks.splice(i, 1);
        this.effects.impactSparks(ib.fighter.center(), 0x9be8ff, 14, 8);
        this.audio?.play('shatter');
      }
    }
  }

  // area explosion: damages fighters w/ falloff + wrecks buildings + FX
  explode(pos, radius, dmg, { owner = null, knock = 12, color = 0xffa040, launch = 0, status = null, silentFx = false } = {}) {
    if (!silentFx) {
      this.effects.explosion(pos, radius, { color });
      this.audio?.play(radius > 7 ? 'explosionBig' : 'explosion');
      this.effects.addShake(Math.min(1.2, radius * 0.09));
    }
    for (const f of this.fighters) {
      if (f === owner || !f.alive) continue;
      const c = f.center();
      const dx = this.wrapDelta(c.x - pos.x), dz = this.wrapDelta(c.z - pos.z);
      const d = Math.sqrt(dx * dx + (c.y - pos.y) ** 2 + dz * dz);
      if (d < radius + f.hitRadius) {
        const falloff = 1 - Math.max(0, (d - radius * 0.3)) / (radius + f.hitRadius);
        f.takeHit(dmg * Math.max(0.25, falloff), owner, {
          knock: knock * Math.max(0.4, falloff), launch, srcPos: pos, heavy: dmg > 60, status,
        });
      }
    }
    this.arena?.damageSphere(pos, radius * 0.85, dmg * 2.2, null, true);
    this.arena?.hitExplosives?.(pos, radius);   // blasts cook off nearby tanks
  }

  // expanding ground ring that hits grounded fighters (slams)
  groundShockwave(owner, pos, radius, dmg, knock, color, launchAll = false) {
    this.effects.rings.spawn(pos, { from: 1, to: radius * 2.2, dur: 0.55, color, y: 0.4 });
    this.effects.dustPuff(pos, 16);
    this.effects.explosion(pos, radius * 0.4, { color, smoke: false, ring: false });
    this.arena?.damageSphere(_v.set(pos.x, pos.y + 1, pos.z), radius * 0.7, dmg * 1.6, null, true);
    for (const f of this.fighters) {
      if (f === owner || !f.alive) continue;
      const dxs = this.wrapDelta(f.pos.x - pos.x), dzs = this.wrapDelta(f.pos.z - pos.z);
      const d = Math.hypot(dxs, dzs);
      // height check is RELATIVE so slams landed on a rooftop still connect
      if (d < radius && Math.abs(f.pos.y - pos.y) < 3) {
        const falloff = 1 - d / radius;
        f.takeHit(dmg * Math.max(0.35, falloff), owner, {
          knock: knock * falloff, launch: launchAll ? 11 : 8 * falloff, srcPos: pos, heavy: true,
        });
      }
    }
  }

  addFirePatch(owner, pos, radius, duration, dps) {
    this.firePatches.push({ pos: pos.clone(), radius, t: duration, dps, owner, tick: 0 });
  }

  freezeOverlay(fighter, duration) {
    const geo = new THREE.IcosahedronGeometry(fighter.hitRadius * 1.15, 1);
    const mat = new THREE.MeshPhysicalMaterial({
      color: 0xbfeaff, transparent: true, opacity: 0.45, roughness: 0.1,
      metalness: 0, transmission: 0.5, side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.scale.y = 1.4;
    this.scene.add(mesh);
    this.iceBlocks.push({ mesh, t: duration, fighter });
  }

  // ranged attack dispatch (single shots and channel ticks)
  fireRanged(f, mv) {
    const anchors = f.mech.anchors;
    const from = anchors.muzzleR.getWorldPosition(new THREE.Vector3());
    const e = f.nearestEnemy();
    // Aim strictly along the mech's facing — no horizontal auto-aim.
    // (Humans fire where the camera points; the AI squares up first.)
    // Only VERTICAL assist remains: when an enemy is roughly down the
    // barrel, the shot pitches to their height so airborne/short targets
    // aren't unhittable with yaw-only controls.
    const dir = new THREE.Vector3(Math.sin(f.yaw), 0.02, Math.cos(f.yaw));
    let barrelDot = -1, flatDist = 0;
    if (e) {
      const to = e.center().sub(from);
      to.x = this.wrapDelta(to.x);   // aim through the arena seam
      to.z = this.wrapDelta(to.z);
      flatDist = Math.hypot(to.x, to.z) || 1;
      barrelDot = (to.x / flatDist) * dir.x + (to.z / flatDist) * dir.z;
      if (barrelDot > 0.86) {
        dir.y = clamp(to.y / flatDist, -0.7, 0.7);
        dir.normalize();
      }
    }

    switch (mv.type) {
      case 'gatling': {
        const d = dir.clone();
        d.x += rand(-mv.spread, mv.spread);
        d.y += rand(-mv.spread, mv.spread) * 0.6;
        d.z += rand(-mv.spread, mv.spread);
        this.projectiles.spawn('bullet', f, from, d, {
          dmg: mv.dmg * f.dmgMult(), speed: mv.speed, color: 0xffd080, knock: 2, life: 1.6,
        });
        this.effects.muzzleFlash(from);
        this.audio?.play('gatling');
        break;
      }
      case 'flame': {
        this.effects.flameCone(from, dir, 0xff7a20);
        this.audio?.play('flame');
        // cone tick damage
        for (const t of this.fighters) {
          if (t === f || !t.alive) continue;
          const toT = t.center().sub(from);
          const d = toT.length();
          if (d < mv.range && toT.normalize().dot(dir) > 0.72) {
            t.takeHit(mv.dmg * f.dmgMult(), f, { knock: 0.5, srcPos: from, status: { burn: 5, burnT: 2 } });
          }
        }
        break;
      }
      case 'rocket':
        this.projectiles.spawn('rocket', f, from, dir, {
          dmg: mv.dmg * f.dmgMult(), speed: mv.speed, splash: mv.splash, color: 0xffb43c, knock: 14, launch: 6,
        });
        this.audio?.play('missile');
        this.effects.muzzleFlash(from);
        break;
      case 'plasma':
        this.projectiles.spawn('plasma', f, from, dir, {
          dmg: mv.dmg * f.dmgMult(), speed: mv.speed, splash: mv.splash, color: 0xff5ce8, knock: 10,
        });
        this.audio?.play('plasma');
        break;
      case 'dart':
        this.projectiles.spawn('dart', f, from, dir, {
          dmg: mv.dmg * f.dmgMult(), speed: mv.speed, color: 0x6cff5c, knock: 4,
          status: { slow: 0.8, slowT: 1.2 },
        });
        this.audio?.play('dart');
        break;
      case 'wave':
        // waves fly level, so cap the launch height at chest level — a
        // high lance/claw muzzle would skim over every target's head
        from.y = Math.min(from.y, f.pos.y + Math.min(f.height * 0.42, 3.6));
        this.projectiles.spawn('wave', f, from, new THREE.Vector3(dir.x, 0, dir.z).normalize(), {
          dmg: mv.dmg * f.dmgMult(), speed: mv.speed, color: f.def.colors.glow, knock: 8, pierce: true, maxDist: 34,
        });
        this.audio?.play('wave');
        break;
      case 'shell':
        this.projectiles.spawn('shell', f, from, dir, {
          dmg: mv.dmg * f.dmgMult(), speed: mv.speed, splash: mv.splash, color: 0xff5040, knock: 10,
        });
        this.audio?.play('mortar');
        this.effects.muzzleFlash(from);
        break;
      case 'mortar': {
        // lob along the facing; if an enemy is down the barrel, range the
        // arc to their distance (with velocity lead) — direction stays manual
        const lobDist = barrelDot > 0.8 ? flatDist : 25;
        const target = new THREE.Vector3(
          f.pos.x + Math.sin(f.yaw) * lobDist, 0, f.pos.z + Math.cos(f.yaw) * lobDist
        ).add(new THREE.Vector3(rand(-2, 2), 0, rand(-2, 2)));
        if (e && barrelDot > 0.8) target.addScaledVector(e.vel, 1.15).setY(0);
        this.projectiles.spawn('mortar', f, from, new THREE.Vector3(0, 1, 0), {
          dmg: mv.dmg * f.dmgMult(), splash: mv.splash, color: 0xffd23c, arcTo: target, arcTime: 1.35, knock: 14, launch: 7,
        });
        this.audio?.play('mortar');
        break;
      }
      case 'lightning':
        this.projectiles.lightningZap(f, from, dir, {
          dmg: mv.dmg * f.dmgMult(), chainRange: mv.chainRange, color: 0x8fe8ff,
        });
        this.audio?.play('zap');
        break;
      case 'railgun':
        this.projectiles.railshot(f, from, dir, {
          dmg: mv.dmg * f.dmgMult(), color: 0xff3838, knock: 12,
        });
        this.audio?.play('railgun');
        f.animator.addImpulse('shoulderR', [0.4, 0, 0], 30, 10);
        break;
      case 'shard':
        this.projectiles.spawn('shard', f, from, dir, {
          dmg: mv.dmg * f.dmgMult(), speed: mv.speed, color: 0x9be8ff, knock: 6,
          status: { slow: 0.85, slowT: 0.8 },
        });
        this.audio?.play('shard');
        break;
      case 'water': // CRANKY: high-pressure slug, big knockback
        this.projectiles.spawn('plasma', f, from, dir, {
          dmg: mv.dmg * f.dmgMult(), speed: mv.speed, splash: mv.splash, color: 0x59c8ff, knock: 17,
        });
        this.audio?.play('wave');
        this.effects.muzzleFlash(from);
        break;
      case 'feather': // SAURION: razor blade-feathers
        this.projectiles.spawn('shard', f, from, dir, {
          dmg: mv.dmg * f.dmgMult(), speed: mv.speed, color: 0x9aa0a8, knock: 5,
        });
        this.audio?.play('dart');
        break;
      case 'slime': // FROGGER: sticky gunk bolt, slows on hit
        this.projectiles.spawn('plasma', f, from, dir, {
          dmg: mv.dmg * f.dmgMult(), speed: mv.speed, splash: mv.splash, color: 0x9ade2a, knock: 8,
          status: { slow: 0.7, slowT: 1.4 },
        });
        this.audio?.play('plasma');
        break;
    }
  }

  clearTransient() {
    this.tasks.length = 0;
    this.firePatches.length = 0;
    for (const ib of this.iceBlocks) this.scene.remove(ib.mesh);
    this.iceBlocks.length = 0;
    for (const p of this.projectiles.active) p.mesh.visible = false;
    this.projectiles.active.length = 0;
  }
}
