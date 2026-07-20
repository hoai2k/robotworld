import * as THREE from 'three';
import { rand } from '../../core/utils.js';
import { smooth } from './shared.js';

// WRAITH: hurls the ghost FORWARD through the mark, blinks to the far
// side, wheels around and hurls it forward again — four hunting passes
// (the spectre only ever flies out of him), then the rail slug
export function wraith(F) {
  const { win, vic, w } = F;
  F.approach(0.2, 0.75, 7);
  F.at(0.9, () => { win.animator.play('castRaise'); w.audio?.play('cloak'); });
  F.at(1.1, () => win.setOpacity(0.5)); // half in the dark while hunting
  const pass = (t0, i) => {
    const side = i % 2 === 0 ? -1 : 1; // alternating launch side
    F.at(t0 - 0.14, () => {
      // blink to the launch side, square up on the victim
      win.pos.x = F.center.x + Math.sin(F.axis) * 7 * side;
      win.pos.z = F.center.z + Math.cos(F.axis) * 7 * side;
      win.yaw = win.targetYaw = side < 0 ? F.axis : F.axis + Math.PI;
      win.group.rotation.y = win.yaw;
      w.effects.rings.spawn(win.pos, { from: 2.2, to: 0.4, dur: 0.3, color: 0xff3838, y: win.height * 0.5 });
      w.audio?.play('cloak');
      win.animator.play('aim', { speed: 1.3 });
    });
    F.at(t0, () => {
      F.dropSpectre();
      F.makeSpectre().visible = true; // baked facing the way he faces
      w.audio?.play('howl', { vol: 0.3, pitch: 1.8 });
    });
    F.hold(t0, t0 + 0.6, (k) => {
      const sp = F._spectre;
      if (!sp) return;
      const e = smooth(k);
      // always OUT of wraith: from his side, through the mark, beyond
      sp.ghost.position.set(
        Math.sin(F.axis) * 14 * e * -side,
        Math.sin(e * Math.PI) * 0.5,
        Math.cos(F.axis) * 14 * e * -side);
      sp.gmat.opacity = 0.3 - e * 0.12 + 0.1 * Math.sin(k * 40);
    });
    F.at(t0 + 0.3, () => { F.beat('slash', 0.5, 0.06); F.sparks(14, 10, 0xcfe8ff); F.vicFlinch(); });
    F.at(t0 + 0.62, () => F.dropSpectre());
  };
  pass(1.35, 0);
  pass(2.25, 1);
  pass(3.15, 2);
  pass(4.05, 3);
  // side-on profile shot so the launch-blink-launch rhythm reads clean
  F.camShot(0.9, 4.6, { dist: 11, h: 2.9, az0: 1.4, az1: 1.75, lookH: 2.5 });
  F.at(4.7, () => {
    win.pos.x = F.center.x - Math.sin(F.axis) * 7;
    win.pos.z = F.center.z - Math.cos(F.axis) * 7;
    win.yaw = win.targetYaw = F.axis;
    win.group.rotation.y = win.yaw;
    win.setOpacity(1);
    w.effects.rings.spawn(win.pos, { from: 3, to: 0.5, dur: 0.4, color: 0xff3838, y: win.height * 0.5 });
    w.audio?.play('cloak');
    win.animator.play('aim', { speed: 0.9 });
  });
  F.camShot(4.6, 5.8, { dist: 8.5, h: 2.8, az0: 3.65, az1: 3.35, lookH: 2.4 });
  F.at(5.15, () => {
    const from = win.mech.anchors.muzzleR.getWorldPosition(new THREE.Vector3());
    w.effects.beams.spawn(from, vic.center(), { radius: 0.22, dur: 0.5, color: 0xff3838 });
    F.beat('railgun', 1, 0.16);
    F.sparks(26, 15, 0xff3838);
  });
  F.vicBash(5.16, F.axis, 3.2, 1.4, 1.5);
  F.trackCenter(5.1, 6.0, 5);
  F.at(5.5, () => F.vicDown());
  F.at(5.35, () => {
    for (let i = 0; i < 4; i++) {
      const a = F.axis + rand(-0.6, 0.6);
      w.projectiles.spawn('bat', win, vic.center(), new THREE.Vector3(Math.sin(a), 0.5, Math.cos(a)), {
        dmg: 0, speed: 14, color: 0x8a2030, knock: 0, life: 2.5, wobble: 1.2,
      });
    }
    w.audio?.play('howl', { vol: 0.4, pitch: 1.6 });
  });
  F.at(5.7, () => F.finaleBurst(0xff3838));
  F.triumph(5.8, 'aim', 'cloak');
}
