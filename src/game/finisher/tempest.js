import * as THREE from 'three';
import { rand } from '../../core/utils.js';

// TEMPEST: raises the storm — dark clouds close in ABOVE, BEHIND, LEFT
// and RIGHT of the mark, then REAL bolts rake in from every direction,
// each one leaving the body crackling with static
export function tempest(F) {
  const { win, vic, w } = F;
  F.approach(0.2, 0.9, 8.5);
  F.at(1.0, () => { win.animator.play('burst'); w.audio?.play('thunder'); });
  // four cloud stations boxing the victim in (station 0 = overhead)
  const stations = () => {
    const c = vic.pos;
    return [
      new THREE.Vector3(c.x, 13, c.z),
      new THREE.Vector3(c.x + Math.sin(F.axis) * 9, 8, c.z + Math.cos(F.axis) * 9),
      new THREE.Vector3(c.x + Math.cos(F.axis) * 9, 8, c.z - Math.sin(F.axis) * 9),
      new THREE.Vector3(c.x - Math.cos(F.axis) * 9, 8, c.z + Math.sin(F.axis) * 9),
    ];
  };
  // the clouds BUILD and keep churning for the whole storm
  F.hold(1.25, 5.0, (k, dt) => {
    if (Math.random() > dt * 26) return;
    const st = stations();
    const p = st[(Math.random() * st.length) | 0];
    w.effects.smoke.emit(p.x + rand(-2.5, 2.5), p.y + rand(-1, 1.2), p.z + rand(-2.5, 2.5),
      rand(-1, 1), rand(-0.2, 0.4), rand(-1, 1),
      { life: rand(1.4, 2.2), size: rand(4.5, 7.5), color: 0x0e121a, alpha: 0.95, grow: 1.2 });
    if (Math.random() < 0.2) { // static shimmer inside the clouds
      w.effects.glows.emit(p.x + rand(-2, 2), p.y + rand(-1, 1), p.z + rand(-2, 2), 0, 0, 0,
        { life: 0.2, size: rand(2, 4), color: 0x9fdcff, alpha: 0.7 });
    }
  });
  // seven strikes rotating through the stations — bolts rake in from
  // above, behind, left, right... every direction, all converging on the
  // mark, each leaving crackling static on the body
  const jolts = [0.7, -0.9, 1.8, -2.2, 0.3, 2.6, -1.2];
  for (let i = 0; i < 7; i++) {
    F.at(1.9 + i * 0.44, () => {
      const st = stations();
      const from = st[i % st.length].clone();
      from.x += rand(-1, 1); from.z += rand(-1, 1);
      const to = vic.center();
      w.effects.lightning.spawn(from, to, { color: 0xeaffff, dur: 0.24, jag: 2.6, thick: 0.26 });
      w.effects.lightning.spawn(from, to, { color: 0x9fdcff, dur: 0.28, jag: 1.6, thick: 0.12 });
      w.effects.glows.emit(to.x, to.y, to.z, 0, 0, 0, { life: 0.25, size: 6, color: 0xbfefff, alpha: 1 });
      w.effects.staticCling(vic, 1.2);
      F.beat('zap', 0.55, 0.06);
      F.sparks(10, 8, 0xcfefff);
      F.vicFlinch();
    });
    F.vicBash(1.92 + i * 0.44, F.axis + jolts[i], 1.3, 0.8, 0.6);
  }
  F.trackCenter(1.9, 5.2, 4);
  // slow sweeping orbit around the boxed-in kill zone
  F.camShot(1.25, 5.05, { dist: 12.5, h: 4, az0: 0.7, az1: 2.1, lookH: 4 });
  F.at(5.0, () => { F.vicDown(); F.finaleBurst(0x9fdcff); });
  F.triumph(5.45, 'burst', 'thunder');
}
