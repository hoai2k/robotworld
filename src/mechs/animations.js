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
  light1: { // left jab
    dur: 0.42,
    keys: [
      { t: 0, pose: { torso: [4, -14, 0], shoulderL: [-25, 0, -12], elbowL: [-95, 0, 0], head: [0, 6, 0] } },
      { t: 0.13, ease: 'outCubic', pose: { torso: [6, 20, 0], shoulderL: [-92, -8, 0], elbowL: [-8, 0, 0], head: [0, -8, 0] } },
      { t: 0.24, ease: 'inOutQuad', pose: { torso: [5, 16, 0], shoulderL: [-80, -6, 0], elbowL: [-25, 0, 0] } },
      { t: 0.42, ease: 'inOutQuad', pose: { torso: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], head: [0, 0, 0] } },
    ],
    events: [{ t: 0.11, type: 'sfx', arg: 'whoosh' }, { t: 0.13, type: 'hit', arg: 0 }],
  },
  light2: { // right cross
    dur: 0.46,
    keys: [
      { t: 0, pose: { torso: [5, 16, 0], shoulderR: [-30, 0, 14], elbowR: [-100, 0, 0], head: [0, -6, 0] } },
      { t: 0.15, ease: 'outCubic', pose: { torso: [7, -24, 0], shoulderR: [-94, 8, 0], elbowR: [-6, 0, 0], head: [0, 8, 0] } },
      { t: 0.27, ease: 'inOutQuad', pose: { torso: [5, -18, 0], shoulderR: [-82, 6, 0], elbowR: [-24, 0, 0] } },
      { t: 0.46, ease: 'inOutQuad', pose: { torso: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], head: [0, 0, 0] } },
    ],
    events: [{ t: 0.13, type: 'sfx', arg: 'whoosh' }, { t: 0.15, type: 'hit', arg: 1 }],
  },
  light3: { // rising uppercut (launcher)
    dur: 0.62,
    keys: [
      { t: 0, pose: {} },
      { t: 0.18, ease: 'inOutQuad', pose: { hipsPos: [0, -0.5, 0], torso: [22, 14, 0], shoulderR: [15, 0, 10], elbowR: [-115, 0, 0], kneeL: [40, 0, 0], kneeR: [40, 0, 0], thighL: [-20, 0, 0], thighR: [-20, 0, 0] } },
      { t: 0.32, ease: 'outCubic', pose: { hipsPos: [0, 0.12, 0], torso: [-16, -18, 0], shoulderR: [-128, 6, 0], elbowR: [-28, 0, 0], head: [-10, 0, 0], kneeL: [5, 0, 0], kneeR: [5, 0, 0], thighL: [3, 0, 0], thighR: [3, 0, 0] } },
      { t: 0.62, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], torso: [0, 0, 0], shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], head: [0, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0] } },
    ],
    events: [{ t: 0.27, type: 'sfx', arg: 'whooshBig' }, { t: 0.3, type: 'hit', arg: 2 }],
  },
  heavy: { // two-hand overhead smash
    dur: 0.98,
    keys: [
      { t: 0, pose: {} },
      { t: 0.34, ease: 'inOutCubic', pose: { hipsPos: [0, -0.25, 0], torso: [-18, 0, 0], head: [-14, 0, 0], shoulderL: [-155, 0, -18], shoulderR: [-155, 0, 18], elbowL: [-45, 0, 0], elbowR: [-45, 0, 0] } },
      { t: 0.52, ease: 'inCubic', pose: { hipsPos: [0, -0.55, 0], torso: [38, 0, 0], head: [10, 0, 0], shoulderL: [-55, 0, -8], shoulderR: [-55, 0, 8], elbowL: [-10, 0, 0], elbowR: [-10, 0, 0], kneeL: [35, 0, 0], kneeR: [35, 0, 0], thighL: [-18, 0, 0], thighR: [-18, 0, 0] } },
      { t: 0.7, ease: 'inOutQuad', pose: { hipsPos: [0, -0.4, 0] } },
      { t: 0.98, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0] } },
    ],
    events: [{ t: 0.46, type: 'sfx', arg: 'whooshBig' }, { t: 0.52, type: 'hit', arg: 0 }, { t: 0.54, type: 'shake', arg: 0.5 }],
  },

  // ---------- ranged / channel ----------
  shoot: { // single right-arm shot
    dur: 0.5, upper: true,
    keys: [
      { t: 0, pose: { shoulderR: [-88, 0, 4], elbowR: [-4, 0, 0], torso: [2, -12, 0], head: [0, 6, 0] } },
      { t: 0.12, ease: 'outQuad', pose: { shoulderR: [-99, 0, 4], elbowR: [-14, 0, 0], torso: [0, -8, 0] } },
      { t: 0.3, ease: 'outQuad', pose: { shoulderR: [-88, 0, 4], elbowR: [-6, 0, 0] } },
      { t: 0.5, ease: 'inOutQuad', pose: { shoulderR: [0, 0, 10], elbowR: [-12, 0, 0], torso: [0, 0, 0], head: [0, 0, 0] } },
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
  castRaise: { // arms skyward — starfall / thunderfall / judgment
    dur: 0.95,
    keys: [
      { t: 0, pose: {} },
      { t: 0.3, ease: 'inOutCubic', pose: { hipsPos: [0, -0.3, 0], torso: [10, 0, 0], head: [8, 0, 0], shoulderL: [-40, 0, -20], shoulderR: [-40, 0, 20], elbowL: [-60, 0, 0], elbowR: [-60, 0, 0] } },
      { t: 0.52, ease: 'outBack', pose: { hipsPos: [0, 0.05, 0], torso: [-14, 0, 0], head: [-18, 0, 0], shoulderL: [-168, 0, -14], shoulderR: [-168, 0, 14], elbowL: [-10, 0, 0], elbowR: [-10, 0, 0] } },
      { t: 0.95, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0] } },
    ],
    events: [{ t: 0.5, type: 'fire' }, { t: 0.5, type: 'sfx', arg: 'cast' }],
  },
  brace: { // artillery firing stance
    dur: 0.95,
    keys: [
      { t: 0, pose: {} },
      { t: 0.3, ease: 'inOutCubic', pose: { hipsPos: [0, -0.45, 0], torso: [-16, 0, 0], head: [-10, 0, 0], thighL: [-30, 0, 0], thighR: [12, 0, 0], kneeL: [45, 0, 0], kneeR: [30, 0, 0], shoulderL: [-35, 0, -14], shoulderR: [-35, 0, 14], elbowL: [-40, 0, 0], elbowR: [-40, 0, 0] } },
      { t: 0.55, ease: 'outQuad', pose: { hipsPos: [0, -0.55, 0], torso: [-22, 0, 0] } },
      { t: 0.95, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0] } },
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
      { t: 0.28, ease: 'inOutCubic', pose: { hipsPos: [0, 0.1, 0], torso: [-20, 0, 0], head: [-14, 0, 0], shoulderL: [-160, 0, -22], shoulderR: [-160, 0, 22], elbowL: [-30, 0, 0], elbowR: [-30, 0, 0] } },
      { t: 0.46, ease: 'inCubic', pose: { hipsPos: [0, -0.85, 0], torso: [45, 0, 0], head: [15, 0, 0], shoulderL: [-40, 0, -10], shoulderR: [-40, 0, 10], elbowL: [-5, 0, 0], elbowR: [-5, 0, 0], kneeL: [60, 0, 0], kneeR: [60, 0, 0], thighL: [-30, 0, 0], thighR: [-30, 0, 0], ankleL: [-25, 0, 0], ankleR: [-25, 0, 0] } },
      { t: 0.62, ease: 'inOutQuad', pose: { hipsPos: [0, -0.7, 0] } },
      { t: 0.9, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], ankleL: [0, 0, 0], ankleR: [0, 0, 0] } },
    ],
    events: [{ t: 0.44, type: 'fire' }, { t: 0.46, type: 'shake', arg: 0.8 }],
  },
  shieldBash: {
    dur: 0.58,
    keys: [
      { t: 0, pose: { torso: [4, 18, 0], shoulderL: [-35, 0, -18], elbowL: [-80, 0, 0] } },
      { t: 0.18, ease: 'outCubic', pose: { torso: [8, -22, 0], shoulderL: [-85, -20, -5], elbowL: [-30, 0, 0], head: [0, 10, 0] } },
      { t: 0.34, ease: 'inOutQuad', pose: { torso: [6, -16, 0] } },
      { t: 0.58, ease: 'inOutQuad', pose: { torso: [0, 0, 0], shoulderL: [0, 0, -10], elbowL: [-12, 0, 0], head: [0, 0, 0] } },
    ],
    events: [{ t: 0.16, type: 'hit', arg: 0 }, { t: 0.16, type: 'sfx', arg: 'whooshBig' }],
  },
  lunge: { // dash-stab: phantom strike / pounce (root motion from combat)
    dur: 0.6, hold: false,
    keys: [
      { t: 0, pose: {} },
      { t: 0.12, ease: 'outCubic', pose: { torso: [32, 0, 0], head: [-15, 0, 0], shoulderL: [-95, 0, -8], shoulderR: [-95, 0, 8], elbowL: [-10, 0, 0], elbowR: [-10, 0, 0], thighL: [-40, 0, 0], thighR: [25, 0, 0], kneeL: [50, 0, 0], kneeR: [70, 0, 0], hipsPos: [0, -0.4, 0] } },
      { t: 0.42, ease: 'inOutQuad', pose: { torso: [26, 0, 0] } },
      { t: 0.6, ease: 'inOutQuad', pose: { torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], hipsPos: [0, 0, 0] } },
    ],
    events: [{ t: 0.1, type: 'sfx', arg: 'dash' }],
  },
  chargeLean: { // bull rush / stampede loop
    dur: 0.5, loop: true,
    keys: [
      { t: 0, pose: { torso: [42, 0, 0], head: [-20, 0, 0], shoulderL: [30, 0, -28], shoulderR: [30, 0, 28], elbowL: [-25, 0, 0], elbowR: [-25, 0, 0], hipsPos: [0, -0.35, 0] } },
      { t: 0.25, ease: 'inOutQuad', pose: { torso: [45, 0, 2], hipsPos: [0, -0.42, 0] } },
      { t: 0.5, ease: 'inOutQuad', pose: { torso: [42, 0, 0], hipsPos: [0, -0.35, 0] } },
    ],
  },
  burst: { // nova / static field / backdraft / absolute zero
    dur: 0.78,
    keys: [
      { t: 0, pose: {} },
      { t: 0.26, ease: 'inOutCubic', pose: { hipsPos: [0, -0.55, 0], torso: [22, 0, 0], head: [14, 0, 0], shoulderL: [-55, 40, -5], shoulderR: [-55, -40, 5], elbowL: [-120, 0, 0], elbowR: [-120, 0, 0], kneeL: [45, 0, 0], kneeR: [45, 0, 0], thighL: [-22, 0, 0], thighR: [-22, 0, 0] } },
      { t: 0.44, ease: 'outBack', pose: { hipsPos: [0, 0.12, 0], torso: [-18, 0, 0], head: [-16, 0, 0], shoulderL: [-25, 0, -75], shoulderR: [-25, 0, 75], elbowL: [-5, 0, 0], elbowR: [-5, 0, 0], kneeL: [0, 0, 0], kneeR: [0, 0, 0], thighL: [0, 0, 0], thighR: [0, 0, 0] } },
      { t: 0.78, ease: 'inOutQuad', pose: { hipsPos: [0, 0, 0], torso: [0, 0, 0], head: [0, 0, 0], shoulderL: [0, 0, -10], shoulderR: [0, 0, 10], elbowL: [-12, 0, 0], elbowR: [-12, 0, 0] } },
    ],
    events: [{ t: 0.42, type: 'fire' }, { t: 0.44, type: 'shake', arg: 0.7 }],
  },
  flurry: { // serpent storm / wild hunt claw loop
    dur: 0.44, loop: true,
    keys: [
      { t: 0, pose: { torso: [10, 26, 0], shoulderL: [-105, -20, 0], elbowL: [-15, 0, 0], shoulderR: [-20, 0, 20], elbowR: [-90, 0, 0], head: [0, -10, 0] } },
      { t: 0.22, ease: 'outCubic', pose: { torso: [10, -26, 0], shoulderR: [-105, 20, 0], elbowR: [-15, 0, 0], shoulderL: [-20, 0, -20], elbowL: [-90, 0, 0], head: [0, 10, 0] } },
      { t: 0.44, ease: 'outCubic', pose: { torso: [10, 26, 0], shoulderL: [-105, -20, 0], elbowL: [-15, 0, 0], shoulderR: [-20, 0, 20], elbowR: [-90, 0, 0], head: [0, -10, 0] } },
    ],
    events: [{ t: 0.05, type: 'hit', arg: 0 }, { t: 0.27, type: 'hit', arg: 0 }],
  },
  spinFire: { // bullet hurricane (root spun by combat)
    dur: 0.6, loop: true,
    keys: [
      { t: 0, pose: { shoulderL: [-80, 0, -12], shoulderR: [-80, 0, 12], elbowL: [-10, 0, 0], elbowR: [-10, 0, 0], hipsPos: [0, -0.3, 0], torso: [8, 0, 0], kneeL: [30, 0, 0], kneeR: [30, 0, 0], thighL: [-15, 0, 0], thighR: [-15, 0, 0] } },
      { t: 0.3, ease: 'inOutQuad', pose: { torso: [10, 0, 3] } },
      { t: 0.6, ease: 'inOutQuad', pose: { torso: [8, 0, 0] } },
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
