import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { z } from 'zod';
import { createOutput, inside, writeJson } from './io.js';

export const FigmaIntakeSchema = z.object({
  url: z.string().url(), out: z.string().min(1),
  scale: z.number().min(0.01).max(4).default(1), reuse: z.string().optional(),
}).strict();

/** Explicit Design frame/layer links only; never navigate the editor or export the whole file. */
export function parseFigmaLink(value: string) {
  const url = new URL(value);
  const match = url.pathname.match(/^\/(?:design|file)\/([a-zA-Z0-9]+)(?:\/branch\/([a-zA-Z0-9]+))?(?:\/|$)/);
  const nodeId = url.searchParams.get('node-id')?.replace(/-/g, ':');
  const requestedVersion = url.searchParams.get('version-id');
  if (url.protocol !== 'https:' || !['figma.com', 'www.figma.com'].includes(url.hostname) || url.port || url.username || url.password || !match || !nodeId || !/^\d+:\d+$/.test(nodeId)) {
    throw new Error('Supply an HTTPS Figma Design frame/layer link with a node-id.');
  }
  if (requestedVersion !== null && !/^[a-zA-Z0-9_-]+$/.test(requestedVersion)) throw new Error('Invalid Figma version-id.');
  const fileKey = match[2] ?? match[1]!;
  return { fileKey, nodeId, ...(requestedVersion ? { requestedVersion } : {}),
    sourceUrl: `https://www.figma.com/design/${fileKey}?node-id=${nodeId.replace(':', '-')}${requestedVersion ? `&version-id=${requestedVersion}` : ''}` };
}

const digest = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
const NodeResponse = z.object({
  version: z.string().min(1),
  nodes: z.record(z.object({ document: z.object({
    id: z.string(), type: z.string(),
    absoluteBoundingBox: z.object({ width: z.number().positive(), height: z.number().positive() }).passthrough(),
  }).passthrough() }).passthrough().nullable()),
});
const Cache = z.object({
  status: z.literal('acquired'), fileKey: z.string(), nodeId: z.string(), revision: z.string(),
  requestedScale: z.number(), frame: z.object({ path: z.string(), sha256: z.string() }),
});

async function pngInfo(bytes: Buffer) {
  const image = sharp(bytes, { limitInputPixels: 64_000_000 });
  const meta = await image.metadata();
  if (meta.format !== 'png' || !meta.width || !meta.height || (meta.pages ?? 1) !== 1) throw new Error('Figma export did not return a single PNG image.');
  await image.raw().toBuffer();
  return { width: meta.width, height: meta.height, sha256: digest(bytes) };
}

/** Read-only remote acquisition; credentials never appear in tool arguments or saved manifests. */
export async function acquireFigma(input: z.input<typeof FigmaIntakeSchema>, runtime: { fetch?: typeof fetch } = {}) {
  const args = FigmaIntakeSchema.parse(input), identity = parseFigmaLink(args.url);
  const token = process.env.FIGMA_ACCESS_TOKEN;
  if (!token) throw new Error('Background Figma intake needs FIGMA_ACCESS_TOKEN (a personal access token with file_content:read) in the environment that launches Pi/MCP. Alternatively use an already connected Figma remote MCP or a local PNG.');
  const root = await createOutput(args.out), started = performance.now();
  const request = runtime.fetch ?? globalThis.fetch, deadline = AbortSignal.timeout(90_000);
  let requests = 0;
  const record: Record<string, unknown> = {
    version: 1, status: 'pending', sourceKind: 'figma-rest', ...identity,
    requestedScale: args.scale, acquiredAt: new Date().toISOString(),
    scope: 'Frame PNG and scoped node properties only; original assets/fonts and implementation checks are separate.',
  };
  await writeJson(path.join(root, 'intake.json'), record);
  async function get(url: string, api: boolean) {
    // One retry for network/5xx failures; none for access/rate-limit denials.
    for (let attempt = 0; attempt < 2; attempt++) {
      deadline.throwIfAborted();
      const signal = AbortSignal.any([deadline, AbortSignal.timeout(30_000)]);
      let response: Response;
      try {
        requests++;
        response = await request(url, { headers: api ? { 'X-Figma-Token': token! } : {}, redirect: 'error', signal });
      } catch {
        if (attempt === 0 && !deadline.aborted) continue;
        throw new Error('Figma request failed or timed out; no older reference was substituted.');
      }
      if (response.ok) {
        if (!response.body) throw new Error('Figma returned an empty response.');
        const reader = response.body.getReader(), chunks: Uint8Array[] = [];
        let size = 0;
        try {
          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            size += value.length;
            if (size > (api ? 32 : 64) * 1024 * 1024) throw new Error('Response exceeds intake size limit.');
            chunks.push(value);
          }
          return Buffer.concat(chunks);
        } catch {
          await reader.cancel().catch(() => {});
          throw new Error('Figma response was interrupted or exceeded the intake size limit.');
        }
      }
      await response.body?.cancel();
      if (response.status >= 500 && attempt === 0) continue;
      const hint = response.status === 429 ? 'Rate limited; retry later according to Figma limits.'
        : [401, 403, 404].includes(response.status) ? 'Check token scope, expiration and file access; do not repeat unchanged requests.' : 'Use another available acquisition route.';
      throw new Error(`Figma ${api ? 'API' : 'PNG download'} HTTP ${response.status}. ${hint}`);
    }
    throw new Error('Figma request failed.');
  }
  async function api(route: string, params: Record<string, string>) {
    const url = new URL(`https://api.figma.com/v1/${route}`);
    url.search = new URLSearchParams(params).toString();
    try { return JSON.parse((await get(url.href, true)).toString('utf8')); }
    catch (error) {
      if (error instanceof SyntaxError) throw new Error('Figma returned invalid JSON.');
      throw error;
    }
  }
  try {
    const data = NodeResponse.parse(await api(`files/${identity.fileKey}/nodes`, { ids: identity.nodeId, ...(identity.requestedVersion ? { version: identity.requestedVersion } : {}) }));
    if (identity.requestedVersion && data.version !== identity.requestedVersion) throw new Error('Figma response revision differs from the requested version.');
    const selected = data.nodes[identity.nodeId];
    if (!selected || selected.document.id !== identity.nodeId) throw new Error('Requested Figma node is missing or does not match the response.');
    record.revision = data.version;
    const bounds = selected.document.absoluteBoundingBox;
    record.logicalSize = { width: bounds.width, height: bounds.height };
    await fs.mkdir(path.join(root, 'context'));
    // Exclude file thumbnail URLs; retain the selected node's properties unchanged.
    const context = Buffer.from(JSON.stringify(selected, null, 2) + '\n');
    await fs.writeFile(path.join(root, 'context/node.json'), context, { flag: 'wx' });
    record.designContext = { path: 'context/node.json', sha256: digest(context), sourceKind: 'figma-rest-node', coveredRoot: identity.nodeId };
    let bytes: Buffer | undefined;
    let info: Awaited<ReturnType<typeof pngInfo>> | undefined;
    if (args.reuse) {
      try {
        const previous = Cache.parse(JSON.parse(await fs.readFile(await inside(args.reuse, 'intake.json'), 'utf8')));
        if (previous.fileKey === identity.fileKey && previous.nodeId === identity.nodeId && previous.revision === data.version && previous.requestedScale === args.scale) {
          const cached = await fs.readFile(await inside(args.reuse, previous.frame.path));
          const cachedInfo = await pngInfo(cached);
          if (cachedInfo.sha256 !== previous.frame.sha256) throw new Error('Cached PNG hash mismatch');
          bytes = cached;
          info = cachedInfo;
          record.cache = 'revision-and-hash-verified';
        } else record.cache = 'identity-revision-or-scale-changed';
      } catch { record.cache = 'unusable-cache'; }
    }
    if (!bytes) {
      const images = z.object({ images: z.record(z.string().url().nullable()) }).parse(await api(`images/${identity.fileKey}`, {
        ids: identity.nodeId, version: data.version, format: 'png', scale: String(args.scale), use_absolute_bounds: 'true',
      }));
      const download = images.images[identity.nodeId];
      if (!download) throw new Error('Figma could not render the requested node; design context was saved but the PNG is missing.');
      const url = new URL(download);
      if (url.protocol !== 'https:' || url.username || url.password) throw new Error('Figma returned an unsupported PNG download URL.');
      bytes = await get(url.href, false); // Never forward the token to an asset host.
    }
    info ??= await pngInfo(bytes);
    await fs.mkdir(path.join(root, 'frames'));
    await fs.writeFile(path.join(root, 'frames/reference.png'), bytes, { flag: 'wx' });
    const scaleX = info.width / bounds.width, scaleY = info.height / bounds.height;
    const dimensionsMatch = Math.abs(info.width - bounds.width * args.scale) <= 1 && Math.abs(info.height - bounds.height * args.scale) <= 1;
    record.frame = { path: 'frames/reference.png', ...info, actualScale: { x: scaleX, y: scaleY } };
    record.profileStatus = dimensionsMatch ? 'dimensions-consistent' : 'needs-review';
    record.profileNote = dimensionsMatch ? 'Confirm viewport intent before importing.' : 'Export dimensions differ from requested scale/bounds; investigate effects, clipping or server downscaling before importing. No resize was performed.';
    record.status = 'acquired';
    record.elapsedMs = Math.round(performance.now() - started);
    record.requests = requests;
    await writeJson(path.join(root, 'intake.json'), record);
    return { root, ...record };
  } catch (error) {
    record.status = 'failed';
    record.elapsedMs = Math.round(performance.now() - started);
    record.requests = requests;
    record.error = error instanceof z.ZodError ? 'Figma response is missing required node/revision/render data.' : error instanceof Error ? error.message : 'Figma intake failed.';
    await writeJson(path.join(root, 'intake.json'), record);
    throw new Error(`${record.error} Partial evidence: ${path.join(root, 'intake.json')}`);
  }
}
