import type {Config,Level,Planned,Condition} from '../types/index';
import {activeRule,evaluate} from './rules';
import {ruleDifficulty} from './difficulty';
export function seeded(seed:number){return ()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
export function planLevel(config:Config,level:Level,random=Math.random):Planned[]{
 const pool=config.stimuli.filter(s=>s.enabled), n=level.stimulusCount;
 const minimum=Math.max(1,Math.ceil(n*Number(config.infinite.minClickableRatio??.5)));
 const maximum=Math.floor(n*Number(config.infinite.maxClickableRatio??.7));
 if(minimum>maximum)throw new Error('刺激數量無法符合可點擊比例範圍，請調整數量或比例。');
 const gather=(c:Condition):string[]=>[...(c.targetType?[c.targetType]:[]),...(c.allowedTypes||[]),...(c.compoundCondition?.conditions.flatMap(gather)||[])];
 // Enumerate reachable current-item states, then sample within a truthful quota.
 // This supports rare negative-OR intersections without weakening their rules.
 const lo=Number(config.settings.positionMin),hi=Number(config.settings.positionMax);
 const positions=level.randomPosition?[[(lo+.5)/2,lo,.5],[((.5+hi)/2),.5,hi]]:[[.5,.5,.5]];
 const stars=level.distractorRatio===0?[false]:level.distractorRatio===1?[true]:[false,true];
 const domains=new Map<string,{yes:Planned[];no:Planned[];weights:Map<Planned,number>}>();
 const states=Array.from({length:n},(_,i)=>{
  const {rule,phase}=activeRule(level,config.rules,i);
  if(!domains.has(rule.id)){
   const types=gather(rule.condition),yes:Planned[]=[],no:Planned[]=[],weights=new Map<Planned,number>();
   for(const stimulus of pool)for(const [x] of positions)for(const distractor of stars){
    const p={stimulus,x,y:.5,distractor,interval:0,ruleId:rule.id,rulePhase:phase,shouldClick:false};
    p.shouldClick=evaluate(rule.condition,[p],0);(p.shouldClick?yes:no).push(p);
    const weight=(distractor?level.distractorRatio:1-level.distractorRatio)*(types.includes(stimulus.type)?1+level.targetRatio:1);
    weights.set(p,weight);
   }
   domains.set(rule.id,{yes,no,weights});
  }
  return {rule,phase,domain:domains.get(rule.id)!,wanted:false,forced:false};
 });
 // Retain the legacy requirement to show a color-overlapping item exclusion.
 const exceptions=new Map<number,Planned>();
 for(const [id,domain] of domains){
  const c=config.rules.find(r=>r.id===id)!.condition;
  if(!c.forbiddenShape)continue;
  const item=domain.no.find(p=>p.stimulus.shape===c.forbiddenShape&&(!c.targetType||p.stimulus.type===c.targetType));
  if(!item)throw Error('此規則無法展示被排除商品。');
  const indices=states.flatMap((s,i)=>s.rule.id===id?[i]:[]),index=indices[Math.floor(random()*indices.length)];
  exceptions.set(index,item);states[index].forced=true;
 }
 let compulsory=0;
 const flexible:number[]=[];
 states.forEach((s,i)=>{
  if(s.forced)return;
  if(!s.domain.yes.length&&!s.domain.no.length)throw Error('沒有啟用刺激。');
  if(!s.domain.no.length){s.wanted=true;compulsory++;}
  else if(s.domain.yes.length)flexible.push(i);
 });
 const lower=Math.max(minimum,compulsory),upper=Math.min(maximum,compulsory+flexible.length);
 if(lower>upper)throw Error('此組合無法符合可點擊比例範圍，請調整規則、位置或比例。');
 const count=lower+Math.floor(random()*(upper-lower+1));
 for(let i=flexible.length-1;i>0;i--){const j=Math.floor(random()*(i+1));[flexible[i],flexible[j]]=[flexible[j],flexible[i]];}
 flexible.slice(0,count-compulsory).forEach(i=>states[i].wanted=true);
 return states.map((s,i)=>{
  const candidates=s.wanted?s.domain.yes:s.domain.no;
  let item=exceptions.get(i);
  if(!item){let pick=random()*candidates.reduce((sum,p)=>sum+s.domain.weights.get(p)!,0);item=candidates[candidates.length-1];for(const p of candidates){pick-=s.domain.weights.get(p)!;if(pick<0){item=p;break;}}}
  const range=positions.find(([x])=>x===item!.x)!;
  return {...item!,x:range[1]+(range[2]-range[1])*random(),y:level.randomPosition?.25+random()*.5:.5,interval:level.minInterval+random()*(level.maxInterval-level.minInterval),rulePhase:s.phase};
 });
}
export function signature(level:Level){return JSON.stringify([level.ruleId,level.secondaryRuleId||'',level.randomPosition,level.distractorRatio,level.stimulusCount,level.targetRatio]);}
export function infiniteLevel(config:Config,index:number,recent:string[],random=Math.random):{level:Level;plan:Planned[];signature:string}{
 const f=config.infinite; const ids=String(f.ruleIds).split(',');
 for(let attempt=0;attempt<Number(f.maxAttempts);attempt++){
  const base=config.levels[Math.floor(random()*config.levels.length)];
  const level:Level={...base,levelId:`infinite-${index}`,name:`無限挑戰 ${index}`,ruleId:ids[Math.floor(random()*ids.length)],secondaryRuleId:random()<Number(f.switchChance)?ids[Math.floor(random()*ids.length)]:'',randomPosition:true,stimulusCount:Number(f.minStimuli)+Math.floor(random()*(Number(f.maxStimuli)-Number(f.minStimuli)+1)),distractorRatio:random()<.5?Number(f.distractorRatio):0,targetRatio:Number(f.targetRatio),minInterval:Number(f.minInterval),maxInterval:Number(f.maxInterval),stimulusDuration:Number(f.stimulusDuration),timeLimit:Number(f.timeLimit)};
  level.starAverageMs=Math.max(...[level.ruleId,level.secondaryRuleId].filter(Boolean).map(id=>ruleDifficulty(config.rules.find(r=>r.id===id)!.condition).averageMs));
  const sig=signature(level);if(recent.includes(sig))continue;
  try{return {level,plan:planLevel(config,level,random),signature:sig};}catch{}
 }
 throw new Error('無限模式生成限制太嚴格，請檢查 InfiniteMode 設定。');
}
