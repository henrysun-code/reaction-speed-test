import type {Config,Level,Planned,Rule} from '../types/index';
import {evaluate} from '../game/rules';
export const INFINITE_SESSION_KEY='reaction-speed-test:infinite-session:v1';
export type InfiniteSession={level:Level;plan:Planned[];rules:Rule[];counter:number;recent:string[]};
const revision=(config:Config)=>JSON.stringify([config.settings,config.levels,config.rules,config.stimuli,config.infinite]);
export function saveInfiniteSession(config:Config,snapshot:InfiniteSession){
 try{sessionStorage.setItem(INFINITE_SESSION_KEY,JSON.stringify({revision:revision(config),snapshot}));return true;}catch{return false;}
}
export function clearInfiniteSession(){try{sessionStorage.removeItem(INFINITE_SESSION_KEY);}catch{/* Storage may be unavailable. */}}
export function readInfiniteSession(config:Config):InfiniteSession|null{
 try{
  const saved=JSON.parse(sessionStorage.getItem(INFINITE_SESSION_KEY)||'null');
  if(!saved||saved.revision!==revision(config))return null;
  const s=saved.snapshot as InfiniteSession;
  if(!Number.isInteger(s.counter)||s.counter<1||s.level?.levelId!==`infinite-${s.counter}`||!Array.isArray(s.plan)||s.plan.length!==s.level.stimulusCount||!Array.isArray(s.rules)||!Array.isArray(s.recent))return null;
  if(!s.rules.some(r=>r.id===s.level.ruleId))return null;
  for(const [i,p] of s.plan.entries()){
   const source=config.stimuli.find(item=>item.enabled&&item.id===p.stimulus?.id),rule=s.rules.find(r=>r.id===p.ruleId);
   if(!source||!rule||JSON.stringify(source)!==JSON.stringify(p.stimulus)||![p.x,p.y,p.interval].every(Number.isFinite)||p.shouldClick!==evaluate(rule.condition,s.plan,i))return null;
  }
  return s;
 }catch{return null;}
}
