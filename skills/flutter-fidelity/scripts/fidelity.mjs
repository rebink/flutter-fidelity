#!/usr/bin/env node
import { readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn } from 'node:child_process';

// No network access or shell interpolation: use the installed engine, retaining
// the app's working directory even when the skill is copied or symlinked.
try {
  const skill = await readFile(new URL('../SKILL.md', import.meta.url), 'utf8');
  const expected = skill.match(/^  version: "([^"]+)"$/m)?.[1];
  if (!expected) throw new Error('The skill is missing metadata.version. Reinstall the complete skill folder.');
  const candidates = [];
  if (process.env.FLUTTER_FIDELITY_ROOT) candidates.push(path.resolve(process.env.FLUTTER_FIDELITY_ROOT));
  else {
    for (let directory = process.cwd();;) {
      candidates.push(path.join(directory, 'node_modules/flutter-fidelity'));
      const parent = path.dirname(directory);
      if (parent === directory) break;
      directory = parent;
    }
    candidates.push(fileURLToPath(new URL('../../../', import.meta.url)));
  }
  let engine;
  for (const candidate of candidates) {
    let pkg;
    try { pkg = JSON.parse(await readFile(path.join(candidate, 'package.json'), 'utf8')); }
    catch (error) { if (error.code === 'ENOENT') continue; throw error; }
    if (pkg.name !== 'flutter-fidelity') continue;
    if (pkg.version !== expected) {
      throw new Error(`Skill ${expected} and engine ${pkg.version} differ at ${candidate}. Update the engine and skill together; see references/docs/setup.md.`);
    }
    const cli = path.join(candidate, 'dist/cli.js');
    await access(cli).catch(() => { throw new Error(`Flutter Fidelity is not built at ${candidate}. Run npm ci there, or npm run build if lifecycle scripts were disabled.`); });
    engine = { root: candidate, cli };
    break;
  }
  if (!engine) throw new Error('Flutter Fidelity engine not found. In your Flutter project, run npm install --save-dev github:rebink/flutter-fidelity, or set FLUTTER_FIDELITY_ROOT to a built checkout. See references/docs/setup.md.');
  const args = process.argv.slice(2);
  if (args.length === 1 && args[0] === '--package-root') console.log(engine.root);
  else {
    const child = spawn(process.execPath, [engine.cli, ...args], { stdio: 'inherit' });
    child.once('error', error => { console.error(error.message); process.exitCode = 1; });
    child.once('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
  }
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
