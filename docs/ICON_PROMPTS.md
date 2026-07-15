# Character icon-badge generation prompts

Prompts for creating flat icon badges for the 16 mechs with an image
generator (Midjourney / DALL-E / Ideogram / Stable Diffusion etc.), as an
alternative to the rendered portraits in `public/thumbs/`.

## How to use

1. Combine the **master style prompt** with ONE character line below.
2. Generate at 1024×1024, then downscale to 256×256 (`public/thumbs/<id>.png`
   — same filename replaces the rendered portrait everywhere automatically).
3. Keep the whole set in one session/seed where possible so the style stays
   consistent across all 16 badges.

## Master style prompt

> A flat vector emblem badge for a video game character-select screen: a
> stylized robot mech head-and-shoulders bust in bold geometric shapes,
> centered inside a rounded-square badge with a thin glowing rim. Clean
> anime-mecha style, strong silhouette, 2–3 tone cel shading, subtle inner
> glow, dark navy background (#0a121c). No text, no letters, no watermark.
> Crisp edges, reads clearly at 64×64 pixels. — Character: {CHARACTER}

## Character lines (fill {CHARACTER})

| id | prompt line |
|----|-------------|
| titanus | a colossal siege-mech bust in mustard yellow armor (#bd9226) with black hazard stripes, small glowing orange eyes (#ffa832), massive squared shoulder pauldrons, radiating turbine core on the chest |
| vulcan | a bone-white gunner mech (#cfc9bd) with oxide-red panels (#9c2f28), single wide orange visor (#ff8c30), twin gatling barrel pods rising behind the shoulders |
| aegis | a white-and-gold paladin knight mech (#d0d4da / #c9a542), blue glowing visor (#3f8cff), tall crowned helm, the top edge of a gold-trimmed tower shield with a cross motif in front of one shoulder |
| viper | a slim purple ninja assassin mech (#4a3566) with black accents, narrow venom-green visor slit (#5aff2e), two tall swept horn blades on the helm, a green energy dagger edge glinting beside the cheek |
| nova | an elegant white oracle mech (#d2d6de) with teal panels (#3e7a78), a broken magenta glowing halo ring floating behind the head (#ff3ce8), serene single-eye faceplate, star-staff tip beside the shoulder |
| rhino | a battered gunmetal bull mech (#5c6066) with rust-red plates (#8c3a32), one huge forward-curving chrome horn on the nose, tiny furious red eyes (#ff2a20), steam from the nostril vents |
| tempest | a deep-blue storm dancer mech (#2a3560), sleek aerodynamic helm, electric cyan visor and lightning-bolt crest (#3fd8ff), crackling arc sparks around the shoulders |
| fenrir | a silver wolf mech (#b4b9c0) with a spiked blade-mane ruff around the neck, long muzzle with bared chrome fangs, ice-blue eyes (#6cd8ff), ears swept back |
| colossus | a sand-tan artillery fortress mech (#a08a64) with black stripes, low bunker-slit visor glowing amber (#ffc23c), twin mortar tubes angled up behind the shoulders |
| wraith | a gaunt near-black reaper mech (#232228), tall pointed cowl, void face with ONE glowing red eye (#ff2030), tattered blade-strip cloak fanning out like wings |
| inferno | a scorched rust-red demolition mech (#8a3626) with soot-black plates, wide grinning furnace-grille mouth glowing orange (#ff8a1e), small flame crest on the helm |
| glacier | a pale ice-blue fortress mech (#9fb2c2), frost-rimmed angular helm, cold cyan visor (#7ce0ff), crystalline ice spikes growing off one pauldron |
| cranky | a rust-orange deep-sea crab mech (#a64a28) with blue-steel water tanks on the shoulders (#46759e), four glowing blue LED eyes in a row (#4fc3ff), giant pincer claw raised beside the head |
| saurion | a gunmetal-black raptor mech (#33343a), long predatory jaw with chrome teeth, single burning red eye and core glow (#ff2418), blade-feather crest sweeping back |
| frogger | a lime-green frog mech (#7cb420) with black joint frame, two big glass-dome bug eyes with green glow (#aef23c), dripping translucent slime on the plates |
| jerry | a weathered coral-pink shrimp mech (#b9816b) with olive seam bands, red bead eyes (#ff2818), segmented carapace helm with long antennae curving forward |

## Notes

- Palette hexes come from `src/mechs/roster.js` (`colors.primary/accent/glow`)
  — if a mech is repainted, update the line here.
- If the generator struggles with "no text", add a negative prompt:
  `text, letters, words, watermark, signature, photorealistic, 3d render`.
- For engine-consistency, the rendered-portrait route stays available:
  `node tools/thumbs.mjs` (dev server running) regenerates all portraits
  from the live models.
