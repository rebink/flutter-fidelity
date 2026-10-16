import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { chromium, type Browser } from 'playwright-core';
import { acquireFigmaBrowser, FigmaBrowserSchema } from '../src/figma-browser.js';
import { createServer } from '../src/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const url = 'https://www.figma.com/design/BrowserTest/Screen?node-id=1-2';
const recipe = {
  ready: '#editor', selected: { selector: '[aria-selected=true]', idAttribute: 'data-node-id' },
  select: '[data-node-id="{nodeId}"]',
  layers: { selector: '[data-node-id]', idAttribute: 'data-node-id', parentAttribute: 'data-parent-id' },
  panels: [{ name: 'properties', selector: '#properties' }, { name: 'typography', selector: '#typography', open: ['#type-tab'] }],
  export: { button: '#export' },
};

test('browser schema bounds workers/scope and MCP exposes background intake without credentials', async () => {
  assert.equal(FigmaBrowserSchema.parse({ url, out: 'new' }).concurrency, 3);
  assert.equal(FigmaBrowserSchema.parse({ url, out: 'new' }).headless, true);
  assert.equal(FigmaBrowserSchema.parse({ url, out: 'new', headless: false }).headless, false);
  assert.equal(FigmaBrowserSchema.safeParse({ url, out: 'new', headless: 'false' }).success, false);
  for (const concurrency of [0, 7, 2.5]) assert.equal(FigmaBrowserSchema.safeParse({ url, out: 'new', concurrency }).success, false);
  const client = new Client({ name: 'browser-tools', version: '1' }), server = createServer();
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a); await client.connect(b);
  try {
    const tool = (await client.listTools()).tools.find(tool => tool.name === 'acquire_figma_browser');
    assert.ok(tool);
    assert.ok(!('storageState' in tool.inputSchema.properties!));
    assert.equal((tool.inputSchema.properties!.headless as { default: boolean }).default, true);
    const result = await client.callTool({ name: 'acquire_figma_browser', arguments: { url, out: 'unused', concurrency: 20 } });
    assert.equal(result.isError, true);
  } finally { await client.close(); await server.close(); }
});

test('parallel headless acquisition preserves node identity, exact exports and incomplete evidence', async t => {
  let channel: string | undefined;
  try { await fs.access(chromium.executablePath()); }
  catch {
    if (process.platform === 'darwin') {
      try { await fs.access('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'); channel = 'chrome'; }
      catch { t.skip('Install Playwright Chromium for real headless browser coverage.'); return; }
    } else { t.skip('Install Playwright Chromium for real headless browser coverage.'); return; }
  }
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity-browser-'));
  const png = await sharp({ create: { width: 20, height: 30, channels: 4, background: 'red' } }).png().toBuffer();
  const state = path.join(root, 'credentials.json');
  await fs.writeFile(state, JSON.stringify({ cookies: [{ name: 'session', value: 'never-record-browser-secret', domain: '.figma.com', path: '/', expires: -1, httpOnly: true, secure: true, sameSite: 'Lax' }], origins: [] }), { mode: 0o600 });
  const previous = process.env.FIGMA_BROWSER_STORAGE_STATE;
  process.env.FIGMA_BROWSER_STORAGE_STATE = state;
  const browsers: Browser[] = [];
  t.after(async () => {
    await Promise.all(browsers.map(browser => browser.close()));
    if (previous === undefined) delete process.env.FIGMA_BROWSER_STORAGE_STATE; else process.env.FIGMA_BROWSER_STORAGE_STATE = previous;
    await fs.rm(root, { recursive: true, force: true });
  });
  let deny = 0, invalidPNG = false, missingPanel = false, wrongNode = false, hang = false, signIn = false;
  let exports = 0, contextsCreated = 0;
  const navigations: string[] = [];
  const launchModes: boolean[] = [];
  const launch = async ({ headless }: { headless: boolean }) => {
    launchModes.push(headless);
    // Exercise mode propagation without opening a real window in automated tests.
    const browser = await chromium.launch({ headless: true, channel });
    browsers.push(browser);
    const original = browser.newContext.bind(browser);
    browser.newContext = async options => {
      assert.ok(options?.storageState, 'each isolated session receives the same auth snapshot');
      const context = await original(options);
      contextsCreated++;
      const originalPage = context.newPage.bind(context);
      context.newPage = async () => {
        // Route only this test browser. No Figma server is contacted.
        await context.route('https://www.figma.com/**', async route => {
          const requestURL = new URL(route.request().url());
          if (!route.request().isNavigationRequest()) { await route.fulfill({ body: '' }); return; }
          navigations.push(requestURL.searchParams.get('node-id') || '');
          if (deny) { await route.fulfill({ status: deny, body: 'Access blocked' }); return; }
          if (signIn) {
            await route.fulfill(requestURL.pathname === '/login'
              ? { contentType: 'text/html', body: '<input type="password">' }
              : { status: 302, headers: { location: 'https://www.figma.com/login' } });
            return;
          }
          const initial = wrongNode ? '9:99' : requestURL.searchParams.get('node-id')!.replace('-', ':');
          await route.fulfill({ contentType: 'text/html', body: `<!doctype html><html><body>
            <main id="editor">
              <div role="tree">${['1:2', '1:3', '1:4', '1:5', '9:99'].map(id => `<button role="treeitem" data-node-id="${id}" data-parent-id="${id === '1:2' || id === '9:99' ? '' : '1:2'}" aria-selected="${id === initial}">${id}</button>`).join('')}</div>
              <section id="properties"><label>Width<input aria-label="Width" value="20"></label><span id="owner">${initial}</span></section>
              ${missingPanel ? '' : '<section id="typography" hidden><label>Font<input aria-label="Font" value="Inter"></label></section>'}
              <button id="type-tab">Typography</button><a id="export" href="data:${invalidPNG ? 'text/html' : 'image/png'};base64,${(invalidPNG ? Buffer.from('<html>login</html>') : png).toString('base64')}" download>Export PNG</a>
            </main>
            <script>
              for (const row of document.querySelectorAll('[data-node-id]')) row.onclick = () => {
                for (const other of document.querySelectorAll('[data-node-id]')) other.setAttribute('aria-selected', 'false');
                ${hang ? '' : "setTimeout(() => { row.setAttribute('aria-selected', 'true'); document.querySelector('#owner').textContent = row.getAttribute('data-node-id'); document.querySelector('#properties input').value = row.getAttribute('data-node-id'); }, 80);"}
              };
              document.querySelector('#type-tab').onclick = () => {
                const panel = document.querySelector('#typography');
                if (panel) { panel.hidden = true; setTimeout(() => panel.hidden = false, 180); }
              };
            </script></body></html>` });
        });
        const page = await originalPage();
        page.on('download', () => exports++);
        return page;
      };
      return context;
    };
    return browser;
  };
  const run = (name: string, extra: Record<string, unknown> = {}) => acquireFigmaBrowser({ url, out: path.join(root, name), recipe, discoverChildren: false, actionTimeoutMs: 2500, ...extra }, { launch });
  const manifest = async (name: string) => JSON.parse(await fs.readFile(path.join(root, name, 'intake.json'), 'utf8'));

  await t.test('nodes run concurrently in reusable isolated contexts and export root only once', async () => {
    const result = await run('parallel', { nodeIds: ['1:3', '1:3'], discoverChildren: true, concurrency: 3 });
    assert.equal(result.status, 'partial');
    assert.equal(result.structureStatus, 'incomplete');
    assert.equal(result.profileStatus, 'needs-review');
    assert.ok(Number(result.peakWorkers) >= 2 && Number(result.peakWorkers) <= 3);
    assert.equal(contextsCreated, 3);
    assert.equal(launchModes.at(-1), true);
    assert.equal(result.headless, true);
    assert.equal(exports, 1);
    assert.equal(navigations.length, 3, 'reuse pages; no reload per child with selector');
    const evidence = await manifest('parallel');
    assert.deepEqual(evidence.requestedNodes, ['1:2', '1:3', '1:4', '1:5']);
    assert.equal(evidence.nodes.length, 4, 'unrelated visible row is not dispatched');
    assert.equal(evidence.discovery.truncated, false);
    assert.ok(evidence.nodes.every((node: any) => node.status === 'collected'));
    for (const id of ['1:3', '1:4', '1:5']) {
      const panel = JSON.parse(await fs.readFile(path.join(root, 'parallel/context', id.replace(':', '-'), 'properties.json'), 'utf8'));
      assert.ok(panel.text.includes(id));
      assert.equal(panel.fields[0].value, id, 'input values belong to the selected node');
    }
    assert.deepEqual(await fs.readFile(path.join(root, 'parallel/frames/reference.png')), png);
    assert.ok(!JSON.stringify(evidence).includes('never-record-browser-secret'));
    assert.equal(browsers.at(-1)!.isConnected(), false);
    await assert.rejects(run('parallel'), /EEXIST/);
  });
  await t.test('automatic child discovery honors the bound and preserves omitted evidence', async () => {
    const result = await run('capped-discovery', { discoverChildren: true, maxNodes: 2 });
    assert.equal(result.status, 'partial');
    const record = await manifest('capped-discovery');
    assert.deepEqual(record.requestedNodes, ['1:2', '1:3']);
    assert.deepEqual(record.discovery.omittedNodeIds, ['1:4', '1:5']);
    assert.equal(record.discovery.truncated, true);
  });
  await t.test('inspection saves background UI evidence but no fake reference', async () => {
    const result = await run('inspect', { recipe: undefined });
    assert.equal(result.status, 'inspected');
    await fs.access(path.join(root, 'inspect/context/editor-diagnostic.png'));
    await assert.rejects(fs.access(path.join(root, 'inspect/frames/reference.png')));
  });
  await t.test('explicit visible retry is serial and records the requested launch mode', async () => {
    const before = contextsCreated;
    const result = await run('visible-retry', { headless: false, nodeIds: ['1:3', '1:4'], concurrency: 3 });
    assert.equal(launchModes.at(-1), false);
    assert.equal(result.headless, false);
    assert.equal(result.concurrency, 1);
    assert.equal(result.peakWorkers, 1);
    assert.equal(contextsCreated - before, 1);
    const record = await manifest('visible-retry');
    assert.ok(record.nodes.every((node: any) => node.status === 'collected'));
    assert.ok(!JSON.stringify(record).includes('never-record-browser-secret'));
    assert.equal(browsers.at(-1)!.isConnected(), false);
  });
  await t.test('access denials stop before fan-out, no retries', async () => {
    for (const status of [401, 403, 404, 429]) {
      deny = status; const before = navigations.length, beforeContexts = contextsCreated;
      await assert.rejects(run(`denied-${status}`, { nodeIds: ['1:3', '1:4'] }), /access or rate-limit/);
      assert.equal(navigations.length - before, 1);
      assert.equal(contextsCreated - beforeContexts, 1);
      const record = await manifest(`denied-${status}`);
      assert.equal(record.status, 'failed');
      assert.equal(record.httpStatus, status);
      if ([401, 403].includes(status)) assert.match(record.next, /sign in manually.*wait for confirmation/);
      else assert.doesNotMatch(record.next, /sign in/);
      assert.equal(launchModes.at(-1), true, 'denials never open a visible browser automatically');
      assert.equal(browsers.at(-1)!.isConnected(), false);
    }
    deny = 0;
  });
  await t.test('sign-in redirects request manual recovery without recording the login page', async () => {
    signIn = true;
    try {
      const before = contextsCreated;
      await assert.rejects(run('sign-in', { nodeIds: ['1:3'] }), /requires authentication/);
      const record = await manifest('sign-in');
      assert.equal(record.status, 'failed');
      assert.match(record.next, /sign in manually.*wait for confirmation/);
      assert.equal(contextsCreated - before, 1);
      await assert.rejects(fs.access(path.join(root, 'sign-in/context/editor-diagnostic.png')));
      assert.equal(browsers.at(-1)!.isConnected(), false);
    } finally { signIn = false; }
  });
  await t.test('bad selection fails preflight without dispatching other nodes', async () => {
    wrongNode = true; const before = contextsCreated;
    await assert.rejects(run('wrong-node', { nodeIds: ['1:3'] }), /recipe did not match/);
    assert.equal(contextsCreated - before, 1);
    wrongNode = false;
  });
  await t.test('missing panels and invalid download remain incomplete, never replaced by editor pixels', async () => {
    invalidPNG = true; missingPanel = true;
    const result = await run('partial', { actionTimeoutMs: 250 });
    assert.equal(result.status, 'failed');
    const record = await manifest('partial');
    assert.equal(record.frame.status, 'failed');
    assert.equal(record.nodes[0].panels[0].status, 'collected');
    assert.equal(record.nodes[0].panels[1].status, 'failed');
    await assert.rejects(fs.access(path.join(root, 'partial/frames/reference.png')));
    invalidPNG = false; missingPanel = false;
  });
  await t.test('overall deadline closes all browsers and retains unfinished work', async () => {
    hang = true;
    await run('timeout', { nodeIds: ['1:3', '1:4', '1:5'], concurrency: 1, timeoutMs: 1000, actionTimeoutMs: 5000 }).catch(() => {});
    const record = await manifest('timeout');
    assert.match(record.error, /deadline/);
    assert.ok(record.nodes.some((node: any) => node.status === 'not-run'));
    assert.equal(browsers.at(-1)!.isConnected(), false);
    hang = false;
  });
  await t.test('version/scope validation happens before opening a browser or output', async () => {
    const before = browsers.length;
    await assert.rejects(run('version', { url: url + '&version-id=v1' }), /pinned/);
    await assert.rejects(run('scope', { nodeIds: ['1:3', '1:4'], maxNodes: 2 }), /exceeds/);
    assert.equal(browsers.length, before);
    await assert.rejects(fs.access(path.join(root, 'scope')));
  });
});
