import * as THREE from 'three';
import { rand } from '../../core/utils.js';

// VULCAN: point-blank gatling storm — the stream SHOVES them backwards,
// sliding through the dirt, and he keeps walking them down
// VULCAN: arms flung up and OUT, a whole magazine sprayed skyward in every
// direction — the mark looks around, lost, the camera pulls WAY back...
// and the entire swarm whips around as one and homes in, hammering them
// in a single simultaneous barrage. Crumble. Maniacal pose.
export function vulcan(F) {
  const { win, vic, w } = F;
  F.approach(0.2, 1.0, 7);
  const shots = [];
  F.at(1.05, () => { win.animator.play('vulcanSpray'); w.audio?.play('charge'); });
  // rocked back on his heels, one gatling flung casually over his
  // shoulder — the whole magazine hoses out of it in a lazy dome while
  // he shakes with laughter
  F.hold(1.1, 1.7, (k, dt) => {
    F.winCtx = { speed: 0, grounded: true, firing: true };
    const from = win.mech.anchors.muzzleR.getWorldPosition(new THREE.Vector3());
    for (let n = 0; n < 2; n++) {
      const a = rand(Math.PI * 2), el = rand(0.45, 1.25);
      shots.push({
        x: from.x, y: from.y, z: from.z,
        vx: Math.cos(a) * Math.cos(el) * 26,
        vy: Math.sin(el) * 30 + rand(-2, 2),
        vz: Math.sin(a) * Math.cos(el) * 26,
        state: 0, tick: n,
      });
    }
    w.effects.muzzleFlash(from);
    if (Math.random() < dt * 26) w.audio?.play('gatling');
  });
  // the laugh: rhythmic little heaves of the torso and head
  F.hold(1.15, 2.8, (k, dt) => {
    F._laughT = (F._laughT ?? 0) - dt;
    if (F._laughT <= 0) {
      F._laughT = 0.24;
      win.animator.addImpulse('torso', [-0.14, 0, rand(-0.08, 0.08)], 15, 6);
      win.animator.addImpulse('head', [0.18, rand(-0.1, 0.1), 0], 15, 6);
    }
  });
  // the mark looks around, confused — head snapping after the streaks
  F.hold(1.4, 2.85, (k, dt) => { vic.yaw += Math.sin(k * 17) * dt * 2.2; });
  F.at(1.5, () => vic.animator.addImpulse('head', [0, 0.6, 0], 9, 3));
  F.at(2.1, () => vic.animator.addImpulse('head', [0, -0.7, 0], 9, 3));
  F.at(2.6, () => vic.animator.addImpulse('head', [0.3, 0.5, 0], 9, 3));
  // camera pulls WAY out so the whole orbiting swarm reads
  F.camShot(1.15, 3.3, { dist: 30, h: 12, az0: 2.0, az1: 2.55, lookH: 5 });
  // ...and on this beat, every round whips around AS ONE
  F.at(2.85, () => { w.audio?.play('charge'); for (const s of shots) s.state = 1; });
  // swarm physics: loft outward, then hard-home on the mark together
  F.hold(1.1, 4.5, (k, dt) => {
    for (const s of shots) {
      if (s.state === 2) continue;
      if (s.state === 0) {
        s.vy -= 9 * dt; // lofting fountain arc
      } else {
        const tx = vic.pos.x - s.x, ty = vic.pos.y + vic.height * 0.55 - s.y, tz = vic.pos.z - s.z;
        const d = Math.hypot(tx, ty, tz);
        if (d < 1.5) {
          s.state = 2;
          // the barrage DETONATES on the mark: every few rounds a real
          // explosion, sparks for the rest
          F._swarmHits = (F._swarmHits || 0) + 1;
          if (F._swarmHits % 4 === 0) {
            w.effects.explosion(new THREE.Vector3(s.x, s.y, s.z), 1.7, { color: 0xffb43c });
          } else {
            w.effects.impactSparks(new THREE.Vector3(s.x, s.y, s.z), 0xffd080, 5, 6);
          }
          continue;
        }
        const sp = 40, r = Math.min(1, dt * 8);
        s.vx += ((tx / d) * sp - s.vx) * r;
        s.vy += ((ty / d) * sp - s.vy) * r;
        s.vz += ((tz / d) * sp - s.vz) * r;
      }
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      if (s.y < 0.15) { s.y = 0.15; s.vy = Math.abs(s.vy) * 0.4; }
      // battle-scale tracer: a bright head with a trailing tail glow —
      // the same fat streak the gatling fires in combat
      w.effects.glows.emit(s.x, s.y, s.z, 0, 0, 0,
        { life: 0.13, size: 1.15, color: 0xffd080, alpha: 0.95 });
      s.tick ^= 1;
      if (s.tick) {
        w.effects.glows.emit(s.x - s.vx * 0.022, s.y - s.vy * 0.022, s.z - s.vz * 0.022,
          0, 0, 0, { life: 0.1, size: 0.8, color: 0xffb43c, alpha: 0.7 });
      }
    }
  });
  // punch back in for the convergence — the all-at-once barrage
  F.camAction(3.3, 4.6, { dist: 13, h: 4, lookH: 2.4 });
  F.trackCenter(3.3, 4.6, 5);
  F.at(3.55, () => { F.beat('hit', 0.6, 0.05); F.sparks(18, 10); F.vicFlinch(); });
  F.at(3.75, () => { F.beat('hitHeavy', 0.85, 0.08); F.sparks(26, 14); F.vicFlinch(); });
  F.at(4.0, () => {
    F.beat('explosionBig', 1, 0.1);
    F.finaleBurst(0xffd060);
    F.vicDown(); // riddled — crumbles where they stand
    w.effects.dustPuff(vic.pos, 10);
  });
  F.triumph(4.7, 'victory', 'gatling');
}
