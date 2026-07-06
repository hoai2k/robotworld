// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 8. FENRIR — wolf chassis. Silver/ice-blue, wolf head with ears,
//    claw hands, spiky mane, articulated tail, raptor legs.
// ============================================================
export function fenrir(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  raptorLeg(A, D, 'L', { bulk: 0.95 }); raptorLeg(A, D, 'R', { bulk: 0.95 });
  standardArm(A, D, 'L', { bulk: 0.95, fist: false }); standardArm(A, D, 'R', { bulk: 0.95, fist: false });

  // chest: forward-hunched, mane of spikes around neck
  A.taper('torso', 'primary', [D.torsoW * 1.25, D.torsoH * 0.9, D.torsoD * 1.0], 0.8, 0.7, {
    p: [0, D.torsoH * 0.5, 0.06 * s], r: [0.08, 0, 0] });
  for (let i = 0; i < 7; i++) {
    const a = (i / 6 - 0.5) * Math.PI * 1.1;
    A.blade('torso', 'metal', 0.7 * s, 0.18 * s, 0.05 * s, {
      p: [Math.sin(a) * D.torsoW * 0.72, D.torsoH * 0.88, -0.1 * s - Math.abs(Math.sin(a)) * 0.1 * s],
      r: [-0.5 - Math.abs(a) * 0.12, 0, -a * 0.55], taper: 0.1 });
  }
  // wolf head: snout, jaw, ears, angry eyes
  A.taper('head', 'primary', [D.headSize * 1.5, D.headSize * 1.2, D.headSize * 1.4], 0.8, 0.9, {
    p: [0, D.headSize * 0.55, -D.headSize * 0.1] });
  A.taper('head', 'primary', [D.headSize * 0.9, D.headSize * 0.7, D.headSize * 1.3], 0.75, 0.6, {
    p: [0, D.headSize * 0.45, D.headSize * 0.9], r: [0.06, 0, 0] });
  A.taper('head', 'dark', [D.headSize * 0.75, D.headSize * 0.3, D.headSize * 1.1], 0.8, 0.6, {
    p: [0, D.headSize * 0.12, D.headSize * 0.85] }); // jaw
  for (const sx of [-1, 1]) { // fangs
    A.spike('head', 'metal', 0.035 * s, 0.14 * s, {
      p: [sx * D.headSize * 0.28, D.headSize * 0.22, D.headSize * 1.35], r: [Math.PI, 0, 0], seg: 5 });
    // ears
    A.blade('head', 'primary', D.headSize * 0.85, D.headSize * 0.45, 0.05 * s, {
      p: [sx * D.headSize * 0.55, D.headSize * 1.35, -D.headSize * 0.3], r: [-0.3, 0, sx * 0.3], taper: 0.15 });
    // slanted eyes
    A.sharpBox('head', 'glow', [D.headSize * 0.4, D.headSize * 0.1, 0.04 * s], {
      p: [sx * D.headSize * 0.36, D.headSize * 0.68, D.headSize * 0.62], r: [0, sx * 0.3, sx * -0.35] });
  }
  // clawed hands
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    A.taper('hand' + side, 'frame', [0.34 * s, 0.42 * s, 0.34 * s], 0.85, 0.85, {});
    for (let i = -1; i <= 1; i++) {
      A.spike('hand' + side, 'metal', 0.05 * s, 0.65 * s, {
        p: [i * 0.13 * s, -0.35 * s, 0.12 * s], r: [Math.PI - 0.35, 0, 0], seg: 6 });
    }
    A.pauldron('shoulder' + side, 'primary', 0.75 * s, 0.8 * s, 0.8 * s, {
      p: [sx * 0.24 * s, 0.2 * s, 0], side: sx });
    A.spike('shoulder' + side, 'metal', 0.07 * s, 0.4 * s, {
      p: [sx * 0.45 * s, 0.5 * s, 0], r: [0, 0, sx * 0.9], seg: 6 });
  }
  // articulated tail (3 segments)
  let parent = 'hips';
  for (let i = 0; i < 3; i++) {
    const tj = addJoint(J, 'tail' + i, parent, 0, i === 0 ? -0.1 * s : 0, i === 0 ? -0.5 * s : -0.75 * s);
    A.taper('tail' + i, i === 2 ? 'accent' : 'primary',
      [0.28 * s * (1 - i * 0.22), 0.28 * s * (1 - i * 0.22), 0.85 * s], 0.75, 0.8, {
        p: [0, 0, -0.38 * s] });
    parent = 'tail' + i;
  }
  A.spike('tail2', 'glow', 0.06 * s, 0.4 * s, { p: [0, 0, -0.85 * s], r: [-Math.PI / 2, 0, 0], seg: 6 });
  anchors.muzzleR = addAnchor(J.handR, 0, -0.3 * s, 0.3 * s);
  anchors.clawL = addAnchor(J.handL, 0, -0.7 * s, 0.2 * s);
  anchors.clawR = addAnchor(J.handR, 0, -0.7 * s, 0.2 * s);
}
