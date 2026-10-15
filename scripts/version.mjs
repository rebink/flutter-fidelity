import { readFile, writeFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const stableVersion = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

function skillVersion(text, version) {
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) throw new Error('Missing skill frontmatter');
  let header = match[1];
  if (/^metadata:/m.test(header)) {
    if (!/^metadata:\s*$/m.test(header)) throw new Error('Expected block metadata in skill frontmatter');
    const block = header.match(/^metadata:\s*\n(?:[ \t]+.*(?:\n|$))*/m)?.[0];
    if (!block) throw new Error('Invalid skill metadata');
    const updated = /^  version:/m.test(block)
      ? block.replace(/^  version:.*$/m, `  version: "${version}"`)
      : block.replace(/^metadata:\s*\n/, `metadata:\n  version: "${version}"\n`);
    header = header.replace(block, updated);
  } else header += `\nmetadata:\n  version: "${version}"`;
  return text.replace(match[0], `---\n${header}\n---`);
}

// package.json owns the release version; schemas and fidelity policy have independent versions.
export async function syncVersion(directory, { version, check = false } = {}) {
  const read = async file => readFile(path.join(directory, file), 'utf8');
  const pkg = JSON.parse(await read('package.json'));
  version ??= pkg.version;
  if (!stableVersion.test(version)) throw new Error('Use a stable semantic version: MAJOR.MINOR.PATCH');
  const changes = new Map();
  for (const file of ['package.json', 'package-lock.json', 'plugin.json', '.codex-plugin/plugin.json', '.claude-plugin/plugin.json']) {
    const original = await read(file);
    const value = JSON.parse(original);
    value.version = version;
    if (file === 'package-lock.json') value.packages[''].version = version;
    const updated = JSON.stringify(value, null, 2) + '\n';
    if (updated !== original) changes.set(file, updated);
  }
  for (const entry of await readdir(path.join(directory, 'skills'), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const file = `skills/${entry.name}/SKILL.md`;
    const original = await read(file);
    const updated = skillVersion(original, version);
    if (updated !== original) changes.set(file, updated);
  }
  if (check && changes.size) throw new Error(`Release metadata differs from ${version}: ${[...changes.keys()].join(', ')}. Run npm run version:sync.`);
  if (!check) for (const [file, value] of changes) await writeFile(path.join(directory, file), value);
  return { version, changed: [...changes.keys()] };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.length > 1 || (args[0]?.startsWith('-') && args[0] !== '--check')) throw new Error('Usage: node scripts/version.mjs [MAJOR.MINOR.PATCH | --check]');
    const result = await syncVersion(root, { check: args[0] === '--check', version: args[0] === '--check' ? undefined : args[0] });
    // Keep npm pack --json machine-readable when this runs in prepack.
    console.error(`Flutter Fidelity ${result.version}: ${result.changed.length ? 'synchronized ' + result.changed.join(', ') : 'release metadata is consistent'}`);
  } catch (error) { console.error(error.message); process.exitCode = 1; }
}
