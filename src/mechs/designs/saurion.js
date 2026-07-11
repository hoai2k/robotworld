// SAURION — unit MX-7, the apex prototype, matched to
// docs/canonical/mech_saurion.png: gunmetal-black Utahraptor frame with a
// snarling steel-toothed snout, red eyes, a mohawk crest of robotic blade-
// feathers, feather fans on the forearms and a long double-feathered tail,
// chrome sickle toe-claws, red core strip, white corp decals.
import * as THREE from 'three';
import { beveledPlate, shieldOutline } from '../parts.js';
import { decalTexture } from '../../core/pbrtex.js';
import { baseFrame, standardArm, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';

export function saurion(A, D, J, anchors, def) {
  const s = D.scale;
  const W = D.torsoW;
  const chH = D.torsoH;
  const hs = D.headSize;

  const plateMat = (decal) => {
    const tex = decalTexture({ seed: def.seed + 3, ...def.skin.primary }, decal);
    return new THREE.MeshStandardMaterial({
      map: tex.map, normalMap: tex.normalMap,
      roughnessMap: tex.rmMap, metalnessMap: tex.rmMap,
      roughness: 1, metalness: 1,
    });
  };

  // one robotic blade-feather; the signature vocabulary, reused everywhere
  const feather = (joint, len, wide, p, r) => {
    A.blade(joint, 'frame', len, wide, 0.035 * s, { p, r, taper: 0.12 });
  };

  // ================= FRAME / CHEST =================
  baseFrame(A, D);
  // hunched predatory chest: angular plates pushed forward
  A.taper('torso', 'primary', [W * 1.08, chH * 0.8, W * 0.72], 0.7, 0.8, {
    p: [0, chH * 0.5, W * 0.12], r: [0.26, 0, 0] });
  A.taper('torso', 'accent', [W * 0.6, chH * 0.4, W * 0.5], 0.8, 0.7, {
    p: [0, chH * 0.16, W * 0.16], r: [0.1, 0, 0] });
  // RED core strip down the sternum
  A.box('torso', 'glow', [0.1 * s, chH * 0.44, 0.06 * s], { p: [0, chH * 0.42, W * 0.42], r: [0.2, 0, 0] });
  for (const sx of [-1, 1]) { // rib glow seams
    A.box('torso', 'glow', [0.04 * s, chH * 0.2, 0.04 * s], {
      p: [sx * W * 0.24, chH * 0.3, W * 0.36], r: [0.2, 0, sx * 0.35] });
  }
  // corp decals: SAURION chest plate
  A.custom('torso', plateMat({ text: 'SAURION', textScale: 0.15, emblem: true, color: '#e6e8ea' }),
    beveledPlate(shieldOutline(W * 0.4, chH * 0.42, { taper: 0.62 }), 0.05 * s, { round: 0.08 }), {
      p: [0, chH * 0.34, W * 0.44], r: [0.32, 0, 0] });
  // shoulder mane feathers (short rows over the upper back)
  for (let i = -2; i <= 2; i++) {
    feather('torso', 0.6 * s, 0.12 * s,
      [i * 0.22 * s, chH * 0.9, -W * 0.24],
      [-0.9 - Math.abs(i) * 0.12, i * 0.22, 0]);
  }

  // ================= NECK + RAPTOR HEAD =================
  // arched neck segments pushing the head forward
  for (let i = 0; i < 4; i++) {
    A.tube('torso', 'frame', (0.18 - i * 0.02) * s, (0.21 - i * 0.02) * s, 0.38 * s, {
      p: [0, chH * (0.96 + i * 0.09), W * (0.1 + i * 0.2)], r: [1.0 - i * 0.06, 0, 0] });
  }
  // spine hump plate behind the neck root
  A.taper('torso', 'primary', [W * 0.7, chH * 0.34, W * 0.6], 0.7, 0.7, {
    p: [0, chH * 0.98, -W * 0.08], r: [-0.3, 0, 0] });
  const hy = 0.08 * s, hz = 0.95 * s; // the head thrusts far forward, raptor-style
  const hb = hs * 1.35;               // beefed-up skull scale
  // cranium: angular wedge
  A.taper('head', 'primary', [hb * 1.5, hb * 1.2, hb * 1.7], 0.7, 0.9, { p: [0, hy, hz] });
  // long snout
  A.taper('head', 'primary', [hb * 1.0, hb * 0.7, hb * 2.2], 0.6, 0.75, {
    p: [0, hy - hb * 0.1, hz + hb * 1.7], r: [0.06, 0, 0] });
  // lower jaw, open in a snarl
  A.taper('head', 'accent', [hb * 0.8, hb * 0.4, hb * 1.9], 0.65, 0.7, {
    p: [0, hy - hb * 0.62, hz + hb * 1.3], r: [0.5, 0, 0] });
  // chrome teeth: upper + lower rows
  for (let i = 0; i < 5; i++) {
    A.spike('head', 'metal', 0.035 * s, 0.13 * s, {
      p: [(i % 2 ? -1 : 1) * hb * 0.28, hy - hb * 0.34, hz + hb * (1.1 + i * 0.32)], r: [Math.PI, 0, 0], seg: 5 });
    A.spike('head', 'metal', 0.03 * s, 0.11 * s, {
      p: [(i % 2 ? 1 : -1) * hb * 0.24, hy - hb * 0.6 + i * 0.02 * s, hz + hb * (1.0 + i * 0.3)], r: [0.5, 0, 0], seg: 5 });
  }
  // red eyes under angry brows
  for (const sx of [-1, 1]) {
    A.ball('head', 'glow', 0.07 * s, { p: [sx * hb * 0.62, hy + hb * 0.14, hz + hb * 0.72] });
    A.blade('head', 'accent', hb * 0.7, hb * 0.34, 0.05 * s, {
      p: [sx * hb * 0.6, hy + hb * 0.42, hz + hb * 0.7], r: [1.35, 0, sx * 0.25], taper: 0.4 });
  }
  // MOHAWK CREST: fan of blade-feathers from crown down the neck
  for (let i = 0; i < 7; i++) {
    const t = i / 6;
    feather('head', (1.15 - t * 0.4) * s, (0.2 - t * 0.06) * s,
      [0, hy + hb * (0.55 - t * 1.1), hz - hb * (0.1 + t * 1.5)],
      [-0.55 - t * 0.75, 0, 0]);
  }

  // ================= ARMS: CLAWS + FEATHER FANS =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    standardArm(A, D, side, { fist: false, bulk: 0.82 });
    // three long chrome claws per hand
    for (let i = -1; i <= 1; i++) {
      A.spike('hand' + side, 'metal', 0.045 * s, 0.62 * s, {
        p: [i * 0.09 * s, -0.28 * s, 0.08 * s], r: [Math.PI - 0.35 - i * 0.06, 0, i * 0.15], seg: 6 });
    }
    // forearm wing-fan feathers
    for (let i = 0; i < 4; i++) {
      feather('elbow' + side, (0.8 - i * 0.1) * s, 0.13 * s,
        [sx * 0.16 * s, -D.foreArmLen * (0.25 + i * 0.2), -0.06 * s],
        [Math.PI + 0.5 - i * 0.16, 0, sx * (0.55 - i * 0.08)]);
    }
  }

  // ================= LEGS: RAPTOR + SICKLE CLAWS =================
  for (const side of ['L', 'R']) {
    raptorLeg(A, D, side, { bulk: 0.95 });
    const an = 'ankle' + side;
    // huge raised chrome sickle: two angled segments faking the curve
    A.spike(an, 'metal', 0.12 * s, 0.62 * s, { p: [0, 0.14 * s, 0.3 * s], r: [0.55, 0, 0], seg: 7 });
    A.spike(an, 'metal', 0.08 * s, 0.52 * s, { p: [0, 0.5 * s, 0.56 * s], r: [1.25, 0, 0], seg: 7 });
    // piston shin detail
    A.piston('knee' + side, 'metal',
      [0.12 * s, -0.2 * s, 0.1 * s], [0.1 * s, -D.shinLen * 0.85, 0.14 * s], 0.04 * s);
    // red seam glows (canonical image is laced with them)
    A.box('thigh' + side, 'glow', [0.04 * s, D.thighLen * 0.5, 0.04 * s], {
      p: [(side === 'L' ? -1 : 1) * 0.2 * s, -D.thighLen * 0.45, 0.14 * s] });
    A.box('knee' + side, 'glow', [0.035 * s, D.shinLen * 0.35, 0.035 * s], {
      p: [0, -D.shinLen * 0.4, 0.16 * s] });
  }

  // ================= TAIL: 3-JOINT CHAIN, DOUBLE FEATHER ROWS =================
  const segLen = [1.2 * s, 1.15 * s, 1.1 * s];
  addJoint(J, 'tail0', 'hips', 0, 0.3 * s, -0.45 * s);
  addJoint(J, 'tail1', 'tail0', 0, 0.05 * s, -segLen[0]);
  addJoint(J, 'tail2', 'tail1', 0, 0.02 * s, -segLen[1]);
  ['tail0', 'tail1', 'tail2'].forEach((tj, ti) => {
    const r0 = (0.26 - ti * 0.07) * s;
    A.taper(tj, 'primary', [r0 * 2, r0 * 1.7, segLen[ti]], 0.75, 0.8, {
      p: [0, 0, -segLen[ti] / 2] });
    // double feather rows fanning off the top, shrinking toward the tip
    const n = 4 - ti;
    for (let i = 0; i < n + 1; i++) {
      const z = -segLen[ti] * (0.15 + (i / (n + 0.5)) * 0.75);
      const len = (0.95 - ti * 0.22 - i * 0.06) * s;
      for (const sx of [-1, 1]) {
        feather(tj, len, 0.2 * s, [sx * r0 * 0.5, r0 * 0.55, z],
          [-0.85 - ti * 0.12, sx * 0.35, sx * (0.5 + ti * 0.1)]);
      }
    }
    A.box(tj, 'glow', [0.035 * s, 0.035 * s, segLen[ti] * 0.6], {
      p: [0, r0 * 0.75, -segLen[ti] * 0.5] });
    if (ti === 1) { // MX-7 plate mid-tail
      A.custom(tj, plateMat({ text: 'MX-7', textScale: 0.22, color: '#e6e8ea' }),
        beveledPlate(shieldOutline(0.4 * s, 0.5 * s, { taper: 0.85 }), 0.04 * s, { round: 0.08 }), {
          p: [0.2 * s, 0, -segLen[ti] * 0.5], r: [0, Math.PI / 2, 0.1] });
    }
  });
  // tail tip spike
  A.spike('tail2', 'metal', 0.06 * s, 0.5 * s, { p: [0, 0, -segLen[2]], r: [-Math.PI / 2, 0, 0], seg: 6 });

  // razor plumes fire from the jaw
  anchors.muzzleR = addAnchor(J.head, 0, hy - hb * 0.25, hz + hb * 2.7);
  anchors.core = addAnchor(J.torso, 0, chH * 0.42, W * 0.46);
}
