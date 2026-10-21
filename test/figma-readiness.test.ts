import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { createServer, type RequestListener } from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { checkFigmaBridge, verifyMcp } from '../src/figma-readiness.js';
import { FigmaBridge } from '../src/figma-bridge.js';
import { VERSION } from '../src/version.js';

async function temporary(t: TestContext) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity readiness '));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

async function listener(t: TestContext, handler: RequestListener) {
  const server = createServer(handler);
  t.after(() => { server.closeAllConnections(); server.close(); });
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  return `http://127.0.0.1:${address.port}`;
}

test('readiness recognizes a real compatible bridge without pairing or exposing credentials', async t => {
  const bridge = new FigmaBridge();
  t.after(() => bridge.close());
  const connection = await bridge.start(0);
  assert.deepEqual(await checkFigmaBridge(connection.address), { state: 'ready', version: VERSION });
  assert.equal(bridge.status().connected, false);
  assert.equal(bridge.status().busy, false);
  await bridge.close();
  assert.deepEqual(await checkFigmaBridge(connection.address), { state: 'unreachable' });
});

test('readiness rejects old, unrelated, redirected and oversized responses without credentials', async t => {
  for (const [name, status, body] of [
    ['old unauthorized', 401, '{}'], ['old forbidden', 403, '{}'], ['missing endpoint', 404, '{}'],
    ['redirect', 302, '{}'], ['wrong service', 200, JSON.stringify({ service: 'other', protocol: 2, version: VERSION })],
    ['old protocol', 200, JSON.stringify({ service: 'flutter-fidelity-bridge', protocol: 1, version: VERSION })],
    ['invalid JSON', 200, '{'], ['no body', 204, ''], ['large unfinished response', 200, ' '.repeat(2048)],
  ] as const) await t.test(name, async t => {
    let requests = 0;
    const address = await listener(t, (request, response) => {
      requests++;
      assert.equal(request.url, '/health');
      assert.equal(request.headers.authorization, undefined);
      response.writeHead(status, { 'Content-Type': 'application/json', Location: 'http://unrelated.example/never-follow' });
      if (name === 'large unfinished response') response.write(body);
      else response.end(body);
    });
    const readiness = await checkFigmaBridge(address);
    assert.equal(readiness.state, 'incompatible');
    assert.equal(requests, 1);
  });
});

test('readiness validates loopback destinations and preserves cancellation', async t => {
  for (const address of ['https://localhost:43871', 'http://unrelated.example:43871', 'http://127.0.0.1:99999', 'http://127.0.0.1:43871/other']) {
    await assert.rejects(checkFigmaBridge(address), /loopback HTTP address/);
  }
  const address = await listener(t, () => {});
  await assert.rejects(checkFigmaBridge(address, AbortSignal.timeout(30)), error => (error as Error).name === 'TimeoutError');
});

test('the real built MCP engine passes a version/tool handshake and closes after verification', async t => {
  const root = await temporary(t);
  await verifyMcp(path.resolve('dist/cli.js'), root);
  assert.deepEqual(await fs.readdir(root), [], 'verification writes no project files');
});

test('MCP startup failures and incompatible engines are bounded and do not disclose stderr', async t => {
  const root = await temporary(t);
  const serverModule = pathToFileURL(path.resolve('node_modules/@modelcontextprotocol/sdk/dist/esm/server/mcp.js')).href;
  const transportModule = pathToFileURL(path.resolve('node_modules/@modelcontextprotocol/sdk/dist/esm/server/stdio.js')).href;
  for (const variant of ['missing', 'crash', 'wrong name', 'wrong version', 'missing tools']) await t.test(variant, async () => {
    const entrypoint = path.join(root, variant + '.mjs');
    if (variant === 'crash') await fs.writeFile(entrypoint, "console.error('private-startup-secret'); process.exit(1);\n");
    else if (variant !== 'missing') await fs.writeFile(entrypoint, `
      import { McpServer } from ${JSON.stringify(serverModule)};
      import { StdioServerTransport } from ${JSON.stringify(transportModule)};
      console.error('private-startup-secret');
      const server = new McpServer({ name: ${JSON.stringify(variant === 'wrong name' ? 'other' : 'flutter-fidelity')}, version: ${JSON.stringify(variant === 'wrong version' ? '0.0.0' : VERSION)} });
      ${variant === 'missing tools' ? '' : "for (const name of ['figma_bridge', 'acquire_figma_plugin']) server.registerTool(name, { inputSchema: {} }, async () => ({ content: [] }));"}
      await server.connect(new StdioServerTransport());
    `);
    await assert.rejects(verifyMcp(entrypoint, root), error => {
      const message = (error as Error).message;
      assert.match(message, /MCP startup self-check failed/);
      assert.ok(!message.includes('private-startup-secret'));
      assert.ok(!message.includes(entrypoint));
      return true;
    });
  });
});

test('MCP verification respects cancellation of a hung initialize handshake', async t => {
  const root = await temporary(t), entrypoint = path.join(root, 'hung.mjs');
  await fs.writeFile(entrypoint, 'process.stdin.resume();\n');
  await assert.rejects(verifyMcp(entrypoint, root, AbortSignal.timeout(100)), error => (error as Error).name === 'TimeoutError');
});
