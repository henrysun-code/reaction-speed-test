// Targeted, repeatable workbook migration. Preserve designer timing/thresholds.
import XLSX from 'xlsx';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const file=path.join(root,'config/game_config.xlsx');
const wb=XLSX.readFile(file);
const rows=name=>XLSX.utils.sheet_to_json(wb.Sheets[name],{defval:''});
const rules=rows('Rules'),stimuli=rows('Stimuli'),assets=rows('Assets'),levels=rows('Levels');
const shapeById={target_01:'circle',target_02:'square',target_03:'triangle',target_04:'diamond',target_05:'cross'};
for(const s of stimuli)if(!s.shape)s.shape=shapeById[s.id]||'';
for(const r of rules){
 r.description=r.description.replaceAll('金色圓形','金色圖形');
 if(r.id==='forbid'){
  r.name='排除三角形';
  r.description='金色要點，三角形不能點；金色三角形也不能點。其他顏色不要點。';
  const condition=JSON.parse(r.condition);delete condition.forbiddenType;
  r.condition=JSON.stringify({...condition,targetType:'gold',forbiddenShape:'triangle'});
 }
}
for(const l of levels)if(l.ruleId==='forbid')l.name='排除三角形';
const variants=[
 ['square','方形','<rect x="18" y="18" width="64" height="64" rx="12"/>'],
 ['triangle','三角形','<path d="M50 12L90 84H10Z"/>'],
 ['diamond','菱形','<path d="M50 8L92 50 50 92 8 50Z"/>'],
 ['cross','十字','<path d="M37 12H63V37H88V63H63V88H37V63H12V37H37Z"/>']
];
for(const [shape,label,svg] of variants){
 const id=`gold-${shape}`;
 if(!stimuli.some(s=>s.id===`target_gold_${shape}`))stimuli.push({id:`target_gold_${shape}`,name:`金色${label}`,type:'gold',shape,image:id,enabled:true});
 if(!assets.some(a=>a.id===id))assets.push({id,category:'target',file:`${id}.svg`,enabled:true,description:`金色${label}`});
 const image=path.join(root,'assets/images/targets',`${id}.svg`);
 if(!fs.existsSync(image))fs.writeFileSync(image,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="#f6c453" stroke="#ffffff" stroke-width="2">${svg}</g></svg>`);
}
for(const [name,data] of Object.entries({Rules:rules,Stimuli:stimuli,Assets:assets,Levels:levels}))XLSX.utils.sheet_add_json(wb.Sheets[name],data,{origin:'A1'});
XLSX.writeFile(wb,file);
console.log('已更新顏色／形狀規則，保留既有關卡數值。');
