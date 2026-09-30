import type {Condition,Config,Level,Planned,Rule} from '../types/index';
import {evaluate} from './rules';

const COLOR_NAMES:Record<string,string>={gold:'金色',brown:'棕色',red:'紅色',blue:'藍色',green:'綠色',purple:'紫色'};
export const RULE_GUIDE='先符合全部必要條件，再至少符合一項達成條件，才可以點擊。\n不符合必要條件，或所有達成項目都不符合，就不要點。';
export const colorName=(type:string)=>COLOR_NAMES[type]??type;
export function productName(shape:string,config:Config){
 const s=config.stimuli.find(s=>s.enabled&&s.shape===shape);
 // Use the configured item name, removing only its ring prefix.
 return s?s.name.replace(/^(?:金色|棕色|紅色|藍色|綠色|紫色)(?:外圈)?(?:的)?/,'').replace(/\s*商品$/,'').trim():shape;
}
function clauses(c:Condition,config:Config):string[]{
 const parts:string[]=[];
 if(c.targetType)parts.push(`外圈是${colorName(c.targetType)}`);
 if(c.forbiddenType)parts.push(`外圈不是${colorName(c.forbiddenType)}`);
 if(c.allowedTypes)parts.push(`外圈是${c.allowedTypes.map(colorName).join('、')}其中一色`);
 if(c.targetShape)parts.push(`商品是 ${productName(c.targetShape,config)}`);
 if(c.forbiddenShape)parts.push(`商品不是 ${productName(c.forbiddenShape,config)}`);
 if(c.positionCondition)parts.push(`商品中心位於${c.positionCondition==='left'?'左':'右'}半邊`);
 if(c.distractorCondition)parts.push(c.distractorCondition==='absent'?'畫面沒有灰色星星':'畫面有灰色星星');
 return parts;
}
/** Each row is a complete way to qualify: OR between rows, AND within a row. */
export function clickAlternatives(c:Condition):Condition[][]{
 const {compoundCondition,...base}=c;
 const initial:Condition[][]=[Object.entries(base).map(([key,value])=>({[key]:value} as Condition))];
 if(!compoundCondition)return initial;
 const branches=compoundCondition.conditions.map(clickAlternatives);
 const alternatives=compoundCondition.op==='any'?branches.flat():branches.reduce<Condition[][]>((rows,next)=>rows.flatMap(row=>next.map(other=>[...row,...other])),[[]]);
 // Distribute outer AND conditions into every OR branch; never drop their scope.
 return initial.flatMap(row=>alternatives.map(other=>[...row,...other]));
}
const atomKey=(c:Condition)=>JSON.stringify(c,Object.keys(c).sort());
export function ruleRequirements(c:Condition){
 const rows=clickAlternatives(c).map(row=>[...new Map(row.map(atom=>[atomKey(atom),atom])).values()]);
 const unique=[...new Map(rows.map(row=>[row.map(atomKey).sort().join('|'),row])).values()];
 const common=(unique[0]||[]).filter(atom=>unique.every(row=>row.some(other=>atomKey(other)===atomKey(atom))));
 // A lone positive goal belongs in the achievement section. Shared restrictions
 // (position, star state or exclusions) belong before it as necessary conditions.
 const necessary=common.filter(atom=>unique.length>1||atom.positionCondition||atom.distractorCondition||atom.forbiddenType||atom.forbiddenShape);
 const mandatory=new Set(necessary.map(atomKey));
 return {necessary,alternatives:unique.map(row=>row.filter(atom=>!mandatory.has(atomKey(atom))))};
}
export function describeCondition(c:Condition,config:Config):string{
 const rows=clickAlternatives(c).map(row=>row.flatMap(atom=>clauses(atom,config)));
 if(rows.some(row=>!row.length))return '所有商品都要點。';
 const {necessary,alternatives}=ruleRequirements(c);
 const numbered=(parts:string[])=>parts.map((part,i)=>`${i+1}. ${part}`).join('\n');
 const sections:string[]=[];
 if(necessary.length)sections.push(`必要條件：\n${numbered(necessary.flatMap(atom=>clauses(atom,config)))}`);
 const goals=alternatives.map(row=>row.flatMap(atom=>clauses(atom,config)));
 const scopeNote=(row:Condition[])=>{
  const scope=[...necessary,...row];
  const hasColor=scope.some(atom=>atom.targetType||atom.forbiddenType||atom.allowedTypes);
  const hasProduct=scope.some(atom=>atom.targetShape||atom.forbiddenShape);
  return hasColor&&!hasProduct?'，商品不限':hasProduct&&!hasColor?'，色環不限':!hasColor&&!hasProduct?'，色環、商品不限':'';
 };
 if(goals.some(row=>!row.length)){
  // No additional goal: the necessary conditions fully describe the rule.
 }else{
  if(goals.length===1){
   sections.push(`達成條件${goals[0].length>1?'（全部符合）':''}：\n${numbered(goals[0].map(part=>part+(goals[0].length===1?scopeNote(alternatives[0]):'')))}`);
  }else{
   const labels=goals.map((row,i)=>row.join('，而且')+scopeNote(alternatives[i]));
   sections.push(`達成條件：\n${numbered(labels)}`);
  }
 }
 return `${RULE_GUIDE}\n\n${sections.join('\n')}`;
}
function shuffle<T>(values:T[],random:()=>number):T[]{
 const result=[...values];for(let i=result.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;
}
function remap(c:Condition,colors:Map<string,string>,products:Map<string,string>):Condition{
 return {...c,
  ...(c.targetType?{targetType:colors.get(c.targetType)!}:{}),
  ...(c.forbiddenType?{forbiddenType:colors.get(c.forbiddenType)!}:{}),
  ...(c.allowedTypes?{allowedTypes:c.allowedTypes.map(t=>colors.get(t)!)}:{}),
  ...(c.targetShape?{targetShape:products.get(c.targetShape)!}:{}),
  ...(c.forbiddenShape?{forbiddenShape:products.get(c.forbiddenShape)!}:{}),
  ...(c.compoundCondition?{compoundCondition:{...c.compoundCondition,conditions:c.compoundCondition.conditions.map(child=>remap(child,colors,products))}}:{})};
}
export type SessionRules={config:Config;selection:string};
export function drawSessionRules(config:Config,level:Level,previous?:string,random=Math.random):SessionRules{
 const first=config.rules.find(r=>r.id===level.ruleId);
 if(!first)throw Error('找不到關卡規則。');
 const second=level.secondaryRuleId||first.ruleSwitch;
 const ids=new Set([first.id,...(second?[second]:[])]);
 const colors=[...new Set(config.stimuli.filter(s=>s.enabled).map(s=>s.type))];
 const products=[...new Set(config.stimuli.filter(s=>s.enabled).map(s=>s.shape))];
 const build=(colorOrder:string[],productOrder:string[])=>{
  const cm=new Map(colors.map((t,i)=>[t,colorOrder[i]])),pm=new Map(products.map((s,i)=>[s,productOrder[i]]));
  const rules=config.rules.map(r=>{
   if(!ids.has(r.id))return r;
   const condition=level.randomizeTargets===false?structuredClone(r.condition):remap(r.condition,cm,pm);
   return {...r,condition,description:describeCondition(condition,config)};
  });
  const selected=rules.filter(r=>ids.has(r.id));
  // Reject rules with no reachable clickable item; do not weaken the template.
  for(const rule of selected){
   const possible=config.stimuli.filter(s=>s.enabled).some(stimulus=>[.3,.7].some(x=>[false,true].some(distractor=>evaluate(rule.condition,[{stimulus,x,y:.5,distractor} as Planned],0))));
   if(!possible)throw Error('本場規則沒有可點商品，請檢查規則模板。');
  }
  return {config:{...config,rules},selection:JSON.stringify(selected.map(r=>[r.id,r.condition]))};
 };
 let drawn=build(shuffle(colors,random),shuffle(products,random));
 if(level.randomizeTargets===false||drawn.selection!==previous)return drawn;
 // Ensure replay changes a referenced target even when random draws repeat.
 const colorOrder=shuffle(colors,random),productOrder=shuffle(products,random);
 for(let ci=0;ci<colors.length;ci++)for(let pi=0;pi<products.length;pi++){
  drawn=build([...colorOrder.slice(ci),...colorOrder.slice(0,ci)],[...productOrder.slice(pi),...productOrder.slice(0,pi)]);
  if(drawn.selection!==previous)return drawn;
 }
 return drawn; // Templates without any color/item parameter naturally stay unchanged.
}
export function sessionRuleSummary(config:Config,level:Level){
 const first=config.rules.find(r=>r.id===level.ruleId)!;
 const second=config.rules.find(r=>r.id===(level.secondaryRuleId||first.ruleSwitch));
 if(!second)return first.description;
 const at=level.switchAtTrial||Math.max(1,Math.floor(level.stimulusCount*(level.switchAtPercent||.5)));
 return `第 1–${at} 次：${first.description} 第 ${at+1}–${level.stimulusCount} 次：${second.description}`;
}
