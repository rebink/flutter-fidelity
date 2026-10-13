import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { importReference, cropAsset } from '../../dist/index.js';

const root = path.dirname(fileURLToPath(import.meta.url));
const scale = 887 / 400;
const assets = {
  trail: [29, 705, 831, 454],
  leaf: [41, 33, 44, 53],
  maya: [210, 379, 124, 124],
  leo: [385, 379, 124, 124],
  noor: [560, 379, 124, 124],
  alex: [733, 379, 124, 124],
  author: [49, 596, 94, 95],
  attendee_one: [53, 1565, 63, 63],
  attendee_two: [114, 1565, 63, 63],
  attendee_three: [177, 1565, 65, 63],
  mountain: [579, 1448, 267, 107],
};
function region(id, kind, bounds, text, confidence = 'high') {
  return { id, kind, bounds: { x: bounds[0], y: bounds[1],
    width: bounds[2], height: bounds[3] }, confidence,
    provenance: 'Assistant reviewed unchanged ImageGen PNG; logical widget boxes inferred from visible flow and pixel boundaries.',
    required: true, ...(text === undefined ? {} : {text}) };
}
const spec = {
  version: 1,
  regions: [
    region('masthead', 'layout', [18.5, 7, 363, 38]),
    region('heading', 'text', [18.5, 55, 363, 36], 'Your daily inspiration', 'medium'),
    region('subtitle', 'text', [18.5, 91.5, 363, 20], 'A little curiosity goes a long way.', 'medium'),
    region('filters', 'control', [18.5, 122.2, 350, 30.7]),
    region('stories', 'layout', [14.5, 166.9, 377, 79]),
    region('post', 'layout', [8.1, 259.75, 383.8, 369.3]),
    region('post_title', 'text', [21.7, 531.5, 356, 22], 'Take the scenic route.', 'medium'),
    region('post_caption', 'text', [21.7, 554.5, 356, 18], 'No signal. No rush. Just the trail ahead.', 'medium'),
    region('post_actions', 'control', [21.7, 595.5, 356, 28]),
    region('event', 'layout', [8.1, 637.65, 383.8, 103.27]),
    region('event_title', 'text', [23.5, 662.5, 222, 23], 'Sunday trail club', 'medium'),
    region('navigation', 'control', [0, 749.5, 400, 50.5]),
    ...Object.entries(assets).map(([id, [x,y,w,h]]) => ({
      ...region(id, 'asset', [x/scale,y/scale,w/scale,h/scale]),
      required: id === 'trail',
      notes: 'Isolated photo/artwork crop; baked edge/background pixels retained. No text or controls are rasterized.',
    })),
  ],
  layoutNotes: ['Flow-based scrollable feed with a fixed bottom navigation surface.',
    '400x800 logical benchmark profile, full uncropped 887x1774 PNG, zero safe insets, export ratio 2.2175.',
    'Photography and decorative artwork can be extracted; text/control implementation stays native Flutter.'],
  uncertainties: ['The generated raster supplies no original font bytes; bundled Lato is an explicitly selected inferred match, not proven exact source typography.',
    'Original icon vectors are unavailable; the delegated demo uses Flutter outline icons with their visual differences retained.',
    'Text layout-box bounds are inferred from visible ink and flow; medium confidence is preserved.',
    'ImageGen backgrounds contain subtle nonuniform raster color/texture not reproduced by flat Flutter fills.'],
  assets: [],
};
await fs.mkdir(path.join(root, 'app/assets/images'), {recursive: true});
await fs.mkdir(path.join(root, 'app/assets/fidelity_fonts'), {recursive: true});
const fonts = ['Lato-Regular.ttf', 'Lato-Bold.ttf'].map(name =>
  fileURLToPath(new URL(`../../fixtures/fonts/${name}`, import.meta.url)));
await importReference({image:path.join(root,'design/reference.png'),
  out:path.join(root,'bundle'),width:400,height:800,confirmed:true,fonts,spec});
for (const [id,[x,y,width,height]] of Object.entries(assets)) {
  const mapping = await cropAsset(path.join(root,'bundle'), id, {x,y,width,height});
  await fs.copyFile(path.join(root,'bundle',mapping.asset), path.join(root,'app/assets/images',`${id}.png`));
}
for (const font of fonts) await fs.copyFile(font, path.join(root,'app/assets/fidelity_fonts',path.basename(font)));
await fs.copyFile(fileURLToPath(new URL('../../fixtures/fonts/OFL.txt', import.meta.url)),path.join(root,'app/assets/fidelity_fonts/OFL.txt')).catch(async () => {
  const candidates=await fs.readdir(fileURLToPath(new URL('../../fixtures/fonts/',import.meta.url)));
  console.log('Font notice files:',candidates.filter(name=>/ofl|licen/i.test(name)));
});
await fs.copyFile(path.join(root,'bundle/visual-spec.json'),path.join(root,'design/visual-spec.json'));
console.log('Immutable reference bundle and isolated assets prepared.');
