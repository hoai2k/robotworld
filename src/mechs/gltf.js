// GLB character pipeline: loads rigged humanoid models (Meshy / Tripo /
// Mixamo auto-rigs) described in public/models/manifest.json and drives them
// with the game's existing animation system via RigAdapter.
//
// Manifest format (public/models/manifest.json):
// {
//   "titanus": {
//     "url": "models/titanus.glb",
//     "bindPose": "tpose",            // tpose | apose | native | {joint:[x,y,z]°}
//     "boneOverrides": { "torso": "Spine2" },   // optional explicit bone names
//     "heightScale": 1.0,             // fine-tune vs the mech's gameplay height
//     "yawOffset": 0,                 // degrees, if the model faces the wrong way
//     "emissiveBoost": 1.5,           // multiply emissive intensity on materials
//     "stretch": { "elbowL": 1.2 }    // lengthen a limb segment: multiplies the
//                                     // mapped bone's local offset from its
//                                     // parent (the skin follows) — fix models
//                                     // whose proportions undershoot the mech
//   }, ...
// }
// Any mech missing from the manifest (or failing to load) falls back to the
// procedural model — the game always works.
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { buildMech, buildRig, computeDims, addAnchor } from './factory.js';
import { Animator } from './animator.js';
import { RigAdapter, mapBones } from './rigadapter.js';
import { GLB_DRESS } from './designs.js';

let manifest = null;
let manifestPromise = null;
const gltfCache = new Map(); // url -> Promise<GLTF>
const loader = new GLTFLoader();

export function loadManifest() {
  if (!manifestPromise) {
    // ?debug=backup — ignore all GLB overrides and run the procedural
    // (backup) models, e.g. to compare or when a service model misbehaves.
    if (new URLSearchParams(location.search).get('debug') === 'backup') {
      manifestPromise = Promise.resolve({}).then((m) => { manifest = m; return m; });
      return manifestPromise;
    }
    manifestPromise = fetch(new URL('models/manifest.json', document.baseURI))
      .then((r) => (r.ok ? r.json() : {}))
      .catch(() => ({}))
      .then((m) => { manifest = m; return m; });
  }
  return manifestPromise;
}

function loadGLTF(url) {
  if (!gltfCache.has(url)) {
    gltfCache.set(url, new Promise((resolve, reject) => {
      loader.load(new URL(url, document.baseURI).href, resolve, undefined, reject);
    }));
  }
  return gltfCache.get(url);
}

// Preload the models for a set of mech ids (call during select/loading).
export async function preloadMechModels(ids) {
  const m = await loadManifest();
  await Promise.allSettled(ids.filter((id) => m[id]?.url).map((id) => loadGLTF(m[id].url)));
}

/**
 * Build a mech: GLB-backed when the manifest has an entry, procedural
 * otherwise. Async — callers awaiting battle start use this; menus keep
 * using the sync procedural buildMech for instant previews.
 */
export async function createMech(def) {
  const m = await loadManifest();
  const entry = m[def.id];
  if (!entry?.url) return buildMech(def);
  try {
    const gltf = await loadGLTF(entry.url);
    return buildGlbMech(def, entry, gltf);
  } catch (e) {
    console.warn(`GLB for ${def.id} failed (${e.message}); using procedural model`);
    return buildMech(def);
  }
}

function buildGlbMech(def, entry, gltf) {
  const D = computeDims(def);
  const { root, joints } = buildRig(D); // invisible virtual skeleton (no geometry)

  // clone the scene so several fighters can use the same mech
  const model = cloneSkinned(gltf.scene);

  // collect skeleton bones + meshes
  const bones = [];
  const meshes = [];
  model.traverse((o) => {
    if (o.isBone) bones.push(o);
    if (o.isMesh || o.isSkinnedMesh) {
      meshes.push(o);
      o.castShadow = true;
      o.frustumCulled = false; // skinned bounds are unreliable mid-animation
      if (entry.emissiveBoost && o.material?.emissive) {
        o.material = o.material.clone();
        o.material.emissiveIntensity = (o.material.emissiveIntensity || 1) * entry.emissiveBoost;
      }
    }
  });

  // scale + ground the model to the mech's gameplay height.
  // NOTE: measure the SKINNED vertices, not Box3.setFromObject — skinned
  // verts follow bones and ignore the mesh node's own transform chain
  // (Tripo GLBs carry an Armature offset there), so a geometry-box ground
  // puts the rendered skin meters underground.
  const targetH = (D.hipHeight + D.torsoH + D.headSize * 2) * (entry.heightScale ?? 1);
  const box = skinnedBox(model);
  const size = box.getSize(new THREE.Vector3());
  const scale = size.y > 0.01 ? targetH / size.y : 1;
  const container = new THREE.Group();
  container.add(model);
  model.scale.setScalar(scale);
  // ground/center on the box the shader will actually render: assemble
  // first, refresh matrices + attached-mode bindMatrixInverse, re-measure,
  // then correct the residual. (Predicting this analytically breaks on
  // rigs whose mesh-node chain carries offsets — Tripo's Armature does.)
  container.updateMatrixWorld(true);
  const rbox = skinnedBox(container);
  const center = rbox.getCenter(new THREE.Vector3());
  model.position.x -= center.x;
  model.position.y -= rbox.min.y;
  model.position.z -= center.z;
  if (entry.yawOffset) container.rotation.y = entry.yawOffset * Math.PI / 180;
  root.add(container);

  const mech = { group: root, joints, anchors: {}, materials: {}, dims: D, def, isGLB: true };

  // default anchors (same semantics as procedural mechs)
  mech.anchors.muzzleR = addAnchor(joints.handR, 0, -0.2 * D.scale, 0.4 * D.scale);
  mech.anchors.muzzleL = addAnchor(joints.handL, 0, -0.2 * D.scale, 0.4 * D.scale);
  mech.anchors.core = addAnchor(joints.torso, 0, D.torsoH * 0.5, D.torsoD * 0.4);
  mech.anchors.overhead = addAnchor(joints.root, 0, targetH + 1.2 * D.scale, 0);
  const coreLight = new THREE.PointLight(def.colors.glow, 14, 11 * D.scale, 2);
  mech.anchors.core.add(coreLight);

  // per-mech dressing over the model (glow shards, signature lights)
  GLB_DRESS[def.id]?.(mech);

  // rest pose must be applied before offset capture -> create the Animator now
  mech.premadeAnimator = new Animator(mech);

  const boneMap = mapBones(bones, entry.boneOverrides || {});
  const mapped = Object.keys(boneMap).length;
  if (mapped < 10) {
    console.warn(`GLB for ${def.id}: only ${mapped} bones mapped — falling back to procedural`);
    return buildMech(def);
  }
  // limb stretch: scale bone offsets away from bind before offset capture,
  // so a model whose proportions undershoot the mech (e.g. short arms) is
  // lengthened once and animates normally from there
  if (entry.stretch) {
    for (const [jname, k] of Object.entries(entry.stretch)) {
      boneMap[jname]?.position.multiplyScalar(k);
    }
  }
  const adapter = new RigAdapter(joints, boneMap, {
    bindPose: entry.bindPose ?? 'tpose',
    hipsScale: 1 / (scale || 1),
  });
  mech.postAnimate = () => { adapter.sync(); mech.postDress?.(); };
  return mech;
}

// Bounding box of a model's RENDERED surface at bind: skinned meshes are
// sampled through getVertexPosition (applies bone transforms); plain meshes
// through their world matrix. Model must not yet be scaled/parented.
const _v = new THREE.Vector3();
function skinnedBox(model) {
  model.updateMatrixWorld(true); // virtual dispatch → SkinnedMesh refreshes bindMatrixInverse
  const box = new THREE.Box3();
  model.traverse((o) => {
    if (o.isSkinnedMesh) o.skeleton.update();
    if (!o.isMesh && !o.isSkinnedMesh) return;
    const pos = o.geometry?.attributes?.position;
    if (!pos) return;
    const stride = Math.max(1, Math.floor(pos.count / 20000));
    for (let i = 0; i < pos.count; i += stride) {
      o.getVertexPosition(i, _v);       // skin-aware on SkinnedMesh
      o.localToWorld(_v);               // mesh-node frame -> model frame
      box.expandByPoint(_v);
    }
  });
  return box;
}

// SkinnedMesh-aware clone — three's reference implementation. (A previous
// hand-rolled version cloned Skeleton then remapped bones without rebuilding
// boneInverses pairing, which visibly tore Tripo rigs.)
function cloneSkinned(source) {
  return skeletonClone(source);
}
