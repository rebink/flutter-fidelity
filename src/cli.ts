#!/usr/bin/env node
import { Command, InvalidArgumentError } from 'commander';
import { json } from './io.js';
import { importReference, inspectReference, suggestViewport, cropAsset } from './reference.js';
import { captureUI } from './capture.js';
import { compareUI } from './compare.js';
import { getReport, writeReport } from './report.js';
import { doctor } from './doctor.js';
import { serve } from './mcp.js';
import { recordIteration } from './repair.js';
import type { ComparisonReport } from './schema.js';
function number(value: string) { const n = Number(value); if (!Number.isFinite(n) || n <= 0) throw new InvalidArgumentError('Expected a positive number'); return n; }
function rectangle(value: string) { const parts = value.split(',').map(Number); if (parts.length !== 4 || parts.some(n => !Number.isFinite(n))) throw new InvalidArgumentError('Use x,y,width,height'); return { x: parts[0], y: parts[1], width: parts[2], height: parts[3] }; }
function print(value: unknown) { process.stdout.write(JSON.stringify(value, null, 2) + '\n'); }
const program = new Command().name('flutter-fidelity').version('0.1.0').description('Screenshot-first Flutter generation companion and visual verification');
program.command('doctor').option('--flutter <executable>', 'Flutter executable', 'flutter').action(async o => { const result = await doctor(o.flutter); print(result); if (!result.readyForFlutter) process.exitCode = 2; });
program.command('suggest-viewport').requiredOption('--image <png>').action(async o => print(await suggestViewport(o.image)));
program.command('import-image').requiredOption('--image <png>').requiredOption('--out <directory>').requiredOption('--width <logical>', '', number).requiredOption('--height <logical>', '', number).option('--confirmed', 'Developer confirmed viewport and content crop').option('--crop <x,y,width,height>', 'App-content rectangle in PNG pixels', rectangle).option('--fonts <files...>').option('--assets <files...>').option('--spec <json>').option('--locale <locale>', '', 'en-US').option('--text-scale <number>', '', number, 1).option('--brightness <light|dark>', '', 'light').action(async o => print(await importReference({ ...o, spec: o.spec ? await json(o.spec) : undefined })));
program.command('inspect').requiredOption('--bundle <directory>').option('--spec <json>', 'Persist a reviewed visual specification').action(async o => print(await inspectReference(o.bundle, o.spec ? await json(o.spec) : undefined)));
program.command('crop-asset').requiredOption('--bundle <directory>').requiredOption('--region <id>').requiredOption('--crop <x,y,width,height>', '', rectangle).action(async o => print(await cropAsset(o.bundle, o.region, o.crop)));
program.command('capture').requiredOption('--bundle <directory>').requiredOption('--config <json>').requiredOption('--out <new-directory>').action(async o => print(await captureUI({ ...o, config: await json(o.config) })));
program.command('compare').requiredOption('--bundle <directory>').requiredOption('--actual <png>').requiredOption('--out <new-directory>').option('--capture <json>').option('--policy <json>').action(async o => { const result = await compareUI({ ...o, policy: o.policy ? await json(o.policy) : undefined }); print(result); process.exitCode = result.report.status === 'passed' ? 0 : result.report.status === 'failed' ? 1 : 2; });
program.command('report').requiredOption('--directory <run-directory>').action(async o => { const report = await getReport(o.directory) as ComparisonReport; print({ html: await writeReport(o.directory, report), report }); });
program.command('record-iteration').requiredOption('--session <json>').requiredOption('--report <run-directory>').action(async o => print(await recordIteration(o.session, o.report)));
program.command('mcp').description('Start MCP stdio server; stdout is reserved for protocol messages').action(serve);
program.parseAsync().catch(error => { process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`); process.exitCode = 1; });
