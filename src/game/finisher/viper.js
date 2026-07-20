// VIPER: five-point blink cage of sword cuts — each teleport lands a
// different blade form (cross-cut, rising cut, skewering stab) — then one
// kesa-giri launcher slash; the camera whips down low and TRACKS the body
export function viper(F) {
  const { win, vic, w } = F;
  F.approach(0.2, 0.8, 3.2);
  const forms = ['viperSlash1', 'viperStab', 'viperSlash2', 'viperStab', 'viperSlash1'];
  const blink = (t, side, form) => {
    F.at(t, () => {
      win.pos.x = F.center.x - Math.sin(F.axis + side) * 3;
      win.pos.z = F.center.z - Math.cos(F.axis + side) * 3;
      win.yaw = win.targetYaw = F.axis + side;
      w.effects.dashTrail(win.pos, 0x6cff5c, win.scale * 1.6);
      win.animator.play(form, { speed: 1.4 });
      w.audio?.play('dash');
    });
    F.at(t + 0.2, () => { F.beat('slash', 0.4, 0.05); F.sparks(12, 9, 0x6cff5c); F.vicFlinch(); });
  };
  blink(1.0, 0, forms[0]);
  blink(1.55, 2.1, forms[1]);
  blink(2.1, -2.1, forms[2]);
  blink(2.65, Math.PI, forms[3]);
  blink(3.2, 1.05, forms[4]);
  F.camShot(1.0, 3.9, { dist: 8, h: 3.4, az0: 2.0, az1: 3.6, lookH: 3 });
  F.at(3.75, () => {
    win.pos.x = F.center.x - Math.sin(F.axis) * 3;
    win.pos.z = F.center.z - Math.cos(F.axis) * 3;
    win.yaw = win.targetYaw = F.axis;
    w.effects.dashTrail(win.pos, 0x6cff5c, win.scale * 1.6);
    win.animator.play('viperHeavy', { speed: 1.2 });
  });
  F.at(4.1, () => {
    F.beat('hitHeavy', 0.9, 0.12);
    F.sparks(26, 16, 0x6cff5c);
    vic.animator.play('launched');
  });
  F.hold(4.1, 5.3, (k) => {
    vic.pos.y = Math.sin(Math.min(1, k) * Math.PI) * 8;
    vic.group.rotation.x = -k * 4;
  });
  // low tracking shot follows the body skyward and back down
  F.hold(4.05, 5.3, (k) => {
    const az = F.axis + 2.6;
    const d = 9 * F.stageScale;
    F.cam.pos.set(F.center.x + Math.sin(az) * d, 2.2 * F.stageScale, F.center.z + Math.cos(az) * d);
    F.cam.look.set(vic.pos.x, Math.max(1.5, vic.pos.y + vic.height * 0.4), vic.pos.z);
  });
  F.at(5.3, () => {
    vic.group.rotation.x = 0;
    F.vicDown();
    F.finaleBurst();
    w.effects.dustPuff(vic.pos, 10);
  });
  F.triumph(5.6);
}
