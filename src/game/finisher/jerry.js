import * as THREE from 'three';
import { rand } from '../../core/utils.js';

// JERRY: the nest empties — he SHOOTS a hundred fleas out of his
// cannons, raining them over and all around the mark... and then we
// just watch them do what fleas do: hop in, swarm, latch, feed
export function jerry(F) {
  const { win, vic, w } = F;
  F.approach(0.2, 1.0, 8);
  F.at(1.05, () => { win.animator.play('shootLoop'); w.audio?.play('dart'); });
  // ten cannon bursts of ten — a spraying arc that lands fleas over,
  // past, short and beside the victim (spawned as ORDINARY fleas; the
  // swarm behavior is all their own)
  for (let b = 0; b < 10; b++) {
    F.at(1.15 + b * 0.17, () => {
      F.winCtx = null;
      const from = (b % 2 ? win.mech.anchors.muzzleL : win.mech.anchors.muzzleR)
        ?.getWorldPosition(new THREE.Vector3()) || win.center();
      const dx = w.wrapDelta(vic.pos.x - win.pos.x);
      const dz = w.wrapDelta(vic.pos.z - win.pos.z);
      const d = Math.hypot(dx, dz) || 1;
      for (let i = 0; i < 10; i++) {
        const dir = new THREE.Vector3(
          dx / d + rand(-0.4, 0.4), rand(0.3, 0.95), dz / d + rand(-0.4, 0.4));
        // lobbed, not fired flat: the arcs RAIN down over and around them
        w.fleas.spawn(win, from, dir, { dmg: 0, life: rand(7, 10), speed: rand(12, 19) });
      }
      w.effects.muzzleFlash(from, 0xff8a60);
      w.audio?.play('dart');
    });
  }
  F.hold(1.1, 2.9, () => { F.winCtx = { speed: 0, grounded: true, firing: true }; });
  // the victim staggers as the swarm crawls up them
  for (let i = 0; i < 6; i++) {
    F.at(2.6 + i * 0.5, () => {
      if (i % 2 === 0) F.vicFlinch();
      vic.animator.addImpulse('torso', [rand(-0.3, 0.3), 0, rand(-0.3, 0.3)], 30, 10);
      if (Math.random() < 0.6) w.audio?.play('slash');
    });
  }
  // wide on the barrage arc, then push in CLOSE on the swarm at work
  F.camShot(1.1, 3.0, { dist: 10.5, h: 3.6, az0: 1.9, az1: 2.45, lookH: 2.6 });
  F.camShot(3.0, 5.3, { dist: 5.5, h: 2.2, az0: 2.55, az1: 2.15, lookH: 1.8 });
  F.at(4.9, () => F.vicDown()); // finally collapses under them
  F.at(5.6, () => F.finaleBurst(0xc86a4a));
  F.triumph(5.7, 'taunt', 'dart');
}
