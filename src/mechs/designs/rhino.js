// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 6. RHINO — charging bull. Hunched steel-gray hulk, giant chrome
//    horn, ram shoulders, red eyes, vented snout.
// ============================================================
export function rhino(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  standardLeg(A, D, 'L', { bulk: 1.25 }); standardLeg(A, D, 'R', { bulk: 1.25 });
  standardArm(A, D, 'L', { bulk: 1.25 }); standardArm(A, D, 'R', { bulk: 1.25 });

  // hunched barrel chest
  A.taper('torso', 'primary', [D.torsoW * 1.5, D.torsoH * 1.0, D.torsoD * 1.25], 0.95, 0.75, {
    p: [0, D.torsoH * 0.5, 0.12 * s], r: [0.14, 0, 0] });
  A.taper('torso', 'accent', [D.torsoW * 1.1, D.torsoH * 0.45, 0.3 * s], 0.8, 1, {
    p: [0, D.torsoH * 0.42, D.torsoD * 0.68], r: [0.1, 0, 0] });
  // spine ridge plates
  for (let i = 0; i < 4; i++) {
    A.taper('torso', 'metal', [0.4 * s - i * 0.06 * s, 0.3 * s, 0.35 * s], 0.5, 0.7, {
      p: [0, D.torsoH * (0.55 + i * 0.16), -D.torsoD * 0.6], r: [-0.4, 0, 0] });
  }
  // bull head low between shoulders: broad snout + THE HORN
  A.taper('head', 'primary', [D.headSize * 2.1, D.headSize * 1.4, D.headSize * 2.3], 0.8, 0.7, {
    p: [0, D.headSize * 0.5, D.headSize * 0.3] });
  A.vents('head', 'dark', 4, D.headSize * 1.2, 0.16 * s, 0.05 * s, {
    p: [0, D.headSize * 0.3, D.headSize * 1.4] });
  A.spike('head', 'metal', 0.16 * s, 1.5 * s, {
    p: [0, D.headSize * 1.0, D.headSize * 1.3], r: [Math.PI / 2.6, 0, 0], seg: 12 });
  A.spike('head', 'metal', 0.09 * s, 0.55 * s, {
    p: [0, D.headSize * 1.35, D.headSize * 0.5], r: [Math.PI / 3.2, 0, 0], seg: 10 });
  for (const sx of [-1, 1]) {
    A.ball('head', 'glow', 0.09 * s, { p: [sx * D.headSize * 0.7, D.headSize * 0.7, D.headSize * 1.15], seg: 8 });
  }
  // ram shoulders: flat forward-facing slabs
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    A.taper('shoulder' + side, 'primary', [0.95 * s, 1.05 * s, 1.1 * s], 0.85, 0.8, {
      p: [sx * 0.34 * s, 0.22 * s, 0.06 * s] });
    A.sharpBox('shoulder' + side, 'metal', [0.7 * s, 0.8 * s, 0.14 * s], {
      p: [sx * 0.34 * s, 0.18 * s, 0.62 * s] });
    for (let i = 0; i < 3; i++) {
      A.spike('shoulder' + side, 'metal', 0.07 * s, 0.3 * s, {
        p: [sx * 0.34 * s + (i - 1) * 0.2 * s, 0.45 * s, 0.62 * s], r: [Math.PI / 2, 0, 0], seg: 6 });
    }
  }
  anchors.muzzleR = addAnchor(J.head, 0, D.headSize * 0.9, D.headSize * 1.6); // horn tip-ish
  anchors.horn = addAnchor(J.head, 0, D.headSize * 1.3, D.headSize * 2.2);
}
