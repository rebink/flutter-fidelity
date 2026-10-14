import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createOutput, json, writeJson } from './io.js';
import { SourceCheckpointSchema, SourcePathSchema, type SourceCheckpoint } from './schema.js';

const digest = (bytes: string | Buffer) => createHash('sha256').update(bytes).digest('hex');
function sourceHash(files: SourceCheckpoint['files']) {
  return digest(JSON.stringify({ version: 1, files: [...files].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0) }));
}

// Reject symlinks at every component, including for declared absent files.
// Snapshots cover only explicitly owned paths, never a recursive project copy.
async function readOwnedFile(root: string, relative: string): Promise<Buffer | null> {
  try {
    const stat = await fs.lstat(root);
    if (stat.isSymbolicLink() || !stat.isDirectory()) throw new Error('Checkpoint file root must be a directory without symlinks');
  } catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
  const parts = SourcePathSchema.parse(relative).split('/');
  let current = root;
  for (const [index, part] of parts.entries()) {
    current = path.join(current, part);
    let stat;
    try { stat = await fs.lstat(current); }
    catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null; throw error; }
    if (stat.isSymbolicLink()) throw new Error(`Checkpoint path contains a symlink: ${relative}`);
    if (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile())
      throw new Error(`Checkpoint path is not a regular file: ${relative}`);
  }
  return fs.readFile(current);
}

async function saveFiles(directory: string, files: Map<string, Buffer | null>) {
  for (const [relative, bytes] of files) if (bytes !== null) {
    const target = path.join(directory, 'files', relative);
    await fs.mkdir(path.dirname(target), { recursive: true });
    await fs.writeFile(target, bytes, { flag: 'wx' });
  }
}

export async function createSourceCheckpoint(projectRoot: string, ownedFiles: string[], id: string, out: string) {
  const root = await fs.realpath(projectRoot);
  if (new Set(ownedFiles).size !== ownedFiles.length) throw new Error('Checkpoint paths must be unique');
  const bytes = new Map<string, Buffer | null>();
  for (const relative of [...ownedFiles].sort()) bytes.set(relative, await readOwnedFile(root, relative));
  const files = [...bytes].map(([file, content]) => ({ path: file, sha256: content === null ? null : digest(content) }));
  const checkpoint = SourceCheckpointSchema.parse({ version: 1, id, sourceSha256: sourceHash(files), files });
  const directory = await createOutput(out);
  await saveFiles(directory, bytes);
  await writeJson(path.join(directory, 'checkpoint.json'), checkpoint);
  return checkpoint;
}

export async function readSourceCheckpoint(manifest: string) {
  const file = await fs.realpath(manifest);
  const checkpoint = SourceCheckpointSchema.parse(await json(file));
  if (sourceHash(checkpoint.files) !== checkpoint.sourceSha256) throw new Error('Source checkpoint manifest hash differs');
  const bytes = new Map<string, Buffer | null>();
  for (const entry of checkpoint.files) {
    const content = await readOwnedFile(path.join(path.dirname(file), 'files'), entry.path);
    if ((content === null ? null : digest(content)) !== entry.sha256)
      throw new Error(`Source checkpoint snapshot differs: ${entry.path}`);
    bytes.set(entry.path, content);
  }
  return { checkpoint, bytes };
}

export async function copySourceCheckpoint(manifest: string, out: string, expected: SourceCheckpoint) {
  const { checkpoint, bytes } = await readSourceCheckpoint(manifest);
  if (JSON.stringify(checkpoint) !== JSON.stringify(expected)) throw new Error('Source checkpoint does not belong to this capture');
  const directory = await createOutput(out);
  await saveFiles(directory, bytes);
  await writeJson(path.join(directory, 'checkpoint.json'), checkpoint);
}

export async function verifySourceCheckpoint(manifest: string, projectRoot: string) {
  const { checkpoint } = await readSourceCheckpoint(manifest);
  const root = await fs.realpath(projectRoot);
  const mismatches: { path: string; expected: string | null; actual: string | null }[] = [];
  for (const entry of checkpoint.files) {
    const bytes = await readOwnedFile(root, entry.path);
    const actual = bytes === null ? null : digest(bytes);
    if (entry.sha256 !== actual) mismatches.push({ path: entry.path, expected: entry.sha256, actual });
  }
  return { status: mismatches.length ? 'failed' as const : 'passed' as const, checkpointId: checkpoint.id, sourceSha256: checkpoint.sourceSha256, files: checkpoint.files.length, mismatches };
}
