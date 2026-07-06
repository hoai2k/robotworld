# ROBOTWORLD — 3D Mech Battle Game — Task Tracker

Browser-based 3D mech arena fighter in the spirit of **Override: Mech City Brawl**.
12 unique mechs, destructible city arenas, local multiplayer (keyboard + Xbox
controllers via Gamepad API), AI opponents.

> **Process note:** This file is the source of truth for progress. Update the
> checkboxes and the "Current status" section after every phase and commit it,
> so work can resume cleanly if a session is interrupted.

## Current status

- **Phase:** 1 (scaffold & engine core) — in progress
- **Next action:** Scaffold Vite+Three project, engine core, then Phase 2 mechs
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

### Phase 1 — Project scaffold & engine core
- [ ] Vite + Three.js project scaffold (`package.json`, `vite.config.js`, `index.html`)
- [ ] Renderer, scene, camera, resize handling, fixed-step game loop
- [ ] Lighting rig (key/fill/rim + hemisphere), PCF soft shadows
- [ ] Post-processing stack: UnrealBloom + FXAA + vignette
- [ ] Procedural texture generator (armor plating, grime, hazard stripes, decals)
- [ ] Math/easing/utils, object pools

### Phase 2 — Mech construction kit & 12 mech designs
- [ ] Part library: armor plates, joints, pistons, thrusters, antennae, cockpits, weapon meshes
- [ ] Rig builder: full joint hierarchy (root/hips/torso/head/shoulders/elbows/wrists/hips/knees/ankles)
- [ ] Material system: per-mech PBR palettes + emissive accent trims
- [ ] 12 unique mech designs (silhouette, weapons, personality):
  - [ ] 1. TITANUS — colossal brawler, rocket-fists (heavy)
  - [ ] 2. VULCAN — gatling gunner, ammo-belt berserker (ranged)
  - [ ] 3. AEGIS — shield paladin, energy lance (defense)
  - [ ] 4. VIPER — twin-blade assassin, serpentine (speed)
  - [ ] 5. NOVA — plasma archmage, floating cannon arrays (caster)
  - [ ] 6. RHINO — charging bull, seismic horn (charger)
  - [ ] 7. TEMPEST — storm dancer, lightning whips (electric)
  - [ ] 8. FENRIR — wolf chassis, claw frenzy (feral melee)
  - [ ] 9. COLOSSUS — walking artillery, mortar barrage (siege)
  - [ ] 10. WRAITH — stealth sniper, phase cloak (sniper)
  - [ ] 11. INFERNO — flame juggernaut, napalm (fire)
  - [ ] 12. GLACIER — cryo fortress, freeze beam (ice)

### Phase 3 — Animation system & full move sets
- [ ] Pose/keyframe animation engine with blending & layers
- [ ] Locomotion: idle (breathing/personality ticks), walk, run, jump, dash, air fall, land
- [ ] Combat anims: light combo (3 hits), heavy attack, ranged fire, block, hit-stagger, launch, knockdown, get-up
- [ ] Special & ultimate attack anims (unique per mech)
- [ ] Personality: intro taunts, victory poses, idle fidgets

### Phase 4 — Combat system
- [ ] Health/energy/ult meters, damage & knockback model, hit-stop
- [ ] Melee hitboxes with combo chains
- [ ] Projectile system (bullets, rockets, plasma, mortar arcs, beams, flame cones)
- [ ] Blocking, dodging (i-frames), launcher attacks
- [ ] Per-mech specials (cooldown) + ultimates (meter)
- [ ] VFX: muzzle flashes, impacts, explosions, sparks, smoke, shockwaves, trails

### Phase 5 — Destructible city arenas
- [ ] City generator: streets, sidewalks, props, skyline backdrop
- [ ] Destructible buildings (chunk-based: facade panels shear off, structure collapses)
- [ ] Debris physics (ballistic chunks, bounce, fade), dust clouds
- [ ] Collateral damage from attacks & mech bodies
- [ ] 3 arenas: Neon District (night), Harbor City (dusk), Uptown (day)

### Phase 6 — AI opponents
- [ ] AI controller: approach/strafe/spacing, attack selection, blocking, dodging
- [ ] Special/ultimate usage logic
- [ ] Difficulty levels (Rookie / Veteran / Ace)

### Phase 7 — Input & local multiplayer
- [ ] Keyboard mappings (P1: WASD+..., P2: arrows+...)
- [ ] Gamepad API: Xbox controller mapping, hot-plug, rumble (vibrationActuator)
- [ ] Up to 4 local players (any mix of human/AI), free-for-all
- [ ] Shared dynamic battle camera (frames all fighters, shake, zoom)

### Phase 8 — Game flow, HUD & menus
- [ ] Title screen
- [ ] Mech select (rotating 3D showcase, personality blurb, stats)
- [ ] Arena select
- [ ] Round system (best-of-3), KO logic, intro/outro sequences
- [ ] HUD: health/energy/ult bars, portraits, round pips, announcements
- [ ] Pause menu, results screen, rematch

### Phase 9 — Audio
- [ ] WebAudio SFX synth: impacts, gunfire, explosions, servo whirs, footsteps
- [ ] Announcer-style stingers (synth), menu blips
- [ ] Dynamic music (menu theme + battle theme, synth arps/bass/drums)

### Phase 10 — Polish & ship
- [ ] Performance pass (instancing, pooling, draw-call budget)
- [ ] Balance pass across 12 mechs
- [ ] README with controls & how to run
- [ ] Final build verification (`vite build`) + browser smoke test & screenshots

## Progress log

- 2026-07-06: Repo initialized. Task plan laid out. Starting Phase 1.
