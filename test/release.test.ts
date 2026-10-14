import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { syncVersion } from '../scripts/version.mjs';
import { updateCheckout } from '../scripts/update.mjs';
import { VERSION } from '../src/version.js';

const git = (cwd: string, ...args: string[]) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
const commit = (cwd: string) => {
  git(cwd, 'add', '.');
  git(cwd, '-c', 'user.name=Release test', '-c', 'user.email=release@example.invalid', 'commit', '-m', 'fixture');
};
async function temp(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity release '));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}
async function clones(t: Parameters<typeof temp>[0]) {
  const root = await temp(t), upstream = path.join(root, 'upstream'), local = path.join(root, 'local');
  await fs.mkdir(upstream);
  git(upstream, 'init', '-b', 'main');
  await fs.writeFile(path.join(upstream, 'package.json'), JSON.stringify({ name: 'flutter-fidelity', version: '0.1.0' }));
  await fs.writeFile(path.join(upstream, '.gitignore'), '.fidelity/\nnode_modules/\n');
  commit(upstream);
  git(root, 'clone', upstream, local);
  const before = git(local, 'rev-parse', 'HEAD');
  await fs.writeFile(path.join(upstream, 'package.json'), JSON.stringify({ name: 'flutter-fidelity', version: '0.2.0' }));
  commit(upstream);
  return { upstream, local, before, target: git(upstream, 'rev-parse', 'HEAD') };
}

test('release synchronization updates all identities, preserves skill metadata and detects drift without writes', async t => {
  const root = await temp(t);
  for (const file of ['package.json', 'package-lock.json', 'plugin.json', '.codex-plugin/plugin.json']) {
    await fs.mkdir(path.dirname(path.join(root, file)), { recursive: true });
    await fs.copyFile(file, path.join(root, file));
  }
  await fs.mkdir(path.join(root, 'skills/example'), { recursive: true });
  const skill = path.join(root, 'skills/example/SKILL.md');
  await fs.writeFile(skill, '---\nname: example\ndescription: Example\nmetadata:\n  author: Team\n  version: "0.1.0"\n---\nKeep this body.\n');
  await syncVersion(root, { version: '0.3.0' });
  const content = await fs.readFile(skill, 'utf8');
  assert.match(content, /author: Team/);
  assert.match(content, /version: "0.3.0"/);
  assert.ok(content.endsWith('Keep this body.\n'));
  assert.equal(JSON.parse(await fs.readFile(path.join(root, 'package-lock.json'), 'utf8')).packages[''].version, '0.3.0');
  await syncVersion(root, { check: true });
  await fs.writeFile(skill, content.replace('0.3.0', '0.2.0'));
  await assert.rejects(syncVersion(root, { check: true }), /metadata differs/);
  assert.match(await fs.readFile(skill, 'utf8'), /0.2.0/);
  await assert.rejects(syncVersion(root, { version: 'v1.0' }), /semantic version/);
});

test('built CLI and package share a version', () => {
  assert.equal(execFileSync(process.execPath, ['dist/cli.js', '--version'], { encoding: 'utf8' }).trim(), VERSION);
});

test('update check fetches without altering source; update fast-forwards, validates and preserves evidence', async t => {
  const { local, before, target } = await clones(t);
  const npmCalls: string[][] = [];
  const options = { log: () => {}, runNpm: (_cwd: string, args: string[]) => { npmCalls.push(args); } };
  const result = updateCheckout(local, { ...options, check: true });
  assert.equal(result.target, target);
  assert.equal(git(local, 'rev-parse', 'HEAD'), before);
  assert.deepEqual(npmCalls, []);
  await fs.mkdir(path.join(local, '.fidelity'));
  await fs.writeFile(path.join(local, '.fidelity/evidence.txt'), 'preserve');
  assert.equal(updateCheckout(local, options).updated, true);
  assert.equal(git(local, 'rev-parse', 'HEAD'), target);
  assert.deepEqual(npmCalls, [['ci'], ['run', 'check']]);
  assert.equal(await fs.readFile(path.join(local, '.fidelity/evidence.txt'), 'utf8'), 'preserve');
  assert.equal(updateCheckout(local, options).updated, false);
  assert.equal(npmCalls.length, 4, 'an up-to-date checkout can retry a previously failed install');
});

test('updater refuses modified and untracked files, detached HEAD and local commits', async t => {
  const { local, before } = await clones(t);
  const options = { log: () => {}, runNpm: () => { assert.fail('must not install'); } };
  const pkg = await fs.readFile(path.join(local, 'package.json'));
  await fs.writeFile(path.join(local, 'package.json'), 'user changes');
  assert.throws(() => updateCheckout(local, options), /Local changes/);
  await fs.writeFile(path.join(local, 'package.json'), pkg);
  await fs.writeFile(path.join(local, 'notes.txt'), 'user notes');
  assert.throws(() => updateCheckout(local, options), /untracked/);
  assert.equal(await fs.readFile(path.join(local, 'notes.txt'), 'utf8'), 'user notes');
  await fs.rm(path.join(local, 'notes.txt'));
  git(local, 'switch', '--detach', before);
  assert.throws(() => updateCheckout(local, options), /pinned\/detached/);
  git(local, 'switch', 'main');
  await fs.writeFile(path.join(local, 'local.txt'), 'local work');
  commit(local);
  const owned = git(local, 'rev-parse', 'HEAD');
  assert.throws(() => updateCheckout(local, options), /diverged history/);
  assert.equal(git(local, 'rev-parse', 'HEAD'), owned);
});

test('updater preserves checkout and reports an unverified update after validation failure', async t => {
  const { local, before, target } = await clones(t);
  assert.throws(() => updateCheckout(local, { log: () => {}, runNpm: () => { throw new Error('install failed'); } }), error => {
    assert.match(String(error), /not a verified update/);
    assert.ok(String(error).includes(before));
    return true;
  });
  assert.equal(git(local, 'rev-parse', 'HEAD'), target);
});

test('upstream cannot overwrite ignored local evidence', async t => {
  const { upstream, local, before } = await clones(t);
  for (const directory of [upstream, local]) await fs.mkdir(path.join(directory, '.fidelity'));
  await fs.writeFile(path.join(local, '.fidelity/evidence.txt'), 'local evidence');
  await fs.writeFile(path.join(upstream, '.fidelity/evidence.txt'), 'upstream collision');
  git(upstream, 'add', '-f', '.fidelity/evidence.txt');
  commit(upstream);
  assert.throws(() => updateCheckout(local, { log: () => {}, runNpm: () => assert.fail('must not install') }));
  assert.equal(git(local, 'rev-parse', 'HEAD'), before);
  assert.equal(await fs.readFile(path.join(local, '.fidelity/evidence.txt'), 'utf8'), 'local evidence');
});

test('npm update command runs dependency installation and validation in a real source clone', async t => {
  const { upstream, local } = await clones(t);
  await fs.mkdir(path.join(upstream, 'scripts'));
  await fs.copyFile('scripts/update.mjs', path.join(upstream, 'scripts/update.mjs'));
  const pkg = { name: 'flutter-fidelity', version: '0.2.0', scripts: { update: 'node scripts/update.mjs', check: 'node scripts/verify.mjs' } };
  await fs.writeFile(path.join(upstream, 'scripts/verify.mjs'), "import { writeFileSync } from 'node:fs'; writeFileSync('.fidelity/checked.txt', 'passed');\n");
  await fs.writeFile(path.join(upstream, 'package.json'), JSON.stringify(pkg));
  await fs.writeFile(path.join(upstream, 'package-lock.json'), JSON.stringify({ name: pkg.name, version: pkg.version, lockfileVersion: 3, requires: true, packages: { '': { name: pkg.name, version: pkg.version } } }));
  commit(upstream);
  git(local, 'pull', '--ff-only');
  await fs.mkdir(path.join(local, '.fidelity'));
  const next = { ...pkg, version: '0.2.1' };
  await fs.writeFile(path.join(upstream, 'package.json'), JSON.stringify(next));
  await fs.writeFile(path.join(upstream, 'package-lock.json'), JSON.stringify({ name: next.name, version: next.version, lockfileVersion: 3, requires: true, packages: { '': { name: next.name, version: next.version } } }));
  commit(upstream);
  assert.ok(process.env.npm_execpath, 'tests run through npm');
  const output = execFileSync(process.execPath, [process.env.npm_execpath!, 'run', 'update'], { cwd: local, encoding: 'utf8', timeout: 60_000, env: { ...process.env, npm_config_audit: 'false', npm_config_fund: 'false' } });
  assert.match(output, /Validated Flutter Fidelity 0.2.1/);
  assert.equal(await fs.readFile(path.join(local, '.fidelity/checked.txt'), 'utf8'), 'passed');
  assert.equal(git(local, 'rev-parse', 'HEAD'), git(upstream, 'rev-parse', 'HEAD'));
});

test('missing upstream and failed fetch leave source unchanged', async t => {
  const { local, before } = await clones(t);
  git(local, 'branch', '--unset-upstream');
  assert.throws(() => updateCheckout(local, { check: true, log: () => {} }), /No upstream/);
  git(local, 'branch', '--set-upstream-to=origin/main');
  git(local, 'remote', 'set-url', 'origin', path.join(local, 'absent-remote'));
  assert.throws(() => updateCheckout(local, { check: true, log: () => {} }));
  assert.equal(git(local, 'rev-parse', 'HEAD'), before);
});
