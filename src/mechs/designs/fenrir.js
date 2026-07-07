// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 8. FENRIR — the silver werewolf, matched to the canonical
//    concept. Big snarling wolf head (faceted cranium, open steel-
//    fanged jaw, tall two-layer ears), a huge three-row spiked mane
//    ruff down to the shoulders, V-layered pec plates over exposed
//    dark abdomen mechanics, long polished-steel talon hands,
//    muscular digitigrade legs, and a long armored tail in a low
//    S-curve ending in a curved blade. Bare polished silver over a
//    dark steel frame; ice-blue glow only at eyes/joints/tail tip.
// ============================================================
export function fenrir(A, D, J, anchors, def) {
  const s = D.scale;
  const W = D.torsoW;
  const chH = D.torsoH;
  const hs = D.headSize;
  const ua = D.upperArmLen, fa = D.foreArmLen;

  const plateMat = (decal) => {
    const tex = decalTexture({ seed: def.seed + 5, ...def.skin.accent }, decal);
    return new THREE.MeshStandardMaterial({
      map: tex.map, normalMap: tex.normalMap,
      roughnessMap: tex.rmMap, metalnessMap: tex.rmMap,
      roughness: 1, metalness: 1,
    });
  };
  // hand-drawn angular wolf-head emblem on weathered silver (chest plate)
  const wolfMat = (() => {
    const c = document.createElement('canvas');
    c.width = c.height = 256;
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#87909a';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 120; i++) { // brushed-metal streaks
      const g = 120 + Math.random() * 50;
      ctx.fillStyle = `rgba(${g | 0},${g + 6 | 0},${g + 12 | 0},0.25)`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 14 + Math.random() * 40, 1.5);
    }
    ctx.fillStyle = '#20262d'; // angular wolf head, front-facing
    ctx.beginPath();
    ctx.moveTo(44, 38); ctx.lineTo(98, 72); ctx.lineTo(158, 72); ctx.lineTo(212, 38);
    ctx.lineTo(224, 122); ctx.lineTo(172, 152); ctx.lineTo(152, 208); ctx.lineTo(128, 236);
    ctx.lineTo(104, 208); ctx.lineTo(84, 152); ctx.lineTo(32, 122);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6cd8ff'; // slanted eyes
    ctx.beginPath(); ctx.moveTo(84, 118); ctx.lineTo(120, 132); ctx.lineTo(90, 142); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(172, 118); ctx.lineTo(136, 132); ctx.lineTo(166, 142); ctx.closePath(); ctx.fill();
    for (let i = 0; i < 160; i++) { // chips & grime
      const g = 40 + Math.random() * 80;
      ctx.fillStyle = `rgba(${g | 0},${g | 0},${g | 0},${0.08 + Math.random() * 0.25})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 2 + Math.random() * 5, 2 + Math.random() * 4);
    }
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({ map: tex, roughness: 0.42, metalness: 0.72 });
  })();

  // ================= WAIST / PELVIS =================
  A.lathe('hips', 'frame', [[-0.1 * s, W * 0.26], [0.24 * s, W * 0.175], [0.55 * s, W * 0.23]], {
    scaleX: 1.2, seg: 18 });
  for (let i = 0; i < 2; i++) { // exposed abdomen mechanics continue down
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
  // V-tapered layered pec plates over capsule muscle
  for (const sx of [-1, 1]) {
    A.capsule('torso', 'primary', W * 0.14, W * 0.24, {
      p: [sx * W * 0.3, chH * 0.8, W * 0.3], r: [0.55, 0, sx * -1.2], s: [1, 1, 0.7] });
    A.plate('torso', 'primary', rhombOutline(W * 0.4, chH * 0.4, { cut: 0.3 }), 0.07 * s, {
      p: [sx * W * 0.23, chH * 0.74, W * 0.345], r: [-0.14, sx * 0.3, sx * 0.5], round: 0.12 });
    A.plate('torso', 'accent', rhombOutline(W * 0.32, chH * 0.3, { cut: 0.3 }), 0.06 * s, {
      p: [sx * W * 0.19, chH * 0.56, W * 0.36], r: [-0.06, sx * 0.26, sx * 0.44], round: 0.12 });
    A.vents('torso', 'dark', 3, W * 0.22, 0.08 * s, 0.04 * s, {
      p: [sx * W * 0.32, chH * 0.42, W * 0.32], r: [0.3, 0, 0] });
  }
  // exposed dark abdomen mechanics: segmented rings + small blue accents
  for (let i = 0; i < 3; i++) {
    A.tube('torso', 'dark', W * (0.2 - i * 0.02), W * (0.22 - i * 0.02), 0.075 * s, {
      p: [0, chH * (0.1 - i * 0.09), 0] });
  }
  for (const sx of [-1, 1]) {
    A.sharpBox('torso', 'glowSoft', [0.03 * s, 0.03 * s, 0.03 * s], {
      p: [sx * W * 0.21, chH * 0.06, W * 0.1] });
  }
  // wolf-head emblem plate on the chest center
  A.custom('torso', wolfMat,
    beveledPlate(shieldOutline(W * 0.34, chH * 0.32, { taper: 0.66 }), 0.07 * s, { round: 0.12 }), {
      p: [0, chH * 0.36, W * 0.37], r: [0.04, 0, 0] });
  // exposed dark neck segments under the head
  A.tube('torso', 'dark', W * 0.14, W * 0.16, 0.09 * s, { p: [0, chH * 1.06, 0.06 * s] });
  A.tube('torso', 'frame', W * 0.15, W * 0.18, 0.16 * s, { p: [0, chH * 0.98, 0.05 * s] });

  // ================= MANE: three-row spiked ruff =================
  // long silver guard blades over darker under-rows, radiating out/back
  for (let i = 0; i < 9; i++) {
    const a = (i / 8 - 0.5) * Math.PI * 1.16;
    const jag = 1 - 0.08 * ((i * 5) % 3);
    A.blade('torso', 'metal', (1.6 - Math.abs(a) * 0.22) * jag * s, 0.3 * s, 0.05 * s, {
      p: [Math.sin(a) * W * 0.52, chH * 0.96, (-Math.cos(a) * 0.52 + 0.1) * W],
      r: [-0.5 - Math.abs(a) * 0.17, 0, -a * 0.62], taper: 0.05 });
  }
  for (let i = 0; i < 8; i++) {
    const a = (i / 7 - 0.5) * Math.PI * 1.02;
    const jag = 1 - 0.09 * ((i * 7) % 3);
    A.blade('torso', 'primary', (1.25 - Math.abs(a) * 0.2) * jag * s, 0.27 * s, 0.05 * s, {
      p: [Math.sin(a) * W * 0.44, chH * 1.0, (-Math.cos(a) * 0.44 + 0.1) * W],
      r: [-0.68 - Math.abs(a) * 0.16, 0, -a * 0.62], taper: 0.1 });
  }
  for (let i = 0; i < 7; i++) {
    const a = (i / 6 - 0.5) * Math.PI * 0.9;
    A.blade('torso', 'dark', (0.92 - Math.abs(a) * 0.16) * s, 0.24 * s, 0.045 * s, {
      p: [Math.sin(a) * W * 0.37, chH * 1.04, (-Math.cos(a) * 0.37 + 0.1) * W],
      r: [-0.86 - Math.abs(a) * 0.15, 0, -a * 0.62], taper: 0.14 });
  }
  // lower mane fringe spilling onto the shoulders
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 2; k++) {
      A.blade('torso', 'metal', (1.05 - k * 0.2) * s, 0.24 * s, 0.045 * s, {
        p: [sx * W * (0.56 + k * 0.06), chH * (0.86 - k * 0.1), (0.02 - k * 0.1) * W],
        r: [-0.35 - k * 0.2, 0, -sx * (0.95 + k * 0.3)], taper: 0.08 });
    }
  }
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

  // ================= HEAD: big snarling wolf skull =================
  const hy = hs * 1.0;
  const hh = hs * 1.4; // wolf head unit — reads well above the humanoid base
  A.tube('head', 'frame', hs * 0.36, hs * 0.46, hs * 1.0, { p: [0, hy * 0.32, 0] });
  // faceted cranium (chamfered 8-sided bulge) + smooth crown
  A.facet('head', 'primary', hh * 0.42, hh * 0.56, hh * 0.3, hh * 0.95, {
    sides: 8, scaleZ: 1.18, p: [0, hy + hh * 0.42, -hh * 0.12] });
  A.lathe('head', 'primary', [
    [-hh * 0.1, hh * 0.5],
    [hh * 0.28, hh * 0.44],
    [hh * 0.5, hh * 0.2],
  ], { p: [0, hy + hh * 0.52, -hh * 0.12], scaleZ: 1.15, seg: 16 });
  // long snarling snout, jutting forward
  A.capsule('head', 'primary', hh * 0.29, hh * 0.8, {
    p: [0, hy + hh * 0.36, hh * 0.78], r: [Math.PI / 2, 0, 0], s: [0.82, 1, 0.72] });
  // snout bridge plate + wrinkle vents (snarl)
  A.plate('head', 'primary', rhombOutline(hh * 0.42, hh * 1.0, { cut: 0.3 }), hh * 0.1, {
    p: [0, hy + hh * 0.56, hh * 0.72], r: [-Math.PI / 2 + 0.14, 0, 0], round: 0.2 });
  A.vents('head', 'dark', 3, hh * 0.3, hh * 0.07, 0.03 * s, {
    p: [0, hy + hh * 0.52, hh * 1.1], r: [-0.3, 0, 0] });
  // black nose tip
  A.ball('head', 'dark', hh * 0.12, { p: [0, hy + hh * 0.42, hh * 1.44], seg: 10 });
  // upper muzzle rim (dark) the fangs hang from
  A.taper('head', 'dark', [hh * 0.42, hh * 0.16, hh * 0.85], 0.75, 0.9, {
    p: [0, hy + hh * 0.2, hh * 0.85] });
  // OPEN lower jaw, swung well down
  A.taper('head', 'dark', [hh * 0.36, hh * 0.85, hh * 0.26], 0.5, 0.55, {
    p: [0, hy - hh * 0.14, hh * 0.52], r: [Math.PI / 2 + 0.62, 0, 0] });
  A.plate('head', 'accent', rhombOutline(hh * 0.3, hh * 0.7, { cut: 0.3 }), hh * 0.07, {
    p: [0, hy - hh * 0.3, hh * 0.62], r: [-Math.PI / 2 + 0.75, 0, 0], round: 0.2 });
  // STEEL FANGS — upper rows down from the muzzle rim, lower rows up from the jaw
  for (const sx of [-1, 1]) {
    for (let k = 0; k < 3; k++) {
      A.spike('head', 'metal', (0.034 - k * 0.006) * s, (0.17 - k * 0.035) * s, {
        p: [sx * hh * (0.2 - k * 0.015), hy + hh * 0.12, hh * (1.18 - k * 0.22)],
        r: [Math.PI - 0.08, 0, 0], seg: 5 });
    }
    for (let k = 0; k < 2; k++) {
      A.spike('head', 'metal', (0.03 - k * 0.006) * s, (0.14 - k * 0.03) * s, {
        p: [sx * hh * (0.16 - k * 0.02), hy - hh * 0.28, hh * (0.98 - k * 0.2)],
        r: [0.35, 0, 0], seg: 5 });
    }
    // fierce ice-blue slanted eyes on the cranium-snout junction
    A.sharpBox('head', 'glow', [hh * 0.32, hh * 0.09, 0.05 * s], {
      p: [sx * hh * 0.3, hy + hh * 0.62, hh * 0.5], r: [0, sx * 0.34, sx * -0.34] });
    // tall pointed two-layer ears
    A.blade('head', 'primary', hh * 1.15, hh * 0.48, 0.055 * s, {
      p: [sx * hh * 0.4, hy + hh * 1.06, -hh * 0.34], r: [-0.28, 0, sx * 0.3], taper: 0.06 });
    A.blade('head', 'dark', hh * 0.78, hh * 0.28, 0.034 * s, {
      p: [sx * hh * 0.4, hy + hh * 0.98, -hh * 0.27], r: [-0.28, 0, sx * 0.3], taper: 0.1 });
    // cheek guards
    A.plate('head', 'accent', rhombOutline(hh * 0.52, hh * 0.4, { cut: 0.3 }), hh * 0.08, {
      p: [sx * hh * 0.46, hy + hh * 0.3, hh * 0.12], r: [0, sx * (Math.PI / 2 - 0.25), 0], round: 0.2 });
  }
  // heavy brow plate shading the eyes
  A.plate('head', 'frame', rhombOutline(hh * 1.0, hh * 0.34, { cut: 0.3 }), hh * 0.24, {
    p: [0, hy + hh * 0.72, hh * 0.24], r: [-0.32, 0, 0], round: 0.2 });

  // ================= ARMS: muscular plate layers + steel talons =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const sh = 'shoulder' + side, el = 'elbow' + side, ha = 'hand' + side;
    J[sh].position.x = sx * (D.shoulderW + 0.12 * s);

    A.ball(sh, 'frame', 0.24 * s, {});
    // compact rounded pauldron (small — the mane dominates the silhouette)
    A.lathe(sh, 'primary', [
      [-0.16 * s, 0.31 * s],
      [0.1 * s, 0.27 * s],
      [0.3 * s, 0.1 * s],
    ], { p: [sx * 0.08 * s, 0.05 * s, 0], scaleZ: 0.9, seg: 18 });
    // unit number decal on the outer pauldron face: 09 left, 12 right
    A.custom(sh, plateMat({
      text: side === 'L' ? '09' : '12', textY: 0.5, textScale: 0.34, color: '#cfd6dd', alpha: 0.85,
    }), beveledPlate(rhombOutline(0.3 * s, 0.26 * s, { cut: 0.3 }), 0.05 * s, { round: 0.15 }), {
      p: [sx * 0.3 * s, 0.08 * s, 0], r: [0, sx * Math.PI / 2, 0] });
    // muscular upper arm: bulge + layered plate wraps
    A.lathe(sh, 'frame', [
      [-ua * 0.96, 0.14 * s],
      [-ua * 0.5, 0.21 * s],
      [-ua * 0.12, 0.17 * s],
    ], { seg: 14 });
    A.tube(sh, 'primary', 0.2 * s, 0.23 * s, 0.26 * s, { p: [0, -ua * 0.38, 0] });
    A.tube(sh, 'primary', 0.185 * s, 0.215 * s, 0.24 * s, { p: [0, -ua * 0.66, 0] });
    A.part(el, 'metal', cyl(0.14 * s, 0.14 * s, 0.3 * s, 10), { r: [0, 0, Math.PI / 2] });
    // powerful forearm: faceted housing + layered outer plate + elbow spur fin
    A.facet(el, 'primary', 0.19 * s, 0.27 * s, 0.2 * s, fa * 0.95, {
      sides: 8, scaleZ: 1.08, p: [0, -fa * 0.5, 0] });
    A.plate(el, 'primary', rhombOutline(0.3 * s, fa * 0.55, { cut: 0.3 }), 0.05 * s, {
      p: [sx * 0.24 * s, -fa * 0.45, 0.02 * s], r: [0, sx * Math.PI / 2, 0], round: 0.15 });
    A.blade(el, 'accent', 0.5 * s, 0.16 * s, 0.04 * s, {
      p: [0, -fa * 0.28, -0.25 * s], r: [Math.PI - 0.35, 0, 0], taper: 0.15 });
    A.piston(el, 'brass', [sx * 0.14 * s, -0.06 * s, -0.12 * s],
      [sx * 0.17 * s, -fa * 0.55, -0.16 * s], 0.035 * s);
    // hand: faceted palm, FOUR fingers + thumb, each a knuckle segment
    // ending in a long curved polished-steel talon (~half forearm length)
    A.facet(ha, 'frame', 0.14 * s, 0.18 * s, 0.13 * s, 0.32 * s, { sides: 6, p: [0, -0.08 * s, 0] });
    A.ring(ha, 'brass', 0.15 * s, 0.028 * s, { p: [0, 0.07 * s, 0], r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 4; i++) {
      const fx = (i - 1.5) * 0.078 * s;
      A.sharpBox(ha, 'dark', [0.05 * s, 0.16 * s, 0.055 * s], {
        p: [fx, -0.26 * s, 0.06 * s], r: [-0.35, 0, (i - 1.5) * 0.05] });
      A.spike(ha, 'metal', 0.038 * s, 0.6 * s, {
        p: [fx, -0.55 * s, 0.15 * s], r: [Math.PI - 0.32, 0, (i - 1.5) * 0.07], seg: 6 });
    }
    A.sharpBox(ha, 'dark', [0.05 * s, 0.13 * s, 0.055 * s], {
      p: [sx * 0.15 * s, -0.18 * s, 0.0], r: [-0.2, 0, sx * 0.55] });
    A.spike(ha, 'metal', 0.036 * s, 0.44 * s, {
      p: [sx * 0.22 * s, -0.38 * s, 0.06 * s], r: [Math.PI - 0.25, 0, sx * 0.4], seg: 6 });
  }

  // ================= TAIL: long armored S-curve, blade tip =================
  // Joint chain carries the S in its POSITIONS (the animator owns rotations):
  // root drops, mid segment sags, last segment sweeps back up.
  const segLen = [0.95 * s, 0.85 * s, 0.78 * s];
  const segDrop = [-0.2 * s, 0.14 * s]; // y offset of joints 1,2
  addJoint(J, 'tail0', 'hips', 0, -0.02 * s, -0.5 * s);
  addJoint(J, 'tail1', 'tail0', 0, segDrop[0], -segLen[0]);
  addJoint(J, 'tail2', 'tail1', 0, segDrop[1], -segLen[1]);
  for (let i = 0; i < 3; i++) {
    const r0 = (0.19 - i * 0.04) * s;
    const dy = i === 0 ? segDrop[0] : i === 1 ? segDrop[1] : 0.08 * s;
    const tilt = Math.atan2(dy, segLen[i]); // aim the segment at the next joint
    const rx = Math.PI / 2 + tilt;
    A.capsule('tail' + i, 'primary', r0, segLen[i] * 0.6, {
      p: [0, dy * 0.5, -segLen[i] * 0.5], r: [rx, 0, 0], s: [1, 1, 0.85] });
    // dark joint ring + overlapping armored scale plates shingled down the top
    A.ring('tail' + i, 'dark', r0 * 0.95, 0.03 * s, { p: [0, 0, -0.04 * s] });
    for (let k = 0; k < 3; k++) {
      const f = k / 2;
      A.plate('tail' + i, 'metal', rhombOutline((0.3 - i * 0.05) * s, (0.3 - i * 0.04) * s, { cut: 0.28 }), 0.035 * s, {
        p: [0, r0 * 0.72 + dy * (f - 0.1), -segLen[i] * (0.14 + f * 0.62)],
        r: [rx + 0.32, 0, 0], round: 0.15 });
    }
    // side scale pair on the thicker segments
    if (i < 2) {
      for (const sx of [-1, 1]) {
        A.plate('tail' + i, 'accent', rhombOutline(0.2 * s, 0.24 * s, { cut: 0.3 }), 0.03 * s, {
          p: [sx * r0 * 0.8, dy * 0.4, -segLen[i] * 0.5], r: [rx, sx * 1.1, 0], round: 0.15 });
      }
    }
  }
  // large curved blade tip, edge glow kept subtle
  A.blade('tail2', 'metal', 0.78 * s, 0.2 * s, 0.045 * s, {
    p: [0, 0.2 * s, -segLen[2] - 0.26 * s], r: [-1.2, 0, 0], taper: 0.04 });
  A.sharpBox('tail2', 'glowSoft', [0.02 * s, 0.5 * s, 0.02 * s], {
    p: [0, 0.26 * s, -segLen[2] - 0.32 * s], r: [-1.2 + Math.PI / 2 + 0.02, 0, 0] });

  // ================= LEGS: muscular digitigrade raptor =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const th = 'thigh' + side, kn = 'knee' + side, an = 'ankle' + side;
    const tl = D.thighLen, sl = D.shinLen;

    A.ball(th, 'frame', 0.22 * s, {});
    // heavily bulged haunch thigh (rest pose angles it forward)
    A.lathe(th, 'primary', [
      [-tl * 1.0, 0.16 * s],
      [-tl * 0.56, 0.29 * s],
      [-tl * 0.15, 0.22 * s],
    ], { scaleZ: 1.32, seg: 18, p: [0, 0, 0.04 * s] });
    A.plate(th, 'accent', rhombOutline(0.34 * s, tl * 0.55, { cut: 0.28 }), 0.05 * s, {
      p: [sx * 0.26 * s, -tl * 0.45, 0.05 * s], r: [0, sx * Math.PI / 2, 0], round: 0.15 });
    A.piston(th, 'brass', [0, -tl * 0.18, -0.17 * s], [0, -tl * 0.85, -0.22 * s], 0.035 * s);

    A.ball(kn, 'metal', 0.14 * s, {});
    A.plate(kn, 'accent', shieldOutline(0.3 * s, 0.4 * s, { taper: 0.6 }), 0.06 * s, {
      p: [0, -0.03 * s, 0.18 * s], r: [0.2, 0, 0], round: 0.15 });
    // calf with hock fin + blade shin guard
    A.lathe(kn, 'primary', [
      [-sl * 1.0, 0.1 * s],
      [-sl * 0.68, 0.18 * s],
      [-sl * 0.34, 0.21 * s],
      [-sl * 0.06, 0.13 * s],
    ], { scaleZ: 1.22, seg: 16 });
    A.blade(kn, 'metal', 0.62 * s, 0.15 * s, 0.035 * s, {
      p: [0, -sl * 0.45, -0.2 * s], r: [Math.PI - 0.3, 0, 0], taper: 0.1 });
    A.blade(kn, 'metal', sl * 0.62, 0.15 * s, 0.04 * s, {
      p: [0, -sl * 0.55, 0.19 * s], r: [0.05, 0, 0], taper: 0.25 });

    // big clawed foot: three steel talons + rear dew claw
    A.ball(an, 'frame', 0.13 * s, {});
    A.taper(an, 'frame', [0.28 * s, 0.24 * s, 0.48 * s], 0.7, 0.5, { p: [0, -0.2 * s, 0.08 * s] });
    for (let i = -1; i <= 1; i++) {
      A.spike(an, 'metal', 0.058 * s, 0.55 * s, {
        p: [i * 0.115 * s, -0.2 * s, 0.32 * s], r: [2.0, 0, i * 0.25], seg: 6 });
    }
    A.spike(an, 'metal', 0.045 * s, 0.34 * s, {
      p: [0, -0.16 * s, -0.16 * s], r: [-2.1, 0, 0], seg: 6 });
  }

  anchors.muzzleR = addAnchor(J.handR, 0, -0.35 * s, 0.35 * s);
  anchors.clawL = addAnchor(J.handL, 0, -1.02 * s, 0.3 * s);
  anchors.clawR = addAnchor(J.handR, 0, -1.02 * s, 0.3 * s);
}
