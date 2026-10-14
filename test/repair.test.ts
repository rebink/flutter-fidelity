import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { recordIteration } from '../src/repair.js';
import { CaptureSchema, PolicySchema } from '../src/schema.js';
import { writeJson } from '../src/io.js';

async function fixture(t: { after: (fn: () => Promise<void>) => void }) {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity-repair-'));
  t.after(() => fs.rm(root, { recursive: true, force: true }));
  const capture = CaptureSchema.parse({ version: 2, profile: { width: 100, height: 100, pixelRatio: 1 }, mode: 'widget', platform: 'widget-test', flutterVersion: 'test', createdAt: new Date().toISOString(), referenceSha256: 'a'.repeat(64), imageSha256: 'b'.repeat(64), fontSha256: [], regions: [], fontsLoaded: true, settled: true, runtimeErrors: [], checks: { analysis: 'passed', interactions: 'passed', accessibility: 'passed', responsive: 'passed' } });
  const report = { version: 2, referenceSha256: capture.referenceSha256, specSha256: 'c'.repeat(64), policy: PolicySchema.parse({}), capture, status: 'failed' as 'passed' | 'failed' | 'incomplete', metric: { tolerantRatio: 0.02 }, regions: [{ id: 'card', required: true, status: 'failed' as 'passed' | 'failed' | 'incomplete', geometryError: 2, metric: { tolerantRatio: 0.05 } }] };
  const save = async (name: string, value = report) => { const directory = path.join(root, name); await fs.mkdir(directory); await writeJson(path.join(directory, 'comparison.json'), value); return directory; };
  const passing = () => { const value = structuredClone(report); value.status = 'passed'; value.metric.tolerantRatio = 0; value.regions[0]!.status = 'passed'; value.regions[0]!.geometryError = 0; value.regions[0]!.metric.tolerantRatio = 0; return value; };
  return { root, session: path.join(root, 'session.json'), report, save, passing };
}

for (const check of ['interactions', 'accessibility', 'responsive'] as const) {
  for (const outcome of ['failed', 'not-run'] as const) {
    test(`repair retains the product-valid candidate when ${check} regresses to ${outcome}`, async t => {
      const f = await fixture(t), baseline = await f.save('baseline');
      await recordIteration(f.session, baseline);
      const candidate = f.passing(); candidate.capture.checks[check] = outcome;
      const visual = await f.save('visual', candidate), result = await recordIteration(f.session, visual);
      assert.equal(result.bestReport, baseline); assert.equal(result.bestVisualReport, visual);
      assert.equal(result.bestProductValidReport, baseline); assert.equal(result.bestValidReport, baseline);
      assert.deepEqual(result.regressedChecks, [check]); assert.equal(result.stop, false);
      // Reopening the session must preserve the passing checks and the retained source candidate.
      const again = await f.save('visual-again', candidate), stalled = await recordIteration(f.session, again);
      assert.equal(stalled.bestReport, baseline); assert.equal(stalled.stop, true);
      assert.match(stalled.reason, /Two rounds/);
    });
  }
}

test('known product failures cannot stop repair as a visual success or yield a valid report', async t => {
  const f = await fixture(t), candidate = f.passing(); candidate.capture.checks.interactions = 'failed';
  const result = await recordIteration(f.session, await f.save('broken-first', candidate));
  assert.equal(result.stop, false); assert.equal(result.bestProductValidReport, null); assert.equal(result.bestValidReport, null);
  assert.equal(result.runs[0]!.valid, false); assert.equal(result.runs[0]!.productSafe, false);
  assert.equal(result.sourceBinding, 'unavailable'); assert.equal(result.bestSourceCheckpoint, null);
});

test('an unrun product check remains incomplete when visual repair completes', async t => {
  const f = await fixture(t), candidate = f.passing(); candidate.capture.checks.accessibility = 'not-run';
  const result = await recordIteration(f.session, await f.save('incomplete', candidate));
  assert.equal(result.stop, true); assert.match(result.reason, /acceptance remains incomplete/);
  assert.equal(result.bestValidReport, null); assert.equal(result.runs[0]!.productSafe, true);
});

test('a candidate introducing a known failure cannot replace one with unrun checks', async t => {
  const f = await fixture(t); f.report.capture.checks.interactions = 'not-run';
  const baseline = await f.save('baseline'); await recordIteration(f.session, baseline);
  const candidate = f.passing(); candidate.capture.checks.interactions = 'failed';
  const result = await recordIteration(f.session, await f.save('broken', candidate));
  assert.equal(result.bestReport, baseline); assert.equal(result.stop, false);
});

test('fully verified visual improvement stops with both acceptance dimensions passed', async t => {
  const f = await fixture(t); await recordIteration(f.session, await f.save('baseline'));
  const candidate = await f.save('complete', f.passing()), result = await recordIteration(f.session, candidate);
  assert.equal(result.bestReport, candidate); assert.equal(result.bestValidReport, candidate);
  assert.equal(result.stop, true); assert.match(result.reason, /recorded product checks passed/);
});

test('repair rejects legacy sessions without rewriting or resetting their budget', async t => {
  const f = await fixture(t); await writeJson(f.session, { version: 1, runs: [{ report: 'previous' }], stalled: 1 });
  const before = await fs.readFile(f.session);
  await assert.rejects(recordIteration(f.session, await f.save('baseline')), /Legacy repair session v1/);
  assert.deepEqual(await fs.readFile(f.session), before);
});
