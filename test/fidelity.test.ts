import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { importReference, loadReference, inspectReference, cropAsset } from '../src/reference.js';
import { compareUI } from '../src/compare.js';
import { recordIteration } from '../src/repair.js';
import { CaptureSchema } from '../src/schema.js';
import { writeJson, hash } from '../src/io.js';
import { createServer } from '../src/mcp.js';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';

const font = path.resolve('fixtures/fonts/Lato-Regular.ttf');
async function fixture(t: { after: (fn: () => Promise<void>) => void }, options: { fonts?: boolean; confidence?: string } = {}) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'flutter-fidelity-test-')); t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const reference = path.join(dir, 'input.png');
  const raw = new Uint8Array(100 * 100 * 4).fill(255);
  for (let y = 20; y < 30; y++) for (let x = 20; x < 30; x++) { const i = (y * 100 + x) * 4; raw[i] = 20; raw[i+1] = 60; raw[i+2] = 220; }
  await sharp(raw, { raw: { width: 100, height: 100, channels: 4 } }).png().toFile(reference);
  const spec = { version: 1, regions: [{ id: 'icon', kind: 'asset', bounds: { x: 20, y: 20, width: 10, height: 10 }, confidence: options.confidence ?? 'high', provenance: 'Known fixture bounds', required: true }], uncertainties: [] };
  const bundleDir = path.join(dir, 'bundle');
  const { bundle } = await importReference({ image: reference, out: bundleDir, width: 100, height: 100, confirmed: true, fonts: options.fonts === false ? [] : [font], spec });
  const capture = CaptureSchema.parse({ version: 1, profile: bundle.profile, mode: 'widget', platform: 'widget-test', flutterVersion: 'test', createdAt: new Date().toISOString(), referenceSha256: bundle.reference.sha256, imageSha256: await hash(reference), fontSha256: bundle.fonts.map(f=>f.sha256), fontsLoaded: options.fonts !== false, settled: true, runtimeErrors: [], regions: [{ id: 'icon', bounds: spec.regions[0]!.bounds }], checks: { analysis: 'passed', interactions: 'not-run', accessibility: 'not-run', responsive: 'not-run' } });
  const captureFile = path.join(dir, 'capture.json'); await writeJson(captureFile, capture);
  return { dir, reference, raw, bundleDir, capture, captureFile, spec };
}
async function mutate(f: Awaited<ReturnType<typeof fixture>>, name: string, fn: (raw: Uint8Array) => void) {
  const raw = new Uint8Array(f.raw); fn(raw); const file = path.join(f.dir, `${name}.png`);
  await sharp(raw, { raw: { width: 100, height: 100, channels: 4 } }).png().toFile(file); f.capture.imageSha256=await hash(file); await writeJson(f.captureFile,f.capture); return file;
}
test('exact identical pixels pass with geometry/font/environment evidence', async t => {
  const f = await fixture(t); const { report } = await compareUI({ bundle: f.bundleDir, actual: f.reference, capture: f.captureFile, out: path.join(f.dir, 'report') });
  assert.equal(report.status, 'passed'); assert.equal(report.exactPixelEquality, true); assert.equal(report.metric.ssim, 1);
  assert.equal(report.regions[0]!.geometryError, 0);
  assert.match(await fs.readFile(path.join(f.dir, 'report/index.html'), 'utf8'), /Toggle blink/);
});
test('a missing small icon fails region gate even if whole screen passes', async t => {
  const f = await fixture(t); const image = await mutate(f, 'missing-icon', raw => { for (let y=20;y<30;y++) for(let x=20;x<30;x++) { const i=(y*100+x)*4; raw[i]=raw[i+1]=raw[i+2]=255; } });
  const { report } = await compareUI({ bundle: f.bundleDir, actual: image, capture: f.captureFile, out: path.join(f.dir,'report') });
  assert.ok(report.metric.tolerantRatio <= 0.01); assert.equal(report.status,'failed'); assert.equal(report.regions[0]!.status,'failed');
});
test('geometry and text gates catch differences independently of pixel scores', async t => {
  const f = await fixture(t);
  await inspectReference(f.bundleDir, { ...f.spec, regions: [{ ...f.spec.regions[0], kind: 'text', text: 'Hello' }] });
  f.capture.regions[0]!.bounds.x += 2; f.capture.regions[0]!.text = 'Hell0'; await writeJson(f.captureFile,f.capture);
  const { report } = await compareUI({ bundle:f.bundleDir,actual:f.reference,capture:f.captureFile,out:path.join(f.dir,'report') });
  assert.equal(report.exactPixelEquality,true); assert.equal(report.status,'failed'); assert.equal(report.regions[0]!.textMatches,false); assert.equal(report.regions[0]!.geometryError,2);
});
test('same pixels without capture metadata are incomplete',async t=>{
  const f=await fixture(t); const {report}=await compareUI({bundle:f.bundleDir,actual:f.reference,out:path.join(f.dir,'report')}); assert.equal(report.status,'incomplete');
});
test('missing fonts and low-confidence measurements cannot pass',async t=>{
  const f=await fixture(t,{fonts:false,confidence:'low'}); const {report}=await compareUI({bundle:f.bundleDir,actual:f.reference,capture:f.captureFile,out:path.join(f.dir,'report')}); assert.equal(report.status,'incomplete'); assert.ok(report.incomplete.some(s=>s.includes('font')));
});
test('unsettled paint and analyzer failure are surfaced',async t=>{
  const f=await fixture(t); f.capture.settled=false; f.capture.checks.analysis='failed'; await writeJson(f.captureFile,f.capture);
  const {report}=await compareUI({bundle:f.bundleDir,actual:f.reference,capture:f.captureFile,out:path.join(f.dir,'report')}); assert.equal(report.status,'failed'); assert.ok(report.incomplete.some(s=>s.includes('settled')));
});
test('dimension mismatch rejected rather than resized',async t=>{
  const f=await fixture(t); const image=path.join(f.dir,'small.png'); await sharp(f.reference).resize(99,100,{fit:'fill'}).toFile(image);
  await assert.rejects(compareUI({bundle:f.bundleDir,actual:image,out:path.join(f.dir,'report')}),/dimensions differ/);
});
test('aspect-ratio mismatch, unconfirmed viewport and out-of-bounds regions rejected',async t=>{
  const f=await fixture(t);
  await assert.rejects(importReference({image:f.reference,out:path.join(f.dir,'bad'),width:100,height:99,confirmed:true}),/aspect/);
  await assert.rejects(importReference({image:f.reference,out:path.join(f.dir,'bad'),width:100,height:100,confirmed:false}),/Confirm/);
  await assert.rejects(inspectReference(f.bundleDir,{...f.spec,regions:[{...f.spec.regions[0],bounds:{x:95,y:20,width:10,height:10}}]}),/outside/);
});
test('immutable references and duplicate output rejection',async t=>{
  const f=await fixture(t); const original=await fs.readFile(path.join(f.bundleDir,'original.png'));
  await assert.rejects(importReference({image:f.reference,out:f.bundleDir,width:100,height:100,confirmed:true}));
  await fs.appendFile(path.join(f.bundleDir,'reference.png'),'tamper'); await assert.rejects(loadReference(f.bundleDir),/integrity/);
  assert.deepEqual(await fs.readFile(path.join(f.bundleDir,'original.png')),original);
});
test('crop permits decorative asset and refuses text/control screenshot cheats',async t=>{
  const f=await fixture(t); const crop=await cropAsset(f.bundleDir,'icon',{x:20,y:20,width:10,height:10});
  assert.equal(crop.source,'crop'); assert.ok(crop.warnings.length); await loadReference(f.bundleDir);
  await inspectReference(f.bundleDir,{...f.spec,regions:[{...f.spec.regions[0],kind:'control'}]});
  await assert.rejects(cropAsset(f.bundleDir,'icon',{x:20,y:20,width:10,height:10}),/Only designated/);
});
test('mismatched capture identity and profile rejected',async t=>{
  const f=await fixture(t); f.capture.profile.locale='fr-FR'; await writeJson(f.captureFile,f.capture);
  await assert.rejects(compareUI({bundle:f.bundleDir,actual:f.reference,capture:f.captureFile,out:path.join(f.dir,'report')}),/profile/);
  f.capture.profile.locale='en-US'; f.capture.referenceSha256='0'.repeat(64); await writeJson(f.captureFile,f.capture);
  await assert.rejects(compareUI({bundle:f.bundleDir,actual:f.reference,capture:f.captureFile,out:path.join(f.dir,'report')}),/another reference/);
});
test('report escapes untrusted inferred text',async t=>{
  const f=await fixture(t); await inspectReference(f.bundleDir,{...f.spec,uncertainties:['<script>alert(1)</script>']});
  await compareUI({bundle:f.bundleDir,actual:f.reference,capture:f.captureFile,out:path.join(f.dir,'report')});
  const html=await fs.readFile(path.join(f.dir,'report/index.html'),'utf8'); assert.match(html,/&lt;script&gt;alert/); assert.ok(!html.includes('<script>alert(1)'));
});
test('repair budget stops on two stalled iterations and retains best report',async t=>{
  const f=await fixture(t); const session=path.join(f.dir,'session.json');
  const image=await mutate(f,'bad',raw=>raw.fill(0));
  for(let i=0;i<3;i++) { const out=path.join(f.dir,`report${i}`); await compareUI({bundle:f.bundleDir,actual:image,capture:f.captureFile,out}); const result=await recordIteration(session,out); if(i===2) {assert.equal(result.stop,true);assert.equal(result.bestReport,path.join(f.dir,'report0'));} }
});
test('MCP tools discoverable and harmless read call returns image + bundle',async t=>{
  const f=await fixture(t); const [clientTransport,serverTransport]=InMemoryTransport.createLinkedPair();
  const server=createServer(), client=new Client({name:'fidelity-test',version:'1.0.0'});
  await server.connect(serverTransport); await client.connect(clientTransport); t.after(async()=>{await client.close();await server.close();});
  const list=await client.listTools(); assert.ok(list.tools.some(t=>t.name==='capture_ui')); assert.ok(list.tools.some(t=>t.name==='record_iteration'));
  const result=await client.callTool({name:'inspect_reference',arguments:{bundle:f.bundleDir}}); assert.equal(result.isError,undefined); assert.equal((result.content as {type:string}[])[1]!.type,'image');
  const invalid=await client.callTool({name:'import_reference',arguments:{image:f.reference,out:path.join(f.dir,'invalid'),width:100,height:100,confirmed:false}}); assert.equal(invalid.isError,true);
});
test('policy v2 detects a missing pale card ignored by the global threshold', async t => {
  const f=await fixture(t);
  const pale=await mutate(f,'pale',raw=>{for(let y=20;y<30;y++)for(let x=20;x<30;x++){const i=(y*100+x)*4;raw[i]=245;raw[i+1]=247;raw[i+2]=251;}});
  // Make the reference a pale card on white; observed disappearance is white.
  const dir=path.join(f.dir,'pale-bundle');
  await importReference({image:pale,out:dir,width:100,height:100,confirmed:true,fonts:[font],spec:f.spec});
  const gone=await mutate(f,'gone',raw=>{for(let y=20;y<30;y++)for(let x=20;x<30;x++){const i=(y*100+x)*4;raw[i]=raw[i+1]=raw[i+2]=255;}});
  const {report}=await compareUI({bundle:dir,actual:gone,out:path.join(f.dir,'pale-report'),policy:{version:2}});
  assert.equal(report.metric.tolerantMismatch,0);assert.equal(report.regions[0]!.status,'failed');assert.equal(report.status,'failed');assert.equal(report.policy.version,2);
});
test('capture image hash prevents reusing metadata for a different PNG',async t=>{
  const f=await fixture(t);f.capture.imageSha256='0'.repeat(64);await writeJson(f.captureFile,f.capture);
  await assert.rejects(compareUI({bundle:f.bundleDir,actual:f.reference,capture:f.captureFile,out:path.join(f.dir,'bad-hash')}),/actual image/);
});
test('negative observed coordinates are reported as geometry errors',async t=>{
  const f=await fixture(t);f.capture.regions[0]!.bounds.x=-2;await writeJson(f.captureFile,f.capture);
  const {report}=await compareUI({bundle:f.bundleDir,actual:f.reference,capture:f.captureFile,out:path.join(f.dir,'negative')});assert.equal(report.status,'failed');assert.equal(report.regions[0]!.geometryError,22);
});
test('repair retains valid code over lower pixel error with failed analysis',async t=>{
  const f=await fixture(t), session=path.join(f.dir,'valid-session.json');
  f.capture.checks.interactions='passed'; f.capture.checks.accessibility='passed'; f.capture.checks.responsive='passed';
  const bad=await mutate(f,'bad-valid',raw=>raw.fill(0));const first=path.join(f.dir,'valid-code');await compareUI({bundle:f.bundleDir,actual:bad,capture:f.captureFile,out:first});await recordIteration(session,first);
  f.capture.imageSha256=await hash(f.reference);f.capture.checks.analysis='failed';await writeJson(f.captureFile,f.capture);
  const second=path.join(f.dir,'invalid-code');await compareUI({bundle:f.bundleDir,actual:f.reference,capture:f.captureFile,out:second});
  const result=await recordIteration(session,second);assert.equal(result.bestValidReport,first);
});
test('repair rejects regressing a passed region even with lower whole-screen error',async t=>{
  const f=await fixture(t),session=path.join(f.dir,'region-session.json');
  const outside=await mutate(f,'outside',raw=>{for(let y=60;y<90;y++)for(let x=60;x<90;x++){const i=(y*100+x)*4;raw[i]=raw[i+1]=raw[i+2]=0;}});
  const first=path.join(f.dir,'outside-report');await compareUI({bundle:f.bundleDir,actual:outside,capture:f.captureFile,out:first});await recordIteration(session,first);
  const inside=await mutate(f,'inside',raw=>{for(let y=20;y<30;y++)for(let x=20;x<30;x++){const i=(y*100+x)*4;raw[i]=raw[i+1]=raw[i+2]=255;}});
  const second=path.join(f.dir,'inside-report');await compareUI({bundle:f.bundleDir,actual:inside,capture:f.captureFile,out:second});
  const result=await recordIteration(session,second);assert.deepEqual(result.regressedRegions,['icon']);assert.equal(result.bestReport,first);
});
test('a full-screen crop is refused even when mislabeled as a decorative region',async t=>{
  const f=await fixture(t);await inspectReference(f.bundleDir,{...f.spec,regions:[{...f.spec.regions[0],bounds:{x:0,y:0,width:100,height:100}}]});
  await assert.rejects(cropAsset(f.bundleDir,'icon',{x:0,y:0,width:100,height:100}),/full screen/);
});


test('v3 separates visual fidelity and product acceptance without hiding failed or unrun checks', async t => {
  const f = await fixture(t);
  for (const state of ['not-run', 'failed', 'passed'] as const) {
    f.capture.checks.interactions = state; f.capture.checks.accessibility = 'passed'; f.capture.checks.responsive = 'passed';
    await writeJson(f.captureFile, f.capture);
    const {report} = await compareUI({bundle:f.bundleDir,actual:f.reference,capture:f.captureFile,out:path.join(f.dir,state)});
    assert.equal(report.policy.version,3); assert.equal(report.status,'passed');
    assert.equal(report.acceptance?.status,state === 'not-run' ? 'incomplete' : state);
    assert.equal(report.acceptance?.interactions,state);
    if (state === 'failed') {
      const legacy = await compareUI({bundle:f.bundleDir,actual:f.reference,capture:f.captureFile,out:path.join(f.dir,'legacy'),policy:{version:2}});
      assert.equal(legacy.report.status,'failed');
    }
  }
});

test('v3 distinguishes text content from overflow and legacy missing visibility', async t => {
  const f = await fixture(t);
  await inspectReference(f.bundleDir,{...f.spec,regions:[{...f.spec.regions[0],kind:'text',text:'Hello'}]});
  f.capture.regions[0]!.text='Hello';
  for(const visibility of [undefined,'overflow-detected','no-overflow-detected'] as const) {
    f.capture.regions[0]!.textVisibility=visibility;
    await writeJson(f.captureFile,f.capture);
    const {report}=await compareUI({bundle:f.bundleDir,actual:f.reference,capture:f.captureFile,out:path.join(f.dir,String(visibility))});
    assert.equal(report.regions[0]!.textMatches,true);
    assert.equal(report.status,visibility === undefined ? 'incomplete' : visibility === 'overflow-detected' ? 'failed' : 'passed');
  }
});

test('repair rewards required region and geometry progress with unchanged global pixels', async t => {
  const f=await fixture(t), session=path.join(f.dir,'progress.json');
  const second={...f.spec.regions[0]!,id:'second',bounds:{x:50,y:50,width:10,height:10}};
  await inspectReference(f.bundleDir,{...f.spec,regions:[f.spec.regions[0],second]});
  f.capture.regions.push({id:'second',bounds:{...second.bounds,x:54}});
  f.capture.regions[0]!.bounds.x=24;
  for (let i=0;i<3;i++) {
    if(i===1) f.capture.regions[0]!.bounds.x=20;
    if(i===2) f.capture.regions[1]!.bounds.x=52;
    await writeJson(f.captureFile,f.capture);
    const out=path.join(f.dir,`progress-${i}`);
    const {report}=await compareUI({bundle:f.bundleDir,actual:f.reference,capture:f.captureFile,out});
    assert.equal(report.metric.tolerantRatio,0); assert.equal(report.status,'failed');
    const result=await recordIteration(session,out);
    assert.equal(result.bestReport,out); assert.equal(result.stalled,0);
  }
});

test('MCP preserves explicit safeInsets in the imported reference profile', async t => {
  const f=await fixture(t); const [a,b]=InMemoryTransport.createLinkedPair();
  const server=createServer(), client=new Client({name:'insets-test',version:'1.0.0'});
  await server.connect(b); await client.connect(a); t.after(async()=>{await client.close();await server.close();});
  const out=path.join(f.dir,'insets');
  const safeInsets={top:24,right:0,bottom:16,left:0};
  const result=await client.callTool({name:'import_reference',arguments:{image:f.reference,out,width:100,height:100,confirmed:true,safeInsets}});
  assert.equal(result.isError,undefined);
  assert.deepEqual((await loadReference(out)).bundle.profile.safeInsets,safeInsets);
});
