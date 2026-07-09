// Battle camera: LEGO-style — one combined cinematic view while fighters are
// close, splitting into per-player chase viewports when they separate.
// Hysteresis prevents flip-flopping; glowing DOM dividers mark the splits.
import * as THREE from 'three';
import { clamp, lerp, damp, angleDamp } from '../core/utils.js';

const _v = new THREE.Vector3();
const _center = new THREE.Vector3();

const SPLIT_AT = 58;      // max pair spread before splitting
const COMBINE_AT = 42;    // spread below which views merge again
const SWITCH_COOLDOWN = 1.4;

export class CameraSystem {
  constructor(engine, world) {
    this.engine = engine;
    this.world = world;
    this.mode = 'combined';
    this.switchCd = 0;
    this.azimuth = Math.PI;      // camera sits south of the action by default
    this.azInit = false;         // has the single-player behind-view locked on yet
    this.elevation = 0.42;
    this.shakeT = 0;

    // Manual look (touch drag): offsets layered on top of the auto framing,
    // held while the player drags, then eased back to the auto view.
    this.lookAzOffset = 0;
    this.lookElOffset = 0;
    this.lookCd = 0;             // seconds of "hold" left since the last drag

    // combined-cam smoothed state
    this.cPos = new THREE.Vector3(0, 24, 46);
    this.cTarget = new THREE.Vector3(0, 4, 0);
    this.dist = 46;

    // per-player chase cams (created lazily)
    this.chase = [];
    for (let i = 0; i < 4; i++) {
      this.chase.push({
        camera: new THREE.PerspectiveCamera(50, 1, 0.5, 2200),
        pos: new THREE.Vector3(),
        target: new THREE.Vector3(),
        init: false,
      });
    }

    // divider overlay
    this.dividerEl = document.createElement('div');
    this.dividerEl.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:6;display:none;';
    document.getElementById('ui-root').appendChild(this.dividerEl);
  }

  // Player dragged on the look region (touch). dx/dy are per-frame pixel
  // deltas; rotate the orbit and nudge the pitch, and hold the view briefly.
  applyLook(dx, dy) {
    this.lookAzOffset -= dx * 0.006;
    this.lookElOffset = clamp(this.lookElOffset - dy * 0.004, -0.22, 0.45);
    this.lookCd = 3.0;
    this.azInit = true; // ensure the auto base eases (never snaps) under us
  }

  // fighters framed by the camera; humans get viewports when split
  update(dtReal, fighters, humans) {
    const alive = fighters.filter((f) => f.alive);
    const framed = alive.length ? alive : fighters;
    if (!framed.length) return;

    this.switchCd -= dtReal;

    // spread = max pair distance
    let spread = 0;
    for (let i = 0; i < framed.length; i++) {
      for (let j = i + 1; j < framed.length; j++) {
        spread = Math.max(spread, framed[i].pos.distanceTo(framed[j].pos));
      }
    }

    const wantSplit = humans.length >= 2 && spread > SPLIT_AT;
    const wantCombine = spread < COMBINE_AT || humans.length < 2;
    if (this.switchCd <= 0) {
      if (this.mode === 'combined' && wantSplit) {
        this.mode = 'split';
        this.switchCd = SWITCH_COOLDOWN;
        this.world.audio?.play('uiMove');
      } else if (this.mode === 'split' && wantCombine) {
        this.mode = 'combined';
        this.switchCd = SWITCH_COOLDOWN;
        this.world.audio?.play('uiMove');
      }
    }

    const shake = this.world.effects.shake;
    this.shakeT += dtReal * 30;
    const shakeX = shake > 0.01 ? Math.sin(this.shakeT * 1.3) * shake * 0.5 : 0;
    const shakeY = shake > 0.01 ? Math.cos(this.shakeT * 1.7) * shake * 0.35 : 0;

    if (this.mode === 'combined') {
      this.updateCombined(dtReal, framed, humans, shakeX, shakeY);
      this.engine.views = null;
      this.dividerEl.style.display = 'none';
    } else {
      this.updateSplit(dtReal, humans, shakeX, shakeY);
    }
  }

  updateCombined(dt, framed, humans, shakeX, shakeY) {
    // centroid + radius needed to frame everyone
    _center.set(0, 0, 0);
    for (const f of framed) _center.add(f.pos);
    _center.divideScalar(framed.length);
    _center.y += 4;

    let radius = 10;
    for (const f of framed) {
      radius = Math.max(radius, f.pos.distanceTo(_center) + 6);
    }
    // Single human: bias framing toward them (Override-style) and swing the
    // camera BEHIND the player, looking toward the nearest enemy — a proper
    // third-person over-the-shoulder view instead of staring at the mech's
    // face. Gently damped so it trails the action rather than snapping.
    const solo = humans.length === 1 && humans[0].alive;
    if (solo) {
      const player = humans[0];
      // frame tight on the player rather than the true centroid
      _center.lerp(player.pos.clone().setY(_center.y), 0.5);
      const enemy = player.nearestEnemy();
      if (enemy) {
        // offset direction points from the enemy toward the player (behind them)
        const behindAz = Math.atan2(player.pos.x - enemy.pos.x, player.pos.z - enemy.pos.z);
        this.azimuth = this.azInit ? angleDamp(this.azimuth, behindAz, 1.8, dt) : behindAz;
        this.azInit = true;
      }
    }

    const fovHalf = (this.engine.camera.fov * Math.PI / 360);
    let wantDist = clamp(radius / Math.tan(fovHalf) * 1.15, 26, 95);
    // Solo: pull in close for an over-the-shoulder chase (the enemy stays
    // framed because the camera is directly behind the player, facing them).
    if (solo) wantDist = clamp(wantDist * 0.58, 22, 46);
    if (!this.init) this.dist = wantDist;
    this.dist = damp(this.dist, wantDist, 3, dt);

    // Manual look offsets hold while dragging, then ease back to the auto view.
    if (this.lookCd > 0) this.lookCd -= dt;
    else {
      this.lookAzOffset = damp(this.lookAzOffset, 0, 1.0, dt);
      this.lookElOffset = damp(this.lookElOffset, 0, 1.0, dt);
    }

    const az = this.azimuth + this.lookAzOffset;
    const el = clamp((solo ? 0.34 : this.elevation) + this.lookElOffset, 0.12, 0.82);
    _v.set(
      Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)
    ).multiplyScalar(this.dist);
    const wantPos = _v.add(_center);

    if (!this.init) {
      this.init = true;
      this.cPos.copy(wantPos);
      this.cTarget.copy(_center);
    }
    this.cPos.x = damp(this.cPos.x, wantPos.x, 4, dt);
    this.cPos.y = damp(this.cPos.y, wantPos.y, 4, dt);
    this.cPos.z = damp(this.cPos.z, wantPos.z, 4, dt);
    this.cTarget.x = damp(this.cTarget.x, _center.x, 5, dt);
    this.cTarget.y = damp(this.cTarget.y, _center.y, 5, dt);
    this.cTarget.z = damp(this.cTarget.z, _center.z, 5, dt);

    const cam = this.engine.camera;
    cam.position.set(this.cPos.x + shakeX, this.cPos.y + shakeY, this.cPos.z);
    cam.lookAt(this.cTarget.x + shakeX * 0.6, this.cTarget.y + shakeY * 0.6, this.cTarget.z);
  }

  // world-space azimuth used to make controls camera-relative
  inputYawFor(fighter, humanIdx) {
    if (this.mode === 'combined' || humanIdx < 0) {
      const dx = this.cTarget.x - this.cPos.x, dz = this.cTarget.z - this.cPos.z;
      return Math.atan2(dx, dz);
    }
    const ch = this.chase[humanIdx];
    const dx = ch.target.x - ch.pos.x, dz = ch.target.z - ch.pos.z;
    return Math.atan2(dx, dz);
  }

  updateSplit(dt, humans, shakeX, shakeY) {
    const n = Math.min(humans.length, 4);
    const layouts = {
      2: [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }],
      3: [{ x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.25, y: 0, w: 0.5, h: 0.5 }],
      4: [{ x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }, { x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }],
    };
    const layout = layouts[Math.max(2, n)];
    const views = [];

    for (let i = 0; i < n; i++) {
      const f = humans[i];
      const ch = this.chase[i];
      const vp = layout[i];
      const cam = ch.camera;
      cam.aspect = (window.innerWidth * vp.w) / (window.innerHeight * vp.h);
      cam.updateProjectionMatrix();

      // chase from the shared azimuth (consistent controls), look past fighter
      const dist = 22, el = 0.38;
      _v.set(
        Math.sin(this.azimuth) * Math.cos(el), Math.sin(el), Math.cos(this.azimuth) * Math.cos(el)
      ).multiplyScalar(dist);
      const wantPos = _v.add(f.pos).add(new THREE.Vector3(0, 2, 0));
      const enemy = f.nearestEnemy();
      const lookAhead = enemy ? _center.copy(f.pos).lerp(enemy.pos, 0.22) : _center.copy(f.pos);
      lookAhead.y += 4.5;

      if (!ch.init) { ch.pos.copy(wantPos); ch.target.copy(lookAhead); ch.init = true; }
      ch.pos.x = damp(ch.pos.x, wantPos.x, 5, dt);
      ch.pos.y = damp(ch.pos.y, wantPos.y, 5, dt);
      ch.pos.z = damp(ch.pos.z, wantPos.z, 5, dt);
      ch.target.x = damp(ch.target.x, lookAhead.x, 6, dt);
      ch.target.y = damp(ch.target.y, lookAhead.y, 6, dt);
      ch.target.z = damp(ch.target.z, lookAhead.z, 6, dt);

      cam.position.set(ch.pos.x + shakeX, ch.pos.y + shakeY, ch.pos.z);
      cam.lookAt(ch.target.x, ch.target.y, ch.target.z);
      views.push({ camera: cam, ...vp });
    }
    this.engine.views = views;

    // dividers
    this.dividerEl.style.display = 'block';
    let html = '';
    const line = (x, y, w, h) =>
      `<div style="position:absolute;left:${x}%;top:${y}%;width:${w};height:${h};background:linear-gradient(90deg,rgba(56,232,255,0.0),rgba(56,232,255,0.8),rgba(56,232,255,0.0));box-shadow:0 0 12px rgba(56,232,255,0.8);"></div>`;
    if (n === 2) {
      html = `<div style="position:absolute;left:calc(50% - 2px);top:0;width:4px;height:100%;background:rgba(56,232,255,0.55);box-shadow:0 0 14px rgba(56,232,255,0.9);"></div>`;
    } else {
      html = `<div style="position:absolute;left:calc(50% - 2px);top:0;width:4px;height:100%;background:rgba(56,232,255,0.55);box-shadow:0 0 14px rgba(56,232,255,0.9);"></div>` +
        `<div style="position:absolute;left:0;top:calc(50% - 2px);width:100%;height:4px;background:rgba(56,232,255,0.55);box-shadow:0 0 14px rgba(56,232,255,0.9);"></div>`;
    }
    this.dividerEl.innerHTML = html;
  }
}
