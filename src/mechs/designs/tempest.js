// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 7. TEMPEST — storm dancer. Navy + cyan, tesla coil shoulders,
//    fin crest, conduit arms, sleek athletic build.
// ============================================================
export function tempest(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  standardLeg(A, D, 'L', { bulk: 0.9 }); standardLeg(A, D, 'R', { bulk: 0.9 });
  standardArm(A, D, 'L', { bulk: 0.85, fist: false }); standardArm(A, D, 'R', { bulk: 0.85, fist: false });

  // athletic chest w/ storm core
  A.taper('torso', 'primary', [D.torsoW * 1.15, D.torsoH * 0.9, D.torsoD * 0.9], 0.72, 0.68, {
    p: [0, D.torsoH * 0.52, 0] });
  A.tube('torso', 'glow', 0.14 * s, 0.14 * s, 0.1 * s, {
    p: [0, D.torsoH * 0.58, D.torsoD * 0.48], r: [Math.PI / 2, 0, 0] });
  A.ring('torso', 'metal', 0.2 * s, 0.04 * s, { p: [0, D.torsoH * 0.58, D.torsoD * 0.48] });
  // lightning-bolt chest seams
  for (const sx of [-1, 1]) {
    A.sharpBox('torso', 'glowSoft', [0.05 * s, 0.5 * s, 0.04 * s], {
      p: [sx * D.torsoW * 0.35, D.torsoH * 0.5, D.torsoD * 0.46], r: [0, 0, sx * 0.5] });
  }
  // head: swept crest fin + twin eyes
  A.taper('head', 'primary', [D.headSize * 1.4, D.headSize * 1.3, D.headSize * 1.6], 0.7, 0.7, {
    p: [0, D.headSize * 0.55, 0] });
  A.blade('head', 'accent', D.headSize * 2.4, D.headSize * 0.7, 0.05 * s, {
    p: [0, D.headSize * 1.2, -D.headSize * 0.5], r: [-2.5, 0, 0], taper: 0.2 });
  for (const sx of [-1, 1]) {
    A.sharpBox('head', 'glow', [D.headSize * 0.34, D.headSize * 0.12, 0.04 * s], {
      p: [sx * D.headSize * 0.34, D.headSize * 0.6, D.headSize * 0.8], r: [0, 0, sx * -0.28] });
  }
  // tesla coil shoulders
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    A.tube('shoulder' + side, 'metal', 0.1 * s, 0.22 * s, 0.55 * s, { p: [sx * 0.25 * s, 0.42 * s, 0] });
    A.ball('shoulder' + side, 'glow', 0.16 * s, { p: [sx * 0.25 * s, 0.78 * s, 0] });
    A.ring('shoulder' + side, 'metal', 0.26 * s, 0.035 * s, {
      p: [sx * 0.25 * s, 0.55 * s, 0], r: [Math.PI / 2, 0, 0] });
    A.ring('shoulder' + side, 'metal', 0.32 * s, 0.035 * s, {
      p: [sx * 0.25 * s, 0.4 * s, 0], r: [Math.PI / 2, 0, 0] });
    // conduit forearms with glowing knuckle emitters
    A.tube('elbow' + side, 'accent', 0.16 * s, 0.19 * s, D.foreArmLen * 0.8, {
      p: [0, -D.foreArmLen * 0.5, 0] });
    for (let i = 0; i < 3; i++) {
      A.ring('elbow' + side, 'glowSoft', 0.2 * s, 0.03 * s, {
        p: [0, -D.foreArmLen * (0.3 + i * 0.25), 0], r: [Math.PI / 2, 0, 0] });
    }
    A.fist('hand' + side, 'frame', 'glowSoft', 0.28 * s, { side: sx });
  }
  // calf thrust fins
  for (const side of ['L', 'R']) {
    A.blade('knee' + side, 'accent', 0.8 * s, 0.3 * s, 0.05 * s, {
      p: [0, -D.shinLen * 0.5, -0.28 * s], r: [Math.PI + 0.35, 0, 0], taper: 0.3 });
  }
  anchors.muzzleR = addAnchor(J.handR, 0, -0.2 * s, 0.4 * s);
  anchors.coilL = addAnchor(J.shoulderL, -0.25 * s, 0.78 * s, 0);
  anchors.coilR = addAnchor(J.shoulderR, 0.25 * s, 0.78 * s, 0);
}
