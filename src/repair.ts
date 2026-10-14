import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { PolicySchema, CaptureSchema, SourceCheckpointSchema, SourcePathSchema } from './schema.js';
import { json, writeJson } from './io.js';
import { readSourceCheckpoint } from './checkpoint.js';

const StatusSchema = z.enum(['passed', 'failed', 'incomplete']);
const CheckSchema = z.enum(['passed', 'failed', 'not-run']);
const ChecksSchema = z.object({ analysis: CheckSchema, interactions: CheckSchema, accessibility: CheckSchema, responsive: CheckSchema });
const unchecked = { analysis: 'not-run', interactions: 'not-run', accessibility: 'not-run', responsive: 'not-run' } as const;
const RunSchema = z.object({
  version: z.union([z.literal(1), z.literal(2)]), referenceSha256: z.string(), specSha256: z.string(),
  policy: PolicySchema, capture: CaptureSchema.optional(), status: StatusSchema,
  metric: z.object({ tolerantRatio: z.number().finite().nonnegative() }),
  regions: z.array(z.object({ id: z.string(), required: z.boolean().default(true), geometryError: z.number().optional(), textMatches: z.boolean().optional(), metric: z.object({ tolerantRatio: z.number() }).optional(), status: StatusSchema })),
});
const CandidateSchema = z.object({
  report: z.string(), ratio: z.number(), valid: z.boolean(), codeValid: z.boolean(), productSafe: z.boolean(),
  checks: ChecksSchema, status: StatusSchema, regions: z.array(z.string()), progress: z.array(z.number()),
  sourceCheckpoint: SourceCheckpointSchema.optional(),
});
const SessionSchema = z.object({
  version: z.literal(2), repairPolicyVersion: z.literal(2), referenceSha256: z.string(), specSha256: z.string(), policySha256: z.string(),
  sourcePaths: z.array(SourcePathSchema).nullable(),
  best: z.number().int().nonnegative(), bestVisual: z.number().int().nonnegative().nullable(), bestProductValid: z.number().int().nonnegative().nullable(),
  stalled: z.number().int().nonnegative(), stop: z.boolean(), reason: z.string(), runs: z.array(CandidateSchema),
});
type Candidate = z.infer<typeof CandidateSchema>;
const rank = { passed: 0, incomplete: 1, failed: 2 };
function lexicographicallyBetter(current: number[], previous: number[]) {
  const index = current.findIndex((value, i) => Math.abs(value - previous[i]!) > 1e-8);
  return index < 0 ? 0 : current[index]! > previous[index]! ? 1 : -1;
}
function regressedRegions(current: Candidate, previous?: Candidate) {
  return previous?.regions.filter(id => !current.regions.includes(id)) ?? [];
}
function regressedChecks(current: Candidate, previous?: Candidate) {
  return previous ? (Object.keys(previous.checks) as (keyof Candidate['checks'])[])
    .filter(name => previous.checks[name] === 'passed' && current.checks[name] !== 'passed') : [];
}
function visualBetter(current: Candidate, previous?: Candidate) {
  if (!previous) return true;
  if (regressedRegions(current, previous).length) return false;
  if (current.codeValid !== previous.codeValid) return current.codeValid;
  if (current.status !== previous.status) return rank[current.status] < rank[previous.status];
  const progress = lexicographicallyBetter(current.progress, previous.progress);
  return progress > 0 || progress === 0 && current.ratio < previous.ratio - 1e-8;
}
function productQuality(candidate: Candidate) {
  return [Number(candidate.codeValid), Number(candidate.productSafe),
    -Object.values(candidate.checks).filter(value => value === 'failed').length,
    Object.values(candidate.checks).filter(value => value === 'passed').length];
}

export async function recordIteration(sessionFile: string, reportDirectory: string) {
  const file = path.resolve(sessionFile), directory = path.resolve(reportDirectory);
  const report = RunSchema.parse(await json(path.join(directory, 'comparison.json')));
  const policySha256 = createHash('sha256').update(JSON.stringify(report.policy)).digest('hex');
  let session: z.infer<typeof SessionSchema>;
  try {
    const stored = await json(file);
    if ((stored as { version?: number }).version === 1)
      throw new Error('Legacy repair session v1 cannot use repair policy v2. Retain its budget/checkpoints and finish with the matching tool release; do not reset the same task budget.');
    session = SessionSchema.parse(stored);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    session = { version: 2, repairPolicyVersion: 2, referenceSha256: report.referenceSha256, specSha256: report.specSha256, policySha256, sourcePaths: report.capture?.sourceCheckpoint?.files.map(entry => entry.path).sort() ?? null, best: 0, bestVisual: null, bestProductValid: null, stalled: 0, stop: false, reason: '', runs: [] };
  }
  if (session.stop) throw new Error(`Repair session already stopped: ${session.reason}`);
  if (session.referenceSha256 !== report.referenceSha256 || session.specSha256 !== report.specSha256 || session.policySha256 !== policySha256) throw new Error('Reference/specification/policy changed; start a new repair session');
  if (session.runs.some(run => run.report === directory)) throw new Error('Report already recorded');
  const sourceCheckpoint = report.capture?.sourceCheckpoint;
  if (JSON.stringify(sourceCheckpoint?.files.map(entry => entry.path).sort() ?? null) !== JSON.stringify(session.sourcePaths))
    throw new Error('Source checkpoint coverage changed; keep listed paths and binding mode fixed within the repair session');
  if (sourceCheckpoint) {
    const { checkpoint } = await readSourceCheckpoint(path.join(directory, 'source-checkpoint/checkpoint.json'));
    if (JSON.stringify(checkpoint) !== JSON.stringify(sourceCheckpoint)) throw new Error('Report source checkpoint differs from its snapshot');
    if (session.runs.some(run => run.sourceCheckpoint?.id === sourceCheckpoint.id)) throw new Error('Checkpoint ID already recorded; use a unique candidate ID');
  }
  const checks = report.capture?.checks ?? unchecked;
  const codeValid = checks.analysis === 'passed' && report.capture?.runtimeErrors.length === 0;
  const productSafe = codeValid && !Object.values(checks).includes('failed');
  // Product-valid here means all nonvisual checks pass; visual status stays independent.
  const valid = codeValid && Object.values(checks).every(value => value === 'passed');
  const required = report.regions.filter(region => region.required);
  const candidate: Candidate = {
    report: directory, ratio: report.metric.tolerantRatio, valid, codeValid, productSafe, checks, status: report.status,
    regions: report.regions.filter(region => region.status === 'passed').map(region => region.id),
    progress: [required.filter(region => region.status === 'passed').length,
      -required.filter(region => region.textMatches === false).length,
      -required.filter(region => (region.geometryError ?? 0) > report.policy.geometryTolerance).length,
      -required.reduce((sum, region) => sum + (region.geometryError ?? 0), 0),
      -required.reduce((sum, region) => sum + (region.metric?.tolerantRatio ?? 0), 0)],
    ...(sourceCheckpoint ? { sourceCheckpoint } : {}),
  };
  const previous = session.runs[session.best];
  const regions = regressedRegions(candidate, previous), checkRegressions = regressedChecks(candidate, previous);
  const quality = previous ? lexicographicallyBetter(productQuality(candidate), productQuality(previous)) : 1;
  const improved = !previous || regions.length === 0 && checkRegressions.length === 0 &&
    (quality > 0 || quality === 0 && visualBetter(candidate, previous));
  const index = session.runs.length;
  if (visualBetter(candidate, session.bestVisual === null ? undefined : session.runs[session.bestVisual])) session.bestVisual = index;
  if (valid && visualBetter(candidate, session.bestProductValid === null ? undefined : session.runs[session.bestProductValid])) session.bestProductValid = index;
  session.runs.push(candidate);
  if (improved) { session.best = index; session.stalled = 0; } else session.stalled++;
  if (candidate.status === 'passed' && improved && productSafe) {
    session.stop = true;
    session.reason = valid ? 'Visual fidelity and recorded product checks passed.' : 'Visual fidelity passed; product acceptance remains incomplete because checks are not-run.';
  } else if (session.runs.length >= 5) { session.stop = true; session.reason = 'Five repair rounds exhausted.'; }
  else if (session.stalled >= 2) { session.stop = true; session.reason = 'Two rounds without improvement.'; }
  await fs.mkdir(path.dirname(file), { recursive: true });
  await writeJson(file, session);
  const best = session.runs[session.best]!;
  return {
    ...session, bestReport: best.report,
    bestVisualReport: session.bestVisual === null ? null : session.runs[session.bestVisual]!.report,
    bestProductValidReport: session.bestProductValid === null ? null : session.runs[session.bestProductValid]!.report,
    bestValidReport: session.bestProductValid === null ? null : session.runs[session.bestProductValid]!.report,
    bestSourceCheckpoint: best.sourceCheckpoint ? path.join(best.report, 'source-checkpoint/checkpoint.json') : null,
    sourceBinding: best.sourceCheckpoint ? 'bound' : 'unavailable',
    regressedRegions: regions, regressedChecks: checkRegressions,
  };
}
