import { z } from 'zod';

export const RectSchema = z.object({
  x: z.number().finite().nonnegative(), y: z.number().finite().nonnegative(),
  width: z.number().finite().positive(), height: z.number().finite().positive(),
}).strict();
export const ProfileSchema = z.object({
  width: z.number().finite().positive().max(8192), height: z.number().finite().positive().max(8192),
  pixelRatio: z.number().positive().max(8), locale: z.string().default('en-US'),
  textScale: z.number().positive().default(1), brightness: z.enum(['light', 'dark']).default('light'),
  safeInsets: z.object({ top: z.number().nonnegative(), right: z.number().nonnegative(), bottom: z.number().nonnegative(), left: z.number().nonnegative() }).default({ top: 0, right: 0, bottom: 0, left: 0 }),
}).strict();
export const RegionSchema = z.object({
  id: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_-]*$/), kind: z.enum(['text', 'control', 'asset', 'layout', 'decoration']),
  bounds: RectSchema, confidence: z.enum(['high', 'medium', 'low']),
  provenance: z.string().min(1), required: z.boolean().default(true),
  text: z.string().optional(), widget: z.string().optional(), notes: z.string().optional(),
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
export const BundleSchema = z.object({
  version: z.literal(1), createdAt: z.string(), reference: FileSchema, original: FileSchema,
  image: z.object({ width: z.number().int().positive(), height: z.number().int().positive(), crop: RectSchema }).strict(),
  profile: ProfileSchema, confirmed: z.literal(true),
  fonts: z.array(FileSchema), assets: z.array(FileSchema), warnings: z.array(z.string()), spec: z.literal('visual-spec.json'),
}).strict();
export const CaptureSchema = z.object({
  version: z.literal(1), profile: ProfileSchema,
  mode: z.enum(['widget', 'integration']), platform: z.string().min(1),
  flutterVersion: z.string().min(1), createdAt: z.string(),
  referenceSha256: z.string().regex(/^[a-f0-9]{64}$/),
  imageSha256: z.string().regex(/^[a-f0-9]{64}$/), fontSha256: z.array(z.string().regex(/^[a-f0-9]{64}$/)),
  regions: z.array(z.object({ id: z.string(), bounds: RectSchema.extend({ x: z.number().finite(), y: z.number().finite() }), text: z.string().optional() }).strict()),
  fontsLoaded: z.boolean(), settled: z.boolean(), runtimeErrors: z.array(z.string()),
  checks: z.object({ analysis: z.enum(['passed', 'failed', 'not-run']), interactions: z.enum(['passed', 'failed', 'not-run']), accessibility: z.enum(['passed', 'failed', 'not-run']), responsive: z.enum(['passed', 'failed', 'not-run']) }).default({ analysis: 'not-run', interactions: 'not-run', accessibility: 'not-run', responsive: 'not-run' }),
}).strict();
export const CaptureConfigSchema = z.object({
  projectRoot: z.string(), target: z.string(), mode: z.enum(['widget', 'integration']).default('widget'),
  driver: z.string().optional(), deviceId: z.string().optional(), flutter: z.string().default('flutter'),
  timeoutMs: z.number().int().positive().max(1800000).default(300000),
}).strict().superRefine((config, ctx) => {
  if (config.mode === 'integration' && (!config.deviceId || !config.driver))
    ctx.addIssue({ code: 'custom', message: 'Integration capture requires deviceId and driver' });
});
export const PolicySchema = z.object({
  version: z.literal(2).default(2), regionThreshold: z.number().min(0).max(1).default(0.01), threshold: z.number().min(0).max(1).default(0.1),
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
export type RegionResult = { id: string; bounds: Rect; metric: Metric; geometryError?: number; textMatches?: boolean; status: 'passed' | 'failed' | 'incomplete'; issues: string[] };
export type ComparisonReport = {
  version: 1; createdAt: string; status: 'passed' | 'failed' | 'incomplete'; scope: 'design-fidelity';
  exactPixelEquality: boolean; metric: Metric; policy: ComparisonPolicy; profile: RenderProfile;
  referenceSha256: string; actualSha256: string; specSha256: string;
  capture?: CaptureMetadata; regions: RegionResult[]; failures: string[]; incomplete: string[];
  artifacts: { reference: string; actual: string; strictDiff: string; tolerantDiff: string; overlay: string; html: string };
};
