// Registry of custom rigs — a hand-placed skeleton that REPLACES a GLB's
// scrambled auto-rig at load (see reskin.js, gltf.js, and the ?rigedit tool).
// Add a mech here once its rig is authored/tuned.
import { CRANKY_RIG } from './cranky.rig.js';

export const RIGS = {
  cranky: CRANKY_RIG,
};

export function rigFor(id) { return RIGS[id] || null; }
