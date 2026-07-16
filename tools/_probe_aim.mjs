// Probe: hold-RB aim (crosshair, pitch on release), wraith hover-lean,
// eagle kicks, titanus/colossus finisher scripts run clean.
import { chromium } from 'playwright-core';
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
const pg = await b.newPage();
pg.on('pageerror', (e) => console.log('PAGEERROR:', e.message));
await pg.goto('http://localhost:5173/?battle=neon&p1=aegis&p2=titanus', { waitUntil: 'load' });
await pg.waitForFunction(() => window.__world && window.__fighters?.length >= 2, null, { timeout: 120000 });
await pg.waitForTimeout(800);
const out = await pg.evaluate(() => {
  const w = window.__world;
  const [ae, ti] = window.__fighters;
  const R = {};
  window.__ais?.splice(0);
  const zero = (f) => { const I = f.intent; for (const k in I) I[k] = typeof I[k] === 'number' ? 0 : false; };
  const step = (n, fn) => { for (let i = 0; i < n; i++) { fn?.(); w.update(1 / 60); } };
  zero(ae); zero(ti);
  ae.pos.set(0, 0, -10); ae.yaw = ae.targetYaw = 0;
  ti.pos.set(0, 6, 10); ti.vel.set(0, 0, 0); ti.iframes = 0; // airborne target
  step(3);
  // 1. hold RB: no shot, aimHold set, crosshair visible in DOM
  ae.isAI = false;
  ae.intent.ranged = true; ae.intent.rangedHeld = true;
  step(20, () => { ae.intent.ranged = true; ae.intent.rangedHeld = true; ti.pos.set(0, 6, 10); ti.vel.set(0, 0, 0); });
  R.aim = {
    holdActive: !!ae._aimHold,
    noShotYet: !w.projectiles.active.some((p) => p.type === 'spear'),
    crosshairShown: !!document.querySelector('#hud div[style*="border-radius: 50%"][style*="display: block"], #hud div[style*="display:block"]')
      || [...document.querySelectorAll('#hud div')].some((d) => d.style.borderRadius === '50%' && d.style.display === 'block'),
  };
  // 2. release: spear flies, pitched toward the aim point
  ae.intent.ranged = false; ae.intent.rangedHeld = false;
  let spear = null;
  step(35, () => { spear = spear || w.projectiles.active.find((p) => p.type === 'spear'); ti.pos.set(0, 6, 10); ti.vel.set(0, 0, 0); });
  R.aim.firedOnRelease = !!spear;
  R.aim.velY = spear ? +spear.vel.y.toFixed(1) : null;
  step(60);
  return R;
});
console.log(JSON.stringify(out, null, 1));

// finisher scripts
const fin = await pg.evaluate(async () => {
  const w = window.__world;
  const [ae, ti] = window.__fighters;
  const R = {};
  const zero = (f) => { const I = f.intent; for (const k in I) I[k] = typeof I[k] === 'number' ? 0 : false; };
  zero(ae); zero(ti);
  ae.pos.set(0, 0, -4); ti.pos.set(0, 0, 4);
  // titanus finisher: titanus finishes aegis
  ti.hp = ti.maxHp; ae.hp = 1;
  w.startFinisher(ti, ae, () => { R.titanusDone = true; });
  for (let i = 0; i < 60 * 8 && !R.titanusDone; i++) w.update(1 / 60);
  R.titanusRan = R.titanusDone === true;
  // colossus finisher script runs on titanus's body (script is per-def id
  // — fake it by borrowing the colossus script through def swap)
  ae.hp = ae.maxHp; ae.alive = true; ae.setState('normal');
  ti.alive = true; ti.setState('normal');
  ae.pos.set(0, 0, -4); ti.pos.set(0, 0, 4);
  const realId = ti.def.id;
  try {
    Object.defineProperty(ti.def, 'id', { value: 'colossus', configurable: true });
    w.startFinisher(ti, ae, () => { R.colossusDone = true; });
    for (let i = 0; i < 60 * 8 && !R.colossusDone; i++) w.update(1 / 60);
  } finally {
    Object.defineProperty(ti.def, 'id', { value: realId, configurable: true });
  }
  R.colossusRan = R.colossusDone === true;
  return R;
});
console.log(JSON.stringify(fin));
await b.close();
