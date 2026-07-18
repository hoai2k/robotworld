// GLB animation profiles — per-model reinterpretation of the shared engine.
//
// WHY: the keyframe CLIPS in animations.js are authored for the PROCEDURAL
// rig — its rest pose, its proportions, its handedness (which hand holds a
// weapon, where a blade points). A Tripo GLB often differs: a weapon in the
// opposite hand, a sword fused to the forearm at an angle, a stance the auto
// rig bound in. Retargeting those clips verbatim warps the result.
//
// HOW: the Animator still drives the SAME virtual joints and the SAME timing
// (so combat hit-windows, muzzle anchors and state durations are unchanged —
// gameplay is identical). A profile only changes HOW a pose is expressed for
// one GLB, at four well-defined seams:
//
//   restPose    {joint:[x,y,z]deg}   overrides the default/idle stance
//   combatPose  {joint:[x,y,z]deg}   overrides the ready-guard stance
//   mirrorArms  bool                 swap L<->R arm clip tracks (weapon in the
//                                     opposite hand) — pitch kept, yaw/roll flip
//   clipOverrides {name: clip}       a bespoke clip for an action that can't be
//                                     remapped (redo, don't remap)
//   post(anim,dt,ctx,tgt)            per-frame reinterpretation hook, run after
//                                     the built-in signature(); write radians
//                                     into tgt / drive extra joints
//
// FACTORING CONTRACT:
//   • A change that should affect BOTH procedural and GLB  -> edit animations.js
//     (shared CLIPS) or the mech's def (roster.js).
//   • A change to a procedural mech's personality           -> animator.signature()
//   • A change to how ONE GLB interprets the shared motion   -> its profile here
//   • Static rest-pose alignment of a GLB (arms-down bind)   -> manifest
//     boneCorrections (via ?debug=models), NOT restPose here — keep the two
//     concerns separate so the pose tool stays the source of truth for bind.
//
// Procedural mechs have NO profile (mech.animProfile is undefined) and run the
// engine unchanged. Only GLB mechs (buildGlbMech) attach one.
import { lerp, clamp01 } from '../core/utils.js';

export const ARM_JOINTS = ['shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR'];
export function mirrorJointName(j) {
  if (j.endsWith('L')) return j.slice(0, -1) + 'R';
  if (j.endsWith('R')) return j.slice(0, -1) + 'L';
  return j;
}
// mirror a joint value across the sagittal plane: pitch (x) preserved, yaw (y)
// and roll (z) negated. Used with the L<->R name swap for mirrorArms.
export function mirrorValue(v) { return [v[0], -v[1], -v[2]]; }

// helper for post hooks: is an attack clip (non-looping action) playing?
function attacking(anim) {
  return !!(anim.action && !anim.action.fadingOut && !anim.action.clip.loop);
}
function blocking(anim, ctx) {
  const n = anim.action && !anim.action.fadingOut ? anim.action.clip.name : '';
  return !!ctx.blocking || n === 'block';
}

// ---- per-GLB profiles ----------------------------------------------------
// Each entry documents that model's default-pose read and only overrides what
// the shared engine gets wrong for it. Empty {} = the retargeted procedural
// motion already reads correctly (verified) — a home for future tweaks.
export const GLB_ANIM = {
  // AEGIS — tower shield on the LEFT forearm, energy lance in the RIGHT hand:
  // same handedness as procedural, so clips map straight across (no mirror).
  // The procedural mech keeps the shield squared to the front via a J.shield
  // joint the GLB lacks, so reproduce that intent here: while guarding, raise
  // and square the left forearm so the shield faces the enemy.
  aegis: {
    post(anim, dt, ctx, tgt) {
      const guard = blocking(anim, ctx) ? 1 : (ctx.alwaysReady && !attacking(anim) ? 0.6 : 0);
      if (guard > 0.01) {
        tgt.shoulderL[0] = lerp(tgt.shoulderL[0], -0.55, guard);
        tgt.shoulderL[2] = lerp(tgt.shoulderL[2], 0.40, guard); // across the chest
        tgt.elbowL[0] = lerp(tgt.elbowL[0], -1.2, guard);       // forearm vertical
        tgt.handL[2] = lerp(tgt.handL[2], 0, guard);
      }
    },
  },

  // VIPER — twin energy blades ride ALONG THE FOREARMS at an angle (not held
  // in the hands). A hand ROLL/yaw that would swing an in-hand sword instead
  // twists a forearm blade flat, so during an attack damp hand roll/yaw and
  // let the shoulder+elbow arc carry the slash. Preserves the swing's intent.
  viper: {
    post(anim, dt, ctx, tgt) {
      if (attacking(anim)) {
        tgt.handL[1] *= 0.3; tgt.handR[1] *= 0.3;
        tgt.handL[2] *= 0.2; tgt.handR[2] *= 0.2;
      }
    },
  },

  // The rest read correctly with the retargeted procedural motion (verified
  // in ?debug=3d showcase/battle). Entries kept so each GLB has a documented
  // home for future per-model animation work.
  titanus: {},   // heavy biped brawler — direct map
  nova: {},      // slender caster — direct map (halo is procedural-only)
  rhino: {},     // charger — bull-rush carriage is tgt-driven, shape-shared
  fenrir: {},    // quadruped — gallop gait is def.gait:'quad', shape-shared
  colossus: {},  // artillery biped — direct map (mortars procedural-only)
  wraith: {},    // rifle biped — direct map
  inferno: {},   // flamer biped — direct map (levelHands is shape-shared)
  glacier: {},   // heavy biped — direct map
  cranky: {},    // crab — scuttle is tgt-driven, shape-shared
  saurion: {},   // raptor — theropod carriage is tgt-driven, shape-shared
  frogger: {},   // four-arm — lower arms are procedural-only joints
  jerry: {},     // crustacean — antennae/struts are procedural-only joints
  nullbot: {},   // humanoid — direct map (glitch strobe is material-only)
};

export function profileFor(id) { return GLB_ANIM[id] || null; }
