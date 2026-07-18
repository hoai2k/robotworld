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

- FLAG: GLBs are opt-in — `?debug=3d` enables service models; default (and
  any other value) runs procedural. Flip lives in gltf.js loadManifest.
- rigadapter interQ: unmapped intermediate bones folded into retarget.
- gltf.js: ground on *rendered skinned* bbox (measure AFTER container
  assembly + updateMatrixWorld); SkeletonUtils.clone.
- tools/tripogen.mjs (API driver), tools/rigmap.mjs (mapping aid).
- WARNING: do not run several tripogen processes in parallel — they
  clobber each other's tripo-state.json saves (models still download).

## Per-mech status

| Mech | GLB | Integration |
|---|---|---|
| titanus | ✅ 7.4MB | ✅ verified |
| vulcan | ✅ 7.2MB | ❌ rig has no arm bones — procedural (regen w/ new seed may fix) |
| aegis | ✅ 7.2MB | ✅ verified (fresh-seed regen) |
| viper | ✅ 7.1MB | ✅ verified |
| nova | ✅ 7.5MB | ✅ verified |
| rhino | ✅ 7.0MB | ✅ verified |
| tempest | ✅ 7.0MB | ❌ rig has no leg bones — procedural (regen w/ new seed may fix) |
| fenrir | ✅ 7.7MB | ✅ verified |
| colossus | ✅ 7.1MB | ✅ verified |
| wraith | ✅ 6.9MB | ✅ verified |
| inferno | ✅ 7.2MB | ✅ verified (2-segment legs; ankles unmapped) |
| glacier | ✅ 7.5MB | ✅ verified |
| cranky | ✅ 7.4MB | ✅ verified |
| saurion | ✅ 11MB (simplified from 59MB) | ✅ verified |
| frogger | ✅ 7.1MB | ✅ verified (2 of 4 arms driven) |
| jerry | ✅ 7.6MB | ✅ verified (claws driven; skirt legs static) |
| nullbot | ✅ 6.8MB | ✅ verified (new Tripo model replaced old GLB) |


- aegis: model not riggable per prerigcheck → fresh-seed regen queued.
- jerry: model OK, rig task failed server-side → rig retry queued.
- vulcan + tempest: GLB present but rig lacks arm/leg bones (auto-rigger
  merged limbs) → keep procedural; a re-rig would likely repeat (rig
  follows geometry); regenerating the model with a new seed MAY help.
- saurion: 59 MB (generated before face_limit was added) — shrink with
  `gltf-transform simplify` locally (same skeleton, no credits) or --redo.
- nullbot: new Tripo model REPLACED the old GLB; old manifest entry
  (custom bindPose+stretch) belongs to the old file — remap needed.

Credits: 2000 start → ~1005 left (15×55 + aegis 30+55retry + jerry 25 rig retry).

## Verification record (2026-07-18)

15/17 mechs run their Tripo GLB in-game; vulcan + tempest keep procedural
(auto-rig merged their limbs — silhouettes hug the body). Verified: walk
showcase shots per mech, 12-mech lineup, ace soaks (saurion/viper,
titanus/nullbot, fenrir/glacier, cranky/frogger, jerry/aegis — zero
crashes), `vite build` green. `?debug=backup` bypasses all GLBs.

Contract notes (silent degradations vs §5, procedural-only features):
vulcan gatling spin & podL, colossus mortars, nova halo spin, fenrir tail
wag, viper blade flare, wraith rifle/scope anchors, tempest coils,
nullbot glow2 shard dress (GLB_DRESS was written for the OLD nullbot
model; visual check of the new model looked fine without it). Muzzle/core
anchors fall back to virtual-joint defaults everywhere — combat works.


## Facing pass (2026-07-18, second session)

User saw titanus+saurion backwards in battle. Root cause: showcase judging
camera sits at +Z looking -Z (showcase.js:53), and battle points a mech's
+Z at its opponent — so "faces the showcase camera" == battle-forward. My
first-pass yaws were eyeballed and several picked the BACK (glow lights read
as a face — MECH_ART_GUIDE §6 warns of this). Re-verified all 15 against the
true front (chest labels, eyes, toes) and against a battle engage shot
(opponent-facing == back to showcase camera). Final yawOffsets: most bipeds
270; cranky/glacier... see manifest. Creatures need non-biped angles:
saurion 300 (diagonal body — nose-vector solved via tools/rigmap-style
head-vs-hips XZ probe), fenrir 270. Verified: per-mech front shots, 12-mech
lineup, saurion-v-fenrir engage (correct mutual facing), vite build green.
## Session 3 (2026-07-18): sizing, spinner, pose tool

- `?debug=3d` is the switch (default = procedural). In 3d mode, menus show a
  glow-tinted loading spinner instead of the procedural stand-in while a GLB
  downloads, then swap the GLB in. Title lineup + chooser + battle all use
  GLBs. Mechs with no GLB (vulcan/tempest) still show procedural.
- Head-height sizing (gltf.js buildGlbMech): each GLB is scaled so its head
  bone sits at the procedural head-joint height, so GLB + procedural bodies
  read at the same size (raised tails/weapons/crystals no longer shrink the
  body). entry.heightScale still tunes per-mech.
- `?debug=models` pose-matching tool (src/dev/posetool.js): procedural (left)
  vs GLB (right), orbit camera + per-bone rotate/translate gizmo. "Output
  config" emits a manifest patch — `boneCorrections` (local rotation applied
  after retargeting) and `bonePos` (rest-position nudge) — copied to clipboard
  + downloaded. Runtime consumes both (rigadapter.js / buildGlbMech). Use it
  to hand-correct any GLB whose retargeted rest pose drifts from the intended
  silhouette, then paste the patch into public/models/manifest.json.

## Regenerating vulcan / tempest (the two unusable rigs)

Their `image_to_model` succeeded but auto-rig merged the limbs (vulcan: arms
against body → no arm bones; tempest: coat over legs → no leg bones).
`image_to_model` takes NO text prompt, so a plain retry only varies
`model_seed` — semi-blind. Real levers to bias success:
  1. Regenerate the SOURCE image into a clear A/T-pose with limbs separated
     (Tripo's text-to-image / image-edit endpoints DO take a prompt), then
     image_to_model that. This directly addresses the merge cause.
  2. `enable_image_autofix: true` on image_to_model.
  3. Different `model_seed` (cheapest, least reliable).
Not yet attempted — ~55 credits each; ~1005 credits remain.
