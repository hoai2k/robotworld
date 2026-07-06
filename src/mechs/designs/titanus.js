// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 1. TITANUS — colossal brawler. Boxy industrial hulk, huge fists,
//    exhaust stacks, hazard stripes, single amber visor slit.
// ============================================================
export function titanus(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  standardLeg(A, D, 'L', { bulk: 1.2 }); standardLeg(A, D, 'R', { bulk: 1.2 });
  standardArm(A, D, 'L', { bulk: 1.35 }); standardArm(A, D, 'R', { bulk: 1.35 });

  // massive chest block, extra plating
  A.taper('torso', 'primary', [D.torsoW * 1.5, D.torsoH * 0.95, D.torsoD * 1.15], 0.88, 0.8, {
    p: [0, D.torsoH * 0.55, 0.05 * s],
  });
  A.box('torso', 'accent', [D.torsoW * 0.9, D.torsoH * 0.4, 0.2 * s], {
    p: [0, D.torsoH * 0.62, D.torsoD * 0.62] });
  A.vents('torso', 'dark', 5, D.torsoW * 0.7, 0.3 * s, 0.06 * s, {
    p: [0, D.torsoH * 0.32, D.torsoD * 0.66] });
  // exhaust stacks on back
  for (const sx of [-1, 1]) {
    A.tube('torso', 'metal', 0.14 * s, 0.17 * s, 1.5 * s, {
      p: [sx * D.torsoW * 0.55, D.torsoH * 0.95, -D.torsoD * 0.55], r: [0.25, 0, sx * -0.15] });
    A.tube('torso', 'dark', 0.15 * s, 0.15 * s, 0.1 * s, {
      p: [sx * D.torsoW * 0.62, D.torsoH * 1.38, -D.torsoD * 0.73], r: [0.25, 0, sx * -0.15] });
  }
  // head: low armored block w/ amber visor slit
  A.taper('head', 'primary', [D.headSize * 2.2, D.headSize * 1.5, D.headSize * 1.9], 0.85, 0.8, {
    p: [0, D.headSize * 0.6, 0] });
  A.sharpBox('head', 'glow', [D.headSize * 1.5, D.headSize * 0.28, 0.06 * s], {
    p: [0, D.headSize * 0.62, D.headSize * 0.95] });
  A.sharpBox('head', 'dark', [D.headSize * 2.3, D.headSize * 0.3, D.headSize * 2.0], {
    p: [0, D.headSize * 1.35, 0] });
  // shoulder slabs
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    A.pauldron('shoulder' + side, 'primary', 1.0 * s, 1.1 * s, 1.0 * s, {
      p: [sx * 0.3 * s, 0.25 * s, 0], side: sx });
    A.sharpBox('shoulder' + side, 'glow', [0.08 * s, 0.5 * s, 0.7 * s], {
      p: [sx * 0.62 * s, 0.18 * s, 0] });
    // upgraded gauntlets & giant fists
    A.taper('elbow' + side, 'primary', [0.75 * s, D.foreArmLen * 0.9, 0.8 * s], 1.2, 1.15, {
      p: [0, -D.foreArmLen * 0.55, 0] });
    A.fist('hand' + side, 'frame', 'dark', 0.52 * s, { side: sx });
  }
  anchors.muzzleR = addAnchor(J.handR, 0, -0.3 * s, 0.5 * s);
  anchors.muzzleL = addAnchor(J.handL, 0, -0.3 * s, 0.5 * s);
  anchors.core = addAnchor(J.torso, 0, D.torsoH * 0.5, D.torsoD * 0.7);
}
