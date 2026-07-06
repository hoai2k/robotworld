// Procedural canvas textures: armor plating, building facades, roads, FX sprites.
import * as THREE from 'three';
import { makeRng } from './utils.js';

const cache = new Map();

export function makeCanvasTexture(key, w, h, draw, opts = {}) {
  if (key && cache.has(key)) return cache.get(key);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = opts.wrap === false ? THREE.ClampToEdgeWrapping : THREE.RepeatWrapping;
  tex.colorSpace = opts.data ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  if (key) cache.set(key, tex);
  return tex;
}

function hexToRgb(hex) {
  return [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255];
}
function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  const m = (v) => Math.round(Math.min(255, Math.max(0, v * f)));
  return `rgb(${m(r)},${m(g)},${m(b)})`;
}

// ============ ARMOR PLATING ============
// Panel lines, rivets, scratches, grime — tinted by base color.
export function platingTextures(baseHex, seed = 1, opts = {}) {
  const key = `plate_${baseHex}_${seed}_${opts.stripes ? 1 : 0}`;
  if (cache.has(key)) return cache.get(key);
  const rng = makeRng(seed * 7919 + 13);
  const S = 256;

  // Subtle by design: parts are small and UVs stretch 0-1 per face, so any
  // busy detail reads as noisy tiling. Keep it clean; geometry carries detail.
  const drawBase = (ctx, forBump) => {
    if (forBump) {
      ctx.fillStyle = '#808080';
      ctx.fillRect(0, 0, S, S);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, S);
      g.addColorStop(0, shade(baseHex, 1.07));
      g.addColorStop(0.5, shade(baseHex, 1.0));
      g.addColorStop(1, shade(baseHex, 0.9));
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, S, S);
      // faint worn-metal mottling
      for (let i = 0; i < 90; i++) {
        const x = rng() * S, y = rng() * S, r = rng.range(8, 30);
        ctx.fillStyle = rng.chance(0.5)
          ? `rgba(255,255,255,${rng.range(0.005, 0.018)})`
          : `rgba(0,0,10,${rng.range(0.006, 0.022)})`;
        ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
      }
    }
    // a couple of faint panel seams
    ctx.strokeStyle = forBump ? 'rgba(90,90,90,0.8)' : 'rgba(6,10,16,0.22)';
    ctx.lineWidth = 1.5;
    const rng2 = makeRng(seed * 131 + 7);
    const px = S * rng2.range(0.3, 0.7), py = S * rng2.range(0.3, 0.7);
    ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, S); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(S, py); ctx.stroke();
    // sparse edge rivets
    for (let i = 0; i < 8; i++) {
      const x = rng2() * S, y = rng2() * S;
      ctx.fillStyle = forBump ? '#b8b8b8' : 'rgba(255,255,255,0.09)';
      ctx.beginPath(); ctx.arc(x, y, 1.8, 0, Math.PI * 2); ctx.fill();
    }
    // faint scratches
    ctx.lineWidth = 1;
    for (let i = 0; i < 9; i++) {
      const x = rng() * S, y = rng() * S, a = rng() * Math.PI * 2, l = rng.range(8, 28);
      ctx.strokeStyle = forBump
        ? 'rgba(160,160,160,0.4)'
        : `rgba(255,255,255,${rng.range(0.02, 0.05)})`;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l);
      ctx.stroke();
    }
    if (!forBump) {
      // soft grime streaks
      for (let i = 0; i < 6; i++) {
        const x = rng() * S, y = rng() * S, l = rng.range(14, 46);
        const g = ctx.createLinearGradient(x, y, x, y + l);
        g.addColorStop(0, 'rgba(8,10,14,0.1)');
        g.addColorStop(1, 'rgba(8,10,14,0)');
        ctx.fillStyle = g;
        ctx.fillRect(x, y, rng.range(4, 10), l);
      }
      if (opts.stripes) {
        ctx.save();
        ctx.globalAlpha = 0.85;
        ctx.translate(0, S * 0.86);
        for (let x = 0; x < S; x += 26) {
          ctx.fillStyle = '#17171a';
          ctx.fillRect(x, 0, 13, 15);
          ctx.fillStyle = '#d99e0e';
          ctx.fillRect(x + 13, 0, 13, 15);
        }
        ctx.restore();
      }
    }
  };

  const map = makeCanvasTexture(null, S, S, (ctx) => drawBase(ctx, false));
  const bumpMap = makeCanvasTexture(null, S, S, (ctx) => drawBase(ctx, true), { data: true });
  const out = { map, bumpMap };
  cache.set(key, out);
  return out;
}

// ============ BUILDING FACADE ============
// Windows grid; emissive map has lit windows for night arenas.
export function buildingFacade(style = 0, seed = 3) {
  const key = `bldg_${style}_${seed}`;
  if (cache.has(key)) return cache.get(key);
  const rng = makeRng(seed * 883 + style * 97);
  const S = 256;
  const palettes = [
    { wall: '#3d4654', win: '#101820', lit: '#ffd98a' },   // steel office
    { wall: '#5a5148', win: '#141a20', lit: '#ffe9b0' },   // brown brick office
    { wall: '#2c3a48', win: '#0e1620', lit: '#9adfff' },   // glass tower
    { wall: '#4c4c55', win: '#12161c', lit: '#ffc37a' },   // concrete block
  ];
  const p = palettes[style % palettes.length];
  const cols = 6, rows = 8, m = 8;
  const cw = (S - m * 2) / cols, ch = (S - m * 2) / rows;

  const lit = [];
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) lit.push(rng.chance(0.38));

  const map = makeCanvasTexture(null, S, S, (ctx) => {
    ctx.fillStyle = p.wall;
    ctx.fillRect(0, 0, S, S);
    // wall weathering
    for (let i = 0; i < 120; i++) {
      ctx.fillStyle = `rgba(0,0,0,${rng.range(0.02, 0.08)})`;
      ctx.fillRect(rng() * S, rng() * S, rng.range(4, 20), rng.range(4, 20));
    }
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++, i++) {
        const x = m + c * cw + 3, y = m + r * ch + 3, w = cw - 6, h = ch - 6;
        ctx.fillStyle = lit[i] ? p.lit : p.win;
        ctx.fillRect(x, y, w, h);
        // window frame + reflection slash
        ctx.strokeStyle = 'rgba(0,0,0,0.5)';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x, y, w, h);
        ctx.fillStyle = 'rgba(255,255,255,0.10)';
        ctx.beginPath();
        ctx.moveTo(x, y + h);
        ctx.lineTo(x + w * 0.45, y);
        ctx.lineTo(x + w * 0.7, y);
        ctx.lineTo(x + w * 0.25, y + h);
        ctx.fill();
      }
    }
  });

  const emissiveMap = makeCanvasTexture(null, S, S, (ctx) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, S, S);
    let i = 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++, i++) {
        if (!lit[i]) continue;
        const x = m + c * cw + 3, y = m + r * ch + 3, w = cw - 6, h = ch - 6;
        ctx.fillStyle = p.lit;
        ctx.fillRect(x, y, w, h);
      }
    }
  });

  const out = { map, emissiveMap };
  cache.set(key, out);
  return out;
}

// ============ GROUND ============
export function roadTexture() {
  return makeCanvasTexture('road', 512, 512, (ctx, S) => {
    const rng = makeRng(42);
    ctx.fillStyle = '#23262b';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 2600; i++) {
      ctx.fillStyle = `rgba(${rng.int(28, 78)},${rng.int(30, 78)},${rng.int(34, 84)},0.5)`;
      ctx.fillRect(rng() * S, rng() * S, rng.range(1, 3.4), rng.range(1, 3.4));
    }
    // cracks
    ctx.strokeStyle = 'rgba(10,10,12,0.55)';
    for (let i = 0; i < 10; i++) {
      ctx.lineWidth = rng.range(0.8, 2);
      let x = rng() * S, y = rng() * S;
      ctx.beginPath(); ctx.moveTo(x, y);
      for (let j = 0; j < 7; j++) {
        x += rng.range(-38, 38); y += rng.range(-38, 38);
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    // lane paint (worn)
    ctx.fillStyle = 'rgba(210,190,90,0.5)';
    for (let y = 20; y < S; y += 128) {
      for (let x = 0; x < S; x += 64) ctx.fillRect(x, y, 34, 7);
    }
  });
}

export function sidewalkTexture() {
  return makeCanvasTexture('sidewalk', 256, 256, (ctx, S) => {
    const rng = makeRng(77);
    ctx.fillStyle = '#63666c';
    ctx.fillRect(0, 0, S, S);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = `rgba(${rng.int(70, 130)},${rng.int(70, 130)},${rng.int(75, 135)},0.4)`;
      ctx.fillRect(rng() * S, rng() * S, 2, 2);
    }
    ctx.strokeStyle = 'rgba(20,22,26,0.7)';
    ctx.lineWidth = 3;
    for (let i = 0; i <= 2; i++) {
      const p = (i / 2) * S;
      ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, S); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(S, p); ctx.stroke();
    }
  });
}

// ============ FX SPRITES ============
export function softCircleTexture() {
  return makeCanvasTexture('softcircle', 128, 128, (ctx, S) => {
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  });
}

export function sparkTexture() {
  return makeCanvasTexture('spark', 64, 64, (ctx, S) => {
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.2, 'rgba(255,240,200,0.95)');
    g.addColorStop(0.55, 'rgba(255,160,60,0.5)');
    g.addColorStop(1, 'rgba(255,120,20,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
  });
}

export function smokeTexture() {
  return makeCanvasTexture('smoke', 128, 128, (ctx, S) => {
    const rng = makeRng(1234);
    for (let i = 0; i < 26; i++) {
      const x = S / 2 + rng.range(-26, 26), y = S / 2 + rng.range(-26, 26);
      const r = rng.range(14, 34);
      const g = ctx.createRadialGradient(x, y, 0, x, y, r);
      g.addColorStop(0, 'rgba(255,255,255,0.10)');
      g.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  });
}

export function ringTexture() {
  return makeCanvasTexture('ring', 128, 128, (ctx, S) => {
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 8, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)';
    ctx.lineWidth = 14;
    ctx.beginPath();
    ctx.arc(S / 2, S / 2, S / 2 - 11, 0, Math.PI * 2);
    ctx.stroke();
  });
}

// star-field / night sky dome texture
export function skyStarsTexture() {
  return makeCanvasTexture('stars', 1024, 512, (ctx, W, H) => {
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);
    const rng = makeRng(999);
    for (let i = 0; i < 700; i++) {
      const x = rng() * W, y = rng() * H * 0.7;
      const b = rng.range(0.3, 1);
      ctx.fillStyle = `rgba(255,255,255,${b})`;
      const s = rng.chance(0.06) ? 2 : 1;
      ctx.fillRect(x, y, s, s);
    }
  });
}
