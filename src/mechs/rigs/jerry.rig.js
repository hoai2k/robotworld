// JERRY custom rig — a hand-placed skeleton for mech_jerry_alt.glb, which is
// now the OFFICIAL/primary Jerry (the old Tripo mech_jerry.glb moved to the
// `alt` slot). A lobster/shrimp with two big front CLAW-ARMS (the pincers) and
// two back legs, plus a segmented tail and antennae parked on static struts.
//
// FOUR limbs, no more: the two claw-arms carry the game ARM joints (the
// strikers) and the two back legs carry the game LEG joints (the walkers).
// There is NO separate skeleton for the black posts — the back-leg bones are
// simply flagged `post`, so a black metal rod is rendered along the SAME bones
// that skin + animate the legs. Move a leg joint in ?rigedit and its rod moves
// with it; the post is a render-time add-on to the leg rig, not its own thing.
//
// Positions are MESH-LOCAL (raw bind space): +x FORWARD (the claws reach +x),
// +y UP, +z LEFT / -z RIGHT; the tail arches up-back at -x. Tune live in
// ?rigedit=jerry and paste the export back.
export const JERRY_RIG = {
  bones: [
    // ---- body ----
    { name: 'hips', parent: null, pos: [0.00, 0.48, 0.00], bias: 0.55 },
    { name: 'torso', parent: 'hips', pos: [0.02, 0.60, -0.02], bias: 0.45 },
    { name: 'head', parent: 'torso', pos: [0.22, 0.56, 0.00], bias: 0.9 },
    // ---- LEFT claw-arm (+z) ---- (shoulder->elbow->hand->claw pincer tip; the
    //      extra tip bone gives the big pincer its own segment)
    { name: 'shoulderL', parent: 'torso', pos: [-0.05, 0.44, 0.12] },
    { name: 'elbowL', parent: 'shoulderL', pos: [0.11, 0.40, 0.22] },
    { name: 'handL', parent: 'elbowL', pos: [0.38, 0.08, 0.36] },
    { name: 'clawL', parent: 'handL', pos: [0.55, -0.02, 0.44] },
    // ---- RIGHT claw-arm (-z) ----
    { name: 'shoulderR', parent: 'torso', pos: [-0.06, 0.46, -0.13] },
    { name: 'elbowR', parent: 'shoulderR', pos: [0.12, 0.40, -0.23] },
    { name: 'handR', parent: 'elbowR', pos: [0.37, 0.09, -0.37] },
    { name: 'clawR', parent: 'handR', pos: [0.55, -0.01, -0.46] },
    // ---- LEFT back leg (+z) ---- thigh->knee->ankle->foot. `post` on every
    //      segment renders the black rod straight along the leg bones, so the
    //      post and the leg are ONE rig (no separate post skeleton).
    { name: 'thighL', parent: 'hips', pos: [-0.12, 0.44, 0.18], post: true },
    { name: 'kneeL', parent: 'thighL', pos: [-0.30, 0.27, 0.17], post: true },
    { name: 'ankleL', parent: 'kneeL', pos: [-0.36, 0.06, 0.15], post: true },
    { name: 'footL', parent: 'ankleL', pos: [-0.40, -0.06, 0.14], post: true },
    // ---- RIGHT back leg (-z) ----
    { name: 'thighR', parent: 'hips', pos: [-0.12, 0.44, -0.18], post: true },
    { name: 'kneeR', parent: 'thighR', pos: [-0.33, 0.27, -0.15], post: true },
    { name: 'ankleR', parent: 'kneeR', pos: [-0.38, 0.06, -0.17], post: true },
    { name: 'footR', parent: 'ankleR', pos: [-0.42, -0.06, -0.16], post: true },
    // ---- static struts: tail over the back + antennae/spare bits ----
    { name: 'tail', parent: 'torso', pos: [-0.10, 0.86, 0.00], bias: 0.7 },
    { name: 'strutMidL', parent: 'hips', pos: [0.05, 0.42, 0.16] },
    { name: 'strutMidR', parent: 'hips', pos: [0.05, 0.42, -0.16] },
    { name: 'belly', parent: 'hips', pos: [0.00, 0.34, 0.00] },
  ],
};
