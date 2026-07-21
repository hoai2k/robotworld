# Baking GLB edits into the asset (`tools/bake-glb.mjs`)

While a mech is being tuned, its look is driven by **manifest edits** applied at
load — a custom `rig`, `skinOps`, `reparent`, `stretch`, `bonePos`. Once the mech
is **finished**, those edits are permanent intent that belongs *in the `.glb`*, so
the manifest entry shrinks to nothing and the on-disk asset is exactly what the
game renders. `tools/bake-glb.mjs` does that finalization as **one reversible
changelist**.

## What it does

Bakes the geometry/skeleton/skin edits into `public/models/mech_<id>.glb`:

- custom `rig` → the re-skinned skeleton (bones named as game joints) + weights
- `skinOps` → the rebound skin weights
- `reparent` → the fixed bone hierarchy
- `stretch` / `bonePos` → the nudged bind transforms
- Jerry-style `post` rods → baked in as bone-parented geometry
- (custom rig) prunes the dead original auto-rig bones

…then strips those fields from the manifest entry and, for a custom-rig mech,
deletes `src/mechs/rigs/<id>.rig.js` and its line in `rigs/index.js`.

**Not baked (stays in the manifest/code, re-applied on load):** `bindPose`,
`yawOffset`, `heightScale`, `boneCorrections`, `muzzles`, `profileKey`,
`emissiveBoost`. The runtime motion systems — the `RigAdapter` retarget, the
`glbanim` per-mech gait, muzzle anchors — are unchanged; they drive the baked
bones **by name**, so a finalized mech animates exactly as before. Baking freezes
only the bind *pose + skin*.

A baked GLB auto-maps with no `boneOverrides` because its bones are named exactly
as the game joints and every joint name is a top-priority alias in
`rigadapter.js` `BONE_ALIASES`.

## Usage

```
npm run dev                              # dev server on :5175 (required)
node tools/bake-glb.mjs <id>             # DRY RUN — writes mech_<id>.baked.glb,
                                         #   prints fidelity + fields removed,
                                         #   touches no committed file
node tools/bake-glb.mjs <id> --apply     # writes the real changes
```

Both run a **fidelity check**: build the mech pre-bake (custom rig) and post-bake
(baked glb via the stock load path) and compare joint positions *relative to
hips* across several poses. A faithful bake reads ~0 shape deviation; a benign
sub-percent "ground offset" (the mech re-grounds to the floor at runtime) is
reported separately. If the shape deviation exceeds tolerance, **do not commit** —
something didn't round-trip.

After `--apply`, review `git diff` / `git status` and commit:

```
git add -A && git commit -m "Bake <id> GLB: fold rig/skinning into the asset"
```

## Reverting

That commit is the whole changelist: the `.glb`, the manifest entry, and (custom
rig) the rig file + registry line. `git revert <commit>` (or `git checkout` of
those paths) restores the exact prior working state.

This stays safe **forever** because the shared engine — `applyCustomRig`,
`skinOps`, `rigFor`, the joint-name aliases, `RigAdapter` — is **never removed**,
only per-mech data. Even after every mech is baked, reverting any one bake lands
on machinery that still exists.
