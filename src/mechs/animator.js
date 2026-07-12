// Pose-blend animation engine: procedural locomotion + keyframe action clips
// + additive impulses (recoil/flinch) + per-mech signature joint motion.
import * as THREE from 'three';
import { CLIPS, UPPER_JOINTS } from './animations.js';
import { ease, lerp, clamp, clamp01, TAU } from '../core/utils.js';

const _wp = new THREE.Vector3();
const _qa = new THREE.Quaternion();
const _qb = new THREE.Quaternion();
// Aegis tower shield: local rest carry, and the brace tilt applied when the
// shield is squared to the front during a block
const SHIELD_REST = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, -0.1, 0));
const SHIELD_BRACE = new THREE.Quaternion().setFromEuler(new THREE.Euler(-0.1, 0, 0));

const D2R = Math.PI / 180;
const ALL_JOINTS = [
  'torso', 'head', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR',
  'thighL', 'thighR', 'kneeL', 'kneeR', 'ankleL', 'ankleR',
];

function sampleTrack(track, t) {
  if (t <= track[0].t) return track[0].v;
  const last = track[track.length - 1];
  if (t >= last.t) return last.v;
  for (let i = 1; i < track.length; i++) {
    if (t <= track[i].t) {
      const a = track[i - 1], b = track[i];
      const f = ease[b.ease]((t - a.t) / (b.t - a.t));
      return [lerp(a.v[0], b.v[0], f), lerp(a.v[1], b.v[1], f), lerp(a.v[2], b.v[2], f)];
    }
  }
  return last.v;
}

export class Animator {
  constructor(mech) {
    this.mech = mech;
    this.J = mech.joints;
    this.D = mech.dims;
    this.s = mech.dims.scale;

    // rest pose: defaults + per-mech overrides (degrees in def)
    this.rest = {};
    for (const j of ALL_JOINTS) this.rest[j] = [0, 0, 0];
    this.rest.shoulderL = [0, 0, -10 * D2R];
    this.rest.shoulderR = [0, 0, 10 * D2R];
    this.rest.elbowL = [-12 * D2R, 0, 0];
    this.rest.elbowR = [-12 * D2R, 0, 0];
    if (mech.def.restPose) {
      for (const [j, v] of Object.entries(mech.def.restPose)) {
        this.rest[j] = [v[0] * D2R, v[1] * D2R, v[2] * D2R];
      }
    }

    // measure ground offset under rest pose so bent-leg mechs stand on ground
    this.applyPose(this.makeRestTarget());
    this.J.root.updateWorldMatrix(true, true);
    const rootY = this.J.root.position.y;
    let minAnkle = Infinity;
    for (const a of ['ankleL', 'ankleR']) {
      this.J[a].getWorldPosition(_wp);
      minAnkle = Math.min(minAnkle, _wp.y - rootY);
    }
    this.groundOffset = -(minAnkle - 0.32 * this.s);

    this.cur = this.makeRestTarget();   // smoothed applied pose
    this.phase = Math.random() * TAU;   // gait phase
    this.t = Math.random() * 100;       // global time (desyncs idles)
    this.action = null;
    this.impulses = [];
    this.spinVel = 0;                   // gatling spin
    this.fired = false;                 // convenience flag combat can poll
  }

  makeRestTarget() {
    const tgt = { hipsPos: [0, 0, 0], hipsRot: [0, 0, 0] };
    for (const j of ALL_JOINTS) tgt[j] = [...this.rest[j]];
    return tgt;
  }

  // ---------- action clips ----------
  play(name, opts = {}) {
    const clip = CLIPS[name];
    if (!clip) { console.warn('no clip', name); return 0; }
    this.action = {
      clip, t: 0, speed: opts.speed || 1, weight: 0,
      fadeIn: opts.fade ?? 0.07, fadingOut: false,
      onEvent: opts.onEvent || null, lastT: -1,
    };
    return clip.dur / (opts.speed || 1);
  }

  stop(fade = 0.12) {
    if (this.action) { this.action.fadingOut = true; this.action.fadeOut = fade; }
  }

  isPlaying(name) {
    return !!this.action && !this.action.fadingOut && (!name || this.action.clip.name === name);
  }

  addImpulse(joint, amp, freq = 26, decay = 9) {
    this.impulses.push({ joint, amp, freq, decay, t: 0 });
  }

  // ---------- main update ----------
  // ctx: { speed, maxSpeed, grounded, vy, blocking, dead, dashT, aimYaw, firing }
  update(dt, ctx = {}) {
    this.t += dt;
    const tgt = this.makeRestTarget();

    // ===== locomotion layer =====
    const speed = ctx.speed || 0;
    const maxSpeed = ctx.maxSpeed || 10;
    const ratio = clamp01(speed / maxSpeed);
    const grounded = ctx.grounded !== false;

    if (grounded && speed > 0.4) {
      // gait: stride freq from speed; heavier mechs stride slower
      const strideLen = 2.1 * this.s * (0.8 + 0.5 * ratio);
      this.phase += (speed / strideLen) * TAU * dt * 0.5;
      const ph = this.phase;
      const swing = (0.42 + 0.4 * ratio);
      const sinL = Math.sin(ph), sinR = Math.sin(ph + Math.PI);

      tgt.thighL[0] += -swing * sinL;
      tgt.thighR[0] += -swing * sinR;
      tgt.kneeL[0] += (0.55 + 0.5 * ratio) * Math.max(0, Math.sin(ph + 1.05));
      tgt.kneeR[0] += (0.55 + 0.5 * ratio) * Math.max(0, Math.sin(ph + Math.PI + 1.05));
      tgt.ankleL[0] += swing * 0.5 * sinL - 0.1 * ratio;
      tgt.ankleR[0] += swing * 0.5 * sinR - 0.1 * ratio;
      // counter-swing arms
      const armSwing = swing * 0.75;
      tgt.shoulderL[0] += armSwing * sinR;
      tgt.shoulderR[0] += armSwing * sinL;
      tgt.elbowL[0] += -0.25 - 0.3 * ratio * Math.max(0, sinR);
      tgt.elbowR[0] += -0.25 - 0.3 * ratio * Math.max(0, sinL);
      // body dynamics
      tgt.hipsPos[1] += -Math.abs(Math.cos(ph)) * 0.16 * ratio * this.s;
      tgt.hipsRot[0] += 0.10 * ratio;             // whole body pitches into the run
      tgt.hipsRot[1] += Math.sin(ph) * 0.09 * ratio;
      tgt.hipsRot[2] += Math.cos(ph) * 0.05 * ratio;
      tgt.torso[0] += 0.30 * ratio;               // stronger forward lean
      tgt.torso[1] += -Math.sin(ph) * 0.11 * ratio; // counter-rotate
      tgt.head[0] += -0.22 * ratio;               // eyes stay on the horizon
    } else if (grounded) {
      // idle: breathing + weight shift + personality sway
      const b = Math.sin(this.t * 1.7);
      tgt.torso[0] += b * 0.018;
      tgt.hipsPos[1] += Math.sin(this.t * 1.7 + 0.6) * 0.03 * this.s;
      tgt.shoulderL[2] += -b * 0.02;
      tgt.shoulderR[2] += b * 0.02;
      tgt.hipsRot[2] += Math.sin(this.t * 0.43) * 0.02;
      tgt.head[1] += Math.sin(this.t * 0.31) * 0.07;
      tgt.head[0] += Math.sin(this.t * 0.53) * 0.03;
    }

    if (!grounded) {
      // airborne: rising tuck vs falling spread by vy
      const rise = clamp((ctx.vy || 0) / 12, -1, 1);
      const tuck = Math.max(0, rise), fall = Math.max(0, -rise);
      tgt.thighL[0] += -0.5 * tuck - 0.25 * fall;
      tgt.thighR[0] += -0.2 * tuck + 0.15 * fall;
      tgt.kneeL[0] += 0.9 * tuck + 0.5 * fall;
      tgt.kneeR[0] += 0.5 * tuck + 0.3 * fall;
      tgt.shoulderL[2] += -0.35 - 0.3 * fall;
      tgt.shoulderR[2] += 0.35 + 0.3 * fall;
      tgt.shoulderL[0] += -0.3 * fall;
      tgt.shoulderR[0] += -0.3 * fall;
      tgt.torso[0] += 0.12 * tuck - 0.1 * fall;

      if (ctx.hovering) {
        // jet flight: pitch the whole frame forward with speed — Iron Man,
        // not elevator. Legs trail, head stays level.
        const h = ratio;
        tgt.hipsRot[0] += 0.16 + 0.30 * h;
        tgt.torso[0] += 0.08 + 0.14 * h;
        tgt.head[0] += -0.22 - 0.2 * h;
        tgt.thighL[0] += 0.28 * h;
        tgt.thighR[0] += 0.38 * h;
        tgt.kneeL[0] += 0.25 * h;
        tgt.kneeR[0] += 0.2 * h;
        tgt.shoulderL[2] += -0.12;
        tgt.shoulderR[2] += 0.12;
      }
    }

    if (ctx.dashT > 0) { // brief dash lean
      const d = clamp01(ctx.dashT / 0.25);
      tgt.torso[0] += 0.4 * d;
      tgt.head[0] += -0.25 * d;
    }

    // ===== quadruped amble =====
    // Beast-frame mechs (gait: 'quad' — bulls, wolves, apes, crabs) drop
    // onto all fours as the run picks up: frame pitches over the arms,
    // which become pounding front legs on the opposite beat of the hinds.
    if (grounded && speed > 0.4 && this.mech.def.gait === 'quad') {
      const q = clamp01((ratio - 0.4) / 0.35);
      if (q > 0.01) {
        const ph = this.phase;
        const fL = Math.sin(ph + 2.3), fR = Math.sin(ph + Math.PI + 2.3); // front pair leads
        // drop and level the frame over the ground
        tgt.hipsRot[0] += 0.5 * q;
        tgt.hipsPos[1] += -this.D.hipHeight * 0.22 * q;
        tgt.torso[0] += 0.18 * q;
        tgt.head[0] += -0.6 * q;                      // eyes back on the horizon
        // arms become front legs: reach down-forward, pounding alternately
        tgt.shoulderL[0] = lerp(tgt.shoulderL[0], -1.35 + fL * 0.5, q);
        tgt.shoulderR[0] = lerp(tgt.shoulderR[0], -1.35 + fR * 0.5, q);
        tgt.shoulderL[2] = lerp(tgt.shoulderL[2], -0.16, q);
        tgt.shoulderR[2] = lerp(tgt.shoulderR[2], 0.16, q);
        tgt.elbowL[0] = lerp(tgt.elbowL[0], -0.45 - Math.max(0, fL) * 0.55, q);
        tgt.elbowR[0] = lerp(tgt.elbowR[0], -0.45 - Math.max(0, fR) * 0.55, q);
        tgt.handL[0] = lerp(tgt.handL[0], 0.5, q);
        tgt.handR[0] = lerp(tgt.handR[0], 0.5, q);
        // hinds crouch deeper and the whole body bounds with the stride
        tgt.kneeL[0] += 0.25 * q;
        tgt.kneeR[0] += 0.25 * q;
        tgt.hipsPos[1] += Math.abs(Math.sin(ph)) * 0.12 * q * this.s;
      }
    }

    // ===== duck layer =====
    // ctx.duck is 0..duckDepth — 1 folds the mech into a full squat
    if (ctx.duck > 0.01) {
      const d = ctx.duck;
      tgt.hipsPos[1] -= d * this.D.hipHeight * 0.62;
      tgt.thighL[0] += -0.85 * d;
      tgt.thighR[0] += -0.85 * d;
      tgt.kneeL[0] += 1.5 * d;
      tgt.kneeR[0] += 1.5 * d;
      tgt.ankleL[0] += -0.62 * d;
      tgt.ankleR[0] += -0.62 * d;
      tgt.torso[0] += 0.34 * d;
      tgt.head[0] += -0.3 * d;
      // arms tuck in, guard up
      tgt.shoulderL[0] += -0.35 * d;
      tgt.shoulderR[0] += -0.35 * d;
      tgt.shoulderL[2] += 0.15 * d;
      tgt.shoulderR[2] += -0.15 * d;
      tgt.elbowL[0] += -0.55 * d;
      tgt.elbowR[0] += -0.55 * d;
    }

    // ===== action clip layer =====
    const act = this.action;
    if (act) {
      const clip = act.clip;
      const prevT = act.t;
      act.t += dt * act.speed;

      // event firing (with loop wrap)
      let evT = act.t;
      if (clip.loop && evT > clip.dur) evT = evT % clip.dur;
      for (const ev of clip.events) {
        const crossed = clip.loop
          ? this.loopCrossed(prevT % clip.dur, act.t % clip.dur, ev.t)
          : prevT < ev.t && act.t >= ev.t;
        if (crossed && act.onEvent) act.onEvent(ev.type, ev.arg);
      }

      // weight envelope
      if (act.fadingOut) {
        act.weight -= dt / (act.fadeOut || 0.12);
        if (act.weight <= 0) this.action = null;
      } else {
        act.weight = Math.min(1, act.weight + dt / act.fadeIn);
        if (!clip.loop && act.t >= clip.dur) {
          if (clip.hold) act.t = clip.dur;
          else { act.fadingOut = true; act.fadeOut = 0.12; }
        }
      }

      if (this.action) {
        const sampleT = clip.loop ? act.t % clip.dur : Math.min(act.t, clip.dur);
        const w = ease.inOutQuad(clamp01(act.weight));
        const joints = clip.upper ? UPPER_JOINTS : null;
        for (const [jname, track] of Object.entries(clip.tracks)) {
          if (joints && !joints.includes(jname) && jname !== 'hipsPos' && jname !== 'hipsRot') continue;
          const v = sampleTrack(track, sampleT);
          const base = tgt[jname];
          if (!base) continue;
          if (jname === 'hipsPos') {
            base[0] = lerp(base[0], v[0] * this.s, w);
            base[1] = lerp(base[1], v[1] * this.s, w);
            base[2] = lerp(base[2], v[2] * this.s, w);
          } else if (jname === 'hipsRot') {
            base[0] = lerp(base[0], v[0], w);
            base[1] = lerp(base[1], v[1], w);
            base[2] = lerp(base[2], v[2], w);
          } else {
            // legs keep their rest-pose bend (digitigrade mechs) during clips
            base[0] = lerp(base[0], v[0] + this.restBias(jname, 0), w);
            base[1] = lerp(base[1], v[1] + this.restBias(jname, 1), w);
            base[2] = lerp(base[2], v[2] + this.restBias(jname, 2), w);
          }
        }
      }
    }

    // ===== additive impulses =====
    for (let i = this.impulses.length - 1; i >= 0; i--) {
      const im = this.impulses[i];
      im.t += dt;
      const k = Math.sin(im.freq * im.t) * Math.exp(-im.decay * im.t);
      if (im.t > 1.2) { this.impulses.splice(i, 1); continue; }
      const base = tgt[im.joint];
      if (base) {
        base[0] += im.amp[0] * k;
        base[1] += im.amp[1] * k;
        base[2] += im.amp[2] * k;
      }
    }

    // ===== signature joints (personality) =====
    this.signature(dt, ctx, tgt);

    // ===== smooth & apply =====
    const rate = 1 - Math.exp(-26 * dt);
    for (const key of Object.keys(tgt)) {
      const c = this.cur[key] || (this.cur[key] = [...tgt[key]]);
      c[0] = lerp(c[0], tgt[key][0], rate);
      c[1] = lerp(c[1], tgt[key][1], rate);
      c[2] = lerp(c[2], tgt[key][2], rate);
    }
    this.applyPose(this.cur);
    this.mech.postAnimate?.(); // GLB rigs: retarget virtual joints onto bones
  }

  // rest-pose bias: digitigrade legs (and a predator's spine hunch) keep
  // their signature bend during action clips instead of snapping upright
  restBias(jname, i) {
    if (jname.startsWith('thigh') || jname.startsWith('knee') || jname.startsWith('ankle') ||
        jname === 'torso' || jname === 'head') {
      return this.rest[jname][i];
    }
    return 0;
  }

  loopCrossed(prev, cur, evT) {
    if (prev <= cur) return prev < evT && cur >= evT;
    return evT > prev || evT <= cur; // wrapped
  }

  applyPose(pose) {
    for (const j of ALL_JOINTS) {
      const v = pose[j];
      if (v && this.J[j]) this.J[j].rotation.set(v[0], v[1], v[2]);
    }
    const hips = this.J.hips;
    hips.position.set(
      pose.hipsPos[0],
      this.D.hipHeight + (this.groundOffset || 0) + pose.hipsPos[1],
      pose.hipsPos[2]
    );
    hips.rotation.set(pose.hipsRot[0], pose.hipsRot[1], pose.hipsRot[2]);
  }

  signature(dt, ctx, tgt) {
    const J = this.J, id = this.mech.def.id, t = this.t;
    switch (id) {
      case 'vulcan': {
        this.spinVel = ctx.firing ? Math.min(this.spinVel + dt * 40, 28) : Math.max(this.spinVel - dt * 18, 0);
        if (J.gatlingR) J.gatlingR.rotation.z += this.spinVel * dt;
        if (J.gatlingL) J.gatlingL.rotation.z -= this.spinVel * dt;
        break;
      }
      case 'nova':
        if (J.halo) J.halo.rotation.z += dt * (0.9 + (ctx.firing ? 4 : 0));
        break;
      case 'rhino': {
        // BULL RUSH: drop onto all fours and gallop like a charging beast.
        // Overrides the biped pose while the charge is rolling.
        if (ctx.charging) {
          const g = this.phase * 2.4;         // fast gallop cycle
          const fL = Math.sin(g), fR = Math.sin(g + Math.PI);
          const hips = J.hips, D = this.D;
          // pitch the whole frame down over the front limbs, ride low
          hips.rotation.x = 0.95;
          hips.position.y = D.hipHeight * 0.5 + (this.groundOffset || 0);
          if (J.torso) J.torso.rotation.set(0.45, 0, 0);
          if (J.head) J.head.rotation.set(-1.15, 0, 0); // head up, eyes forward
          // FRONT legs = the arms, reaching to the ground and pounding
          J.shoulderL.rotation.set(-1.5 + fL * 0.6, 0, -0.18);
          J.shoulderR.rotation.set(-1.5 + fR * 0.6, 0, 0.18);
          J.elbowL.rotation.set(-0.5 - Math.max(0, fL) * 0.6, 0, 0);
          J.elbowR.rotation.set(-0.5 - Math.max(0, fR) * 0.6, 0, 0);
          if (J.handL) J.handL.rotation.set(0.5, 0, 0);
          if (J.handR) J.handR.rotation.set(0.5, 0, 0);
          // BACK legs gallop on the opposite phase
          J.thighL.rotation.set(-0.2 + fR * 0.7, 0, 0);
          J.thighR.rotation.set(-0.2 + fL * 0.7, 0, 0);
          J.kneeL.rotation.set(0.5 + Math.max(0, -fR) * 0.7, 0, 0);
          J.kneeR.rotation.set(0.5 + Math.max(0, -fL) * 0.7, 0, 0);
          J.ankleL.rotation.set(-0.35, 0, 0);
          J.ankleR.rotation.set(-0.35, 0, 0);
        }
        break;
      }
      case 'fenrir': {
        const wag = 0.25 + (ctx.speed > 1 ? 0.5 : 0);
        for (let i = 0; i < 3; i++) {
          const tj = J['tail' + i];
          if (tj) {
            tj.rotation.y = Math.sin(t * (2.2 + wag * 2) + i * 0.9) * (0.18 + wag * 0.14);
            tj.rotation.x = Math.sin(t * 1.4 + i * 0.7) * 0.08 - 0.06;
          }
        }
        break;
      }
      case 'colossus':
        if (J.mortars) J.mortars.rotation.x = ctx.firing ? -0.25 : Math.sin(t * 0.4) * 0.03;
        break;
      case 'aegis': {
        // The tower shield rides the left forearm. While BLOCKING, cancel the
        // whole arm chain's rotation so the face presents square to the
        // front (never upside-down/backward); otherwise it settles back to
        // the natural forearm carry.
        const sh = J.shield;
        if (!sh) break;
        const blocking = this.action && !this.action.fadingOut && this.action.clip.name === 'block';
        if (blocking) {
          sh.parent.updateWorldMatrix(true, false);
          sh.parent.getWorldQuaternion(_qa).invert();          // undo arm chain
          this.J.root.getWorldQuaternion(_qb).multiply(SHIELD_BRACE); // face mech-forward
          _qa.multiply(_qb);
          sh.quaternion.slerp(_qa, 1 - Math.exp(-18 * dt));
        } else {
          sh.quaternion.slerp(SHIELD_REST, 1 - Math.exp(-10 * dt));
        }
        break;
      }
      case 'saurion': {
        // RAPTOR LOCOMOTION (researched theropod gait): the tail is a
        // travelling S-wave that wags side-to-side in time with the stride
        // to control angular momentum — raised at rest, whipping and
        // leveling out with speed — while the head counter-rotates to stay
        // stable on the prey as the body bobs and yaws.
        const run = clamp01((ctx.speed || 0) / (ctx.maxSpeed || 10));
        const ph = this.phase;
        // predator dynamics: mid-strike the tail LASHES (fast heavy whip for
        // balance); in a dash it stiffens straight back as a counterweight;
        // otherwise stride-synced wave when moving, gentle sway at idle.
        const lashing = this.action && !this.action.fadingOut && !this.action.clip.loop;
        const dashing = (ctx.dashT || 0) > 0;
        const wavePh = lashing ? t * 9 : run > 0.05 ? ph * 2 : t * 1.5;
        const amp = lashing ? 0.5 : dashing ? 0.06 : 0.1 + run * 0.3;
        for (let i = 0; i < 3; i++) {
          const tj = J['tail' + i];
          if (!tj) continue;
          // each segment lags the one before → an S-curve that runs down the tail
          tj.rotation.y = Math.sin(wavePh - i * 0.8) * amp;
          tj.rotation.x = (dashing ? 0.02 : 0.15 - run * 0.18) + Math.sin(wavePh * 0.5 - i * 0.5) * 0.05;
          tj.rotation.z = Math.cos(wavePh - i * 0.8) * amp * 0.3; // slight roll on the whip
        }
        // head stabilization: cancel the body's yaw sway + vertical bob so the
        // gaze holds level (real predators keep the head eerily still)
        if (J.head) {
          J.head.rotation.y -= Math.sin(ph) * 0.09 * run;
          J.head.rotation.x += Math.abs(Math.sin(ph)) * 0.06 * run - 0.03 * run;
        }
        break;
      }
      case 'frogger': {
        // FOUR ARMS as one creature: the upper cannon-pair pump in
        // ALTERNATION with the lower pair (counter-swing), like a galloping
        // four-limbed body, plus an idle bob so they never read as dead props.
        const c = this.cur;
        const run = clamp01((ctx.speed || 0) / (ctx.maxSpeed || 10));
        const attacking = this.action && !this.action.fadingOut && !this.action.clip.loop;
        // FROG LEAP: airborne, the cannon arms act like a diving frog's legs —
        // swept hard back while rising, splayed wide to brace for the landing.
        if (ctx.grounded === false) {
          const rise = clamp((ctx.vy || 0) / 12, -1, 1);
          const tuck = Math.max(0, rise), fall = Math.max(0, -rise);
          for (const sd of ['L', 'R']) {
            const sj = J['shoulder' + sd + '2'], ej = J['elbow' + sd + '2'];
            if (!sj || !ej) continue;
            const sx = sd === 'L' ? -1 : 1;
            sj.rotation.set(0.55 * tuck - 0.65 * fall, 0, sx * (0.18 * tuck - 0.38 * fall));
            ej.rotation.set(0.35 * tuck - 0.4 * fall, 0, 0);
          }
          break;
        }
        for (const sd of ['L', 'R']) {
          const sj = J['shoulder' + sd + '2'], ej = J['elbow' + sd + '2'];
          if (!sj || !ej || !c['shoulder' + sd]) continue;
          const sr = c['shoulder' + sd], er = c['elbow' + sd];
          const sx = sd === 'L' ? -1 : 1;
          // counter-swing the lower arm's pitch → the 4 limbs alternate
          const counter = -sr[0] * 0.7;
          const idle = Math.sin(t * 1.9 + (sd === 'L' ? 0 : Math.PI)) * 0.09 * (1 - run);
          // on an attack, the cannons rear back then punch forward with the arms
          const thrust = attacking ? sr[0] * 0.5 : 0;
          sj.rotation.set(counter * 0.7 + idle + thrust - 0.08, sr[1] * 0.4, sr[2] * 0.5 - sx * 0.06);
          ej.rotation.set(er[0] * 0.6 - 0.16 - run * 0.18, er[1] * 0.4, er[2] * 0.4);
        }
        break;
      }
      case 'cranky': {
        // crab menace: the pincers gape and breathe at rest, then SNAP shut
        // when a strike lands
        const striking = this.action && !this.action.fadingOut && !this.action.clip.loop;
        const gape = striking ? 0.02 : 0.34 + Math.sin(t * 1.4) * 0.14;
        for (const sd of ['L', 'R']) {
          const jw = J['jaw' + sd];
          if (jw) jw.rotation.x = lerp(jw.rotation.x, -gape, dt * (striking ? 22 : 8));
        }
        // crab SCUTTLE: stride-synced shell roll + waddle yaw so the walk
        // reads sideways-crabby (the static side-leg struts ride the hips)
        const scut = clamp01((ctx.speed || 0) / (ctx.maxSpeed || 10));
        if (scut > 0.05) {
          J.hips.rotation.z += Math.sin(this.phase) * 0.11 * scut;
          J.hips.rotation.y += Math.cos(this.phase) * 0.08 * scut;
          J.torso.rotation.z -= Math.sin(this.phase) * 0.06 * scut;
        }
        // hydro recoil: the whole shell kicks back while the cannons fire
        this._crankyRecoil = lerp(this._crankyRecoil || 0, ctx.firing ? 0.12 : 0, dt * (ctx.firing ? 18 : 6));
        J.torso.rotation.x -= this._crankyRecoil;
        break;
      }
      case 'jerry': {
        // NERVOUS CRUSTACEAN. Nothing about Jerry moves smoothly:
        // • antennae hold dead still, then SNAP to a new angle (randomized
        //   timer) like a startled insect re-aiming its sensors
        // • the little claw-arm nest ripples in a wave down the segments,
        //   and flares wide open while the cannons fire
        // • the head cocks in sharp little tilts on the same nerve timer
        // • the rear strut-legs creep in counter-phase with the stride
        this._nerveT = (this._nerveT ?? 0) - dt;
        if (this._nerveT <= 0) {
          this._nerveT = 0.4 + Math.random() * 1.5;
          this._antL = { x: -0.7 + Math.random() * 1.0, z: 0.15 + Math.random() * 0.65 };
          this._antR = { x: -0.7 + Math.random() * 1.0, z: -0.15 - Math.random() * 0.65 };
          this._cock = (Math.random() - 0.5) * 0.34;
        }
        const snap = 1 - Math.exp(-24 * dt); // fast ease = twitch, not sway
        if (J.antL && this._antL) {
          J.antL.rotation.x += (this._antL.x - J.antL.rotation.x) * snap;
          J.antL.rotation.z += (this._antL.z - J.antL.rotation.z) * snap;
        }
        if (J.antR && this._antR) {
          J.antR.rotation.x += (this._antR.x - J.antR.rotation.x) * snap;
          J.antR.rotation.z += (this._antR.z - J.antR.rotation.z) * snap;
        }
        tgt.head[2] += this._cock ?? 0;
        // arm-nest ripple
        const flare = ctx.firing ? 0.55 : 0;
        for (let i = 0; i < 3; i++) {
          for (const sd of ['L', 'R']) {
            const aj = J['armS' + i + sd];
            if (!aj) continue;
            const sx = sd === 'L' ? -1 : 1;
            aj.rotation.x = -0.25 + Math.sin(t * 3.4 - i * 1.15 + (sx > 0 ? 0.7 : 0)) * 0.3;
            aj.rotation.z = sx * (-0.3 - flare) + Math.cos(t * 2.7 - i * 0.9) * 0.14 * sx;
          }
        }
        // rear struts creep against the stride; twitchy scrabble in the air
        const mov = clamp01((ctx.speed || 0) / (ctx.maxSpeed || 10));
        for (const sd of ['L', 'R']) {
          const dj = J['legD' + sd];
          if (!dj) continue;
          if (!ctx.grounded) dj.rotation.x = Math.sin(t * 14 + (sd === 'L' ? 0 : 2)) * 0.2;
          else dj.rotation.x = Math.sin(this.phase + (sd === 'L' ? Math.PI : 0)) * 0.16 * mov;
        }
        break;
      }
      case 'viper':
        if (J.bladeL && J.bladeR) {
          const flare = ctx.firing || (this.action && !this.action.fadingOut) ? 0.0 : 0.35;
          J.bladeL.rotation.x = lerp(J.bladeL.rotation.x, flare, dt * 6);
          J.bladeR.rotation.x = lerp(J.bladeR.rotation.x, flare, dt * 6);
        }
        break;
    }
  }
}
