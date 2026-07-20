// CRANKY custom rig — a clean, hand-placed skeleton for mech_cranky.glb whose
// bones ARE the game joints, matched to the crab geometry so the two giant
// pincers become real independent arms (shoulder→elbow→hand runs out each
// claw) and the walking legs are real legs. Replaces the scrambled Tripo
// auto-rig at load (see reskin.js + gltf.js).
//
// Positions are MESH-LOCAL (the raw GLB bind space): +x FORWARD (claws/face),
// +y UP, ±z LATERAL (+z = LEFT, -z = RIGHT). Tune live in ?rigedit=cranky and
// paste the exported bones back here.
export const CRANKY_RIG = {
  bones: [
    // ---- spine ---- (bias<1 makes the body bones WIN the big shell so no
    //      shell vertex rides a swinging limb; the claws/legs are far enough
    //      out that they still win their own geometry)
    { name: 'hips', parent: null, pos: [-0.05, 0.32, 0.00], bias: 0.5 },
    { name: 'torso', parent: 'hips', pos: [-0.12, 0.55, 0.00], bias: 0.45 },
    // head sits high at the shell crown: it's what the head-height auto-scale
    // keys on (keep it near the true top), and as a near-static body bone it can
    // own the crown shell harmlessly.
    { name: 'head', parent: 'torso', pos: [0.02, 0.62, 0.00], bias: 0.8 },
    // ---- LEFT giant claw (+z) as the left arm ----
    { name: 'shoulderL', parent: 'torso', pos: [0.16, 0.30, 0.20] },
    { name: 'elbowL', parent: 'shoulderL', pos: [0.30, 0.22, 0.25] },
    { name: 'handL', parent: 'elbowL', pos: [0.52, 0.15, 0.28] },
    // ---- RIGHT giant claw (-z) as the right arm ----
    { name: 'shoulderR', parent: 'torso', pos: [0.16, 0.30, -0.18] },
    { name: 'elbowR', parent: 'shoulderR', pos: [0.32, 0.19, -0.22] },
    { name: 'handR', parent: 'elbowR', pos: [0.52, 0.13, -0.27] },
    // ---- LEFT walking leg (+z, rear) ----
    { name: 'thighL', parent: 'hips', pos: [-0.10, 0.44, 0.30] },
    { name: 'kneeL', parent: 'thighL', pos: [-0.19, 0.34, 0.40] },
    { name: 'ankleL', parent: 'kneeL', pos: [-0.22, 0.12, 0.47] },
    // ---- RIGHT walking leg (-z, rear) ----
    { name: 'thighR', parent: 'hips', pos: [-0.13, 0.43, -0.31] },
    { name: 'kneeR', parent: 'thighR', pos: [-0.20, 0.34, -0.42] },
    { name: 'ankleR', parent: 'kneeR', pos: [-0.22, 0.12, -0.47] },
    // ---- extra static struts (not game joints) so the spare crab legs and
    //      underbelly stay planted instead of following a driven limb ----
    { name: 'strutFrontL', parent: 'hips', pos: [0.06, 0.22, 0.16] },
    { name: 'strutFrontR', parent: 'hips', pos: [0.06, 0.20, -0.16] },
    // mouth/underbelly between the claws — a body bone here keeps that center
    // wedge from being grabbed (and swung) by an arm during a claw thrust
    { name: 'mouth', parent: 'hips', pos: [0.20, 0.22, 0.00], bias: 0.7 },
    { name: 'belly', parent: 'hips', pos: [-0.04, 0.12, 0.04] },
  ],
};
