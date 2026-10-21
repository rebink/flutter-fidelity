import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { chromium } from 'playwright-core';
import { FigmaBridge } from '../src/figma-bridge.js';

test('bundled Figma plugin works in an opaque-origin browser sandbox', async t => {
  let channel: string | undefined;
  try { await fs.access(chromium.executablePath()); }
  catch {
    if (process.platform === 'darwin') {
      try { await fs.access('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'); channel = 'chrome'; }
      catch { t.skip('Install Playwright Chromium for sandboxed browser coverage.'); return; }
    } else { t.skip('Install Playwright Chromium for sandboxed browser coverage.'); return; }
  }
  const browser = await chromium.launch({ headless: true, channel });
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity-plugin-browser-'));
  t.after(async () => { await browser.close(); await fs.rm(root, { recursive: true, force: true }); });
  const bridge = new FigmaBridge({ jobTimeoutMs: 3000, pollTimeoutMs: 50 });
  t.after(() => bridge.close());
  const connection = await bridge.start(0);
  const png = await sharp({ create: { width: 20, height: 30, channels: 4, background: 'blue' } }).png().toBuffer();
  const ui = await fs.readFile('figma-plugin/ui.html', 'utf8');
  const sandbox = await fs.readFile('figma-plugin/code.js', 'utf8');
  const json = (value: unknown) => JSON.stringify(value).replaceAll('<', '\\u003c');
  const fixtureContext = { document: { id: '1:2', type: 'FRAME', children: [] } };
  const pairingCode = connection.pairingCode.replace(/^\d+/, '43871');

  const channels = new Set<string>();
  async function fixture(options: {
    dropReady?: number; dropMetadata?: number; denied?: boolean; offline?: boolean; delayConnect?: boolean;
    dropConnectResponses?: number; failPolls?: number; delayResult?: boolean; healthStatus?: number; healthBody?: string;
  } = {}) {
    let acceptConnect!: () => void, releaseConnect!: () => void, acceptResult!: () => void, releaseResult!: () => void;
    const connectAccepted = new Promise<void>(resolve => { acceptConnect = resolve; });
    const connectReleased = new Promise<void>(resolve => { releaseConnect = resolve; });
    const resultAccepted = new Promise<void>(resolve => { acceptResult = resolve; });
    const resultReleased = new Promise<void>(resolve => { releaseResult = resolve; });
    const acceptedSessions: string[] = [];
    const context = await browser.newContext();
    t.after(async () => { releaseConnect(); releaseResult(); await context.close(); });
    // Model the user's local-network permission only inside this isolated test browser.
    await context.grantPermissions(['local-network-access']);
    const requests: { route: string; authorized: boolean; hasBody: boolean }[] = [];
    // Only rewrite the port: production UI and manifest still agree on localhost:43871.
    await context.route('http://localhost:43871/**', async route => {
      const pathname = new URL(route.request().url()).pathname;
      requests.push({ route: pathname, authorized: !!route.request().headers()['authorization'], hasBody: !!route.request().postData() });
      if (pathname === '/health' && (options.healthStatus !== undefined || options.healthBody !== undefined)) {
        await route.fulfill({ status: options.healthStatus ?? 200, headers: { 'Access-Control-Allow-Origin': 'null', 'Content-Type': 'application/json' }, body: options.healthBody ?? '{}' });
        return;
      }
      if (options.offline) { await route.abort('connectionrefused'); return; }
      if (pathname === '/poll' && options.failPolls && options.failPolls-- > 0) { await route.abort('failed'); return; }
      const url = connection.address + pathname;
      if (pathname === '/connect' && (options.delayConnect || options.dropConnectResponses)) {
        const response = await route.fetch({ url });
        if (response.ok()) acceptedSessions.push((await response.json()).sessionId);
        acceptConnect();
        if (options.dropConnectResponses && options.dropConnectResponses-- > 0) { await route.abort('failed'); return; }
        if (options.delayConnect) await connectReleased;
        await route.fulfill({ response });
      } else {
        if (pathname === '/result' && options.delayResult) { acceptResult(); await resultReleased; }
        await route.continue({ url });
      }
    });
    const page = await context.newPage();
    page.setDefaultTimeout(5000);
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    t.after(() => assert.deepEqual(errors, []));
    const relay = '<script>onmessage = event => parent.frames[1].postMessage({ pluginMessage: event.data }, "*");</script>';
    const child = ui.replace('<script>', '<script>Object.defineProperty(crypto, "randomUUID", { value: undefined });');
    await page.route('http://localhost/figma-fixture', route => route.fulfill({ contentType: 'text/html', body: `<!doctype html>
      <iframe id="relay"></iframe><iframe id="plugin" name="plugin-ui" sandbox="allow-scripts" allow="local-network-access *" style="width:380px;height:500px"></iframe>
      <script>
        window.fixture = { readyCount: 0, dropMetadata: ${options.dropMetadata ?? 0}, denied: ${!!options.denied}, messages: [], exports: [], handlers: {} };
        window.deliver = message => document.getElementById('relay').contentWindow.postMessage(message, '*');
        const node = { id: '1:2', name: 'Screen', type: 'FRAME', parent: { type: 'PAGE', id: '0:1' }, absoluteBoundingBox: { width: 20, height: 30 },
          async exportAsync(settings) { fixture.exports.push(settings.format); return settings.format === 'PNG' ? new Uint8Array(${json([...png])}) : ${json(fixtureContext)}; },
          async getCSSAsync() { return { color: 'blue' }; } };
        const figma = {
          get root() { if (fixture.denied) throw new Error('Document access denied'); return { name: 'Sandbox design' }; },
          currentPage: { id: '0:1', selection: [node] }, showUI() {},
          on(event, handler) { fixture.handlers[event] = handler; }, async getNodeByIdAsync() { return node; },
          ui: { postMessage(message) { if (message.type === 'metadata' && fixture.dropMetadata-- > 0) return; deliver(message); } }
        };
        const __html__ = '';
        ${sandbox}
        addEventListener('message', event => {
          if (event.source !== document.getElementById('plugin').contentWindow) return;
          const message = event.data?.pluginMessage;
          if (!message) return;
          fixture.messages.push(message);
          if (message.type === 'ready' && ++fixture.readyCount <= ${options.dropReady ?? 0}) return;
          void figma.ui.onmessage(message);
        });
        document.getElementById('relay').srcdoc = ${json(relay)};
        document.getElementById('plugin').srcdoc = ${json(child)};
      </script>` }));
    await page.goto('http://localhost/figma-fixture');
    await page.waitForFunction(() => (window as any).fixture.readyCount > 0);
    const frame = page.frame({ name: 'plugin-ui' })!;
    const launchChannel = await page.evaluate(() => (window as any).fixture.messages[0].channel);
    assert.ok(!channels.has(launchChannel), 'each launch uses a new channel');
    channels.add(launchChannel);
    return { page, frame, connectAccepted, releaseConnect, resultAccepted, releaseResult, acceptedSessions, requests };
  }

  await t.test('retries dropped metadata; relayed replies work without randomUUID and export exact PNG bytes', async () => {
    const { page, frame } = await fixture({ dropReady: 2 });
    assert.equal(await frame.locator('#connect').isDisabled(), true);
    assert.deepEqual(await frame.evaluate(() => ({ origin: window.origin, randomUUID: typeof crypto.randomUUID, random: typeof crypto.getRandomValues })),
      { origin: 'null', randomUUID: 'undefined', random: 'function' });
    await frame.waitForFunction(() => !(document.getElementById('connect') as HTMLButtonElement).disabled);
    const ready = await page.evaluate(() => (window as any).fixture.messages.filter((message: any) => message.type === 'ready'));
    assert.equal(ready.length, 3);
    assert.match(ready[0].channel, /^[a-f0-9]{32}$/);
    assert.ok(ready.every((message: any) => message.channel === ready[0].channel));
    await frame.locator('#code').fill(pairingCode);
    await frame.locator('#connect').click();
    await frame.waitForFunction(() => !(document.getElementById('disconnect') as HTMLButtonElement).disabled);
    assert.equal(bridge.status().session?.documentName, 'Sandbox design');
    const result = await bridge.acquire({ sessionId: bridge.status().session!.sessionId, out: path.join(root, 'intake'), css: true });
    assert.ok('status' in result);
    assert.equal(result.status, 'acquired');
    assert.deepEqual(await fs.readFile(path.join(root, 'intake/frames/reference.png')), png);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, 'intake/context/css.json'), 'utf8')), { color: 'blue' });
    await frame.locator('#disconnect').click();
    await frame.locator('#status').filter({ hasText: 'Disconnected.' }).waitFor();
    assert.equal(bridge.status().connected, false);
  });

  await t.test('wrong or missing channel cannot inject metadata or trigger an export', async () => {
    const { page, frame } = await fixture({ dropMetadata: 100 });
    await frame.evaluate(() => {
      for (const channel of [undefined, 'f'.repeat(32)]) {
        window.dispatchEvent(new MessageEvent('message', { data: { pluginMessage: { type: 'metadata', channel, metadata: { documentName: 'Injected', selection: [] } } } }));
      }
      window.dispatchEvent(new MessageEvent('message', { data: null }));
      parent.postMessage({ pluginMessage: { type: 'ready', channel: 'e'.repeat(32) } }, '*');
      parent.postMessage({ pluginMessage: { type: 'export', channel: 'e'.repeat(32), job: { id: 'forged', nodeId: '1:2', scale: 1 } } }, '*');
    });
    await page.waitForFunction(() => (window as any).fixture.messages.some((message: any) => message.job?.id === 'forged'));
    assert.equal(await frame.locator('#connect').isDisabled(), true);
    assert.ok(!(await frame.locator('#document').textContent())!.includes('Injected'));
    assert.deepEqual(await page.evaluate(() => (window as any).fixture.exports), []);
    await page.evaluate(() => { const fixture = (window as any).fixture; fixture.dropMetadata = 0; fixture.handlers.selectionchange(); });
    await frame.waitForFunction(() => !(document.getElementById('connect') as HTMLButtonElement).disabled);
    assert.match((await frame.locator('#document').textContent())!, /Sandbox design/);
    assert.equal(bridge.status().connected, false);
  });

  await t.test('document-read errors are visible and a later successful metadata retry recovers', async () => {
    const { page, frame } = await fixture({ denied: true });
    await frame.locator('#status').filter({ hasText: 'Could not read this Figma file: Document access denied' }).waitFor();
    assert.equal(await frame.locator('#connect').isDisabled(), true);
    await page.evaluate(() => { (window as any).fixture.denied = false; });
    await frame.waitForFunction(() => !(document.getElementById('connect') as HTMLButtonElement).disabled);
    assert.match((await frame.locator('#document').textContent())!, /Sandbox design/);
  });

  await t.test('a document error during pairing cleans up the accepted session and allows reconnecting', async () => {
    const { page, frame, connectAccepted, releaseConnect } = await fixture({ delayConnect: true });
    await frame.waitForFunction(() => !(document.getElementById('connect') as HTMLButtonElement).disabled);
    await frame.locator('#code').fill(pairingCode);
    await frame.locator('#connect').click();
    await connectAccepted;
    assert.equal(bridge.status().connected, true);
    await page.evaluate(() => { const fixture = (window as any).fixture; fixture.denied = true; fixture.handlers.selectionchange(); });
    await frame.locator('#status').filter({ hasText: 'Could not read this Figma file' }).waitFor();
    await page.evaluate(() => { const fixture = (window as any).fixture; fixture.denied = false; fixture.handlers.selectionchange(); });
    await frame.locator('#document').filter({ hasText: 'Sandbox design' }).waitFor();
    assert.equal(await frame.locator('#connect').isDisabled(), true);
    const disconnected = page.waitForResponse(response => response.url().endsWith('/disconnect') && response.ok());
    releaseConnect();
    await disconnected;
    assert.equal(bridge.status().connected, false);
    await frame.waitForFunction(() => !(document.getElementById('connect') as HTMLButtonElement).disabled);
    await frame.locator('#code').fill(pairingCode);
    await frame.locator('#connect').click();
    await frame.waitForFunction(() => !(document.getElementById('disconnect') as HTMLButtonElement).disabled);
    assert.equal(bridge.status().connected, true);
    await frame.locator('#disconnect').click();
    await frame.locator('#status').filter({ hasText: 'Disconnected.' }).waitFor();
    assert.equal(bridge.status().connected, false);
  });

  await t.test('a lost pairing response retries the same launch without stranding ownership', async () => {
    const { frame, acceptedSessions, requests } = await fixture({ dropConnectResponses: 1 });
    await frame.waitForFunction(() => !(document.getElementById('connect') as HTMLButtonElement).disabled);
    await frame.locator('#code').fill(pairingCode);
    await frame.locator('#connect').click();
    await frame.waitForFunction(() => !(document.getElementById('disconnect') as HTMLButtonElement).disabled);
    assert.equal(requests.filter(request => request.route === '/connect').length, 2);
    assert.equal(acceptedSessions.length, 1);
    assert.equal(bridge.status().session?.sessionId, acceptedSessions[0]);
    assert.equal(await frame.locator('#code').inputValue(), '');
    await frame.locator('#disconnect').click();
    await frame.locator('#status').filter({ hasText: 'Disconnected.' }).waitFor();
  });

  await t.test('one transient poll failure keeps pairing and the next fresh export succeeds', async () => {
    const { frame, requests } = await fixture({ failPolls: 1 });
    await frame.waitForFunction(() => !(document.getElementById('connect') as HTMLButtonElement).disabled);
    await frame.locator('#code').fill(pairingCode);
    await frame.locator('#connect').click();
    await frame.waitForFunction(() => !(document.getElementById('disconnect') as HTMLButtonElement).disabled);
    const sessionId = bridge.status().session!.sessionId;
    await frame.locator('#status').filter({ hasText: 'Connection restored. Still paired.' }).waitFor();
    assert.equal(bridge.status().session?.sessionId, sessionId);
    assert.equal(requests.some(request => request.route === '/disconnect'), false);
    assert.equal(await frame.locator('#code').inputValue(), '');
    const out = path.join(root, 'after-transient-poll');
    const result = await bridge.acquire({ sessionId, out });
    assert.ok('status' in result);
    assert.equal(result.status, 'acquired');
    assert.deepEqual(await fs.readFile(path.join(out, 'frames/reference.png')), png);
    await frame.locator('#disconnect').click();
    await frame.locator('#status').filter({ hasText: 'Disconnected.' }).waitFor();
  });

  await t.test('an exhausted transport retry offers one-click Reconnect without restoring the code to the DOM', async () => {
    const options = { offline: false, healthStatus: undefined as number | undefined };
    const { page, frame, requests } = await fixture(options);
    await frame.waitForFunction(() => !(document.getElementById('connect') as HTMLButtonElement).disabled);
    await frame.locator('#code').fill(pairingCode);
    await frame.locator('#connect').click();
    await frame.waitForFunction(() => !(document.getElementById('disconnect') as HTMLButtonElement).disabled);
    const sessionId = bridge.status().session!.sessionId;
    options.offline = true;
    await frame.locator('#connect').filter({ hasText: 'Reconnect' }).waitFor();
    assert.equal(await frame.locator('#connect').isDisabled(), false);
    assert.equal(await frame.locator('#code').inputValue(), '');
    assert.equal(requests.some(request => request.route === '/disconnect'), false);
    await page.evaluate(() => { (window as any).fixture.handlers.selectionchange(); });
    assert.equal(await frame.locator('#connect').isDisabled(), false);
    await frame.locator('#connect').click();
    await frame.locator('#status').filter({ hasText: 'Could not connect:' }).waitFor();
    assert.equal(await frame.locator('#connect').textContent(), 'Reconnect');
    assert.equal(await frame.locator('#code').inputValue(), '');
    options.offline = false;
    options.healthStatus = 503;
    await frame.locator('#connect').click();
    await frame.locator('#status').filter({ hasText: 'HTTP 503' }).waitFor();
    assert.equal(await frame.locator('#connect').textContent(), 'Reconnect');
    assert.equal(requests.filter(request => request.route === '/connect').length, 1);
    options.healthStatus = undefined;
    await frame.locator('#connect').click();
    await frame.waitForFunction(() => !(document.getElementById('disconnect') as HTMLButtonElement).disabled);
    assert.equal(bridge.status().session?.sessionId, sessionId);
    assert.equal(await frame.locator('#code').inputValue(), '');
    await frame.locator('#disconnect').click();
    await frame.locator('#status').filter({ hasText: 'Disconnected.' }).waitFor();
  });

  await t.test('a closed plugin can pair a fresh launch after inactivity, never while the owner is active', async child => {
    let now = Date.now();
    child.mock.method(Date, 'now', () => now);
    const first = await fixture();
    await first.frame.waitForFunction(() => !(document.getElementById('connect') as HTMLButtonElement).disabled);
    await first.frame.locator('#code').fill(pairingCode);
    await first.frame.locator('#connect').click();
    await first.frame.waitForFunction(() => !(document.getElementById('disconnect') as HTMLButtonElement).disabled);
    const previousSession = bridge.status().session!.sessionId;
    const next = await fixture();
    await next.frame.waitForFunction(() => !(document.getElementById('connect') as HTMLButtonElement).disabled);
    await next.frame.locator('#code').fill(pairingCode);
    await next.frame.locator('#connect').click();
    await next.frame.locator('#status').filter({ hasText: 'already paired' }).waitFor();
    assert.equal(bridge.status().session?.sessionId, previousSession);
    await first.page.close();
    await new Promise(resolve => setTimeout(resolve, 60)); // The fixture's 50 ms poll must finish or close before expiring ownership.
    now += 31_000;
    await next.frame.locator('#connect').click();
    await next.frame.waitForFunction(() => !(document.getElementById('disconnect') as HTMLButtonElement).disabled);
    assert.notEqual(bridge.status().session?.sessionId, previousSession);
    await next.frame.locator('#disconnect').click();
    await next.frame.locator('#status').filter({ hasText: 'Disconnected.' }).waitFor();
  });

  await t.test('an expired export response preserves pairing and a new output folder succeeds', async () => {
    const options = { delayResult: true };
    const { page, frame, resultAccepted, releaseResult, requests } = await fixture(options);
    await frame.waitForFunction(() => !(document.getElementById('connect') as HTMLButtonElement).disabled);
    await frame.locator('#code').fill(pairingCode);
    await frame.locator('#connect').click();
    await frame.waitForFunction(() => !(document.getElementById('disconnect') as HTMLButtonElement).disabled);
    const sessionId = bridge.status().session!.sessionId;
    const failedOut = path.join(root, 'expired-result');
    const done = bridge.acquire({ sessionId, out: failedOut }).catch(error => error);
    await Promise.race([resultAccepted, done.then(() => { throw new Error('Export ended before its response could be delayed.'); })]);
    assert.match((await done).message, /timed out/);
    assert.equal(JSON.parse(await fs.readFile(path.join(failedOut, 'intake.json'), 'utf8')).status, 'failed');
    await assert.rejects(fs.access(path.join(failedOut, 'frames/reference.png')));
    const rejected = page.waitForResponse(response => response.url().endsWith('/result') && response.status() === 409);
    options.delayResult = false;
    releaseResult();
    await rejected;
    await frame.locator('#status').filter({ hasText: 'export request expired' }).waitFor();
    assert.equal(bridge.status().session?.sessionId, sessionId);
    assert.equal(requests.some(request => request.route === '/disconnect'), false);
    const out = path.join(root, 'after-expired-result');
    const result = await bridge.acquire({ sessionId, out });
    assert.ok('status' in result);
    assert.equal(result.status, 'acquired');
    assert.deepEqual(await fs.readFile(path.join(out, 'frames/reference.png')), png);
    await frame.locator('#disconnect').click();
    await frame.locator('#status').filter({ hasText: 'Disconnected.' }).waitFor();
  });

  await t.test('metadata retries stop after twenty attempts with a useful recovery message', async () => {
    const { page, frame } = await fixture({ dropReady: 100 });
    await frame.locator('#status').filter({ hasText: 'Figma did not respond.' }).waitFor({ timeout: 12_000 });
    assert.match((await frame.locator('#status').textContent())!, /Close and rerun/);
    assert.equal(await page.evaluate(() => (window as any).fixture.readyCount), 20);
    await new Promise(resolve => setTimeout(resolve, 600));
    assert.equal(await page.evaluate(() => (window as any).fixture.readyCount), 20);
    assert.equal(await frame.locator('#connect').isDisabled(), true);
  });

  await t.test('invalid pairing codes keep the plugin usable and preserve the bridge error', async () => {
    const { frame } = await fixture();
    await frame.waitForFunction(() => !(document.getElementById('connect') as HTMLButtonElement).disabled);
    await frame.locator('#code').fill('not a pairing code');
    await frame.locator('#connect').click();
    assert.match((await frame.locator('#status').textContent())!, /Paste the complete pairing code/);
    await frame.locator('#code').fill('43871.' + 'x'.repeat(32));
    await frame.locator('#connect').click();
    await frame.locator('#status').filter({ hasText: 'Invalid pairing code.' }).waitFor();
    assert.equal(await frame.locator('#connect').isDisabled(), false);
    assert.equal(bridge.status().connected, false);
  });

  await t.test('offline checks send no pairing code and recover after the bridge becomes reachable', async () => {
    const options = { offline: true };
    const { frame, requests } = await fixture(options);
    await frame.waitForFunction(() => !(document.getElementById('connect') as HTMLButtonElement).disabled);
    assert.equal(requests.length, 0, 'opening the plugin does not probe network permissions');
    await frame.locator('#check').click();
    await frame.locator('#status').filter({ hasText: 'No response from localhost:43871.' }).waitFor();
    assert.match((await frame.locator('#status').textContent())!, /setup does not start.*Reload.*\/mcp.*network block/);
    await frame.locator('#code').fill(pairingCode);
    await frame.locator('#connect').click();
    await frame.locator('#status').filter({ hasText: 'Could not connect: No response' }).waitFor();
    assert.ok(requests.every(request => request.route === '/health' && !request.authorized && !request.hasBody));
    assert.equal(await frame.locator('#connect').isDisabled(), false);
    options.offline = false;
    await frame.locator('#check').click();
    await frame.locator('#status').filter({ hasText: 'Compatible bridge responded' }).waitFor();
    assert.equal(bridge.status().connected, false, 'a readiness check must not pair');
    await frame.locator('#connect').click();
    await frame.waitForFunction(() => !(document.getElementById('disconnect') as HTMLButtonElement).disabled);
    assert.equal(bridge.status().connected, true);
    await frame.locator('#disconnect').click();
    await frame.locator('#status').filter({ hasText: 'Disconnected.' }).waitFor();
  });

  await t.test('old and unrelated engines are explained before a pairing secret is sent', async t => {
    for (const options of [
      { healthStatus: 401 }, { healthStatus: 403 }, { healthStatus: 404 }, { healthStatus: 204 },
      { healthBody: '{' }, { healthBody: ' '.repeat(2048) },
      { healthBody: JSON.stringify({ service: 'other', protocol: 2, version: '0.11.1' }) },
      { healthBody: JSON.stringify({ service: 'flutter-fidelity-bridge', protocol: 1, version: '0.11.1' }) },
    ]) await t.test(JSON.stringify(options).slice(0, 100), async () => {
      const { frame, requests } = await fixture(options);
      await frame.waitForFunction(() => !(document.getElementById('connect') as HTMLButtonElement).disabled);
      await frame.locator('#code').fill(pairingCode);
      await frame.locator('#connect').click();
      await frame.locator('#status').filter({ hasText: /matching.*engine|engine.*plugin together/ }).waitFor();
      assert.ok(requests.every(request => request.route === '/health' && !request.authorized && !request.hasBody));
      assert.equal(bridge.status().connected, false);
      assert.equal(await frame.locator('#connect').isDisabled(), false);
    });
  });
});
