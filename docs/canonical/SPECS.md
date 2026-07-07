# Canonical image specs — the visual read of all 12 concept images

The user-supplied canonical concept images are the source of truth for each
mech's look. **Commit the PNGs here as `<mechId>-front.png`** (they exist in
the design conversation; an AI session cannot save chat images itself).
Until/alongside that, this file records the detailed image-derived spec each
rebuild was built from — palettes are already baked into `roster.js` skin
recipes, geometry into `src/mechs/designs/<id>.js`. If a design ever needs
re-doing, work from the image if present, else from this spec.

Shared traits across all 12 images: full-body front view on plain gray
studio background, realistic PBR materials, panel lines, per-mech unit
decals (names/numbers/emblems), one or two emissive accent colors.

---

## titanus — mustard/crane-yellow over gunmetal, amber glow (0xffa832)
Gorilla mass rhythm: enormous arms, segmented multi-knuckle fists hanging to
knee height (each ≈1.5× head width), forearm drums thicker than thighs.
Sloped slab pauldrons (~30° out-down) with black/yellow hazard chevrons;
"TITANUS" decal on left pauldron side, emblem right. Broad chest tapering to
a narrow banded waist (dark vertebra rings) over a pelvis block with small
TITANUS crotch plate. Round amber reactor lens dead-center chest, ringed by
8 radial dark armor petals. Small sunken blocky head, wide amber T/Y-visor,
barely above the chest line. Twin RECTANGULAR radiator towers (vent grilles)
rising behind the head. Stocky legs, stacked shin guards, huge flat treaded
feet. Wear: 0.7, chips everywhere, heavy grime.

## vulcan — bone-white + oxide red over gunmetal, orange visor (0xff8c30), red lenses (0xff2822)
Heavy fire-support: broad chest with white slabs and red center plate
("VULCAN" + chevron emblem). Twin six-barrel GATLING FOREARMS (chrome
cluster + center barrel, brass wrist rings, dark muzzle ring). Quad missile
TOWERS flanking a small crested head: each an oct-facet column, red cap,
2×2 launch tubes with red lens spheres. Head: small white face, orange
visor strip, red crest (center blade + swept side antlers). Red hip skirt,
layered white shin guards, red outer calf plates with "07X", broad two-toe
feet. Wear: 0.4-0.48.

## aegis — silver-white + polished gold, blue crystal glow (0x3f8cff)
Cathedral knight, pristine. TWIN HERALDIC BANNER PODS above/behind the
shoulders: tall flat white panels with gold border frames, gold cross
emblems, cross finials, corner tassels (~1.4× head height above shoulders).
Crowned helm: dome + glowing blue V-visor + tall thin central spire + crown
ring of gold spikes. Chest: faceted glowing blue crystal (elongated
octahedron) in gold ray housing; "AEGIS" decal upper-left. Long white/gold
front TABARD to between the knees (gold cross). Grand layered tower shield
on left forearm (elongated hex, 3-4 gold-bordered panels, cross, "AEGIS"
text, blue gems) nearly torso+hips tall. Lance: dark segmented shaft, gold
collar, large blue crystalline blade tip. Gold-trimmed greaves/sabatons.

## viper — purple (0x4a3566) + black, neon green (0x5aff2e) — Eva-01 energy
Everything tapers to points. Arrowhead helm: pointed chin, green V-visor,
TWO tall vertical crown horn-blades (~1.5 head heights) + side spikes.
Layered pointed pauldrons swept up-out; "07" left, "02" right. Angular
layered chest over black under-suit, green glow slits between layers,
"VIPER" + snake emblem decals. Hard-pinched black waist, segmented abdomen.
Slim arms; LONG GREEN ENERGY DAGGERS mounted UNDER each forearm pointing
down-forward past the clawed black hands (~2.2× forearm length, on the
bladeL/R joints). Long digitigrade legs, knee spikes, "07" thigh plate,
3-toed claw feet with steel talons + dew claw.

## nova — white + DEEP teal (0x3e7a78) + gold filigree, magenta glow (0xff3ce8)
Elegant oracle, near-pristine. TWO large CRESCENT halo panels (white/teal,
gold trim) floating symmetrically behind/above the head, tips inward-up —
built on the spinning `halo` joint. Featureless egg-dome head with only a
thin vertical magenta slit; tall ornate crown spire (~1.5 head heights,
gold+white, magenta gem); small teal temple fins. Slim chest with radiant
MAGENTA STAR core (glow ball + 4 radiating blades + gold ring) in teal
inlay. Floor-length flowing robe skirt: 6-8 large beveled panels, white/gold
alternating with deep teal, longer at back, OPEN front showing slender inner
frame. Staff taller than shoulder: silver shaft, head = gold ring containing
a magenta starburst framed by two white crescents, spike finial, gem
counterweight. Slender legs, heeled boots, articulated silver hands.

## rhino — dark gunmetal (0x5c6066) + oxide red (0x8c3a32), red glow (0xff2a20)
Spiked siege beast, wrecked and riveted (wear 0.72+, rivet studs along all
plate edges). Signature: massive rounded armored CARAPACE DOME behind/above
the head (~1.3× torso width) ringed by a crown of steel spikes (10-14 up/out
+ inner ring of smaller ones). Rhino faceplate low between shoulders: big
central CHROME HORN (stacked cones, slight up-curve) + two smaller side
horns, red glowing eyes under heavy brow, vertical grill jaw. Chest pentagon
housing with RED GLOWING rhino-skull sigil. Enormous rounded spiked
pauldrons: "07" decal left, "RHINO" right, red panels. Huge layered arms,
spiked elbows, giant studded fists. Extremely thick layered legs, wide
stance, red glow seams at plate joins.

## tempest — deep navy (0x2a3560) hex-panel + dark steel, cyan glow (0x3fd8ff)
Storm knight (mid-heavy, bulkier than a "dancer"). Angular helm with cyan
V-visor and a tall glowing LIGHTNING-BOLT CREST (zigzag blade ~1.3 head
heights). Large angular pauldrons with pointed drooping outer tips:
"TEMPEST" decal right, "07" left; TESLA SPIRES (stacked tapering discs,
glow tip) rising behind each. Chest: V-housing with cyan core + jagged glow
strips (lightning) inside, glow slit vents flanking, winged emblem decal.
Bulky forearms each wrapped by THREE GLOWING CYAN RINGS; dark claw hands;
"T-07" decals on forearm/thighs. Layered legs with glow slits, swept fin
blades on outer calves near ankles, armored feet with glow toe slit.

## fenrir — bright bare-silver (0xb4b9c0) + dark steel, ice-blue glow (0x6cd8ff)
Full werewolf, mostly raw polished metal (metalPaint 0.62). Detailed wolf
head (~1.4× head unit): faceted cranium, long snarling snout, OPEN jaw with
upper+lower steel fangs, black nose, fierce ice-blue slanted eyes, tall
two-layer ears. Big spiked MANE RUFF framing head to shoulders (2-3
overlapping rows of long blade-spikes). V-tapered muscle-like chest plates,
exposed dark neck/abdomen mechanics with blue accents, wolf emblem decal;
"09" left pauldron, "12" right (compact pauldrons — mane dominates).
Muscular arms; hands with LONG curved steel talons (~0.5 forearm length).
Digitigrade muscular legs, blade shin guards, 3-clawed feet + dew claw.
Long thick armored tail (scale plates) ending in a large curved BLADE tip,
low S-curve, ~1.6× torso height.

## colossus — desert tan (0xa08a64) + dark gunmetal, amber glow (0xffc23c)
Headless walking fortress (MechWarrior Atlas/Catapult energy). Amber VISOR
SLIT embedded top-center torso under a shallow armored dome + antenna — no
neck/head silhouette. TWIN GIANT CANNON TUBES on the back in a V (up-out
~30°, each ~1.6× torso height, banded segments, dark flared muzzles) on the
pitching `mortars` joint. Chest front: GRID OF AMMO POUCHES (rows of rounded
capsules, 4×3-4) like sandbags; below, heavy hatches with hand-scrawled
TALLY-MARK graffiti decals. Huge drum pauldrons: "COLOSSUS 01" left, skull
emblem right. Massive arms, giant three-finger fists. Heavy central waist
hatch with warning triangle + hooks; thick side skirts. Enormous layered
legs, feet wider than thighs. Wear 0.66 + grime; hazard accents.

## wraith — near-black (0x232228), sparse red glow (0xff2030)
Gaunt reaper. Tall POINTED HOOD cowl rising to a sharp peak, draping to the
shoulders; black void face inside with ONE small red eye. Dominant element:
huge TATTERED CLOAK of jagged layered blade-strips from a shoulder yoke down
to shin height, 2-3 layers deep, swallowing the torso (front shows only a
narrow V-chest between cloak edges). Skeletal torso: V-chest plate, red
seams, exposed spine rings + rib arcs, pinched waist. Skeletal arms with
long articulated finger claws. ENORMOUS railgun (near mech height) held
vertically in the right hand: twin/triple rails with spacer rings, tall
receiver, stock, scope, red charge seam ("WR-110" stencil). Extremely thin
digitigrade legs, blade shins, spiked two-claw toes + rear spur.

## inferno — rust red (0x8a3626) + blackened steel, orange glow (0xff8a1e)
Grinning furnace juggernaut, the most worn of all (wear 0.75, grime 0.7).
Rounded helm whose face is a fiery jack-o-lantern: orange glowing eyes +
huge GRINNING MOUTH GRILL (dark teeth slats over orange glow). "INFERNO"
nameplate band above a HUGE riveted FURNACE GRILL dominating the chest:
heavy dark frame, 5-7 vertical bars over raging fire glow. Two big rounded
BOILER TANKS on the back (black, band rings, hazard-diamond decals), domes
visible over the shoulders, feed pipes to the arms. Boxy slab pauldrons
(hazard edges, "09" left, flame-skull emblem right) each topped by a CHIMNEY
pipe with small flames licking out. Heavy segmented arms with pistons/hoses
ending in flamethrower bells with pilot flames. Massive riveted legs, thigh
emblems, hazard shin bands, huge stompers.

## glacier — pale ice-blue (0x9fb2c2) with WHITE FROST patches, gunmetal frame, cyan glow (0x7ce0ff)
Frost fortress (second-widest after colossus). Giant slab pauldrons:
"GLACIER" decal left, "08" right, each CROWNED with clusters of large
translucent ICE CRYSTALS (4-6 cones, tallest ~0.8 head height); more small
crystals on upper back. Low embedded head: cyan visor of two horizontal glow
bars with a dark center grill, heavy brow, frost-mist breath from face
vents, small antenna. RIGHT forearm = long multi-segment CRYO CANNON:
stacked drum segments, translucent glowing COIL CORE section wrapped in
metal rings, dark collar, 2-3 long frost prongs around a recessed glow
muzzle (reaches mid-shin). Left arm: heavy gauntlet fist. Broad frosted
hex-plate chest with snowflake emblem; cyan abdomen slits; thick skirts;
enormous hex-plated legs and huge flat feet. Crystals translucent, NOT
emissive; wear 0.5 with light frost mottling (white base2 patches).
