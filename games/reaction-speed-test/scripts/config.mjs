// Extend the existing Workspace converter with game-specific sheets, not a second parser.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import XLSX from 'xlsx';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const wb=XLSX.readFile(path.join(root,'config/game_config.xlsx'));
const extra={};for(const sheet of ['Levels','Rules','Stimuli','InfiniteMode']){if(!wb.Sheets[sheet])throw Error(`Sheet ${sheet}: 缺少工作表`);extra[sheet]=XLSX.utils.sheet_to_json(wb.Sheets[sheet],{defval:''});}
// Reuse validation while keeping tutorials out of fixed/daily/infinite pools.
const levelCount=extra.Levels.length,ruleCount=extra.Rules.length;
const tutorialRows=wb.Sheets.Tutorials?XLSX.utils.sheet_to_json(wb.Sheets.Tutorials,{defval:''}):[];
extra.Levels.push(...tutorialRows.map(({condition,...level})=>({secondaryRuleId:'',switchAtTrial:'',switchAtPercent:'',...level})));
extra.Rules.push(...tutorialRows.map(r=>({id:r.ruleId,name:r.name,description:'',condition:r.condition,ruleSwitch:''})));
const fail=(s,i,k,msg)=>{const offset=s==='Levels'?levelCount:s==='Rules'?ruleCount:Infinity;if(i>=offset){s='Tutorials';i-=offset;}throw Error(`Sheet ${s} Row ${i+2} Column ${k}: ${msg}`);};
for(const s of ['Levels','Rules','Stimuli']){const key=s==='Levels'?'levelId':'id',seen=new Set();extra[s].forEach((r,i)=>{if(!r[key]||seen.has(String(r[key])))fail(s,i,key,'缺少或重複 ID');seen.add(String(r[key]));});}
const types=new Set(extra.Stimuli.filter(s=>String(s.enabled).toLowerCase()==='true').map(s=>s.type));
const shapes=new Set(extra.Stimuli.filter(s=>String(s.enabled).toLowerCase()==='true').map(s=>s.shape));
extra.Stimuli.forEach((s,i)=>{if(!s.shape)fail('Stimuli',i,'shape','請填寫形狀，例如 circle/square/triangle');});
function check(c,i,depth=0){if(!c||typeof c!=='object'||Array.isArray(c)||depth>12)fail('Rules',i,'condition','無效規則');const keys=['targetType','forbiddenType','targetShape','forbiddenShape','allowedTypes','positionCondition','distractorCondition','compoundCondition'];for(const k of Object.keys(c))if(!keys.includes(k))fail('Rules',i,'condition',`未知條件 ${k}`);for(const k of ['targetType','forbiddenType'])if(c[k]&&!types.has(c[k]))fail('Rules',i,k,'未知刺激類型');for(const k of ['targetShape','forbiddenShape'])if(c[k]&&!shapes.has(c[k]))fail('Rules',i,k,'未知形狀');for(const k of ['allowedTypes'])if(c[k]&&(!Array.isArray(c[k])||!c[k].length||c[k].some(t=>!types.has(t))))fail('Rules',i,k,'無效刺激清單');if(c.positionCondition&&!['left','right'].includes(c.positionCondition))fail('Rules',i,'positionCondition','僅 left/right');if(c.distractorCondition&&!['absent','present'].includes(c.distractorCondition))fail('Rules',i,'distractorCondition','僅 absent/present');if(c.compoundCondition){if(!['all','any'].includes(c.compoundCondition.op)||!c.compoundCondition.conditions?.length)fail('Rules',i,'compoundCondition','需 op 與 conditions');c.compoundCondition.conditions.forEach(k=>check(k,i,depth+1));}}
extra.Rules.forEach((r,i)=>{try{r.condition=JSON.parse(r.condition);}catch{fail('Rules',i,'condition','必須是 JSON');}check(r.condition,i);if(r.ruleSwitch&&!extra.Rules.some(x=>x.id===r.ruleSwitch))fail('Rules',i,'ruleSwitch','不存在');});
const bool=(r,k,s,i)=>{if(!['true','false'].includes(String(r[k]).toLowerCase()))fail(s,i,k,'必須 TRUE/FALSE');r[k]=String(r[k]).toLowerCase()==='true';};
extra.Levels.forEach((r,i)=>{
 if(r.randomizeTargets===''||r.randomizeTargets===undefined)r.randomizeTargets=true;else bool(r,'randomizeTargets','Levels',i);
 for(const [k,fallback] of [['starAccuracy',.9],['starAverageMs',600]]){
  r[k]=r[k]===''||r[k]===undefined?fallback:Number(r[k]);
  if(!Number.isFinite(r[k])||(k==='starAccuracy'?(r[k]<=0||r[k]>1):r[k]<=0))fail('Levels',i,k,k==='starAccuracy'?'需大於 0 且不超過 1':'需大於 0 的毫秒數');
 }
});
extra.Levels.forEach((r,i)=>{r.levelId=String(r.levelId);for(const k of ['stimulusCount','timeLimit','minInterval','maxInterval','stimulusDuration','requiredAccuracy','targetRatio','distractorRatio']){if(r[k]===''||!Number.isFinite(Number(r[k])))fail('Levels',i,k,'必須數字');r[k]=Number(r[k]);}for(const k of ['requiredAccuracy','targetRatio','distractorRatio'])if(r[k]<0||r[k]>1)fail('Levels',i,k,'需介於 0–1');if(!Number.isInteger(r.stimulusCount)||r.stimulusCount<3||r.stimulusCount>500)fail('Levels',i,'stimulusCount','需 3–500 整數');if(r.minInterval<280||r.maxInterval<r.minInterval||r.stimulusDuration<300||r.timeLimit<=0)fail('Levels',i,'timeLimit/minInterval/stimulusDuration','時間範圍無效');for(const k of ['ruleId','secondaryRuleId'])if((k==='ruleId'||r[k])&&!extra.Rules.some(x=>x.id===r[k]))fail('Levels',i,k,'找不到規則');for(const k of ['randomPosition','countdownEnabled','enabled'])bool(r,k,'Levels',i);});
extra.Stimuli.forEach((r,i)=>bool(r,'enabled','Stimuli',i));
const settings=Object.fromEntries(XLSX.utils.sheet_to_json(wb.Sheets.GameSettings).map(r=>[r.key,r.value]));
const inf=Object.fromEntries(extra.InfiniteMode.map(r=>[r.key,r.value]));
if(inf.maxClickableRatio===undefined)inf.maxClickableRatio=.7;
if(!Number.isFinite(Number(inf.maxClickableRatio))||Number(inf.maxClickableRatio)>1||Number(inf.maxClickableRatio)<Number(inf.minClickableRatio))fail('InfiniteMode',0,'maxClickableRatio','需介於 minClickableRatio 與 1');
if(!extra.InfiniteMode.some(r=>r.key==='maxClickableRatio'))extra.InfiniteMode.push({key:'maxClickableRatio',value:inf.maxClickableRatio});
for(const k of ['historyLimit','inputGuardMs','countdownSeconds'])if(!Number.isInteger(Number(settings[k]))||Number(settings[k])<=0)fail('GameSettings',0,k,'需正整數');
if(!(Number(settings.positionMin)>=.15&&Number(settings.positionMin)<.5&&Number(settings.positionMax)>.5&&Number(settings.positionMax)<=.85))fail('GameSettings',0,'positionMin/positionMax','需涵蓋左右兩侧，範圍限 0.15–0.85');
if(!types.size)fail('Stimuli',0,'enabled','至少一個啟用刺激');
for(const k of ['minStimuli','maxStimuli','minInterval','maxInterval','stimulusDuration','timeLimit','recentSignatures','maxAttempts'])if(!Number.isFinite(Number(inf[k]))||Number(inf[k])<=0)fail('InfiniteMode',0,k,'需正數');
for(const k of ['targetRatio','distractorRatio','switchChance','minClickableRatio'])if(!Number.isFinite(Number(inf[k]))||Number(inf[k])<0||Number(inf[k])>1)fail('InfiniteMode',0,k,'需介於 0–1');
if(Number(inf.minClickableRatio)<=0||Number(inf.minStimuli)<3||Number(inf.maxStimuli)>500||Number(inf.minStimuli)>Number(inf.maxStimuli)||Number(inf.minInterval)<Number(settings.inputGuardMs)||Number(inf.maxInterval)<Number(inf.minInterval)||Number(inf.stimulusDuration)<300)fail('InfiniteMode',0,'範圍','生成上下限無效');
if(String(inf.ruleIds).split(',').some(id=>!extra.Rules.some(r=>r.id===id)))fail('InfiniteMode',0,'ruleIds','未知規則 ID');
if(Number(inf.timeLimit)*1000<Number(inf.maxStimuli)*(Number(inf.maxInterval)+Number(inf.stimulusDuration))+Number(settings.countdownSeconds)*1000)fail('InfiniteMode',0,'timeLimit','不足以完成最大刺激數量');
extra.Levels.forEach((r,i)=>{if(r.minInterval<Number(settings.inputGuardMs))fail('Levels',i,'minInterval','不可短於連點保護');if(r.switchAtTrial!==''&&(!Number.isInteger(Number(r.switchAtTrial))||Number(r.switchAtTrial)<1||Number(r.switchAtTrial)>=r.stimulusCount))fail('Levels',i,'switchAtTrial','需介於 1 與刺激數量減 1');if(r.switchAtPercent!==''&&!(Number(r.switchAtPercent)>0&&Number(r.switchAtPercent)<1))fail('Levels',i,'switchAtPercent','需介於 0 與 1 之間');});
const result=spawnSync(process.execPath,[path.join(root,'../../tools/xlsx-to-json/cli.js'),'--game',root],{stdio:'inherit'});if(result.status!==0)process.exit(result.status||1);
const file=path.join(root,'config/generated/game_config.json'),common=JSON.parse(fs.readFileSync(file,'utf8'));
extra.Stimuli.forEach((r,i)=>{if(r.enabled&&!common.Assets.some(a=>a.id===r.image&&String(a.enabled).toLowerCase()==='true'))fail('Stimuli',i,'image','需指向已啟用 Assets.id');});
const Tutorials=extra.Levels.splice(levelCount).map((level,i)=>({...level,condition:extra.Rules[ruleCount+i].condition}));
extra.Rules.splice(ruleCount);
const combined={...common,...extra,Tutorials};for(const out of ['config/generated/game_config.json','public/config/generated/game_config.json'])fs.writeFileSync(path.join(root,out),JSON.stringify(combined,null,2));
console.log('遊戲專用 Sheet 驗證完成。');

