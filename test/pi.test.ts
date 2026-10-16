import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import { execFileSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import sharp from 'sharp';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

test('packed Pi extension runs its MCP tools from a different workspace', async t => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'fidelity pi package '));
  let client: Client | undefined;
  t.after(async () => {
    await client?.close();
    await fs.rm(root, { recursive: true, force: true });
  });
  // npm run check already builds. Avoid recursive lifecycle scripts and network.
  const packed = JSON.parse(execFileSync(process.execPath, [process.env.npm_execpath!, 'pack', '--ignore-scripts', '--json', '--pack-destination', root], { encoding: 'utf8' }))[0];
  const files = new Set<string>(packed.files.map((file: { path: string }) => file.path));
  for (const file of ['dist/cli.js', 'dist/widget-catalog.js', 'dist/widget-plan.js', 'docs/widget-catalog.md', 'extensions/flutter-fidelity.js', 'figma-plugin/manifest.json', 'figma-plugin/code.js', 'figma-plugin/ui.html', 'docs/workflow.md', 'flutter/fidelity_harness/lib/fidelity_harness.dart', '.claude-plugin/plugin.json', '.mcp.json', 'mcp.json', '.codex-plugin/plugin.json', 'skills/flutter-fidelity/scripts/fidelity.mjs', 'skills/flutter-fidelity/references/docs/workflow.md']) {
    assert.ok(files.has(file), `package must include ${file}`);
  }
  execFileSync('tar', ['-xzf', path.join(root, packed.filename), '-C', root]);
  // Resolve existing locked dependencies without installing anything globally.
  await fs.symlink(path.resolve('node_modules'), path.join(root, 'node_modules'), 'junction');
  const installed = path.join(root, 'package');
  const pkg = JSON.parse(await fs.readFile(path.join(installed, 'package.json'), 'utf8'));
  assert.ok(pkg.keywords.includes('pi-package'));
  assert.deepEqual(pkg.pi.skills, ['./skills/flutter-fidelity']);
  const skills = await fs.readdir(path.join(installed, 'skills'));
  assert.deepEqual(skills, ['flutter-fidelity']);
  const entrypoints = [...files].filter(file => typeof file === 'string' && file.startsWith('skills/') && file.endsWith('/SKILL.md'));
  assert.deepEqual(entrypoints, ['skills/flutter-fidelity/SKILL.md'], 'only one skill is discoverable, including recursively');
  const entrypoint = await fs.readFile(path.join(installed, entrypoints[0]!), 'utf8');
  assert.match(entrypoint, /^name: flutter-fidelity$/m);
  for (const reference of ['build', 'typography', 'repair', 'verification']) {
    await fs.access(path.join(installed, `skills/flutter-fidelity/references/${reference}.md`));
  }
  const claude = JSON.parse(await fs.readFile(path.join(installed, '.claude-plugin/plugin.json'), 'utf8'));
  assert.equal(claude.name, pkg.name);
  assert.equal(claude.version, pkg.version);
  for (const [file, variable] of [['mcp.json', '${PLUGIN_ROOT}'], ['.mcp.json', '${CLAUDE_PLUGIN_ROOT}']]) {
    const manifest = JSON.parse(await fs.readFile(path.join(installed, file!), 'utf8'));
    const server = manifest.mcpServers['flutter-fidelity'];
    assert.equal(server.command, 'node');
    assert.equal(server.cwd, undefined, 'plugin configuration must not force the package directory as the app workspace');
    const cli = server.args[0].replace(variable, installed);
    assert.equal(execFileSync(process.execPath, [cli, '--version'], { encoding: 'utf8' }).trim(), pkg.version);
  }

  const extension = (await import(pathToFileURL(path.join(installed, pkg.pi.extensions[0])).href)).default;
  assert.throws(() => extension({}), /requires Pi with native MCP/);
  const registrations: { name: string; config: { command: string; args: string[]; cwd?: string; timeout: number; description: string } }[] = [];
  extension({ registerMcpServer: (name: string, config: typeof registrations[number]['config']) => {
    // Model the narrower registration contract behind the reported warning.
    // The accepted transport config must still launch the real MCP server below.
    const supported = new Set(['command', 'args', 'cwd', 'timeout', 'description']);
    const ignored = Object.keys(config).filter(key => !supported.has(key));
    assert.deepEqual(ignored, [], 'MCP registration must not send ignored host settings');
    registrations.push({ name, config });
  } });
  assert.equal(registrations.length, 1);
  const { name, config } = registrations[0]!;
  assert.equal(name, 'flutter-fidelity');
  assert.equal(config.timeout, 1200, 'preserve the Flutter capture request timeout');
  assert.equal(config.cwd, undefined, 'inherit the user workspace, not the installed package');

  const workspace = path.join(root, 'user workspace');
  await fs.mkdir(workspace);
  await sharp({ create: { width: 100, height: 100, channels: 4, background: '#ffffff' } }).png().toFile(path.join(workspace, 'screen.png'));
  client = new Client({ name: 'pi-package-test', version: '1.0.0' });
  await client.connect(new StdioClientTransport({ command: config.command, args: config.args, cwd: workspace, stderr: 'pipe' }));
  assert.equal(client.getServerVersion()?.version, pkg.version);
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map(tool => tool.name).sort(), [
    'acquire_figma', 'acquire_figma_browser', 'acquire_figma_plugin', 'capture_ui', 'compare_ui', 'crop_asset', 'doctor', 'figma_bridge', 'find_widgets', 'get_report',
    'import_reference', 'inspect_reference', 'mark_widgets', 'plan_widget_work', 'record_iteration', 'register_widget',
    'suggest_viewport', 'validate_assets', 'verify_source_checkpoint',
  ]);
  await fs.mkdir(path.join(workspace, 'lib'));
  await fs.writeFile(path.join(workspace, 'lib/sample.dart'), '// Dart source fixture for catalog transport, not a validated widget.\nclass Sample {}\n');
  const marked = await client.callTool({ name: 'mark_widgets', arguments: { image: 'screen.png', out: 'marks', regions: [{ id: 'card', name: 'Sample card', kind: 'layout', bounds: { x: 5, y: 5, width: 40, height: 30 } }] } });
  assert.notEqual(marked.isError, true);
  const registered = await client.callTool({ name: 'register_widget', arguments: { catalog: 'widgets', projectRoot: '.', marks: 'marks', regionId: 'card', id: 'sample', name: 'Sample', symbol: 'Sample', description: 'Sample transport fixture', sourceFiles: ['lib/sample.dart'] } });
  assert.notEqual(registered.isError, true);
  const found = await client.callTool({ name: 'find_widgets', arguments: { catalog: 'widgets', projectRoot: '.', image: 'marks/crops/card.png' } });
  assert.notEqual(found.isError, true);
  const matches = JSON.parse((found.content as { type: string; text: string }[])[0]!.text);
  assert.equal(matches.candidates[0].match, 'exact-pixels');
  assert.equal(matches.candidates[0].sourceStatus, 'matching');
  assert.equal(matches.candidates[0].verification, 'not-run');
  const planned = await client.callTool({ name: 'plan_widget_work', arguments: { out: 'widget-plan', marks: 'marks', catalog: 'widgets', widgets: [{ id: 'card', regionIds: ['card'], decision: 'reuse', existingWidgetId: 'sample', files: [], brief: 'Review the existing Sample API before composing.' }] } });
  assert.notEqual(planned.isError, true);
  await fs.access(path.join(workspace, 'widget-plan/plan.json'));
  const imported = await client.callTool({ name: 'import_reference', arguments: { image: 'screen.png', out: 'reference', width: 100, height: 100, confirmed: true } });
  assert.notEqual(imported.isError, true);
  const inspected = await client.callTool({ name: 'inspect_reference', arguments: { bundle: 'reference' } });
  assert.notEqual(inspected.isError, true);
  assert.ok((inspected.content as { type: string }[]).some(item => item.type === 'image'));
  const comparison = await client.callTool({ name: 'compare_ui', arguments: { bundle: 'reference', actual: 'screen.png', out: 'report' } });
  assert.notEqual(comparison.isError, true);
  const report = JSON.parse(await fs.readFile(path.join(workspace, 'report/comparison.json'), 'utf8'));
  assert.equal(report.status, 'incomplete', 'identical PNGs without capture evidence must not pass');
  const duplicate = await client.callTool({ name: 'import_reference', arguments: { image: 'screen.png', out: 'reference', width: 100, height: 100, confirmed: true } });
  assert.equal(duplicate.isError, true, 'MCP errors must survive the Pi integration');
  assert.deepEqual(await fs.readFile(path.join(workspace, 'reference/original.png')), await fs.readFile(path.join(workspace, 'screen.png')));
  await fs.rename(path.join(installed, 'dist'), path.join(installed, 'dist-hidden'));
  assert.throws(() => extension({ registerMcpServer() { assert.fail('must not register an unbuilt package'); } }), /not built/);
});
