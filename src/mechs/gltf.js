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
import { profileFor as glbProfileFor } from './glbanim.js';
import { applySkinOpsToGltf } from './skinops.js';
import { clamp } from '../core/utils.js';
import { warnContract } from './contract.js';

let manifest = null;
let manifestPromise = null;

// Every key buildGlbMech (or the tool path) actually reads from a manifest
// entry. `alt` is a complete standalone sub-entry (see buildGlbForTool).
const KNOWN_ENTRY_KEYS = new Set([
  'url', 'bindPose', 'boneOverrides', 'heightScale', 'yawOffset',
  'emissiveBoost', 'stretch', 'bonePos', 'boneCorrections', 'noHeadMatch',
  'skinOps', 'reparent', 'muzzles', 'profileKey', 'alt',
]);
const _entryWarned = new Set(); // "<id>|<msg>" — each complaint fires once per entry
function warnEntryOnce(id, msg) {
  const key = id + '|' + msg;
  if (_entryWarned.has(key)) return;
  _entryWarned.add(key);
  console.warn(`manifest[${id}]: ${msg}`);
}
const gltfCache = new Map(); // url -> Promise<GLTF>
const loader = new GLTFLoader();
const _gcTmp = new THREE.Vector3();   // groundClamp scratch
const _gcTmp2 = new THREE.Vector3();

// ?debug=3d enables the service GLB models; any other value (incl. default)
// runs procedural. When on, menus/previews show a spinner instead of the
// procedural stand-in while a GLB downloads, then swap the GLB in.
export function is3dMode() {
  return new URLSearchParams(location.search).get('debug') === '3d';
}

// Sync check — only meaningful once loadManifest() has resolved (which the
// boot flow awaits before building any screen). In non-3d mode the manifest
// is forced empty, so this is always false and callers show procedural.
export function manifestHasGlb(id) {
  return !!(manifest && manifest[id]?.url);
}

// One fetch+parse of public/models/manifest.json, shared by every manifest
// reader. Missing/broken file resolves {} so the game always works. NOT
// cached: loadManifest keeps its own promise cache, and the tool/raw readers
// deliberately re-read the on-disk file each call.
function fetchManifestJson() {
  return fetch(new URL('models/manifest.json', document.baseURI))
    .then((r) => (r.ok ? r.json() : {}))
    .catch(() => ({}));
}

export function loadManifest() {
  if (!manifestPromise) {
    // GLB overrides are opt-in for now: ?debug=3d enables the service
    // models; anything else (including the default) runs the procedural
    // models. (?debug=backup therefore also means procedural.)
    if (new URLSearchParams(location.search).get('debug') !== '3d') {
      manifestPromise = Promise.resolve({}).then((m) => { manifest = m; return m; });
      return manifestPromise;
    }
    manifestPromise = fetchManifestJson().then((m) => { manifest = m; return m; });
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

// Force-build a GLB mech straight from the on-disk manifest, bypassing the
// ?debug=3d gate. Used by the ?debug=models pose tool. `entryOverride` lets
// the caller preview edited manifest fields (bindPose/boneCorrections/...)
// without touching the committed file. Pass {alt:true} in opts to build the
// mech's ALTERNATE model: manifest[id].alt is a complete standalone entry
// (own url/boneOverrides/yaw/size intake — deliberately NOT merged with the
// primary entry, whose tuning belongs to different geometry). The game itself
// never reads .alt; a promotion = copying it over the primary entry.
export async function buildGlbForTool(def, entryOverride, opts = {}) {
  const m = await fetchManifestJson();
  const baseEntry = opts.alt ? m[def.id]?.alt : m[def.id];
  const entry = { ...(baseEntry || {}), ...(entryOverride || {}) };
  if (!entry.url) return { mech: buildMech(def), entry: null };
  const gltf = await loadGLTF(entry.url);
  return { mech: buildGlbMech(def, entry, gltf), entry };
}

// Read the raw manifest file (tool/debug use; not the ?debug=3d gate).
export async function fetchRawManifest() {
  return fetchManifestJson();
}

// Load a mech's RAW gltf scene at bind pose — no rig, no retarget, no
// skinOps — with PRIVATE geometry so callers may mutate skin weights freely
// (SkeletonUtils.clone shares geometry; the game cache must stay pristine).
// For the ?debug=skin workbench and the skin audit.
export async function loadRawGlbScene(id) {
  const m = await fetchRawManifest();
  const entry = m[id];
  if (!entry?.url) return null;
  const gltf = await loadGLTF(entry.url);
  const scene = cloneSkinned(gltf.scene);
  scene.traverse((o) => {
    if (o.isSkinnedMesh) {
      o.geometry = o.geometry.clone();
      delete o.geometry.userData.__skinOpsApplied;
    }
  });
  return { scene, entry };
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

  // light manifest hygiene: flag typo'd/stale entry keys (once per entry)
  for (const k of Object.keys(entry)) {
    if (!KNOWN_ENTRY_KEYS.has(k)) warnEntryOnce(def.id, `unknown key "${k}"`);
  }

  // clone the scene so several fighters can use the same mech
  const model = cloneSkinned(gltf.scene);

  // manifest `reparent`: {"childBone": "newParentBone"} — fix auto-rig
  // hierarchy mistakes (fenrir's front paws hang off tripoRoot instead of the
  // forearm chains). attach() preserves the world transform, so the bind-pose
  // skin is untouched (boneInverses stay valid); the child simply starts
  // FOLLOWING its new parent. Applied per-clone, before the RigAdapter reads
  // the hierarchy. Only touches the CLONE's hierarchy — skinOps below runs on
  // the CACHED scene, so purgeFar keeps its committed hierarchy-distance
  // semantics regardless of order.
  if (entry.reparent) {
    model.updateMatrixWorld(true);
    const byName = new Map();
    model.traverse((o) => { if (o.isBone) byName.set(o.name, o); });
    for (const [childName, parentName] of Object.entries(entry.reparent)) {
      const c = byName.get(childName), p = byName.get(parentName);
      if (c && p) p.attach(c);
      else console.warn('reparent: unknown bone', childName, '->', parentName);
    }
  }

  // collect skeleton bones + meshes
  const bones = [];
  const meshes = [];
  model.traverse((o) => {
    if (o.isBone) bones.push(o);
    if (o.isMesh || o.isSkinnedMesh) meshes.push(o);
  });

  // Map GLB bones onto the virtual rig's joints EARLY (mapBones is pure
  // name-matching, so nothing else needs to happen first) and bail to the
  // procedural model before paying for skinOps/scaling/dressing/Animator.
  // A failing model therefore never gets its cached geometry skinOps'd —
  // fine, since the procedural fallback never touches that geometry.
  const boneMap = mapBones(bones, entry.boneOverrides || {});
  const mapped = Object.keys(boneMap).length;
  if (mapped < 10) {
    console.warn(`GLB for ${def.id}: only ${mapped} bones mapped — falling back to procedural`);
    return buildMech(def);
  }
  // more manifest hygiene: entries naming bones/joints that don't resolve.
  // (mapBones silently ignores an override whose bone name doesn't exist;
  // stretch/bonePos silently skip unmapped joints — surface those, once.)
  for (const [joint, boneName] of Object.entries(entry.boneOverrides || {})) {
    if (!bones.some((b) => b.name === boneName)) {
      warnEntryOnce(def.id, `boneOverrides.${joint}: no bone named "${boneName}"`);
    }
  }
  for (const key of ['stretch', 'bonePos']) {
    for (const jname of Object.keys(entry[key] || {})) {
      if (!boneMap[jname]) warnEntryOnce(def.id, `${key}.${jname}: joint not mapped to a bone`);
    }
  }

  // manifest `skinOps`: rebind auto-rig weight mistakes (a hip plate on a
  // forearm, a banner on an arm) to the right bone — see skinops.js. Applied
  // to the CACHED scene once (idempotent guard on the geometry); clones share
  // that geometry, so applying it after cloneSkinned still fixes this clone.
  applySkinOpsToGltf(gltf.scene, entry.skinOps);

  for (const o of meshes) {
    o.castShadow = true;
    o.frustumCulled = false; // skinned bounds are unreliable mid-animation
    if (entry.emissiveBoost && o.material?.emissive) {
      o.material = o.material.clone();
      o.material.emissiveIntensity = (o.material.emissiveIntensity || 1) * entry.emissiveBoost;
    }
  }

  // scale + ground the model to the mech's gameplay height.
  // NOTE: measure the SKINNED vertices, not Box3.setFromObject — skinned
  // verts follow bones and ignore the mesh node's own transform chain
  // (Tripo GLBs carry an Armature offset there), so a geometry-box ground
  // puts the rendered skin meters underground.
  const targetH = (D.hipHeight + D.torsoH + D.headSize * 2); // heightScale applied once, at the end
  const box = skinnedBox(model);
  const size = box.getSize(new THREE.Vector3());
  let scale = 1;
  const container = new THREE.Group();
  container.add(model);
  // Multiply the running model scale by k, then ground/center on the box the
  // shader will actually render: assemble first, refresh matrices +
  // attached-mode bindMatrixInverse, re-measure, then correct the residual.
  // (Predicting this analytically breaks on rigs whose mesh-node chain
  // carries offsets — Tripo's Armature does.) Used for the initial height
  // fit and every later rescale (head matches, heightScale); callers that
  // exist after the RigAdapter is built must also refresh adapter.hipsScale.
  const rescaleAndReground = (k) => {
    scale *= k;
    model.scale.setScalar(scale);
    container.updateMatrixWorld(true);
    const rb = skinnedBox(container);
    const c = rb.getCenter(new THREE.Vector3());
    model.position.x -= c.x;
    model.position.y -= rb.min.y;
    model.position.z -= c.z;
  };
  rescaleAndReground(size.y > 0.01 ? targetH / size.y : 1);
  if (entry.yawOffset) container.rotation.y = entry.yawOffset * Math.PI / 180;
  root.add(container);

  const mech = { group: root, joints, anchors: {}, materials: {}, dims: D, def, isGLB: true };
  // reinterpret shared anims for this model. entry.profileKey lets a model
  // VARIANT (e.g. an alt whose weapon sits in the other hand) carry its own
  // glbanim profile ('aegis_alt') instead of the mech's default one.
  mech.animProfile = glbProfileFor(entry.profileKey || def.id);

  // muzzleR / muzzleL (projectile-spawn anchors) are created below, AFTER the
  // boneMap is resolved — they may pin to a real GLB bone, not just a virtual
  // joint (see installMuzzles).
  mech.anchors.core = addAnchor(joints.torso, 0, D.torsoH * 0.5, D.torsoD * 0.4);
  mech.anchors.overhead = addAnchor(joints.root, 0, targetH + 1.2 * D.scale, 0);
  const coreLight = new THREE.PointLight(def.colors.glow, 14, 11 * D.scale, 2);
  mech.anchors.core.add(coreLight);

  // per-mech dressing over the model (glow shards, signature lights)
  GLB_DRESS[def.id]?.(mech);

  // rest pose must be applied before offset capture -> create the Animator now
  mech.premadeAnimator = new Animator(mech);

  // head-height match: rescale the visual model so its head bone sits at the
  // same height as the procedural head joint. Keying the size on the HEAD
  // (rather than the raw bbox top) keeps GLB and procedural bodies the same
  // general size — a raised tail, weapon, or crystal spire no longer shrinks
  // the whole body to fit under the height cap. entry.heightScale still
  // scales this target for manual per-mech tuning.
  if (boneMap.head && !entry.noHeadMatch) {
    root.updateWorldMatrix(true, true);
    const targetHeadY = joints.head.getWorldPosition(new THREE.Vector3()).y;
    const glbHeadY = boneMap.head.getWorldPosition(new THREE.Vector3()).y; // feet grounded at 0
    if (glbHeadY > 0.05 && targetHeadY > 0.05) {
      rescaleAndReground(targetHeadY / glbHeadY);
    }
  }
  // limb stretch: scale bone offsets away from bind before offset capture,
  // so a model whose proportions undershoot the mech (e.g. short arms) is
  // lengthened once and animates normally from there
  if (entry.stretch) {
    for (const [jname, k] of Object.entries(entry.stretch)) {
      boneMap[jname]?.position.multiplyScalar(k);
    }
  }
  // per-bone rest-position nudge from the ?debug=models tool (translate mode)
  if (entry.bonePos) {
    for (const [jname, d] of Object.entries(entry.bonePos)) {
      const b = boneMap[jname];
      if (b) b.position.set(b.position.x + d[0], b.position.y + d[1], b.position.z + d[2]);
    }
  }
  const adapter = new RigAdapter(joints, boneMap, {
    bindPose: entry.bindPose ?? 'tpose',
    hipsScale: 1 / (scale || 1),
    corrections: entry.boneCorrections, // from the ?debug=models pose tool
  });
  mech.postAnimate = () => { adapter.sync(); mech.postDress?.(); };
  mech.boneMap = boneMap;   // pose tool reaches bones by virtual-joint name
  mech.adapter = adapter;

  // Muzzle (projectile-spawn) anchors — the SINGLE source of every ranged /
  // cannon / special spawn origin for this GLB (combat reads ONLY
  // anchors.muzzleR / muzzleL, in world.js + specials.js). A GLB's guns sit at
  // model-specific spots the generic in-hand offset misses — Cranky's water
  // cannons ride the SHELL, not the claws; Saurion breathes from the SKULL;
  // Frogger's slime guns and Inferno's torches sit at forearm barrel tips — so
  // a per-mech `muzzles` manifest entry pins each side explicitly:
  //   "muzzles": { "R": { "joint": "torso", "offset": [x,y,z] }, "L": {...} }
  //   • "joint": a VIRTUAL rig joint — canonical frame (+Z fwd, +Y up), offset
  //     in mech-scale units. Best for body/hand-mounted guns on humanoid rigs.
  //   • "bone":  a mapped GLB bone (boneMap key, e.g. "head") — rides the real
  //     model geometry, for non-humanoid mounts a virtual joint can't reach
  //     (a raptor's skull sits nowhere near the biped head joint). Offset is in
  //     that bone's LOCAL frame, mech-scale units (model-scale compensated).
  // The anchor rides the animated joint/bone, so the spawn tracks the weapon
  // through the whole pose. No entry -> generic in-hand muzzle (unchanged for
  // mechs whose weapon really is at the hand).
  const installMuzzle = (side) => {
    const spec = entry.muzzles?.[side];
    const o = spec?.offset || [0, -0.2, 0.4];
    // "bone" resolves through the boneMap first (canonical joint keys), then
    // as a RAW bone name — for mounts on bones no combat joint maps to
    if (spec?.bone) {
      const b = boneMap[spec.bone] || bones.find((x) => x.name === spec.bone);
      if (b) {
        // bone-local units are model-space (pre model.scale); divide so the
        // world offset matches the mech-scale numbers used for joint muzzles.
        const k = D.scale / (scale || 1);
        return addAnchor(b, o[0] * k, o[1] * k, o[2] * k);
      }
    }
    // R/L default to the hands; named extras (podL...) fall back to torso
    const joint = joints[spec?.joint] || joints['hand' + side] || joints.torso;
    return addAnchor(joint, o[0] * D.scale, o[1] * D.scale, o[2] * D.scale);
  };
  mech.anchors.muzzleR = installMuzzle('R');
  mech.anchors.muzzleL = installMuzzle('L');
  // Any OTHER key in entry.muzzles creates an anchor under its own name —
  // secondary weapon mounts combat already reads by name with a muzzle
  // fallback (e.g. Vulcan's shoulder missile pods: specials' muzzle(f,'podL')
  // prefers anchors.podL). Same joint/bone + offset semantics as R/L.
  for (const key of Object.keys(entry.muzzles || {})) {
    if (key === 'R' || key === 'L') continue;
    mech.anchors[key] = installMuzzle(key);
  }

  // Second-pass head-height match, on the VISIBLE head. The bind-time match
  // above is a rough pre-scale on the head bone; this pass poses one real
  // frame and scales so the GLB's rendered head-region top sits at the
  // procedural mech's rendered head-region top — the SAME canonical size in
  // every view (pose tool, showcase, battle, menus). Matching visible tops
  // (not the neck joint) is what makes the heads actually line up.
  if (boneMap.head && !entry.noHeadMatch) {
    mech.premadeAnimator.poseStatic(); // deterministic neutral pose + postAnimate
    root.updateWorldMatrix(true, true);
    const targetHeadY = proceduralHeadTop(def) ?? joints.head.getWorldPosition(new THREE.Vector3()).y;
    const haveHeadY = measureHeadTop(mech);
    mech._headDebug = { target: +targetHeadY?.toFixed(3), have0: +haveHeadY?.toFixed(3) };
    if (haveHeadY > 0.05 && targetHeadY > 0.05) {
      // clamp the correction: the first (bind-bone) pass already gets close, so
      // a large factor here means the head region was mis-measured (creatures
      // whose "head" is a pitched skull with a long vertical spread — saurion).
      // Cap it so a bad read can only nudge, never drastically resize.
      const k = clamp(targetHeadY / haveHeadY, 0.9, 1.12);
      mech._headDebug.k = +k.toFixed(3);
      if (Math.abs(k - 1) > 0.005) {
        rescaleAndReground(k);
        adapter.hipsScale = 1 / (scale || 1);
      }
    }
  }

  // Final per-mech size override. The head-match above brings the GLB to the
  // procedural canonical size (clamped); heightScale is a deliberate artist
  // tweak on TOP of that (uncapped) — e.g. "make viper 10% bigger". Applied
  // once, here, so it composes cleanly with the auto-match in every view.
  const hs = entry.heightScale ?? 1;
  if (Math.abs(hs - 1) > 1e-3) {
    rescaleAndReground(hs);
    adapter.hipsScale = 1 / (scale || 1);
  }

  // ---- prone / dead floor clamp (GLB) -----------------------------------
  // The shared knockdown/death clips drop the hips by an amount tuned to the
  // PROCEDURAL body. Retargeted onto a GLB whose proportions differ, that same
  // drop leaves the prone body floating (inferno) or sunk through the floor
  // (nullbot). groundClamp(true) shifts the whole model vertically so its
  // LOWEST rendered point rests on the ground (root-local y = 0); (false)
  // restores the natural offset. The fighter calls this ONLY in grounded
  // down-states (knockdown / getup / dead) — upright stances keep the
  // retarget's own per-foot grounding, which is already correct.
  const clampBaseY = container.position.y;
  mech.groundClamp = (active) => {
    if (!active) {
      if (container.position.y !== clampBaseY) container.position.y = clampBaseY;
      return;
    }
    container.position.y = clampBaseY;
    root.updateWorldMatrix(true, true);
    const rootY = root.getWorldPosition(_gcTmp).y;
    let minY = Infinity;
    for (const m of meshes) {
      const posAttr = m.geometry?.attributes?.position;
      if (!posAttr) continue;
      if (m.isSkinnedMesh) m.skeleton.update();
      const stride = Math.max(1, Math.floor(posAttr.count / 1500));
      for (let i = 0; i < posAttr.count; i += stride) {
        m.getVertexPosition(i, _gcTmp2);   // skin-aware on SkinnedMesh
        m.localToWorld(_gcTmp2);
        if (_gcTmp2.y < minY) minY = _gcTmp2.y;
      }
    }
    // container Y is root-local; root carries only translation + yaw, so a
    // local-Y delta equals a world-Y delta. Bring worldMinY up/down to rootY.
    if (minY !== Infinity) container.position.y = clampBaseY + (rootY - minY);
  };

  // Synchronous, CORRECT clone for combat spawns (SAURION's raptor pack).
  // GLB bodies are SkinnedMeshes: Object3D.clone(true) shares the skeleton, so
  // the copy stays welded to the ORIGINAL's bones and renders invisible/torn.
  // Rebuild a fresh GLB mech from the already-cached gltf instead — no texture
  // re-synthesis (the frame-stall cloneMech avoids), a properly reskinned
  // clone, and its own rig / adapter / anchors / animation profile.
  mech.cloneGLB = () => buildGlbMech(def, entry, gltf);

  // profile build hook: attach extra PROCEDURAL geometry/joints to the
  // virtual rig (e.g. wraith's cape for the wing-laser heavy) — last, so it
  // sees the final joints/anchors/scale.
  mech.animProfile?.build?.(mech, def);

  warnContract(mech); // §5 contract check — warns instead of failing silently
  return mech;
}

// ---- visible head-height reference -------------------------------------
// The head JOINT sits at the neck; the visible head extends above it by a
// model-specific amount (crests, horns, crowns). Sizing on the joint/bone
// therefore leaves the rendered heads misaligned. Instead measure the top of
// the visible HEAD REGION and match those: procedural = geometry parented
// under J.head; GLB = skinned verts whose dominant bone is boneMap.head or a
// descendant. Robust to imperfect head-bone picks (a spine-ish head bone
// whose subtree still contains the head → its top is still the head top).
const _procHeadCache = new Map();
function pctileTop(ys, p = 0.97) {
  if (!ys.length) return null;
  ys.sort((a, b) => a - b);
  return ys[Math.min(ys.length - 1, Math.floor(ys.length * p))];
}

// World-space top of a mech's visible head region. Mech must be posed already.
export function measureHeadTop(mech) {
  const v = new THREE.Vector3();
  const ys = [];
  if (mech.isGLB && mech.boneMap?.head) {
    const headBones = new Set();
    mech.boneMap.head.traverse((o) => { if (o.isBone) headBones.add(o); });
    let sk = null;
    mech.group.traverse((o) => { if (o.isSkinnedMesh && !sk) sk = o; });
    if (sk) {
      sk.skeleton.update();
      const bi = new Map(sk.skeleton.bones.map((b, i) => [b, i]));
      const headIdx = new Set([...headBones].map((b) => bi.get(b)).filter((i) => i != null));
      const pos = sk.geometry.attributes.position;
      const ji = sk.geometry.attributes.skinIndex, wt = sk.geometry.attributes.skinWeight;
      const st = Math.max(1, Math.floor(pos.count / 14000));
      for (let i = 0; i < pos.count; i += st) {
        let b = ji.getX(i), w = wt.getX(i);
        if (wt.getY(i) > w) { w = wt.getY(i); b = ji.getY(i); }
        if (wt.getZ(i) > w) { w = wt.getZ(i); b = ji.getZ(i); }
        if (wt.getW(i) > w) { w = wt.getW(i); b = ji.getW(i); }
        if (headIdx.has(b)) { sk.getVertexPosition(i, v); sk.localToWorld(v); ys.push(v.y); }
      }
    }
    return pctileTop(ys) ?? mech.boneMap.head.getWorldPosition(v).y;
  }
  // procedural: geometry parented under the head joint
  const jh = mech.joints.head;
  jh.updateWorldMatrix(true, false);
  jh.traverse((o) => {
    if ((o.isMesh || o.isSkinnedMesh) && o.geometry?.attributes?.position) {
      const p = o.geometry.attributes.position;
      const st = Math.max(1, Math.floor(p.count / 4000));
      for (let i = 0; i < p.count; i += st) { v.fromBufferAttribute(p, i); o.localToWorld(v); ys.push(v.y); }
    }
  });
  // fallback (some designs don't parent head geo under J.head, e.g. frogger):
  // the head joint + ~2·headSize is the same estimate the old height cap used
  return pctileTop(ys) ?? (jh.getWorldPosition(v).y + (mech.dims?.headSize || 0.4) * 2);
}

function disposeMech(mech) {
  mech.group.traverse((o) => {
    o.geometry?.dispose?.();
    const mats = Array.isArray(o.material) ? o.material : (o.material ? [o.material] : []);
    for (const m of mats) {
      for (const k of ['map', 'normalMap', 'roughnessMap', 'metalnessMap', 'emissiveMap', 'aoMap']) m[k]?.dispose?.();
      m.dispose?.();
    }
  });
}

// Visible procedural head-top for a mech id — built once, measured, cached,
// disposed. The head geometry is color-scheme-independent, so id is the key.
function proceduralHeadTop(def) {
  if (_procHeadCache.has(def.id)) return _procHeadCache.get(def.id);
  let top = null;
  try {
    const pm = buildMech(def);
    new Animator(pm).poseStatic(); // deterministic neutral pose
    pm.group.updateWorldMatrix(true, true);
    top = measureHeadTop(pm);
    disposeMech(pm);
  } catch (e) { /* fall back to joint-based below */ }
  _procHeadCache.set(def.id, top);
  return top;
}

// Bounding box of a model's RENDERED surface at bind: skinned meshes are
// sampled through getVertexPosition (applies bone transforms); plain meshes
// through their world matrix. Model must not yet be scaled/parented.
const _v = new THREE.Vector3();
export function skinnedBox(model) {
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
