// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 10. WRAITH — stealth sniper, sculpted rebuild. Gaunt matte-black
//     frame veined with red power seams, an open hooded cowl
//     (partial lathe shell) around a recessed skull with one
//     deep-set red eye, tattered cloak fins off the back, and a
//     very long twin-rail anti-materiel railgun in the right hand.
// ============================================================
export function wraith(A, D, J, anchors, def) {
  const s = D.scale;
  const W = D.torsoW;
  const chH = D.torsoH;
  const hs = D.headSize;
  const ua = D.upperArmLen, fa = D.foreArmLen;

  const plateMat = (decal) => {
    const tex = decalTexture({ seed: def.seed + 5, ...def.skin.accent }, decal);
    return new THREE.MeshStandardMaterial({
      map: tex.map, normalMap: tex.normalMap,
      roughnessMap: tex.rmMap, metalnessMap: tex.rmMap,
      roughness: 1, metalness: 1,
    });
  };

  // ================= WAIST / PELVIS: skeletal =================
  A.lathe('hips', 'frame', [[-0.12 * s, W * 0.23], [0.22 * s, W * 0.15], [0.55 * s, W * 0.21]], {
    scaleX: 1.15, seg: 16 });
  for (let i = 0; i < 3; i++) {
    A.tube('hips', 'dark', W * (0.165 - i * 0.008), W * (0.175 - i * 0.008), 0.05 * s, {
      p: [0, (0.06 + i * 0.15) * s, 0] });
  }
  A.facet('hips', 'primary', W * 0.25, W * 0.32, W * 0.22, 0.7 * s, {
    sides: 6, scaleZ: 0.75, p: [0, -0.38 * s, 0] });
  // ragged skirt plates, front seam glows faintly
  A.plate('hips', 'accent', shieldOutline(W * 0.28, 0.75 * s, { taper: 0.5 }), 0.06 * s, {
    p: [0, -0.5 * s, W * 0.24], r: [0.16, 0, 0], round: 0.12 });
  A.sharpBox('hips', 'glowSoft', [0.022 * s, 0.3 * s, 0.022 * s], {
    p: [0, -0.56 * s, W * 0.28], r: [0.16, 0, 0] });
  for (const sx of [-1, 1]) {
    A.plate('hips', 'primary', rhombOutline(0.32 * s, 0.66 * s, { cut: 0.32 }), 0.05 * s, {
      p: [sx * W * 0.33, -0.42 * s, 0], r: [0.05, sx * Math.PI / 2, sx * 0.24], round: 0.15 });
  }
  A.facet('hips', 'dark', W * 0.15, W * 0.19, W * 0.13, 0.38 * s, {
    sides: 6, scaleZ: 0.7, p: [0, -0.44 * s, -W * 0.2] });

  // ================= TORSO: gaunt chest, red seams =================
  A.lathe('torso', 'primary', [
    [chH * 0.06, W * 0.24],
    [chH * 0.38, W * 0.4],
    [chH * 0.7, W * 0.48],
    [chH * 0.95, W * 0.42],
    [chH * 1.08, W * 0.18],
  ], { scaleX: 1.15, scaleZ: 0.62, seg: 22 });
  // exposed rib rings under the chest
  for (let i = 0; i < 3; i++) {
    A.tube('torso', 'dark', W * (0.17 - i * 0.015), W * (0.185 - i * 0.015), 0.055 * s, {
      p: [0, chH * (0.1 - i * 0.09), 0] });
  }
  // red power seams: sternum line + collar bones
  A.sharpBox('torso', 'glow', [0.026 * s, chH * 0.46, 0.026 * s], {
    p: [0, chH * 0.62, W * 0.28], r: [-0.06, 0, 0] });
  for (const sx of [-1, 1]) {
    A.sharpBox('torso', 'glowSoft', [0.02 * s, chH * 0.22, 0.02 * s], {
      p: [sx * W * 0.22, chH * 0.68, W * 0.245], r: [-0.05, 0, sx * 0.32] });
    // rib vents raked along the flanks
    A.vents('torso', 'dark', 3, W * 0.3, 0.07 * s, 0.04 * s, {
      p: [sx * W * 0.4, chH * 0.55, 0], r: [0, sx * (Math.PI / 2 - 0.25), sx * 0.5] });
  }
  // collar ring
  A.tube('torso', 'frame', W * 0.12, W * 0.15, 0.13 * s, { p: [0, chH * 1.04, 0] });
  // cloak yoke across the upper back
  A.plate('torso', 'frame', rhombOutline(W * 0.9, chH * 0.24, { cut: 0.25 }), 0.08 * s, {
    p: [0, chH * 0.92, -W * 0.3], r: [0.25, 0, 0], round: 0.15 });
  // tattered cloak fins: long dark outer layer + short accent underlayer
  for (let i = 0; i < 5; i++) {
    const fx = (i - 2) / 2; // -1..1
    A.blade('torso', 'dark', (1.75 - Math.abs(fx) * 0.45 - (i % 2) * 0.12) * s, 0.36 * s, 0.035 * s, {
      p: [fx * W * 0.36, chH * 0.6, -W * (0.4 + Math.abs(fx) * 0.04)],
      r: [Math.PI + 0.14 + Math.abs(fx) * 0.1, 0, fx * 0.32], taper: 0.45 });
  }
  for (let i = 0; i < 4; i++) {
    const fx = (i - 1.5) / 1.5;
    A.blade('torso', 'accent', (1.1 - Math.abs(fx) * 0.25) * s, 0.3 * s, 0.03 * s, {
      p: [fx * W * 0.26, chH * 0.68, -W * 0.34],
      r: [Math.PI + 0.1 + Math.abs(fx) * 0.08, 0, fx * 0.24], taper: 0.5 });
  }
  // brass spine pistons
  for (const sx of [-1, 1]) {
    A.piston('torso', 'brass', [sx * W * 0.12, chH * 0.0, -W * 0.06],
      [sx * W * 0.26, chH * 0.32, -W * 0.1], 0.03 * s);
  }

  // ================= HEAD: hooded cowl, one red eye =================
  const hy = hs * 0.9;
  A.tube('head', 'frame', hs * 0.26, hs * 0.34, hs * 0.8, { p: [0, hy * 0.3, 0] });
  // recessed skull: dark dome, deep-set glowing eye + socket ring
  A.ball('head', 'dark', hs * 0.5, { p: [0, hy + hs * 0.42, hs * 0.02], seg: 16 });
  A.ball('head', 'glow', hs * 0.13, { p: [0, hy + hs * 0.46, hs * 0.42], seg: 10 });
  A.ring('head', 'metal', hs * 0.17, hs * 0.035, { p: [0, hy + hs * 0.46, hs * 0.44] });
  // chin guard under the skull
  A.taper('head', 'dark', [hs * 0.34, hs * 0.3, hs * 0.4], 0.55, 0.5, {
    p: [0, hy + hs * 0.06, hs * 0.3], r: [0.2, 0, 0] });
  // hood: open lathe shell (outer + mirrored inner lining), gap facing forward
  const hoodProfile = [
    [-hs * 0.5, hs * 0.7],
    [hs * 0.08, hs * 0.78],
    [hs * 0.55, hs * 0.6],
    [hs * 0.82, hs * 0.14],
  ].map(([y, r]) => new THREE.Vector2(r, y));
  const hoodPts = new THREE.SplineCurve(hoodProfile).getPoints(18)
    .map((p) => new THREE.Vector2(Math.max(0.001, p.x), p.y));
  const hoodOuter = new THREE.LatheGeometry(hoodPts, 24, 0.95, Math.PI * 2 - 1.9);
  hoodOuter.scale(0.95, 1, 1.1);
  hoodOuter.computeVertexNormals();
  const hoodInner = hoodOuter.clone();
  hoodInner.scale(-0.93, 0.95, 0.93); // mirrored + shrunk: visible lining
  hoodInner.computeVertexNormals();
  A.part('head', 'primary', hoodOuter, { p: [0, hy + hs * 0.42, -hs * 0.06] });
  A.part('head', 'primary', hoodInner, { p: [0, hy + hs * 0.42, -hs * 0.06] });
  // hood peak brim jutting over the eye
  A.plate('head', 'primary', rhombOutline(hs * 0.9, hs * 0.6, { cut: 0.35 }), hs * 0.1, {
    p: [0, hy + hs * 0.88, hs * 0.4], r: [-Math.PI / 2 + 0.5, 0, 0], round: 0.2 });
  // hood side drapes falling toward the shoulders
  for (const sx of [-1, 1]) {
    A.blade('head', 'primary', hs * 0.9, hs * 0.5, 0.04 * s, {
      p: [sx * hs * 0.66, hy + hs * 0.1, -hs * 0.1],
      r: [Math.PI + 0.1, 0, sx * 0.25], taper: 0.5 });
  }
  // trailing hood point
  A.spike('head', 'primary', hs * 0.16, hs * 0.7, {
    p: [0, hy + hs * 0.7, -hs * 0.75], r: [-2.2, 0, 0], seg: 6 });

  // ================= ARMS: wiry, matte =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const sh = 'shoulder' + side, el = 'elbow' + side, ha = 'hand' + side;

    A.ball(sh, 'frame', 0.18 * s, {});
    // low-profile shoulder cap (no bulky pauldron — a sniper's slip-frame)
    A.lathe(sh, 'primary', [
      [-0.12 * s, 0.26 * s],
      [0.08 * s, 0.22 * s],
      [0.26 * s, 0.05 * s],
    ], { p: [sx * 0.06 * s, 0.05 * s, 0], scaleZ: 0.85, seg: 16 });
    A.plate(sh, 'accent', rhombOutline(0.3 * s, 0.24 * s, { cut: 0.3 }), 0.04 * s, {
      p: [sx * 0.24 * s, 0.04 * s, 0], r: [0, sx * Math.PI / 2, 0], round: 0.15 });
    // wiry upper arm
    A.lathe(sh, 'frame', [
      [-ua * 0.98, 0.1 * s],
      [-ua * 0.52, 0.145 * s],
      [-ua * 0.1, 0.12 * s],
    ], { seg: 12 });
    A.part(el, 'metal', cyl(0.105 * s, 0.105 * s, 0.24 * s, 10), { r: [0, 0, Math.PI / 2] });
    // slim forearm housing + red seam
    A.facet(el, 'primary', 0.13 * s, 0.18 * s, 0.14 * s, fa * 0.92, {
      sides: 6, scaleZ: 1.12, p: [0, -fa * 0.5, 0] });
    A.sharpBox(el, 'glowSoft', [0.02 * s, fa * 0.4, 0.02 * s], {
      p: [sx * 0.16 * s, -fa * 0.5, 0.04 * s] });
    A.piston(el, 'brass', [sx * -0.08 * s, -0.06 * s, -0.11 * s],
      [sx * -0.1 * s, -fa * 0.55, -0.15 * s], 0.026 * s);
    // slender hand
    A.facet(ha, 'frame', 0.1 * s, 0.13 * s, 0.09 * s, 0.28 * s, { sides: 6, p: [0, -0.07 * s, 0] });
    for (let i = -1; i <= 1; i++) {
      A.spike(ha, 'dark', 0.028 * s, 0.18 * s, {
        p: [i * 0.07 * s, -0.22 * s, 0.04 * s], r: [Math.PI - 0.2, 0, i * 0.08], seg: 5 });
    }
  }

  // ================= RAILGUN: twin-rail anti-materiel =================
  addJoint(J, 'rifle', 'handR', 0, -0.18 * s, 0.15 * s);
  // shoulder stock: beveled end plate + slim frame spar
  A.plate('rifle', 'primary', rhombOutline(0.3 * s, 0.44 * s, { cut: 0.3 }), 0.07 * s, {
    p: [0, -0.02 * s, -0.66 * s], round: 0.15 });
  A.facet('rifle', 'frame', 0.07 * s, 0.1 * s, 0.08 * s, 0.6 * s, {
    sides: 6, scaleZ: 1.5, p: [0, -0.02 * s, -0.36 * s], r: [Math.PI / 2, 0, 0] });
  // receiver: elongated octagonal housing (taller than wide)
  A.facet('rifle', 'primary', 0.14 * s, 0.185 * s, 0.15 * s, 1.5 * s, {
    sides: 8, scaleX: 0.78, scaleZ: 1.3, p: [0, 0.02 * s, 0.55 * s], r: [Math.PI / 2, 0, 0] });
  // charge cell + grip under the receiver
  A.facet('rifle', 'dark', 0.07 * s, 0.1 * s, 0.08 * s, 0.3 * s, {
    sides: 6, p: [0, -0.24 * s, 0.5 * s] });
  A.ring('rifle', 'glowSoft', 0.075 * s, 0.018 * s, {
    p: [0, -0.32 * s, 0.5 * s], r: [Math.PI / 2, 0, 0] });
  A.taper('rifle', 'dark', [0.08 * s, 0.26 * s, 0.12 * s], 0.7, 0.8, {
    p: [0, -0.18 * s, -0.02 * s], r: [0.45, 0, 0] });
  // receiver decal — scrapped-unit stencil
  A.custom('rifle', plateMat({ text: 'WR-110', textY: 0.55, textScale: 0.22, color: '#8a9099', alpha: 0.55 }),
    beveledPlate(rhombOutline(0.9 * s, 0.22 * s, { cut: 0.25 }), 0.03 * s, { round: 0.15 }), {
      p: [0.17 * s, 0.05 * s, 0.55 * s], r: [0, Math.PI / 2, 0] });
  // scope: long tube, red rear lens
  A.tube('rifle', 'frame', 0.065 * s, 0.065 * s, 0.68 * s, {
    p: [0, 0.32 * s, 0.45 * s], r: [Math.PI / 2, 0, 0] });
  A.ring('rifle', 'dark', 0.068 * s, 0.02 * s, { p: [0, 0.32 * s, 0.78 * s] });
  A.ring('rifle', 'dark', 0.068 * s, 0.02 * s, { p: [0, 0.32 * s, 0.14 * s] });
  A.ball('rifle', 'glow', 0.042 * s, { p: [0, 0.32 * s, 0.1 * s], seg: 8 });
  A.sharpBox('rifle', 'dark', [0.035 * s, 0.12 * s, 0.07 * s], { p: [0, 0.22 * s, 0.3 * s] });
  A.sharpBox('rifle', 'dark', [0.035 * s, 0.12 * s, 0.07 * s], { p: [0, 0.22 * s, 0.66 * s] });
  // barrel shroud where the rails leave the receiver
  A.tube('rifle', 'frame', 0.085 * s, 0.105 * s, 0.5 * s, {
    p: [0, 0.05 * s, 1.4 * s], r: [Math.PI / 2, 0, 0] });
  // twin rails + red charge seam between them
  for (const rx of [-1, 1]) {
    A.tube('rifle', 'dark', 0.042 * s, 0.042 * s, 2.5 * s, {
      p: [rx * 0.055 * s, 0.05 * s, 2.35 * s], r: [Math.PI / 2, 0, 0], seg: 8 });
  }
  A.sharpBox('rifle', 'glow', [0.024 * s, 0.024 * s, 2.4 * s], { p: [0, 0.05 * s, 2.3 * s] });
  // rail spacer rings
  for (const rz of [1.75, 2.35, 2.95]) {
    A.ring('rifle', 'dark', 0.075 * s, 0.02 * s, { p: [0, 0.05 * s, rz * s] });
  }
  // muzzle brake + glow choke
  A.facet('rifle', 'dark', 0.05 * s, 0.085 * s, 0.04 * s, 0.42 * s, {
    sides: 6, p: [0, 0.05 * s, 3.72 * s], r: [Math.PI / 2, 0, 0] });
  A.ring('rifle', 'glow', 0.07 * s, 0.016 * s, { p: [0, 0.05 * s, 3.58 * s] });
  // folded bipod blades under the shroud
  for (const rx of [-1, 1]) {
    A.blade('rifle', 'dark', 0.5 * s, 0.05 * s, 0.02 * s, {
      p: [rx * 0.05 * s, -0.1 * s, 1.55 * s], r: [Math.PI / 2 - 0.25, 0, rx * 0.18], taper: 0.3 });
  }

  // ================= LEGS: gaunt digitigrade =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const th = 'thigh' + side, kn = 'knee' + side, an = 'ankle' + side;
    const tl = D.thighLen, sl = D.shinLen;

    A.ball(th, 'frame', 0.18 * s, {});
    // lean thigh bulge (rest pose angles it forward)
    A.lathe(th, 'primary', [
      [-tl * 1.0, 0.13 * s],
      [-tl * 0.6, 0.21 * s],
      [-tl * 0.15, 0.17 * s],
    ], { scaleZ: 1.25, seg: 16, p: [0, 0, 0.03 * s] });
    A.plate(th, 'accent', rhombOutline(0.26 * s, tl * 0.52, { cut: 0.3 }), 0.045 * s, {
      p: [sx * 0.2 * s, -tl * 0.45, 0.03 * s], r: [0, sx * Math.PI / 2, 0], round: 0.15 });
    A.piston(th, 'brass', [0, -tl * 0.18, -0.14 * s], [0, -tl * 0.85, -0.17 * s], 0.028 * s);

    A.ball(kn, 'metal', 0.115 * s, {});
    A.plate(kn, 'accent', shieldOutline(0.22 * s, 0.32 * s, { taper: 0.6 }), 0.05 * s, {
      p: [0, -0.03 * s, 0.14 * s], r: [0.2, 0, 0], round: 0.15 });
    // wiry calf + red stabilizer seam
    A.lathe(kn, 'primary', [
      [-sl * 1.0, 0.08 * s],
      [-sl * 0.68, 0.135 * s],
      [-sl * 0.34, 0.16 * s],
      [-sl * 0.06, 0.11 * s],
    ], { scaleZ: 1.2, seg: 14 });
    A.sharpBox(kn, 'glowSoft', [0.02 * s, sl * 0.42, 0.02 * s], {
      p: [sx * 0.13 * s, -sl * 0.55, 0.03 * s] });
    A.blade(kn, 'dark', 0.6 * s, 0.14 * s, 0.03 * s, {
      p: [0, -sl * 0.48, -0.15 * s], r: [Math.PI - 0.3, 0, 0], taper: 0.15 });

    // gaunt clawed foot
    A.ball(an, 'frame', 0.11 * s, {});
    A.taper(an, 'frame', [0.22 * s, 0.24 * s, 0.4 * s], 0.7, 0.5, { p: [0, -0.2 * s, 0.07 * s] });
    for (let i = -1; i <= 1; i++) {
      A.spike(an, 'dark', 0.05 * s, 0.48 * s, {
        p: [i * 0.09 * s, -0.2 * s, 0.28 * s], r: [2.0, 0, i * 0.24], seg: 6 });
    }
    A.spike(an, 'dark', 0.04 * s, 0.3 * s, {
      p: [0, -0.16 * s, -0.15 * s], r: [-2.1, 0, 0], seg: 6 });
  }

  anchors.muzzleR = addAnchor(J.rifle, 0, 0.05 * s, 3.9 * s);
  anchors.scope = addAnchor(J.rifle, 0, 0.32 * s, 0.45 * s);
}
