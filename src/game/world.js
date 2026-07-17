// World: binds engine, arena, fighters, projectiles, FX, audio. Owns the
// scheduler, ranged-fire dispatch, explosions and area effects.
import * as THREE from 'three';
import { Finisher } from './finisher.js';
import { Effects } from '../combat/effects.js';
import { FlameFX } from '../combat/flamefx.js';
import { ProjectileSystem } from '../combat/projectiles.js';
import { FleaSystem } from '../combat/fleas.js';
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
    this.fleas = new FleaSystem(this.scene, this); // JERRY's living ammo
    this.events = new Emitter();
    this.fighters = [];
    this.arena = null;
    this.input = null;
    this.tasks = [];        // {t, fn}
    this.firePatches = [];  // {pos, radius, t, dps, owner, flame}
    this.geysers = [];      // live GeyserFX instances (CRANKY's special)
    this.flameJets = new Map(); // playerIndex -> {nozzle, impact, ttl} FlameFX pairs
    this.iceBlocks = [];    // {mesh, t, fighter}
    this.debris = [];       // finisher wreckage (frozen rubble): cleared each round
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
    for (const fl of this.fleas.active) shift(fl.mesh);
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
      // keep crates out of lava streams / off bridges; hills are fine —
      // the crate sits (and bobs) on the terrain surface
      let x = 0, z = 0, tries = 0;
      do {
        const a = (i / count) * Math.PI * 2 + rand(-0.4, 0.4);
        const r = radius * rand(0.45, 1);
        x = Math.cos(a) * r; z = Math.sin(a) * r;
      } while (this.arena?.badPickupSpot?.(x, z) && ++tries < 12);
      const gy = this.arena?.terrainHeightAt?.(x, z) || 0;
      const pos = new THREE.Vector3(x, gy, z);
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
      this.pickups.push({ mesh: grp, pos, baseY: pos.y, active: true, respawnT: 0, t: rand(0, 6) });
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
      p.mesh.position.y = (p.baseY || 0) + Math.sin(p.t * 2.2) * 0.18 + 0.05;
      for (const f of this.fighters) {
        if (!f.alive || f.ammoMax === undefined) continue;
        if (f.ammo >= f.ammoMax) continue;
        const dx = this.wrapDelta(f.pos.x - p.pos.x), dz = this.wrapDelta(f.pos.z - p.pos.z);
        if (dx * dx + dz * dz < 10.5 && Math.abs(f.pos.y - (p.baseY || 0)) < 4) {
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
    if (this.finisher) this.finisher.update(dt);
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
    this.fleas.update(dt);
    this.effects.update(dt);
    this.arena?.update(dt);
    this.updatePickups(dt);

    // geysers run their own lifecycle (telegraph -> erupt -> collapse);
    // combat geysers ({owner, dmg}) also SCALD: anyone standing in the
    // column keeps taking hits for as long as the water is up
    for (let i = this.geysers.length - 1; i >= 0; i--) {
      const g = this.geysers[i];
      if (!g.fx.update(dt)) {
        g.fx.dispose();
        this.geysers.splice(i, 1);
        continue;
      }
      if (!g.owner || g.fx.phase !== 'erupt') continue;
      g.tick -= dt;
      if (g.tick > 0) continue;
      g.tick = 0.4;
      for (const v of this.fighters) {
        if (v === g.owner || !v.alive) continue;
        const dx = this.wrapDelta(v.pos.x - g.fx.pos.x), dz = this.wrapDelta(v.pos.z - g.fx.pos.z);
        // the column itself, not the full blast radius — matches the visual
        if (Math.hypot(dx, dz) < g.radius * 0.55 + v.hitRadius * 0.5) {
          v.takeHit(g.dmg * 0.2 * g.owner.dmgMult(), g.owner,
            { knock: 3, launch: g.launch * 0.55, srcPos: g.fx.pos, soft: true });
          this.effects.splash(v.center(), 6, 5, 1);
        }
      }
    }

    // flamethrower card-flames die shortly after the trigger releases
    for (const [k, fj] of this.flameJets) {
      fj.ttl -= dt;
      if (fj.ttl <= 0 && fj.nozzle.alive && fj.nozzle._dieT === undefined) {
        fj.nozzle.extinguish(0.22);
        fj.impact.extinguish(0.35);
      }
      const nozzleLive = fj.nozzle.update(dt);
      const impactLive = fj.impact.update(dt);
      if (!nozzleLive && !impactLive) {
        fj.nozzle.dispose();
        fj.impact.dispose();
        this.flameJets.delete(k);
      }
    }

    // fire patches
    for (let i = this.firePatches.length - 1; i >= 0; i--) {
      const p = this.firePatches[i];
      p.t -= dt;
      if (p.t <= 0 && !p.dying) { p.dying = true; p.flame.extinguish(0.5); }
      if (!p.flame.update(dt)) {
        p.flame.dispose();
        this.firePatches.splice(i, 1);
        continue;
      }
      if (p.dying) continue; // burning out — no more damage ticks
      p.tick -= dt;
      if (p.tick <= 0) {
        p.tick = 0.4;
        for (const f of this.fighters) {
          if (f === p.owner || !f.alive) continue;
          if (f.grounded && f.pos.distanceTo(p.pos) < p.radius + f.radius) {
            f.takeHit(p.dps, p.owner, { knock: 1, srcPos: p.pos, status: { burn: 6, burnT: 1.5 }, soft: true });
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

  // persistent set-dressing wreckage (e.g. GLACIER's shattered-victim
  // rubble): stays through the round-end beat, swept by clearTransient
  addDebris(mesh) {
    this.debris.push(mesh);
    this.scene.add(mesh);
    return mesh;
  }

  addFirePatch(owner, pos, radius, duration, dps) {
    // each patch is a real burning source: shader-card tongues + embers +
    // smoke (FlameFX), no per-frame flipbook blobs. Lights stay off in
    // combat — light-count changes force material recompiles mid-match.
    const flame = new FlameFX(this.scene, this.effects, pos, {
      radius: radius * 0.8, scale: 1.0 + radius * 0.35, cards: 6, light: false,
    });
    this.firePatches.push({ pos: pos.clone(), radius, t: duration, dps, owner, tick: 0, flame });
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
    // AIMED shot (human held RB): fly straight at the crosshair's world
    // point — full manual control, including pitch. No assist.
    const aimP = f._aimPoint || null;
    f._aimPoint = null;
    // Otherwise aim strictly along the mech's facing — no horizontal
    // auto-aim. Only VERTICAL assist remains: when an enemy is roughly down
    // the barrel, the shot pitches to their height so airborne/short
    // targets aren't unhittable with yaw-only controls.
    const dir = new THREE.Vector3(Math.sin(f.yaw), 0.02, Math.cos(f.yaw));
    let barrelDot = -1, flatDist = 0;
    if (e) {
      const to = e.center().sub(from);
      to.x = this.wrapDelta(to.x);   // aim through the arena seam
      to.z = this.wrapDelta(to.z);
      flatDist = Math.hypot(to.x, to.z) || 1;
      barrelDot = (to.x / flatDist) * dir.x + (to.z / flatDist) * dir.z;
      if (!aimP && barrelDot > 0.86) {
        dir.y = clamp(to.y / flatDist, -0.7, 0.7);
        dir.normalize();
      }
    }
    if (aimP) dir.copy(aimP).sub(from).normalize();

    switch (mv.type) {
      case 'gatling': {
        const d = dir.clone();
        d.x += rand(-mv.spread, mv.spread);
        d.y += rand(-mv.spread, mv.spread) * 0.6;
        d.z += rand(-mv.spread, mv.spread);
        this.projectiles.spawn('bullet', f, from, d, {
          dmg: mv.dmg * f.dmgMult(), speed: mv.speed, color: 0xffd080, knock: 2, life: 1.6, soft: true,
        });
        this.effects.muzzleFlash(from);
        this.audio?.play('gatling');
        break;
      }
      case 'flame': {
        // FLAMETHROWER: one roaring cone of burning fuel — a FAT stream
        // tube, plus shader-card flames (FlameFX) licking off the nozzle
        // along the aim and blooming up where the stream lands
        const end = this.effects.jet('flame' + f.playerIndex, from, dir, {
          type: 'fire', speed: 30, range: mv.range * 1.05, gravity: -4, r0: 0.32, r1: 2.2,
        });
        let fj = this.flameJets.get(f.playerIndex);
        if (fj && (!fj.nozzle.alive || !fj.impact.alive)) {
          fj.nozzle.dispose();
          fj.impact.dispose();
          this.flameJets.delete(f.playerIndex);
          fj = null;
        }
        if (!fj) {
          fj = {
            nozzle: new FlameFX(this.scene, this.effects, from, { radius: 0.55, scale: 1.05, dir, cards: 5, light: false }),
            impact: new FlameFX(this.scene, this.effects, end || from, { radius: 1.5, scale: 1.0, cards: 6, light: false }),
            ttl: 0,
          };
          this.flameJets.set(f.playerIndex, fj);
        }
        fj.ttl = 0.16;
        fj.nozzle.rekindle();
        fj.impact.rekindle();
        fj.nozzle.setPose(from, dir);
        if (end) fj.impact.setPose(end.setY(Math.max(0, end.y - 0.5)));
        if (Math.random() < 0.4) this.effects.fire(from, dir, 34, 0.24); // embers riding the blast
        this.audio?.play('flame');
        // cone tick damage
        for (const t of this.fighters) {
          if (t === f || !t.alive) continue;
          const toT = t.center().sub(from);
          const d = toT.length();
          if (d < mv.range && toT.normalize().dot(dir) > 0.72) {
            t.takeHit(mv.dmg * f.dmgMult(), f, { knock: 0.5, srcPos: from, status: { burn: 5, burnT: 2 }, soft: true });
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
      case 'fist': { // TITANUS: the fist itself is the round — it flies out
        // flat, swings around at range and comes home to the wrist,
        // clobbering on both legs of the trip (boomerang + pierce).
        // The projectile wears a CLONE of his real fist geometry (PBR
        // materials and all) so it reads as HIS fist, not a glow blob.
        let skin = null;
        const hand = f.mech.joints.handR;
        if (hand) {
          const c = hand.clone(true);
          const strip = [];
          c.traverse((o) => { if (o.userData.chargeShell) strip.push(o); });
          for (const o of strip) o.parent?.remove(o);
          c.position.set(0, 0, 0);
          c.rotation.set(0, 0, 0);
          c.scale.setScalar(1);
          c.updateMatrixWorld(true);
          const ctr = new THREE.Box3().setFromObject(c).getCenter(new THREE.Vector3());
          c.position.copy(ctr).negate(); // center the knuckle mass on the carrier
          skin = new THREE.Group();
          skin.add(c);
        }
        const p = this.projectiles.spawn('fist', f, from, dir, {
          dmg: mv.dmg * f.dmgMult(), speed: mv.speed, color: 0xffb43c,
          knock: mv.knock, launch: 5, pierce: true, boomerang: true,
          maxDist: mv.range, life: 6, skin,
        });
        p.onReturn = () => f.catchFist();
        f.launchFist();
        this.audio?.play('missile');
        this.effects.muzzleFlash(from);
        break;
      }
      case 'plasma': {
        // NOVA: shots fired while the halo glows at apex alignment come out
        // bigger and hotter (novaGlow 0..1 from the animator)
        const g = f.animator?.novaGlow || 0;
        this.projectiles.spawn('plasma', f, from, dir, {
          dmg: mv.dmg * f.dmgMult(), speed: mv.speed,
          splash: mv.splash * (1 + 0.45 * g), color: 0xff5ce8, knock: 10 + 4 * g,
          size: 1 + 0.75 * g,
        });
        this.audio?.play('plasma');
        // apex shots detonate off the staff tip — the flash size tracks how
        // bright the halo is burning, so a 2X-power shot LOOKS 2X
        if (g > 0.4) {
          this.effects.glows.emit(from.x, from.y, from.z, 0, 0, 0,
            { life: 0.28, size: 2.5 + 4.5 * g, color: 0xff5ce8, alpha: 0.95 });
          this.effects.glows.emit(from.x, from.y, from.z, 0, 0, 0,
            { life: 0.18, size: 1.2 + 2.2 * g, color: 0xfff0ff, alpha: 0.95 });
          for (let i = 0; i < Math.round(6 * g); i++) {
            const a = rand(Math.PI * 2);
            this.effects.glows.emit(from.x, from.y, from.z,
              Math.cos(a) * rand(3, 7), rand(-2, 4), Math.sin(a) * rand(3, 7),
              { life: rand(0.25, 0.5), size: rand(0.5, 1.1), color: 0xff5ce8, alpha: 0.9, drag: 1.5 });
          }
        }
        break;
      }
      case 'dart':
        this.projectiles.spawn('dart', f, from, dir, {
          dmg: mv.dmg * f.dmgMult(), speed: mv.speed, color: 0x6cff5c, knock: 4,
          status: { slow: 0.8, slowT: 1.2 },
        });
        this.audio?.play('dart');
        break;
      case 'blade': // VIPER: hurls a forearm sword end-over-end — the blade
        // re-forges in her sheath a beat later (regrowWeapon)
        this.projectiles.spawn('blade', f, from, dir, {
          dmg: mv.dmg * f.dmgMult(), speed: mv.speed, color: 0x5aff2e, knock: 5,
          status: { slow: 0.85, slowT: 1 },
        });
        f.regrowWeapon?.('bladeR');
        this.audio?.play('slash');
        break;
      case 'spear': // AEGIS: javelin throw — the lance reforges in his grip
        this.projectiles.spawn('spear', f, from, dir, {
          dmg: mv.dmg * f.dmgMult(), speed: mv.speed, color: 0x9fd8ff, knock: 12,
        });
        f.regrowWeapon?.('lance');
        this.effects.muzzleFlash(from);
        this.audio?.play('whooshBig');
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
        // arc to their distance (with velocity lead) — direction stays
        // manual. An AIMED lob drops the shell exactly on the crosshair.
        const lobDist = barrelDot > 0.8 ? flatDist : 25;
        const target = aimP
          ? new THREE.Vector3(aimP.x, 0, aimP.z)
          : new THREE.Vector3(
            f.pos.x + Math.sin(f.yaw) * lobDist, 0, f.pos.z + Math.cos(f.yaw) * lobDist
          ).add(new THREE.Vector3(rand(-2, 2), 0, rand(-2, 2)));
        if (!aimP && e && barrelDot > 0.8) target.addScaledVector(e.vel, 1.15).setY(0);
        // twin cannons trade shots — doRanged toggled the side + mirrored clip
        const mFrom = f._altSide && anchors.muzzleL
          ? anchors.muzzleL.getWorldPosition(new THREE.Vector3()) : from;
        this.projectiles.spawn('mortar', f, mFrom, new THREE.Vector3(0, 1, 0), {
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
      case 'hose': { // CRANKY: continuous high-pressure FIREHOSE stream —
        // ticks alternate cannons so BOTH water arms are visibly blasting
        f._hoseSide = !f._hoseSide;
        const hFrom = f._hoseSide && anchors.muzzleL
          ? anchors.muzzleL.getWorldPosition(new THREE.Vector3()) : from;
        // the jet is ONE coherent pressurized tube of water (scrolling-
        // noise stream mesh riding the ballistic arc); droplets and mist
        // are just the breakup spray around it
        // geyser two-shell tech: an aerated outer stream (foam ramp in the
        // shader) around a dense white heart running up the middle
        const jetEnd = this.effects.jet('hose' + f.playerIndex, hFrom, dir, {
          type: 'water', speed: 46, range: mv.range * 1.2, gravity: 30, r0: 0.26, r1: 1.0,
        });
        this.effects.jet('hosecore' + f.playerIndex, hFrom, dir, {
          type: 'watercore', speed: 46, range: mv.range * 1.15, gravity: 30, r0: 0.13, r1: 0.45,
        });
        this.effects.waterJet(hFrom, dir, 42);
        if (jetEnd && jetEnd.y <= 0.4) { // the stream hammers the dirt
          this.effects.splash(jetEnd, 4, 5, 0.9);
          if (Math.random() < 0.25) this.effects.puddle(jetEnd, { slime: false, life: 2.5 });
        }
        if (Math.random() < 0.35) this.audio?.play('wave');
        for (const t of this.fighters) {
          if (t === f || !t.alive) continue;
          const toT = t.center().sub(hFrom);
          const d = toT.length();
          if (d < mv.range && toT.normalize().dot(dir) > 0.8) {
            // the stream SHOVES as it soaks — splash where it lands
            t.takeHit(mv.dmg * f.dmgMult(), f, { knock: 3.4, srcPos: hFrom, soft: true });
            this.effects.splash(t.center(), 7, 7);
          }
        }
        break;
      }
      case 'glitch': { // NULLBOT: a tumbling knot of corrupted voxels —
        // whatever it hits gets a piece of itself turned into glitch
        this.projectiles.spawn('glitch', f, from, dir, {
          dmg: mv.dmg * f.dmgMult(), speed: mv.speed, color: 0xff2df2, knock: 6,
          status: { glitch: 1 },
        });
        this.effects.glitchBurst(from, 6, 4, 0.7 * f.scale);
        this.audio?.play('zap');
        break;
      }
      case 'bats': { // WRAITH: a swarm of hunting bats fans out and homes in
        const target = e && f.isAI ? e : (e && barrelDot > 0.6 ? e : null);
        for (let i = 0; i < (mv.count || 3); i++) {
          const a = f.yaw + (i - ((mv.count || 3) - 1) / 2) * 0.22;
          const bd = new THREE.Vector3(Math.sin(a), dir.y + 0.04, Math.cos(a));
          this.projectiles.spawn('bat', f, from, bd, {
            dmg: mv.dmg * f.dmgMult(), speed: (mv.speed || 24) * rand(0.9, 1.1),
            color: 0x8a2030, knock: 4, life: 3.2, wobble: 1.1,
            homing: target, retarget: !!target, turnRate: 2.4,
          });
        }
        this.audio?.play('howl', { vol: 0.4, pitch: 1.6 });
        this.effects.muzzleFlash(from);
        break;
      }
      case 'groundpound': // TITANUS: the RT is a point-blank seismic quake
        this.groundShockwave(f, f.pos, mv.radius, mv.dmg * f.dmgMult(), mv.knock, 0xffb43c);
        this.audio?.play('slam');
        break;
      case 'spikes': { // SAURION: a fan of BLACK quills thrown off both
        // hands/forearms (his own plumage — regrows, costs nothing)
        for (let i = 0; i < (mv.count || 3); i++) {
          const hand = i % 2 ? f.mech.joints.handL : f.mech.joints.handR;
          const armFrom = hand ? hand.getWorldPosition(new THREE.Vector3()) : from.clone();
          armFrom.y += 0.2;
          const d2 = dir.clone();
          d2.x += rand(-0.04, 0.04);
          d2.y += (i - 1) * 0.035 + rand(-0.01, 0.01);
          d2.z += rand(-0.04, 0.04);
          this.projectiles.spawn('quill', f, armFrom, d2, {
            dmg: mv.dmg * f.dmgMult(), speed: mv.speed * rand(0.95, 1.08),
            color: 0x16161c, trailColor: 0x8a2318, knock: 4,
          });
        }
        this.audio?.play('dart');
        break;
      }
      case 'flea': // JERRY: launches a live robo-shrimp flea that hunts on foot
        this.fleas.spawn(f, from, dir, { dmg: mv.dmg * f.dmgMult() });
        this.effects.muzzleFlash(from);
        break;
      case 'slime': { // FROGGER: a sputtering STREAM of gel wads — a lead
        // glob followed by trailing spatter, all dripping goo in flight
        for (let i = 0; i < 3; i++) {
          const d2 = dir.clone();
          d2.x += rand(-0.045, 0.045); d2.y += rand(-0.015, 0.05); d2.z += rand(-0.045, 0.045);
          this.projectiles.spawn('glob', f, from, d2, {
            dmg: (i === 0 ? mv.dmg : mv.dmg * 0.12) * f.dmgMult(),
            speed: mv.speed * (1 - i * 0.13),
            splash: i === 0 ? mv.splash : 0,
            color: i === 0 ? 0x86d22e : 0x6cb022,
            knock: i === 0 ? 8 : 2,
            status: i === 0 ? { slow: 0.7, slowT: 1.4 } : null,
            size: 1 - i * 0.24,
            goop: true,
          });
        }
        this.effects.slime(from, 4, 4, dir); // muzzle splatter
        this.audio?.play('plasma');
        break;
      }
    }
  }


  startFinisher(winner, victim, onDone) {
    this.finisher = new Finisher(this, winner, victim, onDone);
  }

  clearTransient() {
    this.tasks.length = 0;
    for (const p of this.firePatches) p.flame.dispose();
    this.firePatches.length = 0;
    for (const g of this.geysers) g.fx.dispose();
    this.geysers.length = 0;
    for (const fj of this.flameJets.values()) { fj.nozzle.dispose(); fj.impact.dispose(); }
    this.flameJets.clear();
    for (const ib of this.iceBlocks) this.scene.remove(ib.mesh);
    this.iceBlocks.length = 0;
    for (const p of this.projectiles.active) p.mesh.visible = false;
    this.projectiles.active.length = 0;
    this.projectiles.clearStuck();
    for (const d of this.debris) {
      this.scene.remove(d);
      d.geometry?.dispose?.();
      d.material?.dispose?.();
    }
    this.debris.length = 0;
    this.fleas.clear();
  }
}
