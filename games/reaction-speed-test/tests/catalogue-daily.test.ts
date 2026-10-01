import {test} from 'node:test';
import assert from 'node:assert/strict';
import raw from '../config/generated/game_config.json';
import type {Config,Condition,Planned} from '../src/types/index';
import {dailyDate,dailyChallenge} from '../src/game/daily';
import {evaluate} from '../src/game/rules';
import {planLevel,seeded} from '../src/game/generator';
import {mergeProgress,progressId} from '../src/utils/stars';
const config={settings:Object.fromEntries(raw.GameSettings.map(r=>[r.key,r.value])),levels:raw.Levels,rules:raw.Rules,stimuli:raw.Stimuli,infinite:Object.fromEntries(raw.InfiniteMode.map(r=>[r.key,r.value])),assets:{},audio:[],text:{}} as unknown as Config;
const keys=(c:Condition):string[]=>[...Object.keys(c).filter(k=>k!=='compoundCondition'),...(c.compoundCondition?.conditions.flatMap(keys)||[])];
test('100 distinct behaviors cover the three level groups and sorted complexity',()=>{
 assert.equal(config.levels.length,100);
 const domain=config.stimuli.flatMap(stimulus=>[.3,.7].flatMap(x=>[false,true].map(distractor=>({stimulus,x,y:.5,distractor} as Planned))));
 const signatures=new Set<string>();
 for(let i=0;i<100;i++){
  const l=config.levels[i],rule=config.rules.find(r=>r.id===l.ruleId)!;
  assert.equal(l.levelId,String(i+1));assert.equal(l.secondaryRuleId,'');
  const fields=keys(rule.condition);
  assert.equal(fields.includes('positionCondition'),i>=9);
  assert.equal(fields.includes('distractorCondition'),i>=40);
  const signature=domain.map((_,j)=>evaluate(rule.condition,domain,j)?'1':'0').join('');
  assert.ok(signature.includes('0')&&signature.includes('1'));assert.ok(!signatures.has(signature),`Duplicate level ${i+1}`);signatures.add(signature);
  if(i>9&&i!==40)assert.ok(l.difficulty!>=config.levels[i-1].difficulty!,`Difficulty order ${i+1}`);
 }
 const stars=config.levels.slice(40).map(l=>JSON.stringify(config.rules.find(r=>r.id===l.ruleId)!.condition));
 assert.ok(stars.some(c=>c.includes('present'))&&stars.some(c=>c.includes('absent')));
});
test('negative OR rare intersections reach quota without altering the truth table',()=>{
 const rule={id:'negative-or',name:'',description:'',condition:{compoundCondition:{op:'any',conditions:[{forbiddenType:'red'},{forbiddenShape:'circle'}]}} as Condition};
 const c={...config,rules:[...config.rules,rule]},l={...config.levels[0],ruleId:rule.id};
 for(let i=0;i<100;i++){
  const plan=planLevel(c,l,seeded(i)),count=plan.filter(p=>p.shouldClick).length;
  assert.ok(count>=9&&count<=12);
  plan.forEach((p,j)=>assert.equal(p.shouldClick,evaluate(rule.condition,plan,j)));
  assert.ok(plan.filter(p=>!p.shouldClick).every(p=>p.stimulus.type==='red'&&p.stimulus.shape==='circle'));
 }
});
test('Taipei midnight changes daily date independently of device timezone',()=>{
 assert.equal(dailyDate(new Date('2026-09-30T15:59:59Z')),'2026-09-30');
 assert.equal(dailyDate(new Date('2026-09-30T16:00:00Z')),'2026-10-01');
 assert.equal(dailyDate(new Date('2026-12-31T16:00:00Z')),'2027-01-01');
});
test('daily template stays fixed but replay redraws targets and plans without changing rule structure',()=>{
 const before=JSON.stringify(config),seen=new Set<string>();
 for(let i=0;i<366;i++){
  const date=dailyDate(new Date(Date.UTC(2026,0,1+i))),a=dailyChallenge(config,date,undefined,seeded(i+1)),b=dailyChallenge(structuredClone(config),date,a.selection,seeded(i+900));
  assert.deepEqual(a.level,b.level);assert.notEqual(a.selection,b.selection);assert.notDeepEqual(a.plan,b.plan);
  assert.equal(a.level.levelId,`daily-${date}`);
  const rule=a.config.rules.find(r=>r.id===a.level.ruleId)!;
  seen.add(a.level.ruleId);
  a.plan.forEach((p,j)=>assert.equal(p.shouldClick,evaluate(rule.condition,a.plan,j)));
  assert.ok(a.plan.filter(p=>p.shouldClick).length>=9&&a.plan.filter(p=>p.shouldClick).length<=12);
 }
 assert.ok(seen.size>80);assert.equal(JSON.stringify(config),before);
});
test('revised levels preserve old progress but do not inherit its stars; daily stays separate',()=>{
 const old={...config.levels[0],ruleRevision:undefined};
 assert.equal(progressId(old),'1');assert.equal(progressId(config.levels[0]),'or-v1:1');
 const r={level:config.levels[0],mode:'level',overridden:false,stars:{completed:true,accuracy:false,speed:false}} as any;
 const stored={'1':{completed:true,accuracy:true,speed:true}},updated=mergeProgress(stored,r);
 assert.deepEqual(updated['1'],stored['1']);assert.equal(updated['or-v1:1'].accuracy,false);
 assert.deepEqual(mergeProgress(stored,{...r,mode:'daily'}),stored);
});
