import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const baseUrl = process.argv[2] || 'http://127.0.0.1:8874';
const out = new URL(`./runs/${new Date().toISOString().replaceAll(':', '-')}/`, import.meta.url);
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const results = await Promise.all([
    { name: 'mobile', width: 402, height: 874, dpr: 4 },
    { name: 'desktop', width: 1280, height: 1000, dpr: 1 },
  ].map(async ({ name, width, height, dpr }) => {
    const context = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: dpr });
    try {
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', error => errors.push(error.message));
      const response = await page.goto(baseUrl, { waitUntil: 'networkidle' });
      assert.equal(response.status(), 200);
      await page.locator('flt-glass-pane').waitFor({ state: 'attached' });
      // Flutter's canvas renderer has no DOM text readiness signal.
      await page.waitForTimeout(2000);
      const image = await page.screenshot();
      assert(image.length > 10000, 'Unexpectedly empty browser capture');
      assert.deepEqual(errors, [], 'Browser runtime errors');
      await writeFile(new URL(`${name}.png`, out), image);
      return { name, width, height, devicePixelRatio: dpr, runtimeErrors: errors };
    } finally {
      await context.close();
    }
  }));
  await writeFile(new URL('browser-checks.json', out), JSON.stringify({ baseUrl, results, visualAcceptance: 'Not certified; inspect captures against the unchanged reference.' }, null, 2));
  console.log('Captures:', out.pathname);
} finally {
  await browser.close();
}
