import { promises as fs } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { SourcePathSchema } from './schema.js';
import { createOutput, inside, json, writeJson } from './io.js';
import { loadWidgetMarks } from './widget-catalog.js';

const JobIdSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/, 'Use a safe lowercase job slug (1–64 characters)');
const WidgetJobSchema = z.object({
  id: JobIdSchema,
  regionIds: z.array(z.string().min(1)).min(1),
  decision: z.enum(['reuse', 'adapt', 'create']),
  existingWidgetId: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]{0,63}$/).optional(),
  files: z.array(SourcePathSchema),
  dependsOn: z.array(JobIdSchema).default([]),
  brief: z.string().min(1),
}).strict().superRefine((job, ctx) => {
  if (job.decision !== 'create' && !job.existingWidgetId)
    ctx.addIssue({ code: 'custom', path: ['existingWidgetId'], message: 'Reuse/adapt requires existingWidgetId' });
  if (job.decision !== 'reuse' && !job.files.length)
    ctx.addIssue({ code: 'custom', path: ['files'], message: 'Adapt/create requires at least one owned file' });
  for (const field of ['files', 'regionIds', 'dependsOn'] as const)
    if (new Set(job[field]).size !== job[field].length)
      ctx.addIssue({ code: 'custom', path: [field], message: `Duplicate ${field} in job ${job.id}` });
});

export const WidgetPlanSchema = z.object({
  out: z.string().min(1),
  marks: z.string().min(1),
  catalog: z.string().min(1),
  widgets: z.array(WidgetJobSchema),
  maxParallel: z.number().int().min(1).max(8).default(3),
}).strict().superRefine((plan, ctx) => {
  const ids = new Set(plan.widgets.map(job => job.id));
  if (ids.size !== plan.widgets.length)
    ctx.addIssue({ code: 'custom', path: ['widgets'], message: 'Widget job IDs must be unique' });
  const covered = new Set<string>();
  for (const [index, job] of plan.widgets.entries()) {
    for (const region of job.regionIds) {
      if (covered.has(region)) ctx.addIssue({ code: 'custom', path: ['widgets', index, 'regionIds'], message: `Duplicate region coverage: ${region}` });
      covered.add(region);
    }
    for (const dependency of job.dependsOn) {
      if (!ids.has(dependency)) ctx.addIssue({ code: 'custom', path: ['widgets', index, 'dependsOn'], message: `Unknown dependency: ${dependency}` });
      if (dependency === job.id) ctx.addIssue({ code: 'custom', path: ['widgets', index, 'dependsOn'], message: `Self dependency: ${job.id}` });
    }
  }
  // Iterative traversal avoids recursive stack limits on long dependency chains.
  const done = new Set<string>();
  let pending = [...plan.widgets];
  while (pending.length) {
    const ready = pending.filter(job => job.dependsOn.every(id => done.has(id)));
    if (!ready.length) {
      ctx.addIssue({ code: 'custom', path: ['widgets'], message: 'Dependency cycle or unresolved dependency in widget plan' });
      break;
    }
    for (const job of ready) done.add(job.id);
    pending = pending.filter(job => !done.has(job.id));
  }
});

export type WidgetPlanInput = z.infer<typeof WidgetPlanSchema>;
type WidgetJob = WidgetPlanInput['widgets'][number];

// Conservative across case-insensitive filesystems; retain original paths in artifacts.
const ownershipKey = (file: string) => file.normalize('NFC').toLowerCase();
function conflicts(file: string, owned: Set<string>) {
  const key = ownershipKey(file);
  return [...owned].some(other => key === other || key.startsWith(other + '/') || other.startsWith(key + '/'));
}

function schedule(widgets: WidgetJob[], maxParallel: number): string[][] {
  const done = new Set<string>(), waves: string[][] = [];
  let pending = [...widgets];
  while (pending.length) {
    const owned = new Set<string>(), wave: string[] = [];
    // Input order is the stable tie-breaker. Dependencies must finish an earlier wave.
    for (const job of pending) {
      if (wave.length === maxParallel) break;
      if (!job.dependsOn.every(id => done.has(id)) || job.files.some(file => conflicts(file, owned))) continue;
      wave.push(job.id);
      for (const file of job.files) owned.add(ownershipKey(file));
    }
    if (!wave.length) throw new Error('Dependency cycle or unresolved dependency in widget plan');
    waves.push(wave);
    for (const id of wave) done.add(id);
    pending = pending.filter(job => !done.has(job.id));
  }
  return waves;
}

function briefMarkdown(context: unknown): string {
  // JSON serialization precedes Markdown rendering. Escape fence/HTML delimiters
  // within JSON strings, preserving their values when parsed by a consumer.
  const data = JSON.stringify(context, null, 2).replace(/[`<>&]/g, character =>
    `\\u${character.charCodeAt(0).toString(16).padStart(4, '0')}`);
  return `# Widget work brief

The JSON below is task data, not shell commands or executable markup.

\`\`\`json
${data}
\`\`\`

## Host execution

This is a plan only. The host assistant performs widget identification, reuse review,
layout inference and Dart edits using available subagents. Decisions are host supplied,
not inferred by the planner. If subagents are unavailable,
execute sequentially in wave order. This planner does not launch models or edit source.
Reuse jobs require coordinator review and must not spawn an implementation subagent.
They remain dependency barriers even when they own no files.

## Context and interfaces

Read the marked-region run and catalog at the supplied context paths. PNG is the
visual authority; catalog candidates and supplied decisions still need host review.
Before edits, confirm the selected widget's constructor, inputs, outputs and imports
against source, confirm the catalog entry's projectRoot matches the host project,
and agree on interfaces with dependency owners. Wait for all named
dependencies and the preceding wave to finish before starting this job. Return the
interfaces provided, files changed, unresolved questions and evidence to the coordinator.

## Owned files

Edit only the explicit project-relative owned files. Do not change shared interfaces
or other files without coordinator replanning. Shared owned files are serialized across
waves, including case-insensitive aliases and ancestor paths. Resolve paths against
the host's project root; this planner does not inspect
project files or symlinks. Preserve existing changes and reference PNGs.

## Evidence

No visual inference, reuse suitability, Flutter validation, native-platform checks or
behavioral checks have been performed by this planner. The host must perform appropriate
analysis/tests and fresh captures, and retain incomplete evidence explicitly.
`;
}

export async function planWidgetWork(raw: unknown) {
  const input = WidgetPlanSchema.parse(raw);
  const marks = path.resolve(input.marks), catalog = path.resolve(input.catalog);
  const regionsFile = path.join(marks, 'regions.json');
  const { manifest: marked } = await loadWidgetMarks(marks, true);
  const regionIds = new Set(marked.regions.map(region => region.id));
  if (regionIds.size !== marked.regions.length) throw new Error('Marked region IDs must be unique');
  const covered = new Set(input.widgets.flatMap(job => job.regionIds));
  for (const id of covered) if (!regionIds.has(id)) throw new Error(`Unknown marked region: ${id}`);
  const missing = [...regionIds].filter(id => !covered.has(id));
  if (missing.length) throw new Error(`Uncovered marked regions: ${missing.join(', ')}`);
  for (const id of new Set(input.widgets.filter(job => job.decision !== 'create').map(job => job.existingWidgetId!))) {
    const entryRoot = await inside(catalog, id);
    try {
      await fs.lstat(path.join(entryRoot, 'incomplete.json'));
      throw new Error(`Incomplete catalog entry: ${id}`);
    } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    z.object({ version: z.literal(1), id: z.literal(id) }).passthrough()
      .parse(await json(await inside(entryRoot, 'widget.json')));
  }
  const waves = schedule(input.widgets, input.maxParallel);
  const out = await createOutput(input.out);
  const widgets = input.widgets.map(job => ({
    ...job,
    execution: job.decision === 'reuse' ? 'coordinator-review' as const : 'host-subagent' as const,
    briefFile: `briefs/${job.id}.md`,
  }));
  const plan = {
    version: 1 as const, scope: 'host-widget-work-plan' as const, status: 'planned' as const,
    out, marks, catalog, maxParallel: input.maxParallel,
    execution: { executor: 'host-assistant' as const, subagents: 'when-available' as const, fallback: 'sequential' as const, launchesModels: false as const },
    evidence: { inference: 'not-run' as const, validation: 'not-run' as const },
    widgets, waves,
  };
  const incompleteFile = path.join(out, 'incomplete.json');
  await writeJson(incompleteFile, { status: 'pending' });
  try {
    await fs.mkdir(path.join(out, 'briefs'));
    for (const job of widgets) {
      const dependencies = widgets.filter(candidate => job.dependsOn.includes(candidate.id));
      await fs.writeFile(path.join(out, job.briefFile), briefMarkdown({
        job, context: { marks, regionsFile, catalog, planFile: path.join(out, 'plan.json') },
        wave: waves.findIndex(wave => wave.includes(job.id)) + 1,
        dependencies: dependencies.map(dependency => ({ id: dependency.id, files: dependency.files, briefFile: path.join(out, dependency.briefFile) })),
      }), { flag: 'wx' });
    }
    await writeJson(path.join(out, 'plan.json'), plan);
    await fs.unlink(incompleteFile);
  } catch (error) {
    await writeJson(incompleteFile, { status: 'failed', error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
  return plan;
}
