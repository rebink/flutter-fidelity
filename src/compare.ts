import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import pixelmatch from 'pixelmatch';
import { ssim } from 'ssim.js';
import { CaptureSchema, PolicySchema, type ComparisonReport, type Metric, type Rect, type RegionResult } from './schema.js';
import { createOutput, hash, inside, json, pixels, writeJson } from './io.js';
import { loadReference } from './reference.js';
import { writeReport } from './report.js';
import { copySourceCheckpoint } from './checkpoint.js';

function metric(a: Uint8Array, b: Uint8Array, width: number, height: number, threshold: number, diff?: Uint8Array): Metric {
  let exactMismatch = 0;
  for (let i = 0; i < a.length; i += 4) if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2] || a[i + 3] !== b[i + 3]) exactMismatch++;
  const tolerantMismatch = pixelmatch(a, b, diff, width, height, { threshold, includeAA: false });
  // SSIM downsampling disabled; tiny regions use an appropriately small window.
  const similarity = Math.min(width, height) >= 2 ? ssim({ data: new Uint8ClampedArray(a), width, height }, { data: new Uint8ClampedArray(b), width, height }, { windowSize: Math.min(11, width, height), downsample: 'original' }).mssim : (exactMismatch ? 0 : 1);
  return { pixels: width * height, exactMismatch, exactRatio: exactMismatch / (width * height), tolerantMismatch, tolerantRatio: tolerantMismatch / (width * height), ssim: Number.isFinite(similarity) ? similarity : 0 };
}
function slice(data: Uint8Array, width: number, rect: Rect) {
  const output = new Uint8Array(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y++) {
    const start = ((rect.y + y) * width + rect.x) * 4;
    output.set(data.subarray(start, start + rect.width * 4), y * rect.width * 4);
  }
  return output;
}
export async function compareUI(options: { bundle: string; actual: string; out: string; capture?: string; policy?: unknown }) {
  const { root, bundle, spec } = await loadReference(options.bundle);
  const policy = PolicySchema.parse(options.policy ?? {});
  const expected = await pixels(await inside(root, bundle.reference.path)), actual = await pixels(options.actual);
  if (actual.width !== expected.width || actual.height !== expected.height) throw new Error(`Image dimensions differ: expected ${expected.width}×${expected.height}, actual ${actual.width}×${actual.height}. Re-capture at the confirmed viewport/export scale; no automatic resize.`);
  const capture = options.capture ? CaptureSchema.parse(await json(options.capture)) : undefined;
  if (options.capture) {
    let incompleteRun = false;
    try { await fs.access(path.join(path.dirname(path.resolve(options.capture)), 'capture-incomplete.json')); incompleteRun = true; }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
    if (incompleteRun) throw new Error('Capture pipeline did not complete successfully; use a fresh run, not retained failure artifacts');
  }
  const failures: string[] = [], incomplete = [...bundle.warnings, ...spec.uncertainties];
  if (!spec.regions.some(r => r.required)) incomplete.push('No designated required regions; infer and review a visual specification first.');
  if (!capture) incomplete.push('Capture metadata missing: font loading, geometry and rendering environment are unverified.');
  if (capture) {
    if (JSON.stringify(capture.profile) !== JSON.stringify(bundle.profile)) throw new Error('Capture profile differs from the reference profile');
    if (capture.referenceSha256 !== bundle.reference.sha256) throw new Error('Capture belongs to another reference');
    if (capture.imageSha256 !== await hash(options.actual)) throw new Error('Capture metadata does not belong to this actual image');
    if (bundle.fonts.some(f => !capture.fontSha256.includes(f.sha256))) incomplete.push('Capture font hashes do not match the supplied font bundle.');
    if (new Set(capture.regions.map(r => r.id)).size !== capture.regions.length) throw new Error('Duplicate captured region IDs');
    if (!capture.fontsLoaded) incomplete.push('Required fonts were not loaded in the capture.');
    if (!capture.settled) incomplete.push('Capture was taken before fonts/images/painting settled.');
    failures.push(...capture.runtimeErrors.map(e => `Runtime: ${e}`));
    if (capture.checks.analysis === 'failed') failures.push('Static analysis failed');
    if (capture.checks.analysis === 'not-run') incomplete.push('Static analysis was not run.');
    if (policy.version === 2) for (const name of ['interactions', 'accessibility', 'responsive'] as const) {
      if (capture.checks[name] === 'failed') failures.push(`${name} checks failed`);
    }
  }
  const diff = new Uint8Array(expected.data.length);
  const screen = metric(expected.data, actual.data, expected.width, expected.height, policy.threshold, diff);
  if (screen.tolerantRatio > policy.screenMismatch) failures.push(`Whole-screen mismatch ${(screen.tolerantRatio * 100).toFixed(3)}% exceeds ${(policy.screenMismatch * 100).toFixed(3)}%`);
  const regions: RegionResult[] = spec.regions.map(region => {
    const scale = bundle.profile.pixelRatio;
    const left = Math.floor(region.bounds.x * scale), top = Math.floor(region.bounds.y * scale);
    const right = Math.min(expected.width, Math.ceil((region.bounds.x + region.bounds.width) * scale));
    const bottom = Math.min(expected.height, Math.ceil((region.bounds.y + region.bounds.height) * scale));
    const rect = { x: left, y: top, width: right - left, height: bottom - top };
    const value = metric(slice(expected.data, expected.width, rect), slice(actual.data, actual.width, rect), rect.width, rect.height, policy.regionThreshold);
    const observed = capture?.regions.find(r => r.id === region.id);
    const issues: string[] = [];
    let failed = value.tolerantRatio > policy.regionMismatch, unverified = region.confidence !== 'high';
    if (failed) issues.push('Region pixel mismatch exceeds policy');
    if (unverified) issues.push('Inferred bounds require review; confidence is not high');
    let geometryError: number | undefined, textMatches: boolean | undefined;
    if (!observed) { unverified = true; issues.push('Widget region was not measured'); }
    else {
      geometryError = Math.max(...(['x', 'y', 'width', 'height'] as const).map(key => Math.abs(observed.bounds[key] - region.bounds[key])));
      if (geometryError > policy.geometryTolerance) { failed = true; issues.push(`Geometry differs by ${geometryError.toFixed(2)} logical pixels`); }
      if (region.kind === 'text') {
        if (observed.text === undefined) { unverified = true; issues.push('Rendered text was not captured'); }
        else { textMatches = observed.text === region.text; if (!textMatches) { failed = true; issues.push('Visible text differs from reference transcription'); } }
        if (policy.version >= 3) {
          if (!observed.textVisibility || observed.textVisibility === 'unverified') { unverified = true; issues.push('Text overflow evidence is unavailable; content equality does not prove visibility'); }
          else if (observed.textVisibility === 'overflow-detected' && !region.allowTextOverflow) { failed = true; issues.push('Text overflow/clipping detected'); }
        }
      }
    }
    const status = failed ? 'failed' : unverified ? 'incomplete' : 'passed';
    if (region.required && status === 'failed') failures.push(`Region ${region.id}: ${issues.join('; ')}`);
    if (region.required && status === 'incomplete') incomplete.push(`Region ${region.id}: ${issues.join('; ')}`);
    return { id: region.id, required: region.required, textVisibility: observed?.textVisibility, bounds: region.bounds, metric: value, geometryError, textMatches, status, issues };
  });
  const out = await createOutput(options.out);
  try {
    if (capture?.sourceCheckpoint) await copySourceCheckpoint(path.join(path.dirname(path.resolve(options.capture!)), 'source-checkpoint/checkpoint.json'), path.join(out, 'source-checkpoint'), capture.sourceCheckpoint);
    const strict = new Uint8Array(diff.length);
    for (let i = 0; i < strict.length; i += 4) {
      const changed = expected.data[i] !== actual.data[i] || expected.data[i+1] !== actual.data[i+1] || expected.data[i+2] !== actual.data[i+2] || expected.data[i+3] !== actual.data[i+3];
      strict[i] = changed ? 255 : 240; strict[i+1] = changed ? 0 : 240; strict[i+2] = changed ? 64 : 240; strict[i+3] = 255;
    }
    await sharp(expected.data, { raw: { width: expected.width, height: expected.height, channels: 4 } }).png().toFile(path.join(out, 'reference.png'));
    await sharp(actual.data, { raw: { width: actual.width, height: actual.height, channels: 4 } }).png().toFile(path.join(out, 'actual.png'));
    await sharp(strict, { raw: { width: expected.width, height: expected.height, channels: 4 } }).png().toFile(path.join(out, 'strict-diff.png'));
    await sharp(diff, { raw: { width: expected.width, height: expected.height, channels: 4 } }).png().toFile(path.join(out, 'tolerant-diff.png'));
    // Average the normalized RGBA channels rather than changing geometry.
    const overlay = expected.data.map((v, i) => Math.round((v + actual.data[i]!) / 2));
    await sharp(overlay, { raw: { width: expected.width, height: expected.height, channels: 4 } }).png().toFile(path.join(out, 'overlay.png'));
    await fs.copyFile(path.join(root, bundle.spec), path.join(out, 'visual-spec.json'));
    const visual = failures.length ? 'failed' : incomplete.length ? 'incomplete' : 'passed';
    const checks = capture?.checks ?? { analysis: 'not-run', interactions: 'not-run', accessibility: 'not-run', responsive: 'not-run' };
    const acceptance = { visual, ...checks, status: visual === 'failed' || Object.values(checks).includes('failed') ? 'failed' : visual === 'incomplete' || Object.values(checks).includes('not-run') ? 'incomplete' : 'passed' } as NonNullable<ComparisonReport['acceptance']>;
    const report: ComparisonReport = {
      version: 2, acceptance, createdAt: new Date().toISOString(), scope: 'design-fidelity',
      status: failures.length ? 'failed' : incomplete.length ? 'incomplete' : 'passed',
      exactPixelEquality: screen.exactMismatch === 0, metric: screen, policy, profile: bundle.profile,
      referenceSha256: bundle.reference.sha256, actualSha256: await hash(options.actual), specSha256: await hash(path.join(root, bundle.spec)), capture,
      regions, failures, incomplete,
      artifacts: { reference: 'reference.png', actual: 'actual.png', strictDiff: 'strict-diff.png', tolerantDiff: 'tolerant-diff.png', overlay: 'overlay.png', html: 'index.html' },
    };
    await writeJson(path.join(out, 'comparison.json'), report);
    await writeReport(out, report);
    return { directory: out, report };
  } catch (error) { await fs.rm(out, { recursive: true, force: true }); throw error; }
}
