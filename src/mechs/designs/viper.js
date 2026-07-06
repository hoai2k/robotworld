// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 4. VIPER — twin-blade assassin. Sleek purple/black, raptor legs,
//    forearm energy blades, snake-eye visor, fanged mask.
// ============================================================
export function viper(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  raptorLeg(A, D, 'L'); raptorLeg(A, D, 'R');
  standardArm(A, D, 'L', { bulk: 0.8, fist: false }); standardArm(A, D, 'R', { bulk: 0.8, fist: false });

  // slim angular chest with layered fins
  A.taper('torso', 'primary', [D.torsoW * 1.1, D.torsoH * 0.85, D.torsoD * 0.9], 0.65, 0.6, {
    p: [0, D.torsoH * 0.5, 0.02 * s] });
  for (let i = 0; i < 3; i++) {
    A.blade('torso', 'accent', 0.5 * s, 0.32 * s, 0.05 * s, {
      p: [0, D.torsoH * (0.35 + i * 0.18), D.torsoD * (0.55 - i * 0.04)],
      r: [0.9, 0, 0], taper: 0.4 });
  }
  // serpent head: narrow, fanged chin guard, cyclops slit
  A.taper('head', 'primary', [D.headSize * 1.3, D.headSize * 1.1, D.headSize * 2.2], 0.6, 0.55, {
    p: [0, D.headSize * 0.5, D.headSize * 0.25] });
  A.sharpBox('head', 'glow', [D.headSize * 0.9, D.headSize * 0.14, 0.05 * s], {
    p: [0, D.headSize * 0.58, D.headSize * 1.15], r: [0.08, 0, 0] });
  for (const sx of [-1, 1]) {
    A.spike('head', 'dark', 0.05 * s, 0.22 * s, {
      p: [sx * D.headSize * 0.42, D.headSize * 0.08, D.headSize * 1.0], r: [Math.PI, 0, 0], seg: 6 });
    // swept head fins
    A.blade('head', 'accent', D.headSize * 1.4, D.headSize * 0.5, 0.04 * s, {
      p: [sx * D.headSize * 0.7, D.headSize * 0.9, -D.headSize * 0.4],
      r: [-2.2, 0, sx * 0.35], taper: 0.25 });
  }
  // compact shoulders + forearm blades
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    A.taper('shoulder' + side, 'primary', [0.5 * s, 0.55 * s, 0.6 * s], 0.6, 0.7, {
      p: [sx * 0.2 * s, 0.2 * s, 0], r: [0, 0, sx * 0.3] });
    // hand: sleek claw block
    A.taper('hand' + side, 'frame', [0.28 * s, 0.4 * s, 0.3 * s], 0.8, 0.8, {});
    // energy blade sweeping forward from forearm
    const bl = addJoint(J, 'blade' + side, 'hand' + side, 0, -0.1 * s, 0.1 * s);
    A.blade('blade' + side, 'glow', 2.2 * s, 0.22 * s, 0.04 * s, {
      p: [sx * 0.05 * s, -0.2 * s, 1.0 * s], r: [Math.PI / 2 + 0.08, 0, 0], taper: 0.12 });
    A.blade('blade' + side, 'dark', 2.3 * s, 0.3 * s, 0.06 * s, {
      p: [sx * 0.09 * s, -0.2 * s, 0.95 * s], r: [Math.PI / 2 + 0.08, 0, 0], taper: 0.15 });
  }
  anchors.muzzleR = addAnchor(J.handR, 0, -0.15 * s, 0.4 * s);
  anchors.bladeL = addAnchor(J.bladeL, 0, -0.2 * s, 2.0 * s);
  anchors.bladeR = addAnchor(J.bladeR, 0, -0.2 * s, 2.0 * s);
}
