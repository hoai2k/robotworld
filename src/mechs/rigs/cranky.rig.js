// CRANKY custom rig — clean hand-placed skeleton for mech_cranky.glb: two giant
// pincers as real independent arms, plus all SIX crab legs as real bones so the
// GLB profile can drive a hexapod (tripod) walk gait (glbanim.js). Replaces the
// scrambled Tripo auto-rig at load (reskin.js + gltf.js).
//
// Positions are MESH-LOCAL (raw GLB bind space): +x FORWARD (claws/face),
// +y UP, +z LEFT / -z RIGHT. Two legs carry the game leg joints (thighL/ankleL,
// thighR/ankleR) to satisfy the retarget; the other four are extra bones the
// gait drives directly. Positions are the latest ?rigedit=cranky tuning; `bias`
// is re-attached here (the editor's Export emits only name/parent/pos).
export const CRANKY_RIG = {
  bones: [
    // ---- spine ----
    { name: 'hips', parent: null, pos: [-0.05, 0.32, 0.00], bias: 0.5 },
    { name: 'torso', parent: 'hips', pos: [-0.12, 0.55, 0.00], bias: 0.45 },
    { name: 'head', parent: 'torso', pos: [0.02, 0.62, 0.00], bias: 0.8 },
    // ---- LEFT giant claw (+z) as the left arm ---- (bias<1: the claws WIN
    //      their own verts over the nearby front legs, so a stepping leg can't
    //      tear a chunk of pincer off). handL->clawL is the movable pincer jaw,
    //      split out so the pincer can open/close.
    { name: 'shoulderL', parent: 'torso', pos: [0.04, 0.38, 0.14], bias: 0.4 },
    { name: 'elbowL', parent: 'shoulderL', pos: [0.18, 0.33, 0.28], bias: 0.4 },
    { name: 'handL', parent: 'elbowL', pos: [0.27, 0.24, 0.29], bias: 0.4 },
    { name: 'clawL', parent: 'handL', pos: [0.37, 0.18, 0.31], bias: 0.4 },
    // ---- RIGHT giant claw (-z) as the right arm ----
    { name: 'shoulderR', parent: 'torso', pos: [0.04, 0.38, -0.14], bias: 0.4 },
    { name: 'elbowR', parent: 'shoulderR', pos: [0.16, 0.33, -0.25], bias: 0.4 },
    { name: 'handR', parent: 'elbowR', pos: [0.26, 0.23, -0.30], bias: 0.4 },
    { name: 'clawR', parent: 'handR', pos: [0.36, 0.17, -0.32], bias: 0.4 },
    // ==== SIX crab legs. The BACK pair carries the game leg joints and now has
    //      a 4th joint — hip->knee->ankle->foot — so the skin follows the whole
    //      leg; the gait swings the thigh. ====
    // back-left  (game legL)
    { name: 'thighL', parent: 'hips', pos: [-0.13, 0.41, 0.23] },
    { name: 'kneeL', parent: 'thighL', pos: [-0.19, 0.44, 0.42] },
    { name: 'ankleL', parent: 'kneeL', pos: [-0.22, 0.03, 0.46] },
    { name: 'footL', parent: 'ankleL', pos: [-0.23, 0.01, 0.52] },
    // back-right (game legR)
    { name: 'thighR', parent: 'hips', pos: [-0.13, 0.42, -0.22] },
    { name: 'kneeR', parent: 'thighR', pos: [-0.19, 0.44, -0.40] },
    { name: 'ankleR', parent: 'kneeR', pos: [-0.22, 0.05, -0.48] },
    { name: 'footR', parent: 'ankleR', pos: [-0.23, 0.01, -0.54] },
    // mid-left (bias>1 on hip+knee: kept off the pincer base so a step can't
    //          tear the claw)
    { name: 'legMLhip', parent: 'hips', pos: [-0.06, 0.28, 0.09], bias: 1.3 },
    { name: 'legMLknee', parent: 'legMLhip', pos: [-0.06, 0.16, 0.13], bias: 1.3 },
    { name: 'legMLfoot', parent: 'legMLknee', pos: [-0.04, 0.04, 0.15] },
    // front-left
    { name: 'legFLhip', parent: 'hips', pos: [0.00, 0.30, 0.14] },
    { name: 'legFLknee', parent: 'legFLhip', pos: [0.00, 0.23, 0.24] },
    { name: 'legFLfoot', parent: 'legFLknee', pos: [0.00, 0.04, 0.26] },
    // mid-right
    { name: 'legMRhip', parent: 'hips', pos: [-0.02, 0.28, -0.10], bias: 1.3 },
    { name: 'legMRknee', parent: 'legMRhip', pos: [-0.07, 0.16, -0.13], bias: 1.3 },
    { name: 'legMRfoot', parent: 'legMRknee', pos: [-0.05, 0.04, -0.14] },
    // front-right
    { name: 'legFRhip', parent: 'hips', pos: [-0.01, 0.33, -0.12] },
    { name: 'legFRknee', parent: 'legFRhip', pos: [0.00, 0.25, -0.22] },
    { name: 'legFRfoot', parent: 'legFRknee', pos: [-0.01, 0.04, -0.27] },
    // ---- static struts: mouth/underbelly between the claws ----
    { name: 'mouth', parent: 'hips', pos: [0.16, 0.37, 0.00], bias: 0.7 },
    { name: 'belly', parent: 'hips', pos: [-0.11, 0.32, 0.00] },
  ],
};
