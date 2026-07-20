// Load a URL headless, dump console messages matching a filter (default: all warn/error + [contract]).
import { chromium } from 'playwright-core';
const [url, waitMs = '30000'] = process.argv.slice(2);
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'] });
const page = await browser.newPage();
page.on('console', (m) => {
  const t = m.type(), txt = m.text();
  if (t === 'warning' || t === 'error' || txt.includes('[contract]')) console.log(`${t}: ${txt}`);
});
page.on('pageerror', (e) => console.log('PAGEERROR: ' + e.message));
await page.goto(url, { waitUntil: 'load' });
await page.waitForTimeout(Number(waitMs));
await browser.close();
