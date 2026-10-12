import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { BundleSchema, ProfileSchema, RectSchema, VisualSpecSchema, type ReferenceBundle } from './schema.js';
import { assertRect, createOutput, hash, inside, json, writeJson } from './io.js';

export type ImportOptions = { image: string; out: string; width: number; height: number; confirmed: boolean; crop?: unknown; fonts?: string[]; assets?: string[]; spec?: unknown; locale?: string; textScale?: number; brightness?: 'light' | 'dark'; safeInsets?: { top: number; right: number; bottom: number; left: number } };
export async function importReference(options: ImportOptions) {
  if (!options.confirmed) throw new Error('Confirm inferred logical width, height and app-content crop before importing (--confirmed)');
  const image = path.resolve(options.image);
  const metadata = await sharp(image, { limitInputPixels: 64_000_000 }).metadata();
  if (metadata.format !== 'png' || !metadata.width || !metadata.height) throw new Error('Reference must be a PNG');
  const crop = RectSchema.parse(options.crop ?? { x: 0, y: 0, width: metadata.width, height: metadata.height });
  assertRect(crop, metadata.width, metadata.height, true);
  const profile = ProfileSchema.parse({ width: options.width, height: options.height, pixelRatio: crop.width / options.width, locale: options.locale, textScale: options.textScale, brightness: options.brightness, safeInsets: options.safeInsets });
  if (Math.abs(crop.height - profile.height * profile.pixelRatio) > 0.01) throw new Error('Reference and confirmed viewport have inconsistent aspect ratios; do not stretch');
  let spec = VisualSpecSchema.parse(options.spec ?? { version: 1, regions: [], uncertainties: ['Layout and typography must be inferred by the assistant and reviewed.'] });
  for (const r of spec.regions) assertRect(r.bounds, profile.width, profile.height);
  for (const file of [...(options.fonts ?? []), ...(options.assets ?? [])]) {
    if (!(await fs.stat(file)).isFile()) throw new Error(`Not a regular file: ${file}`);
  }
  for (const font of options.fonts ?? []) if (!/\.(ttf|otf)$/i.test(font)) throw new Error(`Use a Flutter-compatible TTF or OTF font: ${font}`);
  const out = await createOutput(options.out);
  try {
    await fs.copyFile(image, path.join(out, 'original.png'));
    await sharp(image).extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height }).toColourspace('srgb').png().toFile(path.join(out, 'reference.png'));
    async function copyFiles(files: string[], folder: string) {
      await fs.mkdir(path.join(out, folder));
      const names = new Set<string>();
      const result = [];
      for (const file of files) {
        const name = path.basename(file);
        if (names.has(name)) throw new Error(`Duplicate ${folder} basename: ${name}`);
        names.add(name);
        const relative = `${folder}/${name}`;
        await fs.copyFile(file, path.join(out, relative));
        result.push({ name, path: relative, sha256: await hash(path.join(out, relative)) });
      }
      return result;
    }
    const fonts = await copyFiles(options.fonts ?? [], 'fonts');
    const assets = await copyFiles(options.assets ?? [], 'assets');
    const bundle: ReferenceBundle = {
      version: 1, createdAt: new Date().toISOString(),
      original: { name: path.basename(image), path: 'original.png', sha256: await hash(path.join(out, 'original.png')) },
      reference: { name: 'reference.png', path: 'reference.png', sha256: await hash(path.join(out, 'reference.png')) },
      image: { width: crop.width, height: crop.height, crop }, profile, confirmed: true, fonts, assets,
      warnings: fonts.length ? [] : ['Required font files missing: typography verification is incomplete.'], spec: 'visual-spec.json',
    };
    await writeJson(path.join(out, 'bundle.json'), BundleSchema.parse(bundle));
    await writeJson(path.join(out, bundle.spec), spec);
    return { directory: out, bundle };
  } catch (error) { await fs.rm(out, { recursive: true, force: true }); throw error; }
}
export async function loadReference(directory: string) {
  const root = path.resolve(directory);
  const bundle = BundleSchema.parse(await json(await inside(root, 'bundle.json')));
  for (const file of [bundle.original, bundle.reference, ...bundle.fonts, ...bundle.assets]) {
    if (await hash(await inside(root, file.path)) !== file.sha256) throw new Error(`Bundle integrity failure: ${file.path}`);
  }
  const refMeta = await sharp(await inside(root, bundle.reference.path)).metadata();
  if (refMeta.width !== bundle.image.width || refMeta.height !== bundle.image.height) throw new Error('Bundle image dimensions do not match manifest');
  if (Math.abs(bundle.image.width - bundle.profile.width * bundle.profile.pixelRatio) > 0.01 || Math.abs(bundle.image.height - bundle.profile.height * bundle.profile.pixelRatio) > 0.01) throw new Error('Invalid bundle capture scale');
  const spec = VisualSpecSchema.parse(await json(await inside(root, bundle.spec)));
  for (const r of spec.regions) assertRect(r.bounds, bundle.profile.width, bundle.profile.height);
  for (const asset of spec.assets) await inside(root, asset.asset);
  return { root, bundle, spec };
}
export async function inspectReference(directory: string, proposedSpec?: unknown) {
  const current = await loadReference(directory);
  if (proposedSpec !== undefined) {
    const spec = VisualSpecSchema.parse(proposedSpec);
    for (const r of spec.regions) assertRect(r.bounds, current.bundle.profile.width, current.bundle.profile.height);
    for (const asset of spec.assets) await inside(current.root, asset.asset);
    // Preserve the prior interpretation; the original/reference PNGs are never rewritten.
    await fs.copyFile(path.join(current.root, current.bundle.spec), path.join(current.root, `visual-spec.${Date.now()}.json`), fs.constants.COPYFILE_EXCL);
    await writeJson(path.join(current.root, current.bundle.spec), spec);
    return { ...current, spec };
  }
  return current;
}
export async function suggestViewport(image: string) {
  const m = await sharp(image).metadata();
  if (m.format !== 'png' || !m.width || !m.height) throw new Error('Reference must be a PNG');
  const candidates = [1, 2, 3, 4].filter(scale => m.width! / scale >= 320 && m.width! / scale <= 500 && Number.isInteger(m.width! / scale) && Number.isInteger(m.height! / scale)).map(scale => ({ width: m.width! / scale, height: m.height! / scale, exportScale: scale }));
  return { imageWidth: m.width, imageHeight: m.height, candidates, confirmed: false, note: 'Image pixels do not determine logical size. Confirm dimensions and app-content crop with the developer.' };
}
export async function cropAsset(directory: string, id: string, cropInput: unknown) {
  const { root, bundle, spec } = await loadReference(directory);
  const region = spec.regions.find(r => r.id === id);
  if (!region || !['asset', 'decoration'].includes(region.kind)) throw new Error('Only designated asset/decoration regions may be cropped; text, controls and screens must remain real widgets');
  const crop = RectSchema.parse(cropInput);
  assertRect(crop, bundle.image.width, bundle.image.height, true);
  if (crop.x === 0 && crop.y === 0 && crop.width === bundle.image.width && crop.height === bundle.image.height) throw new Error('Cannot crop the full screen. Use original background assets and real widgets.');
  const expected = region.bounds, scale = bundle.profile.pixelRatio;
  if (Math.abs(crop.x / scale - expected.x) > 1 || Math.abs(crop.y / scale - expected.y) > 1 || Math.abs(crop.width / scale - expected.width) > 1 || Math.abs(crop.height / scale - expected.height) > 1) throw new Error('Crop must match the designated decorative region');
  await inside(root, 'assets'); // Reject a replaced asset-directory symlink before writing.
  const file = `assets/${id}-${Date.now()}.png`;
  await sharp(await inside(root, bundle.reference.path)).extract({ left: crop.x, top: crop.y, width: crop.width, height: crop.height }).png().toFile(path.join(root, file));
  const mapping = { regionId: id, asset: file, source: 'crop' as const, crop, warnings: ['Screenshot crop may contain baked-in background/shadows; verify at target sizes.'] };
  const updated = { ...spec, assets: [...spec.assets.filter(a => a.regionId !== id), mapping] };
  await inspectReference(directory, updated);
  bundle.assets.push({ name: path.basename(file), path: file, sha256: await hash(path.join(root, file)) });
  await writeJson(path.join(root, 'bundle.json'), bundle);
  return mapping;
}
