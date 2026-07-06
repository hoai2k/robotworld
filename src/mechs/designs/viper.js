// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 4. VIPER — twin-blade assassin, sculpted rebuild.
//    Slim serpentine masses: pinched lathe waist under a narrow
//    swept chest bulge, digitigrade raptor legs (bulged forward
//    thigh, slim calf, clawed toes), toxic-green cyclops visor in
//    a narrow fanged serpent skull with swept fins, and twin
//    energy blades sweeping forward off the forearms.
// ============================================================
export function viper(A, D, J, anchors, def) {
  const s = D.scale;
  const W = D.torsoW;
  const chH = D.torsoH;
  const hs = D.headSize;
  const ua = D.upperArmLen, fa = D.foreArmLen;

  const plateMat = (decal) => {
    const tex = decalTexture({ seed: def.seed + 5, ...def.skin.primary }, decal);
    return new THREE.MeshStandardMaterial({
      map: tex.map, normalMap: tex.normalMap,
      roughnessMap: tex.rmMap, metalnessMap: tex.rmMap,
      roughness: 1, metalness: 1,
    });
  };

  // ================= WAIST / PELVIS =================
  // serpentine waist column: hard pinch with exposed vertebra rings
  A.lathe('hips', 'frame', [[-0.12 * s, W * 0.24], [0.22 * s, W * 0.155], [0.55 * s, W * 0.22]], {
    scaleX: 1.2, seg: 18 });
  for (let i = 0; i < 3; i++) {
    A.tube('hips', 'dark', W * (0.17 - i * 0.008), W * (0.18 - i * 0.008), 0.055 * s, {
      p: [0, (0.08 + i * 0.15) * s, 0] });
  }
  // hip flare: slim chamfered hex block
  A.facet('hips', 'primary', W * 0.26, W * 0.34, W * 0.23, 0.72 * s, {
    sides: 6, scaleZ: 0.75, p: [0, -0.38 * s, 0] });
  // narrow front skirt fang + thin green trace
  A.plate('hips', 'accent', shieldOutline(W * 0.3, 0.78 * s, { taper: 0.5 }), 0.07 * s, {
    p: [0, -0.5 * s, W * 0.25], r: [0.16, 0, 0], round: 0.14 });
  A.sharpBox('hips', 'glowSoft', [0.026 * s, 0.34 * s, 0.024 * s], {
    p: [0, -0.58 * s, W * 0.3], r: [0.16, 0, 0] });
  // swept side skirt blades
  for (const sx of [-1, 1]) {
    A.plate('hips', 'primary', rhombOutline(0.34 * s, 0.7 * s, { cut: 0.3 }), 0.06 * s, {
      p: [sx * W * 0.34, -0.42 * s, 0], r: [0.05, sx * Math.PI / 2, sx * 0.2], round: 0.15 });
  }
  // rear vent block
  A.facet('hips', 'dark', W * 0.16, W * 0.2, W * 0.14, 0.4 * s, {
    sides: 6, scaleZ: 0.7, p: [0, -0.45 * s, -W * 0.2] });

  // ================= TORSO: slim serpentine chest =================
  A.lathe('torso', 'primary', [
    [chH * 0.08, W * 0.28],
    [chH * 0.4, W * 0.46],
    [chH * 0.72, W * 0.52],
    [chH * 0.96, W * 0.44],
    [chH * 1.1, W * 0.2],
  ], { scaleX: 1.18, scaleZ: 0.66, seg: 24 });
  // abdomen rings bridging chest to waist
  for (let i = 0; i < 2; i++) {
    A.tube('torso', 'dark', W * (0.17 - i * 0.02), W * (0.19 - i * 0.02), 0.075 * s, {
      p: [0, chH * (0.04 - i * 0.1), 0] });
  }
  // chest nameplate (decal skin) — narrow beveled shield
  A.custom('torso', plateMat({
    text: 'VIPER', textY: 0.4, textScale: 0.16, color: '#b9f0aa', alpha: 0.8,
  }), beveledPlate(shieldOutline(W * 0.4, chH * 0.44, { taper: 0.62 }), 0.08 * s, { round: 0.12 }), {
    p: [0, chH * 0.58, W * 0.31], r: [-0.1, 0, 0] });
  // toxic power seams tracing the pectoral line
  for (const sx of [-1, 1]) {
    A.sharpBox('torso', 'glowSoft', [0.028 * s, chH * 0.4, 0.03 * s], {
      p: [sx * W * 0.32, chH * 0.6, W * 0.26], r: [0.06, 0, sx * 0.38] });
  }
  // collar ring
  A.tube('torso', 'frame', W * 0.13, W * 0.16, 0.14 * s, { p: [0, chH * 1.03, 0] });
  // dorsal fin row down the spine (swept back)
  for (let i = 0; i < 3; i++) {
    A.blade('torso', 'accent', (0.58 - i * 0.09) * s, 0.2 * s, 0.04 * s, {
      p: [0, chH * (0.96 - i * 0.24), -W * (0.34 - i * 0.02)],
      r: [-0.85, 0, 0], taper: 0.12 });
  }
  A.blade('torso', 'glowSoft', 0.4 * s, 0.07 * s, 0.03 * s, {
    p: [0, chH * 1.0, -W * 0.37], r: [-0.85, 0, 0], taper: 0.12 });
  // compact back housing + vents
  A.facet('torso', 'accent', W * 0.28, W * 0.34, W * 0.24, chH * 0.48, {
    sides: 6, scaleZ: 0.55, p: [0, chH * 0.52, -W * 0.3] });
  A.vents('torso', 'dark', 4, W * 0.38, chH * 0.18, 0.05 * s, {
    p: [0, chH * 0.5, -W * 0.47] });
  // brass waist pistons
  for (const sx of [-1, 1]) {
    A.piston('torso', 'brass', [sx * W * 0.13, chH * -0.02, -W * 0.06],
      [sx * W * 0.28, chH * 0.32, -W * 0.1], 0.035 * s);
  }

  // ================= HEAD: narrow serpent skull =================
  const hy = hs * 1.05;
  A.tube('head', 'frame', hs * 0.3, hs * 0.4, hs * 1.0, { p: [0, hy * 0.35, 0] });
  A.ring('head', 'brass', hs * 0.32, 0.028 * s, { p: [0, hy * 0.72, 0], r: [Math.PI / 2, 0, 0] });
  // slim cranium dome
  A.lathe('head', 'primary', [
    [-hs * 0.5, hs * 0.58],
    [hs * 0.08, hs * 0.68],
    [hs * 0.6, hs * 0.5],
    [hs * 0.82, hs * 0.18],
  ], { p: [0, hy + hs * 0.5, 0], scaleX: 0.85, scaleZ: 1.15, seg: 20 });
  // tapered snout wedge, reaching well forward
  A.taper('head', 'primary', [hs * 0.6, hs * 1.05, hs * 0.5], 0.38, 0.5, {
    p: [0, hy + hs * 0.3, hs * 0.85], r: [Math.PI / 2 + 0.12, 0, 0] });
  // green cyclops visor, wrapping
  A.sharpBox('head', 'glow', [hs * 0.58, hs * 0.11, 0.05 * s], {
    p: [0, hy + hs * 0.6, hs * 0.68], r: [0.12, 0, 0] });
  for (const sx of [-1, 1]) {
    A.sharpBox('head', 'glow', [hs * 0.26, hs * 0.09, 0.04 * s], {
      p: [sx * hs * 0.36, hy + hs * 0.58, hs * 0.52], r: [0.12, sx * 0.6, 0] });
  }
  // brow plate hooding the visor
  A.plate('head', 'frame', rhombOutline(hs * 1.0, hs * 0.36, { cut: 0.3 }), hs * 0.24, {
    p: [0, hy + hs * 0.82, hs * 0.24], r: [-0.35, 0, 0], round: 0.2 });
  // fanged chin guard
  A.taper('head', 'dark', [hs * 0.42, hs * 0.4, hs * 0.5], 0.55, 0.5, {
    p: [0, hy + hs * 0.05, hs * 0.72], r: [0.2, 0, 0] });
  for (const sx of [-1, 1]) {
    A.spike('head', 'metal', 0.03 * s, 0.17 * s, {
      p: [sx * hs * 0.26, hy + hs * 0.1, hs * 1.16], r: [Math.PI, 0, 0], seg: 5 });
  }
  // swept head fins + glowing trace, rolled outward to read from the front
  for (const sx of [-1, 1]) {
    A.blade('head', 'accent', hs * 1.7, hs * 0.46, 0.045 * s, {
      p: [sx * hs * 0.6, hy + hs * 0.72, -hs * 0.3],
      r: [-2.0, 0, sx * 0.55], taper: 0.12 });
    A.blade('head', 'glowSoft', hs * 1.1, hs * 0.11, 0.032 * s, {
      p: [sx * hs * 0.66, hy + hs * 0.76, -hs * 0.38],
      r: [-2.0, 0, sx * 0.55], taper: 0.12 });
  }
  // center crest
  A.blade('head', 'accent', hs * 1.1, hs * 0.26, 0.035 * s, {
    p: [0, hy + hs * 1.0, -hs * 0.28], r: [-1.05, 0, 0], taper: 0.12 });

  // ================= ARMS: slim, blade-bearing =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const sh = 'shoulder' + side, el = 'elbow' + side, ha = 'hand' + side;

    // pointed pauldron cone over a joint ball
    A.ball(sh, 'frame', 0.2 * s, {});
    A.lathe(sh, 'primary', [
      [-0.16 * s, 0.3 * s],
      [0.1 * s, 0.26 * s],
      [0.36 * s, 0.06 * s],
    ], { p: [sx * 0.1 * s, 0.06 * s, 0], scaleZ: 0.85, seg: 18 });
    A.spike(sh, 'dark', 0.05 * s, 0.5 * s, {
      p: [sx * 0.3 * s, 0.2 * s, -0.04 * s], r: [0.25, 0, sx * -1.0], seg: 6 });
    // slim upper arm bulge + accent sliver
    A.lathe(sh, 'frame', [
      [-ua * 0.98, 0.11 * s],
      [-ua * 0.5, 0.165 * s],
      [-ua * 0.1, 0.13 * s],
    ], { seg: 12 });
    A.plate(sh, 'accent', rhombOutline(0.2 * s, ua * 0.5, { cut: 0.3 }), 0.045 * s, {
      p: [sx * 0.16 * s, -ua * 0.5, 0], r: [0, sx * Math.PI / 2, 0], round: 0.15 });
    // elbow ring
    A.part(el, 'metal', cyl(0.12 * s, 0.12 * s, 0.26 * s, 10), { r: [0, 0, Math.PI / 2] });
    // forearm: slim six-sided housing with a green seam
    A.facet(el, 'accent', 0.15 * s, 0.21 * s, 0.16 * s, fa * 0.95, {
      sides: 6, scaleZ: 1.15, p: [0, -fa * 0.5, 0] });
    A.sharpBox(el, 'glowSoft', [0.026 * s, fa * 0.45, 0.026 * s], {
      p: [sx * 0.19 * s, -fa * 0.5, 0.045 * s] });
    A.piston(el, 'brass', [sx * -0.09 * s, -0.08 * s, -0.13 * s],
      [sx * -0.11 * s, -fa * 0.58, -0.17 * s], 0.03 * s);
    // hand: sleek claw
    A.facet(ha, 'frame', 0.11 * s, 0.15 * s, 0.1 * s, 0.3 * s, { sides: 6, p: [0, -0.08 * s, 0] });
    for (let i = -1; i <= 1; i++) {
      A.spike(ha, 'dark', 0.035 * s, 0.22 * s, {
        p: [i * 0.08 * s, -0.26 * s, 0.05 * s], r: [Math.PI - 0.25, 0, i * 0.1], seg: 5 });
    }

    // ===== energy blade on its flare joint (animator drives rotation.x) =====
    addJoint(J, 'blade' + side, ha, 0, -0.1 * s, 0.1 * s);
    const bj = 'blade' + side;
    // emitter housing hugging the wrist line
    A.facet(bj, 'dark', 0.09 * s, 0.13 * s, 0.1 * s, 0.5 * s, {
      sides: 6, p: [sx * 0.07 * s, -0.1 * s, 0.14 * s], r: [Math.PI / 2, 0, 0] });
    A.ring(bj, 'brass', 0.1 * s, 0.024 * s, { p: [sx * 0.07 * s, -0.1 * s, 0.36 * s] });
    // dark blade spine, edge-on (vertical plane), sweeping forward
    A.blade(bj, 'dark', 2.2 * s, 0.28 * s, 0.05 * s, {
      p: [sx * 0.07 * s, -0.1 * s, 1.05 * s], r: [Math.PI / 2 + 0.06, Math.PI / 2, 0], taper: 0.1 });
    // toxic-green energy edge riding under the spine
    A.blade(bj, 'glow', 2.4 * s, 0.16 * s, 0.032 * s, {
      p: [sx * 0.07 * s, -0.24 * s, 1.12 * s], r: [Math.PI / 2 + 0.06, Math.PI / 2, 0], taper: 0.06 });
  }

  // ================= LEGS: digitigrade raptor =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const th = 'thigh' + side, kn = 'knee' + side, an = 'ankle' + side;
    const tl = D.thighLen, sl = D.shinLen;

    // bulged thigh (rest pose angles it forward)
    A.ball(th, 'frame', 0.2 * s, {});
    A.lathe(th, 'primary', [
      [-tl * 1.0, 0.14 * s],
      [-tl * 0.6, 0.24 * s],
      [-tl * 0.15, 0.19 * s],
    ], { scaleZ: 1.25, seg: 18, p: [0, 0, 0.03 * s] });
    A.plate(th, 'accent', rhombOutline(0.3 * s, tl * 0.55, { cut: 0.28 }), 0.05 * s, {
      p: [sx * 0.22 * s, -tl * 0.45, 0.04 * s], r: [0, sx * Math.PI / 2, 0], round: 0.15 });
    A.piston(th, 'brass', [0, -tl * 0.18, -0.15 * s], [0, -tl * 0.85, -0.19 * s], 0.032 * s);

    // knee ball + small shield
    A.ball(kn, 'metal', 0.13 * s, {});
    A.plate(kn, 'accent', shieldOutline(0.26 * s, 0.36 * s, { taper: 0.6 }), 0.06 * s, {
      p: [0, -0.03 * s, 0.16 * s], r: [0.2, 0, 0], round: 0.15 });

    // slim calf swell + rear fin
    A.lathe(kn, 'primary', [
      [-sl * 1.0, 0.09 * s],
      [-sl * 0.68, 0.15 * s],
      [-sl * 0.34, 0.18 * s],
      [-sl * 0.06, 0.12 * s],
    ], { scaleZ: 1.2, seg: 16 });
    A.blade(kn, 'accent', 0.7 * s, 0.17 * s, 0.035 * s, {
      p: [0, -sl * 0.5, -0.17 * s], r: [Math.PI - 0.3, 0, 0], taper: 0.15 });
    A.plate(kn, 'primary', shieldOutline(0.2 * s, sl * 0.48, { taper: 0.7 }), 0.05 * s, {
      p: [0, -sl * 0.56, 0.15 * s], r: [0.04, 0, 0], round: 0.15 });

    // clawed raptor foot: sole pad + three fanned talons + dew claw
    A.ball(an, 'frame', 0.12 * s, {});
    A.taper(an, 'frame', [0.24 * s, 0.24 * s, 0.44 * s], 0.7, 0.5, { p: [0, -0.2 * s, 0.08 * s] });
    for (let i = -1; i <= 1; i++) {
      A.spike(an, 'dark', 0.055 * s, 0.5 * s, {
        p: [i * 0.1 * s, -0.2 * s, 0.3 * s], r: [2.0, 0, i * 0.25], seg: 6 });
    }
    A.spike(an, 'dark', 0.045 * s, 0.32 * s, {
      p: [0, -0.16 * s, -0.16 * s], r: [-2.1, 0, 0], seg: 6 });
  }

  anchors.muzzleR = addAnchor(J.handR, 0, -0.15 * s, 0.4 * s);
  anchors.bladeL = addAnchor(J.bladeL, 0, -0.2 * s, 2.2 * s);
  anchors.bladeR = addAnchor(J.bladeR, 0, -0.2 * s, 2.2 * s);
}
