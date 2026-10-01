import type {Config} from '../types/index';
import {seeded,planLevel} from './generator';
import {drawSessionRules} from './session-rules';

export function dailyDate(now=new Date()):string{
 const parts=new Intl.DateTimeFormat('en-US',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now);
 return ['year','month','day'].map(type=>parts.find(p=>p.type===type)!.value).join('-');
}
export function dateSeed(date:string){
 let hash=2166136261;for(const char of `reaction-daily-v1:${date}`)hash=Math.imul(hash^char.charCodeAt(0),16777619);return hash>>>0;
}
export function dailyChallenge(config:Config,date=dailyDate(),previous?:string,random=Math.random){
 const templateRandom=seeded(dateSeed(date));
 // Stable template order preserves the daily draw when level numbers are reordered.
 const pool=config.levels.filter(l=>l.enabled).sort((a,b)=>Number(a.progressTemplateId||a.levelId)-Number(b.progressTemplateId||b.levelId));
 if(!pool.length)throw Error('每日關卡沒有可用模板。');
 const base=pool[Math.floor(templateRandom()*pool.length)];
 const level={...base,levelId:`daily-${date}`,name:`每日挑戰 ${date}`,secondaryRuleId:base.secondaryRuleId||''};
 const drawn=drawSessionRules(config,level,previous,random);
 return {date,level,config:drawn.config,selection:drawn.selection,plan:planLevel(drawn.config,level,random)};
}
