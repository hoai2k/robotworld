// Auto-split from designs.js — one mech per file. Shared sculpting
// vocabulary lives in ../parts.js; see docs/IMAGE_TO_MECH.md.
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { cyl, taperBox, beveledPlate, shieldOutline, rhombOutline, roundedBox, bulgeLathe, facetBulge } from '../parts.js';
import { decalTexture, skinMaterial } from '../../core/pbrtex.js';
import { baseFrame, standardArm, standardLeg, raptorLeg, addAnchor } from '../factory.js';
import { addJoint } from './common.js';


// ============================================================
// 12. GLACIER — sculpted rebuild: the cryo fortress. Bulky rounded
//     ice-blue armor: bulging chest with a glowing frost intake,
//     dome pauldrons crowned with translucent ice crystal shards,
//     heavy brow visor, and a right forearm that is one large
//     faceted cryo-cannon ringed by frost prongs.
// ============================================================
export function glacier(A, D, J, anchors, def) {
  const s = D.scale;
  const W = D.torsoW;   // ~2.04
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

  // translucent ice: one shared material, shard clusters merged per joint
  const iceMat = new THREE.MeshStandardMaterial({
    color: 0xd6f2ff, emissive: 0x86d8f8, emissiveIntensity: 0.55,
    roughness: 0.12, metalness: 0.05, transparent: true, opacity: 0.62,
    flatShading: true,
  });
  // spots: [x, y, z, tiltX, tiltZ, scale] — 5-sided cones, base at spot
  const iceCluster = (joint, spots) => {
    const geos = [];
    for (const [x, y, z, tx, tz, sc] of spots) {
      const g = new THREE.ConeGeometry(0.15 * s * sc, 1.0 * s * sc, 5);
      g.translate(0, 0.5 * s * sc, 0);
      g.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(tx, sc * 2.1, tz)));
      g.translate(x, y, z);
      geos.push(g.toNonIndexed());
    }
    A.custom(joint, iceMat, BufferGeometryUtils.mergeGeometries(geos, false), {});
  };

  // ================= WAIST / PELVIS =================
  A.lathe('hips', 'frame', [[0.6 * s, W * 0.29], [0.28 * s, W * 0.22], [-0.05 * s, W * 0.27]], {
    scaleX: 1.28 });
  for (let i = 0; i < 2; i++) {
    A.tube('hips', 'dark', W * (0.23 - i * 0.012), W * (0.24 - i * 0.012), 0.08 * s, {
      p: [0, 0.14 * s + i * 0.18 * s, 0] });
  }
  A.facet('hips', 'primary', W * 0.36, W * 0.44, W * 0.31, 0.9 * s, {
    sides: 6, scaleZ: 0.78, p: [0, -0.42 * s, 0] });
  A.plate('hips', 'accent', shieldOutline(W * 0.42, 0.85 * s, { taper: 0.64 }), 0.09 * s, {
    p: [0, -0.56 * s, W * 0.34], r: [0.14, 0, 0], round: 0.2 });
  for (const sx of [-1, 1]) {
    A.plate('hips', 'primary', shieldOutline(W * 0.34, 0.75 * s, { taper: 0.68 }), 0.08 * s, {
      p: [sx * W * 0.44, -0.5 * s, 0], r: [0.08, sx * Math.PI / 2, sx * 0.12], round: 0.2 });
  }
  A.sharpBox('hips', 'dark', [W * 0.3, 0.3 * s, W * 0.2], { p: [0, -0.55 * s, -W * 0.22] });

  // ================= TORSO: bulky rounded chest, frost intake =================
  A.lathe('torso', 'primary', [
    [chH * 0.12, W * 0.32],
    [chH * 0.4, W * 0.54],
    [chH * 0.68, W * 0.62],
    [chH * 0.94, W * 0.54],
    [chH * 1.06, W * 0.32],
  ], { scaleX: 1.45, scaleZ: 0.8, seg: 28 });
  // glowing frost intake in a dark recess
  A.plate('torso', 'dark', rhombOutline(W * 0.56, 0.5 * s, { cut: 0.2 }), 0.06 * s, {
    p: [0, chH * 0.68, W * 0.44], r: [-0.08, 0, 0] });
  A.vents('torso', 'glowSoft', 5, W * 0.44, 0.16 * s, 0.06 * s, {
    p: [0, chH * 0.68, W * 0.48], r: [-0.08, 0, 0] });
  // GLACIER nameplate below the intake
  A.custom('torso', plateMat('accent', {
    text: 'GLACIER', textY: 0.48, textScale: 0.155, color: '#eaf6ff',
  }), beveledPlate(shieldOutline(W * 0.58, chH * 0.36, { taper: 0.72 }), 0.1 * s, { round: 0.14 }), {
    p: [0, chH * 0.34, W * 0.45], r: [-0.02, 0, 0] });
  // rounded pec masses
  for (const sx of [-1, 1]) {
    A.capsule('torso', 'primary', W * 0.17, W * 0.3, {
      p: [sx * W * 0.37, chH * 0.92, W * 0.24], r: [0.5, 0, sx * -1.15], s: [1, 1, 0.75] });
  }
  // collar + ab rings + brass pistons
  A.tube('torso', 'frame', W * 0.17, W * 0.2, 0.16 * s, { p: [0, chH * 1.02, 0] });
  for (let i = 0; i < 2; i++) {
    A.tube('torso', 'dark', W * (0.2 - i * 0.02), W * (0.22 - i * 0.02), 0.09 * s, {
      p: [0, chH * (0.06 - i * 0.09), 0] });
  }
  for (const sx of [-1, 1]) {
    A.piston('torso', 'brass', [sx * W * 0.18, chH * -0.04, W * 0.12],
      [sx * W * 0.4, chH * 0.3, W * 0.2], 0.045 * s);
  }
  // back: cryo plant housing + coolant drums + ice growth
  A.facet('torso', 'accent', W * 0.42, W * 0.48, W * 0.38, chH * 0.55, {
    sides: 8, scaleZ: 0.5, p: [0, chH * 0.5, -W * 0.42] });
  A.vents('torso', 'dark', 5, W * 0.6, chH * 0.24, 0.06 * s, { p: [0, chH * 0.48, -W * 0.62] });
  for (const sx of [-1, 1]) {
    A.capsule('torso', 'metal', 0.15 * s, 0.45 * s, {
      p: [sx * W * 0.28, chH * 0.9, -W * 0.4], r: [0, 0, Math.PI / 2] });
  }
  iceCluster('torso', [
    [-0.35 * s, chH * 0.92, -W * 0.32, -0.55, 0.25, 1.0],
    [0.3 * s, chH * 0.96, -W * 0.34, -0.5, -0.3, 0.8],
    [0.02 * s, chH * 0.88, -W * 0.38, -0.7, 0.05, 0.62],
    [-0.12 * s, chH * 0.98, -W * 0.3, -0.35, 0.5, 0.45],
  ]);

  // ================= HEAD: heavy brow visor =================
  const hy = hs * 0.5;
  A.tube('head', 'frame', hs * 0.4, hs * 0.48, hs * 0.6, { p: [0, hy * 0.3, 0] });
  A.lathe('head', 'primary', [
    [-hs * 0.55, hs * 0.75],
    [hs * 0.05, hs * 0.88],
    [hs * 0.5, hs * 0.68],
    [hs * 0.75, hs * 0.26],
  ], { p: [0, hy + hs * 0.55, 0], scaleZ: 1.1, seg: 20 });
  // deep recess + glow visor under a thick beveled brow ledge
  A.sharpBox('head', 'dark', [hs * 1.5, hs * 0.4, hs * 0.22], { p: [0, hy + hs * 0.48, hs * 0.72] });
  A.sharpBox('head', 'glow', [hs * 1.28, hs * 0.19, hs * 0.12], { p: [0, hy + hs * 0.46, hs * 0.82] });
  A.plate('head', 'primary', rhombOutline(hs * 2.1, hs * 0.7, { cut: 0.26 }), hs * 0.55, {
    p: [0, hy + hs * 0.95, hs * 0.32], r: [-0.42, 0, 0], round: 0.15 });
  A.plate('head', 'accent', rhombOutline(hs * 1.6, hs * 0.5, { cut: 0.3 }), hs * 0.3, {
    p: [0, hy + hs * 1.14, -hs * 0.12], r: [-0.15, 0, 0], round: 0.2 });
  // frost-breath grill + chin guard
  A.vents('head', 'dark', 3, hs * 0.7, hs * 0.18, 0.05 * s, { p: [0, hy + hs * 0.06, hs * 0.64] });
  A.plate('head', 'frame', shieldOutline(hs * 1.1, hs * 0.55, { taper: 0.7 }), hs * 0.3, {
    p: [0, hy - hs * 0.08, hs * 0.42], r: [0.35, 0, 0], round: 0.2 });

  // ================= ARMS =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const sh = 'shoulder' + side, el = 'elbow' + side, ha = 'hand' + side;
    J[sh].position.x = sx * (D.shoulderW + 0.35 * s);

    A.ball(sh, 'frame', 0.3 * s, {});
    // rounded dome pauldron + rim plate + crystal crown
    A.lathe(sh, 'primary', [
      [-0.32 * s, W * 0.31],
      [0.02 * s, W * 0.33],
      [0.3 * s, W * 0.22],
      [0.44 * s, W * 0.07],
    ], { p: [sx * 0.1 * s, 0.06 * s, 0], scaleZ: 0.95, seg: 22 });
    A.plate(sh, 'accent', rhombOutline(W * 0.4, W * 0.3, { cut: 0.3 }), 0.06 * s, {
      p: [sx * W * 0.34, 0.1 * s, 0], r: [0, sx * Math.PI / 2, 0], round: 0.18 });
    iceCluster(sh, [
      [sx * 0.12 * s, 0.34 * s, -0.05 * s, -0.15, -sx * 0.5, 1.0],
      [sx * 0.3 * s, 0.28 * s, 0.14 * s, 0.2, -sx * 0.75, 0.6],
      [-sx * 0.06 * s, 0.36 * s, 0.16 * s, 0.3, -sx * 0.25, 0.45],
    ]);
    // bulged upper arm + elbow ring
    A.lathe(sh, 'primary', [
      [-D.upperArmLen * 0.98, 0.22 * s],
      [-D.upperArmLen * 0.55, 0.28 * s],
      [-D.upperArmLen * 0.12, 0.23 * s],
    ], { p: [sx * 0.04 * s, 0, 0], seg: 16 });
    A.part(el, 'metal', new THREE.CylinderGeometry(0.19 * s, 0.19 * s, 0.42 * s, 12), {
      r: [0, 0, Math.PI / 2] });

    if (side === 'L') {
      // armored fist arm
      A.facet(el, 'primary', 0.36 * s, 0.5 * s, 0.4 * s, D.foreArmLen * 1.0, {
        sides: 8, scaleZ: 1.05, p: [0, -D.foreArmLen * 0.52, 0] });
      A.plate(el, 'accent', rhombOutline(D.foreArmLen * 0.72, 0.46 * s, { cut: 0.28 }), 0.07 * s, {
        p: [0, -D.foreArmLen * 0.52, 0.45 * s], r: [0, 0, Math.PI / 2], round: 0.14 });
      A.piston(el, 'brass', [sx * 0.28 * s, -0.08 * s, -0.22 * s],
        [sx * 0.28 * s, -D.foreArmLen * 0.66, -0.28 * s], 0.045 * s);
      const fw = 0.42 * s;
      A.tube(ha, 'frame', 0.3 * s, 0.34 * s, 0.26 * s, { p: [0, 0.06 * s, 0] });
      A.part(ha, 'frame', roundedBox(fw * 1.8, fw * 1.5, fw * 1.7, fw * 0.42), {
        p: [0, -fw * 0.8, fw * 0.1] });
      for (let i = 0; i < 4; i++) {
        A.capsule(ha, 'dark', fw * 0.25, fw * 0.28, {
          p: [(i - 1.5) * fw * 0.42, -fw * 0.92, fw * 0.95], r: [Math.PI / 2, 0, 0] });
      }
      A.capsule(ha, 'dark', fw * 0.23, fw * 0.3, {
        p: [sx * fw * 0.92, -fw * 0.55, fw * 0.25], r: [0.5, 0, sx * 0.4] });
      A.plate(ha, 'primary', rhombOutline(fw * 1.4, fw * 0.8, { cut: 0.3 }), 0.06 * s, {
        p: [0, -fw * 0.35, fw * 0.9], r: [0.2, 0, 0], round: 0.2 });
    } else {
      // ============ CRYO-CANNON: the whole right forearm ============
      A.facet(el, 'accent', 0.42 * s, 0.58 * s, 0.46 * s, D.foreArmLen * 1.05, {
        sides: 8, scaleZ: 1.0, p: [0, -D.foreArmLen * 0.52, 0] });
      // pale spine plates down both sides
      for (const px of [-1, 1]) {
        A.plate(el, 'primary', rhombOutline(D.foreArmLen * 0.7, 0.44 * s, { cut: 0.28 }), 0.07 * s, {
          p: [px * 0.52 * s, -D.foreArmLen * 0.5, 0], r: [0, px * Math.PI / 2, Math.PI / 2], round: 0.14 });
      }
      // coolant ring: steel channel with a slim glow line recessed inside
      A.ring(el, 'metal', 0.5 * s, 0.05 * s, {
        p: [0, -D.foreArmLen * 0.78, 0], r: [Math.PI / 2, 0, 0], seg: 24 });
      A.ring(el, 'glowSoft', 0.485 * s, 0.022 * s, {
        p: [0, -D.foreArmLen * 0.78, 0], r: [Math.PI / 2, 0, 0], seg: 24 });
      A.piston(el, 'brass', [0.3 * s, -0.06 * s, -0.26 * s],
        [0.28 * s, -D.foreArmLen * 0.6, -0.34 * s], 0.05 * s);
      A.piston(el, 'brass', [-0.3 * s, -0.06 * s, -0.26 * s],
        [-0.28 * s, -D.foreArmLen * 0.6, -0.34 * s], 0.05 * s);
      // frost buildup hugging the housing
      iceCluster(el, [
        [0.26 * s, -D.foreArmLen * 0.42, 0.3 * s, 0.55, -0.35, 0.38],
        [0.34 * s, -D.foreArmLen * 0.55, 0.18 * s, 0.7, -0.55, 0.28],
      ]);
      // muzzle assembly on the hand joint
      A.facet(ha, 'metal', 0.38 * s, 0.44 * s, 0.3 * s, 0.6 * s, { sides: 8, p: [0, -0.3 * s, 0] });
      A.tube(ha, 'dark', 0.19 * s, 0.19 * s, 0.24 * s, { p: [0, -0.6 * s, 0] });
      A.ring(ha, 'glowSoft', 0.24 * s, 0.035 * s, { p: [0, -0.58 * s, 0], r: [Math.PI / 2, 0, 0] });
      A.ball(ha, 'glow', 0.08 * s, { p: [0, -0.68 * s, 0], seg: 10 });
      // four frost prongs raking forward around the muzzle
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const dir = new THREE.Vector3(Math.cos(a) * 0.42, -1, Math.sin(a) * 0.42).normalize();
        const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
        const e = new THREE.Euler().setFromQuaternion(q);
        A.spike(ha, 'metal', 0.065 * s, 0.62 * s, {
          p: [Math.cos(a) * 0.34 * s + dir.x * 0.28 * s, -0.38 * s + dir.y * 0.28 * s,
            Math.sin(a) * 0.34 * s + dir.z * 0.28 * s],
          r: [e.x, e.y, e.z], seg: 5 });
      }
    }
  }

  // ================= LEGS: rounded and bulky =================
  for (const side of ['L', 'R']) {
    const sx = side === 'L' ? -1 : 1;
    const th = 'thigh' + side, kn = 'knee' + side, an = 'ankle' + side;

    A.ball(th, 'frame', 0.28 * s, {});
    A.lathe(th, 'primary', [
      [-D.thighLen * 1.0, 0.26 * s],
      [-D.thighLen * 0.55, 0.37 * s],
      [-D.thighLen * 0.08, 0.29 * s],
    ], { scaleZ: 1.12, seg: 20 });
    A.plate(th, 'accent', rhombOutline(0.44 * s, D.thighLen * 0.6, { cut: 0.26 }), 0.07 * s, {
      p: [sx * 0.35 * s, -D.thighLen * 0.5, 0.02 * s], r: [0, sx * Math.PI / 2, 0], round: 0.16 });

    A.ball(kn, 'metal', 0.2 * s, {});
    A.plate(kn, 'accent', shieldOutline(0.5 * s, 0.62 * s, { taper: 0.64 }), 0.1 * s, {
      p: [0, -0.02 * s, 0.32 * s], r: [0.15, 0, 0], round: 0.2 });
    A.piston(kn, 'brass', [0, 0.12 * s, -0.25 * s], [0, -D.shinLen * 0.4, -0.3 * s], 0.05 * s);

    A.lathe(kn, 'primary', [
      [-D.shinLen * 1.0, 0.26 * s],
      [-D.shinLen * 0.65, 0.37 * s],
      [-D.shinLen * 0.28, 0.41 * s],
      [-D.shinLen * 0.05, 0.27 * s],
    ], { scaleZ: 1.16, seg: 20 });
    A.plate(kn, 'primary', shieldOutline(0.48 * s, 0.6 * s, { taper: 0.76 }), 0.09 * s, {
      p: [0, -D.shinLen * 0.4, 0.36 * s], r: [0.05, 0, 0], round: 0.16 });
    // '132' station plate on the outer calf
    A.custom(kn, plateMat('accent', { text: '132', textScale: 0.26, textY: 0.48, color: '#eaf6ff', alpha: 0.85 }),
      beveledPlate(rhombOutline(0.48 * s, D.shinLen * 0.52, { cut: 0.26 }), 0.07 * s, { round: 0.14 }), {
        p: [sx * 0.38 * s, -D.shinLen * 0.5, 0], r: [0, sx * Math.PI / 2, 0] });
    A.plate(kn, 'primary', shieldOutline(0.52 * s, 0.62 * s, { taper: 0.72 }), 0.08 * s, {
      p: [0, -D.shinLen * 0.78, 0.34 * s], r: [-0.05, 0, 0], round: 0.16 });

    // rounded feet
    A.ball(an, 'frame', 0.18 * s, {});
    for (const tx of [-0.17, 0.17]) {
      A.part(an, 'primary', roundedBox(0.32 * s, 0.28 * s, 0.66 * s, 0.09 * s), {
        p: [tx * s, -0.13 * s, 0.3 * s], r: [-0.08, tx * 0.3, 0] });
    }
    A.facet(an, 'frame', 0.2 * s, 0.24 * s, 0.16 * s, 0.32 * s, {
      sides: 6, p: [0, -0.13 * s, -0.2 * s], r: [Math.PI / 2.4, 0, 0] });
    A.sharpBox(an, 'dark', [0.56 * s, 0.11 * s, 0.95 * s], { p: [0, -0.26 * s, 0.1 * s] });
  }

  // cryo cannon muzzle
  anchors.muzzleR = addAnchor(J.handR, 0, -0.72 * s, 0);
  anchors.core = addAnchor(J.torso, 0, chH * 0.55, W * 0.45);
}
