import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Figma assigns the plugin ID. Never invent one or write into the installed package.
const args = process.argv.slice(2);
try {
  if (args.length !== 4 || !['--id', '--manifest'].includes(args[0]) || !args[1] || args[2] !== '--out' || !args[3]) {
    throw new Error('Usage: flutter-fidelity setup-figma-plugin --manifest <Figma-generated-manifest.json> --out <new-directory>\nOr: node scripts/prepare-figma-plugin.mjs --id <Figma-assigned-numeric-id> --out <new-directory>');
  }
  const id = args[0] === '--manifest' ? JSON.parse(await readFile(path.resolve(args[1]), 'utf8'))?.id : args[1];
  if (typeof id !== 'string' || !/^\d{1,40}$/.test(id)) throw new Error('Use the manifest.json saved by Figma when creating a development plugin. It must contain the Figma-assigned numeric id; do not invent one.');
  const source = fileURLToPath(new URL('../figma-plugin/', import.meta.url)), out = path.resolve(args[3]);
  const manifest = JSON.parse(await readFile(path.join(source, 'manifest.json'), 'utf8'));
  manifest.id = id;
  await mkdir(path.dirname(out), { recursive: true });
  await mkdir(out); // Refuse to overwrite an existing development plugin.
  for (const file of ['code.js', 'ui.html']) await copyFile(path.join(source, file), path.join(out, file));
  await writeFile(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n', { flag: 'wx' });
  console.log(JSON.stringify({ manifest: path.join(out, 'manifest.json'), next: 'In Figma desktop: Plugins > Development > Import plugin from manifest, choose the manifest above, then run Flutter Fidelity Bridge in your design. Ask your coding agent to start the Figma bridge and paste its pairing code into the plugin. Keep the file and plugin open.' }, null, 2));
} catch (error) { console.error(error.message); process.exitCode = 1; }
