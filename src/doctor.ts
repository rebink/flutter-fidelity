import { run } from './io.js';
export async function doctor(flutter = 'flutter') {
  const checks: { name: string; ok: boolean; detail: string }[] = [{ name: 'node', ok: Number(process.versions.node.split('.')[0]) >= 22, detail: process.version }];
  for (const [name, command, args] of [['flutter', flutter, ['--version']], ['dart-mcp', flutter === 'flutter' ? 'dart' : flutter.replace(/flutter$/, 'dart'), ['mcp-server', '--help']]] as const) {
    try { const result = await run(command, [...args], { timeoutMs: 60000 }); checks.push({ name, ok: result.code === 0, detail: (result.stdout + result.stderr).slice(0, 1600) }); }
    catch (error) { checks.push({ name, ok: false, detail: String(error) }); }
  }
  return { readyForImageTools: checks[0]!.ok, readyForFlutter: checks.find(c => c.name === 'flutter')!.ok, readyForOfficialDartMcp: checks.find(c => c.name === 'dart-mcp')!.ok, checks, note: 'Use a pinned Flutter SDK. Image tools work without Flutter; captures require Flutter; official Dart MCP requires a supporting Dart SDK.' };
}
