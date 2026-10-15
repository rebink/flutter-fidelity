import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { acquireFigma, parseFigmaLink } from '../src/figma.js';
import { createServer } from '../src/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const link = 'https://www.figma.com/design/Abc123/Example?node-id=1-2';
const node = { document: { id: '1:2', type: 'FRAME', absoluteBoundingBox: { x: 0, y: 0, width: 20, height: 30 },
  layoutMode: 'VERTICAL', itemSpacing: 12, fills: [{ type: 'SOLID', color: { r: 1, g: 0, b: 0 } }],
  children: [{ id: '1:3', type: 'TEXT', characters: 'Hello', style: { fontFamily: 'Inter', fontSize: 16, lineHeightPx: 24 } }] } };

test('Figma link parsing scopes to a node and drops unrelated query data', () => {
  assert.deepEqual(parseFigmaLink(link + '&secret=ignored'), { fileKey: 'Abc123', nodeId: '1:2', sourceUrl: 'https://www.figma.com/design/Abc123?node-id=1-2' });
  assert.equal(parseFigmaLink('https://figma.com/file/Abc123?node-id=1%3A2').nodeId, '1:2');
  assert.equal(parseFigmaLink('https://figma.com/design/Main/branch/Branch123/Example?node-id=1-2').fileKey, 'Branch123');
  assert.equal(parseFigmaLink(link + '&version-id=v1').requestedVersion, 'v1');
  for (const url of ['http://figma.com/design/Abc?node-id=1-2', 'https://evil.com/design/Abc?node-id=1-2', 'https://figma.com/design/Abc', 'https://figma.com/design/Abc?node-id=../../a', 'https://figma.com/board/Abc?node-id=1-2']) {
    assert.throws(() => parseFigmaLink(url));
  }
});

test('background intake, safe reuse and failures preserve evidence without UI/CSS', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity-figma-'));
  const oldToken = process.env.FIGMA_ACCESS_TOKEN;
  process.env.FIGMA_ACCESS_TOKEN = 'test-secret-never-record';
  t.after(async () => {
    if (oldToken === undefined) delete process.env.FIGMA_ACCESS_TOKEN; else process.env.FIGMA_ACCESS_TOKEN = oldToken;
    await fs.rm(root, { recursive: true, force: true });
  });
  const png = await sharp({ create: { width: 20, height: 30, channels: 4, background: 'red' } }).png().toBuffer();
  let revision = 'v1', failStatus = 0, temporaryFailures = 0, renderNull = false, invalidPNG = false;
  let missingNode = false, missingRevision = false, mismatch = false;
  const calls: { url: URL; headers: Headers }[] = [];
  const mock: typeof fetch = async (url, init) => {
    const u = new URL(String(url)), headers = new Headers(init?.headers);
    calls.push({ url: u, headers });
    assert.ok(init?.signal, 'all requests have a deadline');
    assert.equal(init?.redirect, 'error');
    if (u.hostname === 'api.figma.com') {
      assert.equal(headers.get('X-Figma-Token'), 'test-secret-never-record');
      if (failStatus || temporaryFailures-- > 0) return new Response('private response', { status: failStatus || 503 });
      assert.equal(u.searchParams.get('ids'), '1:2');
      if (u.pathname.endsWith('/nodes')) return Response.json({ version: missingRevision ? undefined : revision, nodes: { '1:2': missingNode ? null : node }, thumbnailUrl: 'https://private.invalid/signed' });
      assert.equal(u.pathname, '/v1/images/Abc123');
      assert.equal(u.searchParams.get('version'), revision, 'render must be pinned to context revision');
      assert.equal(u.searchParams.get('format'), 'png');
      return Response.json({ images: { '1:2': renderNull ? null : 'https://cdn.example.test/export?signature=secret' } });
    }
    assert.equal(headers.get('X-Figma-Token'), null, 'credentials must not reach image CDN');
    if (invalidPNG) return new Response('<html>login</html>');
    const bytes = mismatch ? await sharp(png).resize(10, 15).png().toBuffer() : png;
    return new Response(new Uint8Array(bytes));
  };
  const run = (name: string, reuse?: string, scale?: number) => acquireFigma({ url: link, out: path.join(root, name), reuse, scale }, { fetch: mock });
  const manifest = async (name: string) => JSON.parse(await fs.readFile(path.join(root, name, 'intake.json'), 'utf8'));

  await t.test('fresh intake saves exact PNG and scoped child styling in three requests', async () => {
    const result = await run('first');
    assert.equal(result.status, 'acquired');
    assert.equal(result.requests, 3);
    assert.equal(result.profileStatus, 'dimensions-consistent');
    assert.deepEqual(await fs.readFile(path.join(root, 'first/frames/reference.png')), png);
    assert.deepEqual(JSON.parse(await fs.readFile(path.join(root, 'first/context/node.json'), 'utf8')), node);
    const evidence = JSON.stringify(await manifest('first'));
    assert.ok(!evidence.includes('test-secret') && !evidence.includes('signature='));
    await assert.rejects(run('first'), /EEXIST/);
  });
  await t.test('unchanged revision reuses validated PNG after one live request', async () => {
    const before = calls.length;
    const result = await run('reused', path.join(root, 'first'));
    assert.equal(result.cache, 'revision-and-hash-verified');
    assert.equal(calls.length - before, 1);
    assert.deepEqual(await fs.readFile(path.join(root, 'reused/frames/reference.png')), png);
  });
  await t.test('changed revision or scale triggers a new export', async () => {
    revision = 'v2';
    assert.equal((await run('changed', path.join(root, 'first'))).requests, 3);
    assert.equal((await run('scale', path.join(root, 'changed'), 2)).requests, 3);
  });
  await t.test('explicit version links pin metadata and reject mismatched revisions', async () => {
    const before = calls.length;
    await acquireFigma({ url: link + '&version-id=v2', out: path.join(root, 'pinned') }, { fetch: mock });
    assert.equal(calls[before]!.url.searchParams.get('version'), 'v2');
    await assert.rejects(acquireFigma({ url: link + '&version-id=old', out: path.join(root, 'wrong-version') }, { fetch: mock }), /revision differs/);
  });
  await t.test('tampered PNG and failed intake cannot be reused', async () => {
    await fs.writeFile(path.join(root, 'changed/frames/reference.png'), 'corrupt');
    assert.equal((await run('tampered', path.join(root, 'changed'))).cache, 'unusable-cache');
    await fs.writeFile(path.join(root, 'tampered/intake.json'), JSON.stringify({ ...await manifest('tampered'), status: 'failed' }));
    assert.equal((await run('failed-cache', path.join(root, 'tampered'))).requests, 3);
  });
  await t.test('one transient retry; repeated server failures stop', async () => {
    temporaryFailures = 1;
    assert.equal((await run('transient')).requests, 4);
    failStatus = 503;
    const before = calls.length;
    await assert.rejects(run('server-failure'), /HTTP 503/);
    assert.equal(calls.length - before, 2);
    failStatus = 0;
  });
  await t.test('access and rate-limit denials never use stale cache or repeat', async () => {
    for (const status of [401, 403, 404, 429]) {
      failStatus = status;
      const before = calls.length;
      await assert.rejects(run(`denied-${status}`, path.join(root, 'first')), new RegExp(`HTTP ${status}`));
      assert.equal(calls.length - before, 1);
      assert.equal((await manifest(`denied-${status}`)).status, 'failed');
      await assert.rejects(fs.access(path.join(root, `denied-${status}/frames/reference.png`)));
    }
    failStatus = 0;
  });
  await t.test('null renders retain context and invalid image bytes fail', async () => {
    renderNull = true;
    await assert.rejects(run('null-render'), /could not render/);
    assert.equal((await manifest('null-render')).status, 'failed');
    await fs.access(path.join(root, 'null-render/context/node.json'));
    renderNull = false;
    invalidPNG = true;
    await assert.rejects(run('invalid-png'));
    assert.equal((await manifest('invalid-png')).status, 'failed');
    invalidPNG = false;
  });
  await t.test('missing node or revision is explicit failure', async () => {
    missingNode = true;
    await assert.rejects(run('missing-node'), /missing/);
    missingNode = false;
    missingRevision = true;
    await assert.rejects(run('missing-revision'), /revision/);
    missingRevision = false;
  });
  await t.test('dimension mismatch preserves bytes and requires profile review', async () => {
    mismatch = true;
    const result = await run('mismatch');
    assert.equal(result.profileStatus, 'needs-review');
    assert.equal((await sharp(path.join(root, 'mismatch/frames/reference.png')).metadata()).width, 10);
    mismatch = false;
  });
  await t.test('missing credentials report capability without network or output', async () => {
    delete process.env.FIGMA_ACCESS_TOKEN;
    const before = calls.length;
    await assert.rejects(run('no-token'), /FIGMA_ACCESS_TOKEN/);
    assert.equal(calls.length, before);
    await assert.rejects(fs.access(path.join(root, 'no-token')));
  });
  await t.test('MCP acquires background inputs and exposes actionable credential errors', async () => {
    const server = createServer(), client = new Client({ name: 'figma-test', version: '1' });
    const [a, b] = InMemoryTransport.createLinkedPair();
    await server.connect(a);
    await client.connect(b);
    try {
      const tool = (await client.listTools()).tools.find(tool => tool.name === 'acquire_figma');
      assert.ok(tool);
      assert.ok(!('token' in tool.inputSchema.properties!));
      const originalFetch = globalThis.fetch;
      try {
        globalThis.fetch = mock;
        process.env.FIGMA_ACCESS_TOKEN = 'test-secret-never-record';
        const acquired = await client.callTool({ name: 'acquire_figma', arguments: { url: link, out: path.join(root, 'mcp-success') } });
        assert.notEqual(acquired.isError, true);
        assert.equal((await manifest('mcp-success')).status, 'acquired');
        await fs.access(path.join(root, 'mcp-success/frames/reference.png'));
      } finally { globalThis.fetch = originalFetch; delete process.env.FIGMA_ACCESS_TOKEN; }
      const result = await client.callTool({ name: 'acquire_figma', arguments: { url: link, out: path.join(root, 'mcp') } });
      assert.equal(result.isError, true);
      assert.match(JSON.stringify(result.content), /FIGMA_ACCESS_TOKEN/);
    } finally { await client.close(); await server.close(); }
  });
});
