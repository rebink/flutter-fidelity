import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { z } from 'zod';
import { VERSION } from './version.js';

const Health = z.object({
  service: z.literal('flutter-fidelity-bridge'), protocol: z.literal(2),
  version: z.string().regex(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?$/),
});
export type BridgeReadiness = { state: 'ready'; version: string } | { state: 'unreachable' } | { state: 'incompatible'; httpStatus?: number };

export async function verifyMcp(entrypoint: string, cwd: string, signal?: AbortSignal) {
  const deadline = AbortSignal.any([AbortSignal.timeout(10_000), ...(signal ? [signal] : [])]);
  deadline.throwIfAborted();
  const client = new Client({ name: 'flutter-fidelity-setup', version: VERSION });
  const transport = new StdioClientTransport({ command: process.execPath, args: [entrypoint, 'mcp'], cwd, stderr: 'pipe' });
  transport.stderr?.on('data', () => {});
  try {
    await client.connect(transport, { signal: deadline, timeout: 10_000 });
    const identity = client.getServerVersion();
    const { tools } = await client.listTools({}, { signal: deadline, timeout: 10_000 });
    if (identity?.name !== 'flutter-fidelity' || identity.version !== VERSION ||
        !['figma_bridge', 'acquire_figma_plugin'].every(name => tools.some(tool => tool.name === name))) {
      throw new Error('Engine identity or tools differ.');
    }
  } catch {
    signal?.throwIfAborted();
    throw new Error('MCP startup self-check failed. Reinstall Flutter Fidelity, or rebuild this source checkout, then rerun setup. No MCP settings were changed.');
  } finally {
    await client.close();
    await transport.close();
  }
}

export async function checkFigmaBridge(address = 'http://localhost:43871', signal?: AbortSignal): Promise<BridgeReadiness> {
  const match = address.match(/^http:\/\/(?:localhost|127\.0\.0\.1|\[::1\]):([1-9]\d{0,4})$/);
  if (!match || Number(match[1]) > 65535) throw new Error('Readiness checks require an explicit loopback HTTP address and port.');
  try {
    const response = await fetch(address + '/health', {
      redirect: 'manual', signal: AbortSignal.any([AbortSignal.timeout(2000), ...(signal ? [signal] : [])]),
    });
    if (!response.ok) {
      await response.body?.cancel();
      return { state: 'incompatible', httpStatus: response.status };
    }
    const chunks: Uint8Array[] = [];
    let size = 0;
    for await (const chunk of response.body ?? []) {
      size += chunk.byteLength;
      if (size > 1024) return { state: 'incompatible' };
      chunks.push(chunk);
    }
    let value: unknown;
    try { value = JSON.parse(Buffer.concat(chunks).toString('utf8')); }
    catch { return { state: 'incompatible' }; }
    const parsed = Health.safeParse(value);
    return parsed.success ? { state: 'ready', version: parsed.data.version } : { state: 'incompatible' };
  } catch {
    signal?.throwIfAborted();
    return { state: 'unreachable' };
  }
}
