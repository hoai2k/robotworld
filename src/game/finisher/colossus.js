import * as THREE from 'three';
import { FEET, HEAD } from '../../combat/ragdollphys.js';
import { smooth, _ct } from './shared.js';
import { carryGrip } from './carry.js';

// COLOSSUS: hoist them overhead, then — one-armed, never letting go —
// smash the body into the dirt on his right, his left, his right again,
// hurl the wreck away single-handed and strike the strongman pose.
export function colossus(F) {
  const { win, vic, w } = F;
  const S = win.scale;
  F.approach(0.2, 1.0, 3.2);
  F.at(1.1, () => { win.animator.play('grabReach'); w.audio?.play('servo'); });
  F.at(1.45, () => { win.animator.play('liftHold'); F.ragdoll(vic); F.beat('whooshBig', 0.3, 0); });
  carryGrip(F, 1.28, 2.5); // seize + ride the liftHold arm-swing (carry.js)
  F.camShot(1.3, 2.55, { dist: 10, h: 6.5, az0: 0.5, az1: 0.05, lookH: 6.2 });
  F.camAction(2.55, 6.2, { dist: 16, h: 5.2, lookH: 3.2 });
  F.trackCenter(2.6, 6.1, 5);
  // the FEET-GRIP thrash: a live ragdoll with both ankles pinned into his
  // right fist — and STEERED swings: each slam also pins the head along a
  // choreographed arc that carries the body clear over him and cracks it
  // into the dirt beside his RIGHT leg, then his LEFT, then right again.
  // The steering keeps the smashes deliberate and alternating; the loose
  // limbs, ground contact and rebound still come from the physics.
  F.at(2.55, () => {
    const sim = F.ragdollPhys(vic);
    const hand = win.mech.joints.handR;
    sim.pin('feet', FEET, (out, k) => {
      hand.getWorldPosition(_ct);
      out.set(_ct.x + (k ? 0.3 : -0.3) * S, Math.max(_ct.y, 0.4), _ct.z);
    });
  });
  const swingLen = vic.height * 0.95; // feet-in-fist to head, stretched
  for (let i = 0; i < 3; i++) {
    const tS = 2.55 + i * 1.05;
    const side = i % 2 ? -1 : 1; // right, over-the-top to left, right
    F.at(tS, () => win.animator.play(side > 0 ? 'colossusSlamR' : 'colossusSlamL', { speed: 0.75 }));
    // head-steering arc: phi is the body's lean off straight-up in his
    // lateral plane — from where the last swing left it, over the top
    // (phi=0, body stretched skyward), down to phi=±2.3: head in the dirt
    const phi0 = i === 0 ? -0.9 * side : -2.3 * side;
    F.hold(tS, tS + 1.0, (k) => {
      const sim = F.ragdollPhys(vic);
      const phi = phi0 + (2.3 * side - phi0) * smooth(k);
      sim.pin('head', HEAD, (out) => {
        win.mech.joints.handR.getWorldPosition(_ct);
        const latX = -Math.cos(win.yaw), latZ = Math.sin(win.yaw);
        out.set(
          _ct.x + latX * Math.sin(phi) * swingLen,
          Math.max(0.55, _ct.y + Math.cos(phi) * swingLen),
          _ct.z + latZ * Math.sin(phi) * swingLen);
      });
    });
    F.at(tS + 0.8, () => { // the head cracks the dirt
      F.beat('slam', 0.85, 0.08);
      const hp = vic.mech.joints.head
        ? vic.mech.joints.head.getWorldPosition(new THREE.Vector3()) : vic.center();
      hp.y = Math.min(hp.y, 0.6);
      w.effects.impactSparks(hp, 0xffc23c, 16, 10);
      w.effects.dustPuff(hp, 9);
      w.effects.rings.spawn(hp, { from: 0.6, to: 5, dur: 0.32, color: 0xffc23c, y: 0.3 });
    });
  }
  // let go of the head after the last crack — the body dangles limp from
  // the fist through the throw wind-up
  F.at(5.65, () => F.ragdollPhys(vic).unpin('head'));
  // the single-hand hurl: open the fist mid-heave and let momentum
  // (plus a shove) send the wreck tumbling — it bounces where it lands
  F.at(5.75, () => { win.animator.play('throwHeave'); w.audio?.play('whooshBig'); });
  F.at(5.95, () => {
    const sim = F.ragdollPhys(vic);
    sim.clearPins();
    sim.impulse(new THREE.Vector3(
      Math.sin(win.yaw) * 13 * S, 5.5, Math.cos(win.yaw) * 13 * S), 3);
  });
  F.at(6.16, () => F.finaleBurst());
  F.triumph(6.3, 'castRaise');
}
