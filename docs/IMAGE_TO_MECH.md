# Image → In-Engine Mech: the hand-built pipeline

How a concept image becomes a fully rigged, animated, PBR-textured in-game
mech **without external 3D services** — the process used for the canonical
VULCAN rebuild. It trades the concept's microsurface density for zero cost and
full integration; geometry is authored in code against the image, materials
are synthesized to match its palette and wear.

## The five steps

### 1. Palette & material read
Drop the concept PNG in the repo (e.g. `docs/canonical/vulcan-front.png`) and:
```bash
node tools/palette.mjs docs/canonical/vulcan-front.png
```
K-means over the foreground pixels prints the dominant colors with roles
(primary plate / saturated accent / dark frame / glow) and a ready-to-paste
`skin` block for `roster.js`. Then eyeball two more parameters against the
image: `wear` (chip density — how battle-worn is the paint?) and `grime`.

### 2. Skin recipes → PBR texture set
Add the `skin` block to the mech's def in `src/mechs/roster.js`. The factory
then routes materials through `src/core/pbrtex.js` (`mechSkin`), which
synthesizes, per recipe:
- **albedo** — panel-line BSP subdivision, per-panel tone shifts, optional
  two-tone panels (`base2`), fBm paint variation, Worley-clustered paint
  chips (bare metal shows through, concentrated at panel edges), scratches,
  grime pooling along lower panel edges
- **normal map** — Sobel over the synthetic height field (grooves, rivets,
  chip depressions) for subtle geometric shaping without vertices
- **roughness + metalness maps** — painted surfaces vs exposed metal split:
  chips are shiny bare steel (`metalness ~0.95`, low roughness), paint keeps
  a semi-metallic military finish, grime dulls everything it covers

Recipe knobs: `base, base2, metal, wear, grime, panelDepth, roughPaint,
roughMetal, metalPaint, normalStrength, res, seed`.

### 3. Geometry, from the image
Rebuild the mech's design function in `src/mechs/designs.js` using the parts
kit (`src/mechs/parts.js`). Work the image top-to-bottom:
silhouette/proportions first (roster `body` block: scale, torsoW, armLen,
bulk...), then per-region: head → shoulders/back gear → chest → arms/weapons
→ hips → legs → feet. Useful vocabulary: `taper` (armor slabs), `pauldron`,
`barrelCluster`, `vents`, `piston` (brass hydraulics), `blade` (fins/crests),
`ring`, `custom` (one-off parts with a dedicated material — see below).
Attach spinnable/animated bits (gatlings, halos) via `addJoint` and drive
them in `Animator.signature()`.

### 4. Decals & markings
`decalTexture(recipe, {text, emblem, stripes...})` renders unit names,
numbers and emblems over the generated skin, then re-weathers them so they
don't look pasted on. Apply to a dedicated plate with `A.custom(joint,
material, geometry, opts)` — customs stay unmerged so their UVs map the
decal exactly (VULCAN: chest nameplate + "07X" shin plates).

### 5. Verify in-engine, iterate
```
?showcase=<id>&anim=none   # idle close-up (camera is pre-framed for judging)
?showcase=<id>             # cycle every animation on the new body
?battle=uptown&p1=<id>&p2=viper&auto=1   # in-context, in-motion
```
Compare against the concept at each pass. Two or three iterations is normal:
texture scale reads differently in-engine than in your head, and joint-area
geometry needs checking during walk/attack clips (watch for plates
intersecting mid-swing).

## What transfers vs what doesn't

| From the image | Fidelity |
|---|---|
| Palette, two-tone panel scheme | high (measured, not guessed) |
| Battle wear character (chips/grime/scratches) | high |
| Silhouette, proportions, signature elements | high, hand-matched |
| Decals/markings | exact (rendered text/emblems) |
| Panel-line language | stylized approximation |
| Microsurface greeble density | reduced — this is the trade vs Meshy/Tripo |

## Cost of a new mech via this pipeline

~1–3 hours of authoring per mech (VULCAN: recipe 10 min, geometry ~90 min,
3 verify iterations). Zero runtime cost difference: skins are generated once
at load (~50 ms per recipe, cached), geometry stays merged per material.
