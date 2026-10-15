import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Figma assigns the plugin ID. Never invent one or write into the installed package.
const args = process.argv.slice(2);
try {
  if (args.length !== 4 || args[0] !== '--id' || !/^\d{1,40}$/.test(args[1]) || args[2] !== '--out' || !args[3]) {
    throw new Error('Usage: node scripts/prepare-figma-plugin.mjs --id <Figma-assigned-numeric-id> --out <new-directory>');
  }
  const source = fileURLToPath(new URL('../figma-plugin/', import.meta.url)), out = path.resolve(args[3]);
  const manifest = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
  manifest.id = args[1];
  await mkdir(path.dirname(out), { recursive: true });
  await mkdir(out); // Refuse to overwrite an existing development plugin.
  for (const file of ['code.js', 'ui.html']) await copyFile(path.join(source, file), path.join(out, file));
  await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ manifest: path.join(out, 'manifest.json'), next: 'Import this manifest in Figma development plugins, then run Flutter Fidelity Bridge in the intended file.' }, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
