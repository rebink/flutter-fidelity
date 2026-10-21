import { promises as fs } from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { z } from 'zod';
import sharp from 'sharp';
import type { Browser, BrowserContext, BrowserContextOptions, Page } from 'playwright-core';
import { createOutput, writeJson } from './io.js';
import { parseFigmaLink } from './figma.js';

const selector = z.string().trim().min(1).max(2000);
const nodeId = z.string().regex(/^\d+:\d+$/);
// Selectors are supplied from an observed editor UI, never guessed private APIs.
const RecipeSchema = z.object({
  ready: selector,
  prepare: z.array(selector).max(20).default([]),
  selected: z.object({ selector, idAttribute: z.string().regex(/^[\w-]+$/) }).strict(),
  select: selector.optional(),
  layers: z.object({ selector, idAttribute: z.string().regex(/^[\w-]+$/), parentAttribute: z.string().regex(/^[\w-]+$/).optional() }).strict().optional(),
  panels: z.array(z.object({ name: z.string().regex(/^[a-z][a-z0-9-]{0,49}$/), selector, open: z.array(selector).max(10).default([]) }).strict()).min(1).max(12)
    .refine(items => new Set(items.map(item => item.name)).size === items.length, 'Panel names must be unique'),
  export: z.object({ prepare: z.array(selector).max(10).default([]), button: selector }).strict().optional(),
}).strict();

export const FigmaBrowserSchema = z.object({
  url: z.string().url(), out: z.string().min(1),
  nodeIds: z.array(nodeId).max(200).default([]),
  discoverChildren: z.boolean().default(true),
  headless: z.boolean().default(true).describe('Default background mode. Set false only with user permission for a visible, serial retry after manual login.'),
  concurrency: z.number().int().min(1).max(6).default(3),
  maxNodes: z.number().int().min(1).max(200).default(50),
  timeoutMs: z.number().int().min(1000).max(600_000).default(180_000),
  actionTimeoutMs: z.number().int().min(100).max(60_000).default(15_000),
  inspectReady: selector.optional(),
  recipe: RecipeSchema.optional(),
}).strict();

type Input = z.input<typeof FigmaBrowserSchema>;
type Recipe = z.infer<typeof RecipeSchema>;
type PanelResult = { name: string; status: 'collected' | 'failed'; path?: string; sha256?: string; error?: string };
type NodeResult = { nodeId: string; status: 'collected' | 'failed' | 'not-run'; panels?: PanelResult[]; error?: string; elapsedMs?: number };
const sha256 = (bytes: Buffer | string) => createHash('sha256').update(bytes).digest('hex');
const template = (value: string, id: string) => value.replaceAll('{nodeId}', id).replaceAll('{nodeIdUrl}', id.replace(':', '-'));

/** A test seam for a browser fixture; tool callers cannot override origin or arbitrary launch flags. */
export type FigmaBrowserRuntime = { launch?: (options: { headless: boolean }) => Promise<Browser> };

async function launchBrowser(timeoutMs: number, headless: boolean) {
  try {
    const { chromium } = await import('playwright-core');
    return await chromium.launch({ headless, timeout: Math.min(30_000, timeoutMs), channel: process.env.FIGMA_BROWSER_CHANNEL || undefined });
  } catch {
    throw new Error('Browser unavailable. Run npx playwright-core install chromium, or set FIGMA_BROWSER_CHANNEL=chrome for installed Chrome. No automatic foreground fallback was attempted.');
  }
}

async function clickAll(page: Page, selectors: string[], id: string) {
  for (const value of selectors) await page.locator(template(value, id)).click();
}

async function verifySelection(page: Page, recipe: Recipe, id: string, fileKey: string) {
  if (parseFigmaLink(page.url()).fileKey !== fileKey) throw new Error('Editor changed to another document.');
  const selected = page.locator(template(recipe.selected.selector, id));
  await selected.and(page.locator(`[${recipe.selected.idAttribute}="${id}"], [${recipe.selected.idAttribute}="${id.replace(':', '-')}"]`)).waitFor({ state: 'visible' });
  // URL alone is not proof that Figma finished selecting the requested layer.
  await selected.evaluate((element, { attribute, expected }) => {
    if (element.getAttribute(attribute)?.replace(/-/g, ':') !== expected) throw new Error('Selected node does not match');
  }, { attribute: recipe.selected.idAttribute, expected: id });
}

async function readPanel(page: Page, value: string) {
  const panel = page.locator(value);
  await panel.waitFor({ state: 'visible' });
  const data = await panel.evaluate(element => {
    const text = (element as HTMLElement).innerText || '';
    const controls = element.querySelectorAll('input:not([type=password]):not([type=hidden]), textarea, select, [role=spinbutton], [role=combobox]');
    const fields = Array.from(controls).slice(0, 1000).map(field => ({
      label: (field.getAttribute('aria-label') || field.getAttribute('name') || field.getAttribute('placeholder') || (field as HTMLInputElement).labels?.[0]?.textContent || '').slice(0, 4000),
      value: 'value' in field ? String(field.value).slice(0, 4000) : (field.textContent || '').slice(0, 4000),
    }));
    return { text: text.slice(0, 200_000), textTruncated: text.length > 200_000, fields, fieldsTruncated: controls.length > 1000, fieldCharacterLimit: 4000 };
  });
  const aria = await panel.ariaSnapshot({ depth: 20 });
  return { ...data, aria: aria.slice(0, 200_000), ariaTruncated: aria.length > 200_000 };
}

/** Acquire UI evidence with isolated contexts, headless by default; never use private Figma internals. */
export async function acquireFigmaBrowser(input: Input, runtime: FigmaBrowserRuntime = {}): Promise<{ root: string; status: string; [key: string]: unknown }> {
  const args = FigmaBrowserSchema.parse(input), identity = parseFigmaLink(args.url);
  if (identity.requestedVersion) throw new Error('Browser intake cannot verify a pinned REST revision. Use REST intake for version-id links.');
  if (new Set([identity.nodeId, ...args.nodeIds]).size > args.maxNodes) throw new Error('Explicit node list exceeds maxNodes; increase the bound or narrow the requested scope.');
  const root = await createOutput(args.out), started = performance.now();
  const concurrency = args.headless ? args.concurrency : 1;
  const loginNext = 'Ask the user to sign in manually in a dedicated visible Playwright browser, wait for confirmation and verify file access. Keep authentication state private. Retry once in a NEW output directory; see docs/figma-browser.md#manual-login-recovery.';
  const record: Record<string, unknown> = {
    version: 1, sourceKind: 'figma-browser-ui', status: 'pending', ...identity,
    acquiredAt: new Date().toISOString(), headless: args.headless, concurrency,
    coverage: 'observed-ui-only', structureStatus: 'incomplete', profileStatus: 'unavailable',
    notes: ['Browser properties are supporting evidence, not a complete Figma node tree.',
      'Editor screenshots and DOM geometry are not reference exports or design coordinates.',
      'No REST revision, font bytes, original artwork, or runtime behavior is established.'],
  };
  const results = new Map<string, NodeResult>();
  const ids = [...new Set([identity.nodeId, ...args.nodeIds])];
  record.requestedNodes = ids;
  for (const id of ids) results.set(id, { nodeId: id, status: 'not-run' });
  let browser: Browser | undefined, expired = false, blocked = false;
  let peakWorkers = 0, activeWorkers = 0;
  await writeJson(path.join(root, 'intake.json'), record);
  const timer = setTimeout(() => { expired = true; void browser?.close().catch(() => {}); }, args.timeoutMs);
  const contexts = new Set<BrowserContext>();
  try {
    let storageState: BrowserContextOptions['storageState'];
    if (process.env.FIGMA_BROWSER_STORAGE_STATE) {
      try { storageState = JSON.parse(await fs.readFile(process.env.FIGMA_BROWSER_STORAGE_STATE, 'utf8')); }
      catch { throw new Error('Cannot read browser authentication state from FIGMA_BROWSER_STORAGE_STATE. Keep this credential file outside source/evidence directories.'); }
    }
    browser = await (runtime.launch ? runtime.launch({ headless: args.headless }) : launchBrowser(args.timeoutMs, args.headless));
    if (expired) throw new Error('Browser intake deadline reached.');
    const newPage = async () => {
      const context = await browser!.newContext({ storageState, acceptDownloads: true, viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
      contexts.add(context);
      context.setDefaultTimeout(args.actionTimeoutMs);
      context.setDefaultNavigationTimeout(Math.min(60_000, args.timeoutMs));
      const page = await context.newPage();
      page.on('dialog', dialog => { void dialog.dismiss().catch(() => {}); });
      page.on('popup', popup => { void popup.close().catch(() => {}); });
      return page;
    };
    const urlFor = (id: string) => identity.sourceUrl.replace(/node-id=[^&]+/, `node-id=${id.replace(':', '-')}`);
    const navigate = async (page: Page, id: string) => {
      const response = await page.goto(urlFor(id), { waitUntil: 'domcontentloaded' });
      if (response && [401, 403, 404, 429].includes(response.status())) {
        blocked = true;
        record.httpStatus = response.status();
        record.next = [401, 403].includes(response.status()) ? loginNext
          : 'Resolve file access or rate limits before starting a new intake; do not retry automatically.';
        throw new Error(`Browser access or rate-limit denial (HTTP ${response.status()}); workers stopped.`);
      }
      const location = new URL(page.url());
      if (!['www.figma.com', 'figma.com'].includes(location.hostname) || !/^\/(design|file)\//.test(location.pathname)) {
        blocked = true;
        record.next = loginNext;
        throw new Error('Editor access requires authentication or file permission; workers stopped.');
      }
    };
    const initial = await newPage();
    await navigate(initial, identity.nodeId);
    await fs.mkdir(path.join(root, 'context'));
    if (!args.recipe) {
      // Inspect once in the requested mode. The host derives selectors from this evidence.
      await initial.waitForLoadState('load');
      if (args.inspectReady) await initial.locator(args.inspectReady).waitFor({ state: 'visible' });
      const aria = await initial.locator('body').ariaSnapshot({ depth: 20 });
      await fs.writeFile(path.join(root, 'context/editor-aria.txt'), aria.slice(0, 300_000), { flag: 'wx' });
      const controls = await initial.locator('[data-testid], [role=treeitem], [aria-selected=true], input:not([type=password]):not([type=hidden]), button').evaluateAll(elements => elements.slice(0, 2000).map(element => ({
        tag: element.tagName, role: element.getAttribute('role'), testId: element.getAttribute('data-testid'),
        label: element.getAttribute('aria-label'), text: (element as HTMLElement).innerText?.slice(0, 200),
        attributes: Array.from(element.attributes).filter(attribute => /^(data-(node|layer|parent)-id|aria-(selected|expanded|level))$/.test(attribute.name)).map(attribute => [attribute.name, attribute.value]),
      })));
      await writeJson(path.join(root, 'context/editor-controls.json'), controls);
      await initial.screenshot({ path: path.join(root, 'context/editor-diagnostic.png'), timeout: args.actionTimeoutMs });
      record.status = 'inspected';
      record.next = 'Derive an acquisition-only recipe from observed controls, then use a NEW output directory. If node identity cannot be verified, use PNG or the paired plugin instead.';
      return await finish();
    }
    const recipe = args.recipe;
    const open = async (page: Page) => {
      await page.locator(recipe.ready).waitFor({ state: 'visible' });
      await clickAll(page, recipe.prepare, identity.nodeId);
      await verifySelection(page, recipe, identity.nodeId, identity.fileKey);
    };
    await open(initial); // Validate access and recipe once before loading more editors.
    const discovered: { nodeId: string | null; parentId: string | null; label: string }[] = [];
    if (recipe.layers) {
      const layers = recipe.layers;
      await initial.locator(layers.selector).first().waitFor({ state: 'visible' });
      record.visibleLayersTruncated = await initial.locator(layers.selector).count() > 2000;
      const visible = await initial.locator(layers.selector).evaluateAll((elements, attributes) => elements.slice(0, 2000).map(element => ({
        nodeId: element.getAttribute(attributes.idAttribute), parentId: attributes.parentAttribute ? element.getAttribute(attributes.parentAttribute) : null,
        label: ((element as HTMLElement).innerText || element.getAttribute('aria-label') || '').slice(0, 1000),
      })), layers);
      discovered.push(...visible);
      await writeJson(path.join(root, 'context/visible-layers.json'), { coverage: 'observed-ui-only; collapsed and virtualized rows may be absent', rows: visible });
    }
    // Discover only IDs whose observed parent chain reaches the requested frame.
    // Merely appearing in the sidebar does not establish scope.
    if (args.discoverChildren && recipe.layers?.parentAttribute) {
      const children = new Map<string, string[]>();
      for (const row of discovered) {
        const child = row.nodeId?.replace(/-/g, ':'), parent = row.parentId?.replace(/-/g, ':');
        if (!nodeId.safeParse(child).success || !nodeId.safeParse(parent).success) continue;
        const list = children.get(parent!) ?? [];
        list.push(child!); children.set(parent!, list);
      }
      const scoped = [identity.nodeId], visited = new Set(scoped), omitted: string[] = [];
      for (let index = 0; index < scoped.length; index++) {
        for (const child of children.get(scoped[index]!) ?? []) {
          if (visited.has(child)) continue;
          visited.add(child); scoped.push(child);
          if (results.has(child)) continue;
          if (ids.length >= args.maxNodes) { omitted.push(child); continue; }
          ids.push(child); results.set(child, { nodeId: child, status: 'not-run' });
        }
      }
      record.discovery = { status: 'observed-parent-chains-only', scopedNodeIds: scoped, omittedNodeIds: omitted, truncated: omitted.length > 0 };
    }
    record.requestedNodes = ids;
    record.discoveredRows = discovered.length;
    let cursor = 0;
    const collect = async (page: Page, id: string) => {
      const began = performance.now(), panels: PanelResult[] = [];
      const directory = path.join(root, 'context', id.replace(':', '-'));
      await fs.mkdir(directory);
      try {
        if (id !== identity.nodeId) {
          if (recipe.select) await page.locator(template(recipe.select, id)).click();
          else { await navigate(page, id); await page.locator(recipe.ready).waitFor({ state: 'visible' }); }
        }
        await verifySelection(page, recipe, id, identity.fileKey);
        for (const panel of recipe.panels) {
          try {
            await clickAll(page, panel.open, id);
            await verifySelection(page, recipe, id, identity.fileKey);
            const evidence = await readPanel(page, template(panel.selector, id));
            await verifySelection(page, recipe, id, identity.fileKey);
            const file = path.join(directory, `${panel.name}.json`);
            const body = { sourceKind: 'figma-browser-ui', nodeId: id, panel: panel.name, capturedAt: new Date().toISOString(), ...evidence };
            await writeJson(file, body);
            panels.push({ name: panel.name, status: 'collected', path: path.relative(root, file), sha256: sha256(await fs.readFile(file)) });
          } catch {
            panels.push({ name: panel.name, status: 'failed', error: 'Panel unavailable, selection changed, or deadline reached. No other node properties were substituted.' });
          }
          if (expired || blocked) break;
        }
        if (id === identity.nodeId && recipe.export && !expired && !blocked) {
          try {
            await clickAll(page, recipe.export.prepare, id);
            await verifySelection(page, recipe, id, identity.fileKey);
            const [download] = await Promise.all([
              page.waitForEvent('download', { timeout: args.actionTimeoutMs }),
              page.locator(template(recipe.export.button, id)).click(),
            ]);
            const downloadPath = await download.path();
            if (!downloadPath) throw new Error('Missing download');
            const size = (await fs.stat(downloadPath)).size;
            if (size > 32 * 1024 * 1024) throw new Error('Oversized PNG');
            const bytes = await fs.readFile(downloadPath);
            const image = sharp(bytes, { limitInputPixels: 64_000_000 });
            const info = await image.metadata();
            if (info.format !== 'png' || !info.width || !info.height || (info.pages ?? 1) !== 1) throw new Error('Not a single PNG');
            await image.raw().toBuffer();
            await verifySelection(page, recipe, id, identity.fileKey);
            await fs.mkdir(path.join(root, 'frames'));
            await fs.writeFile(path.join(root, 'frames/reference.png'), bytes, { flag: 'wx' });
            record.frame = { status: 'acquired', path: 'frames/reference.png', width: info.width, height: info.height, sha256: sha256(bytes) };
            record.profileStatus = 'needs-review'; // Pixel dimensions cannot establish logical viewport/export scale.
          } catch {
            record.frame = { status: 'failed', error: 'Requested PNG export unavailable, invalid, or selection changed; editor screenshot was not substituted.' };
          }
        }
        results.set(id, { nodeId: id, status: panels.every(panel => panel.status === 'collected') && panels.length === recipe.panels.length ? 'collected' : 'failed', panels, elapsedMs: Math.round(performance.now() - began) });
      } catch {
        results.set(id, { nodeId: id, status: 'failed', panels, error: 'Requested node could not be selected and verified; no retry or old evidence used.', elapsedMs: Math.round(performance.now() - began) });
      }
    };
    const worker = async (page: Page) => {
      while (!expired && !blocked) {
        const id = ids[cursor++];
        if (!id) break;
        activeWorkers++; peakWorkers = Math.max(peakWorkers, activeWorkers);
        try { await collect(page, id); }
        finally { activeWorkers--; }
      }
    };
    const workers = [worker(initial)];
    for (let index = 1; index < Math.min(concurrency, ids.length); index++) {
      workers.push((async () => {
        const page = await newPage();
        await navigate(page, identity.nodeId);
        await open(page);
        await worker(page);
      })());
    }
    // Drain all workers even after setup failure, before closing contexts or finalizing evidence.
    const settled = await Promise.allSettled(workers);
    record.workerSetupFailures = settled.filter(result => result.status === 'rejected').length;
    record.status = [...results.values()].some(result => result.status === 'collected') ? 'partial' : 'failed';
    if (expired) record.error = 'Overall deadline reached; unfinished nodes retained as not-run/failed.';
    return await finish();
  } catch (error) {
    record.status = 'failed';
    // Playwright exceptions can contain cookies, signed URLs, selectors and page text. Never echo them.
    record.error = expired ? 'Overall deadline reached; unfinished nodes retained as not-run/failed.'
      : error instanceof Error && /^(Browser unavailable|Cannot read browser authentication|Browser intake deadline|Browser access or rate-limit|Editor access requires)/.test(error.message)
        ? error.message : 'Browser intake failed or the observed UI recipe did not match. No automatic foreground fallback or repeated login attempt was made.';
    await finish();
    throw new Error(`${record.error} Evidence: ${path.join(root, 'intake.json')}`);
  } finally {
    clearTimeout(timer);
    await Promise.allSettled([...contexts].map(context => context.close()));
    await browser?.close().catch(() => {});
  }

  async function finish() {
    record.nodes = [...results.values()];
    record.peakWorkers = peakWorkers;
    record.elapsedMs = Math.round(performance.now() - started);
    if (!record.frame) record.frame = { status: 'missing' };
    await writeJson(path.join(root, 'intake.json'), record);
    return { root, ...record, status: String(record.status) };
  }
}
