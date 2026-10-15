import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { WidgetPlanSchema, planWidgetWork } from '../src/widget-plan.js';
import { markWidgets } from '../src/widget-catalog.js';
import { json, writeJson } from '../src/io.js';

const job = (id: string, dependsOn: string[] = [], files = [`lib/${id}.dart`]) => ({
  id, regionIds: [id], decision: 'create' as const, files, dependsOn, brief: `Implement ${id}`,
});
async function fixture(t: { after: (fn: () => Promise<void>) => void }, ids: string[]) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity-widget-plan-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const marks = path.join(root, 'marks'), catalog = path.join(root, 'catalog'), out = path.join(root, 'plan');
  const image = path.join(root, 'input.png');
  await sharp({ create: { width: 16, height: 16, channels: 4, background: '#abcdef' } }).png().toFile(image);
  await markWidgets({ image, out: marks, regions: ids.map(id => ({ id, name: id, kind: 'control', bounds: { x: 0, y: 0, width: 8, height: 8 } })) });
  await fs.mkdir(path.join(catalog, 'existing-card'), { recursive: true });
  await writeJson(path.join(catalog, 'existing-card/widget.json'), { version: 1, id: 'existing-card' });
  return { root, out, marks, catalog };
}

test('strict input schema validates decisions, paths, defaults and safe output slugs', () => {
  const input = { out: 'out', marks: 'marks', catalog: 'catalog', widgets: [{ ...job('card'), dependsOn: undefined }] };
  const parsed = WidgetPlanSchema.parse(input);
  assert.equal(parsed.maxParallel, 3);
  assert.deepEqual(parsed.widgets[0]!.dependsOn, []);
  for (const extra of [{ unknown: true }, { maxParallel: 0 }, { maxParallel: 9 }, { maxParallel: 1.5 }])
    assert.equal(WidgetPlanSchema.safeParse({ ...input, ...extra }).success, false);
  const invalidJobs = [
    { ...job('card'), unknown: true }, { ...job('card'), brief: '' }, { ...job('card'), regionIds: [] },
    { ...job('card'), decision: 'reuse' }, { ...job('card'), decision: 'adapt' },
    { ...job('card'), decision: 'adapt', existingWidgetId: 'existing-card', files: [] },
    { ...job('card'), files: [] }, { ...job('card'), files: ['lib/a.dart', 'lib/a.dart'] },
    { ...job('card'), regionIds: ['card', 'card'] },
  ];
  for (const widget of invalidJobs) assert.equal(WidgetPlanSchema.safeParse({ ...input, widgets: [widget] }).success, false);
  for (const id of ['../escape', 'a/b', 'a\\b', '.', 'CARD', 'a'.repeat(65), 'x\n# heading'])
    assert.equal(WidgetPlanSchema.safeParse({ ...input, widgets: [{ ...job('card'), id }] }).success, false);
  for (const file of ['/tmp/a.dart', '../a.dart', 'lib/../a.dart', 'lib\\a.dart', 'C:/a.dart', 'lib//a.dart', './a.dart', 'lib/a\0.dart'])
    assert.equal(WidgetPlanSchema.safeParse({ ...input, widgets: [{ ...job('card'), files: [file] }] }).success, false);
  assert.equal(WidgetPlanSchema.safeParse({ ...input, widgets: [{ ...job('card'), decision: 'reuse', existingWidgetId: 'existing-card', files: [] }] }).success, true);
});

test('DAG waves honor dependency barriers, stable input order and parallelism limit', async t => {
  const f = await fixture(t, ['base', 'left', 'right', 'join', 'independent']);
  const widgets = [job('join', ['left', 'right']), job('left', ['base']), job('right', ['base']), job('base'), job('independent')];
  const plan = await planWidgetWork({ out: f.out, marks: f.marks, catalog: f.catalog, widgets, maxParallel: 2 });
  assert.deepEqual(plan.waves, [['base', 'independent'], ['left', 'right'], ['join']]);
  assert.deepEqual(await json(path.join(f.out, 'plan.json')), plan);
  await assert.rejects(fs.stat(path.join(f.out, 'incomplete.json')), { code: 'ENOENT' });
  const again = await planWidgetWork({ out: path.join(f.root, 'again'), marks: f.marks, catalog: f.catalog, widgets, maxParallel: 2 });
  assert.deepEqual(again.waves, plan.waves);
});

test('case aliases and ancestor paths serialize without rewriting owned paths', async t => {
  const f = await fixture(t, ['a', 'b', 'c', 'd', 'e']);
  const widgets = [job('a', [], ['lib/Card.dart']), job('b', [], ['LIB/card.dart']),
    job('c', [], ['lib/widgets']), job('d', [], ['lib/widgets/card.dart']), job('e', [], ['lib/widgets2/card.dart'])];
  const plan = await planWidgetWork({ out: f.out, marks: f.marks, catalog: f.catalog, widgets, maxParallel: 8 });
  assert.deepEqual(plan.waves, [['a', 'c', 'e'], ['b', 'd']]);
  assert.deepEqual(plan.widgets.map(widget => widget.files), widgets.map(widget => widget.files));
  const reverse = await planWidgetWork({ out: path.join(f.root, 'reverse'), marks: f.marks, catalog: f.catalog, widgets: [...widgets].reverse(), maxParallel: 1 });
  assert.deepEqual(reverse.waves, [['e'], ['d'], ['c'], ['b'], ['a']]);
  const parentLast = await planWidgetWork({ out: path.join(f.root, 'parent-last'), marks: f.marks, catalog: f.catalog, widgets: [...widgets].reverse(), maxParallel: 8 });
  assert.deepEqual(parentLast.waves, [['e', 'd', 'b'], ['c', 'a']]);
});

test('brief write failure retains explicit incomplete evidence and requires a new output', async t => {
  const f = await fixture(t, ['a']);
  const originalWrite = fs.writeFile.bind(fs);
  t.mock.method(fs, 'writeFile', async (...args: Parameters<typeof fs.writeFile>) => {
    if (String(args[0]).endsWith('/briefs/a.md')) throw new Error('Simulated brief write failure');
    return originalWrite(...args);
  });
  const input = { out: f.out, marks: f.marks, catalog: f.catalog, widgets: [job('a')] };
  await assert.rejects(planWidgetWork(input), /Simulated brief write failure/);
  assert.deepEqual(await json(path.join(f.out, 'incomplete.json')), { status: 'failed', error: 'Simulated brief write failure' });
  await assert.rejects(fs.stat(path.join(f.out, 'plan.json')), { code: 'ENOENT' });
  await assert.rejects(planWidgetWork(input), { code: 'EEXIST' });
});

test('shared files serialize ready jobs while independent work fills a wave', async t => {
  const f = await fixture(t, ['a', 'b', 'c', 'd', 'e']);
  const plan = await planWidgetWork({ out: f.out, marks: f.marks, catalog: f.catalog, maxParallel: 3, widgets: [
    job('a', [], ['lib/shared.dart', 'lib/a.dart']), job('b', [], ['lib/shared.dart']),
    job('c', ['b']), job('d', [], ['lib/d.dart']), job('e', ['a'], ['lib/shared.dart']),
  ] });
  assert.deepEqual(plan.waves, [['a', 'd'], ['b'], ['c', 'e']]);
  const done = new Set<string>();
  for (const wave of plan.waves) {
    const owned = new Set<string>();
    assert.ok(wave.length <= plan.maxParallel);
    for (const id of wave) {
      const widget = plan.widgets.find(candidate => candidate.id === id)!;
      assert.ok(widget.dependsOn.every(dependency => done.has(dependency)));
      for (const file of widget.files) { assert.ok(!owned.has(file)); owned.add(file); }
    }
    for (const id of wave) done.add(id);
  }
});

for (const [label, widgets, pattern] of [
  ['cycle beside independent work', [job('a', ['b']), job('b', ['a']), job('c')], /cycle/],
  ['self dependency', [job('a', ['a']), job('b'), job('c')], /Self dependency/],
  ['unknown dependency', [job('a', ['missing']), job('b'), job('c')], /Unknown dependency/],
  ['duplicate job IDs', [job('a'), { ...job('b'), id: 'a' }, job('c')], /IDs must be unique/],
  ['duplicate coverage', [job('a'), { ...job('b'), regionIds: ['a', 'b'] }, job('c')], /Duplicate region coverage/],
  ['duplicate region within job', [{ ...job('a'), regionIds: ['a', 'a'] }, job('b'), job('c')], /Duplicate/],
  ['unknown region', [job('a'), job('b'), job('missing')], /Unknown marked region/],
  ['missing region', [job('a'), job('b')], /Uncovered marked regions: c/],
] as const) {
  test(`rejects ${label} before creating output`, async t => {
    const f = await fixture(t, ['a', 'b', 'c']);
    await assert.rejects(planWidgetWork({ out: f.out, marks: f.marks, catalog: f.catalog, widgets }), pattern);
    await assert.rejects(fs.stat(f.out), { code: 'ENOENT' });
  });
}

test('all reusable groups retain coordinator steps and no-file dependency barriers', async t => {
  const f = await fixture(t, ['card-1', 'card-2', 'header', 'footer']);
  const reuse = (id: string, regionIds: string[], dependsOn: string[] = []) => ({
    id, regionIds, dependsOn, decision: 'reuse', existingWidgetId: 'existing-card', files: [], brief: 'Review existing API',
  });
  const plan = await planWidgetWork({ out: f.out, marks: f.marks, catalog: f.catalog, widgets: [
    reuse('cards', ['card-1', 'card-2']), reuse('header', ['header'], ['cards']), reuse('footer', ['footer'], ['cards']),
  ] });
  assert.deepEqual(plan.waves, [['cards'], ['header', 'footer']]);
  assert.ok(plan.widgets.every(widget => widget.execution === 'coordinator-review'));
  assert.equal(plan.status, 'planned');
  assert.deepEqual(plan.evidence, { inference: 'not-run', validation: 'not-run' });
  assert.equal(plan.execution.launchesModels, false);
  assert.equal(plan.execution.fallback, 'sequential');
  assert.equal((await fs.readdir(path.join(f.out, 'briefs'))).length, 3);
});

test('briefs encode supplied text as JSON data and include ownership, interfaces and context', async t => {
  const f = await fixture(t, ['a', 'b']);
  const brief = '```\n<script>alert("x")</script>\n$(touch /tmp/never-run) & `command`';
  const existingWidgetId = 'existing-card';
  const before = await fs.readFile(path.join(f.marks, 'regions.json'));
  const catalogBefore = await fs.readFile(path.join(f.catalog, 'existing-card/widget.json'));
  const plan = await planWidgetWork({ out: f.out, marks: f.marks, catalog: f.catalog, widgets: [
    job('a'), { ...job('b', ['a']), decision: 'adapt', existingWidgetId, brief },
  ] });
  const markdown = await fs.readFile(path.join(f.out, plan.widgets[1]!.briefFile), 'utf8');
  assert.equal(markdown.match(/```/g)?.length, 2);
  assert.ok(!markdown.includes('<script>'));
  const context = JSON.parse(markdown.split('```json\n')[1]!.split('\n```')[0]!);
  assert.equal(context.job.brief, brief);
  assert.equal(context.job.existingWidgetId, existingWidgetId);
  assert.deepEqual(context.job.files, ['lib/b.dart']);
  assert.equal(context.context.regionsFile, path.join(f.marks, 'regions.json'));
  assert.equal(context.context.catalog, f.catalog);
  assert.equal(context.dependencies[0].id, 'a');
  assert.equal(context.wave, 2);
  for (const required of [/interfaces/, /PNG is the/, /sequentially in wave order/, /must not spawn/, /incomplete evidence/]) assert.match(markdown, required);
  assert.deepEqual(await fs.readFile(path.join(f.marks, 'regions.json')), before);
  assert.deepEqual(await fs.readFile(path.join(f.catalog, 'existing-card/widget.json')), catalogBefore);
});

test('fresh output is required, including empty directories and existing symlinks', async t => {
  const f = await fixture(t, ['a']);
  const input = { out: f.out, marks: f.marks, catalog: f.catalog, widgets: [job('a')] };
  await planWidgetWork(input);
  const before = await fs.readFile(path.join(f.out, 'plan.json'));
  await assert.rejects(planWidgetWork(input), { code: 'EEXIST' });
  assert.deepEqual(await fs.readFile(path.join(f.out, 'plan.json')), before);
  const empty = path.join(f.root, 'empty'); await fs.mkdir(empty);
  await assert.rejects(planWidgetWork({ ...input, out: empty }), { code: 'EEXIST' });
  assert.deepEqual(await fs.readdir(empty), []);
  const link = path.join(f.root, 'link'); await fs.symlink(empty, link);
  await assert.rejects(planWidgetWork({ ...input, out: link }), { code: 'EEXIST' });
  assert.deepEqual(await fs.readdir(empty), []);
});

test('empty, malformed or duplicate marks are rejected', async t => {
  const f = await fixture(t, ['a']);
  const input = { out: f.out, marks: f.marks, catalog: f.catalog, widgets: [] };
  const original = await json(path.join(f.marks, 'regions.json')) as { regions: unknown[] };
  for (const marks of [{ ...original, regions: [] }, { ...original, version: 2 }, { ...original, regions: [original.regions[0], original.regions[0]] }]) {
    await writeJson(path.join(f.marks, 'regions.json'), marks);
    await assert.rejects(planWidgetWork({ ...input, out: path.join(f.root, 'invalid') }));
    await assert.rejects(fs.stat(path.join(f.root, 'invalid')), { code: 'ENOENT' });
  }
});

test('marked PNG integrity and incomplete runs are checked before saving', async t => {
  const f = await fixture(t, ['a']);
  const input = { out: f.out, marks: f.marks, catalog: f.catalog, widgets: [job('a')] };
  await writeJson(path.join(f.marks, 'incomplete.json'), { status: 'pending' });
  await assert.rejects(planWidgetWork(input), /Incomplete/);
  await fs.unlink(path.join(f.marks, 'incomplete.json'));
  await sharp({ create: { width: 16, height: 16, channels: 4, background: '#ff0000' } }).png().toFile(path.join(f.marks, 'original.png'));
  await assert.rejects(planWidgetWork(input), /integrity/);
  await assert.rejects(fs.stat(f.out), { code: 'ENOENT' });
});

test('planner rejects corrupted worker crop even when the original screen is intact', async t => {
  const f = await fixture(t, ['a']);
  await sharp({ create: { width: 8, height: 8, channels: 4, background: '#ff0000' } }).png().toFile(path.join(f.marks, 'crops/a.png'));
  await assert.rejects(planWidgetWork({ out: f.out, marks: f.marks, catalog: f.catalog, widgets: [job('a')] }), /snapshot integrity/);
  await assert.rejects(fs.stat(f.out), { code: 'ENOENT' });
});

test('reuse/adapt require an existing, complete catalog entry with matching ID', async t => {
  const f = await fixture(t, ['a']);
  for (const decision of ['reuse', 'adapt']) {
    const input = { out: f.out, marks: f.marks, catalog: f.catalog, widgets: [{ ...job('a'), decision, existingWidgetId: 'missing' }] };
    await assert.rejects(planWidgetWork(input), { code: 'ENOENT' });
    input.widgets[0]!.existingWidgetId = 'existing-card';
    await writeJson(path.join(f.catalog, 'existing-card/incomplete.json'), {});
    await assert.rejects(planWidgetWork(input), /Incomplete catalog entry/);
    await fs.unlink(path.join(f.catalog, 'existing-card/incomplete.json'));
    await writeJson(path.join(f.catalog, 'existing-card/widget.json'), { version: 1, id: 'different' });
    await assert.rejects(planWidgetWork(input), /Invalid literal/);
    await assert.rejects(fs.stat(f.out), { code: 'ENOENT' });
  }
});
