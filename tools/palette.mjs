#!/usr/bin/env node
// Extract a mech skin recipe from a concept image (PNG).
//   node tools/palette.mjs docs/canonical/vulcan-front.png
// Outputs dominant colors via k-means (background-filtered) and a suggested
// `skin` block for roster.js. Weathering/grime still need an eyeball pass —
// this gets the palette science right so the recipe starts close.
import fs from 'node:fs';
import { PNG } from 'pngjs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node tools/palette.mjs <image.png> [clusters=6]');
  process.exit(1);
}
const K = Number(process.argv[3] || 6);
const png = PNG.sync.read(fs.readFileSync(file));

// sample pixels (skip transparent + near-background)
const samples = [];
const stride = Math.max(1, Math.floor(Math.sqrt((png.width * png.height) / 40000)));
// estimate background from the 4 corners
const corner = (x, y) => {
  const i = (y * png.width + x) * 4;
  return [png.data[i], png.data[i + 1], png.data[i + 2]];
};
const bg = [
  corner(2, 2), corner(png.width - 3, 2),
  corner(2, png.height - 3), corner(png.width - 3, png.height - 3),
];
const isBg = (r, g, b) =>
  bg.some(([br, bgc, bb]) => Math.abs(r - br) + Math.abs(g - bgc) + Math.abs(b - bb) < 60);

for (let y = 0; y < png.height; y += stride) {
  for (let x = 0; x < png.width; x += stride) {
    const i = (y * png.width + x) * 4;
    const a = png.data[i + 3];
    if (a < 200) continue;
    const r = png.data[i], g = png.data[i + 1], b = png.data[i + 2];
    if (isBg(r, g, b)) continue;
    samples.push([r, g, b]);
  }
}
if (samples.length < 100) {
  console.error('too few foreground samples — is the background plain?');
  process.exit(1);
}

// k-means
let centers = [];
for (let i = 0; i < K; i++) centers.push(samples[Math.floor((i + 0.5) * samples.length / K)].slice());
for (let iter = 0; iter < 24; iter++) {
  const sums = centers.map(() => [0, 0, 0, 0]);
  for (const s of samples) {
    let bi = 0, bd = Infinity;
    for (let c = 0; c < K; c++) {
      const d = (s[0] - centers[c][0]) ** 2 + (s[1] - centers[c][1]) ** 2 + (s[2] - centers[c][2]) ** 2;
      if (d < bd) { bd = d; bi = c; }
    }
    sums[bi][0] += s[0]; sums[bi][1] += s[1]; sums[bi][2] += s[2]; sums[bi][3]++;
  }
  for (let c = 0; c < K; c++) {
    if (sums[c][3] > 0) {
      centers[c] = [sums[c][0] / sums[c][3], sums[c][1] / sums[c][3], sums[c][2] / sums[c][3], sums[c][3]];
    }
  }
}
centers = centers
  .filter((c) => c[3] > samples.length * 0.02)
  .sort((a, b) => b[3] - a[3]);

const hex = (c) => '0x' + ((Math.round(c[0]) << 16) | (Math.round(c[1]) << 8) | Math.round(c[2])).toString(16).padStart(6, '0');
const lum = (c) => 0.299 * c[0] + 0.587 * c[1] + 0.114 * c[2];
const sat = (c) => { const mx = Math.max(...c.slice(0, 3)), mn = Math.min(...c.slice(0, 3)); return mx === 0 ? 0 : (mx - mn) / mx; };

console.log('dominant colors (share of foreground):');
for (const c of centers) {
  console.log(`  ${hex(c)}  ${(100 * c[3] / samples.length).toFixed(1)}%  lum=${lum(c).toFixed(0)} sat=${sat(c).toFixed(2)}`);
}

// heuristic roles: primary = biggest cluster; accent = most saturated
// non-primary with decent share; metal/frame = darkest desaturated; glow =
// brightest saturated small cluster
const primary = centers[0];
const accent = centers.slice(1).filter((c) => sat(c) > 0.25).sort((a, b) => sat(b) * b[3] - sat(a) * a[3])[0];
const dark = centers.slice(1).filter((c) => lum(c) < 90).sort((a, b) => lum(a) - lum(b))[0];
const glow = centers.filter((c) => lum(c) > 130 && sat(c) > 0.4).sort((a, b) => lum(b) + 200 * sat(b) - (lum(a) + 200 * sat(a)))[0];

console.log('\nsuggested roster entry fragments:');
console.log(`colors: { primary: ${hex(primary)}, accent: ${accent ? hex(accent) : '0x??'}, glow: ${glow ? hex(glow) : '0x??'} },`);
console.log(`skin: {
  primary: { base: ${hex(primary)}, base2: null, metal: 0x8a8f96, wear: 0.4, grime: 0.4, panelDepth: 3, roughPaint: 0.5, metalPaint: 0.3, normalStrength: 1.1 },
  accent: { base: ${accent ? hex(accent) : '0x??'}, base2: null, metal: 0x8a8f96, wear: 0.48, grime: 0.42, panelDepth: 3, roughPaint: 0.52, metalPaint: 0.3, normalStrength: 1.1 },
},`);
if (dark) console.log(`// frame/under-structure tone in the image: ${hex(dark)}`);
console.log('\n(tune wear/grime by eye against the concept; see docs/IMAGE_TO_MECH.md)');
