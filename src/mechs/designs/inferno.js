// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 11. INFERNO — flame juggernaut. Red/orange, furnace grill chest,
//     fuel tanks, twin arm flamethrowers, chimney vents.
// ============================================================
export function inferno(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  standardLeg(A, D, 'L', { bulk: 1.15 }); standardLeg(A, D, 'R', { bulk: 1.15 });
  standardArm(A, D, 'L', { bulk: 1.1, fist: false }); standardArm(A, D, 'R', { bulk: 1.1, fist: false });

  // furnace chest: grill with inner glow
  A.taper('torso', 'primary', [D.torsoW * 1.4, D.torsoH * 0.95, D.torsoD * 1.1], 0.85, 0.8, {
    p: [0, D.torsoH * 0.52, 0.02 * s] });
  A.sharpBox('torso', 'glow', [D.torsoW * 0.72, D.torsoH * 0.42, 0.06 * s], {
    p: [0, D.torsoH * 0.5, D.torsoD * 0.56] });
  A.vents('torso', 'dark', 6, D.torsoW * 0.8, D.torsoH * 0.48, 0.1 * s, {
    p: [0, D.torsoH * 0.5, D.torsoD * 0.6] });
  // twin fuel tanks on back
  for (const sx of [-1, 1]) {
    A.tube('torso', 'metal', 0.3 * s, 0.3 * s, D.torsoH * 0.9, {
      p: [sx * D.torsoW * 0.42, D.torsoH * 0.5, -D.torsoD * 0.62] });
    A.ball('torso', 'metal', 0.3 * s, { p: [sx * D.torsoW * 0.42, D.torsoH * 0.95, -D.torsoD * 0.62] });
    A.ring('torso', 'dark', 0.31 * s, 0.03 * s, {
      p: [sx * D.torsoW * 0.42, D.torsoH * 0.6, -D.torsoD * 0.62], r: [Math.PI / 2, 0, 0] });
  }
  // head: welding-mask face with glowing furnace mouth grill
  A.taper('head', 'primary', [D.headSize * 1.6, D.headSize * 1.5, D.headSize * 1.5], 0.8, 0.75, {
    p: [0, D.headSize * 0.6, 0] });
  A.sharpBox('head', 'glow', [D.headSize * 1.0, D.headSize * 0.5, 0.05 * s], {
    p: [0, D.headSize * 0.45, D.headSize * 0.75] });
  A.vents('head', 'dark', 4, D.headSize * 1.05, D.headSize * 0.55, 0.08 * s, {
    p: [0, D.headSize * 0.45, D.headSize * 0.78] });
  A.sharpBox('head', 'dark', [D.headSize * 1.7, D.headSize * 0.3, D.headSize * 1.6], {
    p: [0, D.headSize * 1.3, -D.headSize * 0.05] });
  // chimney vents on shoulders
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    A.pauldron('shoulder' + side, 'primary', 0.9 * s, 0.9 * s, 0.9 * s, {
      p: [sx * 0.3 * s, 0.22 * s, 0], side: sx });
    A.tube('shoulder' + side, 'dark', 0.09 * s, 0.11 * s, 0.6 * s, {
      p: [sx * 0.42 * s, 0.6 * s, -0.15 * s], r: [0, 0, sx * 0.2] });
    A.tube('shoulder' + side, 'glow', 0.06 * s, 0.06 * s, 0.06 * s, {
      p: [sx * 0.48 * s, 0.88 * s, -0.15 * s], r: [0, 0, sx * 0.2] });
    // flamethrower forearms: nozzle + pilot light
    A.tube('elbow' + side, 'metal', 0.2 * s, 0.24 * s, D.foreArmLen * 0.85, {
      p: [0, -D.foreArmLen * 0.5, 0] });
    A.tube('hand' + side, 'dark', 0.13 * s, 0.19 * s, 0.5 * s, {
      p: [0, -0.1 * s, 0.3 * s], r: [Math.PI / 2, 0, 0] });
    A.ring('hand' + side, 'glow', 0.14 * s, 0.03 * s, { p: [0, -0.1 * s, 0.56 * s] });
  }
  anchors.muzzleR = addAnchor(J.handR, 0, -0.1 * s, 0.6 * s);
  anchors.muzzleL = addAnchor(J.handL, 0, -0.1 * s, 0.6 * s);
}
