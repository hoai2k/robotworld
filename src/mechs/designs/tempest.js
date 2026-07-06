// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 7. TEMPEST — storm dancer, sculpted rebuild. Navy athletic
//    build: bulged (but light) chest over a visible waist pinch,
//    tesla coil towers on both shoulders (stacked rings + glowing
//    tip orbs), conduit forearms wrapped in glowing rings, swept
//    crest-fin head with twin angled cyan eyes, calf thruster fins.
// ============================================================
export function tempest(A, D, J, anchors, def) {
  const s = D.scale;
  const W = D.torsoW;
  const chH = D.torsoH;
  const hs = D.headSize;
  const ua = D.upperArmLen, fa = D.foreArmLen;

  const plateMat = (decal) => {
    const tex = decalTexture({ seed: def.seed, ...def.skin.primary }, decal);
    return new THREE.MeshStandardMaterial({
      map: tex.map, normalMap: tex.normalMap,
      roughnessMap: tex.rmMap, metalnessMap: tex.rmMap,
      roughness: 1, metalness: 1,
    });
  };

  // ================= WAIST / PELVIS =================
  // dancer's waist: hard pinch + vertebra rings
  A.lathe('hips', 'frame', [[-0.1 * s, W * 0.25], [0.24 * s, W * 0.16], [0.55 * s, W * 0.22]], {
    scaleX: 1.25, seg: 18 });
  for (let i = 0; i < 2; i++) {
    A.tube('hips', 'dark', W * 0.175, W * 0.185, 0.06 * s, { p: [0, (0.1 + i * 0.17) * s, 0] });
  }
  A.facet('hips', 'primary', W * 0.28, W * 0.36, W * 0.25, 0.78 * s, {
    sides: 6, scaleZ: 0.78, p: [0, -0.4 * s, 0] });
  // front skirt carries the unit number decal
  A.custom('hips', plateMat({ text: '77', textY: 0.42, textScale: 0.3, color: '#d8f4ff', alpha: 0.85 }),
    beveledPlate(shieldOutline(W * 0.28, 0.68 * s, { taper: 0.58 }), 0.07 * s, { round: 0.12 }), {
      p: [0, -0.46 * s, W * 0.26], r: [0.15, 0, 0] });
  // side skirts: navy shield + cyan edge sliver
  for (const sx of [-1, 1]) {
    A.plate('hips', 'primary', shieldOutline(W * 0.28, 0.6 * s, { taper: 0.62 }), 0.06 * s, {
      p: [sx * W * 0.35, -0.44 * s, 0], r: [0.06, sx * Math.PI / 2, sx * 0.18], round: 0.12 });
    A.plate('hips', 'accent', shieldOutline(W * 0.12, 0.34 * s, { taper: 0.6 }), 0.03 * s, {
      p: [sx * W * 0.42, -0.52 * s, 0.02 * s], r: [0.06, sx * Math.PI / 2, sx * 0.18], round: 0.2 });
  }
  A.facet('hips', 'dark', W * 0.16, W * 0.2, W * 0.14, 0.4 * s, {
    sides: 6, scaleZ: 0.7, p: [0, -0.42 * s, -W * 0.2] });

  // ================= TORSO: athletic storm chassis =================
  A.lathe('torso', 'primary', [
    [chH * 0.08, W * 0.27],
    [chH * 0.4, W * 0.46],
    [chH * 0.72, W * 0.54],
    [chH * 0.96, W * 0.46],
    [chH * 1.08, W * 0.24],
  ], { scaleX: 1.3, scaleZ: 0.7, seg: 26 });
  // pec pontoons + intake slits
  for (const sx of [-1, 1]) {
    A.capsule('torso', 'primary', W * 0.14, W * 0.26, {
      p: [sx * W * 0.32, chH * 0.84, W * 0.26], r: [0.5, 0, sx * -1.15], s: [1, 1, 0.72] });
    A.vents('torso', 'dark', 3, W * 0.24, 0.08 * s, 0.04 * s, {
      p: [sx * W * 0.33, chH * 0.62, W * 0.34], r: [0.3, 0, 0] });
  }
  // storm core: glowing ring stack on the sternum
  A.tube('torso', 'glow', 0.11 * s, 0.11 * s, 0.09 * s, {
    p: [0, chH * 0.74, W * 0.34], r: [Math.PI / 2, 0, 0] });
  A.ring('torso', 'metal', 0.155 * s, 0.032 * s, { p: [0, chH * 0.74, W * 0.35] });
  A.ring('torso', 'brass', 0.21 * s, 0.024 * s, { p: [0, chH * 0.74, W * 0.32] });
  // lightning seams flaring off the core
  for (const sx of [-1, 1]) {
    A.sharpBox('torso', 'glowSoft', [0.026 * s, chH * 0.3, 0.026 * s], {
      p: [sx * W * 0.25, chH * 0.55, W * 0.3], r: [-0.05, 0, sx * 0.55] });
  }
  // chest nameplate under the core
  A.custom('torso', plateMat({
    text: 'TEMPEST', textY: 0.42, textScale: 0.12, emblem: true, emblemY: 0.68, emblemScale: 0.09,
    color: '#d8f4ff', alpha: 0.85,
  }), beveledPlate(shieldOutline(W * 0.38, chH * 0.34, { taper: 0.64 }), 0.07 * s, { round: 0.12 }), {
    p: [0, chH * 0.42, W * 0.31], r: [-0.1, 0, 0] });
  // abdomen rings + collar
  for (let i = 0; i < 2; i++) {
    A.tube('torso', 'dark', W * (0.18 - i * 0.02), W * (0.2 - i * 0.02), 0.08 * s, {
      p: [0, chH * (0.04 - i * 0.1), 0] });
  }
  A.tube('torso', 'frame', W * 0.13, W * 0.16, 0.14 * s, { p: [0, chH * 1.02, 0] });
  // back capacitor pack: chamfered housing + coolant drums + fin
  A.facet('torso', 'accent', W * 0.32, W * 0.38, W * 0.3, chH * 0.52, {
    sides: 8, scaleZ: 0.55, p: [0, chH * 0.52, -W * 0.34] });
  A.vents('torso', 'dark', 5, W * 0.44, chH * 0.2, 0.05 * s, {
    p: [0, chH * 0.48, -W * 0.56] });
  for (const sx of [-1, 1]) {
    A.capsule('torso', 'metal', 0.09 * s, 0.28 * s, {
      p: [sx * W * 0.22, chH * 0.84, -W * 0.34], r: [0, 0, Math.PI / 2] });
  }
  A.blade('torso', 'accent', 0.6 * s, 0.2 * s, 0.04 * s, {
    p: [0, chH * 0.96, -W * 0.44], r: [-0.7, 0, 0], taper: 0.15 });
  // brass waist pistons
  for (const sx of [-1, 1]) {
    A.piston('torso', 'brass', [sx * W * 0.14, chH * -0.02, -W * 0.07],
      [sx * W * 0.3, chH * 0.32, -W * 0.11], 0.035 * s);
  }

  // ================= HEAD: swept crest fin =================
  const hy = hs * 0.95;
  A.tube('head', 'frame', hs * 0.3, hs * 0.38, hs * 0.85, { p: [0, hy * 0.3, 0] });
  A.ring('head', 'brass', hs * 0.31, 0.028 * s, { p: [0, hy * 0.68, 0], r: [Math.PI / 2, 0, 0] });
  // dome skull
  A.lathe('head', 'primary', [
    [-hs * 0.46, hs * 0.56],
    [hs * 0.08, hs * 0.66],
    [hs * 0.52, hs * 0.5],
    [hs * 0.72, hs * 0.18],
  ], { p: [0, hy + hs * 0.45, 0.02 * s], scaleX: 0.9, scaleZ: 1.08, seg: 20 });
  // face shield + chin
  A.plate('head', 'frame', shieldOutline(hs * 0.85, hs * 0.75, { taper: 0.6 }), hs * 0.16, {
    p: [0, hy + hs * 0.3, hs * 0.5], r: [0.06, 0, 0], round: 0.15 });
  A.vents('head', 'dark', 3, hs * 0.4, hs * 0.12, 0.04 * s, {
    p: [0, hy + hs * 0.14, hs * 0.62] });
  // twin angled cyan eyes
  for (const sx of [-1, 1]) {
    A.sharpBox('head', 'glow', [hs * 0.32, hs * 0.1, 0.05 * s], {
      p: [sx * hs * 0.28, hy + hs * 0.56, hs * 0.6], r: [0.05, sx * 0.22, sx * -0.3] });
  }
  // brow ridge
  A.plate('head', 'primary', rhombOutline(hs * 1.0, hs * 0.34, { cut: 0.3 }), hs * 0.24, {
    p: [0, hy + hs * 0.76, hs * 0.28], r: [-0.3, 0, 0], round: 0.2 });
  // swept crest: tall center fin + cyan trace + side fins
  A.blade('head', 'accent', hs * 2.2, hs * 0.5, 0.05 * s, {
    p: [0, hy + hs * 0.95, -hs * 0.42], r: [-2.35, 0, 0], taper: 0.14 });
  A.blade('head', 'glowSoft', hs * 1.4, hs * 0.13, 0.032 * s, {
    p: [0, hy + hs * 1.04, -hs * 0.5], r: [-2.35, 0, 0], taper: 0.14 });
  for (const sx of [-1, 1]) {
    A.blade('head', 'primary', hs * 1.3, hs * 0.3, 0.04 * s, {
      p: [sx * hs * 0.44, hy + hs * 0.72, -hs * 0.32], r: [-2.15, 0, sx * 0.42], taper: 0.18 });
  }

  // ================= ARMS: coil towers + conduit forearms =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const sh = 'shoulder' + side, el = 'elbow' + side, ha = 'hand' + side;
    J[sh].position.x = sx * (D.shoulderW + 0.16 * s);

    A.ball(sh, 'frame', 0.2 * s, {});
    // pauldron shell the tower rises from
    A.lathe(sh, 'primary', [
      [-0.18 * s, 0.34 * s],
      [0.1 * s, 0.3 * s],
      [0.3 * s, 0.15 * s],
    ], { p: [sx * 0.06 * s, 0.02 * s, 0], scaleZ: 0.9, seg: 18 });
    A.plate(sh, 'accent', rhombOutline(0.32 * s, 0.26 * s, { cut: 0.3 }), 0.045 * s, {
      p: [sx * 0.3 * s, 0.05 * s, 0], r: [0, sx * Math.PI / 2, 0], round: 0.15 });

    // ===== tesla coil tower =====
    const cx = sx * 0.1 * s;
    A.facet(sh, 'metal', 0.15 * s, 0.17 * s, 0.12 * s, 0.16 * s, {
      sides: 8, p: [cx, 0.32 * s, 0] });
    A.tube(sh, 'metal', 0.042 * s, 0.052 * s, 0.6 * s, { p: [cx, 0.64 * s, 0] });
    for (let i = 0; i < 4; i++) {
      A.ring(sh, 'brass', (0.16 - i * 0.026) * s, 0.026 * s, {
        p: [cx, (0.44 + i * 0.135) * s, 0], r: [Math.PI / 2, 0, 0] });
    }
    A.ring(sh, 'metal', 0.08 * s, 0.018 * s, { p: [cx, 0.92 * s, 0], r: [Math.PI / 2, 0, 0] });
    // glowing tip orb
    A.ball(sh, 'glow', 0.115 * s, { p: [cx, 1.02 * s, 0] });

    // slim upper arm
    A.lathe(sh, 'frame', [
      [-ua * 0.98, 0.115 * s],
      [-ua * 0.52, 0.17 * s],
      [-ua * 0.1, 0.14 * s],
    ], { seg: 12 });
    A.part(el, 'metal', cyl(0.125 * s, 0.125 * s, 0.27 * s, 10), { r: [0, 0, Math.PI / 2] });
    // conduit forearm: accent swell wrapped in glowing rings
    A.lathe(el, 'accent', [
      [-fa * 0.95, 0.13 * s],
      [-fa * 0.55, 0.195 * s],
      [-fa * 0.15, 0.155 * s],
    ], { seg: 16, scaleZ: 1.05 });
    for (let i = 0; i < 3; i++) {
      A.ring(el, 'glowSoft', (0.2 - i * 0.012) * s, 0.024 * s, {
        p: [0, -fa * (0.34 + i * 0.21), 0], r: [Math.PI / 2, 0, 0] });
    }
    A.piston(el, 'brass', [sx * 0.11 * s, -0.06 * s, -0.12 * s],
      [sx * 0.13 * s, -fa * 0.5, -0.16 * s], 0.03 * s);
    // hand: faceted knuckle block + emitter bar
    A.facet(ha, 'frame', 0.13 * s, 0.16 * s, 0.11 * s, 0.32 * s, { sides: 6, p: [0, -0.09 * s, 0] });
    A.sharpBox(ha, 'glowSoft', [0.18 * s, 0.045 * s, 0.045 * s], { p: [0, -0.2 * s, 0.1 * s] });
    for (let i = -1; i <= 1; i++) {
      A.sharpBox(ha, 'dark', [0.05 * s, 0.14 * s, 0.09 * s], {
        p: [i * 0.075 * s, -0.3 * s, 0.06 * s], r: [0.2, 0, 0] });
    }
  }

  // ================= LEGS: plantigrade dancer =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const th = 'thigh' + side, kn = 'knee' + side, an = 'ankle' + side;
    const tl = D.thighLen, sl = D.shinLen;

    A.ball(th, 'frame', 0.21 * s, {});
    // bulged thigh
    A.lathe(th, 'primary', [
      [-tl * 1.0, 0.16 * s],
      [-tl * 0.55, 0.25 * s],
      [-tl * 0.1, 0.2 * s],
    ], { scaleZ: 1.12, seg: 18 });
    A.plate(th, 'accent', rhombOutline(0.3 * s, tl * 0.52, { cut: 0.28 }), 0.05 * s, {
      p: [sx * 0.24 * s, -tl * 0.48, 0.02 * s], r: [0, sx * Math.PI / 2, 0], round: 0.15 });

    // knee ball + shield + piston
    A.ball(kn, 'metal', 0.14 * s, {});
    A.plate(kn, 'accent', shieldOutline(0.3 * s, 0.42 * s, { taper: 0.62 }), 0.07 * s, {
      p: [0, -0.02 * s, 0.18 * s], r: [0.15, 0, 0], round: 0.14 });
    A.piston(kn, 'brass', [0, 0.1 * s, -0.16 * s], [0, -sl * 0.4, -0.2 * s], 0.032 * s);

    // calf swell + front shin guard + cyan shin trace
    A.lathe(kn, 'primary', [
      [-sl * 1.0, 0.13 * s],
      [-sl * 0.66, 0.21 * s],
      [-sl * 0.3, 0.24 * s],
      [-sl * 0.05, 0.16 * s],
    ], { scaleZ: 1.15, seg: 18 });
    A.plate(kn, 'primary', shieldOutline(0.28 * s, sl * 0.5, { taper: 0.72 }), 0.06 * s, {
      p: [0, -sl * 0.55, 0.2 * s], r: [0.02, 0, 0], round: 0.14 });
    A.sharpBox(kn, 'glowSoft', [0.024 * s, sl * 0.34, 0.024 * s], {
      p: [0, -sl * 0.55, 0.27 * s] });
    // calf thruster fins + nozzle
    for (const off of [-1, 1]) {
      A.blade(kn, 'accent', 0.75 * s, 0.2 * s, 0.04 * s, {
        p: [off * 0.1 * s, -sl * 0.42, -0.22 * s], r: [Math.PI - 0.35, 0, off * 0.55], taper: 0.18 });
    }
    A.tube(kn, 'metal', 0.075 * s, 0.055 * s, 0.2 * s, {
      p: [0, -sl * 0.62, -0.24 * s], r: [Math.PI / 2 - 0.35, 0, 0] });
    A.ring(kn, 'glowSoft', 0.05 * s, 0.016 * s, {
      p: [0, -sl * 0.655, -0.33 * s], r: [-0.35, 0, 0] });

    // foot: rounded toe + faceted heel over a dark sole
    A.ball(an, 'frame', 0.14 * s, {});
    A.part(an, 'primary', roundedBox(0.3 * s, 0.22 * s, 0.56 * s, 0.06 * s), {
      p: [0, -0.18 * s, 0.18 * s], r: [-0.06, 0, 0] });
    A.plate(an, 'accent', shieldOutline(0.24 * s, 0.28 * s, { taper: 0.7 }), 0.05 * s, {
      p: [0, -0.08 * s, 0.4 * s], r: [0.55, 0, 0], round: 0.2 });
    A.facet(an, 'frame', 0.13 * s, 0.16 * s, 0.11 * s, 0.26 * s, {
      sides: 6, p: [0, -0.16 * s, -0.16 * s], r: [Math.PI / 2.2, 0, 0] });
    A.sharpBox(an, 'dark', [0.3 * s, 0.08 * s, 0.72 * s], { p: [0, -0.27 * s, 0.08 * s] });
  }

  anchors.muzzleR = addAnchor(J.handR, 0, -0.2 * s, 0.4 * s);
  anchors.coilL = addAnchor(J.shoulderL, -0.1 * s, 1.02 * s, 0);
  anchors.coilR = addAnchor(J.shoulderR, 0.1 * s, 1.02 * s, 0);
}
