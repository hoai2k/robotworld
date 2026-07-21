// CRANKY custom rig — clean hand-placed skeleton for mech_cranky.glb: two giant
// pincers as real independent arms, plus all SIX crab legs as real bones so the
// GLB profile can drive a hexapod (tripod) walk gait (glbanim.js). Replaces the
// scrambled Tripo auto-rig at load (reskin.js + gltf.js).
//
// Positions are MESH-LOCAL (raw GLB bind space): +x FORWARD (claws/face),
// +y UP, +z LEFT / -z RIGHT. Each leg is a hip bone (pivot, at the body) + a
// foot bone (at the ground) so the skin binds along the whole leg and the gait
// swings it from the hip. Two legs carry the game leg joints (thighL/ankleL,
// thighR/ankleR) to satisfy the retarget; the other four are extra bones the
// gait drives directly. Tune live in ?rigedit=cranky.
export const CRANKY_RIG = {
  bones: [
    // ---- spine ----
    { name: 'hips', parent: null, pos: [-0.05, 0.32, 0.00], bias: 0.5 },
    { name: 'torso', parent: 'hips', pos: [-0.12, 0.55, 0.00], bias: 0.45 },
    { name: 'head', parent: 'torso', pos: [0.02, 0.62, 0.00], bias: 0.8 },
    // ---- LEFT giant claw (+z) as the left arm ---- (bias<1: the claws WIN
    //      their own verts over the nearby front legs, so a stepping leg can't
    //      tear a chunk of pincer off)
    { name: 'shoulderL', parent: 'torso', pos: [0.16, 0.30, 0.20], bias: 0.4 },
    { name: 'elbowL', parent: 'shoulderL', pos: [0.30, 0.22, 0.25], bias: 0.4 },
    { name: 'handL', parent: 'elbowL', pos: [0.52, 0.15, 0.28], bias: 0.4 },
    // ---- RIGHT giant claw (-z) as the right arm ----
    { name: 'shoulderR', parent: 'torso', pos: [0.16, 0.30, -0.18], bias: 0.4 },
    { name: 'elbowR', parent: 'shoulderR', pos: [0.32, 0.19, -0.22], bias: 0.4 },
    { name: 'handR', parent: 'elbowR', pos: [0.52, 0.13, -0.27], bias: 0.4 },
    // ==== SIX crab legs (hip pivot -> foot). back pair = game leg joints ====
    // back-left  (game legL)
    { name: 'thighL', parent: 'hips', pos: [-0.08, 0.49, 0.25] },
    { name: 'ankleL', parent: 'thighL', pos: [-0.22, 0.12, 0.46] },
    // back-right (game legR)
    { name: 'thighR', parent: 'hips', pos: [-0.12, 0.48, -0.27] },
    { name: 'ankleR', parent: 'thighR', pos: [-0.22, 0.12, -0.46] },
    // mid-left (kept low/back off the pincer base so a step can't tear the claw)
    { name: 'legMLhip', parent: 'hips', pos: [-0.14, 0.28, 0.26], bias: 1.3 },
    { name: 'legMLfoot', parent: 'legMLhip', pos: [0.00, 0.09, 0.30] },
    // front-left
    { name: 'legFLhip', parent: 'hips', pos: [0.02, 0.30, 0.16] },
    { name: 'legFLfoot', parent: 'legFLhip', pos: [0.08, 0.05, 0.20] },
    // mid-right
    { name: 'legMRhip', parent: 'hips', pos: [-0.14, 0.26, -0.16], bias: 1.3 },
    { name: 'legMRfoot', parent: 'legMRhip', pos: [-0.06, 0.07, -0.18] },
    // front-right
    { name: 'legFRhip', parent: 'hips', pos: [0.02, 0.28, -0.16] },
    { name: 'legFRfoot', parent: 'legFRhip', pos: [0.02, 0.07, -0.26] },
    // ---- static struts: mouth/underbelly between the claws ----
    { name: 'mouth', parent: 'hips', pos: [0.20, 0.22, 0.00], bias: 0.7 },
    { name: 'belly', parent: 'hips', pos: [-0.04, 0.12, 0.04] },
  ],
};
