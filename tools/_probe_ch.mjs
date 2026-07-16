import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
const pg = await b.newPage();
await pg.goto('http://localhost:5173/?battle=neon&p1=aegis&p2=titanus', { waitUntil: 'load' });
await pg.waitForFunction(() => window.__world && window.__fighters?.length >= 2, null, { timeout: 120000 });
await pg.waitForTimeout(800);
await pg.evaluate(() => { window.__fighters[0]._aimHold = true; });
await pg.waitForTimeout(600); // let the RAF-driven HUD update run
const shown = await pg.evaluate(() => {
  const hud = document.getElementById('hud');
  return [...hud.querySelectorAll('div')].some((d) => d.style.borderRadius === '50%' && d.style.display === 'block');
});
console.log(JSON.stringify({ crosshairShown: shown }));
await b.close();
