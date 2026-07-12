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
  light1: { // left jab — hips coil right, whip left through the punch
    dur: 0.42,
    keys: [
      { t: 0, pose: { torso: [6, -22, -6], hipsRot: [0, -10, 0], shoulderL: [-30, 8, -18], elbowL: [-108, 0, 0], shoulderR: [10, 0, 18], head: [0, 10, 0] } },
      { t: 0.13, ease: 'outBack', pose: { torso: [10, 26, 8], hipsRot: [0, 14, 0], hipsPos: [0, -0.12, 0], shoulderL: [-98, -14, 24], elbowL: [-4, 0, 0], shoulderR: [18, 0, 26], head: [0, -12, 0] } },
      { t: 0.24, ease: 'inOutQuad', pose: { torso: [7, 18, 5], hipsRot: [0, 10, 0], shoulderL: [-84, -10, 18], elbowL: [-24, 0, 0] } },
      { t: 0.42, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], shoulderR: [0, 0, 10], head: [0, 0, 0] } },
    ],
    events: [{ t: 0.11, type: 'sfx', arg: 'whoosh' }, { t: 0.13, type: 'hit', arg: 0 }],
  },
  light2: { // right cross — bigger counter-twist, shoulders thrown through
    dur: 0.46,
    keys: [
      { t: 0, pose: { torso: [7, 24, 6], hipsRot: [0, 12, 0], shoulderR: [-35, -8, 20], elbowR: [-112, 0, 0], shoulderL: [12, 0, -20], head: [0, -10, 0] } },
      { t: 0.15, ease: 'outBack', pose: { torso: [10, -30, -8], hipsRot: [0, -16, 0], hipsPos: [0, -0.14, 0], shoulderR: [-100, 14, -24], elbowR: [-2, 0, 0], shoulderL: [20, 0, -28], head: [0, 12, 0] } },
      { t: 0.27, ease: 'inOutQuad', pose: { torso: [7, -20, -5], hipsRot: [0, -11, 0], shoulderR: [-86, 10, -18], elbowR: [-22, 0, 0] } },
      { t: 0.46, ease: 'inOutQuad', pose: { torso: [0, 0, 0], hipsRot: [0, 0, 0], hipsPos: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], shoulderL: [0, 0, -10], head: [0, 0, 0] } },
    ],
    events: [{ t: 0.13, type: 'sfx', arg: 'whoosh' }, { t: 0.15, type: 'hit', arg: 1 }],
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
  clawSnap: { // CRANKY heavy — claws spread WIDE apart, then scissor shut in one violent snap
    dur: 0.55,
    keys: [
      { t: 0, pose: {} },
      { t: 0.16, ease: 'outCubic', pose: { torso: [6, 14, 0], head: [-6, 0, 0], shoulderL: [-26, 0, -38], shoulderR: [-26, 0, 38], elbowL: [-30, 0, 0], elbowR: [-30, 0, 0], hipsPos: [0, -0.06, 0] } },
      { t: 0.3, ease: 'inCubic', pose: { torso: [14, -8, 0], head: [4, 0, 0], shoulderL: [-78, 0, 6], shoulderR: [-78, 0, -6], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], hipsPos: [0, -0.1, 0.14] } },
      { t: 0.42, ease: 'outQuad', pose: { torso: [12, -6, 0] } },
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
  biteLatch: { // SAURION riding pinned prey — hunched over it, jaws working, claws hooked in
    dur: 0.5, loop: true,
    keys: [
      { t: 0, pose: { torso: [16, 0, 0], head: [4, 0, 0], shoulderL: [-70, 0, 14], shoulderR: [-70, 0, -14], elbowL: [-46, 0, 0], elbowR: [-46, 0, 0], hipsRot: [10, 0, 0] } },
      { t: 0.25, ease: 'inCubic', pose: { torso: [24, 0, 0], head: [22, 0, 0], shoulderL: [-74, 0, 14], shoulderR: [-74, 0, -14], elbowL: [-50, 0, 0], elbowR: [-50, 0, 0], hipsRot: [12, 0, 0] } },
      { t: 0.5, ease: 'outCubic', pose: { torso: [16, 0, 0], head: [4, 0, 0], shoulderL: [-70, 0, 14], shoulderR: [-70, 0, -14], elbowL: [-46, 0, 0], elbowR: [-46, 0, 0], hipsRot: [10, 0, 0] } },
    ],
  },
};

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
