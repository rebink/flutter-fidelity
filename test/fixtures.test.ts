import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { hash } from '../src/io.js';

test('fixture and benchmark commands reject existing output without touching references', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity-fixtures-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const original = 'fixtures/screens/icons.png', before = await hash(original);
  const output = path.join(root, 'fresh');
  const run = (script: string, args: string[]) => execFileSync(process.execPath, ['--import', 'tsx', script, ...args], { stdio: 'pipe' });
  run('scripts/fixtures.ts', ['--out', output]);
  const generated = path.join(output, 'screens/icons.png'), saved = await hash(generated);
  assert.throws(() => run('scripts/fixtures.ts', ['--out', output]), /EEXIST/);
  assert.throws(() => run('scripts/benchmark.ts', ['--out', output]), /EEXIST/);
  assert.equal(await hash(generated), saved);
  assert.equal(await hash(original), before);
  const manifest = JSON.parse(await fs.readFile(path.join(output, 'manifest.json'), 'utf8'));
  assert.equal(manifest.cases.length, 12);
  await fs.access(path.join(output, manifest.cases[0].fonts[0]));
});
