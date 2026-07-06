// Rig retarget test: builds a synthetic Mixamo-convention T-pose skeleton
// (bones +Y toward child, "mixamorig:" name prefixes) with box limbs, then
// drives it through RigAdapter with the game's Animator.
//   ?rigtest              — cycles through action clips
//   ?rigtest&anim=walk    — locomotion ramp
// If the math is right the puppet stands arms-down and animates identically
// to the procedural mechs. This mirrors what Meshy/Tripo/Mixamo GLBs need.
import * as THREE from 'three';
import { Engine } from '../core/engine.js';
import { ROSTER_BY_ID } from '../mechs/roster.js';
import { buildRig, computeDims } from '../mechs/factory.js';
import { Animator } from '../mechs/animator.js';
import { RigAdapter, mapBones } from '../mechs/rigadapter.js';
import { CLIPS } from '../mechs/animations.js';

function makeBone(name, parent, pos, rotZ = 0) {
  const b = new THREE.Bone();
  b.name = 'mixamorig:' + name;
  b.position.set(...pos);
  b.rotation.z = rotZ;
  if (parent) parent.add(b);
  return b;
}

function limbBox(bone, len, thick, color) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(thick, len * 0.92, thick),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5, metalness: 0.6 })
  );
  m.position.y = len / 2;
  m.castShadow = true;
  bone.add(m);
  return m;
}

// T-pose humanoid, Mixamo conventions: +Y along bone toward child.
function buildTestSkeleton() {
  const bones = [];
  const B = (...a) => { const b = makeBone(...a); bones.push(b); return b; };

  const hips = B('Hips', null, [0, 3.6, 0]);
  limbBox(hips, 0.5, 1.1, 0x8a5fd8);
  const spine = B('Spine', hips, [0, 0.4, 0]);
  const spine2 = B('Spine2', spine, [0, 0.7, 0]);
  limbBox(spine2, 1.0, 1.3, 0x4a90d8);
  const head = B('Head', spine2, [0, 1.1, 0]);
  limbBox(head, 0.7, 0.7, 0xd8b84a);

  // arms out in T-pose: +Y rotated onto ±X
  const lArm = B('LeftArm', spine2, [0.8, 0.85, 0], -Math.PI / 2);
  limbBox(lArm, 1.15, 0.42, 0x50c878);
  const lFore = B('LeftForeArm', lArm, [0, 1.15, 0]);
  limbBox(lFore, 1.05, 0.36, 0x50c878);
  const lHand = B('LeftHand', lFore, [0, 1.05, 0]);
  limbBox(lHand, 0.45, 0.45, 0x9fe8b0);

  const rArm = B('RightArm', spine2, [-0.8, 0.85, 0], Math.PI / 2);
  limbBox(rArm, 1.15, 0.42, 0xd85050);
  const rFore = B('RightForeArm', rArm, [0, 1.15, 0]);
  limbBox(rFore, 1.05, 0.36, 0xd85050);
  const rHand = B('RightHand', rFore, [0, 1.05, 0]);
  limbBox(rHand, 0.45, 0.45, 0xf0a0a0);

  // legs point down: +Y rotated onto -Y (180° about Z)
  const lUpLeg = B('LeftUpLeg', hips, [0.55, -0.15, 0], Math.PI);
  limbBox(lUpLeg, 1.6, 0.5, 0x50c878);
  const lLeg = B('LeftLeg', lUpLeg, [0, 1.6, 0]);
  limbBox(lLeg, 1.5, 0.42, 0x389858);
  const lFoot = B('LeftFoot', lLeg, [0, 1.5, 0]);
  const lfm = limbBox(lFoot, 0.35, 0.5, 0x2a4a3a);
  lfm.position.z = -0.25; // toe forward (bone +Y now points down/backwards)

  const rUpLeg = B('RightUpLeg', hips, [-0.55, -0.15, 0], Math.PI);
  limbBox(rUpLeg, 1.6, 0.5, 0xd85050);
  const rLeg = B('RightLeg', rUpLeg, [0, 1.6, 0]);
  limbBox(rLeg, 1.5, 0.42, 0xa83838);
  const rFoot = B('RightFoot', rLeg, [0, 1.5, 0]);
  const rfm = limbBox(rFoot, 0.35, 0.5, 0x4a2a2a);
  rfm.position.z = -0.25;

  return { rootBone: hips, bones };
}

export function runRigTest() {
  const engine = new Engine(document.getElementById('game-canvas'));
  const { scene, camera } = engine;
  const params = new URLSearchParams(location.search);
  const animParam = params.get('anim');

  scene.background = new THREE.Color(0x141a26);
  scene.fog = new THREE.Fog(0x141a26, 60, 220);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: 0x2a2e36, roughness: 0.9 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // virtual rig + animator (gameplay side)
  const def = ROSTER_BY_ID.titanus;
  const D = computeDims(def);
  const { root, joints } = buildRig(D);
  scene.add(root);
  const mech = { group: root, joints, anchors: {}, dims: D, def };
  const animator = new Animator(mech);

  // synthetic "GLB" skeleton puppet
  const { rootBone, bones } = buildTestSkeleton();
  root.add(rootBone);
  const boneMap = mapBones(bones);
  const mappedCount = Object.keys(boneMap).length;
  const adapter = new RigAdapter(joints, boneMap, { bindPose: 'tpose', hipsScale: 1 });
  mech.postAnimate = () => adapter.sync();

  camera.position.set(5, 6.5, 14);
  camera.lookAt(0, 4, 0);

  const label = document.createElement('div');
  label.style.cssText = 'position:absolute;top:12px;left:12px;color:#8fe8ff;font:15px monospace;z-index:20;white-space:pre';
  label.textContent = `bones mapped: ${mappedCount}/15`;
  document.getElementById('ui-root').appendChild(label);

  const clipNames = Object.keys(CLIPS);
  let clipIdx = 0, clipTimer = 2.0, t = 0;

  engine.onUpdate = (dt) => {
    t += dt;
    const ctx = { speed: 0, maxSpeed: 10, grounded: true, vy: 0 };
    if (animParam === 'walk') {
      ctx.speed = (Math.sin(t * 0.35) * 0.5 + 0.5) * 10;
      label.textContent = `bones mapped: ${mappedCount}/15 | walk speed=${ctx.speed.toFixed(1)}`;
    } else if (animParam && CLIPS[animParam]) {
      if (!animator.action) animator.play(animParam);
      label.textContent = `bones mapped: ${mappedCount}/15 | clip: ${animParam}`;
    } else {
      clipTimer -= dt;
      if (clipTimer <= 0) {
        const name = clipNames[clipIdx % clipNames.length];
        label.textContent = `bones mapped: ${mappedCount}/15 | clip: ${name}`;
        animator.play(name);
        clipTimer = CLIPS[name].dur + 0.8;
        clipIdx++;
      }
    }
    animator.update(dt, ctx);
    root.rotation.y = Math.sin(t * 0.22) * 0.7;
  };
  engine.start();
  return engine;
}
