// VFX: pooled GPU point-particles (sparks/smoke/flame/embers), shockwave
// rings, beams, lightning bolts, muzzle flashes, explosion composites.
import * as THREE from 'three';
import { softCircleTexture, sparkTexture, smokeTexture, ringTexture } from '../core/textures.js';
import { rand, clamp01 } from '../core/utils.js';

// ---------- shader point particle pool ----------
const VERT = /* glsl */`
  attribute float aSize;
  attribute vec4 aColor;   // rgb + alpha
  varying vec4 vColor;
  void main() {
    vColor = aColor;
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = aSize * (240.0 / -mv.z);
    gl_Position = projectionMatrix * mv;
  }
`;
const FRAG = /* glsl */`
  uniform sampler2D uTex;
  varying vec4 vColor;
  void main() {
    vec4 t = texture2D(uTex, gl_PointCoord);
    gl_FragColor = vec4(vColor.rgb * t.rgb, vColor.a * t.a);
    if (gl_FragColor.a < 0.01) discard;
  }
`;

class ParticlePool {
  constructor(scene, texture, { cap = 600, blending = THREE.AdditiveBlending, depthWrite = false } = {}) {
    this.cap = cap;
    this.pos = new Float32Array(cap * 3);
    this.col = new Float32Array(cap * 4);
    this.size = new Float32Array(cap);
    // particle sim state
    this.vel = new Float32Array(cap * 3);
    this.life = new Float32Array(cap);     // remaining
    this.life0 = new Float32Array(cap);    // initial
    this.grav = new Float32Array(cap);
    this.drag = new Float32Array(cap);
    this.baseCol = new Float32Array(cap * 3);
    this.baseAlpha = new Float32Array(cap);
    this.baseSize = new Float32Array(cap);
    this.grow = new Float32Array(cap);
    this.head = 0;
    this.alive = 0;

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 4));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1));
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6); // skip culling

    const mat = new THREE.ShaderMaterial({
      uniforms: { uTex: { value: texture } },
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

  emit(x, y, z, vx, vy, vz, { life = 1, size = 1, color = 0xffffff, alpha = 1, gravity = 0, drag = 0, grow = 0 } = {}) {
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
    this.baseAlpha[i] = alpha;
    this.baseSize[i] = size;
  }

  update(dt) {
    const { cap, pos, vel, life, life0, grav, drag, col, size, baseCol, baseAlpha, baseSize, grow } = this;
    for (let i = 0; i < cap; i++) {
      if (life[i] <= 0) { col[i * 4 + 3] = 0; size[i] = 0; continue; }
      life[i] -= dt;
      const f = clamp01(life[i] / life0[i]);
      vel[i * 3 + 1] -= grav[i] * dt;
      if (drag[i]) {
        const d = Math.max(0, 1 - drag[i] * dt);
        vel[i * 3] *= d; vel[i * 3 + 1] *= d; vel[i * 3 + 2] *= d;
      }
      pos[i * 3] += vel[i * 3] * dt;
      pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
      pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      col[i * 4] = baseCol[i * 3];
      col[i * 4 + 1] = baseCol[i * 3 + 1];
      col[i * 4 + 2] = baseCol[i * 3 + 2];
      col[i * 4 + 3] = baseAlpha[i] * f;
      size[i] = baseSize[i] * (1 + grow[i] * (1 - f));
    }
    this.points.geometry.attributes.position.needsUpdate = true;
    this.points.geometry.attributes.aColor.needsUpdate = true;
    this.points.geometry.attributes.aSize.needsUpdate = true;
  }
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

class LightningPool {
  constructor(scene, count = 8) {
    this.items = [];
    for (let i = 0; i < count; i++) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(16 * 3), 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({
        transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      }));
      line.visible = false;
      line.renderOrder = 7;
      line.frustumCulled = false;
      scene.add(line);
      this.items.push({ line, t: 0, dur: 0 });
    }
  }
  spawn(from, to, { color = 0x9fdcff, dur = 0.22, jag = 1.2 } = {}) {
    const it = this.items.find((i) => !i.line.visible) || this.items[0];
    it.line.visible = true;
    it.line.material.color.set(color);
    const posAttr = it.line.geometry.attributes.position;
    const N = 16;
    const dir = new THREE.Vector3().subVectors(to, from);
    for (let i = 0; i < N; i++) {
      const f = i / (N - 1);
      const p = new THREE.Vector3().copy(from).addScaledVector(dir, f);
      if (i > 0 && i < N - 1) {
        p.x += rand(-jag, jag);
        p.y += rand(-jag, jag);
        p.z += rand(-jag, jag);
      }
      posAttr.setXYZ(i, p.x, p.y, p.z);
    }
    posAttr.needsUpdate = true;
    it.t = 0; it.dur = dur;
  }
  update(dt) {
    for (const it of this.items) {
      if (!it.line.visible) continue;
      it.t += dt;
      if (it.t >= it.dur) { it.line.visible = false; continue; }
      it.line.material.opacity = 1 - it.t / it.dur;
    }
  }
}

// ---------- main FX facade ----------

export class Effects {
  constructor(scene) {
    this.scene = scene;
    this.sparks = new ParticlePool(scene, sparkTexture(), { cap: 900 });
    this.glows = new ParticlePool(scene, softCircleTexture(), { cap: 500 });
    this.smoke = new ParticlePool(scene, smokeTexture(), {
      cap: 450, blending: THREE.NormalBlending,
    });
    this.rings = new RingPool(scene);
    this.beams = new BeamPool(scene);
    this.lightning = new LightningPool(scene);
    this.shake = 0;         // camera shake accumulator (read by camera)
    this.flash = null;      // {color, t} full-screen flash (read by hud)
  }

  addShake(amount) { this.shake = Math.min(2.2, this.shake + amount); }

  // ---- composite effects ----
  impactSparks(pos, color = 0xffcf7a, n = 14, power = 10) {
    for (let i = 0; i < n; i++) {
      const a = rand(Math.PI * 2), b = rand(-0.6, 1.2);
      const sp = rand(0.3, 1) * power;
      this.sparks.emit(pos.x, pos.y, pos.z,
        Math.cos(a) * sp, b * sp * 0.7, Math.sin(a) * sp,
        { life: rand(0.2, 0.5), size: rand(0.5, 1.1), color, gravity: 22, drag: 1.5 });
    }
  }

  blockSpark(pos, color = 0x6cc8ff) {
    this.impactSparks(pos, color, 10, 7);
    this.rings.spawn(pos, { from: 0.5, to: 4, dur: 0.3, color, y: pos.y, vertical: null });
  }

  muzzleFlash(pos, color = 0xffd27a) {
    this.glows.emit(pos.x, pos.y, pos.z, 0, 0, 0,
      { life: 0.08, size: rand(2.2, 3.2), color, alpha: 0.9 });
  }

  explosion(pos, radius = 5, { color = 0xffa040, smoke = true, sparks = true, ring = true, flash = true } = {}) {
    if (flash) {
      this.glows.emit(pos.x, pos.y + 0.5, pos.z, 0, 0, 0,
        { life: 0.14, size: radius * 2.2, color: 0xfff2d0, alpha: 1 });
      this.glows.emit(pos.x, pos.y + 0.5, pos.z, 0, 0, 0,
        { life: 0.3, size: radius * 1.5, color, alpha: 0.9 });
    }
    if (sparks) {
      const n = Math.min(40, 10 + radius * 4);
      for (let i = 0; i < n; i++) {
        const a = rand(Math.PI * 2), e = rand(0.1, 1.3);
        const sp = rand(0.4, 1) * radius * 3.2;
        this.sparks.emit(pos.x, pos.y + 0.5, pos.z,
          Math.cos(a) * sp * Math.cos(e), Math.sin(e) * sp, Math.sin(a) * sp * Math.cos(e),
          { life: rand(0.3, 0.8), size: rand(0.6, 1.4), color: 0xffc060, gravity: 26, drag: 1.2 });
      }
    }
    if (smoke) {
      const n = Math.min(22, 6 + radius * 2.5);
      for (let i = 0; i < n; i++) {
        const a = rand(Math.PI * 2), r = rand(0.2, radius * 0.5);
        this.smoke.emit(pos.x + Math.cos(a) * r, pos.y + rand(0.2, 1.5), pos.z + Math.sin(a) * r,
          Math.cos(a) * rand(1, 4), rand(2, 6), Math.sin(a) * rand(1, 4),
          { life: rand(0.8, 1.8), size: rand(2.5, 4.5), color: 0x2b2b30, alpha: 0.55, drag: 1.4, grow: 2.2 });
      }
    }
    if (ring) this.rings.spawn(pos, { from: radius * 0.25, to: radius * 2.1, dur: 0.45, color: 0xffd9a0 });
  }

  dustPuff(pos, n = 8, color = 0x8a8378) {
    for (let i = 0; i < n; i++) {
      const a = rand(Math.PI * 2);
      this.smoke.emit(pos.x + Math.cos(a) * rand(0.5), pos.y + 0.3, pos.z + Math.sin(a) * rand(0.5),
        Math.cos(a) * rand(1.5, 4), rand(0.5, 2), Math.sin(a) * rand(1.5, 4),
        { life: rand(0.5, 1.1), size: rand(1.6, 3), color, alpha: 0.4, drag: 2, grow: 1.6 });
    }
  }

  jetTrail(pos, vel, color) {
    this.glows.emit(pos.x, pos.y, pos.z, -vel.x * 0.1, -vel.y * 0.1, -vel.z * 0.1,
      { life: 0.25, size: rand(0.8, 1.4), color, alpha: 0.8, drag: 2 });
  }

  dashTrail(pos, color, scale = 1) {
    this.glows.emit(pos.x + rand(-0.5, 0.5), pos.y + rand(0.5, 3) * scale, pos.z + rand(-0.5, 0.5),
      0, 0, 0, { life: 0.3, size: rand(1.5, 2.6) * scale, color, alpha: 0.5 });
  }

  flameCone(origin, dir, color = 0xff7a20, spread = 0.3, speed = 26) {
    for (let i = 0; i < 3; i++) {
      const d = dir.clone();
      d.x += rand(-spread, spread); d.y += rand(-spread * 0.6, spread * 0.6); d.z += rand(-spread, spread);
      d.normalize().multiplyScalar(speed * rand(0.7, 1));
      this.glows.emit(origin.x, origin.y, origin.z, d.x, d.y, d.z,
        { life: rand(0.25, 0.5), size: rand(1.2, 2.2), color, alpha: 0.75, drag: 2.2, grow: 3 });
    }
    this.smoke.emit(origin.x + dir.x * 3, origin.y + dir.y * 3 + rand(0.5), origin.z + dir.z * 3,
      dir.x * 8, 2 + rand(2), dir.z * 8,
      { life: rand(0.5, 0.9), size: rand(1.5, 2.6), color: 0x1c1c20, alpha: 0.35, drag: 1.5, grow: 2.5 });
  }

  snowCone(origin, dir, speed = 30) {
    for (let i = 0; i < 3; i++) {
      const d = dir.clone();
      d.x += rand(-0.18, 0.18); d.y += rand(-0.12, 0.12); d.z += rand(-0.18, 0.18);
      d.normalize().multiplyScalar(speed * rand(0.7, 1));
      this.glows.emit(origin.x, origin.y, origin.z, d.x, d.y, d.z,
        { life: rand(0.2, 0.45), size: rand(0.9, 1.8), color: 0xaef0ff, alpha: 0.7, drag: 1.8, grow: 1.5 });
    }
  }

  firePatch(pos, radius = 2.2) {
    // one tick of ground-fire visuals; caller re-invokes while patch lives
    for (let i = 0; i < 2; i++) {
      const a = rand(Math.PI * 2), r = rand(0, radius);
      this.glows.emit(pos.x + Math.cos(a) * r, pos.y + 0.2, pos.z + Math.sin(a) * r,
        rand(-0.5, 0.5), rand(2.5, 5), rand(-0.5, 0.5),
        { life: rand(0.3, 0.6), size: rand(1, 2), color: 0xff8830, alpha: 0.8, drag: 1, grow: 1.5 });
    }
  }

  steamVent(pos, dir = null) {
    const d = dir || { x: 0, y: 1, z: 0 };
    this.smoke.emit(pos.x, pos.y, pos.z,
      d.x * rand(2, 4) + rand(-0.4, 0.4), d.y * rand(3, 6), d.z * rand(2, 4) + rand(-0.4, 0.4),
      { life: rand(1, 2), size: rand(1.4, 2.4), color: 0xcfd4da, alpha: 0.22, drag: 1.2, grow: 2.8 });
  }

  healGlow(pos, color) {
    this.glows.emit(pos.x + rand(-1, 1), pos.y + rand(0, 4), pos.z + rand(-1, 1),
      0, 3, 0, { life: 0.5, size: 1.2, color, alpha: 0.8, drag: 1 });
  }

  update(dt) {
    this.sparks.update(dt);
    this.glows.update(dt);
    this.smoke.update(dt);
    this.rings.update(dt);
    this.beams.update(dt);
    this.lightning.update(dt);
    this.shake = Math.max(0, this.shake - dt * 3.2);
  }
}
