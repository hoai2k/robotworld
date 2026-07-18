#!/usr/bin/env node
// Tripo image→rigged-GLB pipeline (route A of docs/MECH_ART_GUIDE.md),
// verified against the live API 2026-07-18 (docs.tripo3d.ai).
//
// Per mech: upload docs/canonical/mech_<id>.png → image_to_model (H3
// v3.1, PBR) → animate_prerigcheck (free) → animate_rig (mixamo-spec
// biped skeleton — the game's rigadapter auto-maps Mixamo bone names) →
// download rigged GLB to public/models/mech_<id>.glb (+ a preview PNG
// next to the state file).
//
// Credits (docs/get-started/pricing): image_to_model v3.x textured 30,
// prerigcheck 0, rig 25 → ~55/mech. Balance is checked before each mech
// and the exact per-task spend is recorded from consumed_credit.
//
// Usage:
//   TRIPO_API_KEY=... node tools/tripogen.mjs <mechId> [mechId...]
//   TRIPO_API_KEY=... node tools/tripogen.mjs --all      # every docs/canonical/mech_*.png
//   node tools/tripogen.mjs --status                     # print state table
//
// State: tools/tripo-state.json (committed) — task ids + status per mech,
// so a later session with fresh credits resumes where this left off
// (finished mechs are skipped; pass --redo <id> to regenerate one).
import fs from 'node:fs';
import path from 'node:path';

const BASE = 'https://api.tripo3d.ai/v2/openapi';
const KEY = process.env.TRIPO_API_KEY;
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const STATE_FILE = path.join(ROOT, 'tools', 'tripo-state.json');
const MODEL_VERSION = 'v3.1-20260211';   // H3 line, current
const RIG_VERSION = 'v2.5-20260210';     // rig, current

const state = fs.existsSync(STATE_FILE) ? JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) : {};
const save = () => fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2) + '\n');

const auth = { Authorization: `Bearer ${KEY}` };
async function api(method, ep, body) {
  const res = await fetch(BASE + ep, {
    method,
    headers: body ? { ...auth, 'Content-Type': 'application/json' } : auth,
    body: body ? JSON.stringify(body) : undefined,
  });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.code !== 0) throw new Error(`${ep} -> HTTP ${res.status} ${JSON.stringify(j)}`);
  return j.data;
}

async function upload(imagePath) {
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(imagePath)], { type: 'image/png' }), path.basename(imagePath));
  const res = await fetch(`${BASE}/upload/sts`, { method: 'POST', headers: auth, body: form });
  const j = await res.json().catch(() => ({}));
  if (!res.ok || j.code !== 0) throw new Error(`upload -> HTTP ${res.status} ${JSON.stringify(j)}`);
  return j.data.image_token;
}

async function poll(taskId, label) {
  for (let i = 0; ; i++) {
    const d = await api('GET', `/task/${taskId}`);
    if (d.status === 'success') return d;
    if (['failed', 'banned', 'expired', 'cancelled', 'unknown'].includes(d.status)) {
      throw new Error(`${label} task ${taskId} ${d.status}`);
    }
    if (i % 6 === 0) console.log(`  ${label}: ${d.status} ${d.progress ?? 0}%` +
      (d.queuing_num > 0 ? ` (queue ${d.queuing_num})` : ''));
    await new Promise((r) => setTimeout(r, 10000));
  }
}

async function download(url, outPath) {
  const res = await fetch(url); // model URLs expire ~5 min — call right after poll
  if (!res.ok) throw new Error(`download HTTP ${res.status}`);
  fs.writeFileSync(outPath, Buffer.from(await res.arrayBuffer()));
  return fs.statSync(outPath).size;
}

async function balance() { return (await api('GET', '/user/balance')).balance; }

async function runMech(id) {
  const rec = (state[id] ||= {});
  if (rec.done) { console.log(`${id}: already done (${rec.glb}) — skip`); return; }
  const img = path.join(ROOT, 'docs/canonical', `mech_${id === 'nullbot' ? 'null' : id}.png`);
  if (!fs.existsSync(img)) throw new Error(`${id}: no canonical image at ${img}`);

  const bal = await balance();
  console.log(`\n=== ${id} (balance ${bal})`);
  if (bal < 60) throw new Error(`balance ${bal} too low for another mech (~55 needed) — stopping`);

  // 1. model generation (reuse a previously successful model task on resume)
  if (!rec.modelTask || rec.modelFailed) {
    const token = await upload(img);
    const t = await api('POST', '/task', {
      type: 'image_to_model',
      file: { type: 'png', file_token: token },
      model_version: MODEL_VERSION,
    });
    rec.modelTask = t.task_id; rec.modelFailed = false; save();
  }
  let modelDone;
  try { modelDone = await poll(rec.modelTask, `${id} model`); }
  catch (e) { rec.modelFailed = true; save(); throw e; }
  rec.modelCredits = modelDone.consumed_credit; save();

  // 2. free rig check
  if (!rec.checkTask) {
    const t = await api('POST', '/task', { type: 'animate_prerigcheck', original_model_task_id: rec.modelTask });
    rec.checkTask = t.task_id; save();
  }
  const check = await poll(rec.checkTask, `${id} rigcheck`);
  rec.riggable = check.output?.riggable ?? null;
  rec.rigType = check.output?.rig_type ?? null; save();
  console.log(`  rigcheck: riggable=${rec.riggable} type=${rec.rigType}`);
  if (rec.riggable === false) throw new Error(`${id}: model not riggable`);

  // 3. rig (mixamo bone names — auto-mapped by src/mechs/rigadapter.js)
  if (!rec.rigTask || rec.rigFailed) {
    const t = await api('POST', '/task', {
      type: 'animate_rig',
      original_model_task_id: rec.modelTask,
      out_format: 'glb',
      model_version: RIG_VERSION,
      rig_type: 'biped',
      spec: 'mixamo',
    });
    rec.rigTask = t.task_id; rec.rigFailed = false; save();
  }
  let rigDone;
  try { rigDone = await poll(rec.rigTask, `${id} rig`); }
  catch (e) { rec.rigFailed = true; save(); throw e; }
  rec.rigCredits = rigDone.consumed_credit; save();

  // 4. download immediately (urls expire in ~5 minutes)
  const url = rigDone.output?.model ?? rigDone.output?.pbr_model;
  if (!url) throw new Error(`${id}: rig task has no model url: ${JSON.stringify(rigDone.output)}`);
  const glb = `public/models/mech_${id}.glb`;
  const size = await download(url, path.join(ROOT, glb));
  const preview = rigDone.output?.rendered_image ?? modelDone.output?.rendered_image;
  if (preview) await download(preview, path.join(ROOT, 'tools', `tripo-preview-${id}.png`)).catch(() => {});
  rec.glb = glb; rec.bytes = size; rec.done = true; save();
  console.log(`  DONE ${glb} (${(size / 1e6).toFixed(1)} MB, ${(rec.modelCredits ?? 0) + (rec.rigCredits ?? 0)} credits)`);
}

const args = process.argv.slice(2);
if (args[0] === '--status') {
  for (const [id, r] of Object.entries(state)) {
    console.log(`${id.padEnd(10)} ${r.done ? 'DONE' : r.rigFailed ? 'RIG-FAILED' : r.modelFailed ? 'MODEL-FAILED' : 'partial'}` +
      ` model=${r.modelTask ?? '-'} rig=${r.rigTask ?? '-'} credits=${(r.modelCredits ?? 0) + (r.rigCredits ?? 0)}`);
  }
  process.exit(0);
}
if (!KEY) { console.error('set TRIPO_API_KEY'); process.exit(1); }
if (args[0] === '--redo') { delete state[args[1]]; save(); args.splice(0, 2, args[1] ?? ''); }
let ids = args.filter(Boolean);
if (ids[0] === '--all') {
  ids = fs.readdirSync(path.join(ROOT, 'docs/canonical'))
    .filter((f) => /^mech_[a-z]+\.png$/.test(f)).map((f) => f.match(/^mech_([a-z]+)\.png$/)[1])
    .map((n) => (n === 'null' ? 'nullbot' : n));
}
if (!ids.length) { console.error('usage: tripogen.mjs <mechId>... | --all | --status | --redo <id>'); process.exit(1); }

let failed = 0;
for (const id of ids) {
  try { await runMech(id); }
  catch (e) {
    console.error(`${id}: FAILED — ${e.message}`); failed++;
    if (/balance .* too low/.test(e.message)) break;
  }
}
console.log(`\nbalance now: ${await balance().catch(() => '?')}`);
process.exit(failed ? 1 : 0);
