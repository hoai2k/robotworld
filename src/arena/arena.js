// Arena: builds a themed battleground (sky, lights, ground, destructible
// buildings, props, ambient particles) and services combat queries.
import * as THREE from 'three';
import { DestructibleSystem } from './destructible.js';
import { PROPS, PROP_MATS, placeProp } from './props.js';
import { roadTexture, chunkFacade, skyStarsTexture } from '../core/textures.js';
import { rand, makeRng, clamp } from '../core/utils.js';
import { CONFIG } from '../core/config.js';
import { pbrMaterial } from '../core/texload.js';

// texture-pack material names per arena / building style
const GROUND_TEX = {
  neon: 'ground_neon_asphalt', foundry: 'ground_foundry_ironplate',
  uptown: 'ground_uptown_paving', harbor: 'ground_harbor_concrete',
  skyterrace: 'ground_skyterrace_roofpanel', scrapyard: 'ground_scrapyard_dirt',
  quarry: 'ground_quarry_rock', volcano: 'ground_volcano_basalt',
  frozen: 'ground_frozen_snowice', ruins: 'ground_ruins_sandstone',
  jungle: 'ground_jungle_mossstone', orbital: 'ground_orbital_deck',
};
const FACADE_TEX = {
  0: 'bldg_concrete_panel', 1: 'bldg_brick_industrial',
  2: 'bldg_glass_office', 3: 'bldg_steampunk_metal',
};

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
    this.bounds = theme.bounds * 2;   // arenas doubled — more city to wreck
    this.world = null;
    this.objects = [];   // everything we added (for dispose)
    this.spinners = [];  // props with userData.spin
    this.steamSpots = [];
    this.explosives = []; // fuel tanks etc. that cook off when hit
    this.ambientT = 0;
    const rng = makeRng(seed * 31 + theme.id.length * 77);

    // ---- environment ----
    this.sky = makeSkyDome(theme);
    this.scene.add(this.sky);
    this.objects.push(this.sky);
    // fog capped so nothing beyond the ±1-cell ghost tiling is ever visible
    this.scene.fog = new THREE.Fog(theme.fog.color, theme.fog.near * 1.5, Math.min(theme.fog.far * 1.5, 400));
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
    let gmat = null;
    if (CONFIG.useTextures && GROUND_TEX[theme.id]) {
      // pack texture, lightly tinted toward the theme's ground color so
      // arena mood grading survives
      gmat = pbrMaterial('ground', GROUND_TEX[theme.id], {
        repeat: 44,
        color: new THREE.Color(theme.ground.color).lerp(new THREE.Color(0xffffff), 0.55),
      });
    }
    if (!gmat) {
      gmat = new THREE.MeshStandardMaterial({
        color: theme.ground.color, roughness: 0.88, metalness: 0.08,
      });
      if (theme.ground.road) {
        gmat.map = roadTexture();
        gmat.map.repeat.set(7, 7);
        gmat.color.set(0xffffff);
      }
    }
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), gmat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.objects.push(ground);

    // No walls anymore: the arena wraps toroidally at ±wrapHalf (set on the
    // world in bind), out in the foggy empty ring where the seam is subtle.
    const B = this.bounds;
    this.wrapHalf = B * 1.35;

    // ---- skyline backdrop (cheap, far, unlit boxes) ----
    // camera-locked: the engine re-centers it on each view camera before
    // rendering, so it reads as an infinitely distant city and never gets
    // crossed or wrapped (this is what used to look like "grey buildings"
    // popping at the seam).
    const skyMatDark = new THREE.MeshBasicMaterial({ color: new THREE.Color(theme.fog.color).multiplyScalar(0.55) });
    const skyline = new THREE.Group();
    for (let i = 0; i < 40; i++) {
      const a = (i / 40) * Math.PI * 2 + rng.range(-0.05, 0.05);
      const r = rng.range(230, 340);
      const w = rng.range(14, 34), h = rng.range(24, 100), d = rng.range(14, 34);
      const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), skyMatDark);
      m.position.set(Math.cos(a) * r, h / 2 - 2, Math.sin(a) * r);
      m.rotation.y = rng.range(0, Math.PI);
      skyline.add(m);
    }
    this.scene.add(skyline);
    this.objects.push(skyline);
    engine.backdrop = skyline;

    // ---- destructible buildings ----
    const styleIdx = theme.buildings.styles[0];
    let sideMat = null, roofMat = null;
    if (CONFIG.useTextures && FACADE_TEX[styleIdx]) {
      // pack facade: one tile ≈ one floor band, per-chunk face UVs are 0..1
      sideMat = pbrMaterial('building', FACADE_TEX[styleIdx], {
        repeat: 1, emissiveIntensity: theme.buildings.glow ? 0.6 : 0.0,
      });
      roofMat = pbrMaterial('building', 'bldg_roof_gravel', { repeat: 1 });
    }
    if (!sideMat) {
      const facade = chunkFacade(styleIdx, seed);
      sideMat = new THREE.MeshStandardMaterial({
        map: facade.map, roughness: 0.82, metalness: 0.15,
      });
      if (theme.buildings.glow) {
        sideMat.emissiveMap = facade.emissiveMap;
        sideMat.emissive = new THREE.Color(0xffffff);
        sideMat.emissiveIntensity = 0.6;
      }
    }
    if (!roofMat) {
      roofMat = new THREE.MeshStandardMaterial({
        color: 0xb0aca4, roughness: 0.9, metalness: 0.1,
      });
    }
    // box face order: px, nx, py (top), ny, pz, nz
    const chunkMats = [sideMat, sideMat, roofMat, roofMat, sideMat, sideMat];
    this.destructo = new DestructibleSystem(this.scene, chunkMats);
    this.objects.push(this.destructo.mesh, this.destructo.debris.mesh);

    // ring layout: buildings frame the fight zone, several in-field for
    // cover — counts doubled to match the doubled arena footprint
    const count = Math.min(theme.buildings.count * 2, 16);
    const innerCount = 4;
    const placed = [];
    for (let i = 0; i < count; i++) {
      let x, z, ok = false, tries = 0;
      const inner = i >= count - innerCount;
      while (!ok && tries++ < 40) {
        if (!inner) {
          const a = (i / (count - innerCount)) * Math.PI * 2 + rng.range(-0.18, 0.18);
          const r = rng.range(B * 0.72, B * 1.05);
          x = Math.cos(a) * r; z = Math.sin(a) * r;
        } else {
          const a = rng.range(0, Math.PI * 2);
          const r = rng.range(24, B * 0.55);
          x = Math.cos(a) * r; z = Math.sin(a) * r;
        }
        ok = placed.every((p) => Math.hypot(p[0] - x, p[1] - z) > 24);
      }
      if (!ok) continue;
      placed.push([x, z]);
      const nx = rng.int(2, 3), nz = rng.int(2, 3);
      const ny = rng.int(theme.buildings.hRange[0], theme.buildings.hRange[1]);
      const cw = rng.range(3.2, 3.9), ch = rng.range(3.1, 3.6), cd = rng.range(3.2, 3.9);
      let tint = theme.buildings.tints[rng.int(0, theme.buildings.tints.length - 1)];
      if (CONFIG.useTextures && FACADE_TEX[styleIdx]) {
        // pack facades carry their own color — keep only a whisper of tint
        tint = new THREE.Color(tint).lerp(new THREE.Color(0xffffff), 0.68).getHex();
      }
      this.destructo.addBuilding(x, z, nx, ny, nz, cw, ch, cd, { tint, rng });
    }

    // ---- props ----
    // all props live in one group so the toroidal tiling below can clone
    // them into the 8 neighbor cells
    this.propGroup = new THREE.Group();
    this.scene.add(this.propGroup);
    this.objects.push(this.propGroup);
    for (const spec of theme.props || []) {
      for (let i = 0; i < spec.count; i++) {
        const a = rng.range(0, Math.PI * 2);
        const r = rng.range(spec.ring[0], spec.ring[1]) * 1.85; // rings scaled with arena
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        let opts = Array.isArray(spec.opts) ? spec.opts[i % spec.opts.length] : { ...(spec.opts || {}) };
        opts = { ...opts, seed: rng.int(1, 99999) };
        if (opts.mat === 'ice') opts.mat = PROP_MATS.ice;
        const g = placeProp(this.propGroup, this.objects, spec.name, x, z, opts);
        if (g && g.userData.spin) this.spinners.push(g);
        if (g && g.userData.steamY !== undefined) {
          this.steamSpots.push(new THREE.Vector3(x, g.userData.steamY, z));
        }
        if (g && g.userData.explosive) {
          const e = g.userData.explosive;
          this.explosives.push({ group: g, x, z, r: e.r, hp: e.hp, top: e.top || 6, dead: false });
        }
      }
    }
    // ghost copies of the props in the 8 neighbor cells (static)
    {
      const P = this.wrapHalf * 2;
      for (let gx = -1; gx <= 1; gx++) {
        for (let gz = -1; gz <= 1; gz++) {
          if (!gx && !gz) continue;
          const ghost = this.propGroup.clone();
          ghost.position.set(gx * P, 0, gz * P);
          this.scene.add(ghost);
          this.objects.push(ghost);
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
    world.wrapHalf = this.wrapHalf;
    this.destructo.setWrapPeriod(this.wrapHalf * 2);
  }

  // ---- combat services ----
  damageSphere(pos, radius, dmg, dir = null, structural = false) {
    return this.destructo.damageSphere(pos, radius, dmg, dir, structural);
  }
  pointHits(pos) { return this.destructo.pointHits(pos); }
  raySolid(origin, dir, range) { return this.destructo.raySolid(origin, dir, range); }
  setOccluders(segments) { this.destructo.setOccluders(segments); }

  collideFighter(f) {
    // no boundary clamp — space wraps; only buildings + settled rubble push back
    this.destructo.collideFighter(f);
  }

  // ---- explosive props (fuel tanks): cook off into a fiery inferno ----
  // Detonate any live explosive whose blast radius is reached by an impact
  // at `pos` (melee/projectile/other explosion). Returns how many went up.
  hitExplosives(pos, radius = 0) {
    let n = 0;
    for (const e of this.explosives) {
      if (e.dead) continue;
      const dx = this.world ? this.world.wrapDelta(e.x - pos.x) : e.x - pos.x;
      const dz = this.world ? this.world.wrapDelta(e.z - pos.z) : e.z - pos.z;
      if (dx * dx + dz * dz < (radius + e.r * 0.4) ** 2) { this.detonateExplosive(e); n++; }
    }
    return n;
  }

  detonateExplosive(e) {
    if (e.dead || !this.world) return;
    e.dead = true;
    const w = this.world;
    const pos = new THREE.Vector3(e.x, Math.min(3, e.top * 0.5), e.z);
    w.audio?.play('explosionBig');
    w.effects.explosion(pos, e.r * 0.9, { color: 0xff7020 });
    w.effects.explosion(pos.clone().setY(pos.y + 2), e.r * 0.5, { color: 0xffd050, smoke: false });
    w.effects.addShake(0.9);
    w.engine.addHitStop(0.07);
    // rolling fireball glows
    for (let i = 0; i < 14; i++) {
      const a = rand(Math.PI * 2), rr = rand(0, e.r * 0.7);
      w.effects.glows.emit(e.x + Math.cos(a) * rr, rand(0.5, e.top), e.z + Math.sin(a) * rr,
        rand(-3, 3), rand(3, 9), rand(-3, 3), { life: rand(0.5, 1.1), size: rand(1.6, 3.2), color: 0xff7a20, alpha: 0.9 });
    }
    // AoE: scorch every fighter caught in the blast, set them ablaze
    for (const f of w.fighters) {
      if (!f.alive) continue;
      const dx = w.wrapDelta(f.pos.x - e.x), dz = w.wrapDelta(f.pos.z - e.z);
      const d = Math.hypot(dx, dz);
      if (d < e.r && Math.abs(f.pos.y - pos.y) < e.top + 3) {
        const fall = 1 - d / e.r;
        f.takeHit(70 * Math.max(0.3, fall), null, {
          knock: 20 * fall, launch: 9 * fall, srcPos: pos, heavy: true,
          status: { burn: 12, burnT: 3.5 },
        });
      }
    }
    // wreck nearby building chunks and leave a burning crater
    this.damageSphere(pos, e.r * 0.8, 160, null, true);
    w.addFirePatch(null, new THREE.Vector3(e.x, 0, e.z), e.r * 0.55, 5, 14);
    e.group.visible = false;
    // chain-react other tanks in range a beat later
    for (const o of this.explosives) {
      if (o.dead || o === e) continue;
      const dx = o.x - e.x, dz = o.z - e.z;
      if (Math.hypot(dx, dz) < e.r * 1.1) w.schedule(rand(0.08, 0.2), () => this.detonateExplosive(o));
    }
  }

  // per-frame: a fighter running into a tank, or a projectile striking it,
  // sets it off
  updateExplosives() {
    if (!this.world || !this.explosives.length) return;
    for (const e of this.explosives) {
      if (e.dead) continue;
      const contact = e.r * 0.32;
      let boom = false;
      for (const f of this.world.fighters) {
        if (!f.alive) continue;
        const dx = this.world.wrapDelta(f.pos.x - e.x), dz = this.world.wrapDelta(f.pos.z - e.z);
        if (dx * dx + dz * dz < (contact + f.radius) ** 2 && f.pos.y < e.top + 2) { boom = true; break; }
      }
      if (!boom) {
        for (const p of this.world.projectiles.active) {
          const dx = this.world.wrapDelta(p.mesh.position.x - e.x), dz = this.world.wrapDelta(p.mesh.position.z - e.z);
          if (dx * dx + dz * dz < (contact + 1.3) ** 2 && p.mesh.position.y < e.top + 1.5) { boom = true; break; }
        }
      }
      if (boom) this.detonateExplosive(e);
    }
  }

  spawnPoints(n) {
    const pts = [];
    const r = Math.min(this.bounds * 0.4, 34);
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
    this.updateExplosives();
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
