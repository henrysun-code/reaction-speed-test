import {test} from 'node:test';
import assert from 'node:assert/strict';
import raw from '../config/generated/game_config.json';
import type {Config,Result} from '../src/types/index';
import {planLevel,seeded} from '../src/game/generator';
import {drawSessionRules} from '../src/game/session-rules';
import {evaluate} from '../src/game/rules';
import {mergeProgress,progressId} from '../src/utils/stars';
import {tutorialDescription} from '../src/game/tutorial';
const config={settings:Object.fromEntries(raw.GameSettings.map(r=>[r.key,r.value])),levels:raw.Levels,rules:raw.Rules,stimuli:raw.Stimuli,infinite:Object.fromEntries(raw.InfiniteMode.map(r=>[r.key,r.value])),assets:{},audio:[],text:{}} as unknown as Config;
const tutorials=raw.Tutorials as unknown as NonNullable<Config['tutorials']>;
test('single-rule instructions have no unrelated necessary/OR achievement requirement',()=>{
 for(const lesson of tutorials){const text=tutorialDescription(lesson.condition,config);assert.ok(text.startsWith('只判斷本關規則'));assert.ok(text.includes('本關規則：'));assert.ok(!text.includes('再至少符合一項'));}
});
test('all nine single-rule lessons have truthful 50–70% plans and stable beginner targets',()=>{
 assert.equal(raw.Tutorials.length,9);assert.equal(config.levels.length,100);
 const random=seeded(129);
 for(const lesson of tutorials){
  const c={...config,rules:[...config.rules,{id:lesson.ruleId,name:lesson.name,description:'',condition:lesson.condition}]} as Config;
  for(let n=0;n<30;n++){
   const drawn=drawSessionRules(c,lesson,undefined,random);
   assert.deepEqual(drawn.config.rules.at(-1)!.condition,lesson.condition);
   const plan=planLevel(drawn.config,lesson,random);
   assert.equal(plan.length,10);const ratio=plan.filter(p=>p.shouldClick).length/plan.length;assert.ok(ratio>=.5&&ratio<=.7);
   plan.forEach((p,i)=>assert.equal(p.shouldClick,evaluate(lesson.condition,plan,i)));
   assert.ok(lesson.stimulusDuration>config.levels[0].stimulusDuration);
  }
 }
});
test('tutorial completion persists separately from fixed-level progress and rejects overrides',()=>{
 const l=tutorials[0];const r={level:l,mode:'tutorial',overridden:false,stars:{completed:true,accuracy:true,speed:false}} as unknown as Result;
 const previous={[progressId(config.levels[0])]:{completed:true,accuracy:false,speed:false}};
 const updated=mergeProgress(previous,r);assert.deepEqual(updated[progressId(l)],r.stars);assert.deepEqual(updated[progressId(config.levels[0])],previous[progressId(config.levels[0])]);
 assert.deepEqual(mergeProgress(previous,{...r,overridden:true}),previous);
});
