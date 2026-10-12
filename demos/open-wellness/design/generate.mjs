import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=path.dirname(fileURLToPath(import.meta.url));
process.env.FONTCONFIG_FILE=path.resolve('fixtures/fonts/fonts.conf');
const fonts=path.resolve('fixtures/fonts');
for(const dark of [false,true]){
 const id=dark?'insights':'today';const ink=dark?'#edf3ff':'#18243a',muted=dark?'#a2b0c8':'#65738a',card=dark?'#141e33':'#ffffff',bg=dark?'#0b1324':'#f7f8fb';let art=[],texts=[];
 const rect=(x,y,w,h,c,r=20)=>art.push(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c}"/>`);
 const t=(s,x,y,size=16,color=ink,bold=false)=>texts.push({s,x,y,size,color,bold});
 rect(0,0,390,844,bg,0);t(dark?'Weekly insights':'Daily pulse',24,32,28,ink,true);t(dark?'Small habits. Meaningful progress.':'Monday, October 12',24,70,14,muted);
 rect(24,112,342,dark?112:196,'url(#hero)',24);
 if(!dark){t("Today's energy",44,133,16,'#ffffff',true);t('82',44,165,56,'#ffffff',true);t('A great day to move',44,239,14,'#ffffff');t('Your daily balance',44,270,12,'#e1ddff');art.push('<circle cx="298" cy="210" r="44" fill="none" stroke="#a79bff" stroke-width="9"/><circle cx="298" cy="210" r="44" fill="none" stroke="#fff" stroke-width="9" stroke-dasharray="226 277" transform="rotate(-90 298 210)" stroke-linecap="round"/>');t('82%',280,202,17,'#ffffff',true);
 rect(24,328,163,92,card);rect(203,328,163,92,card);t('Steps',40,344,13,muted);t('7,240',40,369,26,ink,true);t('Sleep',219,344,13,muted);t('7h 42m',219,369,26,ink,true);
 rect(24,444,342,180,card);t('Weekly activity',40,460,17,ink,true);const heights=[42,66,54,82,61,94,72];for(let i=0;i<7;i++){rect(44+i*43,576-heights[i],20,heights[i],i===5?'#6d58e8':'#dfd9ff',6);t(['M','T','W','T','F','S','S'][i],49+i*43,589,11,muted);}rect(24,648,342,80,card);t('Evening wind-down',40,665,16,ink,true);t('10 minutes for yourself',40,691,12,muted);rect(260,664,90,48,'#5d48d7',14);t('Start',288,681,14,'#ffffff',true);
 }else{t('Recovery score',44,131,14,'#d4ccff');t('94',44,157,40,'#ffffff',true);t('+12 this week',241,170,14,'#9ef0d0',true);rect(24,248,342,224,card);t('Recovery trend',40,266,17,ink,true);for(let i=0;i<3;i++)art.push(`<path d="M44 ${316+i*42}H346" stroke="#29344a" fill="none"/>`);art.push('<path d="M44 408 L84 375 L124 385 L166 339 L207 354 L249 313 L294 327 L346 301 L346 410 L44 410Z" fill="url(#area)"/><path d="M44 408 L84 375 L124 385 L166 339 L207 354 L249 313 L294 327 L346 301" stroke="#9e8cff" stroke-width="3" stroke-linejoin="round" fill="none"/>');for(let i=0;i<7;i++)t(['Mon','Tue','Wed','Thu','Fri','Sat','Sun'][i],44+i*45,432,11,muted);
 rect(24,496,163,108,card);rect(203,496,163,108,card);t('Active time',40,514,13,muted);t('4h 18m',40,540,26,ink,true);t('+18% this week',40,576,11,'#9ef0d0');t('Resting heart',219,514,13,muted);t('58 bpm',219,540,26,ink,true);t('In your usual range',219,576,11,muted);
 rect(24,628,342,100,card);t('Mindful minutes',40,647,16,ink,true);t('68 / 90',285,649,13,muted);rect(40,684,310,8,'#29344a',4);rect(40,684,234,8,'#9e8cff',4);t('Keep a little time for you',40,706,11,muted);
 }
 rect(24,752,342,64,card);for(let i=0;i<2;i++){const selected=dark?i===1:i===0;rect(40+i*163,760,147,48,selected?(dark?'#302747':'#ede8ff'):card,14);t(i?'Insights':'Today',83+i*157,777,14,selected?(dark?'#cfbfff':'#5d48d7'):muted,true);}
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="390" height="844"><defs><linearGradient id="hero"><stop stop-color="${dark?'#39285d':'#6b51e8'}"/><stop offset="1" stop-color="${dark?'#222943':'#438bdd'}"/></linearGradient><linearGradient id="area" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#9e8cff" stop-opacity=".25"/><stop offset="1" stop-color="#9e8cff" stop-opacity="0"/></linearGradient></defs>${art.join('')}</svg>`;
 await fs.writeFile(path.join(dir,id+'.svg'),svg);await fs.writeFile(path.join(dir,id+'.text.json'),JSON.stringify(texts,null,2));const layers=[];
 for(const a of texts){const {data}=await sharp({text:{text:`<span foreground="${a.color}">${a.s}</span>`,font:`Lato ${a.bold?'Bold ':''}${a.size}`,fontfile:path.join(fonts,a.bold?'Lato-Bold.ttf':'Lato-Regular.ttf'),dpi:72,rgba:true}}).png().toBuffer({resolveWithObject:true});layers.push({input:data,left:a.x,top:a.y});}
 await sharp(Buffer.from(svg)).composite(layers).png().toFile(path.join(dir,id+'.png'));
 const spec={version:1,regions:[{id:'hero',kind:'layout',bounds:{x:24,y:112,width:342,height:dark?112:196},confidence:'high',provenance:'Original controlled design rectangle',required:true},{id:'chart',kind:'decoration',bounds:{x:24,y:dark?248:444,width:342,height:dark?224:180},confidence:'high',provenance:'Original controlled design rectangle',required:true},{id:'navigation',kind:'control',bounds:{x:24,y:752,width:342,height:64},confidence:'high',provenance:'Original controlled design rectangle',required:true}],layoutNotes:['390 x 844 app-content benchmark; export ratio 1; independently rendered SVG and text reference.'],uncertainties:[],assets:[]};await fs.writeFile(path.join(dir,id+'.visual-spec.json'),JSON.stringify(spec,null,2));
}
