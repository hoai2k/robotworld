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
- 2026-07-06: ALL 12 MECHS AT CANONICAL-IMAGE FIDELITY. User supplied concept
  images for every mech; six parallel agents rebuilt the remaining 11 to
  image-derived specs (banner-pod AEGIS, crescent-halo NOVA, horn-blade VIPER,
  carapace-dome RHINO, V-cannon COLOSSUS, crystal GLACIER, lightning-crest
  TEMPEST, furnace-face INFERNO, reaper WRAITH, werewolf FENRIR). All
  palettes/skins measured from images; visual specs archived in
  docs/canonical/SPECS.md (PNGs to be committed by user). Verified: per-mech
  idle/walk/attack, 3x ace soaks (zero crashes), menu flow, build green.

## Phase 13 — Multiplayer UX + combat audit (user request, 2026-07-11)

- [x] Always-split multiplayer view: removed combined<->split hysteresis; 2+
  humans render permanent per-player viewports (solo/spectator keeps the
  cinematic combined cam). 2P layout toggles side-by-side <-> stacked at
  runtime (pause-menu item + F9), persisted in localStorage. Dividers per
  layout; HUD plates repositioned into each player's viewport
  (hud.positionPlates); chase cams ray-pull in front of buildings
  (arena.raySolid) so a viewport is never buried in geometry.
- [x] Controller-native menus: direction keys now match visual layout
  (setup: LEFT/RIGHT picks the player card, UP/DOWN changes it); stick/dpad
  and held keys auto-repeat (380ms delay / 150ms interval, Input._navRepeat);
  sub-frame taps still register. MECH SELECT is fully simultaneous: every
  human gets their own colored cursor, lock/unlock (A/B), per-player compact
  info cards, multi-mech 3D previews on player-colored rings
  (MenuStage.showPreviews); battle auto-advances 450ms after last lock.
  kb2 no longer shares plain Enter with kb1 for confirm.
- [x] Attack-connect audit across all 12 mechs (new tools/attackmatrix.mjs
  forces ranged/special/ult vs a circle-strafing victim and asserts damage):
  - missileVolley + starfall: pop-up projectiles now RETARGET the nearest
    living enemy when their captured target dies/clears (projectiles.js
    retarget flag) — no more skyward fireworks.
  - bulletHurricane fired over everyone's head (muzzle y~7.2 vs target
    center ~3.8): ring now pitches down to chest height and every 3rd round
    tracks the nearest enemy.
  - wave (AEGIS lance) launched too high: spawn height capped at chest level.
  - barrage re-aims EACH shell at launch with per-shell flight-time lead;
    mortar/bigBertha/judgment lead the victim's velocity; pounce leads its
    landing; direct-fire ranged now leads moving targets by flight time
    (hitscan unchanged) — strafing no longer hard-counters slow projectiles.
  - AI: self-AoE specials/ults (groundPound, staticField, supernova,
    backdraft, absoluteZero) gated by their radius, shard bucketed mid-range.
  Matrix: ALL 36 attack channels connect (wraith special = cloak, by design).
- Verified: attackmatrix ALL CONNECT, 3x 120s ace soaks (4P/3P/4P, zero
  crashes), headless 2-keyboard menu flow -> battle -> F9 flip -> pause
  (screenshots viewed), vite build green.
- 2026-07-11: Per-player cameras: each split viewport now starts directly
  BEHIND its own player (spawn yaw + pi, verified exact) instead of a shared
  south azimuth, and the RIGHT STICK orbits that player's camera (az/el, per
  viewport; solo combined view feeds the look offsets). Touch drag steers the
  touch player's own viewport in split. Taunt moved RS-click -> VIEW button
  so stick clicks can't misfire while steering. Verified: headless orbit +
  behind-init math checks, 2P menu flow screenshots, soak, build green.
- 2026-07-11: Movement & world feel pass (user request):
  - Faster walks (+20% global), longer dashes (x4.2 speed, 0.3s) that STRAFE
    (dash keeps facing a nearby enemy = combat sidesteps), higher jumps
    (+18%), and HOVER JETS: second jump press + hold flies; lighter mechs
    get more fuel (up to ~2.8s) and stronger climb (verified: viper apex ~39
    vs colossus ~12); fuel refills on the ground; jet glow/smoke FX.
  - Attack animations made dynamic: full-body twist (hipsRot), side leans,
    deeper coils, tiptoe launches, outBack overshoot on strikes across
    lights/heavy/shoot/casts/brace/lunge/charge/burst/flurry/spinFire/
    groundPound/shieldBash. All durations + event times unchanged (combat
    balance untouched). Verified via showcase screenshots.
  - Arenas DOUBLED (bounds x2, building count x2 w/ 4 in-field cover, prop
    rings + fog + skyline + shadow extent scaled, spawns widened to 34).
  - Camera see-through: buildings crossing any follow-cam->mech segment
    dither-fade to 25% (per-instance aFade attribute + shader patch, eased,
    per building) for split chase cams and the solo chase cam; replaces the
    ray pull-in. Verified with staged occlusion screenshot.
- 2026-07-11: Controller-first setup defaults: with 2+ pads connected the
  first two player slots default to the first two controllers (1 pad ->
  P1 pad vs AI); hot-connecting a pad on the setup screen re-applies
  defaults unless the player already customized slots. Gamepads are now
  numbered by their order among CONNECTED controllers (pads at browser
  indices 1&2 read GAMEPAD 1/2, not 2/3). Verified with stubbed gamepads.
- 2026-07-11: Missiles/camera/lean/pause polish (user request):
  - Guided missiles easier to dodge: homing switched to LEAD pursuit with a
    terminal COMMIT (last ~0.15s flies straight, so a timed dash sidesteps
    it; steady strafing still gets hit); turn rates trimmed (volley 4.8,
    starfall 4.0). Guided dmg down (volley 26->22, starfall 38->34);
    dumb-fire ordnance up (rocket 70->82, shell 48->56, mortar 60->68,
    barrage 45->50). attackmatrix: ALL CONNECT.
  - Flying camera: solo frame rides up with the hovering player; split
    chase look-target follows the flyer (worst on-screen NDC 0.33/0.52 at
    apex, verified).
  - Run/fly lean: stronger forward lean + whole-body pitch while running
    (head compensates); hover flight pitches Iron-Man-forward with speed,
    legs trailing. Verified via screenshots.
  - Pause menu gained a FULLSCREEN item.
- 2026-07-11: Combat control overhaul (user request):
  - Punches angle inward toward the centerline (shoulder-z cross-body aim)
    so wide-armed mechs connect visually.
  - Kinetic momentum bonus: melee dmg/knock scale with attacker speed above
    walking pace (up to +70%) — dash-punches and dive hits reward momentum.
  - Aerial heavy = PLUNGE: the smash rides down (accelerated fall) and
    detonates a ground shockwave on landing, damage scaling with fall speed.
  - Fly-fighting: attacks and blocking work while hovering (jets stay lit
    through attack state); blocking no longer requires being grounded.
  - Aiming: NO horizontal auto-aim on ranged fire — humans fire where the
    camera points (intent.aimYaw), AI squares up to its target as its aiming
    model; only vertical assist remains when an enemy is down the barrel
    (dot>0.86). Mortar ranges its arc to the barrel target. Homing stays
    exclusive to B-button specials (missile volley / starfall).
  - Strafe-lock button: hold LB (kb1 Q / kb2 Num7) to face the camera aim
    while moving sideways. ULT moved to D-pad UP (D-pad up no longer moves).
  - Sound toggle: speaker button bottom-right on all menus + pause; SOUND
    ON/OFF item in pause menu; persisted (rw.muted).
  - attackmatrix updated: ranged tested vs an approaching victim (aim
    correctness) since strafing now legitimately dodges dumb-fire; specials/
    ults still tested vs circle-strafe. ALL CONNECT; 2 soaks clean; hover-
    attack/air-block/plunge/strafe-lock all verified headlessly.
- 2026-07-11: Ammo, escape jump, toroidal arenas (user request):
  - AMMO for burst weapons: gatling 160 / flame 130 rounds; dry click at 0;
    4 glowing crates spawn per battle (full refill on touch, 14s respawn);
    AI detours to crates when dry and holds fire; HUD shows AMMO count
    ("FIND A CRATE" when empty); refills between rounds.
  - ESCAPE JUMP: press JUMP while knocked down to spring clear (input dir or
    backward, 0.9s i-frames) — breaks knockdown loops. AI uses it too.
  - TOROIDAL ARENAS: no walls; space wraps at ±bounds*1.35 (seam sits in the
    foggy empty ring). Fighter/projectile positions fold; nearest-image
    deltas everywhere (enemy queries, AI pursuit, melee, explosions,
    shockwaves, projectile collision/homing, artillery lead, camera framing
    & behind-az). The wrapping player's camera shifts with them — verified
    max 0.02 NDC on-screen jump/frame through the seam (sub-pixel). Enemies
    re-encountered at regular intervals; boundary ring/pylons removed.
  - Verified: wraptest (seam/ammo/escape), attackmatrix ALL CONNECT, 2 ace
    soaks clean, menu flow clean, crate screenshot viewed, build green.
- 2026-07-11: THREE NEW MECHS wired (CRANKY crab / SAURION raptor / FROGGER
  slime-frog): full roster kits (water cannon+geyser+riptide; razor plumes+
  sickle rush+extinction; slime slinger+quad barrage+royal ribbit), new
  ranged types water/feather/slime, AI buckets, 15-mech 4-column select
  grid, canonical image specs archived. Design files sculpted per-image by
  parallel agents (designs/cranky|saurion|frogger.js).
- 2026-07-11: TEXTURE PACK integration: CONFIG.useTextures (default ON,
  ?textures=0 off) + src/core/texload.js (import.meta.glob loader).
  Grounds per arena (tinted toward theme), building facades per style
  (emissive windows, whisper tints), mech armor from neutral-gray pack
  albedos tinted by palette (worn/heavy/clean/bare-steel selection by
  recipe, gunmetal frame bucket). Missing files auto-fallback procedural.
  Round-2 gap/redo prompt appended to docs/TEXTURE_GEN_PROMPT.md
  (4 missing grounds, kaleidoscope regen, glass facade redo).
- 2026-07-11: SEAMLESS WRAP v2 (toroidal rendering): destructible chunks
  ghost-tiled into 8 neighbor cells inside one InstancedMesh (stride
  blocks; kills/fades mirror to ghosts), props cloned at 8 offsets,
  skyline camera-locked as an infinite backdrop (was the "grey buildings"
  pop), dynamic entities (fighters/projectiles/pickups) shifted to their
  nearest image per viewport before each render and restored after
  (engine.onBeforeView/onAfterView), fog capped at 400 so nothing beyond
  the ±1-cell tiling shows. Verified: standing at the seam looking across
  shows the city + opponent exactly as if walking through; entity shift
  math exact (150.4 == expected); soak + menu flow clean.
- 2026-07-11: CRANKY/SAURION/FROGGER design bodies sculpted (by the lead —
  the parallel agents were stopped with the interrupted turn): crab shell
  dome + pincers + shoulder water cannons/tanks + decor crab legs; raptor
  skull/crest/feather fans/3-joint feathered tail/sickle toes/red seam
  glows; frog dome-eyes/slime visor + drips/quad slime guns/webbed feet
  (translucent MeshPhysical slime). Verified: showcase iterations viewed,
  daylight trio lineup viewed, 15-mech attackmatrix ALL CONNECT (titanus 0
  was test variance — reruns 58/115), 2 ace soaks with the trio, menu flow
  clean, build green.
- 2026-07-11: COMBAT DEPTH BATCH: universal ammo (every ranged weapon has a
  per-weapon count; crates refill ALL mechs — the new trio previously had
  no ammoMax so pickups silently skipped them; 6 crates, 10s respawn,
  wider pickup radius) · DUCK (hold C / Num8 / L-stick click; slows
  movement, shrinks+lowers hitbox, animator squat — FROGGER duckDepth 1.0
  goes ankle-low, saurion 0.75) · SAURION velociraptor rework (torso/head
  restPose pitch kept through clips via restBias, deeper leg crouch,
  animated counterbalancing tail in signature(), much bigger sickle toe
  claws + flanking toe spikes, special is now a true pounce: ballistic
  leap onto the led target, toe-claw slam + 2 pinned rakes + bleed) ·
  FROGGER 4 real arms (upper cannons rebuilt as shoulder2/elbow2 joint
  chains; signature() mirrors lower-arm motion onto them so all four pump
  in every move; muzzles ride the elbows) · BUILDINGS: rooftop landing
  (collideFighter exposed-top support w/ landing FX; shockwaves are
  height-relative so rooftop slams connect), unstable collapse (killChunk
  re-checks 5 neighbors; <45% chunks alive or <40% of the ground floor →
  bottom-up forced rubble cascade), projectile substep vs walls (no
  tunneling) + stronger chip damage (1.4x, r2.2) · CAMERA: player-only
  see-through (per steer), fade 0.15, and HARD framing anchor — centroid
  may pull at most 9u off the solo player, split-cam look-ahead capped at
  8u/9u vertical so the player's mech is never lost. Verified: 15-mech
  attackmatrix ALL CONNECT (saurion special 110), rooftop/duck/ammo/
  collapse functional probe green, 2 ace soaks, showcase + battle shots.
- 2026-07-11: FOLLOW-UPS: single-shot weapons never spent ammo (only
  channel weapons decremented) so they sat at full forever and crates
  ignored them — doRanged now decrements on every shot (verified 26→21→
  refill 26) · per-view cameras follow ONLY their own character: split-cam
  look target is the player alone (no enemy lean), solo combined cam
  centers dead-on the player (no centroid pull, max dist 34) — the mech
  can no longer drift off-center · COLOR SCHEMES: 4 paint jobs per mech
  (STOCK/EMBER/TIDE/MIDNIGHT via hue-force/darken of skin.primary base
  colors + menu tint + glow; works in both texture-tint and procedural
  paths). Cycle with X (pad) / R (kb1) / Num4·M (kb2) / 🎨 COLOR (touch)
  in mech select — pre- or post-lock; lock-in auto-bumps duplicates so
  same-mech players always differ (battle start re-checks, AI included);
  swatch row on the info card, scheme name in the chips, live recolored
  stage preview; &c1..c4 debug params. Verified: 4 titanus in 4 schemes
  screenshot clearly distinct, attackmatrix ALL CONNECT, ace soak clean.
- 2026-07-11: MENU MERGE + COMBAT/MODEL BATCH.
  · UNIFIED FIGHTER SELECT: folded the old BATTLE SETUP screen into mech
    select. Title → one screen. Controllers auto-join on connect; any
    unassigned pad/keyboard JOINS by pressing confirm; an ＋ADD PLAYER card
    cycles kb1/kb2/pads/CPU-tiers/off (click), CPU cards cycle difficulty /
    remove. Everyone picks mech + color live; B leaves (frees the slot);
    start needs ≥2 fighters all locked. SetupScreen deleted; players-bar UI +
    CSS added; slots round-trip so returning restores the line-up.
  · BLOCK TIERS: per-mech blockMult (fraction that leaks past a guard) —
    Cranky 0.04 & Rhino 0.05 strongest, Aegis 0.06, heavies ~0.09-0.10,
    lights (Viper/Wraith) 0.20. Knock scales with it. Verified Cranky
    blocked 4 vs 74 unblocked.
  · CROUCH DYNAMIC: an attack thrown while DUCKING lands LOW and slips under
    a STANDING block (full dmg); crouch yourself to block low. Duck now
    persists through the attack while held so the strike registers as low.
    AI crouches vs a turtling blocker. Verified 74 through / 4 blocked.
  · SAURION GUARD-BREAK: stats.guardBreak 0.6 → its hits shatter a raised
    guard ~60% (orange spark, extra hitstun). Verified 24/40.
  · RHINO HELD CHARGE: bull rush now rolls as long as B is HELD (min 0.85s
    lunge so a tap still connects), up to a 5s cap; steers toward the enemy,
    can re-hit; ends instantly on release. AI holds it. Matrix special 126.
  · SAURION buffs: HP 900→1080; raptor pounce leap 22→44 (doubled) with a
    higher, longer arc + a reliable landing slam (groundShockwave) then two
    pinning toe-claw rakes with bleed.
  · MODELS/ANIM: Cranky's hands rebuilt as real crab claws — bulbous
    propodus off the wrist + fixed lower finger + a hinged upper dactyl
    (jawL/R joints the animator gapes at rest and SNAPS shut on a strike),
    no more "held geometry". Frogger's four arms now gait as one creature:
    the upper cannon-pair counter-swing the lower pair (alternating pump)
    with an idle bob, not 2 arms + static props. Saurion gets researched
    raptor locomotion: a stride-synced travelling S-wave down the tail
    (segments phase-lagged, amp scaling with speed, raised at rest → leveling
    behind at speed) for angular-momentum counterbalance, plus head
    stabilization that cancels the body's yaw sway to hold the gaze level.
  Verified: build green, attackmatrix ALL CONNECT (rhino special 126,
  saurion 58, titanus-ranged-0 was variance → 114 on rerun), 4-way ace soak
  clean (3 KOs, no crash), select-flow drive-through (title→pick→lock→arena),
  functional probes for block/crouch/guardbreak/charge + tail-wave/jaw-snap,
  showcase + battle screenshots viewed.
