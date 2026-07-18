# Tripo GLB generation status

Session 2026-07-18. Goal: rigged GLBs for all 17 mechs from `docs/canonical/`
images via Tripo API → `public/models/` + `manifest.json` → main.

## How to resume (any fresh session)

1. `TRIPO_API_KEY=<key> NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=/root/.ccr/ca-bundle.crt \
    node tools/tripogen.mjs --all` — regenerates ONLY mechs not marked done
   in `tools/tripo-state.json` (never delete that file: it is the
   spent-credits ledger; `--status` prints it, `--redo <id>` forces one).
   Node needs the two env vars in sandboxed sessions (proxy + CA).
2. Per new model: `node tools/rigmap.mjs public/models/mech_<id>.glb --table`
   prints per-bone skin-centroid rows (lat/height/fwd/weight%/parent) —
   classify by position (legs reach h≈0, head topmost, arms lateral),
   write `boneOverrides` into `public/models/manifest.json`. Names: three
   strips `::` → `tripo0_Left_Limb_0` etc. Rig v2.5 IGNORES spec:mixamo.
3. `bindPose:"native"` works for all Tripo rigs (they bind in the authored
   stance); `yawOffset` is 90 or 270 for every model so far — check with
   one `?showcase=<id>&anim=walk` shot (see MECH_ART_GUIDE §4 waits).
4. Verify walk + battle, run soak + `npx vite build`, commit.

## Engine changes this session (already committed)

- `?debug=backup` — ignore GLB overrides, procedural models only.
- rigadapter interQ: unmapped intermediate bones folded into retarget.
- gltf.js: ground on *rendered skinned* bbox (measure AFTER container
  assembly + updateMatrixWorld); SkeletonUtils.clone.
- tools/tripogen.mjs (API driver), tools/rigmap.mjs (mapping aid).
- WARNING: do not run several tripogen processes in parallel — they
  clobber each other's tripo-state.json saves (models still download).

## Per-mech status

| Mech | GLB | Integration |
|---|---|---|
| titanus | ✅ 7.4MB | ✅ mapped |
| vulcan | ✅ 7.2MB | ⬜ |
| aegis | ❌ | ⬜ |
| viper | ✅ 7.1MB | ⬜ |
| nova | ✅ 7.5MB | ⬜ |
| rhino | ✅ 7.0MB | ⬜ |
| tempest | ✅ 7.0MB | ⬜ |
| fenrir | ✅ 7.7MB | ✅ mapped |
| colossus | ✅ 7.1MB | ⬜ |
| wraith | ✅ 6.9MB | ⬜ |
| inferno | ✅ 7.2MB | ⬜ |
| glacier | ✅ 7.5MB | ✅ mapped |
| cranky | ✅ 7.4MB | ⬜ |
| saurion | ✅ 59.2MB | ✅ mapped |
| frogger | ✅ 7.1MB | ⬜ |
| jerry | ❌ | ⬜ |
| nullbot | ✅ 6.8MB | stub |

- aegis: model not riggable per prerigcheck → fresh-seed regen queued.
- jerry: model OK, rig task failed server-side → rig retry queued.
- vulcan + tempest: GLB present but rig lacks arm/leg bones (auto-rigger
  merged limbs) → keep procedural; a re-rig would likely repeat (rig
  follows geometry); regenerating the model with a new seed MAY help.
- saurion: 59 MB (generated before face_limit was added) — shrink with
  `gltf-transform simplify` locally (same skeleton, no credits) or --redo.
- nullbot: new Tripo model REPLACED the old GLB; old manifest entry
  (custom bindPose+stretch) belongs to the old file — remap needed.

Credits: 2000 start → 1115 now (15 models × 55 + aegis model 30).
