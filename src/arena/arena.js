// Arena: builds a themed battleground (sky, lights, ground, destructible
// buildings, props, ambient particles) and services combat queries.
import * as THREE from 'three';
import { DestructibleSystem } from './destructible.js';
import { PROPS, PROP_MATS, placeProp } from './props.js';
import { roadTexture, chunkFacade, skyStarsTexture } from '../core/textures.js';
import { rand, makeRng, clamp } from '../core/utils.js';

const _v = new THREE.Vector3();

function makeSkyDome(theme) {
  const geo = new THREE.SphereGeometry(900, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      uTop: { value: new THREE.Color(theme.sky.top) },
      uBottom: { value: new THREE.Color(theme.sky.bottom) },
      uStars: { value: theme.sky.stars ? skyStarsTexture() : null },
      uHasStars: { value: theme.sky.stars ? 1 : 0 },
    },
    vertexShader: /* glsl */`
      varying vec3 vDir;
      varying vec2 vUv;
      void main() {
        vDir = normalize(position);
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: /* glsl */`
      uniform vec3 uTop; uniform vec3 uBottom;
      uniform sampler2D uStars; uniform float uHasStars;
      varying vec3 vDir; varying vec2 vUv;
      void main() {
        float h = clamp(vDir.y * 1.4 + 0.18, 0.0, 1.0);
        vec3 col = mix(uBottom, uTop, pow(h, 0.8));
        if (uHasStars > 0.5 && vDir.y > 0.02) {
          vec3 s = texture2D(uStars, vUv * vec2(3.0, 2.0)).rgb;
          col += s * smoothstep(0.02, 0.3, vDir.y);
        }
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = -10;
  return mesh;
}

export class Arena {
  constructor(engine, theme, seed = 7) {
    this.engine = engine;
    this.scene = engine.scene;
    this.theme = theme;
    this.bounds = theme.bounds;
    this.world = null;
    this.objects = [];   // everything we added (for dispose)
    this.spinners = [];  // props with userData.spin
    this.steamSpots = [];
    this.ambientT = 0;
    const rng = makeRng(seed * 31 + theme.id.length * 77);

    // ---- environment ----
    this.sky = makeSkyDome(theme);
    this.scene.add(this.sky);
    this.objects.push(this.sky);
    this.scene.fog = new THREE.Fog(theme.fog.color, theme.fog.near, theme.fog.far);
    this.scene.background = null;

    const { sun, hemi, rim } = engine;
    sun.color.set(theme.sun.color);
    sun.intensity = theme.sun.intensity;
    sun.position.set(...theme.sun.pos);
    hemi.color.set(theme.hemi.sky);
    hemi.groundColor.set(theme.hemi.ground);
    hemi.intensity = theme.hemi.intensity;
    rim.color.set(theme.rim.color);
    rim.intensity = theme.rim.intensity;
    if (theme.rim.pos) rim.position.set(...theme.rim.pos);
    engine.renderer.toneMappingExposure = theme.exposure ?? 1.0;

    // ---- ground ----
    const gmat = new THREE.MeshStandardMaterial({
      color: theme.ground.color, roughness: 0.88, metalness: 0.08,
    });
    if (theme.ground.road) {
      gmat.map = roadTexture();
      gmat.map.repeat.set(7, 7);
      gmat.color.set(0xffffff);
    }
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), gmat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.objects.push(ground);

    // boundary markings + pylons
    const B = this.bounds;
    const edge = new THREE.Mesh(
      new THREE.RingGeometry(B * 1.355, B * 1.415, 4, 1),
      new THREE.MeshBasicMaterial({
        color: theme.ground.accent || 0x53e8ff, transparent: true, opacity: 0.5, side: THREE.DoubleSide,
      })
    );
    edge.rotation.x = -Math.PI / 2;
    edge.rotation.z = Math.PI / 4;
    edge.position.y = 0.06;
    this.scene.add(edge);
    this.objects.push(edge);

    const pylonMat = new THREE.MeshStandardMaterial({
      color: theme.ground.accent || 0x53e8ff,
      emissive: theme.ground.accent || 0x53e8ff, emissiveIntensity: 1.6,
    });
    for (const [px, pz] of [[-B, -B], [B, -B], [-B, B], [B, B]]) {
      const py = PROPS.barrierPylon({ mat: pylonMat });
      py.position.set(px, 0, pz);
      this.scene.add(py);
      this.objects.push(py);
    }

    // ---- skyline backdrop (cheap, far, unlit boxes) ----
    const skyMatDark = new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.fog.color).multiplyScalar(0.55) });
    const skyline = new THREE.Group();
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + rng.range(-0.05, 0.05);
      const r = rng.range(150, 250);
      const w = rng.range(12, 30), h = rng.range(20, 90), d = rng.range(12, 30);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), skyMatDark);
      m.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r);
      m.rotation.y = rng.range(0, Math.PI);
      skyline.add(m);
    }
    this.scene.add(skyline);
    this.objects.push(skyline);

    // ---- destructible buildings ----
    const styleIdx = theme.buildings.styles[0];
    const facade = chunkFacade(styleIdx, seed);
    const sideMat = new THREE.MeshStandardMaterial({
      map: facade.map, roughness: 0.82, metalness: 0.15,
    });
    if (theme.buildings.glow) {
      sideMat.emissiveMap = facade.emissiveMap;
      sideMat.emissive = new THREE.Color(0xffffff);
      sideMat.emissiveIntensity = 0.6;
    }
    const roofMat = new THREE.MeshStandardMaterial({
      color: 0xb0aca4, roughness: 0.9, metalness: 0.1,
    });
    // box face order: px, nx, py (top), ny, pz, nz
    const chunkMats = [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat];
    this.destructo = new DestructibleSystem(this.scene, chunkMats);
    this.objects.push(this.destructo.mesh, this.destructo.debris.mesh);

    // ring layout: buildings frame the fight zone, a couple in-field for cover
    const count = Math.min(theme.buildings.count, 9);
    const placed = [];
    for (let i = 0; i < count; i++) {
      let x, z, ok = false, tries = 0;
      const inner = i >= count - 2;
      while (!ok && tries++ < 40) {
        if (!inner) {
          const a = (i / (count - 2)) * Math.PI * 2 + rng.range(-0.22, 0.22);
          const r = rng.range(B * 0.78, B * 1.08);
          x = Math.cos(a) * r; z = Math.sin(a) * r;
        } else {
          const a = rng.range(0, Math.PI * 2);
          const r = rng.range(20, B * 0.55);
          x = Math.cos(a) * r; z = Math.sin(a) * r;
        }
        ok = placed.every((p) => Math.hypot(p[0] - x, p[1] - z) > 22);
      }
      if (!ok) continue;
      placed.push([x, z]);
      const nx = rng.int(2, 3), nz = rng.int(2, 3);
      const ny = rng.int(theme.buildings.hRange[0], theme.buildings.hRange[1]);
      const cw = rng.range(3.2, 3.9), ch = rng.range(3.1, 3.6), cd = rng.range(3.2, 3.9);
      const tint = theme.buildings.tints[rng.int(0, theme.buildings.tints.length - 1)];
      this.destructo.addBuilding(x, z, nx, ny, nz, cw, ch, cd, { tint, rng });
    }

    // ---- props ----
    for (const spec of theme.props || []) {
      for (let i = 0; i < spec.count; i++) {
        const a = rng.range(0, Math.PI * 2);
        const r = rng.range(spec.ring[0], spec.ring[1]);
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        let opts = Array.isArray(spec.opts) ? spec.opts[i % spec.opts.length] : { ...(spec.opts || {}) };
        opts = { ...opts, seed: rng.int(1, 99999) };
        if (opts.mat === 'ice') opts.mat = PROP_MATS.ice;
        const g = placeProp(this.scene, this.objects, spec.name, x, z, opts);
        if (g && g.userData.spin) this.spinners.push(g);
        if (g && g.userData.steamY !== undefined) {
          this.steamSpots.push(new THREE.Vector3(x, g.userData.steamY, z));
        }
      }
    }
    // extra steam vents at ground level for industrial themes
    for (let i = 0; i < (theme.steamVents || 0); i++) {
      const a = rng.range(0, Math.PI * 2), r = rng.range(14, B * 0.8);
      this.steamSpots.push(new THREE.Vector3(Math.cos(a) * r, 0.3, Math.sin(a) * r));
    }
  }

  bind(world) {
    this.world = world;
    this.destructo.world = world;
  }

  // ---- combat services ----
  damageSphere(pos, radius, dmg, dir = null, structural = false) {
    return this.destructo.damageSphere(pos, radius, dmg, dir, structural);
  }
  pointHits(pos) { return this.destructo.pointHits(pos); }
  raySolid(origin, dir, range) { return this.destructo.raySolid(origin, dir, range); }

  collideFighter(f) {
    const B = this.bounds;
    f.pos.x = clamp(f.pos.x, -B, B);
    f.pos.z = clamp(f.pos.z, -B, B);
    this.destructo.collideFighter(f);
  }

  spawnPoints(n) {
    const pts = [];
    const r = Math.min(this.bounds * 0.55, 26);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + Math.PI / n;
      pts.push({
        pos: new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r),
        yaw: Math.atan2(-Math.cos(a), -Math.sin(a)),
      });
    }
    return pts;
  }

  update(dt) {
    this.destructo.update(dt);
    for (const g of this.spinners) g.rotation.z += g.userData.spin * dt;

    // ambient particles
    const fx = this.world?.effects;
    if (!fx) return;
    this.ambientT -= dt;
    if (this.ambientT <= 0) {
      this.ambientT = 0.06;
      const B = this.bounds;
      switch (this.theme.ambient) {
        case 'embers':
          fx.glows.emit(rand(-B, B), rand(0.5, 3), rand(-B, B), rand(-1, 1), rand(2, 5), rand(-1, 1),
            { life: rand(1.5, 3), size: rand(0.3, 0.7), color: 0xff7a30, alpha: 0.8, drag: 0.4 });
          break;
        case 'snow':
          for (let i = 0; i < 3; i++) {
            fx.glows.emit(rand(-B, B), rand(18, 30), rand(-B, B), rand(-1.5, 1.5), rand(-5, -3), rand(-1.5, 1.5),
              { life: rand(4, 7), size: rand(0.25, 0.5), color: 0xe8f8ff, alpha: 0.7 });
          }
          break;
        case 'sand':
          fx.smoke.emit(rand(-B, B), rand(0.3, 2), rand(-B, B), rand(3, 7), rand(0.2, 0.8), rand(-1, 1),
            { life: rand(1.5, 3), size: rand(2, 4), color: 0xc8a878, alpha: 0.1, grow: 1.5 });
          break;
        case 'motes':
          fx.glows.emit(rand(-B, B), rand(1, 14), rand(-B, B), rand(-0.4, 0.4), rand(0.2, 0.8), rand(-0.4, 0.4),
            { life: rand(2, 4), size: rand(0.2, 0.45), color: this.theme.ground.accent || 0x53e8ff, alpha: 0.6 });
          break;
        case 'leaves':
          fx.glows.emit(rand(-B, B), rand(8, 16), rand(-B, B), rand(-2, 2), rand(-2.5, -1), rand(-2, 2),
            { life: rand(3, 5), size: rand(0.25, 0.45), color: 0x8adf70, alpha: 0.55 });
          break;
        case 'clouds':
          if (Math.random() < 0.25) {
            const a = rand(Math.PI * 2), r = rand(B * 1.2, B * 2.2);
            fx.smoke.emit(Math.cos(a) * r, rand(-6, -2), Math.sin(a) * r, rand(1, 3), 0.1, rand(1, 3),
              { life: rand(4, 8), size: rand(10, 20), color: 0xe8f0f8, alpha: 0.25, grow: 0.4 });
          }
          break;
      }
      // steam vents
      for (const s of this.steamSpots) {
        if (Math.random() < 0.35) fx.steamVent(s);
      }
    }
  }

  dispose() {
    for (const o of this.objects) {
      this.scene.remove(o);
      o.traverse?.((c) => {
        if (c.isMesh) {
          c.geometry?.dispose();
        }
      });
    }
    this.destructo.dispose();
    this.objects.length = 0;
  }
}
