import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { request as httpRequest } from 'node:http';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { FigmaBridge } from '../src/figma-bridge.js';
import { createServer } from '../src/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const metadata = { documentName: 'Test Design', pageId: '0:1', selection: [{ id: '1:2', name: 'Screen', type: 'FRAME' }] };
const context = { document: { id: '1:2', type: 'FRAME', children: [{ id: '1:3', style: { fontSize: 16 } }] } };

test('paired bridge transfers real PNG bytes over loopback and preserves identity/failures', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity-bridge-'));
  const bridge = new FigmaBridge({ jobTimeoutMs: 300, pollTimeoutMs: 50 });
  const connection = await bridge.start(0);
  t.after(async () => { await bridge.close(); await fs.rm(root, { recursive: true, force: true }); });
  const token = connection.pairingCode.split('.')[1]!;
  const post = (route: string, body: unknown, headers: Record<string, string> = {}) => fetch(connection.address + route, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...headers }, body: JSON.stringify(body),
  });
  const png = await sharp({ create: { width: 20, height: 30, channels: 4, background: '#abcdef' } }).png().toBuffer();
  let sessionId: string;
  const payload = () => ({ nodeId: '1:2', nodeName: 'Screen', pageId: '0:1', logicalSize: { width: 20, height: 30 },
    png: png.toString('base64'), context, exportedAt: new Date().toISOString() });
  const intake = (name: string, extra: Record<string, unknown> = {}) => bridge.acquire({ sessionId, out: path.join(root, name), ...extra });
  async function dispatch(name: string, result = payload(), extra: Record<string, unknown> = {}) {
    const polling = post('/poll', { sessionId, metadata });
    const done = intake(name, extra).then(value => ({ value }), error => ({ error }));
    const response = await polling;
    assert.equal(response.status, 200);
    const job = await response.json() as { id: string; nodeId: string; scale: number; css: boolean };
    assert.equal(job.nodeId, '1:2');
    assert.equal((await post('/result', { sessionId, id: job.id, result })).status, 200);
    return done;
  }
  await t.test('origin, host and pairing checks reject unrelated requests', async () => {
    assert.equal((await post('/connect', metadata, { Authorization: 'Bearer wrong' })).status, 401);
    assert.equal((await post('/connect', metadata, { Origin: 'https://unrelated.example' })).status, 403);
    const spoofedHost = await new Promise<number | undefined>((resolve, reject) => {
      const request = httpRequest(connection.address + '/connect', { method: 'POST', headers: { Host: 'unrelated.example', Authorization: `Bearer ${token}` } }, response => { response.resume(); resolve(response.statusCode); });
      request.on('error', reject); request.end(JSON.stringify(metadata));
    });
    assert.equal(spoofedHost, 403);
    const preflight = await fetch(connection.address + '/connect', { method: 'OPTIONS', headers: { Origin: 'null' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'null');
    assert.equal(bridge.status().connected, false);
  });
  await t.test('pairing pins one file and exposes metadata without the pairing secret', async () => {
    const response = await post('/connect', metadata, { Origin: 'null' });
    assert.equal(response.status, 200);
    sessionId = (await response.json() as { sessionId: string }).sessionId;
    assert.equal(bridge.status().connected, true);
    assert.equal(bridge.status().session?.documentName, 'Test Design');
    assert.ok(!JSON.stringify(bridge.status()).includes(token));
    assert.equal((await post('/connect', { ...metadata, documentName: 'Other file' })).status, 409);
    await assert.rejects(bridge.acquire({ sessionId: '00000000-0000-4000-8000-000000000000', out: path.join(root, 'wrong-file') }), /Pair the intended/);
    await assert.rejects(fs.access(path.join(root, 'wrong-file')));
  });
  await t.test('live selection metadata updates without waiting for the poll interval', async () => {
    await post('/metadata', { sessionId, metadata: { ...metadata, selection: [] } });
    await assert.rejects(intake('no-selection'), /Select one frame/);
    await post('/metadata', { sessionId, metadata });
  });
  await t.test('PNG and full subtree arrive unchanged; optional CSS failure is nonblocking', async () => {
    const result = await dispatch('good', { ...payload(), cssError: 'CSS unavailable' } as ReturnType<typeof payload>, { css: true });
    assert.ok('value' in result);
    assert.equal(result.value.status, 'acquired');
    assert.equal(result.value.profileStatus, 'dimensions-consistent');
    assert.equal(result.value.cssError, 'CSS unavailable');
    assert.deepEqual(await fs.readFile(path.join(root, 'good/frames/reference.png')), png);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, 'good/context/node.json'), 'utf8')), context);
    assert.ok(!(await fs.readFile(path.join(root, 'good/intake.json'), 'utf8')).includes(token));
    await assert.rejects(intake('good'), /EEXIST/);
  });
  await t.test('CSS properties are retained only for the requested root', async () => {
    const result = await dispatch('css', { ...payload(), css: { color: '#abcdef' } } as ReturnType<typeof payload>, { css: true });
    assert.ok('value' in result);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, 'css/context/css.json'), 'utf8')), { color: '#abcdef' });
  });
  await t.test('wrong-node results and invalid PNG bytes cannot become references', async () => {
    const wrong = await dispatch('wrong-node', { ...payload(), nodeId: '9:9' });
    assert.ok('error' in wrong);
    assert.match(wrong.error.message, /identity/);
    const invalid = await dispatch('invalid-png', { ...payload(), png: Buffer.from('not an image').toString('base64') });
    assert.ok('error' in invalid);
    for (const name of ['wrong-node', 'invalid-png']) {
      const record = JSON.parse(await fs.readFile(path.join(root, name, 'intake.json'), 'utf8'));
      assert.equal(record.status, 'failed');
      await assert.rejects(fs.access(path.join(root, name, 'frames/reference.png')));
    }
  });
  await t.test('dimension disagreements preserve original pixels and require review', async () => {
    const result = await dispatch('scale-warning', { ...payload(), logicalSize: { width: 40, height: 60 } });
    assert.ok('value' in result);
    assert.equal(result.value.profileStatus, 'needs-review');
    assert.deepEqual(await fs.readFile(path.join(root, 'scale-warning/frames/reference.png')), png);
  });
  await t.test('late/wrong response IDs fail, timeouts preserve failure evidence', async () => {
    const polling = post('/poll', { sessionId, metadata });
    const done = intake('timeout').catch(error => error);
    const job = await (await polling).json() as { id: string };
    assert.equal((await post('/result', { sessionId, id: 'unrelated', result: payload() })).status, 409);
    assert.match((await done).message, /timed out/);
    assert.equal((await post('/result', { sessionId, id: job.id, result: payload() })).status, 409);
    assert.equal(JSON.parse(await fs.readFile(path.join(root, 'timeout/intake.json'), 'utf8')).status, 'failed');
  });
  await t.test('disconnect cancels pending export and a new session cannot reuse the old identity', async () => {
    const polling = post('/poll', { sessionId, metadata });
    const done = intake('disconnected').catch(error => error);
    await polling;
    await post('/disconnect', { sessionId });
    assert.match((await done).message, /disconnected/);
    const newSession = await (await post('/connect', metadata)).json() as { sessionId: string };
    assert.notEqual(newSession.sessionId, sessionId);
    await assert.rejects(intake('old-session'), /Pair the intended/);
  });
});

test('actual Figma sandbox code exports without navigation and rejects changing snapshots', async () => {
  const code = await fs.readFile('figma-plugin/code.js', 'utf8');
  const png = await sharp({ create: { width: 20, height: 30, channels: 4, background: 'red' } }).png().toBuffer();
  const messages: any[] = [], exports: string[] = [];
  let changed = false, denied = false, jsonCalls = 0;
  const node = { id: '1:2', name: 'Screen', type: 'FRAME', parent: { type: 'PAGE', id: '0:1' }, absoluteBoundingBox: { width: 20, height: 30 },
    async exportAsync(settings: { format: string }) {
      exports.push(settings.format);
      if (denied) throw new Error('Export unavailable');
      if (settings.format === 'PNG') return new Uint8Array(png);
      jsonCalls++;
      return { document: { ...context.document, name: changed && jsonCalls % 2 === 0 ? 'Edited' : 'Screen' } };
    }, async getCSSAsync() { throw new Error('No CSS'); } };
  const figma = { root: { name: 'Test Design' }, currentPage: { id: '0:1', selection: [node] },
    ui: { postMessage(message: unknown) { messages.push(message); }, onmessage: undefined as any },
    showUI() {}, on() {}, async getNodeByIdAsync(id: string) { assert.equal(id, '1:2'); return node; } };
  vm.runInNewContext(code, { figma, __html__: '<html></html>', Uint8Array });
  await figma.ui.onmessage({ type: 'ready' });
  assert.equal(messages.pop().metadata.selection[0].id, '1:2');
  await figma.ui.onmessage({ type: 'export', job: { id: 'job-1', nodeId: '1:2', scale: 1, css: true } });
  const result = messages.pop().result;
  assert.deepEqual(Buffer.from(result.pngBytes), png);
  assert.match(result.cssError, /No CSS/);
  assert.deepEqual(exports, ['JSON_REST_V1', 'PNG', 'JSON_REST_V1']);
  changed = true; jsonCalls = 0;
  await figma.ui.onmessage({ type: 'export', job: { id: 'job-2', nodeId: '1:2', scale: 1 } });
  assert.match(messages.pop().error, /changed during export/);
  changed = false; denied = true;
  await figma.ui.onmessage({ type: 'export', job: { id: 'job-3', nodeId: '1:2', scale: 1 } });
  assert.match(messages.pop().error, /Export unavailable/);
});

test('MCP bridge startup is explicit and transport shutdown releases the port', async () => {
  const server = createServer(), client = new Client({ name: 'bridge-test', version: '1' });
  const [a, b] = InMemoryTransport.createLinkedPair();
  await server.connect(a); await client.connect(b);
  try {
    const status = await client.callTool({ name: 'figma_bridge', arguments: { action: 'status' } });
    assert.match(JSON.stringify(status.content), /false/);
    const before = await client.callTool({ name: 'acquire_figma_plugin', arguments: { sessionId: '00000000-0000-4000-8000-000000000000', out: 'never-created' } });
    assert.equal(before.isError, true);
    const start = await client.callTool({ name: 'figma_bridge', arguments: { action: 'start' } });
    assert.notEqual(start.isError, true);
    assert.match(JSON.stringify(start.content), /pairingCode/);
  } finally { await client.close(); await server.close(); }
  const probe = new FigmaBridge();
  try { await probe.start(); } finally { await probe.close(); }
});

test('bundled UI and sandbox exchange a PNG through the real bridge protocol', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity-plugin-ui-'));
  const bridge = new FigmaBridge({ jobTimeoutMs: 2000 });
  const connection = await bridge.start();
  t.after(async () => { await bridge.close(); await fs.rm(root, { recursive: true, force: true }); });
  const png = await sharp({ create: { width: 20, height: 30, channels: 4, background: 'blue' } }).png().toBuffer();
  const node = { id: '1:2', name: 'Screen', type: 'FRAME', parent: { type: 'PAGE', id: '0:1' }, absoluteBoundingBox: { width: 20, height: 30 },
    async exportAsync(settings: { format: string }) { return settings.format === 'PNG' ? new Uint8Array(png) : structuredClone(context); },
    async getCSSAsync() { return { color: 'blue' }; } };
  const elements = new Map<string, any>();
  for (const id of ['code', 'connect', 'disconnect', 'status']) elements.set(id, { value: '', disabled: false, textContent: '' });
  let ui: any;
  const parent = { postMessage(message: any) { void figma.ui.onmessage(message.pluginMessage); } };
  const figma = { root: { name: 'Test Design' }, currentPage: { id: '0:1', selection: [node] }, showUI() {}, on() {},
    async getNodeByIdAsync() { return node; }, ui: { onmessage: undefined as any,
      postMessage(message: any) { queueMicrotask(() => ui.window.onmessage({ source: parent, data: { pluginMessage: message } })); } } };
  vm.runInNewContext(await fs.readFile('figma-plugin/code.js', 'utf8'), { figma, __html__: '', Uint8Array });
  const html = await fs.readFile('figma-plugin/ui.html', 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)![1]!;
  ui = { window: {}, parent, document: { getElementById: (id: string) => elements.get(id) },
    fetch, AbortController, setTimeout, clearTimeout, Uint8Array, btoa };
  vm.runInNewContext(script, ui);
  await new Promise<void>(resolve => queueMicrotask(resolve));
  elements.get('code').value = connection.pairingCode;
  await elements.get('connect').onclick();
  assert.equal(bridge.status().connected, true);
  const sessionId = bridge.status().session!.sessionId;
  const result = await bridge.acquire({ sessionId, out: path.join(root, 'intake'), css: true });
  assert.equal(result.status, 'acquired');
  assert.deepEqual(await fs.readFile(path.join(root, 'intake/frames/reference.png')), png);
  assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, 'intake/context/css.json'), 'utf8')), { color: 'blue' });
  await elements.get('disconnect').onclick();
  assert.equal(bridge.status().connected, false);
});

test('preparer uses the assigned Figma ID and refuses to overwrite source', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity-plugin-prepare-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const out = path.join(root, 'plugin');
  const args = ['scripts/prepare-figma-plugin.mjs', '--id', '1234567890123456789', '--out', out];
  execFileSync(process.execPath, args);
  assert.equal(JSON.parse(await fs.readFile(path.join(out, 'manifest.json'), 'utf8')).id, '1234567890123456789');
  assert.deepEqual(await fs.readFile(path.join(out, 'code.js')), await fs.readFile('figma-plugin/code.js'));
  assert.throws(() => execFileSync(process.execPath, args, { stdio: 'pipe' }), /Command failed/);
  assert.throws(() => execFileSync(process.execPath, ['scripts/prepare-figma-plugin.mjs', '--id', 'invented', '--out', path.join(root, 'bad')], { stdio: 'pipe' }), /Command failed/);
});
