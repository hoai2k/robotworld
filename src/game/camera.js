// Battle camera. One human (or spectator): a single combined cinematic view.
// Two or more humans: ALWAYS split into per-player chase viewports — no
// mid-fight flipping between full and split. The 2-player split can be
// side-by-side or stacked, toggled at runtime (pause menu / F9).
import * as THREE from 'three';
import { clamp, lerp, damp, angleDamp } from '../core/utils.js';

const _v = new THREE.Vector3();
const _center = new THREE.Vector3();
const _ray = new THREE.Vector3();

const LAYOUT_KEY = 'rw.splitLayout';

// viewport rects are in engine coords: x/y from bottom-left, 0..1
const LAYOUTS = {
  lr: [{ x: 0, y: 0, w: 0.5, h: 1 }, { x: 0.5, y: 0, w: 0.5, h: 1 }],
  tb: [{ x: 0, y: 0.5, w: 1, h: 0.5 }, { x: 0, y: 0, w: 1, h: 0.5 }], // P1 top
  3: [{ x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.25, y: 0, w: 0.5, h: 0.5 }],
  4: [{ x: 0, y: 0.5, w: 0.5, h: 0.5 }, { x: 0.5, y: 0.5, w: 0.5, h: 0.5 }, { x: 0, y: 0, w: 0.5, h: 0.5 }, { x: 0.5, y: 0, w: 0.5, h: 0.5 }],
};

export class CameraSystem {
  constructor(engine, world) {
    this.engine = engine;
    this.world = world;
    this.mode = 'combined';
    this.azimuth = Math.PI;      // camera sits south of the action by default
    this.azInit = false;         // has the single-player behind-view locked on yet
    this.elevation = 0.42;
    this.shakeT = 0;

    // Manual look (touch drag): offsets layered on top of the auto framing,
    // held while the player drags, then eased back to the auto view.
    this.lookAzOffset = 0;
    this.lookElOffset = 0;
    this.lookCd = 0;             // seconds of "hold" left since the last drag

    // 2-player split orientation preference (persisted)
    this.layout2p = 'lr';
    try {
      const saved = localStorage.getItem(LAYOUT_KEY);
      if (saved === 'lr' || saved === 'tb') this.layout2p = saved;
    } catch (e) { /* storage unavailable — session default */ }

    // combined-cam smoothed state
    this.cPos = new THREE.Vector3(0, 24, 46);
    this.cTarget = new THREE.Vector3(0, 4, 0);
    this.dist = 46;

    // per-player chase cams
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
    this._dividerKind = null;
  }

  // 'single' | 'lr' | 'tb' | '3' | '4' for a given human count
  layoutKind(humanCount) {
    if (humanCount < 2) return 'single';
    if (humanCount === 2) return this.layout2p;
    return String(Math.min(humanCount, 4));
  }

  layoutRects(humanCount) {
    const kind = this.layoutKind(humanCount);
    return kind === 'single' ? null : LAYOUTS[kind];
  }

  // flip 2P split between side-by-side and stacked; returns the new kind
  toggleLayout2p() {
    this.layout2p = this.layout2p === 'lr' ? 'tb' : 'lr';
    try { localStorage.setItem(LAYOUT_KEY, this.layout2p); } catch (e) { /* ok */ }
    this._dividerKind = null; // force divider rebuild
    for (const ch of this.chase) ch.init = false; // snap cams to new framing
    this.world.audio?.play('uiMove');
    return this.layout2p;
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

    this.mode = humans.length >= 2 ? 'split' : 'combined';

    const shake = this.world.effects.shake;
    this.shakeT += dtReal * 30;
    const shakeX = shake > 0.01 ? Math.sin(this.shakeT * 1.3) * shake * 0.5 : 0;
    const shakeY = shake > 0.01 ? Math.cos(this.shakeT * 1.7) * shake * 0.35 : 0;

    if (this.mode === 'combined') {
      this.updateCombined(dtReal, framed, humans, shakeX, shakeY);
      this.engine.views = null;
      this.dividerEl.style.display = 'none';
      this._dividerKind = null;
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
    const kind = this.layoutKind(n);
    const layout = LAYOUTS[kind];
    const views = [];

    for (let i = 0; i < n; i++) {
      const f = humans[i];
      const ch = this.chase[i];
      const vp = layout[i];
      const cam = ch.camera;
      cam.aspect = (window.innerWidth * vp.w) / (window.innerHeight * vp.h);
      cam.updateProjectionMatrix();

      // chase from the shared azimuth (consistent controls), look past fighter
      // stacked viewports are short — pull back a touch so mechs fit
      const dist = vp.h < 0.75 && vp.w > 0.75 ? 25 : 22;
      const el = 0.38;
      _v.set(
        Math.sin(this.azimuth) * Math.cos(el), Math.sin(el), Math.cos(this.azimuth) * Math.cos(el)
      ).multiplyScalar(dist);
      const wantPos = _v.add(f.pos).add(new THREE.Vector3(0, 2, 0));
      const enemy = f.nearestEnemy();
      const lookAhead = enemy ? _center.copy(f.pos).lerp(enemy.pos, 0.22) : _center.copy(f.pos);
      lookAhead.y += 4.5;

      // split cams are permanent now — never leave one buried in a building:
      // ray from the player toward the lens, pull in front of the first wall
      if (this.world.arena) {
        _ray.copy(wantPos).sub(lookAhead);
        const rayLen = _ray.length();
        _ray.divideScalar(rayLen || 1);
        const hit = this.world.arena.raySolid(lookAhead, _ray, rayLen);
        if (hit) {
          const t = Math.max(6, hit.t - 1.6);
          wantPos.copy(lookAhead).addScaledVector(_ray, t);
        }
      }

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
    this.renderDividers(kind);
  }

  renderDividers(kind) {
    this.dividerEl.style.display = 'block';
    if (this._dividerKind === kind) return;
    this._dividerKind = kind;
    const vLine = (leftPct, topPct, hPct) =>
      `<div style="position:absolute;left:calc(${leftPct}% - 2px);top:${topPct}%;width:4px;height:${hPct}%;background:rgba(56,232,255,0.55);box-shadow:0 0 14px rgba(56,232,255,0.9);"></div>`;
    const hLine = (topPct) =>
      `<div style="position:absolute;left:0;top:calc(${topPct}% - 2px);width:100%;height:4px;background:rgba(56,232,255,0.55);box-shadow:0 0 14px rgba(56,232,255,0.9);"></div>`;
    let html = '';
    if (kind === 'lr') html = vLine(50, 0, 100);
    else if (kind === 'tb') html = hLine(50);
    else if (kind === '3') html = hLine(50) + vLine(50, 0, 50); // vertical split only in the top half
    else html = vLine(50, 0, 100) + hLine(50);
    this.dividerEl.innerHTML = html;
  }
}
