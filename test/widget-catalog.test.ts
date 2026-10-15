import { test, type TestContext } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import {
  FindWidgetsSchema, MarkWidgetsSchema, RegisterWidgetSchema,
  findWidgets, markWidgets, registerWidget,
} from '../src/widget-catalog.js';

const sha256 = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const bounds = { x: 3, y: 2, width: 7, height: 5 };
const region = { id: 'primary', name: 'Primary button', kind: 'control' as const, tags: ['action'], bounds };

async function tempRoot(t: TestContext) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity-widget-catalog-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  return root;
}

async function writeImage(file: string, width = 16, height = 12) {
  const pixels = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const offset = (y * width + x) * 4;
      pixels[offset] = (x * 31 + y * 7) % 256;
      pixels[offset + 1] = (y * 47 + x * 3) % 256;
      pixels[offset + 2] = (x * 13 + y * 19) % 256;
      pixels[offset + 3] = (x + y) % 3 === 0 ? 128 : 255;
    }
  }
  await sharp(pixels, { raw: { width, height, channels: 4 } }).png().toFile(file);
  return pixels;
}

async function decoded(file: string) {
  return sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
}

async function fixture(t: TestContext) {
  const root = await tempRoot(t);
  const image = path.join(root, 'input.png');
  await writeImage(image);
  const marks = path.join(root, 'marks');
  const marked = await markWidgets({ image, out: marks, regions: [region] });
  const projectRoot = path.join(root, 'project');
  await fs.mkdir(path.join(projectRoot, 'lib'), { recursive: true });
  await fs.mkdir(path.join(projectRoot, 'test'));
  await fs.writeFile(path.join(projectRoot, 'lib/button.dart'), 'class PrimaryButton {}\n');
  await fs.writeFile(path.join(projectRoot, 'test/button_test.dart'), '// Test provenance fixture; not executed.\n');
  const catalog = path.join(root, 'catalog');
  const registration = {
    catalog, projectRoot, marks, regionId: region.id, id: 'primary-button',
    name: 'Primary button', symbol: 'PrimaryButton', sourceFiles: ['lib/button.dart'],
    description: 'A prominent checkout action', tags: ['action', 'checkout'],
    parameters: ['label'], variants: ['enabled'], testFiles: ['test/button_test.dart'],
  };
  const crop = path.join(marked.directory, marked.manifest.regions[0]!.snapshot.path);
  return { root, image, marks, marked, projectRoot, catalog, registration, crop };
}

// A recursive byte inventory detects writes during lookup and partial overwrites on rejection.
async function inventory(directory: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  async function visit(current: string) {
    for (const item of await fs.readdir(current, { withFileTypes: true })) {
      const file = path.join(current, item.name);
      if (item.isDirectory()) await visit(file);
      else result[path.relative(directory, file)] = sha256(await fs.readFile(file));
    }
  }
  await visit(directory);
  return result;
}

test('markWidgets preserves original bytes and native crop pixels, and writes a separate marked image', async t => {
  const root = await tempRoot(t);
  const image = path.join(root, 'input.png');
  const pixels = await writeImage(image);
  const original = await fs.readFile(image);
  const result = await markWidgets({ image, out: path.join(root, 'marks'), regions: [region] });
  assert.deepEqual(await fs.readFile(image), original);
  assert.deepEqual(await fs.readFile(path.join(result.directory, 'original.png')), original);
  const marked = await decoded(path.join(result.directory, 'marked.png'));
  assert.equal(marked.info.width, 16);
  assert.equal(marked.info.height, 12);
  assert.notDeepEqual(marked.data, pixels);

  const manifest = JSON.parse(await fs.readFile(path.join(result.directory, 'regions.json'), 'utf8'));
  assert.deepEqual(manifest, result.manifest);
  assert.equal(manifest.version, 1);
  assert.equal(manifest.source.path, 'original.png');
  assert.equal(manifest.source.sha256, sha256(original));
  assert.equal(manifest.source.width, 16);
  assert.equal(manifest.source.height, 12);
  assert.equal(manifest.regions.length, 1);
  assert.deepEqual(manifest.regions[0].bounds, bounds);
  const snapshot = manifest.regions[0].snapshot;
  assert.equal(snapshot.path, 'crops/primary.png');
  const cropFile = path.join(result.directory, snapshot.path);
  const crop = await decoded(cropFile);
  // Construct expected rows directly from the original raw fixture, independently of sharp.extract.
  const expected = Buffer.concat(Array.from({ length: bounds.height }, (_, row) => {
    const start = ((bounds.y + row) * 16 + bounds.x) * 4;
    return pixels.subarray(start, start + bounds.width * 4);
  }));
  assert.deepEqual(crop.data, expected);
  assert.equal(crop.info.width, bounds.width);
  assert.equal(crop.info.height, bounds.height);
  assert.equal(snapshot.width, bounds.width);
  assert.equal(snapshot.height, bounds.height);
  assert.equal(snapshot.sha256, sha256(await fs.readFile(cropFile)));
  assert.match(snapshot.pixelSha256, /^[a-f0-9]{64}$/);
});

test('schemas reject invalid geometry and empty source lists, and default the search limit', async t => {
  const f = await fixture(t);
  assert.equal(FindWidgetsSchema.parse({ catalog: f.catalog, projectRoot: f.projectRoot }).limit, 8);
  assert.equal(RegisterWidgetSchema.safeParse({ ...f.registration, sourceFiles: [] }).success, false);
  for (const invalid of [
    { ...bounds, x: -1 }, { ...bounds, y: -1 }, { ...bounds, x: 0.5 },
    { ...bounds, width: 0 }, { ...bounds, height: 0 }, { ...bounds, height: 1.5 },
  ]) {
    assert.equal(MarkWidgetsSchema.safeParse({ image: f.image, out: f.marks, regions: [{ ...region, bounds: invalid }] }).success, false);
  }
});

test('markWidgets rejects duplicate region IDs and crops extending beyond either image edge', async t => {
  const root = await tempRoot(t);
  const image = path.join(root, 'input.png');
  await writeImage(image);
  const before = await fs.readFile(image);
  const attempts = [
    [region, { ...region, name: 'Duplicate' }],
    [{ ...region, bounds: { ...bounds, x: 10 } }],
    [{ ...region, bounds: { ...bounds, y: 8 } }],
  ];
  for (const [index, regions] of attempts.entries()) {
    await assert.rejects(() => markWidgets({ image, out: path.join(root, `invalid-${index}`), regions }));
  }
  assert.deepEqual(await fs.readFile(image), before);
});

test('registration records project and file provenance without claiming verification', async t => {
  const f = await fixture(t);
  const result = await registerWidget(f.registration);
  assert.equal(result.entry.id, f.registration.id);
  assert.equal(result.entry.symbol, f.registration.symbol);
  assert.equal(result.entry.projectRoot, await fs.realpath(f.projectRoot));
  assert.equal(result.entry.verification, 'not-run');
  for (const field of ['sourceFiles', 'testFiles'] as const) {
    const files = result.entry[field]!;
    assert.equal(files.length, 1);
    assert.equal(files[0]!.path, f.registration[field][0]);
    assert.equal(files[0]!.sha256, sha256(await fs.readFile(path.join(f.projectRoot, files[0]!.path))));
  }
  const reference = result.entry.reference;
  assert.equal(reference.path, 'reference.png');
  const referenceFile = path.join(result.directory, reference.path);
  assert.deepEqual((await decoded(referenceFile)).data, (await decoded(f.crop)).data);
  assert.equal(reference.sha256, sha256(await fs.readFile(referenceFile)));
  assert.equal(reference.pixelSha256, f.marked.manifest.regions[0]!.snapshot.pixelSha256);
  assert.equal(reference.width, bounds.width);
  assert.equal(reference.height, bounds.height);
});

test('registration rejects tampered original, crop, hash, and source bounds', async t => {
  for (const target of ['original', 'crop', 'hash', 'bounds'] as const) {
    await t.test(target, async t => {
      const f = await fixture(t);
      if (target === 'hash' || target === 'bounds') {
        const file = path.join(f.marks, 'regions.json');
        const manifest = JSON.parse(await fs.readFile(file, 'utf8'));
        if (target === 'hash') manifest.regions[0].snapshot.sha256 = '0'.repeat(64);
        else manifest.regions[0].bounds.x += 1;
        await fs.writeFile(file, JSON.stringify(manifest));
      } else {
        await writeImage(target === 'original' ? path.join(f.marks, 'original.png') : f.crop, 8, 8);
      }
      await assert.rejects(() => registerWidget(f.registration));
      assert.equal((await findWidgets({ catalog: f.catalog, projectRoot: f.projectRoot })).candidates.length, 0);
    });
  }
});

test('registration rejects missing files, symlinks, escaping paths, and sources without Dart', async t => {
  const f = await fixture(t);
  await fs.writeFile(path.join(f.projectRoot, 'lib/readme.txt'), 'No Dart source here.');
  await fs.symlink(path.join(f.projectRoot, 'lib/button.dart'), path.join(f.projectRoot, 'lib/link.dart'));
  await fs.symlink(path.join(f.projectRoot, 'lib'), path.join(f.projectRoot, 'linked'));
  await fs.writeFile(path.join(f.root, 'outside.dart'), 'class Outside {}');
  const cases = [
    { sourceFiles: ['lib/missing.dart'] },
    { sourceFiles: ['lib/readme.txt'] },
    { sourceFiles: ['lib/link.dart'] },
    { sourceFiles: ['linked/button.dart'] },
    { sourceFiles: ['../outside.dart'] },
    { sourceFiles: [path.join(f.projectRoot, 'lib/button.dart')] },
    { testFiles: ['test/missing_test.dart'] },
    { testFiles: ['lib/link.dart'] },
  ];
  for (const [index, overrides] of cases.entries()) {
    await assert.rejects(() => registerWidget({ ...f.registration, id: `invalid-${index}`, ...overrides }));
  }
  assert.equal((await findWidgets({ catalog: f.catalog, projectRoot: f.projectRoot })).candidates.length, 0);
});

test('duplicate registration refuses to overwrite an immutable catalog entry', async t => {
  const f = await fixture(t);
  await registerWidget(f.registration);
  const before = await inventory(f.catalog);
  await assert.rejects(() => registerWidget({ ...f.registration, name: 'Replacement', description: 'Must not overwrite' }));
  assert.deepEqual(await inventory(f.catalog), before);
  const result = await findWidgets({ catalog: f.catalog, projectRoot: f.projectRoot });
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0]!.name, f.registration.name);
});

test('missing catalog lookup returns no matches or issues without creating the catalog', async t => {
  const f = await fixture(t);
  const before = await inventory(f.root);
  const result = await findWidgets({ catalog: f.catalog, projectRoot: f.projectRoot });
  assert.deepEqual(result.candidates, []);
  assert.deepEqual(result.issues, []);
  assert.deepEqual(await inventory(f.root), before);
  await assert.rejects(fs.stat(f.catalog), { code: 'ENOENT' });
});

test('lookup recognizes exact decoded pixels after PNG reencoding and remains read only', async t => {
  const f = await fixture(t);
  await registerWidget(f.registration);
  const reencoded = path.join(f.root, 'reencoded.png');
  await sharp(f.crop).png({ compressionLevel: 0, adaptiveFiltering: false }).toFile(reencoded);
  assert.notDeepEqual(await fs.readFile(reencoded), await fs.readFile(f.crop));
  assert.deepEqual((await decoded(reencoded)).data, (await decoded(f.crop)).data);
  const before = await inventory(f.root);
  const result = await findWidgets({ catalog: f.catalog, projectRoot: f.projectRoot, image: reencoded });
  assert.deepEqual(result.issues, []);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0]!.id, f.registration.id);
  assert.equal(result.candidates[0]!.match, 'exact-pixels');
  assert.equal(result.candidates[0]!.sourceStatus, 'matching');
  assert.deepEqual(await inventory(f.root), before);
});

test('lookup distinguishes changed source from missing source even with an exact visual match', async t => {
  const f = await fixture(t);
  await registerWidget(f.registration);
  const source = path.join(f.projectRoot, 'lib/button.dart');
  await fs.writeFile(source, 'class PrimaryButton { final label = "changed"; }\n');
  const changed = await findWidgets({ catalog: f.catalog, projectRoot: f.projectRoot, image: f.crop });
  assert.equal(changed.candidates.length, 1);
  assert.equal(changed.candidates[0]!.sourceStatus, 'changed');
  assert.equal(changed.candidates[0]!.match, 'exact-pixels');
  await fs.unlink(source);
  const missing = await findWidgets({ catalog: f.catalog, projectRoot: f.projectRoot, image: f.crop });
  assert.equal(missing.candidates.length, 1);
  assert.equal(missing.candidates[0]!.sourceStatus, 'missing');
});

test('identical source bytes in another project are reported as different-project', async t => {
  const f = await fixture(t);
  await registerWidget(f.registration);
  const otherProject = path.join(f.root, 'other-project');
  await fs.cp(f.projectRoot, otherProject, { recursive: true });
  const result = await findWidgets({ catalog: f.catalog, projectRoot: otherProject, image: f.crop });
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0]!.sourceStatus, 'different-project');
});

test('unequal image dimensions cannot produce a pixel match by resizing', async t => {
  const f = await fixture(t);
  await registerWidget(f.registration);
  const larger = path.join(f.root, 'double-size.png');
  // A deliberately scaled query is a negative fixture: lookup must not normalize geometry.
  await sharp(f.crop).resize(bounds.width * 2, bounds.height * 2, { kernel: 'nearest' }).png().toFile(larger);
  const result = await findWidgets({ catalog: f.catalog, projectRoot: f.projectRoot, image: larger });
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0]!.match, 'metadata-only');
});

test('query ranks relevant metadata above an earlier unrelated entry and honors limit', async t => {
  const f = await fixture(t);
  await registerWidget({ ...f.registration, id: 'aaa-unrelated', name: 'Weather panel', symbol: 'WeatherPanel', description: 'Temperature forecast', tags: ['weather'] });
  await registerWidget({ ...f.registration, id: 'zzz-checkout', name: 'Checkout button', symbol: 'CheckoutButton', description: 'Checkout purchase action', tags: ['checkout'] });
  const result = await findWidgets({ catalog: f.catalog, projectRoot: f.projectRoot, query: 'checkout', limit: 1 });
  assert.deepEqual(result.issues, []);
  assert.equal(result.candidates.length, 1);
  assert.equal(result.candidates[0]!.id, 'zzz-checkout');
  assert.equal(result.candidates[0]!.match, 'metadata-only');
});

test('corrupt or replaced catalog snapshots produce issues and cannot become matches', async t => {
  for (const replacement of ['invalid-png', 'valid-but-tampered'] as const) {
    await t.test(replacement, async t => {
      const f = await fixture(t);
      const registered = await registerWidget(f.registration);
      await registerWidget({ ...f.registration, id: 'healthy' });
      const reference = path.join(registered.directory, registered.entry.reference.path);
      if (replacement === 'invalid-png') await fs.writeFile(reference, 'not a PNG');
      else await writeImage(reference, bounds.width, bounds.height);
      const before = await inventory(f.catalog);
      const result = await findWidgets({ catalog: f.catalog, projectRoot: f.projectRoot, image: f.crop });
      assert.ok(result.issues.length > 0);
      assert.deepEqual(result.candidates.map(candidate => candidate.id), ['healthy']);
      assert.deepEqual(await inventory(f.catalog), before);
    });
  }
});

test('parallel registration of distinct IDs retains both entries', async t => {
  const f = await fixture(t);
  await Promise.all([
    registerWidget({ ...f.registration, id: 'first' }),
    registerWidget({ ...f.registration, id: 'second' }),
  ]);
  const result = await findWidgets({ catalog: f.catalog, projectRoot: f.projectRoot, image: f.crop });
  assert.deepEqual(result.issues, []);
  assert.deepEqual(result.candidates.map(candidate => candidate.id).sort(), ['first', 'second']);
  assert.ok(result.candidates.every(candidate => candidate.sourceStatus === 'matching' && candidate.match === 'exact-pixels'));
});

test('malformed catalog metadata is reported as an issue while healthy entries remain searchable', async t => {
  const f = await fixture(t);
  const broken = await registerWidget(f.registration);
  await registerWidget({ ...f.registration, id: 'healthy' });
  await fs.writeFile(path.join(broken.directory, 'widget.json'), '{"id":');
  const before = await inventory(f.catalog);
  const result = await findWidgets({ catalog: f.catalog, projectRoot: f.projectRoot });
  assert.ok(result.issues.length > 0);
  assert.deepEqual(result.candidates.map(candidate => candidate.id), ['healthy']);
  assert.deepEqual(await inventory(f.catalog), before);
});

test('changed stored source snapshots invalidate an entry even when the project source is unchanged', async t => {
  const f = await fixture(t);
  const registered = await registerWidget(f.registration);
  const sourceBefore = await fs.readFile(path.join(f.projectRoot, 'lib/button.dart'));
  await fs.writeFile(path.join(registered.directory, 'source', 'lib/button.dart'), 'class TamperedSnapshot {}\n');
  const before = await inventory(f.catalog);
  const result = await findWidgets({ catalog: f.catalog, projectRoot: f.projectRoot, image: f.crop });
  assert.deepEqual(result.candidates, []);
  assert.ok(result.issues.length > 0);
  assert.deepEqual(await fs.readFile(path.join(f.projectRoot, 'lib/button.dart')), sourceBefore);
  assert.deepEqual(await inventory(f.catalog), before);
});

test('incomplete marks cannot be registered and incomplete catalog entries cannot be retrieved', async t => {
  const f = await fixture(t);
  const registered = await registerWidget(f.registration);
  await fs.writeFile(path.join(f.marks, 'incomplete.json'), JSON.stringify({ status: 'failed' }));
  const before = await inventory(f.catalog);
  await assert.rejects(() => registerWidget({ ...f.registration, id: 'from-incomplete-marks' }));
  assert.deepEqual(await inventory(f.catalog), before);

  await fs.writeFile(path.join(registered.directory, 'incomplete.json'), JSON.stringify({ status: 'pending' }));
  const incomplete = await inventory(f.catalog);
  const result = await findWidgets({ catalog: f.catalog, projectRoot: f.projectRoot, image: f.crop });
  assert.deepEqual(result.candidates, []);
  assert.ok(result.issues.length > 0);
  assert.deepEqual(await inventory(f.catalog), incomplete);
});
