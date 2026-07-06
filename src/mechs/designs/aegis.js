// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 3. AEGIS — sculpted knight-paladin rebuild. Cathedral-steel
//    forms: a regal lathe chest banded with gold trim over a blue
//    core gem, ornate crested lathe helm, massive beveled tower
//    shield (glowing blue cross) on the left arm, tapered energy
//    lance in the right hand, twin gold banner plates as a cape.
// ============================================================
export function aegis(A, D, J, anchors, def) {
  const s = D.scale;
  const W = D.torsoW;   // ~1.68 master width unit
  const chH = D.torsoH;
  const hs = D.headSize;
  const fA = D.foreArmLen;

  // dedicated decal skins (unmerged custom plates keep exact UVs)
  const plateMat = (decal, recipe, seedOff = 0) => {
    const tex = decalTexture({ seed: def.seed + seedOff, ...recipe }, decal);
    return new THREE.MeshStandardMaterial({
      map: tex.map, normalMap: tex.normalMap,
      roughnessMap: tex.rmMap, metalnessMap: tex.rmMap,
      roughness: 1, metalness: 1,
    });
  };

  // ================= WAIST / PELVIS =================
  // articulated waist column rising from the hip block
  A.lathe('hips', 'frame', [[0.55 * s, W * 0.28], [0.26 * s, W * 0.19], [-0.05 * s, W * 0.25]], {
    scaleX: 1.22 });
  // gold belt band at the pinch
  A.ring('hips', 'brass', W * 0.24, 0.035 * s, {
    p: [0, 0.24 * s, 0], r: [Math.PI / 2, 0, 0], s: [1.24, 1.02, 1] });
  // hip block: chamfered hex flare
  A.facet('hips', 'primary', W * 0.32, W * 0.42, W * 0.28, 0.85 * s, {
    sides: 6, scaleZ: 0.8, p: [0, -0.42 * s, 0] });
  // front tabard: white beveled shield with gold hem plate
  A.plate('hips', 'primary', shieldOutline(W * 0.46, 0.95 * s, { taper: 0.68 }), 0.1 * s, {
    p: [0, -0.6 * s, W * 0.33], r: [0.16, 0, 0], round: 0.12 });
  A.plate('hips', 'accent', shieldOutline(W * 0.28, 0.7 * s, { taper: 0.62 }), 0.06 * s, {
    p: [0, -0.64 * s, W * 0.4], r: [0.16, 0, 0] });
  // side skirts + gold hems
  for (const sx of [-1, 1]) {
    A.plate('hips', 'primary', shieldOutline(W * 0.36, 0.78 * s, { taper: 0.7 }), 0.08 * s, {
      p: [sx * W * 0.42, -0.52 * s, 0], r: [0.08, sx * Math.PI / 2, sx * 0.14], round: 0.12 });
    A.plate('hips', 'accent', shieldOutline(W * 0.22, 0.4 * s, { taper: 0.68 }), 0.05 * s, {
      p: [sx * W * 0.48, -0.82 * s, 0], r: [0.08, sx * Math.PI / 2, sx * 0.18] });
  }
  A.sharpBox('hips', 'dark', [W * 0.3, 0.32 * s, W * 0.22], { p: [0, -0.58 * s, -W * 0.18] });

  // ================= TORSO: regal bulged chest =================
  A.lathe('torso', 'primary', [
    [chH * 0.12, W * 0.30],
    [chH * 0.40, W * 0.50],
    [chH * 0.68, W * 0.58],
    [chH * 0.92, W * 0.50],
    [chH * 1.05, W * 0.30],
  ], { scaleX: 1.32, scaleZ: 0.75, seg: 28 });
  // gold trim bands wrapping the chest mass (sit proud of the paint)
  A.ring('torso', 'brass', W * 0.575, 0.05 * s, {
    p: [0, chH * 0.44, 0], r: [Math.PI / 2, 0, 0], s: [1.32, 0.76, 1], seg: 28 });
  A.ring('torso', 'brass', W * 0.59, 0.05 * s, {
    p: [0, chH * 0.84, 0], r: [Math.PI / 2, 0, 0], s: [1.32, 0.76, 1], seg: 28 });
  // blue core gem in a gold collar
  A.plate('torso', 'accent', shieldOutline(W * 0.32, chH * 0.28, { taper: 0.75 }), 0.07 * s, {
    p: [0, chH * 0.64, W * 0.42], r: [-0.05, 0, 0], round: 0.16 });
  A.ring('torso', 'brass', 0.22 * s, 0.035 * s, { p: [0, chH * 0.66, W * 0.47] });
  A.ball('torso', 'glow', 0.16 * s, { p: [0, chH * 0.66, W * 0.47], seg: 16 });
  // chest nameplate (dedicated decal skin)
  A.custom('torso', plateMat({
    text: 'AEGIS', textY: 0.42, textScale: 0.22, color: '#c9a227',
    emblem: true, emblemY: 0.74, emblemScale: 0.1, alpha: 0.85,
  }, def.skin.primary), beveledPlate(shieldOutline(W * 0.5, chH * 0.3, { taper: 0.8 }), 0.08 * s, { round: 0.12 }), {
    p: [0, chH * 0.33, W * 0.4], r: [0.12, 0, 0] });
  // gold pect chevrons hugging the upper slope
  for (const sx of [-1, 1]) {
    A.plate('torso', 'accent', rhombOutline(W * 0.32, W * 0.15, { cut: 0.3 }), 0.05 * s, {
      p: [sx * W * 0.29, chH * 0.9, W * 0.33], r: [0.32, 0, sx * -0.14], round: 0.2 });
  }
  // gorget collar + gold necklace ring
  A.tube('torso', 'frame', W * 0.16, W * 0.2, 0.18 * s, { p: [0, chH * 1.02, 0] });
  A.ring('torso', 'brass', W * 0.19, 0.028 * s, {
    p: [0, chH * 1.08, 0], r: [Math.PI / 2, 0, 0] });
  // exposed abdomen rings bridging chest to waist
  for (let i = 0; i < 2; i++) {
    A.tube('torso', 'dark', W * (0.19 - i * 0.02), W * (0.21 - i * 0.02), 0.09 * s, {
      p: [0, chH * (0.05 - i * 0.09), 0] });
  }
  // brass waist pistons angling out to the chest
  for (const sx of [-1, 1]) {
    A.piston('torso', 'brass', [sx * W * 0.16, chH * -0.05, W * 0.1],
      [sx * W * 0.36, chH * 0.28, W * 0.18], 0.04 * s);
  }

  // ================= BACK: banner cape =================
  // banner rack: chamfered post + brass crossbar
  A.facet('torso', 'frame', W * 0.18, W * 0.24, W * 0.16, chH * 0.45, {
    sides: 6, scaleZ: 0.7, p: [0, chH * 0.65, -W * 0.34] });
  A.tube('torso', 'brass', 0.045 * s, 0.045 * s, W * 1.05, {
    p: [0, chH * 0.9, -D.torsoD * 0.52], r: [0, 0, Math.PI / 2] });
  // twin gold banner plates with white inner stripes
  for (const sx of [-1, 1]) {
    A.plate('torso', 'accent', shieldOutline(0.62 * s, 2.7 * s, { taper: 0.88, tip: 0.14 }), 0.05 * s, {
      p: [sx * W * 0.34, chH * 0.9 - 1.38 * s, -D.torsoD * 0.58],
      r: [0.16, sx * -0.08, sx * 0.06], round: 0.1 });
    A.plate('torso', 'primary', shieldOutline(0.26 * s, 2.3 * s, { taper: 0.88, tip: 0.14 }), 0.04 * s, {
      p: [sx * W * 0.34, chH * 0.86 - 1.38 * s, -D.torsoD * 0.58 - 0.06 * s],
      r: [0.16, sx * -0.08, sx * 0.06], round: 0.1 });
  }

  // ================= HEAD: crested knight helm =================
  const hy = hs * 0.95;
  A.tube('head', 'frame', hs * 0.4, hs * 0.48, hs * 0.6, { p: [0, hy * 0.28, 0] });
  // smooth lathe dome skull
  A.lathe('head', 'primary', [
    [-hs * 0.55, hs * 0.68],
    [hs * 0.05, hs * 0.78],
    [hs * 0.55, hs * 0.6],
    [hs * 0.85, hs * 0.22],
  ], { p: [0, hy + hs * 0.6, 0.04 * s], scaleZ: 1.1, seg: 20 });
  // blue visor slit
  A.sharpBox('head', 'glow', [hs * 0.8, hs * 0.16, 0.08 * s], {
    p: [0, hy + hs * 0.62, hs * 0.92] });
  // beveled face guard under the visor
  A.plate('head', 'primary', shieldOutline(hs * 1.05, hs * 0.7, { taper: 0.7 }), 0.07 * s, {
    p: [0, hy + hs * 0.16, hs * 0.62], r: [0.12, 0, 0], round: 0.15 });
  // gold brow band
  A.plate('head', 'accent', rhombOutline(hs * 1.5, hs * 0.42, { cut: 0.3 }), hs * 0.3, {
    p: [0, hy + hs * 1.0, hs * 0.08], r: [-0.15, 0, 0], round: 0.2 });
  // ornate gold crest blade running front-to-back (beveled plate on edge)
  A.plate('head', 'accent', rhombOutline(hs * 2.8, hs * 1.0, { cut: 0.35 }), 0.06 * s, {
    p: [0, hy + hs * 1.62, -hs * 0.15], r: [-0.12, Math.PI / 2, 0], round: 0.15 });
  // swept side wings
  for (const sx of [-1, 1]) {
    A.blade('head', 'accent', hs * 1.0, hs * 0.28, 0.04 * s, {
      p: [sx * hs * 0.64, hy + hs * 1.05, -hs * 0.1], r: [-0.5, 0, sx * 0.6], taper: 0.25 });
  }

  // ================= ARMS =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const sh = 'shoulder' + side, el = 'elbow' + side;
    J[sh].position.x = sx * (D.shoulderW + 0.24 * s);

    // pauldron: lathe shell + gold rim band + gold wing
    A.ball(sh, 'frame', 0.28 * s, {});
    A.lathe(sh, 'primary', [
      [-0.2 * s, W * 0.31],
      [0.16 * s, W * 0.27],
      [0.36 * s, W * 0.11],
    ], { p: [sx * 0.12 * s, 0.08 * s, 0], scaleZ: 0.95, seg: 20 });
    A.ring(sh, 'brass', W * 0.3, 0.028 * s, {
      p: [sx * 0.12 * s, -0.1 * s, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.95, 1] });
    A.blade(sh, 'accent', 0.7 * s, 0.28 * s, 0.05 * s, {
      p: [sx * 0.52 * s, 0.42 * s, -0.06 * s], r: [0, 0, sx * 0.55], taper: 0.3 });
    // bulged upper arm
    A.lathe(sh, 'primary', [
      [-D.upperArmLen * 0.95, 0.19 * s],
      [-D.upperArmLen * 0.55, 0.25 * s],
      [-D.upperArmLen * 0.15, 0.2 * s],
    ], { p: [sx * 0.04 * s, 0, 0], seg: 16 });
    // elbow ring
    A.part(el, 'metal', new THREE.CylinderGeometry(0.16 * s, 0.16 * s, 0.34 * s, 12), {
      r: [0, 0, Math.PI / 2] });
    // forearm: faceted vambrace with gold spine + bracelet
    A.facet(el, 'primary', 0.26 * s, 0.36 * s, 0.28 * s, fA * 1.0, {
      sides: 8, scaleZ: 1.05, p: [0, -fA * 0.52, 0] });
    A.plate(el, 'accent', rhombOutline(fA * 0.6, 0.3 * s, { cut: 0.3 }), 0.05 * s, {
      p: [0, -fA * 0.5, 0.32 * s], r: [0, 0, Math.PI / 2], round: 0.12 });
    A.ring(el, 'brass', 0.28 * s, 0.03 * s, {
      p: [0, -fA * 0.88, 0], r: [Math.PI / 2, 0, 0] });
    A.piston(el, 'brass', [sx * 0.22 * s, -0.05 * s, -0.16 * s],
      [sx * 0.26 * s, -fA * 0.6, -0.2 * s], 0.04 * s);
  }

  // ================= TOWER SHIELD (left forearm) =================
  const sh = addJoint(J, 'shield', 'elbowL', -0.44 * s, -fA * 0.5, 0.02 * s);
  sh.rotation.y = -0.1;
  // beveled plate stack: dark backing -> white tower -> gold frame -> white inner
  A.plate('shield', 'dark', shieldOutline(1.6 * s, 2.9 * s, { taper: 0.8, tip: 0.16 }), 0.07 * s, {
    p: [0, 0, 0.02 * s], round: 0.1 });
  A.plate('shield', 'primary', shieldOutline(1.75 * s, 3.1 * s, { taper: 0.82, tip: 0.16 }), 0.13 * s, {
    p: [0, 0, 0.12 * s], round: 0.09 });
  A.plate('shield', 'accent', shieldOutline(1.4 * s, 2.7 * s, { taper: 0.8, tip: 0.16 }), 0.06 * s, {
    p: [0, 0, 0.24 * s], round: 0.1 });
  A.plate('shield', 'primary', shieldOutline(1.15 * s, 2.4 * s, { taper: 0.78, tip: 0.16 }), 0.06 * s, {
    p: [0, 0, 0.3 * s], round: 0.1 });
  // glowing blue cross + gold boss at the crossing
  A.sharpBox('shield', 'glow', [0.13 * s, 2.0 * s, 0.06 * s], { p: [0, -0.1 * s, 0.36 * s] });
  A.sharpBox('shield', 'glow', [0.85 * s, 0.13 * s, 0.06 * s], { p: [0, 0.5 * s, 0.36 * s] });
  A.ring('shield', 'brass', 0.19 * s, 0.035 * s, { p: [0, 0.5 * s, 0.38 * s] });
  A.ball('shield', 'glowSoft', 0.1 * s, { p: [0, 0.5 * s, 0.4 * s], seg: 12 });
  // gold rivets + top crest ridge
  for (const [rx, ry] of [[-0.66, 1.25], [0.66, 1.25], [-0.52, -0.62], [0.52, -0.62]]) {
    A.ball('shield', 'brass', 0.05 * s, { p: [rx * s, ry * s, 0.3 * s], seg: 8 });
  }
  A.plate('shield', 'accent', rhombOutline(1.05 * s, 0.3 * s, { cut: 0.25 }), 0.07 * s, {
    p: [0, 1.56 * s, 0.16 * s], round: 0.2 });
  // grip block + frame straps across the back face
  A.sharpBox('shield', 'frame', [0.24 * s, 0.7 * s, 0.3 * s], { p: [0.3 * s, 0, -0.1 * s] });
  A.sharpBox('shield', 'frame', [1.3 * s, 0.16 * s, 0.06 * s], { p: [0, 0.75 * s, -0.04 * s] });
  A.sharpBox('shield', 'frame', [1.15 * s, 0.16 * s, 0.06 * s], { p: [0, -0.75 * s, -0.04 * s] });

  // ================= ENERGY LANCE (right hand) =================
  A.fist('handR', 'frame', 'dark', 0.3 * s, { side: 1 });
  A.tube('handR', 'dark', 0.055 * s, 0.055 * s, 0.7 * s, {
    p: [0, -0.2 * s, -0.1 * s], r: [Math.PI / 2, 0, 0] });
  // gold guard bulge
  A.lathe('handR', 'brass', [[-0.1 * s, 0.1 * s], [0.02 * s, 0.19 * s], [0.14 * s, 0.06 * s]], {
    p: [0, -0.2 * s, 0.3 * s], r: [Math.PI / 2, 0, 0] });
  // long tapered shaft
  A.tube('handR', 'metal', 0.05 * s, 0.08 * s, 2.5 * s, {
    p: [0, -0.2 * s, 1.55 * s], r: [Math.PI / 2, 0, 0] });
  A.ring('handR', 'brass', 0.085 * s, 0.022 * s, { p: [0, -0.2 * s, 1.1 * s] });
  A.ring('handR', 'brass', 0.075 * s, 0.022 * s, { p: [0, -0.2 * s, 2.1 * s] });
  // lance head socket + glowing tip
  A.lathe('handR', 'accent', [[-0.16 * s, 0.06 * s], [0, 0.13 * s], [0.2 * s, 0.03 * s]], {
    p: [0, -0.2 * s, 2.9 * s], r: [Math.PI / 2, 0, 0] });
  A.ring('handR', 'glowSoft', 0.13 * s, 0.025 * s, { p: [0, -0.2 * s, 2.98 * s] });
  A.ring('handR', 'glowSoft', 0.1 * s, 0.022 * s, { p: [0, -0.2 * s, 3.18 * s] });
  A.spike('handR', 'glow', 0.085 * s, 0.85 * s, {
    p: [0, -0.2 * s, 3.35 * s], r: [Math.PI / 2, 0, 0] });
  A.fist('handL', 'frame', 'dark', 0.26 * s, { side: -1 });

  // ================= LEGS (plantigrade) =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const th = 'thigh' + side, kn = 'knee' + side, an = 'ankle' + side;

    // hip ball + bulged thigh with gold outer plate
    A.ball(th, 'frame', 0.26 * s, {});
    A.lathe(th, 'primary', [
      [-D.thighLen * 1.0, 0.23 * s],
      [-D.thighLen * 0.55, 0.32 * s],
      [-D.thighLen * 0.1, 0.26 * s],
    ], { scaleZ: 1.1, seg: 20 });
    A.plate(th, 'accent', rhombOutline(0.38 * s, D.thighLen * 0.55, { cut: 0.28 }), 0.05 * s, {
      p: [sx * 0.3 * s, -D.thighLen * 0.5, 0.02 * s], r: [0, sx * Math.PI / 2, 0], round: 0.12 });

    // knee: joint sphere + white shield with gold trim plate
    A.ball(kn, 'metal', 0.19 * s, {});
    A.plate(kn, 'primary', shieldOutline(0.46 * s, 0.62 * s, { taper: 0.65 }), 0.1 * s, {
      p: [0, -0.02 * s, 0.28 * s], r: [0.12, 0, 0], round: 0.14 });
    A.plate(kn, 'accent', shieldOutline(0.28 * s, 0.42 * s, { taper: 0.6 }), 0.05 * s, {
      p: [0, -0.05 * s, 0.37 * s], r: [0.12, 0, 0] });
    A.piston(kn, 'brass', [0, 0.12 * s, -0.22 * s], [0, -D.shinLen * 0.4, -0.28 * s], 0.045 * s);

    // greave: calf swell + stacked white shin guards + gold hem
    A.lathe(kn, 'primary', [
      [-D.shinLen * 1.0, 0.23 * s],
      [-D.shinLen * 0.66, 0.33 * s],
      [-D.shinLen * 0.3, 0.36 * s],
      [-D.shinLen * 0.04, 0.25 * s],
    ], { scaleZ: 1.15, seg: 20 });
    A.plate(kn, 'primary', shieldOutline(0.44 * s, 0.6 * s, { taper: 0.75 }), 0.09 * s, {
      p: [0, -D.shinLen * 0.44, 0.32 * s], r: [0.06, 0, 0], round: 0.12 });
    A.plate(kn, 'primary', shieldOutline(0.5 * s, 0.64 * s, { taper: 0.72 }), 0.09 * s, {
      p: [0, -D.shinLen * 0.8, 0.3 * s], r: [-0.06, 0, 0], round: 0.12 });
    A.plate(kn, 'accent', shieldOutline(0.3 * s, 0.34 * s, { taper: 0.7 }), 0.05 * s, {
      p: [0, -D.shinLen * 0.92, 0.36 * s], r: [-0.06, 0, 0] });

    // sabaton: layered toe plates + gold toe cap + heel
    A.ball(an, 'frame', 0.17 * s, {});
    for (const tx of [-0.14, 0.14]) {
      A.part(an, 'primary', roundedBox(0.28 * s, 0.24 * s, 0.6 * s, 0.07 * s), {
        p: [tx * s, -0.13 * s, 0.28 * s], r: [-0.08, tx * 0.3, 0] });
    }
    A.plate(an, 'accent', shieldOutline(0.44 * s, 0.32 * s, { taper: 0.8 }), 0.05 * s, {
      p: [0, -0.06 * s, 0.56 * s], r: [0.62, 0, 0], round: 0.2 });
    A.facet(an, 'frame', 0.18 * s, 0.22 * s, 0.15 * s, 0.28 * s, {
      sides: 6, p: [0, -0.13 * s, -0.18 * s], r: [Math.PI / 2.4, 0, 0] });
    A.sharpBox(an, 'dark', [0.5 * s, 0.1 * s, 0.86 * s], { p: [0, -0.25 * s, 0.1 * s] });
  }

  anchors.muzzleR = addAnchor(J.handR, 0, -0.2 * s, 3.8 * s);
  anchors.shield = addAnchor(J.shield, 0, 0, 0.3 * s);
  anchors.core = addAnchor(J.torso, 0, chH * 0.66, W * 0.5);
}
