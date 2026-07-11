// CRANKY — the abyssal crab bulwark, matched to docs/canonical/mech_cranky.png:
// enormous rust-orange carapace dome (patchy corrosion), embedded face with
// two quad clusters of blue LED eyes over a grill mouth, GIANT serrated
// pincer claws, blue-steel shoulder water cannons fed by riveted tanks,
// wide segmented crab stance with decorative side legs.
import * as THREE from 'three';
import { beveledPlate, shieldOutline } from '../parts.js';
import { decalTexture } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';

export function cranky(A, D, J, anchors, def) {
  const s = D.scale;
  const W = D.torsoW;
  const chH = D.torsoH;

  const plateMat = (decal) => {
    const tex = decalTexture({ seed: def.seed + 3, ...def.skin.primary }, decal);
    return new THREE.MeshStandardMaterial({
      map: tex.map, normalMap: tex.normalMap,
      roughnessMap: tex.rmMap, metalnessMap: tex.rmMap,
      roughness: 1, metalness: 1,
    });
  };

  // ================= PELVIS / FRAME =================
  baseFrame(A, D);
  A.facet('hips', 'accent', W * 0.34, W * 0.4, W * 0.3, 0.6 * s, { sides: 8, scaleZ: 0.8, p: [0, -0.35 * s, 0] });

  // ================= CARAPACE SHELL =================
  // huge domed shell, wider than tall, overhanging front and sides
  A.lathe('torso', 'primary', [
    [chH * 0.08, W * 0.60], [chH * 0.22, W * 0.66], [chH * 0.5, W * 0.60],
    [chH * 0.78, W * 0.44], [chH * 0.95, W * 0.22], [chH * 1.0, 0.05 * s],
  ], { seg: 22, scaleZ: 0.82 });
  // dark under-shell rim
  A.ring('torso', 'dark', W * 0.58, 0.1 * s, { p: [0, chH * 0.1, 0], r: [Math.PI / 2, 0, 0] });
  // shell brow plate over the face
  A.plate('torso', 'accent', shieldOutline(W * 0.5, 0.5 * s, { taper: 0.8 }), 0.08 * s, {
    p: [0, chH * 0.34, W * 0.5], r: [1.15, 0, 0], round: 0.14 });
  // layered skirt plates around the brim
  for (const [a, ww] of [[-1.9, 0.5], [-0.95, 0.62], [0, 0.72], [0.95, 0.62], [1.9, 0.5]]) {
    A.plate('torso', 'primary', shieldOutline(W * 0.34 * ww, 0.62 * s, { taper: 0.6 }), 0.07 * s, {
      p: [Math.sin(a) * W * 0.52, chH * 0.12, Math.cos(a) * W * 0.44], r: [0.5, a, 0], round: 0.12 });
  }
  // nameplate + unit number on the shell front
  A.custom('torso', plateMat({ text: 'CRANKY', textScale: 0.2, color: '#e8dcc2' }),
    beveledPlate(shieldOutline(W * 0.4, 0.5 * s, { taper: 0.9 }), 0.05 * s, { round: 0.1 }), {
      p: [0, chH * 0.62, W * 0.44], r: [0.45, 0, 0] });
  A.custom('torso', plateMat({ text: '07', textScale: 0.3, color: '#e8dcc2' }),
    beveledPlate(shieldOutline(W * 0.18, 0.3 * s, { taper: 0.9 }), 0.04 * s, { round: 0.1 }), {
      p: [W * 0.36, chH * 0.5, W * 0.36], r: [0.45, 0.5, 0] });
  // crown spike antennae
  for (let i = -2; i <= 2; i++) {
    A.spike('torso', 'dark', 0.05 * s, (0.55 - Math.abs(i) * 0.09) * s, {
      p: [i * 0.28 * s, chH * (0.96 - Math.abs(i) * 0.04), -0.1 * s], seg: 6 });
  }

  // ================= EMBEDDED FACE =================
  const faceZ = W * 0.36;
  A.box('torso', 'dark', [W * 0.5, chH * 0.3, 0.18 * s], { p: [0, chH * 0.18, faceZ - 0.05 * s] });
  // grill mouth
  A.vents('torso', 'frame', 5, W * 0.16, chH * 0.2, 0.06 * s, { p: [0, chH * 0.14, faceZ + 0.06 * s] });
  // quad LED eye clusters
  for (const sx of [-1, 1]) {
    A.box('torso', 'frame', [0.3 * s, 0.3 * s, 0.1 * s], { p: [sx * W * 0.24, chH * 0.24, faceZ] });
    for (const ex of [-1, 1]) for (const ey of [-1, 1]) {
      A.ball('torso', 'glow', 0.055 * s, {
        p: [sx * W * 0.24 + ex * 0.07 * s, chH * 0.24 + ey * 0.07 * s, faceZ + 0.07 * s] });
    }
  }
  // pipe mandibles framing the face
  for (const sx of [-1, 1]) {
    A.tube('torso', 'dark', 0.06 * s, 0.06 * s, chH * 0.34, {
      p: [sx * W * 0.4, chH * 0.16, faceZ - 0.02 * s], r: [0.25, 0, sx * 0.35] });
  }

  // ================= SHOULDER WATER CANNONS + TANKS =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const bx = sx * W * 0.42, by = chH * 0.88, bz = 0.05 * s;
    // mount bracket
    A.taper('torso', 'dark', [0.34 * s, 0.4 * s, 0.4 * s], 0.8, 0.8, { p: [bx, by - 0.14 * s, bz] });
    // barrel (blue steel accent), pointing forward
    const bl = 1.55 * s;
    A.tube('torso', 'accent', 0.13 * s, 0.16 * s, bl, { p: [bx, by, bz + bl * 0.4], r: [Math.PI / 2, 0, 0] });
    for (let i = 0; i < 3; i++) { // band rings
      A.ring('torso', 'metal', 0.155 * s, 0.028 * s, { p: [bx, by, bz + (0.25 + i * 0.4) * bl] });
    }
    // glowing muzzle ring + bore
    A.ring('torso', 'glow', 0.13 * s, 0.035 * s, { p: [bx, by, bz + bl * 0.92] });
    A.tube('torso', 'dark', 0.09 * s, 0.09 * s, 0.16 * s, { p: [bx, by, bz + bl * 0.94], r: [Math.PI / 2, 0, 0] });
    // riveted water tank behind, brass bands + hose
    A.capsule('torso', 'accent', 0.26 * s, 0.5 * s, { p: [bx, by + 0.05 * s, bz - 0.75 * s] });
    for (const t of [-0.14, 0.14]) {
      A.ring('torso', 'metal', 0.265 * s, 0.03 * s, { p: [bx, by + 0.05 * s + t * s, bz - 0.75 * s], r: [Math.PI / 2, 0, 0] });
    }
    A.tube('torso', 'dark', 0.045 * s, 0.045 * s, 0.7 * s, {
      p: [bx + sx * 0.12 * s, by + 0.1 * s, bz - 0.35 * s], r: [1.35, 0, sx * 0.3] });
    anchors['muzzle' + side] = addAnchor(J.torso, bx, by, bz + bl * 0.98);
  }

  // ================= ARMS -> GIANT CRAB CLAWS =================
  // The claw IS the hand: a bulbous propodus riding straight off the wrist,
  // a fixed lower finger and a hinged upper dactyl (the 'jaw' joint the
  // animator snaps shut on attacks) forming a forward-opening pincer.
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    standardArm(A, D, side, { fist: false, foreArmor: false, bulk: 1.05 });
    const ha = 'hand' + side;
    // forearm shell cap
    A.facet('elbow' + side, 'primary', 0.3 * s, 0.36 * s, 0.3 * s, D.foreArmLen * 0.8, {
      sides: 8, p: [0, -D.foreArmLen * 0.5, 0] });

    // wrist knuckle blends the claw into the arm
    A.ball(ha, 'frame', 0.3 * s, { p: [0, 0, 0] });
    // PROPODUS: fat claw-hand bulb lying along the forearm's forward axis
    // (capsules default along Y; tip them forward so the claw juts ahead)
    A.capsule(ha, 'primary', 0.46 * s, 0.62 * s, { p: [sx * 0.05 * s, -0.16 * s, 0.34 * s], r: [Math.PI / 2 - 0.28, 0, 0] });
    A.capsule(ha, 'primary', 0.34 * s, 0.5 * s, { p: [sx * 0.04 * s, -0.34 * s, 0.74 * s], r: [Math.PI / 2 - 0.15, 0, 0] });
    // rust ridge along the top of the bulb
    A.box(ha, 'accent', [0.12 * s, 0.16 * s, 0.7 * s], { p: [sx * 0.05 * s, 0.06 * s, 0.42 * s], r: [-0.2, 0, 0] });

    // FIXED lower finger (dactyl) — curved to a point, opening upward
    A.blade(ha, 'primary', 1.15 * s, 0.42 * s, 0.28 * s, {
      p: [sx * 0.02 * s, -0.46 * s, 1.02 * s], r: [Math.PI / 2 + 0.18, 0, 0], taper: 0.16 });
    A.spike(ha, 'primary', 0.13 * s, 0.5 * s, { p: [sx * 0.02 * s, -0.5 * s, 1.5 * s], r: [Math.PI / 2 - 0.35, 0, 0], seg: 6 });
    // inner saw teeth on the lower finger
    for (let i = 0; i < 5; i++) {
      A.spike(ha, 'metal', 0.05 * s, 0.15 * s, {
        p: [sx * 0.02 * s, -0.34 * s, (0.7 + i * 0.18) * s], r: [0, 0, 0], seg: 5 });
    }

    // HINGED upper dactyl on its own joint (pivots at the front of the bulb)
    const jaw = 'jaw' + side;
    addJoint(J, jaw, ha, sx * 0.02 * s, 0.12 * s, 0.68 * s);
    A.blade(jaw, 'primary', 1.0 * s, 0.38 * s, 0.24 * s, {
      p: [0, 0.12 * s, 0.42 * s], r: [Math.PI / 2 + 0.5, 0, 0], taper: 0.18 });
    A.spike(jaw, 'primary', 0.11 * s, 0.42 * s, { p: [0, 0.2 * s, 0.86 * s], r: [Math.PI / 2 + 0.9, 0, 0], seg: 6 });
    for (let i = 0; i < 4; i++) {
      A.spike(jaw, 'metal', 0.045 * s, 0.13 * s, {
        p: [0, 0.05 * s, (0.24 + i * 0.18) * s], r: [Math.PI, 0, 0], seg: 5 });
    }
    // glowing hydraulic seam on the knuckle
    A.box(ha, 'glow', [0.04 * s, 0.04 * s, 0.34 * s], { p: [sx * 0.22 * s, 0.02 * s, 0.5 * s], r: [-0.15, 0, 0] });

    anchors['claw' + side] = addAnchor(J[ha], 0, -0.4 * s, 1.6 * s);
  }

  // ================= LEGS + DECOR CRAB LEGS =================
  for (const side of ['L', 'R']) {
    standardLeg(A, D, side, { bulk: 1.12 });
    A.plate('thigh' + side, 'primary', shieldOutline(0.5 * s, 0.9 * s, { taper: 0.7 }), 0.07 * s, {
      p: [(side === 'L' ? -1 : 1) * 0.18 * s, -D.thighLen * 0.45, 0.12 * s],
      r: [0.1, (side === 'L' ? -1 : 1) * 0.9, 0], round: 0.14 });
  }
  // two decorative crab legs per side, arching out from the hips
  for (const sx of [-1, 1]) {
    for (const [zoff, tilt] of [[0.22, 0.35], [-0.28, -0.3]]) {
      A.tube('hips', 'dark', 0.07 * s, 0.09 * s, 0.85 * s, {
        p: [sx * (D.hipW + 0.3 * s), 0.28 * s, zoff * s], r: [tilt, 0, sx * 1.85] });
      A.blade('hips', 'primary', 0.9 * s, 0.16 * s, 0.12 * s, {
        p: [sx * (D.hipW + 0.85 * s), -0.08 * s, zoff * s * 1.5],
        r: [Math.PI + tilt * 0.6, 0, sx * 0.7], taper: 0.35 });
    }
  }

  anchors.core = addAnchor(J.torso, 0, chH * 0.24, faceZ + 0.1 * s);
}
