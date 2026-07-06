// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 9. COLOSSUS — walking artillery. Desert tan bunker, twin back
//    mortars, embedded head, sandbag armor slabs, wide stance.
// ============================================================
export function colossus(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  standardLeg(A, D, 'L', { bulk: 1.35 }); standardLeg(A, D, 'R', { bulk: 1.35 });
  standardArm(A, D, 'L', { bulk: 1.2 }); standardArm(A, D, 'R', { bulk: 1.2 });

  // fortress torso: wide slab chest
  A.taper('torso', 'primary', [D.torsoW * 1.65, D.torsoH * 1.0, D.torsoD * 1.2], 0.92, 0.85, {
    p: [0, D.torsoH * 0.52, 0] });
  for (let i = 0; i < 3; i++) { // stacked front slabs
    A.sharpBox('torso', 'accent', [D.torsoW * (1.35 - i * 0.12), 0.26 * s, 0.16 * s], {
      p: [0, D.torsoH * (0.25 + i * 0.26), D.torsoD * 0.68] });
  }
  A.vents('torso', 'dark', 6, D.torsoW * 1.1, 0.2 * s, 0.06 * s, {
    p: [0, D.torsoH * 0.88, D.torsoD * 0.62] });
  // embedded head: armored visor block sunk into chest
  A.taper('head', 'primary', [D.headSize * 2.4, D.headSize * 1.1, D.headSize * 1.6], 0.9, 0.85, {
    p: [0, D.headSize * 0.4, 0.1 * s] });
  A.sharpBox('head', 'glow', [D.headSize * 1.7, D.headSize * 0.18, 0.05 * s], {
    p: [0, D.headSize * 0.42, D.headSize * 0.88] });
  // twin mortar tubes on back (elevated joint for aiming anim)
  const mortars = addJoint(J, 'mortars', 'torso', 0, D.torsoH * 0.95, -D.torsoD * 0.5);
  for (const sx of [-1, 1]) {
    A.tube('mortars', 'metal', 0.26 * s, 0.3 * s, 2.2 * s, {
      p: [sx * 0.55 * s, 0.8 * s, -0.3 * s], r: [-0.7, 0, 0] });
    A.tube('mortars', 'dark', 0.3 * s, 0.3 * s, 0.3 * s, {
      p: [sx * 0.55 * s, 1.62 * s, 0.3 * s], r: [-0.7, 0, 0] });
    A.box('mortars', 'accent', [0.5 * s, 0.5 * s, 0.7 * s], { p: [sx * 0.55 * s, 0.1 * s, -0.1 * s] });
  }
  mortars.rotation.x = 0;
  // heavy pauldrons + hazard stripes forearms already via accent
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    A.box('shoulder' + side, 'primary', [0.9 * s, 0.85 * s, 0.95 * s], { p: [sx * 0.32 * s, 0.26 * s, 0] });
    A.sharpBox('shoulder' + side, 'dark', [0.94 * s, 0.2 * s, 0.99 * s], { p: [sx * 0.32 * s, 0.62 * s, 0] });
  }
  anchors.muzzleR = addAnchor(J.mortars, 0.55 * s, 1.7 * s, 0.4 * s);
  anchors.muzzleL = addAnchor(J.mortars, -0.55 * s, 1.7 * s, 0.4 * s);
}
