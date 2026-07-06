// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 12. GLACIER — cryo fortress. Pale blue/white, crystal growths,
//     freeze cannon arm, frost vents, glacier-slab shoulders.
// ============================================================
export function glacier(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  standardLeg(A, D, 'L', { bulk: 1.2 }); standardLeg(A, D, 'R', { bulk: 1.2 });
  standardArm(A, D, 'L', { bulk: 1.15 });
  standardArm(A, D, 'R', { bulk: 1.15, fist: false, foreArmor: false });

  // broad chest with frost intake
  A.taper('torso', 'primary', [D.torsoW * 1.45, D.torsoH * 0.95, D.torsoD * 1.1], 0.85, 0.78, {
    p: [0, D.torsoH * 0.52, 0] });
  A.vents('torso', 'glowSoft', 7, D.torsoW * 0.9, 0.22 * s, 0.05 * s, {
    p: [0, D.torsoH * 0.6, D.torsoD * 0.6] });
  // ice crystal growths (angled glowing shards) on shoulders/back
  const shardSpots = [
    ['shoulderL', -0.35, 0.45, 0, 0.5], ['shoulderL', -0.15, 0.55, -0.15, 0.35],
    ['shoulderR', 0.35, 0.45, 0, -0.5], ['shoulderR', 0.18, 0.58, 0.1, -0.3],
    ['torso', -0.3, 1.4, -0.5, 0.3], ['torso', 0.35, 1.5, -0.5, -0.25], ['torso', 0, 1.6, -0.6, 0],
  ];
  for (const [joint, x, y, z, rz] of shardSpots) {
    A.spike(joint, 'glowSoft', 0.14 * s, 0.9 * s, {
      p: [x * s, y * s, z * s], r: [0.15, 0, rz], seg: 5 });
    A.spike(joint, 'glowSoft', 0.09 * s, 0.55 * s, {
      p: [x * s + 0.12 * s, y * s - 0.05 * s, z * s + 0.08 * s], r: [0.3, 0.4, rz * 1.3], seg: 5 });
  }
  // glacier-slab pauldrons
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    A.taper('shoulder' + side, 'primary', [1.0 * s, 0.9 * s, 1.0 * s], 0.7, 0.75, {
      p: [sx * 0.32 * s, 0.26 * s, 0], r: [0, 0, sx * 0.12] });
    A.taper('shoulder' + side, 'accent', [0.85 * s, 0.3 * s, 0.85 * s], 0.8, 0.8, {
      p: [sx * 0.36 * s, 0.55 * s, 0], r: [0, 0, sx * 0.15] });
  }
  // head: heavy brow visor, frost-breath grill
  A.taper('head', 'primary', [D.headSize * 1.8, D.headSize * 1.4, D.headSize * 1.7], 0.8, 0.8, {
    p: [0, D.headSize * 0.55, 0] });
  A.sharpBox('head', 'glow', [D.headSize * 1.2, D.headSize * 0.2, 0.05 * s], {
    p: [0, D.headSize * 0.68, D.headSize * 0.85] });
  A.vents('head', 'dark', 3, D.headSize * 0.8, D.headSize * 0.24, 0.05 * s, {
    p: [0, D.headSize * 0.2, D.headSize * 0.82] });
  A.sharpBox('head', 'accent', [D.headSize * 2.0, D.headSize * 0.35, D.headSize * 1.2], {
    p: [0, D.headSize * 1.05, -D.headSize * 0.15] });
  // freeze cannon: right forearm becomes cryo projector
  A.tube('elbow' + 'R', 'metal', 0.24 * s, 0.28 * s, D.foreArmLen * 0.9, {
    p: [0, -D.foreArmLen * 0.5, 0] });
  A.tube('handR', 'accent', 0.3 * s, 0.34 * s, 0.7 * s, { p: [0, -0.05 * s, 0.25 * s], r: [Math.PI / 2, 0, 0] });
  A.tube('handR', 'glow', 0.18 * s, 0.22 * s, 0.15 * s, { p: [0, -0.05 * s, 0.62 * s], r: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 4; i++) { // frost prongs
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    A.spike('handR', 'metal', 0.05 * s, 0.4 * s, {
      p: [Math.cos(a) * 0.28 * s, -0.05 * s + Math.sin(a) * 0.28 * s, 0.75 * s],
      r: [Math.PI / 2.3 * 1, 0, -a], seg: 5 });
  }
  anchors.muzzleR = addAnchor(J.handR, 0, -0.05 * s, 0.85 * s);
}
