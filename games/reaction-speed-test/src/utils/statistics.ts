import type {Trial,Stats} from '../types/index';
export function statistics(trials:Trial[],threshold:number):Stats{
 const rt=trials.filter(t=>t.shouldClick&&t.playerClicked&&t.correct&&t.reactionTime!==null).map(t=>t.reactionTime!).sort((a,b)=>a-b);
 const average=rt.length?rt.reduce((a,b)=>a+b,0)/rt.length:null;
 const accuracy=trials.length?trials.filter(t=>t.correct).length/trials.length:0;
 return {average,fastest:rt[0]??null,slowest:rt.at(-1)??null,median:rt.length?(rt[Math.floor((rt.length-1)/2)]+rt[Math.floor(rt.length/2)])/2:null,stability:rt.length>=2?Math.sqrt(rt.reduce((s,x)=>s+(x-average!)**2,0)/rt.length):null,accuracy,correctClicks:rt.length,falseAlarms:trials.filter(t=>t.falseAlarm).length,misses:trials.filter(t=>t.miss).length,passed:accuracy>=threshold&&rt.length>0,sampleCount:rt.length};
}
