// GLACIER custom rig — a clean humanoid skeleton for mech_glacier.glb, matched
// to the model so it can be compared (as the manifest `alt`, same GLB file)
// against the stock Tripo rig in ?debug=models. Glacier is a big biped brawler.
//
// Positions are MESH-LOCAL (raw bind space): +x FORWARD (toes), +y UP,
// +z LEFT / -z RIGHT. Tune live in ?rigedit=glacier and paste the export back.
export const GLACIER_RIG = {
  bones: [
    // ---- spine (bias<1 so the torso/hips own the chest & armor, not a limb)
    { name: 'hips', parent: null, pos: [-0.02, 0.42, 0.00], bias: 0.5 },
    { name: 'torso', parent: 'hips', pos: [-0.02, 0.58, 0.00], bias: 0.4 },
    { name: 'head', parent: 'torso', pos: [0.02, 0.78, 0.00], bias: 1.3 },
    // ---- LEFT arm (+z) ----
    { name: 'shoulderL', parent: 'torso', pos: [-0.08, 0.62, 0.24] },
    { name: 'elbowL', parent: 'shoulderL', pos: [-0.04, 0.50, 0.31] },
    { name: 'handL', parent: 'elbowL', pos: [0.04, 0.30, 0.33] },
    // ---- RIGHT arm (-z) ----
    { name: 'shoulderR', parent: 'torso', pos: [-0.08, 0.62, -0.26] },
    { name: 'elbowR', parent: 'shoulderR', pos: [-0.04, 0.50, -0.32] },
    { name: 'handR', parent: 'elbowR', pos: [0.04, 0.30, -0.33] },
    // ---- LEFT leg (+z) ----
    { name: 'thighL', parent: 'hips', pos: [-0.02, 0.45, 0.13] },
    { name: 'kneeL', parent: 'thighL', pos: [-0.01, 0.22, 0.15] },
    { name: 'ankleL', parent: 'kneeL', pos: [-0.02, 0.05, 0.18] },
    // ---- RIGHT leg (-z) ----
    { name: 'thighR', parent: 'hips', pos: [-0.03, 0.46, -0.14] },
    { name: 'kneeR', parent: 'thighR', pos: [-0.02, 0.21, -0.17] },
    { name: 'ankleR', parent: 'kneeR', pos: [-0.03, 0.04, -0.19] },
  ],
};
