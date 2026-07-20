import * as THREE from 'three';
import { rand, lerp } from '../../core/utils.js';
import { smooth } from './shared.js';

// FROGGER: hoses them down until they're MUMMIFIED head-to-toe in gunk,
// then the royal squash-hop — and the wreck is left genuinely FLATTENED
export function frogger(F) {
  const { win, vic, w } = F;
  F.approach(0.2, 0.9, 7);
  F.at(1.0, () => { win.animator.play('spray', { speed: 1.4 }); });
  // eight splats walking up the body: legs, torso, arms, head — each one
  // sticks dripping blotches on so the coverage visibly BUILDS
  const coats = [
    ['thighL', 'thighR'], ['thighR', 'torso'], ['torso', 'torso'], ['torso', 'shoulderL'],
    ['shoulderR', 'torso'], ['torso', 'head'], ['head', 'shoulderL'], ['head', 'torso'],
  ];
  for (let i = 0; i < 8; i++) {
    F.at(1.15 + i * 0.22, () => {
      F.beat('plasma', 0.3, 0.03);
      // thick gunk SPLATTERS over them and oozes down
      w.effects.slime(new THREE.Vector3(
        vic.pos.x + rand(-0.8, 0.8), rand(1, vic.height), vic.pos.z + rand(-0.8, 0.8)), 7, 5);
      for (const joint of coats[i]) {
        w.effects.blotchOn(vic, 0x74bc24, { joint, y0: joint === 'torso' ? 0.1 : -1.2, y1: joint === 'torso' ? 2.2 : 0.4, size: 1.3, life: 8 });
      }
      F.vic.animator.addImpulse('torso', [rand(-0.25, 0.25), 0, rand(-0.25, 0.25)], 34, 12);
    });
  }
  // the final coat: nothing clean left showing, oozing from every plate,
  // standing in their own puddle — THEN the stomp
  F.at(2.95, () => {
    w.effects.slimeCoat(vic, 0x74bc24, 9);
    w.effects.slime(vic.center(), 12, 7);
    w.effects.puddle(new THREE.Vector3(vic.pos.x, 0.02, vic.pos.z), { slime: true, size: 4.5, life: 8 });
    w.audio?.play('plasma');
  });
  F.at(3.05, () => F.vicDown());
  F.at(3.3, () => { win.animator.play('pounceLeap'); w.audio?.play('jump'); });
  F.hold(3.3, 3.95, (k) => { // the squash-hop onto the wreck
    win.pos.x = lerp(F.center.x - Math.sin(F.axis) * 7, vic.pos.x, k);
    win.pos.z = lerp(F.center.z - Math.cos(F.axis) * 7, vic.pos.z, k);
    win.pos.y = Math.sin(k * Math.PI) * 6;
  });
  F.at(3.95, () => {
    F.beat('bodyfall', 1.1, 0.12);
    F.sparks(24, 14, 0x9ade2a);
    w.effects.dustPuff(vic.pos, 14);
    w.effects.rings.spawn(vic.pos, { from: 0.6, to: 6, dur: 0.4, color: 0xaef23c, y: 0.3 });
  });
  // ACTUALLY flattened: pancaked under the landing, slowly re-inflating
  F.hold(3.95, 4.55, () => {
    vic.group.scale.set(1.25, 0.42, 1.25);
  });
  F.hold(4.55, 5.9, (k) => {
    const e = smooth(k);
    vic.group.scale.set(lerp(1.25, 1, e), lerp(0.42, 1, e), lerp(1.25, 1, e));
  });
  F.hold(3.95, 4.6, (k) => { // hops back off
    win.pos.x = lerp(vic.pos.x, vic.pos.x - Math.sin(F.axis) * 4, k);
    win.pos.z = lerp(vic.pos.z, vic.pos.z - Math.cos(F.axis) * 4, k);
    win.pos.y = Math.sin(k * Math.PI) * 3;
  });
  F.camShot(3.3, 4.6, { dist: 9, h: 3.4, az0: 2.4, az1: 2.9, lookH: 2.4 });
  F.at(4.7, () => F.finaleBurst(0x9ade2a));
  F.triumph(5.1, 'taunt');
}
