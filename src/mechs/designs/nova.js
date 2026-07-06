// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 5. NOVA — sculpted star-oracle rebuild. Slender feminine mass
//    rhythm: small pauldrons over a smooth lathe chest with a big
//    magenta core in a gold ring, pinched waist, flowing skirt of
//    beveled plates all around, serene lathe mask with a vertical
//    third-eye slit, spinning halo, staff-cannon with orbital prongs.
// ============================================================
export function nova(A, D, J, anchors, def) {
  const s = D.scale;
  const W = D.torsoW;   // ~1.28 master width unit
  const chH = D.torsoH;
  const hs = D.headSize;
  const fA = D.foreArmLen;

  // dedicated decal skin (unmerged custom plates keep exact UVs)
  const plateMat = (decal, recipe, seedOff = 0) => {
    const tex = decalTexture({ seed: def.seed + seedOff, ...recipe }, decal);
    return new THREE.MeshStandardMaterial({
      map: tex.map, normalMap: tex.normalMap,
      roughnessMap: tex.rmMap, metalnessMap: tex.rmMap,
      roughness: 1, metalness: 1,
    });
  };
  // compose euler rotations (first arg = outermost / applied last)
  const eul = (...steps) => {
    const q = new THREE.Quaternion(), t = new THREE.Quaternion();
    for (const st of steps) {
      t.setFromEuler(new THREE.Euler(st[0], st[1], st[2]));
      q.multiply(t);
    }
    const e = new THREE.Euler().setFromQuaternion(q);
    return [e.x, e.y, e.z];
  };

  // ================= WAIST / PELVIS / SKIRT =================
  // narrow articulated waist column
  A.lathe('hips', 'frame', [[0.62 * s, W * 0.2], [0.34 * s, W * 0.14], [0.0 * s, W * 0.2]], {
    scaleX: 1.1 });
  A.ring('hips', 'brass', W * 0.165, 0.028 * s, {
    p: [0, 0.34 * s, 0], r: [Math.PI / 2, 0, 0], s: [1.1, 1, 1] });
  // small hex pelvis under the skirt
  A.facet('hips', 'primary', W * 0.28, W * 0.34, W * 0.22, 0.55 * s, {
    sides: 6, scaleZ: 0.85, p: [0, -0.32 * s, 0] });
  // flowing skirt: beveled shield plates all around (front one is the decal)
  const skirtN = 8;
  for (let i = 0; i < skirtN; i++) {
    const a = (i / skirtN) * Math.PI * 2; // 0 = front
    const tilt = 0.46;
    const p = [Math.sin(a) * (W * 0.28 + 0.24 * s), -0.68 * s, Math.cos(a) * (W * 0.28 + 0.24 * s)];
    const r = eul([0, a, 0], [tilt, 0, 0]);
    if (i === 0) {
      A.custom('hips', plateMat({ text: 'NOVA', textY: 0.36, textScale: 0.26, color: '#2f9d9d', alpha: 0.85 },
        def.skin.primary), beveledPlate(shieldOutline(0.7 * s, 1.5 * s, { taper: 0.85, tip: 0.18 }), 0.05 * s, { round: 0.14 }), {
        p, r });
    } else {
      A.plate('hips', 'primary', shieldOutline(0.7 * s, 1.5 * s, { taper: 0.85, tip: 0.18 }), 0.05 * s, {
        p, r, round: 0.14 });
    }
  }
  // upper skirt layer: shorter teal petals in the gaps
  for (let i = 0; i < skirtN; i++) {
    const a = ((i + 0.5) / skirtN) * Math.PI * 2;
    A.plate('hips', 'accent', shieldOutline(0.44 * s, 0.8 * s, { taper: 0.78, tip: 0.24 }), 0.04 * s, {
      p: [Math.sin(a) * (W * 0.28 + 0.15 * s), -0.42 * s, Math.cos(a) * (W * 0.28 + 0.15 * s)],
      r: eul([0, a, 0], [0.36, 0, 0]), round: 0.16 });
  }

  // ================= TORSO: smooth feminine lathe =================
  A.lathe('torso', 'primary', [
    [chH * 0.06, W * 0.20],
    [chH * 0.32, W * 0.35],
    [chH * 0.60, W * 0.47],
    [chH * 0.85, W * 0.42],
    [chH * 1.04, W * 0.24],
  ], { scaleX: 1.18, scaleZ: 0.82, seg: 28 });
  // gold sash ring at the waist pinch
  A.ring('torso', 'brass', W * 0.24, 0.03 * s, {
    p: [0, chH * 0.12, 0], r: [Math.PI / 2, 0, 0], s: [1.18, 0.84, 1], seg: 24 });
  // big magenta core in a gold ring + teal petals radiating around it
  A.ball('torso', 'glow', 0.24 * s, { p: [0, chH * 0.56, W * 0.4], seg: 18 });
  A.ring('torso', 'brass', 0.31 * s, 0.045 * s, { p: [0, chH * 0.56, W * 0.4], seg: 26 });
  for (let k = 0; k < 4; k++) {
    const b = (k / 4) * Math.PI * 2 + Math.PI / 4;
    A.plate('torso', 'accent', rhombOutline(0.3 * s, 0.13 * s, { cut: 0.32 }), 0.035 * s, {
      p: [Math.cos(b) * 0.42 * s, chH * 0.56 + Math.sin(b) * 0.42 * s, W * 0.36],
      r: [0, 0, b], round: 0.2 });
  }
  // teal bodice plates over the collarbones
  for (const sx of [-1, 1]) {
    A.plate('torso', 'accent', shieldOutline(W * 0.3, chH * 0.22, { taper: 0.72 }), 0.04 * s, {
      p: [sx * W * 0.26, chH * 0.88, W * 0.26], r: [0.42, 0, sx * -0.3], round: 0.16 });
  }
  // slim collar
  A.tube('torso', 'frame', W * 0.13, W * 0.16, 0.16 * s, { p: [0, chH * 1.02, 0] });
  A.ring('torso', 'brass', W * 0.15, 0.022 * s, {
    p: [0, chH * 1.08, 0], r: [Math.PI / 2, 0, 0] });
  // small back cowl over the halo mount
  A.lathe('torso', 'accent', [[-chH * 0.16, W * 0.16], [0, W * 0.22], [chH * 0.2, W * 0.1]], {
    p: [0, chH * 0.82, -D.torsoD * 0.42], scaleZ: 0.7, seg: 16 });

  // ================= HALO (spins on its .z — keep centered) =================
  addJoint(J, 'halo', 'torso', 0, chH * 1.06, -D.torsoD * 0.82);
  // inner gold ring
  A.ring('halo', 'brass', 0.5 * s, 0.032 * s, { seg: 30 });
  // six glowing arc segments around the joint center
  for (let i = 0; i < 6; i++) {
    A.part('halo', 'glowSoft', new THREE.TorusGeometry(0.92 * s, 0.05 * s, 8, 14, Math.PI / 4.4), {
      r: [0, 0, (i / 6) * Math.PI * 2 + 0.14] });
  }
  // star gems + teal spokes riding the ring (make the spin readable)
  for (let i = 0; i < 3; i++) {
    const b = (i / 3) * Math.PI * 2 + Math.PI / 2;
    A.ball('halo', 'glow', 0.07 * s, {
      p: [Math.cos(b) * 0.92 * s, Math.sin(b) * 0.92 * s, 0], seg: 10 });
    A.blade('halo', 'accent', 0.42 * s, 0.15 * s, 0.03 * s, {
      p: [Math.cos(b + Math.PI / 3) * 1.1 * s, Math.sin(b + Math.PI / 3) * 1.1 * s, 0],
      r: [0, 0, b + Math.PI / 3 - Math.PI / 2], taper: 0.2 });
  }

  // ================= HEAD: serene mask =================
  const hy = hs * 0.95;
  A.tube('head', 'frame', hs * 0.3, hs * 0.36, hs * 0.5, { p: [0, hy * 0.26, 0] });
  // smooth lathe dome — featureless oracle mask
  A.lathe('head', 'primary', [
    [-hs * 0.5, hs * 0.6],
    [hs * 0.05, hs * 0.7],
    [hs * 0.5, hs * 0.55],
    [hs * 0.78, hs * 0.2],
  ], { p: [0, hy + hs * 0.55, 0.02 * s], scaleZ: 1.08, seg: 22 });
  // vertical glowing third-eye slit
  A.sharpBox('head', 'glow', [hs * 0.15, hs * 0.52, 0.06 * s], {
    p: [0, hy + hs * 0.68, hs * 0.76], r: [0.14, 0, 0] });
  // gold circlet
  A.ring('head', 'brass', hs * 0.72, 0.02 * s, {
    p: [0, hy + hs * 0.82, 0], r: [Math.PI / 2, 0, 0], s: [1, 1.08, 1], seg: 24 });
  // teal side veils + white back veil (hair silhouette)
  for (const sx of [-1, 1]) {
    A.plate('head', 'accent', shieldOutline(hs * 0.55, hs * 1.15, { taper: 0.8, tip: 0.25 }), 0.04 * s, {
      p: [sx * hs * 0.78, hy + hs * 0.3, -hs * 0.08], r: [0, sx * Math.PI / 2, sx * 0.14], round: 0.16 });
  }
  A.plate('head', 'primary', shieldOutline(hs * 0.95, hs * 1.3, { taper: 0.85, tip: 0.2 }), 0.05 * s, {
    p: [0, hy + hs * 0.25, -hs * 0.62], r: [-0.14, 0, 0], round: 0.16 });

  // ================= ARMS (slender) =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const sh = 'shoulder' + side, el = 'elbow' + side;

    // small pauldron shell + gold rim + teal fin
    A.ball(sh, 'frame', 0.18 * s, {});
    A.lathe(sh, 'primary', [
      [-0.12 * s, W * 0.2],
      [0.1 * s, W * 0.17],
      [0.24 * s, W * 0.08],
    ], { p: [sx * 0.05 * s, 0.05 * s, 0], scaleZ: 0.92, seg: 18 });
    A.ring(sh, 'brass', W * 0.19, 0.02 * s, {
      p: [sx * 0.05 * s, -0.07 * s, 0], r: [Math.PI / 2, 0, 0], s: [1, 0.92, 1] });
    A.blade(sh, 'accent', 0.45 * s, 0.16 * s, 0.03 * s, {
      p: [sx * 0.3 * s, 0.24 * s, -0.02 * s], r: [0, 0, sx * 0.5], taper: 0.3 });
    // slim upper arm
    A.lathe(sh, 'primary', [
      [-D.upperArmLen * 0.95, 0.12 * s],
      [-D.upperArmLen * 0.5, 0.16 * s],
      [-D.upperArmLen * 0.1, 0.13 * s],
    ], { seg: 14 });
    // elbow + hex forearm sleeve with bracelet
    A.part(el, 'metal', new THREE.CylinderGeometry(0.11 * s, 0.11 * s, 0.24 * s, 10), {
      r: [0, 0, Math.PI / 2] });
    A.facet(el, 'primary', 0.14 * s, 0.19 * s, 0.13 * s, fA * 0.95, {
      sides: 6, p: [0, -fA * 0.5, 0] });
    A.plate(el, 'accent', rhombOutline(fA * 0.5, 0.22 * s, { cut: 0.3 }), 0.035 * s, {
      p: [0, -fA * 0.45, 0.17 * s], r: [0, 0, Math.PI / 2], round: 0.14 });
    A.ring(el, 'brass', 0.16 * s, 0.022 * s, {
      p: [0, -fA * 0.82, 0], r: [Math.PI / 2, 0, 0] });
  }
  A.fist('handR', 'frame', 'dark', 0.24 * s, { side: 1 });
  A.fist('handL', 'frame', 'dark', 0.24 * s, { side: -1 });

  // ================= STAFF-CANNON (right hand) =================
  A.tube('handR', 'metal', 0.045 * s, 0.045 * s, 3.2 * s, {
    p: [0, -0.15 * s, 0.55 * s], r: [Math.PI / 2, 0, 0] });
  A.tube('handR', 'dark', 0.058 * s, 0.058 * s, 0.5 * s, {
    p: [0, -0.15 * s, 0.05 * s], r: [Math.PI / 2, 0, 0] });
  // rear counterweight
  A.lathe('handR', 'accent', [[-0.12 * s, 0.045 * s], [0, 0.085 * s], [0.15 * s, 0.02 * s]], {
    p: [0, -0.15 * s, -0.92 * s], r: [Math.PI / 2, 0, 0] });
  A.ball('handR', 'glowSoft', 0.06 * s, { p: [0, -0.15 * s, -1.08 * s], seg: 10 });
  // head: gold socket, glowing orb, tilted gold ring, orbital prongs
  A.lathe('handR', 'brass', [[-0.1 * s, 0.05 * s], [0.02 * s, 0.1 * s], [0.16 * s, 0.035 * s]], {
    p: [0, -0.15 * s, 2.0 * s], r: [Math.PI / 2, 0, 0] });
  A.ball('handR', 'glow', 0.2 * s, { p: [0, -0.15 * s, 2.35 * s], seg: 18 });
  A.ring('handR', 'brass', 0.3 * s, 0.026 * s, {
    p: [0, -0.15 * s, 2.35 * s], r: [0.55, 0, 0], seg: 26 });
  for (let i = 0; i < 3; i++) {
    const b = (i / 3) * Math.PI * 2 + Math.PI / 2;
    A.blade('handR', 'accent', 0.55 * s, 0.13 * s, 0.035 * s, {
      p: [Math.cos(b) * 0.27 * s, -0.15 * s + Math.sin(b) * 0.27 * s, 2.22 * s],
      r: eul([0, 0, b - Math.PI / 2], [Math.PI / 2 - 0.35, 0, 0]), taper: 0.15 });
  }

  // ================= LEGS (slender plantigrade) =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const th = 'thigh' + side, kn = 'knee' + side, an = 'ankle' + side;

    // hip ball + long slim thigh
    A.ball(th, 'frame', 0.19 * s, {});
    A.lathe(th, 'primary', [
      [-D.thighLen * 1.0, 0.18 * s],
      [-D.thighLen * 0.5, 0.25 * s],
      [-D.thighLen * 0.08, 0.2 * s],
    ], { scaleZ: 1.08, seg: 18 });
    A.plate(th, 'accent', rhombOutline(0.24 * s, D.thighLen * 0.45, { cut: 0.3 }), 0.035 * s, {
      p: [sx * 0.23 * s, -D.thighLen * 0.5, 0.02 * s], r: [0, sx * Math.PI / 2, 0], round: 0.14 });

    // knee + graceful calf swell
    A.ball(kn, 'metal', 0.14 * s, {});
    A.plate(kn, 'primary', shieldOutline(0.3 * s, 0.42 * s, { taper: 0.65 }), 0.07 * s, {
      p: [0, -0.02 * s, 0.2 * s], r: [0.12, 0, 0], round: 0.16 });
    A.lathe(kn, 'primary', [
      [-D.shinLen * 1.0, 0.15 * s],
      [-D.shinLen * 0.62, 0.26 * s],
      [-D.shinLen * 0.26, 0.28 * s],
      [-D.shinLen * 0.02, 0.19 * s],
    ], { scaleZ: 1.12, seg: 18 });
    // teal shin trim + gold anklet
    A.plate(kn, 'accent', shieldOutline(0.24 * s, 0.5 * s, { taper: 0.75 }), 0.04 * s, {
      p: [0, -D.shinLen * 0.55, 0.27 * s], r: [0.04, 0, 0], round: 0.16 });
    A.ring(kn, 'brass', 0.17 * s, 0.02 * s, {
      p: [0, -D.shinLen * 0.92, 0], r: [Math.PI / 2, 0, 0], s: [1, 1.1, 1] });
    A.piston(kn, 'brass', [0, 0.08 * s, -0.16 * s], [0, -D.shinLen * 0.4, -0.24 * s], 0.035 * s);

    // pointed boot: slim toe, teal cap, small heel
    A.ball(an, 'frame', 0.13 * s, {});
    A.part(an, 'primary', roundedBox(0.24 * s, 0.18 * s, 0.68 * s, 0.06 * s), {
      p: [0, -0.15 * s, 0.26 * s], r: [-0.06, 0, 0] });
    A.plate(an, 'accent', shieldOutline(0.24 * s, 0.3 * s, { taper: 0.75 }), 0.04 * s, {
      p: [0, -0.08 * s, 0.5 * s], r: [0.7, 0, 0], round: 0.2 });
    A.facet(an, 'frame', 0.1 * s, 0.13 * s, 0.09 * s, 0.26 * s, {
      sides: 6, p: [0, -0.15 * s, -0.14 * s], r: [Math.PI / 2.3, 0, 0] });
    A.sharpBox(an, 'dark', [0.28 * s, 0.08 * s, 0.8 * s], { p: [0, -0.24 * s, 0.12 * s] });
  }

  anchors.muzzleR = addAnchor(J.handR, 0, -0.15 * s, 2.6 * s);
  anchors.core = addAnchor(J.torso, 0, chH * 0.56, W * 0.44);
}
