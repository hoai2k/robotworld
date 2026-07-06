// Static arena props (non-destructible dressing placed around the fight zone).
// Each builder returns a THREE.Group. Kept chunky & readable from far away.
import * as THREE from 'three';
import { rand, makeRng } from '../core/utils.js';

const M = {
  steel: new THREE.MeshStandardMaterial({ color: 0x5a6068, roughness: 0.5, metalness: 0.85 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: 0x2c3036, roughness: 0.6, metalness: 0.8 }),
  brass: new THREE.MeshStandardMaterial({ color: 0xa87c3c, roughness: 0.35, metalness: 0.9 }),
  copper: new THREE.MeshStandardMaterial({ color: 0x8c5230, roughness: 0.4, metalness: 0.85 }),
  rust: new THREE.MeshStandardMaterial({ color: 0x6e4a30, roughness: 0.85, metalness: 0.4 }),
  concrete: new THREE.MeshStandardMaterial({ color: 0x8a8a88, roughness: 0.9, metalness: 0.05 }),
  redPaint: new THREE.MeshStandardMaterial({ color: 0x9c3428, roughness: 0.55, metalness: 0.3 }),
  bluePaint: new THREE.MeshStandardMaterial({ color: 0x2e5e8c, roughness: 0.55, metalness: 0.3 }),
  yellowPaint: new THREE.MeshStandardMaterial({ color: 0xc8a028, roughness: 0.55, metalness: 0.3 }),
  glowWarm: new THREE.MeshStandardMaterial({ color: 0xffc060, emissive: 0xffc060, emissiveIntensity: 2 }),
  glowCyan: new THREE.MeshStandardMaterial({ color: 0x53e8ff, emissive: 0x53e8ff, emissiveIntensity: 2 }),
  glowRed: new THREE.MeshStandardMaterial({ color: 0xff4030, emissive: 0xff4030, emissiveIntensity: 2 }),
  glowLava: new THREE.MeshStandardMaterial({ color: 0xff6a20, emissive: 0xff5a10, emissiveIntensity: 2.4 }),
  ice: new THREE.MeshPhysicalMaterial({ color: 0xbfeaff, roughness: 0.15, metalness: 0, transmission: 0.4, transparent: true, opacity: 0.85 }),
  crystal: new THREE.MeshStandardMaterial({ color: 0xb46bff, emissive: 0x8a3cff, emissiveIntensity: 0.9, roughness: 0.2 }),
  sandstone: new THREE.MeshStandardMaterial({ color: 0xc8a878, roughness: 0.9, metalness: 0.02 }),
  foliage: new THREE.MeshStandardMaterial({ color: 0x3c6e38, roughness: 0.9, metalness: 0 }),
  foliageBright: new THREE.MeshStandardMaterial({ color: 0x5a9648, roughness: 0.9, metalness: 0 }),
  wood: new THREE.MeshStandardMaterial({ color: 0x6e5638, roughness: 0.85, metalness: 0 }),
  chrome: new THREE.MeshStandardMaterial({ color: 0xd8dde4, roughness: 0.14, metalness: 1.0 }),
  whitePaint: new THREE.MeshStandardMaterial({ color: 0xe4e6e2, roughness: 0.5, metalness: 0.2 }),
  obsidian: new THREE.MeshStandardMaterial({ color: 0x181420, roughness: 0.12, metalness: 0.35 }),
  moss: new THREE.MeshStandardMaterial({ color: 0x4a7a3c, roughness: 0.95, metalness: 0 }),
  mossyStone: new THREE.MeshStandardMaterial({ color: 0x646c52, roughness: 0.95, metalness: 0.02 }),
  rubber: new THREE.MeshStandardMaterial({ color: 0x24262a, roughness: 0.95, metalness: 0.05 }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0xa8d4e8, roughness: 0.08, metalness: 0.1, transparent: true, opacity: 0.32 }),
  water: new THREE.MeshStandardMaterial({ color: 0x2e86b0, emissive: 0x0e3a55, emissiveIntensity: 0.35, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.85 }),
  glowMagenta: new THREE.MeshStandardMaterial({ color: 0xff4dd8, emissive: 0xff4dd8, emissiveIntensity: 2 }),
  glowGreen: new THREE.MeshStandardMaterial({ color: 0x62ff9a, emissive: 0x62ff9a, emissiveIntensity: 2 }),
  glowViolet: new THREE.MeshStandardMaterial({ color: 0xb46bff, emissive: 0xb46bff, emissiveIntensity: 2 }),
  glowTeal: new THREE.MeshStandardMaterial({ color: 0x2ee6c8, emissive: 0x2ee6c8, emissiveIntensity: 1.6 }),
  lavaCore: new THREE.MeshStandardMaterial({ color: 0xffd040, emissive: 0xffb020, emissiveIntensity: 3.2 }),
};
export const PROP_MATS = M;

function box(mat, w, h, d, x = 0, y = 0, z = 0, ry = 0) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  m.rotation.y = ry;
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}
function cyl(mat, rt, rb, h, x = 0, y = 0, z = 0, seg = 12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

export const PROPS = {
  smokestack(o = {}) {
    const g = new THREE.Group();
    const h = o.h || rand(18, 30);
    g.add(cyl(M.rust, 1.4, 2.2, h, 0, h / 2, 0));
    g.add(cyl(M.darkSteel, 1.6, 1.6, 1.2, 0, h, 0));
    for (let i = 1; i < 4; i++) g.add(cyl(M.darkSteel, 2.24 - i * 0.2, 2.26 - i * 0.2, 0.5, 0, (h / 4) * i, 0));
    g.userData.steamY = h + 0.8; // arena emits steam from the top
    return g;
  },
  gear(o = {}) {
    const g = new THREE.Group();
    const r = o.r || rand(3, 5.5);
    const core = new THREE.Mesh(new THREE.CylinderGeometry(r, r, 0.8, 24), M.brass);
    core.rotation.x = Math.PI / 2;
    core.castShadow = true;
    g.add(core);
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const tooth = box(M.brass, 0.8, 0.9, 1.1, Math.cos(a) * (r + 0.4), Math.sin(a) * (r + 0.4), 0);
      tooth.rotation.z = a;
      g.add(tooth);
    }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.25, r * 0.25, 1.1, 12), M.copper);
    hub.rotation.x = Math.PI / 2;
    g.add(hub);
    g.userData.spin = o.spin ?? rand(0.1, 0.35) * (Math.random() < 0.5 ? -1 : 1);
    g.position.y = r + 0.6;
    return g;
  },
  crane(o = {}) {
    const g = new THREE.Group();
    const h = o.h || 22, arm = o.arm || 16;
    g.add(box(M.yellowPaint, 1.4, h, 1.4, 0, h / 2, 0));
    g.add(box(M.yellowPaint, 1.1, 1.1, arm, 0, h, arm / 2 - 2));
    g.add(box(M.yellowPaint, 1.1, 1.1, 6, 0, h, -4.4));
    g.add(box(M.darkSteel, 2.2, 2, 2.4, 0, h - 1.6, -3));
    const cable = cyl(M.darkSteel, 0.06, 0.06, 7, 0, h - 3.5, arm - 4);
    g.add(cable);
    g.add(box(M.darkSteel, 1.6, 1.2, 1.6, 0, h - 7.4, arm - 4));
    return g;
  },
  container(o = {}) {
    const g = new THREE.Group();
    const mats = [M.redPaint, M.bluePaint, M.yellowPaint, M.rust];
    const rng = makeRng(o.seed || (Math.random() * 1e6) | 0);
    const n = o.n || rng.int(1, 3);
    for (let i = 0; i < n; i++) {
      const c = box(mats[rng.int(0, 3)], 3.2, 2.9, 8, rng.range(-1.5, 1.5), 1.45 + i * 2.9, rng.range(-1, 1), rng.range(-0.2, 0.2));
      g.add(c);
    }
    return g;
  },
  streetlight(o = {}) {
    const g = new THREE.Group();
    g.add(cyl(M.darkSteel, 0.12, 0.18, 9, 0, 4.5, 0, 8));
    g.add(box(M.darkSteel, 0.16, 0.16, 2.2, 0, 9, 1));
    const lamp = box(o.cold ? M.glowCyan : M.glowWarm, 0.5, 0.18, 1, 0, 8.9, 1.9);
    g.add(lamp);
    return g;
  },
  pipes(o = {}) {
    const g = new THREE.Group();
    const rng = makeRng(o.seed || (Math.random() * 1e6) | 0);
    const len = o.len || 14;
    for (let i = 0; i < 3; i++) {
      const r = rng.range(0.3, 0.55);
      const p = cyl(i === 1 ? M.copper : M.steel, r, r, len, rng.range(-1, 1), 0.8 + i * 1.1, 0);
      p.rotation.z = Math.PI / 2;
      g.add(p);
      if (i === 1) {
        const valve = cyl(M.brass, 0.5, 0.5, 0.3, rng.range(-len / 3, len / 3), 0.8 + i * 1.1, 0.5, 10);
        valve.rotation.x = Math.PI / 2;
        g.add(valve);
      }
    }
    for (let x = -len / 2 + 2; x < len / 2; x += 4) {
      g.add(box(M.darkSteel, 0.4, 3.4, 0.4, x, 1.7, 0));
    }
    return g;
  },
  fuelTank(o = {}) {
    const g = new THREE.Group();
    const r = o.r || rand(2.2, 3.2);
    const t = cyl(M.steel, r, r, r * 2.1, 0, r * 1.05, 0, 18);
    g.add(t);
    const dome = new THREE.Mesh(new THREE.SphereGeometry(r, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M.steel);
    dome.position.y = r * 2.1;
    dome.castShadow = true;
    g.add(dome);
    g.add(box(M.rust, 0.6, r * 2.4, 0.6, r + 0.2, r * 1.2, 0));
    const stripe = cyl(M.redPaint, r + 0.02, r + 0.02, 0.5, 0, r * 1.5, 0, 18);
    g.add(stripe);
    return g;
  },
  crystal(o = {}) {
    const g = new THREE.Group();
    const rng = makeRng(o.seed || (Math.random() * 1e6) | 0);
    const mat = o.mat || M.crystal;
    const n = o.n || rng.int(3, 6);
    for (let i = 0; i < n; i++) {
      const h = rng.range(2, o.maxH || 7);
      const c = new THREE.Mesh(new THREE.ConeGeometry(rng.range(0.5, 1.2), h, 5), mat);
      c.position.set(rng.range(-2, 2), h * 0.42, rng.range(-2, 2));
      c.rotation.set(rng.range(-0.35, 0.35), rng.range(0, 6), rng.range(-0.35, 0.35));
      c.castShadow = true;
      g.add(c);
    }
    return g;
  },
  rock(o = {}) {
    const g = new THREE.Group();
    const rng = makeRng(o.seed || (Math.random() * 1e6) | 0);
    const mat = o.mat || (o.color
      ? new THREE.MeshStandardMaterial({ color: o.color, roughness: 0.92, metalness: 0.04 })
      : M.concrete);
    const n = o.n || rng.int(2, 4);
    for (let i = 0; i < n; i++) {
      const r = rng.range(1, o.maxR || 3);
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), mat);
      m.position.set(rng.range(-2.5, 2.5), r * 0.6, rng.range(-2.5, 2.5));
      m.rotation.set(rng.range(0, 3), rng.range(0, 3), rng.range(0, 3));
      m.scale.y = rng.range(0.5, 0.85);
      m.castShadow = true;
      g.add(m);
    }
    return g;
  },
  antennaTower(o = {}) {
    const g = new THREE.Group();
    const h = o.h || 20;
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = cyl(M.darkSteel, 0.15, 0.25, h, Math.cos(a) * 1.4, h / 2, Math.sin(a) * 1.4, 6);
      leg.rotation.z = Math.cos(a) * 0.12;
      leg.rotation.x = -Math.sin(a) * 0.12;
      g.add(leg);
    }
    g.add(cyl(M.steel, 0.1, 0.1, h * 0.5, 0, h + h * 0.25, 0, 6));
    g.add(new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), M.glowRed)).children.at(-1);
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.35, 8, 6), M.glowRed);
    beacon.position.y = h * 1.5;
    g.add(beacon);
    return g;
  },
  billboard(o = {}) {
    const g = new THREE.Group();
    const w = o.w || 10, h = o.h || 5.5;
    g.add(box(M.darkSteel, 0.5, 12, 0.5, 0, 6, 0));
    const panel = box(M.darkSteel, w, h, 0.4, 0, 12 + h / 2 - 2, 0);
    g.add(panel);
    const face = new THREE.Mesh(
      new THREE.PlaneGeometry(w - 0.6, h - 0.6),
      new THREE.MeshStandardMaterial({
        color: o.color || 0x53e8ff, emissive: o.color || 0x53e8ff, emissiveIntensity: 1.5, side: THREE.DoubleSide,
      })
    );
    face.position.set(0, 12 + h / 2 - 2, 0.25);
    g.add(face);
    return g;
  },
  tree(o = {}) {
    const g = new THREE.Group();
    const h = o.h || rand(6, 9);
    g.add(cyl(M.wood, 0.25, 0.4, h, 0, h / 2, 0, 7));
    const mat = o.mat || M.foliage;
    for (let i = 0; i < 3; i++) {
      const r = (1.1 - i * 0.25) * (o.r || 2.4);
      const c = new THREE.Mesh(new THREE.ConeGeometry(r, r * 1.4, 8), mat);
      c.position.y = h * 0.62 + i * r * 0.85;
      c.castShadow = true;
      g.add(c);
    }
    return g;
  },
  ruinColumn(o = {}) {
    const g = new THREE.Group();
    const h = o.h || rand(4, 9);
    const mat = o.mat || M.sandstone;
    g.add(cyl(mat, 0.9, 1.1, h, 0, h / 2, 0, 10));
    g.add(box(mat, 2.6, 0.6, 2.6, 0, 0.3, 0));
    if (Math.random() < 0.6) g.add(box(mat, 2.4, 0.5, 2.4, 0, h + 0.25, 0));
    return g;
  },
  barrierPylon(o = {}) {
    const g = new THREE.Group();
    g.add(box(M.darkSteel, 1.2, 5.5, 1.2, 0, 2.75, 0));
    const glow = box(o.mat || M.glowCyan, 0.5, 4.5, 0.5, 0, 3, 0);
    g.add(glow);
    return g;
  },

  // ---- neon ----
  holoPillar(o = {}) {
    // Holographic ad column: crossed translucent emissive planes over a steel mast.
    const g = new THREE.Group();
    const col = new THREE.Color(o.color || 0x53e8ff);
    g.add(cyl(M.darkSteel, 1.0, 1.3, 1.2, 0, 0.6, 0, 10));
    g.add(cyl(M.steel, 0.28, 0.34, 11.5, 0, 6.3, 0, 8));
    const holoMat = new THREE.MeshStandardMaterial({
      color: col, emissive: col, emissiveIntensity: 1.7,
      transparent: true, opacity: 0.5, side: THREE.DoubleSide, depthWrite: false,
    });
    for (let i = 0; i < 2; i++) {
      const p = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 6.2), holoMat);
      p.position.y = 7.4;
      p.rotation.y = i * Math.PI / 2;
      g.add(p);
    }
    const capMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 2.4 });
    g.add(cyl(capMat, 0.42, 0.42, 0.3, 0, 10.8, 0, 10));
    g.add(cyl(capMat, 0.42, 0.42, 0.3, 0, 4.0, 0, 10));
    return g;
  },
  noodleKiosk(o = {}) {
    // Late-night noodle stand: hut, tilted awning, glowing sign, paper lanterns.
    const g = new THREE.Group();
    g.add(box(M.wood, 3.6, 2.5, 2.8, 0, 1.25, 0));
    g.add(box(M.darkSteel, 3.8, 0.25, 3.0, 0, 2.6, 0));
    const awning = box(M.redPaint, 4.2, 0.16, 1.7, 0, 3.2, 1.9);
    awning.rotation.x = 0.32;
    g.add(awning);
    const signMat = new THREE.MeshStandardMaterial({
      color: o.color || 0xffb43c, emissive: o.color || 0xffb43c, emissiveIntensity: 1.7, side: THREE.DoubleSide,
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 0.8), signMat);
    sign.position.set(0, 3.05, 1.52);
    g.add(sign);
    for (const sx of [-1.6, 1.6]) {
      const lan = new THREE.Mesh(new THREE.SphereGeometry(0.32, 8, 6), M.glowWarm);
      lan.position.set(sx, 2.25, 1.55);
      g.add(lan);
    }
    g.add(box(M.wood, 3.4, 0.18, 0.8, 0, 1.05, 1.7));
    for (const sx of [-1.1, 0, 1.1]) g.add(cyl(M.darkSteel, 0.28, 0.28, 0.75, sx, 0.38, 2.4, 8));
    g.userData.steamY = 2.9; // cooking steam
    return g;
  },
  railSegment(o = {}) {
    // Elevated monorail segment on concrete pylons with a glowing guide strip.
    const g = new THREE.Group();
    const len = o.len || 26;
    for (const zz of [-len * 0.32, len * 0.32]) {
      g.add(box(M.concrete, 1.6, 7.2, 1.6, 0, 3.6, zz));
      g.add(box(M.concrete, 2.4, 0.6, 2.4, 0, 7.4, zz));
    }
    g.add(box(M.concrete, 3.0, 1.1, len, 0, 8.25, 0));
    g.add(box(M.darkSteel, 0.9, 0.55, len, 0, 9.05, 0));
    for (const sx of [-1.25, 1.25]) g.add(box(M.steel, 0.16, 0.9, len, sx, 9.15, 0));
    const stripMat = new THREE.MeshStandardMaterial({
      color: o.color || 0x53e8ff, emissive: o.color || 0x53e8ff, emissiveIntensity: 1.8,
    });
    for (const sx of [-1.52, 1.52]) g.add(box(stripMat, 0.06, 0.22, len, sx, 8.35, 0));
    return g;
  },

  // ---- foundry ----
  moltenChannel(o = {}) {
    // Open trough carrying molten metal, on short legs, with a bright core strip.
    const g = new THREE.Group();
    const len = o.len || 15;
    g.add(box(M.darkSteel, 2.2, 0.35, len, 0, 0.9, 0));
    for (const sx of [-1.05, 1.05]) g.add(box(M.rust, 0.28, 1.0, len, sx, 1.35, 0));
    g.add(box(M.glowLava, 1.55, 0.3, len - 0.6, 0, 1.15, 0));
    g.add(box(M.lavaCore, 0.7, 0.32, len - 1.6, 0, 1.17, 0));
    for (let zz = -len / 2 + 1.5; zz < len / 2; zz += 4.5) {
      g.add(box(M.darkSteel, 1.8, 0.9, 0.4, 0, 0.45, zz));
    }
    const spout = box(M.rust, 1.2, 0.8, 1.6, 0, 0.9, len / 2 + 0.5);
    spout.rotation.x = 0.4;
    g.add(spout);
    return g;
  },
  pistonRig(o = {}) {
    // Giant piston assembly venting steam from its head.
    const g = new THREE.Group();
    g.add(box(M.darkSteel, 4.6, 1.1, 4.6, 0, 0.55, 0));
    g.add(cyl(M.steel, 1.8, 2.0, 5.2, 0, 3.7, 0, 14));
    g.add(cyl(M.rust, 2.1, 2.1, 0.7, 0, 6.3, 0, 14));
    g.add(cyl(M.brass, 0.55, 0.55, 3.6, 0, 8.1, 0, 10));
    g.add(box(M.darkSteel, 2.6, 1.3, 2.6, 0, 10.1, 0));
    const p1 = cyl(M.copper, 0.32, 0.32, 4.5, 2.4, 2.6, 0, 8);
    p1.rotation.z = 0.5;
    g.add(p1);
    const p2 = cyl(M.steel, 0.28, 0.28, 4.0, -2.3, 2.4, 0.6, 8);
    p2.rotation.z = -0.55;
    g.add(p2);
    g.add(box(M.glowLava, 0.5, 0.5, 0.1, 0, 2.2, 2.02));
    g.add(cyl(M.brass, 0.4, 0.4, 0.25, 1.4, 6.75, 1.4, 8));
    g.userData.steamY = 10.9;
    return g;
  },
  chainHoist(o = {}) {
    // A-frame gantry with chains and a swinging scrap cube.
    const g = new THREE.Group();
    const h = o.h || 9.5, span = o.span || 8;
    for (const sz of [-1, 1]) {
      for (const sx of [-1, 1]) {
        const leg = box(M.rust, 0.55, h, 0.55, sx * span * 0.5, h / 2, sz * 1.9);
        leg.rotation.z = -sx * 0.16;
        g.add(leg);
      }
      g.add(box(M.rust, span * 0.62, 0.4, 0.4, 0, h * 0.45, sz * 1.9));
    }
    g.add(box(M.darkSteel, span * 0.9, 0.7, 4.4, 0, h + 0.2, 0));
    g.add(cyl(M.darkSteel, 0.09, 0.09, 3.4, -1.2, h - 1.8, 0, 6));
    g.add(cyl(M.darkSteel, 0.09, 0.09, 3.4, 1.2, h - 1.8, 0, 6));
    const cube = box(M.rust, 2.2, 2.0, 2.2, 0, h - 4.4, 0, 0.5);
    g.add(cube);
    g.add(box(M.darkSteel, 1.0, 0.5, 1.0, 0, h - 3.3, 0));
    return g;
  },

  // ---- harbor ----
  lighthouse(o = {}) {
    // Striped beacon tower with a glowing lamp room.
    const g = new THREE.Group();
    const h = o.h || 15;
    g.add(cyl(M.concrete, 2.6, 3.2, 1.2, 0, 0.6, 0, 14));
    g.add(cyl(M.whitePaint, 1.5, 2.3, h, 0, h / 2 + 1, 0, 14));
    g.add(cyl(M.redPaint, 2.06, 2.18, h * 0.18, 0, h * 0.3, 0, 14));
    g.add(cyl(M.redPaint, 1.7, 1.82, h * 0.18, 0, h * 0.72, 0, 14));
    g.add(cyl(M.darkSteel, 2.0, 2.0, 0.35, 0, h + 1.2, 0, 14));
    const lampMat = new THREE.MeshStandardMaterial({ color: 0xffd870, emissive: 0xffc850, emissiveIntensity: 3.0 });
    g.add(cyl(lampMat, 1.05, 1.05, 1.5, 0, h + 2.1, 0, 12));
    g.add(cyl(M.darkSteel, 0.2, 1.3, 1.0, 0, h + 3.3, 0, 12));
    const tip = new THREE.Mesh(new THREE.SphereGeometry(0.18, 6, 5), M.glowRed);
    tip.position.set(0, h + 3.95, 0);
    g.add(tip);
    return g;
  },
  boatHull(o = {}) {
    // Beached / dry-docked fishing boat listing to one side.
    const g = new THREE.Group();
    const hull = box(M.bluePaint, 3.4, 2.6, 11, 0, 1.0, 0);
    hull.rotation.z = 0.24;
    g.add(hull);
    const keel = box(M.redPaint, 3.5, 0.9, 11.1, 0, 0.15, 0);
    keel.rotation.z = 0.24;
    g.add(keel);
    const bow = box(M.bluePaint, 2.5, 2.4, 2.5, 0.25, 1.15, 6.1, Math.PI / 4);
    bow.rotation.z = 0.24;
    g.add(bow);
    const cabin = box(M.whitePaint, 2.4, 1.7, 3.0, -0.35, 3.0, -2.4);
    cabin.rotation.z = 0.24;
    g.add(cabin);
    g.add(box(M.rust, 2.5, 0.5, 3.1, -0.5, 3.9, -2.4, 0.05));
    const mast = cyl(M.wood, 0.12, 0.16, 6.5, 0.6, 5.2, 1.8, 7);
    mast.rotation.z = 0.3;
    g.add(mast);
    return g;
  },
  buoy(o = {}) {
    const g = new THREE.Group();
    g.add(cyl(M.redPaint, 0.9, 1.25, 1.6, 0, 0.8, 0, 10));
    g.add(cyl(M.whitePaint, 0.55, 0.9, 1.0, 0, 2.05, 0, 10));
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      g.add(cyl(M.darkSteel, 0.05, 0.05, 1.4, Math.cos(a) * 0.35, 3.15, Math.sin(a) * 0.35, 5));
    }
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 6), M.glowRed);
    lamp.position.y = 3.95;
    g.add(lamp);
    return g;
  },

  // ---- skyterrace ----
  helipad(o = {}) {
    // Rooftop helipad disc with an H marking and corner lights.
    const g = new THREE.Group();
    g.add(cyl(M.darkSteel, 6.6, 6.9, 0.35, 0, 0.18, 0, 24));
    const ring = new THREE.Mesh(new THREE.RingGeometry(5.4, 6.1, 24),
      new THREE.MeshStandardMaterial({ color: 0xffb43c, emissive: 0xffb43c, emissiveIntensity: 0.9, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.37;
    g.add(ring);
    const hMat = new THREE.MeshStandardMaterial({ color: 0xf0f4f8, emissive: 0xd8e4f0, emissiveIntensity: 0.55 });
    g.add(box(hMat, 0.8, 0.06, 3.6, -1.2, 0.39, 0));
    g.add(box(hMat, 0.8, 0.06, 3.6, 1.2, 0.39, 0));
    g.add(box(hMat, 1.6, 0.06, 0.8, 0, 0.39, 0));
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      g.add(box(M.glowCyan, 0.35, 0.3, 0.35, Math.cos(a) * 6.3, 0.42, Math.sin(a) * 6.3));
    }
    return g;
  },
  hvacUnit(o = {}) {
    // Rooftop air handler cluster: big housing, twin fan drums, duct run.
    const g = new THREE.Group();
    g.add(box(M.steel, 4.4, 2.4, 3.2, 0, 1.2, 0));
    g.add(box(M.darkSteel, 4.5, 0.25, 3.3, 0, 2.5, 0));
    for (const sx of [-1.1, 1.1]) {
      g.add(cyl(M.darkSteel, 1.0, 1.0, 0.5, sx, 2.85, 0, 14));
      g.add(cyl(M.rubber, 0.82, 0.82, 0.54, sx, 2.88, 0, 14));
    }
    const duct = box(M.steel, 1.1, 1.1, 4.2, 2.9, 0.8, 0.4);
    g.add(duct);
    g.add(box(M.steel, 1.1, 1.6, 1.1, 2.9, 0.8, 2.5));
    g.add(box(M.yellowPaint, 0.5, 1.0, 0.14, -2.26, 1.0, 0));
    g.userData.steamY = 3.1;
    return g;
  },
  glassRail(o = {}) {
    // Run of rooftop glass balustrade panels.
    const g = new THREE.Group();
    const n = o.n || 4, w = 3.1;
    const len = n * (w + 0.25);
    g.add(box(M.concrete, len + 0.6, 0.45, 0.7, 0, 0.22, 0));
    for (let i = 0; i <= n; i++) {
      g.add(box(M.steel, 0.18, 2.0, 0.18, -len / 2 + i * (w + 0.25), 1.35, 0));
    }
    for (let i = 0; i < n; i++) {
      const p = box(M.glass, w, 1.6, 0.1, -len / 2 + (w + 0.25) * (i + 0.5), 1.35, 0);
      p.castShadow = false;
      g.add(p);
    }
    g.add(box(M.steel, len + 0.4, 0.14, 0.24, 0, 2.42, 0));
    return g;
  },

  // ---- scrapyard ----
  mechWreck(o = {}) {
    // Fallen mech torso half-buried in the dirt — one eye still faintly lit.
    const g = new THREE.Group();
    const rng = makeRng(o.seed || (Math.random() * 1e6) | 0);
    const chest = box(M.rust, 5.4, 3.6, 2.8, 0, 1.2, 0);
    chest.rotation.x = -0.55 + rng.range(-0.1, 0.1);
    g.add(chest);
    g.add(box(M.darkSteel, 3.4, 0.9, 0.5, 0, 2.1, 1.35, 0.06));
    const head = box(M.rust, 1.7, 1.4, 1.6, 0.3, 3.15, -0.9);
    head.rotation.set(-0.4, 0.3, 0.12);
    g.add(head);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0xff4030, emissive: 0xff3020, emissiveIntensity: 1.4 });
    const eye = box(eyeMat, 1.1, 0.22, 0.1, 0.32, 3.2, -0.12);
    eye.rotation.set(-0.4, 0.3, 0.12);
    g.add(eye);
    const pauldron = box(M.darkSteel, 2.0, 1.8, 2.4, -3.4, 2.0, -0.4);
    pauldron.rotation.z = 0.5;
    g.add(pauldron);
    const arm = box(M.rust, 1.2, 1.1, 4.6, 3.6, 0.55, 1.6, rng.range(0.3, 0.9));
    g.add(arm);
    const fist = box(M.darkSteel, 1.4, 1.0, 1.4, 5.1, 0.5, 3.2, 0.4);
    g.add(fist);
    for (let i = 0; i < 3; i++) {
      const r = rng.range(0.7, 1.4);
      const deb = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), M.rust);
      deb.position.set(rng.range(-4, 4), r * 0.4, rng.range(-3, 3));
      deb.rotation.set(rng.range(0, 3), rng.range(0, 3), 0);
      deb.castShadow = true;
      g.add(deb);
    }
    return g;
  },
  junkPile(o = {}) {
    // Mound of scrap: crushed lumps, tires, a bent pipe, a leaking barrel.
    const g = new THREE.Group();
    const rng = makeRng(o.seed || (Math.random() * 1e6) | 0);
    for (let i = 0; i < 4; i++) {
      const r = rng.range(0.9, 2.1);
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 0), rng.chance(0.5) ? M.rust : M.darkSteel);
      m.position.set(rng.range(-2.2, 2.2), r * 0.55, rng.range(-2.2, 2.2));
      m.rotation.set(rng.range(0, 3), rng.range(0, 3), rng.range(0, 3));
      m.scale.y = rng.range(0.5, 0.8);
      m.castShadow = true;
      g.add(m);
    }
    for (let i = 0; i < 4; i++) {
      const t = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.3, 7, 14), M.rubber);
      t.position.set(rng.range(-2.6, 2.6), rng.range(0.35, 1.6), rng.range(-2.6, 2.6));
      t.rotation.set(rng.range(0.8, 2.2), rng.range(0, 3), rng.range(0, 1));
      t.castShadow = true;
      g.add(t);
    }
    const pipe = cyl(M.rust, 0.3, 0.3, 5, 0, 1.6, 0, 8);
    pipe.rotation.set(0.4, 0.7, 1.2);
    g.add(pipe);
    const barrel = cyl(M.yellowPaint, 0.6, 0.6, 1.7, 1.8, 0.62, -1.6, 10);
    barrel.rotation.z = 1.35;
    g.add(barrel);
    return g;
  },
  magnetCrane(o = {}) {
    // Tracked scrapyard crane with a lifting magnet and dangling wreck cube.
    const g = new THREE.Group();
    for (const sx of [-1.5, 1.5]) g.add(box(M.rubber, 1.1, 1.1, 5.0, sx, 0.55, 0));
    g.add(box(M.darkSteel, 3.4, 0.5, 3.6, 0, 1.3, 0));
    g.add(box(M.yellowPaint, 2.6, 2.0, 3.4, 0, 2.55, -0.4));
    g.add(box(M.darkSteel, 1.4, 1.2, 1.2, 1.0, 2.4, 1.6));
    const boom = box(M.yellowPaint, 0.8, 0.9, 11, 0, 5.8, 3.4);
    boom.rotation.x = -0.68;
    g.add(boom);
    g.add(cyl(M.darkSteel, 0.06, 0.06, 4.2, 0, 6.3, 6.9, 6));
    g.add(cyl(M.darkSteel, 1.5, 1.7, 0.7, 0, 4.0, 6.9, 14));
    const wreck = box(M.rust, 1.9, 1.6, 1.9, 0, 2.6, 6.9, 0.5);
    g.add(wreck);
    return g;
  },

  // ---- quarry ----
  mineCart(o = {}) {
    // Ore cart on a short run of rails, loaded with glowing crystal.
    const g = new THREE.Group();
    const len = o.len || 12;
    for (let zz = -len / 2 + 0.8; zz < len / 2; zz += 2.2) {
      g.add(box(M.wood, 2.0, 0.16, 0.5, 0, 0.08, zz));
    }
    for (const sx of [-0.72, 0.72]) g.add(box(M.steel, 0.16, 0.2, len, sx, 0.24, 0));
    g.add(box(M.rust, 2.0, 1.3, 2.9, 0, 1.35, 0));
    g.add(box(M.darkSteel, 2.2, 0.18, 3.1, 0, 0.78, 0));
    for (const [sx, sz] of [[-0.85, -1.0], [0.85, -1.0], [-0.85, 1.0], [0.85, 1.0]]) {
      const w = cyl(M.darkSteel, 0.36, 0.36, 0.2, sx, 0.44, sz, 10);
      w.rotation.z = Math.PI / 2;
      g.add(w);
    }
    const oreMat = o.mat || M.crystal;
    for (let i = 0; i < 3; i++) {
      const c = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.3, 5), oreMat);
      c.position.set((i - 1) * 0.55, 2.2, (i % 2) * 0.7 - 0.35);
      c.rotation.set(rand(-0.4, 0.4), rand(0, 6), rand(-0.4, 0.4));
      c.castShadow = true;
      g.add(c);
    }
    return g;
  },
  drillRig(o = {}) {
    // Four-legged derrick driving a drill shaft into the pit floor.
    const g = new THREE.Group();
    const h = o.h || 11;
    g.add(box(M.darkSteel, 4.6, 0.7, 4.6, 0, 0.35, 0));
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
      const leg = box(M.steel, 0.42, h, 0.42, sx * 1.7, h / 2 + 0.3, sz * 1.7);
      leg.rotation.z = -sx * 0.15;
      leg.rotation.x = sz * 0.15;
      g.add(leg);
    }
    g.add(box(M.steel, 3.0, 0.5, 3.0, 0, h + 0.4, 0));
    g.add(box(M.yellowPaint, 1.6, 1.4, 1.8, 0, h + 1.3, 0));
    g.add(cyl(M.darkSteel, 0.32, 0.32, h, 0, h / 2 + 0.3, 0, 10));
    g.add(cyl(M.brass, 0.02, 0.62, 1.1, 0, 0.9, 0, 8));
    const lamp = box(M.glowViolet, 0.5, 0.3, 0.5, 0, h + 2.15, 0);
    g.add(lamp);
    return g;
  },

  // ---- volcano ----
  lavaPool(o = {}) {
    // Molten pool with a white-hot heart and a rim of scorched rock.
    const g = new THREE.Group();
    const rng = makeRng(o.seed || (Math.random() * 1e6) | 0);
    const r = o.r || rng.range(3.6, 5.2);
    g.add(cyl(M.glowLava, r, r * 1.05, 0.3, 0, 0.15, 0, 20));
    g.add(cyl(M.lavaCore, r * 0.45, r * 0.5, 0.34, r * 0.12, 0.16, -r * 0.08, 14));
    const rockMat = new THREE.MeshStandardMaterial({ color: 0x33231c, roughness: 0.95, metalness: 0.05 });
    const n = 8;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng.range(-0.2, 0.2);
      const rr = rng.range(0.8, 1.7);
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(rr, 0), rockMat);
      m.position.set(Math.cos(a) * (r + rr * 0.5), rr * 0.45, Math.sin(a) * (r + rr * 0.5));
      m.rotation.set(rng.range(0, 3), rng.range(0, 3), rng.range(0, 3));
      m.scale.y = rng.range(0.5, 0.8);
      m.castShadow = true;
      g.add(m);
    }
    g.userData.steamY = 0.6;
    return g;
  },
  obsidianSpikes(o = {}) {
    // Cluster of razor black glass shards with embers at their feet.
    const g = new THREE.Group();
    const rng = makeRng(o.seed || (Math.random() * 1e6) | 0);
    const n = o.n || rng.int(4, 6);
    for (let i = 0; i < n; i++) {
      const h = rng.range(3, 8.5);
      const c = new THREE.Mesh(new THREE.ConeGeometry(rng.range(0.5, 1.1), h, 5), M.obsidian);
      c.position.set(rng.range(-2.4, 2.4), h * 0.4, rng.range(-2.4, 2.4));
      c.rotation.set(rng.range(-0.4, 0.4), rng.range(0, 6), rng.range(-0.4, 0.4));
      c.castShadow = true;
      g.add(c);
    }
    for (let i = 0; i < 2; i++) {
      g.add(box(M.glowLava, rng.range(0.4, 0.8), 0.16, rng.range(0.4, 0.8), rng.range(-2, 2), 0.08, rng.range(-2, 2), rng.range(0, 3)));
    }
    return g;
  },

  // ---- frozen ----
  radarDome(o = {}) {
    // Arctic radome station: white sphere on a bunker base.
    const g = new THREE.Group();
    g.add(box(M.steel, 4.6, 1.6, 4.6, 0, 0.8, 0));
    g.add(box(M.whitePaint, 3.8, 0.5, 3.8, 0, 1.85, 0));
    const domeMat = new THREE.MeshStandardMaterial({ color: 0xe8f0f6, roughness: 0.45, metalness: 0.1 });
    const dome = new THREE.Mesh(new THREE.SphereGeometry(2.4, 18, 12), domeMat);
    dome.position.y = 3.6;
    dome.castShadow = true;
    g.add(dome);
    g.add(box(M.darkSteel, 1.1, 1.2, 0.3, 0, 0.7, 2.35));
    g.add(cyl(M.darkSteel, 0.06, 0.06, 2.6, 1.9, 3.2, 1.9, 5));
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 6, 5), M.glowCyan);
    lamp.position.set(1.9, 4.6, 1.9);
    g.add(lamp);
    return g;
  },
  aurora(o = {}) {
    // Cheap aurora: additive curtains hung in a wide ring around the arena,
    // so some part of it is on screen from any camera azimuth. Place once,
    // near the origin (ring [0, 6]).
    const g = new THREE.Group();
    const rng = makeRng(o.seed || (Math.random() * 1e6) | 0);
    const cols = [0x46ffa0, 0x38e8c8, 0x9a6bff, 0x46ffa0, 0x38e8c8];
    const n = 5;
    for (let i = 0; i < n; i++) {
      const mat = new THREE.MeshStandardMaterial({
        color: 0x000000, emissive: cols[i], emissiveIntensity: 1.5,
        transparent: true, opacity: 0.2 + (i % 3) * 0.04, side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending, depthWrite: false, fog: false,
      });
      const a = (i / n) * Math.PI * 2 + rng.range(-0.25, 0.25);
      const r = rng.range(95, 130);
      const p = new THREE.Mesh(new THREE.PlaneGeometry(rng.range(80, 120), rng.range(20, 30)), mat);
      p.position.set(Math.cos(a) * r, rng.range(36, 50), Math.sin(a) * r);
      p.rotation.set(rng.range(-0.1, 0.1), -a + Math.PI / 2 + rng.range(-0.3, 0.3), rng.range(-0.08, 0.08));
      g.add(p);
    }
    return g;
  },

  // ---- ruins ----
  brokenStatue(o = {}) {
    // Toppled colossus: torso still on the plinth, head fallen in the sand.
    const g = new THREE.Group();
    const mat = o.mat || M.sandstone;
    g.add(box(mat, 4.2, 0.8, 4.2, 0, 0.4, 0));
    g.add(box(mat, 3.2, 0.9, 3.2, 0, 1.2, 0));
    const torso = box(mat, 2.4, 3.2, 1.6, 0, 3.1, 0, 0.3);
    torso.rotation.z = 0.12;
    g.add(torso);
    const arm = box(mat, 0.85, 2.8, 0.85, -1.5, 5.0, 0.2);
    arm.rotation.z = 0.55;
    g.add(arm);
    g.add(box(mat, 1.15, 1.0, 1.0, 1.35, 4.35, 0, 0.2));
    const head = box(mat, 1.5, 1.7, 1.5, 3.4, 0.75, 1.8);
    head.rotation.set(0.9, 0.5, 0.35);
    g.add(head);
    g.add(box(mat, 1.0, 0.7, 0.9, 2.4, 0.3, -1.6, 0.7));
    return g;
  },
  obelisk(o = {}) {
    // Four-sided needle with softly glowing glyph channels.
    const g = new THREE.Group();
    const h = o.h || 10;
    const mat = o.mat || M.sandstone;
    g.add(box(mat, 3.0, 0.7, 3.0, 0, 0.35, 0));
    g.add(box(mat, 2.2, 0.6, 2.2, 0, 1.0, 0));
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 1.05, h, 4), mat);
    shaft.position.y = h / 2 + 1.3;
    shaft.rotation.y = Math.PI / 4;
    shaft.castShadow = true;
    g.add(shaft);
    const tip = new THREE.Mesh(new THREE.ConeGeometry(0.68, 1.2, 4), mat);
    tip.position.y = h + 1.85;
    tip.rotation.y = Math.PI / 4;
    tip.castShadow = true;
    g.add(tip);
    const glyphMat = new THREE.MeshStandardMaterial({ color: 0x2ee6c8, emissive: 0x2ee6c8, emissiveIntensity: 1.1 });
    g.add(box(glyphMat, 0.2, h * 0.62, 0.06, 0, h * 0.5 + 1.2, 0.86));
    g.add(box(glyphMat, 0.06, h * 0.5, 0.2, 0.8, h * 0.45 + 1.2, 0));
    return g;
  },
  sarcophagus(o = {}) {
    // Excavated stone coffin, lid shoved ajar.
    const g = new THREE.Group();
    const mat = o.mat || M.sandstone;
    g.add(box(mat, 2.6, 0.4, 4.6, 0, 0.2, 0));
    g.add(box(mat, 2.1, 1.3, 4.0, 0, 1.05, 0));
    const lid = box(mat, 2.2, 0.45, 4.1, 0.55, 1.85, -0.3, 0.14);
    lid.rotation.z = 0.1;
    g.add(lid);
    g.add(box(M.brass, 2.15, 0.18, 0.5, 0, 1.1, 1.1));
    return g;
  },

  // ---- jungle ----
  canopyTree(o = {}) {
    // Big broadleaf canopy tree — trunk leans, crown spreads wide.
    const g = new THREE.Group();
    const rng = makeRng(o.seed || (Math.random() * 1e6) | 0);
    const h = o.h || rng.range(10, 14);
    const trunk = cyl(M.wood, 0.55, 0.95, h, 0, h / 2, 0, 8);
    trunk.rotation.z = rng.range(-0.09, 0.09);
    g.add(trunk);
    for (let i = 0; i < 2; i++) {
      const root = cyl(M.wood, 0.2, 0.45, 2.2, rng.range(-1, 1), 0.7, rng.range(-1, 1), 6);
      root.rotation.z = rng.range(0.5, 0.9) * (i ? -1 : 1);
      g.add(root);
    }
    for (let i = 0; i < 5; i++) {
      const r = rng.range(2.2, 3.6);
      const blob = new THREE.Mesh(new THREE.IcosahedronGeometry(r, 1), rng.chance(0.5) ? M.foliage : M.foliageBright);
      blob.position.set(rng.range(-3.2, 3.2), h - rng.range(0, 2.4), rng.range(-3.2, 3.2));
      blob.scale.y = rng.range(0.5, 0.7);
      blob.castShadow = true;
      g.add(blob);
    }
    return g;
  },
  stoneIdol(o = {}) {
    // Half-sunken temple head with softly glowing eyes.
    const g = new THREE.Group();
    const head = box(M.mossyStone, 3.2, 3.8, 3.0, 0, 1.6, 0);
    head.rotation.set(-0.12, 0, 0.08);
    g.add(head);
    g.add(box(M.mossyStone, 3.3, 0.7, 1.0, 0, 2.6, 1.25, 0.02));
    g.add(box(M.mossyStone, 0.7, 1.3, 0.6, 0, 1.7, 1.55));
    g.add(box(M.darkSteel, 1.6, 0.35, 0.3, 0, 0.75, 1.5));
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x62ff9a, emissive: 0x62ff9a, emissiveIntensity: 1.6 });
    for (const sx of [-0.85, 0.85]) g.add(box(eyeMat, 0.6, 0.3, 0.12, sx, 2.35, 1.52));
    g.add(box(M.moss, 3.4, 0.5, 3.1, 0, 3.6, -0.1, 0.06));
    const rubble = new THREE.Mesh(new THREE.IcosahedronGeometry(1.1, 0), M.mossyStone);
    rubble.position.set(2.4, 0.5, 1.3);
    rubble.castShadow = true;
    g.add(rubble);
    return g;
  },
  vineColumn(o = {}) {
    // Old stone column strangled by vines.
    const g = new THREE.Group();
    const h = o.h || rand(6, 9);
    g.add(cyl(M.mossyStone, 0.85, 1.05, h, 0, h / 2, 0, 10));
    g.add(box(M.mossyStone, 2.5, 0.55, 2.5, 0, 0.28, 0));
    for (let i = 0; i < 3; i++) {
      const v = new THREE.Mesh(new THREE.TorusGeometry(1.0, 0.16, 6, 12), M.moss);
      v.position.y = h * (0.25 + i * 0.27);
      v.rotation.set(Math.PI / 2 + rand(-0.3, 0.3), 0, rand(0, 3));
      v.castShadow = true;
      g.add(v);
    }
    const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(1.4, 1), M.foliage);
    crown.position.y = h + 0.5;
    crown.scale.y = 0.6;
    crown.castShadow = true;
    g.add(crown);
    return g;
  },

  // ---- orbital ----
  landingPad(o = {}) {
    // Hex landing pad with running edge lights.
    const g = new THREE.Group();
    g.add(cyl(M.darkSteel, 6.2, 6.6, 0.5, 0, 0.25, 0, 6));
    g.add(cyl(M.steel, 4.6, 4.6, 0.54, 0, 0.27, 0, 6));
    const ringMat = new THREE.MeshStandardMaterial({
      color: o.color || 0x53e8ff, emissive: o.color || 0x53e8ff, emissiveIntensity: 1.8, side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(new THREE.RingGeometry(3.4, 3.9, 6), ringMat);
    ring.rotation.x = -Math.PI / 2;
    ring.rotation.z = Math.PI / 6;
    ring.position.y = 0.56;
    g.add(ring);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      g.add(box(ringMat, 0.4, 0.34, 0.4, Math.cos(a) * 5.6, 0.55, Math.sin(a) * 5.6));
    }
    g.add(box(M.yellowPaint, 1.2, 0.9, 1.6, 5.8, 0.45, 0));
    return g;
  },
  dishArray(o = {}) {
    // Pair of deep-space dishes tracking something far away.
    const g = new THREE.Group();
    g.add(box(M.darkSteel, 6.5, 0.6, 3.4, 0, 0.3, 0));
    for (const sx of [-1.7, 1.7]) {
      g.add(cyl(M.steel, 0.3, 0.42, 3.2, sx, 2.2, 0, 8));
      const dish = new THREE.Mesh(new THREE.SphereGeometry(1.9, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2.6), M.whitePaint);
      dish.position.set(sx, 4.0, 0);
      dish.scale.y = 0.55;
      dish.rotation.x = -2.4;
      dish.rotation.z = sx > 0 ? -0.25 : 0.25;
      dish.castShadow = true;
      g.add(dish);
      const feed = cyl(M.darkSteel, 0.05, 0.05, 1.7, sx, 4.4, 0.9, 5);
      feed.rotation.x = 0.7;
      g.add(feed);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.16, 6, 5), M.glowRed);
      tip.position.set(sx, 4.75, 1.55);
      g.add(tip);
    }
    return g;
  },
  cargoPods(o = {}) {
    // Stacked pressurized cargo capsules with status stripes.
    const g = new THREE.Group();
    const rng = makeRng(o.seed || (Math.random() * 1e6) | 0);
    const mats = [M.whitePaint, M.bluePaint, M.yellowPaint];
    const glowMats = [M.glowCyan, M.glowGreen, M.glowWarm];
    const n = o.n || rng.int(2, 3);
    for (let i = 0; i < n; i++) {
      const y = 1.2 + (i > 1 ? 2.4 : 0);
      const xo = i === 1 ? 2.7 : 0, zo = i === 1 ? rng.range(-0.6, 0.6) : 0;
      const pod = new THREE.Mesh(new THREE.CapsuleGeometry(1.1, 2.6, 4, 10), mats[rng.int(0, 2)]);
      pod.position.set(xo, y, zo);
      pod.rotation.set(0, rng.range(-0.3, 0.3), Math.PI / 2);
      pod.castShadow = true;
      g.add(pod);
      const band = cyl(glowMats[rng.int(0, 2)], 1.14, 1.14, 0.22, xo, y, zo, 12);
      band.rotation.z = Math.PI / 2;
      band.rotation.y = pod.rotation.y;
      g.add(band);
      g.add(box(M.darkSteel, 3.0, 0.25, 2.0, xo, y - 1.25, zo, pod.rotation.y));
    }
    return g;
  },
  conduit(o = {}) {
    // Glowing power conduit running along the deck plating.
    const g = new THREE.Group();
    const len = o.len || 16;
    const col = o.color || 0x53e8ff;
    const glowMat = new THREE.MeshStandardMaterial({ color: col, emissive: col, emissiveIntensity: 1.7 });
    g.add(box(M.darkSteel, 0.9, 0.2, len, 0, 0.1, 0));
    g.add(box(glowMat, 0.34, 0.24, len - 0.5, 0, 0.12, 0));
    for (let zz = -len / 2 + 2; zz < len / 2; zz += 4) {
      g.add(cyl(M.steel, 0.7, 0.8, 0.3, 0, 0.15, zz, 10));
      g.add(cyl(glowMat, 0.3, 0.3, 0.34, 0, 0.17, zz, 10));
    }
    g.add(box(M.steel, 1.4, 1.1, 1.4, 0, 0.55, len / 2 + 0.7));
    g.add(box(glowMat, 0.5, 0.5, 0.1, 0, 0.62, len / 2 + 1.41));
    return g;
  },

  // ---- uptown ----
  fountain(o = {}) {
    // Tiered plaza fountain with standing water.
    const g = new THREE.Group();
    g.add(cyl(M.concrete, 3.6, 3.9, 0.8, 0, 0.4, 0, 18));
    g.add(cyl(M.water, 3.3, 3.3, 0.15, 0, 0.72, 0, 18));
    g.add(cyl(M.concrete, 0.5, 0.65, 1.6, 0, 1.4, 0, 10));
    g.add(cyl(M.concrete, 1.9, 2.1, 0.45, 0, 2.3, 0, 14));
    g.add(cyl(M.water, 1.7, 1.7, 0.12, 0, 2.42, 0, 14));
    g.add(cyl(M.concrete, 0.3, 0.4, 1.0, 0, 2.9, 0, 8));
    g.add(cyl(M.water, 0.28, 0.18, 1.1, 0, 3.6, 0, 8));
    return g;
  },
  artSculpture(o = {}) {
    // Plaza art: chrome ring balanced on a plinth, mirror ball beside it.
    const g = new THREE.Group();
    g.add(box(M.concrete, 2.6, 0.9, 2.6, 0, 0.45, 0));
    const ringMesh = new THREE.Mesh(new THREE.TorusGeometry(2.0, 0.42, 10, 22), M.chrome);
    ringMesh.position.y = 3.1;
    ringMesh.rotation.y = 0.4;
    ringMesh.castShadow = true;
    g.add(ringMesh);
    const ball = new THREE.Mesh(new THREE.SphereGeometry(0.85, 14, 10), M.chrome);
    ball.position.set(1.9, 0.85, 1.4);
    ball.castShadow = true;
    g.add(ball);
    return g;
  },
};

// place a prop group at a position with rotation
export function placeProp(scene, list, name, x, z, opts = {}) {
  const builder = PROPS[name];
  if (!builder) return null;
  const g = builder(opts);
  g.position.x = x;
  g.position.z = z;
  if (opts.ry !== undefined) g.rotation.y = opts.ry;
  else g.rotation.y = rand(Math.PI * 2);
  scene.add(g);
  list.push(g);
  return g;
}
