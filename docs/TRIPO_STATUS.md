# Tripo GLB generation status

Working session 2026-07-18 (API key holder: hoai2k). Task: generate rigged
GLBs for all 17 roster mechs from `docs/canonical/` images via the Tripo
API, integrate through `public/models/manifest.json`, commit to main.
Resume with `TRIPO_API_KEY=... node tools/tripogen.mjs --all` (state in
`tools/tripo-state.json` skips finished mechs; `--status` prints a table).

Budget: started with 2000 credits ($20). ~55 credits/mech
(image_to_model v3.1 textured 30 + animate_rig 25; prerigcheck free).

## Engine changes made for Tripo rigs (all mechs benefit)

- `?debug=backup` URL param — ignore all GLB overrides, run procedural models.
- `rigadapter.js`: unmapped intermediate bones between mapped joints are now
  folded into retargeting (`interQ`) — Tripo v2.5 skeletons need this.
- `gltf.js`: ground/center on the *rendered skinned* bounding box, not
  `Box3.setFromObject` (Tripo's Armature node offset put models ~3.4 units
  underground); clone via three's SkeletonUtils.
- `tools/tripogen.mjs`: upload → image_to_model (H3 v3.1, PBR,
  face_limit 150k) → prerigcheck → animate_rig (spec mixamo, biped) →
  download. NOTE: rig v2.5 ignores the mixamo spec naming — bones come back
  as `tripo::`/`bone_N`, so every mech needs manifest `boneOverrides`
  (GLTFLoader strips `::` → override names look like `tripo0_Left_Limb_0`).

## Per-mech status

| Mech | Model | Rigged | GLB | Integrated (manifest + verified) |
|---|---|---|---|---|
| saurion | ✅ | ✅ biped | ✅ 59 MB (pre-face_limit; consider `--redo` at 150k for size) | ✅ boneOverrides + native bindPose + yaw 90; idle/walk/heavy/battle/soak/build all pass |
| vulcan | ✅ | ✅ biped | ✅ 7.2 MB | ⬜ needs boneOverrides + verify |
| titanus, aegis, viper, nova, rhino | batch A running | | | |
| tempest, fenrir, colossus, wraith, inferno | batch B running | | | |
| glacier, cranky, frogger, jerry, nullbot(redo) | batch C running | | | |

Credits after saurion+vulcan: 1890.
