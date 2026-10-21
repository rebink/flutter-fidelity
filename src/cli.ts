#!/usr/bin/env node
import { Command, InvalidArgumentError } from 'commander';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { json } from './io.js';
import { importReference, inspectReference, suggestViewport, cropAsset } from './reference.js';
import { captureUI } from './capture.js';
import { compareUI } from './compare.js';
import { getReport, writeReport } from './report.js';
import { doctor } from './doctor.js';
import { serve } from './mcp.js';
import { recordIteration } from './repair.js';
import type { ComparisonReport } from './schema.js';
import { InsetsSchema } from './schema.js';
import { validateAssets } from './assets.js';
import { VERSION } from './version.js';
import { verifySourceCheckpoint } from './checkpoint.js';
import { acquireFigma } from './figma.js';
import { acquireFigmaBrowser } from './figma-browser.js';
import { markWidgets, registerWidget, findWidgets } from './widget-catalog.js';
import { planWidgetWork } from './widget-plan.js';
import { setup } from './setup.js';
function number(value: string) { const n = Number(value); if (!Number.isFinite(n) || n <= 0) throw new InvalidArgumentError('Expected a positive number'); return n; }
function rectangle(value: string) { const parts = value.split(',').map(Number); if (parts.length !== 4 || parts.some(n => !Number.isFinite(n))) throw new InvalidArgumentError('Use x,y,width,height'); return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] }; }
function insets(value: string) { if (value.split(',').some(part => !part.trim())) throw new InvalidArgumentError('Insets cannot be empty'); const [top, right, bottom, left, ...extra] = value.split(',').map(Number); if (extra.length) throw new InvalidArgumentError('Use top,right,bottom,left'); try { return InsetsSchema.parse({ top, right, bottom, left }); } catch { throw new InvalidArgumentError('Use four finite nonnegative insets: top,right,bottom,left'); } }
function print(value: unknown) { process.stdout.write(JSON.stringify(value, null, 2) + '\n'); }
const program = new Command().name('flutter-fidelity').version(VERSION).description('Screenshot-first Flutter generation companion and visual verification');
program.command('setup').description('Guided local Figma plugin and optional MCP setup; never publishes or starts a bridge').option('--manifest <file>', 'Use an existing Figma-generated manifest instead of the file picker').option('--client <client>', 'MCP client: claude, codex, pi, or skip; changes still require confirmation').option('--no-open', 'Do not launch Figma, a file picker, or a file manager').action(async o => { await setup(o); });
program.command('setup-figma-plugin').description('Prepare a local Figma bridge plugin from the manifest Figma created; never installs or publishes').requiredOption('--manifest <file>', 'manifest.json saved by Figma when creating a development plugin').requiredOption('--out <new-directory>', 'New local plugin folder (existing files are never overwritten)').action(o => {
  execFileSync(process.execPath, [fileURLToPath(new URL('../scripts/prepare-figma-plugin.mjs', import.meta.url)), '--manifest', o.manifest, '--out', o.out], { stdio: 'inherit' });
});
for (const [name, fn] of [['mark-widgets', markWidgets], ['register-widget', registerWidget], ['find-widgets', findWidgets], ['plan-widget-work', planWidgetWork]] as const) {
  program.command(name).requiredOption('--config <json>', 'JSON object matching the corresponding MCP tool schema').action(async o => print(await fn(await json(o.config))));
}
program.command('acquire-figma').requiredOption('--url <frame-link>').requiredOption('--out <new-directory>').option('--scale <number>', 'PNG export scale, 0.01 to 4', number, 1).option('--reuse <prior-intake>', 'Verify live revision and reuse an unchanged PNG').action(async o => print(await acquireFigma(o)));
program.command('acquire-figma-browser').requiredOption('--config <json>', 'Background browser intake arguments; omit recipe for UI inspection').action(async o => {
  const result = await acquireFigmaBrowser(await json(o.config) as Parameters<typeof acquireFigmaBrowser>[0]);
  print(result);
  process.exitCode = result.status === 'failed' ? 1 : 2; // Browser UI evidence never establishes a complete design tree.
});
program.command('validate-assets').requiredOption('--files <paths...>', 'Downloaded local asset/font files').action(async o => { const result = await validateAssets(o.files); print(result); if (result.status !== 'validated') process.exitCode = 2; });
program.command('doctor').option('--flutter <executable>', 'Flutter executable', 'flutter').action(async o => { const result = await doctor(o.flutter); print(result); if (!result.readyForFlutter) process.exitCode = 2; });
program.command('suggest-viewport').requiredOption('--image <png>').action(async o => print(await suggestViewport(o.image)));
program.command('import-image').requiredOption('--image <png>').requiredOption('--out <directory>').requiredOption('--width <logical>', '', number).requiredOption('--height <logical>', '', number).option('--confirmed', 'Developer confirmed viewport and content crop').option('--crop <x,y,width,height>', 'App-content rectangle in PNG pixels', rectangle).option('--safe-insets <top,right,bottom,left>', 'Logical safe-area insets', insets).option('--fonts <files...>').option('--assets <files...>').option('--spec <json>').option('--locale <locale>', '', 'en-US').option('--text-scale <number>', '', number, 1).option('--brightness <light|dark>', '', 'light').action(async o => print(await importReference({ ...o, spec: o.spec ? await json(o.spec) : undefined })));
program.command('inspect').requiredOption('--bundle <directory>').option('--spec <json>', 'Persist a reviewed visual specification').action(async o => print(await inspectReference(o.bundle, o.spec ? await json(o.spec) : undefined)));
program.command('crop-asset').requiredOption('--bundle <directory>').requiredOption('--region <id>').requiredOption('--crop <x,y,width,height>', '', rectangle).action(async o => print(await cropAsset(o.bundle, o.region, o.crop)));
program.command('capture').requiredOption('--bundle <directory>').requiredOption('--config <json>').requiredOption('--out <new-directory>').action(async o => print(await captureUI({ ...o, config: await json(o.config) })));
program.command('compare').requiredOption('--bundle <directory>').requiredOption('--actual <png>').requiredOption('--out <new-directory>').option('--capture <json>').option('--policy <json>').action(async o => { const result = await compareUI({ ...o, policy: o.policy ? await json(o.policy) : undefined }); print(result); process.exitCode = result.report.status === 'passed' ? 0 : result.report.status === 'failed' ? 1 : 2; });
program.command('report').requiredOption('--directory <run-directory>').action(async o => { const report = await getReport(o.directory) as ComparisonReport; print({ html: await writeReport(o.directory, report), report }); });
program.command('record-iteration').requiredOption('--session <json>').requiredOption('--report <run-directory>').action(async o => print(await recordIteration(o.session, o.report)));
program.command('verify-source-checkpoint').requiredOption('--checkpoint <json>').requiredOption('--project-root <directory>').action(async o => { const result = await verifySourceCheckpoint(o.checkpoint, o.projectRoot); print(result); if (result.status !== 'passed') process.exitCode = 1; });
program.command('mcp').description('Start MCP stdio server; stdout is reserved for protocol messages').action(serve);
program.parseAsync().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
