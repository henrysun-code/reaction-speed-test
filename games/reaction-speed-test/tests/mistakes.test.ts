import {test} from 'node:test';
import assert from 'node:assert/strict';
import raw from '../config/generated/game_config.json';
import type {Condition,Config,Planned,Rule,Trial} from '../src/types/index';
import {evaluate} from '../src/game/rules';
import {mistakeReason} from '../src/game/mistakes';
import {Engine} from '../src/game/engine';
const config={stimuli:raw.Stimuli} as unknown as Config;
function trial(condition:Condition,type='gold',shape='circle',x=.3,distractor=false){
 const p={stimulus:{id:'test',type,shape},x,y:.5,distractor} as Planned;
 const shouldClick=evaluate(condition,[p],0);
 return {trialIndex:1,stimulusId:'test',stimulusType:type,stimulusShape:shape,distractor,ruleId:'saved',positionX:x,positionY:.5,rulePhase:2,shouldClick,playerClicked:!shouldClick,falseAlarm:!shouldClick,miss:shouldClick,correct:false} as Trial;
}
const rules=(condition:Condition):Rule[]=>[{id:'saved',name:'',description:'',condition}];
test('necessary failures take priority over an otherwise satisfied OR branch',()=>{
 const c:Condition={positionCondition:'left',distractorCondition:'absent',compoundCondition:{op:'any',conditions:[{targetType:'gold'},{targetShape:'circle'}]}};
 const t=trial(c,'gold','circle',.7,true),reason=mistakeReason(t,rules(c),config);
 assert.match(reason,/必要條件/);assert.match(reason,/左半邊/);assert.match(reason,/背景不能有水母/);assert.doesNotMatch(reason,/外圈須/);
});
test('a forbidden OR branch is not treated as a global exclusion',()=>{
 const c:Condition={compoundCondition:{op:'any',conditions:[{forbiddenType:'red'},{targetShape:'circle'}]}};
 const missed=mistakeReason(trial(c,'red','circle'),rules(c),config);
 assert.match(missed,/應該點擊/);assert.doesNotMatch(missed,/外圈不能是紅色/);
 const alarm=mistakeReason(trial(c,'red','square'),rules(c),config);
 assert.match(alarm,/沒有符合任一/);assert.match(alarm,/項目 1 缺少：外圈不能是紅色/);assert.match(alarm,/項目 2 缺少：商品須為/);
});
test('review uses the recorded rule ID, including a switched second phase',()=>{
 const c:Condition={targetType:'brown'};
 const reason=mistakeReason(trial(c,'brown'),[{id:'first',name:'',description:'',condition:{targetType:'gold'}},...rules(c)],config);
 assert.match(reason,/棕色/);assert.doesNotMatch(reason,/金色/);
});
test('old records with missing context do not invent a jellyfish state or rule',()=>{
 const c={targetType:'gold'},t=trial(c);delete t.distractor;
 assert.match(mistakeReason(t,rules(c),config),/未保存完整情境/);
 assert.match(mistakeReason(trial(c),undefined,config),/未保存完整情境/);
});
test('all configured rules explain every domain outcome consistently',()=>{
 for(const rule of raw.Rules as Rule[])for(const stimulus of config.stimuli)for(const x of [.3,.7])for(const jelly of [false,true]){
  const t=trial(rule.condition,stimulus.type,stimulus.shape,x,jelly);
  const reason=mistakeReason(t,rules(rule.condition),config);
  assert.ok(reason.length>0);assert.doesNotMatch(reason,/無法還原|缺少：(?:\n|$)/);
  assert.equal(reason.startsWith('這次應該點擊'),t.shouldClick);
 }
});
test('engine saves the actual jellyfish state for both present and absent trials',async()=>{
 const stimulus=config.stimuli[0];
 const plan=[true,false].map(distractor=>({stimulus,x:.3,y:.5,distractor,interval:1,ruleId:'saved',rulePhase:1,shouldClick:true}));
 let engine:Engine;
 const done=new Promise<Trial[]>(resolve=>{engine=new Engine({...raw.Levels[0],stimulusCount:2,stimulusDuration:2,countdownEnabled:false} as any,plan,0,3,s=>{if(s.phase==='presenting')engine.painted(s.token);},resolve);engine.start();});
 const recorded=await done;engine!.destroy();
 assert.deepEqual(recorded.map(t=>t.distractor),[true,false]);
 assert.deepEqual(JSON.parse(JSON.stringify(recorded)).map((t:Trial)=>t.distractor),[true,false]);
});
