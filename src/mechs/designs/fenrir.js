// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 8. FENRIR — wolf chassis, sculpted rebuild. Silver-gray hunter:
//    hunched bulging chest ringed by a spiked mane, sculpted wolf
//    head (dome cranium, flattened capsule snout, hanging jaw,
//    tall two-layer ears, ice-blue slanted eyes), talon claws,
//    digitigrade raptor legs and a three-segment wagging tail.
// ============================================================
export function fenrir(A, D, J, anchors, def) {
  const s = D.scale;
  const W = D.torsoW;
  const chH = D.torsoH;
  const hs = D.headSize;
  const ua = D.upperArmLen, fa = D.foreArmLen;

  const plateMat = (decal) => {
    const tex = decalTexture({ seed: def.seed, ...def.skin.primary }, decal);
    return new THREE.MeshStandardMaterial({
      map: tex.map, normalMap: tex.normalMap,
      roughnessMap: tex.rmMap, metalnessMap: tex.rmMap,
      roughness: 1, metalness: 1,
    });
  };

  // ================= WAIST / PELVIS =================
  A.lathe('hips', 'frame', [[-0.1 * s, W * 0.26], [0.24 * s, W * 0.175], [0.55 * s, W * 0.23]], {
    scaleX: 1.2, seg: 18 });
  for (let i = 0; i < 2; i++) {
    A.tube('hips', 'dark', W * 0.185, W * 0.195, 0.07 * s, { p: [0, (0.1 + i * 0.17) * s, 0] });
  }
  A.facet('hips', 'primary', W * 0.3, W * 0.38, W * 0.26, 0.75 * s, {
    sides: 6, scaleZ: 0.8, p: [0, -0.4 * s, 0] });
  // skirt plates: dark front fang, silver sides
  A.plate('hips', 'accent', shieldOutline(W * 0.32, 0.7 * s, { taper: 0.55 }), 0.07 * s, {
    p: [0, -0.5 * s, W * 0.27], r: [0.15, 0, 0], round: 0.12 });
  for (const sx of [-1, 1]) {
    A.plate('hips', 'primary', shieldOutline(W * 0.3, 0.6 * s, { taper: 0.65 }), 0.06 * s, {
      p: [sx * W * 0.36, -0.46 * s, 0], r: [0.08, sx * Math.PI / 2, sx * 0.15], round: 0.12 });
  }
  // rear haunch guard under the tail root
  A.facet('hips', 'dark', W * 0.18, W * 0.22, W * 0.15, 0.42 * s, {
    sides: 6, scaleZ: 0.7, p: [0, -0.42 * s, -W * 0.22] });

  // ================= TORSO: hunched wolf chest =================
  A.lathe('torso', 'primary', [
    [chH * 0.06, W * 0.3],
    [chH * 0.36, W * 0.48],
    [chH * 0.66, W * 0.56],
    [chH * 0.92, W * 0.48],
    [chH * 1.06, W * 0.24],
  ], { scaleX: 1.3, scaleZ: 0.72, seg: 24, r: [0.09, 0, 0] });
  // pec pontoons + intake slits
  for (const sx of [-1, 1]) {
    A.capsule('torso', 'primary', W * 0.14, W * 0.24, {
      p: [sx * W * 0.3, chH * 0.8, W * 0.3], r: [0.55, 0, sx * -1.2], s: [1, 1, 0.7] });
    A.vents('torso', 'dark', 3, W * 0.22, 0.08 * s, 0.04 * s, {
      p: [sx * W * 0.3, chH * 0.56, W * 0.36], r: [0.3, 0, 0] });
  }
  // abdomen rings
  for (let i = 0; i < 2; i++) {
    A.tube('torso', 'dark', W * (0.19 - i * 0.02), W * (0.21 - i * 0.02), 0.08 * s, {
      p: [0, chH * (0.02 - i * 0.1), 0] });
  }
  // chest nameplate (decal skin)
  A.custom('torso', plateMat({
    text: 'FENRIR', textY: 0.42, textScale: 0.15, color: '#232a33', alpha: 0.9,
  }), beveledPlate(shieldOutline(W * 0.42, chH * 0.38, { taper: 0.66 }), 0.08 * s, { round: 0.12 }), {
    p: [0, chH * 0.42, W * 0.36], r: [0.02, 0, 0] });
  // spiked mane: two fanned rows around the neck
  for (let i = 0; i < 7; i++) {
    const a = (i / 6 - 0.5) * Math.PI * 1.1;
    A.blade('torso', 'metal', 1.15 * s, 0.24 * s, 0.05 * s, {
      p: [Math.sin(a) * W * 0.52, chH * 0.98, (-Math.cos(a) * 0.52 + 0.1) * W],
      r: [-0.55 - Math.abs(a) * 0.16, 0, -a * 0.62], taper: 0.06 });
  }
  for (let i = 0; i < 6; i++) {
    const a = (i / 5 - 0.5) * Math.PI * 0.95;
    A.blade('torso', 'primary', 0.8 * s, 0.22 * s, 0.05 * s, {
      p: [Math.sin(a) * W * 0.42, chH * 0.88, (-Math.cos(a) * 0.42 + 0.1) * W],
      r: [-0.72 - Math.abs(a) * 0.16, 0, -a * 0.62], taper: 0.12 });
  }
  // collar ring the mane grows from
  A.tube('torso', 'frame', W * 0.15, W * 0.18, 0.16 * s, { p: [0, chH * 1.0, 0.04 * s] });
  // back pack + radiator vents + coolant drums
  A.facet('torso', 'accent', W * 0.34, W * 0.4, W * 0.32, chH * 0.52, {
    sides: 8, scaleZ: 0.55, p: [0, chH * 0.5, -W * 0.36] });
  A.vents('torso', 'dark', 5, W * 0.48, chH * 0.22, 0.05 * s, {
    p: [0, chH * 0.5, -W * 0.6] });
  for (const sx of [-1, 1]) {
    A.capsule('torso', 'metal', 0.1 * s, 0.3 * s, {
      p: [sx * W * 0.24, chH * 0.82, -W * 0.36], r: [0, 0, Math.PI / 2] });
  }
  // brass waist pistons
  for (const sx of [-1, 1]) {
    A.piston('torso', 'brass', [sx * W * 0.15, chH * -0.02, -W * 0.08],
      [sx * W * 0.32, chH * 0.3, -W * 0.12], 0.04 * s);
  }

  // ================= HEAD: sculpted wolf skull =================
  const hy = hs * 1.0;
  const hh = hs * 1.3; // wolf head unit — reads bigger than the humanoid base
  A.tube('head', 'frame', hs * 0.36, hs * 0.46, hs * 1.0, { p: [0, hy * 0.32, 0] });
  // cranium dome
  A.lathe('head', 'primary', [
    [-hh * 0.42, hh * 0.52],
    [hh * 0.05, hh * 0.6],
    [hh * 0.45, hh * 0.46],
    [hh * 0.62, hh * 0.18],
  ], { p: [0, hy + hh * 0.42, -hh * 0.15], scaleX: 0.95, scaleZ: 1.15, seg: 20 });
  // flattened capsule snout, jutting well forward
  A.capsule('head', 'primary', hh * 0.3, hh * 0.7, {
    p: [0, hy + hh * 0.34, hh * 0.72], r: [Math.PI / 2, 0, 0], s: [0.85, 1, 0.7] });
  // snout bridge plate
  A.plate('head', 'primary', rhombOutline(hh * 0.44, hh * 0.9, { cut: 0.3 }), hh * 0.1, {
    p: [0, hy + hh * 0.53, hh * 0.68], r: [-Math.PI / 2 + 0.12, 0, 0], round: 0.2 });
  // nose tip
  A.ball('head', 'dark', hh * 0.11, { p: [0, hy + hh * 0.38, hh * 1.32], seg: 10 });
  // hanging jaw, slightly open
  A.taper('head', 'dark', [hh * 0.4, hh * 0.8, hh * 0.28], 0.5, 0.5, {
    p: [0, hy + hh * 0.02, hh * 0.62], r: [Math.PI / 2 + 0.35, 0, 0] });
  // fangs: upper pair down, lower pair up
  for (const sx of [-1, 1]) {
    A.spike('head', 'metal', 0.032 * s, 0.16 * s, {
      p: [sx * hh * 0.19, hy + hh * 0.16, hh * 1.08], r: [Math.PI, 0, 0], seg: 5 });
    A.spike('head', 'metal', 0.026 * s, 0.12 * s, {
      p: [sx * hh * 0.15, hy + hh * 0.02, hh * 0.9], seg: 5 });
    // tall two-layer ears
    A.blade('head', 'primary', hh * 1.0, hh * 0.48, 0.055 * s, {
      p: [sx * hh * 0.38, hy + hh * 0.92, -hh * 0.35], r: [-0.3, 0, sx * 0.32], taper: 0.08 });
    A.blade('head', 'dark', hh * 0.66, hh * 0.28, 0.034 * s, {
      p: [sx * hh * 0.38, hy + hh * 0.86, -hh * 0.29], r: [-0.3, 0, sx * 0.32], taper: 0.12 });
    // ice-blue slanted eyes on the cranium-snout junction
    A.sharpBox('head', 'glow', [hh * 0.34, hh * 0.1, 0.05 * s], {
      p: [sx * hh * 0.3, hy + hh * 0.58, hh * 0.52], r: [0, sx * 0.32, sx * -0.3] });
  }
  // brow plate shading the eyes
  A.plate('head', 'frame', rhombOutline(hh * 1.0, hh * 0.34, { cut: 0.3 }), hh * 0.24, {
    p: [0, hy + hh * 0.68, hh * 0.22], r: [-0.32, 0, 0], round: 0.2 });
  // cheek guards
  for (const sx of [-1, 1]) {
    A.plate('head', 'accent', rhombOutline(hh * 0.5, hh * 0.38, { cut: 0.3 }), hh * 0.08, {
      p: [sx * hh * 0.44, hy + hh * 0.3, hh * 0.1], r: [0, sx * (Math.PI / 2 - 0.25), 0], round: 0.2 });
  }

  // ================= ARMS: pauldron shells + talon claws =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const sh = 'shoulder' + side, el = 'elbow' + side, ha = 'hand' + side;
    J[sh].position.x = sx * (D.shoulderW + 0.12 * s);

    A.ball(sh, 'frame', 0.24 * s, {});
    // rounded pauldron shell + side plate
    A.lathe(sh, 'primary', [
      [-0.2 * s, 0.36 * s],
      [0.12 * s, 0.32 * s],
      [0.36 * s, 0.12 * s],
    ], { p: [sx * 0.1 * s, 0.05 * s, 0], scaleZ: 0.9, seg: 18 });
    A.plate(sh, 'accent', rhombOutline(0.34 * s, 0.3 * s, { cut: 0.3 }), 0.05 * s, {
      p: [sx * 0.36 * s, 0.1 * s, 0], r: [0, sx * Math.PI / 2, 0], round: 0.15 });
    // steel guard-hair spikes off the pauldron
    for (let i = 0; i < 3; i++) {
      A.spike(sh, 'metal', 0.05 * s, (0.42 - i * 0.08) * s, {
        p: [sx * (0.22 + i * 0.08) * s, (0.32 - i * 0.09) * s, -0.04 * s],
        r: [0, 0, sx * -(0.7 + i * 0.35)], seg: 6 });
    }
    // bulged upper arm
    A.lathe(sh, 'frame', [
      [-ua * 0.96, 0.14 * s],
      [-ua * 0.5, 0.2 * s],
      [-ua * 0.12, 0.16 * s],
    ], { seg: 14 });
    A.part(el, 'metal', cyl(0.14 * s, 0.14 * s, 0.3 * s, 10), { r: [0, 0, Math.PI / 2] });
    // forearm: faceted housing + elbow spur fin + piston
    A.facet(el, 'primary', 0.18 * s, 0.26 * s, 0.2 * s, fa * 0.95, {
      sides: 8, scaleZ: 1.08, p: [0, -fa * 0.5, 0] });
    A.blade(el, 'accent', 0.5 * s, 0.16 * s, 0.04 * s, {
      p: [0, -fa * 0.28, -0.24 * s], r: [Math.PI - 0.35, 0, 0], taper: 0.15 });
    A.piston(el, 'brass', [sx * 0.14 * s, -0.06 * s, -0.12 * s],
      [sx * 0.17 * s, -fa * 0.55, -0.16 * s], 0.035 * s);
    // claw hand: faceted palm, three steel talons + thumb
    A.facet(ha, 'frame', 0.13 * s, 0.17 * s, 0.12 * s, 0.32 * s, { sides: 6, p: [0, -0.08 * s, 0] });
    A.ring(ha, 'brass', 0.14 * s, 0.028 * s, { p: [0, 0.07 * s, 0], r: [Math.PI / 2, 0, 0] });
    for (let i = -1; i <= 1; i++) {
      A.spike(ha, 'metal', 0.045 * s, 0.6 * s, {
        p: [i * 0.11 * s, -0.4 * s, 0.08 * s], r: [Math.PI - 0.3, 0, i * 0.12], seg: 6 });
    }
    A.spike(ha, 'metal', 0.04 * s, 0.4 * s, {
      p: [sx * 0.13 * s, -0.26 * s, -0.02 * s], r: [Math.PI - 0.15, 0, sx * 0.5], seg: 6 });
  }

  // ================= TAIL: three chained segments =================
  let parent = 'hips';
  const segLen = [0.8 * s, 0.7 * s, 0.62 * s];
  for (let i = 0; i < 3; i++) {
    addJoint(J, 'tail' + i, parent, 0, i === 0 ? -0.05 * s : 0, i === 0 ? -0.45 * s : -segLen[i - 1]);
    const r0 = (0.15 - i * 0.035) * s;
    A.capsule('tail' + i, i === 2 ? 'accent' : 'primary', r0, segLen[i] * 0.66, {
      p: [0, 0, -segLen[i] * 0.5], r: [Math.PI / 2, 0, 0], s: [1, 1, 0.85] });
    A.ring('tail' + i, 'dark', r0 * 0.95, 0.028 * s, { p: [0, 0, -0.04 * s] });
    // dorsal guard-hair fin per segment
    A.blade('tail' + i, 'metal', (0.34 - i * 0.05) * s, 0.1 * s, 0.03 * s, {
      p: [0, r0 * 0.75, -segLen[i] * 0.5], r: [-0.55, 0, 0], taper: 0.1 });
    parent = 'tail' + i;
  }
  A.spike('tail2', 'glow', 0.05 * s, 0.35 * s, {
    p: [0, 0, -segLen[2] - 0.08 * s], r: [-Math.PI / 2, 0, 0], seg: 6 });

  // ================= LEGS: digitigrade raptor =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const th = 'thigh' + side, kn = 'knee' + side, an = 'ankle' + side;
    const tl = D.thighLen, sl = D.shinLen;

    A.ball(th, 'frame', 0.22 * s, {});
    // bulged haunch thigh (rest pose angles it forward)
    A.lathe(th, 'primary', [
      [-tl * 1.0, 0.15 * s],
      [-tl * 0.58, 0.27 * s],
      [-tl * 0.15, 0.21 * s],
    ], { scaleZ: 1.3, seg: 18, p: [0, 0, 0.04 * s] });
    A.plate(th, 'accent', rhombOutline(0.34 * s, tl * 0.55, { cut: 0.28 }), 0.05 * s, {
      p: [sx * 0.25 * s, -tl * 0.45, 0.05 * s], r: [0, sx * Math.PI / 2, 0], round: 0.15 });
    A.piston(th, 'brass', [0, -tl * 0.18, -0.17 * s], [0, -tl * 0.85, -0.21 * s], 0.035 * s);

    A.ball(kn, 'metal', 0.14 * s, {});
    A.plate(kn, 'accent', shieldOutline(0.3 * s, 0.4 * s, { taper: 0.6 }), 0.06 * s, {
      p: [0, -0.03 * s, 0.18 * s], r: [0.2, 0, 0], round: 0.15 });
    // slim calf with hock fin
    A.lathe(kn, 'primary', [
      [-sl * 1.0, 0.1 * s],
      [-sl * 0.68, 0.17 * s],
      [-sl * 0.34, 0.2 * s],
      [-sl * 0.06, 0.13 * s],
    ], { scaleZ: 1.22, seg: 16 });
    A.blade(kn, 'metal', 0.6 * s, 0.15 * s, 0.035 * s, {
      p: [0, -sl * 0.45, -0.19 * s], r: [Math.PI - 0.3, 0, 0], taper: 0.12 });
    A.plate(kn, 'primary', shieldOutline(0.22 * s, sl * 0.48, { taper: 0.7 }), 0.05 * s, {
      p: [0, -sl * 0.56, 0.17 * s], r: [0.04, 0, 0], round: 0.15 });

    // clawed foot with steel talons
    A.ball(an, 'frame', 0.13 * s, {});
    A.taper(an, 'frame', [0.26 * s, 0.24 * s, 0.46 * s], 0.7, 0.5, { p: [0, -0.2 * s, 0.08 * s] });
    for (let i = -1; i <= 1; i++) {
      A.spike(an, 'metal', 0.055 * s, 0.5 * s, {
        p: [i * 0.11 * s, -0.2 * s, 0.3 * s], r: [2.0, 0, i * 0.25], seg: 6 });
    }
    A.spike(an, 'metal', 0.045 * s, 0.32 * s, {
      p: [0, -0.16 * s, -0.16 * s], r: [-2.1, 0, 0], seg: 6 });
  }

  anchors.muzzleR = addAnchor(J.handR, 0, -0.3 * s, 0.3 * s);
  anchors.clawL = addAnchor(J.handL, 0, -0.7 * s, 0.2 * s);
  anchors.clawR = addAnchor(J.handR, 0, -0.7 * s, 0.2 * s);
}
