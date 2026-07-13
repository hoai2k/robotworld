// VFX: pooled GPU point-particles with texture ATLASES (flipbook fire,
// multi-cell smoke/goop), per-particle rotation/spin, fade-in curves and
// color ramps — plus shockwave rings, beams, thick lightning, lingering
// static, and an optional sprite-override intake (with chromakey) that
// falls back to the procedural textures when no sprites are installed.
import * as THREE from 'three';
import {
  softCircleTexture, sparkTexture, smokeCellsTexture, flameAtlasTexture,
  dropletTexture, goopCellsTexture, iceTexture, ringTexture,
} from '../core/textures.js';
import { rand, clamp01 } from '../core/utils.js';

// ---------- shader point particle pool ----------
const VERT = /* glsl */`
  attribute float aSize;
  attribute vec4 aColor;   // rgb + alpha
  attribute vec2 aMisc;    // rotation angle, atlas cell index
  varying vec4 vColor;
  varying vec2 vMisc;
  void main() {
    vColor = aColor;
    vMisc = aMisc;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (240.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAG = /* glsl */`
  uniform sampler2D uTex;
  uniform vec2 uGrid;      // atlas columns, rows
  varying vec4 vColor;
  varying vec2 vMisc;
  void main() {
    vec2 pc = gl_PointCoord - 0.5;
    float cA = cos(vMisc.x), sA = sin(vMisc.x);
    pc = vec2(pc.x * cA - pc.y * sA, pc.x * sA + pc.y * cA);
    pc = clamp(pc + 0.5, 0.004, 0.996);
    vec2 cellXY = vec2(mod(vMisc.y, uGrid.x), floor(vMisc.y / uGrid.x));
    vec4 t = texture2D(uTex, (cellXY + pc) / uGrid);
    gl_FragColor = vec4(vColor.rgb * t.rgb, vColor.a * t.a);
    if (gl_FragColor.a < 0.01) discard;
  }
`;

class ParticlePool {
  constructor(scene, texture, { cap = 600, blending = THREE.AdditiveBlending, depthWrite = false, cols = 1, rows = 1 } = {}) {
    this.cap = cap;
    this.cols = cols;
    this.rows = rows;
    this.pos = new Float32Array(cap * 3);
    this.col = new Float32Array(cap * 4);
    this.size = new Float32Array(cap);
    this.misc = new Float32Array(cap * 2); // angle, cell
    // particle sim state
    this.vel = new Float32Array(cap * 3);
    this.life = new Float32Array(cap);     // remaining
    this.life0 = new Float32Array(cap);    // initial
    this.grav = new Float32Array(cap);
    this.drag = new Float32Array(cap);
    this.baseCol = new Float32Array(cap * 3);
    this.endCol = new Float32Array(cap * 3); // color2: reached as life fades
    this.baseAlpha = new Float32Array(cap);
    this.baseSize = new Float32Array(cap);
    this.grow = new Float32Array(cap);
    this.rot0 = new Float32Array(cap);
    this.spin = new Float32Array(cap);
    this.cell = new Float32Array(cap);     // base cell; -1 = flipbook anim
    this.fadeT = new Float32Array(cap);    // seconds of alpha ramp-in
    this.head = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.setAttribute('aMisc', new THREE.BufferAttribute(this.misc, 2));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6); // skip culling

    const mat = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: texture },
        uGrid: { value: new THREE.Vector2(cols, rows) },
      },
      vertexShader: VERT,
      fragmentShader: FRAG,
      transparent: true,
      depthWrite,
      blending,
    });
    this.points = new THREE.Points(geo, mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
    scene.add(this.points);
  }

  // sprite-override intake: swap the texture (and atlas layout) in place
  setTexture(tex, cols = this.cols, rows = this.rows) {
    this.cols = cols;
    this.rows = rows;
    this.points.material.uniforms.uTex.value = tex;
    this.points.material.uniforms.uGrid.value.set(cols, rows);
  }

  emit(x, y, z, vx, vy, vz, {
    life = 1, size = 1, color = 0xffffff, color2 = null, alpha = 1,
    gravity = 0, drag = 0, grow = 0,
    cell = -2,        // -2 random cell, -1 flipbook anim over life, else fixed
    spin = 0,         // radians/sec (sign randomized here when nonzero)
    rot = null,       // start angle; default random
    fadeIn = 0.1,     // fraction of life spent ramping alpha IN (no popping)
  } = {}) {
    const i = this.head;
    this.head = (this.head + 1) % this.cap;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this.life[i] = this.life0[i] = life;
    this.grav[i] = gravity;
    this.drag[i] = drag;
    this.grow[i] = grow;
    const c = new THREE.Color(color);
    this.baseCol[i * 3] = c.r; this.baseCol[i * 3 + 1] = c.g; this.baseCol[i * 3 + 2] = c.b;
    const c2 = color2 === null ? c : new THREE.Color(color2);
    this.endCol[i * 3] = c2.r; this.endCol[i * 3 + 1] = c2.g; this.endCol[i * 3 + 2] = c2.b;
    this.baseAlpha[i] = alpha;
    this.baseSize[i] = size;
    this.rot0[i] = rot === null ? rand(Math.PI * 2) : rot;
    this.spin[i] = spin ? spin * (Math.random() < 0.5 ? -1 : 1) : 0;
    const frames = this.cols * this.rows;
    this.cell[i] = cell === -2 ? (Math.random() * frames) | 0 : cell;
    this.fadeT[i] = Math.max(0.001, fadeIn * life);
  }

  update(dt) {
    const { cap, pos, vel, life, life0, grav, drag, col, size, misc,
      baseCol, endCol, baseAlpha, baseSize, grow, rot0, spin, cell, fadeT } = this;
    const frames = this.cols * this.rows;
    for (let i = 0; i < cap; i++) {
      if (life[i] <= 0) { col[i * 4 + 3] = 0; size[i] = 0; continue; }
      life[i] -= dt;
      const f = clamp01(life[i] / life0[i]);
      const age = life0[i] - life[i];
      vel[i * 3 + 1] -= grav[i] * dt;
      if (drag[i]) {
        const d = Math.max(0, 1 - drag[i] * dt);
        vel[i * 3] *= d; vel[i * 3 + 1] *= d; vel[i * 3 + 2] *= d;
      }
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      const m = 1 - f; // 0 fresh -> 1 dying: ramp base color toward end color
      col[i * 4] = baseCol[i * 3] + (endCol[i * 3] - baseCol[i * 3]) * m;
      col[i * 4 + 1] = baseCol[i * 3 + 1] + (endCol[i * 3 + 1] - baseCol[i * 3 + 1]) * m;
      col[i * 4 + 2] = baseCol[i * 3 + 2] + (endCol[i * 3 + 2] - baseCol[i * 3 + 2]) * m;
      col[i * 4 + 3] = baseAlpha[i] * f * Math.min(1, age / fadeT[i]);
      size[i] = baseSize[i] * (1 + grow[i] * m);
      misc[i * 2] = rot0[i] + spin[i] * age;
      misc[i * 2 + 1] = cell[i] < 0
        ? Math.min(frames - 1, (m * frames) | 0)  // flipbook rides the lifetime
        : cell[i];
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aColor.needsUpdate = true;
    this.points.geometry.attributes.aSize.needsUpdate = true;
    this.points.geometry.attributes.aMisc.needsUpdate = true;
  }
}

// ---------- sprite-override intake (chromakey capable) ----------
// public/sprites/manifest.json maps slots to files:
//   { "fire":    { "file": "fire_atlas.png",  "cols": 4, "rows": 4, "key": "luma" },
//     "smoke":   { "file": "smoke_atlas.png", "cols": 2, "rows": 2, "key": "#00ff00" },
//     "droplet": { "file": "droplet.png",     "key": "#00ff00" },
//     "goop":    { "file": "slime_atlas.png", "cols": 2, "rows": 2, "key": "#ff00ff" },
//     "ice":     { "file": "ice.png",         "key": "luma" } }
// key: "luma" (alpha from brightness — for additive sprites on black),
//      "#rrggbb" (chromakey that color with despill), or omit for real alpha.
async function loadKeyedTexture(url, cfg = {}) {
  const img = await new Promise((res, rej) => {
    const im = new Image();
    im.onload = () => res(im);
    im.onerror = rej;
    im.src = url;
  });
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const key = cfg.key || null;
  if (key) {
    const d = ctx.getImageData(0, 0, cv.width, cv.height);
    const p = d.data;
    if (key === 'luma') {
      for (let i = 0; i < p.length; i += 4) {
        p[i + 3] = Math.max(p[i], p[i + 1], p[i + 2]);
      }
    } else {
      const kr = parseInt(key.slice(1, 3), 16);
      const kg = parseInt(key.slice(3, 5), 16);
      const kb = parseInt(key.slice(5, 7), 16);
      const tol = (cfg.tolerance ?? 0.24) * 441;
      const soft = (cfg.softness ?? 0.22) * 441;
      for (let i = 0; i < p.length; i += 4) {
        const dr = p[i] - kr, dg = p[i + 1] - kg, db = p[i + 2] - kb;
        const dist = Math.sqrt(dr * dr + dg * dg + db * db);
        const a = clamp01((dist - tol) / soft);
        p[i + 3] = Math.min(p[i + 3], Math.round(a * 255));
        if (a < 1) { // despill: kill key-color fringing on soft edges
          if (kg >= kr && kg >= kb) p[i + 1] = Math.min(p[i + 1], Math.max(p[i], p[i + 2]));
          else if (kr >= kg && kr >= kb) p[i] = Math.min(p[i], Math.max(p[i + 1], p[i + 2]));
          else p[i + 2] = Math.min(p[i + 2], Math.max(p[i], p[i + 1]));
        }
      }
    }
    ctx.putImageData(d, 0, 0);
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.flipY = false;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// ---------- expanding ring / beam / lightning pools ----------

class RingPool {
  constructor(scene, count = 12) {
    this.items = [];
    const tex = ringTexture();
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(1, 1),
        new THREE.MeshBasicMaterial({
          map: tex, transparent: true, depthWrite: false,
          blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
        })
      );
      mesh.rotation.x = -Math.PI / 2;
      mesh.visible = false;
      mesh.renderOrder = 6;
      scene.add(mesh);
      this.items.push({ mesh, t: 0, dur: 0, from: 1, to: 10, color: 0xffffff });
    }
  }
  spawn(pos, { from = 1, to = 14, dur = 0.5, color = 0xffffff, y = 0.3, vertical = null } = {}) {
    const it = this.items.find((i) => !i.mesh.visible) || this.items[0];
    it.mesh.visible = true;
    it.mesh.position.copy(pos);
    it.mesh.position.y = pos.y + y;
    if (vertical) {
      it.mesh.rotation.set(0, Math.atan2(vertical.x, vertical.z), 0);
    } else {
      it.mesh.rotation.set(-Math.PI / 2, 0, 0);
    }
    it.mesh.material.color.set(color);
    it.t = 0; it.dur = dur; it.from = from; it.to = to;
  }
  update(dt) {
    for (const it of this.items) {
      if (!it.mesh.visible) continue;
      it.t += dt;
      const f = it.t / it.dur;
      if (f >= 1) { it.mesh.visible = false; continue; }
      const s = it.from + (it.to - it.from) * (1 - Math.pow(1 - f, 2.2));
      it.mesh.scale.set(s, s, s);
      it.mesh.material.opacity = 1 - f;
    }
  }
}

class BeamPool {
  constructor(scene, count = 10) {
    this.items = [];
    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(1, 1, 1, 8, 1, true),
        new THREE.MeshBasicMaterial({
          transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
        })
      );
      mesh.visible = false;
      mesh.renderOrder = 6;
      scene.add(mesh);
      this.items.push({ mesh, t: 0, dur: 0, r: 1 });
    }
  }
  // beam between two points; radius shrinks & fades over dur
  spawn(from, to, { radius = 0.4, dur = 0.25, color = 0xffffff } = {}) {
    const it = this.items.find((i) => !i.mesh.visible) || this.items[0];
    const mesh = it.mesh;
    mesh.visible = true;
    const dir = new THREE.Vector3().subVectors(to, from);
    const len = dir.length();
    mesh.position.copy(from).addScaledVector(dir, 0.5);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
    mesh.scale.set(radius, len, radius);
    mesh.material.color.set(color);
    it.t = 0; it.dur = dur; it.r = radius;
  }
  update(dt) {
    for (const it of this.items) {
      if (!it.mesh.visible) continue;
      it.t += dt;
      const f = it.t / it.dur;
      if (f >= 1) { it.mesh.visible = false; continue; }
      it.mesh.material.opacity = 1 - f;
      it.mesh.scale.x = it.mesh.scale.z = it.r * (1 - f * 0.7);
    }
  }
}

// REAL bolts, not static: each bolt is a chain of glowing cylinder segments
// through jagged waypoints (thick, visible from any distance) with a hot
// white core, plus an optional thinner side-branch forking off a kink.
const SEGS = 7;
const _lv = new THREE.Vector3();
const _lup = new THREE.Vector3(0, 1, 0);
class LightningPool {
  constructor(scene, count = 14) {
    this.items = [];
    const geo = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
    for (let i = 0; i < count; i++) {
      const group = new THREE.Group();
      const mat = new THREE.MeshBasicMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const core = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      });
      const segs = [];
      for (let s = 0; s < SEGS; s++) {
        const outer = new THREE.Mesh(geo, mat);
        const inner = new THREE.Mesh(geo, core);
        outer.renderOrder = 7;
        inner.renderOrder = 8;
        group.add(outer);
        group.add(inner);
        segs.push({ outer, inner });
      }
      group.visible = false;
      scene.add(group);
      this.items.push({ group, mat, core, segs, t: 0, dur: 0 });
    }
  }
  spawn(from, to, { color = 0x9fdcff, dur = 0.22, jag = 1.2, thick = 0.16, branch = true } = {}) {
    const it = this.items.find((i) => !i.group.visible) || this.items[0];
    it.group.visible = true;
    it.mat.color.set(color);
    it.t = 0; it.dur = dur;
    // jagged waypoints, offset mostly perpendicular to the strike line
    const dir = _lv.subVectors(to, from);
    const pts = [];
    for (let i = 0; i <= SEGS; i++) {
      const f = i / SEGS;
      const p = new THREE.Vector3().copy(from).addScaledVector(dir, f);
      if (i > 0 && i < SEGS) {
        p.x += rand(-jag, jag);
        p.y += rand(-jag * 0.5, jag * 0.5);
        p.z += rand(-jag, jag);
      }
      pts.push(p);
    }
    for (let s = 0; s < SEGS; s++) {
      const a = pts[s], b = pts[s + 1];
      const seg = it.segs[s];
      const d = new THREE.Vector3().subVectors(b, a);
      const len = d.length() || 0.001;
      for (const [mesh, r] of [[seg.outer, thick], [seg.inner, thick * 0.38]]) {
        mesh.position.copy(a).addScaledVector(d, 0.5);
        mesh.quaternion.setFromUnitVectors(_lup, d.clone().normalize());
        mesh.scale.set(r, len, r);
      }
    }
    // one thinner fork off a random kink sells the "real lightning" read
    if (branch && jag > 0.5) {
      const k = pts[1 + ((Math.random() * (SEGS - 2)) | 0)];
      const end = k.clone().add(new THREE.Vector3(rand(-jag, jag) * 2.2, -Math.abs(rand(jag, jag * 2.5)), rand(-jag, jag) * 2.2));
      this.spawn(k, end, { color: it.mat.color.getHex(), dur: dur * 0.8, jag: jag * 0.45, thick: thick * 0.55, branch: false });
    }
    return it;
  }
  update(dt) {
    for (const it of this.items) {
      if (!it.group.visible) continue;
      it.t += dt;
      if (it.t >= it.dur) { it.group.visible = false; continue; }
      const o = 1 - it.t / it.dur;
      it.mat.opacity = o * 0.85;
      it.core.opacity = o;
    }
  }
}

// ---------- main FX facade ----------

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.sparks = new ParticlePool(scene, sparkTexture(), { cap: 900 });
    this.glows = new ParticlePool(scene, softCircleTexture(), { cap: 500 });
    this.smoke = new ParticlePool(scene, smokeCellsTexture(), {
      cap: 450, blending: THREE.NormalBlending, cols: 2, rows: 2,
    });
    // liquids: normally-blended so water/slime read as MATTER, with baked
    // specular shine (additive glows always read as light)
    this.drops = new ParticlePool(scene, dropletTexture(), {
      cap: 700, blending: THREE.NormalBlending,
    });
    this.goop = new ParticlePool(scene, goopCellsTexture(), {
      cap: 300, blending: THREE.NormalBlending, cols: 2, rows: 2,
    });
    // fire: 16-frame looping turbulence flipbook — flames LICK, not fade
    this.flames = new ParticlePool(scene, flameAtlasTexture(), {
      cap: 400, cols: 4, rows: 4,
    });
    this.ice = new ParticlePool(scene, iceTexture(), { cap: 200 });
    this.rings = new RingPool(scene);
    this.beams = new BeamPool(scene);
    this.lightning = new LightningPool(scene);
    this.statics = []; // {f, t, tick} — crackle lingering on shocked bots
    this.shake = 0;         // camera shake accumulator (read by camera)
    this.flash = null;      // {color, t} full-screen flash (read by hud)
    this._loadSpriteOverrides();
  }

  // optional hand-made sprites drop in via public/sprites/manifest.json;
  // absent or broken -> the procedural textures above simply stay
  async _loadSpriteOverrides() {
    try {
      const res = await fetch('/sprites/manifest.json');
      if (!res.ok) return;
      const man = await res.json();
      const slots = {
        fire: this.flames, smoke: this.smoke, droplet: this.drops,
        goop: this.goop, ice: this.ice, spark: this.sparks, glow: this.glows,
      };
      for (const [slot, cfg] of Object.entries(man)) {
        const pool = slots[slot];
        if (!pool || !cfg?.file) continue;
        try {
          const tex = await loadKeyedTexture('/sprites/' + cfg.file, cfg);
          pool.setTexture(tex, cfg.cols || 1, cfg.rows || 1);
        } catch { /* this sprite failed: keep procedural for the slot */ }
      }
    } catch { /* no manifest: fully procedural */ }
  }

  addShake(amount) { this.shake = Math.min(2.2, this.shake + amount); }

  // ---- composite effects ----
  impactSparks(pos, color = 0xffcf7a, n = 14, power = 10) {
    for (let i = 0; i < n; i++) {
      const a = rand(Math.PI * 2), b = rand(-0.6, 1.2);
      const sp = rand(0.3, 1) * power;
      this.sparks.emit(pos.x, pos.y, pos.z,
        Math.cos(a) * sp, b * sp * 0.7, Math.sin(a) * sp,
        { life: rand(0.2, 0.5), size: rand(0.5, 1.1), color, gravity: 22, drag: 1.5, fadeIn: 0.02 });
    }
  }

  blockSpark(pos, color = 0x6cc8ff) {
    this.impactSparks(pos, color, 10, 7);
    this.rings.spawn(pos, { from: 0.5, to: 4, dur: 0.3, color, y: pos.y, vertical: null });
  }

  muzzleFlash(pos, color = 0xffd27a) {
    this.glows.emit(pos.x, pos.y, pos.z, 0, 0, 0,
      { life: 0.08, size: rand(2.2, 3.2), color, alpha: 0.9, fadeIn: 0.02 });
  }

  explosion(pos, radius = 5, { color = 0xffa040, smoke = true, sparks = true, ring = true, flash = true } = {}) {
    if (flash) {
      this.glows.emit(pos.x, pos.y + 0.5, pos.z, 0, 0, 0,
        { life: 0.14, size: radius * 2.2, color: 0xfff2d0, alpha: 1, fadeIn: 0.02 });
      // rolling FIREBALL: licking flipbook cells shouldering out of the flash
      for (let i = 0; i < Math.min(6, 2 + radius); i++) {
        const a = rand(Math.PI * 2), r = rand(0.2, radius * 0.35);
        this.flames.emit(pos.x + Math.cos(a) * r, pos.y + rand(0.3, 1.2), pos.z + Math.sin(a) * r,
          Math.cos(a) * rand(2, 5), rand(2.5, 6), Math.sin(a) * rand(2, 5),
          { life: rand(0.35, 0.6), size: radius * rand(0.55, 0.9), color: 0xffd9a0, color2: 0x8a1f06,
            alpha: 0.95, cell: -1, spin: 1.4, grow: 2, drag: 1.8, gravity: -4, fadeIn: 0.05 });
      }
    }
    if (sparks) {
      const n = Math.min(40, 10 + radius * 4);
      for (let i = 0; i < n; i++) {
        const a = rand(Math.PI * 2), e = rand(0.1, 1.3);
        const sp = rand(0.4, 1) * radius * 3.2;
        this.sparks.emit(pos.x, pos.y + 0.5, pos.z,
          Math.cos(a) * sp * Math.cos(e), Math.sin(e) * sp, Math.sin(a) * sp * Math.cos(e),
          { life: rand(0.3, 0.8), size: rand(0.6, 1.4), color: 0xffc060, gravity: 26, drag: 1.2, fadeIn: 0.02 });
      }
    }
    if (smoke) {
      const n = Math.min(22, 6 + radius * 2.5);
      for (let i = 0; i < n; i++) {
        const a = rand(Math.PI * 2), r = rand(0.2, radius * 0.5);
        this.smoke.emit(pos.x + Math.cos(a) * r, pos.y + rand(0.2, 1.5), pos.z + Math.sin(a) * r,
          Math.cos(a) * rand(1, 4), rand(2, 6), Math.sin(a) * rand(1, 4),
          { life: rand(0.8, 1.8), size: rand(2.5, 4.5), color: 0x35302e, color2: 0x181819,
            alpha: 0.6, drag: 1.4, grow: 2.2, spin: 0.7, fadeIn: 0.2 });
      }
    }
    if (ring) this.rings.spawn(pos, { from: radius * 0.25, to: radius * 2.1, dur: 0.45, color: 0xffd9a0 });
  }

  dustPuff(pos, n = 8, color = 0x8a8378) {
    for (let i = 0; i < n; i++) {
      const a = rand(Math.PI * 2);
      this.smoke.emit(pos.x + Math.cos(a) * rand(0.5), pos.y + 0.3, pos.z + Math.sin(a) * rand(0.5),
        Math.cos(a) * rand(1.5, 4), rand(0.5, 2), Math.sin(a) * rand(1.5, 4),
        { life: rand(0.5, 1.1), size: rand(1.6, 3), color, alpha: 0.45, drag: 2, grow: 1.6, spin: 0.9, fadeIn: 0.15 });
    }
  }

  jetTrail(pos, vel, color) {
    this.glows.emit(pos.x, pos.y, pos.z, -vel.x * 0.1, -vel.y * 0.1, -vel.z * 0.1,
      { life: 0.25, size: rand(0.8, 1.4), color, alpha: 0.8, drag: 2, fadeIn: 0.05 });
  }

  dashTrail(pos, color, scale = 1) {
    this.glows.emit(pos.x + rand(-0.5, 0.5), pos.y + rand(0.5, 3) * scale, pos.z + rand(-0.5, 0.5),
      0, 0, 0, { life: 0.3, size: rand(1.5, 2.6) * scale, color, alpha: 0.5, fadeIn: 0.05 });
  }

  // one tick of REAL flame: flipbook tongues that LICK through their loop
  // as they cool white->orange->deep red, embers, and smoke off the tip
  fire(origin, dir, speed = 26, spread = 0.3) {
    // core: hot, brief, fast frames
    const c = dir.clone();
    c.x += rand(-spread * 0.5, spread * 0.5);
    c.y += rand(-spread * 0.3, spread * 0.3);
    c.z += rand(-spread * 0.5, spread * 0.5);
    c.normalize().multiplyScalar(speed * rand(0.85, 1.05));
    this.flames.emit(origin.x, origin.y, origin.z, c.x, c.y, c.z,
      { life: rand(0.22, 0.34), size: rand(1.4, 2.1), color: 0xffefc0, color2: 0xff7a14,
        alpha: 0.95, cell: -1, spin: 1.2, drag: 2, grow: 2, gravity: -5, fadeIn: 0.08 });
    // body: bigger licking tongues, buoyant, swelling as they cool
    for (let i = 0; i < 2; i++) {
      const d = dir.clone();
      d.x += rand(-spread, spread); d.y += rand(-spread * 0.6, spread * 0.6); d.z += rand(-spread, spread);
      d.normalize().multiplyScalar(speed * rand(0.55, 0.95));
      this.flames.emit(origin.x, origin.y, origin.z, d.x, d.y, d.z,
        { life: rand(0.38, 0.68), size: rand(1.9, 3.1), color: 0xffab3c, color2: 0x6e1804,
          alpha: 0.88, cell: -1, spin: 1.6, drag: 2.4, grow: 3.2, gravity: -7, fadeIn: 0.1 });
    }
    // embers: tiny hot flecks tumbling out of the stream
    if (Math.random() < 0.35) {
      this.sparks.emit(origin.x, origin.y, origin.z,
        dir.x * speed * 0.7 + rand(-3, 3), dir.y * speed * 0.7 + rand(0, 4), dir.z * speed * 0.7 + rand(-3, 3),
        { life: rand(0.4, 0.8), size: rand(0.3, 0.6), color: 0xffb060, color2: 0xff4010, gravity: 9, drag: 1, fadeIn: 0.02 });
    }
    // smoke shears off past the flame tip and climbs, tumbling
    if (Math.random() < 0.7) {
      const reach = rand(3, 5);
      this.smoke.emit(origin.x + dir.x * reach, origin.y + dir.y * reach + rand(0.3, 1), origin.z + dir.z * reach,
        dir.x * 7 + rand(-1, 1), 3.5 + rand(0, 2.5), dir.z * 7 + rand(-1, 1),
        { life: rand(0.9, 1.6), size: rand(1.8, 3), color: 0x232120, color2: 0x121213,
          alpha: 0.55, drag: 1.6, grow: 3, spin: 0.8, fadeIn: 0.3 });
    }
  }

  flameCone(origin, dir, color = 0xff7a20, spread = 0.3, speed = 26) {
    this.fire(origin, dir, speed, spread);
  }

  snowCone(origin, dir, speed = 30) {
    // crystalline sparkles riding the beam + frosty vapor
    for (let i = 0; i < 2; i++) {
      const d = dir.clone();
      d.x += rand(-0.18, 0.18); d.y += rand(-0.12, 0.12); d.z += rand(-0.18, 0.18);
      d.normalize().multiplyScalar(speed * rand(0.7, 1));
      this.ice.emit(origin.x, origin.y, origin.z, d.x, d.y, d.z,
        { life: rand(0.25, 0.5), size: rand(0.8, 1.5), color: 0xcfeeff, alpha: 0.9,
          spin: 3, drag: 1.8, fadeIn: 0.05 });
    }
    if (Math.random() < 0.5) {
      this.smoke.emit(origin.x + dir.x * 2, origin.y + dir.y * 2, origin.z + dir.z * 2,
        dir.x * speed * 0.5, dir.y * speed * 0.5, dir.z * speed * 0.5,
        { life: rand(0.3, 0.55), size: rand(1.2, 2), color: 0xdff2ff, alpha: 0.22,
          drag: 2.2, grow: 2.2, spin: 1, fadeIn: 0.2 });
    }
  }

  firePatch(pos, radius = 2.2) {
    // one tick of ground-fire visuals; caller re-invokes while patch lives
    for (let i = 0; i < 2; i++) {
      const a = rand(Math.PI * 2), r = rand(0, radius);
      this.flames.emit(pos.x + Math.cos(a) * r, pos.y + 0.15, pos.z + Math.sin(a) * r,
        rand(-0.5, 0.5), rand(2.5, 5), rand(-0.5, 0.5),
        { life: rand(0.35, 0.6), size: rand(1.1, 2), color: 0xffd070, color2: 0x8a2408,
          alpha: 0.9, cell: -1, spin: 1, drag: 1, grow: 2, fadeIn: 0.1 });
    }
    if (Math.random() < 0.4) {
      const a = rand(Math.PI * 2), r = rand(0, radius * 0.8);
      this.smoke.emit(pos.x + Math.cos(a) * r, pos.y + 1.2, pos.z + Math.sin(a) * r,
        rand(-0.6, 0.6), rand(2.5, 4.5), rand(-0.6, 0.6),
        { life: rand(0.9, 1.6), size: rand(1.4, 2.4), color: 0x1d1c1b, alpha: 0.42,
          drag: 1.2, grow: 2.6, spin: 0.7, fadeIn: 0.3 });
    }
    if (Math.random() < 0.25) {
      this.sparks.emit(pos.x + rand(-radius, radius), pos.y + 0.4, pos.z + rand(-radius, radius),
        rand(-2, 2), rand(4, 8), rand(-2, 2),
        { life: rand(0.4, 0.8), size: rand(0.3, 0.5), color: 0xffb060, color2: 0xff4010, gravity: 10, drag: 0.8, fadeIn: 0.02 });
    }
  }

  // one tick of pressurized WATER: glinting beads riding the jet with foam
  // sparkle and fine mist
  waterJet(origin, dir, speed = 38) {
    for (let i = 0; i < 6; i++) {
      const s = speed * rand(0.85, 1.15);
      this.drops.emit(origin.x, origin.y, origin.z,
        (dir.x + rand(-0.06, 0.06)) * s, (dir.y + rand(-0.04, 0.06)) * s + 1.5, (dir.z + rand(-0.06, 0.06)) * s,
        { life: rand(0.45, 0.7), size: rand(0.45, 1.05), color: 0xffffff, color2: 0x9cc4ec,
          alpha: 0.95, gravity: 26, drag: 0.25, spin: 2, fadeIn: 0.04 });
    }
    // foam: bright flecks give the stream its wet sparkle
    this.glows.emit(origin.x + dir.x * rand(1, 3), origin.y + dir.y * rand(1, 3), origin.z + dir.z * rand(1, 3),
      dir.x * speed * 0.8, dir.y * speed * 0.8 + 1, dir.z * speed * 0.8,
      { life: rand(0.2, 0.35), size: rand(0.3, 0.6), color: 0xffffff, alpha: 0.5, gravity: 20, fadeIn: 0.02 });
    if (Math.random() < 0.35) {
      this.smoke.emit(origin.x + dir.x * 4, origin.y + dir.y * 4 + rand(0.5), origin.z + dir.z * 4,
        dir.x * 9, 1.5 + rand(1.5), dir.z * 9,
        { life: rand(0.4, 0.7), size: rand(1.2, 2), color: 0xe4f2fc, alpha: 0.15,
          drag: 1.2, grow: 2.2, spin: 1, fadeIn: 0.25 });
    }
  }

  // water burst: crown of glinting droplets + foam + a breath of mist
  splash(pos, n = 10, power = 8, up = 1) {
    for (let i = 0; i < n; i++) {
      const a = rand(Math.PI * 2), sp = rand(0.4, 1) * power;
      this.drops.emit(pos.x, pos.y, pos.z,
        Math.cos(a) * sp, rand(0.6, 1.4) * power * up, Math.sin(a) * sp,
        { life: rand(0.4, 0.8), size: rand(0.45, 1.05), color: 0xffffff, color2: 0x9cc4ec,
          alpha: 0.95, gravity: 28, drag: 0.3, spin: 2.5, fadeIn: 0.04 });
    }
    for (let i = 0; i < Math.ceil(n / 3); i++) {
      const a = rand(Math.PI * 2);
      this.glows.emit(pos.x, pos.y + 0.2, pos.z,
        Math.cos(a) * power * 0.5, rand(0.8, 1.3) * power * up, Math.sin(a) * power * 0.5,
        { life: rand(0.2, 0.4), size: rand(0.3, 0.6), color: 0xffffff, alpha: 0.5, gravity: 26, fadeIn: 0.02 });
    }
    this.smoke.emit(pos.x, pos.y + 0.4, pos.z, 0, power * 0.35, 0,
      { life: rand(0.4, 0.7), size: rand(1.4, 2.2), color: 0xe4f2fc, alpha: 0.14,
        drag: 1.5, grow: 2.4, spin: 1, fadeIn: 0.25 });
  }

  // thick green GOOP: lumpy glossy globs tumbling slow and heavy, stringy
  // drips, and a splat ring when it lands hard
  slime(pos, n = 8, power = 6, dir = null) {
    for (let i = 0; i < n; i++) {
      const a = rand(Math.PI * 2), sp = rand(0.3, 1) * power;
      const vx = dir ? dir.x * power + Math.cos(a) * sp * 0.4 : Math.cos(a) * sp;
      const vz = dir ? dir.z * power + Math.sin(a) * sp * 0.4 : Math.sin(a) * sp;
      this.goop.emit(pos.x, pos.y, pos.z,
        vx, rand(0.2, 1) * power * 0.8 + (dir ? dir.y * power : 0), vz,
        { life: rand(0.6, 1), size: rand(1.4, 2.6), color: 0x9fe23a, color2: 0x3c7410,
          alpha: 0.96, gravity: 18, drag: 0.6, grow: 0.5, spin: 1.2, fadeIn: 0.06 });
    }
    // stringy drips falling out of the mass
    for (let i = 0; i < Math.ceil(n / 3); i++) {
      this.goop.emit(pos.x + rand(-0.6, 0.6), pos.y + rand(-0.3, 0.3), pos.z + rand(-0.6, 0.6),
        rand(-1, 1), rand(-2, 0), rand(-1, 1),
        { life: rand(0.5, 0.8), size: rand(0.5, 0.9), color: 0x6cb022, color2: 0x2c5210,
          alpha: 0.96, gravity: 22, spin: 0.8, fadeIn: 0.05 });
    }
    if (power >= 6) {
      this.rings.spawn(pos.clone().setY(Math.max(0.02, pos.y - 1)), { from: 0.3, to: power * 0.45, dur: 0.35, color: 0x6fae1e, y: 0.08 });
    }
  }

  steamVent(pos, dir = null) {
    const d = dir || { x: 0, y: 1, z: 0 };
    this.smoke.emit(pos.x, pos.y, pos.z,
      d.x * rand(2, 4) + rand(-0.4, 0.4), d.y * rand(3, 6), d.z * rand(2, 4) + rand(-0.4, 0.4),
      { life: rand(1, 2), size: rand(1.4, 2.4), color: 0xcfd4da, alpha: 0.22,
        drag: 1.2, grow: 2.8, spin: 0.6, fadeIn: 0.3 });
  }

  healGlow(pos, color) {
    this.glows.emit(pos.x + rand(-1, 1), pos.y + rand(0, 4), pos.z + rand(-1, 1),
      0, 3, 0, { life: 0.5, size: 1.2, color, alpha: 0.8, drag: 1, fadeIn: 0.15 });
  }

  // lingering electrical crackle on a shocked bot: small arcs snap between
  // random points on the body while the charge bleeds off
  staticCling(fighter, dur = 1.1) {
    const cur = this.statics.find((s) => s.f === fighter);
    if (cur) { cur.t = Math.max(cur.t, dur); return; }
    this.statics.push({ f: fighter, t: dur, tick: 0 });
  }

  update(dt) {
    this.sparks.update(dt);
    this.glows.update(dt);
    this.smoke.update(dt);
    this.drops.update(dt);
    this.goop.update(dt);
    this.flames.update(dt);
    this.ice.update(dt);
    this.rings.update(dt);
    this.beams.update(dt);
    this.lightning.update(dt);
    for (let i = this.statics.length - 1; i >= 0; i--) {
      const s = this.statics[i];
      s.t -= dt;
      if (s.t <= 0 || !s.f.group?.visible) { this.statics.splice(i, 1); continue; }
      s.tick -= dt;
      if (s.tick <= 0) {
        s.tick = 0.07;
        const f = s.f, r = f.hitRadius * 0.8;
        const a1 = rand(Math.PI * 2), a2 = a1 + rand(1, Math.PI);
        const p1 = new THREE.Vector3(f.pos.x + Math.cos(a1) * r, f.pos.y + rand(0.2, f.height), f.pos.z + Math.sin(a1) * r);
        const p2 = new THREE.Vector3(f.pos.x + Math.cos(a2) * r, f.pos.y + rand(0.2, f.height), f.pos.z + Math.sin(a2) * r);
        this.lightning.spawn(p1, p2, { color: 0xcfefff, dur: 0.09, jag: 0.3, thick: 0.05, branch: false });
        if (Math.random() < 0.3) {
          this.sparks.emit(p1.x, p1.y, p1.z, rand(-2, 2), rand(1, 3), rand(-2, 2),
            { life: 0.25, size: 0.4, color: 0xcfefff, gravity: 10, fadeIn: 0.02 });
        }
      }
    }
    this.shake = Math.max(0, this.shake - dt * 3.2);
  }
}
