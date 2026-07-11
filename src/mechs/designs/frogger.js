// FROGGER — the gunk gladiator, matched to docs/canonical/mech_frogger.png:
// lime-green frog mech whose head merges into a wide torso, two huge glass
// bug-eye domes on top, a translucent dripping slime visor, FOUR slime guns
// (two shoulder cannons + two nozzle arms), crouched springy legs and huge
// webbed feet with translucent toes. Everything oozes.
import * as THREE from 'three';
import { beveledPlate, shieldOutline, sphere, cone } from '../parts.js';
import { decalTexture } from '../../core/pbrtex.js';
import { baseFrame, standardArm, raptorLeg, addAnchor } from '../factory.js';

export function frogger(A, D, J, anchors, def) {
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
  // translucent lime smart-slime (glacier-crystal pattern)
  const slime = new THREE.MeshPhysicalMaterial({
    color: 0x9ade2a, transmission: 0.45, transparent: true, opacity: 0.82,
    roughness: 0.15, metalness: 0.0, thickness: 0.4,
    emissive: 0x7ab820, emissiveIntensity: 0.2,
  });
  const eyeGlass = new THREE.MeshPhysicalMaterial({
    color: 0xb8e858, transmission: 0.5, transparent: true, opacity: 0.75,
    roughness: 0.08, metalness: 0.0, thickness: 0.3,
  });
  // hanging slime drip: blob + tapering bead below
  const drip = (joint, x, y, z, sc = 1) => {
    A.custom(joint, slime, sphere(0.1 * s * sc, 8), { p: [x, y, z] });
    A.custom(joint, slime, cone(0.06 * s * sc, 0.3 * s * sc, 6), { p: [x, y - 0.17 * s * sc, z], r: [Math.PI, 0, 0] });
  };

  // ================= FRAME + FROG BODY-HEAD =================
  baseFrame(A, D);
  // rounded wide torso that IS the head: big smooth dome
  A.lathe('torso', 'primary', [
    [chH * 0.02, W * 0.42], [chH * 0.3, W * 0.55], [chH * 0.62, W * 0.56],
    [chH * 0.88, W * 0.44], [chH * 1.08, W * 0.2], [chH * 1.14, 0.05 * s],
  ], { seg: 20, scaleZ: 0.9 });
  // wide grin mouth-line seam across the front
  A.box('torso', 'dark', [W * 0.82, 0.05 * s, 0.1 * s], { p: [0, chH * 0.52, W * 0.44], r: [0.15, 0, 0] });
  for (const sx of [-1, 1]) { // grin corners curl up
    A.box('torso', 'dark', [W * 0.16, 0.05 * s, 0.08 * s], {
      p: [sx * W * 0.46, chH * 0.56, W * 0.34], r: [0.15, -sx * 0.7, sx * 0.35] });
  }
  // SLIMER decal on the brow
  A.custom('torso', plateMat({ text: 'SLIMER', textScale: 0.17, color: '#e2f0c8' }),
    beveledPlate(shieldOutline(W * 0.34, 0.34 * s, { taper: 0.9 }), 0.04 * s, { round: 0.1 }), {
      p: [0, chH * 0.86, W * 0.4], r: [0.55, 0, 0] });
  // translucent slime visor/bib below the mouth, dripping
  A.custom('torso', slime,
    beveledPlate(shieldOutline(W * 0.6, chH * 0.42, { taper: 0.55 }), 0.09 * s, { round: 0.2 }), {
      p: [0, chH * 0.18, W * 0.42], r: [0.18, 0, 0] });
  drip('torso', -W * 0.2, chH * 0.02, W * 0.46);
  drip('torso', W * 0.12, chH * -0.04, W * 0.45, 1.3);
  drip('torso', W * 0.32, chH * 0.06, W * 0.4, 0.8);
  // glowing abdomen slits
  for (let i = 0; i < 2; i++) {
    A.box('hips', 'glow', [0.3 * s, 0.045 * s, 0.05 * s], { p: [0, (0.05 - i * 0.16) * s, D.torsoD * 0.42] });
  }

  // ================= BUG-EYE DOMES ON TOP =================
  for (const sx of [-1, 1]) {
    const ex = sx * W * 0.4, ey = chH * 1.06, ez = W * 0.14;
    A.ring('torso', 'dark', 0.36 * s, 0.06 * s, { p: [ex, ey, ez], r: [0.5, 0, 0] }); // mount ring
    A.custom('torso', eyeGlass, sphere(0.38 * s, 18), { p: [ex, ey + 0.1 * s, ez] });
    A.ball('torso', 'dark', 0.16 * s, { p: [ex, ey + 0.18 * s, ez + 0.22 * s] }); // pupil
  }

  // ================= UPPER SLIME CANNONS (arms 3 + 4) =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const px = sx * W * 0.6, py = chH * 0.98, pz = -0.05 * s;
    // raised shoulder pod
    A.facet('torso', 'accent', 0.32 * s, 0.4 * s, 0.26 * s, 0.65 * s, {
      sides: 8, p: [px, py - 0.1 * s, pz], r: [0, 0, -sx * 0.55] });
    // big cannon barrel riding high, angled slightly out
    const bl = 1.7 * s;
    const bx = px + sx * 0.42 * s, by = py + 0.38 * s;
    A.tube('torso', 'primary', 0.19 * s, 0.23 * s, bl, {
      p: [bx, by, pz + bl * 0.34], r: [Math.PI / 2, 0, sx * 0.08] });
    // translucent glowing core section
    A.custom('torso', slime, new THREE.CylinderGeometry(0.21 * s, 0.21 * s, bl * 0.32, 12), {
      p: [bx, by, pz + bl * 0.46], r: [Math.PI / 2, 0, 0] });
    A.ring('torso', 'dark', 0.22 * s, 0.04 * s, { p: [bx, by, pz + bl * 0.66] });
    // dripping muzzle
    A.tube('torso', 'dark', 0.13 * s, 0.17 * s, 0.26 * s, { p: [bx, by, pz + bl * 0.92], r: [Math.PI / 2, 0, 0] });
    drip('torso', bx, by - 0.14 * s, pz + bl * 0.95, 1.2);
    drip('torso', bx + sx * 0.08 * s, by - 0.1 * s, pz + bl * 0.8, 0.7);
    anchors['muzzle' + side] = addAnchor(J.torso, bx, by, pz + bl * 1.0);
  }

  // ================= LOWER ARMS: SLIME-TUBE NOZZLES =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    standardArm(A, D, side, { fist: false, foreArmor: false, bulk: 0.9 });
    // translucent slime-tube forearm
    A.custom('elbow' + side, slime, new THREE.CylinderGeometry(0.17 * s, 0.2 * s, D.foreArmLen * 0.8, 12), {
      p: [0, -D.foreArmLen * 0.5, 0] });
    A.ring('elbow' + side, 'dark', 0.2 * s, 0.035 * s, {
      p: [0, -D.foreArmLen * 0.15, 0], r: [Math.PI / 2, 0, 0] });
    // nozzle gun hand
    A.tube('hand' + side, 'accent', 0.09 * s, 0.15 * s, 0.5 * s, { p: [0, -0.15 * s, 0.2 * s], r: [Math.PI / 2.3, 0, 0] });
    A.ring('hand' + side, 'glow', 0.09 * s, 0.025 * s, { p: [0, -0.25 * s, 0.42 * s], r: [0.4, 0, 0] });
    drip('hand' + side, sx * 0.04 * s, -0.36 * s, 0.42 * s, 0.9);
  }

  // ================= LEGS: SPRING CROUCH + WEBBED FEET =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    raptorLeg(A, D, side, { bulk: 1.1 });
    // lime thigh plate
    A.plate('thigh' + side, 'primary', shieldOutline(0.44 * s, 0.85 * s, { taper: 0.7 }), 0.06 * s, {
      p: [sx * 0.16 * s, -D.thighLen * 0.42, 0.1 * s], r: [0.1, sx * 0.8, 0], round: 0.14 });
    // translucent slime shin section
    A.custom('knee' + side, slime, new THREE.CylinderGeometry(0.13 * s, 0.16 * s, D.shinLen * 0.5, 10), {
      p: [0, -D.shinLen * 0.45, 0.02 * s] });
    // HUGE webbed foot: wide flat plates + translucent toe tips
    const an = 'ankle' + side;
    A.taper(an, 'primary', [0.62 * s, 0.14 * s, 0.9 * s], 1.5, 0.9, { p: [0, -0.14 * s, 0.32 * s] });
    for (let i = -1; i <= 1; i++) {
      A.blade(an, 'primary', 0.5 * s, 0.2 * s, 0.1 * s, {
        p: [i * 0.26 * s, -0.16 * s, 0.72 * s], r: [Math.PI / 2 + 0.12, 0, i * 0.3], taper: 0.6 });
      A.custom(an, slime, sphere(0.09 * s, 8), { p: [i * 0.32 * s, -0.14 * s, 0.95 * s] });
    }
  }

  anchors.core = addAnchor(J.torso, 0, chH * 0.3, W * 0.48);
}
