// Compact the skinOps blocks in public/models/manifest.json:
//   • drop superseded ops (same pure-{comp:N} selector rebound again later —
//     only the last one has any effect; see compactSkinOps in skinops.js)
//   • reformat every skinOps array one-op-per-line (the pretty-printed form
//     was ~8 lines per op and dominated the file)
// Everything outside skinOps keeps standard 2-space JSON formatting.
//
// Safety: before writing, symbolically executes old vs new op lists per mech
// (final target bone per component ordinal + the exact sequence of surviving
// global/bone ops) and refuses to write on any mismatch.
//
// Usage: node tools/compact-skinops.mjs [--check]   (--check: verify only)
import { readFileSync, writeFileSync } from 'fs';
import { compactSkinOps, skinOpsToJson } from '../src/mechs/skinops.js';

const PATH = new URL('../public/models/manifest.json', import.meta.url);
const manifest = JSON.parse(readFileSync(PATH, 'utf8'));
const checkOnly = process.argv.includes('--check');

// Symbolic result of an op list: what applySkinOps would leave behind,
// abstracted from geometry. Pure-comp rebinds keyed by ordinal (last wins);
// every non-pure-comp op recorded in order (they are never touched).
function semantics(ops) {
  const finalBind = new Map();
  const rest = [];
  for (const op of ops) {
    if (op.sel && op.sel.comp !== undefined && op.sel.bone === undefined) {
      finalBind.set(op.sel.comp, op.to);
    } else {
      rest.push(JSON.stringify(op));
    }
  }
  return JSON.stringify([...finalBind.entries()].sort((a, b) => a[0] - b[0])) + '|' + rest.join(';');
}

let totalBefore = 0, totalAfter = 0;
for (const [id, entry] of Object.entries(manifest)) {
  if (!entry || typeof entry !== 'object' || !entry.skinOps?.length) continue;
  const compact = compactSkinOps(entry.skinOps);
  if (semantics(entry.skinOps) !== semantics(compact)) {
    console.error(`ABORT: semantics changed for ${id}`);
    process.exit(1);
  }
  totalBefore += entry.skinOps.length;
  totalAfter += compact.length;
  if (compact.length !== entry.skinOps.length) {
    console.log(`${id}: ${entry.skinOps.length} -> ${compact.length} ops`);
  }
  entry.skinOps = compact;
}
console.log(`total: ${totalBefore} -> ${totalAfter} ops`);
if (checkOnly) process.exit(0);

// Serializer: standard 2-space JSON except skinOps arrays go one-op-per-line.
function ser(v, ind, key) {
  if (key === 'skinOps' && Array.isArray(v)) return skinOpsToJson(v, ind);
  if (Array.isArray(v)) {
    if (!v.length) return '[]';
    return '[\n' + v.map((x) => ind + '  ' + ser(x, ind + '  ')).join(',\n') + '\n' + ind + ']';
  }
  if (v && typeof v === 'object') {
    const e = Object.entries(v);
    if (!e.length) return '{}';
    return '{\n' + e.map(([k, x]) => `${ind}  ${JSON.stringify(k)}: ${ser(x, ind + '  ', k)}`).join(',\n') + '\n' + ind + '}';
  }
  return JSON.stringify(v);
}

writeFileSync(PATH, ser(manifest, '') + '\n');
console.log('manifest.json rewritten');
