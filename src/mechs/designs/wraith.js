// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 10. WRAITH — stealth sniper. Matte black, hooded cowl, red seams,
//     huge anti-materiel rifle, tattered fin "cloak".
// ============================================================
export function wraith(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  raptorLeg(A, D, 'L', { bulk: 0.8 }); raptorLeg(A, D, 'R', { bulk: 0.8 });
  standardArm(A, D, 'L', { bulk: 0.78, fist: false }); standardArm(A, D, 'R', { bulk: 0.78, fist: false });

  // gaunt chest with red power seams
  A.taper('torso', 'primary', [D.torsoW * 1.0, D.torsoH * 0.88, D.torsoD * 0.8], 0.7, 0.6, {
    p: [0, D.torsoH * 0.5, 0] });
  A.sharpBox('torso', 'glow', [0.05 * s, D.torsoH * 0.6, 0.04 * s], {
    p: [0, D.torsoH * 0.5, D.torsoD * 0.42] });
  for (const sx of [-1, 1]) {
    A.sharpBox('torso', 'glowSoft', [0.04 * s, D.torsoH * 0.4, 0.03 * s], {
      p: [sx * D.torsoW * 0.3, D.torsoH * 0.45, D.torsoD * 0.4], r: [0, 0, sx * 0.25] });
  }
  // hooded cowl head: single red eye deep inside
  A.taper('head', 'primary', [D.headSize * 1.7, D.headSize * 1.9, D.headSize * 1.9], 0.55, 0.75, {
    p: [0, D.headSize * 0.72, -D.headSize * 0.15] });
  A.ball('head', 'dark', D.headSize * 0.72, { p: [0, D.headSize * 0.5, D.headSize * 0.15] });
  A.ball('head', 'glow', D.headSize * 0.16, { p: [0, D.headSize * 0.52, D.headSize * 0.62], seg: 8 });
  // tattered cloak fins from back
  for (let i = 0; i < 4; i++) {
    const sx = i % 2 === 0 ? -1 : 1;
    A.blade('torso', 'dark', (1.5 - i * 0.18) * s, 0.4 * s, 0.04 * s, {
      p: [sx * D.torsoW * (0.2 + i * 0.1), D.torsoH * 0.35, -D.torsoD * 0.55],
      r: [Math.PI - 0.25 - i * 0.08, 0, sx * (0.15 + i * 0.1)], taper: 0.5 });
  }
  // anti-materiel rifle held two-handed (attached to right hand)
  const rifle = addJoint(J, 'rifle', 'handR', 0, -0.18 * s, 0.15 * s);
  A.tube('rifle', 'dark', 0.07 * s, 0.08 * s, 3.6 * s, { p: [0, 0, 1.4 * s], r: [Math.PI / 2, 0, 0] });
  A.tube('rifle', 'metal', 0.1 * s, 0.1 * s, 0.5 * s, { p: [0, 0, 3.15 * s], r: [Math.PI / 2, 0, 0] });
  A.box('rifle', 'frame', [0.16 * s, 0.35 * s, 1.3 * s], { p: [0, -0.05 * s, 0.1 * s] });
  A.box('rifle', 'accent', [0.12 * s, 0.22 * s, 0.7 * s], { p: [0, 0.2 * s, 0.6 * s] }); // scope
  A.tube('rifle', 'glow', 0.035 * s, 0.035 * s, 0.1 * s, { p: [0, 0.2 * s, 1.0 * s], r: [Math.PI / 2, 0, 0] });
  A.sharpBox('rifle', 'frame', [0.1 * s, 0.3 * s, 0.3 * s], { p: [0, -0.28 * s, -0.5 * s] }); // stock
  anchors.muzzleR = addAnchor(J.rifle, 0, 0, 3.4 * s);
  anchors.scope = addAnchor(J.rifle, 0, 0.2 * s, 1.0 * s);
}
