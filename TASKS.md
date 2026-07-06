# ROBOTWORLD — 3D Mech Battle Game — Task Tracker

Browser-based 3D mech arena fighter in the spirit of **Override: Mech City Brawl**.
12 unique mechs, destructible city arenas, local multiplayer (keyboard + Xbox
controllers via Gamepad API), AI opponents.

> **Process note:** This file is the source of truth for progress. Update the
> checkboxes and the "Current status" section after every phase and commit it,
> so work can resume cleanly if a session is interrupted.

## Current status

- **Phase:** ALL 10 PHASES COMPLETE ✅ — game shipped on this branch
- **Next action:** playtesting feedback / tuning
- **Branch:** `claude/3d-mech-battle-game-uxps6q`

## Tech stack

- Three.js + Vite, ES modules, no TypeScript.
- All 3D models built procedurally (armor-plate construction, PBR materials,
  canvas-generated textures: plating, grime, decals, emissive trims).
- Procedural pose-based animation system (keyframe poses + blending) driving a
  bone hierarchy of Object3D joints.
- Custom lightweight physics (capsule vs AABB, ballistic debris) — no physics lib.
- WebAudio procedural SFX + synth music, no audio assets.
- Post-processing: bloom (emissives), FXAA, vignette for the AAA look.

## Phases

### Phase 1 — Project scaffold & engine core ✅
- [x] Vite + Three.js project scaffold (`package.json`, `vite.config.js`, `index.html`)
- [x] Renderer, scene, camera, resize handling, fixed-step game loop
- [x] Lighting rig (key/fill/rim + hemisphere), PCF soft shadows
- [x] Post-processing stack: UnrealBloom + FXAA + vignette
- [x] Procedural texture generator (armor plating, grime, hazard stripes, decals)
- [x] Math/easing/utils, object pools

### Phase 2 — Mech construction kit & 12 mech designs ✅
- [x] Part library: armor plates, joints, pistons, thrusters, antennae, cockpits, weapon meshes
- [x] Rig builder: full joint hierarchy (root/hips/torso/head/shoulders/elbows/wrists/hips/knees/ankles)
- [x] Material system: per-mech PBR palettes + emissive accent trims
- [x] 12 unique mech designs (silhouette, weapons, personality):
  - [x] 1. TITANUS — colossal brawler, rocket-fists (heavy)
  - [x] 2. VULCAN — gatling gunner, ammo-belt berserker (ranged)
  - [x] 3. AEGIS — shield paladin, energy lance (defense)
  - [x] 4. VIPER — twin-blade assassin, serpentine (speed)
  - [x] 5. NOVA — plasma archmage, floating cannon arrays (caster)
  - [x] 6. RHINO — charging bull, seismic horn (charger)
  - [x] 7. TEMPEST — storm dancer, lightning whips (electric)
  - [x] 8. FENRIR — wolf chassis, claw frenzy (feral melee)
  - [x] 9. COLOSSUS — walking artillery, mortar barrage (siege)
  - [x] 10. WRAITH — stealth sniper, phase cloak (sniper)
  - [x] 11. INFERNO — flame juggernaut, napalm (fire)
  - [x] 12. GLACIER — cryo fortress, freeze beam (ice)

### Phase 3 — Animation system & full move sets ✅
- [x] Pose/keyframe animation engine with blending & layers
- [x] Locomotion: idle (breathing/personality ticks), walk, run, jump, dash, air fall, land
- [x] Combat anims: light combo (3 hits), heavy attack, ranged fire, block, hit-stagger, launch, knockdown, get-up
- [x] Special & ultimate attack anims (unique per mech)
- [x] Personality: intro taunts, victory poses, idle fidgets

### Phase 4 — Combat system ✅
- [x] Health/energy/ult meters, damage & knockback model, hit-stop
- [x] Melee hitboxes with combo chains
- [x] Projectile system (bullets, rockets, plasma, mortar arcs, beams, flame cones)
- [x] Blocking, dodging (i-frames), launcher attacks
- [x] Per-mech specials (cooldown) + ultimates (meter)
- [x] VFX: muzzle flashes, impacts, explosions, sparks, smoke, shockwaves, trails

### Phase 5 — Destructible city arenas ✅
> USER NOTES: industrial landscapes with a steampunk edge (smokestacks, gears,
> brass/copper, steam vents) + matching soundscape; keep anime dynamism and
> colorful mech cores. Slightly battle-worn look on materials.
- [x] City generator: streets, sidewalks, props, skyline backdrop
- [x] Destructible buildings (chunk-based: facade panels shear off, structure collapses)
- [x] Debris physics (ballistic chunks, bounce, fade), dust clouds
- [x] Collateral damage from attacks & mech bodies
- [x] Theme-driven arena framework (sky/fog/lighting/ground/buildings/props/ambient particles as data)
- [x] 12 UNIQUE ARENAS (user request): Neon District (night), Ironworks Foundry
      (steampunk), Uptown (day), Harbor Docks (dusk), Sky Terrace (rooftop),
      Scrapyard (rust), Crystal Quarry, Volcanic Forge, Frozen Outpost,
      Desert Ruins, Jungle Temple, Orbital Platform
- [x] Steam vents / gears / industrial props, ambient particles per theme
- [x] NOTE: after framework + first 3 themes, spawn parallel agent to author
      remaining themes in src/arena/themes.js while main session builds
      AI/input/camera/menus (disjoint files)

### Phase 6 — AI opponents ✅
- [x] AI controller: approach/strafe/spacing, attack selection, blocking, dodging
- [x] Special/ultimate usage logic
- [x] Difficulty levels (Rookie / Veteran / Ace)

### Phase 7 — Input & local multiplayer ✅
- [x] Keyboard mappings (P1: WASD+..., P2: arrows+...)
- [x] Gamepad API: Xbox controller mapping, hot-plug, rumble (vibrationActuator)
- [x] Up to 4 local players (any mix of human/AI), free-for-all
- [x] LEGO-style dynamic camera: combined third-person view when players are
      close, splits into per-player chase views when they separate (hysteresis,
      up to 4 viewports), glowing dividers
- [x] Fullscreen toggle (key + menu)

### Phase 8 — Game flow, HUD & menus ✅
- [x] Title screen
- [x] Mech select (rotating 3D showcase, personality blurb, stats)
- [x] Arena select
- [x] Round system (best-of-3), KO logic, intro/outro sequences
- [x] HUD: health/energy/ult bars, portraits, round pips, announcements
- [x] Pause menu, results screen, rematch

### Phase 9 — Audio ✅
- [x] WebAudio SFX synth: impacts, gunfire, explosions, servo whirs, footsteps
- [x] Announcer-style stingers (synth), menu blips
- [x] Dynamic music (menu theme + battle theme, synth arps/bass/drums)

### Phase 10 — Polish & ship ✅
- [x] Performance pass (instanced chunks/debris, pooled particles/projectiles, merged mech geometry, ~66 draw calls in 4-way split)
- [x] Balance pass across 12 mechs (soak-tested all move sets, flame nerf)
- [x] README with controls & how to run
- [x] Final build verification (`vite build`) + browser smoke test & screenshots (docs/)

## Progress log

- 2026-07-06: Repo initialized. Task plan laid out.
- 2026-07-06: Phase 1 complete (scaffold, engine, post FX, textures, utils).
- 2026-07-06: Phase 2 complete (part kit, rig, materials, 12 designs verified
  via browser screenshot). User notes added: dynamic combine/separate camera,
  fullscreen, battle-worn look, steampunk-industrial arena + soundscape.
- 2026-07-06: Phases 3-8 complete: animation, combat (specials/ults/projectiles/
  VFX), destructible arena framework + 12 themes, AI, input (KB+Xbox), dynamic
  split camera, full menu/match flow. Verified end-to-end in browser.
  Spawned agents: audio system + arena theme deepening. README written.
- 2026-07-06: Audio agent delivered 49 SFX + 4 music tracks (committed). Arena
  agent delivered 33 new props + lighting pass on all 12 themes (committed).
  Full-match soak: menus → battle → 2 rounds → results, zero errors. Pause/
  quit teardown verified. Production build passes. Screenshots in docs/.
  ALL PHASES COMPLETE — SHIPPED.

## Phase 11 — AI character pipeline (user request, 2026-07-06)

- [x] Runtime GLB character pipeline: manifest-driven loading
  (public/models/manifest.json), skinned-clone per fighter, height/ground
  normalization, procedural fallback when a model is missing/broken
- [x] RigAdapter: convention-free humanoid retargeting (world-space rotation
  offsets, T-pose/A-pose bind presets, Mixamo-style bone-name auto-mapping,
  boneOverrides escape hatch) — the FULL existing animation set drives any
  standard rigged GLB
- [x] ?rigtest harness: synthetic Mixamo-convention T-pose skeleton;
  verified 15/15 bones map, rest/walk/heavy retarget correctly
- [x] docs/CHARACTER_PIPELINE.md (workflow: images -> Meshy/Tripo/Mixamo ->
  manifest) + docs/canonical-prompts.md (12 style-locked prompt sheets)
- [ ] AWAITING USER: canonical images (or an imagegen API key), and a
  Meshy/Tripo API key OR user-provided rigged GLBs — then wire real models

## Phase 12 — Image-to-mech hand-built pipeline + VULCAN pilot (2026-07-06)

- [x] PBR skin synthesizer (src/core/pbrtex.js): albedo + normal (Sobel over
  synthetic height) + roughness/metalness maps from layered procedural noise
  (fBm paint, Worley chip clusters, BSP panel lines, rivets, scratches, grime)
- [x] Skin-recipe hook in factory (def.skin drives materials); decal plates
  via Assembler.custom (text/emblem rendering, re-weathered)
- [x] VULCAN rebuilt to the canonical concept image: twin gatling forearms,
  quad missile towers w/ red lenses, crested head w/ orange visor, bone-white
  + oxide-red battle-worn plate, VULCAN chest decal, 07X shin markings
- [x] tools/palette.mjs: k-means palette extraction from concept PNGs ->
  suggested skin recipe (validated: matched hand-picked palette within ~2%)
- [x] docs/IMAGE_TO_MECH.md pipeline guide; docs/vulcan-rebuilt.png pilot
- [ ] User judgment on pilot quality -> roll pipeline across remaining mechs
  and/or go the Meshy/Tripo GLB route (pipeline for that also ready)
- 2026-07-06: VULCAN v2 sculpted rebuild (user feedback: rounded/exact forms):
  added curved-form vocabulary to parts kit (bulgeLathe, facetBulge,
  beveledPlate + shield/rhomb outlines, capsules), rebuilt VULCAN fully
  bespoke — bulging chest over pinched waist, barrel thighs, rhomboid faceted
  forearms, beveled shield plates. Verified idle/walk/heavy + battle soak +
  lineup regression. Vocabulary ready to roll across remaining 11 mechs.
- 2026-07-06: ALL 12 mechs now sculpted: 3 parallel agents rebuilt the
  remaining 11 (heavies/lights/casters) with the lathe/facet/beveled-plate
  vocabulary; TITANUS rebuilt to the user's canonical concept image (gorilla
  proportions, hazard pauldrons, radial reactor core, twin radiator towers).
  Verified: per-mech idle/walk/attack screenshots, 3x 120s ace-AI soaks
  covering all 12 (zero crashes), full menu flow, production build.
- 2026-07-06: Durable documentation pass: docs/MECH_ART_GUIDE.md (master
  operator manual: route decision tree, image reading, sculpting vocabulary,
  verification loop, per-mech combat CONTRACT, pitfalls), CLAUDE.md (session
  onboarding), tools/shot.mjs + tools/soak.mjs moved in-repo (playwright-core
  devDep), tools/img2glb.mjs (best-effort Meshy/Tripo API client with
  verify-docs-first caveats). Any future AI session can continue the
  image->mech work from these alone.
