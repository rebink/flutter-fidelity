import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {compareUI,recordIteration} from '../../dist/index.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const round=process.argv[2];
if (!/^[1-5]$/.test(round ?? '')) throw new Error('Specify round 1..5');
const run=path.join(root,'runs',`round-${round}`);
await fs.cp(path.join(root,'app/lib'),path.join(run,'checkpoint/lib'),{recursive:true,errorOnExist:true,force:false});
const result=await compareUI({bundle:path.join(root,'bundle'),
  actual:path.join(run,'capture/actual.png'),capture:path.join(run,'capture/capture.json'),
  out:path.join(run,'report')});
const session=await recordIteration(path.join(root,'runs/session.json'),path.join(run,'report'));
console.log(JSON.stringify({round,status:result.report.status,
  tolerantMismatch:result.report.metric.tolerantRatio,
  exactMismatch:result.report.metric.exactRatio,
  best:session.best+1,stop:session.stop,reason:session.reason,
  regions:result.report.regions.map(r=>({id:r.id,status:r.status,mismatch:r.metric.tolerantRatio,geometryError:r.geometryError})),
  failures:result.report.failures,incomplete:result.report.incomplete},null,2));
