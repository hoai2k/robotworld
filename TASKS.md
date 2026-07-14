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
- 2026-07-11: RHINO CHARGE FIX + DESTRUCTION BATCH.
  · RHINO HELD CHARGE (real): intent.special was an edge (one frame), so the
    "hold to charge" never actually held — added intent.specialHeld
    (kb/pad/touch held state) and bullRush now reads it, charging up to 5s
    while B is down (min 0.85s lunge on a tap), ending ~0.17s after release.
    Verified 5.18s held / 0.17s release. AI holds it a few seconds then lets
    go. During the charge Rhino drops onto ALL FOURS and gallops (animator
    'rhino' case pitches the frame down, arms become pounding front legs,
    legs gallop opposite phase) via ctx.charging.
  · EXPLOSIVE TANKS: fuelTank props are now flammable — hazard-chevron glow,
    userData.explosive {r,hp}. Registered in arena.explosives. A fighter
    running into one, a projectile striking it, or any blast in range cooks
    it off: fireball + rising embers + burning fire-patch crater, AoE that
    scorches nearby fighters (up to ~70 dmg, knock/launch, 3.5s burn),
    cracks nearby building chunks, and chain-reacts other tanks. Pulled
    tanks into the play area (ring 16-34, count 4) across the 4 themes that
    have them. Verified detonate → 55 dmg + burn on a neighbor.
  · COLLAPSE → INTERACTABLE RUBBLE: a building that structurally collapses no
    longer just vanishes into a dust puff — every chunk drops as a FULL-SIZE
    block (new bounded rubble system, cap 200) that tumbles under gravity,
    lands, bounces once, then SETTLES flat as solid rubble. Fighters push
    against settled blocks and can stand/land on top of them (collideFighter
    extended). Verified 33/33 blocks settle at rest height and a mech dropped
    on one lands on its top face (standsOnRubble). Fixed a latent aliasing
    bug: killChunk's `vel` aliased the shared _p temp that hideChunk clobbers
    to (0,-500,0), so collapse debris/rubble were being launched at ±500 —
    now the impulse is captured before hideChunk.
  Verified: build green, attackmatrix ALL CONNECT, two ace soaks (4-way
  foundry + harbor) clean, functional probe (charge/tank/rubble/stand-on)
  all pass, screenshots of the quad-gallop charge, tank blast embers, and a
  settled rubble pile.
- 2026-07-11: AIM/FADE/CHARGE/SHIELD FIXES.
  · NO AUTO-POINTING for humans: faceNearestEnemyIfClose is AI-only now —
    aimed moves (specials/ults/beams, always=true) snap to the player's OWN
    camera aim (aimYaw), plain melee strikes along current facing, dash no
    longer swings a human to face the enemy. specials.aimDir(): humans fire
    along their yaw (vertical assist only when a target is within ~15° of
    the barrel); fenrir pounce / saurion pounce lead-aim only for AI (humans
    leap along their aim, with a range clamp when the target is already on
    the aim line); bullRush steering AI-only. Verified: melee leaves yaw
    untouched; special with aimYaw faces the aim, not the enemy.
  · TRANSPARENCY ONLY WHEN OCCLUDING: buildings were fading ghost copies —
    writeFade stamped all 9 wrap copies whenever the base building crossed
    the camera→player segment, so a building across the seam (nowhere near
    the line of sight) went glassy. setOccluders now tests EACH tiled copy's
    shifted AABB and fades copies independently (per-copy fadeTarget/fade
    arrays; writeFade(b, g, v)). Verified: base copy fades, its 8 ghosts
    stay solid, far segments fade nothing.
  · BULL RUSH ENDS ON HIT: the charge stops the moment it connects (one
    clean launch + 0.45s recovery), runs to the 5s cap only if nothing is
    hit. Verified: hit at 0.57s ends it (63 dmg), no-target run 5.02s.
  · AEGIS SHIELD: while blocking, the shield joint's rotation now CANCELS
    the whole arm chain (parent world-quat inverse x root quat + brace
    tilt, slerped) so the face presents square to the front instead of
    turning upside-down/backward; out of block it eases back to the natural
    forearm carry. Verified with front-on carry + block screenshots.
  Verified: build green, attackmatrix ALL CONNECT (AI aiming untouched),
  3-way ace soak clean, logic probe 10/10 checks.
- 2026-07-11: LAZY FOLLOW-CAM: while a mech runs roughly along its facing
  (vel·facing > 0.3, speed > 3) and the camera control is idle, the orbit
  azimuth damps around to sit BEHIND the character — in the solo combined
  cam (rate 2.0; falls back to the enemy-relative framing when idle) and in
  every split chase cam (rate scales with speed). Any right-stick input or
  touch drag owns the camera: it suppresses the follow while held plus a
  0.6s grace after release (3s for touch drags), and the solo cam's
  enemy-based auto framing now also waits out manual look instead of
  drifting beneath the player's drag. Verified: running west converges the
  azimuth to exactly yaw+PI; a held manual look stays put while running.
- 2026-07-11: BLASTS/GAITS/PER-VIEW FADE.
  · TANK EXPLOSIONS bigger in every way: blast radius 8+r*2.5 (~13.5-16, was
    ~8-10; touch trigger now uses the tank's PHYSICAL bodyR so it doesn't
    pop from range), staged fireball (ground burst 1.35r + golden core +
    delayed mushroom crown at top+4), expanding ground ring, 30 fire-column
    glows + black smoke, shake 1.3, dmg 95 @center w/ knock 24 / launch 11 /
    3.8s burn, building damage 200 @ 0.85r, fire patch 0.6r for 6.5s.
    Verified: 35 dmg + burn at 9u (old radius barely reached).
  · QUADRUPED AMBLE: roster gait:'quad' (TITANUS gorilla, RHINO bull,
    FENRIR wolf, CRANKY crab) — as the run picks up (ratio>0.4→0.75 blend)
    the frame pitches over the arms, which become pounding front legs on
    the opposite beat of the hinds; head stays on the horizon; deeper hind
    crouch + stride-rate bound. Layered in the locomotion pass so action
    clips still blend over it; rhino's full-override charge gallop remains.
    Verified: titanus knuckle-runs, fenrir lopes (screenshots).
  · STRICTLY PER-VIEW SEE-THROUGH: fades were stamped into the ONE shared
    fade attribute, so in split-screen a building faded for P1's camera also
    rendered glassy in P2's viewport (where it only occluded an opponent).
    Occluder segments now carry their view's camera; fade targets/easing are
    per (view, tiled copy) on each building, and applyViewFade() stamps the
    attribute in engine.onBeforeView right before EACH view renders — a
    building is transparent only in the viewport of the player it hides.
    Verified: same chunk reads 0.15 in view A, 1.0 in view B / unknown cams.
  Verified: build green, attackmatrix ALL CONNECT, 4-way quad-mech ace soak.
- 2026-07-11: NEW MECH — JERRY (16th fighter), from docs/canonical/
  mech_jerry.png. Giant robo-shrimp on grasshopper legs: bulging stepped
  carapace lathe w/ olive seam bands + shingled back plates, serrated
  rostrum, stalk eyes, joint-driven whip antennae, a 6-arm wriggling claw
  nest (armS0-2 L/R joints), forearm cannon pods with red bores + live
  flea critters at the muzzles, wide-splayed grasshopper legs (spring
  pistons, segmented spur tibias) + rear strut pair (legD joints).
  · FLEA SYSTEM (src/combat/fleas.js): his ammo is ALIVE. Fired fleas fly
    an arc; on a miss they land, twitch through a nervous pause, then hop
    erratically (scatter-steered toward prey, tightening as they close),
    squash/stretch on land/launch. On contact they ATTACH to the victim,
    ride the body wriggling, bite for exactly 3s (burn-style drain, ult
    gain for Jerry, red spark ticks), then pop. Wander life 6.5s (paused
    while attached). Wired: world.fleas (update/clearTransient/view-wrap
    shift), fireRanged 'flea', AI range 14, matrix roster.
  · Moves: Flea Pod ranged (ammo 14), Brine Swarm special (6 fleas),
    TIDAL PLAGUE ult (spring-crouch → 34-vel mega-leap → landing quake +
    ring of 10 fleas).
  · CROUCH-THEN-LAUNCH: stats.jumpWindup (0.18s) — generic spring-loader
    in fighter.js: jump press slams duckT to full crouch, then releases a
    jump-24 launch (highest in the game).
  · CREEPY SIGNATURE: randomized nerve timer SNAPS antennae to new angles
    (fast-ease twitch, never sway), head cocks in sharp tilts, the claw
    nest ripples in a wave down the segments and flares while firing,
    rear struts creep against the stride and scrabble mid-air.
  Verified: showcase iterations viewed (rest + walk), functional probe
  (windup 0.18s/full crouch/peak 11.6; flea attach→34 full bite; miss →
  4 hops zig-zag to prey → attach; swarm 6; ult ring 10), 16-mech
  attackmatrix ALL CONNECT, 2 ace soaks clean, battle screenshot.
- 2026-07-11: OCCLUSION STRICTNESS + TWO-WAY FOLLOW + GAIT SPRING.
  · FULL-BODY OCCLUSION TEST: a touched/grazed building was fading because
    ONE center segment (pad 1.5) clipped its padded AABB. Occlusion probes
    now carry 5 samples spread across the whole mech (center, both flanks,
    head, feet; pad 0.3) and a building copy fades only when it blocks
    EVERY sample — touching it, or clipping one shoulder behind a corner,
    keeps it solid. Verified: touch=1.0, corner-graze=1.0, full block=0.15.
  · TWO-WAY LAZY FOLLOW: the follow now reads the mech as moving AWAY or
    TOWARD the camera. Away → damps to the back view as before; charging AT
    the camera (beyond ~123°) → holds/damps to the FRONT view instead of
    whipping 180° around. Hysteresis (enter 2.15 rad / stay 1.25 rad)
    biases toward the back view; flipping run direction snaps the target
    naturally. Both solo + split cams. Verified front view while running at
    the cam, back view after turning away.
  · GAITS: TITANUS is a biped again (quad flag removed — rhino/fenrir/
    cranky keep it). Quad amble hind legs now properly articulated: cyclic
    thigh drive, deep gathering knee flexion (0.5+0.6 on the beat) and an
    ankle push-off snap. Biped walk de-stiffened: soft stance knee bend
    (never locked), bigger swing-phase knee lift, and a trailing-leg
    plantar-flex TOE-OFF so mechs push off the ground; bob rides the beat.
  Verified: 16-mech attackmatrix ALL CONNECT (jerry ranged up to 34 with
  the flatter flea launch), ace soak clean, walk screenshots (fenrir
  gathered haunches, titanus biped stride) viewed.
- 2026-07-11: FOOT PLANTING + WOLF LOPE + GAIT ASSIGNMENTS.
  · NO MORE SKATING: gait phase used a canned stride length, so foot sweep
    speed never matched translation (titanus mid-stance slide ~7.6 u/s).
    Cadence is now derived from geometry — dφ/dt = speed / (legReach·swing)
    with legReach = (thighLen+shinLen)·0.92 — anchoring the stance foot's
    backward sweep to exact ground speed. Measured mid-stance foot speed:
    titanus 0.6 vs body 8.6 (93% planted), viper 1.6 vs 16.2. Steps now
    plant and push from one spot; cadence also scales naturally with leg
    length. (Capped at 14 rad/s.)
  · FENRIR WOLF LOPE: the generic quad amble became a canine transverse
    gallop — both hinds drive TOGETHER (near-in-phase, deep gathering knee
    flexion, ankle snap) while both fronts lead by ~half a cycle, reaching
    far forward EXTENDED (elbow straightens on the reach, folds on the
    pull-through), with a spine gather/extend cycle riding the bound.
  · Gait assignments: CRANKY and RHINO are bipeds again for normal running
    (rhino keeps the all-fours gallop during his bull-rush charge); FENRIR
    is now the only gait:'quad' mech.
  · TEMPEST DE-STIFFENED: he had no restPose (dead-straight legs). Athletic
    rest crouch added (thigh -13 / knee 24 / ankle -11) — combined with the
    stance-bend + toe-off from the previous pass, his walk reads sprung.
  Verified: measured foot-plant numbers above, walk screenshots (fenrir
  reach-extended lope, tempest bent-knee stride), 16-mech attackmatrix ALL
  CONNECT, 3-way ace soak clean.
- 2026-07-12: MOVE FLAVOR PASS — five signature-move reworks.
  · TEMPEST STATIC OVERLOAD: recentered a little in FRONT of him
    (fwd radius·0.55). A heavy dark storm cloud gathers overhead (two waves
    of churning smoke at y≈13) and visible lightning hammers DOWN out of it:
    every bot caught in the area eats a strike (same 70 dmg + slow), plus 7
    scattered ground strikes. Each bolt = hot beam core + two jagged arcs +
    impact flash + ground ring.
  · CRANKY GEYSER: now telegraphed — 0.85s warning at the target spot
    (expanding pulse rings + ground-boil bubbles that churn harder as it
    primes) so the opponent can evade, THEN the eruption: water column of
    ~66 upward droplets in three pulses + fan spray + mist plume + launch
    (same numbers, aimed with the longer lead).
  · CRANKY RANGED → HYDRO HOSE: continuous firehose channel from his water
    cannons (type 'hose', 7 dmg/tick @ 0.075s cd, range 20, ammo 150,
    knock-shove 3.4). Ticks alternate muzzleL/muzzleR so both arms blast; a
    drooping jet beam + pressurized droplets + splash on the soaked victim.
  · CRANKY HEAVY → CLAW SNAP: new 'clawSnap' clip (roster heavyClip) —
    claws spread WIDE then scissor shut in one violent snap (hit + metallic
    clack + shake at the snap). Jaw signature still gnashes through it.
  · SAURION SICKLE POUNCE → true raptor kill-leap: new 'pounceLeap' airtime
    pose (legs cocked under the body, sickles raised, arms swept back) and
    the ballistic arc is now REAL — the land-poll re-asserts vx/vz each
    tick because air-control damping was bleeding the leap to ~30% of its
    distance (lands 4.3 of 14 units; found via trace). On landing: prey
    within 5.2·scale → LATCH: he rides them for 0.72s pinned at claw range
    ('biteLatch' loop, head-snap impulses), initial 62 heavy hit + bleed,
    two ripping bites (0.3×), then kicks off backward and springs clear.
    NO prey → he just gathers into a crouch (duckT), dust puff, and stands
    back up — zero whiff damage.
  Verified: 16-mech attackmatrix ALL CONNECT (saurion special 106 with the
  all-or-nothing latch; cranky hose 288 @ test dist 8; known flaky titanus
  ranged / jerry special passed on rerun), 3-way ace soak clean (tempest/
  cranky/saurion), screenshots of every rework viewed (storm cloud + down
  bolts, geyser warn rings + column launching titanus, hose spray + soak
  splash, snap launching titanus, latch ride, whiff crouch with 0 dmg).
- 2026-07-12: CHARACTER KIT PASS — six feature reworks.
  · GLACIER CRYO BEAM: first beam contact FREEZES the victim solid for
    0.55s — the whole body blanks to frost-white (per-material color +
    emissive lerp, exact originals restored) then thaws back over ~0.5s;
    a 1.8s re-freeze grace means sustained beam slows instead of
    perma-locking. takeHit no longer knocks a frozen victim out of the
    frozen state (the next beam tick used to instantly break its own ice).
  · INFERNO FLAMETHROWER: the bell nozzles point along the hand's +Z, so
    the channel pose tipped the torch skyward — the wrist now counter-
    pitches while firing (via tgt, smoothed) so the torch aims straight
    down the fire line; flames beefed to a wide orange wash + hot fast
    yellow core + bright throat glow.
  · WRAITH: ranged is NIGHT SWARM — 3 flapping bat silhouettes (new 'bat'
    projectile: flat double-sided wings, flap scale cycle, figure-8 hunt
    wobble, homing when down the barrel, normal blending so the dark
    bodies actually show). Ghost Protocol is a real GHOST WALK: a baked
    white additive spectre of his current pose glides forward as long as B
    is held (body locked, min 0.9s commit, 5s / 58-unit cap), ripping
    through anyone it overlaps (60 dmg once each); on release he teleports
    INTO the spectre (dash trails + ring + 0.35s grace). attackmatrix
    expectZero emptied — wraith special now deals damage.
  · COLOSSUS: mortar shots alternate left/right cannon with a MIRRORED
    brace animation (new mirrorRaw() clip transform → 'braceL'; fireRanged
    lobs from the matching muzzle).
  · NOVA: the broken halo's glow SWELLS toward apex alignment and dims
    past it (cos cycle on halo spin, driving glowSoft/glow2 emissive);
    while lit her plasma lances fire bigger and hotter (up to +35% dmg,
    +45% splash, +75% projectile size at full glow).
  · WALL GRAB + CLIMB (all mechs): an airborne punch HELD (X) when the
    fist meets a building face GRABS the wall instead of cracking it —
    the mech hangs (hangGrab pose, gravity off), drops on release, gets
    knocked off if hit or if the chunk dies, and JUMP springs off the
    wall so punch-hold again grabs higher: jump → grab → jump → grab
    climbing. New lightHeld intent (kb/pad/touch), destructible.grabProbe
    face query, fighter hang state.
  · Fixed latent animator bug: signature-case writes to standard joints
    were clobbered by applyPose (smoothing owns them) — Rhino's bull-rush
    all-fours gallop now actually applies, written into tgt.
  Verified: 16-mech attackmatrix ALL CONNECT (wraith special 50 was
  expectZero, ranged 176-198 bats, nova ranged 133 glow-boosted, colossus
  109/112 alternating), ace soak clean (wraith/glacier/inferno), probe
  numerics (freeze state + white 1.0 mid-freeze and 0.2 decaying after,
  handRx 1.55 while flaming, 3 bats in flight, ghost glide pos lock + 50
  dmg + teleport to spectre, _altSide toggling shot to shot, climb log
  hang y=2.0 → spring → hang y=3.9), screenshots viewed (pure-white
  frozen titanus, forward torch jet, white spectre + locked wraith,
  teleport arrival, nova bright-vs-dim halo, titanus hanging mid-wall).
- 2026-07-12: FEEDBACK PASS — aiming, Cranky, Saurion, Glacier, Fenrir.
  · WEAPONS NEVER TURN THE MECH (humans): firing/specials/ults no longer
    snap the body to the camera yaw — every attack goes along the mech's
    CURRENT facing, movement owns the orientation (faceAim + the
    faceNearestEnemyIfClose human branch are now AI-only). Verified: yaw
    held at 0 through a full hose burst with aimYaw pinned 90° away.
  · CRANKY HOSE: cannons stay LOW — new 'shootLow' channel clip (roster
    channelClip) keeps the arms angled down-forward (-40°, was -86°
    overhead) with a braced shell. Cranky's scuttle roll + hydro recoil
    signature also actually apply now (were writing joints post-clobber).
  · CRANKY CLAW SNAP: reworked — both claws spread WIDE to the sides then
    CLAMP together at the centerline (shoulder yaw sweep + elbow fold),
    instead of just raising them.
  · SAURION SICKLE POUNCE: bird-of-prey rework. Leap is much taller
    (vy 21, ~1.24s hang). The latch now requires coming down ON TOP of the
    victim — contact HIGH on their body (0.35-1.6× height, tight radius)
    while descending; he then PERCHES on their shoulders (pinned at
    +0.55× prey height), feet clamped, hammering three fast pecks
    ('biteLatch' reworked into a hunched gripping crouch with a rear-back /
    strike-down head cycle), then springs off. A stooping-hawk dive
    correction curves the fall onto strafing prey (this is what makes it
    land). Ground landing is still a plain crouch recovery, zero damage.
  · GLACIER CRYO BEAM: no more discrete freeze from the beam — the victim
    is frost-WHITE for exactly as long as the beam is on them
    (_beamWhiteT re-armed per tick, fast ramp both ways) while tick
    flinches shake them; colors thaw right back after. Frozen-solid
    white-out retained only for the absolute-zero ult. Verified whites
    over the beam: [1,1,1,1,1,1,1,0.4,0,0].
  · FENRIR SPRINT: rotary-gallop rebuild — fronts EXACTLY half a cycle
    against the hinds (the old ~115° lead read as limping), slight rotary
    lag inside each pair, longer stride (0.85× cadence), frame ridden low
    with a near-constant back angle (subtle arch/heave only), fronts
    stretch arrow-straight on the reach and fold tight on recovery, hinds
    sweep hugely with knees gathering under the chest and an ankle snap.
  Verified: 16-mech attackmatrix ALL CONNECT (saurion special 107 with the
  on-top-only latch), ace soak clean (saurion/cranky/fenrir), probe
  numerics + screenshots (yaw-hold hose with low arms, clamp launch,
  saurion perched on aegis at y 3.8 pecking, beam-white timeline, four
  gallop phases with a level back).
- 2026-07-12: Jerry's fleas hop 2x higher — ground-hop launch vy 10-16 →
  14-23 (peak height doubles; velocity scales by √2, not 2, since
  h = v²/2g). Verified: attackmatrix ALL CONNECT (jerry ranged 34 /
  special 26-41 — attach reliability held despite the longer, floatier
  arcs; titanus ranged flake passed on rerun at 114).
- 2026-07-12: SHOULDER SOCKETS — several designs (Glacier among them) had
  chest geometry narrower than the rig's shoulder joint offset, leaving
  the arms floating free of the body. buildMech now bridges EVERY mech's
  shoulder joints to the torso automatically: a tapered axle from inside
  the chest out to the joint, a dark collar ring, and a fixed socket ball
  at the pivot the arm visibly rotates in (all scaled by mech scale/bulk,
  added after the design assembles so it works for all 16 without touching
  design files). Verified: glacier close-up (gap gone), full 16-mech
  showcase lineup (no protruding stubs — jerry's is hidden inside his
  carapace), slim-frame wraith close-up, build green, no page errors.
- 2026-07-12: ARENA HAZARDS + GEYSER BLOWOUT.
  · SPIKE HAZARDS: obsidian spike clusters (volcano) now CUT — any bot
    walking into a cluster takes 14 contact damage and gets SHOVED hard
    back out (knock 20 + outward velocity + brief launch, 0.8s per-bot
    re-hit cooldown, sparks + slash). Generic registry: props tag
    userData.spikes, arena.updateHazards ticks them.
  · CAMPFIRES: new stone-ring campfire prop (crossed logs, ember bed,
    small flame) placed in ruins/jungle/frozen (3 each). ATTACKING one —
    melee or any blast (hook in arena.damageSphere) — flares it into a
    7s burning ground patch (13 dps) with a flare-up fountain + ring +
    flame sfx; it can be re-lit after burning out. Verified: one punch
    lit it, a bot walking through burned for 66.
  · CRANKY GEYSER: radius DOUBLED 5.5 → 11, and the eruption now opens
    with a brief HUGE fountain — 60 tall fast jets (vy 24-40) across the
    whole area on top of the existing column pulses (beam column width
    capped so it stays a column). Verified: victim 9 units off the aim
    line still launched.
  Verified: 16-mech attackmatrix ALL CONNECT, volcano ace soak clean
  (spike hazards live), probe numerics (spike dmg 12 + shove to 6.9u at
  23 u/s; campfire lit + patch + walk-through burn; off-axis geyser
  launch), screenshots viewed (geyser blowout column, lit campfire).
- 2026-07-12: SHOULDER AXLES v2 + COLOSSUS SKYLINE TOSS + GRAB FEEL.
  · SHOULDER CONNECTORS FIXED FOR REAL: six designs push their shoulder
    joints wider than the rig default (glacier +0.55s — why his arms still
    floated; also rhino/inferno/colossus/aegis/fenrir, cranky moves y/z).
    The factory axle now reads each joint's ACTUAL post-design position
    and bridges it to the torso with a DARK cylindrical axle + collar +
    socket ball. Verified: glacier close-up + mid-walk-swing shot, gap
    closed on both.
  · COLOSSUS SPECIAL → SKYLINE TOSS (grab & throw): replaces Fire Mission.
    He seizes a bot in his front cone (4.5·scale reach), hoists them
    OVERHEAD — laid flat ACROSS the press on their side, wrestling
    body-slam style (rolled -1.45 rad, perpendicular to his facing, new
    grabReach/liftHold/throwHeave clips) — then HURLS them far (36 u/s
    held through flight against air drag; ~23 units open-field, or a
    satisfying wall smack). 85 dmg split grab/throw; cargo has i-frames
    mid-lift; the slam roll unwinds on landing/interrupt. Whiff = short
    recovery. AI gates it at melee range (SELF_AOE set).
  · WALL GRAB v2: grabbing no longer snaps position or facing — the mech
    freezes EXACTLY where and how the punch connected (fist may intersect
    the wall: that's the grip). Releasing grants a 0.35s coyote window
    where a mid-air jump still fires — so climbing flows as jump, grab,
    release, jump, grab. Verified: grab with yaw unchanged, release,
    air-jump, re-grab 2.7 units higher.
  Verified: 16-mech attackmatrix ALL CONNECT (colossus special 71 via the
  grab; titanus-ranged/jerry-special known flakes passed on rerun), ace
  soak clean (colossus/glacier), probe numerics + screenshots (dark axle
  bridging glacier's pauldrons at rest and mid-walk, viper carried flat
  overhead, roll 0 after landing).
- 2026-07-12: NOVA HALO FIXED + TITANUS SLAM KIT + SMOOTH CARRY.
  · NOVA HALO GLOW, ACTUALLY VISIBLE: the pulse was firing but the only
    halo geometry in the pulsing bucket was four TINY tip gems — the
    crescent bodies were plain white/teal, so the "glow" read as nothing.
    The crescent inlay arcs are now glowSoft strips (the ring itself
    surges), tip gems doubled in size, and the pulse curve hardened to
    0.35 + 3.6·g² (near-dark trough 0.36 → blazing 3.7+ at apex). Power
    now rides dmgMult so ALL her attacks (melee, plasma, starfall) hit
    +35% at full alignment; plasma/starfall orbs also swell in size.
    Verified: apex screenshot (both crescents aligned at the top, blazing
    magenta) vs trough (dim strips), intensity 0.36 → 3.72.
  · TITANUS: special B is now SKYLINE SLAM (the same grab → overhead
    body-slam carry → far throw as Colossus, 88 dmg), and RT became his
    old Seismic Slam ground pound (52 dmg, radius 9, knock 18, 1.6s cd,
    NO ammo — it's a quake, not a projectile; AI brawls at range 4).
    Side effect: the flaky titanus-ranged matrix case (rocket) is gone.
  · SMOOTH CARRY: the lift jiggle came from 0.05s schedule-tick pinning —
    gravity sagged the victim between ticks and each tick snapped them
    back. Victims now carry a per-frame _carry state handled in their own
    update: smoothstep hoist from the grab point up to overhead (~0.24s,
    no teleport pop), per-frame pin + roll-flat blend, auto-release on
    carrier death/state break. Verified y-trace over the lift: monotonic
    0 → 8.1 with ZERO downward dips.
  Verified: 16-mech attackmatrix ALL CONNECT (titanus ranged 30 pound /
  special 74 slam; nova special 88 with swollen orbs), ace soak clean
  (titanus/nova), screenshots viewed (blazing vs dim halo, titanus press).
- 2026-07-12: CINEMATIC KO FINISHERS (~7s) + enable_finishers config.
  · When a round is won by a KILL (never on timeout), the winner and the
    corpse become cinePuppets and a per-mech execution plays on a
    locked-off cinematic camera before the normal round-end flow resumes
    (match state 'finisher'; K.O. sting up front, no double slow-mo).
  · Finisher system (src/game/finisher.js): tiny timeline — at() one-shot
    beats, hold() per-frame spans (approach glides, carries, topples,
    camera orbits; later holds win). Camera shots orbit the action center
    and every distance scales with the combatants' stature. Shared beats:
    approach stride, spark/shake/hit-stop hits, victim flinch/knockdown,
    finale burst, hero-pose triumph shot.
  · 16 bespoke scenes. Highlights: COLOSSUS/TITANUS hoist the corpse
    overhead, hurl it down and quake it flat under three slams before
    reaching to the sky; SAURION leaps onto the face, rides them down
    under a 7-bite frenzy, springs off, looks around and grooms; GLACIER
    freeze-whites them and shatters the statue; RHINO gallops straight
    through; WRAITH uncloaks behind them for a railgun execution as bats
    spiral out; NOVA drops three stars under a blazing pinned halo; VIPER
    blink-flurries all four sides; TEMPEST pins them under his storm;
    FENRIR mauls and howls; CRANKY triple-clamps then geysers the wreck
    skyward; INFERNO immolates; VULCAN shreds point-blank; AEGIS bashes
    then calls the judgment pillar; FROGGER gunk-barrage + squash-hop;
    JERRY empties the flea nest onto the corpse.
  · CONFIG.enable_finishers (src/core/config.js), URL ?finishers=0 off.
  · PREVIEW MODE: ?finisherdemo=1 (alias ?debug=finisher) on the battle
    harness loops P1 executing P2 forever — pick robot/enemy/arena via
    the usual p1/p2/battle params. The dev harness also fires real
    finishers on last-kill KOs.
  · Engine capture mode for tooling: engine.paused + engine.step(dt)
    steps the sim deterministically while RAF keeps presenting.
  Verified: 16-mech attackmatrix ALL CONNECT, ace soak clean WITH the
  finisher firing on the KO, colossus/saurion demo frame reviews (lift +
  slam beats, saurion riding the fallen mech mid-bite), per-mech videos
  captured via tools stepping (delivered separately).

45. FINISHER ITERATION V2 — contact-true, wilder, choosable ✅
  · Every hit now LANDS and every big hit BASHES the corpse around:
    new Finisher.vicBash (bounce arc + slide + spin) and trackCenter
    (camera glued to wherever the body ends up).
  · TITANUS/COLOSSUS chase the wreck between quake-pounds (winner
    re-squares to 2.0×scale from the LIVE body each frame — probe shows
    exact smash range at all 3 impacts) and each pound punts it away.
  · SAURION crouches low: special perch dropped to 0.32×height, deeper
    biteLatch crouch, and the finisher ride ends glued to the fallen
    chest at ~1.1u (was floating at 1.5+ above).
  · JERRY: THE PLAGUE — 10 thrown + ~150 cling fleas in ten waves
    blanket the victim (FleaSystem clingTo/clingT cosmetic latch mode,
    tolerates corpses), thrashing until they collapse under the swarm.
  · WRAITH: soul off the chain — baked additive spectre (makeSpectre/
    dropSpectre) rakes THROUGH the victim 4× back and forth on a side
    profile cam, then re-forms and rails the wreck.
  · Dialed up the rest: viper 5-blink cage + air-tracking cam, vulcan
    walking shred-back, aegis pillar launch + crash, nova stars bash 3
    directions, rhino wide banking turn + SECOND trample, tempest 5
    jolting bolts, fenrir circular corpse-drag + fling, glacier statue
    skitters away shedding ice, cranky tracking clamps + 14u geyser
    launch, frogger true pancake squash (scale restore in end()).
  · Body-slam bug: fighter separation now skips _carry/cinePuppet pairs
    (carrier was shoved backwards through the whole lift).
  · NOVA halo glows on BOTH faces (back inlay torus) so the owner sees
    the alignment pulse from behind.
  · ?debug=finisher now routes to the demo (main.js) + WIN/VIC/MAP
    dropdown chooser reloads straight into any configuration.
  Verified: build green; paused-engine probes (colossus smash range =
  2×scale ×3, saurion rideY 1.1, jerry 157 fleas/147 attached, wraith
  spectre 0→11→0→11→0, rhino double-trample trace, frogger squash
  0.42→1.0); 16-mech attackmatrix ALL CONNECT (jerry flake rerun ✓);
  ace soak crash-free; chooser UI screenshot reviewed. Follow-up from
  frame review: chasing winners could block the fixed-azimuth shots, so
  smash/walk-down/drag phases now use camAction — a smoothed camera that
  rides perpendicular to the LIVE winner↔victim line (framing A/B'd on
  the titanus smash phase). Scenes are reviewed in-browser via
  ?debug=finisher (no video pass).

46. FINISHER DEMO CHOOSER CLICKS + HANDS-TRUE BODY SLAM CARRY ✅
  · #ui-root has pointer-events:none — the ?debug=finisher WIN/VIC/MAP
    dropdowns opted back in with pointer-events:auto (clicks now work,
    each change reloads straight into that configuration).
  · The lifted bot now rests IN the thrower's hands, everywhere: new
    Fighter.palmsMid (world midpoint of the handL/handR joints, works for
    procedural + GLB rigs, overhead fallback) and Fighter.carryPoint
    (subtracts the victim's feet→torso offset through their CURRENT
    rotation so the torso rides the palms exactly at any roll angle).
    Wired into the per-frame _carry pin (main-game grab-throw for
    Titanus/Colossus), the throw release (launches straight out of the
    palms), and the finisher lift + heave holds (which also now blend
    from the victim's real position instead of snapping).
  Verified: probes show torso→palms distance 0.29 at the top of the
  finisher hoist and 0.11 mid-carry in the live special (was ~5 — the
  old fixed "head-height + 0.6" float), throw velocity intact; chooser
  click probe reloads with the picked mech; 16-mech attackmatrix ALL
  CONNECT (jerry flake rerun ✓); colossus ace soak crash-free; lift
  frame reviewed.

47. HANDS-TRUE CARRY, GROUNDED CORPSES, AIMED HARDWARE, FX OVERHAUL ✅
  · Lift-and-throw: victim grips into the hands in ~0.15s then RIDES the
    liftHold arm swing (constant contact); clampPalmsTo IK servo narrows
    the palms to exactly the body's width (probe: sep 2.05 = want, torso
    0.3 from palm mid through the whole hoist). Throw launches out of the
    palms. Same path drives the game special and the finisher.
  · Floating corpses fixed: finisher holds get a guaranteed k=1 closing
    tick + end() ground clamps (all 8 probed mechs rest at y=0).
  · levelHands wrist counter-pitch: vulcan gatling pods, inferno torch
    bells and cranky pincers now track the arm's aim (stretch along the
    arm when fully raised) instead of pitching skyward.
  · Rhino charges BIPEDAL: heavy forward lean, pumping tucked arms.
  · Finisher reworks: AEGIS reaches to the heavens -> 10 spears of light;
    NOVA ring spin-up -> apex ignition -> 9 lances converging from every
    compass direction; WRAITH hurls the ghost FORWARD, blinks to the far
    side, wheels round and hurls it back (4 passes, spectre re-baked per
    launch); TEMPEST boxes the victim in with dark clouds above/behind/
    left/right and 7 bolts rake in from every direction; FENRIR's
    flurry now lands on a STANDING victim who only drops at its end.
  · Camera pass: establishing shot moved to a front-side quarter, titanus
    lift shot is now a FRONT hero angle (victim in the hands, not back
    armor), saurion bite cam low front, aegis skyward reach front-low,
    jerry side shots — no script films square through the winner's back.
  · FX overhaul: ParticlePool color ramps (color2) + a normally-blended
    `drops` pool for LIQUIDS. Fire is layered now (white core -> orange
    tongues -> deep red + embers + rising black smoke) for inferno's
    thrower, fire patches, explosions. Cranky's hose/geyser pour real
    WATER (heavy blue-ramp droplets + foam + mist + splash-on-hit).
    Frogger's gunk is thick green GOOP (sagging drips off the bolt,
    splatter + ooze + splat rings). Lightning is THICK now — segmented
    glowing bolts with a white core and a forked branch — and every bolt
    leaves staticCling crackle arcing over the victim while the charge
    bleeds off (zap ranged, storm special, ult strikes, finisher).
  Verified: build green; close-range FX stills reviewed (fire wash, water
  column, slime splatter, thick forked bolt, cloud-ring strike); fenrir
  standing-flurry + titanus front lift frames reviewed; 16-mech
  attackmatrix ALL CONNECT; tempest-vs-cranky ace soak crash-free.

48. FINISHER FEEDBACK ROUND: SPACING, SWARM, NECK BITES, SIDEWAYS SLAM ✅
  · FENRIR plants at claw's reach (2.8u) with the victim standing IN
    FRONT catching the end of every swipe (was overlapping them); the
    drag circle re-phased so the grab point matches where the bodies are.
  · JERRY now SHOOTS 100 fleas (ten alternating-cannon bursts of ten,
    lobbed arcs raining over/around/onto the mark) and the swarm does the
    rest on its own: fleas.spawn speed option, hop/latch treat cinePuppet
    corpses as prey. Probe: 92/100 latched before the collapse.
  · Attached fleas FOLLOW the victim down: cling points ride the full
    group rotation (quaternion) AND detect knockdown/dead poses, sliding
    down + along the now-horizontal body (carpet maxY 5.2 -> 2.4 after
    the fall). Matches gameplay behavior everywhere.
  · SAURION bites the NECK: finisher rides with jaws locked at the
    collar — the neck stays pinned at stage center and the body swings
    flat beneath it (probe: 0.00 horizontal drift from the throat);
    bite sparks fly from the collar. Game special perch is now
    height*0.8 - his own reach, clamped to [0.22, 0.62]*prey height —
    bites land at the neck without contortion on any prey size.
  · BODY SLAM is truly sideways at ANY facing: the roll moved to the
    Z-axis under the carrier's yaw (Euler XYZ made an X-roll lie along a
    fixed WORLD axis), so the victim lies head-off-one-palm,
    legs-off-the-other (probe: body axis 0.00 along facing, 0.99 along
    the hand line). Applies to the game special and the finisher; all
    unwind paths reset the new axis.
  Verified: build green; numeric probes above; fenrir flurry gap 2.8
  constant; titanus sideways-lift still reviewed; 16-mech attackmatrix
  ALL CONNECT; colossus-vs-saurion ace soak (slam + perch under AI)
  crash-free.

49. LUSCIOUS ELEMENTAL FX: FLIPBOOKS, ATLASES, SPRITE INTAKE ✅
  · Particle engine upgraded: texture ATLASES with per-particle rotation
    + spin, alpha fade-in curves (no more popping), color ramps — the
    "fading circle" era is over. All CPU-simmed, one draw call per pool.
  · FIRE is a 16-frame LOOPING turbulence flipbook (each flame licks
    through the loop as it rises/cools white->orange->deep red) baked
    from fractal value noise; explosions roll flipbook fireballs.
  · SMOKE is a 2x2 atlas of distinct billowy fractal puffs that tumble
    (spin) and fade in — soot, dust, mist, steam all tinted variants.
  · WATER droplets have a baked specular glint + darker belly (wet bead
    look), spinning as they arc; foam flecks + fine mist ride along.
  · SLIME is a 2x2 atlas of lumpy noise-warped glossy blobs with
    satellite drips — projectile trails, splats and the finisher all use
    the goop pool now.
  · ICE: crystalline six-armed sparkles for glacier's beam + frost vapor.
  · Optional sprite intake: drop PNGs + public/sprites/manifest.json to
    override any slot (fire/smoke/droplet/goop/ice/spark/glow), with
    atlas dims and CHROMAKEY intake — "luma" (alpha from brightness, for
    additive sprites on black) or "#rrggbb" keying with soft tolerance
    and despill. Missing/broken manifest = procedural look stays.
    docs/SPRITES.md has the manifest format + image-generator prompts.
  Verified: build green; stills reviewed (fireball wash + pilot flames,
  water beads with glints in the geyser column, lumpy slime globs);
  16-mech attackmatrix ALL CONNECT; inferno-vs-frogger ace soak
  (fire + goop under AI combat) crash-free.

50. SPRITE PACK VERIFIED LIVE + SOFT HITS (NO CHIP STUN-LOCK) ✅
  · The five committed sprites (fire flipbook, smoke puffs, droplet,
    slime blobs, ice sparkle) all load through the chromakey intake:
    every slot reports ok, pool textures swap to the 1254px images with
    correct atlas grids, and in-game stills show real flame tongues,
    glossy water beads in the geyser, lumpy slime splats. The loader now
    records per-slot outcomes in effects.spriteStatus for debugging.
    (On software renderers the async load can take ~20s/sprite; on real
    GPUs it's sub-second.)
  · SOFT HITS: rapid-tick weapons (flame cone, cryo beam, gatling
    bullets, hose stream, ground-fire patches) no longer apply hitstun.
    The body still rocks under fire and knockback still shoves, but the
    target KEEPS CONTROL and can break away instead of standing there
    eating the whole magazine. Probe: 20 flame-cadence ticks leave the
    victim in 'normal' state and they covered 15.3u while under fire;
    a regular punch still stuns.
  Verified: build green; sprite status + texture-swap probe; element
  stills reviewed; soft/hard state probe; 16-mech attackmatrix ALL
  CONNECT; vulcan-vs-inferno ace soak (both soft weapons) crash-free.

51. DESTRUCTIBLE PROPS, THROWN-BOT WRECKAGE + SUBSTANCE JETS ✅
  · Arena props (lamps, signs, crates, ...) now have measured cylinder
    colliders + hp and DESTROY into rubble blocks, dust and sparks, with
    the break mirrored across all 8 toroidal ghost copies. Fighters
    collide with them; punches, projectiles and damage spheres break
    them (explosive tanks still detonate through their own path).
  · Body-slam throws wreck what they hit: a launched bot projects its
    damage sphere ahead of its flight path, cracks buildings AND props,
    and takes up to 85 impact damage itself (soft hit, 0.6s cooldown).
  · SUBSTANCE REDESIGN: Cranky's hose and Inferno's flamethrower are now
    continuous tube-mesh JETS — a 16-ring tube rebuilt along a ballistic
    arc each tick, skinned with scrolling 2-layer fractal noise — with
    droplet spray / fire tongues riding the stream. Frogger fires 3-glob
    slime bursts (lumpy noise-displaced icosahedra) that splat ground
    PUDDLES and stick dripping BLOTCHES onto victims. Water splash foam
    dimmed + point sprites size-capped: the bloom white-out is gone.
  · HEAVY STRIKE AIM: during the strike descent (fists below shoulders)
    the torso yaw-servos the palms' azimuth onto the victim (cap ±0.6
    rad) and the palm clamp narrows the fists to body width, so a landed
    pound visibly lands on the body instead of straddling it. Probe:
    impact-frame fist-to-victim distance improves in every scenario
    (e.g. colossus right fist 3.17 → 2.39) and never regresses.
  Verified: build green; prop collide/break + ghost-mirror probe; throw
  crash probe (2 chunks broken, 40 self-damage); stream/glob/pound
  stills reviewed; clean-victim convergence matrix (stale-intent probe
  bug found + fixed in the harness).
