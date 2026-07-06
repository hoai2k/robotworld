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
  wood: new THREE.MeshStandardMaterial({ color: 0x6e5638, roughness: 0.85, metalness: 0 }),
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
    const mat = o.mat || M.concrete;
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
        color: o.color || 0x53e8ff, emissive: o.color || 0x53e8ff, emissiveIntensity: 1.2,
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
