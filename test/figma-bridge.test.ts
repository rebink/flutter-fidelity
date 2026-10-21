import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { request as httpRequest, createServer as createHttpServer } from 'node:http';
import { webcrypto } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import sharp from 'sharp';
import { FigmaBridge } from '../src/figma-bridge.js';
import { VERSION } from '../src/version.js';
import { createServer } from '../src/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const metadata = { documentName: 'Test Design', pageId: '0:1', selection: [{ id: '1:2', name: 'Screen', type: 'FRAME' }] };
const pairing = { ...metadata, clientId: 'a'.repeat(32) };
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
    const hostStatus = (host: string) => new Promise<number | undefined>((resolve, reject) => {
      const request = httpRequest(connection.address + '/connect', { method: 'POST', headers: { Host: host, Authorization: 'Bearer wrong' } }, response => { response.resume(); resolve(response.statusCode); });
      request.on('error', reject); request.end(JSON.stringify(metadata));
    });
    const port = new URL(connection.address).port;
    assert.equal(connection.address, `http://localhost:${port}`);
    for (const host of ['localhost', 'LOCALHOST', '127.0.0.1', '[::1]']) assert.equal(await hostStatus(`${host}:${port}`), 401);
    for (const host of ['unrelated.example', `localhost.evil.example:${port}`, `localhost:${Number(port) + 1}`, `0.0.0.0:${port}`]) assert.equal(await hostStatus(host), 403);
    const invalidJSON = await fetch(connection.address + '/connect', { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: '{' });
    assert.equal(invalidJSON.status, 400);
    const preflight = await fetch(connection.address + '/connect', { method: 'OPTIONS', headers: { Origin: 'null' } });
    assert.equal(preflight.status, 204);
    assert.equal(preflight.headers.get('Access-Control-Allow-Origin'), 'null');
    assert.equal(bridge.status().connected, false);
  });
  await t.test('readiness is read-only and reveals no pairing, document, session or path information', async () => {
    const response = await fetch(connection.address + '/health', { headers: { Origin: 'null' } });
    assert.equal(response.status, 200);
    assert.equal(response.headers.get('Access-Control-Allow-Origin'), 'null');
    assert.equal(response.headers.get('Cache-Control'), 'no-store');
    assert.deepEqual(await response.json(), { service: 'flutter-fidelity-bridge', protocol: 2, version: VERSION });
    assert.equal(bridge.status().connected, false);
    assert.equal(bridge.status().busy, false);
    assert.equal((await fetch(connection.address + '/health', { headers: { Origin: 'https://unrelated.example' } })).status, 403);
    assert.equal((await fetch(connection.address + '/connect', { method: 'POST', body: JSON.stringify(metadata) })).status, 401);
    const rejected = await new Promise<number | undefined>((resolve, reject) => {
      const request = httpRequest(connection.address + '/health', { headers: { Host: 'unrelated.example' } }, response => { response.resume(); resolve(response.statusCode); });
      request.on('error', reject); request.end();
    });
    assert.equal(rejected, 403);
  });
  await t.test('pairing pins one file and exposes metadata without the pairing secret', async () => {
    const response = await post('/connect', pairing, { Origin: 'null' });
    assert.equal(response.status, 200);
    sessionId = (await response.json() as { sessionId: string }).sessionId;
    assert.equal(bridge.status().connected, true);
    assert.equal(bridge.status().session?.documentName, 'Test Design');
    assert.ok(!JSON.stringify(bridge.status()).includes(token));
    assert.equal((await post('/connect', { ...pairing, clientId: 'b'.repeat(32), documentName: 'Other file' })).status, 409);
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
    const newSession = await (await post('/connect', pairing)).json() as { sessionId: string };
    assert.notEqual(newSession.sessionId, sessionId);
    await assert.rejects(intake('old-session'), /Pair the intended/);
  });
});

test('pairing recovers lost handshakes and abandoned sessions without taking active ownership', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity-bridge-recovery-'));
  const bridge = new FigmaBridge({ jobTimeoutMs: 3000, pollTimeoutMs: 5000 });
  const connection = await bridge.start(0);
  t.after(async () => { await bridge.close(); await fs.rm(root, { recursive: true, force: true }); });
  let now = Date.now();
  t.mock.method(Date, 'now', () => now);
  const post = (route: string, body: unknown) => fetch(connection.address + route, { method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${connection.pairingCode.split('.')[1]}` }, body: JSON.stringify(body) });
  let sessionId: string;
  const other = { ...pairing, clientId: 'b'.repeat(32), documentName: 'Other file' };

  await t.test('one launch can retry a handshake; other launches cannot take over', async () => {
    sessionId = (await (await post('/connect', pairing)).json()).sessionId;
    assert.equal((await (await post('/connect', pairing)).json()).sessionId, sessionId);
    assert.ok(!JSON.stringify(bridge.status()).includes(pairing.clientId));
    const rejected = await post('/connect', other);
    assert.equal(rejected.status, 409);
    assert.equal((await rejected.json()).code, 'ALREADY_PAIRED');
    for (const clientId of [undefined, '', 'bad', 'c'.repeat(33)]) assert.equal((await post('/connect', { ...pairing, clientId })).status, 400);
    assert.equal(bridge.status().session?.sessionId, sessionId);
  });

  await t.test('an abandoned launch expires, and its old session cannot affect the replacement', async () => {
    const oldSession = sessionId;
    now += 31_000;
    assert.equal(bridge.status().connected, false);
    sessionId = (await (await post('/connect', other)).json()).sessionId;
    assert.notEqual(sessionId, oldSession);
    for (const route of ['/metadata', '/poll', '/disconnect']) {
      const rejected = await post(route, { sessionId: oldSession, metadata });
      assert.equal(rejected.status, 409);
      assert.equal((await rejected.json()).code, 'SESSION_MISMATCH');
    }
    assert.equal(bridge.status().session?.documentName, 'Other file');
  });

  await t.test('an outstanding poll protects ownership beyond the inactivity window', async () => {
    const pollingMetadata = { ...metadata, documentName: 'Active poll' };
    const polling = post('/poll', { sessionId, metadata: pollingMetadata });
    for (let attempt = 0; bridge.status().session?.documentName !== 'Active poll' && attempt < 200; attempt++) await new Promise(resolve => setTimeout(resolve, 5));
    assert.equal(bridge.status().session?.documentName, 'Active poll');
    now += 31_000;
    assert.equal(bridge.status().connected, false, 'ownership protection must not claim a fresh heartbeat');
    assert.equal((await post('/connect', pairing)).status, 409);
    await post('/disconnect', { sessionId });
    assert.equal((await polling).status, 204);
  });

  await t.test('an in-flight export protects ownership and still records explicit disconnection', async () => {
    sessionId = (await (await post('/connect', pairing)).json()).sessionId;
    const polling = post('/poll', { sessionId, metadata });
    const done = assert.rejects(bridge.acquire({ sessionId, out: path.join(root, 'interrupted') }), /disconnected.*Partial evidence/);
    assert.equal((await polling).status, 200);
    now += 31_000;
    assert.equal(bridge.status().connected, false, 'a pending export is not evidence of a fresh heartbeat');
    assert.equal((await post('/connect', other)).status, 409);
    await post('/disconnect', { sessionId });
    await done;
    assert.equal(JSON.parse(await fs.readFile(path.join(root, 'interrupted/intake.json'), 'utf8')).status, 'failed');
  });
});

test('disconnect during output creation preserves the original document and failed intake record', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity-output-race-'));
  const bridge = new FigmaBridge();
  const connection = await bridge.start(0);
  t.after(async () => { await bridge.close(); await fs.rm(root, { recursive: true, force: true }); });
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${connection.pairingCode.split('.')[1]}` };
  const response = await fetch(connection.address + '/connect', { method: 'POST', headers, body: JSON.stringify(pairing) });
  const { sessionId } = await response.json();
  const out = path.join(root, 'intake'), mkdir = fs.mkdir;
  let disconnected = false;
  t.mock.method(fs, 'mkdir', async (...args: Parameters<typeof fs.mkdir>) => {
    const result = await Reflect.apply(mkdir, fs, args);
    if (args[0] === out) {
      disconnected = true;
      await fetch(connection.address + '/disconnect', { method: 'POST', headers, body: JSON.stringify({ sessionId }) });
    }
    return result;
  });
  await assert.rejects(bridge.acquire({ sessionId, out }), /disconnected.*Partial evidence/);
  assert.equal(disconnected, true);
  const record = JSON.parse(await fs.readFile(path.join(out, 'intake.json'), 'utf8'));
  assert.equal(record.status, 'failed');
  assert.equal(record.documentName, metadata.documentName);
  assert.equal(record.sessionId, sessionId);
  assert.match(record.error, /disconnected/);
  await assert.rejects(fs.access(path.join(out, 'frames/reference.png')));
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
  const channel = 'a'.repeat(32);
  await figma.ui.onmessage({ type: 'ready', channel: 'bad' });
  await figma.ui.onmessage(null);
  assert.equal(messages.length, 0);
  await figma.ui.onmessage({ type: 'ready', channel });
  assert.equal(messages.pop().metadata.selection[0].id, '1:2');
  await figma.ui.onmessage({ type: 'ready', channel: 'b'.repeat(32) });
  await figma.ui.onmessage({ type: 'export', channel: 'b'.repeat(32), job: { id: 'forged', nodeId: '1:2', scale: 1 } });
  assert.equal(messages.length, 0);
  assert.equal(exports.length, 0);
  await figma.ui.onmessage({ type: 'export', channel, job: { id: 'job-1', nodeId: '1:2', scale: 1, css: true } });
  const result = messages.pop().result;
  assert.deepEqual(Buffer.from(result.pngBytes), png);
  assert.match(result.cssError, /No CSS/);
  assert.deepEqual(exports, ['JSON_REST_V1', 'PNG', 'JSON_REST_V1']);
  changed = true; jsonCalls = 0;
  await figma.ui.onmessage({ type: 'export', channel, job: { id: 'job-2', nodeId: '1:2', scale: 1 } });
  assert.match(messages.pop().error, /changed during export/);
  changed = false; denied = true;
  await figma.ui.onmessage({ type: 'export', channel, job: { id: 'job-3', nodeId: '1:2', scale: 1 } });
  assert.match(messages.pop().error, /Export unavailable/);
  Object.defineProperty(figma, 'root', { get() { throw new Error('Document access denied'); } });
  await figma.ui.onmessage({ type: 'ready', channel });
  const failure = messages.pop();
  assert.equal(failure.type, 'metadata-error');
  assert.equal(failure.channel, channel);
  assert.match(failure.error, /Document access denied/);
});

test('MCP bridge startup is explicit and transport shutdown releases the port', async t => {
  const originalStart = FigmaBridge.prototype.start;
  const startMock = t.mock.method(FigmaBridge.prototype, 'start', function (this: FigmaBridge) { return originalStart.call(this, 0); });
  let port = 0;
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
    const details = JSON.parse((start.content as { text: string }[])[0]!.text);
    port = Number(new URL(details.address).port);
    assert.equal(details.setupCommand, 'npx --no-install flutter-fidelity setup');
    assert.match(details.instruction, /keep existing MCP/);
  } finally { await client.close(); await server.close(); startMock.mock.restore(); }
  const probe = new FigmaBridge();
  try { await probe.start(port); } finally { await probe.close(); }
});

test('bundled UI and sandbox exchange a PNG through the real bridge protocol', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity-plugin-ui-'));
  const bridge = new FigmaBridge({ jobTimeoutMs: 2000 });
  const connection = await bridge.start(0);
  t.after(async () => { await bridge.close(); await fs.rm(root, { recursive: true, force: true }); });
  const png = await sharp({ create: { width: 20, height: 30, channels: 4, background: 'blue' } }).png().toBuffer();
  const node = { id: '1:2', name: 'Screen', type: 'FRAME', parent: { type: 'PAGE', id: '0:1' }, absoluteBoundingBox: { width: 20, height: 30 },
    async exportAsync(settings: { format: string }) { return settings.format === 'PNG' ? new Uint8Array(png) : structuredClone(context); },
    async getCSSAsync() { return { color: 'blue' }; } };
  const elements = new Map<string, any>();
  for (const id of ['code', 'connect', 'disconnect', 'status', 'document', 'check']) elements.set(id, { value: '', disabled: false, textContent: '' });
  let ui: any;
  const parent = { postMessage(message: any) { void figma.ui.onmessage(message.pluginMessage); } };
  const figma = { root: { name: 'Test Design' }, currentPage: { id: '0:1', selection: [node] }, showUI() {}, on() {},
    async getNodeByIdAsync() { return node; }, ui: { onmessage: undefined as any,
      postMessage(message: any) { queueMicrotask(() => ui.window.onmessage({ source: null, data: { pluginMessage: message } })); } } };
  vm.runInNewContext(await fs.readFile('figma-plugin/code.js', 'utf8'), { figma, __html__: '', Uint8Array });
  const html = await fs.readFile('figma-plugin/ui.html', 'utf8');
  const script = html.match(/<script>([\s\S]*?)<\/script>/)![1]!;
  ui = { window: {}, parent, document: { getElementById: (id: string) => elements.get(id) },
    fetch: (url: string, init: RequestInit) => fetch(url.replace('http://localhost:43871', connection.address), init),
    crypto: webcrypto, AbortController, TextDecoder, setTimeout, clearTimeout, setInterval, clearInterval, Uint8Array, btoa };
  vm.runInNewContext(script, ui);
  await new Promise<void>(resolve => queueMicrotask(resolve));
  elements.get('code').value = connection.pairingCode.replace(/^\d+/, '43871');
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
  const manifest = JSON.parse(await fs.readFile(path.join(out, 'manifest.json'), 'utf8'));
  assert.equal(manifest.id, '1234567890123456789');
  assert.deepEqual(manifest.networkAccess.allowedDomains, ['none']);
  assert.deepEqual(manifest.networkAccess.devAllowedDomains, ['http://localhost:43871']);
  assert.deepEqual(await fs.readFile(path.join(out, 'code.js')), await fs.readFile('figma-plugin/code.js'));
  assert.throws(() => execFileSync(process.execPath, args, { stdio: 'pipe' }), /Command failed/);
  assert.throws(() => execFileSync(process.execPath, ['scripts/prepare-figma-plugin.mjs', '--id', 'invented', '--out', path.join(root, 'bad')], { stdio: 'pipe' }), /Command failed/);
  const generated = path.join(root, 'Figma generated manifest.json');
  const original = JSON.stringify({ id: '1234567890123456789', name: 'My Figma plugin' });
  await fs.writeFile(generated, original);
  const cli = path.resolve('dist/cli.js'), prepared = path.join(root, 'Friendly plugin folder');
  const output = JSON.parse(execFileSync(process.execPath, [cli, 'setup-figma-plugin', '--manifest', generated, '--out', prepared], { cwd: os.tmpdir(), encoding: 'utf8' }));
  assert.equal(output.manifest, path.join(prepared, 'manifest.json'));
  assert.match(output.next, /Import plugin from manifest/);
  assert.equal(JSON.parse(await fs.readFile(output.manifest, 'utf8')).id, manifest.id);
  assert.equal(await fs.readFile(generated, 'utf8'), original);
  assert.throws(() => execFileSync(process.execPath, [cli, 'setup-figma-plugin', '--manifest', generated, '--out', prepared], { stdio: 'pipe' }), /Command failed/);
  await fs.writeFile(generated, JSON.stringify({ id: 'invented' }));
  const bad = path.join(root, 'bad-manifest');
  assert.throws(() => execFileSync(process.execPath, [cli, 'setup-figma-plugin', '--manifest', generated, '--out', bad], { stdio: 'pipe' }), /Command failed/);
  await assert.rejects(fs.access(bad));
});

test('IPv6 loopback serves the same bridge and a conflict releases the IPv4 listener', async t => {
  const blocker = createHttpServer();
  t.after(() => { blocker.close(); });
  try {
    await new Promise<void>((resolve, reject) => { blocker.once('error', reject); blocker.listen(0, '::1', resolve); });
  } catch (error) {
    if (['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes((error as NodeJS.ErrnoException).code ?? '')) { t.skip('IPv6 loopback is unavailable on this host.'); return; }
    throw error;
  }
  const address = blocker.address();
  assert.ok(address && typeof address !== 'string');
  const conflict = new FigmaBridge();
  t.after(() => conflict.close());
  await assert.rejects(conflict.start(address.port), /already in use/);
  assert.equal(conflict.status().running, false);
  await new Promise<void>(resolve => { blocker.close(() => resolve()); });
  const bridge = new FigmaBridge();
  const connection = await bridge.start(address.port);
  t.after(() => bridge.close());
  for (const host of ['localhost', '127.0.0.1', '[::1]']) {
    const response: Response = await fetch(`http://${host}:${address.port}/connect`, { method: 'OPTIONS', headers: { Origin: 'null' } });
    assert.equal(response.status, 204);
    const health: Response = await fetch(`http://${host}:${address.port}/health`, { headers: { Origin: 'null' } });
    assert.deepEqual(await health.json(), { service: 'flutter-fidelity-bridge', protocol: 2, version: VERSION });
  }
  assert.equal(connection.address, `http://localhost:${address.port}`);
  await bridge.close();
  const probe = new FigmaBridge();
  t.after(() => probe.close());
  await probe.start(address.port);
});
