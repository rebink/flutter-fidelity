import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import sharp from 'sharp';
import path from 'node:path';
import { captureUI } from './capture.js';
import { compareUI } from './compare.js';
import { cropAsset, importReference, inspectReference, suggestViewport } from './reference.js';
import { getReport } from './report.js';
import { recordIteration } from './repair.js';
import { RectSchema, PolicySchema, CaptureConfigSchema, VisualSpecSchema } from './schema.js';
import { doctor } from './doctor.js';
export function createServer() {
  const server = new McpServer({ name: 'flutter-fidelity', version: '0.1.0' });
  const wrap = (fn: (args: any) => Promise<unknown>) => async (args: any) => {
    try { const result = await fn(args); return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }; }
    catch (error) { return { isError: true, content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }] }; }
  };
  server.registerTool('doctor', { description: 'Check image, Flutter capture and official Dart MCP capabilities independently.', inputSchema: { flutter: z.string().optional() }, annotations: { readOnlyHint: true } }, wrap(a => doctor(a.flutter)));
  server.registerTool('suggest_viewport', { description: 'Propose logical viewport candidates from PNG dimensions. Does not confirm them; ask developer before import.', inputSchema: { image: z.string() }, annotations: { readOnlyHint: true } }, wrap(a => suggestViewport(a.image)));
  server.registerTool('import_reference', {
    description: 'Import immutable PNG reference, confirmed logical viewport, fonts and source assets into a NEW local bundle. No design metadata required.',
    inputSchema: { image: z.string(), out: z.string(), width: z.number().positive(), height: z.number().positive(), confirmed: z.boolean(), crop: RectSchema.optional(), fonts: z.array(z.string()).optional(), assets: z.array(z.string()).optional(), spec: VisualSpecSchema.optional(), locale: z.string().optional(), textScale: z.number().positive().optional(), brightness: z.enum(['light','dark']).optional() },
  }, wrap(importReference));
  server.registerTool('inspect_reference', {
    description: 'Read bundle and PNG for vision-based inference. Optionally persist a reviewed visual specification; no automatic OCR or layout inference occurs in this server.',
    inputSchema: { bundle: z.string(), visualSpec: VisualSpecSchema.optional() },
  }, async args => {
    try {
      const result = await inspectReference(args.bundle, args.visualSpec);
      const preview = await sharp(path.join(result.root, result.bundle.reference.path)).resize({ width: 1600, height: 1600, fit: 'inside', withoutEnlargement: true }).png().toBuffer();
      return { content: [{ type: 'text' as const, text: JSON.stringify({ ...result, previewNote: 'Preview may be downscaled for model context. Use original reference.png for measurements.' }, null, 2) }, { type: 'image' as const, data: preview.toString('base64'), mimeType: 'image/png' }] };
    } catch (error) { return { isError: true, content: [{ type: 'text' as const, text: String(error) }] }; }
  });
  server.registerTool('crop_asset', { description: 'Crop an isolated designated decorative region. Rejects text, controls and general layout regions. Records provenance and baked-background warning.', inputSchema: { bundle: z.string(), regionId: z.string(), crop: RectSchema } }, wrap(a => cropAsset(a.bundle, a.regionId, a.crop)));
  server.registerTool('capture_ui', { description: 'Run configured Flutter harness in widget-test or native integration mode; records analysis and render environment. No Flutter code generation.', inputSchema: { bundle: z.string(), config: CaptureConfigSchema, out: z.string() } }, wrap(captureUI));
  server.registerTool('compare_ui', { description: 'Compare equal-sized reference/capture images using strict RGBA, tolerant pixels, regions, text and geometry. Creates a NEW report directory. Missing evidence is incomplete, never passed.', inputSchema: { bundle: z.string(), actual: z.string(), out: z.string(), capture: z.string().optional(), policy: PolicySchema.optional() } }, wrap(compareUI));
  server.registerTool('get_report', { description: 'Read a comparison report with thresholds, evidence and unresolved differences.', inputSchema: { directory: z.string() }, annotations: { readOnlyHint: true } }, wrap(a => getReport(a.directory)));
  server.registerTool('record_iteration', { description: 'Track repair budget, preserve best report and detect regressed regions. Stops after five rounds or two stalls. Assistant manages its own code checkpoints.', inputSchema: { session: z.string(), report: z.string() } }, wrap(a => recordIteration(a.session, a.report)));
  return server;
}
export async function serve() { await createServer().connect(new StdioServerTransport()); }
