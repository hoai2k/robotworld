// Per-mech special & ultimate implementations, dispatched by id from roster.
import * as THREE from 'three';
import { rand, clamp, clamp01 } from '../core/utils.js';

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
// (artillery arcs, delayed pillars) that otherwise land where they WERE
function leadPos(e, t) {
  const p = e.pos.clone().addScaledVector(e.vel, t);
  p.y = 0;
  return p;
}

function aimDir(f, pitch = 0) {
  const e = f.nearestEnemy();
  if (e) {
    const d = new THREE.Vector3().subVectors(e.center(), muzzle(f)).normalize();
    return d;
  }
  return new THREE.Vector3(Math.sin(f.yaw), pitch, Math.cos(f.yaw)).normalize();
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
            f.world.projectiles.spawn('plasma', f, origin, new THREE.Vector3(0, 1, 0), {
              dmg: sp.dmg * f.dmgMult(), speed: 22, splash: 2.6, color: 0xff5ce8,
              homing: target, retarget: true, turnRate: 4.0, life: 4.5,
            });
            f.world.audio?.play('plasma');
          });
        }
      },
    });
    f.setState('special', dur * 0.8);
  },

  // RHINO: bull rush charge
  bullRush(f, sp) {
    f.animator.play('chargeLean');
    f.setState('special', 0.85);
    f.world.audio?.play('charge');
    const victims = new Set();
    const steps = 17;
    for (let i = 1; i <= steps; i++) {
      f.world.schedule(i * 0.05, () => {
        if (!f.alive || f.state !== 'special') return;
        const spd = f.def.stats.speed * 3.1;
        f.vel.x = Math.sin(f.yaw) * spd;
        f.vel.z = Math.cos(f.yaw) * spd;
        f.world.effects.dustPuff(f.pos, 2, 0x9a9088);
        for (const e of f.world.fighters) {
          if (e === f || !e.alive || victims.has(e)) continue;
          if (e.pos.distanceTo(f.pos) < 3.6 * f.scale) {
            victims.add(e);
            e.takeHit(sp.dmg * f.dmgMult(), f, { knock: sp.knock, launch: 8, srcPos: f.pos, heavy: true });
            f.world.engine.addHitStop(0.08);
            f.world.effects.addShake(0.5);
          }
        }
        if (i === steps) { f.animator.stop(); f.setState('normal'); }
      });
    }
  },

  // TEMPEST: radial static discharge
  staticField(f, sp) {
    const dur = f.animator.play('burst', {
      onEvent: (t) => {
        if (t !== 'fire') return;
        const w = f.world;
        const c = f.center();
        w.effects.rings.spawn(f.pos, { from: 1, to: sp.radius * 2, dur: 0.5, color: 0x53e8ff, y: 0.5 });
        w.audio?.play('zap');
        for (const e of w.fighters) {
          if (e === f || !e.alive) continue;
          const d = e.pos.distanceTo(f.pos);
          if (d < sp.radius) {
            e.takeHit(sp.dmg * f.dmgMult(), f, { knock: 14, srcPos: f.pos, status: { slow: 0.6, slowT: 1.6 } });
            w.effects.lightning.spawn(c, e.center(), { color: 0x8fe8ff });
          }
        }
        // coil show
        for (const cn of ['coilL', 'coilR']) {
          if (f.mech.anchors[cn]) {
            const p = f.mech.anchors[cn].getWorldPosition(new THREE.Vector3());
            w.effects.lightning.spawn(p, p.clone().add(new THREE.Vector3(rand(-4, 4), rand(2, 5), rand(-4, 4))), { color: 0x8fe8ff });
          }
        }
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
    if (e) {
      // lead the landing point — the leap is airborne ~0.7s
      const px = e.pos.x + e.vel.x * 0.5, pz = e.pos.z + e.vel.z * 0.5;
      f.yaw = f.targetYaw = Math.atan2(px - f.pos.x, pz - f.pos.z);
    }
    const dist = e ? Math.min(sp.leap, f.pos.distanceTo(e.pos)) : sp.leap;
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

  // COLOSSUS: artillery barrage on target area
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
            const target = e ? leadPos(e, arcTime * 0.85) : fallback;
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

  // WRAITH: cloak
  cloak(f, sp) {
    f.status.cloak = { t: sp.duration, spd: sp.speedBoost };
    f.setOpacity(0.16);
    f.world.audio?.play('cloak');
    f.world.effects.rings.spawn(f.pos, { from: 3, to: 0.5, dur: 0.4, color: 0xff3838, y: f.height * 0.5 });
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
              e.takeHit(sp.dmg * f.dmgMult(), f, { knock: 1, srcPos: from, status: { slow: sp.slow, slowT: 1.2 }, silent: true });
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
        const target = e ? leadPos(e, 0.45) : fwd(f, 12);
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
            f.world.effects.lightning.spawn(top, target, { color: 0x9fdcff, dur: 0.3, jag: 3 });
            f.world.effects.glows.emit(target.x, target.y + 1, target.z, 0, 0, 0, { life: 0.25, size: 6, color: 0xbfefff, alpha: 1 });
            f.world.explode(target, 4.5, u.dmg * f.dmgMult(), { owner: f, knock: 12, color: 0x9fdcff, silentFx: true });
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
    const target = e ? leadPos(e, 1.0) : fwd(f, 30);
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
