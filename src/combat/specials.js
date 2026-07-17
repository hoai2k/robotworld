// Per-mech special & ultimate implementations, dispatched by id from roster.
import * as THREE from 'three';
import { rand, clamp, clamp01, angleDiff, TAU } from '../core/utils.js';
import { GeyserFX } from './geyserfx.js';
// deliberate cycle with fighter.js (and a reach into game/ai.js): both are
// only touched at runtime, for SAURION's summoned raptor pack
import { Fighter } from './fighter.js';
import { AIController } from '../game/ai.js';

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

  // AEGIS: Bulwark Bash — the tower shield goes UP over his head face-up
  // and WHIRLS like a rotor (same showmanship as the spear heavy), then
  // comes down and RAMS forward, swelling into a bot-tall wall of steel
  // as it strikes
  shieldBash(f, sp) {
    const w = f.world;
    const RAISE = 0.95;
    f.setState('special', RAISE + 0.9);
    f.animator.play('shieldWhirlHold');
    // post-pose rotor whirl on the shield arm (survives the pose writes)
    f._spinFx = { joint: 'elbowL', axis: 'y', rate: 26, dur: RAISE, t: 0, acc: 0 };
    w.audio?.play('whooshBig');
    // whirl tell: tightening rings overhead
    for (let i = 0; i < 3; i++) {
      w.schedule(i * 0.3, () => {
        if (!f.alive || f.state !== 'special') return;
        w.effects.rings.spawn(f.pos, { from: 3.4, to: 1, dur: 0.28, color: 0x49b7ff, y: f.height * 0.95 });
      });
    }
    w.schedule(RAISE, () => {
      if (!f.alive || f.state !== 'special') return;
      f.faceNearestEnemyIfClose(14);
      const dur = f.animator.play('aegisShieldSmash', {
        onEvent: (t) => {
          if (t === 'hit') {
            f.onAttackEvent('hit', 0, {
              dmg: sp.dmg * f.dmgMult(), knock: sp.knock, range: 5.4 * f.scale, heavy: true,
            });
            w.effects.rings.spawn(f.pos, { from: 1, to: 6, dur: 0.4, color: 0x9fd8ff, y: 1 });
          }
        },
      });
      f.setState('special', dur * 0.95);
      // the wall: the shield GROWS to a full mech's height through the
      // strike, then eases back to carry size
      f._scaleFx = { joint: 'shield', t: 0, grow: 0.2, hold: 0.5, back: 0.3, max: 1.75 };
    });
    f.status.guard = { f: 0.6, t: sp.guard };
    f.world.effects.rings.spawn(f.pos, { from: 1, to: 5, dur: 0.5, color: 0x49b7ff, y: 1 });
  },

  // VIPER: BLADE CYCLONE — IG-11 doctrine: the legs keep WALKING straight
  // ahead while everything above the waist spins free, both swords thrown
  // out level — a striding whirlwind that saws repeatedly through anything
  // it overlaps
  bladeCyclone(f, sp) {
    const w = f.world;
    const DUR = 1.35;
    f.setState('special', DUR + 0.15);
    f.animator.play('viperWhirl');
    // post-pose torso spin: the waist is a free bearing — head and blades
    // whirl while the gait below stays forward
    f._spinFx = { joint: 'torso', axis: 'y', rate: 21, dur: DUR, t: 0, acc: 0 };
    w.audio?.play('dash');
    const hitAt = new Map(); // per-victim saw cadence: re-hit every 0.22s
    const ticks = Math.floor(DUR / 0.05);
    for (let i = 1; i <= ticks; i++) {
      w.schedule(i * 0.05, () => {
        if (!f.alive || f.state !== 'special') return;
        const t = i * 0.05;
        const spd = f.def.stats.speed * 1.7;
        f.vel.x = Math.sin(f.yaw) * spd;
        f.vel.z = Math.cos(f.yaw) * spd;
        // the spinning edges shed a green shimmer ring
        for (const bn of ['bladeL', 'bladeR']) {
          const a = f.mech.anchors[bn];
          if (a && i % 2 === 0) {
            a.getWorldPosition(_v);
            w.effects.glows.emit(_v.x, _v.y, _v.z, 0, 0, 0,
              { life: 0.16, size: 0.7 * f.scale, color: 0x5aff2e, alpha: 0.85, grow: -1 });
          }
        }
        for (const e of w.fighters) {
          if (e === f || !e.alive) continue;
          const dx = w.wrapDelta(e.pos.x - f.pos.x), dz = w.wrapDelta(e.pos.z - f.pos.z);
          if (Math.hypot(dx, dz) < 3.6 * f.scale && (hitAt.get(e) ?? -1) <= t - 0.22) {
            hitAt.set(e, t);
            e.takeHit(sp.dmg * f.dmgMult(), f, { knock: 5, srcPos: f.pos });
            w.audio?.play('slash');
            w.engine.addHitStop(0.03);
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
        // grabbed a fistful of air — recover, and the slam isn't SPENT:
        // a whiffed grab keeps only a token cooldown, not the full one
        f.animator.stop();
        f.setState('attack', 0.35);
        f.specialCd = Math.min(f.specialCd, 0.75);
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
  // telegraphs the spot first (evadable), then a full layered water sim
  // (GeyserFX: shader column shells + droplet crown + mist + base surge)
  // roars for sp.duration seconds before draining back down
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
        // the sim owns telegraph + eruption + collapse visuals; total show
        // length = warn + sustain + ~0.95s collapse = sp.duration. The
        // {owner, dmg} fields arm the world's scald tick: anyone in the
        // column keeps taking hits for the whole eruption
        w.geysers.push({
          fx: new GeyserFX(w.scene, w.effects, target, {
            height: 22, radius: 1.5, warn: WARN,
            sustain: (sp.duration || 6) - WARN - 0.95,
            boilRadius: sp.radius * 0.4,
          }),
          owner: f, dmg: sp.dmg, radius: sp.radius, launch: sp.launch, tick: 0,
        });
        // damage: one big hit at the blowout moment, same as always
        w.schedule(WARN, () => {
          w.audio?.play('wave');
          w.audio?.play('explosionBig');
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

  // NULLBOT: SEGFAULT — he de-rezzes into a smear of corrupted frames and
  // tears forward through everything on the line; whoever he passes
  // through gets a chunk of themselves converted (a glitch stack)
  segfault(f, sp) {
    const w = f.world;
    f.animator.play('lunge');
    f.setState('special', 0.48);
    f.iframes = 0.42;
    const spd = f.def.stats.speed * 4.4;
    f.vel.x = Math.sin(f.yaw) * spd;
    f.vel.z = Math.cos(f.yaw) * spd;
    w.audio?.play('zap');
    w.audio?.play('dash');
    w.effects.glitchBurst(f.center(), 14, 8, f.scale);
    const victims = new Set();
    for (let i = 1; i <= 9; i++) {
      w.schedule(i * 0.045, () => {
        if (!f.alive) return;
        // after-images: corrupted frames left hanging along the tear line
        w.effects.glitchFleck(f.pos.x + rand(-0.6, 0.6), f.pos.y + rand(0.8, f.height * 0.9),
          f.pos.z + rand(-0.6, 0.6), 1.5 * f.scale);
        w.effects.dashTrail(f.pos, 0xff2df2, f.scale * 1.3);
        for (const e of w.fighters) {
          if (e === f || !e.alive || victims.has(e)) continue;
          if (e.pos.distanceTo(f.pos) < 3.4 * f.scale) {
            victims.add(e);
            e.takeHit(sp.dmg * f.dmgMult(), f, { knock: 10, srcPos: f.pos, status: { glitch: 1 } });
            w.effects.glitchBurst(e.center(), 12, 7, e.scale);
            w.engine.addHitStop(0.05);
          }
        }
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
// Every ultimate is a big AREA statement. Live entities (swarms, tornadoes,
// giant forms, corrupted arenas) run on world.addUpdater(tick, end): tick
// each frame until it returns false, end() guaranteed for cleanup even when
// a finisher or round sweep interrupts mid-show.

const ss = (x) => x * x * (3 - 2 * x); // smoothstep

// bake a movable one-piece copy of the fighter's CURRENT pose. Meshes share
// geometry+materials with the original (cheap); position/rotate the returned
// group freely; cleanup is just scene.remove — nothing owned to dispose.
function bakeShell(f) {
  const root = new THREE.Group();
  f.mech.group.updateWorldMatrix(true, true);
  const inv = new THREE.Matrix4().copy(f.mech.group.matrixWorld).invert();
  f.mech.group.traverse((o) => {
    if (!o.isMesh || o.userData.chargeShell) return;
    const m = new THREE.Mesh(o.geometry, o.material);
    m.matrixAutoUpdate = false;
    m.matrix.copy(o.matrixWorld).premultiply(inv);
    root.add(m);
  });
  return root;
}

// nearest living opponent of `f` to an arbitrary world point
function nearestEnemyTo(f, x, z, maxD = Infinity) {
  const w = f.world;
  let best = null, bestD = maxD * maxD;
  for (const e of w.fighters) {
    if (e === f || !e.alive || f.isAllyOf(e)) continue;
    const dx = w.wrapDelta(e.pos.x - x), dz = w.wrapDelta(e.pos.z - z);
    const d = dx * dx + dz * dz;
    if (d < bestD) { best = e; bestD = d; }
  }
  return best;
}

export const ULTS = {
  // TITANUS: he reaches to the sky and a METEOR SHOWER hammers a broad zone
  // in front of him — burning rocks screaming down, each one a fire blast
  // that leaves the ground burning where it lands
  meteorBreaker(f, u) {
    const w = f.world;
    const dur = f.animator.play('castRaise', {
      onEvent: (t) => {
        if (t !== 'fire') return;
        w.audio?.play('powerup');
        w.audio?.play('thunder');
        const center = fwd(f, u.radius * 0.85);
        center.y = 0;
        // the weather comes in from ONE quarter of the sky — every rock
        // rides the same slanted wind, so the volley reads as a STORM
        const stormA = rand(TAU);
        w.effects.rings.spawn(center, { from: 1, to: u.radius * 2, dur: 0.8, color: 0xff8030, y: 0.4 });
        const rockGeo = new THREE.DodecahedronGeometry(1, 0);
        const rockMat = new THREE.MeshStandardMaterial({
          color: 0x4a3a30, roughness: 0.95, metalness: 0.05,
          emissive: 0xff5a10, emissiveIntensity: 0.9,
        });
        for (let i = 0; i < u.count; i++) {
          w.schedule(0.15 + i * 0.17, () => {
            if (!f.alive) return;
            // half the rocks hunt whoever is standing in the zone, the rest
            // carpet it at random
            let gx, gz;
            const prey = i % 2 === 0 ? nearestEnemyTo(f, center.x, center.z, u.radius * 1.2) : null;
            if (prey) {
              const p = leadPos(f, prey, 0.8);
              gx = p.x + rand(-2.5, 2.5);
              gz = p.z + rand(-2.5, 2.5);
            } else {
              const a = rand(TAU), r = Math.sqrt(Math.random()) * u.radius;
              gx = center.x + Math.cos(a) * r;
              gz = center.z + Math.sin(a) * r;
            }
            const s = rand(1.0, 1.7);
            const rock = new THREE.Mesh(rockGeo, rockMat);
            rock.scale.setScalar(s);
            const FALL = 0.8;
            // slanted entry: offset well to the storm side so the descent
            // comes down at a real angle (~30°), not a vertical plummet
            const slant = rand(24, 34);
            const ox = Math.cos(stormA) * slant + rand(-4, 4);
            const oz = Math.sin(stormA) * slant + rand(-4, 4);
            rock.position.set(gx + ox, 48, gz + oz);
            w.scene.add(rock);
            const vel = new THREE.Vector3(-ox / FALL, -48 / FALL, -oz / FALL);
            const spin = rand(-7, 7);
            w.audio?.play('whoosh');
            w.addUpdater((dt) => {
              rock.position.addScaledVector(vel, dt);
              rock.rotation.x += spin * dt;
              rock.rotation.z += spin * 0.6 * dt;
              // burning tail
              w.effects.glows.emit(
                rock.position.x + rand(-0.4, 0.4), rock.position.y + rand(0, 1), rock.position.z + rand(-0.4, 0.4),
                rand(-1, 1), rand(3, 7), rand(-1, 1),
                { life: 0.3, size: rand(1.1, 2) * s, color: 0xff7a20, alpha: 0.9 });
              w.effects.smoke.emit(rock.position.x, rock.position.y + 1.2, rock.position.z,
                rand(-1, 1), rand(2, 4), rand(-1, 1),
                { life: 0.6, size: 1.6 * s, color: 0x30241c, alpha: 0.4, grow: 1.6 });
              if (rock.position.y > 0.5 * s) return true;
              // IMPACT: fire blast + burning crater
              const hit = new THREE.Vector3(gx, 0, gz);
              w.explode(hit, 4.6, u.dmg * f.dmgMult(), {
                owner: f, knock: u.knock, launch: 8, color: 0xff7a30,
                status: { burn: 6, burnT: 2 },
              });
              w.addFirePatch(f, hit, 2.4, 2.8, 9);
              w.effects.addShake(0.5);
              return false;
            }, () => { w.scene.remove(rock); });
          });
        }
      },
    });
    f.setState('ult', dur);
  },

  // VULCAN: his upper body spins loose and hoses out a hundred rounds that
  // DON'T fly away — they fall into orbit around him, a whirlwind of lead
  // that rides along as he moves, until someone strays close: then the
  // whole storm folds onto them in one final rotation
  bulletHurricane(f, u) {
    const w = f.world;
    const N = u.count || 100;
    f.setState('ult', 1.15);
    f.animator.play('spinFire');
    f._spinFx = { joint: 'torso', axis: 'y', rate: 22, dur: 1.05, t: 0, acc: 0 };
    w.audio?.play('powerup');
    const geo = new THREE.SphereGeometry(0.24, 6, 5);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffd080, transparent: true, opacity: 0.95,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const im = new THREE.InstancedMesh(geo, mat, N);
    im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    im.frustumCulled = false;
    w.scene.add(im);
    const M = new THREE.Matrix4();
    const bullets = [];
    for (let i = 0; i < N; i++) {
      bullets.push({
        born: i * 0.011,              // stream out over ~1.1s
        a: rand(TAU),
        r: rand(3.2, 6.6),
        y: rand(1.2, f.height * 1.2),
        spd: rand(3.6, 4.8),          // rad/s — one shared direction: a whirlwind
        dive: rand(0, 0.5),           // stagger of the final strike
        hit: false,
        px: 0, py: 0, pz: 0,
      });
    }
    let t = 0, mode = 'orbit', target = null, strikeT = 0, landed = 0;
    w.addUpdater((dt) => {
      t += dt;
      if (!f.alive) return false;
      if (mode === 'orbit') {
        // gun-sound + muzzle flash while the storm is still pouring out
        if (t < 1.1 && Math.random() < 0.5) {
          const from = muzzle(f);
          w.effects.muzzleFlash(from);
          if (Math.random() < 0.4) w.audio?.play('gatling');
        }
        const e = f.nearestEnemy();
        if (e && Math.hypot(w.wrapDelta(e.pos.x - f.pos.x), w.wrapDelta(e.pos.z - f.pos.z)) < 8.5) {
          mode = 'strike';
          target = e;
          strikeT = 0;
          w.audio?.play('charge');
        } else if (t > (u.duration || 9)) {
          return false; // storm spun itself out un-spent
        }
      } else {
        strikeT += dt;
        if (!target.alive) return false;
      }
      let flying = 0;
      for (const b of bullets) {
        if (b.hit) { M.makeScale(0, 0, 0); im.setMatrixAt(bullets.indexOf(b), M); continue; }
        flying++;
        b.a += b.spd * dt;
        const grow = clamp01((t - b.born) / 0.3); // streams outward from the guns
        let x = f.pos.x + Math.cos(b.a) * b.r * grow;
        let y = f.pos.y + b.y;
        let z = f.pos.z + Math.sin(b.a) * b.r * grow;
        if (mode === 'strike') {
          // each round finishes its current lap while sliding onto the mark
          const k = ss(clamp01((strikeT - b.dive) / 0.45));
          const c = target.center();
          x += (c.x + rand(-0.3, 0.3) - x) * k;
          y += (c.y + rand(-0.3, 0.3) - y) * k;
          z += (c.z + rand(-0.3, 0.3) - z) * k;
          if (k >= 1) {
            b.hit = true;
            landed++;
            target.takeHit(u.dmg * f.dmgMult(), f, {
              knock: 1.2, srcPos: f.pos, soft: landed % 8 !== 0,
            });
            if (landed % 6 === 0) {
              w.effects.impactSparks(target.center(), 0xffd080, 6, 7);
              w.audio?.play('gatling');
            }
          }
        }
        b.px = x; b.py = y; b.pz = z;
        M.makeTranslation(x, y, z);
        im.setMatrixAt(bullets.indexOf(b), M);
      }
      im.instanceMatrix.needsUpdate = true;
      if (mode === 'strike' && flying === 0) {
        // the last round lands the exclamation point
        if (target.alive) {
          target.takeHit(u.dmg * 6 * f.dmgMult(), f, {
            knock: 14, launch: 8, srcPos: f.pos, heavy: true,
          });
        }
        w.effects.explosion(target.center(), 3.5, { color: 0xffd080 });
        return false;
      }
      return true;
    }, () => { w.scene.remove(im); geo.dispose(); mat.dispose(); });
  },

  // AEGIS: the spear goes up, ten shafts of light climb into the heavens,
  // and the court speaks: JUDGEMENT... then a coin-flip verdict. GUILTY is
  // a death sentence — a pillar of light takes the condemned away entirely
  // (no finisher; they are simply gone). INNOCENT and the defendant walks.
  judgment(f, u) {
    const w = f.world;
    f.setState('ult', 4.6);
    f.animator.play('castRaise', { speed: 0.55 });
    w.audio?.play('cast');
    w.effects.rings.spawn(f.pos, { from: 1, to: 9, dur: 0.8, color: 0xf6ecc2, y: 0.6 });
    for (let i = 0; i < 10; i++) {
      w.schedule(0.2 + i * 0.09, () => {
        if (!f.alive) return;
        const from = muzzle(f);
        const top = from.clone().add(new THREE.Vector3(rand(-8, 8), 78, rand(-8, 8)));
        w.effects.beams.spawn(from, top, { radius: rand(0.22, 0.42), dur: 1.5, color: 0xf6ecc2 });
        if (i % 3 === 0) w.audio?.play('beam');
      });
    }
    const say = (text, color = null, hold = true) => w.events.emit('banner', { text, hold, color });
    w.schedule(1.0, () => f.alive && say('JUDGEMENT'));
    w.schedule(1.5, () => f.alive && say('JUDGEMENT .'));
    w.schedule(2.0, () => f.alive && say('JUDGEMENT . .'));
    w.schedule(2.5, () => f.alive && say('JUDGEMENT . . .'));
    w.schedule(3.2, () => {
      if (!f.alive) { say('', null, false); return; }
      // the court tries the nearest REAL defendant (summons don't count)
      let v = null, best = Infinity;
      for (const e of w.fighters) {
        if (e === f || !e.alive || f.isAllyOf(e) || e.isMinion) continue;
        const dx = w.wrapDelta(e.pos.x - f.pos.x), dz = w.wrapDelta(e.pos.z - f.pos.z);
        const d = dx * dx + dz * dz;
        if (d < best) { best = d; v = e; }
      }
      if (!v) { say('CASE DISMISSED', '#9fd8ff', false); return; }
      if (Math.random() < 0.5) {
        say("INNOCENT: YOU'RE FREE TO GO", '#7dff9a', false);
        w.effects.rings.spawn(v.pos, { from: 4, to: 0.5, dur: 0.6, color: 0x7dff9a, y: 0.5 });
        w.audio?.play('uiConfirm');
        return;
      }
      say('GUILTY: DEATH PENALTY', '#ff4d5e', false);
      // heaven's pillar comes down on the condemned and TAKES them
      const gp = v.pos.clone();
      const top = gp.clone();
      top.y += 85;
      w.effects.beams.spawn(top, gp, { radius: u.radius || 3.4, dur: 1.6, color: 0xfff3c8 });
      w.effects.beams.spawn(top, gp, { radius: (u.radius || 3.4) * 0.4, dur: 1.6, color: 0xffffff });
      w.effects.rings.spawn(gp, { from: 1, to: 10, dur: 0.6, color: 0xfff3c8, y: 0.4 });
      w.audio?.play('beam');
      w.audio?.play('thunder');
      w.effects.addShake(1.0);
      v.setState('launched', 4);
      v.iframes = 2.5; // nothing interrupts an execution
      let lift = 0;
      w.addUpdater((dt) => {
        if (!v.alive) { v.setOpacity(1); return false; }
        lift += dt;
        v.pos.x = gp.x;
        v.pos.z = gp.z;
        v.pos.y = lift * lift * 24; // accelerating ascension
        v.vel.set(0, 0, 0);
        v.grounded = false;
        v.setOpacity(Math.max(0.05, 1 - lift / 1.05));
        w.effects.glows.emit(gp.x + rand(-1.2, 1.2), v.pos.y + rand(0, v.height), gp.z + rand(-1.2, 1.2),
          0, 5, 0, { life: 0.4, size: 1.6, color: 0xfff3c8, alpha: 0.9 });
        if (lift < 1.15) return true;
        v.setOpacity(1);        // restored for the next round's body
        v.die(null);            // no attacker credited: no finisher cinematic
        v.group.visible = false; // taken — the sky keeps them
        return false;
      });
    });
  },

  // VIPER: coils to the ground, springs skyward — and SIXTY vipers leap out
  // in every direction, slithering down whoever they find. The first fang
  // pins the victim in place; the rest of the brood piles on.
  serpentStorm(f, u) {
    const w = f.world;
    const N = u.count || 60;
    f.setState('ult', 1.5);
    f.duckT = 1;
    w.audio?.play('cast');
    w.schedule(0.35, () => {
      if (!f.alive) return;
      f.vel.y = 16;
      f.grounded = false;
      f.animator.play('launched');
      w.audio?.play('jump');
      w.effects.rings.spawn(f.pos, { from: 0.5, to: 8, dur: 0.5, color: 0x5aff2e, y: 0.5 });
      const geo = new THREE.BoxGeometry(0.32, 0.24, 2.2); // fat, LONG vipers
      const mat = new THREE.MeshStandardMaterial({
        color: 0x46b81e, roughness: 0.6, emissive: 0x1d5c0c, emissiveIntensity: 0.55,
      });
      const im = new THREE.InstancedMesh(geo, mat, N);
      im.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      im.frustumCulled = false;
      w.scene.add(im);
      const M = new THREE.Matrix4();
      const E = new THREE.Euler();
      const Q = new THREE.Quaternion();
      const ONE = new THREE.Vector3(1, 1, 1);
      const P = new THREE.Vector3();
      const snakes = [];
      for (let i = 0; i < N; i++) {
        const a = (i / N) * TAU + rand(-0.12, 0.12);
        snakes.push({
          x: f.pos.x, y: f.pos.y + 1.2, z: f.pos.z,
          a, vy: rand(5, 11), spd: rand(9.5, 14), ph: rand(TAU),
          state: 'fly', done: false,
        });
      }
      let t = 0, latched = null;
      w.addUpdater((dt) => {
        t += dt;
        let liveSnakes = 0;
        for (let i = 0; i < N; i++) {
          const s = snakes[i];
          if (s.done) { M.makeScale(0, 0, 0); im.setMatrixAt(i, M); continue; }
          liveSnakes++;
          let heading = s.a;
          if (s.state === 'fly') {
            s.x += Math.sin(s.a) * s.spd * dt;
            s.z += Math.cos(s.a) * s.spd * dt;
            s.vy -= 30 * dt;
            s.y += s.vy * dt;
            if (s.y <= 0.1) { s.y = 0.1; s.state = 'slither'; }
          } else {
            // hunt: slither at the pinned victim (or the nearest one)
            const prey = (latched && latched.alive) ? latched : nearestEnemyTo(f, s.x, s.z);
            if (prey) {
              const dx = w.wrapDelta(prey.pos.x - s.x), dz = w.wrapDelta(prey.pos.z - s.z);
              const want = Math.atan2(dx, dz);
              s.a += clamp(angleDiff(want, s.a), -4 * dt, 4 * dt);
              // the strike: fangs in
              if (Math.hypot(dx, dz) < prey.hitRadius * 0.8) {
                s.done = true;
                if (!latched || !latched.alive) {
                  latched = prey;
                  w.audio?.play('dart');
                }
                // fangs in: bite damage plus VENOM — a poison drip that
                // keeps draining after the strike (refreshed per bite)
                prey.takeHit(u.dmg * f.dmgMult(), f, {
                  knock: 0.6, srcPos: P.set(s.x, 0, s.z), soft: true,
                  status: { poison: (u.poison || 8) * f.dmgMult(), poisonT: u.poisonT || 3 },
                });
                if (Math.random() < 0.4) w.effects.impactSparks(prey.center(), 0x5aff2e, 6, 5);
                continue;
              }
            }
            heading = s.a + Math.sin(t * 11 + s.ph) * 0.55; // the slither
            s.x += Math.sin(heading) * s.spd * dt;
            s.z += Math.cos(heading) * s.spd * dt;
            s.y = 0.1;
          }
          Q.setFromEuler(E.set(0, heading, Math.sin(t * 13 + s.ph) * 0.25));
          M.compose(P.set(s.x, s.y, s.z), Q, ONE);
          im.setMatrixAt(i, M);
        }
        im.instanceMatrix.needsUpdate = true;
        // venom pin: the victim stays locked while the brood is still coming
        if (latched && latched.alive && liveSnakes > 0 &&
            latched.state !== 'launched' && latched.state !== 'frozen') {
          latched.setState('hitstun', 0.3);
          latched.vel.x *= 0.6;
          latched.vel.z *= 0.6;
          if (Math.random() < 0.5) {
            latched.animator.addImpulse('torso', [rand(-0.2, 0.2), 0, rand(-0.2, 0.2)], 44, 9);
          }
        }
        if (!f.alive || t > 7 || liveSnakes === 0) return false;
        return true;
      }, () => { w.scene.remove(im); geo.dispose(); mat.dispose(); });
    });
  },

  // NOVA: a blinding flash, then a newborn SUN swells off her frame to twice
  // her height, collapses hard to half her size — and detonates across the
  // whole neighborhood. She alone stands in the quiet center.
  supernova(f, u) {
    const w = f.world;
    const GROW = 1.3, SHRINK = 0.45;
    f.setState('ult', GROW + SHRINK + 0.5);
    f.iframes = GROW + SHRINK + 0.6;
    f.animator.play('burst', { speed: 0.7 });
    w.audio?.play('charge');
    // the flash
    w.effects.glows.emit(f.pos.x, f.pos.y + f.height * 0.6, f.pos.z, 0, 0, 0,
      { life: 0.28, size: 30, color: 0xffffff, alpha: 1 });
    const geo = new THREE.SphereGeometry(1, 28, 20);
    const mat = new THREE.MeshBasicMaterial({
      color: 0xfff6ea, transparent: true, opacity: 0.9,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const sun = new THREE.Mesh(geo, mat);
    w.scene.add(sun);
    // "twice her height" is the sphere's SIZE (diameter), not its radius
    const rMax = f.height * 1.05, rMin = f.height * 0.27;
    let t = 0;
    w.addUpdater((dt) => {
      if (!f.alive) return false;
      t += dt;
      sun.position.set(f.pos.x, f.pos.y + f.height * 0.55, f.pos.z);
      // the newborn star has GRAVITY: everyone else is dragged toward the
      // core the whole time it swells — and harder as it collapses
      const pull = t < GROW ? 22 : 52;
      for (const e of w.fighters) {
        if (e === f || !e.alive || f.isAllyOf(e)) continue;
        const dx = w.wrapDelta(f.pos.x - e.pos.x), dz = w.wrapDelta(f.pos.z - e.pos.z);
        const d = Math.hypot(dx, dz) || 1;
        if (d < u.radius * 2.6 && d > 2) {
          const g = pull * clamp01(1.5 - d / (u.radius * 2)) * dt;
          e.vel.x += (dx / d) * g;
          e.vel.z += (dz / d) * g;
          // infall streaks sell the drag
          if (Math.random() < dt * 8) {
            w.effects.glows.emit(e.pos.x, e.pos.y + rand(1, e.height), e.pos.z,
              (dx / d) * 8, 0.5, (dz / d) * 8,
              { life: 0.3, size: 0.9, color: 0xfff0d8, alpha: 0.7, drag: 0.5 });
          }
        }
      }
      let r;
      if (t < GROW) {
        r = 0.2 + (rMax - 0.2) * ss(clamp01(t / GROW));
        mat.opacity = 0.85;
      } else if (t < GROW + SHRINK) {
        r = rMax + (rMin - rMax) * ss(clamp01((t - GROW) / SHRINK));
        mat.opacity = 0.98; // densening core
      } else {
        // DETONATION — the collapse doubles the reach of the blast
        w.explode(f.pos, u.radius * 2, u.dmg * f.dmgMult(), {
          owner: f, knock: 22, launch: 12, color: 0xfff0d8,
        });
        w.effects.explosion(sun.position, u.radius * 1.2, { color: 0xffffff, smoke: false });
        w.effects.rings.spawn(f.pos, { from: 2, to: u.radius * 4.2, dur: 0.7, color: 0xfff0d8, y: 0.6 });
        w.effects.rings.spawn(f.pos, { from: 1, to: u.radius * 2.6, dur: 0.5, color: 0xff5ce8, y: 1.4 });
        w.effects.addShake(1.6);
        w.engine.addHitStop(0.12);
        return false;
      }
      sun.scale.setScalar(Math.max(0.01, r));
      // boiling rim
      const a = rand(TAU);
      w.effects.glows.emit(
        sun.position.x + Math.cos(a) * r, sun.position.y + rand(-r, r) * 0.6, sun.position.z + Math.sin(a) * r,
        Math.cos(a) * 2, rand(1, 3), Math.sin(a) * 2,
        { life: 0.25, size: rand(0.8, 1.6), color: 0xfff0d8, alpha: 0.9 });
      return true;
    }, () => { w.scene.remove(sun); geo.dispose(); mat.dispose(); });
  },

  // RHINO: he becomes a CROWD — ten of him shoulder to shoulder, and the
  // whole herd thunders forward flattening everything on the line
  stampede(f, u) {
    const w = f.world;
    const COPIES = (u.copies || 10) - 1; // he leads the charge himself
    f.faceNearestEnemyIfClose(90, true);
    f.animator.play('chargeLean');
    const spd = f.def.stats.speed * 3.6;
    const DUR = (u.range || 46) / spd;
    f.setState('ult', DUR + 0.25);
    f.iframes = 0.5;
    w.audio?.play('powerup');
    w.audio?.play('charge');
    const dirX = Math.sin(f.yaw), dirZ = Math.cos(f.yaw);
    const hitAt = new Map(); // herd-wide: nobody gets trampled twice in a beat
    let t = 0;
    const trample = (px, pz) => {
      for (const e of w.fighters) {
        if (e === f || !e.alive || f.isAllyOf(e)) continue;
        if (t - (hitAt.get(e) ?? -9) < 0.45) continue;
        const dx = w.wrapDelta(e.pos.x - px), dz = w.wrapDelta(e.pos.z - pz);
        if (Math.hypot(dx, dz) < 3.4 * f.scale) {
          hitAt.set(e, t);
          e.takeHit(u.dmg * f.dmgMult(), f, {
            knock: u.knock, launch: 9, srcPos: P2.set(px, 0, pz), heavy: true,
          });
          w.engine.addHitStop(0.06);
          w.effects.addShake(0.5);
        }
      }
    };
    const P2 = new THREE.Vector3();
    // bake the herd a beat in, once the charge lean has taken the pose
    w.schedule(0.18, () => {
      if (!f.alive) return;
      const shells = [];
      for (let i = 0; i < COPIES; i++) {
        const g = bakeShell(f);
        const lane = (i % 2 ? 1 : -1) * Math.ceil((i + 1) / 2); // ±1 ±1 ±2 ±2...
        const off = lane * 3.3 + rand(-0.4, 0.4);
        g.position.set(
          f.pos.x + dirZ * off - dirX * rand(0.5, 4),
          0,
          f.pos.z - dirX * off - dirZ * rand(0.5, 4)
        );
        g.rotation.y = f.yaw;
        w.scene.add(g);
        shells.push({ g, ph: rand(TAU) });
      }
      w.addUpdater((dt) => {
        t += dt;
        // the real Rhino gallops point
        if (f.alive && f.state === 'ult') {
          f.vel.x = dirX * spd;
          f.vel.z = dirZ * spd;
          trample(f.pos.x, f.pos.z);
          if (Math.random() < 0.6) w.effects.dustPuff(f.pos, 2, 0x9a9088);
        }
        for (const s of shells) {
          s.g.position.x += dirX * spd * dt;
          s.g.position.z += dirZ * spd * dt;
          s.g.position.y = Math.abs(Math.sin(t * 11 + s.ph)) * 0.45;
          s.g.rotation.x = 0.1 + Math.sin(t * 11 + s.ph) * 0.05;
          if (Math.random() < 0.4) w.effects.dustPuff(s.g.position, 1, 0x9a9088);
          trample(s.g.position.x, s.g.position.z);
          // the herd wrecks facades too
          if (Math.random() < 0.25) {
            _v.set(s.g.position.x + dirX * 2, 2, s.g.position.z + dirZ * 2);
            w.arena?.damageSphere(_v, 3, 40, null, true);
          }
        }
        if (t > DUR || !f.alive) return false;
        return true;
      }, () => {
        for (const s of shells) w.scene.remove(s.g);
      });
    });
  },

  // TEMPEST: black stormclouds descend over the whole block around him —
  // and inside the dark, everyone else gets hammered by lightning strike
  // after strike after strike
  thunderfall(f, u) {
    const w = f.world;
    const dur = f.animator.play('castRaise', {
      onEvent: (tt) => {
        if (tt !== 'fire') return;
        const center = f.pos.clone();
        center.y = 0;
        const R = u.radius, cloudY = 14;
        w.audio?.play('thunder');
        w.effects.rings.spawn(center, { from: 1, to: R * 2, dur: 0.7, color: 0x53e8ff, y: 0.4 });
        // the deck rolls in — waves of churning black smoke over the zone
        for (const delay of [0, 0.5, 1.1, 1.8]) {
          w.schedule(delay, () => {
            for (let i = 0; i < 40; i++) {
              const a = rand(TAU), r = Math.sqrt(Math.random()) * R * 0.95;
              w.effects.smoke.emit(
                center.x + Math.cos(a) * r, cloudY + rand(-1.6, 1.8), center.z + Math.sin(a) * r,
                rand(-1.6, 1.6), rand(-0.4, 0.4), rand(-1.6, 1.6),
                { life: rand(1.4, 2.2), size: rand(5.5, 9), color: 0x0c1016, alpha: 0.95, grow: 1.2 });
            }
            for (let i = 0; i < 10; i++) {
              const a = rand(TAU), r = rand(0, R * 0.8);
              w.effects.glows.emit(center.x + Math.cos(a) * r, cloudY + rand(-1, 1), center.z + Math.sin(a) * r,
                0, 0, 0, { life: rand(0.2, 0.4), size: rand(1.5, 3), color: 0x9fdcff, alpha: 0.9 });
            }
          });
        }
        let t = 0, tick = 0.2;
        w.addUpdater((dt) => {
          if (!f.alive) return false;
          t += dt;
          tick -= dt;
          if (tick <= 0) {
            tick = 0.2; // 5 strikes a second on everyone caught inside
            for (const e of w.fighters) {
              if (e === f || !e.alive || f.isAllyOf(e)) continue;
              const dx = w.wrapDelta(e.pos.x - center.x), dz = w.wrapDelta(e.pos.z - center.z);
              if (Math.hypot(dx, dz) > R) continue;
              const gx = e.pos.x + rand(-0.6, 0.6), gz = e.pos.z + rand(-0.6, 0.6);
              w.effects.lightning.spawn(
                new THREE.Vector3(gx + rand(-1, 1), cloudY, gz + rand(-1, 1)),
                new THREE.Vector3(gx, 0.1, gz),
                { color: 0xeaffff, dur: 0.14, jag: 3, thick: 0.2 });
              w.effects.glows.emit(gx, 1.2, gz, 0, 0, 0, { life: 0.18, size: 4.5, color: 0xbfefff, alpha: 1 });
              e.takeHit(u.dmg * f.dmgMult(), f, {
                knock: 2, srcPos: center, soft: true, status: { slow: 0.7, slowT: 0.8 },
              });
              w.effects.staticCling(e, 0.8);
              if (Math.random() < 0.4) w.audio?.play('zap');
            }
            // stray ground strikes sell the storm
            if (Math.random() < 0.6) {
              const a = rand(TAU), r = rand(2, R);
              const gx = center.x + Math.cos(a) * r, gz = center.z + Math.sin(a) * r;
              w.effects.lightning.spawn(
                new THREE.Vector3(gx, cloudY, gz), new THREE.Vector3(gx, 0.1, gz),
                { color: 0x9fdcff, dur: 0.18, jag: 2.6, thick: 0.13 });
            }
            // the deck stays dark through the strikes
            if (Math.random() < 0.5) {
              const a = rand(TAU), r = Math.sqrt(Math.random()) * R * 0.95;
              w.effects.smoke.emit(
                center.x + Math.cos(a) * r, cloudY + rand(-1.4, 1.6), center.z + Math.sin(a) * r,
                rand(-1.4, 1.4), 0, rand(-1.4, 1.4),
                { life: 1.6, size: rand(5, 8), color: 0x0c1016, alpha: 0.9, grow: 1.1 });
            }
          }
          return t <= (u.duration || 2.6) + 0.4;
        });
      },
    });
    f.setState('ult', dur);
  },

  // FENRIR: one howl at the sky — and a PACK of twenty low-running Fenrirs
  // floods the block, tearing through everything they brush past
  wildHunt(f, u) {
    const w = f.world;
    f.setState('ult', 1.2);
    f.animator.play('castRaise', { speed: 1.1 });
    w.audio?.play('howl');
    w.effects.rings.spawn(f.pos, { from: 0.5, to: u.radius, dur: 0.9, color: 0x6cd8ff, y: 0.8 });
    // drop into the hunting crouch right before the pack bakes off him
    w.schedule(0.45, () => { if (f.alive) f.animator.play('lunge', { speed: 0.6 }); });
    w.schedule(0.62, () => {
      if (!f.alive) return;
      const N = u.count || 20;
      const wolves = [];
      for (let i = 0; i < N; i++) {
        const g = bakeShell(f);
        g.rotation.x = 0.5; // pitched down onto all fours
        g.scale.setScalar(0.92);
        const a = (i / N) * TAU + rand(-0.2, 0.2);
        g.position.set(f.pos.x + Math.cos(a) * rand(1, 3), 0.2, f.pos.z + Math.sin(a) * rand(1, 3));
        w.scene.add(g);
        wolves.push({ g, yaw: rand(TAU), turnT: rand(0, 0.2), spd: rand(16, 22), ph: rand(TAU) });
      }
      f.animator.stop(0.2);
      const hitAt = new Map(); // pack-wide bite cadence per victim
      let t = 0;
      w.addUpdater((dt) => {
        t += dt;
        for (const wl of wolves) {
          wl.turnT -= dt;
          const px = wl.g.position.x, pz = wl.g.position.z;
          if (wl.turnT <= 0) {
            wl.turnT = rand(0.3, 0.7);
            const homeDx = w.wrapDelta(f.pos.x - px), homeDz = w.wrapDelta(f.pos.z - pz);
            const prey = Math.random() < 0.55 ? nearestEnemyTo(f, px, pz, u.radius * 1.3) : null;
            if (Math.hypot(homeDx, homeDz) > u.radius) {
              wl.yaw = Math.atan2(homeDx, homeDz) + rand(-0.6, 0.6); // stay with the hunt
            } else if (prey) {
              wl.yaw = Math.atan2(w.wrapDelta(prey.pos.x - px), w.wrapDelta(prey.pos.z - pz)) + rand(-0.4, 0.4);
            } else {
              wl.yaw = rand(TAU); // every which way
            }
          }
          wl.g.position.x += Math.sin(wl.yaw) * wl.spd * dt;
          wl.g.position.z += Math.cos(wl.yaw) * wl.spd * dt;
          wl.g.position.y = 0.15 + Math.abs(Math.sin(t * 13 + wl.ph)) * 0.5; // the gallop
          wl.g.rotation.y = wl.yaw;
          wl.g.rotation.x = 0.5 + Math.sin(t * 13 + wl.ph) * 0.09;
          // bites and claws on the way through
          for (const e of w.fighters) {
            if (e === f || !e.alive || f.isAllyOf(e)) continue;
            if (t - (hitAt.get(e) ?? -9) < 0.25) continue;
            const dx = w.wrapDelta(e.pos.x - wl.g.position.x), dz = w.wrapDelta(e.pos.z - wl.g.position.z);
            if (Math.hypot(dx, dz) < e.hitRadius + 1.2) {
              hitAt.set(e, t);
              e.takeHit(u.dmg * f.dmgMult(), f, { knock: 3, srcPos: wl.g.position, soft: Math.random() < 0.7 });
              w.effects.impactSparks(e.center(), 0x6cd8ff, 6, 6);
              if (Math.random() < 0.25) w.audio?.play('slash');
            }
          }
        }
        if (Math.random() < 0.02) w.audio?.play('howl', { vol: 0.3, pitch: rand(0.9, 1.3) });
        return t <= (u.duration || 4.5) && f.alive;
      }, () => {
        for (const wl of wolves) w.scene.remove(wl.g);
      });
    });
  },

  // COLOSSUS: no shell this time — HE is the ordnance. He grows to four
  // times his height and simply walks through the fight, flattening
  // whatever he steps on or shoulders into.
  colossalForm(f, u) {
    if (f._giantK) return; // already grown
    const w = f.world;
    f._giantK = true;
    f.setState('ult', 1.3);
    f.animator.play('burst');
    w.audio?.play('powerup');
    w.effects.rings.spawn(f.pos, { from: 1, to: 12, dur: 0.7, color: 0xffd23c, y: 0.5 });
    const base = { scale: f.scale, h: f.baseHeight, hr: f.baseHitRadius, r: f.radius };
    const S = u.scale || 4;
    const GROW = 1.3, DUR = u.duration || 9;
    f.status.buff = { spd: 1.3, dmg: 1.4, t: DUR };
    let t = 0, crushT = 0, stompT = 0;
    const apply = (s) => {
      f.group.scale.setScalar(s);
      f.scale = base.scale * s;
      f.baseHeight = base.h * s;
      f.baseHitRadius = base.hr * s;
      f.radius = base.r * s;
    };
    w.addUpdater((dt) => {
      t += dt;
      let k;
      if (t < GROW) k = ss(t / GROW);
      else if (t < DUR - 1.1) k = 1;
      else k = ss(clamp01((DUR - t) / 1.1));
      if (!f.alive) k = Math.min(k, Math.max(0, 1 - (t - DUR) )); // dead: just end
      apply(1 + (S - 1) * k);
      if (f.alive && k > 0.25) {
        // everything underfoot is a casualty
        crushT -= dt;
        if (crushT <= 0) {
          crushT = 0.28;
          for (const e of w.fighters) {
            if (e === f || !e.alive || f.isAllyOf(e)) continue;
            const d = Math.hypot(w.wrapDelta(e.pos.x - f.pos.x), w.wrapDelta(e.pos.z - f.pos.z));
            if (d < f.radius + e.radius + 1 && e.pos.y < f.height * 0.55) {
              e.takeHit(u.dmg * f.dmgMult(), f, { knock: 20, launch: 8, srcPos: f.pos, heavy: true });
              w.effects.dustPuff(e.pos, 6);
            }
          }
          _v.set(f.pos.x, f.pos.y + 1.5, f.pos.z);
          w.arena?.damageSphere(_v, f.radius * 1.9, 55 * k, null, true);
        }
        // thundering footfalls
        stompT -= dt;
        if (stompT <= 0 && Math.hypot(f.vel.x, f.vel.z) > 3 && f.grounded) {
          stompT = 0.38;
          w.effects.dustPuff(f.pos, 6, 0x9a9088);
          w.effects.addShake(0.3 * k);
          w.audio?.play('slam', { vol: 0.35 });
        }
      }
      return t <= DUR;
    }, () => {
      apply(1);
      f._giantK = false;
    });
  },

  // WRAITH: the red eye swells and BURNS, then pours out a widening
  // searchlight of dread. The light KEEPS searching until it finds a body
  // (hard cap as a failsafe); then it snaps down to one thick killing beam
  // — eye to face — and the victim glows furnace-red while it burns them
  deathGaze(f, u) {
    const w = f.world;
    const CHARGE = 1.1, SEARCH_MAX = 12, BURN = 1.15;
    f.setState('ult', CHARGE + 0.5);
    f.animator.play('aim', { speed: 0.5 });
    w.audio?.play('charge');
    const eyePos = () => {
      const a = f.mech.anchors.eye;
      return a ? a.getWorldPosition(new THREE.Vector3())
        : new THREE.Vector3(f.pos.x, f.pos.y + f.height * 0.92, f.pos.z);
    };
    const R = u.range || 60;
    const HALF = 0.4; // cone half-angle
    const coneGeo = new THREE.ConeGeometry(1, 1, 26, 1, true);
    coneGeo.translate(0, -0.5, 0); // apex at origin, opening down -Y
    const coneMat = new THREE.MeshBasicMaterial({
      color: 0xff2030, transparent: true, opacity: 0.2,
      blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    });
    const cone = new THREE.Mesh(coneGeo, coneMat);
    cone.visible = false;
    w.scene.add(cone);
    const DOWN = new THREE.Vector3(0, -1, 0);
    const dirV = new THREE.Vector3();
    let t = 0, victim = null, burnT = 0, pulses = 0;
    w.addUpdater((dt) => {
      if (!f.alive) return false;
      t += dt;
      const ep = eyePos();
      if (t < CHARGE) {
        // the eye grows and glows blinding red
        const k = t / CHARGE;
        w.effects.glows.emit(ep.x, ep.y, ep.z, 0, 0, 0,
          { life: 0.09, size: 0.5 + 3.8 * k, color: 0xff2030, alpha: 0.95 });
        if (Math.random() < 0.3) {
          w.effects.glows.emit(ep.x, ep.y, ep.z, rand(-1, 1), rand(0, 2), rand(-1, 1),
            { life: 0.3, size: 0.5, color: 0xff8090, alpha: 0.9 });
        }
        return true;
      }
      // the gaze owns him while it hunts and burns — keep the lock alive
      if (f.state === 'ult') f.stateT = Math.max(f.stateT, 0.4);
      dirV.set(Math.sin(f.yaw), -0.05, Math.cos(f.yaw)).normalize();
      if (!victim) {
        // failsafe cap / nobody left to judge — only then does it give up
        if (t > CHARGE + SEARCH_MAX || !f.nearestEnemy()) {
          cone.visible = false;
          if (f.state === 'ult') f.stateT = Math.min(f.stateT, 0.2);
          return false;
        }
        // AI sweeps the light onto its prey; humans aim with their facing
        f.faceNearestEnemyIfClose(120, true);
        // the wide red light, pouring out and widening with distance
        cone.visible = true;
        const pulse = 1 + Math.sin(t * 17) * 0.06;
        cone.position.copy(ep);
        cone.quaternion.setFromUnitVectors(DOWN, dirV);
        cone.scale.set(R * Math.tan(HALF) * pulse, R, R * Math.tan(HALF) * pulse);
        coneMat.opacity = 0.14 + Math.sin(t * 23) * 0.04;
        w.effects.glows.emit(ep.x, ep.y, ep.z, 0, 0, 0,
          { life: 0.08, size: 3.4, color: 0xff2030, alpha: 0.95 });
        // does the light catch anyone?
        for (const e of w.fighters) {
          if (e === f || !e.alive || f.isAllyOf(e)) continue;
          const c = e.center();
          const to = new THREE.Vector3(w.wrapDelta(c.x - ep.x), c.y - ep.y, w.wrapDelta(c.z - ep.z));
          const d = to.length();
          if (d < R && to.normalize().dot(dirV) > Math.cos(HALF)) {
            victim = e;
            burnT = 0;
            pulses = 0;
            cone.visible = false;
            w.audio?.play('railgun');
            w.engine.addHitStop(0.08);
            break;
          }
        }
        return true;
      }
      // CAUGHT: one thick intense beam, eye to face
      burnT += dt;
      if (victim.alive) {
        const face = new THREE.Vector3(victim.pos.x, victim.pos.y + victim.height * 0.85, victim.pos.z);
        w.effects.beams.spawn(ep, face, { radius: 0.6, dur: 0.09, color: 0xff2030 });
        w.effects.beams.spawn(ep, face, { radius: 0.24, dur: 0.09, color: 0xfff0f0 });
        w.effects.glows.emit(face.x, face.y, face.z, 0, 0, 0,
          { life: 0.12, size: 2.8, color: 0xff2030, alpha: 1 });
        if (Math.random() < 0.5) w.effects.impactSparks(face, 0xff2030, 4, 6);
        // the whole frame glows furnace-red for as long as the beam is on it
        victim.applyGlitchTint(0.42 + 0.2 * Math.sin(burnT * 26), 0xff2030);
        const PULSES = [0.12, 0.5, 0.9];
        if (pulses < 3 && burnT >= PULSES[pulses]) {
          pulses++;
          victim.takeHit((u.dmg / 3) * f.dmgMult(), f, {
            knock: 3, srcPos: ep, heavy: pulses === 3, status: { burn: 8, burnT: 2 },
          });
          w.audio?.play('beam');
        }
      }
      if (burnT > BURN) {
        if (f.state === 'ult') f.stateT = Math.min(f.stateT, 0.25);
        return false;
      }
      return true;
    }, () => {
      w.scene.remove(cone);
      coneGeo.dispose();
      coneMat.dispose();
      if (victim && victim.alive) victim.applyGlitchTint(0); // colors thaw back
    });
  },

  // INFERNO: he conjures a FIRE TORNADO that wanders after his enemies,
  // belching flame and smoke, growing as it goes — and whoever it finally
  // catches gets ripped into the sky inside the funnel
  fireTornado(f, u) {
    const w = f.world;
    const dur = f.animator.play('burst', {
      onEvent: (tt) => {
        if (tt !== 'fire') return;
        const pos = fwd(f, 5);
        pos.y = 0;
        w.audio?.play('flame');
        w.audio?.play('whooshBig');
        let t = 0, r = 1.6, swept = null, sweptT = 0, fpT = 0.4;
        w.addUpdater((dt) => {
          t += dt;
          r = Math.min(u.radius || 4.5, r + dt * 0.5); // growing larger and larger
          const H = 7 + r * 2.8;
          // it hunts (until it has swallowed someone)
          if (!swept) {
            const prey = nearestEnemyTo(f, pos.x, pos.z);
            if (prey) {
              const dx = w.wrapDelta(prey.pos.x - pos.x), dz = w.wrapDelta(prey.pos.z - pos.z);
              const d = Math.hypot(dx, dz) || 1;
              pos.x += (dx / d) * 6.5 * dt;
              pos.z += (dz / d) * 6.5 * dt;
            }
          }
          // the funnel: spiraling flame ribbons + a smoke crown
          for (let i = 0; i < 6; i++) {
            const a = rand(TAU), h = Math.random() ** 1.3 * H;
            const rr = (0.3 + 0.7 * (h / H)) * r * rand(0.75, 1.05);
            const tang = a + Math.PI / 2;
            w.effects.glows.emit(pos.x + Math.cos(a) * rr, h, pos.z + Math.sin(a) * rr,
              Math.cos(tang) * rand(10, 16), rand(2, 6), Math.sin(tang) * rand(10, 16),
              { life: rand(0.22, 0.45), size: rand(0.9, 1.9), color: h < H * 0.45 ? 0xff7a20 : 0xff4210, alpha: 0.92, drag: 0.4 });
          }
          for (let i = 0; i < 2; i++) {
            const a = rand(TAU);
            w.effects.smoke.emit(pos.x + Math.cos(a) * r * 0.7, H * rand(0.7, 1.05), pos.z + Math.sin(a) * r * 0.7,
              Math.cos(a + 1.5) * 6, rand(2, 5), Math.sin(a + 1.5) * 6,
              { life: rand(0.6, 1.1), size: rand(2, 3.4), color: 0x241a12, alpha: 0.5, grow: 1.6 });
          }
          // it BELCHES: gouts of flame spat out of the wall, burning ground
          if (Math.random() < 0.12) {
            const a = rand(TAU);
            w.effects.fire(new THREE.Vector3(pos.x, rand(1, 4), pos.z),
              new THREE.Vector3(Math.cos(a), 0.35, Math.sin(a)), 24, 0.4);
          }
          fpT -= dt;
          if (fpT <= 0) {
            fpT = 1.2;
            w.addFirePatch(f, new THREE.Vector3(pos.x + rand(-r, r) * 0.5, 0, pos.z + rand(-r, r) * 0.5), 2.0, 2.2, 8);
            if (Math.random() < 0.6) w.audio?.play('flame');
          }
          w.arena?.damageSphere(_v.set(pos.x, 2, pos.z), r * 1.2, 26 * dt * 8, null, true);
          if (!swept) {
            // the catch
            for (const e of w.fighters) {
              if (e === f || !e.alive || f.isAllyOf(e)) continue;
              const dx = w.wrapDelta(e.pos.x - pos.x), dz = w.wrapDelta(e.pos.z - pos.z);
              if (Math.hypot(dx, dz) < r + e.hitRadius * 0.5 && e.pos.y < H) {
                swept = e;
                sweptT = 0;
                e.takeHit(u.dmg * f.dmgMult(), f, {
                  knock: 3, launch: 14, srcPos: pos, heavy: true, status: { burn: 10, burnT: 3 },
                });
                w.audio?.play('explosionBig');
                w.effects.addShake(0.8);
                break;
              }
            }
          } else {
            // swept UP into the sky, riding the funnel wall
            sweptT += dt;
            if (swept.alive && sweptT < 1.3) {
              const a = sweptT * 8.5;
              swept.pos.x = pos.x + Math.cos(a) * r * 0.55;
              swept.pos.z = pos.z + Math.sin(a) * r * 0.55;
              swept.pos.y = Math.min(swept.pos.y + 15 * dt, H + 5);
              swept.vel.set(0, 2, 0);
              swept.grounded = false;
              swept.setState('launched', 3);
              if (Math.random() < 0.6) {
                w.effects.glows.emit(swept.pos.x, swept.pos.y + rand(0, swept.height), swept.pos.z,
                  0, 3, 0, { life: 0.3, size: 1.4, color: 0xff7a20, alpha: 0.9 });
              }
            } else {
              // hurled clear at the top; the tornado gutters out
              if (swept.alive) {
                const a = rand(TAU);
                swept.vel.set(Math.cos(a) * 9, 5, Math.sin(a) * 9);
              }
              return false;
            }
          }
          return t <= (u.duration || 7);
        });
      },
    });
    f.setState('ult', dur);
  },

  // GLACIER: flash-freezes a huge round sheet of ground ahead — everything
  // inside turns white. Anyone else on the sheet frosts over, takes cold
  // damage, and skates helplessly on the glass
  absoluteZero(f, u) {
    const w = f.world;
    const dur = f.animator.play('burst', {
      onEvent: (tt) => {
        if (tt !== 'fire') return;
        const center = fwd(f, u.radius * 0.75);
        center.y = w.arena?.terrainHeightAt?.(center.x, center.z) || 0;
        w.audio?.play('freezeBig');
        const geo = new THREE.CircleGeometry(u.radius, 44);
        const mat = new THREE.MeshStandardMaterial({
          color: 0xdceefc, roughness: 0.14, metalness: 0.05,
          transparent: true, opacity: 0, emissive: 0x9fc8e8, emissiveIntensity: 0.07,
        });
        const sheet = new THREE.Mesh(geo, mat);
        sheet.rotation.x = -Math.PI / 2;
        sheet.position.set(center.x, center.y + 0.08, center.z);
        w.scene.add(sheet);
        w.effects.rings.spawn(center, { from: 1, to: u.radius * 2, dur: 0.7, color: 0x9be8ff, y: 0.4 });
        for (let i = 0; i < 26; i++) {
          const a = rand(TAU), r = rand(1, u.radius);
          w.effects.glows.emit(center.x + Math.cos(a) * r, 0.4, center.z + Math.sin(a) * r,
            0, rand(1, 3), 0, { life: rand(0.4, 0.9), size: rand(1, 2.2), color: 0xd8f4ff, alpha: 0.85 });
        }
        const DUR = u.duration || 8;
        let t = 0, tick = 0;
        w.addUpdater((dt) => {
          t += dt;
          mat.opacity = 0.62 * clamp01(t / 0.3) * clamp01((DUR - t) / 0.8);
          // ambient frost shimmer
          if (Math.random() < 0.4) {
            const a = rand(TAU), r = rand(0, u.radius);
            w.effects.glows.emit(center.x + Math.cos(a) * r, 0.3, center.z + Math.sin(a) * r,
              0, rand(0.5, 1.5), 0, { life: 0.5, size: rand(0.5, 1.2), color: 0xeaf8ff, alpha: 0.7 });
          }
          tick -= dt;
          if (tick <= 0) {
            tick = 0.4;
            for (const e of w.fighters) {
              if (e === f || !e.alive || f.isAllyOf(e)) continue;
              if (!e.grounded && e.pos.y > 1.5) continue;
              const d = Math.hypot(w.wrapDelta(e.pos.x - center.x), w.wrapDelta(e.pos.z - center.z));
              if (d < u.radius) {
                e._beamWhiteT = 0.55;              // frosted white while inside
                e.status.slip = { t: 0.7 };        // glass underfoot
                e.takeHit(u.dmg * f.dmgMult(), f, {
                  knock: 0.5, srcPos: center, soft: true, status: { slow: 0.85, slowT: 0.5 },
                });
              }
            }
          }
          return t <= DUR;
        }, () => { w.scene.remove(sheet); geo.dispose(); mat.dispose(); });
      },
    });
    f.setState('ult', dur);
    f.iframes = dur;
  },

  // CRANKY: the sea answers — a TSUNAMI rises behind him and rolls forward
  // across the whole arena front, smashing everything in its path
  tsunami(f, u) {
    const w = f.world;
    f.setState('ult', 1.5);
    f.animator.play('castRaise');
    w.audio?.play('cast');
    const dirX = Math.sin(f.yaw), dirZ = Math.cos(f.yaw);
    const perpX = dirZ, perpZ = -dirX;
    const ox = f.pos.x, oz = f.pos.z;
    const W = u.width || 30, R = u.range || 48, H = 9, SPD = 17;
    w.schedule(0.45, () => {
      if (!f.alive) return;
      w.audio?.play('wave');
      w.audio?.play('explosionBig');
      // the wall: a curled sheet of water spanning the full width
      const geo = new THREE.CylinderGeometry(H * 0.6, H * 0.6, W, 30, 1, true, Math.PI * 1.05, Math.PI * 0.85);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x3f8ec4, transparent: true, opacity: 0.78, roughness: 0.2, metalness: 0.1,
        emissive: 0x1a4a70, emissiveIntensity: 0.45, side: THREE.DoubleSide, depthWrite: false,
      });
      const wall = new THREE.Mesh(geo, mat);
      wall.rotation.z = Math.PI / 2; // axis across the width
      const grp = new THREE.Group();
      wall.position.y = H * 0.52;
      grp.add(wall);
      grp.rotation.y = f.yaw;
      w.scene.add(grp);
      let travel = -3, t = 0;
      const victims = new Set();
      const P = new THREE.Vector3();
      w.addUpdater((dt) => {
        t += dt;
        travel += SPD * dt;
        const rise = ss(clamp01(t / 0.4));
        grp.position.set(ox + dirX * travel, (rise - 1) * H * 0.9, oz + dirZ * travel);
        grp.scale.y = Math.max(0.05, rise);
        mat.opacity = 0.78 * clamp01((R - travel) / 6 + 0.4);
        // crest spray + churning foot
        for (let i = 0; i < 4; i++) {
          const lat = rand(-W / 2, W / 2);
          const bx = ox + dirX * travel + perpX * lat;
          const bz = oz + dirZ * travel + perpZ * lat;
          w.effects.glows.emit(bx, H * rise * rand(0.85, 1.1), bz,
            dirX * rand(4, 9), rand(1, 4), dirZ * rand(4, 9),
            { life: rand(0.25, 0.5), size: rand(0.8, 1.6), color: 0xd8f2ff, alpha: 0.85, drag: 0.8 });
          if (Math.random() < 0.5) {
            w.effects.splash(P.set(bx, 0.4, bz), 3, 5, 1);
          }
        }
        if (Math.random() < 0.3) w.audio?.play('wave', { vol: 0.35 });
        // everything on the line gets hit once, hard, and carried
        for (const e of w.fighters) {
          if (e === f || !e.alive || f.isAllyOf(e) || victims.has(e)) continue;
          const rx = w.wrapDelta(e.pos.x - ox), rz = w.wrapDelta(e.pos.z - oz);
          const along = rx * dirX + rz * dirZ;
          const lat = rx * perpX + rz * perpZ;
          if (Math.abs(along - travel) < 2.4 && Math.abs(lat) < W / 2 && e.pos.y < H) {
            victims.add(e);
            e.takeHit(u.dmg * f.dmgMult(), f, {
              knock: u.knock, launch: 10, srcPos: P.set(e.pos.x - dirX * 3, 0, e.pos.z - dirZ * 3), heavy: true,
            });
            // the wave CARRIES: a hard shove downrange
            e.vel.x += dirX * 20;
            e.vel.z += dirZ * 20;
            w.effects.splash(e.center(), 14, 9, 1.4);
            w.effects.addShake(0.7);
          }
        }
        // it wrecks the street furniture too
        if (Math.random() < 0.5) {
          const lat = rand(-W / 2, W / 2);
          _v.set(ox + dirX * (travel + 1.5) + perpX * lat, 2, oz + dirZ * (travel + 1.5) + perpZ * lat);
          w.arena?.damageSphere(_v, 3.4, 70, new THREE.Vector3(dirX, 0.25, dirZ), true);
        }
        if (travel >= R) {
          // collapses into foam at the end of its run
          for (let i = 0; i < 10; i++) {
            const lat = rand(-W / 2, W / 2);
            w.effects.splash(P.set(ox + dirX * travel + perpX * lat, 0.3, oz + dirZ * travel + perpZ * lat), 5, 6, 1);
          }
          return false;
        }
        return true;
      }, () => { w.scene.remove(grp); geo.dispose(); mat.dispose(); });
    });
  },

  // SAURION: calls the pack — three full raptor clones drop in and fight
  // alongside him with everything he has (specials, pounces, quills), each
  // with a fraction of his plating and a timer on the visit
  raptorPack(f, u) {
    const w = f.world;
    f.setState('ult', 1.1);
    f.animator.play('taunt', { speed: 1.3 });
    w.audio?.play('howl');
    w.audio?.play('powerup');
    for (let i = 0; i < (u.count || 3); i++) {
      w.schedule(0.25 + i * 0.22, () => {
        if (!f.alive) return;
        const a = f.yaw + Math.PI + (i - 1) * 0.85 + rand(-0.15, 0.15);
        const pos = new THREE.Vector3(
          f.pos.x + Math.sin(a) * 3.6, 0, f.pos.z + Math.cos(a) * 3.6);
        const clone = new Fighter(w, f.def, {
          pos, yaw: f.yaw, playerIndex: f.playerIndex, isAI: true,
        });
        clone.isMinion = true;
        clone.allyOf = f;
        clone.maxHp = clone.hp = Math.round(f.maxHp * (u.hpFrac || 0.35));
        // runts of the litter: a shade smaller, darker plumage
        clone.group.scale.setScalar(0.85);
        clone.scale *= 0.85;
        clone.baseHeight *= 0.85;
        clone.height *= 0.85;
        clone.baseHitRadius *= 0.85;
        clone.hitRadius *= 0.85;
        clone.radius *= 0.85;
        for (const m of Object.values(clone.mech.materials)) {
          if (m && m.color) m.color.multiplyScalar(0.7);
        }
        w.addMinion(clone, new AIController(clone, 'ace'), u.duration || 18);
        w.effects.rings.spawn(pos, { from: 3.5, to: 0.5, dur: 0.4, color: 0xff3826, y: 1 });
        w.effects.impactSparks(clone.center(), 0xff3826, 12, 8);
        w.audio?.play('cast');
      });
    }
  },

  // FROGGER: jaw drops open and a CROAK comes out — a resonant blast wave
  // that sets every nearby bot shuddering, locks their servos solid, and
  // then lets the stored resonance tear loose all at once
  sonicCroak(f, u) {
    const w = f.world;
    f.setState('ult', 1.4);
    f.duckT = 1;
    f.animator.play('burst', { speed: 0.8 });
    w.audio?.play('howl', { pitch: 0.42, vol: 1 });
    w.audio?.play('wave', { pitch: 0.6 });
    // ribbiting shock rings pour outward at throat height
    for (let i = 0; i < 6; i++) {
      w.schedule(i * 0.12, () => {
        if (!f.alive) return;
        w.effects.rings.spawn(f.pos, {
          from: 1, to: u.radius * 2, dur: 0.55, color: 0x9ade2a, y: 0.8 + i * 0.6,
        });
      });
    }
    w.schedule(0.25, () => {
      if (!f.alive) return;
      w.effects.addShake(0.8);
      const caught = [];
      for (const e of w.fighters) {
        if (e === f || !e.alive || f.isAllyOf(e)) continue;
        if (Math.hypot(w.wrapDelta(e.pos.x - f.pos.x), w.wrapDelta(e.pos.z - f.pos.z)) < u.radius) {
          caught.push(e);
          w.effects.impactSparks(e.center(), 0x9ade2a, 8, 6);
        }
      }
      const P = u.paralyze || 2.2;
      let t = 0;
      w.addUpdater((dt) => {
        t += dt;
        if (t < P) {
          for (const e of caught) {
            if (!e.alive || e.state === 'launched' || e.state === 'frozen') continue;
            e.setState('hitstun', 0.3); // re-pinned every frame: paralyzed
            e.vel.x = 0;
            e.vel.z = 0;
            // the whole frame VIBRATES with the resonance
            if (Math.random() < 0.8) {
              e.animator.addImpulse('torso', [rand(-0.28, 0.28), rand(-0.1, 0.1), rand(-0.28, 0.28)], 52, 9);
            }
            if (Math.random() < 0.15) {
              w.effects.glows.emit(e.pos.x + rand(-1, 1), e.pos.y + rand(1, e.height), e.pos.z + rand(-1, 1),
                0, 1, 0, { life: 0.2, size: 0.8, color: 0x9ade2a, alpha: 0.8 });
            }
          }
          return true;
        }
        // release: the banked resonance detonates in every seized frame
        for (const e of caught) {
          if (!e.alive) continue;
          e.takeHit(u.dmg * f.dmgMult(), f, {
            knock: 16, launch: 9, srcPos: f.pos, heavy: true,
          });
          w.effects.explosion(e.center(), 2.6, { color: 0x9ade2a, smoke: false });
        }
        if (caught.length) {
          w.audio?.play('explosionBig');
          w.effects.addShake(1.0);
        }
        return false;
      });
    });
  },

  // JERRY: the colony stops pretending — twenty of him spring off in every
  // direction and ricochet around like fleas, biting whatever they land on
  fleaCircus(f, u) {
    const w = f.world;
    f.setState('ult', 1.0);
    f.duckT = 1; // the spring-crouch tell
    w.audio?.play('powerup');
    w.schedule(0.25, () => {
      if (!f.alive) return;
      f.vel.y = 14;
      f.grounded = false;
      w.audio?.play('jump');
      const N = u.count || 20;
      const clones = [];
      for (let i = 0; i < N; i++) {
        const g = bakeShell(f);
        g.scale.setScalar(rand(0.55, 0.8));
        g.position.set(f.pos.x + rand(-1.5, 1.5), 0, f.pos.z + rand(-1.5, 1.5));
        const yaw = rand(TAU);
        const sp = rand(6, 14);
        w.scene.add(g);
        clones.push({
          g, yaw, vx: Math.sin(yaw) * sp, vz: Math.cos(yaw) * sp, vy: rand(9, 17),
        });
      }
      const hitAt = new Map(); // circus-wide bite cadence per victim
      let t = 0;
      w.addUpdater((dt) => {
        t += dt;
        for (const c of clones) {
          c.vy -= 34 * dt;
          c.g.position.x += c.vx * dt;
          c.g.position.y += c.vy * dt;
          c.g.position.z += c.vz * dt;
          c.g.rotation.y = c.yaw;
          c.g.rotation.x = clamp(-c.vy * 0.018, -0.35, 0.5); // pitches with the hop
          if (c.g.position.y <= 0) {
            // touch down, re-aim (biased at the nearest victim), spring again
            c.g.position.y = 0;
            const prey = nearestEnemyTo(f, c.g.position.x, c.g.position.z);
            c.yaw = prey
              ? Math.atan2(w.wrapDelta(prey.pos.x - c.g.position.x), w.wrapDelta(prey.pos.z - c.g.position.z)) + rand(-0.7, 0.7)
              : rand(TAU);
            const sp = rand(7, 15);
            c.vx = Math.sin(c.yaw) * sp;
            c.vz = Math.cos(c.yaw) * sp;
            c.vy = rand(9, 17);
            if (Math.random() < 0.35) w.effects.dustPuff(c.g.position, 1, 0x9a8f80);
            if (Math.random() < 0.1) w.audio?.play('jump', { vol: 0.25, pitch: rand(1.2, 1.8) });
          }
          // a body to bump is a body to bite
          for (const e of w.fighters) {
            if (e === f || !e.alive || f.isAllyOf(e)) continue;
            if (t - (hitAt.get(e) ?? -9) < 0.22) continue;
            const dx = w.wrapDelta(e.pos.x - c.g.position.x), dz = w.wrapDelta(e.pos.z - c.g.position.z);
            if (dx * dx + dz * dz < (e.hitRadius + 1.1) ** 2 &&
                c.g.position.y < e.pos.y + e.height && c.g.position.y + 2 > e.pos.y) {
              hitAt.set(e, t);
              e.takeHit(u.dmg * f.dmgMult(), f, {
                knock: 6, srcPos: c.g.position, soft: Math.random() < 0.6,
              });
              w.effects.impactSparks(e.center(), 0xc86a4a, 7, 7);
            }
          }
        }
        return t <= (u.duration || 6) && f.alive;
      }, () => {
        for (const c of clones) w.scene.remove(c.g);
      });
    });
  },

  // NULLBOT: SYSTEM CRASH — the ARENA ITSELF stops rendering right. Ground,
  // buildings, sky: everything re-decodes in blocky streaks of wrong color,
  // and every so often the floor simply fails under an opponent — they drop
  // through the world and re-enter from the sky, hard.
  systemCrash(f, u) {
    const w = f.world;
    const dur = f.animator.play('burst', {
      onEvent: (tt) => {
        if (tt !== 'fire') return;
        w.audio?.play('explosionBig');
        w.audio?.play('zap');
        w.effects.glitchBurst(f.center(), 40, 16, 1.4 * f.scale);
        w.effects.addShake(1.2);
        // corrupt the renderer: harvest every arena material we can reach
        const mats = new Map(); // mat -> original {color, emissive, ei}
        const roots = [...(w.arena?.objects || [])];
        if (w.arena?.propGroup) roots.push(w.arena.propGroup);
        if (w.arena?.destructo?.mesh) roots.push(w.arena.destructo.mesh);
        for (const root of roots) {
          root.traverse?.((o) => {
            if (!o.isMesh) return;
            for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
              if (m && m.color && !mats.has(m)) {
                mats.set(m, {
                  color: m.color.clone(),
                  emissive: m.emissive ? m.emissive.clone() : null,
                  ei: m.emissiveIntensity,
                });
              }
            }
          });
        }
        const GLITCH_COLORS = [0xff2df2, 0x27f6ff, 0xffe93c, 0x39ff5a, 0xff2038, 0x2438ff, 0xffffff, 0x101010];
        const DUR = u.duration || 7;
        const falls = []; // {v, t, phase}
        let t = 0, scramT = 0, fallT = 0.7;
        w.addUpdater((dt) => {
          t += dt;
          // the whole world re-decodes wrong, over and over
          scramT -= dt;
          if (scramT <= 0) {
            scramT = rand(0.09, 0.22);
            for (const [m, base] of mats) {
              if (Math.random() < 0.45) {
                m.color.setHex(GLITCH_COLORS[(Math.random() * GLITCH_COLORS.length) | 0]);
                if (m.emissive) {
                  m.emissive.setHex(GLITCH_COLORS[(Math.random() * GLITCH_COLORS.length) | 0]);
                  m.emissiveIntensity = rand(0.15, 0.8);
                }
              } else {
                m.color.copy(base.color);
                if (m.emissive && base.emissive) {
                  m.emissive.copy(base.emissive);
                  m.emissiveIntensity = base.ei;
                }
              }
            }
            // square data-tears strobing all over the block
            for (let k = 0; k < 4; k++) {
              w.effects.glitchFleck(
                f.pos.x + rand(-40, 40), rand(0.5, 14), f.pos.z + rand(-40, 40), rand(1.2, 2.6));
            }
            if (Math.random() < 0.2) w.audio?.play('zap', { vol: 0.3 });
          }
          // floor de-rez: an opponent falls through the world...
          fallT -= dt;
          if (fallT <= 0 && t < DUR - 2) {
            fallT = rand(1.0, 1.8);
            const pool = w.fighters.filter((e) =>
              e !== f && e.alive && !f.isAllyOf(e) && e.grounded && !falls.some((fl) => fl.v === e));
            if (pool.length) {
              const v = pool[(Math.random() * pool.length) | 0];
              falls.push({ v, t: 0, phase: 'void' });
              w.effects.glitchBurst(v.center(), 18, 9, v.scale);
              w.audio?.play('zap');
              v.group.visible = false; // gone through the floor
              v.setState('launched', 4);
              v.iframes = 0.6;
            }
          }
          for (let i = falls.length - 1; i >= 0; i--) {
            const fl = falls[i];
            const v = fl.v;
            fl.t += dt;
            if (!v.alive) {
              v.group.visible = true;
              falls.splice(i, 1);
              continue;
            }
            if (fl.phase === 'void') {
              v.vel.set(0, 0, 0);
              if (fl.t > 0.55) {
                // ...and the sky spits them back out
                fl.phase = 'sky';
                v.group.visible = true;
                v.pos.y = 40;
                v.vel.set(rand(-3, 3), 0, rand(-3, 3));
                v.grounded = false;
                v.setState('launched', 4);
                w.effects.glitchBurst(v.center(), 14, 8, v.scale);
              }
            } else if (v.grounded) {
              v.takeHit(u.dmg * f.dmgMult(), f, {
                knock: 4, srcPos: _v.set(v.pos.x, -2, v.pos.z), status: { glitch: 1 },
              });
              w.effects.glitchBurst(v.center(), 12, 7, v.scale);
              w.effects.addShake(0.5);
              falls.splice(i, 1);
            }
          }
          return t <= DUR || falls.length > 0;
        }, () => {
          for (const [m, base] of mats) {
            m.color.copy(base.color);
            if (m.emissive && base.emissive) {
              m.emissive.copy(base.emissive);
              m.emissiveIntensity = base.ei;
            }
          }
          for (const fl of falls) fl.v.group.visible = true;
        });
      },
    });
    f.setState('ult', dur);
    f.iframes = dur;
  },
};
