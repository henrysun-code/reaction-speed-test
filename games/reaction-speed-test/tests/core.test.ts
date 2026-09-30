import {test} from 'node:test';
import assert from 'node:assert/strict';
import raw from '../config/generated/game_config.json';
import {evaluate,activeRule} from '../src/game/rules';
import {planLevel,infiniteLevel,seeded} from '../src/game/generator';
import {statistics} from '../src/utils/statistics';
import {Engine} from '../src/game/engine';
import type {Config,Planned,Trial,Condition} from '../src/types/index';
const config={settings:Object.fromEntries(raw.GameSettings.map(r=>[r.key,r.value])),levels:raw.Levels,rules:raw.Rules,stimuli:raw.Stimuli,infinite:Object.fromEntries(raw.InfiniteMode.map(r=>[r.key,r.value])),assets:{},audio:[],text:{}} as unknown as Config;
const typesShape=(type:string)=>type==='red'?'triangle':'circle';
const p=(type:string,x=.3,distractor=false)=>({stimulus:{id:type,type,shape:typesShape(type),name:type,image:type,enabled:true},x,y:.5,distractor,interval:1,ruleId:'gold',rulePhase:1,shouldClick:true}) as Planned;
test('composable current-item conditions and AND/OR semantics',()=>{
 const plan=[p('gold'),p('brown'),p('gold',.7,true)];
 assert.equal(evaluate({targetType:'gold'},plan,0),true);assert.equal(evaluate({forbiddenType:'gold'},plan,0),false);
 assert.equal(evaluate({allowedTypes:['brown','gold'],positionCondition:'right'},plan,2),true);
 assert.equal(evaluate({distractorCondition:'present'},plan,2),true);
 assert.equal(evaluate({targetShape:'circle',forbiddenType:'brown'},plan,1),false);
 assert.equal(evaluate({compoundCondition:{op:'all',conditions:[{targetType:'gold'},{positionCondition:'left'}]}},plan,2),false);
 assert.equal(evaluate({compoundCondition:{op:'any',conditions:[{targetType:'red'},{positionCondition:'right'}]}},plan,2),true);
});
test('red exclusion accepts every non-red product and removed temporal rules are absent',()=>{
 const condition=config.rules.find(r=>r.id==='no-red')!.condition;
 for(const stimulus of config.stimuli){const trial={...p(stimulus.type),stimulus};assert.equal(evaluate(condition,[trial],0),stimulus.type!=='red');}
 for(const rule of config.rules)assert.ok(!/previousStimulusCondition|nextStimulusCondition|sequenceCondition/.test(JSON.stringify(rule.condition)));
 assert.equal(activeRule({...config.levels[0],ruleId:'combined',secondaryRuleId:'distract',switchAtTrial:9},config.rules,9).rule.id,'distract');
});
test('two or three independent condition dimensions yield 2772 distinct nonempty AND rules',()=>{
 const colors=[...new Set(config.stimuli.map(s=>s.type))],products=[...new Set(config.stimuli.map(s=>s.shape))];
 const colorConditions:Condition[]=Array.from({length:(1<<colors.length)-2},(_,i)=>({allowedTypes:colors.filter((_,j)=>(i+1)&(1<<j))}));
 const productConditions:Condition[]=products.flatMap(shape=>[{targetShape:shape},{forbiddenShape:shape}]);
 const dimensions:Condition[][]=[colorConditions,productConditions,[{positionCondition:'left'},{positionCondition:'right'}],[{distractorCondition:'absent'},{distractorCondition:'present'}]];
 const domain=config.stimuli.flatMap(stimulus=>[.3,.7].flatMap(x=>[false,true].map(distractor=>({...p(stimulus.type,x,distractor),stimulus}))));
 const signatures=new Set<string>();let pairs=0,triples=0;
 const check=(condition:Condition)=>{
  const signature=domain.map((_,i)=>evaluate(condition,domain,i)?'1':'0').join('');
  assert.ok(signature.includes('1')&&signature.includes('0'));
  assert.ok(!signatures.has(signature),'duplicate behavior');signatures.add(signature);
 };
 for(let a=0;a<dimensions.length;a++)for(let b=a+1;b<dimensions.length;b++){
  for(const one of dimensions[a])for(const two of dimensions[b]){check({...one,...two});pairs++;}
  for(let c=b+1;c<dimensions.length;c++)for(const one of dimensions[a])for(const two of dimensions[b])for(const three of dimensions[c]){check({...one,...two,...three});triples++;}
 }
 assert.equal(pairs,668);assert.equal(triples,2104);assert.equal(signatures.size,2772);
});
test('all 100 levels produce real clickable trials and legacy switching remains correct',()=>{for(const l of config.levels){const plan=planLevel(config,l,seeded(51));assert.equal(plan.length,l.stimulusCount);assert.ok(plan.filter(p=>p.shouldClick).length>=Math.ceil(l.stimulusCount*.5));assert.ok(plan.filter(p=>p.shouldClick).length<=Math.floor(l.stimulusCount*.7));}const l={...config.levels[0],ruleId:'switch',secondaryRuleId:'brown',switchAtTrial:9};assert.equal(activeRule(l,config.rules,8).rule.id,'switch');assert.equal(activeRule(l,config.rules,9).rule.id,'brown');});

test('level six rejects every color when a gray star is present',()=>{
 const level={...config.levels[0],ruleId:'distract',distractorRatio:.4};
 const condition=config.rules.find(r=>r.id===level.ruleId)!.condition;
 for(const stimulus of config.stimuli.filter(s=>s.enabled)){
  const trial={...p(stimulus.type),stimulus};
  assert.equal(evaluate(condition,[{...trial,distractor:true}],0),false,stimulus.id+' with star');
  assert.equal(evaluate(condition,[{...trial,distractor:false}],0),stimulus.type==='gold',stimulus.id+' without star');
 }
 const plan=planLevel(config,level,seeded(51));
 assert.ok(plan.some(t=>t.distractor&&t.stimulus.type==='gold'&&!t.shouldClick));
 assert.ok(plan.some(t=>!t.distractor&&t.shouldClick));
});
test('color and shape are independent; forbidden triangles override gold',()=>{
 const condition=config.rules.find(r=>r.id==='forbid')!.condition;
 assert.equal(condition.targetType,'gold');assert.equal(condition.forbiddenShape,'triangle');
 for(const color of ['gold','brown','red','blue','green'])for(const shape of ['circle','square','triangle','diamond','cross']){
  const trial={...p(color),stimulus:{...p(color).stimulus,shape}};
  assert.equal(evaluate(condition,[trial],0),color==='gold'&&shape!=='triangle',`${color} ${shape}`);
 }
 const gold=config.stimuli.filter(s=>s.enabled&&s.type==='gold');
 assert.deepEqual(new Set(gold.map(s=>s.shape)),new Set(['circle','square','triangle','diamond','cross','product-qss','product-sdd','product-yss']));
 for(let seed=0;seed<100;seed++){
  const plan=planLevel(config,{...config.levels[0],ruleId:'forbid'},seeded(seed));
  assert.ok(plan.some(p=>p.stimulus.type==='gold'&&p.stimulus.shape==='triangle'&&!p.shouldClick));
  assert.ok(plan.some(p=>p.shouldClick));
  assert.ok(plan.every(p=>p.shouldClick===(p.stimulus.type==='gold'&&p.stimulus.shape!=='triangle')));
 }
});
test('300 infinite levels have enough targets and no recent duplicate signatures',()=>{let recent:string[]=[];const random=seeded(121);for(let i=0;i<300;i++){const g=infiniteLevel(config,i,recent,random);assert.ok(!recent.includes(g.signature));assert.ok(g.plan.filter(p=>p.shouldClick).length>=Math.ceil(g.plan.length*.5));assert.ok(g.plan.filter(p=>p.shouldClick).length<=Math.floor(g.plan.length*.7));assert.equal(g.level.stimulusDuration,1300);recent=[...recent,g.signature].slice(-10);}});
test('all eight products have five rings and can appear in the level pool',()=>{
 const enabled=config.stimuli.filter(s=>s.enabled);
 assert.equal(enabled.length,40);
 const assetFiles=new Map(raw.Assets.map(a=>[a.id,a.file]));
 const products=new Map<string,Set<string>>();
 for(const stimulus of enabled){
  const file=assetFiles.get(stimulus.image)!;
  const rings=products.get(file)||new Set<string>();rings.add(stimulus.type);products.set(file,rings);
 }
 assert.deepEqual([...products.keys()].sort(),['ABT+2.png','BBB+1.png','MTT+10.png','NAP+1.png','PPA+1.png','QSS+8.png','SDD+10.png','YSS+2.png']);
 for(const rings of products.values())assert.deepEqual(rings,new Set(['gold','brown','red','blue','green']));
 const seen=new Set<string>();
 for(let seed=0;seed<100;seed++)for(const trial of planLevel(config,config.levels[0],seeded(seed)))seen.add(trial.stimulus.id);
 assert.equal(seen.size,40);
});
test('statistics exclude false alarms/misses and use population SD',()=>{const trials=[{shouldClick:true,playerClicked:true,correct:true,reactionTime:300},{shouldClick:true,playerClicked:true,correct:true,reactionTime:500},{shouldClick:false,playerClicked:true,correct:false,falseAlarm:true,reactionTime:20},{shouldClick:true,playerClicked:false,correct:false,miss:true,reactionTime:null}] as unknown as Trial[];const s=statistics(trials,.8);assert.equal(s.average,400);assert.equal(s.median,400);assert.equal(s.stability,100);assert.equal(s.accuracy,.5);assert.equal(s.falseAlarms,1);assert.equal(s.misses,1);assert.equal(s.passed,false);assert.equal(statistics(trials.slice(0,1),.8).stability,null);assert.equal(statistics([],.8).average,null);});
test('engine waits for paint, ignores double input, records hit/false alarm/miss, pauses safely',async()=>{
 const level={...config.levels[0],stimulusCount:3,minInterval:1,maxInterval:1,stimulusDuration:20,countdownEnabled:false};const plan=[p('gold'),{...p('red'),shouldClick:false},p('gold')];let engine:Engine;let paused=false;
 const done=new Promise<Trial[]>(resolve=>{engine=new Engine(level,plan,2,3,s=>{if(s.phase==='presenting'){assert.equal(engine.input(),false);if(s.index===0&&!paused){paused=true;engine.pause();setTimeout(()=>engine.resume(),5);return;}engine.painted(s.token);if(s.index<2)setTimeout(()=>{assert.equal(engine.input(),true);assert.equal(engine.input(),false);},5);}},resolve);engine.start();});
 const trials=await done;assert.equal(trials.length,3);assert.equal(trials[0].correct,true);assert.equal(trials[1].falseAlarm,true);assert.equal(trials[2].miss,true);assert.ok(trials[0].reactionTime!>=0);engine!.destroy();
});


