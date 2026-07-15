// Generate public/thumbs/<id>.png — square head-and-torso portraits of all
// 12 mechs, captured from the showcase judging camera. These are the roster
// icons used across menus/HUD (run after any mech redesign; dev server must
// be up on :5173).
//   node tools/thumbs.mjs [baseUrl]
import { chromium } from 'playwright-core';
import { mkdirSync } from 'fs';

const BASE = process.argv[2] || 'http://localhost:5173';
const IDS = ['titanus', 'vulcan', 'aegis', 'viper', 'nova', 'rhino',
  'tempest', 'fenrir', 'colossus', 'wraith', 'inferno', 'glacier',
  'cranky', 'saurion', 'frogger', 'jerry'];

mkdirSync('public/thumbs', { recursive: true });
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
for (const id of IDS) {
  await page.goto(`${BASE}/?showcase=${id}&anim=none`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(9000); // SwiftShader ≈20x slow: let the pose settle
  // hide the debug label so it never bleeds into a tall mech's crop
  await page.evaluate(() => {
    for (const el of document.querySelectorAll('#ui-root div')) el.style.display = 'none';
  });
  await page.screenshot({
    path: `public/thumbs/${id}.png`,
    clip: { x: 310, y: 30, width: 340, height: 340 },
  });
  console.log('thumb:', id);
}
await browser.close();
