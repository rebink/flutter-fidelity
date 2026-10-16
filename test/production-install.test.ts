import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import os from 'node:os';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { VERSION } from '../src/version.js';

const exec = promisify(execFile);

test('fresh source prepares and serves MCP using only production dependencies', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity production source '));
  let client: Client | undefined;
  t.after(async () => {
    await client?.close();
    await fs.rm(root, { recursive: true, force: true });
  });
  const checkout = path.join(root, 'checkout with spaces');
  await fs.mkdir(checkout);
  for (const file of ['package.json', 'package-lock.json', 'tsconfig.json', 'src', 'docs', 'skills', 'scripts/skill-docs.mjs']) {
    const target = path.join(checkout, file);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.cp(file, target, { recursive: true });
  }
  // Recreate the installed production tree from the lockfile without network,
  // links back into the development workspace, or an existing dist directory.
  const lock = JSON.parse(await fs.readFile('package-lock.json', 'utf8'));
  for (const [relative, metadata] of Object.entries(lock.packages) as [string, { dev?: boolean; optional?: boolean }][]) {
    if (!relative || metadata.dev) continue;
    try { await fs.access(relative); }
    catch (error) {
      if (metadata.optional && (error as NodeJS.ErrnoException).code === 'ENOENT') continue;
      throw error;
    }
    const target = path.join(checkout, relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.cp(relative, target, { recursive: true, dereference: true });
  }
  await assert.rejects(fs.access(path.join(checkout, 'dist')));
  await assert.rejects(fs.access(path.join(checkout, 'node_modules/tsx')));
  await exec(process.execPath, [process.env.npm_execpath!, 'run', 'prepare'], { cwd: checkout, timeout: 60_000 });
  const cli = path.join(checkout, 'dist/cli.js');
  const version = await exec(process.execPath, [cli, '--version'], { cwd: root });
  assert.equal(version.stdout.trim(), VERSION);
  await fs.copyFile('fixtures/screens/complete-screen.png', path.join(root, 'screen.png'));
  client = new Client({ name: 'production-install-test', version: '1.0.0' });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [cli, 'mcp'], cwd: root, stderr: 'pipe' }));
  assert.equal(client.getServerVersion()?.version, VERSION);
  const { tools } = await client.listTools();
  assert.equal(tools.length, 19);
  const result = await client.callTool({ name: 'suggest_viewport', arguments: { image: 'screen.png' } });
  assert.notEqual(result.isError, true);
  const content = result.content as { type: string; text: string }[];
  assert.equal(JSON.parse(content[0]!.text).confirmed, false);
});
