// Per-mech special & ultimate implementations, dispatched by id from roster.
import * as THREE from 'three';
import { rand, clamp, clamp01, angleDiff } from '../core/utils.js';

const _v = new THREE.Vector3();

function fwd(f, dist = 1, y = 0) {
  return new THREE.Vector3(
    f.pos.x + Math.sin(f.yaw) * dist,
    f.pos.y + y,
    f.pos.z + Math.cos(f.yaw) * dist
  );
}
function muzzle(f, name = 'muzzleR') {
  const a = f.mech.anchors[name] || f.mech.anchors.muzzleR;
  return a.getWorldPosition(new THREE.Vector3());
}
// ground aim point led by the victim's current velocity, for slow drops
// (artillery arcs, delayed pillars) that otherwise land where they WERE.
// Uses the victim's nearest image so artillery works across the arena seam.
function leadPos(f, e, t) {
  return new THREE.Vector3(
    f.pos.x + f.world.wrapDelta(e.pos.x - f.pos.x) + e.vel.x * t,
    0,
    f.pos.z + f.world.wrapDelta(e.pos.z - f.pos.z) + e.vel.z * t
  );
}

function aimDir(f, pitch = 0) {
  const e = f.nearestEnemy();
  // AI seeks its target; HUMANS shoot where they're pointing, with only a
  // vertical assist when a target is basically down the barrel
  if (e && f.isAI) {
    const m = muzzle(f);
    const c = e.center();
    return new THREE.Vector3(
      f.world.wrapDelta(c.x - m.x), c.y - m.y, f.world.wrapDelta(c.z - m.z)
    ).normalize();
  }
  const dir = new THREE.Vector3(Math.sin(f.yaw), pitch, Math.cos(f.yaw));
  if (e) {
    const m = muzzle(f);
    const c = e.center();
    const dxw = f.world.wrapDelta(c.x - m.x), dzw = f.world.wrapDelta(c.z - m.z);
    if (Math.abs(angleDiff(f.yaw, Math.atan2(dxw, dzw))) < 0.26) {
      dir.y = (c.y - m.y) / (Math.hypot(dxw, dzw) || 1);
    }
  }
  return dir.normalize();
}

// ============================= SPECIALS =============================

export const SPECIALS = {
  // TITANUS: seismic ground slam
  groundPound(f, sp) {
    const dur = f.animator.play('groundPound', {
      onEvent: (t, a) => {
        if (t === 'fire') {
          const w = f.world;
          w.groundShockwave(f, f.pos, sp.radius, sp.dmg * f.dmgMult(), sp.knock, 0xffb43c);
          w.audio?.play('slam');
        } else if (t === 'shake') f.world.effects.addShake(a);
      },
    });
    f.setState('special', dur * 0.92);
  },

  // VULCAN: homing micro-missile volley
  missileVolley(f, sp) {
    const dur = f.animator.play('shoot');
    f.setState('special', dur * 0.7);
    const target = f.nearestEnemy();
    for (let i = 0; i < sp.count; i++) {
      f.world.schedule(0.08 * i, () => {
        if (!f.alive) return;
        const origin = f.mech.anchors.podL
          ? f.mech.anchors.podL.getWorldPosition(new THREE.Vector3())
          : muzzle(f);
        const d = new THREE.Vector3(rand(-0.35, 0.35), rand(0.7, 1), rand(-0.35, 0.35)).normalize();
        f.world.projectiles.spawn('missile', f, origin, d, {
          dmg: sp.dmg * f.dmgMult(), speed: 30, splash: 2.8, color: 0xff7040,
          homing: target, retarget: true, turnRate: 4.8, life: 4,
        });
        f.world.audio?.play('missile');
      });
    }
  },

  // AEGIS: shield bash + guard buff
  shieldBash(f, sp) {
    const dur = f.animator.play('shieldBash', {
      onEvent: (t) => {
        if (t === 'hit') {
          f.onAttackEvent('hit', 0, {
            dmg: sp.dmg * f.dmgMult(), knock: sp.knock, range: 4.2 * f.scale, heavy: true,
          });
        } else if (t === 'sfx') f.world.audio?.play('whooshBig');
      },
    });
    f.setState('special', dur * 0.85);
    f.status.guard = { f: 0.6, t: sp.guard };
    f.world.effects.rings.spawn(f.pos, { from: 1, to: 5, dur: 0.5, color: 0x49b7ff, y: 1 });
  },

  // VIPER: dash-through strike with i-frames
  phantomStrike(f, sp) {
    const dur = f.animator.play('lunge');
    f.setState('special', 0.42);
    f.iframes = 0.4;
    const sp2 = f.def.stats.speed * 4.6;
    f.vel.x = Math.sin(f.yaw) * sp2;
    f.vel.z = Math.cos(f.yaw) * sp2;
    f.world.audio?.play('dash');
    // damage everyone passed through, checked over the dash
    const victims = new Set();
    for (let i = 1; i <= 8; i++) {
      f.world.schedule(i * 0.045, () => {
        if (!f.alive) return;
        f.world.effects.dashTrail(f.pos, 0x6cff5c, f.scale * 1.4);
        for (const e of f.world.fighters) {
          if (e === f || !e.alive || victims.has(e)) continue;
          if (e.pos.distanceTo(f.pos) < 3.4 * f.scale) {
            victims.add(e);
            e.takeHit(sp.dmg * f.dmgMult(), f, { knock: 10, srcPos: f.pos });
            f.world.engine.addHitStop(0.05);
          }
        }
      });
    }
  },

  // NOVA: three homing star orbs
  starfall(f, sp) {
    const dur = f.animator.play('castRaise', {
      onEvent: (t) => {
        if (t !== 'fire') return;
        const target = f.nearestEnemy();
        for (let i = 0; i < sp.count; i++) {
          f.world.schedule(0.14 * i, () => {
            if (!f.alive) return;
            const origin = muzzle(f).add(new THREE.Vector3(rand(-1, 1), rand(1, 2.5), rand(-1, 1)));
            const g = f.animator?.novaGlow || 0;
            f.world.projectiles.spawn('plasma', f, origin, new THREE.Vector3(0, 1, 0), {
              dmg: sp.dmg * f.dmgMult(), speed: 22, splash: 2.6 * (1 + 0.4 * g), color: 0xff5ce8,
              homing: target, retarget: true, turnRate: 4.0, life: 4.5,
              size: 1 + 0.7 * g,
            });
            f.world.audio?.play('plasma');
          });
        }
      },
    });
    f.setState('special', dur * 0.8);
  },

  // RHINO: bull rush — gallops forward on all fours as long as B is HELD,
  // up to 5s. The run ENDS the moment it connects with someone (one clean
  // launch), or when the button is released.
  bullRush(f, sp) {
    f.animator.play('chargeLean');
    f.setState('special', 5.2); // held-charge ceiling; ended early on release
    f.world.audio?.play('charge');
    f._chargeT = 0;
    const endRush = (recovery) => {
      f._charging = false;
      f.animator.stop();
      f.setState('attack', recovery);
    };
    const tick = () => {
      if (!f.alive || f.state !== 'special') { f._charging = false; return; }
      const dt = 0.05;
      f._chargeT += dt;
      // always commit to at least a short lunge (a tap still connects), then
      // keep charging as long as B is HELD (specialHeld, not the one-frame
      // edge), to a 5s cap
      const holding = (f.intent.specialHeld || f._chargeT < 0.85) && f._chargeT < 5;
      const spd = f.def.stats.speed * 3.1;
      f.vel.x = Math.sin(f.yaw) * spd;
      f.vel.z = Math.cos(f.yaw) * spd;
      // gentle steer toward a nearby enemy (AI only — players aim the run)
      if (f.isAI) {
        const e0 = f.nearestEnemy();
        if (e0 && f.pos.distanceTo(e0.pos) < 40) {
          f.targetYaw = f.yawTo(e0);
          f.yaw += clamp(angleDiff(f.targetYaw, f.yaw), -0.05, 0.05);
        }
      }
      f.world.effects.dustPuff(f.pos, 2, 0x9a9088);
      for (const e of f.world.fighters) {
        if (e === f || !e.alive) continue;
        const dx = f.world.wrapDelta(e.pos.x - f.pos.x), dz = f.world.wrapDelta(e.pos.z - f.pos.z);
        if (Math.hypot(dx, dz) < 3.6 * f.scale) {
          e.takeHit(sp.dmg * f.dmgMult(), f, { knock: sp.knock, launch: 8, srcPos: f.pos, heavy: true });
          f.world.engine.addHitStop(0.08);
          f.world.effects.addShake(0.5);
          endRush(0.45); // impact ends the run
          return;
        }
      }
      if (holding) f.world.schedule(dt, tick);
      else endRush(0.3); // released / timed out
    };
    f._charging = true;
    f.world.schedule(0.05, tick);
  },

  // TEMPEST: summons a crackling storm cell a short way in front of him —
  // a dark cloud gathers overhead, then lightning hammers DOWN out of it at
  // the ground and at anyone caught underneath
  staticField(f, sp) {
    const dur = f.animator.play('burst', {
      onEvent: (t) => {
        if (t !== 'fire') return;
        const w = f.world;
        // storm placed well AHEAD of tempest — it's a zoning tool, not a
        // self-centered burst
        const center = fwd(f, sp.radius * 0.95);
        center.y = 0;
        const cloudY = 13;
        // the storm cloud: a heavy slab of churning dark smoke hanging over
        // the area — emitted in two waves so it lingers through the strikes
        for (const delay of [0, 0.45]) {
          w.schedule(delay, () => {
            if (!f.alive) return;
            for (let i = 0; i < 34; i++) {
              const a = rand(Math.PI * 2), r = Math.sqrt(Math.random()) * sp.radius * 0.9;
              w.effects.smoke.emit(center.x + Math.cos(a) * r, cloudY + rand(-1.4, 1.8), center.z + Math.sin(a) * r,
                rand(-1.4, 1.4), rand(-0.3, 0.5), rand(-1.4, 1.4),
                { life: rand(1.5, 2.3), size: rand(5, 8.5), color: 0x10141d, alpha: 0.95, grow: 1.3 });
            }
            // static shimmer inside the cloud
            for (let i = 0; i < 10; i++) {
              const a = rand(Math.PI * 2), r = rand(0, sp.radius * 0.7);
              w.effects.glows.emit(center.x + Math.cos(a) * r, cloudY + rand(-1, 1), center.z + Math.sin(a) * r,
                0, 0, 0, { life: rand(0.2, 0.45), size: rand(1.5, 3), color: 0x9fdcff, alpha: 0.9 });
            }
          });
        }
        w.effects.rings.spawn(center, { from: 1, to: sp.radius * 2, dur: 0.55, color: 0x53e8ff, y: 0.5 });
        w.audio?.play('thunder');
        // coil show on the caster
        for (const cn of ['coilL', 'coilR']) {
          if (f.mech.anchors[cn]) {
            const p = f.mech.anchors[cn].getWorldPosition(new THREE.Vector3());
            w.effects.lightning.spawn(p, p.clone().add(new THREE.Vector3(rand(-4, 4), rand(2, 5), rand(-4, 4))), { color: 0x8fe8ff });
          }
        }
        // bolts hammer down over ~0.5s: every caught bot eats a strike from
        // the cloud, plus scattered ground strikes to sell the storm
        const bolts = [];
        for (const e of w.fighters) {
          if (e === f || !e.alive) continue;
          const dx = w.wrapDelta(e.pos.x - center.x), dz = w.wrapDelta(e.pos.z - center.z);
          if (Math.hypot(dx, dz) < sp.radius) bolts.push({ victim: e });
        }
        for (let i = 0; i < 7; i++) {
          const a = rand(Math.PI * 2), r = rand(1.5, sp.radius * 0.9);
          bolts.push({ x: center.x + Math.cos(a) * r, z: center.z + Math.sin(a) * r });
        }
        bolts.forEach((b, i) => {
          w.schedule(0.05 + i * 0.08, () => {
            if (!f.alive) return;
            const gx = b.victim ? b.victim.pos.x : b.x;
            const gz = b.victim ? b.victim.pos.z : b.z;
            const top = new THREE.Vector3(gx + rand(-1, 1), cloudY, gz + rand(-1, 1));
            const ground = new THREE.Vector3(gx, 0.1, gz);
            // a hot beam core wrapped in two jagged arcs reads as a REAL bolt
            w.effects.lightning.spawn(top, ground, { color: 0xeaffff, dur: 0.22, jag: 3.2, thick: 0.24 });
            w.effects.lightning.spawn(top, ground, { color: 0x9fdcff, dur: 0.26, jag: 2.2, thick: 0.12 });
            w.effects.glows.emit(gx, 1, gz, 0, 0, 0, { life: 0.25, size: 6, color: 0xbfefff, alpha: 1 });
            w.effects.rings.spawn(ground, { from: 0.4, to: 4.2, dur: 0.3, color: 0x9fdcff, y: 0.25 });
            w.audio?.play('zap');
            w.effects.addShake(0.3);
            if (b.victim && b.victim.alive) {
              b.victim.takeHit(sp.dmg * f.dmgMult(), f, { knock: 14, srcPos: center, status: { slow: 0.6, slowT: 1.6 } });
              // ELECTRIFIED: the jolt locks their servos for a beat — a real
              // stun on top of the slow, with the charge crackling off them
              if (b.victim.alive && b.victim.state !== 'launched' && b.victim.state !== 'frozen') {
                b.victim.setState('hitstun', 0.85);
                b.victim.animator.addImpulse('torso', [rand(-0.3, 0.3), 0, rand(-0.3, 0.3)], 46, 8);
              }
              w.effects.staticCling(b.victim, 1.6); // charge crackles off them
            }
          });
        });
      },
    });
    f.setState('special', dur * 0.85);
  },

  // FENRIR: lunar pounce
  pounce(f, sp) {
    f.animator.play('lunge');
    f.setState('special', 0.75);
    f.world.audio?.play('howl');
    const e = f.nearestEnemy();
    if (e && f.isAI) {
      // AI leads the landing point — the leap is airborne ~0.7s.
      // Humans leap where THEY aim (doSpecial already applied aimYaw).
      const px = e.pos.x + e.vel.x * 0.5, pz = e.pos.z + e.vel.z * 0.5;
      f.yaw = f.targetYaw = Math.atan2(px - f.pos.x, pz - f.pos.z);
    }
    // range-clamp onto a target that's already down the aim line
    const onLine = e && Math.abs(angleDiff(f.yaw, f.yawTo(e))) < 0.45;
    const dist = onLine ? Math.min(sp.leap, f.pos.distanceTo(e.pos)) : sp.leap;
    f.vel.x = Math.sin(f.yaw) * dist * 1.6;
    f.vel.z = Math.cos(f.yaw) * dist * 1.6;
    f.vel.y = 12;
    f.grounded = false;
    let landed = false;
    const check = () => {
      if (landed || !f.alive) return;
      if (f.grounded) {
        landed = true;
        f.world.groundShockwave(f, f.pos, 5.5 * f.scale, sp.dmg * f.dmgMult(), 16, 0x6cd8ff);
        f.world.audio?.play('slam');
        f.setState('normal');
      } else {
        f.world.schedule(0.05, check);
      }
    };
    f.world.schedule(0.25, check);
  },

  // COLOSSUS: seize the nearest bot in front of him, hoist them clean over
  // his head, and HURL them across the arena
  grabThrow(f, sp) {
    const w = f.world;
    f.animator.play('grabReach');
    f.setState('special', 1.6);
    w.audio?.play('servo');
    w.schedule(0.2, () => {
      if (!f.alive || f.state !== 'special') return;
      // whoever's in the hands: close, in the front cone, near ground level
      let prey = null, best = Infinity;
      for (const v of w.fighters) {
        if (v === f || !v.alive || v.iframes > 0) continue;
        const dx = w.wrapDelta(v.pos.x - f.pos.x), dz = w.wrapDelta(v.pos.z - f.pos.z);
        const d = Math.hypot(dx, dz);
        if (d > (sp.range || 4.5) * f.scale + v.hitRadius) continue;
        if (Math.abs(angleDiff(f.yaw, Math.atan2(dx, dz))) > 0.85) continue;
        if (Math.abs(v.pos.y - f.pos.y) > 4) continue;
        if (d < best) { prey = v; best = d; }
      }
      if (!prey) {
        // grabbed a fistful of air — recover
        f.animator.stop();
        f.setState('attack', 0.35);
        return;
      }
      // GOT ONE — hoist them overhead. The victim's own update pins them
      // every FRAME via the carried state (smoothstep rise — the old
      // 0.05s schedule-tick pinning let gravity sag between ticks: jiggle)
      const LIFT = 0.55;
      f.animator.play('liftHold');
      w.engine.addHitStop(0.06);
      prey.takeHit(sp.dmg * 0.3 * f.dmgMult(), f, { knock: 0, srcPos: f.pos, heavy: true, silent: true });
      prey.setState('launched', 3);
      prey.animator.play('launched');
      prey.iframes = LIFT + 0.2; // the cargo can't be sniped mid-lift
      prey.grounded = false;
      prey._carry = {
        by: f, t: LIFT + 0.4,
        x0: prey.pos.x, y0: prey.pos.y, z0: prey.pos.z, riseT: 0,
      };
      // THE THROW — far and flat
      w.schedule(LIFT + 0.02, () => {
        if (!f.alive || f.state !== 'special') {
          prey._carry = null;
          prey.group.rotation.x = 0; // lift broken: unwind the slam roll
          prey.group.rotation.z = 0;
          return;
        }
        f.animator.play('throwHeave');
        f.setState('special', 0.5);
        if (prey.alive) {
          prey._carry = null;
          f.carryPoint(prey, prey.pos); // launched straight out of the palms
          prey.grounded = false;
          prey.iframes = 0; // the throw itself always lands
          prey.takeHit(sp.dmg * 0.7 * f.dmgMult(), f, { knock: 0, srcPos: f.pos, heavy: true });
          prey.setState('launched', 3);
          prey.animator.play('launched');
          const tvx = Math.sin(f.yaw) * (sp.throw || 36);
          const tvz = Math.cos(f.yaw) * (sp.throw || 36);
          prey.vel.x = tvx;
          prey.vel.z = tvz;
          prey.vel.y = 13;
          prey.grounded = false;
          // hold the throw momentum through the flight — air-control drag
          // would otherwise dump them a few steps away instead of FAR.
          // The flat body-slam roll unwinds when the flight ends.
          let flyT = 0;
          const fly = () => {
            if (!prey.alive || prey.grounded || flyT > 1.3) {
              prey.group.rotation.x = 0;
              prey.group.rotation.z = 0;
              return;
            }
            flyT += 0.05;
            prey.vel.x = tvx;
            prey.vel.z = tvz;
            w.schedule(0.05, fly);
          };
          w.schedule(0.05, fly);
          w.audio?.play('whooshBig');
          w.effects.addShake(0.6);
          w.engine.addHitStop(0.1);
        }
        w.schedule(0.5, () => { if (f.state === 'special') f.setState('normal'); });
      });
    });
  },

  // COLOSSUS (legacy): artillery barrage on target area
  barrage(f, sp) {
    const fallback = fwd(f, 24);
    const dur = f.animator.play('brace', {
      onEvent: (t, a) => {
        if (t === 'shake') { f.world.effects.addShake(a); return; }
        if (t !== 'fire') return;
        for (let i = 0; i < sp.count; i++) {
          f.world.schedule(0.22 * i, () => {
            if (!f.alive) return;
            const from = muzzle(f, i % 2 ? 'muzzleL' : 'muzzleR');
            // re-aim EACH shell at launch, led by its own flight time —
            // one stale aim point misses everything by the last shell
            const arcTime = rand(1.1, 1.5);
            const e = f.nearestEnemy();
            const target = e ? leadPos(f, e, arcTime * 0.85) : fallback;
            const to = target.clone().add(new THREE.Vector3(rand(-sp.radius, sp.radius) * 0.45, 0, rand(-sp.radius, sp.radius) * 0.45));
            f.world.projectiles.spawn('mortar', f, from, new THREE.Vector3(0, 1, 0), {
              dmg: sp.dmg * f.dmgMult(), splash: 4, color: 0xffd23c, arcTo: to, arcTime,
            });
            f.world.audio?.play('mortar');
            f.animator.addImpulse('torso', [-0.12, 0, 0], 30, 10);
          });
        }
      },
    });
    f.setState('special', dur * 0.85);
  },

  // WRAITH: cloak (legacy — Ghost Protocol now uses ghostWalk below)
  cloak(f, sp) {
    f.status.cloak = { t: sp.duration, spd: sp.speedBoost };
    f.setOpacity(0.16);
    f.world.audio?.play('cloak');
    f.world.effects.rings.spawn(f.pos, { from: 3, to: 0.5, dur: 0.4, color: 0xff3838, y: f.height * 0.5 });
  },

  // WRAITH: Ghost Protocol — projects a white spectre of his body that
  // glides forward hurting everything it passes through for as long as B is
  // HELD (the robot stands locked); on release he teleports INTO the ghost:
  // his player sees a zip forward, everyone else sees the spectre solidify
  ghostWalk(f, sp) {
    const w = f.world;
    f.setState('special', (sp.duration || 5) + 0.4);
    f.animator.play('aim', { speed: 0.5 });
    w.audio?.play('cloak');

    // build the spectre: bake the current pose into a throwaway shell whose
    // meshes carry the live world matrices, then glide the shell forward
    const gmat = new THREE.MeshBasicMaterial({
      color: 0xdfefff, transparent: true, opacity: 0.34,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ghost = new THREE.Group();
    f.mech.group.updateWorldMatrix(true, true);
    f.mech.group.traverse((o) => {
      if (!o.isMesh) return;
      const m = new THREE.Mesh(o.geometry, gmat);
      m.matrixAutoUpdate = false;
      m.matrix.copy(o.matrixWorld);
      ghost.add(m);
    });
    w.scene.add(ghost);
    w.effects.rings.spawn(f.pos, { from: 3, to: 0.5, dur: 0.4, color: 0xbfe8ff, y: f.height * 0.5 });

    const dirX = Math.sin(f.yaw), dirZ = Math.cos(f.yaw);
    const ox = f.pos.x, oz = f.pos.z; // spectre walks from the CAST spot —
    // even if the body gets shoved mid-channel, he teleports to the ghost
    const speed = sp.speed || 17;
    let traveled = 0;
    let t = 0;
    const victims = new Set();
    f._charging = true; // reuses the AI hold-the-button behavior
    const gx = () => ox + dirX * traveled;
    const gz = () => oz + dirZ * traveled;

    const finish = () => {
      f._charging = false;
      // the spectre solidifies — the robot zips into its position
      const tx = gx(), tz = gz();
      w.effects.dashTrail(f.pos, 0xbfe8ff, f.scale * 1.6);
      f.pos.x = tx;
      f.pos.z = tz;
      w.effects.dashTrail(f.pos, 0xbfe8ff, f.scale * 1.6);
      w.effects.rings.spawn(f.pos, { from: 0.5, to: 4, dur: 0.35, color: 0xbfe8ff, y: 1 });
      w.audio?.play('dash');
      w.scene.remove(ghost);
      gmat.dispose();
      f.iframes = 0.35; // re-materialize grace
      f.animator.stop();
      f.setState('attack', 0.25);
    };

    const tick = () => {
      if (!f.alive || f.state !== 'special') {
        f._charging = false;
        w.scene.remove(ghost);
        gmat.dispose();
        return;
      }
      const dt = 0.05;
      t += dt;
      // min commit so a tap still projects a short walk; hold extends to cap
      const holding = (f.intent.specialHeld || t < 0.9) && t < (sp.duration || 5) && traveled < 58;
      f.vel.x = 0;
      f.vel.z = 0;
      traveled += speed * dt;
      ghost.position.set(dirX * traveled, 0, dirZ * traveled);
      // spectral wake
      w.effects.glows.emit(gx() + rand(-0.5, 0.5), f.pos.y + rand(1, f.height * 0.8), gz() + rand(-0.5, 0.5),
        0, 1.5, 0, { life: 0.35, size: rand(1, 1.8), color: 0xbfe8ff, alpha: 0.55 });
      // the spectre rips through anyone it overlaps
      for (const e2 of w.fighters) {
        if (e2 === f || !e2.alive || victims.has(e2)) continue;
        const dx = w.wrapDelta(e2.pos.x - gx()), dz = w.wrapDelta(e2.pos.z - gz());
        if (Math.hypot(dx, dz) < 3.4 * f.scale && Math.abs(e2.pos.y - f.pos.y) < 4) {
          victims.add(e2);
          e2.takeHit(sp.dmg * f.dmgMult(), f, { knock: 6, srcPos: new THREE.Vector3(gx(), e2.pos.y, gz()) });
          w.effects.impactSparks(e2.center(), 0xbfe8ff, 12, 8);
          w.audio?.play('slash');
        }
      }
      if (holding) w.schedule(dt, tick);
      else finish();
    };
    w.schedule(0.05, tick);
  },

  // INFERNO: napalm carpet
  napalm(f, sp) {
    const dur = f.animator.play('shoot');
    f.setState('special', dur * 0.7);
    for (let i = 0; i < sp.patches; i++) {
      f.world.schedule(0.12 * i, () => {
        if (!f.alive) return;
        const pos = fwd(f, 6 + i * 4.5);
        pos.y = 0;
        f.world.addFirePatch(f, pos, 3, sp.duration, sp.dmg);
        f.world.audio?.play('flame');
      });
    }
  },

  // CRANKY: water column erupts under the target — a bubbling warning patch
  // telegraphs the spot first (evadable), then the geyser blasts skyward in
  // a column of water particles
  geyser(f, sp) {
    const WARN = 0.85; // telegraph long enough to sidestep
    const dur = f.animator.play('castRaise', {
      onEvent: (t) => {
        if (t !== 'fire') return;
        const w = f.world;
        const e = f.nearestEnemy();
        const target = e ? leadPos(f, e, WARN + 0.45) : fwd(f, 14);
        target.y = 0;
        w.audio?.play('cast');
        // ---- warning: pulsing danger rings + water bubbling out of the ground
        for (let i = 0; i < 4; i++) {
          w.schedule(i * 0.21, () => {
            w.effects.rings.spawn(target, { from: 0.6, to: sp.radius * 1.5, dur: 0.34, color: 0x4fc3ff, y: 0.3 });
          });
        }
        const bubbleTicks = Math.floor(WARN / 0.05);
        for (let i = 0; i < bubbleTicks; i++) {
          w.schedule(i * 0.05, () => {
            const boil = 0.5 + (i / bubbleTicks); // churn harder as it primes
            const a = rand(Math.PI * 2), r = Math.sqrt(Math.random()) * sp.radius * 0.8;
            w.effects.drops.emit(target.x + Math.cos(a) * r, 0.3, target.z + Math.sin(a) * r,
              rand(-0.5, 0.5), rand(2, 4.5) * boil, rand(-0.5, 0.5),
              { life: rand(0.3, 0.6), size: rand(0.6, 1.4) * boil, color: 0xcfe8f6, color2: 0x4a80b0, alpha: 0.9, gravity: 14 });
          });
        }
        // ---- eruption: roaring column of WATER hurled skyward — a real
        // coherent jet tube (same substance system as the hose), refreshed
        // every tick so the column stands as churning matter, not light
        const jetKey = 'geyser' + f.playerIndex + ((Math.random() * 1e6) | 0);
        const UP = new THREE.Vector3(0, 1, 0);
        w.schedule(WARN, () => {
          for (let k = 0; k < 16; k++) {
            w.schedule(k * 0.05, () => {
              w.effects.jet(jetKey, target, UP, {
                type: 'water', speed: 40, range: 26, gravity: 4,
                r0: 0.9, r1: 2.8,
              });
            });
          }
          w.effects.rings.spawn(target, { from: 1, to: sp.radius * 2.2, dur: 0.5, color: 0xbfe8ff, y: 0.4 });
          // the blowout: one brief, HUGE fountain — tall fast jets across
          // the whole (doubled) eruption area
          for (let i = 0; i < 60; i++) {
            const a = rand(Math.PI * 2), r = Math.sqrt(Math.random()) * sp.radius * 0.6;
            if (i % 4 === 0) { // foam flecks riding the column
              w.effects.glows.emit(target.x + Math.cos(a) * r, rand(0.2, 2), target.z + Math.sin(a) * r,
                Math.cos(a) * rand(1, 4), rand(24, 40), Math.sin(a) * rand(1, 4),
                { life: rand(0.4, 0.7), size: rand(0.5, 1), color: 0xffffff, alpha: 0.55, gravity: 26, drag: 0.35 });
            } else { // the water itself
              w.effects.drops.emit(target.x + Math.cos(a) * r, rand(0.2, 2), target.z + Math.sin(a) * r,
                Math.cos(a) * rand(1, 4), rand(24, 40), Math.sin(a) * rand(1, 4),
                { life: rand(0.8, 1.4), size: rand(1, 2.2), color: 0xcfe8f6, color2: 0x4276a8, alpha: 0.92, gravity: 26, drag: 0.35 });
            }
          }
          // main jet: dense fast water particles rocketing up the column core,
          // fired in three quick pulses so the column stays solid for longer
          for (const delay of [0, 0.14, 0.3]) {
            w.schedule(delay, () => {
              for (let i = 0; i < 22; i++) {
                const a = rand(Math.PI * 2), r = rand(0, sp.radius * 0.45);
                w.effects.drops.emit(target.x + Math.cos(a) * r, rand(0.2, 2.5), target.z + Math.sin(a) * r,
                  Math.cos(a) * rand(0.5, 2), rand(17, 30), Math.sin(a) * rand(0.5, 2),
                  { life: rand(0.6, 1.1), size: rand(1, 2), color: i % 3 ? 0xcfe8f6 : 0xffffff, color2: 0x4276a8, alpha: 0.92, gravity: 22, drag: 0.4 });
              }
            });
          }
          // spray: wider, slower droplets fanning out of the blast
          for (let i = 0; i < 24; i++) {
            const a = rand(Math.PI * 2);
            w.effects.drops.emit(target.x + Math.cos(a) * rand(0.5, 1.5), rand(1, 4), target.z + Math.sin(a) * rand(0.5, 1.5),
              Math.cos(a) * rand(3, 8), rand(9, 18), Math.sin(a) * rand(3, 8),
              { life: rand(0.6, 1.2), size: rand(0.6, 1.3), color: 0xbfe0f2, color2: 0x4276a8, alpha: 0.9, gravity: 26, drag: 0.3 });
          }
          // mist pluming off the column
          for (let i = 0; i < 8; i++) {
            const a = rand(Math.PI * 2);
            w.effects.smoke.emit(target.x + Math.cos(a) * rand(0.5, 2), rand(2, 14), target.z + Math.sin(a) * rand(0.5, 2),
              Math.cos(a) * rand(1, 2.5), rand(2, 5), Math.sin(a) * rand(1, 2.5),
              { life: rand(0.7, 1.2), size: rand(2, 3.5), color: 0xcfeaff, alpha: 0.35, grow: 1.6 });
          }
          w.audio?.play('wave');
          w.audio?.play('explosionBig');
          w.effects.addShake(0.8);
          for (const v of w.fighters) {
            if (v === f || !v.alive) continue;
            const dx = w.wrapDelta(v.pos.x - target.x), dz = w.wrapDelta(v.pos.z - target.z);
            if (Math.hypot(dx, dz) < sp.radius + v.hitRadius * 0.5) {
              v.takeHit(sp.dmg * f.dmgMult(), f, { knock: 5, launch: sp.launch, srcPos: target, heavy: true });
            }
          }
        });
      },
    });
    f.setState('special', dur * 0.85);
  },

  // SAURION: raptor pounce — a HIGH bird-of-prey kill-leap. The latch only
  // sticks if he comes down ON TOP of the victim (high on their body);
  // then he perches on them, feet clamped in, hammering down fast pecks.
  // Landing on dirt = just a crouch recovery, zero damage.
  sickleRush(f, sp) {
    const w = f.world;
    const e = f.nearestEnemy();
    f.animator.play('pounceLeap');
    f.setState('special', 2.2);
    f.iframes = 0.4;
    w.audio?.play('jump');
    // tall ballistic pounce — high enough to drop onto a mech's shoulders
    const VY = 21;
    const T = (2 * VY) / 34; // ~1.24s airtime
    const maxLeap = sp.leap || 44;
    let dist = maxLeap;
    if (e && f.isAI) {
      // AI leads the victim; humans pounce along their own facing
      const lead = leadPos(f, e, T * 0.85);
      const dx = w.wrapDelta(lead.x - f.pos.x), dz = w.wrapDelta(lead.z - f.pos.z);
      f.yaw = f.targetYaw = Math.atan2(dx, dz);
      dist = Math.min(maxLeap, Math.hypot(dx, dz));
    } else if (e && Math.abs(angleDiff(f.yaw, f.yawTo(e))) < 0.45) {
      // aimed at them already: shorten the leap to come down ON the target
      const dx = w.wrapDelta(e.pos.x - f.pos.x), dz = w.wrapDelta(e.pos.z - f.pos.z);
      dist = Math.min(maxLeap, Math.hypot(dx, dz) + e.vel.length() * 0.3);
    }
    let vx0 = Math.sin(f.yaw) * dist / T;
    let vz0 = Math.cos(f.yaw) * dist / T;
    f.vel.x = vx0;
    f.vel.z = vz0;
    f.vel.y = VY;
    f.grounded = false;
    let done = false;

    const latch = (prey) => {
      // TALONS IN — he lands on their upper body and PERCHES there, feet
      // gripping high on the frame, tearing in with quick raptor pecks
      const RIDE = 0.72;
      f.setState('special', RIDE + 0.3);
      f.iframes = 0.5;
      f.animator.play('biteLatch');
      w.audio?.play('slash');
      w.engine.addHitStop(0.09);
      prey.takeHit(sp.dmg * f.dmgMult(), f, { knock: 2, srcPos: f.pos, heavy: true });
      prey.applyStatus({ burn: sp.bleed, burnT: 2.4 });
      const ang = f.yaw; // rides facing his leap direction
      const perch = () => {
        f.pos.x = prey.pos.x - Math.sin(ang) * prey.hitRadius * 0.4;
        f.pos.z = prey.pos.z - Math.cos(ang) * prey.hitRadius * 0.4;
        // crouched into them with the jaws working the NECK: perch so the
        // head-strike arc (~his own head height minus the peck dip) lands
        // at the prey's collar — clamped so small prey don't read as
        // contortion and giants still get bitten somewhere honest
        f.pos.y = prey.pos.y + clamp(
          prey.height * 0.8 - f.height * 0.35,
          prey.height * 0.22, prey.height * 0.62);
        f.vel.set(0, 0, 0);
        f.grounded = false;
        f.yaw = f.targetYaw = ang;
      };
      perch();
      const ticks = Math.round(RIDE / 0.05);
      for (let i = 1; i <= ticks; i++) {
        w.schedule(i * 0.05, () => {
          if (!f.alive || !prey.alive || f.state !== 'special') return;
          perch(); // stay perched wherever the struggle carries them
        });
      }
      // three fast pecking strikes while riding
      for (const bt of [0.2, 0.42, 0.62]) {
        w.schedule(bt, () => {
          if (!f.alive || !prey.alive) return;
          prey.takeHit(sp.dmg * 0.22 * f.dmgMult(), f, { knock: 1, srcPos: f.pos });
          w.audio?.play('slash');
          w.effects.impactSparks(prey.center(), 0xff3826, 10, 8);
          f.animator.addImpulse('head', [0.4, 0, 0], 26, 9);
        });
      }
      // kick off the carcass and spring clear
      w.schedule(RIDE, () => {
        if (!f.alive) return;
        f.animator.stop();
        if (f.state === 'special') {
          f.vel.x = -Math.sin(f.yaw) * 8;
          f.vel.z = -Math.cos(f.yaw) * 8;
          f.vel.y = 9;
          f.grounded = false;
          f.setState('normal');
        }
      });
    };

    const hunt = () => {
      if (done || !f.alive) return;
      // once he's cresting/descending, look for a victim UNDER the claws —
      // the latch requires hitting them HIGH on the body, riding down on top
      if (f.vel.y < 4) {
        let dive = null, diveD = Infinity;
        for (const v of w.fighters) {
          if (v === f || !v.alive) continue;
          const dx = w.wrapDelta(v.pos.x - f.pos.x), dz = w.wrapDelta(v.pos.z - f.pos.z);
          const dh = Math.hypot(dx, dz);
          const relY = f.pos.y - v.pos.y;
          if (dh < v.hitRadius + 2.0 * f.scale &&
              relY > v.height * 0.35 && relY < v.height * 1.6) {
            done = true;
            latch(v);
            return;
          }
          // candidate for the dive correction below
          if (dh < 26 && dh < diveD &&
              Math.abs(angleDiff(Math.atan2(dx, dz), Math.atan2(vx0, vz0))) < 0.9) {
            dive = v;
            diveD = dh;
          }
        }
        // stooping-hawk correction: he curves the dive onto moving prey —
        // this is what makes the pounce actually CONNECT on a strafing bot
        if (dive) {
          const dx = w.wrapDelta(dive.pos.x - f.pos.x), dz = w.wrapDelta(dive.pos.z - f.pos.z);
          const drop = f.pos.y - (dive.pos.y + dive.height * 0.8);
          const tRem = Math.max(0.12, drop / Math.max(6, -f.vel.y));
          vx0 += (dx / tRem - vx0) * 0.22;
          vz0 += (dz / tRem - vz0) * 0.22;
          const sp2 = Math.hypot(vx0, vz0);
          if (sp2 > 40) { vx0 *= 40 / sp2; vz0 *= 40 / sp2; }
        }
      }
      if (f.grounded) {
        // came down on dirt: absorb the landing in a crouch, stand back up
        done = true;
        f.duckT = 1;
        w.effects.dustPuff(f.pos, 3, 0x9a8f80);
        w.audio?.play('land');
        f.animator.stop();
        f.setState('attack', 0.35);
        return;
      }
      // hold the ballistic arc — air-control damping would otherwise bleed
      // the horizontal velocity away and dump him far short of the prey
      f.vel.x = vx0;
      f.vel.z = vz0;
      w.schedule(0.04, hunt);
    };
    w.schedule(0.12, hunt);
  },

  // FROGGER: all four gunk guns lob a sticky mortar carpet
  slimeBarrage(f, sp) {
    // a rain of lumpy slime GLOBS — every wad that lands splats a puddle
    // and gunks blotches onto whoever it hits (the goop flag drives both)
    const dur = f.animator.play('spray', { speed: 1.4 });
    f.setState('special', Math.min(dur, 1.0));
    for (let i = 0; i < sp.count; i++) {
      f.world.schedule(0.09 * i, () => {
        if (!f.alive) return;
        const from = muzzle(f, i % 2 ? 'muzzleL' : 'muzzleR');
        const arcTime = rand(0.7, 1.0);
        const e = f.nearestEnemy();
        const target = e ? leadPos(f, e, arcTime * 0.8) : fwd(f, 16);
        target.x += rand(-sp.radius, sp.radius) * 0.4;
        target.z += rand(-sp.radius, sp.radius) * 0.4;
        f.world.projectiles.spawn('glob', f, from, new THREE.Vector3(0, 1, 0), {
          dmg: sp.dmg * f.dmgMult(), splash: 2.6, color: 0x9ade2a, arcTo: target, arcTime,
          status: { slow: 0.6, slowT: 1.8 }, goop: true, size: rand(0.9, 1.4),
        });
        f.world.effects.slime(from, 3, 2);
        f.world.audio?.play('plasma');
      });
    }
  },

  // JERRY: both cannons cough up a scattering burst of live robo-shrimp
  // fleas that hop off hunting on their own
  fleaSwarm(f, sp) {
    const dur = f.animator.play('shoot');
    f.setState('special', Math.min(dur, 0.8));
    for (let i = 0; i < sp.count; i++) {
      f.world.schedule(0.09 * i, () => {
        if (!f.alive) return;
        const from = muzzle(f, i % 2 ? 'muzzleL' : 'muzzleR');
        const a = f.yaw + rand(-0.55, 0.55);
        f.world.fleas.spawn(f, from, new THREE.Vector3(Math.sin(a), 0.55, Math.cos(a)), {
          dmg: sp.dmg * f.dmgMult(),
        });
        f.world.effects.muzzleFlash(from);
      });
    }
  },

  // GLACIER: cryo beam channel
  freezeBeam(f, sp) {
    f.animator.play('shootLoop');
    f.setState('special', sp.duration);
    const ticks = Math.floor(sp.duration / 0.12);
    for (let i = 0; i < ticks; i++) {
      f.world.schedule(i * 0.12, () => {
        if (!f.alive || f.state !== 'special') return;
        f.firing = true;
        f.faceNearestEnemyIfClose(40, true);
        const from = muzzle(f);
        const dir = aimDir(f);
        const end = from.clone().addScaledVector(dir, 24);
        f.world.effects.beams.spawn(from, end, { radius: 0.5, dur: 0.14, color: 0x9be8ff });
        f.world.effects.snowCone(from, dir);
        if (i % 3 === 0) f.world.audio?.play('freeze');
        for (const e of f.world.fighters) {
          if (e === f || !e.alive) continue;
          const c = e.center();
          const t = c.clone().sub(from).dot(dir);
          if (t > 0 && t < 26) {
            const closest = from.clone().addScaledVector(dir, t);
            if (closest.distanceTo(c) < e.hitRadius + 1.2) {
              // iced over: the whole body stays frost-WHITE for exactly as
              // long as the beam is on them (thaws right back after), while
              // the tick flinches shake them and the slow bogs them down
              e._beamWhiteT = 0.18;
              e.takeHit(sp.dmg * f.dmgMult(), f, {
                knock: 1, srcPos: from, silent: true, soft: true,
                status: { slow: sp.slow, slowT: 1.2 },
              });
            }
          }
        }
      });
    }
    f.world.schedule(sp.duration + 0.05, () => { if (f.state === 'special') { f.animator.stop(); f.setState('normal'); } });
  },
};

// ============================= ULTIMATES =============================

export const ULTS = {
  // TITANUS: leap + meteor slam
  meteorBreaker(f, u) {
    f.setState('ult', 2.2);
    f.animator.play('launched');
    f.vel.y = 26;
    f.grounded = false;
    f.iframes = 1.2;
    f.world.audio?.play('powerup');
    const e = f.nearestEnemy();
    if (e) {
      const dx = e.pos.x - f.pos.x, dz = e.pos.z - f.pos.z;
      f.vel.x = dx / 1.4; f.vel.z = dz / 1.4;
    }
    f.world.schedule(0.7, () => {
      if (!f.alive) return;
      f.vel.y = -46;
      f.animator.play('groundPound', { speed: 1.6 });
      const land = () => {
        if (!f.alive) return;
        if (f.grounded) {
          f.world.groundShockwave(f, f.pos, u.radius, u.dmg * f.dmgMult(), u.knock, 0xffb43c, true);
          f.world.effects.explosion(f.pos, u.radius * 0.8, { color: 0xffa040 });
          f.world.effects.addShake(1.6);
          f.world.engine.addHitStop(0.16);
          f.world.audio?.play('explosionBig');
          f.setState('normal');
        } else f.world.schedule(0.04, land);
      };
      f.world.schedule(0.1, land);
    });
  },

  // VULCAN: spinning 360 bullet storm
  bulletHurricane(f, u) {
    f.setState('ult', u.duration);
    f.animator.play('spinFire');
    f.world.audio?.play('powerup');
    const ticks = Math.floor(u.duration / 0.05);
    for (let i = 0; i < ticks; i++) {
      f.world.schedule(i * 0.05, () => {
        if (!f.alive || f.state !== 'ult') return;
        f.firing = true;
        f.yaw += 0.42;
        f.targetYaw = f.yaw;
        const from = muzzle(f);
        // the spin pose raises the gatlings — pitch the ring down to chest
        // height or the whole storm sails over everyone's head
        const e = f.nearestEnemy();
        const aimY = e ? e.center().y : 3.5;
        const dy = clamp((aimY - from.y) / 14, -0.4, 0.08) + rand(-0.05, 0.05);
        // every third round tracks the nearest enemy so the storm still
        // punishes a lone circling target, not just crowds
        let yawDir = f.yaw + rand(-0.15, 0.15);
        if (e && i % 3 === 0) {
          const c = e.center();
          yawDir = Math.atan2(c.x - from.x, c.z - from.z) + rand(-0.05, 0.05);
        }
        const dir = new THREE.Vector3(Math.sin(yawDir), dy, Math.cos(yawDir));
        f.world.projectiles.spawn('bullet', f, from, dir, {
          dmg: u.dmg * f.dmgMult(), speed: 80, color: 0xffd080, knock: 4, life: 1.4,
        });
        if (i % 2 === 0) f.world.audio?.play('gatling');
        f.world.effects.muzzleFlash(from);
      });
    }
    f.world.schedule(u.duration + 0.02, () => { if (f.state === 'ult') { f.animator.stop(); f.setState('normal'); } });
  },

  // AEGIS: sky beam of judgment on nearest enemy
  judgment(f, u) {
    const dur = f.animator.play('castRaise', {
      onEvent: (t) => {
        if (t !== 'fire') return;
        const e = f.nearestEnemy();
        const target = e ? leadPos(f, e, 0.45) : fwd(f, 12);
        f.world.audio?.play('cast');
        // warning ring, then the pillar
        f.world.effects.rings.spawn(target, { from: u.radius, to: u.radius * 0.95, dur: 0.55, color: 0x49b7ff, y: 0.4 });
        f.world.schedule(0.55, () => {
          const top = target.clone(); top.y += 70;
          f.world.effects.beams.spawn(top, target, { radius: u.radius * 0.55, dur: 0.7, color: 0xbfe8ff });
          f.world.effects.explosion(target, u.radius, { color: 0x9fd8ff });
          f.world.explode(target, u.radius, u.dmg * f.dmgMult(), { owner: f, knock: 18, color: 0x9fd8ff, launch: 10 });
          f.world.effects.addShake(1.2);
          f.world.audio?.play('beam');
        });
      },
    });
    f.setState('ult', dur);
  },

  // VIPER: teleporting slash storm
  serpentStorm(f, u) {
    f.setState('ult', u.hits * 0.17 + 0.4);
    f.iframes = u.hits * 0.17 + 0.3;
    f.animator.play('flurry');
    f.world.audio?.play('powerup');
    for (let i = 0; i < u.hits; i++) {
      f.world.schedule(0.17 * i, () => {
        if (!f.alive) return;
        const e = f.nearestEnemy();
        if (!e) return;
        // blink to a random side of the victim
        const a = rand(Math.PI * 2);
        f.pos.set(e.pos.x + Math.sin(a) * 3.2, e.pos.y, e.pos.z + Math.cos(a) * 3.2);
        f.yaw = f.targetYaw = Math.atan2(e.pos.x - f.pos.x, e.pos.z - f.pos.z);
        f.world.effects.dashTrail(f.pos, 0x6cff5c, f.scale * 1.6);
        e.takeHit(u.dmg * f.dmgMult(), f, { knock: 2, srcPos: f.pos });
        f.world.audio?.play('slash');
        f.world.engine.addHitStop(0.03);
      });
    }
    f.world.schedule(u.hits * 0.17 + 0.05, () => {
      if (f.state === 'ult') {
        f.animator.stop();
        const e = f.nearestEnemy();
        if (e) e.takeHit(u.dmg * 1.5 * f.dmgMult(), f, { knock: 16, launch: 11, srcPos: f.pos, heavy: true });
        f.setState('normal');
      }
    });
  },

  // NOVA: expanding supernova blast
  supernova(f, u) {
    const dur = f.animator.play('burst', {
      onEvent: (t) => {
        if (t !== 'fire') return;
        const w = f.world;
        w.audio?.play('explosionBig');
        const c = f.center();
        for (let i = 0; i < 3; i++) {
          w.schedule(i * 0.16, () => {
            const r = u.radius * (0.4 + i * 0.3);
            w.effects.rings.spawn(f.pos, { from: r * 0.3, to: r * 2, dur: 0.5, color: 0xff5ce8, y: 0.6 });
            w.effects.explosion(c, r * 0.7, { color: 0xff5ce8, smoke: false });
            w.explode(f.pos, r, u.dmg * f.dmgMult() * (i === 2 ? 1 : 0.35), { owner: f, knock: 14 + i * 6, color: 0xff5ce8, launch: i === 2 ? 12 : 0 });
          });
        }
        w.effects.addShake(1.3);
      },
    });
    f.setState('ult', dur);
    f.iframes = dur;
  },

  // RHINO: triple charging stampede
  stampede(f, u) {
    f.world.audio?.play('powerup');
    const doCharge = (n) => {
      if (n >= u.hits || !f.alive) { f.animator.stop(); f.setState('normal'); return; }
      f.faceNearestEnemyIfClose(90, true);
      f.animator.play('chargeLean');
      f.setState('ult', 0.75);
      const victims = new Set();
      for (let i = 1; i <= 14; i++) {
        f.world.schedule(i * 0.05, () => {
          if (!f.alive) return;
          const spd = f.def.stats.speed * 3.6;
          f.vel.x = Math.sin(f.yaw) * spd;
          f.vel.z = Math.cos(f.yaw) * spd;
          f.world.effects.dustPuff(f.pos, 3, 0x9a9088);
          for (const e of f.world.fighters) {
            if (e === f || !e.alive || victims.has(e)) continue;
            if (e.pos.distanceTo(f.pos) < 3.8 * f.scale) {
              victims.add(e);
              e.takeHit(u.dmg * f.dmgMult(), f, { knock: u.knock, launch: 9, srcPos: f.pos, heavy: true });
              f.world.engine.addHitStop(0.09);
              f.world.effects.addShake(0.7);
            }
          }
        });
      }
      f.world.schedule(0.85, () => doCharge(n + 1));
    };
    doCharge(0);
  },

  // TEMPEST: lightning storm
  thunderfall(f, u) {
    const dur = f.animator.play('castRaise', {
      onEvent: (t) => {
        if (t !== 'fire') return;
        f.world.audio?.play('thunder');
        for (let i = 0; i < u.strikes; i++) {
          f.world.schedule(0.28 * i, () => {
            const enemies = f.world.fighters.filter((e) => e !== f && e.alive);
            let target;
            if (enemies.length && Math.random() < 0.75) {
              const e = enemies[(Math.random() * enemies.length) | 0];
              target = e.pos.clone().add(new THREE.Vector3(rand(-2.5, 2.5), 0, rand(-2.5, 2.5)));
            } else {
              const a = rand(Math.PI * 2), r = rand(3, u.radius);
              target = f.pos.clone().add(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
            }
            target.y = 0;
            const top = target.clone(); top.y = 55;
            f.world.effects.lightning.spawn(top, target, { color: 0x9fdcff, dur: 0.3, jag: 3, thick: 0.22 });
            f.world.effects.glows.emit(target.x, target.y + 1, target.z, 0, 0, 0, { life: 0.25, size: 6, color: 0xbfefff, alpha: 1 });
            f.world.explode(target, 4.5, u.dmg * f.dmgMult(), { owner: f, knock: 12, color: 0x9fdcff, silentFx: true });
            for (const e2 of f.world.fighters) { // charge lingers on the struck
              if (e2 !== f && e2.alive && Math.hypot(e2.pos.x - target.x, e2.pos.z - target.z) < 4.5) {
                f.world.effects.staticCling(e2, 1.1);
              }
            }
            f.world.effects.addShake(0.4);
            f.world.audio?.play('zap');
          });
        }
      },
    });
    f.setState('ult', dur);
  },

  // FENRIR: berserk buff + immediate spin slash
  wildHunt(f, u) {
    f.status.buff = { spd: u.speedBoost, dmg: u.dmgBoost, t: u.duration };
    f.world.audio?.play('howl');
    f.world.effects.rings.spawn(f.pos, { from: 0.5, to: 8, dur: 0.6, color: 0x6cd8ff, y: 1 });
    const dur = f.animator.play('flurry');
    f.setState('ult', 0.9);
    // aura ticks
    const ticks = Math.floor(u.duration / 0.3);
    for (let i = 0; i < ticks; i++) {
      f.world.schedule(i * 0.3, () => {
        if (!f.alive || !f.status.buff) return;
        f.world.effects.glows.emit(f.pos.x + rand(-1.5, 1.5), f.pos.y + rand(1, f.height), f.pos.z + rand(-1.5, 1.5),
          0, 2, 0, { life: 0.4, size: 1.6, color: 0x6cd8ff, alpha: 0.7 });
      });
    }
    // spin slash burst
    f.world.schedule(0.45, () => {
      if (!f.alive) return;
      for (const e of f.world.fighters) {
        if (e === f || !e.alive) continue;
        if (e.pos.distanceTo(f.pos) < 6.5 * f.scale) {
          e.takeHit(55 * f.dmgMult(), f, { knock: 14, srcPos: f.pos, heavy: true });
        }
      }
      f.setState('normal');
    });
  },

  // COLOSSUS: one apocalyptic shell
  bigBertha(f, u) {
    const e = f.nearestEnemy();
    const target = e ? leadPos(f, e, 1.0) : fwd(f, 30);
    const dur = f.animator.play('brace', {
      onEvent: (t, a) => {
        if (t === 'shake') { f.world.effects.addShake(0.8); return; }
        if (t !== 'fire') return;
        f.world.audio?.play('mortarBig');
        f.world.effects.rings.spawn(target, { from: u.radius, to: u.radius * 0.9, dur: 1.6, color: 0xff5040, y: 0.4 });
        const from = muzzle(f, 'muzzleR');
        f.world.projectiles.spawn('mortar', f, from, new THREE.Vector3(0, 1, 0), {
          dmg: u.dmg * f.dmgMult(), splash: u.radius, color: 0xff8030, arcTo: target, arcTime: 1.7, knock: 24, launch: 13,
        });
        f.animator.addImpulse('torso', [-0.3, 0, 0], 24, 8);
      },
    });
    f.setState('ult', dur);
  },

  // WRAITH: triple piercing railshots
  deadeye(f, u) {
    f.setState('ult', u.shots * 0.5 + 0.3);
    f.animator.play('aim', { speed: 0.7 });
    for (let i = 0; i < u.shots; i++) {
      f.world.schedule(0.5 * i, () => {
        if (!f.alive) return;
        f.faceNearestEnemyIfClose(120, true);
        const from = muzzle(f);
        const dir = aimDir(f);
        f.world.projectiles.railshot(f, from, dir, {
          dmg: u.dmg * f.dmgMult(), range: 120, pierce: true, color: 0xff3838, knock: 14,
        });
        f.world.audio?.play('railgun');
        f.animator.addImpulse('shoulderR', [0.5, 0, 0], 30, 10);
        f.world.effects.addShake(0.5);
      });
    }
    f.world.schedule(u.shots * 0.5 + 0.1, () => { if (f.state === 'ult') { f.animator.stop(); f.setState('normal'); } });
  },

  // INFERNO: fire nova + burning aura
  backdraft(f, u) {
    const dur = f.animator.play('burst', {
      onEvent: (t) => {
        if (t !== 'fire') return;
        const w = f.world;
        w.audio?.play('explosionBig');
        w.effects.explosion(f.center(), u.radius * 0.9, { color: 0xff6a20 });
        w.explode(f.pos, u.radius, u.dmg * f.dmgMult(), {
          owner: f, knock: 18, color: 0xff6a20, launch: 10,
          status: { burn: u.burnDmg, burnT: 4 },
        });
        w.effects.addShake(1.2);
        // burning ground ring
        for (let i = 0; i < 6; i++) {
          const a = (i / 6) * Math.PI * 2;
          w.addFirePatch(f, new THREE.Vector3(
            f.pos.x + Math.cos(a) * u.radius * 0.55, 0, f.pos.z + Math.sin(a) * u.radius * 0.55
          ), 2.6, 4, 12);
        }
      },
    });
    f.setState('ult', dur);
    f.iframes = dur;
  },

  // CRANKY: fan of crushing waves, then a tidal surge around the shell
  riptide(f, u) {
    const dur = f.animator.play('burst', {
      onEvent: (t) => {
        if (t !== 'fire') return;
        const w = f.world;
        w.audio?.play('wave');
        const n = u.waves;
        for (let i = 0; i < n; i++) {
          const a = f.yaw + (i - (n - 1) / 2) * 0.16;
          const from = muzzle(f, i % 2 ? 'muzzleL' : 'muzzleR');
          from.y = Math.min(from.y, 3.2);
          w.projectiles.spawn('wave', f, from, new THREE.Vector3(Math.sin(a), 0, Math.cos(a)), {
            dmg: u.dmg * f.dmgMult(), speed: 42, color: 0x5fd0ff, knock: 16, launch: 7, pierce: true, maxDist: 46,
          });
        }
        w.schedule(0.5, () => {
          if (!f.alive) return;
          w.groundShockwave(f, f.pos, u.radius, u.surgeDmg * f.dmgMult(), 20, 0x5fd0ff, true);
          w.audio?.play('explosionBig');
          w.effects.addShake(1.1);
        });
      },
    });
    f.setState('ult', dur);
    f.iframes = dur;
  },

  // SAURION: chained sickle lunges, launcher on the final pass
  extinction(f, u) {
    f.world.audio?.play('powerup');
    const doLunge = (n) => {
      if (n >= u.hits || !f.alive) { f.animator.stop(); f.setState('normal'); return; }
      f.faceNearestEnemyIfClose(120, true);
      f.animator.play('lunge', { speed: 1.4 });
      f.setState('ult', 0.5);
      f.iframes = 0.3;
      const spd = f.def.stats.speed * 4.2;
      f.vel.x = Math.sin(f.yaw) * spd;
      f.vel.z = Math.cos(f.yaw) * spd;
      const last = n === u.hits - 1;
      const victims = new Set();
      for (let i = 1; i <= 7; i++) {
        f.world.schedule(i * 0.05, () => {
          if (!f.alive) return;
          f.world.effects.dashTrail(f.pos, 0xff3826, f.scale * 1.5);
          for (const e of f.world.fighters) {
            if (e === f || !e.alive || victims.has(e)) continue;
            const dx = f.world.wrapDelta(e.pos.x - f.pos.x), dz = f.world.wrapDelta(e.pos.z - f.pos.z);
            if (Math.hypot(dx, dz) < 3.6 * f.scale) {
              victims.add(e);
              e.takeHit(u.dmg * f.dmgMult(), f, {
                knock: last ? u.knock : 6, launch: last ? 10 : 0, srcPos: f.pos, heavy: last,
              });
              f.world.audio?.play('slash');
              f.world.engine.addHitStop(last ? 0.1 : 0.05);
            }
          }
        });
      }
      f.world.schedule(0.55, () => doLunge(n + 1));
    };
    doLunge(0);
  },

  // FROGGER: moon-leap onto the target and detonate a slime splat
  royalRibbit(f, u) {
    f.setState('ult', 2.1);
    f.animator.play('launched');
    f.vel.y = 30;
    f.grounded = false;
    f.iframes = 1.1;
    f.world.audio?.play('powerup');
    const e = f.nearestEnemy();
    if (e) {
      const dx = f.world.wrapDelta(e.pos.x - f.pos.x), dz = f.world.wrapDelta(e.pos.z - f.pos.z);
      f.vel.x = dx / 1.2;
      f.vel.z = dz / 1.2;
    }
    f.world.schedule(0.65, () => {
      if (!f.alive) return;
      f.vel.y = -52;
      f.animator.play('groundPound', { speed: 1.7 });
      const land = () => {
        if (!f.alive) return;
        if (f.grounded) {
          const w = f.world;
          w.effects.explosion(f.pos, u.radius * 0.7, { color: 0x9ade2a });
          w.effects.rings.spawn(f.pos, { from: 1, to: u.radius * 2.2, dur: 0.6, color: 0xaef23c, y: 0.4 });
          w.explode(f.pos, u.radius, u.dmg * f.dmgMult(), {
            owner: f, knock: 18, color: 0x9ade2a, launch: 11, status: { slow: 0.5, slowT: 2.5 },
          });
          w.effects.addShake(1.4);
          w.engine.addHitStop(0.14);
          w.audio?.play('explosionBig');
          f.setState('normal');
        } else f.world.schedule(0.04, land);
      };
      f.world.schedule(0.1, land);
    });
  },

  // JERRY: spring-crouch, colossal leap, and a landing quake that empties
  // the whole nest — a ring of biting fleas swarms out of the impact
  tidalPlague(f, u) {
    f.setState('ult', 2.6);
    f.iframes = 1.3;
    f.world.audio?.play('powerup');
    f.duckT = 1; // slam into the spring-crouch tell
    f.world.schedule(0.24, () => {
      if (!f.alive) return;
      f.vel.y = 34;
      f.grounded = false;
      f.animator.play('launched');
      const e = f.nearestEnemy();
      if (e && f.isAI) {
        const dx = f.world.wrapDelta(e.pos.x - f.pos.x), dz = f.world.wrapDelta(e.pos.z - f.pos.z);
        f.vel.x = dx / 1.3;
        f.vel.z = dz / 1.3;
      } else {
        f.vel.x = Math.sin(f.yaw) * 12;
        f.vel.z = Math.cos(f.yaw) * 12;
      }
      f.world.schedule(0.75, () => {
        if (!f.alive) return;
        f.vel.y = -55;
        f.animator.play('groundPound', { speed: 1.8 });
        const land = () => {
          if (!f.alive) return;
          if (f.grounded) {
            const w = f.world;
            w.groundShockwave(f, f.pos, u.radius, u.dmg * f.dmgMult(), 20, 0xff5030, true);
            w.effects.explosion(f.pos, u.radius * 0.6, { color: 0xc86a4a });
            w.effects.addShake(1.4);
            w.engine.addHitStop(0.13);
            w.audio?.play('explosionBig');
            // the nest empties: fleas burst outward in a hungry ring
            for (let i = 0; i < u.count; i++) {
              const a = (i / u.count) * Math.PI * 2 + rand(-0.25, 0.25);
              w.fleas.spawn(f, f.center(), new THREE.Vector3(Math.sin(a), 0.85, Math.cos(a)), {
                dmg: (u.fleaDmg || 24) * f.dmgMult(),
              });
            }
            f.setState('normal');
          } else f.world.schedule(0.04, land);
        };
        f.world.schedule(0.1, land);
      });
    });
  },

  // GLACIER: freeze everything nearby
  absoluteZero(f, u) {
    const dur = f.animator.play('burst', {
      onEvent: (t) => {
        if (t !== 'fire') return;
        const w = f.world;
        w.audio?.play('freezeBig');
        w.effects.rings.spawn(f.pos, { from: 1, to: u.radius * 2, dur: 0.7, color: 0x9be8ff, y: 0.5 });
        for (let i = 0; i < 30; i++) {
          const a = rand(Math.PI * 2), r = rand(2, u.radius);
          w.effects.glows.emit(f.pos.x + Math.cos(a) * r, rand(0.5, 5), f.pos.z + Math.sin(a) * r,
            0, rand(1, 3), 0, { life: rand(0.5, 1), size: rand(1.5, 3), color: 0xaef0ff, alpha: 0.8 });
        }
        for (const e of w.fighters) {
          if (e === f || !e.alive) continue;
          if (e.pos.distanceTo(f.pos) < u.radius) {
            e.takeHit(u.dmg * f.dmgMult(), f, { knock: 4, srcPos: f.pos, status: { freeze: u.freezeTime } });
          }
        }
        w.effects.addShake(0.9);
      },
    });
    f.setState('ult', dur);
    f.iframes = dur;
  },
};
