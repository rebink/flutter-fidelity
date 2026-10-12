import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import { PolicySchema, CaptureSchema } from './schema.js';
import { json, writeJson } from './io.js';
const RunSchema = z.object({ version: z.literal(1), referenceSha256: z.string(), specSha256: z.string(), policy: PolicySchema, capture: CaptureSchema.optional(), status: z.enum(['passed', 'failed', 'incomplete']), metric: z.object({ tolerantRatio: z.number().nonnegative() }), regions: z.array(z.object({ id: z.string(), status: z.enum(['passed', 'failed', 'incomplete']) })) });
const SessionSchema = z.object({ version: z.literal(1), referenceSha256: z.string(), specSha256: z.string(), policySha256: z.string(), best: z.number().int(), stalled: z.number().int().nonnegative(), stop: z.boolean(), reason: z.string(), runs: z.array(z.object({ report: z.string(), ratio: z.number(), valid: z.boolean(), status: z.enum(['passed', 'failed', 'incomplete']), regions: z.array(z.string()) })) });
const rank = { passed: 0, incomplete: 1, failed: 2 };
export async function recordIteration(sessionFile: string, reportDirectory: string) {
  const file = path.resolve(sessionFile), directory = path.resolve(reportDirectory);
  const report = RunSchema.parse(await json(path.join(directory, 'comparison.json')));
  const policySha256 = createHash('sha256').update(JSON.stringify(report.policy)).digest('hex');
  let session: z.infer<typeof SessionSchema>;
  try { session = SessionSchema.parse(await json(file)); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; session = { version: 1, referenceSha256: report.referenceSha256, specSha256: report.specSha256, policySha256, best: 0, stalled: 0, stop: false, reason: '', runs: [] }; }
  if (session.stop) throw new Error(`Repair session already stopped: ${session.reason}`);
  if (session.referenceSha256 !== report.referenceSha256 || session.specSha256 !== report.specSha256 || session.policySha256 !== policySha256) throw new Error('Reference/specification/policy changed; start a new repair session');
  if (session.runs.some(r => r.report === directory)) throw new Error('Report already recorded');
  const previous = session.runs[session.best];
  const passedRegions = report.regions.filter(r => r.status === 'passed').map(r => r.id);
  const regressed = previous?.regions.filter(id => !passedRegions.includes(id)) ?? [];
  const valid = report.capture?.checks.analysis === 'passed' && report.capture.runtimeErrors.length === 0;
  const improved = !previous || (!previous.valid && valid) || (previous.valid === valid && regressed.length === 0 && (rank[report.status] < rank[previous.status] || report.status === previous.status && report.metric.tolerantRatio < previous.ratio - 1e-8));
  session.runs.push({ report: directory, ratio: report.metric.tolerantRatio, valid, status: report.status, regions: passedRegions });
  if (improved) { session.best = session.runs.length - 1; session.stalled = 0; } else session.stalled++;
  if (report.status === 'passed') { session.stop = true; session.reason = 'Design fidelity passed; verify interaction, accessibility and responsive acceptance separately.'; }
  else if (session.runs.length >= 5) { session.stop = true; session.reason = 'Five repair rounds exhausted.'; }
  else if (session.stalled >= 2) { session.stop = true; session.reason = 'Two rounds without improvement.'; }
  await fs.mkdir(path.dirname(file), { recursive: true });
  await writeJson(file, session);
  return { ...session, bestReport: session.runs[session.best]!.report, bestValidReport: session.runs[session.best]!.valid ? session.runs[session.best]!.report : null, regressedRegions: regressed };
}
