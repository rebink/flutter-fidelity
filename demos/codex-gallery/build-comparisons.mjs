import sharp from 'sharp';import fs from 'node:fs/promises';import path from 'node:path';import{fileURLToPath}from'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
for(const id of ['simple','complex','advanced']){
 const run=path.join(root,'runs',id,'android');const r=JSON.parse(await fs.readFile(path.join(run,'report/comparison.json'),'utf8'));const reference=path.join(root,'design',id+'.png');const actual=path.join(run,'capture/actual.png');
 for(const p of [reference,actual]){const m=await sharp(p).metadata();if(m.width!==390||m.height!==844)throw Error('Comparison dimensions changed');}
 const percent=(100*r.metric.tolerantRatio).toFixed(3);const frame=Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="830" height="922"><rect width="830" height="922" fill="#151b28"/><g font-family="sans-serif" fill="white" font-size="17"><text x="20" y="30">Codex design · ${id}</text><text x="430" y="30">Flutter · Android</text></g><g font-family="sans-serif" fill="#b9c2d5" font-size="12"><text x="20" y="910">Original design PNG • unchanged reference</text><text x="430" y="910">${percent}% tolerant mismatch • gate ${r.status}</text></g></svg>`);
 await sharp(frame).composite([{input:reference,left:20,top:48},{input:actual,left:430,top:48}]).png().toFile(path.join(root,'artifacts',id+'-comparison.png'));
 await fs.copyFile(actual,path.join(root,'artifacts',id+'-android.png'));await fs.cp(path.join(run,'report'),path.join(root,'artifacts',id+'-report'),{recursive:true});
}
