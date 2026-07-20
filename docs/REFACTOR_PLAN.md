# Refactor plan — 2026-07-20 sweep

Tracking doc for the "keep it well factored" refactor pass requested after
the codebase review. **If you are an agent resuming this work: read this
file top to bottom, then continue at the first unchecked batch.** Work on
branch `claude/codebase-refactoring-review-441t8t`, one batch at a time;
when a batch is verified (build green + soak for combat, screenshots for
art), merge it into `main` and push (push to main auto-deploys via
`.github/workflows/deploy.yml`). Update the checkboxes + notes here in the
same commit as the work. All refactors are **behavior-preserving** unless a
note says otherwise.

Baseline: main @ 849b648, build green, review findings summarized per batch
below (file:line refs are from that commit and drift as batches land).

## Batch A — contract validator  [x DONE 2026-07-20]

The MECH_ART_GUIDE §5 joints/anchors contract is prose-only; animator/combat
`if (J.x)`-guard every extra joint (animator.js:479-782), so a missing
`gatlingL`/`muzzleR`/`halo`/`tail0-2`/`shield`/`mortars` ships silently.
GLB path never calls `design()` (gltf.js:149) so extra joints are absent
there by design — the validator must encode *expected* per-route loss
(glbanim.js:115-127 lists accepted GLB losses).

- [x] `src/mechs/contract.js`: §5 table as data (joints/anchors/materials
      per mech, `glbAnchors` = manifest-reinstated subset).
- [x] `validateMech(mech)` → { violations, glbLosses }.
- [x] Wired into BOTH build factories instead of rigtest (better: fires in
      every mode — battle, showcase, soak — for free): `warnContract` in
      factory.buildMech + gltf.buildGlbMech, deduped per mech+route.
      Violations = console.warn; known GLB losses = console.debug.
- [x] Verified: procedural + GLB showcase clean (0 violations, 13 GLB
      known-loss lines as expected; vulcan podL + nullbot glow2 correctly
      satisfied by manifest/GLB_DRESS); sabotage test fired then reverted;
      build green; titanus/viper ace soak crash:null.
      New tool: tools/console.mjs (headless console capture).

## Batch B — skinOps compaction  [x DONE 2026-07-20]

manifest.json is ~9.5k lines, mostly verbose append-only skinOps dumps from
?debug=skin; superseded ops accumulate (titanus comp 50 mapped 3×; last
wins per applySkinOps order, skinops.js:357). Selectors are positional
(n-th largest island, sort at skinops.js:102) — do NOT change selector
semantics in this batch (stable keys are future work; re-exports are rare).

- [x] compactSkinOps + skinOpsToJson in skinops.js. Census first: ALL 1504
      ops are pure {comp:N} selectors (global ordinals, stable under
      rebinds) → keep-last-per-comp dedupe is exact. {bone,comp} ordinal
      selectors would NOT be safe to dedupe; compactor leaves them (and
      purgeFar/purgePair) untouched — rationale documented in skinops.js.
- [x] tools/compact-skinops.mjs: dedupe + one-op-per-line rewrite with a
      symbolic old-vs-new equivalence check that aborts on mismatch.
      Result: 1504→1425 ops, manifest.json 10.5k→2k lines. Idempotent.
- [x] ?debug=skin export now emits compacted one-line form.
- [x] Verified: symbolic equivalence + before/after screenshots
      (titanus/jerry/glacier — pixel diff shown to be pure scene
      nondeterminism via same-state control shot; visual compare
      identical); GLB showcase contract-clean; aegis/jerry ace GLB soak
      crash:null; build green.

## Batch C — world.js fx lifecycle unification  [x DONE 2026-07-20]

world.js keeps 5 bespoke arrays (geysers/waves/tornados/firePatches/
flameJets) each with its own reverse-iterate update/dispose loop
(world.js:290-376) + clearTransient copies (861-887); specials.js pushes
into them directly (specials.js:649, 2117, 2333). A generic
addUpdater(tick, end) already exists (world.js:134).

- [x] spawnGeyser/spawnWave/spawnTornado/spawnFlameJet/addFirePatch/
      freezeOverlay all register sticky updaters; damage ticks moved
      verbatim. KEY DISCOVERY: startFinisher's endUpdaters() must NOT
      kill environmental fx (they survive into cinematics; scripts spawn
      their own) → updaters got a {sticky} flag; endUpdaters(false) at
      startFinisher, endUpdaters() [all] at clearTransient. flameJets Map
      kept as retrigger index only; jets self-unindex (guarded so a
      replacement jet isn't unindexed by its predecessor's end()).
- [x] specials.js + finisher.js converted to the spawn APIs. The tornado
      loop's owner-damage branch was DEAD code (no push site ever set
      owner — inferno ult runs its own damage updater) and was dropped.
      freezeOverlay's end() now also disposes geo/mat on round sweeps
      (fixes a small leak; previously only scene.remove).
- [x] Verified: build green; ace soaks cranky/inferno, glacier/tempest,
      titanus/viper all crash:null; finisherdemo loops for inferno
      (flame-jet 'fin' path) 90s and cranky (fx-only geyser) 300s with
      zero page errors.

## Batch D — specials framework + fireRanged table  [ ]

Every move body re-implements: cast scaffold (~20×), AoE sweep (22×),
volley loops, liveness guards. world.fireRanged is a 340-line ~24-case
switch (world.js:510-849).

- [ ] `src/combat/movekit.js`: castAnim(f, clip, {onFire, stateMul}),
      sweepEnemies(w, f, center, r, cb), volley(w, f, n, dt, cb),
      timedUpdater(w, dur, tick, end), stillCasting(f) — thin, documented.
- [ ] Migrate SPECIALS + ULTS bodies onto the kit (mechanical; keep every
      number identical).
- [ ] Fold bakeShell/summonFlash/summonPortal fade-updaters onto
      timedUpdater.
- [ ] fireRanged → WEAPONS[type] handler table (same file ok).
- [ ] Verify: full-roster soak matrix (each mech at least once as p1 or
      p2, auto=1 diff=ace), build green.

## Batch E — fighter.js dedup + balance constants + cycle cut  [ ]

- [ ] Merge updateHeavyHold/updatePunchHold (fighter.js:641/713) into
      updateChargeHold(cfg).
- [ ] Unify 3 block-mitigation blocks in takeHit (1057/1088/1112) into one
      helper. KEEP the two different ult-gain formulas as-is (dmg/3000 vs
      maxHp-scaled) but name them and comment the asymmetry — reconciling
      is a balance change, not a refactor.
- [ ] Hoist inline balance literals to named constants in a TUNING block
      (fighter.js top) or roster where per-mech: hitstun 0.42/0.24,
      weight resist 0.45, soft-tick 0.35, block leak 0.12 (×2), momentum
      bonus, dash/knockdown numbers, rumble magnitudes.
- [ ] Cut fighter↔specials import cycle: specials.js gets Fighter via a
      registration hook (fighter.js calls registerFighterCtor) or move
      raptor-summon spawn to a neutral module.
- [ ] roster.js: move color engine (roster.js:510-573) →
      src/mechs/colorscheme.js; add DIGITIGRADE_REST preset (viper/fenrir
      byte-identical restPose, wraith scaled variant stays explicit).
- [ ] Verify: soak (incl. saurion for raptor summon, aegis for shield
      block, titanus charge), build green.

## Batch F — animator SIGNATURES registry + animations REST_KEY  [ ]

- [ ] animator.signature() 13-case switch (animator.js:479-782) →
      SIGNATURES[id] registry module (src/mechs/signatures.js); keep
      levelHands via a def flag instead of hardcoded ids.
- [ ] animations.js: extract the ~50 verbatim return-to-rest end keys into
      REST_KEY / returnTo(dur) helper.
- [ ] Verify: ?showcase screenshot sweep (all 12 + anim=walk spot checks),
      soak, build green.

## Batch G — finisher sharding  [ ]

- [ ] Split SCRIPTS (finisher.js:384-1493, 18 scripts) into
      src/game/finisher/<id>.js + index that assembles the registry; DSL
      engine stays in finisher.js. Extract shared carry() grip (titanus
      415-429 ≡ colossus 505-517). Move nullbot BSOD HTML to a template
      constant in its own file.
- [ ] Verify: ?finishers debug page (see config.js) screenshots for
      titanus/colossus/nullbot + one soak to KO; build green.

## Batch H — boot extraction + shared createBattle + UI dedupe  [ ]

- [ ] Extract from boot.js: MenuStage (46-242) → src/game/menustage.js,
      PadPointers (275-359) → src/game/padpointers.js, warm-up loader
      (615-834) → src/game/warmup.js, touch zoom guards.
- [ ] Extract createBattle() from boot.startBattle (837-918); reuse in
      dev/battletest.js (currently a drifted copy, battletest.js:24-71).
- [ ] menus.js: shared MenuList helper for Title/Pause/Settings/Results
      vertical lists + the duplicated corner hot-button ring (88-108 vs
      928-950).
- [ ] Move PLAYER_COLORS from fighter.js:56 → src/core/colors.js with
      CSS-hex derivation; update hud.js/menus.js/boot.js/finisher.js
      imports; delete COLOR_CSS duplicates.
- [ ] camera.js: share follow/lock/giant-zoom between updateCombined
      (246-291) and updateSplit (403-436).
- [ ] Verify: menu flow by hand via screenshots (title→mech select→battle,
      pause, results), pad-pointer smoke if feasible, soak, build green.

## Batch I — gltf.js buildGlbMech cleanup + manifest validation  [ ]

- [ ] Extract rescale(k) helper (3 copy-pasted blocks gltf.js:257/353/373);
      hoist <10-bones fallback check to right after mapBones (before
      skinOps/clone/dress work).
- [ ] Consolidate 3 manifest fetch paths (loadManifest/buildGlbForTool/
      fetchRawManifest).
- [ ] Manifest key validation: warn loudly (dev) on unknown keys/bad bone
      names; keep prod fallback-to-procedural behavior.
- [ ] Verify: ?showcase screenshot sweep (all GLB mechs), soak, build.

## Batch J — perf smalls + shader dedupe  [ ]

- [ ] Shared GLSL chunk (hash/vnoise) used by geyserfx/wavefx/nadofx;
      ShaderFX base class for the 4 hero-fx files (uniform plumbing,
      scene add/remove, dispose).
- [ ] specials.js fwd/muzzle/leadPos/aimDir take optional out-vector;
      audit new Vector3 in per-frame callbacks.
- [ ] ParticlePool.emit: avoid per-emit new THREE.Color (effects.js:183).
- [ ] Consider pooling FlameFX (recast often) — only if simple.
- [ ] Verify: soak (ult-heavy matchups), ?showcase FX debug pages, build.

## Log

- 2026-07-20: plan created; branch reset onto main @ 849b648; baseline
  build green.
