import {test} from 'node:test';
import assert from 'node:assert/strict';
import raw from '../config/generated/game_config.json';
import type {Config,Condition} from '../src/types/index';
import {drawSessionRules,describeCondition as fullDescription,RULE_GUIDE,sessionRuleSummary,clickAlternatives,ruleRequirements} from '../src/game/session-rules';
import {planLevel,seeded} from '../src/game/generator';
import {ruleDifficulty} from '../src/game/difficulty';
import {activeRule,evaluate} from '../src/game/rules';
const config={settings:Object.fromEntries(raw.GameSettings.map(r=>[r.key,r.value])),levels:raw.Levels,rules:raw.Rules,stimuli:raw.Stimuli,infinite:Object.fromEntries(raw.InfiniteMode.map(r=>[r.key,r.value])),assets:{},audio:[],text:{}} as unknown as Config;
function describeCondition(c:Condition,config:Config){
 const text=fullDescription(c,config);
 assert.ok(text.startsWith(`${RULE_GUIDE}\n\n`));
 return text.slice(RULE_GUIDE.length+2);
}
function structure(c:Condition):unknown{
 return {...c,...(c.targetType?{targetType:'color'}:{}),...(c.forbiddenType?{forbiddenType:'color'}:{}),...(c.allowedTypes?{allowedTypes:c.allowedTypes.map(()=> 'color')}:{}),...(c.targetShape?{targetShape:'product'}:{}),...(c.forbiddenShape?{forbiddenShape:'product'}:{}),...(c.compoundCondition?{compoundCondition:{op:c.compoundCondition.op,conditions:c.compoundCondition.conditions.map(structure)}}:{})};
}
test('10000 session draws preserve templates, stars, phase boundaries and executable plans',()=>{
 const source=JSON.stringify(config);const random=seeded(871);
 for(const level of config.levels){
  let previous:string|undefined;
  for(let n=0;n<100;n++){
   const drawn=drawSessionRules(config,level,previous,random);
   assert.notEqual(drawn.selection,previous);previous=drawn.selection;
   const plan=planLevel(drawn.config,level,random);
   assert.ok(plan.filter(p=>p.shouldClick).length>=Math.ceil(level.stimulusCount*.5));assert.ok(plan.filter(p=>p.shouldClick).length<=Math.floor(level.stimulusCount*.7));
   for(let i=0;i<plan.length;i++){
    const actual=activeRule(level,drawn.config.rules,i),template=activeRule(level,config.rules,i);
    assert.deepEqual(structure(actual.rule.condition),structure(template.rule.condition));
    assert.equal(actual.phase,template.phase);
    assert.equal(plan[i].shouldClick,evaluate(actual.rule.condition,plan,i));
    assert.equal(actual.rule.description,`${RULE_GUIDE}\n\n${describeCondition(actual.rule.condition,drawn.config)}`);
   }
   assert.equal(level.starAccuracy,.9);assert.equal(level.starAverageMs,ruleDifficulty(config.rules.find(r=>r.id===level.ruleId)!.condition).averageMs);
  }
 }
 assert.equal(JSON.stringify(config),source);
});
test('replay avoids the previous draw even with repeating random output; opt-out keeps configured targets',()=>{
 const level=config.levels[2];const first=drawSessionRules(config,level,undefined,()=>0);
 const replay=drawSessionRules(config,level,first.selection,()=>0);assert.notEqual(replay.selection,first.selection);
 const fixed=drawSessionRules(config,{...level,randomizeTargets:false},first.selection,()=>0);
 assert.deepEqual(fixed.config.rules.find(r=>r.id===level.ruleId)!.condition,config.rules.find(r=>r.id===level.ruleId)!.condition);
 const productOnly={...config,rules:[{id:'item',name:'商品',description:'',condition:{targetShape:'circle'}}]};
 const itemLevel={...level,ruleId:'item',secondaryRuleId:''};
 const a=drawSessionRules(productOnly,itemLevel,undefined,()=>0),b=drawSessionRules(productOnly,itemLevel,a.selection,()=>0);
 assert.notEqual(a.selection,b.selection);
});
test('distinct colors remain distinct across branches and switch phases; history retains both phases',()=>{
 const level={...config.levels[0],ruleId:'combined',secondaryRuleId:'distract',switchAtTrial:9},drawn=drawSessionRules(config,level,undefined,seeded(72));
 const first=drawn.config.rules.find(r=>r.id===level.ruleId)!;
 const branches=first.condition.compoundCondition!.conditions;
 assert.notEqual(branches[0].targetType,branches[1].targetType);
 const second=activeRule(level,drawn.config.rules,9).rule;
 assert.equal(second.condition.targetType,branches[0].targetType);
 const summary=sessionRuleSummary(drawn.config,level);assert.ok(summary.includes(first.description)&&summary.includes(second.description));
 assert.ok(summary.includes('第 1–9 次')&&summary.includes('第 10–18 次'));
});
test('OR descriptions do not claim a global prohibition and impossible templates fail explicitly',()=>{
 const description=describeCondition({compoundCondition:{op:'any',conditions:[{forbiddenType:'red'},{targetShape:'circle'}]}},config);
 assert.ok(description.includes('外圈不是紅色')&&description.includes('ABT+2')&&description.includes('達成條件：'));
 assert.ok(!description.includes('紅色不能點'));
 const bad={...config,rules:[{id:'bad',name:'bad',description:'',condition:{targetType:'gold',forbiddenType:'gold'}}]};
 assert.throws(()=>drawSessionRules(bad,{...config.levels[0],ruleId:'bad'}),/沒有可點商品/);
});
test('nested product OR flattens into four readable alternatives without separating AND',()=>{
 const c:Condition={compoundCondition:{op:'any',conditions:[{targetType:'gold'},{compoundCondition:{op:'any',conditions:[{targetShape:'circle'},{targetShape:'triangle'}]}},{compoundCondition:{op:'all',conditions:[{positionCondition:'left'},{distractorCondition:'present'}]}}]}};
 assert.equal(describeCondition(c,config),'達成條件：\n1. 外圈是金色，商品不限\n2. 商品是 ABT+2，色環不限\n3. 商品是 mTOR（MTT+10），色環不限\n4. 商品中心位於左半邊，而且畫面有灰色星星，色環、商品不限');
});
test('numbered alternatives preserve all configured truth tables, including mixed AND/OR scopes',()=>{
 const domain=config.stimuli.flatMap(stimulus=>[.3,.7].flatMap(x=>[false,true].map(distractor=>({stimulus,x,y:.5,distractor} as any))));
 for(const rule of config.rules){
  const rows=clickAlternatives(rule.condition);
  domain.forEach((_,i)=>assert.equal(rows.some(row=>row.every(atom=>evaluate(atom,domain,i))),evaluate(rule.condition,domain,i),rule.id));
  const {necessary,alternatives}=ruleRequirements(rule.condition);
  domain.forEach((_,i)=>assert.equal(necessary.every(atom=>evaluate(atom,domain,i))&&alternatives.some(row=>row.every(atom=>evaluate(atom,domain,i))),evaluate(rule.condition,domain,i),`${rule.id}: necessary/achievement scope`));
  assert.ok(!describeCondition(rule.condition,config).includes('（（'));
 }
 const c:Condition={positionCondition:'left',compoundCondition:{op:'any',conditions:[{targetType:'gold'},{targetShape:'circle'}]}};
 assert.equal(describeCondition(c,config),'必要條件：\n1. 商品中心位於左半邊\n達成條件：\n1. 外圈是金色，商品不限\n2. 商品是 ABT+2，色環不限');
});
test('branch-specific position is not presented as a universal necessary condition',()=>{
 const c:Condition={compoundCondition:{op:'any',conditions:[{targetType:'gold',positionCondition:'left'},{targetShape:'circle'}]}};
 assert.deepEqual(ruleRequirements(c).necessary,[]);
 const description=describeCondition(c,config);
 assert.ok(!description.includes('必要條件'));
 assert.ok(description.includes('1. 外圈是金色，而且商品中心位於左半邊'));
 const gated={positionCondition:'left',distractorCondition:'absent',compoundCondition:c.compoundCondition} as Condition;
 assert.equal(ruleRequirements(gated).necessary.length,2);
 assert.ok(describeCondition(gated,config).startsWith('必要條件：\n1. 商品中心位於左半邊\n2. 畫面沒有灰色星星'));
});
test('unrestricted-item labels respect shared exclusions and AND branches',()=>{
 const colorGate:Condition={forbiddenType:'red',compoundCondition:{op:'any',conditions:[{targetShape:'circle'},{targetShape:'square'}]}};
 assert.ok(!describeCondition(colorGate,config).includes('色環不限'));
 const productGate:Condition={forbiddenShape:'triangle',compoundCondition:{op:'any',conditions:[{targetType:'gold'},{targetType:'brown'}]}};
 assert.ok(!describeCondition(productGate,config).includes('商品不限'));
 const both:Condition={targetType:'gold',targetShape:'circle'};
 const text=describeCondition(both,config);
 assert.ok(text.includes('達成條件（全部符合）：'));
 assert.ok(!text.includes('至少符合一項')&&!text.includes('不限'));
 const negativeOr:Condition={compoundCondition:{op:'any',conditions:[{forbiddenType:'red'},{targetShape:'circle'}]}};
 assert.equal(describeCondition(negativeOr,config),'達成條件：\n1. 外圈不是紅色，商品不限\n2. 商品是 ABT+2，色環不限');
});
