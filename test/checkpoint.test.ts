import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { createSourceCheckpoint, copySourceCheckpoint, readSourceCheckpoint, verifySourceCheckpoint } from '../src/checkpoint.js';
import { CaptureConfigSchema, CaptureSchema } from '../src/schema.js';
import { importReference } from '../src/reference.js';
import { compareUI } from '../src/compare.js';
import { captureUI } from '../src/capture.js';
import { recordIteration } from '../src/repair.js';
import { hash, writeJson } from '../src/io.js';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createServer } from '../src/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity-checkpoint-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const project = path.join(root, 'project'); await fs.mkdir(path.join(project, 'lib'), { recursive: true });
  await fs.writeFile(path.join(project, 'lib/screen.dart'), 'class Screen {}\n');
  const out = path.join(root, 'checkpoint'), manifest = path.join(out, 'checkpoint.json');
  return { root, project, out, manifest };
}

test('checkpoint snapshots source and expected deletions; verification ignores unrelated files', async t => {
  const f = await fixture(t);
  const checkpoint = await createSourceCheckpoint(f.project, ['lib/screen.dart', 'lib/deleted.dart'], 'round-1', f.out);
  assert.equal(checkpoint.files.find(file => file.path === 'lib/deleted.dart')!.sha256, null);
  await fs.writeFile(path.join(f.project, 'unrelated.dart'), 'user change');
  assert.equal((await verifySourceCheckpoint(f.manifest, f.project)).status, 'passed');
  await fs.writeFile(path.join(f.project, 'lib/screen.dart'), 'class Changed {}');
  await fs.writeFile(path.join(f.project, 'lib/deleted.dart'), 'restored stale file');
  const result = await verifySourceCheckpoint(f.manifest, f.project);
  assert.deepEqual(result.mismatches.map(file => file.path), ['lib/deleted.dart', 'lib/screen.dart']);
  await fs.copyFile(path.join(f.out, 'files/lib/screen.dart'), path.join(f.project, 'lib/screen.dart'));
  await fs.unlink(path.join(f.project, 'lib/deleted.dart'));
  assert.equal((await verifySourceCheckpoint(f.manifest, f.project)).status, 'passed');
});

test('checkpoint rejects traversal, duplicate paths, symlinks and tampered snapshot bytes', async t => {
  const f = await fixture(t);
  for (const file of ['../other.dart', '/absolute.dart', 'lib/../screen.dart', 'C:/screen.dart', 'lib\\screen.dart'])
    await assert.rejects(createSourceCheckpoint(f.project, [file], 'round', f.out));
  await assert.rejects(createSourceCheckpoint(f.project, ['lib/screen.dart', 'lib/screen.dart'], 'round', f.out), /unique/);
  await fs.symlink(path.join(f.project, 'lib'), path.join(f.project, 'link'));
  await assert.rejects(createSourceCheckpoint(f.project, ['link/missing.dart'], 'round', f.out), /symlink/);
  await createSourceCheckpoint(f.project, ['lib/screen.dart'], 'round', f.out);
  await fs.writeFile(path.join(f.out, 'files/lib/screen.dart'), 'tampered');
  await assert.rejects(readSourceCheckpoint(f.manifest), /snapshot differs/);
});

test('manifest hash and capture identity prevent swapping a different checkpoint into a report', async t => {
  const f = await fixture(t), checkpoint = await createSourceCheckpoint(f.project, ['lib/screen.dart'], 'round', f.out);
  await assert.rejects(copySourceCheckpoint(f.manifest, path.join(f.root, 'copy'), { ...checkpoint, id: 'other' }), /does not belong/);
  await writeJson(f.manifest, { ...checkpoint, sourceSha256: '0'.repeat(64) });
  await assert.rejects(readSourceCheckpoint(f.manifest), /manifest hash/);
});

test('MCP verifies scoped source and returns mismatch evidence without editing the project', async t => {
  const f = await fixture(t); await createSourceCheckpoint(f.project, ['lib/screen.dart'], 'round', f.out);
  const [a, b] = InMemoryTransport.createLinkedPair(), server = createServer(), client = new Client({ name: 'checkpoint-test', version: '1' });
  await server.connect(b); await client.connect(a); t.after(async () => { await client.close(); await server.close(); });
  const call = () => client.callTool({ name: 'verify_source_checkpoint', arguments: { checkpoint: f.manifest, projectRoot: f.project } });
  const passing = await call(); assert.equal(passing.isError, undefined);
  assert.equal(JSON.parse((passing.content as { text: string }[])[0]!.text).status, 'passed');
  await fs.writeFile(path.join(f.project, 'lib/screen.dart'), 'changed');
  const failing = await call(); assert.equal(failing.isError, undefined);
  assert.equal(JSON.parse((failing.content as { text: string }[])[0]!.text).mismatches[0].path, 'lib/screen.dart');
  assert.equal(await fs.readFile(path.join(f.project, 'lib/screen.dart'), 'utf8'), 'changed');
});

test('comparison carries a verified snapshot into the report and repair returns its exact checkpoint', async t => {
  const f = await fixture(t), captureDirectory = path.join(f.root, 'capture'); await fs.mkdir(captureDirectory);
  const checkpoint = await createSourceCheckpoint(f.project, ['lib/screen.dart'], 'round-1', path.join(captureDirectory, 'source-checkpoint'));
  const image = path.join(captureDirectory, 'actual.png'); await sharp({ create: { width: 20, height: 20, channels: 4, background: '#fff' } }).png().toFile(image);
  const bundleDirectory = path.join(f.root, 'bundle');
  const { bundle } = await importReference({ image, out: bundleDirectory, width: 20, height: 20, confirmed: true, fonts: [path.resolve('fixtures/fonts/Lato-Regular.ttf')], spec: { version: 1, regions: [{ id: 'card', kind: 'layout', bounds: { x: 0, y: 0, width: 20, height: 20 }, confidence: 'high', provenance: 'Controlled test bounds' }] } });
  const capture = CaptureSchema.parse({ version: 3, sourceCheckpoint: checkpoint, profile: bundle.profile, mode: 'widget', platform: 'widget-test', flutterVersion: 'test', createdAt: new Date().toISOString(), referenceSha256: bundle.reference.sha256, imageSha256: await hash(image), fontSha256: bundle.fonts.map(file => file.sha256), fontsLoaded: true, settled: true, runtimeErrors: [], regions: [{ id: 'card', bounds: { x: 0, y: 0, width: 20, height: 20 } }], checks: { analysis: 'passed', interactions: 'passed', accessibility: 'passed', responsive: 'passed' } });
  const metadata = path.join(captureDirectory, 'capture.json'); await writeJson(metadata, capture);
  capture.checks.interactions = 'failed'; await writeJson(metadata, capture);
  const report = path.join(f.root, 'report'); await compareUI({ bundle: bundleDirectory, actual: image, capture: metadata, out: report });
  const result = await recordIteration(path.join(f.root, 'session.json'), report);
  assert.equal(result.sourceBinding, 'bound'); assert.equal(result.bestSourceCheckpoint, path.join(report, 'source-checkpoint/checkpoint.json'));
  const secondReport = path.join(f.root, 'second-report'); await fs.mkdir(secondReport);
  await copySourceCheckpoint(path.join(report, 'source-checkpoint/checkpoint.json'), path.join(secondReport, 'source-checkpoint'), checkpoint);
  const comparison = JSON.parse(await fs.readFile(path.join(report, 'comparison.json'), 'utf8'));
  await writeJson(path.join(secondReport, 'comparison.json'), comparison);
  await assert.rejects(recordIteration(path.join(f.root, 'session.json'), secondReport), /Checkpoint ID already recorded/);
  const changedScope = await createSourceCheckpoint(f.project, ['lib/screen.dart', 'lib/extra.dart'], 'round-2', path.join(f.root, 'changed-scope'));
  comparison.capture.sourceCheckpoint = changedScope; await writeJson(path.join(secondReport, 'comparison.json'), comparison);
  await assert.rejects(recordIteration(path.join(f.root, 'session.json'), secondReport), /coverage changed/);
  assert.equal(JSON.parse(await fs.readFile(path.join(f.root, 'session.json'), 'utf8')).runs.length, 1);
  await fs.rm(captureDirectory, { recursive: true });
  assert.equal((await verifySourceCheckpoint(result.bestSourceCheckpoint!, f.project)).status, 'passed');
  const cli = await promisify(execFile)(process.execPath, ['dist/cli.js', 'verify-source-checkpoint', '--checkpoint', result.bestSourceCheckpoint!, '--project-root', f.project]);
  assert.equal(JSON.parse(cli.stdout).status, 'passed');
  await fs.writeFile(path.join(f.project, 'lib/screen.dart'), 'class Wrong {}');
  await assert.rejects(promisify(execFile)(process.execPath, ['dist/cli.js', 'verify-source-checkpoint', '--checkpoint', result.bestSourceCheckpoint!, '--project-root', f.project]), error => {
    assert.equal((error as { code: number }).code, 1); return true;
  });
  await fs.writeFile(path.join(report, 'source-checkpoint/files/lib/screen.dart'), 'tampered');
  await assert.rejects(recordIteration(path.join(f.root, 'another-session.json'), report), /snapshot differs/);
});

// This executable exercises the host pipeline only; it is not Flutter or native evidence.
async function captureFixture(t: { after: (fn: () => Promise<void>) => void }, changeSource: boolean) {
  const f = await fixture(t), image = path.join(f.root, 'reference.png');
  await sharp({ create: { width: 20, height: 20, channels: 4, background: '#fff' } }).png().toFile(image);
  const bundle = path.join(f.root, 'bundle'); await importReference({ image, out: bundle, width: 20, height: 20, confirmed: true });
  const executable = path.join(f.root, 'flutter-test-double');
  await fs.writeFile(executable, `#!${process.execPath}\nimport fs from 'node:fs/promises';\nimport path from 'node:path';\nconst args=process.argv.slice(2);\nif(args.includes('--version')) { console.log(JSON.stringify({frameworkVersion:'test'})); }\nelse if(args[0]!=='analyze') {\n const request=JSON.parse(Buffer.from(args.find(a=>a.startsWith('--dart-define=')).split('=').slice(2).join('='),'base64').toString());\n const reference=await fs.readFile(${JSON.stringify(image)});\n await fs.writeFile(path.join(request.output,'actual.png'),reference);\n await fs.writeFile(path.join(request.output,'capture.json'),JSON.stringify({version:2,profile:request.profile,mode:request.mode,platform:'widget-test',flutterVersion:request.flutterVersion,createdAt:new Date().toISOString(),referenceSha256:request.referenceSha256,imageSha256:${JSON.stringify(await hash(image))},fontSha256:[],regions:[],fontsLoaded:false,settled:true,runtimeErrors:[]}));\n ${changeSource ? "await fs.writeFile('lib/screen.dart','changed during capture');" : ''}\n}\n`, { mode: 0o755 });
  // Node treats the extensionless test double as ESM under this local package scope.
  await writeJson(path.join(f.root, 'package.json'), { type: 'module' });
  return { ...f, bundle, config: { projectRoot: f.project, target: 'lib/screen.dart', flutter: executable, sourceCheckpoint: { id: 'round-1', files: ['lib/screen.dart'] } } };
}

test('capture binds source before running tools and refuses changes made during capture', async t => {
  const stable = await captureFixture(t, false), result = await captureUI({ bundle: stable.bundle, config: stable.config, out: path.join(stable.root, 'run') });
  assert.equal(result.capture.version, 3); assert.equal(result.capture.sourceCheckpoint!.id, 'round-1');
  await assert.rejects(fs.access(path.join(result.directory, 'capture-incomplete.json')));
  const changed = await captureFixture(t, true), out = path.join(changed.root, 'run');
  await assert.rejects(captureUI({ bundle: changed.bundle, config: changed.config, out }), /Owned files changed during capture/);
  assert.equal(JSON.parse(await fs.readFile(path.join(out, 'source-checkpoint-error.json'), 'utf8')).status, 'failed');
  assert.equal(JSON.parse(await fs.readFile(path.join(out, 'capture.json'), 'utf8')).version, 2);
  await assert.rejects(compareUI({ bundle: changed.bundle, actual: path.join(out, 'actual.png'), capture: path.join(out, 'capture.json'), out: path.join(changed.root, 'bad-report') }), /did not complete successfully/);
});

test('capture schema distinguishes bound v3 metadata from legacy unbound evidence', () => {
  assert.equal(CaptureConfigSchema.safeParse({ projectRoot: '.', target: 'test/ui.dart', sourceCheckpoint: { id: 'round', files: ['../bad'] } }).success, false);
  const legacy = { version: 2, profile: { width: 20, height: 20, pixelRatio: 1 }, mode: 'widget', platform: 'test', flutterVersion: 'test', createdAt: '', referenceSha256: 'a'.repeat(64), imageSha256: 'b'.repeat(64), fontSha256: [], regions: [], fontsLoaded: true, settled: true, runtimeErrors: [] };
  assert.equal(CaptureSchema.safeParse(legacy).success, true);
  assert.equal(CaptureSchema.safeParse({ ...legacy, version: 3 }).success, false);
});
