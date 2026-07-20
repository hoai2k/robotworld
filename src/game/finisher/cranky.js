import { GeyserFX } from '../../combat/geyserfx.js';

// CRANKY: three colossal claw CLAMPS batting the victim side to side,
// then his geyser fires the wreck WAY into the sky
export function cranky(F) {
  const { win, vic, w } = F;
  F.approach(0.2, 1.0, 3.4);
  // claws track the ragdoll so every clamp connects
  F.hold(1.1, 3.2, (k, dt) => {
    const dx = w.wrapDelta(vic.pos.x - win.pos.x);
    const dz = w.wrapDelta(vic.pos.z - win.pos.z);
    win.yaw = win.targetYaw = Math.atan2(dx, dz);
  });
  for (let i = 0; i < 3; i++) {
    F.at(1.15 + i * 0.62, () => win.animator.play('clawSnap', { speed: 1.3 }));
    F.at(1.42 + i * 0.62, () => { F.beat('block', 0.6, 0.08); F.sparks(16, 11, 0x59c8ff); F.vicFlinch(); });
    F.vicBash(1.44 + i * 0.62, F.axis + (i % 2 ? 1.35 : -1.35), 1.7, 0.8, 0.6);
  }
  F.trackCenter(1.3, 3.4, 5);
  F.camAction(1.0, 3.2, { dist: 12, h: 3.8, lookH: 2.4 });
  F.at(3.2, () => { win.animator.play('castRaise'); w.audio?.play('cast'); });
  F.at(3.6, () => {
    // the REAL geyser sim: 0.4s boil under the wreck, then the column
    // erupts at 4.0 exactly as the body launches (fx-only — no owner,
    // so the world's scald tick leaves the cinematic alone)
    w.spawnGeyser(new GeyserFX(w.scene, w.effects, vic.pos.clone().setY(0), {
      height: 27, radius: 1.7, warn: 0.4, sustain: 1.3, boilRadius: 3,
    }));
    w.audio?.play('wave');
  });
  F.at(4.0, () => {
    F.beat('explosionBig', 1, 0.1);
    vic.animator.play('launched');
  });
  F.hold(4.0, 5.3, (k) => {
    vic.pos.y = Math.sin(Math.min(1, k) * Math.PI) * 14;
    vic.group.rotation.x = -k * 5.5;
  });
  F.camShot(3.9, 5.3, { dist: 11, h: 4.5, az0: 2.35, az1: 2.05, lookH: 5.5 });
  F.at(5.3, () => {
    vic.group.rotation.x = 0;
    F.vicDown();
    w.effects.dustPuff(vic.pos, 12);
    F.beat('bodyfall', 0.9, 0.07);
  });
  F.triumph(5.55, 'taunt', 'wave');
}
