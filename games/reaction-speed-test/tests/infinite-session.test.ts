import {test} from 'node:test';import assert from 'node:assert/strict';
import raw from '../config/generated/game_config.json';import type {Config} from '../src/types/index';
import {infiniteLevel,planLevel,seeded} from '../src/game/generator';import {drawSessionRules} from '../src/game/session-rules';
import {INFINITE_SESSION_KEY,saveInfiniteSession,readInfiniteSession,clearInfiniteSession} from '../src/utils/infinite-session';
const config={settings:Object.fromEntries(raw.GameSettings.map(r=>[r.key,r.value])),levels:raw.Levels,rules:raw.Rules,stimuli:raw.Stimuli,infinite:Object.fromEntries(raw.InfiniteMode.map(r=>[r.key,r.value])),assets:{},audio:[],text:{}} as unknown as Config;
test('reload restores the same infinite round, targets, plan and next-round counter',()=>{
 const original=globalThis.sessionStorage;const store=new Map<string,string>();
 globalThis.sessionStorage={getItem:(k:string)=>store.get(k)??null,setItem:(k:string,v:string)=>store.set(k,v),removeItem:(k:string)=>store.delete(k)} as unknown as Storage;
 try{
  const random=seeded(715),generated=infiniteLevel(config,4,[],random),draw=drawSessionRules(config,generated.level,undefined,random);
  const snapshot={level:generated.level,plan:planLevel(draw.config,generated.level,random),rules:draw.config.rules,counter:4,recent:[generated.signature]};
  assert.equal(saveInfiniteSession(config,snapshot),true);assert.deepEqual(readInfiniteSession(structuredClone(config)),snapshot);
  assert.equal(infiniteLevel(config,readInfiniteSession(config)!.counter+1,snapshot.recent,seeded(9)).level.levelId,'infinite-5');
  const changed=structuredClone(config);changed.settings.gameVersion='changed';assert.equal(readInfiniteSession(changed),null);
  const tampered=JSON.parse(store.get(INFINITE_SESSION_KEY)!);tampered.snapshot.plan[0].shouldClick=!tampered.snapshot.plan[0].shouldClick;store.set(INFINITE_SESSION_KEY,JSON.stringify(tampered));assert.equal(readInfiniteSession(config),null);
  saveInfiniteSession(config,snapshot);clearInfiniteSession();assert.equal(readInfiniteSession(config),null);
  store.set(INFINITE_SESSION_KEY,'broken-json');assert.equal(readInfiniteSession(config),null);
 }finally{globalThis.sessionStorage=original;}
});
test('unavailable browser storage does not prevent playing',()=>{
 const original=globalThis.sessionStorage;globalThis.sessionStorage={getItem(){throw Error('disabled');},setItem(){throw Error('disabled');},removeItem(){throw Error('disabled');}} as unknown as Storage;
 try{assert.equal(readInfiniteSession(config),null);assert.equal(saveInfiniteSession(config,{} as never),false);assert.doesNotThrow(clearInfiniteSession);}finally{globalThis.sessionStorage=original;}
});
