import {test} from 'node:test';
import assert from 'node:assert/strict';
import raw from '../config/generated/game_config.json';
import type {Result} from '../src/types/index';
import {earnedStars,mergeProgress,readProgress,writeProgress,PROGRESS_KEY,progressId} from '../src/utils/stars';
import {HISTORY_KEY,saveHistory} from '../src/utils/history';

function result(accuracy=.9,average:number|null=600,count=18):Result{
 return {date:'2026-09-30T00:00:00Z',level:raw.Levels[0] as unknown as Result['level'],mode:'level',rule:'gold',overridden:false,
  trials:Array.from({length:count},()=>({})) as Result['trials'],
  stats:{accuracy,average,sampleCount:average===null?0:10} as Result['stats']};
}
test('three independent stars use inclusive accuracy/time thresholds and require completion',()=>{
 assert.deepEqual(earnedStars(result()),{completed:true,accuracy:true,speed:true});
 assert.deepEqual(earnedStars(result(.899,600.01)),{completed:true,accuracy:false,speed:false});
 assert.deepEqual(earnedStars(result(1,null)),{completed:true,accuracy:true,speed:false});
 assert.deepEqual(earnedStars(result(.5,300)),{completed:true,accuracy:false,speed:true});
 assert.deepEqual(earnedStars(result(1,100,17)),{completed:false,accuracy:false,speed:false});
 assert.deepEqual(earnedStars(result(0,null)),{completed:true,accuracy:false,speed:false});
 const custom=result(.95,500);custom.level={...custom.level,starAccuracy:1,starAverageMs:400};
 assert.deepEqual(earnedStars(custom),{completed:true,accuracy:false,speed:false});
});
test('replays accumulate individual stars; infinite and developer overrides do not change level progress',()=>{
 let progress=mergeProgress({},result(1,900));
 progress=mergeProgress(progress,result(.5,300));
 assert.deepEqual(progress[progressId(result().level)],{completed:true,accuracy:true,speed:true});
 assert.deepEqual(mergeProgress(progress,result(0,null)),progress);
 assert.deepEqual(mergeProgress({}, {...result(),mode:'infinite'}),{});
 assert.deepEqual(mergeProgress({}, {...result(),overridden:true}),{});
});
test('progress migrates old history, survives history truncation and recovers after reload',()=>{
 const storage=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)}});
 try{
  storage.set(HISTORY_KEY,JSON.stringify([result()]));
  let progress=readProgress();assert.deepEqual(progress[progressId(result().level)],{completed:true,accuracy:true,speed:true});
  saveHistory({...result(0,null),level:{...result().level,levelId:'2'}},1);
  assert.deepEqual(readProgress()[progressId(result().level)],progress[progressId(result().level)]);
  writeProgress(mergeProgress(progress,result(0,null)));assert.deepEqual(readProgress()[progressId(result().level)],progress[progressId(result().level)]);
  storage.set(PROGRESS_KEY,'broken');storage.set(HISTORY_KEY,'[]');assert.deepEqual(readProgress(),{});
 }finally{delete (globalThis as any).localStorage;}
});
