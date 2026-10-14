import { z } from 'zod';

export const RectSchema = z.object({
  x: z.number().finite().nonnegative(), y: z.number().finite().nonnegative(),
  width: z.number().finite().positive(), height: z.number().finite().positive(),
}).strict();
export const InsetsSchema = z.object({ top: z.number().finite().nonnegative(), right: z.number().finite().nonnegative(), bottom: z.number().finite().nonnegative(), left: z.number().finite().nonnegative() }).strict();
export const ProfileSchema = z.object({
  width: z.number().finite().positive().max(8192), height: z.number().finite().positive().max(8192),
  pixelRatio: z.number().positive().max(8), locale: z.string().default('en-US'),
  textScale: z.number().positive().default(1), brightness: z.enum(['light', 'dark']).default('light'),
  safeInsets: InsetsSchema.default({ top: 0, right: 0, bottom: 0, left: 0 }),
}).strict();
export const RegionSchema = z.object({
  id: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/), kind: z.enum(['text', 'control', 'asset', 'layout', 'decoration']),
  bounds: RectSchema, confidence: z.enum(['high', 'medium', 'low']),
  provenance: z.string().min(1), required: z.boolean().default(true),
  text: z.string().optional(), allowTextOverflow: z.boolean().optional(), widget: z.string().optional(), notes: z.string().optional(),
}).strict();
export const AssetMappingSchema = z.object({
  regionId: z.string(), asset: z.string(), source: z.enum(['original', 'crop', 'vector']),
  crop: RectSchema.optional(), warnings: z.array(z.string()).default([]),
}).strict();
export const VisualSpecSchema = z.object({
  version: z.literal(1), regions: z.array(RegionSchema),
  layoutNotes: z.array(z.string()).default([]), uncertainties: z.array(z.string()).default([]),
  assets: z.array(AssetMappingSchema).default([]),
}).strict().superRefine((spec, ctx) => {
  const ids = spec.regions.map(r => r.id);
  if (new Set(ids).size !== ids.length) ctx.addIssue({ code: 'custom', message: 'Region IDs must be unique' });
  for (const region of spec.regions) if (region.kind === 'text' && region.text === undefined)
    ctx.addIssue({ code: 'custom', message: `Text region ${region.id} requires visible text` });
  for (const asset of spec.assets) if (!ids.includes(asset.regionId)) ctx.addIssue({ code: 'custom', message: `Unknown asset region ${asset.regionId}` });
});
export const FileSchema = z.object({ path: z.string(), sha256: z.string().regex(/^[a-f0-9]{64}$/), name: z.string() }).strict();
const Sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
export const SourcePathSchema = z.string().min(1).refine(value =>
  !value.includes('\\') && !value.includes('\0') && !/^[a-zA-Z]:/.test(value) &&
  value.split('/').every(part => part !== '' && part !== '.' && part !== '..'),
  'Use a relative file path with forward slashes and no traversal');
export const SourceCheckpointSchema = z.object({
  version: z.literal(1), id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/),
  sourceSha256: Sha256Schema,
  files: z.array(z.object({ path: SourcePathSchema, sha256: Sha256Schema.nullable() }).strict()).min(1),
}).strict().superRefine((value, ctx) => {
  if (new Set(value.files.map(file => file.path)).size !== value.files.length)
    ctx.addIssue({ code: 'custom', message: 'Checkpoint paths must be unique' });
});
export type SourceCheckpoint = z.infer<typeof SourceCheckpointSchema>;
export const BundleSchema = z.object({
  version: z.literal(1), createdAt: z.string(), reference: FileSchema, original: FileSchema,
  image: z.object({ width: z.number().int().positive(), height: z.number().int().positive(), crop: RectSchema }).strict(),
  profile: ProfileSchema, confirmed: z.literal(true),
  fonts: z.array(FileSchema), assets: z.array(FileSchema), warnings: z.array(z.string()), spec: z.literal('visual-spec.json'),
}).strict();
export const CaptureSchema = z.object({
  version: z.union([z.literal(1), z.literal(2), z.literal(3)]), profile: ProfileSchema,
  mode: z.enum(['widget', 'integration']), platform: z.string().min(1),
  flutterVersion: z.string().min(1), createdAt: z.string(),
  referenceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  imageSha256: z.string().regex(/^[a-f0-9]{64}$/), fontSha256: z.array(z.string().regex(/^[a-f0-9]{64}$/)),
  regions: z.array(z.object({ id: z.string(), bounds: RectSchema.extend({ x: z.number().finite(), y: z.number().finite() }), text: z.string().optional(), textVisibility: z.enum(['overflow-detected', 'no-overflow-detected', 'unverified']).optional(), textObscured: z.boolean().optional() }).strict()),
  readiness: z.object({ strategy: z.enum(['settle', 'prepared']), description: z.string().min(1) }).strict().optional(),
  fontsLoaded: z.boolean(), settled: z.boolean(), runtimeErrors: z.array(z.string()),
  checks: z.object({ analysis: z.enum(['passed', 'failed', 'not-run']), interactions: z.enum(['passed', 'failed', 'not-run']), accessibility: z.enum(['passed', 'failed', 'not-run']), responsive: z.enum(['passed', 'failed', 'not-run']) }).default({ analysis: 'not-run', interactions: 'not-run', accessibility: 'not-run', responsive: 'not-run' }),
  sourceCheckpoint: SourceCheckpointSchema.optional(),
}).strict().superRefine((capture, ctx) => {
  if ((capture.version === 3) !== Boolean(capture.sourceCheckpoint))
    ctx.addIssue({ code: 'custom', message: 'Capture v3 requires a source checkpoint; v1/v2 must omit it' });
});
export const CaptureConfigSchema = z.object({
  projectRoot: z.string(), target: z.string(), mode: z.enum(['widget', 'integration']).default('widget'),
  driver: z.string().optional(), deviceId: z.string().optional(), flutter: z.string().default('flutter'),
  timeoutMs: z.number().int().positive().max(1800000).default(300000),
  sourceCheckpoint: z.object({ id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,63}$/), files: z.array(SourcePathSchema).min(1) }).strict().optional(),
}).strict().superRefine((config, ctx) => {
  if (config.mode === 'integration' && (!config.deviceId || !config.driver))
    ctx.addIssue({ code: 'custom', message: 'Integration capture requires deviceId and driver' });
});
export const PolicySchema = z.object({
  version: z.union([z.literal(2), z.literal(3)]).default(3), regionThreshold: z.number().min(0).max(1).default(0.01), threshold: z.number().min(0).max(1).default(0.1),
  screenMismatch: z.number().min(0).max(1).default(0.01), regionMismatch: z.number().min(0).max(1).default(0.03),
  geometryTolerance: z.number().nonnegative().default(1),
}).strict();
export type Rect = z.infer<typeof RectSchema>;
export type RenderProfile = z.infer<typeof ProfileSchema>;
export type VisualSpec = z.infer<typeof VisualSpecSchema>;
export type ReferenceBundle = z.infer<typeof BundleSchema>;
export type AssetMapping = z.infer<typeof AssetMappingSchema>;
export type CaptureMetadata = z.infer<typeof CaptureSchema>;
export type ComparisonPolicy = z.infer<typeof PolicySchema>;
export type Metric = { pixels: number; exactMismatch: number; exactRatio: number; tolerantMismatch: number; tolerantRatio: number; ssim: number };
export type RegionResult = { id: string; required?: boolean; bounds: Rect; metric: Metric; geometryError?: number; textMatches?: boolean; textVisibility?: 'overflow-detected' | 'no-overflow-detected' | 'unverified'; status: 'passed' | 'failed' | 'incomplete'; issues: string[] };
export type CheckStatus = 'passed' | 'failed' | 'not-run';
export type Acceptance = { status: 'passed' | 'failed' | 'incomplete'; visual: 'passed' | 'failed' | 'incomplete'; analysis: CheckStatus; interactions: CheckStatus; accessibility: CheckStatus; responsive: CheckStatus };
export type ComparisonReport = {
  version: 1 | 2; createdAt: string; status: 'passed' | 'failed' | 'incomplete'; scope: 'design-fidelity'; acceptance?: Acceptance;
  exactPixelEquality: boolean; metric: Metric; policy: ComparisonPolicy; profile: RenderProfile;
  referenceSha256: string; actualSha256: string; specSha256: string;
  capture?: CaptureMetadata; regions: RegionResult[]; failures: string[]; incomplete: string[];
  artifacts: { reference: string; actual: string; strictDiff: string; tolerantDiff: string; overlay: string; html: string };
};
