// JERRY custom rig — a hand-placed skeleton for mech_jerry_alt.glb, which is
// now the OFFICIAL/primary Jerry (the old Tripo mech_jerry.glb moved to the
// `alt` slot). A lobster/shrimp: two big front CLAW-ARMS (the
// pincers), a segmented tail arching over the back, and a nest of walking
// legs. Maps the two claw-arms to the game arm joints so they're the strikers,
// two prominent walking legs to the leg joints, and parks the tail + spare
// legs on static struts. Compared against the current Jerry via ?debug=models
// ("Compare Alternate GLB").
//
// Positions are MESH-LOCAL (raw bind space): +x FORWARD (the claws reach +x),
// +y UP, +z LEFT / -z RIGHT; the tail arches up-back at -x. Tune live in
// ?rigedit=jerry and paste the export back.
//
// Each limb (2 claw-arms, 2 front walking legs, 2 back post-legs) has FOUR
// joints so the skin can follow the whole limb: claw-arms end in a pincer tip
// (clawL/R), front legs in a foot (footL/R), and the under-modeled back legs
// carry a black post through hip->knee->foot->toe.
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
    // ---- LEFT walking leg (+z, forward-side) ---- thigh->knee->ankle->foot
    { name: 'thighL', parent: 'hips', pos: [-0.12, 0.44, 0.18] },
    { name: 'kneeL', parent: 'thighL', pos: [-0.30, 0.27, 0.17] },
    { name: 'ankleL', parent: 'kneeL', pos: [-0.36, 0.06, 0.15] },
    { name: 'footL', parent: 'ankleL', pos: [-0.40, -0.06, 0.14] },
    // ---- RIGHT walking leg (-z, forward-side) ----
    { name: 'thighR', parent: 'hips', pos: [-0.12, 0.44, -0.18] },
    { name: 'kneeR', parent: 'thighR', pos: [-0.33, 0.27, -0.15] },
    { name: 'ankleR', parent: 'kneeR', pos: [-0.38, 0.06, -0.17] },
    { name: 'footR', parent: 'ankleR', pos: [-0.42, -0.06, -0.16] },
    // ---- BACK LEGS (rear pair of the quadruped). The GLB never modeled these,
    //      so each bone is flagged `post` — a black metal rod is wired through
    //      hip -> knee -> foot from the joint positions, and it follows the
    //      bones as they animate (and re-wires if you move/add joints in
    //      ?rigedit). 3 joints each. ----
    { name: 'backLhip', parent: 'hips', pos: [-0.20, 0.40, 0.14], post: true },
    { name: 'backLknee', parent: 'backLhip', pos: [-0.30, 0.16, 0.16], post: true },
    { name: 'backLfoot', parent: 'backLknee', pos: [-0.34, -0.16, 0.18], post: true },
    { name: 'backLtoe', parent: 'backLfoot', pos: [-0.36, -0.34, 0.19], post: true },
    { name: 'backRhip', parent: 'hips', pos: [-0.20, 0.40, -0.14], post: true },
    { name: 'backRknee', parent: 'backRhip', pos: [-0.30, 0.16, -0.16], post: true },
    { name: 'backRfoot', parent: 'backRknee', pos: [-0.34, -0.16, -0.18], post: true },
    { name: 'backRtoe', parent: 'backRfoot', pos: [-0.36, -0.34, -0.19], post: true },
    // ---- static struts: tail over the back + spare legs/antennae ----
    { name: 'tail', parent: 'torso', pos: [-0.10, 0.86, 0.00], bias: 0.7 },
    { name: 'strutMidL', parent: 'hips', pos: [0.05, 0.42, 0.16] },
    { name: 'strutMidR', parent: 'hips', pos: [0.05, 0.42, -0.16] },
    { name: 'belly', parent: 'hips', pos: [0.00, 0.34, 0.00] },
  ],
};
