// Palette catalog for the level editor. Every placeable thing the game knows
// about, grouped for the palette UI. Prop entries map straight onto PROPS[name]
// in src/arena/props.js; terrain entries (building / hill / bridge / lane) are
// handled specially by the editor. `color: true` surfaces a colour swatch in
// the inspector; the default opts seed the first placement.
//
// This list intentionally covers ALL arena props (so anything that can appear
// in a shipped arena can be placed by hand) plus the editor's new obstacle and
// terrain types.

// shared accent swatches for colourable props/terrain
export const SWATCHES = [
  0x53e8ff, 0xff4dd8, 0x62ff9a, 0xffb43c, 0xff5040,
  0xb46bff, 0xffd23c, 0x2ee6c8, 0x9bff3c, 0xffffff,
];

export const CATALOG = [
  {
    group: 'Structures', items: [
      { id: 'building', label: 'Tower', k: 'building', hint: 'Destructible chunk tower — footprint & height in the inspector' },
    ],
  },
  {
    group: 'Terrain', items: [
      { id: 'hill', label: 'Hill', k: 'hill', deck: false, hint: 'Walkable mound' },
      { id: 'deck', label: 'Platform', k: 'hill', deck: true, color: true, hint: 'Flat-top deck with a glowing edge' },
      { id: 'bridge', label: 'Bridge', k: 'bridge', color: true, hint: 'Destructible causeway with ramps' },
    ],
  },
  {
    group: 'Lanes / streams', items: [
      { id: 'lane_road', label: 'Road', k: 'lane', kind: 'road', style: 'asphalt', dash: 0xffd23c },
      { id: 'lane_water', label: 'Water', k: 'lane', kind: 'water', hint: 'Bogs mechs down' },
      { id: 'lane_lava', label: 'Lava', k: 'lane', kind: 'lava', hint: 'Burns' },
      { id: 'lane_acid', label: 'Acid ✦new', k: 'lane', kind: 'acid', hint: 'Corrosive — burns like lava' },
      { id: 'lane_mud', label: 'Mud ✦new', k: 'lane', kind: 'mud', hint: 'Heavy drag' },
      { id: 'lane_oil', label: 'Oil', k: 'lane', kind: 'oil' },
      { id: 'lane_ice', label: 'Ice', k: 'lane', kind: 'ice', glow: 0x9be8ff },
      { id: 'lane_crystal', label: 'Crystal', k: 'lane', kind: 'crystal', glow: 0xb46bff },
      { id: 'lane_sand', label: 'Sand', k: 'lane', kind: 'sand' },
      { id: 'lane_canal', label: 'Canal', k: 'lane', kind: 'canal', glow: 0x53e8ff },
      { id: 'lane_stripe', label: 'Stripe', k: 'lane', kind: 'stripe', glow: 0x53e8ff },
    ],
  },
  {
    group: 'Obstacles ✦new', items: [
      { id: 'barricade', label: 'Barricade', k: 'prop', name: 'barricade', hint: 'Low destructible cover' },
      { id: 'pillar', label: 'Pillar', k: 'prop', name: 'pillar' },
      { id: 'sentryTurret', label: 'Sentry turret', k: 'prop', name: 'sentryTurret' },
      { id: 'forceWall', label: 'Force wall', k: 'prop', name: 'forceWall', color: true },
      { id: 'mine', label: 'Proximity mine', k: 'prop', name: 'mine', hint: 'Cooks off on contact' },
      { id: 'spikeStrip', label: 'Spike strip', k: 'prop', name: 'spikeStrip', hint: 'Cuts + shoves' },
      { id: 'jumpPad', label: 'Jump pad', k: 'prop', name: 'jumpPad', color: true },
      { id: 'teleporter', label: 'Teleporter', k: 'prop', name: 'teleporter', color: true },
      { id: 'beacon', label: 'Hazard beacon', k: 'prop', name: 'beacon', color: true },
      { id: 'crater', label: 'Blast crater', k: 'prop', name: 'crater' },
    ],
  },
  {
    group: 'Hazards', items: [
      { id: 'fuelTank', label: 'Fuel tank', k: 'prop', name: 'fuelTank', hint: 'Explosive' },
      { id: 'obsidianSpikes', label: 'Obsidian spikes', k: 'prop', name: 'obsidianSpikes' },
      { id: 'campfire', label: 'Campfire', k: 'prop', name: 'campfire' },
      { id: 'lavaPool', label: 'Lava pool', k: 'prop', name: 'lavaPool' },
      { id: 'moltenChannel', label: 'Molten channel', k: 'prop', name: 'moltenChannel' },
    ],
  },
  {
    group: 'Industrial', items: [
      { id: 'smokestack', label: 'Smokestack', k: 'prop', name: 'smokestack' },
      { id: 'gear', label: 'Gear', k: 'prop', name: 'gear' },
      { id: 'crane', label: 'Crane', k: 'prop', name: 'crane' },
      { id: 'magnetCrane', label: 'Magnet crane', k: 'prop', name: 'magnetCrane' },
      { id: 'container', label: 'Container', k: 'prop', name: 'container' },
      { id: 'pipes', label: 'Pipes', k: 'prop', name: 'pipes' },
      { id: 'pistonRig', label: 'Piston rig', k: 'prop', name: 'pistonRig' },
      { id: 'chainHoist', label: 'Chain hoist', k: 'prop', name: 'chainHoist' },
      { id: 'drillRig', label: 'Drill rig', k: 'prop', name: 'drillRig' },
      { id: 'mineCart', label: 'Mine cart', k: 'prop', name: 'mineCart' },
      { id: 'conduit', label: 'Conduit', k: 'prop', name: 'conduit' },
      { id: 'fuelTank2', label: 'Tank', k: 'prop', name: 'fuelTank' },
    ],
  },
  {
    group: 'City', items: [
      { id: 'billboard', label: 'Billboard', k: 'prop', name: 'billboard', color: true },
      { id: 'holoPillar', label: 'Holo pillar', k: 'prop', name: 'holoPillar', color: true },
      { id: 'noodleKiosk', label: 'Noodle kiosk', k: 'prop', name: 'noodleKiosk', color: true },
      { id: 'railSegment', label: 'Rail segment', k: 'prop', name: 'railSegment', color: true },
      { id: 'streetlight', label: 'Streetlight', k: 'prop', name: 'streetlight' },
      { id: 'antennaTower', label: 'Antenna tower', k: 'prop', name: 'antennaTower' },
      { id: 'fountain', label: 'Fountain', k: 'prop', name: 'fountain' },
      { id: 'artSculpture', label: 'Art sculpture', k: 'prop', name: 'artSculpture' },
      { id: 'hvacUnit', label: 'HVAC unit', k: 'prop', name: 'hvacUnit' },
      { id: 'glassRail', label: 'Glass rail', k: 'prop', name: 'glassRail' },
      { id: 'helipad', label: 'Helipad', k: 'prop', name: 'helipad' },
      { id: 'landingPad', label: 'Landing pad', k: 'prop', name: 'landingPad' },
      { id: 'dishArray', label: 'Dish array', k: 'prop', name: 'dishArray' },
      { id: 'cargoPods', label: 'Cargo pods', k: 'prop', name: 'cargoPods' },
      { id: 'radarDome', label: 'Radar dome', k: 'prop', name: 'radarDome' },
      { id: 'barrierPylon', label: 'Barrier pylon', k: 'prop', name: 'barrierPylon', color: true },
    ],
  },
  {
    group: 'Nature & ruins', items: [
      { id: 'tree', label: 'Tree', k: 'prop', name: 'tree' },
      { id: 'canopyTree', label: 'Canopy tree', k: 'prop', name: 'canopyTree' },
      { id: 'rock', label: 'Rock', k: 'prop', name: 'rock', color: true },
      { id: 'crystal', label: 'Crystal', k: 'prop', name: 'crystal', color: true },
      { id: 'ruinColumn', label: 'Ruin column', k: 'prop', name: 'ruinColumn' },
      { id: 'brokenStatue', label: 'Broken statue', k: 'prop', name: 'brokenStatue' },
      { id: 'obelisk', label: 'Obelisk', k: 'prop', name: 'obelisk' },
      { id: 'sarcophagus', label: 'Sarcophagus', k: 'prop', name: 'sarcophagus' },
      { id: 'stoneIdol', label: 'Stone idol', k: 'prop', name: 'stoneIdol' },
      { id: 'vineColumn', label: 'Vine column', k: 'prop', name: 'vineColumn' },
    ],
  },
  {
    group: 'Scrap & harbor', items: [
      { id: 'mechWreck', label: 'Mech wreck', k: 'prop', name: 'mechWreck' },
      { id: 'junkPile', label: 'Junk pile', k: 'prop', name: 'junkPile' },
      { id: 'lighthouse', label: 'Lighthouse', k: 'prop', name: 'lighthouse' },
      { id: 'boatHull', label: 'Boat hull', k: 'prop', name: 'boatHull' },
      { id: 'buoy', label: 'Buoy', k: 'prop', name: 'buoy' },
      { id: 'aurora', label: 'Aurora (ambient)', k: 'prop', name: 'aurora', hint: 'Sky curtain — position is ignored in game' },
    ],
  },
];

// flat lookup by palette id
export const CATALOG_BY_ID = {};
for (const g of CATALOG) for (const it of g.items) CATALOG_BY_ID[it.id] = it;
