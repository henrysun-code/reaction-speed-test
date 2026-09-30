import type {Level,Result,Stars} from '../types/index';
import {readHistory} from './history';

export const PROGRESS_KEY='reaction-speed-test:stars:v1';
export type Progress=Record<string,Stars>;
export const emptyStars=():Stars=>({completed:false,accuracy:false,speed:false});
export const progressId=(level:Level)=>level.ruleRevision?`${level.ruleRevision}:${level.progressTemplateId||level.levelId}`:level.levelId;
export const starTargets=(level:Level)=>({accuracy:level.starAccuracy??.9,averageMs:level.starAverageMs??600});
export function earnedStars(result:Result):Stars{
 const completed=result.trials?.length===result.level.stimulusCount;
 const targets=starTargets(result.level);
 return {completed,accuracy:completed&&result.stats.accuracy>=targets.accuracy,
  speed:completed&&result.stats.sampleCount>0&&result.stats.average!==null&&result.stats.average<=targets.averageMs};
}
export function mergeProgress(progress:Progress,result:Result):Progress{
 if(result.mode!=='level'||result.overridden)return progress;
 const id=progressId(result.level),earned=result.stars??earnedStars(result),old=progress[id]??emptyStars();
 return {...progress,[id]:{completed:old.completed||earned.completed,accuracy:old.accuracy||earned.accuracy,speed:old.speed||earned.speed}};
}
export function writeProgress(progress:Progress){localStorage.setItem(PROGRESS_KEY,JSON.stringify(progress));}
export function readProgress():Progress{
 let progress:Progress={};
 try{
  const stored=JSON.parse(localStorage.getItem(PROGRESS_KEY)||'{}');
  if(stored&&typeof stored==='object'&&!Array.isArray(stored))for(const [id,value] of Object.entries(stored)){
   const s=value as Stars;
   if(s&&['completed','accuracy','speed'].every(k=>typeof s[k as keyof Stars]==='boolean'))progress[id]=s;
  }
 }catch{/* Keep any valid history when progress storage is unavailable. */}
 // Migrate retained results; permanent progress survives the history limit.
 for(const result of readHistory())progress=mergeProgress(progress,result);
 try{writeProgress(progress);}catch{/* The app retains progress in memory. */}
 return progress;
}
