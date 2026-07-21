// Terrain: the arena's ground-feature layer, built per theme from
// theme.layout. Three kinds of feature, all tiling-safe on the toroidal cell:
//
// - LANES: roads / streams (lava, water, oil, crystal veins, ice...) painted
//   into a cell-periodic ground overlay. A lane's centerline is
//   at + amp*sin(TAU*along/P + phase) — periodic in the cell period P by
//   construction, so any lane leaving one edge re-enters exactly opposite
//   (the tiling contract). Hazard lanes are live: lava burns, water/oil bogs.
// - HILLS: walkable truncated-cone mounds. The collision surface IS the
//   visual cone, so mechs walk up/down them smoothly and props placed on
//   them sit exactly on the slope (arena adds terrain height to prop Y).
// - BRIDGES: causeway spans across streams/roads — a row of full-height
//   destructible blocks with ramped ends. Mechs walk over seamlessly; blow
//   a segment out and there's a gap to fall through.
//
// Solid features are ghost-cloned into the 8 neighbor cells (like props);
// the overlay tiles for free because its texture repeats at the cell period.
import * as THREE from 'three';
import { TAU, clamp, rand } from '../core/utils.js';

const _v = new THREE.Vector3();
const _c = new THREE.Color();

// per-kind gameplay defaults; paint styles live in paintLane below
const KINDS = {
  road:    { hazard: null,    minR: 14 },
  lava:    { hazard: 'lava',  minR: 0 },   // 0 = clearing-derived
  water:   { hazard: 'water', minR: 0 },
  canal:   { hazard: 'water', minR: 0 },
  oil:     { hazard: 'oil',   minR: 0 },
  ice:     { hazard: null,    minR: 20 },
  crystal: { hazard: null,    minR: 20 },
  sand:    { hazard: null,    minR: 20 },
  stripe:  { hazard: null,    minR: 16 },
  acid:    { hazard: 'acid',  minR: 0 },   // corrosive stream — burns like lava
  mud:     { hazard: 'mud',   minR: 0 },   // bog — drags harder than oil
};

const hex = (c) => '#' + new THREE.Color(c).getHexString();

export class Terrain {
  constructor(arena, theme, rng) {
    this.arena = arena;
    this.theme = theme;
    this.rng = rng;
    this.P = arena.wrapHalf * 2;      // toroidal cell period
    this.B = arena.bounds;            // main play radius
    const L = this.L = theme.layout || {};
    this.clearing = L.clearing ?? 38; // spawn plaza: building/hazard-free
    this.lanes = [];
    this.hills = [];
    this.bridges = [];
    this.overlayMat = null;
    this.t = 0;

    this.buildLanes(rng);
    this.buildHills(rng);
    this.buildBridges(rng);
    this.buildOverlay();
    this.buildMeshes();
  }

  // shortest signed delta on the wrapped cell
  wrapD(d) {
    const P = this.P;
    let x = (d + P / 2) % P;
    if (x < 0) x += P;
    return x - P / 2;
  }

  laneCenter(lane, along) {
    return lane.at + lane.amp * Math.sin((TAU * along) / this.P + lane.phase);
  }

  // lane containing (x,z), widened by margin. Returns the lane or null.
  onLane(x, z, margin = 0) {
    for (const l of this.lanes) {
      const along = l.axis === 'z' ? z : x;
      const perp = l.axis === 'z' ? x : z;
      if (Math.abs(this.wrapD(perp - this.laneCenter(l, along))) < l.half + margin) return l;
    }
    return null;
  }

  nearBridge(x, z, margin = 0) {
    for (const br of this.bridges) {
      const { along, perp } = this.brLocal(br, x, z);
      if (Math.abs(perp) < br.w / 2 + margin && Math.abs(along) < br.len / 2 + margin) return br;
    }
    return null;
  }

  // ---- generation ----
  buildLanes(rng) {
    let axisFlip = rng.chance(0.5);
    for (const spec of this.L.lanes || []) {
      const kind = KINDS[spec.kind] || KINDS.road;
      // authored lane: exact geometry from the level editor (axis + centerline
      // offset given), no seeded placement. Still fully tiling-safe.
      if (spec.axis && spec.at !== undefined) {
        this.lanes.push({
          kind: spec.kind, style: spec.style || spec.kind, axis: spec.axis,
          at: spec.at, amp: spec.amp || 0, phase: spec.phase || 0,
          half: (spec.width ?? 6) / 2, hazard: kind.hazard,
          glow: spec.glow || null, dash: spec.dash || null, color: spec.color || null,
        });
        continue;
      }
      for (let i = 0; i < (spec.count || 1); i++) {
        const organic = spec.kind !== 'road' && spec.kind !== 'stripe';
        for (let tries = 0; tries < 24; tries++) {
          const axis = axisFlip ? 'z' : 'x';
          const amp = organic ? rng.range(7, 15) : spec.kind === 'road' ? rng.range(0, 3) : 0;
          const half = spec.width / 2;
          // hazard lanes must never dip into the spawn plaza
          const minAt = (kind.hazard ? this.clearing + 3 : kind.minR) + amp + half;
          const maxAt = Math.max(minAt + 8, this.B * 0.92);
          const at = (rng.chance(0.5) ? 1 : -1) * rng.range(minAt, maxAt);
          const clash = this.lanes.some((o) =>
            o.axis === axis && Math.abs(this.wrapD(at - o.at)) < half + o.half + Math.max(amp, o.amp) + 12);
          if (clash) continue;
          this.lanes.push({
            kind: spec.kind, style: spec.style || spec.kind, axis, at, amp,
            phase: rng.range(0, TAU), half, hazard: kind.hazard,
            glow: spec.glow || null, dash: spec.dash || null, color: spec.color || null,
          });
          axisFlip = !axisFlip;
          break;
        }
      }
    }
  }

  buildHills(rng) {
    const H = this.L.hills;
    if (!H) return;
    const deck = H.style === 'deck'; // platform pads keep a wide flat top
    // authored hills: exact placement + per-hill shape/style from the editor
    if (H.list) {
      for (const hl of H.list) {
        const d = hl.deck ?? deck;
        this.hills.push({
          x: hl.x, z: hl.z, R: hl.R ?? 12,
          Rtop: hl.Rtop ?? (hl.R ?? 12) * (d ? 0.72 : 0.34),
          H: hl.H ?? 3.5, deck: d, color: hl.color, edge: hl.edge,
        });
      }
      return;
    }
    for (let i = 0; i < H.count; i++) {
      for (let tries = 0; tries < 30; tries++) {
        const R = rng.range(10, 15.5);
        const Rtop = R * (deck ? rng.range(0.66, 0.78) : rng.range(0.26, 0.42));
        const h = rng.range(2.4, H.hMax ?? 4.2);
        const a = rng.range(0, TAU);
        const r = rng.range(this.clearing + R + 3, this.B * 0.95);
        const x = Math.cos(a) * r, z = Math.sin(a) * r;
        if (this.onLane(x, z, R * 0.7)) continue;
        if (this.hills.some((o) => Math.hypot(o.x - x, o.z - z) < o.R + R + 8)) continue;
        this.hills.push({ x, z, R, Rtop, H: h });
        break;
      }
    }
  }

  // surface height of a hill at planar distance d from its center
  hillSurface(hl, d) {
    if (d >= hl.R) return 0;
    if (d <= hl.Rtop) return hl.H;
    return hl.H * (hl.R - d) / (hl.R - hl.Rtop);
  }

  // build one bridge record (segments + geometry params) from a placement.
  // shared by procedural placement and the level editor's explicit list.
  addBridge(x, z, axis, flatNeed, opts = {}) {
    const BR = this.L.bridges || {};
    const w = 8, H = opts.H ?? BR.h ?? 3.2, rampL = 6;
    const nSeg = Math.max(3, Math.round(flatNeed / 3.4));
    const segLen = flatNeed / nSeg;
    const len = flatNeed + rampL * 2;
    const br = {
      x, z, axis, w, H, rampL, flat: flatNeed, len, segLen, nSeg,
      color: opts.color ?? BR.color ?? 0x54565c, edge: opts.edge ?? BR.edge ?? null,
      collapsing: false, segs: [],
    };
    for (let sIdx = 0; sIdx < nSeg; sIdx++) {
      br.segs.push({
        alive: true, hp: 80,
        a0: -flatNeed / 2 + sIdx * segLen,
        a1: -flatNeed / 2 + (sIdx + 1) * segLen,
        meshes: [],
      });
    }
    this.bridges.push(br);
    return br;
  }

  buildBridges(rng) {
    const BR = this.L.bridges;
    if (!BR) return;
    // authored bridges: exact placement from the editor
    if (BR.list) {
      for (const b of BR.list) {
        this.addBridge(b.x, b.z, b.axis || 'x', b.flat ?? 12,
          { H: b.H, color: b.color, edge: b.edge });
      }
      return;
    }
    const count = BR.count || 0;
    if (!count) return;
    // span streams first, roads second
    const wet = this.lanes.filter((l) => l.hazard || l.kind === 'sand' || l.kind === 'ice');
    const cands = wet.length ? wet : this.lanes;
    for (let i = 0; i < count; i++) {
      for (let tries = 0; tries < 30; tries++) {
        let x, z, axis, flatNeed = 9;
        if (cands.length) {
          const lane = cands[i % cands.length];
          const s = (rng.chance(0.5) ? 1 : -1) * rng.range(this.clearing + 10, this.B * 0.85);
          const c = this.laneCenter(lane, s);
          if (lane.axis === 'z') { z = s; x = c; axis = 'x'; }
          else { x = s; z = c; axis = 'z'; }
          flatNeed = Math.max(lane.half * 2 + 5, 9);
        } else { // freestanding elevated walkway (skyterrace/orbital)
          const a = rng.range(0, TAU), r = rng.range(this.clearing + 10, this.B * 0.72);
          x = Math.cos(a) * r; z = Math.sin(a) * r;
          axis = rng.chance(0.5) ? 'x' : 'z';
          flatNeed = 14;
        }
        const w = 8, rampL = 6;
        const len = flatNeed + rampL * 2;
        // whole span must stay inside the cell (bridges don't wrap-split)
        const halfSpan = len / 2 + 2;
        const aC = axis === 'x' ? x : z, pC = axis === 'x' ? z : x;
        if (Math.abs(aC) + halfSpan > this.P / 2 - 4 || Math.abs(pC) + w > this.P / 2 - 4) continue;
        if (this.bridges.some((o) => Math.hypot(o.x - x, o.z - z) < 30)) continue;
        if (this.hills.some((o) => Math.hypot(o.x - x, o.z - z) < o.R + len / 2)) continue;
        this.addBridge(x, z, axis, flatNeed);
        break;
      }
    }
  }

  brLocal(br, x, z) {
    const dx = this.wrapD(x - br.x), dz = this.wrapD(z - br.z);
    return br.axis === 'x' ? { along: dx, perp: dz } : { along: dz, perp: dx };
  }

  // deck surface height along a bridge (0 where a segment has been destroyed)
  brSurface(br, along) {
    const a = Math.abs(along);
    if (a <= br.flat / 2) {
      const i = clamp(Math.floor((along + br.flat / 2) / br.segLen), 0, br.nSeg - 1);
      return br.segs[i].alive ? br.H : 0;
    }
    if (a < br.flat / 2 + br.rampL) return br.H * (1 - (a - br.flat / 2) / br.rampL);
    return 0;
  }

  // ---- queries used by arena / combat ----
  heightAt(x, z) {
    let h = 0;
    for (const hl of this.hills) {
      const d = Math.hypot(this.wrapD(x - hl.x), this.wrapD(z - hl.z));
      if (d < hl.R) h = Math.max(h, this.hillSurface(hl, d));
    }
    for (const br of this.bridges) {
      const { along, perp } = this.brLocal(br, x, z);
      if (Math.abs(perp) < br.w / 2 && Math.abs(along) < br.len / 2) {
        h = Math.max(h, this.brSurface(br, along));
      }
    }
    return h;
  }

  // solid-volume test (projectiles): inside a hill cone or causeway block
  pointHits(p) {
    if (p.y > 8 || p.y < -0.5) return null;
    for (const hl of this.hills) {
      const d = Math.hypot(this.wrapD(p.x - hl.x), this.wrapD(p.z - hl.z));
      if (d < hl.R && p.y <= this.hillSurface(hl, d)) return { terrain: 'hill' };
    }
    for (const br of this.bridges) {
      const { along, perp } = this.brLocal(br, p.x, p.z);
      if (Math.abs(perp) < br.w / 2 && Math.abs(along) < br.len / 2 &&
          p.y <= this.brSurface(br, along)) return { terrain: 'bridge' };
    }
    return null;
  }

  collideFighter(f) {
    let support = -Infinity;
    // hills: smooth surface-follow (the cone IS the collision surface)
    for (const hl of this.hills) {
      const d = Math.hypot(this.wrapD(f.pos.x - hl.x), this.wrapD(f.pos.z - hl.z));
      if (d >= hl.R) continue;
      const h = this.hillSurface(hl, d);
      if (h > 0 && f.vel.y <= 0.01 && f.pos.y <= h + 0.9) support = Math.max(support, h);
    }
    // bridges: walk up the ramps, stand on the deck, get pushed by the sides
    for (const br of this.bridges) {
      const { along, perp } = this.brLocal(br, f.pos.x, f.pos.z);
      if (Math.abs(perp) >= br.w / 2 + f.radius || Math.abs(along) >= br.len / 2 + f.radius) continue;
      const h = this.brSurface(br, clamp(along, -br.len / 2, br.len / 2));
      if (h <= 0) continue;
      if (f.pos.y >= h - 1.5 && f.vel.y <= 0.01) {
        // on / stepping onto the surface
        if (Math.abs(perp) < br.w / 2 + f.radius * 0.4 && f.pos.y <= h + 0.9) {
          support = Math.max(support, h);
        }
      } else if (f.pos.y < h - 0.2) {
        // hit a vertical face: push out on the shallower axis (sides, or
        // the wall of a blown-open gap)
        const penPerp = br.w / 2 + f.radius - Math.abs(perp);
        let penAlong = Infinity;
        const idx = clamp(Math.floor((along + br.flat / 2) / br.segLen), 0, br.nSeg - 1);
        const seg = Math.abs(along) <= br.flat / 2 ? br.segs[idx] : null;
        if (seg && seg.alive) {
          penAlong = Math.min(along - (seg.a0 - f.radius), (seg.a1 + f.radius) - along);
        }
        const px = br.axis === 'x' ? 'x' : 'z', pz = br.axis === 'x' ? 'z' : 'x';
        if (penAlong < penPerp) {
          const dir = along - (seg.a0 + seg.a1) / 2 > 0 ? 1 : -1;
          f.pos[px] += dir * penAlong;
          f.vel[px] *= 0.4;
        } else {
          f.pos[pz] += Math.sign(perp || 1) * penPerp;
          f.vel[pz] *= 0.4;
        }
      }
    }
    if (support > -Infinity && f.pos.y <= support + 0.9) {
      const fallSpeed = -f.vel.y;
      f.pos.y = support;
      if (f.vel.y < 0) f.vel.y = 0;
      if (!f.grounded) {
        f.grounded = true;
        if (fallSpeed > 9 && this.arena.world) {
          this.arena.world.effects.dustPuff(f.pos, Math.min(16, fallSpeed));
          this.arena.world.audio?.play('land');
        }
      }
    }
  }

  // explosions / melee vs bridge segments
  damageSphere(pos, radius, dmg) {
    let destroyed = 0;
    for (const br of this.bridges) {
      const { along, perp } = this.brLocal(br, pos.x, pos.z);
      if (Math.abs(perp) > br.w / 2 + radius || Math.abs(along) > br.flat / 2 + radius ||
          pos.y > br.H + radius + 1) continue;
      for (const seg of br.segs) {
        if (!seg.alive) continue;
        const mid = (seg.a0 + seg.a1) / 2;
        const d = Math.sqrt((along - mid) ** 2 + (pos.y - br.H * 0.7) ** 2 + perp * perp * 0.25);
        if (d < radius + br.segLen * 0.6) {
          seg.hp -= dmg * Math.max(0.3, 1 - d / (radius + br.segLen));
          if (seg.hp <= 0) { this.killSeg(br, seg); destroyed++; }
        }
      }
    }
    return destroyed;
  }

  killSeg(br, seg, quiet = false) {
    if (!seg.alive) return;
    seg.alive = false;
    for (const m of seg.meshes) m.visible = false;
    const mid = (seg.a0 + seg.a1) / 2;
    const wx = br.x + (br.axis === 'x' ? mid : 0);
    const wz = br.z + (br.axis === 'x' ? 0 : mid);
    const destructo = this.arena.destructo;
    _c.set(br.color);
    for (let k = 0; k < 3; k++) {
      destructo.spawnRubble(
        wx + rand(-1.5, 1.5), br.H * rand(0.3, 0.8), wz + rand(-1.5, 1.5),
        br.w * rand(0.25, 0.4), br.H * rand(0.3, 0.45), br.segLen * rand(0.35, 0.55),
        rand(-3, 3), rand(0, 2), rand(-3, 3), _c.clone()
      );
    }
    const w = this.arena.world;
    if (w && !quiet) {
      w.effects.dustPuff(_v.set(wx, br.H * 0.6, wz), 8, 0x9a9284);
      w.audio?.play('crumble');
    }
    // most of the span gone → the rest of the deck gives way
    const alive = br.segs.filter((s) => s.alive).length;
    if (!br.collapsing && alive > 0 && alive / br.nSeg < 0.45) {
      br.collapsing = true;
      let n = 0;
      for (const s of br.segs) {
        if (!s.alive) continue;
        const delay = 0.12 + n++ * 0.11 + rand(0, 0.08);
        if (w) w.schedule(delay, () => this.killSeg(br, s));
        else this.killSeg(br, s, true);
      }
      if (w) { w.audio?.play('crumbleBig'); w.effects.addShake(0.7); }
    }
  }

  // ---- ground hazards: lava burns, water/oil bogs down ----
  updateHazards(dt) {
    const w = this.arena.world;
    if (!w) return;
    for (const f of w.fighters) {
      if (!f.alive || !f.grounded || f.pos.y > 0.5) continue;
      const lane = this.onLane(f.pos.x, f.pos.z, -0.4);
      if (!lane || !lane.hazard) continue;
      if (lane.hazard === 'lava' || lane.hazard === 'acid') {
        const acid = lane.hazard === 'acid';
        f._lavaT = (f._lavaT ?? 0) - dt;
        if (f._lavaT <= 0) {
          f._lavaT = 0.5;
          f.takeHit(acid ? 7 : 9, null, {
            knock: 2, srcPos: _v.set(f.pos.x, -1, f.pos.z),
            status: { burn: acid ? 6 : 8, burnT: acid ? 2.6 : 2.2 }, soft: true,
          });
          for (let i = 0; i < 5; i++) {
            w.effects.glows.emit(f.pos.x + rand(-1.2, 1.2), rand(0.2, 1), f.pos.z + rand(-1.2, 1.2),
              rand(-1, 1), rand(4, 9), rand(-1, 1),
              { life: rand(0.4, 0.8), size: rand(0.8, 1.6),
                color: acid ? (i % 2 ? 0x9bff3c : 0x3cff9a) : (i % 2 ? 0xff7a20 : 0xffd23c), alpha: 0.95 });
          }
        }
      } else { // water / oil / mud: heavy going
        const drag = lane.hazard === 'mud' ? 3.2 : lane.hazard === 'oil' ? 2.6 : 1.9;
        const k = Math.max(0, 1 - drag * dt);
        f.vel.x *= k; f.vel.z *= k;
        f._splashT = (f._splashT ?? 0) - dt;
        if (f._splashT <= 0 && Math.hypot(f.vel.x, f.vel.z) > 5) {
          f._splashT = 0.22;
          if (lane.hazard === 'water') w.effects.splash?.(_v.set(f.pos.x, 0.4, f.pos.z), 5, 4);
          else w.effects.dustPuff(f.pos, 2, 0x14161a);
        }
      }
    }
  }

  update(dt) {
    this.t += dt;
    this.updateHazards(dt);
    // lava lanes simmer: embers drift up from random points along the flow
    const w = this.arena.world;
    if (w) {
      this._emberT = (this._emberT ?? 0) - dt;
      if (this._emberT <= 0) {
        this._emberT = 0.09;
        for (const l of this.lanes) {
          if (l.hazard !== 'lava' || Math.random() > 0.6) continue;
          const along = rand(-this.B, this.B);
          const c = this.laneCenter(l, along) + rand(-l.half * 0.7, l.half * 0.7);
          const x = l.axis === 'z' ? c : along, z = l.axis === 'z' ? along : c;
          w.effects.glows.emit(x, rand(0.1, 0.5), z, rand(-0.6, 0.6), rand(1.5, 4), rand(-0.6, 0.6),
            { life: rand(1, 2), size: rand(0.3, 0.7), color: Math.random() < 0.3 ? 0xffd23c : 0xff6a20, alpha: 0.85, drag: 0.4 });
        }
      }
    }
    // painted glow (canals, veins, deck stripes) breathes gently
    if (this.overlayMat && this.overlayMat.emissiveMap) {
      this.overlayMat.emissiveIntensity = 1.0 + 0.22 * Math.sin(this.t * 2.1);
    }
  }

  // ---- building sites: clusters with streets between, plaza kept clear ----
  buildingSites(totalCount, rng) {
    const sites = [];
    const okSite = (x, z, minD) => {
      if (Math.hypot(x, z) < this.clearing + 6) return false;
      if (Math.abs(x) > this.P / 2 - 12 || Math.abs(z) > this.P / 2 - 12) return false;
      if (this.onLane(x, z, 6.5)) return false;
      if (this.heightAt(x, z) > 0.1) return false;
      if (this.nearBridge(x, z, 7)) return false;
      return sites.every((s) => Math.hypot(s.x - x, s.z - z) > minD);
    };
    const CL = this.L.clusters || { count: 0, size: [2, 3] };
    const pitch = 15; // block spacing inside a cluster (alleys, not gaps)
    for (let c = 0; c < CL.count && sites.length < totalCount; c++) {
      let ax = 0, az = 0, found = false;
      for (let t = 0; t < 30 && !found; t++) {
        const a = rng.range(0, TAU), r = rng.range(this.clearing + 16, this.B);
        ax = Math.cos(a) * r; az = Math.sin(a) * r;
        found = okSite(ax, az, 26);
      }
      if (!found) continue;
      const n = rng.int(CL.size[0], CL.size[1]);
      const cols = Math.min(n, 2);
      let first = true;
      for (let i = 0; i < n && sites.length < totalCount; i++) {
        // axis-aligned mini-grid, so blocks line up with the road grid
        const x = ax + ((i % cols) - (cols - 1) / 2) * pitch + rng.range(-1.6, 1.6);
        const z = az + (((i / cols) | 0) - (Math.ceil(n / cols) - 1) / 2) * pitch + rng.range(-1.6, 1.6);
        if (!okSite(x, z, 13)) continue;
        sites.push({ x, z, cluster: c, tall: first }); // one landmark per cluster
        first = false;
      }
    }
    // scatter the rest: mid-field solo cover + outer ring
    let guard = 0;
    while (sites.length < totalCount && guard++ < 220) {
      const inner = sites.length % 3 === 0;
      const a = rng.range(0, TAU);
      const r = inner ? rng.range(this.clearing + 8, this.B * 0.6) : rng.range(this.B * 0.7, this.B * 1.02);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (okSite(x, z, 17)) sites.push({ x, z, cluster: -1, tall: false });
    }
    return sites;
  }

  // ---- visuals ----
  buildMeshes() {
    const group = new THREE.Group();
    const L = this.L;
    // hills — style/color resolved per-hill so authored levels can mix
    // walkable mounds and platform decks in one arena
    if (this.hills.length) {
      const matCache = new Map();
      for (const hl of this.hills) {
        const deckStyle = hl.deck ?? (L.hills?.style === 'deck');
        const color = hl.color ?? L.hills?.color ?? 0x5a5248;
        const key = `${color}:${deckStyle}`;
        let mat = matCache.get(key);
        if (!mat) {
          mat = new THREE.MeshStandardMaterial({
            color, roughness: deckStyle ? 0.42 : 0.94, metalness: deckStyle ? 0.6 : 0.04,
          });
          matCache.set(key, mat);
        }
        const geo = new THREE.CylinderGeometry(hl.Rtop, hl.R, hl.H, deckStyle ? 8 : 22, 1);
        const m = new THREE.Mesh(geo, mat);
        m.position.set(hl.x, hl.H / 2, hl.z);
        if (!deckStyle) m.rotation.y = rand(0, TAU);
        m.castShadow = true;
        m.receiveShadow = true;
        group.add(m);
        const edge = hl.edge ?? (deckStyle ? L.hills?.edge : null);
        if (deckStyle && edge) {
          const eMat = new THREE.MeshStandardMaterial({
            color: edge, emissive: edge, emissiveIntensity: 2.0, side: THREE.DoubleSide,
          });
          const ring = new THREE.Mesh(new THREE.CylinderGeometry(hl.Rtop + 0.06, hl.Rtop + 0.06, 0.35, 8, 1, true), eMat);
          ring.position.set(hl.x, hl.H - 0.12, hl.z);
          group.add(ring);
        }
      }
    }
    // bridges: full-height causeway blocks + ramp wedges + railings
    this.bridges.forEach((br, bi) => {
      const bGrp = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: br.color, roughness: 0.8, metalness: 0.25 });
      const railMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(br.color).multiplyScalar(0.6), roughness: 0.6, metalness: 0.5,
      });
      const edgeMat = br.edge ? new THREE.MeshStandardMaterial({
        color: br.edge, emissive: br.edge, emissiveIntensity: 1.5,
      }) : null;
      br.segs.forEach((seg, si) => {
        const sGrp = new THREE.Group();
        sGrp.userData.segKey = `${bi}:${si}`;
        const block = new THREE.Mesh(new THREE.BoxGeometry(br.w, br.H, br.segLen * 0.99), mat);
        block.position.y = br.H / 2;
        block.castShadow = true;
        block.receiveShadow = true;
        sGrp.add(block);
        for (const sx of [-1, 1]) {
          const rail = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.85, br.segLen * 0.92), railMat);
          rail.position.set(sx * (br.w / 2 - 0.22), br.H + 0.42, 0);
          rail.castShadow = true;
          sGrp.add(rail);
          if (edgeMat) {
            const strip = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, br.segLen * 0.92), edgeMat);
            strip.position.set(sx * (br.w / 2 - 0.22), br.H + 0.9, 0);
            sGrp.add(strip);
          }
        }
        sGrp.position.z = (seg.a0 + seg.a1) / 2;
        seg.meshes.push(sGrp);
        bGrp.add(sGrp);
      });
      // ramp wedges (non-destructible approaches)
      const hyp = Math.hypot(br.rampL, br.H);
      const slope = Math.atan2(br.H, br.rampL);
      for (const sz of [-1, 1]) {
        const ramp = new THREE.Mesh(new THREE.BoxGeometry(br.w, 1.1, hyp + 0.6), mat);
        ramp.position.set(0, br.H / 2 - 0.28, sz * (br.flat / 2 + br.rampL / 2));
        ramp.rotation.x = -sz * slope;
        ramp.castShadow = true;
        ramp.receiveShadow = true;
        bGrp.add(ramp);
        const fill = new THREE.Mesh(new THREE.BoxGeometry(br.w, br.H * 0.55, br.rampL * 0.55), mat);
        fill.position.set(0, br.H * 0.27, sz * (br.flat / 2 + br.rampL * 0.24));
        bGrp.add(fill);
      }
      bGrp.position.set(br.x, 0, br.z);
      if (br.axis === 'x') bGrp.rotation.y = Math.PI / 2;
      group.add(bGrp);
    });

    if (!group.children.length) { this.group = null; return; }
    this.group = group;
    const { scene, objects } = this.arena;
    scene.add(group);
    objects.push(group);
    // ghost copies in the 8 neighbor cells; destructible segments track
    // their clones by segKey so a destroyed block vanishes across the seam
    for (let gx = -1; gx <= 1; gx++) {
      for (let gz = -1; gz <= 1; gz++) {
        if (!gx && !gz) continue;
        const ghost = group.clone();
        ghost.position.set(gx * this.P, 0, gz * this.P);
        scene.add(ghost);
        objects.push(ghost);
        ghost.traverse((n) => {
          if (n.userData?.segKey) {
            const [bi, si] = n.userData.segKey.split(':').map(Number);
            this.bridges[bi]?.segs[si]?.meshes.push(n);
          }
        });
      }
    }
  }

  // ---- painted ground overlay (cell-periodic, so it tiles by definition) ----
  buildOverlay() {
    if (!this.lanes.length && !this.L.plaza) return;
    const S = 2048, P = this.P, m2px = S / P;
    const cv = document.createElement('canvas');
    cv.width = cv.height = S;
    const ctx = cv.getContext('2d');
    const needGlow = this.lanes.some((l) => l.glow || l.hazard === 'lava' || l.hazard === 'acid' || l.kind === 'crystal');
    let ecv = null, ectx = null;
    if (needGlow) {
      ecv = document.createElement('canvas');
      ecv.width = ecv.height = S;
      ectx = ecv.getContext('2d');
      ectx.fillStyle = '#000';
      ectx.fillRect(0, 0, S, S);
    }

    // stroke a lane centerline (with lateral offset) at 9 wrap positions so
    // strokes crossing a cell edge land on the opposite side too
    const strokeLane = (c, lane, widthM, color, alpha, { dash = null, offsetM = 0 } = {}) => {
      if (!c) return;
      c.save();
      c.strokeStyle = color;
      c.globalAlpha = alpha;
      c.lineWidth = Math.max(1.5, widthM * m2px);
      c.lineCap = 'round';
      c.lineJoin = 'round';
      if (dash) c.setLineDash(dash.map((d) => d * m2px));
      const N = 160;
      for (const ox of [-S, 0, S]) {
        for (const oy of [-S, 0, S]) {
          c.beginPath();
          for (let i = 0; i <= N; i++) {
            const t = -P / 2 + (i / N) * P;
            const ctr = this.laneCenter(lane, t) + offsetM;
            const wx = lane.axis === 'z' ? ctr : t;
            const wz = lane.axis === 'z' ? t : ctr;
            const px = (wx / P + 0.5) * S + ox;
            const py = (wz / P + 0.5) * S + oy;
            if (i === 0) c.moveTo(px, py);
            else c.lineTo(px, py);
          }
          c.stroke();
        }
      }
      c.restore();
    };

    for (const l of this.lanes) {
      const W = l.half * 2;
      const base = l.color ? hex(l.color) : null;
      switch (l.style) {
        case 'asphalt':
          strokeLane(ctx, l, W, base || '#141619', 0.9);
          strokeLane(ctx, l, W * 0.9, '#212429', 0.55);
          strokeLane(ctx, l, 0.4, '#b9bec6', 0.5, { offsetM: l.half - 0.55 });
          strokeLane(ctx, l, 0.4, '#b9bec6', 0.5, { offsetM: -(l.half - 0.55) });
          if (l.dash) strokeLane(ctx, l, 0.35, hex(l.dash), 0.8, { dash: [2.4, 2.6] });
          break;
        case 'plate':
          strokeLane(ctx, l, W, base || '#26282c', 0.85);
          strokeLane(ctx, l, 0.5, '#c8a028', 0.6, { offsetM: l.half - 0.5, dash: [1.6, 1.2] });
          strokeLane(ctx, l, 0.5, '#c8a028', 0.6, { offsetM: -(l.half - 0.5), dash: [1.6, 1.2] });
          break;
        case 'dirt':
          strokeLane(ctx, l, W, base || '#3a2f22', 0.55);
          strokeLane(ctx, l, 0.8, '#241c12', 0.5, { offsetM: l.half * 0.42 });
          strokeLane(ctx, l, 0.8, '#241c12', 0.5, { offsetM: -l.half * 0.42 });
          break;
        case 'stone':
          strokeLane(ctx, l, W, base || '#a08a64', 0.6);
          strokeLane(ctx, l, 0.5, '#00000055', 0.6, { offsetM: l.half - 0.4 });
          strokeLane(ctx, l, 0.5, '#00000055', 0.6, { offsetM: -(l.half - 0.4) });
          strokeLane(ctx, l, 0.3, '#00000040', 0.5, { dash: [0.2, 3.2] });
          break;
        case 'lava':
          strokeLane(ctx, l, W * 1.25, '#100804', 0.9);
          strokeLane(ctx, l, W * 0.9, '#2a0f04', 0.95);
          strokeLane(ectx, l, W * 0.82, '#7a2606', 1);
          strokeLane(ectx, l, W * 0.5, '#ff5a10', 1);
          strokeLane(ectx, l, W * 0.2, '#ffc23c', 1);
          break;
        case 'water':
          strokeLane(ctx, l, W * 1.12, '#c2c9c2', 0.28); // pale banks
          strokeLane(ctx, l, W, '#173341', 0.88);
          strokeLane(ctx, l, W * 0.66, '#2e86b0', 0.75);
          strokeLane(ctx, l, W * 0.25, '#7fd4e8', 0.4, { dash: [4, 3] });
          break;
        case 'canal':
          strokeLane(ctx, l, W, '#0c1418', 0.92);
          strokeLane(ctx, l, W * 0.7, '#10333c', 0.85);
          strokeLane(ectx, l, 0.4, hex(l.glow || 0x53e8ff), 0.9, { offsetM: l.half - 0.35 });
          strokeLane(ectx, l, 0.4, hex(l.glow || 0x53e8ff), 0.9, { offsetM: -(l.half - 0.35) });
          strokeLane(ectx, l, W * 0.4, '#0e3a44', 0.9);
          break;
        case 'oil':
          strokeLane(ctx, l, W, '#0b0c10', 0.92);
          strokeLane(ctx, l, W * 0.5, '#1c1f26', 0.8);
          strokeLane(ctx, l, W * 0.2, '#2c3a44', 0.35, { dash: [3, 5] });
          break;
        case 'acid':
          strokeLane(ctx, l, W * 1.2, '#0a1206', 0.9);
          strokeLane(ctx, l, W * 0.9, '#123008', 0.95);
          strokeLane(ectx, l, W * 0.82, '#2c7a10', 1);
          strokeLane(ectx, l, W * 0.5, '#7bff2a', 1);
          strokeLane(ectx, l, W * 0.2, '#d6ff8c', 1);
          break;
        case 'mud':
          strokeLane(ctx, l, W * 1.12, '#241a10', 0.5);   // damp banks
          strokeLane(ctx, l, W, base || '#332413', 0.9);
          strokeLane(ctx, l, W * 0.55, '#241809', 0.8);
          strokeLane(ctx, l, W * 0.2, '#4a3a22', 0.4, { dash: [1.4, 3] });
          break;
        case 'ice':
          strokeLane(ctx, l, W, '#bfe2f2', 0.62);
          strokeLane(ctx, l, W * 0.55, '#e6f6ff', 0.5);
          if (ectx) strokeLane(ectx, l, W * 0.4, '#1c3844', 1, { dash: [5, 4] });
          break;
        case 'crystal':
          strokeLane(ctx, l, W, '#241c34', 0.8);
          strokeLane(ectx, l, W * 0.5, hex(l.glow || 0xb46bff), 0.95, { dash: [1.6, 1.1] });
          break;
        case 'sand':
          strokeLane(ctx, l, W * 1.15, '#00000030', 1);
          strokeLane(ctx, l, W, base || '#8a704c', 0.55);
          strokeLane(ctx, l, W * 0.3, '#00000028', 1, { dash: [1.2, 2.2] });
          break;
        case 'stripe':
          strokeLane(ctx, l, W, '#1c2026', 0.72);
          strokeLane(ectx, l, 0.4, hex(l.glow || 0x53e8ff), 0.95, { offsetM: l.half - 0.4 });
          strokeLane(ectx, l, 0.4, hex(l.glow || 0x53e8ff), 0.95, { offsetM: -(l.half - 0.4) });
          break;
        default:
          strokeLane(ctx, l, W, base || '#202226', 0.7);
      }
    }

    // spawn plaza: painted rings so the clearing reads as designed space —
    // fighters spawn ON the outer ring
    if (this.L.plaza) {
      const acc = hex(this.theme.ground.accent ?? 0xffffff);
      const cxy = S / 2;
      const ring = (c, rM, wM, color, alpha, dash = null) => {
        if (!c) return;
        c.save();
        c.strokeStyle = color;
        c.globalAlpha = alpha;
        c.lineWidth = wM * m2px;
        if (dash) c.setLineDash(dash.map((d) => d * m2px));
        c.beginPath();
        c.arc(cxy, cxy, rM * m2px, 0, TAU);
        c.stroke();
        c.restore();
      };
      ring(ctx, 34, 1.1, acc, 0.4);
      ring(ctx, 34, 0.35, '#ffffff', 0.35);
      ring(ctx, 9, 0.8, acc, 0.3, [2, 2]);
      if (ectx) ring(ectx, 34, 0.3, acc, 0.55);
    }

    const mkTex = (canvas) => {
      const tex = new THREE.CanvasTexture(canvas);
      tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      // align texture cells with the world cell: overlay plane is 700 wide
      tex.repeat.set(700 / P, 700 / P);
      tex.offset.set(0.5 - 350 / P, 0.5 - 350 / P);
      return tex;
    };
    this.overlayMat = new THREE.MeshStandardMaterial({
      map: mkTex(cv),
      transparent: true,
      roughness: 0.85,
      metalness: 0.05,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
    });
    if (ecv) {
      this.overlayMat.emissiveMap = mkTex(ecv);
      this.overlayMat.emissive = new THREE.Color(0xffffff);
      this.overlayMat.emissiveIntensity = 1.0;
    }
    const plane = new THREE.Mesh(new THREE.PlaneGeometry(700, 700), this.overlayMat);
    plane.rotation.x = -Math.PI / 2;
    plane.position.y = 0.03;
    plane.receiveShadow = true;
    plane.renderOrder = 1;
    this.arena.scene.add(plane);
    this.arena.objects.push(plane);
  }
}
