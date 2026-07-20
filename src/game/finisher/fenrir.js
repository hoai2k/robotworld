import { smooth } from './shared.js';

// FENRIR: wolf pounce, quick maul, then jaws clamp and DRAG the wreck in
// a full sweeping circle before flinging it away — the howl over the kill
export function fenrir(F) {
  const { win, vic, w } = F;
  F.approach(0.2, 0.8, 8);
  F.at(0.95, () => { win.animator.play('lunge', { speed: 1.2 }); w.audio?.play('howl'); });
  // the pounce lands SHORT of the mark — striking range, not on top of it
  F.hold(0.95, 1.35, (k) => {
    win.pos.x = F.center.x - Math.sin(F.axis) * (8 - 5.2 * k);
    win.pos.z = F.center.z - Math.cos(F.axis) * (8 - 5.2 * k);
    win.pos.y = Math.sin(k * Math.PI) * 3.4;
  });
  // the pounce STAGGERS them — they stay on their feet for the mauling
  F.at(1.35, () => { F.beat('slash', 0.8, 0.1); F.vicFlinch(); w.effects.dustPuff(vic.pos, 8); });
  F.at(1.5, () => win.animator.play('flurry', { speed: 1.7 }));
  // planted at claw's reach: the victim stands IN FRONT catching the
  // end of every swipe
  F.hold(1.35, 2.32, () => {
    win.pos.x = F.center.x - Math.sin(F.axis) * 2.8;
    win.pos.z = F.center.z - Math.cos(F.axis) * 2.8;
    win.pos.y = 0;
    win.yaw = win.targetYaw = F.axis;
  });
  for (let i = 0; i < 3; i++) {
    F.at(1.62 + i * 0.24, () => {
      F.sparks(11, 9, 0x6cd8ff);
      w.audio?.play('slash');
      F.vicFlinch(); // each swipe rocks the standing victim
    });
  }
  // ...and only the LAST swipe puts them down
  F.at(2.28, () => { F.beat('hitHeavy', 0.7, 0.08); F.vicDown(); w.effects.dustPuff(vic.pos, 6); });
  // jaws lock and he TEARS OFF, dragging the wreck in a wide circle
  // (circle phased so grab-point ~= where the bodies already are)
  F.hold(2.35, 3.9, (k, dt) => {
    const e = smooth(k);
    const ang = F.axis + Math.PI + e * 3.6;
    vic.pos.x = F.center.x + Math.sin(ang) * 2.2;
    vic.pos.z = F.center.z + Math.cos(ang) * 2.2;
    vic.pos.y = 0.25;
    vic.group.rotation.x = -1.35; // scraped along on their back
    vic.yaw = vic.targetYaw = ang + Math.PI / 2;
    vic.group.rotation.y = vic.yaw;
    win.pos.x = F.center.x + Math.sin(ang) * 3.9;
    win.pos.z = F.center.z + Math.cos(ang) * 3.9;
    win.yaw = win.targetYaw = ang + 1.25;
    F.winCtx = { speed: 9, maxSpeed: 12, grounded: true }; // wolf gallop
    if (Math.random() < dt * 16) w.effects.dustPuff(vic.pos, 2);
    if (Math.random() < dt * 8) { F.sparks(6, 6, 0x6cd8ff); }
  });
  F.camAction(1.35, 3.9, { dist: 11, h: 3.2, lookH: 1.6, rate: 2.5 });
  // the release: flung tumbling across the arena
  F.at(3.9, () => { F.beat('whooshBig', 0.7, 0.08); vic.animator.play('launched'); win.animator.stop(0.15); });
  F.hold(3.9, 4.65, (k) => {
    const endAng = F.axis + Math.PI + 3.6;
    const dir = endAng + 1.35;
    const e = 1 - (1 - k) * (1 - k);
    vic.pos.x = F.center.x + Math.sin(endAng) * 2.2 + Math.sin(dir) * 9 * e;
    vic.pos.z = F.center.z + Math.cos(endAng) * 2.2 + Math.cos(dir) * 9 * e;
    vic.pos.y = Math.sin(Math.min(1, k) * Math.PI) * 3.2;
    vic.group.rotation.x = -1.35 - k * 4;
  });
  F.at(4.65, () => {
    vic.group.rotation.x = 0;
    F.vicDown();
    F.beat('bodyfall', 0.8, 0.06);
    w.effects.dustPuff(vic.pos, 10);
  });
  F.trackCenter(3.9, 5.4, 5);
  F.at(4.7, () => F.finaleBurst());
  F.triumph(4.95, 'taunt', 'howl');
}
