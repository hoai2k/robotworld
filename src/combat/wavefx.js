// TidalWaveFX — a breaking wave-front WALL, the real-time recipe from
// ocean/stylized-water breakdowns: waves aren't particles, they're a mesh
// with a trochoid-ish breaking profile (rounded toe, concave face, sharp
// crest overhanging the travel direction) whose steep zones drive foam.
// Here: a ring-sector wall expanding outward from a center — the shader
// scrolls noise UP the face (water climbing), foams the crest and the toe,
// and erodes the crest line into ragged fingers; particles add crest spray
// thrown forward, toe splash, and mist. Wet foam decals trail behind.
import * as THREE from 'three';
import { streamNoiseTexture } from '../core/textures.js';
import { rand, clamp01 } from '../core/utils.js';

const WAVE_VERT = /* glsl */`
  uniform float uTime;
  uniform float uR;        // current radius of the wave toe
  uniform float uH;        // wall height
  uniform float uArc0;     // sector start angle
  uniform float uArc;      // sector span
  varying vec2 vUv;
  varying float vCrest;    // ragged crest-line factor for the fragment
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  float vnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1, 0)), f.x),
               mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), f.x), f.y);
  }
  void main() {
    vUv = uv;
    float u = uv.x, v = uv.y;
    float ang = uArc0 + u * uArc;
    vec2 dirO = vec2(cos(ang), sin(ang));   // outward = travel direction
    // ragged crest line: height varies along the arc and churns over time
    float ragged = vnoise(vec2(u * 9.0 + cos(ang) * 2.0, uTime * 1.4)) - 0.5;
    vCrest = ragged;
    float H = uH * (1.0 + ragged * 0.35 * v);
    // breaking-wave profile (trochoid-ish): toe pushed forward at the base,
    // concave face leaning back, crest hooking FORWARD over the toe
    float fwd = uH * (0.35 - 0.85 * v + 1.1 * v * v * v);
    // crest curl: the very top droops forward-and-down like a plunging lip
    float lip = smoothstep(0.82, 1.0, v);
    fwd += lip * uH * 0.5;
    float y = v * H * (1.0 - 0.35 * lip * lip);
    float r = uR + fwd;
    // face churn wobble
    float wob = (vnoise(vec2(u * 14.0 - uTime * 2.0, v * 3.0 + uTime * 1.2)) - 0.5) * uH * 0.14 * v;
    vec3 wp = vec3(dirO.x * (r + wob), y, dirO.y * (r + wob));
    gl_Position = projectionMatrix * viewMatrix * vec4(wp, 1.0);
  }
`;

const WAVE_FRAG = /* glsl */`
  uniform sampler2D uTex;
  uniform float uTime;
  uniform float uAlpha;
  uniform vec3 uDeep;
  uniform vec3 uFoam;
  varying vec2 vUv;
  varying float vCrest;
  void main() {
    float u = vUv.x, v = vUv.y;
    // water CLIMBS the face: dual noise scrolling upward at different rates
    float n1 = texture2D(uTex, vec2(u * 6.0, v * 1.2 - uTime * 1.6)).r;
    float n2 = texture2D(uTex, vec2(u * 11.0 + 0.37, v * 2.6 - uTime * 2.9)).r;
    float n = n1 * 0.6 + n2 * 0.4;
    // foam where the water is steep/collapsing: the crest lip, the churned
    // toe at the base, and noise streaks dragged up the face
    float crestFoam = smoothstep(0.52, 0.92, v + (n - 0.5) * 0.4 + vCrest * 0.2);
    float toeFoam = smoothstep(0.26, 0.0, v) * (0.55 + n * 0.7);
    float streaks = smoothstep(0.5, 0.88, n) * 0.7 * v;
    float foam = clamp(crestFoam + toeFoam + streaks, 0.0, 1.0);
    vec3 col = mix(uDeep, uFoam, foam * foam);
    // crest erosion: the lip tears into ragged fingers, not a clean edge
    float erode = smoothstep(mix(0.02, 0.68, v), mix(0.02, 0.68, v) + 0.3, n + (1.0 - v) * 0.35);
    float a = uAlpha * erode * (0.95 - v * 0.15);
    a *= smoothstep(0.0, 0.05, v);
    gl_FragColor = vec4(col, a);
    if (a < 0.02) discard;
  }
`;

export class TidalWaveFX {
  // A wave wall expanding from `pos`. opts:
  //   height   wall height at full power
  //   r0/r1    start and die radius of the toe
  //   speed    outward speed (units/s)
  //   arc0/arc sector start/span in radians (default full ring)
  constructor(scene, effects, pos, {
    height = 7, r0 = 2, r1 = 34, speed = 15, arc0 = 0, arc = Math.PI * 2,
  } = {}) {
    this.scene = scene;
    this.fx = effects;
    this.pos = pos.clone().setY(0);
    this.height = height;
    this.r = r0;
    this.r1 = r1;
    this.speed = speed;
    this.arc0 = arc0;
    this.arc = arc;
    this.t = 0;
    this.alive = true;
    this._acc = { spray: 0, toe: 0, mist: 0, trail: 0 };

    const SEGS = Math.max(24, Math.round(48 * arc / Math.PI)), PROF = 12;
    const geo = new THREE.PlaneGeometry(1, 1, SEGS, PROF); // uv grid; shader rebuilds
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
    this.mat = new THREE.ShaderMaterial({
      uniforms: {
        uTex: { value: streamNoiseTexture() },
        uTime: { value: rand(0, 20) },
        uR: { value: r0 },
        uH: { value: 0 },
        uArc0: { value: arc0 },
        uArc: { value: arc },
        uAlpha: { value: 0.9 },
        uDeep: { value: new THREE.Color(0x1e4a72) },
        uFoam: { value: new THREE.Color(0xdcecf4) },
      },
      vertexShader: WAVE_VERT,
      fragmentShader: WAVE_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending,
      side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, this.mat);
    this.mesh.position.copy(this.pos);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 6;
    scene.add(this.mesh);

    // FLOOD: churned surge water filling the ring behind the wall — a flat
    // disc of scrolling foam noise (without it you see bare dirt inside)
    const ftex = streamNoiseTexture().clone();
    ftex.needsUpdate = true;
    this.floodMat = new THREE.MeshBasicMaterial({
      map: ftex, color: 0x9cc4dc, transparent: true, opacity: 0,
      depthWrite: false, blending: THREE.NormalBlending,
    });
    this.flood = new THREE.Mesh(new THREE.CircleGeometry(1, 48), this.floodMat);
    this.flood.rotation.x = -Math.PI / 2;
    this.flood.position.copy(this.pos).setY(0.12);
    this.flood.renderOrder = 3;
    scene.add(this.flood);
  }

  _tick(key, period, dt, fn) {
    this._acc[key] += dt;
    while (this._acc[key] >= period) { this._acc[key] -= period; fn(); }
  }

  // random angle inside this wave's sector
  _ang() { return this.arc0 + Math.random() * this.arc; }

  update(dt) {
    if (!this.alive) return false;
    this.t += dt;
    this.r += this.speed * dt;
    const p = this.pos, fx = this.fx;
    // grow in fast, collapse as the wave dies out at r1
    const fade = clamp01((this.r1 - this.r) / (this.height * 1.4));
    const env = clamp01(this.t * 4) * fade;
    this.mat.uniforms.uTime.value += dt;
    this.mat.uniforms.uR.value = this.r;
    this.mat.uniforms.uH.value = this.height * env;
    this.mat.uniforms.uAlpha.value = 0.9 * clamp01(env * 2.5);
    // the flood disc chases the toe; its foam texture crawls outward
    const fr = Math.max(0.5, this.r - this.height * 0.2);
    this.flood.scale.set(fr, fr, 1);
    this.floodMat.opacity = 0.55 * clamp01(env * 2);
    this.floodMat.map.offset.x -= dt * 0.25;
    this.floodMat.map.repeat.set(fr * 0.16, fr * 0.16);
    if (this.r >= this.r1) { this.alive = false; return false; }
    if (env < 0.05) return true;

    const H = this.height * env;
    // crest spray: droplets hurled forward off the plunging lip
    this._tick('spray', 0.03, dt, () => {
      for (let i = 0; i < 3; i++) {
        const a = this._ang(), out = this.speed * rand(0.55, 1.0);
        fx.drops.emit(p.x + Math.cos(a) * (this.r + H * 0.35), H * rand(0.8, 1.05), p.z + Math.sin(a) * (this.r + H * 0.35),
          Math.cos(a) * out, rand(-1, 3), Math.sin(a) * out,
          { life: rand(0.4, 0.8), size: rand(0.7, 1.5), color: 0xe6f2f8, color2: 0x5d84a2,
            alpha: 0.92, gravity: 26, drag: 0.3, spin: 2.5, fadeIn: 0.04 });
      }
    });
    // toe churn: foam boiling at the base leading edge
    this._tick('toe', 0.04, dt, () => {
      const a = this._ang();
      fx.drops.emit(p.x + Math.cos(a) * (this.r + H * 0.3), rand(0.2, 0.8), p.z + Math.sin(a) * (this.r + H * 0.3),
        Math.cos(a) * this.speed * rand(0.7, 1.1), rand(1, 3), Math.sin(a) * this.speed * rand(0.7, 1.1),
        { life: rand(0.3, 0.55), size: rand(1, 2), color: 0xe8f2f8, color2: 0x6d94b2,
          alpha: 0.9, gravity: 18, drag: 0.5, fadeIn: 0.04 });
    });
    // mist blowing off the crest
    this._tick('mist', 0.09, dt, () => {
      const a = this._ang();
      fx.smoke.emit(p.x + Math.cos(a) * (this.r + H * 0.2), H * rand(0.7, 1.1), p.z + Math.sin(a) * (this.r + H * 0.2),
        Math.cos(a) * this.speed * 0.5, rand(0.5, 2), Math.sin(a) * this.speed * 0.5,
        { life: rand(0.5, 0.9), size: rand(1.8, 3), color: 0xe8f2fa, color2: 0xbcd2e0,
          alpha: 0.16, drag: 1.2, grow: 2, fadeIn: 0.25 });
    });
    // wet foam trail left where the wave has passed
    this._tick('trail', 0.12, dt, () => {
      const a = this._ang();
      const tp = new THREE.Vector3(p.x + Math.cos(a) * (this.r - H * 0.4), 0.05, p.z + Math.sin(a) * (this.r - H * 0.4));
      fx.puddle(tp, { size: rand(2.5, 4), life: rand(1.5, 2.5) });
      if (Math.random() < 0.5) fx.splash(tp, 3, 3, 0.8);
    });
    return true;
  }

  dispose() {
    this.scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    this.mat.dispose();
    this.scene.remove(this.flood);
    this.flood.geometry.dispose();
    this.floodMat.dispose();
  }
}
