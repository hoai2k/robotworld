#!/usr/bin/env node
// Propose manifest boneOverrides + yawOffset for a Tripo-rigged GLB.
//
// Tripo's animate_rig ignores the mixamo naming spec, returning opaque
// skeletons (tripo::*_Limb_*, bone_N) whose topology varies per model, so
// name-based mapping is hopeless. Instead: compute each bone's
// skin-weighted vertex centroid, then classify joints SPATIALLY —
// legs are the chains reaching the ground (split left/right), head is the
// topmost chain, arms the most lateral chains, spine the central column.
// Output is a starting point: verify in ?showcase and hand-fix outliers.
//
// Usage: node tools/rigmap.mjs public/models/mech_<id>.glb
import fs from 'node:fs';

const path = process.argv[2];
const buf = fs.readFileSync(path);
const jsonLen = buf.readUInt32LE(12);
const gltf = JSON.parse(buf.subarray(20, 20 + jsonLen).toString());
const binOff = 20 + jsonLen + 8;

function accessor(i) {
  const a = gltf.accessors[i];
  const bv = gltf.bufferViews[a.bufferView];
  const off = binOff + (bv.byteOffset || 0) + (a.byteOffset || 0);
  const compSize = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[a.componentType];
  const n = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[a.type];
  const read = (idx, c) => {
    const p = off + (idx * n + c) * compSize;
    switch (a.componentType) {
      case 5121: return buf.readUInt8(p);
      case 5123: return buf.readUInt16LE(p);
      case 5125: return buf.readUInt32LE(p);
      case 5126: return buf.readFloatLE(p);
      default: throw new Error('comp ' + a.componentType);
    }
  };
  return { count: a.count, read, normalized: a.normalized, componentType: a.componentType };
}

// world matrices of nodes (TRS compose)
const nodes = gltf.nodes;
function mat(n) {
  const t = n.translation || [0, 0, 0];
  const q = n.rotation || [0, 0, 0, 1];
  const s = n.scale || [1, 1, 1];
  const [x, y, z, w] = q;
  const m = [
    (1 - 2 * (y * y + z * z)) * s[0], (2 * (x * y + z * w)) * s[0], (2 * (x * z - y * w)) * s[0], 0,
    (2 * (x * y - z * w)) * s[1], (1 - 2 * (x * x + z * z)) * s[1], (2 * (y * z + x * w)) * s[1], 0,
    (2 * (x * z + y * w)) * s[2], (2 * (y * z - x * w)) * s[2], (1 - 2 * (x * x + y * y)) * s[2], 0,
    t[0], t[1], t[2], 1,
  ];
  return m;
}
function mul(a, b) { // column-major a*b
  const r = new Array(16).fill(0);
  for (let c = 0; c < 4; c++) for (let rr = 0; rr < 4; rr++)
    for (let k = 0; k < 4; k++) r[c * 4 + rr] += a[k * 4 + rr] * b[c * 4 + k];
  return r;
}
const world = new Array(nodes.length);
const parent = new Array(nodes.length).fill(-1);
nodes.forEach((n, i) => (n.children || []).forEach((c) => { parent[c] = i; }));
function computeWorld(i) {
  if (world[i]) return world[i];
  const local = mat(nodes[i]);
  world[i] = parent[i] === -1 ? local : mul(computeWorld(parent[i]), local);
  return world[i];
}
nodes.forEach((_, i) => computeWorld(i));

// skin-weighted centroids per joint
const skin = gltf.skins[0];
const joints = skin.joints; // node indices
const mesh = gltf.meshes[0].primitives[0];
const POS = accessor(mesh.attributes.POSITION);
const JN = accessor(mesh.attributes.JOINTS_0);
const WT = accessor(mesh.attributes.WEIGHTS_0);
const meshNode = nodes.findIndex((n) => n.mesh !== undefined);
const meshW = meshNode >= 0 ? world[meshNode] : null;
const wDiv = { 5121: 255, 5123: 65535, 5126: 1 }[WT.componentType];
const acc = joints.map(() => ({ w: 0, x: 0, y: 0, z: 0 }));
for (let v = 0; v < POS.count; v++) {
  let px = POS.read(v, 0), py = POS.read(v, 1), pz = POS.read(v, 2);
  if (meshW) {
    const m = meshW;
    const nx = m[0] * px + m[4] * py + m[8] * pz + m[12];
    const ny = m[1] * px + m[5] * py + m[9] * pz + m[13];
    const nz = m[2] * px + m[6] * py + m[10] * pz + m[14];
    px = nx; py = ny; pz = nz;
  }
  for (let k = 0; k < 4; k++) {
    const w = WT.read(v, k) / wDiv;
    if (w < 0.01) continue;
    const jj = JN.read(v, k);
    const a = acc[jj];
    a.w += w; a.x += w * px; a.y += w * py; a.z += w * pz;
  }
}
const bones = joints.map((ni, j) => ({
  idx: j, node: ni,
  name: (nodes[ni].name || `n${ni}`).replace(/::/g, ''), // three sanitizes '::'
  w: acc[j].w,
  c: acc[j].w > 0 ? [acc[j].x / acc[j].w, acc[j].y / acc[j].w, acc[j].z / acc[j].w] : null,
  parent: null, children: [],
}));
const byNode = new Map(bones.map((b) => [b.node, b]));
for (const b of bones) {
  let p = parent[b.node];
  while (p !== -1 && !byNode.has(p)) p = parent[p];
  if (p !== -1) { b.parent = byNode.get(p); byNode.get(p).children.push(b); }
}
const withC = bones.filter((b) => b.c && b.w > 1);
const ys = withC.map((b) => b.c[1]);
const yMin = Math.min(...ys), yMax = Math.max(...ys);
const H = yMax - yMin;
const hN = (y) => (y - yMin) / H; // 0=ground 1=top

// lateral axis: X or Z, whichever splits bone centroids more symmetrically
function symScore(axis) {
  let s = 0;
  for (const b of withC) s += Math.abs(b.c[axis]);
  return s;
}
const latAxis = symScore(0) >= symScore(2) ? 0 : 2;
const fwdAxis = latAxis === 0 ? 2 : 0;

// descend-chains: for each bone, the min height reachable in its subtree
function minReach(b) {
  let m = b.c ? hN(b.c[1]) : 1;
  for (const ch of b.children) m = Math.min(m, minReach(ch));
  return m;
}

// LEGS: bones starting mid-height whose subtree reaches the ground
const legRoots = withC.filter((b) =>
  hN(b.c[1]) > 0.25 && hN(b.c[1]) < 0.75 && minReach(b) < 0.12 &&
  (!b.parent || !b.parent.c || minReach(b.parent) > 0.12 || hN(b.parent.c[1]) > 0.8 ||
    b.parent.children.filter((s) => s.c && minReach(s) < 0.12).length >= 2));
// split by lateral sign
const legL = legRoots.filter((b) => b.c[latAxis] > 0).sort((a, b) => b.w - a.w)[0];
const legR = legRoots.filter((b) => b.c[latAxis] <= 0).sort((a, b) => b.w - a.w)[0];
function legChain(root) {
  // walk down toward ground picking the heaviest ground-reaching child
  const chain = [root];
  let cur = root;
  while (true) {
    const next = cur.children.filter((ch) => ch.c && minReach(ch) < 0.12).sort((a, b) => b.w - a.w)[0];
    if (!next) break;
    chain.push(next); cur = next;
  }
  return chain;
}
function pick3(chain) {
  if (chain.length >= 3) {
    // thigh = first, ankle = last bone above ground contact, knee = middle by height
    const thigh = chain[0];
    const ankle = chain[Math.min(chain.length - 1, 2)] === thigh ? chain[chain.length - 1] : chain[chain.length - 1];
    const mid = chain.slice(1, -1).sort((a, b) =>
      Math.abs(hN(a.c[1]) - (hN(thigh.c[1]) + hN(ankle.c[1])) / 2) -
      Math.abs(hN(b.c[1]) - (hN(thigh.c[1]) + hN(ankle.c[1])) / 2))[0] || chain[1];
    return [thigh, mid, ankle];
  }
  if (chain.length === 2) return [chain[0], chain[1], chain[1]];
  return [chain[0], chain[0], chain[0]];
}

// HEAD: topmost-centroid bone; walk to its chain start above shoulders
const headBone = [...withC].sort((a, b) => b.c[1] - a.c[1])[0];

// SPINE/HIPS: central column bones (|lat| small), pick by height
const central = withC.filter((b) => Math.abs(b.c[latAxis]) < 0.12 * H && b !== headBone);
const hips = central.filter((b) => hN(b.c[1]) > 0.3 && hN(b.c[1]) < 0.65).sort((a, b) => b.w - a.w)[0]
  || legL?.parent || withC.sort((a, b) => b.w - a.w)[0];
const torso = central.filter((b) => hN(b.c[1]) > hN(hips.c[1]) + 0.08 && hN(b.c[1]) < 0.9)
  .sort((a, b) => b.w - a.w)[0];

// ARMS: chains whose centroid is lateral of the torso width and above waist
const armRoots = withC.filter((b) =>
  Math.abs(b.c[latAxis]) > 0.14 * H && hN(b.c[1]) > 0.4 && minReach(b) >= 0.12 &&
  b !== headBone && !legRoots.includes(b) &&
  (!b.parent || Math.abs((b.parent.c?.[latAxis]) ?? 0) < Math.abs(b.c[latAxis])));
function armChain(root) {
  const chain = [root];
  let cur = root;
  while (true) {
    // follow the child that extends furthest from the body (|lat| + down)
    const next = cur.children.filter((c) => c.c).sort((a, b) =>
      (Math.abs(b.c[latAxis]) + (1 - hN(b.c[1]))) - (Math.abs(a.c[latAxis]) + (1 - hN(a.c[1]))))[0];
    if (!next) break;
    chain.push(next); cur = next;
  }
  return chain;
}
const armL = armRoots.filter((b) => b.c[latAxis] > 0).sort((a, b) => b.w - a.w)[0];
const armR = armRoots.filter((b) => b.c[latAxis] <= 0).sort((a, b) => b.w - a.w)[0];

// FACING: head centroid forward offset from body center → forward sign
const cAll = withC.reduce((s, b) => s + b.c[fwdAxis] * b.w, 0) / withC.reduce((s, b) => s + b.w, 0);
const fSign = Math.sign((headBone.c[fwdAxis] - cAll) || 1);
const f = [0, 0]; // (x,z)
if (fwdAxis === 0) f[0] = fSign; else f[1] = fSign;
const yaw = Math.round(Math.atan2(-f[0], f[1]) * 180 / Math.PI);

if (process.argv[3] === '--table') {
  // human-readable classification aid: lat (+left?), h (0 ground..1 top),
  // fwd, weight share, parent — sorted by height desc
  const tot = withC.reduce((s, b) => s + b.w, 0);
  console.log('name'.padEnd(22), 'lat'.padStart(6), 'h'.padStart(5), 'fwd'.padStart(6), 'w%'.padStart(5), ' parent');
  for (const b of [...withC].sort((a, c) => c.c[1] - a.c[1])) {
    console.log(
      b.name.padEnd(22),
      (b.c[latAxis] / H).toFixed(2).padStart(6),
      hN(b.c[1]).toFixed(2).padStart(5),
      (b.c[fwdAxis] / H).toFixed(2).padStart(6),
      (100 * b.w / tot).toFixed(1).padStart(5),
      ' ' + (b.parent?.name ?? '-'),
    );
  }
  process.exit(0);
}

const overrides = {};
const set = (j, b) => { if (b) overrides[j] = b.name; };
set('hips', hips); set('torso', torso); set('head', headBone);
if (legL) { const [t, k, a] = pick3(legChain(legL)); set('thighL', t); set('kneeL', k); set('ankleL', a); }
if (legR) { const [t, k, a] = pick3(legChain(legR)); set('thighR', t); set('kneeR', k); set('ankleR', a); }
for (const [side, root] of [['L', armL], ['R', armR]]) {
  if (!root) continue;
  const ch = armChain(root);
  const sh = ch[0];
  const hand = ch[Math.min(ch.length - 1, 3)];
  const elbow = ch[Math.max(1, Math.floor((ch.length - 1) / 2))];
  set('shoulder' + side, sh); set('elbow' + side, elbow === hand && ch.length > 1 ? ch[1] : elbow); set('hand' + side, hand);
}

console.log(JSON.stringify({
  latAxis: latAxis === 0 ? 'x' : 'z', forward: fwdAxis === 0 ? `${fSign > 0 ? '+' : '-'}x` : `${fSign > 0 ? '+' : '-'}z`,
  yawOffset: yaw,
  mapped: Object.keys(overrides).length,
  boneOverrides: overrides,
}, null, 1));
