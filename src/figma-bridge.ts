import { createServer, type ServerResponse, type IncomingMessage } from 'node:http';
import { randomBytes, randomUUID, timingSafeEqual, createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { z } from 'zod';
import { createOutput, writeJson } from './io.js';
import { VERSION } from './version.js';

const SESSION_TIMEOUT_MS = 30_000;
const NodeId = z.string().regex(/^I?\d+:\d+(?:;I?\d+:\d+)*$/);
const Metadata = z.object({
  documentName: z.string().min(1).max(500), pageId: NodeId,
  selection: z.array(z.object({ id: NodeId, name: z.string().max(500), type: z.string().max(50) })).max(100),
}).strict();
const Connect = Metadata.extend({ clientId: z.string().regex(/^[a-f0-9]{32}$/) });
const ExportResult = z.object({
  nodeId: NodeId, pageId: NodeId, nodeName: z.string().max(500),
  logicalSize: z.object({ width: z.number().positive(), height: z.number().positive() }).strict(),
  png: z.string().min(1).max(44_739_244).regex(/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/),
  context: z.object({ document: z.object({ id: NodeId }).passthrough() }).passthrough(),
  css: z.record(z.string()).optional(), cssError: z.string().max(2000).optional(),
  exportedAt: z.string().datetime(),
}).strict();
export const PluginIntakeSchema = z.object({
  sessionId: z.string().uuid(), nodeId: NodeId.optional(), out: z.string().min(1),
  scale: z.number().min(0.01).max(4).default(1), css: z.boolean().default(false),
}).strict();
type Job = { id: string; nodeId: string; scale: number; css: boolean };
type Pending = { job: Job; delivered: boolean; resolve: (value: z.infer<typeof ExportResult>) => void; reject: (error: Error) => void; timer: NodeJS.Timeout };

/** A paired, loopback-only read bridge. HTTP endpoints never accept filesystem paths or code. */
export class FigmaBridge {
  private token = randomBytes(24).toString('base64url');
  private session?: { id: string; clientId: string; metadata: z.infer<typeof Metadata>; lastSeen: number };
  private pending?: Pending;
  private poll?: { response: ServerResponse; timer: NodeJS.Timeout };
  private servers = ['127.0.0.1', '::1'].map(() => createServer((req, res) => { void this.handle(req, res).catch(error => {
    if (!res.headersSent) this.reply(res, error instanceof z.ZodError || error instanceof SyntaxError ? 400 : 409, { error: error instanceof z.ZodError ? 'Invalid bridge message.' : String(error instanceof Error ? error.message : error).slice(0, 2000) });
    else res.destroy();
  }); }));
  private port = 0;
  private closed = false;
  constructor(private options: { jobTimeoutMs?: number; pollTimeoutMs?: number } = {}) {
    for (const server of this.servers) server.requestTimeout = 30_000;
  }
  async start(port = 43871) {
    for (const [index, host] of ['127.0.0.1', '::1'].entries()) {
      const server = this.servers[index]!;
      try {
        await new Promise<void>((resolve, reject) => {
          const failed = (error: Error) => { server.off('listening', ready); reject(error); };
          const ready = () => { server.off('error', failed); resolve(); };
          server.once('error', failed).once('listening', ready).listen(this.port || port, host);
        });
      } catch (error) {
        const code = (error as NodeJS.ErrnoException).code;
        if (host === '::1' && ['EAFNOSUPPORT', 'EADDRNOTAVAIL'].includes(code ?? '')) continue;
        await this.close();
        if (code === 'EADDRINUSE') throw new Error(`Figma bridge port ${this.port || port} is already in use. Stop the other bridge in its coding agent, then try again. No process was stopped.`, { cause: error });
        throw error;
      }
      const address = server.address();
      if (!address || typeof address === 'string') throw new Error('Bridge did not bind a loopback TCP port.');
      this.port = address.port;
      server.unref();
    }
    return this.connection();
  }
  connection() {
    return { ...this.status(), pairingCode: `${this.port}.${this.token}`,
      pluginSource: fileURLToPath(new URL('../figma-plugin/', import.meta.url)),
      setupGuide: fileURLToPath(new URL('../docs/figma-plugin.md', import.meta.url)),
      setupCommand: 'npx --no-install flutter-fidelity setup',
      instruction: 'First time: run setupCommand in an interactive terminal from your Flutter project. It guides Figma registration, prepares a safe local copy, and opens the manifest location. If this MCP connection already works, choose keep existing MCP. Import the prepared manifest through Plugins > Development > Import plugin from manifest. Run Flutter Fidelity Bridge in your design, paste the pairing code, and click Connect. Allow local network access if prompted. Keep the file/plugin open; no Figma access token is needed.' };
  }
  status() {
    return { running: this.servers[0]!.listening && !this.closed, address: `http://localhost:${this.port}`,
      connected: !!this.session && Date.now() - this.session.lastSeen < SESSION_TIMEOUT_MS,
      session: this.session ? { sessionId: this.session.id, ...this.session.metadata, lastSeen: new Date(this.session.lastSeen).toISOString() } : null,
      busy: !!this.pending };
  }
  private reply(res: ServerResponse, status: number, body?: unknown) {
    if (res.destroyed || res.writableEnded) return;
    res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    res.end(body === undefined ? undefined : JSON.stringify(body));
  }
  private flush() {
    if (!this.poll) return;
    const { response, timer } = this.poll;
    this.poll = undefined;
    clearTimeout(timer);
    if (this.pending && !this.pending.delivered) {
      this.pending.delivered = true;
      this.reply(response, 200, this.pending.job);
    } else this.reply(response, 204);
  }
  private async body(req: IncomingMessage) {
    let size = 0;
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      size += chunk.length;
      if (size > 48 * 1024 * 1024) throw new Error('Bridge payload exceeds 48 MiB. Use a smaller frame.');
      chunks.push(chunk);
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }
  private async handle(req: IncomingMessage, res: ServerResponse) {
    const origin = req.headers.origin;
    if (!['localhost', '127.0.0.1', '[::1]'].some(host => req.headers.host?.toLowerCase() === `${host}:${this.port}`) || (origin && !['null', 'https://www.figma.com', 'https://figma.com'].includes(origin))) {
      this.reply(res, 403, { error: 'Loopback Figma bridge only.' }); return;
    }
    if (origin) res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');
    res.setHeader('Access-Control-Allow-Private-Network', 'true');
    if (req.method === 'OPTIONS') { this.reply(res, 204); return; }
    if (req.method === 'GET' && req.url === '/health') {
      this.reply(res, 200, { service: 'flutter-fidelity-bridge', protocol: 2, version: VERSION }); return;
    }
    const auth = Buffer.from(req.headers.authorization ?? ''), expected = Buffer.from(`Bearer ${this.token}`);
    if (auth.length !== expected.length || !timingSafeEqual(auth, expected)) { this.reply(res, 401, { error: 'Invalid pairing code.' }); return; }
    if (req.method !== 'POST' || !['/connect', '/poll', '/metadata', '/result', '/disconnect'].includes(req.url ?? '')) { this.reply(res, 404); return; }
    const body = await this.body(req);
    if (req.url === '/connect') {
      const { clientId, ...metadata } = Connect.parse(body);
      // A quiet, abandoned plugin may expire; an active poll or export never does.
      if (this.session && !this.poll && !this.pending && Date.now() - this.session.lastSeen >= SESSION_TIMEOUT_MS) this.session = undefined;
      if (this.session && this.session.clientId !== clientId) {
        this.reply(res, 409, { code: 'ALREADY_PAIRED', error: 'A plugin is already paired. Disconnect it first. If it was closed, wait 30 seconds and retry; active polls and exports keep ownership.' }); return;
      }
      if (!this.session) this.session = { id: randomUUID(), clientId, metadata, lastSeen: Date.now() };
      else { this.session.metadata = metadata; this.session.lastSeen = Date.now(); }
      this.reply(res, 200, { sessionId: this.session.id }); return;
    }
    if (!this.session || body.sessionId !== this.session.id) {
      this.reply(res, 409, { code: 'SESSION_MISMATCH', error: 'Plugin session differs from the paired document.' }); return;
    }
    this.session.lastSeen = Date.now();
    if (req.url === '/metadata') {
      this.session.metadata = Metadata.parse(body.metadata);
      this.reply(res, 200, { updated: true }); return;
    }
    if (req.url === '/disconnect') {
      this.pending?.reject(new Error('Figma plugin disconnected.'));
      this.flush(); this.session = undefined;
      this.reply(res, 200, { disconnected: true }); return;
    }
    if (req.url === '/poll') {
      this.session.metadata = Metadata.parse(body.metadata);
      if (this.poll) { this.reply(res, 409, { code: 'POLL_ACTIVE', error: 'A poll is already active for this plugin.' }); return; }
      const timer = setTimeout(() => this.flush(), this.options.pollTimeoutMs ?? 20_000);
      timer.unref();
      this.poll = { response: res, timer };
      res.on('close', () => {
        if (this.poll?.response === res) { clearTimeout(timer); this.poll = undefined; }
      });
      if (this.pending && !this.pending.delivered) this.flush();
      return;
    }
    if (!this.pending || body.id !== this.pending.job.id || !this.pending.delivered) {
      this.reply(res, 409, { code: 'JOB_EXPIRED', error: 'Export request expired or does not match the pending request.' }); return;
    }
    const pending = this.pending;
    if (typeof body.error === 'string') pending.reject(new Error(`Figma plugin: ${body.error.slice(0, 2000)}`));
    else {
      try {
        const result = ExportResult.parse(body.result);
        if (result.nodeId !== pending.job.nodeId || result.context.document.id !== pending.job.nodeId) throw new Error('Export node identity mismatch.');
        pending.resolve(result);
      } catch { pending.reject(new Error('Invalid plugin export or mismatched node identity.')); }
    }
    this.reply(res, 200, { received: true });
  }
  private export(sessionId: string, nodeId: string, scale: number, css: boolean) {
    if (!this.status().connected || this.session?.id !== sessionId) throw new Error('Figma plugin is disconnected or the document session changed. Run figma_bridge status and pair the intended file.');
    if (this.pending) throw new Error('A plugin export is already running.');
    return new Promise<z.infer<typeof ExportResult>>((resolve, reject) => {
      const clear = () => { if (this.pending) clearTimeout(this.pending.timer); this.pending = undefined; };
      const timer = setTimeout(() => this.pending?.reject(new Error('Figma plugin export timed out. Keep the file/plugin open; use a smaller frame or reconnect before retrying.')), this.options.jobTimeoutMs ?? 60_000);
      timer.unref();
      this.pending = { job: { id: randomUUID(), nodeId, scale, css }, delivered: false, timer,
        resolve: result => { clear(); resolve(result); }, reject: error => { clear(); reject(error); } };
      if (this.poll) this.flush();
    });
  }
  async acquire(input: z.input<typeof PluginIntakeSchema>) {
    const args = PluginIntakeSchema.parse(input);
    if (!this.status().connected || this.session?.id !== args.sessionId) throw new Error('Pair the intended Figma file first and use its current sessionId from figma_bridge status.');
    const metadata = this.session.metadata;
    const selected = metadata.selection;
    const nodeId = args.nodeId ?? (selected.length === 1 ? selected[0]!.id : undefined);
    if (!nodeId) throw new Error('Select one frame in Figma or provide an explicit nodeId in the paired document.');
    const root = await createOutput(args.out), started = performance.now();
    const record: Record<string, unknown> = { version: 1, status: 'pending', sourceKind: 'figma-plugin', sessionId: args.sessionId,
      documentName: metadata.documentName, nodeId, requestedScale: args.scale,
      acquiredAt: new Date().toISOString(), revision: null,
      scope: 'Live plugin snapshot; no REST revision or original artwork/font bytes. CSS, if requested, covers only the root node.' };
    await writeJson(path.join(root, 'intake.json'), record);
    try {
      const result = await this.export(args.sessionId, nodeId, args.scale, args.css);
      const context = Buffer.from(JSON.stringify(result.context, null, 2) + '\n');
      await fs.mkdir(path.join(root, 'context'));
      await fs.writeFile(path.join(root, 'context/node.json'), context, { flag: 'wx' });
      const hash = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');
      record.designContext = { path: 'context/node.json', sha256: hash(context), coveredRoot: nodeId };
      if (result.css) {
        await writeJson(path.join(root, 'context/css.json'), result.css);
        record.css = { path: 'context/css.json', coveredNodeIds: [nodeId] };
      }
      if (result.cssError) record.cssError = result.cssError;
      const png = Buffer.from(result.png, 'base64');
      const image = sharp(png, { limitInputPixels: 64_000_000 }), meta = await image.metadata();
      if (meta.format !== 'png' || !meta.width || !meta.height || (meta.pages ?? 1) !== 1) throw new Error('Plugin did not return a single valid PNG.');
      await image.raw().toBuffer();
      await fs.mkdir(path.join(root, 'frames'));
      await fs.writeFile(path.join(root, 'frames/reference.png'), png, { flag: 'wx' });
      record.logicalSize = result.logicalSize;
      record.frame = { path: 'frames/reference.png', sha256: hash(png), width: meta.width, height: meta.height,
        actualScale: { x: meta.width / result.logicalSize.width, y: meta.height / result.logicalSize.height } };
      record.profileStatus = Math.abs(meta.width - result.logicalSize.width * args.scale) <= 1 && Math.abs(meta.height - result.logicalSize.height * args.scale) <= 1 ? 'dimensions-consistent' : 'needs-review';
      record.exportedAt = result.exportedAt;
      record.status = 'acquired'; record.elapsedMs = Math.round(performance.now() - started);
      await writeJson(path.join(root, 'intake.json'), record);
      return { root, ...record };
    } catch (error) {
      record.status = 'failed'; record.elapsedMs = Math.round(performance.now() - started);
      record.error = error instanceof Error ? error.message : 'Plugin intake failed.';
      await writeJson(path.join(root, 'intake.json'), record);
      throw new Error(`${record.error} Partial evidence: ${path.join(root, 'intake.json')}`);
    }
  }
  async close() {
    this.closed = true;
    this.pending?.reject(new Error('Figma bridge stopped.'));
    this.flush(); this.session = undefined;
    await Promise.all(this.servers.map(server => {
      if (!server.listening) return;
      return new Promise<void>(resolve => { server.close(() => resolve()); server.closeAllConnections(); });
    }));
  }
}
