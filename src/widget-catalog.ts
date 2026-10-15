import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { RectSchema, SourcePathSchema } from './schema.js';
import { assertRect, createOutput, inside, json, writeJson } from './io.js';

const Id = z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/);
const Text = z.string().trim().min(1).max(2000);
const Tags = z.array(z.string().trim().min(1).max(100)).max(100).default([]);
const Sha = z.string().regex(/^[a-f0-9]{64}$/);
const Bounds = RectSchema.extend({ x: z.number().int().nonnegative(), y: z.number().int().nonnegative(), width: z.number().int().positive(), height: z.number().int().positive() });
const Region = z.object({ id: Id, name: Text, kind: z.enum(['control', 'layout', 'text', 'asset', 'decoration']), tags: Tags, bounds: Bounds }).strict();
const Snapshot = z.object({ path: SourcePathSchema, sha256: Sha, pixelSha256: Sha, width: z.number().int().positive(), height: z.number().int().positive() }).strict();
const TrackedFile = z.object({ path: SourcePathSchema, sha256: Sha }).strict();
export const MarkWidgetsSchema = z.object({ image: z.string().min(1), out: z.string().min(1), regions: z.array(Region).min(1).max(200) }).strict();
export const WidgetMarksSchema = z.object({
  version: z.literal(1), createdAt: z.string(), coordinates: z.literal('original-png-pixels'),
  source: z.object({ path: z.literal('original.png'), sha256: Sha, width: z.number().int().positive(), height: z.number().int().positive() }).strict(),
  regions: z.array(Region.extend({ snapshot: Snapshot })).min(1).max(200),
  note: z.string(),
}).strict();
export const RegisterWidgetSchema = z.object({
  catalog: z.string().min(1), projectRoot: z.string().min(1), marks: z.string().min(1), regionId: Id,
  id: Id, name: Text, symbol: z.string().regex(/^[A-Za-z_$][A-Za-z0-9_$]*$/), description: Text,
  sourceFiles: z.array(SourcePathSchema).min(1).max(200), testFiles: z.array(SourcePathSchema).max(200).default([]),
  tags: Tags, parameters: z.array(Text).max(100).default([]), variants: z.array(Text).max(100).default([]),
}).strict();
const WidgetEntry = z.object({
  version: z.literal(1), id: Id, name: Text, symbol: z.string(), description: Text, createdAt: z.string(), projectRoot: z.string(),
  tags: Tags, parameters: z.array(Text), variants: z.array(Text),
  sourceFiles: z.array(TrackedFile).min(1), testFiles: z.array(TrackedFile), reference: Snapshot,
  origin: z.object({ marks: z.string(), regionId: Id, sourceSha256: Sha, bounds: Bounds }).strict(),
  verification: z.literal('not-run'),
}).strict();
export const FindWidgetsSchema = z.object({
  catalog: z.string().min(1), projectRoot: z.string().min(1), image: z.string().min(1).optional(),
  query: z.string().max(2000).optional(), tags: Tags, limit: z.number().int().min(1).max(100).default(8),
}).strict();
const digest = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');

async function png(bytes: Buffer) {
  const input = sharp(bytes, { limitInputPixels: 64_000_000, failOn: 'error' });
  const meta = await input.metadata();
  if (meta.format !== 'png' || !meta.width || !meta.height || (meta.pages ?? 1) > 1) throw new Error('Use a single-frame PNG');
  const { data, info } = await input.toColourspace('srgb').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, width: info.width, height: info.height, sha256: digest(bytes), pixelSha256: digest(Buffer.concat([Buffer.from(`${info.width}x${info.height}:`), data])) };
}
function snapshot(relative: string, decoded: Awaited<ReturnType<typeof png>>) {
  return { path: relative, sha256: decoded.sha256, pixelSha256: decoded.pixelSha256, width: decoded.width, height: decoded.height };
}
function escapeXml(value: string) { return value.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;' })[char]!); }
async function failOutput(out: string, error: unknown) {
  await writeJson(path.join(out, 'incomplete.json'), { status: 'failed', error: error instanceof Error ? error.message : String(error) });
}

/** The host supplies the reviewed regions. This function measures/crops; it does not infer widgets. */
export async function markWidgets(raw: unknown) {
  const args = MarkWidgetsSchema.parse(raw);
  if (new Set(args.regions.map(r => r.id)).size !== args.regions.length) throw new Error('Widget region IDs must be unique');
  const bytes = await fs.readFile(args.image), decoded = await png(bytes);
  for (const region of args.regions) assertRect(region.bounds, decoded.width, decoded.height, true);
  const out = await createOutput(args.out);
  try {
    await writeJson(path.join(out, 'incomplete.json'), { status: 'pending' });
    await fs.writeFile(path.join(out, 'original.png'), bytes, { flag: 'wx' });
    await fs.mkdir(path.join(out, 'crops'));
    const regions = [];
    for (const region of args.regions) {
      const { x, y, width, height } = region.bounds;
      const cropped = await sharp(bytes).extract({ left: x, top: y, width, height }).png().toBuffer();
      const relative = `crops/${region.id}.png`;
      await fs.writeFile(path.join(out, relative), cropped, { flag: 'wx' });
      regions.push({ ...region, snapshot: snapshot(relative, await png(cropped)) });
    }
    // Markup is a separate browsing aid; original.png/crops keep native geometry.
    const overlays = args.regions.map(r => {
      const b = r.bounds;
      return `<rect x="${b.x}" y="${b.y}" width="${b.width}" height="${b.height}" fill="none" stroke="#ff006e" stroke-width="2"/><text x="${b.x + 3}" y="${Math.min(decoded.height - 2, b.y + 14)}" font-family="sans-serif" font-size="12" stroke="white" stroke-width="3" paint-order="stroke" fill="#9d0043">${escapeXml(r.id)}</text>`;
    }).join('');
    await sharp(bytes).composite([{ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${decoded.width}" height="${decoded.height}">${overlays}</svg>`) }]).png().toFile(path.join(out, 'marked.png'));
    const manifest = WidgetMarksSchema.parse({ version: 1, createdAt: new Date().toISOString(), coordinates: 'original-png-pixels',
      source: { path: 'original.png', sha256: decoded.sha256, width: decoded.width, height: decoded.height }, regions,
      note: 'Host-identified regions. Crops are reference snapshots for recognition, never substitutes for interactive Flutter widgets. Marked image is not comparison evidence.' });
    await writeJson(path.join(out, 'regions.json'), manifest);
    await fs.unlink(path.join(out, 'incomplete.json'));
    return { directory: out, manifest };
  } catch (error) { await failOutput(out, error); throw error; }
}

export async function loadWidgetMarks(directory: string, validateCrops = false) {
  const root = path.resolve(directory);
  await rejectIncomplete(root);
  const manifest = WidgetMarksSchema.parse(await json(await inside(root, 'regions.json')));
  if (new Set(manifest.regions.map(r => r.id)).size !== manifest.regions.length) throw new Error('Widget region IDs must be unique');
  const bytes = await fs.readFile(await inside(root, manifest.source.path)), decoded = await png(bytes);
  if (decoded.sha256 !== manifest.source.sha256 || decoded.width !== manifest.source.width || decoded.height !== manifest.source.height) throw new Error('Marked source PNG integrity failure');
  for (const region of manifest.regions) {
    assertRect(region.bounds, decoded.width, decoded.height, true);
    if (validateCrops) {
      const cropped = await png(await fs.readFile(await inside(root, region.snapshot.path)));
      if (JSON.stringify(snapshot(region.snapshot.path, cropped)) !== JSON.stringify(region.snapshot)) throw new Error(`Widget snapshot integrity failure: ${region.id}`);
      const b = region.bounds;
      const expected = await png(await sharp(bytes).extract({ left: b.x, top: b.y, width: b.width, height: b.height }).png().toBuffer());
      if (cropped.pixelSha256 !== expected.pixelSha256) throw new Error(`Widget snapshot does not match its source bounds: ${region.id}`);
    }
  }
  return { root, manifest, bytes };
}

async function rejectIncomplete(root: string) {
  try { await fs.access(path.join(root, 'incomplete.json')); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return; throw error; }
  throw new Error('Incomplete widget artifact cannot be used');
}
async function trackedFile(root: string, relative: string): Promise<Buffer> {
  const parts = SourcePathSchema.parse(relative).split('/');
  let current = root;
  for (const [i, part] of parts.entries()) {
    current = path.join(current, part);
    const stat = await fs.lstat(current);
    if (stat.isSymbolicLink() || (i === parts.length - 1 ? !stat.isFile() : !stat.isDirectory())) throw new Error(`Source must be a regular file without symlinks: ${relative}`);
  }
  return fs.readFile(current);
}

/** Append-only, separate entries: independent workers never rewrite a shared index. */
export async function registerWidget(raw: unknown) {
  const args = RegisterWidgetSchema.parse(raw), projectRoot = await fs.realpath(args.projectRoot);
  if (!args.sourceFiles.some(f => f.endsWith('.dart'))) throw new Error('Widget sourceFiles must include a Dart file');
  for (const files of [args.sourceFiles, args.testFiles]) if (new Set(files).size !== files.length) throw new Error('Tracked file paths must be unique');
  const marks = await loadWidgetMarks(args.marks), region = marks.manifest.regions.find(r => r.id === args.regionId);
  if (!region) throw new Error(`Unknown widget region: ${args.regionId}`);
  const reference = await fs.readFile(await inside(marks.root, region.snapshot.path)), decoded = await png(reference);
  if (JSON.stringify(snapshot(region.snapshot.path, decoded)) !== JSON.stringify(region.snapshot)) throw new Error('Widget snapshot integrity failure');
  const b = region.bounds;
  const expected = await png(await sharp(marks.bytes).extract({ left: b.x, top: b.y, width: b.width, height: b.height }).png().toBuffer());
  if (decoded.pixelSha256 !== expected.pixelSha256) throw new Error('Widget snapshot does not match its source bounds');
  const files = new Map<string, Buffer>();
  for (const file of [...args.sourceFiles, ...args.testFiles]) files.set(file, await trackedFile(projectRoot, file));
  const track = (paths: string[]) => paths.map(file => ({ path: file, sha256: digest(files.get(file)!) }));
  await fs.mkdir(path.resolve(args.catalog), { recursive: true });
  const root = await fs.realpath(args.catalog), out = await createOutput(path.join(root, args.id));
  try {
    await writeJson(path.join(out, 'incomplete.json'), { status: 'pending' });
    await fs.writeFile(path.join(out, 'reference.png'), reference, { flag: 'wx' });
    for (const [file, content] of files) {
      const target = path.join(out, 'source', file);
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, content, { flag: 'wx' });
    }
    // Do not register a moving source tree as a coherent reusable implementation.
    for (const [file, content] of files) if (digest(await trackedFile(projectRoot, file)) !== digest(content)) throw new Error(`Source changed during registration: ${file}`);
    const entry = WidgetEntry.parse({ version: 1, id: args.id, name: args.name, symbol: args.symbol, description: args.description,
      createdAt: new Date().toISOString(), projectRoot, tags: args.tags, parameters: args.parameters, variants: args.variants,
      sourceFiles: track(args.sourceFiles), testFiles: track(args.testFiles), reference: snapshot('reference.png', decoded),
      origin: { marks: marks.root, regionId: args.regionId, sourceSha256: marks.manifest.source.sha256, bounds: b }, verification: 'not-run' });
    await writeJson(path.join(out, 'widget.json'), entry);
    await fs.unlink(path.join(out, 'incomplete.json'));
    return { directory: out, entry };
  } catch (error) { await failOutput(out, error); throw error; }
}

type SourceStatus = 'matching' | 'changed' | 'missing' | 'different-project';
const words = (value: string) => new Set(value.toLowerCase().split(/[^\p{L}\p{N}]+/u).filter(Boolean));
export async function findWidgets(raw: unknown) {
  const args = FindWidgetsSchema.parse(raw), root = path.resolve(args.catalog), projectRoot = await fs.realpath(args.projectRoot);
  const query = args.image ? await png(await fs.readFile(args.image)) : undefined;
  const queryWords = words([args.query ?? '', ...args.tags].join(' '));
  const issues: { id: string; error: string }[] = [], candidates = [];
  let directories;
  try { directories = await fs.readdir(root, { withFileTypes: true }); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { candidates: [], issues, total: 0, note: 'No widget catalog yet. Identify regions and register implemented widgets.' }; throw error; }
  for (const dir of directories.sort((a, b) => a.name.localeCompare(b.name))) {
    if (!dir.isDirectory() && !dir.isSymbolicLink()) continue;
    try {
      if (dir.isSymbolicLink()) throw new Error('Catalog entry cannot be a symlink');
      const entryRoot = path.join(root, dir.name);
      await rejectIncomplete(entryRoot);
      const entry = WidgetEntry.parse(await json(await inside(entryRoot, 'widget.json')));
      if (entry.id !== dir.name) throw new Error('Widget entry ID differs from directory');
      const reference = await png(await fs.readFile(await inside(entryRoot, entry.reference.path)));
      if (JSON.stringify(snapshot(entry.reference.path, reference)) !== JSON.stringify(entry.reference)) throw new Error('Widget reference integrity failure');
      const sameProject = entry.projectRoot === projectRoot;
      let sourceMissing = false;
      const sourceIssues: string[] = [];
      for (const file of [...entry.sourceFiles, ...entry.testFiles]) {
        if (digest(await trackedFile(path.join(entryRoot, 'source'), file.path)) !== file.sha256) throw new Error(`Stored source snapshot changed: ${file.path}`);
        if (!sameProject) continue;
        try {
          if (digest(await trackedFile(projectRoot, file.path)) !== file.sha256) {
            sourceIssues.push(`Changed: ${file.path}`);
          }
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code === 'ENOENT') sourceMissing = true;
          sourceIssues.push(`Unavailable or unsafe source: ${file.path}`);
        }
      }
      const sourceStatus: SourceStatus = !sameProject ? 'different-project' : sourceMissing ? 'missing' : sourceIssues.length ? 'changed' : 'matching';
      const tokens = words([entry.id, entry.name, entry.symbol.replace(/([a-z])([A-Z])/g, '$1 $2'), entry.description, ...entry.tags, ...entry.parameters, ...entry.variants].join(' '));
      const tokenOverlap = queryWords.size ? [...queryWords].filter(w => tokens.has(w)).length / queryWords.size : 0;
      let visualSimilarity: number | null = null;
      let match: 'exact-pixels' | 'similar-size-pixels' | 'metadata-only' = 'metadata-only';
      if (query && query.width === reference.width && query.height === reference.height) {
        let error = 0;
        for (let i = 0; i < query.data.length; i++) error += Math.abs(query.data[i]! - reference.data[i]!);
        visualSimilarity = 1 - error / (query.data.length * 255);
        match = query.pixelSha256 === reference.pixelSha256 ? 'exact-pixels' : 'similar-size-pixels';
      }
      const score = visualSimilarity === null ? tokenOverlap : queryWords.size ? 0.75 * visualSimilarity + 0.25 * tokenOverlap : visualSimilarity;
      candidates.push({ id: entry.id, name: entry.name, symbol: entry.symbol, description: entry.description,
        directory: entryRoot, snapshot: path.join(entryRoot, entry.reference.path), tags: entry.tags, parameters: entry.parameters, variants: entry.variants,
        sourceFiles: entry.sourceFiles, testFiles: entry.testFiles, sourceStatus, sourceIssues, verification: entry.verification,
        match, score, visualSimilarity, tokenOverlap, width: reference.width, height: reference.height });
    } catch (error) { issues.push({ id: dir.name, error: error instanceof Error ? error.message : String(error) }); }
  }
  candidates.sort((a, b) => Number(b.match === 'exact-pixels') - Number(a.match === 'exact-pixels') || b.score - a.score || Number(b.sourceStatus === 'matching') - Number(a.sourceStatus === 'matching') || a.id.localeCompare(b.id));
  return { candidates: candidates.slice(0, args.limit), total: candidates.length, issues,
    note: 'Retrieval only: exact pixels do not prove implementation fidelity or behavior. Similarity is equal-size RGBA distance plus lexical metadata overlap, not semantic recognition. Different sizes are not resized/aligned. Host must review APIs, state, theme and current source before reuse; validate the composed screen.' };
}
