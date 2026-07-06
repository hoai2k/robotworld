// Pose-blend animation engine: procedural locomotion + keyframe action clips
// + additive impulses (recoil/flinch) + per-mech signature joint motion.
import * as THREE from 'three';
import { CLIPS, UPPER_JOINTS } from './animations.js';
import { ease, lerp, clamp, clamp01, TAU } from '../core/utils.js';

const _wp = new THREE.Vector3();

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
      tgt.hipsRot[1] += Math.sin(ph) * 0.09 * ratio;
      tgt.hipsRot[2] += Math.cos(ph) * 0.05 * ratio;
      tgt.torso[0] += 0.20 * ratio;               // forward lean
      tgt.torso[1] += -Math.sin(ph) * 0.11 * ratio; // counter-rotate
      tgt.head[0] += -0.12 * ratio;
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
    }

    if (ctx.dashT > 0) { // brief dash lean
      const d = clamp01(ctx.dashT / 0.25);
      tgt.torso[0] += 0.4 * d;
      tgt.head[0] += -0.25 * d;
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

  // rest-pose bias: digitigrade legs keep their bend during clips
  restBias(jname, i) {
    if (jname.startsWith('thigh') || jname.startsWith('knee') || jname.startsWith('ankle')) {
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
      case 'vulcan':
        if (J.gatling) {
          this.spinVel = ctx.firing ? Math.min(this.spinVel + dt * 40, 28) : Math.max(this.spinVel - dt * 18, 0);
          J.gatling.rotation.z += this.spinVel * dt;
        }
        break;
      case 'nova':
        if (J.halo) J.halo.rotation.z += dt * (0.9 + (ctx.firing ? 4 : 0));
        break;
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
