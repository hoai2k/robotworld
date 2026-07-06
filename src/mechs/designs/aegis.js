// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 3. AEGIS — shield paladin. White & gold knight, tower shield,
//    energy lance, head crest, banner plates.
// ============================================================
export function aegis(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  standardLeg(A, D, 'L'); standardLeg(A, D, 'R');
  standardArm(A, D, 'L', { fist: false }); standardArm(A, D, 'R', { fist: false });

  // regal chest: layered plates + gold trim + core gem
  A.taper('torso', 'primary', [D.torsoW * 1.3, D.torsoH * 0.92, D.torsoD * 1.0], 0.82, 0.78, {
    p: [0, D.torsoH * 0.52, 0.02 * s] });
  A.taper('torso', 'accent', [D.torsoW * 0.85, D.torsoH * 0.5, 0.24 * s], 0.6, 1, {
    p: [0, D.torsoH * 0.6, D.torsoD * 0.55] });
  A.ball('torso', 'glow', 0.16 * s, { p: [0, D.torsoH * 0.66, D.torsoD * 0.68] });
  A.ring('torso', 'metal', 0.22 * s, 0.045 * s, { p: [0, D.torsoH * 0.66, D.torsoD * 0.66] });
  // knight helm with crest fin
  A.taper('head', 'primary', [D.headSize * 1.7, D.headSize * 1.7, D.headSize * 1.8], 0.75, 0.9, {
    p: [0, D.headSize * 0.7, 0] });
  A.sharpBox('head', 'glow', [D.headSize * 1.1, D.headSize * 0.2, 0.05 * s], {
    p: [0, D.headSize * 0.65, D.headSize * 0.92] });
  A.blade('head', 'accent', D.headSize * 2.2, D.headSize * 0.9, 0.07 * s, {
    p: [0, D.headSize * 1.6, -D.headSize * 0.2], r: [-0.25, 0, 0], taper: 0.35 });
  // winged pauldrons
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    A.pauldron('shoulder' + side, 'primary', 0.9 * s, 0.95 * s, 0.9 * s, {
      p: [sx * 0.26 * s, 0.24 * s, 0], side: sx });
    A.blade('shoulder' + side, 'accent', 0.9 * s, 0.35 * s, 0.05 * s, {
      p: [sx * 0.55 * s, 0.55 * s, -0.1 * s], r: [0, 0, sx * 0.5], taper: 0.3 });
  }
  // back banners (twin plates like a cape)
  for (const sx of [-1, 1]) {
    A.blade('torso', 'accent', D.torsoH * 1.15, 0.5 * s, 0.05 * s, {
      p: [sx * D.torsoW * 0.42, D.torsoH * 0.15, -D.torsoD * 0.62],
      r: [Math.PI - 0.16, 0, sx * 0.1], taper: 0.75 });
  }
  // tower shield on left forearm
  const sh = addJoint(J, 'shield', 'elbowL', -0.3 * s, -D.foreArmLen * 0.5, 0);
  A.taper('shield', 'primary', [1.5 * s, 2.6 * s, 0.16 * s], 0.75, 1, { p: [0, 0, 0.05 * s] });
  A.taper('shield', 'accent', [1.1 * s, 2.1 * s, 0.1 * s], 0.72, 1, { p: [0, 0, 0.16 * s] });
  A.sharpBox('shield', 'glow', [0.12 * s, 1.6 * s, 0.06 * s], { p: [0, 0, 0.24 * s] });
  A.sharpBox('shield', 'glow', [0.7 * s, 0.12 * s, 0.06 * s], { p: [0, 0.4 * s, 0.24 * s] });
  sh.rotation.y = -0.12;
  // energy lance in right hand
  A.tube('handR', 'metal', 0.07 * s, 0.09 * s, 2.4 * s, { p: [0, -0.2 * s, 0.7 * s], r: [Math.PI / 2, 0, 0] });
  A.tube('handR', 'accent', 0.14 * s, 0.2 * s, 0.5 * s, { p: [0, -0.2 * s, 0.2 * s], r: [Math.PI / 2, 0, 0] });
  A.spike('handR', 'glow', 0.09 * s, 0.9 * s, { p: [0, -0.2 * s, 2.3 * s], r: [Math.PI / 2, 0, 0] });
  A.fist('handR', 'frame', 'dark', 0.3 * s, { side: 1 });
  anchors.muzzleR = addAnchor(J.handR, 0, -0.2 * s, 2.6 * s);
  anchors.shield = addAnchor(J.shield, 0, 0, 0.2 * s);
}
