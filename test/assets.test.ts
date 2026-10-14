import { test } from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { validateAssets } from '../src/assets.js';
import { hash } from '../src/io.js';
import { loadReference } from '../src/reference.js';

test('batch validator decodes images/fonts, finds duplicates and retains partial failures', async t => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'fidelity-assets-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const font=path.resolve('fixtures/fonts/Lato-Regular.ttf'), png=path.resolve('fixtures/screens/complete-screen.png');
  const copy=path.join(root,'copy.png');await fs.copyFile(png,copy);
  const html=path.join(root,'login.png');await fs.writeFile(html,'<!doctype html><html>Sign in</html>');
  const fakeFont=path.join(root,'fake.ttf');await fs.writeFile(fakeFont,Buffer.from([0,1,0,0,0,1,0,0,0,0,0,0]));
  const svg=path.join(root,'icon.svg');await fs.writeFile(svg,'<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><defs><linearGradient id="g"><stop stop-color="red"/></linearGradient></defs><rect width="20" height="20" fill="url(#g)"/></svg>');
  const external=path.join(root,'external.svg');await fs.writeFile(external,'<svg xmlns="http://www.w3.org/2000/svg"><image href="https://example.invalid/a.png"/></svg>');
  const before=await hash(png);
  const result=await validateAssets([png,copy,font,svg,html,fakeFont,external,path.join(root,'missing.png')]);
  assert.equal(result.status,'incomplete');
  assert.deepEqual(result.files.map(f=>f.status),['validated','validated','validated','validated','invalid','invalid','invalid','invalid']);
  assert.equal(result.files[2]!.font?.family,'Lato');
  assert.deepEqual(result.duplicates[0]!.paths,[png,copy]);assert.equal(await hash(png),before);
});

test('CLI safe insets are validated and forwarded into the bundle', async t => {
  const root=await fs.mkdtemp(path.join(os.tmpdir(),'fidelity-cli-insets-'));t.after(()=>fs.rm(root,{recursive:true,force:true}));
  const out=path.join(root,'bundle');
  const args=['dist/cli.js','import-image','--image','fixtures/screens/complete-screen.png','--out',out,'--width','390','--height','844','--confirmed','--safe-insets','24,0,16,0'];
  execFileSync(process.execPath,args,{stdio:'pipe'});
  assert.deepEqual((await loadReference(out)).bundle.profile.safeInsets,{top:24,right:0,bottom:16,left:0});
  assert.throws(()=>execFileSync(process.execPath,[...args.slice(0,-1),'bad,0,0,0'],{stdio:'pipe'}));
});
