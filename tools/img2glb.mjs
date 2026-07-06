#!/usr/bin/env node
// Best-effort image→rigged-GLB client for Meshy / Tripo (route A of
// docs/MECH_ART_GUIDE.md). Submits a concept image, polls until done,
// downloads the GLB to public/models/<mechId>.glb and prints the manifest
// entry to add.
//
// ⚠️  API SHAPES DRIFT. These endpoints reflect the providers' documented
// APIs as of early 2026. Before first use, verify against current docs
// (https://docs.meshy.ai / https://platform.tripo3d.ai/docs) and adjust the
// CONFIG block below — it is deliberately the only place endpoints live.
// Both services bill credits per generation (~$1–3 per rigged model).
//
// Usage:
//   MESHY_API_KEY=... node tools/img2glb.mjs meshy <mechId> <imagePathOrUrl>
//   TRIPO_API_KEY=... node tools/img2glb.mjs tripo <mechId> <imagePathOrUrl>
//
// After download: verify in-game per MECH_ART_GUIDE.md §4 (?battle=...),
// tune bindPose/heightScale/yawOffset in public/models/manifest.json.
import fs from 'node:fs';
import path from 'node:path';

const CONFIG = {
  meshy: {
    base: 'https://api.meshy.ai',
    create: '/openapi/v1/image-to-3d',            // POST {image_url, enable_pbr, ...}
    status: (id) => `/openapi/v1/image-to-3d/${id}`, // GET -> {status, model_urls:{glb}}
    // Rigging: Meshy exposes rigging either as a task option or a separate
    // endpoint depending on API version — check docs; if separate, run the
    // returned model through it and download the rigged GLB instead.
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    envKey: 'MESHY_API_KEY',
    payload: (imageUrl) => ({
      image_url: imageUrl,
      enable_pbr: true,
      topology: 'quad',
      target_polycount: 60000,
    }),
    isDone: (j) => j.status === 'SUCCEEDED',
    isFailed: (j) => j.status === 'FAILED' || j.status === 'CANCELED',
    glbUrl: (j) => j.model_urls?.glb,
    taskId: (j) => j.result ?? j.id,
  },
  tripo: {
    base: 'https://api.tripo3d.ai',
    create: '/v2/openapi/task',                    // POST {type:'image_to_model', file:{...}}
    status: (id) => `/v2/openapi/task/${id}`,      // GET -> {data:{status, output:{pbr_model}}}
    authHeader: (key) => ({ Authorization: `Bearer ${key}` }),
    envKey: 'TRIPO_API_KEY',
    payload: (imageUrl) => ({
      type: 'image_to_model',
      file: { type: 'url', url: imageUrl },
      model_version: 'v2.5-20250123',
      // Tripo rigging: submit a follow-up task {type:'animate_rig',
      // original_model_task_id: <id>} then download its output — see docs.
    }),
    isDone: (j) => j.data?.status === 'success',
    isFailed: (j) => ['failed', 'cancelled', 'banned'].includes(j.data?.status),
    glbUrl: (j) => j.data?.output?.pbr_model ?? j.data?.output?.model,
    taskId: (j) => j.data?.task_id,
  },
};

const [provider, mechId, imageArg] = process.argv.slice(2);
if (!CONFIG[provider] || !mechId || !imageArg) {
  console.error('usage: node tools/img2glb.mjs <meshy|tripo> <mechId> <imagePathOrUrl>');
  process.exit(1);
}
const P = CONFIG[provider];
const key = process.env[P.envKey];
if (!key) {
  console.error(`Set ${P.envKey}. No key = no route A; use the web UI or route B (see docs/MECH_ART_GUIDE.md).`);
  process.exit(1);
}

// local files need a public URL for these APIs; simplest robust path:
// upload support differs per provider, so require a URL or a data URI.
let imageUrl = imageArg;
if (!/^https?:|^data:/.test(imageArg)) {
  const buf = fs.readFileSync(imageArg);
  const ext = path.extname(imageArg).slice(1) || 'png';
  imageUrl = `data:image/${ext};base64,${buf.toString('base64')}`;
  console.log(`(inlined ${imageArg} as data URI, ${Math.round(buf.length / 1024)} KB — if the API rejects data URIs, host the image and pass a URL)`);
}

const jfetch = async (url, opts = {}) => {
  const r = await fetch(url, {
    ...opts,
    headers: { 'Content-Type': 'application/json', ...P.authHeader(key), ...(opts.headers || {}) },
  });
  const text = await r.text();
  let j;
  try { j = JSON.parse(text); } catch { j = { raw: text }; }
  if (!r.ok) throw new Error(`${r.status} ${url}: ${text.slice(0, 400)}`);
  return j;
};

console.log(`[${provider}] submitting image-to-3d task for ${mechId}...`);
const created = await jfetch(P.base + P.create, {
  method: 'POST',
  body: JSON.stringify(P.payload(imageUrl)),
});
const id = P.taskId(created);
if (!id) throw new Error('no task id in response: ' + JSON.stringify(created).slice(0, 400));
console.log(`task ${id} — polling (typically 1–5 min)...`);

let result;
for (let i = 0; i < 240; i++) {
  await new Promise((res) => setTimeout(res, 5000));
  result = await jfetch(P.base + P.status(id));
  if (P.isDone(result)) break;
  if (P.isFailed(result)) throw new Error('task failed: ' + JSON.stringify(result).slice(0, 400));
  if (i % 6 === 0) console.log('  ...still generating');
}
if (!P.isDone(result)) throw new Error('timed out after 20 min');

const glb = P.glbUrl(result);
if (!glb) throw new Error('no GLB url in result: ' + JSON.stringify(result).slice(0, 500));
console.log('downloading', glb.slice(0, 90) + '...');
const bin = Buffer.from(await (await fetch(glb)).arrayBuffer());
const out = `public/models/${mechId}.glb`;
fs.mkdirSync('public/models', { recursive: true });
fs.writeFileSync(out, bin);
console.log(`saved ${out} (${(bin.length / 1e6).toFixed(1)} MB)

⚠️  If this model is NOT rigged yet, run the provider's rigging step on the
task/model id above (see CONFIG comments + provider docs), or push the mesh
through Mixamo's free auto-rigger.

Add to public/models/manifest.json:
  "${mechId}": { "url": "models/${mechId}.glb", "bindPose": "tpose" }

Then verify per docs/MECH_ART_GUIDE.md §4:
  node tools/shot.mjs "http://localhost:5173/?battle=uptown&p1=${mechId}&p2=viper&auto=1" check.png 20000`);
