// Skin-repair engine for GLB mechs.
//
// Tripo auto-rigs frequently weight geometry to the WRONG bone — a hip plate
// to a forearm, a back banner to an arm, both legs to one chain. For rigid
// hard-surface robots the right skinning is per-part rigid binding, so repair
// is expressible as data: "this geometric part belongs to that bone".
//
// This module is the ONE implementation of that idea, shared by three users
// so component ids always agree:
//   • the runtime loader (gltf.js) applies a mech's manifest `skinOps`
//   • the ?debug=skin workbench previews/authored ops live in the browser
//   • the offline audit (tools/skinaudit.mjs) flags suspect bones
//
// Geometry model: each vertex has a DOMINANT BONE (max skin weight). Within
// one bone's vertex set, verts welded by position (1e-4 grid) or joined by
// triangle edges form BONE-ISLANDS — contiguous patches of geometry owned by
// that bone. (Whole-mesh connectivity is useless here: Tripo meshes are one
// fully-connected shell, but a hip plate bled onto a forearm is still a
// separate ISLAND of the forearm's vertex set.) An island is addressed as
// {bone: <name>, comp: <n>} = the n-th largest island of that bone (omit n
// for "all of them"), or globally as {comp: <globalIndex>}. Ordering is
// deterministic: vert count desc, then centroid y desc, x, z — stable across
// sessions and environments.
//
// An op: { sel: {bone, comp?} | {comp}, to: '<boneName>' }
// Applying an op binds every vertex of the selected component(s) RIGIDLY
// (weight 1.0) to the target bone — correct for mech parts, and exactly what
// hand-rigged hard-surface models do.
import * as THREE from 'three';

// Analyze one SkinnedMesh: dominant bone per vertex + bone-islands.
// Returns { compId: Int32Array per vertex, comps: [{id, count, boneIndex,
// boneName, centroid, min, max, verts}], domBone: Int32Array } with comps
// sorted deterministically (the array order IS the global island index).
export function analyzeSkin(mesh) {
  const geo = mesh.geometry;
  const pos = geo.attributes.position;
  const jnt = geo.attributes.skinIndex;
  const wgt = geo.attributes.skinWeight;
  const n = pos.count;
  const bones = mesh.skeleton.bones;

  // ---- dominant bone per vertex ----
  const domBone = new Int32Array(n);
  for (let i = 0; i < n; i++) {
    let bw = -1, bi = 0;
    for (let k = 0; k < 4; k++) {
      const w = wgt.getComponent(i, k);
      if (w > bw) { bw = w; bi = jnt.getComponent(i, k); }
    }
    domBone[i] = bi;
  }

  // ---- union-find, joining verts ONLY within the same dominant bone ----
  const parent = new Int32Array(n).fill(-1);
  const find = (a) => { let r = a; while (parent[r] >= 0) r = parent[r]; while (parent[a] >= 0) { const p = parent[a]; parent[a] = r; a = p; } return r; };
  const union = (a, b) => { if (domBone[a] !== domBone[b]) return; a = find(a); b = find(b); if (a !== b) parent[b] = a; };
  // weld-mates (UV/normal seam duplicates at the same position)
  {
    const firstOfWeld = new Map();
    for (let i = 0; i < n; i++) {
      const key = `${Math.round(pos.getX(i) * 1e4)},${Math.round(pos.getY(i) * 1e4)},${Math.round(pos.getZ(i) * 1e4)}`;
      const f = firstOfWeld.get(key);
      if (f === undefined) firstOfWeld.set(key, i);
      else union(f, i);
    }
  }
  // triangle edges
  const idx = geo.index;
  if (idx) {
    for (let t = 0; t < idx.count; t += 3) {
      const a = idx.getX(t), b = idx.getX(t + 1), c = idx.getX(t + 2);
      union(a, b); union(a, c); union(b, c);
    }
  } else {
    for (let t = 0; t < n; t += 3) { union(t, t + 1); union(t, t + 2); union(t + 1, t + 2); }
  }

  // ---- collect islands ----
  const byRoot = new Map();
  for (let i = 0; i < n; i++) {
    const r = find(i);
    let comp = byRoot.get(r);
    if (!comp) {
      comp = { verts: [], count: 0, boneIndex: domBone[i],
               centroid: [0, 0, 0], min: [1e9, 1e9, 1e9], max: [-1e9, -1e9, -1e9] };
      byRoot.set(r, comp);
    }
    comp.verts.push(i);
    comp.count++;
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    comp.centroid[0] += x; comp.centroid[1] += y; comp.centroid[2] += z;
    comp.min[0] = Math.min(comp.min[0], x); comp.min[1] = Math.min(comp.min[1], y); comp.min[2] = Math.min(comp.min[2], z);
    comp.max[0] = Math.max(comp.max[0], x); comp.max[1] = Math.max(comp.max[1], y); comp.max[2] = Math.max(comp.max[2], z);
  }
  const comps = [...byRoot.values()];
  for (const c of comps) {
    c.centroid = c.centroid.map((v) => v / c.count);
    c.boneName = bones[c.boneIndex]?.name || `joint${c.boneIndex}`;
  }
  // deterministic global order
  comps.sort((a, b) => b.count - a.count
    || b.centroid[1] - a.centroid[1] || a.centroid[0] - b.centroid[0] || a.centroid[2] - b.centroid[2]);
  const compId = new Int32Array(n);
  comps.forEach((c, ci) => { c.id = ci; for (const v of c.verts) compId[v] = ci; });
  return { compId, comps, domBone };
}

// Bone hierarchy distance matrix (BFS over parent/child links). Shared by
// the far-blend detector, the purgeFar op, and the audit tools.
export function boneHierDist(bones) {
  const nB = bones.length;
  const idxOf = new Map(bones.map((b, i) => [b, i]));
  const adj = bones.map(() => []);
  bones.forEach((b, i) => {
    const p = idxOf.get(b.parent);
    if (p !== undefined) { adj[i].push(p); adj[p].push(i); }
  });
  const dist = new Uint8Array(nB * nB).fill(255);
  for (let s = 0; s < nB; s++) {
    const q = [s]; dist[s * nB + s] = 0;
    while (q.length) {
      const u = q.shift();
      for (const v of adj[u]) {
        if (dist[s * nB + v] === 255) { dist[s * nB + v] = dist[s * nB + u] + 1; q.push(v); }
      }
    }
  }
  return dist;
}

// FAR-BLEND ("rubber") scan: find vertices strongly weighted to two bones
// that are DISTANT in the hierarchy (A-B-C-D: strong on A and D, skipping
// B/C). Such a vertex is AVERAGED between unrelated limbs whenever they move
// apart — it doesn't tear (the seam-stretch audit misses it), it smears:
// rubbery boots, waist tugs. For rigid mechs any strong cross-limb blend is
// wrong. Returns clusters keyed by dominant->far bone pair.
export function farBlendScan(mesh, { minDist = 3, minW = 0.2 } = {}) {
  const geo = mesh.geometry;
  const jnt = geo.attributes.skinIndex;
  const wgt = geo.attributes.skinWeight;
  const bones = mesh.skeleton.bones;
  const nB = bones.length;
  const dist = boneHierDist(bones);
  const pairs = new Map(); // "dom>far" -> {dom, far, verts:[], wSum}
  for (let i = 0; i < jnt.count; i++) {
    let bw = -1, bi = 0;
    for (let k = 0; k < 4; k++) {
      const w = wgt.getComponent(i, k);
      if (w > bw) { bw = w; bi = jnt.getComponent(i, k); }
    }
    for (let k = 0; k < 4; k++) {
      const w = wgt.getComponent(i, k);
      if (w < minW || w >= bw) continue;             // minority far weights only
      const fj = jnt.getComponent(i, k);
      if (dist[bi * nB + fj] < minDist) continue;    // near blends are legit joints
      const key = bi + '>' + fj;
      let rec = pairs.get(key);
      if (!rec) { rec = { dom: bones[bi]?.name, far: bones[fj]?.name, verts: [], wSum: 0 }; pairs.set(key, rec); }
      rec.verts.push(i);
      rec.wSum += w;
    }
  }
  return [...pairs.values()].sort((a, b) => b.verts.length - a.verts.length);
}

// purgeFar: strip minority far-bone weights from every vertex and
// renormalize what remains — the gentle fix for far-blend rubber (keeps the
// legitimate local blend instead of hard-snapping the vertex to one bone).
export function purgeFarWeights(mesh, { minDist = 3, minW = 0.05 } = {}) {
  const geo = mesh.geometry;
  const jnt = geo.attributes.skinIndex;
  const wgt = geo.attributes.skinWeight;
  const bones = mesh.skeleton.bones;
  const nB = bones.length;
  const dist = boneHierDist(bones);
  let touched = 0;
  for (let i = 0; i < jnt.count; i++) {
    let bw = -1, bi = 0;
    for (let k = 0; k < 4; k++) {
      const w = wgt.getComponent(i, k);
      if (w > bw) { bw = w; bi = jnt.getComponent(i, k); }
    }
    let sum = 0, changed = false;
    const keep = [0, 0, 0, 0];
    for (let k = 0; k < 4; k++) {
      let w = wgt.getComponent(i, k);
      const fj = jnt.getComponent(i, k);
      if (w >= minW && w < bw && dist[bi * nB + fj] >= minDist) { w = 0; changed = true; }
      keep[k] = w;
      sum += w;
    }
    if (!changed || sum <= 0) continue;
    touched++;
    wgt.setXYZW(i, keep[0] / sum, keep[1] / sum, keep[2] / sum, keep[3] / sum);
  }
  if (touched) { wgt.needsUpdate = true; }
  return touched;
}

// Resolve an op's selection to a list of components.
export function selectComps(analysis, sel) {
  if (sel.comp !== undefined && sel.bone === undefined) {
    const c = analysis.comps[sel.comp];
    return c ? [c] : [];
  }
  const owned = analysis.comps.filter((c) => c.boneName === sel.bone);
  // per-bone index: order = global order (already size-desc deterministic)
  if (sel.comp === undefined) return owned;
  const c = owned[sel.comp];
  return c ? [c] : [];
}

// Apply ops to a SkinnedMesh's geometry: rigid-bind selected components to
// the target bone. Mutates skinIndex/skinWeight in place. Returns a summary.
export function applySkinOps(mesh, ops, analysis = null) {
  if (!ops?.length) return { applied: 0, verts: 0 };
  const a = analysis || analyzeSkin(mesh);
  const geo = mesh.geometry;
  const jnt = geo.attributes.skinIndex;
  const wgt = geo.attributes.skinWeight;
  const bones = mesh.skeleton.bones;
  let applied = 0, total = 0;
  for (const op of ops) {
    // global weight-hygiene op: strip far-hierarchy minority weights
    // ({"purgeFar": true, "minDist"?, "minW"?}) — see purgeFarWeights
    if (op.purgeFar) {
      const n = purgeFarWeights(mesh, { minDist: op.minDist, minW: op.minW });
      if (n) { applied++; total += n; }
      continue;
    }
    const ti = bones.findIndex((b) => b.name === op.to);
    if (ti < 0) { console.warn('skinOps: unknown target bone', op.to); continue; }
    const targets = selectComps(a, op.sel || {});
    if (!targets.length) { console.warn('skinOps: selection matched nothing', JSON.stringify(op.sel)); continue; }
    for (const c of targets) {
      for (const v of c.verts) {
        jnt.setXYZW(v, ti, 0, 0, 0);
        wgt.setXYZW(v, 1, 0, 0, 0);
      }
      c.boneIndex = ti;
      c.boneName = op.to;
      total += c.count;
    }
    applied++;
  }
  jnt.needsUpdate = true;
  wgt.needsUpdate = true;
  return { applied, verts: total };
}

// Runtime entry: apply a manifest's skinOps to a loaded gltf ONCE (the
// geometry is shared by every clone, so a per-fighter application would
// double-apply; the guard makes this idempotent).
export function applySkinOpsToGltf(gltfScene, ops) {
  if (!ops?.length) return;
  gltfScene.traverse((o) => {
    if (!o.isSkinnedMesh) return;
    if (o.geometry.userData.__skinOpsApplied) return;
    o.geometry.userData.__skinOpsApplied = true;
    const res = applySkinOps(o, ops);
    if (res.applied) console.info(`skinOps: ${res.applied} op(s), ${res.verts} verts rebound`);
  });
}
