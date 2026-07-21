// Custom rig: replace a GLB's (often scrambled) auto-rig skeleton with a
// clean, hand-placed one whose bones ARE the game joints, then rebind the mesh
// to it with per-part rigid weights. For hard-surface mechs this is exactly
// right — each shell part rides one bone — and it lets a crab's giant claws be
// real independent arms instead of geometry welded to a leg bone.
//
// A rig is data (see src/mechs/rigs/<id>.js), authored/tuned live in the
// ?rigedit tool:
//   { bones: [{ name, parent, pos:[x,y,z] }, ...] }   // pos in MESH-LOCAL space
// Bone names that match game joints (shoulderL, handR, thighL, ...) are what
// the RigAdapter drives; extra bones (name not a joint) hold static geometry
// (a crab's spare walking legs) so it doesn't follow a driven limb.
import * as THREE from 'three';

const _v = new THREE.Vector3();
const _ab = new THREE.Vector3();
const _av = new THREE.Vector3();

// nearest point-to-segment squared distance (segment a→b)
function segDist2(px, py, pz, a, b) {
  _ab.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  _av.set(px - a[0], py - a[1], pz - a[2]);
  const len2 = _ab.lengthSq();
  const t = len2 > 1e-9 ? Math.max(0, Math.min(1, _av.dot(_ab) / len2)) : 0;
  const dx = _av.x - _ab.x * t, dy = _av.y - _ab.y * t, dz = _av.z - _ab.z * t;
  return dx * dx + dy * dy + dz * dz;
}

// Compute a rigid per-vertex bone assignment for `rig` against `mesh`
// geometry (mesh-local positions). Each vertex → the bone whose segment
// (bone→parent) is nearest. Returns Int available as {skinIndex, skinWeight}.
export function computeWeights(mesh, rig) {
  const pos = mesh.geometry.attributes.position;
  const n = pos.count;
  const byName = Object.fromEntries(rig.bones.map((b, i) => [b.name, i]));
  const segs = rig.bones.map((b) => ({
    idx: byName[b.name],
    a: b.pos,
    b: b.parent && byName[b.parent] !== undefined ? rig.bones[byName[b.parent]].pos : b.pos,
    // a bone may over-reach: `grab` widens/narrows its win radius (optional tuning)
    bias: b.bias || 1,
  }));
  const skinIndex = new Uint16Array(n * 4);
  const skinWeight = new Float32Array(n * 4);
  for (let i = 0; i < n; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    let best = 0, bestD = Infinity;
    for (const s of segs) {
      const d = segDist2(x, y, z, s.a, s.b) * s.bias;
      if (d < bestD) { bestD = d; best = s.idx; }
    }
    skinIndex[i * 4] = best;
    skinWeight[i * 4] = 1;
  }
  return { skinIndex, skinWeight };
}

// Build a bone hierarchy from rig data. Positions are MESH-LOCAL; bind pose is
// rotation-free so each bone's LOCAL position = its world pos minus the
// parent's. Returns { bones, byName, root }.
export function buildSkeletonBones(rig) {
  const byName = {};
  const bones = [];
  for (const bd of rig.bones) {
    const bone = new THREE.Bone();
    bone.name = bd.name;
    byName[bd.name] = bone;
    bones.push(bone);
  }
  let root = null;
  for (const bd of rig.bones) {
    const bone = byName[bd.name];
    if (bd.parent && byName[bd.parent]) {
      const pp = rig.bones.find((b) => b.name === bd.parent).pos;
      byName[bd.parent].add(bone);
      bone.position.set(bd.pos[0] - pp[0], bd.pos[1] - pp[1], bd.pos[2] - pp[2]);
    } else {
      bone.position.set(bd.pos[0], bd.pos[1], bd.pos[2]);
      root = bone;
    }
  }
  return { bones, byName, root };
}

// Re-write the mesh's per-vertex weights from the current rig (used live by
// ?rigedit after a bone is moved) without touching the skeleton binding.
export function setWeights(mesh, rig) {
  const { skinIndex, skinWeight } = computeWeights(mesh, rig);
  mesh.geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  mesh.geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));
}

// Recapture the CURRENT bone poses as the bind pose (so the mesh renders at
// rest for whatever positions the bones are in now). Used after a gizmo move
// so editing bind positions never deforms the model.
export function rebindRest(mesh, bones) {
  mesh.updateMatrixWorld(true);
  mesh.bind(new THREE.Skeleton(bones), mesh.matrixWorld.clone());
}

// Replace `mesh`'s skeleton with a fresh hand-placed one and rebind. The bones
// are placed in mesh-LOCAL space and parented under the mesh's own parent, so
// they inherit the model's transform (scale/ground/yaw) exactly like the
// original armature did. Returns { bones, byName, root, skeleton }.
export function applyCustomRig(mesh, rig) {
  const { bones, byName, root } = buildSkeletonBones(rig);

  // place the bone tree in the SAME space the geometry lives in. mesh.matrix
  // maps mesh-local → parent space; bones authored in mesh-local must be
  // pre-multiplied by it so they land on the geometry when parented to
  // mesh.parent (Tripo SkinnedMeshes usually sit at identity, but don't assume).
  const parent = mesh.parent || mesh;
  mesh.updateMatrix();
  root.applyMatrix4(mesh.matrix);   // fold mesh-local→parent-space into the root
  parent.add(root);
  parent.updateMatrixWorld(true);

  const { skinIndex, skinWeight } = computeWeights(mesh, rig);
  mesh.geometry.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(skinIndex, 4));
  mesh.geometry.setAttribute('skinWeight', new THREE.Float32BufferAttribute(skinWeight, 4));

  const skeleton = new THREE.Skeleton(bones);
  mesh.updateMatrixWorld(true);
  mesh.bind(skeleton, mesh.matrixWorld.clone());
  return { bones, byName, root, skeleton };
}
