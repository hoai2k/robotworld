import { rand } from '../../core/utils.js';
import { smooth } from './shared.js';
import { carryGrip } from './carry.js';

// TITANUS: seize, slam to the dirt, then STAY ON THE BODY — each quake
// punt bashes the wreck away and he stomps after it for the next one
export function titanus(F) {
  const { win, vic, w } = F;
  F.approach(0.2, 1.0, 3.2);
  F.at(1.1, () => { win.animator.play('grabReach'); w.audio?.play('servo'); });
  F.at(1.45, () => { win.animator.play('liftHold'); F.ragdoll(vic); F.beat('whooshBig', 0.3, 0); });
  carryGrip(F, 1.28, 2.55); // seize + ride the liftHold arm-swing (carry.js)
  // lift shot from the FRONT quarter: the victim hangs in the hands with
  // titanus's face behind them, not a wall of back armor
  F.camShot(1.3, 2.6, { dist: 10, h: 6.5, az0: 0.5, az1: 0.05, lookH: 6.2 });
  F.at(2.55, () => win.animator.play('throwHeave'));
  let tx0, ty0, tz0;
  F.hold(2.6, 2.82, (k) => { // hurled straight out of the hands
    if (tx0 === undefined) { tx0 = vic.pos.x; ty0 = vic.pos.y; tz0 = vic.pos.z; }
    vic.pos.x = tx0 + Math.sin(win.yaw) * 2.4 * k * win.scale;
    vic.pos.z = tz0 + Math.cos(win.yaw) * 2.4 * k * win.scale;
    vic.pos.y = ty0 * (1 - k * k);
  });
  F.at(2.85, () => {
    F.beat('bodyfall', 1, 0.1);
    vic.group.rotation.x = 0;
    vic.group.rotation.z = 0;
    F.vicDown();
    F.center.set(vic.pos.x, 0, vic.pos.z);
    w.effects.dustPuff(vic.pos, 12);
  });
  F.camAction(2.85, 5.75, { dist: 14, h: 4.6, lookH: 2.6 });
  F.trackCenter(2.9, 5.7, 5);
  // then he JUMPS ON TOP of the wreck and TRAMPLES it — repeated stomps
  // with the body pinned under his feet the whole time
  const bodyTop = 0.85 * vic.scale;
  F.at(3.0, () => { win.animator.play('pounceLeap'); w.audio?.play('jump'); });
  let jx0, jz0;
  F.hold(3.02, 3.46, (k) => {
    if (jx0 === undefined) { jx0 = win.pos.x; jz0 = win.pos.z; }
    const s = smooth(k);
    win.pos.x = jx0 + w.wrapDelta(vic.pos.x - jx0) * s;
    win.pos.z = jz0 + w.wrapDelta(vic.pos.z - jz0) * s;
    win.pos.y = Math.sin(Math.PI * k) * 4.4 * win.scale + bodyTop * k;
  });
  F.at(3.46, () => {
    F.beat('slam', 1, 0.1);
    F.sparks(22, 13);
    // jolt the wreck, never re-pose it — a flinch clip would stand it up
    vic.animator.addImpulse('torso', [rand(-0.4, 0.4), 0.4, rand(-0.4, 0.4)], 22, 7);
    w.effects.dustPuff(vic.pos, 10);
    w.effects.rings.spawn(vic.pos, { from: 0.6, to: 5.5, dur: 0.35, color: 0xffb43c, y: 0.3 });
  });
  // stay planted on the body straight through the triumph pose
  F.hold(3.46, F.dur, () => {
    win.pos.x = vic.pos.x;
    win.pos.z = vic.pos.z;
    win.pos.y = bodyTop;
  });
  for (let i = 0; i < 4; i++) {
    const tS = 3.6 + i * 0.5;
    F.at(tS, () => win.animator.play(i % 2 ? 'stomp2' : 'stomp', { speed: 1.1 }));
    F.at(tS + 0.26, () => {
      F.beat('slam', 0.7, 0.06);
      F.sparks(14, 10);
      // shudder the pinned wreck under the foot (additive — stays down)
      for (const j of ['torso', 'thighL', 'thighR', 'head']) {
        vic.animator.addImpulse(j, [rand(-0.5, 0.5), rand(-0.2, 0.4), rand(-0.5, 0.5)], 20, 6);
      }
      w.effects.dustPuff(vic.pos, 5);
      w.effects.rings.spawn(vic.pos, { from: 0.5, to: 4, dur: 0.3, color: 0xffb43c, y: 0.3 });
    });
  }
  F.at(5.75, () => F.finaleBurst());
  F.triumph(5.85, 'castRaise'); // arms to the sky, atop the wreck
}
