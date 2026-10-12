import { promises as fs } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import { z } from 'zod';
import { importReference } from '../src/reference.js';
import { compareUI } from '../src/compare.js';
import { json, writeJson } from '../src/io.js';
// Without a manifest, calibrate the comparator using deliberate defects. A
// separate agent-run manifest evaluates real captures, never synthetic metadata.
const manifestArg = process.argv.indexOf('--manifest');
const outputArg = process.argv.indexOf('--out');
const out = path.resolve(outputArg >= 0 ? process.argv[outputArg+1]! : `.fidelity/benchmark-${Date.now()}`);
await fs.mkdir(out,{recursive:true});
if (manifestArg >= 0) {
  const manifest = z.object({ runs: z.array(z.object({ approach: z.string().min(1), caseId: z.string().min(1), bundle: z.string(), actual: z.string(), capture: z.string(), rounds: z.number().int().nonnegative(), elapsedMs: z.number().nonnegative(), buildSucceeded: z.boolean(), maintainabilityNotes: z.string() })).min(1) }).parse(await json(process.argv[manifestArg+1]!));
  const results=[];
  for(const [i,run] of manifest.runs.entries()) {
    const result=await compareUI({...run,out:path.join(out,`run-${i}`)});
    results.push({...run,status:result.report.status,exactMismatch:result.report.metric.exactRatio,tolerantMismatch:result.report.metric.tolerantRatio,ssim:result.report.metric.ssim,report:result.directory});
  }
  await writeJson(path.join(out,'results.json'),{version:1,kind:'agent-evaluation',results});
  console.log(JSON.stringify({directory:out,runs:results.length},null,2));
} else {
  const manifest=await json('fixtures/manifest.json') as {cases:{id:string;reference:string;spec:string;width:number;height:number;fonts:string[]}[]};
  const results=[];
  for(const item of manifest.cases) {
    const reference=path.resolve('fixtures',item.reference), spec=await json(path.resolve('fixtures',item.spec)) as {regions:{id:string;bounds:{x:number;y:number;width:number;height:number}}[]};
    const directory=path.join(out,item.id);await fs.mkdir(directory);
    const bundle=path.join(directory,'bundle');
    await importReference({image:reference,out:bundle,width:item.width,height:item.height,confirmed:true,fonts:item.fonts.map(f=>path.resolve('fixtures',f)),spec});
    const subject=spec.regions.find(r=>r.id==='subject')!.bounds;
    const defective=path.join(directory,'defect.png');
    await sharp(reference).composite([{input:{create:{width:subject.width,height:subject.height,channels:4,background:'#f5f7fb'}},left:subject.x,top:subject.y}]).png().toFile(defective);
    const identical=await compareUI({bundle,actual:reference,out:path.join(directory,'identical')});
    const defect=await compareUI({bundle,actual:defective,out:path.join(directory,'defect')});
    const passed=identical.report.exactPixelEquality && identical.report.status==='incomplete' && defect.report.status==='failed';
    results.push({case:item.id,calibrationPassed:passed,identicalStatus:identical.report.status,defectStatus:defect.report.status,defectMismatch:defect.report.metric.tolerantRatio});
  }
  await writeJson(path.join(out,'results.json'),{version:1,kind:'comparator-calibration',note:'Identical images deliberately remain incomplete without real Flutter capture evidence. This does not benchmark agent generation accuracy.',results});
  const failures=results.filter(r=>!r.calibrationPassed); if(failures.length) process.exitCode=1;
  console.log(JSON.stringify({directory:out,passed:results.length-failures.length,total:results.length,kind:'comparator-calibration'},null,2));
}
