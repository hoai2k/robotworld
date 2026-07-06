// The 12 mech designs. Each function decorates the shared rig with unique
// armor, head, weapons and signature elements, and registers anchors.
import * as THREE from 'three';
import { cyl, taperBox } from './parts.js';
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
// 2. VULCAN — gatling gunner, rebuilt to the canonical concept image:
//    bone-white + oxide-red battle-worn plate, TWIN six-barrel gatling
//    forearms, quad missile towers with red lenses flanking a small
//    crested head with an orange visor, chunky layered leg armor,
//    "VULCAN" chest decal.
// ============================================================
function vulcan(A, D, J, anchors, def) {
  const s = D.scale;
  baseFrame(A, D);
  standardLeg(A, D, 'L', { bulk: 1.1 }); standardLeg(A, D, 'R', { bulk: 1.1 });
  standardArm(A, D, 'L', { bulk: 1.18, fist: false, foreArmor: false });
  standardArm(A, D, 'R', { bulk: 1.18, fist: false, foreArmor: false });

  // ---- torso: broad chest, white shoulders-slabs, red center plate ----
  A.taper('torso', 'primary', [D.torsoW * 1.34, D.torsoH * 0.92, D.torsoD * 1.05], 0.86, 0.78, {
    p: [0, D.torsoH * 0.52, 0.02 * s] });
  for (const sx of [-1, 1]) { // angled upper-chest slabs
    A.taper('torso', 'primary', [D.torsoW * 0.52, D.torsoH * 0.34, 0.3 * s], 0.8, 0.9, {
      p: [sx * D.torsoW * 0.42, D.torsoH * 0.78, D.torsoD * 0.5], r: [0.22, 0, sx * -0.1] });
    // intake vents beneath the slabs
    A.vents('torso', 'dark', 3, D.torsoW * 0.3, 0.1 * s, 0.05 * s, {
      p: [sx * D.torsoW * 0.42, D.torsoH * 0.6, D.torsoD * 0.6] });
  }
  // red center chest plate carrying the VULCAN decal + emblem
  const chestTex = decalTexture(
    { seed: def.seed + 5, ...def.skin.accent },
    { text: 'VULCAN', textY: 0.38, textScale: 0.2, emblem: true, emblemY: 0.7, emblemScale: 0.15, color: '#e8e2d4' }
  );
  A.custom('torso', new THREE.MeshStandardMaterial({
    map: chestTex.map, normalMap: chestTex.normalMap,
    roughnessMap: chestTex.rmMap, metalnessMap: chestTex.rmMap,
    roughness: 1, metalness: 1,
  }), taperBox(D.torsoW * 0.72, D.torsoH * 0.56, 0.16 * s, 0.85, 1), {
    p: [0, D.torsoH * 0.52, D.torsoD * 0.62] });
  // collar guard (slim, keeps the head visible)
  A.taper('torso', 'frame', [D.torsoW * 0.42, 0.16 * s, D.torsoD * 0.48], 0.85, 0.85, {
    p: [0, D.torsoH * 0.97, 0] });
  // abdomen segments + brass waist pistons
  for (let i = 0; i < 3; i++) {
    A.box('torso', 'frame', [D.torsoW * (0.72 - i * 0.07), 0.16 * s, D.torsoD * (0.72 - i * 0.06)], {
      p: [0, D.torsoH * (0.3 - i * 0.11), 0.03 * s] });
  }
  for (const sx of [-1, 1]) {
    A.piston('torso', 'brass', [sx * D.torsoW * 0.5, D.torsoH * 0.06, 0.1 * s],
      [sx * D.torsoW * 0.62, D.torsoH * 0.42, 0.05 * s], 0.05 * s);
  }
  // backpack: ammo drums + radiator
  A.box('torso', 'accent', [D.torsoW * 1.0, D.torsoH * 0.62, 0.5 * s], {
    p: [0, D.torsoH * 0.52, -D.torsoD * 0.68] });
  A.vents('torso', 'dark', 6, D.torsoW * 0.8, 0.34 * s, 0.06 * s, {
    p: [0, D.torsoH * 0.52, -D.torsoD * 0.95] });
  for (const sx of [-1, 1]) {
    A.tube('torso', 'metal', 0.16 * s, 0.16 * s, 0.5 * s, {
      p: [sx * D.torsoW * 0.32, D.torsoH * 0.9, -D.torsoD * 0.66], r: [0, 0, Math.PI / 2] });
  }

  // ---- quad missile towers flanking the head (torso-mounted) ----
  for (const sx of [-1, 1]) {
    const tx = sx * D.torsoW * 0.76, ty = D.torsoH * 1.16, tz = -0.08 * s;
    A.taper('torso', 'primary', [0.72 * s, 0.95 * s, 0.8 * s], 0.9, 0.88, { p: [tx, ty, tz] });
    A.sharpBox('torso', 'accent', [0.76 * s, 0.2 * s, 0.84 * s], { p: [tx, ty + 0.52 * s, tz] }); // red cap
    A.sharpBox('torso', 'dark', [0.58 * s, 0.6 * s, 0.06 * s], { p: [tx, ty + 0.04 * s, tz + 0.42 * s] });
    for (let i = 0; i < 4; i++) { // 2x2 launch tubes with red lenses
      const ox = (i % 2 - 0.5) * 0.28 * s, oy = (Math.floor(i / 2) - 0.5) * 0.28 * s;
      A.tube('torso', 'metal', 0.1 * s, 0.11 * s, 0.14 * s, {
        p: [tx + ox, ty + 0.04 * s + oy, tz + 0.46 * s], r: [Math.PI / 2, 0, 0] });
      A.ball('torso', 'glow2', 0.062 * s, { p: [tx + ox, ty + 0.04 * s + oy, tz + 0.5 * s], seg: 8 });
    }
    // side greebles + support strut down to the shoulder line
    A.sharpBox('torso', 'frame', [0.08 * s, 0.5 * s, 0.44 * s], { p: [tx + sx * 0.42 * s, ty, tz] });
    A.taper('torso', 'frame', [0.4 * s, 0.55 * s, 0.5 * s], 1.3, 1.1, {
      p: [tx - sx * 0.1 * s, ty - 0.6 * s, tz], r: [0, 0, sx * 0.18] });
    A.tube('torso', 'brass', 0.05 * s, 0.05 * s, 0.5 * s, {
      p: [tx + sx * 0.34 * s, ty - 0.55 * s, tz - 0.1 * s], r: [0.3, 0, 0] });
  }

  // ---- head: small, white face, orange visor, red crest fins ----
  const hy = D.headSize * 0.5; // lifted clear of the collar
  A.tube('head', 'frame', D.headSize * 0.42, D.headSize * 0.5, D.headSize * 0.55, {
    p: [0, hy * 0.3, 0] });                                               // neck
  A.taper('head', 'primary', [D.headSize * 1.35, D.headSize * 1.25, D.headSize * 1.5], 0.75, 0.7, {
    p: [0, hy + D.headSize * 0.7, 0.08 * s] });
  A.sharpBox('head', 'glow', [D.headSize * 0.95, D.headSize * 0.22, 0.06 * s], {
    p: [0, hy + D.headSize * 0.72, D.headSize * 0.85] });                 // orange visor
  A.sharpBox('head', 'frame', [D.headSize * 1.42, D.headSize * 0.26, D.headSize * 0.9], {
    p: [0, hy + D.headSize * 1.1, 0] });                                  // brow
  A.vents('head', 'dark', 3, D.headSize * 0.7, D.headSize * 0.18, 0.05 * s, {
    p: [0, hy + D.headSize * 0.32, D.headSize * 0.78] });                 // chin grill
  // crest: center blade + swept side antlers (oxide red)
  A.blade('head', 'accent', D.headSize * 1.5, D.headSize * 0.42, 0.06 * s, {
    p: [0, hy + D.headSize * 1.7, -D.headSize * 0.1], r: [-0.42, 0, 0], taper: 0.16 });
  for (const sx of [-1, 1]) {
    A.blade('head', 'accent', D.headSize * 1.1, D.headSize * 0.32, 0.05 * s, {
      p: [sx * D.headSize * 0.55, hy + D.headSize * 1.45, -D.headSize * 0.05],
      r: [-0.6, 0, sx * 0.55], taper: 0.2 });
  }

  // ---- arms: twin gatling forearms ----
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const el = 'elbow' + side, ha = 'hand' + side;
    // compact shoulder cap (the towers carry the mass above)
    A.taper('shoulder' + side, 'primary', [0.62 * s, 0.55 * s, 0.66 * s], 0.82, 0.85, {
      p: [sx * 0.22 * s, 0.18 * s, 0] });
    A.sharpBox('shoulder' + side, 'accent', [0.66 * s, 0.14 * s, 0.7 * s], {
      p: [sx * 0.22 * s, 0.42 * s, 0] });
    // forearm housing: massive, white top plate over red flanks
    A.taper(el, 'accent', [0.78 * s, D.foreArmLen * 0.9, 0.82 * s], 1.18, 1.12, {
      p: [0, -D.foreArmLen * 0.54, 0] });
    A.taper(el, 'primary', [0.62 * s, D.foreArmLen * 0.55, 0.9 * s], 1.12, 1.06, {
      p: [0, -D.foreArmLen * 0.7, 0.02 * s] });
    A.piston(el, 'brass', [sx * 0.28 * s, -0.1 * s, -0.15 * s], [sx * 0.3 * s, -D.foreArmLen * 0.6, -0.2 * s], 0.045 * s);
    // wrist ring + gatling cluster on a spinner joint
    A.tube(ha, 'frame', 0.4 * s, 0.45 * s, 0.5 * s, { p: [0, -0.05 * s, 0.1 * s], r: [Math.PI / 2, 0, 0] });
    A.ring(ha, 'brass', 0.4 * s, 0.05 * s, { p: [0, -0.05 * s, 0.36 * s] });
    const gat = addJoint(J, 'gatling' + side, ha, 0, -0.05 * s, 0.42 * s);
    A.barrelCluster('gatling' + side, 'metal', 6, 0.24 * s, 0.075 * s, 1.7 * s, { p: [0, 0, 0.72 * s] });
    A.tube('gatling' + side, 'metal', 0.085 * s, 0.085 * s, 1.8 * s, { p: [0, 0, 0.72 * s], r: [Math.PI / 2, 0, 0] });
    A.ring('gatling' + side, 'dark', 0.26 * s, 0.06 * s, { p: [0, 0, 1.5 * s] });
    A.ring('gatling' + side, 'frame', 0.28 * s, 0.06 * s, { p: [0, 0, 0.34 * s] });
  }
  // legacy alias: animator/effects reference J.gatling
  J.gatling = J.gatlingR;

  // ---- hips: red skirt plates ----
  A.taper('hips', 'accent', [D.torsoW * 0.5, 0.5 * s, 0.14 * s], 1.25, 1, {
    p: [0, -0.32 * s, D.torsoD * 0.52], r: [0.18, 0, 0] });
  for (const sx of [-1, 1]) {
    A.taper('hips', 'primary', [0.16 * s, 0.55 * s, D.torsoD * 0.5], 1, 1.2, {
      p: [sx * D.torsoW * 0.58, -0.3 * s, 0], r: [0, 0, sx * 0.2] });
  }

  // ---- legs: layered guards + knee shields ----
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    // red knee shield over the kneecap
    A.taper('knee' + side, 'accent', [0.46 * s, 0.52 * s, 0.34 * s], 0.72, 0.7, {
      p: [0, 0.02 * s, 0.3 * s], r: [0.12, 0, 0] });
    A.piston('knee' + side, 'brass', [0, 0.15 * s, -0.26 * s], [0, -D.shinLen * 0.4, -0.3 * s], 0.05 * s);
    // stacked white shin guards
    A.taper('knee' + side, 'primary', [0.5 * s, 0.5 * s, 0.2 * s], 0.85, 1, {
      p: [0, -D.shinLen * 0.42, 0.3 * s], r: [0.06, 0, 0] });
    A.taper('knee' + side, 'primary', [0.56 * s, 0.55 * s, 0.22 * s], 0.9, 1, {
      p: [0, -D.shinLen * 0.78, 0.3 * s], r: [-0.05, 0, 0] });
    // red outer shin plate with unit number
    const plateTex = decalTexture(
      { seed: def.seed + 5, ...def.skin.accent },
      { text: '07X', textScale: 0.3, textY: 0.5, color: '#d8d2c4', alpha: 0.8 }
    );
    A.custom('knee' + side, new THREE.MeshStandardMaterial({
      map: plateTex.map, normalMap: plateTex.normalMap,
      roughnessMap: plateTex.rmMap, metalnessMap: plateTex.rmMap,
      roughness: 1, metalness: 1,
    }), taperBox(0.14 * s, 0.62 * s, 0.5 * s, 1, 0.85), {
      p: [sx * 0.34 * s, -D.shinLen * 0.45, 0] });
    // broader two-toe foot
    A.taper('ankle' + side, 'primary', [0.3 * s, 0.24 * s, 0.5 * s], 0.8, 0.6, {
      p: [sx * 0.17 * s, -0.06 * s, 0.42 * s] });
    A.taper('ankle' + side, 'primary', [0.3 * s, 0.24 * s, 0.5 * s], 0.8, 0.6, {
      p: [-sx * 0.14 * s, -0.06 * s, 0.42 * s] });
  }

  anchors.muzzleR = addAnchor(J.gatlingR, 0, 0, 1.5 * s);
  anchors.muzzleL = addAnchor(J.gatlingL, 0, 0, 1.5 * s);
  anchors.podL = addAnchor(J.torso, -D.torsoW * 0.72, D.torsoH * 1.28, 0.4 * s);
  anchors.podR = addAnchor(J.torso, D.torsoW * 0.72, D.torsoH * 1.28, 0.4 * s);
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
