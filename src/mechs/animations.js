// Keyframe clips for combat & personality. Angles in DEGREES for authoring;
// compiled to radians. hipsPos is in meters at scale=1 (multiplied by mech scale).
//
// Joint conventions (mech faces +Z, limbs hang -Y):
//   shoulder.x negative  -> arm swings forward/up
//   elbow.x negative     -> elbow flexes forward
//   thigh.x negative     -> leg swings forward
//   knee.x positive      -> knee bends (shin back)
//   torso.y negative     -> right shoulder comes forward
//   shoulderL.z negative -> left arm flares outward (mirror for R)

export const UPPER_JOINTS = [
  'torso', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR',
];

// key: { t, ease?, pose: { joint: [x,y,z] | hipsPos: [x,y,z] | hipsRot: [x,y,z] } }
const CLIPS_RAW = {
  // ---------- personality ----------
  intro: {
    dur: 2.3,
    keys: [
      { t: 0, pose: { hipsPos: [0, -1.5, 0], torso: [42, 0, 0], head: [-30, 0, 0], shoulderL: [20, 0, -14], shoulderR: [20, 0, 14], elbowL: [-30, 0, 0], elbowR: [-30, 0, 0], kneeL: [95, 0, 0], kneeR: [95, 0, 0], thighL: [-52, 0, 0], thighR: [-52, 0, 0], ankleL: [-40, 0, 0], ankleR: [-40, 0, 0] } },
      { t: 0.55, ease: 'inOutQuad', pose: { hipsPos: [0, -1.4, 0], torso: [40, 0, 0], head: [-28, 0, 0] } },
      { t: 1.25, ease: 'outCubic', pose: { hipsPos: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0] } },
      { t: 1.6, ease: 'outBack', pose: { shoulderL: [-15, 0, -30], shoulderR: [-15, 0, 30], elbowL: [-115, 0, 0], elbowR: [-115, 0, 0], torso: [-6, 0, 0], head: [6, 0, 0] } },
      { t: 2.3, ease: 'inOutQuad', pose: { shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], torso: [0, 0, 0], head: [0, 0, 0] } },
    ],
    events: [{ t: 1.55, type: 'sfx', arg: 'powerup' }],
  },
  victory: {
    dur: 2.6, hold: true,
    keys: [
      { t: 0, pose: {} },
      { t: 0.4, ease: 'outBack', pose: { shoulderR: [-165, 0, 18], elbowR: [-20, 0, 0], torso: [-10, 0, -6], head: [-12, 0, 0], shoulderL: [10, 0, -18], elbowL: [-30, 0, 0] } },
      { t: 0.8, ease: 'inOutQuad', pose: { shoulderR: [-150, 0, 14] } },
      { t: 1.1, ease: 'outBack', pose: { shoulderR: [-168, 0, 18] } },
      { t: 2.0, ease: 'inOutQuad', pose: { shoulderR: [-150, 0, 25], elbowR: [-115, 0, 0], torso: [-6, 0, 0] } },
    ],
    events: [{ t: 0.35, type: 'sfx', arg: 'powerup' }],
  },
  taunt: {
    dur: 1.3,
    keys: [
      { t: 0, pose: {} },
      { t: 0.3, ease: 'outQuad', pose: { torso: [14, 12, 0], head: [-10, -10, 0], shoulderR: [-72, 0, 16], elbowR: [-70, 0, 0] } },
      { t: 0.55, ease: 'inOutQuad', pose: { elbowR: [-30, 0, 0] } },
      { t: 0.75, ease: 'inOutQuad', pose: { elbowR: [-75, 0, 0] } },
      { t: 1.3, ease: 'inOutQuad', pose: { torso: [0, 0, 0], head: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0] } },
    ],
    events: [{ t: 0.35, type: 'sfx', arg: 'taunt' }],
  },

  // ---------- melee ----------
  // exaggerated wind-ups, full-body twist (hipsRot), side leans and outBack
  // overshoot on the strikes — snappy anime energy instead of stiff robots.
  light1: { // left jab — a REAL pull-back first (fist chambers, hips coil
    // right), then the whip through the punch
    dur: 0.52,
    keys: [
      { t: 0, pose: {} },
      { t: 0.11, ease: 'outCubic', pose: { torso: [6, -22, -6], hipsRot: [0, -10, 0], shoulderL: [-26, 8, -20], elbowL: [-112, 0, 0], shoulderR: [10, 0, 18], head: [0, 10, 0] } },
      { t: 0.23, ease: 'outBack', pose: { torso: [10, 26, 8], hipsRot: [0, 14, 0], hipsPos: [0, -0.12, 0], shoulderL: [-98, -14, 24], elbowL: [-4, 0, 0], shoulderR: [18, 0, 26], head: [0, -12, 0] } },
      { t: 0.34, ease: 'inOutQuad', pose: { torso: [7, 18, 5], hipsRot: [0, 10, 0], shoulderL: [-84, -10, 18], elbowL: [-24, 0, 0] } },
      { t: 0.52, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], shoulderR: [0, 0, 10], head: [0, 0, 0] } },
    ],
    events: [{ t: 0.2, type: 'sfx', arg: 'whoosh' }, { t: 0.23, type: 'hit', arg: 0 }],
  },
  light2: { // right cross — chambers deep behind the shoulder, then the
    // counter-twist throws it through
    dur: 0.56,
    keys: [
      { t: 0, pose: {} },
      { t: 0.12, ease: 'outCubic', pose: { torso: [7, 24, 6], hipsRot: [0, 12, 0], shoulderR: [-30, -8, 22], elbowR: [-116, 0, 0], shoulderL: [12, 0, -20], head: [0, -10, 0] } },
      { t: 0.25, ease: 'outBack', pose: { torso: [10, -30, -8], hipsRot: [0, -16, 0], hipsPos: [0, -0.14, 0], shoulderR: [-100, 14, -24], elbowR: [-2, 0, 0], shoulderL: [20, 0, -28], head: [0, 12, 0] } },
      { t: 0.37, ease: 'inOutQuad', pose: { torso: [7, -20, -5], hipsRot: [0, -11, 0], shoulderR: [-86, 10, -18], elbowR: [-22, 0, 0] } },
      { t: 0.56, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], shoulderL: [0, 0, -10], head: [0, 0, 0] } },
    ],
    events: [{ t: 0.22, type: 'sfx', arg: 'whoosh' }, { t: 0.25, type: 'hit', arg: 1 }],
  },
  light3: { // rising uppercut — deep coil, launch onto tiptoes, arm at full stretch
    dur: 0.62,
    keys: [
      { t: 0, pose: {} },
      { t: 0.18, ease: 'inOutCubic', pose: { hipsPos: [0, -0.7, 0], hipsRot: [0, 16, 0], torso: [30, 20, -10], head: [8, -8, 0], shoulderR: [22, 0, 14], elbowR: [-130, 0, 0], shoulderL: [-20, 0, -30], elbowL: [-40, 0, 0], kneeL: [55, 0, 0], kneeR: [55, 0, 0], thighL: [-28, 0, 0], thighR: [-28, 0, 0] } },
      { t: 0.32, ease: 'outBack', pose: { hipsPos: [0, 0.35, 0], hipsRot: [0, -14, 0], torso: [-24, -22, 8], head: [-14, 6, 0], shoulderR: [-150, 10, 6], elbowR: [-10, 0, 0], shoulderL: [10, 0, -36], elbowL: [-60, 0, 0], kneeL: [4, 0, 0], kneeR: [12, 0, 0], thighL: [6, 0, 0], thighR: [-8, 0, 0], ankleL: [22, 0, 0], ankleR: [22, 0, 0] } },
      { t: 0.62, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], hipsRot: [0, 0, 0], torso: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], head: [0, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0] } },
    ],
    events: [{ t: 0.27, type: 'sfx', arg: 'whooshBig' }, { t: 0.3, type: 'hit', arg: 2 }],
  },
  // ---------- VIPER: ninja sword forms ----------
  // blade-led arcs and lunging thrusts: the elbow stays near-straight so the
  // forearm energy daggers LEAD every move — never a punch holding a sword.
  viperSlash1: { // right blade: draws BACK across the far shoulder first,
    // then the horizontal right-to-left cut across the throat line
    dur: 0.5,
    keys: [
      { t: 0, pose: {} },
      { t: 0.1, ease: 'outCubic', pose: { torso: [4, 30, 5], hipsRot: [0, 14, 0], head: [0, -14, 0], shoulderR: [-62, 42, 30], elbowR: [-26, 0, 0], handR: [0, 0, 35], shoulderL: [12, 0, -22], elbowL: [-40, 0, 0] } },
      { t: 0.22, ease: 'outBack', pose: { torso: [8, -34, -7], hipsRot: [0, -17, 0], hipsPos: [0, -0.12, 0], head: [0, 14, 0], shoulderR: [-96, -30, -20], elbowR: [-3, 0, 0], handR: [0, 0, -30], shoulderL: [18, 0, -28] } },
      { t: 0.34, ease: 'inOutQuad', pose: { torso: [6, -24, -5], hipsRot: [0, -12, 0], shoulderR: [-88, -24, -14] } },
      { t: 0.5, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], head: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], handR: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0] } },
    ],
    events: [{ t: 0.19, type: 'sfx', arg: 'slash' }, { t: 0.22, type: 'hit', arg: 0 }],
  },
  viperSlash2: { // left blade: drops to the hip first, then the rising
    // reverse diagonal — low hip to high shoulder
    dur: 0.54,
    keys: [
      { t: 0, pose: {} },
      { t: 0.11, ease: 'outCubic', pose: { torso: [10, -30, -6], hipsRot: [0, -14, 0], hipsPos: [0, -0.16, 0], head: [0, 12, 0], shoulderL: [-30, -40, -38], elbowL: [-20, 0, 0], handL: [0, 0, -35], shoulderR: [14, 0, 24], elbowR: [-45, 0, 0] } },
      { t: 0.23, ease: 'outBack', pose: { torso: [-6, 32, 8], hipsRot: [0, 16, 0], hipsPos: [0, 0.05, 0], head: [-6, -12, 0], shoulderL: [-124, 26, 18], elbowL: [-4, 0, 0], handL: [0, 0, 30], shoulderR: [20, 0, 30] } },
      { t: 0.36, ease: 'inOutQuad', pose: { torso: [-4, 22, 6], hipsRot: [0, 11, 0], shoulderL: [-112, 20, 14] } },
      { t: 0.54, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], handL: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0] } },
    ],
    events: [{ t: 0.2, type: 'sfx', arg: 'slash' }, { t: 0.23, type: 'hit', arg: 1 }],
  },
  viperStab: { // combo ender: coiled low, then a full-body lunging skewer
    dur: 0.6,
    keys: [
      { t: 0, pose: {} },
      { t: 0.14, ease: 'inOutCubic', pose: { torso: [6, 30, 0], hipsRot: [0, 16, 0], hipsPos: [0, -0.3, -0.1], head: [0, -14, 0], shoulderR: [-28, 20, 14], elbowR: [-98, 0, 0], handR: [0, 0, 20], shoulderL: [-14, 0, -30], elbowL: [-55, 0, 0], thighL: [-30, 0, 0], kneeL: [50, 0, 0], thighR: [12, 0, 0], kneeR: [30, 0, 0] } },
      { t: 0.28, ease: 'outBack', pose: { torso: [24, -26, -4], hipsRot: [4, -14, 0], hipsPos: [0, -0.34, 0.3], head: [-10, 12, 0], shoulderR: [-94, -8, 2], elbowR: [0, 0, 0], handR: [0, 0, 0], shoulderL: [18, 0, -34], elbowL: [-30, 0, 0], thighL: [-48, 0, 0], kneeL: [58, 0, 0], thighR: [26, 0, 0], kneeR: [60, 0, 0], ankleR: [24, 0, 0] } },
      { t: 0.42, ease: 'inOutQuad', pose: { torso: [20, -20, -3], hipsPos: [0, -0.3, 0.24] } },
      { t: 0.6, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], head: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], handR: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], thighL: [0, 0, 0], kneeL: [0, 0, 0], thighR: [0, 0, 0], kneeR: [0, 0, 0], ankleR: [0, 0, 0] } },
    ],
    events: [{ t: 0.24, type: 'sfx', arg: 'whoosh' }, { t: 0.28, type: 'hit', arg: 2 }],
  },
  viperWhirl: { // BLADE CYCLONE carriage (upper-body only, so the LEGS keep
    // walking underneath): both swords thrown out level like rotor blades,
    // arms see-sawing so the cuts carve different heights — the special
    // spins the torso joint post-pose, IG-11 style
    dur: 0.5, loop: true, upper: true,
    keys: [
      { t: 0, pose: { torso: [6, 0, 0], head: [-4, 0, 0], shoulderL: [-18, 0, -86], shoulderR: [-10, 0, 86], elbowL: [-6, 0, 0], elbowR: [-6, 0, 0], handL: [0, 0, -10], handR: [0, 0, 10] } },
      { t: 0.25, ease: 'inOutQuad', pose: { shoulderL: [-8, 0, -84], shoulderR: [-22, 0, 84], torso: [8, 0, 0] } },
      { t: 0.5, ease: 'inOutQuad', pose: { shoulderL: [-18, 0, -86], shoulderR: [-10, 0, 86], torso: [6, 0, 0] } },
    ],
    events: [{ t: 0.1, type: 'sfx', arg: 'whoosh' }, { t: 0.35, type: 'sfx', arg: 'whoosh' }],
  },
  viperHeavy: { // kesa-giri: blade raised high behind the head, then one great
    // diagonal cut down through the target with full follow-through
    dur: 0.8,
    keys: [
      { t: 0, pose: {} },
      { t: 0.3, ease: 'inOutCubic', pose: { torso: [-18, 28, 8], hipsRot: [-4, 12, 0], hipsPos: [0, -0.22, 0], head: [8, -12, 0], shoulderR: [-168, 14, 28], elbowR: [-24, 0, 0], handR: [0, 0, 25], shoulderL: [-20, 0, -34], elbowL: [-60, 0, 0], kneeL: [40, 0, 0], kneeR: [40, 0, 0], thighL: [-20, 0, 0], thighR: [-20, 0, 0] } },
      { t: 0.42, ease: 'inCubic', pose: { torso: [34, -28, -10], hipsRot: [8, -14, 0], hipsPos: [0, -0.42, 0.16], head: [4, 12, 0], shoulderR: [-52, -24, -28], elbowR: [-4, 0, 0], handR: [0, 0, -35], shoulderL: [16, 0, -30], elbowL: [-24, 0, 0], kneeL: [55, 0, 0], kneeR: [55, 0, 0], thighL: [-28, 0, 0], thighR: [-28, 0, 0], ankleL: [-22, 0, 0], ankleR: [-22, 0, 0] } },
      { t: 0.58, ease: 'outQuad', pose: { torso: [28, -22, -8], hipsPos: [0, -0.34, 0.12] } },
      { t: 0.8, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], head: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], handR: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0] } },
    ],
    events: [{ t: 0.38, type: 'sfx', arg: 'whooshBig' }, { t: 0.42, type: 'hit', arg: 0 }, { t: 0.44, type: 'shake', arg: 0.4 }],
  },

  // ---------- AEGIS: spear-and-shield forms ----------
  // the shield arm NEVER punches: it holds a raised guard squared to the
  // front while the spear arm does the killing from behind it.
  // AEGIS melee: the shield arm NEVER lifts — it holds one steady low-front
  // guard ([-38,18,-10]/[-75]) through every swing while the spear arm does
  // sweeping ARCS, not spear-in-fist punches.
  // NOTE on spear aim: the lance lies along the HAND's local +Z, so with the
  // arm raised forward and the hand at rest the tip points straight UP (the
  // old "punching with a spear" read). Keeping handR.x ~= -(shoulderX +
  // elbowX) pitches the tip back onto the target line — every key below
  // holds that identity so the point LEADS through chamber and strike.
  aegisStab1: { // straight mid thrust: the lance chambers back LEVEL beside
    // the ribs — tip never leaves the target line — then rams forward
    dur: 0.56,
    keys: [
      { t: 0, pose: {} },
      { t: 0.12, ease: 'outCubic', pose: { torso: [2, 22, 3], hipsRot: [0, 11, 0], head: [0, -11, 0], shoulderR: [-48, 12, 10], elbowR: [-38, 0, 0], handR: [86, 0, 0], shoulderL: [-38, 18, -10], elbowL: [-75, 0, 0] } },
      { t: 0.25, ease: 'outBack', pose: { torso: [10, -18, -4], hipsRot: [2, -10, 0], hipsPos: [0, -0.12, 0.12], head: [0, 9, 0], shoulderR: [-92, -4, 0], elbowR: [-4, 0, 0], handR: [96, 0, 0], shoulderL: [-38, 18, -10], elbowL: [-75, 0, 0] } },
      { t: 0.4, ease: 'inOutQuad', pose: { torso: [8, -14, -3], hipsPos: [0, -0.1, 0.08], shoulderR: [-88, -4, 0], handR: [92, 0, 0] } },
      { t: 0.56, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], head: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], handR: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0] } },
    ],
    events: [{ t: 0.22, type: 'sfx', arg: 'whoosh' }, { t: 0.25, type: 'hit', arg: 0 }],
  },
  aegisStab2: { // high line: the spear cocks up vertical beside the helm,
    // then drives down-forward OVER the shield rim, tip leading all the way
    dur: 0.6,
    keys: [
      { t: 0, pose: {} },
      { t: 0.14, ease: 'outCubic', pose: { torso: [-6, 16, 2], hipsRot: [0, 8, 0], head: [4, -8, 0], shoulderR: [-118, 8, 14], elbowR: [-30, 0, 0], handR: [58, 0, 0], shoulderL: [-38, 18, -10], elbowL: [-75, 0, 0] } },
      { t: 0.28, ease: 'outBack', pose: { torso: [14, -12, -3], hipsRot: [2, -7, 0], hipsPos: [0, -0.14, 0.1], head: [2, 7, 0], shoulderR: [-78, -6, -2], elbowR: [-6, 0, 0], handR: [96, 0, 0], shoulderL: [-38, 18, -10], elbowL: [-75, 0, 0] } },
      { t: 0.42, ease: 'inOutQuad', pose: { torso: [11, -9, -2], shoulderR: [-74, -6, -2], handR: [92, 0, 0] } },
      { t: 0.6, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], head: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], handR: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0] } },
    ],
    events: [{ t: 0.25, type: 'sfx', arg: 'whoosh' }, { t: 0.28, type: 'hit', arg: 1 }],
  },
  aegisPierce: { // combo ender: whole frame lunges through one skewer —
    // shield stays planted in the low-front guard the whole way
    dur: 0.62,
    keys: [
      { t: 0, pose: {} },
      { t: 0.16, ease: 'inOutCubic', pose: { torso: [4, 22, 0], hipsRot: [0, 12, 0], hipsPos: [0, -0.28, -0.08], head: [0, -10, 0], shoulderL: [-38, 18, -10], elbowL: [-75, 0, 0], shoulderR: [-24, 24, 14], elbowR: [-104, 0, 0], handR: [120, 0, 0], thighL: [-28, 0, 0], kneeL: [48, 0, 0], thighR: [10, 0, 0], kneeR: [28, 0, 0] } },
      { t: 0.3, ease: 'outBack', pose: { torso: [20, -18, -4], hipsRot: [4, -10, 0], hipsPos: [0, -0.32, 0.28], head: [-8, 8, 0], shoulderL: [-38, 18, -10], elbowL: [-75, 0, 0], shoulderR: [-96, -8, 0], elbowR: [0, 0, 0], handR: [96, 0, 0], thighL: [-46, 0, 0], kneeL: [56, 0, 0], thighR: [24, 0, 0], kneeR: [58, 0, 0], ankleR: [22, 0, 0] } },
      { t: 0.44, ease: 'inOutQuad', pose: { torso: [16, -14, -3], hipsPos: [0, -0.28, 0.22], handR: [96, 0, 0] } },
      { t: 0.62, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], handR: [0, 0, 0], thighL: [0, 0, 0], kneeL: [0, 0, 0], thighR: [0, 0, 0], kneeR: [0, 0, 0], ankleR: [0, 0, 0] } },
    ],
    events: [{ t: 0.26, type: 'sfx', arg: 'whooshBig' }, { t: 0.3, type: 'hit', arg: 2 }],
  },
  aegisWhirlHold: { // heavy HOLD phase: spear raised overhead spinning like a
    // rotor (fighter.js heavySpin whirls the hand joint) for as long as Y is
    // held — power banks up; the shield never leaves the low-front guard
    dur: 0.6, loop: true,
    keys: [
      { t: 0, pose: { torso: [-6, 0, 3], hipsRot: [-3, 0, 0], hipsPos: [0, -0.2, 0], head: [-16, 0, 0], shoulderR: [-176, 0, 10], elbowR: [-5, 0, 0], shoulderL: [-38, 18, -10], elbowL: [-75, 0, 0], kneeL: [26, 0, 0], kneeR: [26, 0, 0], thighL: [-14, 0, 0], thighR: [-14, 0, 0] } },
      { t: 0.3, ease: 'inOutQuad', pose: { hipsPos: [0, -0.24, 0], torso: [-8, 0, 3], shoulderR: [-174, 0, 8] } },
      { t: 0.6, ease: 'inOutQuad', pose: { hipsPos: [0, -0.2, 0], torso: [-6, 0, 3], shoulderR: [-176, 0, 10] } },
    ],
    events: [{ t: 0.08, type: 'sfx', arg: 'whoosh' }, { t: 0.38, type: 'sfx', arg: 'whoosh' }],
  },
  aegisLunge: { // heavy RELEASE: the banked whirl discharges into the lunge —
    // whole frame drives forward and rams the spear home, shield still front
    dur: 0.55,
    keys: [
      { t: 0, pose: { torso: [-6, 0, 3], hipsRot: [-3, 0, 0], hipsPos: [0, -0.22, 0], head: [-16, 0, 0], shoulderR: [-174, 0, 8], elbowR: [-5, 0, 0], handR: [0, 0, 0], shoulderL: [-38, 18, -10], elbowL: [-75, 0, 0], kneeL: [26, 0, 0], kneeR: [26, 0, 0], thighL: [-14, 0, 0], thighR: [-14, 0, 0] } },
      { t: 0.14, ease: 'outBack', pose: { torso: [24, -18, -4], hipsRot: [4, -10, 0], hipsPos: [0, -0.34, 0.3], head: [-8, 8, 0], shoulderR: [-96, -8, 0], elbowR: [0, 0, 0], handR: [96, 0, 0], shoulderL: [-38, 18, -10], elbowL: [-75, 0, 0], thighL: [-46, 0, 0], kneeL: [56, 0, 0], thighR: [24, 0, 0], kneeR: [58, 0, 0], ankleR: [22, 0, 0] } },
      { t: 0.3, ease: 'inOutQuad', pose: { torso: [18, -14, -3], hipsPos: [0, -0.28, 0.24], handR: [96, 0, 0] } },
      { t: 0.55, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], head: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], handR: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], thighL: [0, 0, 0], kneeL: [0, 0, 0], thighR: [0, 0, 0], kneeR: [0, 0, 0], ankleR: [0, 0, 0] } },
    ],
    events: [{ t: 0.04, type: 'sfx', arg: 'whooshBig' }, { t: 0.16, type: 'hit', arg: 0 }, { t: 0.18, type: 'shake', arg: 0.4 }],
  },
  aegisThrow: { // ranged: a true OVERHAND javelin throw — the lance is
    // carried UP high over the shoulder (body arched back, elbow cocked),
    // then whipped forward OVER THE TOP and released at the highest
    // forward point of the arc (fire event) while the shield guard never
    // drops. Same handR identity as the stabs keeps the tip on target.
    dur: 0.62,
    keys: [
      { t: 0, pose: {} },
      { t: 0.2, ease: 'outCubic', pose: { torso: [-16, 28, 6], hipsRot: [-4, 13, 0], hipsPos: [0, -0.1, -0.1], head: [6, -13, 0], shoulderR: [-142, 16, 22], elbowR: [-34, 0, 0], handR: [118, 0, 0], shoulderL: [-38, 18, -10], elbowL: [-75, 0, 0], thighL: [-20, 0, 0], kneeL: [26, 0, 0], thighR: [10, 0, 0], kneeR: [20, 0, 0] } },
      { t: 0.32, ease: 'outBack', pose: { torso: [22, -24, -6], hipsRot: [6, -13, 0], hipsPos: [0, -0.16, 0.18], head: [0, 11, 0], shoulderR: [-98, -8, -4], elbowR: [-4, 0, 0], handR: [96, 0, 0], shoulderL: [-38, 18, -10], elbowL: [-75, 0, 0], thighL: [-38, 0, 0], kneeL: [48, 0, 0], thighR: [22, 0, 0], kneeR: [50, 0, 0], ankleR: [20, 0, 0] } },
      { t: 0.62, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], head: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], handR: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], thighL: [0, 0, 0], kneeL: [0, 0, 0], thighR: [0, 0, 0], kneeR: [0, 0, 0], ankleR: [0, 0, 0] } },
    ],
    events: [{ t: 0.24, type: 'sfx', arg: 'whooshBig' }, { t: 0.3, type: 'fire' }],
  },
  shieldWhirlHold: { // AEGIS Bulwark Bash wind-up: the tower shield is
    // hoisted straight overhead FACE-UP and whirled like a rotor (the
    // special spins elbowL post-pose) while the spear arm guards low.
    // Deliberately NOT 'aegis'-prefixed: the signature's square-to-front
    // shield brace must not fight the face-up carry.
    dur: 0.6, loop: true,
    keys: [
      { t: 0, pose: { torso: [-6, 0, -3], hipsRot: [-3, 0, 0], hipsPos: [0, -0.2, 0], head: [-16, 0, 0], shoulderL: [-176, 0, -10], elbowL: [-5, 0, 0], shoulderR: [-26, 0, 18], elbowR: [-52, 0, 0], kneeL: [26, 0, 0], kneeR: [26, 0, 0], thighL: [-14, 0, 0], thighR: [-14, 0, 0] } },
      { t: 0.3, ease: 'inOutQuad', pose: { hipsPos: [0, -0.24, 0], torso: [-8, 0, -3], shoulderL: [-174, 0, -8] } },
      { t: 0.6, ease: 'inOutQuad', pose: { hipsPos: [0, -0.2, 0], torso: [-6, 0, -3], shoulderL: [-176, 0, -10] } },
    ],
    events: [{ t: 0.08, type: 'sfx', arg: 'whoosh' }, { t: 0.38, type: 'sfx', arg: 'whoosh' }],
  },
  aegisShieldSmash: { // Bulwark Bash release: the whirling shield comes
    // DOWN off the crown and RAMS forward face-first — the special grows
    // it to a bot-tall wall through the strike ('aegis' prefix so the
    // signature squares the face to the front for the impact)
    dur: 0.62,
    keys: [
      { t: 0, pose: { torso: [-6, 0, -3], hipsRot: [-3, 0, 0], hipsPos: [0, -0.2, 0], head: [-16, 0, 0], shoulderL: [-176, 0, -10], elbowL: [-5, 0, 0], shoulderR: [-26, 0, 18], elbowR: [-52, 0, 0], kneeL: [26, 0, 0], kneeR: [26, 0, 0], thighL: [-14, 0, 0], thighR: [-14, 0, 0] } },
      { t: 0.16, ease: 'outBack', pose: { torso: [16, 12, -3], hipsRot: [4, 6, 0], hipsPos: [0, -0.22, 0.26], head: [0, -6, 0], shoulderL: [-88, 14, -6], elbowL: [-18, 0, 0], shoulderR: [8, 0, 18], elbowR: [-30, 0, 0], thighL: [-40, 0, 0], kneeL: [50, 0, 0], thighR: [20, 0, 0], kneeR: [46, 0, 0], ankleR: [18, 0, 0] } },
      { t: 0.36, ease: 'inOutQuad', pose: { torso: [13, 10, -2], hipsPos: [0, -0.2, 0.2] } },
      { t: 0.62, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], thighL: [0, 0, 0], kneeL: [0, 0, 0], thighR: [0, 0, 0], kneeR: [0, 0, 0], ankleR: [0, 0, 0] } },
    ],
    events: [{ t: 0.06, type: 'sfx', arg: 'whooshBig' }, { t: 0.18, type: 'hit', arg: 0 }, { t: 0.2, type: 'shake', arg: 0.5 }],
  },
  frozenSurrender: { // GLACIER's finisher victim: iced over mid-surrender —
    // both hands thrown in the air, slight cower, held solid
    dur: 0.55, hold: true,
    keys: [
      { t: 0, pose: {} },
      { t: 0.55, ease: 'outCubic', pose: { shoulderL: [-160, 0, -18], shoulderR: [-160, 0, 18], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], torso: [-10, 0, 0], head: [-14, 0, 0], hipsPos: [0, -0.1, 0], kneeL: [14, 0, 0], kneeR: [14, 0, 0], thighL: [-8, 0, 0], thighR: [-8, 0, 0] } },
    ],
  },
  daintyTap: { // GLACIER's finisher: one delicate outstretched poke —
    // barely a touch, all it takes
    dur: 0.85,
    keys: [
      { t: 0, pose: {} },
      { t: 0.32, ease: 'inOutCubic', pose: { torso: [4, -10, 0], head: [2, 8, 0], hipsPos: [0, -0.04, 0.05], shoulderR: [-60, 0, 6], elbowR: [-48, 0, 0], handR: [-16, 0, 0], shoulderL: [4, 0, -14] } },
      { t: 0.46, ease: 'outCubic', pose: { shoulderR: [-74, 0, 2], elbowR: [-10, 0, 0], torso: [6, -12, 0], hipsPos: [0, -0.05, 0.09] } },
      { t: 0.85, ease: 'inOutQuad', pose: { torso: [0, 0, 0], head: [0, 0, 0], hipsPos: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], handR: [0, 0, 0], shoulderL: [0, 0, -10] } },
    ],
    events: [{ t: 0.42, type: 'sfx', arg: 'servo' }],
  },
  viperDrill: { // heavy: ninja coil, then the whole body launches FLAT and
    // corkscrews forward — both blades speared ahead as the drill point
    // (fighter.js heavySpin barrel-rolls the hips; heavyDrive flies it)
    dur: 0.95,
    keys: [
      { t: 0, pose: {} },
      { t: 0.24, ease: 'inOutCubic', pose: { hipsPos: [0, -0.85, 0], hipsRot: [0, 8, 0], torso: [20, 10, 0], head: [-10, -8, 0], shoulderL: [-42, 30, -48], shoulderR: [-42, -30, 48], elbowL: [-72, 0, 0], elbowR: [-72, 0, 0], handL: [0, 0, -30], handR: [0, 0, 30], kneeL: [80, 0, 0], kneeR: [80, 0, 0], thighL: [-42, 0, 0], thighR: [-42, 0, 0], ankleL: [-34, 0, 0], ankleR: [-34, 0, 0] } },
      { t: 0.36, ease: 'outCubic', pose: { hipsPos: [0, 0.5, 0], hipsRot: [90, 0, 0], torso: [0, 0, 0], head: [12, 0, 0], shoulderL: [-172, 0, -6], shoulderR: [-172, 0, 6], elbowL: [-4, 0, 0], elbowR: [-4, 0, 0], handL: [0, 0, 0], handR: [0, 0, 0], kneeL: [8, 0, 0], kneeR: [8, 0, 0], thighL: [4, 0, -3], thighR: [4, 0, 3], ankleL: [-30, 0, 0], ankleR: [-30, 0, 0] } },
      { t: 0.72, ease: 'inOutQuad', pose: { hipsPos: [0, 0.42, 0], hipsRot: [90, 0, 0] } },
      { t: 0.95, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], hipsRot: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0] } },
    ],
    events: [{ t: 0.3, type: 'sfx', arg: 'dash' }, { t: 0.44, type: 'sfx', arg: 'whooshBig' }, { t: 0.55, type: 'hit', arg: 0 }, { t: 0.57, type: 'shake', arg: 0.35 }],
  },
  novaSmite: { // heavy: reach to the sky — a shaft of starlight strikes the
    // staff (fx event) and sets it blazing — then hammer it down for an
    // area-burst on whatever stands there
    dur: 1.1,
    keys: [
      { t: 0, pose: {} },
      { t: 0.3, ease: 'inOutCubic', pose: { torso: [-10, 0, 4], hipsRot: [-4, 0, 0], hipsPos: [0, 0.08, 0], head: [-22, 0, 0], shoulderR: [-176, 0, 6], elbowR: [-4, 0, 0], shoulderL: [-26, 0, -42], elbowL: [-30, 0, 0], kneeL: [10, 0, 0], kneeR: [10, 0, 0] } },
      { t: 0.62, ease: 'inOutQuad', pose: { torso: [-12, 0, 4], shoulderR: [-174, 0, 6], hipsPos: [0, 0.05, 0] } },
      { t: 0.78, ease: 'inCubic', pose: { torso: [48, -8, 0], hipsRot: [10, 0, 0], hipsPos: [0, -0.55, 0.1], head: [12, 0, 0], shoulderR: [-58, -6, -4], elbowR: [-8, 0, 0], shoulderL: [10, 0, -30], elbowL: [-20, 0, 0], kneeL: [55, 0, 0], kneeR: [55, 0, 0], thighL: [-30, 0, 0], thighR: [-30, 0, 0], ankleL: [-24, 0, 0], ankleR: [-24, 0, 0] } },
      { t: 0.9, ease: 'outQuad', pose: { torso: [42, -6, 0], hipsPos: [0, -0.45, 0.08] } },
      { t: 1.1, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], head: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0] } },
    ],
    events: [{ t: 0.34, type: 'fx', arg: 'charge' }, { t: 0.34, type: 'sfx', arg: 'cast' }, { t: 0.72, type: 'sfx', arg: 'whooshBig' }, { t: 0.8, type: 'hit', arg: 0 }, { t: 0.82, type: 'shake', arg: 0.6 }],
  },
  tempestTornado: { // heavy: arms fling wide and the whole frame spins up
    // into a tornado (heavySpin whirls the hips; the aura FX ride along) —
    // two hit beats as the vortex grinds through the target
    dur: 1.0,
    keys: [
      { t: 0, pose: {} },
      { t: 0.18, ease: 'inOutCubic', pose: { hipsPos: [0, -0.4, 0], torso: [10, 20, 0], head: [0, -10, 0], shoulderL: [-20, 30, -20], shoulderR: [-20, -30, 20], elbowL: [-110, 0, 0], elbowR: [-110, 0, 0], kneeL: [40, 0, 0], kneeR: [40, 0, 0], thighL: [-22, 0, 0], thighR: [-22, 0, 0] } },
      { t: 0.3, ease: 'outBack', pose: { hipsPos: [0, 0.18, 0], torso: [-6, 0, 0], head: [-8, 0, 0], shoulderL: [-24, 0, -86], shoulderR: [-24, 0, 86], elbowL: [-4, 0, 0], elbowR: [-4, 0, 0], kneeL: [8, 0, 0], kneeR: [8, 0, 0], thighL: [-4, 0, 0], thighR: [-4, 0, 0] } },
      { t: 0.85, ease: 'inOutQuad', pose: { hipsPos: [0, 0.1, 0], shoulderL: [-22, 0, -84], shoulderR: [-22, 0, 84] } },
      { t: 1.0, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0] } },
    ],
    events: [{ t: 0.28, type: 'sfx', arg: 'whooshBig' }, { t: 0.45, type: 'hit', arg: 0 }, { t: 0.55, type: 'sfx', arg: 'whoosh' }, { t: 0.68, type: 'hit', arg: 0 }, { t: 0.7, type: 'shake', arg: 0.35 }],
  },
  fenrirSpike: { // heavy: the mane flares out huge (heavyFlare scales the
    // ruff, porcupine-style) as the wolf coils — then a spiking LEAP
    // (heavyDrive) that rams the whole bladed body through the target
    dur: 0.9,
    keys: [
      { t: 0, pose: {} },
      { t: 0.28, ease: 'inOutCubic', pose: { hipsPos: [0, -0.7, 0], hipsRot: [6, 0, 0], torso: [24, 0, 0], head: [-22, 0, 0], shoulderL: [10, 0, -24], shoulderR: [10, 0, 24], elbowL: [-60, 0, 0], elbowR: [-60, 0, 0], kneeL: [70, 0, 0], kneeR: [70, 0, 0], thighL: [-40, 0, 0], thighR: [-40, 0, 0], ankleL: [-32, 0, 0], ankleR: [-32, 0, 0] } },
      { t: 0.42, ease: 'outCubic', pose: { hipsPos: [0, 0.2, 0], hipsRot: [22, 0, 0], torso: [14, 0, 0], head: [-16, 0, 0], shoulderL: [30, 0, -34], shoulderR: [30, 0, 34], elbowL: [-24, 0, 0], elbowR: [-24, 0, 0], thighL: [-30, 0, -4], thighR: [-30, 0, 4], kneeL: [26, 0, 0], kneeR: [26, 0, 0], ankleL: [-24, 0, 0], ankleR: [-24, 0, 0] } },
      { t: 0.68, ease: 'inOutQuad', pose: { hipsPos: [0, 0.1, 0], hipsRot: [16, 0, 0] } },
      { t: 0.9, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], hipsRot: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0] } },
    ],
    events: [{ t: 0.08, type: 'sfx', arg: 'howl' }, { t: 0.38, type: 'sfx', arg: 'jump' }, { t: 0.55, type: 'hit', arg: 0 }, { t: 0.57, type: 'shake', arg: 0.35 }],
  },
  wraithLasers: { // heavy: he LIFTS OFF and leans INTO the mark — hovering
    // with legs trailing, torso pitched forward — while the cloak spreads
    // (heavyFlare) and the wing halves fan up above his head (heavyRaise);
    // only THEN do the wing-tips fire (heavyFx 'wingLasers')
    dur: 1.45,
    keys: [
      { t: 0, pose: {} },
      { t: 0.3, ease: 'outCubic', pose: { hipsPos: [0, 0.42, 0], hipsRot: [4, 0, 0], torso: [14, 0, 0], head: [-6, 0, 0], shoulderL: [-42, 0, -72], shoulderR: [-42, 0, 72], elbowL: [-8, 0, 0], elbowR: [-8, 0, 0], thighL: [8, 0, 0], thighR: [8, 0, 0], kneeL: [-20, 0, 0], kneeR: [-20, 0, 0], ankleL: [40, 0, 0], ankleR: [40, 0, 0] } },
      { t: 0.68, ease: 'inOutCubic', pose: { hipsPos: [0, 0.66, 0], hipsRot: [7, 0, 0], torso: [22, 0, 0], head: [-8, 0, 0], shoulderL: [-58, 0, -78], shoulderR: [-58, 0, 78] } },
      { t: 0.95, ease: 'inOutQuad', pose: { hipsPos: [0, 0.6, 0], torso: [20, 0, 0], head: [-4, 0, 0] } },
      { t: 1.15, ease: 'inOutQuad', pose: { hipsPos: [0, 0.42, 0], torso: [13, 0, 0] } },
      { t: 1.45, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], hipsRot: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0] } },
    ],
    events: [{ t: 0.14, type: 'sfx', arg: 'charge' }, { t: 0.6, type: 'sfx', arg: 'charge' }, { t: 0.88, type: 'hit', arg: 0 }, { t: 0.88, type: 'sfx', arg: 'railgun' }, { t: 0.92, type: 'shake', arg: 0.45 }],
  },
  // ---------- SAURION: raptor forms — he fights with his FEET ----------
  // legs/torso/head values are rest-relative (restBias) so the deep
  // digitigrade crouch carries through every kick.
  saurionKick1: { // right EAGLE KICK: knee chambers at the chest, then the
    // sickle toe-claw whips up-and-out at head height, torso swung back
    dur: 0.5,
    keys: [
      { t: 0, pose: {} },
      { t: 0.12, ease: 'outCubic', pose: { torso: [4, -6, 0], head: [-2, 4, 0], hipsPos: [0, -0.12, 0], hipsRot: [0, -8, 0], thighR: [-62, 0, -4], kneeR: [38, 0, 0], ankleR: [-12, 0, 0], shoulderL: [-40, 0, -10], elbowL: [-66, 0, 0], handL: [30, 0, 10], shoulderR: [-26, 0, 10], elbowR: [-56, 0, 0], handR: [26, 0, -10] } },
      { t: 0.22, ease: 'outBack', pose: { torso: [-18, 6, 0], head: [14, -4, 0], hipsPos: [0, 0, 0.08], hipsRot: [0, 6, 0], thighR: [-65, 0, -8], kneeR: [-64, 0, 0], ankleR: [58, 0, 0] } },
      { t: 0.32, ease: 'inOutQuad', pose: { thighR: [-45, 0, -6], kneeR: [-40, 0, 0], ankleR: [40, 0, 0] } },
      { t: 0.5, ease: 'inOutQuad', pose: { torso: [0, 0, 0], head: [0, 0, 0], hipsPos: [0, 0, 0], hipsRot: [0, 0, 0], thighR: [0, 0, 0], kneeR: [0, 0, 0], ankleR: [0, 0, 0], shoulderL: [-34, 0, -7], elbowL: [-62, 0, 0], handL: [28, 0, 10], shoulderR: [-34, 0, 7], elbowR: [-62, 0, 0], handR: [28, 0, -10] } },
    ],
    events: [{ t: 0.18, type: 'sfx', arg: 'whoosh' }, { t: 0.22, type: 'hit', arg: 0 }],
  },
  saurionKick2: { // left eagle kick, same head-high snap off the other leg
    dur: 0.52,
    keys: [
      { t: 0, pose: {} },
      { t: 0.12, ease: 'outCubic', pose: { torso: [4, 6, 0], head: [-2, -4, 0], hipsPos: [0, -0.12, 0], hipsRot: [0, 8, 0], thighL: [-52, 0, 4], kneeL: [34, 0, 0], ankleL: [-12, 0, 0], shoulderR: [-40, 0, 10], elbowR: [-66, 0, 0], handR: [30, 0, -10], shoulderL: [-26, 0, -10], elbowL: [-56, 0, 0], handL: [26, 0, 10] } },
      { t: 0.24, ease: 'outBack', pose: { torso: [-18, -6, 0], head: [14, 4, 0], hipsPos: [0, 0, 0.08], hipsRot: [0, -6, 0], thighL: [-55, 0, 8], kneeL: [-74, 0, 0], ankleL: [62, 0, 0] } },
      { t: 0.34, ease: 'inOutQuad', pose: { thighL: [-42, 0, 6], kneeL: [-52, 0, 0], ankleL: [44, 0, 0] } },
      { t: 0.52, ease: 'inOutQuad', pose: { torso: [0, 0, 0], head: [0, 0, 0], hipsPos: [0, 0, 0], hipsRot: [0, 0, 0], thighL: [0, 0, 0], kneeL: [0, 0, 0], ankleL: [0, 0, 0], shoulderL: [-34, 0, -7], elbowL: [-62, 0, 0], handL: [28, 0, 10], shoulderR: [-34, 0, 7], elbowR: [-62, 0, 0], handR: [28, 0, -10] } },
    ],
    events: [{ t: 0.2, type: 'sfx', arg: 'whoosh' }, { t: 0.24, type: 'hit', arg: 1 }],
  },
  saurionKick3: { // combo ender: coil onto the haunches, then a leaping
    // downward claw slash with the whole body behind it
    dur: 0.62,
    keys: [
      { t: 0, pose: {} },
      { t: 0.16, ease: 'inOutCubic', pose: { hipsPos: [0, -0.42, 0], hipsRot: [4, 0, 0], torso: [12, 0, 0], head: [-8, 0, 0], thighL: [-16, 0, 0], thighR: [-16, 0, 0], kneeL: [22, 0, 0], kneeR: [22, 0, 0], ankleL: [-8, 0, 0], ankleR: [-8, 0, 0], shoulderL: [-12, 0, -18], shoulderR: [-12, 0, 18], elbowL: [-30, 0, 0], elbowR: [-30, 0, 0], handL: [20, 0, 8], handR: [20, 0, -8] } },
      { t: 0.3, ease: 'outBack', pose: { hipsPos: [0, 0.32, 0.14], hipsRot: [12, 0, 0], torso: [-14, 0, 0], head: [16, 0, 0], thighR: [-62, 0, -6], kneeR: [-62, 0, 0], ankleR: [56, 0, 0], thighL: [16, 0, 4], kneeL: [-16, 0, 0], shoulderL: [-60, 0, -24], shoulderR: [-60, 0, 24], elbowL: [-20, 0, 0], elbowR: [-20, 0, 0] } },
      { t: 0.42, ease: 'inOutQuad', pose: { hipsPos: [0, 0.1, 0.1], thighR: [-30, 0, -4], kneeR: [-30, 0, 0], ankleR: [36, 0, 0] } },
      { t: 0.62, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], hipsRot: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0], shoulderL: [-34, 0, -7], shoulderR: [-34, 0, 7], elbowL: [-62, 0, 0], elbowR: [-62, 0, 0], handL: [28, 0, 10], handR: [28, 0, -10] } },
    ],
    events: [{ t: 0.26, type: 'sfx', arg: 'whoosh' }, { t: 0.3, type: 'hit', arg: 2 }, { t: 0.32, type: 'shake', arg: 0.3 }],
  },
  saurionBite: { // heavy: coil deep back onto the haunches, head craned away
    // — then the whole frame SPRINGS forward (heavyDrive) and the jaws snap
    // down through the target
    dur: 0.9,
    keys: [
      { t: 0, pose: {} },
      { t: 0.3, ease: 'inOutCubic', pose: { hipsPos: [0, -0.4, -0.12], hipsRot: [-4, 0, 0], torso: [14, 0, 0], head: [-30, 0, 0], thighL: [-10, 0, 0], thighR: [-10, 0, 0], kneeL: [14, 0, 0], kneeR: [14, 0, 0], ankleL: [-6, 0, 0], ankleR: [-6, 0, 0], shoulderL: [-16, 0, -14], shoulderR: [-16, 0, 14], elbowL: [-70, 0, 0], elbowR: [-70, 0, 0], handL: [34, 0, 12], handR: [34, 0, -12] } },
      { t: 0.44, ease: 'outCubic', pose: { hipsPos: [0, 0.14, 0.28], hipsRot: [10, 0, 0], torso: [-12, 0, 0], head: [40, 0, 0], thighL: [18, 0, 0], thighR: [18, 0, 0], kneeL: [-30, 0, 0], kneeR: [-30, 0, 0], ankleL: [12, 0, 0], ankleR: [12, 0, 0], shoulderL: [-34, 0, -8], shoulderR: [-34, 0, 8], elbowL: [-40, 0, 0], elbowR: [-40, 0, 0] } },
      { t: 0.58, ease: 'inOutQuad', pose: { hipsPos: [0, 0.04, 0.2], head: [30, 0, 0] } },
      { t: 0.9, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], hipsRot: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0], shoulderL: [-34, 0, -7], shoulderR: [-34, 0, 7], elbowL: [-62, 0, 0], elbowR: [-62, 0, 0], handL: [28, 0, 10], handR: [28, 0, -10] } },
    ],
    events: [{ t: 0.1, type: 'sfx', arg: 'charge' }, { t: 0.4, type: 'sfx', arg: 'whooshBig' }, { t: 0.48, type: 'hit', arg: 0 }, { t: 0.5, type: 'shake', arg: 0.35 }],
  },

  nullBackhand: { // NULLBOT heavy: a contemptuous one-arm BACKHAND — the
    // arm folds across the chest almost lazily, a beat of dead stillness,
    // then the knuckles whip through the front arc and send whatever they
    // meet across the street
    dur: 0.8,
    keys: [
      { t: 0, pose: {} },
      { t: 0.26, ease: 'inOutCubic', pose: { torso: [4, 38, 8], hipsRot: [0, 18, 0], hipsPos: [0, -0.16, 0], head: [-4, -18, 0], shoulderR: [-96, 38, 20], elbowR: [-64, 0, 0], handR: [0, 0, 40], shoulderL: [10, 0, -24], elbowL: [-40, 0, 0], kneeL: [16, 0, 0], kneeR: [16, 0, 0], thighL: [-8, 0, 0], thighR: [-8, 0, 0] } },
      { t: 0.4, ease: 'outBack', pose: { torso: [8, -42, -10], hipsRot: [0, -20, 0], hipsPos: [0, -0.2, 0.1], head: [0, 18, 0], shoulderR: [-90, -44, -18], elbowR: [-4, 0, 0], handR: [0, 0, -35], shoulderL: [18, 0, -30], kneeL: [22, 0, 0], kneeR: [30, 0, 0], thighL: [-14, 0, 0], thighR: [2, 0, 0] } },
      { t: 0.55, ease: 'inOutQuad', pose: { torso: [6, -32, -7], hipsRot: [0, -15, 0], shoulderR: [-84, -36, -12], elbowR: [-10, 0, 0] } },
      { t: 0.8, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], head: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], handR: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0] } },
    ],
    events: [{ t: 0.33, type: 'sfx', arg: 'whooshBig' }, { t: 0.4, type: 'hit', arg: 0 }, { t: 0.42, type: 'shake', arg: 0.4 }],
  },

  // ---------- TITANUS / COLOSSUS: telegraphed haymakers ----------
  // the fist gets PULLED all the way back and the frame coils before it
  // lets loose — slower than a jab, and it launches people across the block.
  bigPunch1: { // left haymaker with a full wind-up
    dur: 0.66,
    keys: [
      { t: 0, pose: {} },
      { t: 0.22, ease: 'inOutCubic', pose: { torso: [8, -36, -9], hipsRot: [0, -18, 0], hipsPos: [0, -0.2, -0.06], head: [0, 16, 0], shoulderL: [30, 8, -26], elbowL: [-126, 0, 0], shoulderR: [-18, 0, 24], elbowR: [-60, 0, 0], kneeL: [30, 0, 0], kneeR: [30, 0, 0], thighL: [-16, 0, 0], thighR: [-16, 0, 0] } },
      { t: 0.34, ease: 'outBack', pose: { torso: [12, 32, 9], hipsRot: [0, 18, 0], hipsPos: [0, -0.22, 0.16], head: [0, -14, 0], shoulderL: [-104, -16, 26], elbowL: [-2, 0, 0], shoulderR: [24, 0, 28], elbowR: [-30, 0, 0], kneeL: [26, 0, 0], kneeR: [40, 0, 0], thighL: [-22, 0, 0], thighR: [4, 0, 0] } },
      { t: 0.48, ease: 'inOutQuad', pose: { torso: [9, 24, 7], hipsRot: [0, 13, 0], shoulderL: [-92, -12, 20], elbowL: [-18, 0, 0] } },
      { t: 0.66, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0] } },
    ],
    events: [{ t: 0.24, type: 'sfx', arg: 'whooshBig' }, { t: 0.34, type: 'hit', arg: 0 }, { t: 0.36, type: 'shake', arg: 0.3 }],
  },

  // ---------- TITANUS / COLOSSUS: hold-to-charge haymakers & pounds ----------
  // punchHold1 freezes bigPunch1's wind-up as a trembling loop while X stays
  // down; punchRelease1 fires the strike FROM that chamber (no rest detour).
  // Mirrored *2 variants alternate arms. poundHold/poundSlam do the same for
  // the two-hand overhead heavy.
  punchHold1: { // charged haymaker wind-up: coiled at full stretch, the
    // cocked fist quaking at the hip until the button lets it go
    dur: 0.7, loop: true,
    keys: [
      { t: 0, pose: { torso: [8, -36, -9], hipsRot: [0, -18, 0], hipsPos: [0, -0.2, -0.06], head: [0, 16, 0], shoulderL: [30, 8, -26], elbowL: [-126, 0, 0], shoulderR: [-18, 0, 24], elbowR: [-60, 0, 0], kneeL: [30, 0, 0], kneeR: [30, 0, 0], thighL: [-16, 0, 0], thighR: [-16, 0, 0] } },
      { t: 0.35, ease: 'inOutQuad', pose: { torso: [9, -38, -10], hipsPos: [0, -0.23, -0.07], shoulderL: [33, 9, -28], elbowL: [-122, 0, 0] } },
      { t: 0.7, ease: 'inOutQuad', pose: { torso: [8, -36, -9], hipsPos: [0, -0.2, -0.06], shoulderL: [30, 8, -26], elbowL: [-126, 0, 0] } },
    ],
  },
  punchRelease1: { // the banked haymaker discharges: chamber -> strike ->
    // follow-through, exactly bigPunch1 from its wind-up onward
    dur: 0.5,
    keys: [
      { t: 0, pose: { torso: [8, -36, -9], hipsRot: [0, -18, 0], hipsPos: [0, -0.2, -0.06], head: [0, 16, 0], shoulderL: [30, 8, -26], elbowL: [-126, 0, 0], shoulderR: [-18, 0, 24], elbowR: [-60, 0, 0], kneeL: [30, 0, 0], kneeR: [30, 0, 0], thighL: [-16, 0, 0], thighR: [-16, 0, 0] } },
      { t: 0.12, ease: 'outBack', pose: { torso: [12, 32, 9], hipsRot: [0, 18, 0], hipsPos: [0, -0.22, 0.16], head: [0, -14, 0], shoulderL: [-104, -16, 26], elbowL: [-2, 0, 0], shoulderR: [24, 0, 28], elbowR: [-30, 0, 0], kneeL: [26, 0, 0], kneeR: [40, 0, 0], thighL: [-22, 0, 0], thighR: [4, 0, 0] } },
      { t: 0.26, ease: 'inOutQuad', pose: { torso: [9, 24, 7], hipsRot: [0, 13, 0], shoulderL: [-92, -12, 20], elbowL: [-18, 0, 0] } },
      { t: 0.5, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0] } },
    ],
    events: [{ t: 0.02, type: 'sfx', arg: 'whooshBig' }, { t: 0.12, type: 'hit', arg: 0 }, { t: 0.14, type: 'shake', arg: 0.35 }],
  },
  poundHold: { // charged overhead pound: both fists locked high, the whole
    // frame arched back and quaking until Y releases
    dur: 0.8, loop: true,
    keys: [
      { t: 0, pose: { hipsPos: [0, -0.3, 0], hipsRot: [-8, 8, 0], torso: [-28, 6, -6], head: [-18, 0, 0], shoulderL: [-172, 0, -26], shoulderR: [-172, 0, 26], elbowL: [-38, 0, 0], elbowR: [-38, 0, 0], kneeL: [18, 0, 0], kneeR: [18, 0, 0], thighL: [-8, 0, 0], thighR: [-8, 0, 0] } },
      { t: 0.4, ease: 'inOutQuad', pose: { hipsPos: [0, -0.34, 0], torso: [-30, 6, -6], shoulderL: [-176, 0, -28], shoulderR: [-176, 0, 28] } },
      { t: 0.8, ease: 'inOutQuad', pose: { hipsPos: [0, -0.3, 0], torso: [-28, 6, -6], shoulderL: [-172, 0, -26], shoulderR: [-172, 0, 26] } },
    ],
  },
  poundSlam: { // the banked pound discharges: raised -> slam, exactly the
    // shared heavy from its apex onward
    dur: 0.7,
    keys: [
      { t: 0, pose: { hipsPos: [0, -0.3, 0], hipsRot: [-8, 8, 0], torso: [-28, 6, -6], head: [-18, 0, 0], shoulderL: [-172, 0, -26], shoulderR: [-172, 0, 26], elbowL: [-38, 0, 0], elbowR: [-38, 0, 0], kneeL: [18, 0, 0], kneeR: [18, 0, 0], thighL: [-8, 0, 0], thighR: [-8, 0, 0] } },
      { t: 0.18, ease: 'inCubic', pose: { hipsPos: [0, -0.72, 0], hipsRot: [12, -6, 0], torso: [52, -6, 4], head: [14, 0, 0], shoulderL: [-48, 0, -6], shoulderR: [-48, 0, 6], elbowL: [-6, 0, 0], elbowR: [-6, 0, 0], kneeL: [48, 0, 0], kneeR: [48, 0, 0], thighL: [-26, 0, 0], thighR: [-26, 0, 0], ankleL: [-20, 0, 0], ankleR: [-20, 0, 0] } },
      { t: 0.36, ease: 'outQuad', pose: { hipsPos: [0, -0.5, 0], torso: [44, -4, 3] } },
      { t: 0.7, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], hipsRot: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0] } },
    ],
    events: [{ t: 0.1, type: 'sfx', arg: 'whooshBig' }, { t: 0.18, type: 'hit', arg: 0 }, { t: 0.2, type: 'shake', arg: 0.5 }],
  },
  fistLaunch: { // ROCKET FIST: chamber the right fist past the hip, punch
    // straight out — the fist detaches at full extension (fire event) and
    // the arm stays punched out a beat while it flies
    dur: 0.7,
    keys: [
      { t: 0, pose: {} },
      { t: 0.16, ease: 'outCubic', pose: { torso: [6, 30, 8], hipsRot: [0, 15, 0], hipsPos: [0, -0.14, -0.04], head: [0, -14, 0], shoulderR: [26, -6, 22], elbowR: [-118, 0, 0], shoulderL: [-16, 0, -22], elbowL: [-55, 0, 0], kneeL: [26, 0, 0], kneeR: [26, 0, 0], thighL: [-14, 0, 0], thighR: [-14, 0, 0] } },
      { t: 0.26, ease: 'outBack', pose: { torso: [10, -28, -8], hipsRot: [0, -16, 0], hipsPos: [0, -0.18, 0.12], head: [0, 12, 0], shoulderR: [-100, 14, -24], elbowR: [-2, 0, 0], shoulderL: [20, 0, -26], elbowL: [-28, 0, 0], kneeL: [36, 0, 0], kneeR: [24, 0, 0], thighL: [2, 0, 0], thighR: [-20, 0, 0] } },
      { t: 0.48, ease: 'inOutQuad', pose: { torso: [8, -22, -6], shoulderR: [-92, 12, -18] } },
      { t: 0.7, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], head: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0] } },
    ],
    events: [{ t: 0.18, type: 'sfx', arg: 'whooshBig' }, { t: 0.26, type: 'fire' }, { t: 0.28, type: 'shake', arg: 0.25 }],
  },
  fistCatch: { // the rocket fist is inbound: reach the right arm straight
    // out and brace — the fist re-docks onto the extended wrist mid-clip
    dur: 0.85, upper: true,
    keys: [
      { t: 0, pose: {} },
      { t: 0.2, ease: 'outCubic', pose: { torso: [4, -14, -4], head: [0, 8, 0], shoulderR: [-86, 4, -4], elbowR: [-8, 0, 0], shoulderL: [6, 0, -14], elbowL: [-24, 0, 0] } },
      { t: 0.55, ease: 'inOutQuad', pose: { shoulderR: [-84, 4, -4], torso: [3, -12, -3] } },
      { t: 0.85, ease: 'inOutQuad', pose: { torso: [0, 0, 0], head: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0] } },
    ],
  },

  vulcanSpray: { // finisher: weight rocked back, the right gatling flung up
    // PAST his shoulder hosing the sky — loose and casual, mid-laugh
    dur: 0.9, loop: true,
    keys: [
      { t: 0, pose: { hipsPos: [0, -0.06, 0], hipsRot: [0, -10, 0], torso: [-14, 8, -4], head: [-16, -10, 4], shoulderR: [-148, 0, 34], elbowR: [-24, 0, 0], shoulderL: [-8, 0, -16], elbowL: [-30, 0, 0], thighL: [-8, 0, -6], thighR: [4, 0, 8], kneeL: [12, 0, 0], kneeR: [4, 0, 0] } },
      { t: 0.45, ease: 'inOutQuad', pose: { torso: [-17, 8, -4], head: [-19, -10, 4], hipsPos: [0, -0.09, 0], shoulderR: [-152, 0, 36] } },
      { t: 0.9, ease: 'inOutQuad', pose: { torso: [-14, 8, -4], head: [-16, -10, 4], hipsPos: [0, -0.06, 0], shoulderR: [-148, 0, 34] } },
    ],
  },
  colossusSlamR: { // one-arm ragdoll hammer, DOWN THE RIGHT SIDE: the
    // loaded fist swings from overhead to the dirt beside his right leg
    // (the finisher LOCKS the victim to handR, so they ride this swing)
    dur: 0.8,
    keys: [
      { t: 0, pose: {} },
      { t: 0.28, ease: 'inOutCubic', pose: { torso: [-14, 0, -10], hipsPos: [0, -0.08, 0], head: [-10, 0, 0], shoulderR: [-168, 0, 18], elbowR: [-14, 0, 0], shoulderL: [-24, 0, -30], elbowL: [-40, 0, 0], kneeL: [14, 0, 0], kneeR: [14, 0, 0] } },
      { t: 0.5, ease: 'inCubic', pose: { torso: [28, 0, 22], hipsPos: [0, -0.52, 0], head: [14, 0, 0], shoulderR: [-12, 0, 38], elbowR: [-4, 0, 0], shoulderL: [-10, 0, -24], kneeL: [52, 0, 0], kneeR: [52, 0, 0], thighL: [-28, 0, 0], thighR: [-28, 0, 0], ankleL: [-20, 0, 0], ankleR: [-20, 0, 0] } },
      { t: 0.64, ease: 'outQuad', pose: { torso: [24, 0, 18], hipsPos: [0, -0.44, 0] } },
      { t: 0.8, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsPos: [0, 0, 0], head: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0] } },
    ],
    events: [{ t: 0.12, type: 'sfx', arg: 'whooshBig' }, { t: 0.5, type: 'sfx', arg: 'slam' }, { t: 0.52, type: 'shake', arg: 0.4 }],
  },
  colossusSlamL: { // ...and swung ACROSS the body, down beside his left leg
    dur: 0.8,
    keys: [
      { t: 0, pose: {} },
      { t: 0.28, ease: 'inOutCubic', pose: { torso: [-14, 0, 10], hipsPos: [0, -0.08, 0], head: [-10, 0, 0], shoulderR: [-168, 0, 20], elbowR: [-14, 0, 0], shoulderL: [-24, 0, -30], elbowL: [-40, 0, 0], kneeL: [14, 0, 0], kneeR: [14, 0, 0] } },
      { t: 0.5, ease: 'inCubic', pose: { torso: [26, -20, -20], hipsPos: [0, -0.52, 0], head: [12, 10, 0], shoulderR: [-34, 0, -36], elbowR: [-12, 0, 0], shoulderL: [-8, 0, -34], kneeL: [52, 0, 0], kneeR: [52, 0, 0], thighL: [-28, 0, 0], thighR: [-28, 0, 0], ankleL: [-20, 0, 0], ankleR: [-20, 0, 0] } },
      { t: 0.64, ease: 'outQuad', pose: { torso: [22, -16, -16], hipsPos: [0, -0.44, 0] } },
      { t: 0.8, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsPos: [0, 0, 0], head: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0] } },
    ],
    events: [{ t: 0.12, type: 'sfx', arg: 'whooshBig' }, { t: 0.5, type: 'sfx', arg: 'slam' }, { t: 0.52, type: 'shake', arg: 0.4 }],
  },

  stomp: { // one heavy foot raised high and RAMMED straight down — the
    // finisher trample (stomp2 is the mirrored left foot)
    dur: 0.5,
    keys: [
      { t: 0, pose: {} },
      { t: 0.18, ease: 'outCubic', pose: { hipsPos: [0, -0.04, 0], torso: [10, 0, 0], head: [8, 0, 0], thighR: [-72, 0, -4], kneeR: [78, 0, 0], ankleR: [-22, 0, 0], shoulderL: [-22, 0, -18], shoulderR: [-32, 0, 18], elbowL: [-30, 0, 0], elbowR: [-40, 0, 0] } },
      { t: 0.3, ease: 'inCubic', pose: { hipsPos: [0, -0.16, 0], torso: [18, 0, 0], head: [10, 0, 0], thighR: [-16, 0, -2], kneeR: [10, 0, 0], ankleR: [-2, 0, 0] } },
      { t: 0.5, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], thighR: [0, 0, 0], kneeR: [0, 0, 0], ankleR: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0] } },
    ],
    events: [{ t: 0.28, type: 'sfx', arg: 'slam' }],
  },

  heavy: { // two-hand overhead smash — huge arch back, body hurled into the slam
    dur: 0.98,
    keys: [
      { t: 0, pose: {} },
      { t: 0.34, ease: 'inOutCubic', pose: { hipsPos: [0, -0.3, 0], hipsRot: [-8, 8, 0], torso: [-28, 6, -6], head: [-18, 0, 0], shoulderL: [-172, 0, -26], shoulderR: [-172, 0, 26], elbowL: [-38, 0, 0], elbowR: [-38, 0, 0], kneeL: [18, 0, 0], kneeR: [18, 0, 0], thighL: [-8, 0, 0], thighR: [-8, 0, 0] } },
      { t: 0.52, ease: 'inCubic', pose: { hipsPos: [0, -0.72, 0], hipsRot: [12, -6, 0], torso: [52, -6, 4], head: [14, 0, 0], shoulderL: [-48, 0, -6], shoulderR: [-48, 0, 6], elbowL: [-6, 0, 0], elbowR: [-6, 0, 0], kneeL: [48, 0, 0], kneeR: [48, 0, 0], thighL: [-26, 0, 0], thighR: [-26, 0, 0], ankleL: [-20, 0, 0], ankleR: [-20, 0, 0] } },
      { t: 0.7, ease: 'outQuad', pose: { hipsPos: [0, -0.5, 0], torso: [44, -4, 3] } },
      { t: 0.98, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], hipsRot: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0] } },
    ],
    events: [{ t: 0.46, type: 'sfx', arg: 'whooshBig' }, { t: 0.52, type: 'hit', arg: 0 }, { t: 0.54, type: 'shake', arg: 0.5 }],
  },

  // ---------- ranged / channel ----------
  shoot: { // single right-arm shot — sharper side profile, real recoil kick
    dur: 0.5, upper: true,
    keys: [
      { t: 0, pose: { shoulderR: [-90, 0, 4], elbowR: [-4, 0, 0], shoulderL: [8, 0, -18], torso: [4, -18, -5], head: [0, 10, 0] } },
      { t: 0.12, ease: 'outBack', pose: { shoulderR: [-104, 0, 6], elbowR: [-18, 0, 0], torso: [-3, -11, -2], head: [-4, 7, 0] } },
      { t: 0.3, ease: 'outQuad', pose: { shoulderR: [-88, 0, 4], elbowR: [-6, 0, 0], torso: [3, -15, -4] } },
      { t: 0.5, ease: 'inOutQuad', pose: { shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], shoulderL: [0, 0, -10], torso: [0, 0, 0], head: [0, 0, 0] } },
    ],
    events: [{ t: 0.1, type: 'fire' }],
  },
  shootLoop: { // held channel: gatling / flame / freeze
    dur: 0.36, upper: true, loop: true,
    keys: [
      { t: 0, pose: { shoulderR: [-86, 0, 4], elbowR: [-8, 0, 0], torso: [4, -14, 0], head: [0, 8, 0], shoulderL: [-30, 25, -6], elbowL: [-70, 0, 0] } },
      { t: 0.18, ease: 'inOutQuad', pose: { shoulderR: [-90, 0, 4], torso: [3, -12, 0] } },
      { t: 0.36, ease: 'inOutQuad', pose: { shoulderR: [-86, 0, 4], torso: [4, -14, 0] } },
    ],
  },
  shootLow: { // hip-level channel (CRANKY's hose cannons): arms level/DOWN,
    // shell braced low — never raised overhead
    dur: 0.4, upper: true, loop: true,
    keys: [
      { t: 0, pose: { shoulderL: [-38, 14, -14], shoulderR: [-38, -14, 14], elbowL: [-6, 0, 0], elbowR: [-6, 0, 0], torso: [10, 0, 0], head: [-6, 0, 0], hipsPos: [0, -0.12, 0] } },
      { t: 0.2, ease: 'inOutQuad', pose: { torso: [12, 0, 0], shoulderL: [-42, 14, -14], shoulderR: [-42, -14, 14] } },
      { t: 0.4, ease: 'inOutQuad', pose: { torso: [10, 0, 0], shoulderL: [-38, 14, -14], shoulderR: [-38, -14, 14] } },
    ],
  },
  castRaise: { // arms skyward — deep coil then a full-body arch on release
    dur: 0.95,
    keys: [
      { t: 0, pose: {} },
      { t: 0.3, ease: 'inOutCubic', pose: { hipsPos: [0, -0.45, 0], torso: [16, 0, -8], head: [10, 0, 0], shoulderL: [-50, 0, -26], shoulderR: [-50, 0, 26], elbowL: [-75, 0, 0], elbowR: [-75, 0, 0], kneeL: [35, 0, 0], kneeR: [35, 0, 0], thighL: [-18, 0, 0], thighR: [-18, 0, 0] } },
      { t: 0.52, ease: 'outBack', pose: { hipsPos: [0, 0.18, 0], hipsRot: [-8, 0, 0], torso: [-22, 0, 6], head: [-24, 0, 0], shoulderL: [-175, 0, -20], shoulderR: [-175, 0, 20], elbowL: [-6, 0, 0], elbowR: [-6, 0, 0], kneeL: [4, 0, 0], kneeR: [4, 0, 0], thighL: [2, 0, 0], thighR: [2, 0, 0] } },
      { t: 0.95, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], hipsRot: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0] } },
    ],
    events: [{ t: 0.5, type: 'fire' }, { t: 0.5, type: 'sfx', arg: 'cast' }],
  },
  brace: { // artillery stance — wide stagger, torso rocked hard by the recoil
    dur: 0.95,
    keys: [
      { t: 0, pose: {} },
      { t: 0.3, ease: 'inOutCubic', pose: { hipsPos: [0, -0.5, 0], hipsRot: [0, -12, 0], torso: [-20, 10, -5], head: [-12, 0, 0], thighL: [-42, 0, 0], thighR: [18, 0, 0], kneeL: [55, 0, 0], kneeR: [38, 0, 0], shoulderL: [-40, 0, -18], shoulderR: [-40, 0, 18], elbowL: [-45, 0, 0], elbowR: [-45, 0, 0] } },
      { t: 0.55, ease: 'outBack', pose: { hipsPos: [0, -0.68, 0], torso: [-30, 12, -7], head: [-16, 0, 0] } },
      { t: 0.95, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], hipsRot: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0] } },
    ],
    events: [{ t: 0.5, type: 'fire' }, { t: 0.52, type: 'shake', arg: 0.4 }],
  },
  aim: { // sniper careful shot
    dur: 0.85, upper: true,
    keys: [
      { t: 0, pose: { shoulderR: [-84, 0, 2], elbowR: [-8, 0, 0], shoulderL: [-62, 30, -4], elbowL: [-65, 0, 0], torso: [2, -18, 0], head: [-2, 10, 0] } },
      { t: 0.38, ease: 'inOutQuad', pose: { shoulderR: [-86, 0, 2] } },
      { t: 0.46, ease: 'outCubic', pose: { shoulderR: [-96, 0, 2], torso: [0, -14, 0] } },
      { t: 0.85, ease: 'inOutQuad', pose: { shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], torso: [0, 0, 0], head: [0, 0, 0] } },
    ],
    events: [{ t: 0.42, type: 'fire' }],
  },

  // ---------- defense / reactions ----------
  block: {
    dur: 0.22, upper: true, hold: true,
    keys: [
      { t: 0, pose: {} },
      { t: 0.22, ease: 'outCubic', pose: { shoulderL: [-70, 30, -10], shoulderR: [-70, -30, 10], elbowL: [-105, 0, 0], elbowR: [-105, 0, 0], torso: [10, 0, 0], head: [8, 0, 0] } },
    ],
  },
  hitFlinch: {
    dur: 0.32,
    keys: [
      { t: 0, pose: {} },
      { t: 0.07, ease: 'outCubic', pose: { torso: [-22, 6, 0], head: [-18, 0, 0], shoulderL: [-30, 0, -26], shoulderR: [-30, 0, 26], elbowL: [-50, 0, 0], elbowR: [-50, 0, 0], hipsPos: [0, -0.15, 0] } },
      { t: 0.32, ease: 'inOutQuad', pose: { torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], hipsPos: [0, 0, 0] } },
    ],
  },
  launched: {
    dur: 0.7, loop: true,
    keys: [
      { t: 0, pose: { torso: [-30, 0, 0], head: [-20, 0, 0], shoulderL: [-130, 0, -35], shoulderR: [-100, 0, 40], elbowL: [-40, 0, 0], elbowR: [-60, 0, 0], thighL: [-45, 0, 0], thighR: [15, 0, 0], kneeL: [60, 0, 0], kneeR: [85, 0, 0] } },
      { t: 0.35, ease: 'inOutQuad', pose: { shoulderL: [-100, 0, -40], shoulderR: [-130, 0, 35], thighL: [-20, 0, 0], thighR: [-35, 0, 0] } },
      { t: 0.7, ease: 'inOutQuad', pose: { shoulderL: [-130, 0, -35], shoulderR: [-100, 0, 40], thighL: [-45, 0, 0], thighR: [15, 0, 0] } },
    ],
  },
  knockdown: {
    dur: 0.4, hold: true,
    keys: [
      { t: 0, pose: {} },
      { t: 0.4, ease: 'outQuad', pose: { hipsPos: [0, -2.55, 0.4], hipsRot: [-78, 0, 0], torso: [12, 0, 0], head: [25, 0, 0], shoulderL: [-40, 0, -55], shoulderR: [-40, 0, 55], elbowL: [-30, 0, 0], elbowR: [-30, 0, 0], thighL: [-25, 0, 0], thighR: [-40, 0, 0], kneeL: [45, 0, 0], kneeR: [70, 0, 0] } },
    ],
  },
  // ---------- ragdoll: limp finisher-victim poses (loop = never fade back
  // to the standing rest; the Finisher adds acceleration-driven flailing) --
  ragdollAir: { // carried / whipped around: everything dangles loose
    dur: 1.1, loop: true,
    keys: [
      { t: 0, pose: { hipsPos: [0, -0.1, 0], torso: [24, 6, 4], head: [34, -14, 8], shoulderL: [-24, 0, -58], shoulderR: [-14, 0, 66], elbowL: [-24, 0, 0], elbowR: [-42, 0, 0], handL: [20, 0, 0], handR: [26, 0, 0], thighL: [-14, 0, -10], thighR: [4, 0, 14], kneeL: [34, 0, 0], kneeR: [58, 0, 0], ankleL: [30, 0, 0], ankleR: [38, 0, 0] } },
      { t: 0.55, ease: 'inOutQuad', pose: { head: [30, -10, 6], shoulderL: [-20, 0, -54], shoulderR: [-18, 0, 62], kneeR: [52, 0, 0] } },
      { t: 1.1, ease: 'inOutQuad', pose: { head: [34, -14, 8], shoulderL: [-24, 0, -58], shoulderR: [-14, 0, 66], kneeR: [58, 0, 0] } },
    ],
  },
  ragdoll: { // downed: flat on the back, limbs flung asymmetric — a wreck,
    // not a fighter waiting to stand up
    dur: 1, loop: true,
    keys: [
      { t: 0, pose: { hipsPos: [0, -2.55, 0.4], hipsRot: [-78, 0, 0], torso: [10, 8, 0], head: [28, 18, 0], shoulderL: [-70, 0, -70], shoulderR: [-15, 0, 80], elbowL: [-45, 0, 0], elbowR: [-10, 0, 0], thighL: [-15, 0, -8], thighR: [-45, 0, 12], kneeL: [30, 0, 0], kneeR: [80, 0, 0] } },
      { t: 1, pose: { hipsPos: [0, -2.55, 0.4], hipsRot: [-78, 0, 0], torso: [10, 8, 0], head: [28, 18, 0], shoulderL: [-70, 0, -70], shoulderR: [-15, 0, 80], elbowL: [-45, 0, 0], elbowR: [-10, 0, 0], thighL: [-15, 0, -8], thighR: [-45, 0, 12], kneeL: [30, 0, 0], kneeR: [80, 0, 0] } },
    ],
  },

  getup: {
    dur: 0.75,
    keys: [
      { t: 0, pose: { hipsPos: [0, -2.55, 0.4], hipsRot: [-78, 0, 0], torso: [12, 0, 0], head: [25, 0, 0], shoulderL: [-40, 0, -55], shoulderR: [-40, 0, 55], elbowL: [-30, 0, 0], elbowR: [-30, 0, 0], thighL: [-25, 0, 0], thighR: [-40, 0, 0], kneeL: [45, 0, 0], kneeR: [70, 0, 0] } },
      { t: 0.35, ease: 'inOutCubic', pose: { hipsPos: [0, -1.5, 0.2], hipsRot: [-20, 0, 0], torso: [30, 0, 0], head: [0, 0, 0], kneeL: [95, 0, 0], kneeR: [95, 0, 0], thighL: [-55, 0, 0], thighR: [-55, 0, 0], ankleL: [-40, 0, 0], ankleR: [-40, 0, 0], shoulderL: [20, 0, -14], shoulderR: [20, 0, 14] } },
      { t: 0.75, ease: 'outQuad', pose: { hipsPos: [0, 0, 0], hipsRot: [0, 0, 0], torso: [0, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], head: [0, 0, 0] } },
    ],
  },
  dead: {
    dur: 1.3, hold: true,
    keys: [
      { t: 0, pose: {} },
      { t: 0.35, ease: 'inOutQuad', pose: { hipsPos: [0, -1.3, 0], torso: [25, 0, 8], head: [30, 0, 0], kneeL: [100, 0, 0], kneeR: [100, 0, 0], thighL: [-55, 0, 0], thighR: [-55, 0, 0], ankleL: [-45, 0, 0], ankleR: [-45, 0, 0], shoulderL: [10, 0, -20], shoulderR: [10, 0, 20] } },
      { t: 0.7, ease: 'inQuad', pose: { hipsPos: [0, -2.2, 0.3], hipsRot: [35, 0, 0], torso: [55, 0, 10], head: [40, 0, 0], shoulderL: [-30, 0, -40], shoulderR: [-30, 0, 40], elbowL: [-20, 0, 0], elbowR: [-20, 0, 0] } },
      { t: 1.3, ease: 'outBounce', pose: { hipsPos: [0, -2.5, 0.35], hipsRot: [42, 0, 0], torso: [60, 0, 12] } },
    ],
    events: [{ t: 0.7, type: 'sfx', arg: 'bodyfall' }, { t: 0.75, type: 'shake', arg: 0.4 }],
  },

  // ---------- specials ----------
  groundPound: {
    dur: 0.9,
    keys: [
      { t: 0, pose: {} },
      { t: 0.28, ease: 'inOutCubic', pose: { hipsPos: [0, 0.22, 0], hipsRot: [-6, 0, 0], torso: [-26, 0, 0], head: [-18, 0, 0], shoulderL: [-168, 0, -28], shoulderR: [-168, 0, 28], elbowL: [-26, 0, 0], elbowR: [-26, 0, 0] } },
      { t: 0.46, ease: 'inCubic', pose: { hipsPos: [0, -1.0, 0], hipsRot: [14, 0, 0], torso: [52, 0, 0], head: [18, 0, 0], shoulderL: [-45, 0, -12], shoulderR: [-45, 0, 12], elbowL: [-4, 0, 0], elbowR: [-4, 0, 0], kneeL: [70, 0, 0], kneeR: [70, 0, 0], thighL: [-36, 0, 0], thighR: [-36, 0, 0], ankleL: [-30, 0, 0], ankleR: [-30, 0, 0] } },
      { t: 0.62, ease: 'outQuad', pose: { hipsPos: [0, -0.8, 0] } },
      { t: 0.9, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], hipsRot: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0] } },
    ],
    events: [{ t: 0.44, type: 'fire' }, { t: 0.46, type: 'shake', arg: 0.8 }],
  },
  shieldBash: {
    dur: 0.58,
    keys: [
      { t: 0, pose: { torso: [6, 26, -6], hipsRot: [0, 12, 0], shoulderL: [-40, 0, -24], elbowL: [-90, 0, 0], head: [0, -8, 0] } },
      { t: 0.18, ease: 'outBack', pose: { torso: [10, -30, 8], hipsRot: [0, -14, 0], hipsPos: [0, -0.15, 0], shoulderL: [-92, -24, -2], elbowL: [-22, 0, 0], head: [0, 12, 0] } },
      { t: 0.34, ease: 'inOutQuad', pose: { torso: [7, -20, 5] } },
      { t: 0.58, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], head: [0, 0, 0] } },
    ],
    events: [{ t: 0.16, type: 'hit', arg: 0 }, { t: 0.16, type: 'sfx', arg: 'whooshBig' }],
  },
  lunge: { // dash-stab — body thrown flat, arms speared, trailing leg at full stretch
    dur: 0.6, hold: false,
    keys: [
      { t: 0, pose: {} },
      { t: 0.12, ease: 'outCubic', pose: { torso: [42, 0, -8], head: [-22, 0, 0], hipsRot: [12, 0, 0], shoulderL: [-108, 0, -10], shoulderR: [-108, 0, 10], elbowL: [-6, 0, 0], elbowR: [-6, 0, 0], thighL: [-52, 0, 0], thighR: [34, 0, 0], kneeL: [55, 0, 0], kneeR: [82, 0, 0], ankleR: [30, 0, 0], hipsPos: [0, -0.5, 0] } },
      { t: 0.42, ease: 'inOutQuad', pose: { torso: [32, 0, -5], hipsRot: [8, 0, 0] } },
      { t: 0.6, ease: 'inOutQuad', pose: { torso: [0, 0, 0], head: [0, 0, 0], hipsRot: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], ankleR: [0, 0, 0], hipsPos: [0, 0, 0] } },
    ],
    events: [{ t: 0.1, type: 'sfx', arg: 'dash' }],
  },
  chargeLean: { // bull rush / stampede loop — lower, hungrier, swaying with effort
    dur: 0.5, loop: true,
    keys: [
      { t: 0, pose: { torso: [50, 4, -4], head: [-26, 0, 0], hipsRot: [8, 0, 0], shoulderL: [36, 0, -34], shoulderR: [36, 0, 34], elbowL: [-20, 0, 0], elbowR: [-20, 0, 0], hipsPos: [0, -0.42, 0] } },
      { t: 0.25, ease: 'inOutQuad', pose: { torso: [54, -4, 4], hipsPos: [0, -0.5, 0], head: [-28, 0, 0] } },
      { t: 0.5, ease: 'inOutQuad', pose: { torso: [50, 4, -4], hipsPos: [0, -0.42, 0], head: [-26, 0, 0] } },
    ],
  },
  burst: { // nova / static field / backdraft / absolute zero — coil tight, detonate open
    dur: 0.78,
    keys: [
      { t: 0, pose: {} },
      { t: 0.26, ease: 'inOutCubic', pose: { hipsPos: [0, -0.7, 0], hipsRot: [6, 0, 0], torso: [30, 0, 0], head: [18, 0, 0], shoulderL: [-60, 45, -4], shoulderR: [-60, -45, 4], elbowL: [-130, 0, 0], elbowR: [-130, 0, 0], kneeL: [55, 0, 0], kneeR: [55, 0, 0], thighL: [-28, 0, 0], thighR: [-28, 0, 0] } },
      { t: 0.44, ease: 'outBack', pose: { hipsPos: [0, 0.3, 0], hipsRot: [-10, 0, 0], torso: [-26, 0, 0], head: [-22, 0, 0], shoulderL: [-30, 0, -88], shoulderR: [-30, 0, 88], elbowL: [-2, 0, 0], elbowR: [-2, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0] } },
      { t: 0.78, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], hipsRot: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0] } },
    ],
    events: [{ t: 0.42, type: 'fire' }, { t: 0.44, type: 'shake', arg: 0.7 }],
  },
  flurry: { // serpent storm / wild hunt claw loop — wide slashing arcs, hips whipping
    dur: 0.44, loop: true,
    keys: [
      { t: 0, pose: { torso: [12, 34, -10], hipsRot: [0, 12, 0], shoulderL: [-112, -26, 4], elbowL: [-8, 0, 0], shoulderR: [-24, 0, 26], elbowR: [-96, 0, 0], head: [0, -14, 0] } },
      { t: 0.22, ease: 'outBack', pose: { torso: [12, -34, 10], hipsRot: [0, -12, 0], shoulderR: [-112, 26, -4], elbowR: [-8, 0, 0], shoulderL: [-24, 0, -26], elbowL: [-96, 0, 0], head: [0, 14, 0] } },
      { t: 0.44, ease: 'outBack', pose: { torso: [12, 34, -10], hipsRot: [0, 12, 0], shoulderL: [-112, -26, 4], elbowL: [-8, 0, 0], shoulderR: [-24, 0, 26], elbowR: [-96, 0, 0], head: [0, -14, 0] } },
    ],
    events: [{ t: 0.05, type: 'hit', arg: 0 }, { t: 0.27, type: 'hit', arg: 0 }],
  },
  spinFire: { // bullet hurricane (root spun by combat) — leaning into the storm
    dur: 0.6, loop: true,
    keys: [
      { t: 0, pose: { shoulderL: [-84, 0, -14], shoulderR: [-84, 0, 14], elbowL: [-8, 0, 0], elbowR: [-8, 0, 0], hipsPos: [0, -0.38, 0], torso: [10, 0, -6], head: [-6, 0, 0], kneeL: [36, 0, 0], kneeR: [36, 0, 0], thighL: [-18, 0, 0], thighR: [-18, 0, 0] } },
      { t: 0.3, ease: 'inOutQuad', pose: { torso: [13, 0, 6], hipsPos: [0, -0.3, 0] } },
      { t: 0.6, ease: 'inOutQuad', pose: { torso: [10, 0, -6], hipsPos: [0, -0.38, 0] } },
    ],
  },
  spray: { // flame / napalm sweep channel
    dur: 0.9, upper: true, loop: true,
    keys: [
      { t: 0, pose: { shoulderR: [-84, -14, 4], elbowR: [-10, 0, 0], shoulderL: [-84, 14, -4], elbowL: [-10, 0, 0], torso: [6, 8, 0], head: [4, 0, 0] } },
      { t: 0.45, ease: 'inOutQuad', pose: { torso: [6, -8, 0], shoulderR: [-84, -10, 4], shoulderL: [-84, 18, -4] } },
      { t: 0.9, ease: 'inOutQuad', pose: { torso: [6, 8, 0], shoulderR: [-84, -14, 4], shoulderL: [-84, 14, -4] } },
    ],
  },
  clawSnap: { // CRANKY heavy — both claws spread WIDE to the sides, then
    // CLAMP together at the centerline like one giant pincer
    dur: 0.55,
    keys: [
      { t: 0, pose: {} },
      { t: 0.16, ease: 'outCubic', pose: { torso: [6, 0, 0], head: [-6, 0, 0], shoulderL: [-52, -34, -34], shoulderR: [-52, 34, 34], elbowL: [-14, 0, 0], elbowR: [-14, 0, 0], hipsPos: [0, -0.06, 0] } },
      { t: 0.3, ease: 'inCubic', pose: { torso: [12, 0, 0], head: [2, 0, 0], shoulderL: [-64, 40, 10], shoulderR: [-64, -40, -10], elbowL: [-38, 0, 0], elbowR: [-38, 0, 0], hipsPos: [0, -0.1, 0.14] } },
      { t: 0.42, ease: 'outQuad', pose: { torso: [10, 0, 0] } },
      { t: 0.55, ease: 'inOutQuad', pose: { torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], hipsPos: [0, 0, 0] } },
    ],
    events: [{ t: 0.28, type: 'sfx', arg: 'whooshBig' }, { t: 0.3, type: 'hit', arg: 0 }, { t: 0.31, type: 'sfx', arg: 'block' }, { t: 0.32, type: 'shake', arg: 0.5 }],
  },
  pounceLeap: { // SAURION pounce airtime — legs cocked under the body, sickle claws
    // raised to strike, arms swept back, head locked on prey (values are deltas
    // over his raptor rest pose)
    dur: 0.6, hold: true,
    keys: [
      { t: 0, pose: {} },
      { t: 0.22, ease: 'outCubic', pose: { torso: [10, 0, 0], head: [-10, 0, 0], shoulderL: [40, 0, -30], shoulderR: [40, 0, 30], elbowL: [-20, 0, 0], elbowR: [-20, 0, 0], thighL: [-28, 0, -4], thighR: [-28, 0, 4], kneeL: [24, 0, 0], kneeR: [24, 0, 0], ankleL: [-22, 0, 0], ankleR: [-22, 0, 0], hipsRot: [16, 0, 0] } },
    ],
  },
  biteLatch: { // SAURION perched ON TOP of prey — legs clenched in a deep
    // gripping crouch (talons in), body hunched low over them, head rearing
    // back then HAMMERING down in fast bird-of-prey pecks (leg/torso/head
    // values are deltas over his raptor rest pose)
    dur: 0.36, loop: true,
    keys: [
      { t: 0, pose: { torso: [22, 0, 0], head: [-14, 0, 0], shoulderL: [26, 0, -22], shoulderR: [26, 0, 22], elbowL: [-30, 0, 0], elbowR: [-30, 0, 0], thighL: [-24, 0, -10], thighR: [-24, 0, 10], kneeL: [40, 0, 0], kneeR: [40, 0, 0], ankleL: [-20, 0, 0], ankleR: [-20, 0, 0], hipsRot: [20, 0, 0], hipsPos: [0, -0.55, 0] } },
      { t: 0.16, ease: 'inCubic', pose: { torso: [38, 0, 0], head: [55, 0, 0], hipsRot: [26, 0, 0], hipsPos: [0, -0.68, 0] } },
      { t: 0.36, ease: 'outCubic', pose: { torso: [22, 0, 0], head: [-14, 0, 0], hipsRot: [20, 0, 0], hipsPos: [0, -0.55, 0] } },
    ],
  },
  grabReach: { // COLOSSUS: both hands lunge out low to seize the target
    dur: 0.3, hold: true,
    keys: [
      { t: 0, pose: {} },
      { t: 0.14, ease: 'outCubic', pose: { torso: [22, 0, 0], head: [-10, 0, 0], shoulderL: [-78, 12, -6], shoulderR: [-78, -12, 6], elbowL: [-16, 0, 0], elbowR: [-16, 0, 0], hipsPos: [0, -0.22, 0], hipsRot: [8, 0, 0] } },
    ],
  },
  liftHold: { // hoisting the catch overhead — arms drive straight up, back sets
    dur: 0.45, hold: true,
    keys: [
      { t: 0, pose: { torso: [18, 0, 0], shoulderL: [-95, 0, -10], shoulderR: [-95, 0, 10], elbowL: [-20, 0, 0], elbowR: [-20, 0, 0], hipsPos: [0, -0.2, 0] } },
      { t: 0.45, ease: 'outBack', pose: { torso: [-10, 0, 0], head: [-16, 0, 0], shoulderL: [-172, 0, -8], shoulderR: [-172, 0, 8], elbowL: [-6, 0, 0], elbowR: [-6, 0, 0], hipsPos: [0, 0.1, 0], hipsRot: [-4, 0, 0] } },
    ],
  },
  throwHeave: { // the launch: whole frame whips forward, arms hurl down the line
    dur: 0.5,
    keys: [
      { t: 0, pose: { torso: [-10, 0, 0], head: [-16, 0, 0], shoulderL: [-172, 0, -8], shoulderR: [-172, 0, 8], elbowL: [-6, 0, 0], elbowR: [-6, 0, 0], hipsPos: [0, 0.1, 0] } },
      { t: 0.16, ease: 'inCubic', pose: { torso: [34, 0, 0], head: [6, 0, 0], shoulderL: [-58, 0, -10], shoulderR: [-58, 0, 10], elbowL: [-14, 0, 0], elbowR: [-14, 0, 0], hipsPos: [0, -0.3, 0.1], hipsRot: [10, 0, 0] } },
      { t: 0.5, ease: 'inOutQuad', pose: { torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], hipsPos: [0, 0, 0], hipsRot: [0, 0, 0] } },
    ],
    events: [{ t: 0.1, type: 'sfx', arg: 'whooshBig' }, { t: 0.16, type: 'shake', arg: 0.5 }],
  },
  hangGrab: { // wall grab — punch hand locked onto the building, body hanging, legs braced
    dur: 0.25, hold: true,
    keys: [
      { t: 0, pose: {} },
      { t: 0.25, ease: 'outQuad', pose: { shoulderL: [-160, 0, -12], elbowL: [-16, 0, 0], shoulderR: [-42, 0, 24], elbowR: [-68, 0, 0], torso: [10, 0, -6], head: [-16, 0, 0], thighL: [-26, 0, -6], thighR: [-40, 0, 8], kneeL: [42, 0, 0], kneeR: [60, 0, 0], ankleL: [-14, 0, 0], ankleR: [-22, 0, 0], hipsRot: [6, 0, 0] } },
    ],
  },
};

// mirror a raw clip left<->right: swap L/R joint names, negate the y/z
// rotation components, and flip hipsPos.x — used to author one-sided
// attacks once and fire them from either arm
function mirrorRaw(raw) {
  const swap = (j) => (j.endsWith('L') ? j.slice(0, -1) + 'R' : j.endsWith('R') ? j.slice(0, -1) + 'L' : j);
  return {
    ...raw,
    keys: raw.keys.map((k) => {
      const pose = {};
      for (const [j, v] of Object.entries(k.pose)) {
        pose[swap(j)] = j === 'hipsPos' ? [-v[0], v[1], v[2]] : [v[0], -v[1], -v[2]];
      }
      return { ...k, pose };
    }),
  };
}
CLIPS_RAW.braceL = mirrorRaw(CLIPS_RAW.brace); // colossus fires the OTHER cannon
CLIPS_RAW.bigPunch2 = mirrorRaw(CLIPS_RAW.bigPunch1); // right haymaker, same wind-up
CLIPS_RAW.punchHold2 = mirrorRaw(CLIPS_RAW.punchHold1); // right-arm charge
CLIPS_RAW.punchRelease2 = mirrorRaw(CLIPS_RAW.punchRelease1);
CLIPS_RAW.stomp2 = mirrorRaw(CLIPS_RAW.stomp); // left-foot trample

// ---------- compile: degrees -> radians, sparse per-joint tracks ----------
const D2R = Math.PI / 180;

function compile(name, raw) {
  const tracks = {};
  const keys = [...raw.keys].sort((a, b) => a.t - b.t);
  for (const key of keys) {
    for (const [joint, v] of Object.entries(key.pose)) {
      if (!tracks[joint]) tracks[joint] = [];
      const isPos = joint === 'hipsPos';
      tracks[joint].push({
        t: key.t,
        ease: key.ease || 'inOutQuad',
        v: isPos ? [v[0], v[1], v[2]] : [v[0] * D2R, v[1] * D2R, v[2] * D2R],
      });
    }
  }
  return {
    name,
    dur: raw.dur,
    loop: !!raw.loop,
    hold: !!raw.hold,
    upper: !!raw.upper,
    tracks,
    events: raw.events || [],
  };
}

export const CLIPS = {};
for (const [name, raw] of Object.entries(CLIPS_RAW)) CLIPS[name] = compile(name, raw);
