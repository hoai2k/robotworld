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
    // default wide establishing orbit — scripts layer their shots over it
    this.camShot(0, this.dur, { dist: 15, h: 6, lookH: 3 });
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
  vicDown() { this.vic.animator.play('knockdown'); }
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

  update(dt) {
    this.t += dt;
    for (const a of this.acts) {
      if (!a.done && this.t >= a.t) { a.done = true; a.fn(); }
    }
    for (const h of this.holds) {
      if (this.t >= h.t0 && this.t <= h.t1) {
        h.fn(clamp01((this.t - h.t0) / Math.max(1e-4, h.t1 - h.t0)), dt);
      }
    }
    // puppets animate outside the fighter state machine; a hold may have
    // staged a locomotion ctx for the winner this frame (approach, charge)
    this.win.animator.update(dt, this.winCtx || { speed: 0, grounded: true });
    this.winCtx = null;
    this.vic.animator.update(dt, { speed: 0, grounded: true });
    this.win.group.rotation.y = this.win.yaw;
    if (this.t >= this.dur) this.end();
  }

  end() {
    if (this.ended) return;
    this.ended = true;
    this.dropSpectre();
    this.win.setOpacity?.(1);
    this.win.cinePuppet = false;
    this.vic.cinePuppet = false;
    this.vic.group.rotation.x = 0;
    this.vic.group.rotation.z = 0;
    this.vic.group.scale.set(1, 1, 1);
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
    F.at(1.45, () => { win.animator.play('liftHold'); vic.animator.play('launched'); F.beat('whooshBig', 0.3, 0); });
    // hauled up INTO the palms — the body rides the actual lift-swing of
    // the hands and rests in them at the top
    let cx, cy2, cz;
    F.hold(1.45, 2.3, (k) => {
      if (cx === undefined) { cx = vic.pos.x; cy2 = vic.pos.y; cz = vic.pos.z; }
      const e = smooth(k);
      const tp = win.carryPoint(vic, _ct);
      vic.pos.x = cx + (tp.x - cx) * e;
      vic.pos.y = cy2 + (tp.y - cy2) * e;
      vic.pos.z = cz + (tp.z - cz) * e;
      vic.yaw = vic.targetYaw = win.yaw + Math.PI / 2;
      vic.group.rotation.y = vic.yaw;
      vic.group.rotation.x = -1.45 * e;
    });
    F.camShot(1.3, 2.6, { dist: 9.5, h: 7, az0: 3.5, az1: 3.1, lookH: 7 });
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
      F.vicDown();
      F.center.set(vic.pos.x, 0, vic.pos.z);
      w.effects.dustPuff(vic.pos, 12);
    });
    F.camAction(2.85, 5.75, { dist: 14, h: 4.6, lookH: 2.6 });
    F.trackCenter(2.9, 5.7, 5);
    // relentless pursuit: between smashes he re-squares up on wherever the
    // last punt knocked the body, so every pound lands ON it
    F.hold(2.95, 5.6, (k, dt) => {
      const dx = w.wrapDelta(vic.pos.x - win.pos.x);
      const dz = w.wrapDelta(vic.pos.z - win.pos.z);
      const d = Math.hypot(dx, dz) || 1e-4;
      const want = 2.0 * win.scale;
      if (d > want + 0.05) {
        const step = Math.min(d - want, dt * 10);
        win.pos.x += (dx / d) * step;
        win.pos.z += (dz / d) * step;
        if (step > dt * 4) F.winCtx = { speed: 8, maxSpeed: 10, grounded: true };
      }
      win.yaw = win.targetYaw = Math.atan2(dx, dz);
    });
    for (let i = 0; i < 3; i++) {
      const tS = 3.25 + i * 0.8;
      F.at(tS, () => win.animator.play('groundPound', { speed: 1.6 }));
      F.at(tS + 0.4, () => {
        F.beat('slam', 0.9, 0.08);
        F.sparks(22, 13);
        w.effects.rings.spawn(vic.pos, { from: 0.6, to: 5.5, dur: 0.35, color: 0xffb43c, y: 0.3 });
        w.effects.dustPuff(vic.pos, 6);
      });
      F.vicBash(tS + 0.42, F.axis + (i % 2 ? 1.05 : -1.05), 2.4, 1.3, 1.1);
    }
    F.at(5.75, () => F.finaleBurst());
    F.triumph(5.85, 'castRaise');
  },

  // COLOSSUS: hoist overhead, hurl them down, hammer them flat — chasing
  // the wreck around, arms to the sky. The requested wrestling execution.
  colossus(F) {
    SCRIPTS.titanus(F); // same skeleton, then swap the smash flavor:
    // (colossus's heavy Y-frame smashes read through the same beats; his
    // groundPound clip is the full-body artillery slam — identical intent)
  },

  // SAURION: leaps onto the chest, rides them down flat to the dirt and
  // stays CROUCHED ON the body, jackhammer-biting at face height, then
  // springs off, looks around, grooms
  saurion(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 0.85, 7);
    F.camShot(0, 1.5, { dist: 11.5, h: 4 });
    F.at(0.95, () => { win.animator.play('pounceLeap'); w.audio?.play('jump'); });
    F.hold(0.95, 1.4, (k) => {
      const e = k;
      win.pos.x = F.center.x - Math.sin(F.axis) * 7 * (1 - e);
      win.pos.z = F.center.z - Math.cos(F.axis) * 7 * (1 - e);
      win.pos.y = Math.sin(e * Math.PI) * 5.5 + e * vic.height * 0.55;
    });
    F.at(1.4, () => {
      F.beat('slash', 0.7, 0.09);
      win.animator.play('biteLatch', { speed: 1.8 });
      F.vicFlinch();
    });
    // rides them down onto their back, clinging low the whole way — ends
    // crouched right on the fallen chest so the bites REACH
    const rideY = Math.max(0.85, vic.height * 0.16);
    F.hold(1.4, 2.6, (k) => {
      const e = smooth(k);
      vic.group.rotation.x = -1.5 * e;
      vic.pos.x = F.center.x + Math.sin(F.axis) * 1.2 * e;
      vic.pos.z = F.center.z + Math.cos(F.axis) * 1.2 * e;
      win.pos.x = vic.pos.x;
      win.pos.z = vic.pos.z;
      win.pos.y = lerp(vic.height * 0.55, rideY, e);
      win.yaw = win.targetYaw = F.axis;
    });
    // stays glued on the wreck, bobbing with each bite
    F.hold(2.6, 4.15, (k) => {
      win.pos.x = vic.pos.x;
      win.pos.z = vic.pos.z;
      win.pos.y = rideY + Math.abs(Math.sin(k * 26)) * 0.22;
      win.yaw = win.targetYaw = F.axis;
    });
    F.camShot(1.4, 4.1, { dist: 7.5, h: 2.2, az0: 3.7, az1: 3.25, lookH: 1.2 });
    for (let i = 0; i < 7; i++) {
      F.at(1.6 + i * 0.32, () => {
        F.sparks(10, 9, 0xff3826);
        w.audio?.play('slash');
        vic.animator.addImpulse('torso', [rand(-0.3, 0.3), 0, rand(-0.2, 0.2)], 30, 11);
      });
    }
    F.at(4.15, () => { win.animator.stop(0.1); w.audio?.play('jump'); });
    F.hold(4.15, 4.6, (k) => { // springs off the carcass
      win.pos.x = vic.pos.x - Math.sin(F.axis) * 4 * k;
      win.pos.z = vic.pos.z - Math.cos(F.axis) * 4 * k;
      win.pos.y = Math.sin(k * Math.PI) * 2.6;
    });
    // looks around, then the grooming head-dip — as close to licking his
    // lips as a mech gets
    F.at(4.8, () => win.animator.addImpulse('head', [0, 0.7, 0], 4.5, 2));
    F.at(5.6, () => { win.animator.addImpulse('head', [0.4, -0.55, 0], 7, 3); w.audio?.play('servo'); });
    F.triumph(6.1, 'taunt', 'howl');
  },

  // VIPER: five-point blink-flurry cage, then one launcher slash — the
  // camera whips down low and TRACKS the body all the way up and down
  viper(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 0.8, 3.2);
    const blink = (t, side) => {
      F.at(t, () => {
        win.pos.x = F.center.x - Math.sin(F.axis + side) * 3;
        win.pos.z = F.center.z - Math.cos(F.axis + side) * 3;
        win.yaw = win.targetYaw = F.axis + side;
        w.effects.dashTrail(win.pos, 0x6cff5c, win.scale * 1.6);
        win.animator.play('flurry', { speed: 1.5 });
        w.audio?.play('dash');
      });
      F.at(t + 0.2, () => { F.beat('slash', 0.4, 0.05); F.sparks(12, 9, 0x6cff5c); F.vicFlinch(); });
    };
    blink(1.0, 0);
    blink(1.55, 2.1);
    blink(2.1, -2.1);
    blink(2.65, Math.PI);
    blink(3.2, 1.05);
    F.camShot(1.0, 3.9, { dist: 8, h: 3.4, az0: 2.0, az1: 3.6, lookH: 3 });
    F.at(3.75, () => {
      win.pos.x = F.center.x - Math.sin(F.axis) * 3;
      win.pos.z = F.center.z - Math.cos(F.axis) * 3;
      win.yaw = win.targetYaw = F.axis;
      w.effects.dashTrail(win.pos, 0x6cff5c, win.scale * 1.6);
      win.animator.play('heavy', { speed: 1.3 });
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
  vulcan(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 1.0, 5.5);
    F.at(1.1, () => { win.animator.play('shootLoop'); w.audio?.play('charge'); });
    F.hold(1.3, 4.3, (k, dt) => {
      F.winCtx = { speed: 0, grounded: true, firing: true }; // gatlings spin
      if (Math.random() < dt * 30) {
        const from = win.mech.anchors.muzzleR.getWorldPosition(new THREE.Vector3());
        w.effects.muzzleFlash(from);
        F.sparks(6, 8);
        if (Math.random() < 0.4) w.audio?.play('gatling');
        F.vic.animator.addImpulse('torso', [rand(-0.2, 0.2), 0, rand(-0.2, 0.2)], 40, 14);
      }
    });
    // the shred physically drives them back; vulcan advances to match
    F.hold(1.7, 3.4, (k, dt) => {
      vic.pos.x += Math.sin(F.axis) * dt * 2.6;
      vic.pos.z += Math.cos(F.axis) * dt * 2.6;
      win.pos.x += Math.sin(F.axis) * dt * 2.1;
      win.pos.z += Math.cos(F.axis) * dt * 2.1;
      if (Math.random() < dt * 10) w.effects.dustPuff(vic.pos, 2);
    });
    F.trackCenter(1.7, 4.6, 5);
    F.camAction(1.3, 4.4, { dist: 12, h: 3.6, lookH: 2.4 });
    F.at(2.4, () => F.vicFlinch());
    F.at(3.4, () => F.vicDown());
    // one last burst kicks the corpse across the ground
    F.vicBash(3.9, F.axis, 2.4, 0.8, 1.4);
    F.at(3.9, () => { F.beat('hitHeavy', 0.7, 0.08); F.sparks(20, 12); });
    F.at(4.45, () => { F.finaleBurst(); F.sparks(30, 16); });
    F.triumph(5.05);
  },

  // AEGIS: shield bash skids them across the dirt, then the sky-pillar of
  // judgment BLASTS the body skyward before it crashes back down
  aegis(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 1.0, 3.2);
    F.at(1.15, () => win.animator.play('shieldBash'));
    F.at(1.35, () => { F.beat('whooshBig', 0.7, 0.09); F.sparks(18, 12, 0x49b7ff); F.vicDown(); });
    F.vicBash(1.36, F.axis, 2.2, 0.9, 0.8);
    F.trackCenter(1.4, 5.0, 5);
    F.at(2.1, () => { win.animator.play('castRaise'); w.audio?.play('cast'); });
    F.at(2.6, () => {
      w.effects.rings.spawn(vic.pos, { from: 5, to: 4.5, dur: 0.8, color: 0x49b7ff, y: 0.4 });
    });
    F.at(3.5, () => {
      const top = vic.pos.clone(); top.y += 60;
      w.effects.beams.spawn(top, vic.pos, { radius: 2.6, dur: 0.9, color: 0xbfe8ff });
      w.effects.explosion(vic.center(), 5, { color: 0x9fd8ff });
      F.beat('beam', 1.1, 0.12);
      vic.animator.play('launched');
    });
    // the pillar hurls them up; they crash back down in the light
    F.hold(3.5, 4.55, (k) => {
      vic.pos.y = Math.sin(Math.min(1, k) * Math.PI) * 9;
      vic.group.rotation.x = -k * 3.5;
    });
    F.at(4.55, () => {
      vic.group.rotation.x = 0;
      F.vicDown();
      F.beat('bodyfall', 0.9, 0.08);
      w.effects.dustPuff(vic.pos, 12);
    });
    F.camShot(2.1, 4.5, { dist: 12, h: 3.4, az0: 2.6, az1: 2.3, lookH: 5.5 });
    F.camShot(4.5, 5.2, { dist: 8, h: 2.6, az0: 2.9, az1: 2.6, lookH: 1.6 });
    F.at(4.7, () => F.sparks(20, 12, 0x9fd8ff));
    F.triumph(5.2, 'victory', 'cast');
  },

  // NOVA: halo slams to apex and three falling stars each BLAST the body a
  // different direction across the crater field
  nova(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 0.9, 8);
    F.at(1.0, () => { win.animator.play('castRaise'); w.audio?.play('cast'); });
    F.hold(1.0, F.dur, () => { // halo pinned blazing at apex all scene
      const J = win.mech.joints;
      if (J.halo) J.halo.rotation.z = 0;
      if (win.mech.materials.glowSoft) win.mech.materials.glowSoft.emissiveIntensity = 3.8;
    });
    const dirs = [0.8, -1.1, 2.4];
    for (let i = 0; i < 3; i++) {
      F.at(2.0 + i * 0.75, () => {
        const p = vic.pos.clone().add(new THREE.Vector3(rand(-0.6, 0.6), 0, rand(-0.6, 0.6)));
        const top = p.clone(); top.y += 34;
        w.effects.beams.spawn(top, p, { radius: 0.9, dur: 0.3, color: 0xff5ce8 });
        w.effects.explosion(vic.center(), 3.6, { color: 0xff5ce8, smoke: false });
        F.beat('plasma', 0.6, 0.07);
        F.sparks(16, 11, 0xff5ce8);
        F.vicFlinch();
      });
      F.vicBash(2.05 + i * 0.75, F.axis + dirs[i], 2.0, 1.1, 0.9);
    }
    F.trackCenter(2.0, 4.8, 5);
    F.camShot(1.6, 4.6, { dist: 9, h: 3.6, az0: 2.2, az1: 2.9, lookH: 3.2 });
    F.at(4.4, () => { F.vicDown(); F.finaleBurst(0xff5ce8); });
    F.triumph(5.1, 'burst', 'powerup');
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

  // TEMPEST: pins them under his storm — five bolts hammer down, each one
  // convulsing the body and JOLTING it across the scorched ground
  tempest(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 0.9, 8.5);
    F.at(1.0, () => { win.animator.play('burst'); w.audio?.play('thunder'); });
    F.at(1.3, () => {
      for (let i = 0; i < 22; i++) {
        const a = rand(Math.PI * 2), r = Math.sqrt(Math.random()) * 5;
        w.effects.smoke.emit(vic.pos.x + Math.cos(a) * r, 12 + rand(-1, 1.5), vic.pos.z + Math.sin(a) * r,
          rand(-1, 1), rand(-0.3, 0.4), rand(-1, 1),
          { life: rand(1.6, 2.4), size: rand(4.5, 7.5), color: 0x10141d, alpha: 0.95, grow: 1.3 });
      }
    });
    const jolts = [0.7, -0.9, 1.8, -2.2, 0.3];
    for (let i = 0; i < 5; i++) {
      F.at(1.8 + i * 0.52, () => {
        const gx = vic.pos.x + rand(-0.5, 0.5), gz = vic.pos.z + rand(-0.5, 0.5);
        const top = new THREE.Vector3(gx + rand(-1, 1), 12, gz + rand(-1, 1));
        const ground = new THREE.Vector3(gx, 0.1, gz);
        w.effects.beams.spawn(top, ground, { radius: 0.24, dur: 0.16, color: 0xeaffff });
        w.effects.lightning.spawn(top, ground, { color: 0xcfefff, dur: 0.22, jag: 3 });
        w.effects.glows.emit(gx, 1, gz, 0, 0, 0, { life: 0.25, size: 6, color: 0xbfefff, alpha: 1 });
        F.beat('zap', 0.55, 0.06);
        F.vicFlinch();
      });
      F.vicBash(1.82 + i * 0.52, F.axis + jolts[i], 1.4, 0.9, 0.7);
    }
    F.trackCenter(1.8, 4.8, 4);
    F.camShot(1.3, 4.6, { dist: 10, h: 3.4, az0: 3.5, az1: 2.9, lookH: 4.5 });
    F.at(4.55, () => { F.vicDown(); F.finaleBurst(0x9fdcff); });
    F.triumph(5.15, 'burst', 'thunder');
  },

  // FENRIR: wolf pounce, quick maul, then jaws clamp and DRAG the wreck in
  // a full sweeping circle before flinging it away — the howl over the kill
  fenrir(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 0.8, 8);
    F.at(0.95, () => { win.animator.play('lunge', { speed: 1.2 }); w.audio?.play('howl'); });
    F.hold(0.95, 1.35, (k) => {
      win.pos.x = F.center.x - Math.sin(F.axis) * 8 * (1 - k);
      win.pos.z = F.center.z - Math.cos(F.axis) * 8 * (1 - k);
      win.pos.y = Math.sin(k * Math.PI) * 3.4;
    });
    F.at(1.35, () => { F.beat('slash', 0.8, 0.1); F.vicDown(); w.effects.dustPuff(vic.pos, 8); });
    F.at(1.5, () => win.animator.play('flurry', { speed: 1.7 }));
    for (let i = 0; i < 3; i++) {
      F.at(1.65 + i * 0.25, () => { F.sparks(11, 9, 0x6cd8ff); w.audio?.play('slash'); });
    }
    // jaws lock and he TEARS OFF, dragging the wreck in a wide circle
    F.hold(2.3, 3.9, (k, dt) => {
      const e = smooth(k);
      const ang = F.axis + e * 3.6;
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
      const dir = F.axis + 3.6 + 1.35;
      const e = 1 - (1 - k) * (1 - k);
      vic.pos.x = F.center.x + Math.sin(F.axis + 3.6) * 2.2 + Math.sin(dir) * 9 * e;
      vic.pos.z = F.center.z + Math.cos(F.axis + 3.6) * 2.2 + Math.cos(dir) * 9 * e;
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

  // WRAITH: kneels into the dark and lets the ghost off the chain — the
  // spectre rakes THROUGH the victim four times, back and forth, before
  // wraith re-forms and puts a single rail slug through the wreck
  wraith(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 0.75, 7);
    F.at(0.9, () => { win.animator.play('castRaise'); w.audio?.play('cloak'); });
    F.at(1.15, () => {
      const g = F.makeSpectre();
      g.visible = true;
      win.setOpacity(0.5); // the body dims while the soul hunts
    });
    // four raking passes: out through the victim, back through, again, again
    const pass = (t0, back) => {
      F.hold(t0, t0 + 0.7, (k) => {
        const sp = F._spectre;
        if (!sp) return;
        const e = smooth(k);
        const a = back ? 1 - e : e;
        sp.ghost.position.set(
          Math.sin(F.axis) * 11 * a,
          Math.sin(a * Math.PI) * 0.5,
          Math.cos(F.axis) * 11 * a);
        sp.gmat.opacity = 0.24 + 0.14 * Math.sin(k * 40);
      });
      F.at(t0 + (back ? 0.24 : 0.38), () => {
        F.beat('slash', 0.5, 0.06);
        F.sparks(14, 10, 0xcfe8ff);
        F.vicFlinch();
        w.audio?.play('cloak');
      });
    };
    pass(1.3, false);
    pass(2.15, true);
    pass(3.0, false);
    pass(3.85, true);
    // side-on profile shot so the back-and-forth reads clean
    F.camShot(0.9, 4.6, { dist: 10.5, h: 2.9, az0: 1.4, az1: 1.75, lookH: 2.5 });
    F.at(4.6, () => {
      F.dropSpectre();
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
    F.hold(1.2, 4.2, (k, dt) => {
      F.winCtx = { speed: 0, grounded: true, firing: true }; // torch level
      if (Math.random() < dt * 24) {
        const from = win.mech.anchors.muzzleR.getWorldPosition(new THREE.Vector3());
        const dir = new THREE.Vector3(Math.sin(win.yaw), 0.02, Math.cos(win.yaw));
        w.effects.flameCone(from, dir, 0xff7a20, 0.24, 34);
        w.effects.flameCone(from, dir, 0xffd23c, 0.11, 44);
        if (Math.random() < 0.3) w.audio?.play('flame');
      }
      if (Math.random() < dt * 8) {
        w.effects.glows.emit(vic.pos.x + rand(-1, 1), rand(0.5, vic.height), vic.pos.z + rand(-1, 1),
          0, 3.5, 0, { life: 0.5, size: rand(1.2, 2), color: 0xff7a20, alpha: 0.9 });
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
    F.camAction(1.2, 4.4, { dist: 12.5, h: 3.6, lookH: 2.5 });
    F.at(1.9, () => F.vicFlinch());
    F.at(2.5, () => F.vicFlinch());
    F.at(3.1, () => F.vicFlinch());
    F.at(3.6, () => F.vicDown());
    F.at(4.3, () => {
      F.finaleBurst(0xff6a20);
      w.addFirePatch(null, vic.pos.clone().setY(0), 3, 5, 8);
    });
    F.triumph(5.0, 'burst', 'flame');
  },

  // GLACIER: freezes them solid white, walks up, and SHATTERS the statue —
  // the frozen husk goes skittering and spinning across the ice
  glacier(F) {
    const { win, vic, w } = F;
    F.at(0.4, () => { win.animator.play('shootLoop'); w.audio?.play('freeze'); });
    F.hold(0.5, 2.2, (k, dt) => {
      const from = win.mech.anchors.muzzleR.getWorldPosition(new THREE.Vector3());
      w.effects.beams.spawn(from, vic.center(), { radius: 0.5, dur: 0.14, color: 0x9be8ff });
      if (Math.random() < dt * 12) w.effects.snowCone(from, _dirTo(win, vic));
      vic._beamWhiteT = 0.2; // stays white under the beam
      vic.applyWhiteout(Math.min(1, k * 2));
    });
    F.at(2.2, () => { w.freezeOverlay?.(vic, 2.4); w.audio?.play('freezeBig'); });
    F.approach(2.3, 3.3, 3.0);
    F.at(3.5, () => win.animator.play('heavy', { speed: 1.2 }));
    F.at(3.95, () => {
      F.beat('shatter', 1.1, 0.16);
      w.effects.impactSparks(vic.center(), 0xbfeaff, 34, 16);
      for (let i = 0; i < 14; i++) {
        w.effects.glows.emit(vic.pos.x + rand(-1, 1), rand(1, vic.height), vic.pos.z + rand(-1, 1),
          rand(-6, 6), rand(4, 10), rand(-6, 6),
          { life: rand(0.5, 0.9), size: rand(0.8, 1.6), color: 0xd8f4ff, alpha: 0.95, gravity: 18 });
      }
      F.vicDown();
      vic.applyWhiteout(1);
    });
    // the statue skids away spinning, shedding ice the whole slide
    F.vicBash(3.97, F.axis, 4.5, 0.8, 2.8);
    F.hold(4.0, 4.6, (k, dt) => {
      if (Math.random() < dt * 22) {
        w.effects.glows.emit(vic.pos.x + rand(-0.8, 0.8), rand(0.3, 1.5), vic.pos.z + rand(-0.8, 0.8),
          rand(-3, 3), rand(2, 6), rand(-3, 3),
          { life: rand(0.4, 0.7), size: rand(0.6, 1.2), color: 0xd8f4ff, alpha: 0.9, gravity: 16 });
      }
    });
    F.trackCenter(3.95, 5.2, 6);
    F.camShot(2.3, 4.6, { dist: 8, h: 3, az0: 2.4, az1: 2.9, lookH: 2.8 });
    F.hold(4.0, 6.0, (k) => vic.applyWhiteout(1 - k)); // thaw as they lie dead
    F.triumph(4.8, 'victory', 'freezeBig');
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
      w.effects.rings.spawn(vic.pos, { from: 0.6, to: 7, dur: 0.4, color: 0x4fc3ff, y: 0.3 });
      w.audio?.play('wave');
    });
    F.at(4.0, () => {
      const top = vic.pos.clone(); top.y += 30;
      w.effects.beams.spawn(vic.pos.clone(), top, { radius: 2.4, dur: 0.7, color: 0x8fdcff });
      for (let i = 0; i < 40; i++) {
        const a = rand(Math.PI * 2), r = rand(0, 2.5);
        w.effects.glows.emit(vic.pos.x + Math.cos(a) * r, rand(0.2, 2), vic.pos.z + Math.sin(a) * r,
          Math.cos(a) * rand(1, 3), rand(18, 32), Math.sin(a) * rand(1, 3),
          { life: rand(0.7, 1.2), size: rand(1.4, 2.8), color: i % 3 ? 0xaee8ff : 0xffffff, alpha: 0.95, gravity: 24, drag: 0.35 });
      }
      F.beat('explosionBig', 1, 0.1);
      vic.animator.play('launched');
    });
    F.hold(4.0, 5.3, (k) => {
      vic.pos.y = Math.sin(Math.min(1, k) * Math.PI) * 14;
      vic.group.rotation.x = -k * 5.5;
    });
    F.camShot(3.9, 5.3, { dist: 11, h: 4.5, az0: 3.0, az1: 2.7, lookH: 5.5 });
    F.at(5.3, () => {
      vic.group.rotation.x = 0;
      F.vicDown();
      w.effects.dustPuff(vic.pos, 12);
      F.beat('bodyfall', 0.9, 0.07);
    });
    F.triumph(5.55, 'taunt', 'wave');
  },

  // FROGGER: buries them under a gunk barrage, then the royal squash-hop —
  // and the wreck is left genuinely FLATTENED under the crater
  frogger(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 0.9, 7);
    F.at(1.0, () => { win.animator.play('spray', { speed: 1.4 }); });
    for (let i = 0; i < 5; i++) {
      F.at(1.2 + i * 0.3, () => {
        F.beat('plasma', 0.3, 0.03);
        F.sparks(9, 7, 0x9ade2a);
        w.effects.glows.emit(vic.pos.x + rand(-1, 1), rand(2, vic.height), vic.pos.z + rand(-1, 1),
          0, -2, 0, { life: 0.6, size: rand(1.4, 2.4), color: 0x9ade2a, alpha: 0.9 });
        F.vic.animator.addImpulse('torso', [rand(-0.25, 0.25), 0, rand(-0.25, 0.25)], 34, 12);
      });
    }
    F.at(2.9, () => F.vicDown());
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

  // JERRY: the nest empties — wave after wave of fleas latch onto the
  // victim until they vanish under a wriggling coral carpet, thrash, and
  // finally collapse as the swarm picks them clean
  jerry(F) {
    const { win, vic, w } = F;
    F.approach(0.2, 1.0, 6.5);
    F.at(1.1, () => { win.animator.play('shoot'); w.audio?.play('dart'); });
    // opening volley: a ring of thrown fleas arcing in from every side
    F.at(1.3, () => {
      for (let i = 0; i < 10; i++) {
        const a = (i / 10) * Math.PI * 2;
        w.fleas.spawn(win, vic.center(), new THREE.Vector3(Math.sin(a), 0.7, Math.cos(a)), { dmg: 0 });
      }
    });
    // THE PLAGUE: ~150 more latch straight on in ten waves, bottom to top,
    // until the whole silhouette is a squirming mass
    for (let wv = 0; wv < 10; wv++) {
      F.at(1.5 + wv * 0.26, () => {
        for (let i = 0; i < 15; i++) {
          w.fleas.spawn(win, vic.center(), new THREE.Vector3(0, 1, 0), {
            clingTo: vic, clingT: rand(2.4, 4.8),
          });
        }
        if (wv % 2 === 0) w.audio?.play('dart');
        vic.animator.addImpulse('torso', [rand(-0.3, 0.3), 0, rand(-0.3, 0.3)], 30, 10);
      });
    }
    // buried alive: thrashing under the mass
    for (let i = 0; i < 7; i++) {
      F.at(2.0 + i * 0.45, () => {
        F.sparks(8, 6, 0xff5030);
        if (i % 2 === 0) F.vicFlinch();
        if (Math.random() < 0.6) w.audio?.play('slash');
      });
    }
    F.camShot(1.3, 3.1, { dist: 8.5, h: 3, az0: 3.6, az1: 3.2, lookH: 2.4 });
    // push in CLOSE on the carpet doing its work
    F.camShot(3.1, 5.3, { dist: 5.5, h: 2.2, az0: 2.9, az1: 2.5, lookH: 2.0 });
    F.at(4.9, () => F.vicDown()); // finally goes down under them
    F.at(5.6, () => F.finaleBurst(0xc86a4a));
    F.triumph(5.7, 'taunt', 'dart');
  },
};

function _dirTo(a, b) {
  return new THREE.Vector3(b.pos.x - a.pos.x, 0, b.pos.z - a.pos.z).normalize();
}
