import {test} from 'node:test';
import assert from 'node:assert/strict';
import raw from '../config/generated/game_config.json';
import {ruleDifficulty} from '../src/game/difficulty';
import {dailyChallenge} from '../src/game/daily';
import {progressId} from '../src/utils/stars';
import type {Condition,Config} from '../src/types/index';
const config={settings:Object.fromEntries(raw.GameSettings.map(r=>[r.key,r.value])),levels:raw.Levels,rules:raw.Rules,stimuli:raw.Stimuli,infinite:Object.fromEntries(raw.InfiniteMode.map(r=>[r.key,r.value])),assets:{},audio:[],text:{}} as unknown as Config;
test('four OR checks cost more than three, and sets each count their actual targets',()=>{
 const or=(conditions:Condition[]):Condition=>({compoundCondition:{op:'any',conditions}});
 const two=or([{targetType:'gold'},{targetShape:'circle'}]);
 const three=or([{targetType:'gold'},{targetShape:'circle'},{positionCondition:'left'}]);
 const four=or([{targetType:'gold'},{targetShape:'circle'},{positionCondition:'left'},{distractorCondition:'present'}]);
 assert.equal(ruleDifficulty(two).averageMs,600);assert.equal(ruleDifficulty(three).averageMs,750);assert.equal(ruleDifficulty(four).averageMs,900);
 assert.ok(ruleDifficulty(four).score>ruleDifficulty(three).score);
 const sets=or([{allowedTypes:['gold','brown']},{compoundCondition:{op:'any',conditions:[{targetShape:'circle'},{targetShape:'square'}]}}]);
 assert.equal(ruleDifficulty(sets).checks,4);assert.equal(ruleDifficulty(sets).averageMs,900);
 assert.equal(ruleDifficulty({targetType:'gold',positionCondition:'left'}).averageMs,750);
 assert.equal(ruleDifficulty(or([{forbiddenType:'red'},{forbiddenShape:'circle'}])).averageMs,900);
});
test('configured thresholds match profiles; reorder retains progress identity and daily draws',()=>{
 const keys=new Set<string>();
 for(const level of config.levels){
  const profile=ruleDifficulty(config.rules.find(r=>r.id===level.ruleId)!.condition);
  assert.equal(level.starAverageMs,profile.averageMs);assert.equal(level.difficulty,profile.score);
  assert.equal(level.starAccuracy,.9);assert.equal(level.stimulusDuration,1300);
  assert.ok(!keys.has(progressId(level)));keys.add(progressId(level));
  assert.equal(progressId(level),`or-v1:${level.progressTemplateId}`);
 }
 const old={...config,levels:config.levels.map(l=>({...l,levelId:l.progressTemplateId!,progressTemplateId:undefined})).sort((a,b)=>Number(a.levelId)-Number(b.levelId))};
 const a=dailyChallenge(config,'2026-09-30'),b=dailyChallenge(old,'2026-09-30');
 assert.equal(a.level.ruleId,b.level.ruleId);assert.equal(a.level.templateKey,b.level.templateKey);
 assert.equal(a.level.starAverageMs,b.level.starAverageMs);
});
