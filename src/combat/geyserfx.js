// GeyserFX — a layered "movie fake" geyser, the standard real-time recipe
// (UE Niagara / stylized-water breakdowns): no fluid solve, instead
//   1. a shader-driven COLUMN mesh (two nested shells): vertex-noise churn,
//      dual scrolling noise, deep-water -> aerated-foam vertical ramp, and
//      noise-eroded dissolve so the crown rags apart into tongues
//   2. particle layers via the shared Effects pools — risers inside the
//      column, a ballistic droplet crown, fall-back spray that splashes
//      where it lands, drifting mist, and a base surge
//   3. ground read: expanding foam rings + a wet puddle decal
// Lifecycle: warn (boiling telegraph) -> erupt (spring-overshoot rise,
// pulsing sustain with random surges) -> collapse. Owner calls update(dt)
// every frame; it returns false once fully dead (then call dispose()).
import * as THREE from 'three';
import { streamNoiseTexture } from '../core/textures.js';
import { rand, clamp01 } from '../core/utils.js';
import { GLSL_VNOISE } from './fxglsl.js';

const COLUMN_VERT = /* glsl */`
  uniform float uTime;
  uniform float uHeight;    // current column height (world units)
  uniform float uRadius;    // throat radius at the vent
  uniform float uChurn;     // displacement amplitude scale
  varying vec2 vUv;
  varying float vDisp;
  varying vec3 vNrm;
  varying vec3 vViewDir;

  ${GLSL_VNOISE}

  void main() {
    vUv = uv;
    float h = uv.y;                       // 0 vent -> 1 crown
    vec2 ring = vec2(position.x, position.z); // unit circle
    // pressure profile: tight throat, plume widening downstream, extra
    // crown bulge where the jet loses velocity and mushrooms out
    float prof = 1.0 + 2.1 * pow(h, 1.55) + 1.1 * smoothstep(0.72, 1.0, h);
    // churn: two octaves of noise crawling UP the column; turbulence grows
    // with height (laminar at the throat, ragged at the crown)
    float n1 = vnoise(vec2(ring.x * 2.0 + ring.y * 1.3, h * 3.4 - uTime * 2.4));
    float n2 = vnoise(vec2(ring.y * 3.6 - ring.x * 2.2 + 5.7, h * 7.5 - uTime * 4.6));
    float disp = (n1 - 0.5) * 1.5 + (n2 - 0.5) * 0.75;
    vDisp = disp;
    float r = uRadius * prof * (1.0 + disp * uChurn * (0.18 + 0.85 * h));
    vec3 pos = vec3(ring.x * r, h * uHeight + disp * uChurn * h * 1.4, ring.y * r);
    vNrm = normalize(normalMatrix * vec3(ring.x, 0.12, ring.y));
    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    vViewDir = normalize(-mv.xyz);
    gl_Position = projectionMatrix * mv;
  }
`;

const COLUMN_FRAG = /* glsl */`
  uniform sampler2D uTex;
  uniform float uTime;
  uniform float uAlpha;
  uniform float uScroll;    // noise scroll speed (inner shell runs faster)
  uniform vec3 uDeep;       // translucent water body color
  uniform vec3 uFoam;       // aerated whitewater (kept under bloom threshold)
  varying vec2 vUv;
  varying float vDisp;
  varying vec3 vNrm;
  varying vec3 vViewDir;
  float clamp01(float x) { return clamp(x, 0.0, 1.0); }
  void main() {
    float h = vUv.y;
    // two layers of fractal noise racing up the column at different rates —
    // this is what sells "tons of water moving fast"
    float n1 = texture2D(uTex, vec2(vUv.x * 2.0, h * 1.5 - uTime * uScroll)).r;
    float n2 = texture2D(uTex, vec2(vUv.x * 3.7 + 0.31, h * 3.2 - uTime * uScroll * 1.9)).r;
    float n = n1 * 0.6 + n2 * 0.4;
    // aeration ramp: solid deep water at the vent, churned white the higher
    // (and the more displaced) the shell gets; grazing edges foam up too
    float rim = 1.0 - abs(dot(normalize(vNrm), normalize(vViewDir)));
    float foam = clamp01(h * 1.35 - 0.18 + (n - 0.5) * 1.1 + vDisp * 0.35 + rim * 0.4);
    vec3 col = mix(uDeep, uFoam, foam * foam);
    // noise erosion: the dissolve threshold climbs with height so the crown
    // tears into ragged tongues instead of ending at a clean lip
    float erode = smoothstep(mix(0.08, 0.62, h), mix(0.08, 0.62, h) + 0.3, n + (1.0 - h) * 0.25);
    float a = uAlpha * erode * (1.0 - h * 0.35) * (0.65 + rim * 0.35);
    a *= smoothstep(0.0, 0.04, h); // seat the base into the pool
    gl_FragColor = vec4(col, a);
    if (a < 0.02) discard;
  }
`;

function columnShell(radius, { deep, foam, alpha, scroll, churn, sides = 26, segs = 34 }) {
  const geo = new THREE.CylinderGeometry(1, 1, 1, sides, segs, true);
  geo.translate(0, 0.5, 0); // base at y=0; shader rebuilds y from uv anyway
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e6);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uTex: { value: streamNoiseTexture() },
      uTime: { value: rand(0, 20) },
      uHeight: { value: 0 },
      uRadius: { value: radius },
      uChurn: { value: churn },
      uAlpha: { value: alpha },
      uScroll: { value: scroll },
      uDeep: { value: new THREE.Color(deep) },
      uFoam: { value: new THREE.Color(foam) },
    },
    vertexShader: COLUMN_VERT,
    fragmentShader: COLUMN_FRAG,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.frustumCulled = false;
  mesh.renderOrder = 6;
  return mesh;
}

export class GeyserFX {
  // opts: height, radius (throat), warn (telegraph secs; 0 = erupt now),
  // sustain (full-blast secs), boilRadius (telegraph churn area)
  constructor(scene, effects, pos, {
    height = 22, radius = 1.5, warn = 0.85, sustain = 3.2, boilRadius = 4,
  } = {}) {
    this.scene = scene;
    this.fx = effects;
    this.pos = pos.clone();
    this.pos.y = 0;
    this.height = height;
    this.radius = radius;
    this.warn = warn;
    this.sustain = sustain;
    this.boilRadius = boilRadius;
    this.t = 0;
    this.phase = warn > 0 ? 'warn' : 'erupt';
    this.eruptT = 0;
    this.collapseT = 0;
    this.surge = 0;             // 0..1 extra pressure pulse
    this.nextSurge = rand(0.7, 1.3);
    this.env = 0;               // rendered height envelope 0..1+
    this._acc = { riser: 0, crown: 0, mist: 0, base: 0, land: 0, ring: 0, bubble: 0 };
    this._puddle = null;

    // outer ragged shell + brighter fast core (classic two-shell column)
    this.outer = columnShell(radius, {
      deep: 0x2c5c86, foam: 0xcfe4ee, alpha: 0.72, scroll: 2.0, churn: 1.0,
    });
    this.inner = columnShell(radius * 0.52, {
      deep: 0x7fa8c8, foam: 0xe2eef4, alpha: 0.9, scroll: 3.4, churn: 0.6,
      sides: 18, segs: 26,
    });
    this.outer.position.copy(this.pos);
    this.inner.position.copy(this.pos);
    this.outer.visible = this.inner.visible = false;
    scene.add(this.outer, this.inner);
  }

  // ---- phase envelopes ----
  _envelope(dt) {
    if (this.phase === 'erupt') {
      this.eruptT += dt;
      const t = this.eruptT;
      // spring rise with overshoot: the burst POPS past full height then
      // settles — reads as pressure release, not a lerp
      const rise = 1 - Math.exp(-t * 9);
      const over = 0.22 * Math.sin(Math.min(t, 0.8) * 9) * Math.exp(-t * 3.2);
      // sustain: two incommensurate pulses so the column never looks looped
      const pulse = 0.05 * Math.sin(t * 8.7) + 0.04 * Math.sin(t * 21.3 + 1.7);
      // random pressure surges every ~1s
      this.nextSurge -= dt;
      if (this.nextSurge <= 0) { this.surge = 1; this.nextSurge = rand(0.7, 1.4); }
      this.surge = Math.max(0, this.surge - dt * 2.2);
      this.env = rise + over + pulse + this.surge * 0.14;
      if (this.eruptT >= this.sustain) { this.phase = 'collapse'; this.collapseT = 0; }
    } else if (this.phase === 'collapse') {
      this.collapseT += dt;
      const f = clamp01(this.collapseT / 0.75);
      this.env *= 1 - (f * f) * 0.16 - dt * 2.4 * f;
      this.env = Math.max(0, this.env - dt * 1.9 * f);
      if (this.collapseT >= 0.95) this.phase = 'dead';
    }
  }

  _tick(acc, key, period, dt, fn) {
    acc[key] += dt;
    while (acc[key] >= period) { acc[key] -= period; fn(); }
  }

  update(dt) {
    if (this.phase === 'dead') return false;
    this.t += dt;
    const fx = this.fx, p = this.pos, a = this._acc;

    if (this.phase === 'warn') {
      // boiling telegraph: churning bubbles + danger rings, ramping up
      const prog = this.t / this.warn;
      this._tick(a, 'bubble', 0.028, dt, () => {
        const boil = 0.6 + prog;
        const an = rand(Math.PI * 2), r = Math.sqrt(Math.random()) * this.boilRadius * 0.8;
        fx.drops.emit(p.x + Math.cos(an) * r, 0.3, p.z + Math.sin(an) * r,
          rand(-0.5, 0.5), rand(2.5, 5.5) * boil, rand(-0.5, 0.5),
          { life: rand(0.4, 0.7), size: rand(1.4, 2.6) * boil, color: 0xd8ecf8, color2: 0x4a80b0, alpha: 0.92, gravity: 14, spin: 2 });
        if (Math.random() < 0.35) fx.steamVent(p);
      });
      this._tick(a, 'ring', 0.21, dt, () => {
        fx.rings.spawn(p, { from: 0.6, to: this.boilRadius * 2.2, dur: 0.34, color: 0x4fc3ff, y: 0.3 });
      });
      if (this.t >= this.warn) {
        this.phase = 'erupt';
        // blowout punch: flash ring, shake, one big crown of droplets
        fx.rings.spawn(p, { from: 1, to: this.boilRadius * 3.2, dur: 0.5, color: 0xbfe8ff, y: 0.4 });
        fx.addShake(0.8);
        fx.splash(p, 26, 14, 1.6);
        if (!this._puddle) {
          this._puddle = fx.puddle(p, { size: this.boilRadius * 2.6, life: this.sustain + 3 });
        }
      }
      return true;
    }

    this._envelope(dt);
    const H = this.height * this.env;
    const live = this.env > 0.02;
    this.outer.visible = this.inner.visible = live;
    for (const shell of [this.outer, this.inner]) {
      const u = shell.material.uniforms;
      u.uTime.value += dt * (1 + this.surge * 0.5);
      u.uHeight.value = H;
      u.uAlpha.value = (shell === this.outer ? 0.72 : 0.9) * clamp01(this.env * 3);
    }
    if (!live) return this.phase !== 'dead';

    const R = this.radius, topY = H * 0.96;
    const strength = clamp01(this.env) * (this.phase === 'collapse' ? 0.5 : 1);
    const ejecting = this.phase === 'erupt'; // collapse = drain, nothing thrown

    // risers: fast beads racing up inside the column — carries the eye up
    if (ejecting) this._tick(a, 'riser', 0.035, dt, () => {
      const an = rand(Math.PI * 2), r = rand(0, R * 0.8);
      fx.drops.emit(p.x + Math.cos(an) * r, rand(0.2, 1.5), p.z + Math.sin(an) * r,
        Math.cos(an) * rand(0.4, 1.5), H * rand(1.1, 1.5), Math.sin(an) * rand(0.4, 1.5),
        { life: rand(0.5, 0.8), size: rand(0.8, 1.6), color: 0xdcecf6, color2: 0x54809f,
          alpha: 0.9 * strength, gravity: 24, drag: 0.35, spin: 2, fadeIn: 0.05 });
    });

    // crown: the jet mushrooms at the top — ballistic droplets thrown out
    // and up, inheriting column velocity, then raining back down
    if (ejecting) this._tick(a, 'crown', 0.03, dt, () => {
      for (let i = 0; i < 3; i++) {
        const an = rand(Math.PI * 2), out = rand(1.5, 5.5) * (1 + this.surge);
        fx.drops.emit(p.x + Math.cos(an) * R * rand(0.5, 1.8), topY + rand(-1.5, 0.5), p.z + Math.sin(an) * R * rand(0.5, 1.8),
          Math.cos(an) * out, rand(2, 7), Math.sin(an) * out,
          { life: rand(0.6, 1.1), size: rand(0.7, 1.5), color: 0xe6f2f8, color2: 0x3a5a78,
            alpha: 0.92 * strength, gravity: 28, drag: 0.2, spin: 2.5, fadeIn: 0.04 });
      }
      // dim foam flecks sparkling off the crown (additive — keep tiny/faint)
      fx.glows.emit(p.x + rand(-R, R), topY + rand(-1, 1), p.z + rand(-R, R),
        rand(-2, 2), rand(2, 5), rand(-2, 2),
        { life: rand(0.2, 0.35), size: rand(0.25, 0.45), color: 0xcfe4f0, alpha: 0.22 * strength, gravity: 24, fadeIn: 0.02 });
    });

    // mist: big soft vapor shearing off the upper column and drifting
    this._tick(a, 'mist', 0.11, dt, () => {
      const an = rand(Math.PI * 2), h = rand(0.45, 1.05) * H;
      fx.smoke.emit(p.x + Math.cos(an) * R * rand(1, 2.5), h, p.z + Math.sin(an) * R * rand(1, 2.5),
        Math.cos(an) * rand(1, 3), rand(1.5, 4), Math.sin(an) * rand(1, 3),
        { life: rand(0.7, 1.3), size: rand(2, 3.5), color: 0xeaf4fc, color2: 0xc4d6e4,
          alpha: 0.15 * strength, drag: 1.1, grow: 2, spin: 0.7, fadeIn: 0.3 });
    });

    // base surge: water shouldering out of the vent and skimming the ground
    this._tick(a, 'base', 0.07, dt, () => {
      const an = rand(Math.PI * 2);
      fx.drops.emit(p.x + Math.cos(an) * R * 1.2, rand(0.2, 0.8), p.z + Math.sin(an) * R * 1.2,
        Math.cos(an) * rand(4, 9), rand(1, 3.5), Math.sin(an) * rand(4, 9),
        { life: rand(0.4, 0.7), size: rand(0.8, 1.6), color: 0xcfe4f0, color2: 0x4a7ba8,
          alpha: 0.9 * strength, gravity: 20, drag: 0.6, fadeIn: 0.04 });
      fx.smoke.emit(p.x + Math.cos(an) * R, 0.5, p.z + Math.sin(an) * R,
        Math.cos(an) * rand(2, 4), rand(0.5, 1.5), Math.sin(an) * rand(2, 4),
        { life: rand(0.5, 0.9), size: rand(1.5, 2.5), color: 0xe8f2fa, alpha: 0.16 * strength,
          drag: 1.5, grow: 2, fadeIn: 0.2 });
    });

    // rain-back: the crown water lands in a donut around the vent — faked
    // with small splashes on that ring (tracking real droplets isn't worth it)
    this._tick(a, 'land', 0.13, dt, () => {
      const an = rand(Math.PI * 2), r = rand(this.boilRadius * 0.7, this.boilRadius * 1.6);
      const lp = new THREE.Vector3(p.x + Math.cos(an) * r, 0.1, p.z + Math.sin(an) * r);
      fx.splash(lp, 4, rand(2.5, 4.5), 1);
    });

    // slow foam rings crawling out of the base pool
    this._tick(a, 'ring', 0.55, dt, () => {
      fx.rings.spawn(p, { from: R * 1.5, to: this.boilRadius * 2.4, dur: 0.9, color: 0x86b8cc, y: 0.25 });
    });

    return this.phase !== 'dead';
  }

  dispose() {
    for (const shell of [this.outer, this.inner]) {
      this.scene.remove(shell);
      shell.geometry.dispose();
      shell.material.dispose();
    }
  }
}
