// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 6. RHINO — sculpted rebuild: the charging bull. Hunched forward
//    barrel chest (pitched lathe), giant chrome horn on a bull head
//    slung low between flat beveled ram-slab shoulders, red glowing
//    eyes under a heavy brow, metal spine ridge climbing the hunch,
//    over-shoulder cannon, split-hoof feet.
// ============================================================
export function rhino(A, D, J, anchors, def) {
  const s = D.scale;
  const W = D.torsoW;   // ~1.98
  const chH = D.torsoH;
  const hs = D.headSize;
  const lean = 0.17;    // forward hunch of the chest mass

  const plateMat = (skin, decal) => {
    const tex = decalTexture({ seed: def.seed + (skin === 'accent' ? 5 : 0), ...def.skin[skin] }, decal);
    return new THREE.MeshStandardMaterial({
      map: tex.map, normalMap: tex.normalMap,
      roughnessMap: tex.rmMap, metalnessMap: tex.rmMap,
      roughness: 1, metalness: 1,
    });
  };

  // ================= WAIST / PELVIS =================
  A.lathe('hips', 'frame', [[0.6 * s, W * 0.28], [0.28 * s, W * 0.21], [-0.05 * s, W * 0.27]], {
    scaleX: 1.28 });
  for (let i = 0; i < 2; i++) {
    A.tube('hips', 'dark', W * (0.23 - i * 0.012), W * (0.24 - i * 0.012), 0.08 * s, {
      p: [0, 0.16 * s + i * 0.18 * s, 0] });
  }
  A.facet('hips', 'primary', W * 0.35, W * 0.44, W * 0.3, 0.9 * s, {
    sides: 6, scaleZ: 0.78, p: [0, -0.42 * s, 0] });
  A.plate('hips', 'accent', shieldOutline(W * 0.42, 0.85 * s, { taper: 0.62 }), 0.1 * s, {
    p: [0, -0.56 * s, W * 0.34], r: [0.14, 0, 0] });
  for (const sx of [-1, 1]) {
    A.plate('hips', 'primary', shieldOutline(W * 0.34, 0.75 * s, { taper: 0.68 }), 0.08 * s, {
      p: [sx * W * 0.44, -0.5 * s, 0], r: [0.08, sx * Math.PI / 2, sx * 0.12] });
  }
  A.sharpBox('hips', 'dark', [W * 0.32, 0.32 * s, W * 0.2], { p: [0, -0.55 * s, -W * 0.24] });

  // ================= TORSO: hunched barrel chest =================
  A.lathe('torso', 'primary', [
    [chH * 0.06, W * 0.3],
    [chH * 0.34, W * 0.52],
    [chH * 0.62, W * 0.6],
    [chH * 0.9, W * 0.52],
    [chH * 1.08, W * 0.26],
  ], { p: [0, 0, 0.04 * s], r: [lean, 0, 0], scaleX: 1.38, scaleZ: 0.88, seg: 28 });
  // chest prow plate with unit name
  A.custom('torso', plateMat('accent', {
    text: 'RHINO', textY: 0.32, textScale: 0.17, color: '#d8d2c8',
  }), beveledPlate(shieldOutline(W * 0.5, chH * 0.48, { taper: 0.66 }), 0.11 * s, { round: 0.1 }), {
    p: [0, chH * 0.38, W * 0.6], r: [lean - 0.03, 0, 0] });
  // pec ridges + intake slits
  for (const sx of [-1, 1]) {
    A.capsule('torso', 'primary', W * 0.15, W * 0.3, {
      p: [sx * W * 0.34, chH * 0.78, W * 0.52], r: [0.55, 0, sx * -1.1], s: [1, 1, 0.75] });
    A.vents('torso', 'dark', 3, W * 0.24, 0.09 * s, 0.05 * s, {
      p: [sx * W * 0.38, chH * 0.56, W * 0.58], r: [lean, 0, 0] });
  }
  // metal spine ridge climbing the hunch
  for (let i = 0; i < 5; i++) {
    const y = chH * (0.26 + i * 0.17);
    const zb = -W * 0.46 + Math.sin(lean) * y;
    A.blade('torso', 'metal', 0.5 * s - i * 0.04 * s, 0.34 * s - i * 0.03 * s, 0.08 * s, {
      p: [0, y, zb - 0.04 * s], r: [-0.62 - i * 0.06, 0, 0], taper: 0.3 });
  }
  // collar guard behind the low head
  A.tube('torso', 'frame', W * 0.26, W * 0.3, 0.26 * s, { p: [0, chH * 0.98, 0.14 * s], r: [lean, 0, 0] });
  for (const sx of [-1, 1]) {
    A.piston('torso', 'brass', [sx * W * 0.18, chH * 0.02, W * 0.14],
      [sx * W * 0.38, chH * 0.3, W * 0.32], 0.05 * s);
  }
  // back haunch + radiators
  A.facet('torso', 'accent', W * 0.4, W * 0.46, W * 0.36, chH * 0.5, {
    sides: 8, scaleZ: 0.55, p: [0, chH * 0.38, -W * 0.38] });
  A.vents('torso', 'dark', 5, W * 0.55, chH * 0.2, 0.06 * s, { p: [0, chH * 0.36, -W * 0.58] });

  // ================= SHOULDER CANNON (right, torso-mounted) =================
  const cx = W * 0.54, cy = chH * 1.16, cz = -0.3 * s;
  A.facet('torso', 'frame', 0.26 * s, 0.33 * s, 0.28 * s, 1.05 * s, {
    sides: 8, p: [cx, cy, cz], r: [Math.PI / 2, 0, 0] });
  A.tube('torso', 'metal', 0.15 * s, 0.18 * s, 1.4 * s, {
    p: [cx, cy, cz + 1.1 * s], r: [Math.PI / 2, 0, 0] });
  A.tube('torso', 'dark', 0.19 * s, 0.19 * s, 0.24 * s, {
    p: [cx, cy, cz + 1.72 * s], r: [Math.PI / 2, 0, 0] });
  A.ring('torso', 'brass', 0.19 * s, 0.035 * s, { p: [cx, cy, cz + 0.62 * s] });
  A.plate('torso', 'accent', rhombOutline(0.55 * s, 0.5 * s, { cut: 0.3 }), 0.06 * s, {
    p: [cx + 0.28 * s, cy + 0.04 * s, cz - 0.05 * s], r: [0, Math.PI / 2, 0], round: 0.15 });
  anchors.muzzleR = addAnchor(J.torso, cx, cy, cz + 1.86 * s);

  // ================= HEAD: bull skull slung low & forward, THE HORN =================
  const hy = hs * 0.0;      // sits down between the ram shoulders...
  const zf = hs * 1.05;     // ...and thrust forward out of the hunched chest
  A.tube('head', 'frame', hs * 0.4, hs * 0.48, hs * 0.6, {
    p: [0, hy + hs * 0.05, zf - hs * 0.7], r: [0.5, 0, 0] });
  // broad skull dome, elongated front-to-back
  A.lathe('head', 'primary', [
    [-hs * 0.45, hs * 0.8],
    [hs * 0.05, hs * 0.92],
    [hs * 0.5, hs * 0.66],
    [hs * 0.7, hs * 0.2],
  ], { p: [0, hy + hs * 0.35, zf + hs * 0.05], scaleZ: 1.3, seg: 20 });
  // chamfered snout pushed forward, slightly drooped
  A.facet('head', 'primary', hs * 0.6, hs * 0.72, hs * 0.48, hs * 1.3, {
    sides: 8, scaleX: 1.25, p: [0, hy + hs * 0.05, zf + hs * 0.95], r: [Math.PI / 2 + 0.12, 0, 0] });
  A.vents('head', 'dark', 3, hs * 0.75, hs * 0.14, 0.05 * s, {
    p: [0, hy + hs * 0.0, zf + hs * 1.58], r: [0.12, 0, 0] });
  // heavy brow plate + red eyes tucked beneath
  A.plate('head', 'frame', rhombOutline(hs * 1.9, hs * 0.6, { cut: 0.3 }), hs * 0.45, {
    p: [0, hy + hs * 0.72, zf + hs * 0.55], r: [-0.35, 0, 0], round: 0.2 });
  for (const sx of [-1, 1]) {
    A.ball('head', 'glow', hs * 0.16, { p: [sx * hs * 0.6, hy + hs * 0.42, zf + hs * 1.0], seg: 10 });
  }
  // jaw guard
  A.plate('head', 'accent', shieldOutline(hs * 1.3, hs * 0.7, { taper: 0.7 }), hs * 0.3, {
    p: [0, hy - hs * 0.28, zf + hs * 0.8], r: [0.5, 0, 0], round: 0.18 });
  // THE HORN — giant chrome, rising off the snout, curved via two cones
  const hornA = Math.PI / 2.9;
  const hbY = hy + hs * 0.42, hbZ = zf + hs * 1.35;
  const hLen = 1.6 * s;
  const dY = Math.cos(hornA), dZ = Math.sin(hornA);
  A.spike('head', 'metal', 0.2 * s, hLen, {
    p: [0, hbY + dY * hLen * 0.42, hbZ + dZ * hLen * 0.42], r: [hornA, 0, 0], seg: 14 });
  A.ring('head', 'brass', 0.185 * s, 0.045 * s, {
    p: [0, hbY + dY * 0.14 * s, hbZ + dZ * 0.14 * s], r: [hornA - Math.PI / 2, 0, 0] });
  const tipA = hornA - 0.5, tLen = 0.75 * s;
  const tY = hbY + dY * hLen * 0.88, tZ = hbZ + dZ * hLen * 0.88;
  A.spike('head', 'metal', 0.095 * s, tLen, {
    p: [0, tY + Math.cos(tipA) * tLen * 0.38, tZ + Math.sin(tipA) * tLen * 0.38],
    r: [tipA, 0, 0], seg: 12 });
  // stub horn behind, on the forehead
  A.spike('head', 'metal', 0.1 * s, 0.55 * s, {
    p: [0, hy + hs * 0.92, zf + hs * 0.45], r: [Math.PI / 3.4, 0, 0], seg: 10 });
  anchors.horn = addAnchor(J.head, 0, tY + Math.cos(tipA) * tLen * 0.85, tZ + Math.sin(tipA) * tLen * 0.85);

  // ================= ARMS: ram slabs, faceted forearms, studded fists =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const sh = 'shoulder' + side, el = 'elbow' + side, ha = 'hand' + side;
    J[sh].position.x = sx * (D.shoulderW + 0.32 * s);

    A.ball(sh, 'frame', 0.3 * s, {});
    // pauldron shell over the joint
    A.lathe(sh, 'primary', [
      [-0.28 * s, W * 0.3],
      [0.06 * s, W * 0.31],
      [0.34 * s, W * 0.18],
      [0.44 * s, W * 0.06],
    ], { p: [sx * 0.08 * s, 0.06 * s, -0.05 * s], seg: 20 });
    // flat ram slab on the front: thick beveled plate + accent layer + studs
    A.plate(sh, 'primary', rhombOutline(0.95 * s, 0.95 * s, { cut: 0.22 }), 0.14 * s, {
      p: [sx * 0.14 * s, 0.0, 0.42 * s], round: 0.1 });
    A.custom(sh, plateMat('accent', side === 'L'
      ? { text: '66', textY: 0.46, textScale: 0.3, color: '#d8d2c8', alpha: 0.85 }
      : { emblem: true, emblemY: 0.42, emblemScale: 0.24, color: '#d8d2c8' }),
    beveledPlate(rhombOutline(0.68 * s, 0.68 * s, { cut: 0.24 }), 0.06 * s, { round: 0.12 }), {
      p: [sx * 0.14 * s, 0.0, 0.53 * s] });
    for (const [ox, oy] of [[-0.3, 0], [0.3, 0], [0, 0.3], [0, -0.3]]) {
      A.ball(sh, 'metal', 0.06 * s, { p: [sx * 0.14 * s + ox * s, oy * s, 0.56 * s], seg: 8 });
    }
    // bulged upper arm
    A.lathe(sh, 'primary', [
      [-D.upperArmLen * 0.98, 0.22 * s],
      [-D.upperArmLen * 0.55, 0.28 * s],
      [-D.upperArmLen * 0.12, 0.23 * s],
    ], { p: [sx * 0.04 * s, 0, 0], seg: 16 });
    A.part(el, 'metal', new THREE.CylinderGeometry(0.18 * s, 0.18 * s, 0.4 * s, 12), {
      r: [0, 0, Math.PI / 2] });
    // faceted forearm housing + accent spine + piston
    A.facet(el, 'primary', 0.36 * s, 0.5 * s, 0.4 * s, D.foreArmLen * 1.02, {
      sides: 8, scaleZ: 1.05, p: [0, -D.foreArmLen * 0.52, 0] });
    A.plate(el, 'accent', rhombOutline(D.foreArmLen * 0.75, 0.46 * s, { cut: 0.28 }), 0.07 * s, {
      p: [0, -D.foreArmLen * 0.52, 0.46 * s], r: [0, 0, Math.PI / 2], round: 0.12 });
    A.piston(el, 'brass', [sx * 0.28 * s, -0.08 * s, -0.22 * s],
      [sx * 0.28 * s, -D.foreArmLen * 0.66, -0.28 * s], 0.045 * s);
    // chunky fist with steel knuckle studs
    const fw = 0.42 * s;
    A.tube(ha, 'frame', 0.3 * s, 0.34 * s, 0.26 * s, { p: [0, 0.06 * s, 0] });
    A.part(ha, 'frame', roundedBox(fw * 1.8, fw * 1.5, fw * 1.7, fw * 0.42), {
      p: [0, -fw * 0.8, fw * 0.1] });
    for (let i = 0; i < 4; i++) {
      A.spike(ha, 'metal', fw * 0.16, fw * 0.45, {
        p: [(i - 1.5) * fw * 0.42, -fw * 0.85, fw * 1.0], r: [Math.PI / 2, 0, 0], seg: 6 });
    }
    A.capsule(ha, 'dark', fw * 0.24, fw * 0.3, {
      p: [sx * fw * 0.92, -fw * 0.55, fw * 0.25], r: [0.5, 0, sx * 0.4] });
  }

  // ================= LEGS: barrel thighs, split-hoof feet =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const th = 'thigh' + side, kn = 'knee' + side, an = 'ankle' + side;

    A.ball(th, 'frame', 0.28 * s, {});
    A.lathe(th, 'primary', [
      [-D.thighLen * 1.0, 0.25 * s],
      [-D.thighLen * 0.55, 0.36 * s],
      [-D.thighLen * 0.08, 0.28 * s],
    ], { scaleZ: 1.1, seg: 20 });
    A.plate(th, 'accent', rhombOutline(0.44 * s, D.thighLen * 0.6, { cut: 0.26 }), 0.07 * s, {
      p: [sx * 0.34 * s, -D.thighLen * 0.5, 0.02 * s], r: [0, sx * Math.PI / 2, 0], round: 0.12 });

    A.ball(kn, 'metal', 0.2 * s, {});
    A.plate(kn, 'accent', shieldOutline(0.48 * s, 0.6 * s, { taper: 0.64 }), 0.1 * s, {
      p: [0, -0.02 * s, 0.32 * s], r: [0.15, 0, 0], round: 0.14 });
    A.piston(kn, 'brass', [0, 0.12 * s, -0.25 * s], [0, -D.shinLen * 0.4, -0.3 * s], 0.05 * s);

    A.lathe(kn, 'primary', [
      [-D.shinLen * 1.0, 0.25 * s],
      [-D.shinLen * 0.65, 0.36 * s],
      [-D.shinLen * 0.28, 0.4 * s],
      [-D.shinLen * 0.05, 0.27 * s],
    ], { scaleZ: 1.14, seg: 20 });
    A.plate(kn, 'primary', shieldOutline(0.48 * s, 0.62 * s, { taper: 0.74 }), 0.09 * s, {
      p: [0, -D.shinLen * 0.42, 0.35 * s], r: [0.04, 0, 0], round: 0.12 });
    A.plate(kn, 'primary', shieldOutline(0.52 * s, 0.6 * s, { taper: 0.72 }), 0.08 * s, {
      p: [0, -D.shinLen * 0.78, 0.33 * s], r: [-0.05, 0, 0], round: 0.12 });

    // split-hoof foot: two rounded toe wedges + hex heel + dark sole
    A.ball(an, 'frame', 0.18 * s, {});
    for (const tx of [-0.17, 0.17]) {
      A.part(an, 'dark', roundedBox(0.3 * s, 0.3 * s, 0.6 * s, 0.09 * s), {
        p: [tx * s, -0.12 * s, 0.32 * s], r: [-0.1, tx * 0.5, 0] });
    }
    A.facet(an, 'frame', 0.2 * s, 0.24 * s, 0.16 * s, 0.3 * s, {
      sides: 6, p: [0, -0.12 * s, -0.2 * s], r: [Math.PI / 2.4, 0, 0] });
    A.sharpBox(an, 'dark', [0.52 * s, 0.11 * s, 0.9 * s], { p: [0, -0.26 * s, 0.1 * s] });
  }

  anchors.core = addAnchor(J.torso, 0, chH * 0.5, W * 0.55);
}
