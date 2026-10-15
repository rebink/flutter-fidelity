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
import { InsetsSchema, RectSchema, PolicySchema, CaptureConfigSchema, VisualSpecSchema } from './schema.js';
import { doctor } from './doctor.js';
import { validateAssets } from './assets.js';
import { VERSION } from './version.js';
import { verifySourceCheckpoint } from './checkpoint.js';
import { acquireFigma, FigmaIntakeSchema } from './figma.js';
import { FigmaBridge, PluginIntakeSchema } from './figma-bridge.js';
import { markWidgets, registerWidget, findWidgets, MarkWidgetsSchema, RegisterWidgetSchema, FindWidgetsSchema } from './widget-catalog.js';
import { planWidgetWork, WidgetPlanSchema } from './widget-plan.js';
export function createServer() {
  const server = new McpServer({ name: 'flutter-fidelity', version: VERSION });
  let bridge: FigmaBridge | undefined;
  server.server.onclose = () => { void bridge?.close(); bridge = undefined; };
  const wrap = (fn: (args: any) => Promise<unknown>) => async (args: any) => {
    try { const result = await fn(args); return { content: [{ type: 'text' as const, text: JSON.stringify(result, null, 2) }] }; }
    catch (error) { return { isError: true, content: [{ type: 'text' as const, text: error instanceof Error ? error.message : String(error) }] }; }
  };
  server.registerTool('mark_widgets', { description: 'Save host-identified widget regions as native-size PNG crops and a separate labelled overview in a NEW directory. Bounds are original PNG pixels. This tool does not infer widgets; crops are recognition references, not application assets.', inputSchema: MarkWidgetsSchema.shape }, wrap(markWidgets));
  server.registerTool('register_widget', { description: 'Add an immutable project widget catalog entry with its marked reference snapshot, Dart symbol/API notes, variants and hashed source/test files. Choose a new ID for revisions. Registration does not claim tests or visual fidelity passed.', inputSchema: RegisterWidgetSchema.shape }, wrap(registerWidget));
  server.registerTool('find_widgets', { description: 'Search/list the project widget catalog before generating Dart. Rank optional PNG crop by exact pixels/equal-size pixel similarity and query/tags by lexical overlap. Returns source freshness and preview paths. Host reviews behavior/API compatibility; candidates are not automatic reuse approval.', inputSchema: FindWidgetsSchema.shape, annotations: { readOnlyHint: true } }, wrap(findWidgets));
  server.registerTool('plan_widget_work', { description: 'Group marked widget instances into reuse/adapt/create jobs and save dependency-ordered waves and per-job briefs in a NEW directory. Prevent overlapping file ownership within a wave. The host dispatches available subagents or runs sequentially; this tool does not launch models.', inputSchema: WidgetPlanSchema.innerType().shape }, wrap(planWidgetWork));
  server.registerTool('figma_bridge', { description: 'Start, inspect or stop a loopback connection to the bundled Figma development plugin. Start returns a pairing code and source/setup guide paths. Pair once in the intended Figma file; the plugin must stay open. No Figma access token or browser automation. Stop disconnects the plugin and cancels pending exports.', inputSchema: { action: z.enum(['start', 'status', 'stop']) } }, wrap(async a => {
    if (a.action === 'stop') { await bridge?.close(); bridge = undefined; return { running: false }; }
    if (a.action === 'status') return bridge?.status() ?? { running: false, connected: false, session: null };
    if (bridge) return bridge.connection();
    const candidate = new FigmaBridge();
    try { const connection = await candidate.start(); bridge = candidate; return connection; }
    catch (error) { await candidate.close(); throw error; }
  }));
  server.registerTool('acquire_figma_plugin', { description: 'Export PNG and structured styling from a paired Figma plugin into a NEW intake directory. Get sessionId/document identity from figma_bridge status first. Optional nodeId otherwise uses the single selected node; optional css requests root-node getCSSAsync properties. Figma/plugin must remain open. No cached/old captures or original artwork/fonts.', inputSchema: PluginIntakeSchema.shape }, wrap(async a => {
    if (!bridge) throw new Error('Start and pair figma_bridge before requesting plugin intake.');
    return bridge.acquire(a);
  }));
  server.registerTool('acquire_figma', { description: 'Acquire a linked Figma frame PNG and scoped styling JSON in the background using FIGMA_ACCESS_TOKEN from the server environment. Creates a NEW intake directory; optional reuse verifies the live revision and PNG hash. No browser, clipboard or CSS copying required. Does not fetch original assets/fonts.', inputSchema: FigmaIntakeSchema.shape, annotations: { destructiveHint: false, openWorldHint: true } }, wrap(acquireFigma));
  server.registerTool('validate_assets', { description: 'Validate local downloaded images/fonts in a batch; return hashes, format metadata, failures and duplicate groups without changing files.', inputSchema: { files: z.array(z.string()).min(1) }, annotations: { readOnlyHint: true } }, wrap(a => validateAssets(a.files)));
  server.registerTool('doctor', { description: 'Check image, Flutter capture and official Dart MCP capabilities independently.', inputSchema: { flutter: z.string().optional() }, annotations: { readOnlyHint: true } }, wrap(a => doctor(a.flutter)));
  server.registerTool('suggest_viewport', { description: 'Propose logical viewport candidates from PNG dimensions. Does not confirm them; ask developer before import.', inputSchema: { image: z.string() }, annotations: { readOnlyHint: true } }, wrap(a => suggestViewport(a.image)));
  server.registerTool('import_reference', {
    description: 'Import immutable PNG reference, confirmed logical viewport, fonts and source assets into a NEW local bundle. No design metadata required.',
    inputSchema: { image: z.string(), out: z.string(), width: z.number().positive(), height: z.number().positive(), confirmed: z.boolean(), crop: RectSchema.optional(), fonts: z.array(z.string()).optional(), assets: z.array(z.string()).optional(), spec: VisualSpecSchema.optional(), locale: z.string().optional(), textScale: z.number().positive().optional(), brightness: z.enum(['light','dark']).optional(), safeInsets: InsetsSchema.optional() },
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
  server.registerTool('record_iteration', { description: 'Track repair policy v2: protect passed visual/product checks, retain separate visual and product-valid best reports and source checkpoint identities. Stops after five rounds or two stalls. Does not restore source.', inputSchema: { session: z.string(), report: z.string() } }, wrap(a => recordIteration(a.session, a.report)));
  server.registerTool('verify_source_checkpoint', { description: 'Verify stored source snapshot integrity and that explicitly owned project files match it, including expected deletions. Read only; run after scoped restoration before fresh recapture.', inputSchema: { checkpoint: z.string(), projectRoot: z.string() }, annotations: { readOnlyHint: true } }, wrap(a => verifySourceCheckpoint(a.checkpoint, a.projectRoot)));
  return server;
}
export async function serve() { await createServer().connect(new StdioServerTransport()); }
