import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { VERSION } from '../src/version.js';

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity standalone skill '));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const skill = path.join(root, '.agents/skills/flutter-fidelity');
  await fs.cp('skills/flutter-fidelity', skill, { recursive: true });
  const env = { ...process.env };
  delete env.FLUTTER_FIDELITY_ROOT;
  const launcher = path.join(skill, 'scripts/fidelity.mjs');
  const run = (...args: string[]) => spawnSync(process.execPath, [launcher, ...args], { cwd: root, env, encoding: 'utf8' });
  return { root, skill, env, launcher, run };
}

test('copied skill retains every local Markdown dependency within its own folder', async t => {
  const { skill } = await fixture(t);
  const walk = async (directory: string): Promise<string[]> => {
    const files: string[] = [];
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) files.push(...await walk(file));
      else if (file.endsWith('.md')) files.push(file);
    }
    return files;
  };
  for (const file of await walk(skill)) {
    const content = await fs.readFile(file, 'utf8');
    for (const [, link] of content.matchAll(/\]\(([^)]+)\)/g)) {
      if (/^(?:[a-z][a-z\d+.-]*:|#)/i.test(link!)) continue;
      const target = path.resolve(path.dirname(file), decodeURIComponent(link!.split('#')[0]!));
      assert.ok(target.startsWith(skill + path.sep), `${file}: dependency escapes the skill: ${link}`);
      await fs.access(target);
    }
  }
});

test('portable skill includes the third intake option and consent-based login recovery', async t => {
  const { skill } = await fixture(t);
  const entry = await fs.readFile(path.join(skill, 'SKILL.md'), 'utf8');
  const intake = await fs.readFile(path.join(skill, 'references/docs/design-intake.md'), 'utf8');
  const browser = await fs.readFile(path.join(skill, 'references/docs/figma-browser.md'), 'utf8');
  assert.match(entry, /three online intake options/);
  assert.match(entry, /manual-login-recovery/);
  assert.match(intake, /3\. \*\*Playwright browser with manual-login recovery/);
  assert.match(browser, /## Manual login recovery/);
  assert.match(browser, /Wait for that reply/);
  assert.match(browser, /never copy or attach the normal Chrome profile/);
  assert.match(browser, /headless: false/);
  assert.match(browser, /forces serial intake/);
  assert.match(browser, /existing\n   review\/approval checkpoint/);
});

test('standalone CLI launcher uses the project engine from nested directories and preserves comparison exit status', async t => {
  const { root, skill, env, launcher, run } = await fixture(t);
  const packages = path.join(root, 'node_modules');
  await fs.mkdir(packages);
  await fs.symlink(path.resolve('.'), path.join(packages, 'flutter-fidelity'), 'junction');
  assert.equal(run('--version').stdout.trim(), VERSION);
  const nested = path.join(root, 'lib/widgets');
  await fs.mkdir(nested, { recursive: true });
  const located = spawnSync(process.execPath, [launcher, '--package-root'], { cwd: nested, env, encoding: 'utf8' });
  assert.equal(located.status, 0, located.stderr);
  assert.equal(await fs.realpath(located.stdout.trim()), await fs.realpath(path.join(packages, 'flutter-fidelity')));
  // The real engine returns incomplete for identical PNGs without capture
  // evidence. This also verifies that the launcher retains the app's cwd.
  await fs.copyFile('fixtures/screens/complete-screen.png', path.join(root, 'screen.png'));
  const imported = run('import-image', '--image', 'screen.png', '--out', 'reference', '--width', '390', '--height', '844', '--confirmed');
  assert.equal(imported.status, 0, imported.stderr);
  const comparison = run('compare', '--bundle', 'reference', '--actual', 'screen.png', '--out', 'report');
  assert.equal(comparison.status, 2, comparison.stderr);
  const report = JSON.parse(await fs.readFile(path.join(root, 'report/comparison.json'), 'utf8'));
  assert.equal(report.status, 'incomplete');
  await fs.access(path.join(skill, 'references/docs/workflow.md'));
});

test('standalone launcher diagnoses a missing engine and rejects version mismatch before execution', async t => {
  const { root, run } = await fixture(t);
  const missing = run('--version');
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /engine not found/);
  assert.equal(missing.stdout, '');
  const engine = path.join(root, 'node_modules/flutter-fidelity');
  await fs.mkdir(path.join(engine, 'dist'), { recursive: true });
  await fs.writeFile(path.join(engine, 'package.json'), JSON.stringify({ name: 'flutter-fidelity', version: '0.0.0' }));
  await fs.writeFile(path.join(engine, 'dist/cli.js'), 'throw new Error("must not execute a mismatched engine");');
  const mismatch = run('--version');
  assert.equal(mismatch.status, 1);
  assert.match(mismatch.stderr, /versions? .*differ|Skill .* and engine .* differ/);
  assert.doesNotMatch(mismatch.stderr, /must not execute/);
});

test('launcher supports an explicit checkout and diagnoses an unbuilt engine', async t => {
  const { root, launcher, env } = await fixture(t);
  env.FLUTTER_FIDELITY_ROOT = path.resolve('.');
  const version = spawnSync(process.execPath, [launcher, '--version'], { cwd: root, env, encoding: 'utf8' });
  assert.equal(version.status, 0, version.stderr);
  assert.equal(version.stdout.trim(), VERSION);
  const unbuilt = path.join(root, 'unbuilt checkout');
  await fs.mkdir(unbuilt);
  await fs.writeFile(path.join(unbuilt, 'package.json'), JSON.stringify({ name: 'flutter-fidelity', version: VERSION }));
  env.FLUTTER_FIDELITY_ROOT = unbuilt;
  const result = spawnSync(process.execPath, [launcher, '--version'], { cwd: root, env, encoding: 'utf8' });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /not built/);
});
