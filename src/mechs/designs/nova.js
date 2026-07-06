// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 5. NOVA — plasma archmage. White/teal robes-armor, rotating halo,
//    staff cannon, glowing core, serene mask face.
// ============================================================
export function nova(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  standardLeg(A, D, 'L', { bulk: 0.85 }); standardLeg(A, D, 'R', { bulk: 0.85 });
  standardArm(A, D, 'L', { bulk: 0.8, fist: false }); standardArm(A, D, 'R', { bulk: 0.8, fist: false });

  // robe-like skirt armor around hips
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    A.blade('hips', 'primary', 1.15 * s, 0.55 * s, 0.06 * s, {
      p: [Math.sin(a) * 0.62 * s, -0.55 * s, Math.cos(a) * 0.55 * s],
      r: [Math.PI + Math.cos(a) * -0.28, a, Math.sin(a) * 0.28], taper: 1.3 });
  }
  // slender chest with big glowing core
  A.taper('torso', 'primary', [D.torsoW * 1.05, D.torsoH * 0.9, D.torsoD * 0.85], 0.7, 0.65, {
    p: [0, D.torsoH * 0.52, 0] });
  A.ball('torso', 'glow', 0.26 * s, { p: [0, D.torsoH * 0.55, D.torsoD * 0.42] });
  A.ring('torso', 'accent', 0.36 * s, 0.05 * s, { p: [0, D.torsoH * 0.55, D.torsoD * 0.42] });
  // serene mask head w/ hood shape
  A.ball('head', 'accent', D.headSize * 1.05, { p: [0, D.headSize * 0.62, -D.headSize * 0.1] });
  A.taper('head', 'primary', [D.headSize * 1.6, D.headSize * 1.9, D.headSize * 1.5], 0.4, 0.6, {
    p: [0, D.headSize * 0.8, -D.headSize * 0.25] });
  A.sharpBox('head', 'glow', [D.headSize * 0.16, D.headSize * 0.5, 0.04 * s], {
    p: [0, D.headSize * 0.55, D.headSize * 0.78] }); // vertical third-eye slit
  // rotating halo behind shoulders
  const halo = addJoint(J, 'halo', 'torso', 0, D.torsoH * 1.05, -D.torsoD * 0.7);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    A.part('halo', 'glowSoft', new THREE.TorusGeometry(0.85 * s, 0.05 * s, 6, 10, Math.PI / 3), {
      r: [0, 0, a + 0.26] });
  }
  A.ring('halo', 'metal', 0.62 * s, 0.03 * s, {});
  // staff-cannon held in right hand
  A.tube('handR', 'metal', 0.06 * s, 0.06 * s, 3.4 * s, { p: [0, -0.15 * s, 0.4 * s], r: [Math.PI / 2, 0, 0] });
  A.ball('handR', 'glow', 0.2 * s, { p: [0, -0.15 * s, 2.2 * s] });
  for (let i = 0; i < 3; i++) { // orbital prongs at staff head
    const a = (i / 3) * Math.PI * 2;
    A.blade('handR', 'accent', 0.55 * s, 0.12 * s, 0.04 * s, {
      p: [Math.cos(a) * 0.22 * s, -0.15 * s + Math.sin(a) * 0.22 * s, 2.15 * s],
      r: [0.5, 0, a], taper: 0.2 });
  }
  A.fist('handR', 'frame', 'dark', 0.26 * s, { side: 1 });
  A.fist('handL', 'frame', 'dark', 0.26 * s, { side: -1 });
  anchors.muzzleR = addAnchor(J.handR, 0, -0.15 * s, 2.35 * s);
}
