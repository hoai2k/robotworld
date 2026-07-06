// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 11. INFERNO — sculpted flame-juggernaut rebuild. Industrial
//     heavy forms: barrel lathe chest with a furnace grill glowing
//     from within, twin capsule fuel tanks on the back, faceted
//     flamethrower housings on BOTH forearms (dark bell nozzles,
//     glowing pilot rings), welding-mask head with a grinning
//     mouth grill, chimney stacks on the shoulders.
// ============================================================
export function inferno(A, D, J, anchors, def) {
  const s = D.scale;
  const W = D.torsoW;   // ~1.88 master width unit
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

  // ================= WAIST / PELVIS =================
  // heavy waist column + vertebra rings
  A.lathe('hips', 'frame', [[0.55 * s, W * 0.3], [0.26 * s, W * 0.23], [-0.05 * s, W * 0.28]], {
    scaleX: 1.25 });
  for (let i = 0; i < 2; i++) {
    A.tube('hips', 'dark', W * (0.25 - i * 0.01), W * (0.26 - i * 0.01), 0.07 * s, {
      p: [0, 0.16 * s + i * 0.18 * s, 0] });
  }
  // hip block: chamfered hex slab
  A.facet('hips', 'primary', W * 0.34, W * 0.44, W * 0.3, 0.9 * s, {
    sides: 6, scaleZ: 0.8, p: [0, -0.44 * s, 0] });
  // hazard-striped INFERNO tabard (dedicated decal skin)
  A.custom('hips', plateMat({
    text: 'INFERNO', textY: 0.34, textScale: 0.135, color: '#f2e3c8', stripes: true, alpha: 0.9,
  }, def.skin.accent, 5), beveledPlate(shieldOutline(W * 0.44, 0.95 * s, { taper: 0.66 }), 0.1 * s, { round: 0.12 }), {
    p: [0, -0.58 * s, W * 0.33], r: [0.15, 0, 0] });
  // heavy side skirts + rear plate
  for (const sx of [-1, 1]) {
    A.plate('hips', 'primary', shieldOutline(W * 0.36, 0.78 * s, { taper: 0.7 }), 0.09 * s, {
      p: [sx * W * 0.44, -0.52 * s, 0], r: [0.08, sx * Math.PI / 2, sx * 0.14], round: 0.12 });
    A.piston('hips', 'brass', [sx * W * 0.3, 0.1 * s, -W * 0.14],
      [sx * W * 0.42, -0.5 * s, -W * 0.18], 0.05 * s);
  }
  A.sharpBox('hips', 'dark', [W * 0.32, 0.34 * s, W * 0.24], { p: [0, -0.6 * s, -W * 0.18] });

  // ================= TORSO: furnace barrel chest =================
  A.lathe('torso', 'primary', [
    [chH * 0.10, W * 0.32],
    [chH * 0.36, W * 0.55],
    [chH * 0.62, W * 0.63],
    [chH * 0.90, W * 0.55],
    [chH * 1.04, W * 0.34],
  ], { scaleX: 1.45, scaleZ: 0.8, seg: 28 });
  // furnace grill: accent bezel > dark inset > glow plate > dark slats
  A.plate('torso', 'accent', rhombOutline(W * 0.8, chH * 0.5, { cut: 0.22 }), 0.09 * s, {
    p: [0, chH * 0.5, W * 0.44], round: 0.1 });
  A.plate('torso', 'dark', rhombOutline(W * 0.64, chH * 0.4, { cut: 0.22 }), 0.05 * s, {
    p: [0, chH * 0.5, W * 0.5] });
  A.sharpBox('torso', 'glow', [W * 0.56, chH * 0.32, 0.06 * s], {
    p: [0, chH * 0.5, W * 0.53] });
  A.vents('torso', 'dark', 5, W * 0.6, chH * 0.36, 0.09 * s, {
    p: [0, chH * 0.5, W * 0.56] });
  // heavy brow ledge over the grill
  A.plate('torso', 'primary', rhombOutline(W * 0.9, chH * 0.16, { cut: 0.25 }), 0.1 * s, {
    p: [0, chH * 0.84, W * 0.42], r: [0.35, 0, 0], round: 0.15 });
  // clavicle intakes
  for (const sx of [-1, 1]) {
    A.vents('torso', 'dark', 3, W * 0.24, 0.1 * s, 0.05 * s, {
      p: [sx * W * 0.42, chH * 0.9, W * 0.32], r: [0.4, 0, sx * -0.3] });
  }
  // collar + abdomen rings
  A.tube('torso', 'frame', W * 0.17, W * 0.2, 0.16 * s, { p: [0, chH * 1.0, 0] });
  for (let i = 0; i < 2; i++) {
    A.tube('torso', 'dark', W * (0.21 - i * 0.02), W * (0.23 - i * 0.02), 0.09 * s, {
      p: [0, chH * (0.05 - i * 0.09), 0] });
  }
  // brass waist pistons
  for (const sx of [-1, 1]) {
    A.piston('torso', 'brass', [sx * W * 0.18, chH * -0.05, W * 0.12],
      [sx * W * 0.4, chH * 0.28, W * 0.2], 0.05 * s);
  }

  // ================= BACK: twin fuel tanks =================
  // tank rack: dark back plate + hex spine
  A.plate('torso', 'dark', rhombOutline(W * 0.78, chH * 0.6, { cut: 0.3 }), 0.06 * s, {
    p: [0, chH * 0.55, -D.torsoD * 0.44] });
  A.facet('torso', 'frame', W * 0.15, W * 0.19, W * 0.13, chH * 0.55, {
    sides: 6, scaleZ: 0.7, p: [0, chH * 0.5, -D.torsoD * 0.52] });
  for (const sx of [-1, 1]) {
    // rounded capsule tank with band rings and a brass valve dome
    A.capsule('torso', 'metal', 0.33 * s, 0.95 * s, {
      p: [sx * W * 0.33, chH * 0.52, -D.torsoD * 0.66] });
    A.ring('torso', 'dark', 0.34 * s, 0.035 * s, {
      p: [sx * W * 0.33, chH * 0.36, -D.torsoD * 0.66], r: [Math.PI / 2, 0, 0], seg: 24 });
    A.ring('torso', 'dark', 0.34 * s, 0.035 * s, {
      p: [sx * W * 0.33, chH * 0.7, -D.torsoD * 0.66], r: [Math.PI / 2, 0, 0], seg: 24 });
    A.lathe('torso', 'brass', [[0, 0.12 * s], [0.08 * s, 0.1 * s], [0.18 * s, 0.03 * s]], {
      p: [sx * W * 0.33, chH * 0.95, -D.torsoD * 0.66] });
    // fuel pipe arcing from the valve into the back
    A.piston('torso', 'brass', [sx * W * 0.33, chH * 1.06, -D.torsoD * 0.6],
      [sx * W * 0.14, chH * 0.88, -D.torsoD * 0.36], 0.045 * s);
    // hazard cap plate at tank base
    A.ring('torso', 'accent', 0.3 * s, 0.05 * s, {
      p: [sx * W * 0.33, chH * 0.1, -D.torsoD * 0.66], r: [Math.PI / 2, 0, 0], seg: 24 });
  }

  // ================= HEAD: welding mask, grinning furnace =================
  const hy = hs * 0.95;
  A.tube('head', 'frame', hs * 0.45, hs * 0.52, hs * 0.5, { p: [0, hy * 0.26, 0] });
  // squat lathe skull
  A.lathe('head', 'primary', [
    [-hs * 0.5, hs * 0.78],
    [hs * 0.05, hs * 0.88],
    [hs * 0.55, hs * 0.68],
    [hs * 0.78, hs * 0.28],
  ], { p: [0, hy + hs * 0.55, 0.0], scaleZ: 1.02, seg: 20 });
  // dark welding mask face plate (proud of the dome)
  A.plate('head', 'dark', shieldOutline(hs * 1.6, hs * 1.4, { taper: 0.82, tip: 0.2 }), 0.08 * s, {
    p: [0, hy + hs * 0.5, hs * 0.88], r: [-0.05, 0, 0], round: 0.12 });
  // narrow eye slit + glowing grin behind dark teeth slats
  A.sharpBox('head', 'glow', [hs * 0.9, hs * 0.12, 0.06 * s], {
    p: [0, hy + hs * 0.84, hs * 1.06] });
  A.sharpBox('head', 'glow', [hs * 1.05, hs * 0.36, 0.06 * s], {
    p: [0, hy + hs * 0.28, hs * 1.06] });
  A.vents('head', 'dark', 5, hs * 1.1, hs * 0.42, 0.06 * s, {
    p: [0, hy + hs * 0.28, hs * 1.12] });
  // rivets around the mask + crest ridge
  for (const [rx, ry] of [[-0.62, 1.0], [0.62, 1.0], [-0.7, 0.55], [0.7, 0.55]]) {
    A.ball('head', 'brass', hs * 0.07, { p: [rx * hs, hy + ry * hs, hs * 1.0], seg: 8 });
  }
  A.plate('head', 'accent', rhombOutline(hs * 1.3, hs * 0.38, { cut: 0.3 }), hs * 0.5, {
    p: [0, hy + hs * 1.1, -hs * 0.05], r: [-0.15, 0, 0], round: 0.2 });

  // ================= ARMS: flamethrower gauntlets =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const sh = 'shoulder' + side, el = 'elbow' + side, ha = 'hand' + side;
    J[sh].position.x = sx * (D.shoulderW + 0.28 * s);

    // pauldron shell + chimney stacks
    A.ball(sh, 'frame', 0.3 * s, {});
    A.lathe(sh, 'primary', [
      [-0.22 * s, W * 0.29],
      [0.16 * s, W * 0.26],
      [0.38 * s, W * 0.11],
    ], { p: [sx * 0.14 * s, 0.08 * s, 0], scaleZ: 0.95, seg: 20 });
    A.plate(sh, 'accent', rhombOutline(W * 0.38, W * 0.26, { cut: 0.3 }), 0.05 * s, {
      p: [sx * W * 0.28, 0.1 * s, 0], r: [0, sx * Math.PI / 2, 0], round: 0.15 });
    // main + secondary chimney with glowing rims
    A.tube(sh, 'dark', 0.1 * s, 0.13 * s, 0.75 * s, { p: [sx * 0.26 * s, 0.6 * s, -0.14 * s] });
    A.ring(sh, 'glowSoft', 0.095 * s, 0.022 * s, {
      p: [sx * 0.26 * s, 0.98 * s, -0.14 * s], r: [Math.PI / 2, 0, 0] });
    A.ring(sh, 'dark', 0.115 * s, 0.025 * s, {
      p: [sx * 0.26 * s, 0.9 * s, -0.14 * s], r: [Math.PI / 2, 0, 0] });
    A.tube(sh, 'dark', 0.075 * s, 0.095 * s, 0.55 * s, { p: [sx * 0.44 * s, 0.48 * s, -0.28 * s] });
    A.ring(sh, 'glowSoft', 0.07 * s, 0.02 * s, {
      p: [sx * 0.44 * s, 0.76 * s, -0.28 * s], r: [Math.PI / 2, 0, 0] });
    // thick upper arm
    A.lathe(sh, 'primary', [
      [-D.upperArmLen * 0.95, 0.24 * s],
      [-D.upperArmLen * 0.55, 0.31 * s],
      [-D.upperArmLen * 0.12, 0.25 * s],
    ], { p: [sx * 0.04 * s, 0, 0], seg: 16 });
    // elbow ring
    A.part(el, 'metal', new THREE.CylinderGeometry(0.19 * s, 0.19 * s, 0.4 * s, 12), {
      r: [0, 0, Math.PI / 2] });
    // forearm: faceted flamethrower housing + white spine plate + fuel line
    A.facet(el, 'accent', 0.32 * s, 0.46 * s, 0.36 * s, fA * 1.05, {
      sides: 8, scaleZ: 1.05, p: [0, -fA * 0.52, 0] });
    A.plate(el, 'primary', rhombOutline(fA * 0.8, 0.42 * s, { cut: 0.28 }), 0.07 * s, {
      p: [0, -fA * 0.55, 0.44 * s], r: [0, 0, Math.PI / 2], round: 0.12 });
    A.piston(el, 'brass', [sx * 0.26 * s, -0.08 * s, -0.2 * s],
      [sx * 0.3 * s, -fA * 0.68, -0.24 * s], 0.045 * s);
    // wrist collar + faceted nozzle housing + dark bell + pilot ring
    A.tube(ha, 'frame', 0.3 * s, 0.34 * s, 0.4 * s, { p: [0, -0.05 * s, 0.1 * s], r: [Math.PI / 2, 0, 0] });
    A.ring(ha, 'brass', 0.29 * s, 0.035 * s, { p: [0, -0.05 * s, 0.3 * s] });
    A.facet(ha, 'primary', 0.2 * s, 0.28 * s, 0.18 * s, 0.55 * s, {
      sides: 8, p: [0, -0.05 * s, 0.55 * s], r: [Math.PI / 2, 0, 0] });
    A.tube(ha, 'dark', 0.2 * s, 0.12 * s, 0.5 * s, { p: [0, -0.05 * s, 0.98 * s], r: [Math.PI / 2, 0, 0] });
    A.tube(ha, 'glow', 0.1 * s, 0.1 * s, 0.07 * s, { p: [0, -0.05 * s, 1.18 * s], r: [Math.PI / 2, 0, 0] });
    A.ring(ha, 'glow', 0.155 * s, 0.028 * s, { p: [0, -0.05 * s, 1.23 * s] });
    // pilot igniter nub under the bell
    A.ball(ha, 'glowSoft', 0.05 * s, { p: [0, -0.26 * s, 1.05 * s], seg: 8 });
  }

  // ================= LEGS (heavy plantigrade) =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const th = 'thigh' + side, kn = 'knee' + side, an = 'ankle' + side;

    // hip ball + barrel thigh with accent outer plate
    A.ball(th, 'frame', 0.3 * s, {});
    A.lathe(th, 'primary', [
      [-D.thighLen * 1.0, 0.27 * s],
      [-D.thighLen * 0.52, 0.37 * s],
      [-D.thighLen * 0.08, 0.3 * s],
    ], { scaleZ: 1.15, seg: 20 });
    A.plate(th, 'accent', rhombOutline(0.46 * s, D.thighLen * 0.6, { cut: 0.26 }), 0.07 * s, {
      p: [sx * 0.36 * s, -D.thighLen * 0.5, 0.02 * s], r: [0, sx * Math.PI / 2, 0], round: 0.12 });

    // knee: joint sphere + dark-red beveled shield + piston
    A.ball(kn, 'metal', 0.22 * s, {});
    A.plate(kn, 'accent', shieldOutline(0.5 * s, 0.68 * s, { taper: 0.62 }), 0.11 * s, {
      p: [0, -0.02 * s, 0.32 * s], r: [0.14, 0, 0], round: 0.14 });
    A.piston(kn, 'brass', [0, 0.12 * s, -0.26 * s], [0, -D.shinLen * 0.42, -0.32 * s], 0.05 * s);

    // massive calf swell + stacked shin guards + exhaust vents at the rear
    A.lathe(kn, 'primary', [
      [-D.shinLen * 1.0, 0.27 * s],
      [-D.shinLen * 0.66, 0.4 * s],
      [-D.shinLen * 0.3, 0.43 * s],
      [-D.shinLen * 0.04, 0.3 * s],
    ], { scaleZ: 1.2, seg: 20 });
    A.plate(kn, 'primary', shieldOutline(0.5 * s, 0.64 * s, { taper: 0.75 }), 0.09 * s, {
      p: [0, -D.shinLen * 0.44, 0.4 * s], r: [0.06, 0, 0], round: 0.12 });
    A.plate(kn, 'primary', shieldOutline(0.56 * s, 0.68 * s, { taper: 0.72 }), 0.09 * s, {
      p: [0, -D.shinLen * 0.8, 0.38 * s], r: [-0.06, 0, 0], round: 0.12 });
    A.vents(kn, 'dark', 3, 0.36 * s, 0.1 * s, 0.05 * s, {
      p: [0, -D.shinLen * 0.5, -0.46 * s] });

    // wide stomper feet: twin toes + dark sole + hex heel
    A.ball(an, 'frame', 0.19 * s, {});
    for (const tx of [-0.19, 0.19]) {
      A.part(an, 'primary', roundedBox(0.36 * s, 0.3 * s, 0.72 * s, 0.08 * s), {
        p: [tx * s, -0.13 * s, 0.34 * s], r: [-0.08, tx * 0.3, 0] });
    }
    A.plate(an, 'accent', shieldOutline(0.56 * s, 0.36 * s, { taper: 0.85 }), 0.06 * s, {
      p: [0, -0.04 * s, 0.68 * s], r: [0.6, 0, 0], round: 0.2 });
    A.facet(an, 'frame', 0.22 * s, 0.27 * s, 0.18 * s, 0.34 * s, {
      sides: 6, p: [0, -0.14 * s, -0.22 * s], r: [Math.PI / 2.4, 0, 0] });
    A.sharpBox(an, 'dark', [0.64 * s, 0.11 * s, 1.06 * s], { p: [0, -0.27 * s, 0.14 * s] });
  }

  anchors.muzzleR = addAnchor(J.handR, 0, -0.05 * s, 1.28 * s);
  anchors.muzzleL = addAnchor(J.handL, 0, -0.05 * s, 1.28 * s);
  anchors.core = addAnchor(J.torso, 0, chH * 0.5, W * 0.55);
}
