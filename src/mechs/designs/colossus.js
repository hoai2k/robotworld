// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 9. COLOSSUS — sculpted rebuild: the walking artillery bunker.
//    Extra-wide fortress chest with stacked sloped slab courses,
//    head embedded in the chest behind a visor slit, twin long
//    mortar tubes on an aiming joint over the back, hex bastion
//    pauldrons, hazard skirt, huge three-toed feet.
// ============================================================
export function colossus(A, D, J, anchors, def) {
  const s = D.scale;
  const W = D.torsoW;   // ~2.28 — widest torso in the roster
  const chH = D.torsoH;
  const hs = D.headSize;

  const plateMat = (skin, decal) => {
    const tex = decalTexture({ seed: def.seed + (skin === 'accent' ? 5 : 0), ...def.skin[skin] }, decal);
    return new THREE.MeshStandardMaterial({
      map: tex.map, normalMap: tex.normalMap,
      roughnessMap: tex.rmMap, metalnessMap: tex.rmMap,
      roughness: 1, metalness: 1,
    });
  };

  // ================= WAIST / PELVIS: fortress skirt ring =================
  A.lathe('hips', 'frame', [[0.62 * s, W * 0.28], [0.3 * s, W * 0.22], [-0.05 * s, W * 0.28]], {
    scaleX: 1.3 });
  for (let i = 0; i < 3; i++) {
    A.tube('hips', 'dark', W * (0.24 - i * 0.013), W * (0.25 - i * 0.013), 0.08 * s, {
      p: [0, 0.12 * s + i * 0.17 * s, 0] });
  }
  A.facet('hips', 'primary', W * 0.38, W * 0.46, W * 0.34, 0.95 * s, {
    sides: 8, scaleZ: 0.78, p: [0, -0.45 * s, 0] });
  // hazard-striped front skirt
  A.custom('hips', plateMat('primary', { stripes: true }),
    beveledPlate(shieldOutline(W * 0.44, 0.9 * s, { taper: 0.64 }), 0.1 * s, { round: 0.1 }), {
      p: [0, -0.58 * s, W * 0.36], r: [0.12, 0, 0] });
  for (const sx of [-1, 1]) {
    A.plate('hips', 'primary', shieldOutline(W * 0.36, 0.8 * s, { taper: 0.68 }), 0.09 * s, {
      p: [sx * W * 0.46, -0.52 * s, 0], r: [0.08, sx * Math.PI / 2, sx * 0.12] });
  }
  A.plate('hips', 'accent', shieldOutline(W * 0.4, 0.72 * s, { taper: 0.7 }), 0.08 * s, {
    p: [0, -0.55 * s, -W * 0.32], r: [-0.1, Math.PI, 0] });

  // ================= TORSO: extra-wide sculpted fortress =================
  A.lathe('torso', 'primary', [
    [chH * 0.1, W * 0.34],
    [chH * 0.34, W * 0.55],
    [chH * 0.6, W * 0.6],
    [chH * 0.88, W * 0.57],
    [chH * 1.04, W * 0.42],
    [chH * 1.1, W * 0.22],
  ], { scaleX: 1.55, scaleZ: 0.78, seg: 30 });
  // stacked sloped slab courses on the front (glacis armor)
  for (let i = 0; i < 3; i++) {
    A.plate('torso', i === 1 ? 'accent' : 'primary',
      rhombOutline(W * (1.04 - i * 0.14), 0.52 * s, { cut: 0.16 }), 0.13 * s, {
        p: [0, chH * (0.22 + i * 0.24), W * 0.46 - i * 0.03 * s],
        r: [-0.16 + i * 0.05, 0, 0], round: 0.08 });
  }
  // nameplate across the glacis top
  A.custom('torso', plateMat('accent', {
    text: 'COLOSSUS', textY: 0.44, textScale: 0.135, color: '#e6d9b8',
  }), beveledPlate(rhombOutline(W * 0.78, 0.44 * s, { cut: 0.2 }), 0.1 * s, { round: 0.1 }), {
    p: [0, chH * 0.88, W * 0.42], r: [-0.28, 0, 0] });
  // flanking louvers + collar walls forming the head notch
  for (const sx of [-1, 1]) {
    A.vents('torso', 'dark', 4, W * 0.28, 0.14 * s, 0.05 * s, {
      p: [sx * W * 0.56, chH * 0.66, W * 0.3], r: [0, sx * 0.55, 0] });
    A.plate('torso', 'primary', shieldOutline(0.72 * s, 0.42 * s, { taper: 0.8 }), 0.1 * s, {
      p: [sx * W * 0.32, chH * 1.0, 0.34 * s], r: [0.25, sx * 0.65, 0], round: 0.15 });
    A.piston('torso', 'brass', [sx * W * 0.2, chH * -0.02, W * 0.12],
      [sx * W * 0.44, chH * 0.28, W * 0.2], 0.05 * s);
    // coolant drums low on the back sides
    A.capsule('torso', 'metal', 0.16 * s, 0.5 * s, { p: [sx * W * 0.56, chH * 0.28, -W * 0.3] });
  }
  // abdomen rings
  for (let i = 0; i < 2; i++) {
    A.tube('torso', 'dark', W * (0.22 - i * 0.02), W * (0.24 - i * 0.02), 0.1 * s, {
      p: [0, chH * (0.05 - i * 0.08), 0] });
  }
  // back housing under the mortar deck
  A.facet('torso', 'accent', W * 0.44, W * 0.5, W * 0.42, chH * 0.6, {
    sides: 8, scaleZ: 0.5, p: [0, chH * 0.5, -W * 0.4] });
  A.vents('torso', 'dark', 6, W * 0.62, chH * 0.26, 0.06 * s, { p: [0, chH * 0.48, -W * 0.6] });

  // ================= HEAD: embedded visor block =================
  const hy = hs * 0.55;
  A.facet('head', 'frame', hs * 1.1, hs * 1.25, hs * 0.95, hs * 1.05, {
    sides: 8, scaleZ: 0.85, p: [0, hy + hs * 0.4, 0.1 * s] });
  A.sharpBox('head', 'dark', [hs * 1.9, hs * 0.45, hs * 0.22], { p: [0, hy + hs * 0.42, hs * 0.96] });
  A.sharpBox('head', 'glow', [hs * 1.6, hs * 0.2, hs * 0.12], { p: [0, hy + hs * 0.42, hs * 1.14] });
  // low armored dome roof overhanging the visor
  A.lathe('head', 'primary', [
    [-hs * 0.05, hs * 1.18],
    [hs * 0.28, hs * 1.02],
    [hs * 0.5, hs * 0.5],
  ], { p: [0, hy + hs * 0.72, 0.06 * s], scaleZ: 0.95, seg: 18 });
  A.antenna('head', 'metal', 'glowSoft', hs * 1.0, { p: [hs * 0.75, hy + hs * 0.9, -hs * 0.3] });

  // ================= MORTARS: twin long tubes on the aiming joint =================
  const mort = addJoint(J, 'mortars', 'torso', 0, chH * 0.92, -D.torsoD * 0.45);
  const tilt = 0.38; // forward elevation; animator pitches when firing
  const dY = Math.cos(tilt), dZ = Math.sin(tilt);
  const tubeL = 2.75 * s;
  const B = [0.74 * s, -0.2 * s, -0.15 * s]; // per-side tube base (x mirrored)
  for (const sx of [-1, 1]) {
    const bx = sx * B[0];
    const at = (f) => [bx, B[1] + dY * tubeL * f, B[2] + dZ * tubeL * f];
    // trunnion cradle + breech block
    A.part('mortars', 'frame', new THREE.CylinderGeometry(0.24 * s, 0.24 * s, 0.55 * s, 12), {
      p: [bx, 0, -0.1 * s], r: [0, 0, Math.PI / 2] });
    A.facet('mortars', 'accent', 0.28 * s, 0.36 * s, 0.3 * s, 0.75 * s, {
      sides: 8, p: at(0.14), r: [tilt, 0, 0] });
    // long tube, flared reinforced muzzle
    A.tube('mortars', 'metal', 0.29 * s, 0.22 * s, tubeL, { p: at(0.5), r: [tilt, 0, 0] });
    A.tube('mortars', 'dark', 0.32 * s, 0.32 * s, 0.24 * s, { p: at(0.95), r: [tilt, 0, 0] });
    A.tube('mortars', 'glowSoft', 0.2 * s, 0.2 * s, 0.05 * s, { p: at(0.985), r: [tilt, 0, 0] });
    // reinforcing rings + brass recuperator
    for (const f of [0.38, 0.62]) {
      A.ring('mortars', 'metal', 0.29 * s, 0.04 * s, { p: at(f), r: [tilt - Math.PI / 2, 0, 0] });
    }
    A.piston('mortars', 'brass',
      [bx - sx * 0.3 * s, 0.05 * s, -0.25 * s],
      [bx - sx * 0.3 * s + 0, 0.05 * s + dY * 1.15 * s, -0.25 * s + dZ * 1.15 * s], 0.05 * s);
    // ammo drum under the breech
    A.capsule('mortars', 'accent', 0.19 * s, 0.4 * s, {
      p: [sx * 0.32 * s, -0.28 * s, -0.3 * s], r: [0, 0, Math.PI / 2] });
  }
  // cross brace between the tubes
  A.capsule('mortars', 'frame', 0.09 * s, 1.1 * s, { p: [0, 0.35 * s, 0.02 * s], r: [0, 0, Math.PI / 2] });
  // muzzle anchors exactly at the tube mouths (on J.mortars — pitches with it)
  anchors.muzzleR = addAnchor(J.mortars, B[0], B[1] + dY * tubeL, B[2] + dZ * tubeL);
  anchors.muzzleL = addAnchor(J.mortars, -B[0], B[1] + dY * tubeL, B[2] + dZ * tubeL);

  // ================= ARMS: hex bastion pauldrons, shielded forearms =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const sh = 'shoulder' + side, el = 'elbow' + side, ha = 'hand' + side;
    J[sh].position.x = sx * (D.shoulderW + 0.4 * s);

    A.ball(sh, 'frame', 0.32 * s, {});
    // hex bastion pauldron + '99' battery number on the outer face
    A.facet(sh, 'primary', 0.52 * s, 0.64 * s, 0.44 * s, 0.9 * s, {
      sides: 6, scaleZ: 0.95, p: [sx * 0.1 * s, 0.12 * s, 0] });
    A.plate(sh, 'dark', rhombOutline(0.8 * s, 0.7 * s, { cut: 0.3 }), 0.05 * s, {
      p: [sx * 0.1 * s, 0.58 * s, 0], r: [Math.PI / 2, 0, 0], round: 0.2 });
    A.custom(sh, plateMat('accent', { text: '99', textY: 0.46, textScale: 0.32, color: '#e6d9b8', alpha: 0.85 }),
      beveledPlate(rhombOutline(0.56 * s, 0.52 * s, { cut: 0.3 }), 0.06 * s, { round: 0.15 }), {
        p: [sx * 0.7 * s, 0.14 * s, 0], r: [0, sx * Math.PI / 2, 0] });
    // bulged upper arm
    A.lathe(sh, 'primary', [
      [-D.upperArmLen * 0.98, 0.23 * s],
      [-D.upperArmLen * 0.55, 0.29 * s],
      [-D.upperArmLen * 0.12, 0.24 * s],
    ], { p: [sx * 0.04 * s, 0, 0], seg: 16 });
    A.part(el, 'metal', new THREE.CylinderGeometry(0.18 * s, 0.18 * s, 0.42 * s, 12), {
      r: [0, 0, Math.PI / 2] });
    // faceted forearm + tower-shield front plate
    A.facet(el, 'primary', 0.38 * s, 0.52 * s, 0.42 * s, D.foreArmLen * 1.02, {
      sides: 8, scaleZ: 1.05, p: [0, -D.foreArmLen * 0.52, 0] });
    A.plate(el, 'accent', shieldOutline(0.56 * s, D.foreArmLen * 0.85, { taper: 0.85 }), 0.09 * s, {
      p: [0, -D.foreArmLen * 0.55, 0.46 * s], r: [0.03, 0, 0], round: 0.12 });
    A.piston(el, 'brass', [sx * 0.3 * s, -0.08 * s, -0.22 * s],
      [sx * 0.3 * s, -D.foreArmLen * 0.66, -0.28 * s], 0.05 * s);
    // rounded working fist
    const fw = 0.4 * s;
    A.tube(ha, 'frame', 0.3 * s, 0.34 * s, 0.26 * s, { p: [0, 0.05 * s, 0] });
    A.part(ha, 'frame', roundedBox(fw * 1.8, fw * 1.5, fw * 1.7, fw * 0.42), {
      p: [0, -fw * 0.8, fw * 0.1] });
    for (let i = 0; i < 4; i++) {
      A.capsule(ha, 'dark', fw * 0.24, fw * 0.28, {
        p: [(i - 1.5) * fw * 0.42, -fw * 0.9, fw * 0.95], r: [Math.PI / 2, 0, 0] });
    }
    A.capsule(ha, 'dark', fw * 0.22, fw * 0.3, {
      p: [sx * fw * 0.92, -fw * 0.55, fw * 0.25], r: [0.5, 0, sx * 0.4] });
  }

  // ================= LEGS: bunker piers, three-toed feet =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const th = 'thigh' + side, kn = 'knee' + side, an = 'ankle' + side;

    A.ball(th, 'frame', 0.3 * s, {});
    A.lathe(th, 'primary', [
      [-D.thighLen * 1.0, 0.28 * s],
      [-D.thighLen * 0.55, 0.42 * s],
      [-D.thighLen * 0.08, 0.33 * s],
    ], { scaleZ: 1.08, seg: 20 });
    A.plate(th, 'accent', rhombOutline(0.5 * s, D.thighLen * 0.6, { cut: 0.26 }), 0.07 * s, {
      p: [sx * 0.4 * s, -D.thighLen * 0.5, 0.02 * s], r: [0, sx * Math.PI / 2, 0], round: 0.12 });

    A.part(kn, 'metal', new THREE.CylinderGeometry(0.22 * s, 0.22 * s, 0.48 * s, 12), {
      r: [0, 0, Math.PI / 2] });
    A.plate(kn, 'accent', shieldOutline(0.54 * s, 0.66 * s, { taper: 0.62 }), 0.1 * s, {
      p: [0, -0.02 * s, 0.34 * s], r: [0.15, 0, 0], round: 0.14 });
    A.piston(kn, 'brass', [0, 0.14 * s, -0.28 * s], [0, -D.shinLen * 0.4, -0.34 * s], 0.055 * s);

    A.lathe(kn, 'primary', [
      [-D.shinLen * 1.0, 0.3 * s],
      [-D.shinLen * 0.64, 0.42 * s],
      [-D.shinLen * 0.28, 0.46 * s],
      [-D.shinLen * 0.05, 0.3 * s],
    ], { scaleZ: 1.12, seg: 20 });
    // stacked sandbag-course shin guards, hazard at the bottom
    A.plate(kn, 'primary', shieldOutline(0.54 * s, 0.6 * s, { taper: 0.78 }), 0.09 * s, {
      p: [0, -D.shinLen * 0.36, 0.42 * s], r: [0.05, 0, 0], round: 0.12 });
    A.plate(kn, 'accent', shieldOutline(0.58 * s, 0.6 * s, { taper: 0.75 }), 0.09 * s, {
      p: [0, -D.shinLen * 0.6, 0.4 * s], r: [0, 0, 0], round: 0.12 });
    A.custom(kn, plateMat('primary', { stripes: true }),
      beveledPlate(shieldOutline(0.62 * s, 0.66 * s, { taper: 0.72 }), 0.09 * s, { round: 0.12 }), {
        p: [0, -D.shinLen * 0.84, 0.37 * s], r: [-0.05, 0, 0] });

    // ankle + huge three-toed foot
    A.ball(an, 'frame', 0.22 * s, {});
    for (const tx of [-0.27, 0, 0.27]) {
      A.part(an, 'primary', roundedBox(0.33 * s, 0.3 * s, 0.8 * s, 0.08 * s), {
        p: [tx * s, -0.12 * s, 0.34 * s], r: [-0.06, tx * 0.25, 0] });
    }
    A.facet(an, 'frame', 0.24 * s, 0.28 * s, 0.2 * s, 0.36 * s, {
      sides: 6, p: [0, -0.12 * s, -0.24 * s], r: [Math.PI / 2.4, 0, 0] });
    A.sharpBox(an, 'dark', [0.85 * s, 0.12 * s, 1.15 * s], { p: [0, -0.26 * s, 0.12 * s] });
  }

  anchors.core = addAnchor(J.torso, 0, chH * 0.55, W * 0.45);
}
