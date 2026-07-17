// Cinematic KO finishers: when a round ends with a kill, the winner and the
// corpse become camera puppets and a ~7s per-mech execution plays out on a
// locked-off cinematic camera before the normal round-end flow resumes.
//
// The system is a tiny timeline: at(t, fn) fires one-shot beats, and
// hold(t0, t1, fn) runs every frame across a span with a normalized k —
// used for approach glides, carries, topples and camera shots. Later holds
// win (they overwrite this.cam / positions each frame), so scripts layer
// close-ups over the default wide shot just by adding them.
import * as THREE from 'three';
import { rand, clamp01, lerp } from '../core/utils.js';
import { GeyserFX } from '../combat/geyserfx.js';
import { FlameFX } from '../combat/flamefx.js';

const smooth = (k) => k * k * (3 - 2 * k);
const _ct = new THREE.Vector3();

export class Finisher {
  constructor(world, winner, victim, onDone) {
    this.w = world;
    this.win = winner;
    this.vic = victim;
    this.onDone = onDone;
    this.t = 0;
    this.dur = 7.2;
    this.acts = [];
    this.holds = [];
    this.cleanups = []; // script-registered teardown (DOM overlays etc.)
    this.cam = { pos: new THREE.Vector3(), look: new THREE.Vector3() };

    winner.cinePuppet = victim.cinePuppet = true;
    winner.vel.set(0, 0, 0);
    victim.vel.set(0, 0, 0);
    victim.group.rotation.x = 0;
    victim.group.rotation.z = 0;
    victim.pos.y = Math.max(0, victim.pos.y);
    winner.pos.y = Math.max(0, winner.pos.y);

    // stage geometry: the action centers on where the victim fell
    const dx = world.wrapDelta(victim.pos.x - winner.pos.x);
    const dz = world.wrapDelta(victim.pos.z - winner.pos.z);
    this.axis = Math.atan2(dx, dz); // winner -> victim
    this.center = new THREE.Vector3(victim.pos.x, 0, victim.pos.z);
    this.startPos = winner.pos.clone();
    victim.yaw = victim.targetYaw = this.axis + Math.PI; // dazed, facing doom
    victim.group.rotation.y = victim.yaw;
    victim.animator.stop(0.15); // back on their feet for the last moment

    this.stageScale = Math.max(1, (winner.height + victim.height) / 11);
    // default wide establishing orbit — a front-side quarter (never square
    // behind the winner's back); scripts layer their shots over it
    this.camShot(0, this.dur, { dist: 15, h: 6, lookH: 3, az0: 2.15, az1: 2.6 });
    (SCRIPTS[winner.def.id] || SCRIPTS.default)(this);
  }

  at(t, fn) { this.acts.push({ t, fn, done: false }); }
  hold(t0, t1, fn) { this.holds.push({ t0, t1, fn }); }

  // winner strides from wherever they were to `dist` in front of the victim
  approach(t0, t1, dist) {
    const from = this.startPos;
    this.hold(t0, t1, (k, dt) => {
      const e = smooth(k);
      this.win.pos.x = lerp(from.x, this.center.x - Math.sin(this.axis) * dist, e);
      this.win.pos.z = lerp(from.z, this.center.z - Math.cos(this.axis) * dist, e);
      this.win.pos.y = Math.max(0, from.y * (1 - e));
      this.win.yaw = this.win.targetYaw = this.axis;
      // striding, not sliding — feeds the frame's animator ctx
      this.winCtx = { speed: k < 0.97 ? 8 : 0, maxSpeed: 10, grounded: true };
    });
  }

  // never a midsection close-up: if the taller combatant's head would fall
  // outside the ~46° lens at this framing, lift the look target until the
  // head fits back in frame (wide shots are untouched — only genuinely
  // tight shots get corrected)
  headSafe() {
    // a fighter standing much closer to the lens than the look point sits
    // angularly far higher than the look-point distance suggests, so clamp
    // against each fighter's own distance, not just the look point's
    const dLook = this.cam.pos.distanceTo(this.cam.look) || 1;
    for (const f of [this.win, this.vic]) {
      if (!f.group.visible) continue;
      const dF = Math.hypot(f.pos.x - this.cam.pos.x, f.pos.z - this.cam.pos.z);
      const maxUp = 0.36 * Math.min(dLook, Math.max(2.5, dF));
      const headY = f.pos.y + f.height;
      if (headY - this.cam.look.y > maxUp) this.cam.look.y = headY - maxUp;
    }
  }

  // orbiting camera around the action center (angles relative to the axis).
  // All distances/heights scale with the combatants' stature so a 9-unit
  // colossus gets the same framing as a lean viper.
  camShot(t0, t1, { az0 = 2.7, az1 = 3.1, dist = 12, h = 4.5, lookH = 2.6, dolly = 0 } = {}) {
    const S = this.stageScale;
    this.hold(t0, t1, (k) => {
      const az = this.axis + lerp(az0, az1, k);
      const d = (dist + dolly * smooth(k)) * S;
      this.cam.pos.set(this.center.x + Math.sin(az) * d, h * S, this.center.z + Math.cos(az) * d);
      this.cam.look.set(this.center.x, lookH * S, this.center.z);
      this.headSafe();
    });
  }

  // action cam: rides perpendicular to the LIVE winner<->victim line so the
  // combatants stay in profile and the winner can never wander between the
  // lens and the kill — for phases where the fight chases around the arena
  camAction(t0, t1, { dist = 12, h = 3.8, lookH = 2.3, side = 1, bias = 0.6, rate = 3 } = {}) {
    const S = this.stageScale;
    let az, mx, mz;
    this.hold(t0, t1, (k, dt) => {
      const dx = this.w.wrapDelta(this.vic.pos.x - this.win.pos.x);
      const dz = this.w.wrapDelta(this.vic.pos.z - this.win.pos.z);
      const tx = lerp(this.win.pos.x, this.vic.pos.x, bias);
      const tz = lerp(this.win.pos.z, this.vic.pos.z, bias);
      if (az === undefined) { az = this.axis + side * Math.PI / 2; mx = tx; mz = tz; }
      if (Math.hypot(dx, dz) > 0.6) { // coincident bodies: keep last azimuth
        const want = Math.atan2(dx, dz) + side * Math.PI / 2;
        az += Math.atan2(Math.sin(want - az), Math.cos(want - az)) * Math.min(1, dt * rate);
      }
      const a = Math.min(1, dt * 5);
      mx += (tx - mx) * a;
      mz += (tz - mz) * a;
      this.cam.pos.set(mx + Math.sin(az) * dist * S, h * S, mz + Math.cos(az) * dist * S);
      this.cam.look.set(mx, lookH * S, mz);
      this.headSafe();
    });
  }

  // softly glue the action center (and thus every camShot) to wherever the
  // victim gets bashed to, so the camera follows the carnage
  trackCenter(t0, t1, rate = 4) {
    this.hold(t0, t1, (k, dt) => {
      const a = Math.min(1, dt * rate);
      this.center.x += this.w.wrapDelta(this.vic.pos.x - this.center.x) * a;
      this.center.z += this.w.wrapDelta(this.vic.pos.z - this.center.z) * a;
    });
  }

  sparks(n = 14, power = 10, color = 0xffcf7a) {
    this.w.effects.impactSparks(this.vic.center(), color, n, power);
  }
  beat(sfx = 'hitHeavy', shake = 0.55, stop = 0.07) {
    this.w.audio?.play(sfx);
    this.w.effects.addShake(shake);
    if (stop) this.w.engine.addHitStop(stop);
  }
  vicFlinch() {
    this.vic.animator.play('hitFlinch', { speed: 1.3 });
    this.vic.animator.addImpulse('torso', [-0.35, 0, 0], 30, 10);
  }
  // fallen or carried victims go LIMP: a looping ragdoll pose plus
  // acceleration-driven flailing (see update) — the pose never fades back
  // to standing, so a stomped wreck stays a wreck
  ragdoll(f, clip = 'ragdollAir') {
    f.animator.play(clip);
    this._rag = this._rag || new Map();
    if (!this._rag.has(f)) {
      this._rag.set(f, { px: f.pos.x, py: f.pos.y, pz: f.pos.z, vx: 0, vy: 0, vz: 0, cd: 0 });
    }
  }

  vicDown() { this.ragdoll(this.vic, 'ragdoll'); }
  finaleBurst(color = 0xffa040) {
    const c = this.vic.center();
    this.w.effects.explosion(c, 4.5, { color });
    this.w.effects.addShake(1);
    this.w.audio?.play('explosionBig');
  }
  // winner hero pose + a low front camera pushing in for the last beats
  triumph(t, clip = 'victory', sfx = 'powerup') {
    this.at(t, () => {
      this.win.animator.play(clip);
      this.w.audio?.play(sfx);
    });
    const S = this.stageScale;
    this.hold(t, this.dur, (k) => {
      const az = this.win.yaw + lerp(-0.35, 0.15, k);
      const d = (10.5 - 3 * smooth(k)) * S;
      this.cam.pos.set(this.win.pos.x + Math.sin(az) * d, (2 + 1.6 * smooth(k)) * S, this.win.pos.z + Math.cos(az) * d);
      this.cam.look.set(this.win.pos.x, this.win.height * 0.7, this.win.pos.z);
      this.headSafe();
    });
  }

  // shove the corpse around: a short bounce arc + slide + spin so big hits
  // visibly BASH the body instead of leaving it parked
  vicBash(t, ang, dist = 2.2, up = 1.4, spin = 0.8) {
    let sx, sz, sy;
    this.hold(t, t + 0.34, (k) => {
      if (sx === undefined) { sx = this.vic.pos.x; sz = this.vic.pos.z; sy = this.vic.group.rotation.y; }
      const e = smooth(k);
      this.vic.pos.x = sx + Math.sin(ang) * dist * e;
      this.vic.pos.z = sz + Math.cos(ang) * dist * e;
      this.vic.pos.y = Math.sin(Math.min(1, k) * Math.PI) * up;
      this.vic.group.rotation.y = sy + spin * e;
    });
  }

  // bake a white spectre of the winner's current pose (wraith's ghost)
  makeSpectre() {
    const gmat = new THREE.MeshBasicMaterial({
      color: 0xdfefff, transparent: true, opacity: 0.34,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const ghost = new THREE.Group();
    this.win.mech.group.updateWorldMatrix(true, true);
    this.win.mech.group.traverse((o) => {
      if (!o.isMesh) return;
      const m = new THREE.Mesh(o.geometry, gmat);
      m.matrixAutoUpdate = false;
      m.matrix.copy(o.matrixWorld);
      ghost.add(m);
    });
    ghost.visible = false;
    this.w.scene.add(ghost);
    this._spectre = { ghost, gmat };
    return ghost;
  }
  dropSpectre() {
    if (!this._spectre) return;
    this.w.scene.remove(this._spectre.ghost);
    this._spectre.gmat.dispose();
    this._spectre = null;
  }

  // ---- skip: hold A (Space/Enter/jump) for 1s to cut straight to the end.
  // A green Ⓐ chip with a filling ring + SKIP label appears while held. ----
  updateSkip(dt) {
    const inp = this.w.input;
    if (!inp || this.ended) return;
    let held = inp.key?.('Space') || inp.key?.('Enter');
    for (let i = 0; i < 4 && !held; i++) if (inp.padHeld?.(i, 'A')) held = true;
    if (!held && inp.touch?.held?.has('jump')) held = true;
    if (held) {
      this.skipT = (this.skipT || 0) + dt;
      this.showSkipUI();
      if (this.skipT >= 1) { this.end(); return; }
    } else {
      this.skipT = Math.max(0, (this.skipT || 0) - dt * 3);
      if (this.skipT <= 0) this.hideSkipUI();
    }
    if (this._skipRing) {
      this._skipRing.style.background =
        `conic-gradient(#7be87b ${Math.min(1, this.skipT) * 360}deg, rgba(120,232,120,0.15) 0deg)`;
    }
  }

  showSkipUI() {
    if (this._skipUI) return;
    const el = document.createElement('div');
    el.style.cssText = 'position:absolute;bottom:9%;left:50%;transform:translateX(-50%);' +
      'z-index:8;display:flex;align-items:center;gap:12px;pointer-events:none;' +
      'font:700 15px monospace;color:#cfeaff;text-shadow:0 1px 3px #000;';
    el.innerHTML = `
      <div style="position:relative;width:46px;height:46px;">
        <div class="skip-ring" style="position:absolute;inset:0;border-radius:50%;"></div>
        <div style="position:absolute;inset:4px;border-radius:50%;background:#0d1620;
          display:flex;align-items:center;justify-content:center;
          font:800 22px sans-serif;color:#7be87b;">A</div>
      </div>
      <span style="letter-spacing:0.25em">SKIP</span>`;
    document.getElementById('ui-root')?.appendChild(el);
    this._skipUI = el;
    this._skipRing = el.querySelector('.skip-ring');
  }

  hideSkipUI() {
    this._skipUI?.remove();
    this._skipUI = null;
    this._skipRing = null;
  }

  update(dt) {
    this.t += dt;
    this.updateSkip(dt);
    if (this.ended) return;
    for (const a of this.acts) {
      if (!a.done && this.t >= a.t) { a.done = true; a.fn(); }
    }
    for (const h of this.holds) {
      if (this.t >= h.t0 && this.t <= h.t1) {
        h.fn(clamp01((this.t - h.t0) / Math.max(1e-4, h.t1 - h.t0)), dt);
      } else if (this.t > h.t1 && !h.closed) {
        // frames land BETWEEN t1-eps and t1, so a span could end at k≈0.97
        // and freeze mid-arc (bodies left floating). Every hold gets one
        // guaranteed k=1 tick when its span passes.
        h.closed = true;
        h.fn(1, dt);
      }
    }
    // puppets animate outside the fighter state machine; a hold may have
    // staged a locomotion ctx for the winner this frame (approach, charge)
    this.win.animator.update(dt, this.winCtx || { speed: 0, grounded: true });
    this.winCtx = null;
    // ragdolling bodies FLAIL under acceleration: every sharp velocity
    // change jolts the limbs (additive impulses over the limp loop pose)
    if (this._rag && dt > 0) {
      for (const [f, st] of this._rag) {
        const vx = (f.pos.x - st.px) / dt, vy = (f.pos.y - st.py) / dt, vz = (f.pos.z - st.pz) / dt;
        const jolt = Math.hypot(vx - st.vx, vy - st.vy, vz - st.vz);
        st.cd -= dt;
        if (jolt > 5 && st.cd <= 0) {
          st.cd = 0.08;
          const k = Math.min(1.1, jolt / 30);
          for (const j of ['shoulderL', 'shoulderR', 'thighL', 'thighR', 'head']) {
            f.animator.addImpulse(j, [rand(-0.6, 0.6) * k, rand(-0.4, 0.4) * k, rand(-0.6, 0.6) * k], 16, 5);
          }
        }
        st.vx = vx; st.vy = vy; st.vz = vz;
        st.px = f.pos.x; st.py = f.pos.y; st.pz = f.pos.z;
      }
    }
    this.vic.animator.update(dt, { speed: 0, grounded: true });
    // carry spans stage a palm press: runs post-pose or it gets clobbered
    if (this._palmVic) {
      this.win.clampPalmsTo(this._palmVic);
      this._palmVic = null;
    } else {
      this.win._palmFix = 0;
    }
    this.win.group.rotation.y = this.win.yaw;
    if (this.t >= this.dur) this.end();
  }

  end() {
    if (this.ended) return;
    this.ended = true;
    this._rag = null;
    this.hideSkipUI();
    this.dropSpectre();
    for (const fn of this.cleanups) { try { fn(); } catch { /* teardown must never block the round */ } }
    this.cleanups.length = 0;
    this.win.setOpacity?.(1);
    this.win.cinePuppet = false;
    this.vic.cinePuppet = false;
    this.vic.group.rotation.x = 0;
    this.vic.group.rotation.z = 0;
    this.vic.group.scale.set(1, 1, 1);
    this.vic.pos.y = 0; // dead ON the dirt, never hovering over it
    if (this.win.pos.y < 1.2) this.win.pos.y = 0;
    this.vic.animator.play('dead'); // stays where the finisher left them
    this.w.finisher = null;
    this.onDone?.();
  }
}

// ============================ CHOREOGRAPHY ============================
// Every script gets ~7.2s: stalk in (~1s), the execution (~4s of mech-
// flavored violence), collapse/burst, then a hero pose on a low camera.
// v2 rule: every hit LANDS — winners track the body, and every big hit
// BASHES the corpse around (vicBash) instead of leaving it parked.

const SCRIPTS = {
  // generic beatdown for anything without a bespoke scene
  default(F) {
    F.approach(0.25, 1.15, 3.4);
    F.camShot(0, 2.1, { dist: 12, h: 4.2, az0: 2.1, az1: 2.6 });
    F.at(1.25, () => F.win.animator.play('heavy'));
    F.at(1.7, () => { F.beat(); F.sparks(); F.vicFlinch(); });
    F.vicBash(1.72, F.axis, 1.3, 0.7, 0.4);
    F.camAction(2.1, 4.7, { dist: 12, h: 3.6, lookH: 2.2 });
    F.at(2.25, () => F.win.animator.play('light1'));
    F.at(2.55, () => { F.beat('hit', 0.35, 0.04); F.sparks(10, 8); F.vicFlinch(); });
    F.at(2.9, () => F.win.animator.play('light2'));
    F.at(3.2, () => { F.beat('hit', 0.35, 0.04); F.sparks(10, 8); F.vicFlinch(); });
    F.at(3.6, () => F.win.animator.play('heavy'));
    F.at(4.1, () => { F.beat('hitHeavy', 0.85, 0.1); F.sparks(24, 14); F.vicDown(); F.finaleBurst(); });
    F.vicBash(4.12, F.axis, 2.8, 1.5, 1.1);
    F.trackCenter(4.1, 5.2, 5);
    F.triumph(4.9);
  },

  // TITANUS: seize, slam to the dirt, then STAY ON THE BODY — each quake
  // punt bashes the wreck away and he stomps after it for the next one
  titanus(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 1.0, 3.2);
    F.at(1.1, () => { win.animator.play('grabReach'); w.audio?.play('servo'); });
    F.at(1.45, () => { win.animator.play('liftHold'); F.ragdoll(vic); F.beat('whooshBig', 0.3, 0); });
    // seized at the END of the reach (hands low, body rolled into them),
    // then the body rides the liftHold arm-swing itself all the way up —
    // constant contact, with the palm press squeezing onto the torso
    let cx, cy2, cz;
    F.hold(1.28, 2.55, (k, dt) => {
      if (cx === undefined) { cx = vic.pos.x; cy2 = vic.pos.y; cz = vic.pos.z; }
      const grip = smooth(Math.min(1, k / 0.16)); // in the hands within ~0.2s
      const tp = win.carryPoint(vic, _ct);
      vic.pos.x = cx + (tp.x - cx) * grip;
      vic.pos.y = cy2 + (tp.y - cy2) * grip;
      vic.pos.z = cz + (tp.z - cz) * grip;
      // Z-roll under the carrier's yaw = laid ACROSS the hands, head off
      // one palm and legs off the other, whichever way titanus faces
      vic.yaw = vic.targetYaw = win.yaw;
      vic.group.rotation.y = win.yaw;
      vic.group.rotation.x = 0;
      vic.group.rotation.z = 1.45 * grip;
      F._palmVic = vic;
    });
    // lift shot from the FRONT quarter: the victim hangs in the hands with
    // titanus's face behind them, not a wall of back armor
    F.camShot(1.3, 2.6, { dist: 10, h: 6.5, az0: 0.5, az1: 0.05, lookH: 6.2 });
    F.at(2.55, () => win.animator.play('throwHeave'));
    let tx0, ty0, tz0;
    F.hold(2.6, 2.82, (k) => { // hurled straight out of the hands
      if (tx0 === undefined) { tx0 = vic.pos.x; ty0 = vic.pos.y; tz0 = vic.pos.z; }
      vic.pos.x = tx0 + Math.sin(win.yaw) * 2.4 * k * win.scale;
      vic.pos.z = tz0 + Math.cos(win.yaw) * 2.4 * k * win.scale;
      vic.pos.y = ty0 * (1 - k * k);
    });
    F.at(2.85, () => {
      F.beat('bodyfall', 1, 0.1);
      vic.group.rotation.x = 0;
      vic.group.rotation.z = 0;
      F.vicDown();
      F.center.set(vic.pos.x, 0, vic.pos.z);
      w.effects.dustPuff(vic.pos, 12);
    });
    F.camAction(2.85, 5.75, { dist: 14, h: 4.6, lookH: 2.6 });
    F.trackCenter(2.9, 5.7, 5);
    // then he JUMPS ON TOP of the wreck and TRAMPLES it — repeated stomps
    // with the body pinned under his feet the whole time
    const bodyTop = 0.85 * vic.scale;
    F.at(3.0, () => { win.animator.play('pounceLeap'); w.audio?.play('jump'); });
    let jx0, jz0;
    F.hold(3.02, 3.46, (k) => {
      if (jx0 === undefined) { jx0 = win.pos.x; jz0 = win.pos.z; }
      const s = smooth(k);
      win.pos.x = jx0 + w.wrapDelta(vic.pos.x - jx0) * s;
      win.pos.z = jz0 + w.wrapDelta(vic.pos.z - jz0) * s;
      win.pos.y = Math.sin(Math.PI * k) * 4.4 * win.scale + bodyTop * k;
    });
    F.at(3.46, () => {
      F.beat('slam', 1, 0.1);
      F.sparks(22, 13);
      // jolt the wreck, never re-pose it — a flinch clip would stand it up
      vic.animator.addImpulse('torso', [rand(-0.4, 0.4), 0.4, rand(-0.4, 0.4)], 22, 7);
      w.effects.dustPuff(vic.pos, 10);
      w.effects.rings.spawn(vic.pos, { from: 0.6, to: 5.5, dur: 0.35, color: 0xffb43c, y: 0.3 });
    });
    // stay planted on the body straight through the triumph pose
    F.hold(3.46, F.dur, () => {
      win.pos.x = vic.pos.x;
      win.pos.z = vic.pos.z;
      win.pos.y = bodyTop;
    });
    for (let i = 0; i < 4; i++) {
      const tS = 3.6 + i * 0.5;
      F.at(tS, () => win.animator.play(i % 2 ? 'stomp2' : 'stomp', { speed: 1.1 }));
      F.at(tS + 0.26, () => {
        F.beat('slam', 0.7, 0.06);
        F.sparks(14, 10);
        // shudder the pinned wreck under the foot (additive — stays down)
        for (const j of ['torso', 'thighL', 'thighR', 'head']) {
          vic.animator.addImpulse(j, [rand(-0.5, 0.5), rand(-0.2, 0.4), rand(-0.5, 0.5)], 20, 6);
        }
        w.effects.dustPuff(vic.pos, 5);
        w.effects.rings.spawn(vic.pos, { from: 0.5, to: 4, dur: 0.3, color: 0xffb43c, y: 0.3 });
      });
    }
    F.at(5.75, () => F.finaleBurst());
    F.triumph(5.85, 'castRaise'); // arms to the sky, atop the wreck
  },

  // COLOSSUS: hoist them overhead, then — one-armed, never letting go —
  // smash the body into the dirt on his right, his left, his right again,
  // hurl the wreck away single-handed and strike the strongman pose.
  colossus(F) {
    const { win, vic, w } = F;
    const S = win.scale;
    F.approach(0.2, 1.0, 3.2);
    F.at(1.1, () => { win.animator.play('grabReach'); w.audio?.play('servo'); });
    F.at(1.45, () => { win.animator.play('liftHold'); F.ragdoll(vic); F.beat('whooshBig', 0.3, 0); });
    let cx, cy2, cz;
    F.hold(1.28, 2.5, (k) => {
      if (cx === undefined) { cx = vic.pos.x; cy2 = vic.pos.y; cz = vic.pos.z; }
      const grip = smooth(Math.min(1, k / 0.16));
      const tp = win.carryPoint(vic, _ct);
      vic.pos.x = cx + (tp.x - cx) * grip;
      vic.pos.y = cy2 + (tp.y - cy2) * grip;
      vic.pos.z = cz + (tp.z - cz) * grip;
      vic.yaw = vic.targetYaw = win.yaw;
      vic.group.rotation.y = win.yaw;
      vic.group.rotation.x = 0;
      vic.group.rotation.z = 1.45 * grip;
      F._palmVic = vic;
    });
    F.camShot(1.3, 2.55, { dist: 10, h: 6.5, az0: 0.5, az1: 0.05, lookH: 6.2 });
    F.camAction(2.55, 6.2, { dist: 16, h: 5.2, lookH: 3.2 });
    F.trackCenter(2.6, 6.1, 5);
    // the FEET-GRIP stretch-swing: his right fist holds the victim by the
    // ankles (the fighter origin IS the feet, so the wreck hangs from the
    // hand at full stretch). Each swing carries the body clear OVER him —
    // head sweeping a huge arc — and cracks it head-first into the dirt
    // beside his right leg, then across to his left, then right again.
    // Slow enough to read: each slam is a full second.
    const rollFor = (side) => -side * 2.35; // head down-and-out, cracking the dirt
    for (let i = 0; i < 3; i++) {
      const tS = 2.55 + i * 1.05;
      const side = i % 2 ? -1 : 1; // right, over-the-top to left, right
      F.at(tS, () => win.animator.play(side > 0 ? 'colossusSlamR' : 'colossusSlamL', { speed: 0.75 }));
      const roll0 = i === 0 ? 1.45 : rollFor(-side);
      F.hold(tS, tS + 1.0, (k) => {
        const hand = win.mech.joints.handR;
        if (!hand) return;
        hand.getWorldPosition(_ct);
        vic.pos.set(_ct.x, Math.max(_ct.y, 0.35), _ct.z); // ankles IN the fist
        vic.yaw = vic.targetYaw = win.yaw;
        vic.group.rotation.y = win.yaw;
        // the body pivots around the gripped feet: rolling from one side's
        // dirt, up over his head (body momentarily stretched skyward), and
        // down head-first onto the other side
        vic.group.rotation.z = roll0 + (rollFor(side) - roll0) * smooth(k);
        vic.group.rotation.x = 0;
      });
      F.at(tS + 0.78, () => { // the head cracks the dirt
        F.beat('slam', 0.85, 0.08);
        const hp = vic.mech.joints.head
          ? vic.mech.joints.head.getWorldPosition(new THREE.Vector3()) : vic.center();
        hp.y = Math.min(hp.y, 0.6);
        w.effects.impactSparks(hp, 0xffc23c, 16, 10);
        w.effects.dustPuff(hp, 9);
        w.effects.rings.spawn(hp, { from: 0.6, to: 5, dur: 0.32, color: 0xffc23c, y: 0.3 });
      });
    }
    // the single-hand hurl, far and flat
    F.at(5.75, () => { win.animator.play('throwHeave'); w.audio?.play('whooshBig'); });
    let hx, hy, hz;
    F.hold(5.8, 6.14, (k) => {
      if (hx === undefined) { hx = vic.pos.x; hy = vic.pos.y; hz = vic.pos.z; }
      vic.pos.x = hx + Math.sin(win.yaw) * 9.5 * k * S;
      vic.pos.z = hz + Math.cos(win.yaw) * 9.5 * k * S;
      vic.pos.y = Math.max(0.35, hy + 3.2 * k - 7.5 * k * k);
      vic.group.rotation.x += 0.14;
    });
    F.at(6.16, () => {
      F.beat('bodyfall', 1, 0.1);
      vic.group.rotation.x = 0;
      vic.group.rotation.z = 0;
      F.vicDown();
      w.effects.dustPuff(vic.pos, 12);
      F.finaleBurst();
    });
    F.triumph(6.3, 'castRaise');
  },

  // SAURION: leaps straight onto the THROAT, rides them down flat — the
  // body topples pivoting under his neck-grip — and jackhammer-bites the
  // collar, then springs off, looks around, grooms
  saurion(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 0.85, 7);
    F.camShot(0, 1.5, { dist: 11.5, h: 4 });
    F.at(0.95, () => { win.animator.play('pounceLeap'); w.audio?.play('jump'); });
    const NECK = vic.height * 0.78; // collar line up the victim's body
    F.hold(0.95, 1.4, (k) => {
      const e = k;
      win.pos.x = F.center.x - Math.sin(F.axis) * 7 * (1 - e);
      win.pos.z = F.center.z - Math.cos(F.axis) * 7 * (1 - e);
      win.pos.y = Math.sin(e * Math.PI) * 5.5 + e * NECK;
    });
    F.at(1.4, () => {
      F.beat('slash', 0.7, 0.09);
      win.animator.play('biteLatch', { speed: 1.8 });
      F.vicFlinch();
    });
    // rides them down with the jaws LOCKED at the throat: the neck stays
    // pinned under him at stage center and the body swings down beneath it
    const neckOff = new THREE.Vector3();
    const rideDown = (e, bob = 0) => {
      neckOff.set(0, NECK, 0).applyEuler(vic.group.rotation);
      vic.pos.x = F.center.x - neckOff.x;
      vic.pos.z = F.center.z - neckOff.z;
      vic.pos.y = 0;
      win.pos.x = F.center.x;
      win.pos.z = F.center.z;
      win.pos.y = Math.max(0.82, neckOff.y * (1 - e) + 0.55 * e) + bob;
      win.yaw = win.targetYaw = F.axis;
    };
    F.hold(1.4, 2.6, (k) => {
      const e = smooth(k);
      vic.group.rotation.x = -1.5 * e;
      rideDown(e);
    });
    // stays glued on the throat, bobbing with each bite
    F.hold(2.6, 4.15, (k) => rideDown(1, Math.abs(Math.sin(k * 26)) * 0.22));
    // low front shot: saurion's dipping head and the pinned collar fill
    // the frame instead of his tail
    F.camShot(1.4, 4.1, { dist: 7.5, h: 2.2, az0: 0.55, az1: -0.15, lookH: 1.2 });
    for (let i = 0; i < 7; i++) {
      F.at(1.6 + i * 0.32, () => {
        // bite sparks fly from the THROAT, right under his strike (kept
        // modest — the low lens sits right on top of them)
        w.effects.impactSparks(
          new THREE.Vector3(F.center.x, Math.max(0.9, win.pos.y + 0.25), F.center.z),
          0xff3826, 6, 6);
        w.audio?.play('slash');
        vic.animator.addImpulse('torso', [rand(-0.3, 0.3), 0, rand(-0.2, 0.2)], 30, 11);
      });
    }
    F.at(4.15, () => { win.animator.stop(0.1); w.audio?.play('jump'); });
    F.hold(4.15, 4.6, (k) => { // springs off the carcass
      win.pos.x = F.center.x - Math.sin(F.axis) * 4 * k;
      win.pos.z = F.center.z - Math.cos(F.axis) * 4 * k;
      win.pos.y = Math.sin(k * Math.PI) * 2.6;
    });
    // looks around, then the grooming head-dip — as close to licking his
    // lips as a mech gets
    F.at(4.8, () => win.animator.addImpulse('head', [0, 0.7, 0], 4.5, 2));
    F.at(5.6, () => { win.animator.addImpulse('head', [0.4, -0.55, 0], 7, 3); w.audio?.play('servo'); });
    F.triumph(6.1, 'taunt', 'howl');
  },

  // VIPER: five-point blink cage of sword cuts — each teleport lands a
  // different blade form (cross-cut, rising cut, skewering stab) — then one
  // kesa-giri launcher slash; the camera whips down low and TRACKS the body
  viper(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 0.8, 3.2);
    const forms = ['viperSlash1', 'viperStab', 'viperSlash2', 'viperStab', 'viperSlash1'];
    const blink = (t, side, form) => {
      F.at(t, () => {
        win.pos.x = F.center.x - Math.sin(F.axis + side) * 3;
        win.pos.z = F.center.z - Math.cos(F.axis + side) * 3;
        win.yaw = win.targetYaw = F.axis + side;
        w.effects.dashTrail(win.pos, 0x6cff5c, win.scale * 1.6);
        win.animator.play(form, { speed: 1.4 });
        w.audio?.play('dash');
      });
      F.at(t + 0.2, () => { F.beat('slash', 0.4, 0.05); F.sparks(12, 9, 0x6cff5c); F.vicFlinch(); });
    };
    blink(1.0, 0, forms[0]);
    blink(1.55, 2.1, forms[1]);
    blink(2.1, -2.1, forms[2]);
    blink(2.65, Math.PI, forms[3]);
    blink(3.2, 1.05, forms[4]);
    F.camShot(1.0, 3.9, { dist: 8, h: 3.4, az0: 2.0, az1: 3.6, lookH: 3 });
    F.at(3.75, () => {
      win.pos.x = F.center.x - Math.sin(F.axis) * 3;
      win.pos.z = F.center.z - Math.cos(F.axis) * 3;
      win.yaw = win.targetYaw = F.axis;
      w.effects.dashTrail(win.pos, 0x6cff5c, win.scale * 1.6);
      win.animator.play('viperHeavy', { speed: 1.2 });
    });
    F.at(4.1, () => {
      F.beat('hitHeavy', 0.9, 0.12);
      F.sparks(26, 16, 0x6cff5c);
      vic.animator.play('launched');
    });
    F.hold(4.1, 5.3, (k) => {
      vic.pos.y = Math.sin(Math.min(1, k) * Math.PI) * 8;
      vic.group.rotation.x = -k * 4;
    });
    // low tracking shot follows the body skyward and back down
    F.hold(4.05, 5.3, (k) => {
      const az = F.axis + 2.6;
      const d = 9 * F.stageScale;
      F.cam.pos.set(F.center.x + Math.sin(az) * d, 2.2 * F.stageScale, F.center.z + Math.cos(az) * d);
      F.cam.look.set(vic.pos.x, Math.max(1.5, vic.pos.y + vic.height * 0.4), vic.pos.z);
    });
    F.at(5.3, () => {
      vic.group.rotation.x = 0;
      F.vicDown();
      F.finaleBurst();
      w.effects.dustPuff(vic.pos, 10);
    });
    F.triumph(5.6);
  },

  // VULCAN: point-blank gatling storm — the stream SHOVES them backwards,
  // sliding through the dirt, and he keeps walking them down
  // VULCAN: arms flung up and OUT, a whole magazine sprayed skyward in every
  // direction — the mark looks around, lost, the camera pulls WAY back...
  // and the entire swarm whips around as one and homes in, hammering them
  // in a single simultaneous barrage. Crumble. Maniacal pose.
  vulcan(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 1.0, 7);
    const shots = [];
    F.at(1.05, () => { win.animator.play('vulcanSpray'); w.audio?.play('charge'); });
    // rocked back on his heels, one gatling flung casually over his
    // shoulder — the whole magazine hoses out of it in a lazy dome while
    // he shakes with laughter
    F.hold(1.1, 1.7, (k, dt) => {
      F.winCtx = { speed: 0, grounded: true, firing: true };
      const from = win.mech.anchors.muzzleR.getWorldPosition(new THREE.Vector3());
      for (let n = 0; n < 2; n++) {
        const a = rand(Math.PI * 2), el = rand(0.45, 1.25);
        shots.push({
          x: from.x, y: from.y, z: from.z,
          vx: Math.cos(a) * Math.cos(el) * 26,
          vy: Math.sin(el) * 30 + rand(-2, 2),
          vz: Math.sin(a) * Math.cos(el) * 26,
          state: 0, tick: n,
        });
      }
      w.effects.muzzleFlash(from);
      if (Math.random() < dt * 26) w.audio?.play('gatling');
    });
    // the laugh: rhythmic little heaves of the torso and head
    F.hold(1.15, 2.8, (k, dt) => {
      F._laughT = (F._laughT ?? 0) - dt;
      if (F._laughT <= 0) {
        F._laughT = 0.24;
        win.animator.addImpulse('torso', [-0.14, 0, rand(-0.08, 0.08)], 15, 6);
        win.animator.addImpulse('head', [0.18, rand(-0.1, 0.1), 0], 15, 6);
      }
    });
    // the mark looks around, confused — head snapping after the streaks
    F.hold(1.4, 2.85, (k, dt) => { vic.yaw += Math.sin(k * 17) * dt * 2.2; });
    F.at(1.5, () => vic.animator.addImpulse('head', [0, 0.6, 0], 9, 3));
    F.at(2.1, () => vic.animator.addImpulse('head', [0, -0.7, 0], 9, 3));
    F.at(2.6, () => vic.animator.addImpulse('head', [0.3, 0.5, 0], 9, 3));
    // camera pulls WAY out so the whole orbiting swarm reads
    F.camShot(1.15, 3.3, { dist: 30, h: 12, az0: 2.0, az1: 2.55, lookH: 5 });
    // ...and on this beat, every round whips around AS ONE
    F.at(2.85, () => { w.audio?.play('charge'); for (const s of shots) s.state = 1; });
    // swarm physics: loft outward, then hard-home on the mark together
    F.hold(1.1, 4.5, (k, dt) => {
      for (const s of shots) {
        if (s.state === 2) continue;
        if (s.state === 0) {
          s.vy -= 9 * dt; // lofting fountain arc
        } else {
          const tx = vic.pos.x - s.x, ty = vic.pos.y + vic.height * 0.55 - s.y, tz = vic.pos.z - s.z;
          const d = Math.hypot(tx, ty, tz);
          if (d < 1.5) {
            s.state = 2;
            // the barrage DETONATES on the mark: every few rounds a real
            // explosion, sparks for the rest
            F._swarmHits = (F._swarmHits || 0) + 1;
            if (F._swarmHits % 4 === 0) {
              w.effects.explosion(new THREE.Vector3(s.x, s.y, s.z), 1.7, { color: 0xffb43c });
            } else {
              w.effects.impactSparks(new THREE.Vector3(s.x, s.y, s.z), 0xffd080, 5, 6);
            }
            continue;
          }
          const sp = 40, r = Math.min(1, dt * 8);
          s.vx += ((tx / d) * sp - s.vx) * r;
          s.vy += ((ty / d) * sp - s.vy) * r;
          s.vz += ((tz / d) * sp - s.vz) * r;
        }
        s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
        if (s.y < 0.15) { s.y = 0.15; s.vy = Math.abs(s.vy) * 0.4; }
        // battle-scale tracer: a bright head with a trailing tail glow —
        // the same fat streak the gatling fires in combat
        w.effects.glows.emit(s.x, s.y, s.z, 0, 0, 0,
          { life: 0.13, size: 1.15, color: 0xffd080, alpha: 0.95 });
        s.tick ^= 1;
        if (s.tick) {
          w.effects.glows.emit(s.x - s.vx * 0.022, s.y - s.vy * 0.022, s.z - s.vz * 0.022,
            0, 0, 0, { life: 0.1, size: 0.8, color: 0xffb43c, alpha: 0.7 });
        }
      }
    });
    // punch back in for the convergence — the all-at-once barrage
    F.camAction(3.3, 4.6, { dist: 13, h: 4, lookH: 2.4 });
    F.trackCenter(3.3, 4.6, 5);
    F.at(3.55, () => { F.beat('hit', 0.6, 0.05); F.sparks(18, 10); F.vicFlinch(); });
    F.at(3.75, () => { F.beat('hitHeavy', 0.85, 0.08); F.sparks(26, 14); F.vicFlinch(); });
    F.at(4.0, () => {
      F.beat('explosionBig', 1, 0.1);
      F.finaleBurst(0xffd060);
      F.vicDown(); // riddled — crumbles where they stand
      w.effects.dustPuff(vic.pos, 10);
    });
    F.triumph(4.7, 'victory', 'gatling');
  },

  // AEGIS: plants himself, reaches up to the heavens — and the sky ANSWERS:
  // ten spears of light hammer down all over the mark until nothing stands
  aegis(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 1.0, 5.5);
    F.at(1.15, () => { win.animator.play('castRaise'); w.audio?.play('cast'); });
    F.at(1.5, () => {
      w.effects.rings.spawn(win.pos, { from: 0.5, to: 6, dur: 0.6, color: 0x49b7ff, y: 0.4 });
      w.audio?.play('charge');
    });
    // scattered azimuths, wandering in from the edges to dead-center
    const ring = [0.4, 2.4, 4.2, 1.1, 5.3, 3.3, 0.9, 2.0, 4.8, 0];
    for (let i = 0; i < 10; i++) {
      F.at(2.0 + i * 0.3, () => {
        const last = i >= 8; // the closing pair strikes square ON them
        const r = last ? 0.3 : 0.7 + (i % 3) * 1.2;
        const gx = vic.pos.x + Math.sin(ring[i]) * r;
        const gz = vic.pos.z + Math.cos(ring[i]) * r;
        const ground = new THREE.Vector3(gx, 0.1, gz);
        const top = new THREE.Vector3(gx, 55, gz);
        w.effects.beams.spawn(top, ground, { radius: last ? 1.7 : 0.8, dur: 0.5, color: 0xbfe8ff });
        w.effects.glows.emit(gx, 1.2, gz, 0, 0, 0, { life: 0.3, size: last ? 7 : 4.5, color: 0x9fd8ff, alpha: 1 });
        w.effects.explosion(new THREE.Vector3(gx, 0.8, gz), last ? 4 : 2.2, { color: 0x9fd8ff, smoke: false });
        F.beat('beam', last ? 1 : 0.5, last ? 0.1 : 0.04);
        F.vicFlinch();
      });
    }
    F.vicBash(2.92, F.axis + 1.2, 1.6, 0.9, 0.7);
    F.vicBash(3.82, F.axis - 1.4, 1.6, 0.9, 0.7);
    F.trackCenter(2.0, 5.2, 4);
    // arms-to-the-sky hero angle from the FRONT, low, looking up past the
    // victim's shoulder — then wide for the barrage
    F.camShot(1.05, 2.4, { dist: 11, h: 2.6, az0: 1.15, az1: 0.7, lookH: 4.5 });
    F.camShot(2.4, 5.1, { dist: 13, h: 4.5, az0: 2.7, az1: 2.25, lookH: 3.5 });
    F.at(5.0, () => { F.vicDown(); F.finaleBurst(0x9fd8ff); });
    F.triumph(5.4, 'victory', 'cast');
  },

  // NOVA: the broken halo SPINS UP faster and faster, slams to apex and
  // IGNITES — then starfire lances converge on the mark from every
  // direction of the compass
  nova(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 0.9, 8);
    F.at(1.0, () => { win.animator.play('castRaise'); w.audio?.play('charge'); });
    // spin-up: her animator signature reads the ring angle and pulses the
    // glow as the crescents sweep alignment — accelerating = strobing
    F.hold(1.0, 2.4, (k, dt) => {
      const J = win.mech.joints;
      if (J.halo) J.halo.rotation.z += dt * (4 + 26 * k * k);
    });
    F.at(2.4, () => {
      F.beat('powerup', 0.5, 0.06);
      w.effects.rings.spawn(win.pos, { from: 0.4, to: 5.5, dur: 0.5, color: 0xff5ce8, y: win.height * 0.72 });
    });
    F.hold(2.4, F.dur, () => { // pinned at apex, blazing (signature maxes it)
      const J = win.mech.joints;
      if (J.halo) J.halo.rotation.z = 0;
    });
    // nine lances spiral around the compass, all converging on the victim
    for (let i = 0; i < 9; i++) {
      F.at(2.7 + i * 0.26, () => {
        const az = (i * 2.4) % (Math.PI * 2);
        const c = vic.center();
        const from = new THREE.Vector3(
          c.x + Math.sin(az) * 20, 4 + (i % 3) * 5, c.z + Math.cos(az) * 20);
        w.effects.beams.spawn(from, c, { radius: 0.5, dur: 0.3, color: 0xff5ce8 });
        w.effects.explosion(c, 2.4, { color: 0xff5ce8, smoke: false });
        F.beat('plasma', 0.5, 0.05);
        F.sparks(12, 9, 0xff5ce8);
        F.vicFlinch();
      });
    }
    F.vicBash(3.24, F.axis + 1.0, 1.5, 0.9, 0.8);
    F.vicBash(4.02, F.axis - 1.3, 1.5, 0.9, 0.8);
    F.trackCenter(2.7, 5.3, 4);
    // over-the-shoulder on the ring as it spins up, then wide convergence
    F.camShot(1.0, 2.6, { dist: 12, h: 3.4, az0: 3.35, az1: 3.15, lookH: 3 });
    F.camShot(2.6, 5.2, { dist: 13, h: 4.2, az0: 2.2, az1: 2.9, lookH: 3 });
    F.at(5.1, () => { F.vicDown(); F.finaleBurst(0xff5ce8); });
    F.triumph(5.5, 'burst', 'powerup');
  },

  // RHINO: backs off, gallops STRAIGHT THROUGH them, wheels around in a
  // wide arc and tramples the wreck a SECOND time on the way back
  rhino(F) {
    const { win, vic, w } = F;
    F.hold(0.2, 1.1, (k) => { // back up for the runway
      const e = smooth(k);
      win.pos.x = lerp(F.startPos.x, F.center.x - Math.sin(F.axis) * 17, e);
      win.pos.z = lerp(F.startPos.z, F.center.z - Math.cos(F.axis) * 17, e);
      win.yaw = win.targetYaw = F.axis;
    });
    F.at(1.2, () => { win.animator.play('chargeLean'); w.audio?.play('charge'); });
    F.hold(1.4, 2.5, (k, dt) => { // the charge (his signature gallops on ctx)
      win.pos.x = F.center.x - Math.sin(F.axis) * (17 - 24 * k);
      win.pos.z = F.center.z - Math.cos(F.axis) * (17 - 24 * k);
      F.winCtx = { speed: 14, maxSpeed: 14, grounded: true, charging: true };
      if (Math.random() < dt * 20) w.effects.dustPuff(win.pos, 2, 0x9a9088);
    });
    F.at(2.18, () => { // impact as he blows through the mark
      F.beat('hitHeavy', 1.1, 0.14);
      F.sparks(26, 16);
      vic.animator.play('launched');
    });
    F.hold(2.18, 3.2, (k) => { // victim cartwheels away, long and high
      vic.pos.x = F.center.x + Math.sin(F.axis) * 10 * k;
      vic.pos.z = F.center.z + Math.cos(F.axis) * 10 * k;
      vic.pos.y = Math.sin(Math.min(1, k) * Math.PI) * 5.5;
      vic.group.rotation.x = -k * 6;
    });
    F.at(3.2, () => {
      vic.group.rotation.x = 0;
      F.vicDown();
      F.beat('bodyfall', 0.8, 0.06);
      w.effects.dustPuff(vic.pos, 12);
      F.center.set(vic.pos.x, 0, vic.pos.z);
    });
    F.camShot(1.4, 3.2, { dist: 10, h: 3, az0: 1.4, az1: 2.2, lookH: 2.6 });
    // wide banking turn beyond the body, wheeling round for the return run
    F.hold(3.25, 4.05, (k) => {
      const e = smooth(k);
      const along = lerp(-3, 11, e);
      const side = Math.sin(e * Math.PI) * 7;
      win.pos.x = F.center.x + Math.sin(F.axis) * along + Math.sin(F.axis + Math.PI / 2) * side;
      win.pos.z = F.center.z + Math.cos(F.axis) * along + Math.cos(F.axis + Math.PI / 2) * side;
      win.yaw = win.targetYaw = F.axis + Math.PI * e;
      F.winCtx = { speed: 10, maxSpeed: 14, grounded: true };
    });
    F.at(4.1, () => { win.animator.play('chargeLean'); w.audio?.play('charge'); });
    F.hold(4.25, 5.05, (k, dt) => { // return trample, right over the wreck
      const along = lerp(11, -7, k);
      win.pos.x = F.center.x + Math.sin(F.axis) * along;
      win.pos.z = F.center.z + Math.cos(F.axis) * along;
      win.yaw = win.targetYaw = F.axis + Math.PI;
      F.winCtx = { speed: 14, maxSpeed: 14, grounded: true, charging: true };
      if (Math.random() < dt * 20) w.effects.dustPuff(win.pos, 2, 0x9a9088);
    });
    F.at(4.74, () => { F.beat('hitHeavy', 1.0, 0.12); F.sparks(24, 15); });
    F.vicBash(4.74, F.axis + Math.PI - 0.5, 6.5, 2.4, 3.2);
    F.trackCenter(4.7, 5.6, 5);
    F.camShot(3.2, 5.3, { dist: 11, h: 3.2, az0: 1.9, az1: 1.1, lookH: 2.2 });
    F.at(5.3, () => F.finaleBurst());
    F.triumph(5.4, 'taunt', 'howl');
  },

  // TEMPEST: raises the storm — dark clouds close in ABOVE, BEHIND, LEFT
  // and RIGHT of the mark, then REAL bolts rake in from every direction,
  // each one leaving the body crackling with static
  tempest(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 0.9, 8.5);
    F.at(1.0, () => { win.animator.play('burst'); w.audio?.play('thunder'); });
    // four cloud stations boxing the victim in (station 0 = overhead)
    const stations = () => {
      const c = vic.pos;
      return [
        new THREE.Vector3(c.x, 13, c.z),
        new THREE.Vector3(c.x + Math.sin(F.axis) * 9, 8, c.z + Math.cos(F.axis) * 9),
        new THREE.Vector3(c.x + Math.cos(F.axis) * 9, 8, c.z - Math.sin(F.axis) * 9),
        new THREE.Vector3(c.x - Math.cos(F.axis) * 9, 8, c.z + Math.sin(F.axis) * 9),
      ];
    };
    // the clouds BUILD and keep churning for the whole storm
    F.hold(1.25, 5.0, (k, dt) => {
      if (Math.random() > dt * 26) return;
      const st = stations();
      const p = st[(Math.random() * st.length) | 0];
      w.effects.smoke.emit(p.x + rand(-2.5, 2.5), p.y + rand(-1, 1.2), p.z + rand(-2.5, 2.5),
        rand(-1, 1), rand(-0.2, 0.4), rand(-1, 1),
        { life: rand(1.4, 2.2), size: rand(4.5, 7.5), color: 0x0e121a, alpha: 0.95, grow: 1.2 });
      if (Math.random() < 0.2) { // static shimmer inside the clouds
        w.effects.glows.emit(p.x + rand(-2, 2), p.y + rand(-1, 1), p.z + rand(-2, 2), 0, 0, 0,
          { life: 0.2, size: rand(2, 4), color: 0x9fdcff, alpha: 0.7 });
      }
    });
    // seven strikes rotating through the stations — bolts rake in from
    // above, behind, left, right... every direction, all converging on the
    // mark, each leaving crackling static on the body
    const jolts = [0.7, -0.9, 1.8, -2.2, 0.3, 2.6, -1.2];
    for (let i = 0; i < 7; i++) {
      F.at(1.9 + i * 0.44, () => {
        const st = stations();
        const from = st[i % st.length].clone();
        from.x += rand(-1, 1); from.z += rand(-1, 1);
        const to = vic.center();
        w.effects.lightning.spawn(from, to, { color: 0xeaffff, dur: 0.24, jag: 2.6, thick: 0.26 });
        w.effects.lightning.spawn(from, to, { color: 0x9fdcff, dur: 0.28, jag: 1.6, thick: 0.12 });
        w.effects.glows.emit(to.x, to.y, to.z, 0, 0, 0, { life: 0.25, size: 6, color: 0xbfefff, alpha: 1 });
        w.effects.staticCling(vic, 1.2);
        F.beat('zap', 0.55, 0.06);
        F.sparks(10, 8, 0xcfefff);
        F.vicFlinch();
      });
      F.vicBash(1.92 + i * 0.44, F.axis + jolts[i], 1.3, 0.8, 0.6);
    }
    F.trackCenter(1.9, 5.2, 4);
    // slow sweeping orbit around the boxed-in kill zone
    F.camShot(1.25, 5.05, { dist: 12.5, h: 4, az0: 0.7, az1: 2.1, lookH: 4 });
    F.at(5.0, () => { F.vicDown(); F.finaleBurst(0x9fdcff); });
    F.triumph(5.45, 'burst', 'thunder');
  },

  // FENRIR: wolf pounce, quick maul, then jaws clamp and DRAG the wreck in
  // a full sweeping circle before flinging it away — the howl over the kill
  fenrir(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 0.8, 8);
    F.at(0.95, () => { win.animator.play('lunge', { speed: 1.2 }); w.audio?.play('howl'); });
    // the pounce lands SHORT of the mark — striking range, not on top of it
    F.hold(0.95, 1.35, (k) => {
      win.pos.x = F.center.x - Math.sin(F.axis) * (8 - 5.2 * k);
      win.pos.z = F.center.z - Math.cos(F.axis) * (8 - 5.2 * k);
      win.pos.y = Math.sin(k * Math.PI) * 3.4;
    });
    // the pounce STAGGERS them — they stay on their feet for the mauling
    F.at(1.35, () => { F.beat('slash', 0.8, 0.1); F.vicFlinch(); w.effects.dustPuff(vic.pos, 8); });
    F.at(1.5, () => win.animator.play('flurry', { speed: 1.7 }));
    // planted at claw's reach: the victim stands IN FRONT catching the
    // end of every swipe
    F.hold(1.35, 2.32, () => {
      win.pos.x = F.center.x - Math.sin(F.axis) * 2.8;
      win.pos.z = F.center.z - Math.cos(F.axis) * 2.8;
      win.pos.y = 0;
      win.yaw = win.targetYaw = F.axis;
    });
    for (let i = 0; i < 3; i++) {
      F.at(1.62 + i * 0.24, () => {
        F.sparks(11, 9, 0x6cd8ff);
        w.audio?.play('slash');
        F.vicFlinch(); // each swipe rocks the standing victim
      });
    }
    // ...and only the LAST swipe puts them down
    F.at(2.28, () => { F.beat('hitHeavy', 0.7, 0.08); F.vicDown(); w.effects.dustPuff(vic.pos, 6); });
    // jaws lock and he TEARS OFF, dragging the wreck in a wide circle
    // (circle phased so grab-point ~= where the bodies already are)
    F.hold(2.35, 3.9, (k, dt) => {
      const e = smooth(k);
      const ang = F.axis + Math.PI + e * 3.6;
      vic.pos.x = F.center.x + Math.sin(ang) * 2.2;
      vic.pos.z = F.center.z + Math.cos(ang) * 2.2;
      vic.pos.y = 0.25;
      vic.group.rotation.x = -1.35; // scraped along on their back
      vic.yaw = vic.targetYaw = ang + Math.PI / 2;
      vic.group.rotation.y = vic.yaw;
      win.pos.x = F.center.x + Math.sin(ang) * 3.9;
      win.pos.z = F.center.z + Math.cos(ang) * 3.9;
      win.yaw = win.targetYaw = ang + 1.25;
      F.winCtx = { speed: 9, maxSpeed: 12, grounded: true }; // wolf gallop
      if (Math.random() < dt * 16) w.effects.dustPuff(vic.pos, 2);
      if (Math.random() < dt * 8) { F.sparks(6, 6, 0x6cd8ff); }
    });
    F.camAction(1.35, 3.9, { dist: 11, h: 3.2, lookH: 1.6, rate: 2.5 });
    // the release: flung tumbling across the arena
    F.at(3.9, () => { F.beat('whooshBig', 0.7, 0.08); vic.animator.play('launched'); win.animator.stop(0.15); });
    F.hold(3.9, 4.65, (k) => {
      const endAng = F.axis + Math.PI + 3.6;
      const dir = endAng + 1.35;
      const e = 1 - (1 - k) * (1 - k);
      vic.pos.x = F.center.x + Math.sin(endAng) * 2.2 + Math.sin(dir) * 9 * e;
      vic.pos.z = F.center.z + Math.cos(endAng) * 2.2 + Math.cos(dir) * 9 * e;
      vic.pos.y = Math.sin(Math.min(1, k) * Math.PI) * 3.2;
      vic.group.rotation.x = -1.35 - k * 4;
    });
    F.at(4.65, () => {
      vic.group.rotation.x = 0;
      F.vicDown();
      F.beat('bodyfall', 0.8, 0.06);
      w.effects.dustPuff(vic.pos, 10);
    });
    F.trackCenter(3.9, 5.4, 5);
    F.at(4.7, () => F.finaleBurst());
    F.triumph(4.95, 'taunt', 'howl');
  },

  // WRAITH: hurls the ghost FORWARD through the mark, blinks to the far
  // side, wheels around and hurls it forward again — four hunting passes
  // (the spectre only ever flies out of him), then the rail slug
  wraith(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 0.75, 7);
    F.at(0.9, () => { win.animator.play('castRaise'); w.audio?.play('cloak'); });
    F.at(1.1, () => win.setOpacity(0.5)); // half in the dark while hunting
    const pass = (t0, i) => {
      const side = i % 2 === 0 ? -1 : 1; // alternating launch side
      F.at(t0 - 0.14, () => {
        // blink to the launch side, square up on the victim
        win.pos.x = F.center.x + Math.sin(F.axis) * 7 * side;
        win.pos.z = F.center.z + Math.cos(F.axis) * 7 * side;
        win.yaw = win.targetYaw = side < 0 ? F.axis : F.axis + Math.PI;
        win.group.rotation.y = win.yaw;
        w.effects.rings.spawn(win.pos, { from: 2.2, to: 0.4, dur: 0.3, color: 0xff3838, y: win.height * 0.5 });
        w.audio?.play('cloak');
        win.animator.play('aim', { speed: 1.3 });
      });
      F.at(t0, () => {
        F.dropSpectre();
        F.makeSpectre().visible = true; // baked facing the way he faces
        w.audio?.play('howl', { vol: 0.3, pitch: 1.8 });
      });
      F.hold(t0, t0 + 0.6, (k) => {
        const sp = F._spectre;
        if (!sp) return;
        const e = smooth(k);
        // always OUT of wraith: from his side, through the mark, beyond
        sp.ghost.position.set(
          Math.sin(F.axis) * 14 * e * -side,
          Math.sin(e * Math.PI) * 0.5,
          Math.cos(F.axis) * 14 * e * -side);
        sp.gmat.opacity = 0.3 - e * 0.12 + 0.1 * Math.sin(k * 40);
      });
      F.at(t0 + 0.3, () => { F.beat('slash', 0.5, 0.06); F.sparks(14, 10, 0xcfe8ff); F.vicFlinch(); });
      F.at(t0 + 0.62, () => F.dropSpectre());
    };
    pass(1.35, 0);
    pass(2.25, 1);
    pass(3.15, 2);
    pass(4.05, 3);
    // side-on profile shot so the launch-blink-launch rhythm reads clean
    F.camShot(0.9, 4.6, { dist: 11, h: 2.9, az0: 1.4, az1: 1.75, lookH: 2.5 });
    F.at(4.7, () => {
      win.pos.x = F.center.x - Math.sin(F.axis) * 7;
      win.pos.z = F.center.z - Math.cos(F.axis) * 7;
      win.yaw = win.targetYaw = F.axis;
      win.group.rotation.y = win.yaw;
      win.setOpacity(1);
      w.effects.rings.spawn(win.pos, { from: 3, to: 0.5, dur: 0.4, color: 0xff3838, y: win.height * 0.5 });
      w.audio?.play('cloak');
      win.animator.play('aim', { speed: 0.9 });
    });
    F.camShot(4.6, 5.8, { dist: 8.5, h: 2.8, az0: 3.65, az1: 3.35, lookH: 2.4 });
    F.at(5.15, () => {
      const from = win.mech.anchors.muzzleR.getWorldPosition(new THREE.Vector3());
      w.effects.beams.spawn(from, vic.center(), { radius: 0.22, dur: 0.5, color: 0xff3838 });
      F.beat('railgun', 1, 0.16);
      F.sparks(26, 15, 0xff3838);
    });
    F.vicBash(5.16, F.axis, 3.2, 1.4, 1.5);
    F.trackCenter(5.1, 6.0, 5);
    F.at(5.5, () => F.vicDown());
    F.at(5.35, () => {
      for (let i = 0; i < 4; i++) {
        const a = F.axis + rand(-0.6, 0.6);
        w.projectiles.spawn('bat', win, vic.center(), new THREE.Vector3(Math.sin(a), 0.5, Math.cos(a)), {
          dmg: 0, speed: 14, color: 0x8a2030, knock: 0, life: 2.5, wobble: 1.2,
        });
      }
      w.audio?.play('howl', { vol: 0.4, pitch: 1.6 });
    });
    F.at(5.7, () => F.finaleBurst(0xff3838));
    F.triumph(5.8, 'aim', 'cloak');
  },

  // INFERNO: walks them down behind a wall of flame — the victim STAGGERS
  // backwards burning the whole way until they drop into their own pyre
  inferno(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 1.0, 6.5);
    F.at(1.1, () => { win.animator.play('shootLoop'); w.audio?.play('flame'); });
    // hose the victim HEAD TO TOE: the jet's aim point sweeps up and down
    // their body while the whole frame catches fire and chars black
    F.hold(1.2, 4.2, (k, dt) => {
      F.winCtx = { speed: 0, grounded: true, firing: true }; // torch level
      const from = win.mech.anchors.muzzleR.getWorldPosition(new THREE.Vector3());
      // sweep: three full bottom-to-top-and-back passes over the spray
      const sweepY = vic.pos.y + (0.5 + 0.45 * Math.sin(k * Math.PI * 6)) * vic.height;
      const dir = new THREE.Vector3(
        vic.pos.x - from.x, sweepY - from.y, vic.pos.z - from.z).normalize();
      w.effects.jet('flame:fin', from, dir, {
        type: 'fire', speed: 30, range: 13, gravity: -4, r0: 0.32, r1: 2.2,
      });
      // shader-card flames ride the torch: tongues off the nozzle, and the
      // VICTIM becomes a growing FlameFX burning source as they char.
      // Parked in w.flameJets so the world ticks/extinguishes/cleans it.
      let fj = w.flameJets.get('fin');
      if (!fj) {
        fj = {
          nozzle: new FlameFX(w.scene, w.effects, from, { radius: 0.55, scale: 1.05, dir, cards: 5, light: false }),
          impact: new FlameFX(w.scene, w.effects, vic.pos, { radius: 1.0, scale: 0.9, cards: 7, light: false }),
          ttl: 0,
        };
        w.flameJets.set('fin', fj);
      }
      fj.ttl = 0.16;
      fj.nozzle.rekindle();
      fj.impact.rekindle();
      fj.nozzle.setPose(from, dir);
      fj.impact.setPose(vic.pos);
      fj.impact.scale = 0.9 + k * 0.9;   // the blaze builds as the paint chars
      fj.impact.radius = 1.0 + k * 0.5;
      if (Math.random() < dt * 10) w.effects.fire(from, dir, 30, 0.24); // embers
      if (Math.random() < dt * 7) w.audio?.play('flame');
      vic.applyCharring?.(Math.min(1, k * 1.2));
      if (Math.random() < dt * 10) {
        w.effects.glows.emit(vic.pos.x + rand(-1, 1), vic.pos.y + rand(0.5, vic.height), vic.pos.z + rand(-1, 1),
          0, 3.5, 0, { life: 0.5, size: rand(1.2, 2.2), color: 0xff7a20, alpha: 0.9 });
      }
    });
    // driven back step by burning step; inferno stalks after them
    F.hold(1.7, 3.5, (k, dt) => {
      vic.pos.x += Math.sin(F.axis) * dt * 1.6;
      vic.pos.z += Math.cos(F.axis) * dt * 1.6;
      win.pos.x += Math.sin(F.axis) * dt * 1.3;
      win.pos.z += Math.cos(F.axis) * dt * 1.3;
    });
    F.trackCenter(1.7, 4.6, 5);
    F.camAction(1.2, 5.2, { dist: 12.5, h: 3.6, lookH: 2.2 });
    F.at(1.9, () => F.vicFlinch());
    F.at(2.5, () => F.vicFlinch());
    F.at(3.1, () => F.vicFlinch());
    // the CRUMBLE: the burnt-out shell folds and collapses to the ground,
    // settling into the dirt while the blaze keeps raging over it
    F.at(4.25, () => {
      F.vicDown();
      w.audio?.play('bodyfall');
      w.effects.dustPuff(vic.pos, 8);
      w.addFirePatch(null, vic.pos.clone().setY(0), 3.4, 8, 8);
    });
    F.hold(4.25, 5.2, (k) => {
      vic.applyCharring?.(1);
      vic.pos.y = -0.35 * smooth(k) * vic.scale; // sags INTO the ground
    });
    F.at(4.45, () => F.finaleBurst(0xff6a20));
    // the pyre burns under the whole victory pose (the fire patch dropped
    // at 4.25 is a full FlameFX burning source — just add extra smoke)
    F.hold(4.4, F.dur, (k, dt) => {
      if (Math.random() < dt * 6) {
        w.effects.smoke.emit(vic.pos.x + rand(-1, 1), 1.5, vic.pos.z + rand(-1, 1),
          rand(-0.4, 0.4), rand(1.5, 3), rand(-0.4, 0.4),
          { life: rand(0.8, 1.4), size: rand(1.4, 2.4), color: 0x26221e, alpha: 0.4, grow: 1.6 });
      }
    });
    F.triumph(5.3, 'burst', 'flame');
  },

  // GLACIER: freezes them solid white, walks up, and SHATTERS the statue —
  // the frozen husk goes skittering and spinning across the ice
  // GLACIER: hoses them down until they freeze solid WHITE — hands thrown
  // up in surrender — then strolls over, reaches out DAINTILY, taps them
  // once... and the whole statue bursts into a pile of frozen rubble.
  glacier(F) {
    const { win, vic, w } = F;
    F.at(0.35, () => { win.animator.play('shootLoop'); w.audio?.play('freeze'); });
    // the ice takes hold mid-panic: hands go UP and stay up
    F.at(0.9, () => vic.animator.play('frozenSurrender'));
    F.hold(0.45, 2.3, (k, dt) => {
      const from = win.mech.anchors.muzzleR.getWorldPosition(new THREE.Vector3());
      w.effects.beams.spawn(from, vic.center(), { radius: 0.5, dur: 0.14, color: 0x9be8ff });
      if (Math.random() < dt * 12) w.effects.snowCone(from, _dirTo(win, vic));
      vic._beamWhiteT = 0.2; // stays white under the beam
      vic.applyWhiteout(Math.min(1, k * 1.6));
    });
    F.at(2.3, () => { vic.applyWhiteout(1); w.audio?.play('freezeBig'); });
    F.hold(2.3, F.dur, () => vic.applyWhiteout(1)); // frozen stays frozen
    F.approach(2.4, 3.35, 2.9);
    // the dainty tap
    F.at(3.55, () => win.animator.play('daintyTap'));
    // raised side angle: the reach, the fingertip tap, and the statue all
    // read in profile with the camera looking slightly down on the touch
    F.camShot(2.4, 3.95, { dist: 12.5, h: 6.5, az0: 1.35, az1: 1.7, lookH: 3.2 });
    F.at(3.98, () => {
      // ...tink. The statue shatters into a pile of white frozen rubble.
      F.beat('shatter', 1.1, 0.16);
      vic.group.visible = false; // comes back at the next round's reset
      F._rubble = [];
      const S = vic.scale;
      for (let i = 0; i < 18; i++) {
        const r = rand(0.22, 0.55) * S;
        const m = new THREE.Mesh(
          new THREE.IcosahedronGeometry(r, 0),
          new THREE.MeshStandardMaterial({
            color: 0xeaf6ff, roughness: 0.32, metalness: 0.05,
            emissive: 0x9fd8ff, emissiveIntensity: 0.12,
          }));
        const a = rand(Math.PI * 2), rr = rand(0, vic.hitRadius * 0.7);
        m.position.set(vic.pos.x + Math.cos(a) * rr,
          rand(0.4, vic.height * 0.95), vic.pos.z + Math.sin(a) * rr);
        m.rotation.set(rand(Math.PI * 2), rand(Math.PI * 2), rand(Math.PI * 2));
        w.addDebris(m); // persists as set dressing; swept at next round
        F._rubble.push({
          m, r,
          vx: Math.cos(a) * rand(1, 3.5), vy: rand(-1, 2.5), vz: Math.sin(a) * rand(1, 3.5),
          wx: rand(-6, 6), wz: rand(-6, 6),
        });
      }
      w.effects.impactSparks(vic.center(), 0xbfeaff, 34, 16);
      for (let i = 0; i < 16; i++) {
        w.effects.glows.emit(vic.pos.x + rand(-1, 1), rand(1, vic.height), vic.pos.z + rand(-1, 1),
          rand(-6, 6), rand(4, 10), rand(-6, 6),
          { life: rand(0.5, 0.9), size: rand(0.8, 1.6), color: 0xd8f4ff, alpha: 0.95, gravity: 18 });
      }
    });
    // the chunks tumble down and settle into the pile
    F.hold(3.98, 6.4, (k, dt) => {
      if (!F._rubble) return;
      for (const c of F._rubble) {
        if (c.rest) continue;
        c.vy -= 22 * dt;
        c.m.position.x += c.vx * dt;
        c.m.position.y += c.vy * dt;
        c.m.position.z += c.vz * dt;
        c.m.rotation.x += c.wx * dt;
        c.m.rotation.z += c.wz * dt;
        if (c.m.position.y <= c.r * 0.8) {
          c.m.position.y = c.r * 0.8;
          if (Math.abs(c.vy) > 3) { // one soft bounce, then settle
            c.vy = Math.abs(c.vy) * 0.3;
            c.vx *= 0.5; c.vz *= 0.5;
          } else {
            c.rest = true;
          }
        }
      }
      if (Math.random() < dt * 10) { // cold mist off the fresh pile
        w.effects.glows.emit(vic.pos.x + rand(-1.2, 1.2), rand(0.2, 1.2), vic.pos.z + rand(-1.2, 1.2),
          rand(-0.5, 0.5), rand(0.5, 1.5), rand(-0.5, 0.5),
          { life: rand(0.5, 1), size: rand(0.5, 1), color: 0xd8f4ff, alpha: 0.5 });
      }
    });
    // keep panning the same raised side view through the shatter so the
    // burst and the settling rubble pile stay in frame (no jump cut)
    F.camShot(3.95, 5.4, { dist: 13, h: 5.6, az0: 1.65, az1: 2.0, lookH: 1.8 });
    F.triumph(5.2, 'victory', 'freezeBig');
  },

  // CRANKY: three colossal claw CLAMPS batting the victim side to side,
  // then his geyser fires the wreck WAY into the sky
  cranky(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 1.0, 3.4);
    // claws track the ragdoll so every clamp connects
    F.hold(1.1, 3.2, (k, dt) => {
      const dx = w.wrapDelta(vic.pos.x - win.pos.x);
      const dz = w.wrapDelta(vic.pos.z - win.pos.z);
      win.yaw = win.targetYaw = Math.atan2(dx, dz);
    });
    for (let i = 0; i < 3; i++) {
      F.at(1.15 + i * 0.62, () => win.animator.play('clawSnap', { speed: 1.3 }));
      F.at(1.42 + i * 0.62, () => { F.beat('block', 0.6, 0.08); F.sparks(16, 11, 0x59c8ff); F.vicFlinch(); });
      F.vicBash(1.44 + i * 0.62, F.axis + (i % 2 ? 1.35 : -1.35), 1.7, 0.8, 0.6);
    }
    F.trackCenter(1.3, 3.4, 5);
    F.camAction(1.0, 3.2, { dist: 12, h: 3.8, lookH: 2.4 });
    F.at(3.2, () => { win.animator.play('castRaise'); w.audio?.play('cast'); });
    F.at(3.6, () => {
      // the REAL geyser sim: 0.4s boil under the wreck, then the column
      // erupts at 4.0 exactly as the body launches (fx-only — no owner,
      // so the world's scald tick leaves the cinematic alone)
      w.geysers.push({
        fx: new GeyserFX(w.scene, w.effects, vic.pos.clone().setY(0), {
          height: 27, radius: 1.7, warn: 0.4, sustain: 1.3, boilRadius: 3,
        }),
      });
      w.audio?.play('wave');
    });
    F.at(4.0, () => {
      F.beat('explosionBig', 1, 0.1);
      vic.animator.play('launched');
    });
    F.hold(4.0, 5.3, (k) => {
      vic.pos.y = Math.sin(Math.min(1, k) * Math.PI) * 14;
      vic.group.rotation.x = -k * 5.5;
    });
    F.camShot(3.9, 5.3, { dist: 11, h: 4.5, az0: 2.35, az1: 2.05, lookH: 5.5 });
    F.at(5.3, () => {
      vic.group.rotation.x = 0;
      F.vicDown();
      w.effects.dustPuff(vic.pos, 12);
      F.beat('bodyfall', 0.9, 0.07);
    });
    F.triumph(5.55, 'taunt', 'wave');
  },

  // FROGGER: hoses them down until they're MUMMIFIED head-to-toe in gunk,
  // then the royal squash-hop — and the wreck is left genuinely FLATTENED
  frogger(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 0.9, 7);
    F.at(1.0, () => { win.animator.play('spray', { speed: 1.4 }); });
    // eight splats walking up the body: legs, torso, arms, head — each one
    // sticks dripping blotches on so the coverage visibly BUILDS
    const coats = [
      ['thighL', 'thighR'], ['thighR', 'torso'], ['torso', 'torso'], ['torso', 'shoulderL'],
      ['shoulderR', 'torso'], ['torso', 'head'], ['head', 'shoulderL'], ['head', 'torso'],
    ];
    for (let i = 0; i < 8; i++) {
      F.at(1.15 + i * 0.22, () => {
        F.beat('plasma', 0.3, 0.03);
        // thick gunk SPLATTERS over them and oozes down
        w.effects.slime(new THREE.Vector3(
          vic.pos.x + rand(-0.8, 0.8), rand(1, vic.height), vic.pos.z + rand(-0.8, 0.8)), 7, 5);
        for (const joint of coats[i]) {
          w.effects.blotchOn(vic, 0x74bc24, { joint, y0: joint === 'torso' ? 0.1 : -1.2, y1: joint === 'torso' ? 2.2 : 0.4, size: 1.3, life: 8 });
        }
        F.vic.animator.addImpulse('torso', [rand(-0.25, 0.25), 0, rand(-0.25, 0.25)], 34, 12);
      });
    }
    // the final coat: nothing clean left showing, oozing from every plate,
    // standing in their own puddle — THEN the stomp
    F.at(2.95, () => {
      w.effects.slimeCoat(vic, 0x74bc24, 9);
      w.effects.slime(vic.center(), 12, 7);
      w.effects.puddle(new THREE.Vector3(vic.pos.x, 0.02, vic.pos.z), { slime: true, size: 4.5, life: 8 });
      w.audio?.play('plasma');
    });
    F.at(3.05, () => F.vicDown());
    F.at(3.3, () => { win.animator.play('pounceLeap'); w.audio?.play('jump'); });
    F.hold(3.3, 3.95, (k) => { // the squash-hop onto the wreck
      win.pos.x = lerp(F.center.x - Math.sin(F.axis) * 7, vic.pos.x, k);
      win.pos.z = lerp(F.center.z - Math.cos(F.axis) * 7, vic.pos.z, k);
      win.pos.y = Math.sin(k * Math.PI) * 6;
    });
    F.at(3.95, () => {
      F.beat('bodyfall', 1.1, 0.12);
      F.sparks(24, 14, 0x9ade2a);
      w.effects.dustPuff(vic.pos, 14);
      w.effects.rings.spawn(vic.pos, { from: 0.6, to: 6, dur: 0.4, color: 0xaef23c, y: 0.3 });
    });
    // ACTUALLY flattened: pancaked under the landing, slowly re-inflating
    F.hold(3.95, 4.55, () => {
      vic.group.scale.set(1.25, 0.42, 1.25);
    });
    F.hold(4.55, 5.9, (k) => {
      const e = smooth(k);
      vic.group.scale.set(lerp(1.25, 1, e), lerp(0.42, 1, e), lerp(1.25, 1, e));
    });
    F.hold(3.95, 4.6, (k) => { // hops back off
      win.pos.x = lerp(vic.pos.x, vic.pos.x - Math.sin(F.axis) * 4, k);
      win.pos.z = lerp(vic.pos.z, vic.pos.z - Math.cos(F.axis) * 4, k);
      win.pos.y = Math.sin(k * Math.PI) * 3;
    });
    F.camShot(3.3, 4.6, { dist: 9, h: 3.4, az0: 2.4, az1: 2.9, lookH: 2.4 });
    F.at(4.7, () => F.finaleBurst(0x9ade2a));
    F.triumph(5.1, 'taunt');
  },

  // JERRY: the nest empties — he SHOOTS a hundred fleas out of his
  // cannons, raining them over and all around the mark... and then we
  // just watch them do what fleas do: hop in, swarm, latch, feed
  jerry(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 1.0, 8);
    F.at(1.05, () => { win.animator.play('shootLoop'); w.audio?.play('dart'); });
    // ten cannon bursts of ten — a spraying arc that lands fleas over,
    // past, short and beside the victim (spawned as ORDINARY fleas; the
    // swarm behavior is all their own)
    for (let b = 0; b < 10; b++) {
      F.at(1.15 + b * 0.17, () => {
        F.winCtx = null;
        const from = (b % 2 ? win.mech.anchors.muzzleL : win.mech.anchors.muzzleR)
          ?.getWorldPosition(new THREE.Vector3()) || win.center();
        const dx = w.wrapDelta(vic.pos.x - win.pos.x);
        const dz = w.wrapDelta(vic.pos.z - win.pos.z);
        const d = Math.hypot(dx, dz) || 1;
        for (let i = 0; i < 10; i++) {
          const dir = new THREE.Vector3(
            dx / d + rand(-0.4, 0.4), rand(0.3, 0.95), dz / d + rand(-0.4, 0.4));
          // lobbed, not fired flat: the arcs RAIN down over and around them
          w.fleas.spawn(win, from, dir, { dmg: 0, life: rand(7, 10), speed: rand(12, 19) });
        }
        w.effects.muzzleFlash(from, 0xff8a60);
        w.audio?.play('dart');
      });
    }
    F.hold(1.1, 2.9, () => { F.winCtx = { speed: 0, grounded: true, firing: true }; });
    // the victim staggers as the swarm crawls up them
    for (let i = 0; i < 6; i++) {
      F.at(2.6 + i * 0.5, () => {
        if (i % 2 === 0) F.vicFlinch();
        vic.animator.addImpulse('torso', [rand(-0.3, 0.3), 0, rand(-0.3, 0.3)], 30, 10);
        if (Math.random() < 0.6) w.audio?.play('slash');
      });
    }
    // wide on the barrage arc, then push in CLOSE on the swarm at work
    F.camShot(1.1, 3.0, { dist: 10.5, h: 3.6, az0: 1.9, az1: 2.45, lookH: 2.6 });
    F.camShot(3.0, 5.3, { dist: 5.5, h: 2.2, az0: 2.55, az1: 2.15, lookH: 1.8 });
    F.at(4.9, () => F.vicDown()); // finally collapses under them
    F.at(5.6, () => F.finaleBurst(0xc86a4a));
    F.triumph(5.7, 'taunt', 'dart');
  },
  // NULLBOT: stalks in, seizes the mark one-handed and FLOODS them with
  // corruption until they're more static than machine — drops the husk,
  // notices YOU, squares up on the lens, and punches the camera: SYSTEM
  // FAILURE. The bluescreen holds for a full three seconds, then the
  // scene ends (skip and end() both tear the overlay down).
  nullbot(F) {
    const { win, vic, w } = F;
    F.dur = 8.0;
    const GRAB_JOINTS = [
      ['torso', 0.2, 1.5], ['head', -0.1, 0.4],
      ['shoulderL', -1.0, 0.1], ['shoulderR', -1.0, 0.1],
      ['elbowL', -0.9, 0], ['elbowR', -0.9, 0],
      ['thighL', -1.2, 0], ['thighR', -1.2, 0],
      ['kneeL', -1.1, 0], ['kneeR', -1.1, 0],
    ];
    const vicPatch = (size, life) => {
      const [jn, y0, y1] = GRAB_JOINTS[(Math.random() * GRAB_JOINTS.length) | 0];
      w.effects.glitchOn(vic, {
        joint: jn,
        x: rand(-0.3, 0.3) * vic.scale,
        y: rand(y0, y1) * vic.scale,
        z: rand(-0.2, 0.4) * vic.scale,
        size, life,
      });
    };
    F.approach(0.2, 1.0, 2.6);
    F.camShot(0, 1.35, { dist: 12, h: 4.4, az0: 2.1, az1: 2.5 });
    F.at(1.1, () => { win.animator.play('grabReach'); w.audio?.play('servo'); });
    F.at(1.32, () => { F.ragdoll(vic, 'ragdollAir'); F.beat('zap', 0.35, 0.05); });
    // the mark is LEVITATED out at arm's length — well clear of NULLBOT —
    // and rises slowly into the air while the corruption pours in: patch
    // after patch of their body stops rendering, faster and faster, and
    // the patches STAY, until there is more static than machine
    F.hold(1.32, 4.2, (k, dt) => {
      win.yaw = win.targetYaw = F.axis;
      const hx = win.pos.x + Math.sin(F.axis) * 3.6 * win.scale;
      const hz = win.pos.z + Math.cos(F.axis) * 3.6 * win.scale;
      const grip = Math.min(1, dt * 9);
      vic.pos.x += (hx - vic.pos.x) * grip;
      vic.pos.z += (hz - vic.pos.z) * grip;
      vic.pos.y = smooth(Math.min(1, k * 1.4)) * 2.3 * win.scale + Math.sin(k * 21) * 0.1;
      vic.yaw = vic.targetYaw = F.axis + Math.PI;
      vic.group.rotation.y = vic.yaw;
      // loose flecks + occasional shard bursts, ramping with the corruption
      if (Math.random() < dt * (10 + 50 * k)) {
        w.effects.glitchFleck(
          vic.pos.x + rand(-0.8, 0.8) * vic.scale,
          vic.pos.y + rand(0.3, vic.height),
          vic.pos.z + rand(-0.8, 0.8) * vic.scale, 1.25 * vic.scale);
      }
      if (Math.random() < dt * (1.5 + 8 * k)) {
        w.effects.glitchBurst(vic.center(), 8, 5, 0.8 * vic.scale);
        if (Math.random() < 0.4) w.audio?.play('zap');
      }
      // accumulating patches: long-lived (they persist on the downed wreck
      // AFTER the bluescreen too), spawning ever faster
      F._pt = (F._pt ?? 0) - dt;
      if (F._pt <= 0) {
        F._pt = 0.5 - 0.44 * k * k;
        vicPatch(rand(1.3, 1.8), rand(14, 22));
      }
    });
    // side-front quarter, lens lifted to follow the rising body
    F.camShot(1.35, 4.25, { dist: 12, h: 4.9, az0: 1.35, az1: 1.8, lookH: 4.3 });
    // TOTAL COVERAGE: a final two-layer blanket over every body part —
    // whatever was still recognizable stops rendering entirely
    F.at(4.2, () => {
      for (let i = 0; i < GRAB_JOINTS.length; i++) {
        vicPatch(rand(1.8, 2.2), 25); // outlives the scene: the wreck stays corrupted
        vicPatch(rand(1.1, 1.5), 25);
      }
      w.effects.glitchBurst(vic.center(), 26, 10, vic.scale);
      F.beat('zap', 0.6, 0.06);
    });
    // ...and then it notices YOU. Locked-off lens shot at chest height;
    // NULLBOT turns square into it while the corrupted mass hangs behind.
    F.hold(4.25, 5.2, () => {
      const az = F.axis + 2.5;
      const d = 6.2 * F.stageScale;
      F.cam.pos.set(win.pos.x + Math.sin(az) * d, win.height * 0.6, win.pos.z + Math.cos(az) * d);
      F.cam.look.set(win.pos.x, win.height * 0.64, win.pos.z);
      win.yaw = win.targetYaw = Math.atan2(F.cam.pos.x - win.pos.x, F.cam.pos.z - win.pos.z);
    });
    F.at(4.45, () => { w.audio?.play('servo'); win.animator.addImpulse('head', [0, 0.5, 0], 22, 9); });
    F.at(4.72, () => win.animator.play('light2', { speed: 1.0 }));
    // the fist arrives AT the lens — and the feed dies
    F.at(4.97, () => {
      F.beat('hitHeavy', 1.6, 0.16);
      w.audio?.play('explosionBig');
      w.effects.glitchBurst(win.center(), 24, 12, win.scale);
      showBluescreen(F);
    });
    // NOTE: no clearGlitchOn cleanup here — the corruption deliberately
    // STAYS on the wreck after the bluescreen lifts (patch lifetimes cover
    // the round-end beat; the next round's resetForRound wipes them).
    // The SYSTEM FAILURE screen owns the last three seconds; end() (or a
    // skip) tears the overlay down via cleanups.
  },
};

// full-screen SYSTEM FAILURE bluescreen (matches docs/canonical/
// null_bluescreen_of_death.png): terminal text, corruption bars, scanlines
function showBluescreen(F) {
  const root = document.getElementById('ui-root');
  if (!root) return;
  const el = document.createElement('div');
  el.style.cssText =
    'position:absolute;inset:0;z-index:9;overflow:hidden;pointer-events:none;' +
    'background:linear-gradient(135deg,#050b7a 0%,#0a1cb4 45%,#071060 100%);' +
    "font-family:'Courier New',monospace;color:#cfe0ff;";
  // corruption bars: hard random blocks strobing at the screen edges
  let bars = '';
  for (let i = 0; i < 26; i++) {
    const left = Math.random() * 100, top = Math.random() * 100;
    const wpc = 2 + Math.random() * 14, hpc = 0.4 + Math.random() * 2.6;
    const colors = ['#ff2038', '#27f6ff', '#ff2df2', '#3cff6e', '#ffe23c', '#ffffff', '#0a1cb4'];
    const c = colors[(Math.random() * colors.length) | 0];
    const dur = (0.12 + Math.random() * 0.5).toFixed(2);
    const delay = (Math.random() * 0.7).toFixed(2);
    bars += `<div style="position:absolute;left:${left}%;top:${top}%;width:${wpc}%;height:${hpc}%;` +
      `background:${c};opacity:0;animation:nb-bar ${dur}s steps(2) ${delay}s infinite;"></div>`;
  }
  el.innerHTML = `
    <style>
      @keyframes nb-bar { 0%,45% { opacity: 0; } 50%,90% { opacity: 0.85; } 100% { opacity: 0; } }
      @keyframes nb-jit { 0%,92% { transform: translate(0,0); } 94% { transform: translate(-7px,2px); }
        96% { transform: translate(5px,-3px); } 98% { transform: translate(-3px,1px); } 100% { transform: translate(0,0); } }
      @keyframes nb-blink { 0%,55% { opacity: 1; } 60%,100% { opacity: 0.15; } }
    </style>
    ${bars}
    <div style="position:absolute;inset:0;background:repeating-linear-gradient(0deg,rgba(0,0,0,0.22) 0 2px,transparent 2px 4px);"></div>
    <div style="position:absolute;left:6%;top:5.5%;max-width:70%;animation:nb-jit 1.1s infinite;text-shadow:0 0 8px #4a7dff;">
      <div style="font-size:min(4.6vw,44px);font-weight:700;letter-spacing:0.14em;color:#eaf2ff;white-space:nowrap;">SYSTEM FAILURE</div>
      <div style="margin-top:1.6vh;font-size:min(1.8vw,16px);line-height:1.55;">
        A fatal exception 0x00<span style="color:#ff4d5e;">NULLBOT</span> has occurred in your system.<br>
        The system has been terminated.
      </div>
      <div style="margin-top:1.7vh;display:inline-block;border:2px solid #cfe0ff;padding:0.4vh 1.2vw;font-size:min(2.3vw,21px);letter-spacing:0.12em;">NULLBOT.EXE</div>
      <div style="margin-top:0.6vh;font-size:min(1.6vw,14px);color:#ff4d5e;letter-spacing:0.2em;">EXECUTION: TERMINATED</div>
      <div style="margin-top:1.5vh;font-size:min(1.7vw,15px);letter-spacing:0.08em;">STOP CODE: 0xNULL_00000000</div>
      <div style="margin-top:0.6vh;font-size:min(1.5vw,13px);line-height:1.6;color:#9fb6ff;">
        &gt; NULL_REFERENCE_DETECTED<br>
        &gt; CRITICAL_PROCESS_DIED<br>
        &gt; SYSTEM_DATA_CORRUPTED<br>
        &gt; REALITY_SYNC_LOST
      </div>
      <div style="margin-top:1.5vh;font-size:min(1.7vw,15px);">THIS WORLD WILL BE <span style="color:#ff4d5e;">NULLIFIED.</span></div>
      <div style="margin-top:1.4vh;font-size:min(1.6vw,14px);letter-spacing:0.12em;">NULLIFYING SYSTEM...</div>
      <div style="margin-top:0.6vh;width:30vw;height:1.8vh;border:2px solid #cfe0ff;position:relative;">
        <div style="position:absolute;inset:2px;background:repeating-linear-gradient(90deg,#8fb0ff 0 10px,#3556d0 10px 12px);"></div>
        <div style="position:absolute;right:-4.5vw;top:-0.3vh;color:#ff4d5e;font-size:min(1.7vw,15px);">100%</div>
      </div>
      <div style="margin-top:1.3vh;font-size:min(1.6vw,14px);text-decoration:underline;">DO NOT REBOOT. THERE IS NO RECOVERY.</div>
      <div style="margin-top:1.5vh;font-size:min(1.9vw,17px);color:#ff4d5e;letter-spacing:0.22em;animation:nb-blink 0.9s steps(1) infinite;">GOODBYE.</div>
    </div>`;
  root.appendChild(el);
  F.cleanups.push(() => el.remove());
}

function _dirTo(a, b) {
  return new THREE.Vector3(b.pos.x - a.pos.x, 0, b.pos.z - a.pos.z).normalize();
}
