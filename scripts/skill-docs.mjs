import { readFile, writeFile, readdir, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const target = path.join(root, 'skills/flutter-fidelity/references/docs');
const check = process.argv.includes('--check');
const changed = [];

// docs/ remains the authoring source. Commit its portable copies so Git-based
// skill installers work without running npm or traversing outside the skill.
if (!check) await mkdir(target, { recursive: true });
for (const entry of await readdir(path.join(root, 'docs'), { withFileTypes: true })) {
  if (!entry.isFile() || !/\.(md|json)$/.test(entry.name)) continue;
  let content = await readFile(path.join(root, 'docs', entry.name), 'utf8');
  if (entry.name.endsWith('.md')) {
    content = content.replace(/\]\((\.\.\/[^)]+)\)/g, (_match, link) => {
      const relative = link.replace(/^\.\.\//, '');
      return `](https://github.com/rebink/flutter-fidelity/blob/main/${relative})`;
    });
    content = '<!-- Generated from docs/' + entry.name + ' by npm run skill:sync. -->\n\n' + content;
  }
  const output = path.join(target, entry.name);
  const existing = await readFile(output, 'utf8').catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
  });
  if (existing !== content) {
    changed.push(entry.name);
    if (!check) await writeFile(output, content);
  }
}
if (check && changed.length) {
  throw new Error(`Portable skill documentation differs: ${changed.join(', ')}. Run npm run skill:sync.`);
}
if (changed.length) console.error(`Flutter Fidelity: synchronized ${changed.length} portable documentation files.`);
