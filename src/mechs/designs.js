// The 12 mech designs. Each function decorates the shared rig with unique
// armor, head, weapons and signature elements, and registers anchors.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox } from './parts.js';
import { decalTexture } from '../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from './factory.js';

function addJoint(joints, name, parentName, x, y, z) {
  const g = new THREE.Group();
  g.name = name;
  g.position.set(x, y, z);
  joints[parentName].add(g);
  joints[name] = g;
  return g;
}

// ============================================================
// 1. TITANUS — colossal brawler. Boxy industrial hulk, huge fists,
//    exhaust stacks, hazard stripes, single amber visor slit.
// ============================================================
function titanus(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  standardLeg(A, D, 'L', { bulk: 1.2 }); standardLeg(A, D, 'R', { bulk: 1.2 });
  standardArm(A, D, 'L', { bulk: 1.35 }); standardArm(A, D, 'R', { bulk: 1.35 });

  // massive chest block, extra plating
  A.taper('torso', 'primary', [D.torsoW * 1.5, D.torsoH * 0.95, D.torsoD * 1.15], 0.88, 0.8, {
    p: [0, D.torsoH * 0.55, 0.05 * s],
  });
  A.box('torso', 'accent', [D.torsoW * 0.9, D.torsoH * 0.4, 0.2 * s], {
    p: [0, D.torsoH * 0.62, D.torsoD * 0.62] });
  A.vents('torso', 'dark', 5, D.torsoW * 0.7, 0.3 * s, 0.06 * s, {
    p: [0, D.torsoH * 0.32, D.torsoD * 0.66] });
  // exhaust stacks on back
  for (const sx of [-1, 1]) {
    A.tube('torso', 'metal', 0.14 * s, 0.17 * s, 1.5 * s, {
      p: [sx * D.torsoW * 0.55, D.torsoH * 0.95, -D.torsoD * 0.55], r: [0.25, 0, sx * -0.15] });
    A.tube('torso', 'dark', 0.15 * s, 0.15 * s, 0.1 * s, {
      p: [sx * D.torsoW * 0.62, D.torsoH * 1.38, -D.torsoD * 0.73], r: [0.25, 0, sx * -0.15] });
  }
  // head: low armored block w/ amber visor slit
  A.taper('head', 'primary', [D.headSize * 2.2, D.headSize * 1.5, D.headSize * 1.9], 0.85, 0.8, {
    p: [0, D.headSize * 0.6, 0] });
  A.sharpBox('head', 'glow', [D.headSize * 1.5, D.headSize * 0.28, 0.06 * s], {
    p: [0, D.headSize * 0.62, D.headSize * 0.95] });
  A.sharpBox('head', 'dark', [D.headSize * 2.3, D.headSize * 0.3, D.headSize * 2.0], {
    p: [0, D.headSize * 1.35, 0] });
  // shoulder slabs
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    A.pauldron('shoulder' + side, 'primary', 1.0 * s, 1.1 * s, 1.0 * s, {
      p: [sx * 0.3 * s, 0.25 * s, 0], side: sx });
    A.sharpBox('shoulder' + side, 'glow', [0.08 * s, 0.5 * s, 0.7 * s], {
      p: [sx * 0.62 * s, 0.18 * s, 0] });
    // upgraded gauntlets & giant fists
    A.taper('elbow' + side, 'primary', [0.75 * s, D.foreArmLen * 0.9, 0.8 * s], 1.2, 1.15, {
      p: [0, -D.foreArmLen * 0.55, 0] });
    A.fist('hand' + side, 'frame', 'dark', 0.52 * s, { side: sx });
  }
  anchors.muzzleR = addAnchor(J.handR, 0, -0.3 * s, 0.5 * s);
  anchors.muzzleL = addAnchor(J.handL, 0, -0.3 * s, 0.5 * s);
  anchors.core = addAnchor(J.torso, 0, D.torsoH * 0.5, D.torsoD * 0.7);
}

// ============================================================
// 2. VULCAN — sculpted rebuild from the canonical concept image.
//    Rounded, machined forms throughout: bulging chest mass over a
//    pinched waist, barrel thighs, rhomboid faceted forearm housings,
//    beveled shield plates for knees/skirts, twin six-barrel gatlings,
//    quad missile towers with red lenses, crested head, orange visor.
// ============================================================
function vulcan(A, D, J, anchors, def) {
  const s = D.scale;
  const W = D.torsoW; // ~2.0 for VULCAN — the master width unit

  const plateMat = (decal) => {
    const tex = decalTexture({ seed: def.seed + 5, ...def.skin.accent }, decal);
    return new THREE.MeshStandardMaterial({
      map: tex.map, normalMap: tex.normalMap,
      roughnessMap: tex.rmMap, metalnessMap: tex.rmMap,
      roughness: 1, metalness: 1,
    });
  };

  // ================= WAIST / PELVIS =================
  // pinched articulated waist column rising out of the hip block
  A.lathe('hips', 'frame', [[0.55 * s, W * 0.3], [0.25 * s, W * 0.21], [-0.05 * s, W * 0.26]], {
    scaleX: 1.25 });
  for (let i = 0; i < 3; i++) { // vertebra rings
    A.tube('hips', 'dark', W * (0.23 - i * 0.01), W * (0.24 - i * 0.01), 0.07 * s, {
      p: [0, 0.14 * s + i * 0.16 * s, 0] });
  }
  // hip block: chamfered hex flare
  A.facet('hips', 'primary', W * 0.34, W * 0.42, W * 0.3, 0.85 * s, {
    sides: 6, scaleZ: 0.78, p: [0, -0.42 * s, 0] });
  // red front skirt shield + white side skirts (beveled plates)
  A.plate('hips', 'accent', shieldOutline(W * 0.42, 0.85 * s, { taper: 0.6 }), 0.09 * s, {
    p: [0, -0.55 * s, W * 0.34], r: [0.14, 0, 0] });
  for (const sx of [-1, 1]) {
    A.plate('hips', 'primary', shieldOutline(W * 0.34, 0.7 * s, { taper: 0.65 }), 0.08 * s, {
      p: [sx * W * 0.42, -0.5 * s, 0], r: [0.1, sx * Math.PI / 2, sx * 0.12] });
  }
  A.sharpBox('hips', 'dark', [W * 0.3, 0.3 * s, W * 0.24], { p: [0, -0.6 * s, -W * 0.18] });

  // ================= TORSO: bulging chest over the waist =================
  const chH = D.torsoH;
  // main chest mass — smooth wide bulge, widest just under the shoulders
  A.lathe('torso', 'primary', [
    [chH * 0.14, W * 0.30],
    [chH * 0.38, W * 0.52],
    [chH * 0.66, W * 0.62],
    [chH * 0.9, W * 0.55],
    [chH * 1.04, W * 0.34],
  ], { scaleX: 1.42, scaleZ: 0.74, seg: 28 });
  // pec pontoons: rounded masses angled over the upper chest
  for (const sx of [-1, 1]) {
    A.capsule('torso', 'primary', W * 0.17, W * 0.3, {
      p: [sx * W * 0.36, chH * 0.86, W * 0.28],
      r: [0.5, 0, sx * -1.15], s: [1, 1, 0.72] });
    // intake vent slit under each pontoon
    A.vents('torso', 'dark', 3, W * 0.26, 0.09 * s, 0.05 * s, {
      p: [sx * W * 0.38, chH * 0.66, W * 0.42], r: [0.3, 0, 0] });
  }
  // red center chest shield with VULCAN decal (beveled plate, dedicated skin)
  A.custom('torso', plateMat({
    text: 'VULCAN', textY: 0.34, textScale: 0.17,
    emblem: true, emblemY: 0.62, emblemScale: 0.14, color: '#e8e2d4',
  }), beveledPlate(shieldOutline(W * 0.56, chH * 0.62, { taper: 0.68 }), 0.1 * s, { round: 0.1 }), {
    p: [0, chH * 0.52, W * 0.46], r: [-0.06, 0, 0] });
  // collar ring
  A.tube('torso', 'frame', W * 0.17, W * 0.2, 0.16 * s, { p: [0, chH * 1.0, 0] });
  // exposed abdomen ribs bridging chest to waist
  for (let i = 0; i < 2; i++) {
    A.tube('torso', 'dark', W * (0.2 - i * 0.02), W * (0.22 - i * 0.02), 0.09 * s, {
      p: [0, chH * (0.06 - i * 0.09), 0] });
  }
  // brass waist pistons angling out to the chest
  for (const sx of [-1, 1]) {
    A.piston('torso', 'brass', [sx * W * 0.18, chH * -0.05, W * 0.12],
      [sx * W * 0.4, chH * 0.3, W * 0.2], 0.045 * s);
  }
  // back pack: chamfered block + radiators + coolant drums
  A.facet('torso', 'accent', W * 0.42, W * 0.48, W * 0.4, chH * 0.6, {
    sides: 8, scaleZ: 0.5, p: [0, chH * 0.55, -W * 0.42] });
  A.vents('torso', 'dark', 6, W * 0.66, chH * 0.3, 0.06 * s, {
    p: [0, chH * 0.55, -W * 0.62] });
  for (const sx of [-1, 1]) {
    A.capsule('torso', 'metal', 0.14 * s, 0.4 * s, {
      p: [sx * W * 0.3, chH * 0.92, -W * 0.4], r: [0, 0, Math.PI / 2] });
  }

  // ================= MISSILE TOWERS =================
  for (const sx of [-1, 1]) {
    const tx = sx * W * 0.74, ty = chH * 1.12, tz = -0.06 * s;
    // support cone from the shoulder line up into the pod
    A.lathe('torso', 'frame', [[ty - 0.85 * s - chH, 0], [0, W * 0.14], [0.4 * s, W * 0.2]].map(
      ([y, r]) => [y, r]), { p: [tx, ty - 0.72 * s, tz], scaleX: 1.2 });
    // pod: chamfered octagonal block
    A.facet('torso', 'primary', W * 0.32, W * 0.38, W * 0.33, 0.82 * s, {
      sides: 8, scaleZ: 0.95, p: [tx, ty, tz] });
    // red beveled cap
    A.plate('torso', 'accent', rhombOutline(W * 0.62, W * 0.56, { cut: 0.24 }), 0.16 * s, {
      p: [tx, ty + 0.5 * s, tz], r: [Math.PI / 2, 0, 0], round: 0.08 });
    // dark inset face + 2x2 tubes with red lenses
    A.plate('torso', 'dark', rhombOutline(W * 0.44, W * 0.44, { cut: 0.22 }), 0.05 * s, {
      p: [tx, ty + 0.02 * s, tz + W * 0.28] });
    for (let i = 0; i < 4; i++) {
      const ox = (i % 2 - 0.5) * 0.3 * s, oy = (Math.floor(i / 2) - 0.5) * 0.3 * s;
      A.tube('torso', 'metal', 0.105 * s, 0.115 * s, 0.16 * s, {
        p: [tx + ox, ty + 0.02 * s + oy, tz + W * 0.3], r: [Math.PI / 2, 0, 0] });
      A.ball('torso', 'glow2', 0.066 * s, { p: [tx + ox, ty + 0.02 * s + oy, tz + W * 0.33], seg: 10 });
    }
    // dark under-trim
    A.facet('torso', 'dark', W * 0.3, W * 0.33, W * 0.31, 0.16 * s, {
      sides: 8, scaleZ: 0.9, p: [tx, ty - 0.48 * s, tz] });
    // brass conduit up the inner face
    A.tube('torso', 'brass', 0.045 * s, 0.045 * s, 0.9 * s, {
      p: [tx - sx * W * 0.3, ty - 0.2 * s, tz - 0.1 * s], r: [0.25, 0, sx * 0.15] });
  }

  // ================= HEAD =================
  const hy = D.headSize * 0.95;
  A.tube('head', 'frame', D.headSize * 0.4, D.headSize * 0.48, D.headSize * 0.6, {
    p: [0, hy * 0.28, 0] });
  // rounded dome skull
  A.lathe('head', 'primary', [
    [-D.headSize * 0.55, D.headSize * 0.7],
    [D.headSize * 0.12, D.headSize * 0.8],
    [D.headSize * 0.62, D.headSize * 0.55],
    [D.headSize * 0.78, D.headSize * 0.22],
  ], { p: [0, hy + D.headSize * 0.66, 0.06 * s], scaleZ: 1.12, seg: 20 });
  // orange visor: wrapping three-segment strip
  A.sharpBox('head', 'glow', [D.headSize * 0.95, D.headSize * 0.24, 0.07 * s], {
    p: [0, hy + D.headSize * 0.62, D.headSize * 0.82] });
  for (const sx of [-1, 1]) {
    A.sharpBox('head', 'glow', [D.headSize * 0.4, D.headSize * 0.2, 0.06 * s], {
      p: [sx * D.headSize * 0.62, hy + D.headSize * 0.62, D.headSize * 0.6], r: [0, sx * 0.7, 0] });
  }
  // brow plate (rhomboid)
  A.plate('head', 'frame', rhombOutline(D.headSize * 1.5, D.headSize * 0.5, { cut: 0.3 }), D.headSize * 0.5, {
    p: [0, hy + D.headSize * 1.0, -D.headSize * 0.1], r: [-0.18, 0, 0], round: 0.2 });
  // chin grill
  A.vents('head', 'dark', 3, D.headSize * 0.6, D.headSize * 0.16, 0.05 * s, {
    p: [0, hy + D.headSize * 0.28, D.headSize * 0.66] });
  // red crest: center blade + swept antlers
  A.blade('head', 'accent', D.headSize * 1.5, D.headSize * 0.42, 0.06 * s, {
    p: [0, hy + D.headSize * 1.62, -D.headSize * 0.08], r: [-0.42, 0, 0], taper: 0.16 });
  for (const sx of [-1, 1]) {
    A.blade('head', 'accent', D.headSize * 1.15, D.headSize * 0.3, 0.05 * s, {
      p: [sx * D.headSize * 0.52, hy + D.headSize * 1.38, 0],
      r: [-0.6, 0, sx * 0.55], taper: 0.2 });
  }

  // ================= ARMS =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const sh = 'shoulder' + side, el = 'elbow' + side, ha = 'hand' + side;
    // widen the shoulder joints clear of the bulged chest silhouette
    J[sh].position.x = sx * (D.shoulderW + 0.3 * s);

    // hemispherical pauldron shell over a joint ball
    A.ball(sh, 'frame', 0.3 * s, {});
    A.lathe(sh, 'primary', [
      [-0.15 * s, W * 0.3],
      [0.22 * s, W * 0.26],
      [0.4 * s, W * 0.1],
    ], { p: [sx * 0.14 * s, 0.06 * s, 0], scaleZ: 0.92, seg: 20 });
    A.plate(sh, 'accent', rhombOutline(W * 0.4, W * 0.3, { cut: 0.3 }), 0.06 * s, {
      p: [sx * W * 0.3, 0.16 * s, 0], r: [0, sx * Math.PI / 2, 0], round: 0.15 });
    // bulged upper arm
    A.lathe(sh, 'primary', [
      [-D.upperArmLen * 0.95, 0.2 * s],
      [-D.upperArmLen * 0.55, 0.26 * s],
      [-D.upperArmLen * 0.15, 0.21 * s],
    ], { p: [sx * 0.04 * s, 0, 0], seg: 16 });
    // elbow ring
    A.part(el, 'metal', new THREE.CylinderGeometry(0.17 * s, 0.17 * s, 0.36 * s, 12), {
      r: [0, 0, Math.PI / 2] });
    // forearm: massive faceted rhomboid housing (red) w/ white spine plate
    A.facet(el, 'accent', 0.34 * s, 0.52 * s, 0.4 * s, D.foreArmLen * 1.05, {
      sides: 8, scaleZ: 1.06, p: [0, -D.foreArmLen * 0.52, 0] });
    A.plate(el, 'primary', rhombOutline(D.foreArmLen * 0.85, 0.5 * s, { cut: 0.28 }), 0.08 * s, {
      p: [0, -D.foreArmLen * 0.55, 0.5 * s], r: [0, 0, Math.PI / 2], round: 0.12 });
    A.piston(el, 'brass', [sx * 0.3 * s, -0.05 * s, -0.2 * s], [sx * 0.34 * s, -D.foreArmLen * 0.62, -0.26 * s], 0.045 * s);
    // wrist collar + gatling cluster on spinner joint
    A.tube(ha, 'frame', 0.4 * s, 0.46 * s, 0.5 * s, { p: [0, -0.05 * s, 0.08 * s], r: [Math.PI / 2, 0, 0] });
    A.ring(ha, 'brass', 0.4 * s, 0.05 * s, { p: [0, -0.05 * s, 0.34 * s] });
    const gat = addJoint(J, 'gatling' + side, ha, 0, -0.05 * s, 0.4 * s);
    A.barrelCluster('gatling' + side, 'metal', 6, 0.24 * s, 0.078 * s, 1.7 * s, { p: [0, 0, 0.72 * s] });
    A.tube('gatling' + side, 'metal', 0.085 * s, 0.085 * s, 1.8 * s, { p: [0, 0, 0.72 * s], r: [Math.PI / 2, 0, 0] });
    A.ring('gatling' + side, 'dark', 0.27 * s, 0.06 * s, { p: [0, 0, 1.5 * s] });
    A.ring('gatling' + side, 'frame', 0.29 * s, 0.06 * s, { p: [0, 0, 0.34 * s] });
  }
  J.gatling = J.gatlingR;

  // ================= LEGS =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const th = 'thigh' + side, kn = 'knee' + side, an = 'ankle' + side;

    // hip joint ball + barrel thigh (elliptical bulge)
    A.ball(th, 'frame', 0.27 * s, {});
    A.lathe(th, 'primary', [
      [-D.thighLen * 1.0, 0.24 * s],
      [-D.thighLen * 0.55, 0.34 * s],
      [-D.thighLen * 0.1, 0.27 * s],
    ], { scaleZ: 1.12, seg: 20 });
    // red rhomboid outer-thigh plate
    A.plate(th, 'accent', rhombOutline(0.42 * s, D.thighLen * 0.7, { cut: 0.26 }), 0.07 * s, {
      p: [sx * 0.32 * s, -D.thighLen * 0.5, 0.02 * s], r: [0, sx * Math.PI / 2, 0], round: 0.12 });

    // knee: joint sphere + red beveled knee shield
    A.ball(kn, 'metal', 0.2 * s, {});
    A.plate(kn, 'accent', shieldOutline(0.44 * s, 0.6 * s, { taper: 0.62 }), 0.1 * s, {
      p: [0, -0.02 * s, 0.3 * s], r: [0.15, 0, 0], round: 0.14 });
    A.piston(kn, 'brass', [0, 0.12 * s, -0.24 * s], [0, -D.shinLen * 0.42, -0.3 * s], 0.05 * s);

    // calf: faceted bulge, fuller at the top rear
    A.lathe(kn, 'primary', [
      [-D.shinLen * 1.0, 0.24 * s],
      [-D.shinLen * 0.68, 0.34 * s],
      [-D.shinLen * 0.3, 0.37 * s],
      [-D.shinLen * 0.05, 0.26 * s],
    ], { scaleZ: 1.16, seg: 20 });
    // stacked front shin guards (beveled shields)
    A.plate(kn, 'primary', shieldOutline(0.46 * s, 0.62 * s, { taper: 0.75 }), 0.09 * s, {
      p: [0, -D.shinLen * 0.42, 0.34 * s], r: [0.06, 0, 0], round: 0.12 });
    A.plate(kn, 'primary', shieldOutline(0.52 * s, 0.66 * s, { taper: 0.72 }), 0.09 * s, {
      p: [0, -D.shinLen * 0.8, 0.32 * s], r: [-0.06, 0, 0], round: 0.12 });
    // red outer calf plate with 07X marking
    A.custom(kn, plateMat({ text: '07X', textScale: 0.3, textY: 0.5, color: '#d8d2c4', alpha: 0.8 }),
      beveledPlate(rhombOutline(0.52 * s, D.shinLen * 0.62, { cut: 0.26 }), 0.07 * s, { round: 0.12 }), {
        p: [sx * 0.36 * s, -D.shinLen * 0.5, 0], r: [0, sx * Math.PI / 2, 0] });

    // ankle + broad rounded feet: two toe wedges + heel
    A.ball(an, 'frame', 0.18 * s, {});
    for (const tx of [-0.16, 0.16]) {
      A.part(an, 'primary', roundedBox(0.3 * s, 0.26 * s, 0.62 * s, 0.07 * s), {
        p: [tx * s, -0.14 * s, 0.3 * s], r: [-0.08, tx * 0.35, 0] });
    }
    A.facet(an, 'frame', 0.2 * s, 0.24 * s, 0.16 * s, 0.3 * s, {
      sides: 6, p: [0, -0.14 * s, -0.18 * s], r: [Math.PI / 2.4, 0, 0] });
    A.sharpBox(an, 'dark', [0.52 * s, 0.1 * s, 0.9 * s], { p: [0, -0.26 * s, 0.12 * s] });
  }

  anchors.muzzleR = addAnchor(J.gatlingR, 0, 0, 1.5 * s);
  anchors.muzzleL = addAnchor(J.gatlingL, 0, 0, 1.5 * s);
  anchors.podL = addAnchor(J.torso, -W * 0.74, chH * 1.18, 0.5 * s);
  anchors.podR = addAnchor(J.torso, W * 0.74, chH * 1.18, 0.5 * s);
  anchors.core = addAnchor(J.torso, 0, chH * 0.5, W * 0.4);
}

// ============================================================
// 3. AEGIS — shield paladin. White & gold knight, tower shield,
//    energy lance, head crest, banner plates.
// ============================================================
function aegis(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  standardLeg(A, D, 'L'); standardLeg(A, D, 'R');
  standardArm(A, D, 'L', { fist: false }); standardArm(A, D, 'R', { fist: false });

  // regal chest: layered plates + gold trim + core gem
  A.taper('torso', 'primary', [D.torsoW * 1.3, D.torsoH * 0.92, D.torsoD * 1.0], 0.82, 0.78, {
    p: [0, D.torsoH * 0.52, 0.02 * s] });
  A.taper('torso', 'accent', [D.torsoW * 0.85, D.torsoH * 0.5, 0.24 * s], 0.6, 1, {
    p: [0, D.torsoH * 0.6, D.torsoD * 0.55] });
  A.ball('torso', 'glow', 0.16 * s, { p: [0, D.torsoH * 0.66, D.torsoD * 0.68] });
  A.ring('torso', 'metal', 0.22 * s, 0.045 * s, { p: [0, D.torsoH * 0.66, D.torsoD * 0.66] });
  // knight helm with crest fin
  A.taper('head', 'primary', [D.headSize * 1.7, D.headSize * 1.7, D.headSize * 1.8], 0.75, 0.9, {
    p: [0, D.headSize * 0.7, 0] });
  A.sharpBox('head', 'glow', [D.headSize * 1.1, D.headSize * 0.2, 0.05 * s], {
    p: [0, D.headSize * 0.65, D.headSize * 0.92] });
  A.blade('head', 'accent', D.headSize * 2.2, D.headSize * 0.9, 0.07 * s, {
    p: [0, D.headSize * 1.6, -D.headSize * 0.2], r: [-0.25, 0, 0], taper: 0.35 });
  // winged pauldrons
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    A.pauldron('shoulder' + side, 'primary', 0.9 * s, 0.95 * s, 0.9 * s, {
      p: [sx * 0.26 * s, 0.24 * s, 0], side: sx });
    A.blade('shoulder' + side, 'accent', 0.9 * s, 0.35 * s, 0.05 * s, {
      p: [sx * 0.55 * s, 0.55 * s, -0.1 * s], r: [0, 0, sx * 0.5], taper: 0.3 });
  }
  // back banners (twin plates like a cape)
  for (const sx of [-1, 1]) {
    A.blade('torso', 'accent', D.torsoH * 1.15, 0.5 * s, 0.05 * s, {
      p: [sx * D.torsoW * 0.42, D.torsoH * 0.15, -D.torsoD * 0.62],
      r: [Math.PI - 0.16, 0, sx * 0.1], taper: 0.75 });
  }
  // tower shield on left forearm
  const sh = addJoint(J, 'shield', 'elbowL', -0.3 * s, -D.foreArmLen * 0.5, 0);
  A.taper('shield', 'primary', [1.5 * s, 2.6 * s, 0.16 * s], 0.75, 1, { p: [0, 0, 0.05 * s] });
  A.taper('shield', 'accent', [1.1 * s, 2.1 * s, 0.1 * s], 0.72, 1, { p: [0, 0, 0.16 * s] });
  A.sharpBox('shield', 'glow', [0.12 * s, 1.6 * s, 0.06 * s], { p: [0, 0, 0.24 * s] });
  A.sharpBox('shield', 'glow', [0.7 * s, 0.12 * s, 0.06 * s], { p: [0, 0.4 * s, 0.24 * s] });
  sh.rotation.y = -0.12;
  // energy lance in right hand
  A.tube('handR', 'metal', 0.07 * s, 0.09 * s, 2.4 * s, { p: [0, -0.2 * s, 0.7 * s], r: [Math.PI / 2, 0, 0] });
  A.tube('handR', 'accent', 0.14 * s, 0.2 * s, 0.5 * s, { p: [0, -0.2 * s, 0.2 * s], r: [Math.PI / 2, 0, 0] });
  A.spike('handR', 'glow', 0.09 * s, 0.9 * s, { p: [0, -0.2 * s, 2.3 * s], r: [Math.PI / 2, 0, 0] });
  A.fist('handR', 'frame', 'dark', 0.3 * s, { side: 1 });
  anchors.muzzleR = addAnchor(J.handR, 0, -0.2 * s, 2.6 * s);
  anchors.shield = addAnchor(J.shield, 0, 0, 0.2 * s);
}

// ============================================================
// 4. VIPER — twin-blade assassin. Sleek purple/black, raptor legs,
//    forearm energy blades, snake-eye visor, fanged mask.
// ============================================================
function viper(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  raptorLeg(A, D, 'L'); raptorLeg(A, D, 'R');
  standardArm(A, D, 'L', { bulk: 0.8, fist: false }); standardArm(A, D, 'R', { bulk: 0.8, fist: false });

  // slim angular chest with layered fins
  A.taper('torso', 'primary', [D.torsoW * 1.1, D.torsoH * 0.85, D.torsoD * 0.9], 0.65, 0.6, {
    p: [0, D.torsoH * 0.5, 0.02 * s] });
  for (let i = 0; i < 3; i++) {
    A.blade('torso', 'accent', 0.5 * s, 0.32 * s, 0.05 * s, {
      p: [0, D.torsoH * (0.35 + i * 0.18), D.torsoD * (0.55 - i * 0.04)],
      r: [0.9, 0, 0], taper: 0.4 });
  }
  // serpent head: narrow, fanged chin guard, cyclops slit
  A.taper('head', 'primary', [D.headSize * 1.3, D.headSize * 1.1, D.headSize * 2.2], 0.6, 0.55, {
    p: [0, D.headSize * 0.5, D.headSize * 0.25] });
  A.sharpBox('head', 'glow', [D.headSize * 0.9, D.headSize * 0.14, 0.05 * s], {
    p: [0, D.headSize * 0.58, D.headSize * 1.15], r: [0.08, 0, 0] });
  for (const sx of [-1, 1]) {
    A.spike('head', 'dark', 0.05 * s, 0.22 * s, {
      p: [sx * D.headSize * 0.42, D.headSize * 0.08, D.headSize * 1.0], r: [Math.PI, 0, 0], seg: 6 });
    // swept head fins
    A.blade('head', 'accent', D.headSize * 1.4, D.headSize * 0.5, 0.04 * s, {
      p: [sx * D.headSize * 0.7, D.headSize * 0.9, -D.headSize * 0.4],
      r: [-2.2, 0, sx * 0.35], taper: 0.25 });
  }
  // compact shoulders + forearm blades
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    A.taper('shoulder' + side, 'primary', [0.5 * s, 0.55 * s, 0.6 * s], 0.6, 0.7, {
      p: [sx * 0.2 * s, 0.2 * s, 0], r: [0, 0, sx * 0.3] });
    // hand: sleek claw block
    A.taper('hand' + side, 'frame', [0.28 * s, 0.4 * s, 0.3 * s], 0.8, 0.8, {});
    // energy blade sweeping forward from forearm
    const bl = addJoint(J, 'blade' + side, 'hand' + side, 0, -0.1 * s, 0.1 * s);
    A.blade('blade' + side, 'glow', 2.2 * s, 0.22 * s, 0.04 * s, {
      p: [sx * 0.05 * s, -0.2 * s, 1.0 * s], r: [Math.PI / 2 + 0.08, 0, 0], taper: 0.12 });
    A.blade('blade' + side, 'dark', 2.3 * s, 0.3 * s, 0.06 * s, {
      p: [sx * 0.09 * s, -0.2 * s, 0.95 * s], r: [Math.PI / 2 + 0.08, 0, 0], taper: 0.15 });
  }
  anchors.muzzleR = addAnchor(J.handR, 0, -0.15 * s, 0.4 * s);
  anchors.bladeL = addAnchor(J.bladeL, 0, -0.2 * s, 2.0 * s);
  anchors.bladeR = addAnchor(J.bladeR, 0, -0.2 * s, 2.0 * s);
}

// ============================================================
// 5. NOVA — plasma archmage. White/teal robes-armor, rotating halo,
//    staff cannon, glowing core, serene mask face.
// ============================================================
function nova(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  standardLeg(A, D, 'L', { bulk: 0.85 }); standardLeg(A, D, 'R', { bulk: 0.85 });
  standardArm(A, D, 'L', { bulk: 0.8, fist: false }); standardArm(A, D, 'R', { bulk: 0.8, fist: false });

  // robe-like skirt armor around hips
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
    A.blade('hips', 'primary', 1.15 * s, 0.55 * s, 0.06 * s, {
      p: [Math.sin(a) * 0.62 * s, -0.55 * s, Math.cos(a) * 0.55 * s],
      r: [Math.PI + Math.cos(a) * -0.28, a, Math.sin(a) * 0.28], taper: 1.3 });
  }
  // slender chest with big glowing core
  A.taper('torso', 'primary', [D.torsoW * 1.05, D.torsoH * 0.9, D.torsoD * 0.85], 0.7, 0.65, {
    p: [0, D.torsoH * 0.52, 0] });
  A.ball('torso', 'glow', 0.26 * s, { p: [0, D.torsoH * 0.55, D.torsoD * 0.42] });
  A.ring('torso', 'accent', 0.36 * s, 0.05 * s, { p: [0, D.torsoH * 0.55, D.torsoD * 0.42] });
  // serene mask head w/ hood shape
  A.ball('head', 'accent', D.headSize * 1.05, { p: [0, D.headSize * 0.62, -D.headSize * 0.1] });
  A.taper('head', 'primary', [D.headSize * 1.6, D.headSize * 1.9, D.headSize * 1.5], 0.4, 0.6, {
    p: [0, D.headSize * 0.8, -D.headSize * 0.25] });
  A.sharpBox('head', 'glow', [D.headSize * 0.16, D.headSize * 0.5, 0.04 * s], {
    p: [0, D.headSize * 0.55, D.headSize * 0.78] }); // vertical third-eye slit
  // rotating halo behind shoulders
  const halo = addJoint(J, 'halo', 'torso', 0, D.torsoH * 1.05, -D.torsoD * 0.7);
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2;
    A.part('halo', 'glowSoft', new THREE.TorusGeometry(0.85 * s, 0.05 * s, 6, 10, Math.PI / 3), {
      r: [0, 0, a + 0.26] });
  }
  A.ring('halo', 'metal', 0.62 * s, 0.03 * s, {});
  // staff-cannon held in right hand
  A.tube('handR', 'metal', 0.06 * s, 0.06 * s, 3.4 * s, { p: [0, -0.15 * s, 0.4 * s], r: [Math.PI / 2, 0, 0] });
  A.ball('handR', 'glow', 0.2 * s, { p: [0, -0.15 * s, 2.2 * s] });
  for (let i = 0; i < 3; i++) { // orbital prongs at staff head
    const a = (i / 3) * Math.PI * 2;
    A.blade('handR', 'accent', 0.55 * s, 0.12 * s, 0.04 * s, {
      p: [Math.cos(a) * 0.22 * s, -0.15 * s + Math.sin(a) * 0.22 * s, 2.15 * s],
      r: [0.5, 0, a], taper: 0.2 });
  }
  A.fist('handR', 'frame', 'dark', 0.26 * s, { side: 1 });
  A.fist('handL', 'frame', 'dark', 0.26 * s, { side: -1 });
  anchors.muzzleR = addAnchor(J.handR, 0, -0.15 * s, 2.35 * s);
}

// ============================================================
// 6. RHINO — charging bull. Hunched steel-gray hulk, giant chrome
//    horn, ram shoulders, red eyes, vented snout.
// ============================================================
function rhino(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  standardLeg(A, D, 'L', { bulk: 1.25 }); standardLeg(A, D, 'R', { bulk: 1.25 });
  standardArm(A, D, 'L', { bulk: 1.25 }); standardArm(A, D, 'R', { bulk: 1.25 });

  // hunched barrel chest
  A.taper('torso', 'primary', [D.torsoW * 1.5, D.torsoH * 1.0, D.torsoD * 1.25], 0.95, 0.75, {
    p: [0, D.torsoH * 0.5, 0.12 * s], r: [0.14, 0, 0] });
  A.taper('torso', 'accent', [D.torsoW * 1.1, D.torsoH * 0.45, 0.3 * s], 0.8, 1, {
    p: [0, D.torsoH * 0.42, D.torsoD * 0.68], r: [0.1, 0, 0] });
  // spine ridge plates
  for (let i = 0; i < 4; i++) {
    A.taper('torso', 'metal', [0.4 * s - i * 0.06 * s, 0.3 * s, 0.35 * s], 0.5, 0.7, {
      p: [0, D.torsoH * (0.55 + i * 0.16), -D.torsoD * 0.6], r: [-0.4, 0, 0] });
  }
  // bull head low between shoulders: broad snout + THE HORN
  A.taper('head', 'primary', [D.headSize * 2.1, D.headSize * 1.4, D.headSize * 2.3], 0.8, 0.7, {
    p: [0, D.headSize * 0.5, D.headSize * 0.3] });
  A.vents('head', 'dark', 4, D.headSize * 1.2, 0.16 * s, 0.05 * s, {
    p: [0, D.headSize * 0.3, D.headSize * 1.4] });
  A.spike('head', 'metal', 0.16 * s, 1.5 * s, {
    p: [0, D.headSize * 1.0, D.headSize * 1.3], r: [Math.PI / 2.6, 0, 0], seg: 12 });
  A.spike('head', 'metal', 0.09 * s, 0.55 * s, {
    p: [0, D.headSize * 1.35, D.headSize * 0.5], r: [Math.PI / 3.2, 0, 0], seg: 10 });
  for (const sx of [-1, 1]) {
    A.ball('head', 'glow', 0.09 * s, { p: [sx * D.headSize * 0.7, D.headSize * 0.7, D.headSize * 1.15], seg: 8 });
  }
  // ram shoulders: flat forward-facing slabs
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    A.taper('shoulder' + side, 'primary', [0.95 * s, 1.05 * s, 1.1 * s], 0.85, 0.8, {
      p: [sx * 0.34 * s, 0.22 * s, 0.06 * s] });
    A.sharpBox('shoulder' + side, 'metal', [0.7 * s, 0.8 * s, 0.14 * s], {
      p: [sx * 0.34 * s, 0.18 * s, 0.62 * s] });
    for (let i = 0; i < 3; i++) {
      A.spike('shoulder' + side, 'metal', 0.07 * s, 0.3 * s, {
        p: [sx * 0.34 * s + (i - 1) * 0.2 * s, 0.45 * s, 0.62 * s], r: [Math.PI / 2, 0, 0], seg: 6 });
    }
  }
  anchors.muzzleR = addAnchor(J.head, 0, D.headSize * 0.9, D.headSize * 1.6); // horn tip-ish
  anchors.horn = addAnchor(J.head, 0, D.headSize * 1.3, D.headSize * 2.2);
}

// ============================================================
// 7. TEMPEST — storm dancer. Navy + cyan, tesla coil shoulders,
//    fin crest, conduit arms, sleek athletic build.
// ============================================================
function tempest(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  standardLeg(A, D, 'L', { bulk: 0.9 }); standardLeg(A, D, 'R', { bulk: 0.9 });
  standardArm(A, D, 'L', { bulk: 0.85, fist: false }); standardArm(A, D, 'R', { bulk: 0.85, fist: false });

  // athletic chest w/ storm core
  A.taper('torso', 'primary', [D.torsoW * 1.15, D.torsoH * 0.9, D.torsoD * 0.9], 0.72, 0.68, {
    p: [0, D.torsoH * 0.52, 0] });
  A.tube('torso', 'glow', 0.14 * s, 0.14 * s, 0.1 * s, {
    p: [0, D.torsoH * 0.58, D.torsoD * 0.48], r: [Math.PI / 2, 0, 0] });
  A.ring('torso', 'metal', 0.2 * s, 0.04 * s, { p: [0, D.torsoH * 0.58, D.torsoD * 0.48] });
  // lightning-bolt chest seams
  for (const sx of [-1, 1]) {
    A.sharpBox('torso', 'glowSoft', [0.05 * s, 0.5 * s, 0.04 * s], {
      p: [sx * D.torsoW * 0.35, D.torsoH * 0.5, D.torsoD * 0.46], r: [0, 0, sx * 0.5] });
  }
  // head: swept crest fin + twin eyes
  A.taper('head', 'primary', [D.headSize * 1.4, D.headSize * 1.3, D.headSize * 1.6], 0.7, 0.7, {
    p: [0, D.headSize * 0.55, 0] });
  A.blade('head', 'accent', D.headSize * 2.4, D.headSize * 0.7, 0.05 * s, {
    p: [0, D.headSize * 1.2, -D.headSize * 0.5], r: [-2.5, 0, 0], taper: 0.2 });
  for (const sx of [-1, 1]) {
    A.sharpBox('head', 'glow', [D.headSize * 0.34, D.headSize * 0.12, 0.04 * s], {
      p: [sx * D.headSize * 0.34, D.headSize * 0.6, D.headSize * 0.8], r: [0, 0, sx * -0.28] });
  }
  // tesla coil shoulders
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    A.tube('shoulder' + side, 'metal', 0.1 * s, 0.22 * s, 0.55 * s, { p: [sx * 0.25 * s, 0.42 * s, 0] });
    A.ball('shoulder' + side, 'glow', 0.16 * s, { p: [sx * 0.25 * s, 0.78 * s, 0] });
    A.ring('shoulder' + side, 'metal', 0.26 * s, 0.035 * s, {
      p: [sx * 0.25 * s, 0.55 * s, 0], r: [Math.PI / 2, 0, 0] });
    A.ring('shoulder' + side, 'metal', 0.32 * s, 0.035 * s, {
      p: [sx * 0.25 * s, 0.4 * s, 0], r: [Math.PI / 2, 0, 0] });
    // conduit forearms with glowing knuckle emitters
    A.tube('elbow' + side, 'accent', 0.16 * s, 0.19 * s, D.foreArmLen * 0.8, {
      p: [0, -D.foreArmLen * 0.5, 0] });
    for (let i = 0; i < 3; i++) {
      A.ring('elbow' + side, 'glowSoft', 0.2 * s, 0.03 * s, {
        p: [0, -D.foreArmLen * (0.3 + i * 0.25), 0], r: [Math.PI / 2, 0, 0] });
    }
    A.fist('hand' + side, 'frame', 'glowSoft', 0.28 * s, { side: sx });
  }
  // calf thrust fins
  for (const side of ['L', 'R']) {
    A.blade('knee' + side, 'accent', 0.8 * s, 0.3 * s, 0.05 * s, {
      p: [0, -D.shinLen * 0.5, -0.28 * s], r: [Math.PI + 0.35, 0, 0], taper: 0.3 });
  }
  anchors.muzzleR = addAnchor(J.handR, 0, -0.2 * s, 0.4 * s);
  anchors.coilL = addAnchor(J.shoulderL, -0.25 * s, 0.78 * s, 0);
  anchors.coilR = addAnchor(J.shoulderR, 0.25 * s, 0.78 * s, 0);
}

// ============================================================
// 8. FENRIR — wolf chassis. Silver/ice-blue, wolf head with ears,
//    claw hands, spiky mane, articulated tail, raptor legs.
// ============================================================
function fenrir(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  raptorLeg(A, D, 'L', { bulk: 0.95 }); raptorLeg(A, D, 'R', { bulk: 0.95 });
  standardArm(A, D, 'L', { bulk: 0.95, fist: false }); standardArm(A, D, 'R', { bulk: 0.95, fist: false });

  // chest: forward-hunched, mane of spikes around neck
  A.taper('torso', 'primary', [D.torsoW * 1.25, D.torsoH * 0.9, D.torsoD * 1.0], 0.8, 0.7, {
    p: [0, D.torsoH * 0.5, 0.06 * s], r: [0.08, 0, 0] });
  for (let i = 0; i < 7; i++) {
    const a = (i / 6 - 0.5) * Math.PI * 1.1;
    A.blade('torso', 'metal', 0.7 * s, 0.18 * s, 0.05 * s, {
      p: [Math.sin(a) * D.torsoW * 0.72, D.torsoH * 0.88, -0.1 * s - Math.abs(Math.sin(a)) * 0.1 * s],
      r: [-0.5 - Math.abs(a) * 0.12, 0, -a * 0.55], taper: 0.1 });
  }
  // wolf head: snout, jaw, ears, angry eyes
  A.taper('head', 'primary', [D.headSize * 1.5, D.headSize * 1.2, D.headSize * 1.4], 0.8, 0.9, {
    p: [0, D.headSize * 0.55, -D.headSize * 0.1] });
  A.taper('head', 'primary', [D.headSize * 0.9, D.headSize * 0.7, D.headSize * 1.3], 0.75, 0.6, {
    p: [0, D.headSize * 0.45, D.headSize * 0.9], r: [0.06, 0, 0] });
  A.taper('head', 'dark', [D.headSize * 0.75, D.headSize * 0.3, D.headSize * 1.1], 0.8, 0.6, {
    p: [0, D.headSize * 0.12, D.headSize * 0.85] }); // jaw
  for (const sx of [-1, 1]) { // fangs
    A.spike('head', 'metal', 0.035 * s, 0.14 * s, {
      p: [sx * D.headSize * 0.28, D.headSize * 0.22, D.headSize * 1.35], r: [Math.PI, 0, 0], seg: 5 });
    // ears
    A.blade('head', 'primary', D.headSize * 0.85, D.headSize * 0.45, 0.05 * s, {
      p: [sx * D.headSize * 0.55, D.headSize * 1.35, -D.headSize * 0.3], r: [-0.3, 0, sx * 0.3], taper: 0.15 });
    // slanted eyes
    A.sharpBox('head', 'glow', [D.headSize * 0.4, D.headSize * 0.1, 0.04 * s], {
      p: [sx * D.headSize * 0.36, D.headSize * 0.68, D.headSize * 0.62], r: [0, sx * 0.3, sx * -0.35] });
  }
  // clawed hands
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    A.taper('hand' + side, 'frame', [0.34 * s, 0.42 * s, 0.34 * s], 0.85, 0.85, {});
    for (let i = -1; i <= 1; i++) {
      A.spike('hand' + side, 'metal', 0.05 * s, 0.65 * s, {
        p: [i * 0.13 * s, -0.35 * s, 0.12 * s], r: [Math.PI - 0.35, 0, 0], seg: 6 });
    }
    A.pauldron('shoulder' + side, 'primary', 0.75 * s, 0.8 * s, 0.8 * s, {
      p: [sx * 0.24 * s, 0.2 * s, 0], side: sx });
    A.spike('shoulder' + side, 'metal', 0.07 * s, 0.4 * s, {
      p: [sx * 0.45 * s, 0.5 * s, 0], r: [0, 0, sx * 0.9], seg: 6 });
  }
  // articulated tail (3 segments)
  let parent = 'hips';
  for (let i = 0; i < 3; i++) {
    const tj = addJoint(J, 'tail' + i, parent, 0, i === 0 ? -0.1 * s : 0, i === 0 ? -0.5 * s : -0.75 * s);
    A.taper('tail' + i, i === 2 ? 'accent' : 'primary',
      [0.28 * s * (1 - i * 0.22), 0.28 * s * (1 - i * 0.22), 0.85 * s], 0.75, 0.8, {
        p: [0, 0, -0.38 * s] });
    parent = 'tail' + i;
  }
  A.spike('tail2', 'glow', 0.06 * s, 0.4 * s, { p: [0, 0, -0.85 * s], r: [-Math.PI / 2, 0, 0], seg: 6 });
  anchors.muzzleR = addAnchor(J.handR, 0, -0.3 * s, 0.3 * s);
  anchors.clawL = addAnchor(J.handL, 0, -0.7 * s, 0.2 * s);
  anchors.clawR = addAnchor(J.handR, 0, -0.7 * s, 0.2 * s);
}

// ============================================================
// 9. COLOSSUS — walking artillery. Desert tan bunker, twin back
//    mortars, embedded head, sandbag armor slabs, wide stance.
// ============================================================
function colossus(A, D, J, anchors) {
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

// ============================================================
// 10. WRAITH — stealth sniper. Matte black, hooded cowl, red seams,
//     huge anti-materiel rifle, tattered fin "cloak".
// ============================================================
function wraith(A, D, J, anchors) {
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

// ============================================================
// 11. INFERNO — flame juggernaut. Red/orange, furnace grill chest,
//     fuel tanks, twin arm flamethrowers, chimney vents.
// ============================================================
function inferno(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  standardLeg(A, D, 'L', { bulk: 1.15 }); standardLeg(A, D, 'R', { bulk: 1.15 });
  standardArm(A, D, 'L', { bulk: 1.1, fist: false }); standardArm(A, D, 'R', { bulk: 1.1, fist: false });

  // furnace chest: grill with inner glow
  A.taper('torso', 'primary', [D.torsoW * 1.4, D.torsoH * 0.95, D.torsoD * 1.1], 0.85, 0.8, {
    p: [0, D.torsoH * 0.52, 0.02 * s] });
  A.sharpBox('torso', 'glow', [D.torsoW * 0.72, D.torsoH * 0.42, 0.06 * s], {
    p: [0, D.torsoH * 0.5, D.torsoD * 0.56] });
  A.vents('torso', 'dark', 6, D.torsoW * 0.8, D.torsoH * 0.48, 0.1 * s, {
    p: [0, D.torsoH * 0.5, D.torsoD * 0.6] });
  // twin fuel tanks on back
  for (const sx of [-1, 1]) {
    A.tube('torso', 'metal', 0.3 * s, 0.3 * s, D.torsoH * 0.9, {
      p: [sx * D.torsoW * 0.42, D.torsoH * 0.5, -D.torsoD * 0.62] });
    A.ball('torso', 'metal', 0.3 * s, { p: [sx * D.torsoW * 0.42, D.torsoH * 0.95, -D.torsoD * 0.62] });
    A.ring('torso', 'dark', 0.31 * s, 0.03 * s, {
      p: [sx * D.torsoW * 0.42, D.torsoH * 0.6, -D.torsoD * 0.62], r: [Math.PI / 2, 0, 0] });
  }
  // head: welding-mask face with glowing furnace mouth grill
  A.taper('head', 'primary', [D.headSize * 1.6, D.headSize * 1.5, D.headSize * 1.5], 0.8, 0.75, {
    p: [0, D.headSize * 0.6, 0] });
  A.sharpBox('head', 'glow', [D.headSize * 1.0, D.headSize * 0.5, 0.05 * s], {
    p: [0, D.headSize * 0.45, D.headSize * 0.75] });
  A.vents('head', 'dark', 4, D.headSize * 1.05, D.headSize * 0.55, 0.08 * s, {
    p: [0, D.headSize * 0.45, D.headSize * 0.78] });
  A.sharpBox('head', 'dark', [D.headSize * 1.7, D.headSize * 0.3, D.headSize * 1.6], {
    p: [0, D.headSize * 1.3, -D.headSize * 0.05] });
  // chimney vents on shoulders
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    A.pauldron('shoulder' + side, 'primary', 0.9 * s, 0.9 * s, 0.9 * s, {
      p: [sx * 0.3 * s, 0.22 * s, 0], side: sx });
    A.tube('shoulder' + side, 'dark', 0.09 * s, 0.11 * s, 0.6 * s, {
      p: [sx * 0.42 * s, 0.6 * s, -0.15 * s], r: [0, 0, sx * 0.2] });
    A.tube('shoulder' + side, 'glow', 0.06 * s, 0.06 * s, 0.06 * s, {
      p: [sx * 0.48 * s, 0.88 * s, -0.15 * s], r: [0, 0, sx * 0.2] });
    // flamethrower forearms: nozzle + pilot light
    A.tube('elbow' + side, 'metal', 0.2 * s, 0.24 * s, D.foreArmLen * 0.85, {
      p: [0, -D.foreArmLen * 0.5, 0] });
    A.tube('hand' + side, 'dark', 0.13 * s, 0.19 * s, 0.5 * s, {
      p: [0, -0.1 * s, 0.3 * s], r: [Math.PI / 2, 0, 0] });
    A.ring('hand' + side, 'glow', 0.14 * s, 0.03 * s, { p: [0, -0.1 * s, 0.56 * s] });
  }
  anchors.muzzleR = addAnchor(J.handR, 0, -0.1 * s, 0.6 * s);
  anchors.muzzleL = addAnchor(J.handL, 0, -0.1 * s, 0.6 * s);
}

// ============================================================
// 12. GLACIER — cryo fortress. Pale blue/white, crystal growths,
//     freeze cannon arm, frost vents, glacier-slab shoulders.
// ============================================================
function glacier(A, D, J, anchors) {
  const s = D.scale;
  baseFrame(A, D);
  standardLeg(A, D, 'L', { bulk: 1.2 }); standardLeg(A, D, 'R', { bulk: 1.2 });
  standardArm(A, D, 'L', { bulk: 1.15 });
  standardArm(A, D, 'R', { bulk: 1.15, fist: false, foreArmor: false });

  // broad chest with frost intake
  A.taper('torso', 'primary', [D.torsoW * 1.45, D.torsoH * 0.95, D.torsoD * 1.1], 0.85, 0.78, {
    p: [0, D.torsoH * 0.52, 0] });
  A.vents('torso', 'glowSoft', 7, D.torsoW * 0.9, 0.22 * s, 0.05 * s, {
    p: [0, D.torsoH * 0.6, D.torsoD * 0.6] });
  // ice crystal growths (angled glowing shards) on shoulders/back
  const shardSpots = [
    ['shoulderL', -0.35, 0.45, 0, 0.5], ['shoulderL', -0.15, 0.55, -0.15, 0.35],
    ['shoulderR', 0.35, 0.45, 0, -0.5], ['shoulderR', 0.18, 0.58, 0.1, -0.3],
    ['torso', -0.3, 1.4, -0.5, 0.3], ['torso', 0.35, 1.5, -0.5, -0.25], ['torso', 0, 1.6, -0.6, 0],
  ];
  for (const [joint, x, y, z, rz] of shardSpots) {
    A.spike(joint, 'glowSoft', 0.14 * s, 0.9 * s, {
      p: [x * s, y * s, z * s], r: [0.15, 0, rz], seg: 5 });
    A.spike(joint, 'glowSoft', 0.09 * s, 0.55 * s, {
      p: [x * s + 0.12 * s, y * s - 0.05 * s, z * s + 0.08 * s], r: [0.3, 0.4, rz * 1.3], seg: 5 });
  }
  // glacier-slab pauldrons
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    A.taper('shoulder' + side, 'primary', [1.0 * s, 0.9 * s, 1.0 * s], 0.7, 0.75, {
      p: [sx * 0.32 * s, 0.26 * s, 0], r: [0, 0, sx * 0.12] });
    A.taper('shoulder' + side, 'accent', [0.85 * s, 0.3 * s, 0.85 * s], 0.8, 0.8, {
      p: [sx * 0.36 * s, 0.55 * s, 0], r: [0, 0, sx * 0.15] });
  }
  // head: heavy brow visor, frost-breath grill
  A.taper('head', 'primary', [D.headSize * 1.8, D.headSize * 1.4, D.headSize * 1.7], 0.8, 0.8, {
    p: [0, D.headSize * 0.55, 0] });
  A.sharpBox('head', 'glow', [D.headSize * 1.2, D.headSize * 0.2, 0.05 * s], {
    p: [0, D.headSize * 0.68, D.headSize * 0.85] });
  A.vents('head', 'dark', 3, D.headSize * 0.8, D.headSize * 0.24, 0.05 * s, {
    p: [0, D.headSize * 0.2, D.headSize * 0.82] });
  A.sharpBox('head', 'accent', [D.headSize * 2.0, D.headSize * 0.35, D.headSize * 1.2], {
    p: [0, D.headSize * 1.05, -D.headSize * 0.15] });
  // freeze cannon: right forearm becomes cryo projector
  A.tube('elbow' + 'R', 'metal', 0.24 * s, 0.28 * s, D.foreArmLen * 0.9, {
    p: [0, -D.foreArmLen * 0.5, 0] });
  A.tube('handR', 'accent', 0.3 * s, 0.34 * s, 0.7 * s, { p: [0, -0.05 * s, 0.25 * s], r: [Math.PI / 2, 0, 0] });
  A.tube('handR', 'glow', 0.18 * s, 0.22 * s, 0.15 * s, { p: [0, -0.05 * s, 0.62 * s], r: [Math.PI / 2, 0, 0] });
  for (let i = 0; i < 4; i++) { // frost prongs
    const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
    A.spike('handR', 'metal', 0.05 * s, 0.4 * s, {
      p: [Math.cos(a) * 0.28 * s, -0.05 * s + Math.sin(a) * 0.28 * s, 0.75 * s],
      r: [Math.PI / 2.3 * 1, 0, -a], seg: 5 });
  }
  anchors.muzzleR = addAnchor(J.handR, 0, -0.05 * s, 0.85 * s);
}

export const DESIGNS = {
  titanus, vulcan, aegis, viper, nova, rhino,
  tempest, fenrir, colossus, wraith, inferno, glacier,
};
