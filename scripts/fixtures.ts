import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { writeJson } from '../src/io.js';
import { VisualSpecSchema } from '../src/schema.js';
process.env.FONTCONFIG_FILE = path.resolve('fixtures/fonts/fonts.conf');
const out = path.resolve('fixtures/screens');
await fs.mkdir(out, { recursive: true });
const regular = path.resolve('fixtures/fonts/Lato-Regular.ttf'), bold = path.resolve('fixtures/fonts/Lato-Bold.ttf');
const scenes = [
  ['typography', 'Typography', 'Weights, baselines and line height.', 'text'],
  ['nested-layout', 'Everything in place', 'Nested groups need measured spacing.', 'layout'],
  ['wrapping', 'Words need room', 'Long labels should wrap cleanly\nwithout changing their meaning.', 'text'],
  ['scrolling', 'Your activity', 'A long list preserves row spacing.', 'layout'],
  ['images', 'A window outside', 'Original assets preserve detail.', 'asset'],
  ['icons', 'Small details matter', 'A missing icon can hide in a score.', 'asset'],
  ['gradients', 'Color in motion', 'Direction and stops both matter.', 'decoration'],
  ['shadows', 'A little depth', 'Blur and spread change the silhouette.', 'decoration'],
  ['clipping', 'Inside the frame', 'Rounded corners should clip content.', 'decoration'],
  ['components', 'Build it once', 'Repeated cards share a component.', 'layout'],
  ['variants', 'Choose your plan', 'Selected states are part of the design.', 'control'],
  ['complete-screen', 'Design, measured.', 'A screenshot is the reference.\nFlutter widgets make it work.', 'decoration'],
] as const;
const manifest = [];
for (const [index, [id, title, subtitle, kind]] of scenes.entries()) {
  const rows = id === 'scrolling' ? Array.from({length:8},(_,i)=>`<rect x="24" y="${240+i*72}" width="342" height="56" rx="12" fill="${i%2?'#e6edf7':'#ffffff'}"/><circle cx="52" cy="${268+i*72}" r="12" fill="#635bff"/>`).join('') : id === 'components' || id === 'nested-layout' ? '<rect x="24" y="240" width="160" height="180" rx="16" fill="#fff"/><rect x="206" y="240" width="160" height="180" rx="16" fill="#fff"/><rect x="24" y="444" width="342" height="110" rx="16" fill="#e6edf7"/>' : '';
  const art = id === 'icons' ? '<circle cx="195" cy="300" r="60" fill="#635bff"/><path d="M165 300 L185 320 L225 280" fill="none" stroke="white" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>' : id === 'images' ? '<rect x="24" y="220" width="342" height="200" rx="20" fill="#b8dff4"/><circle cx="310" cy="260" r="25" fill="#ffe8a3"/><path d="M24 420 L110 290 L210 420 L280 320 L366 420Z" fill="#2e8978"/>' : id === 'variants' ? '<rect x="24" y="220" width="342" height="100" rx="16" fill="#fff" stroke="#635bff" stroke-width="2"/><circle cx="335" cy="270" r="12" fill="#635bff"/><rect x="24" y="344" width="342" height="100" rx="16" fill="#fff" stroke="#d1d9e6"/>' : rows || `<rect x="24" y="220" width="342" height="180" rx="${id==='clipping'?48:20}" fill="url(#gradient)" ${id==='shadows'?'filter="url(#shadow)"':''}/><circle cx="195" cy="310" r="32" fill="white" fill-opacity=".85"/>`;
  const svg = `<svg width="390" height="844" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="gradient" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#635bff"/><stop offset="1" stop-color="#2aa7c9"/></linearGradient><filter id="shadow" x="-25%" y="-25%" width="150%" height="150%"><feDropShadow dx="0" dy="8" stdDeviation="8" flood-color="#17243b" flood-opacity=".25"/></filter></defs><rect width="390" height="844" fill="#f5f7fb"/>${art}<rect x="24" y="760" width="342" height="52" rx="26" fill="#635bff"/></svg>`;
  const composites: sharp.OverlayOptions[] = [];
  for (const [text, size, top, color, fontfile, weight] of [[title,28,64,'#17243b',bold,'Bold'],[subtitle,16,114,'#52617a',regular,''],['Start comparing',16,777,'#ffffff',bold,'Bold']] as const) {
    const markup = `<span foreground="${color}">${text}</span>`;
    const rendered = await sharp({ text: { text: markup, font: `Lato ${weight} ${size}`, fontfile, dpi: 72, rgba: true } }).png().toBuffer({resolveWithObject:true});
    composites.push({input:rendered.data,left:text==='Start comparing'?Math.round((390-rendered.info.width)/2):24,top});
  }
  const reference = path.join(out, `${id}.png`);
  await sharp(Buffer.from(svg)).composite(composites).png().toFile(reference);
  const mainBounds = id === 'icons' ? {x:135,y:240,width:120,height:120} : id === 'variants' ? {x:24,y:220,width:342,height:224} : id==='scrolling' ? {x:24,y:240,width:342,height:56} : id==='components'||id==='nested-layout'?{x:24,y:240,width:342,height:180}:{x:24,y:220,width:342,height:180};
  const spec = VisualSpecSchema.parse({version:1,regions:[
    {id:'heading',kind:'text',bounds:{x:24,y:64,width:342,height:34},confidence:'high',provenance:'Controlled synthetic reference coordinates, not extracted Figma data',text:title},
    {id:'subtitle',kind:'text',bounds:{x:24,y:114,width:342,height:subtitle.includes('\n')?44:24},confidence:'high',provenance:'Controlled reference coordinates',text:subtitle},
    {id:'subject',kind:kind==='text'?'decoration':kind,bounds:mainBounds,confidence:'high',provenance:'Controlled reference coordinates'},
    {id:'cta',kind:'control',bounds:{x:24,y:760,width:342,height:52},confidence:'high',provenance:'Controlled reference coordinates'},
  ],layoutNotes:['390×844 logical viewport, export scale 1. Lato Regular and Bold. App content excludes system chrome.','Reference region rectangles are specimen design boxes; a generated widget should register these boxes rather than glyph-ink bounds.'],uncertainties:[]});
  await writeJson(path.join(out,`${id}.visual-spec.json`),spec);
  manifest.push({id,index,reference:`screens/${id}.png`,spec:`screens/${id}.visual-spec.json`,width:390,height:844,fonts:['fonts/Lato-Regular.ttf','fonts/Lato-Bold.ttf'],source:'synthetic screenshot specimen'});
}
await writeJson(path.resolve('fixtures/manifest.json'),{version:1,purpose:'Curated screenshot inputs for agent evaluation. These are not claims of generated Flutter fidelity.',cases:manifest});
console.log(`Generated ${manifest.length} screenshot fixtures in ${out}`);
