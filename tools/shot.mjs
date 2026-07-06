// Screenshot helper: node shot.mjs <url> <outfile> [waitMs]
import { chromium } from 'playwright-core';

const [url, out, waitMs = '2500'] = process.argv.slice(2);
const browser = await chromium.launch({
  executablePath: '/opt/pw-browsers/chromium',
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--no-sandbox'],
});
const page = await browser.newPage({ viewport: { width: 960, height: 540 } });
const errors = [];
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', (e) => errors.push(String(e)));
await page.goto(url, { waitUntil: 'networkidle' }).catch((e) => errors.push(String(e)));
await page.waitForTimeout(Number(waitMs));
await page.screenshot({ path: out });
if (errors.length) console.log('PAGE ERRORS:\n' + errors.join('\n'));
else console.log('no page errors');
await browser.close();
