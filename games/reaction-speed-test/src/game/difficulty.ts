import type {Condition} from '../types/index';

/** Trial tuning values, based on visible checks rather than short-circuit execution. */
export function ruleDifficulty(condition:Condition){
 const checks=new Set<string>();let exclusions=0,andGroups=0,absent=0;const operators=new Set<string>();
 const visit=(c:Condition)=>{
  for(const [key,value] of Object.entries(c)){
   if(key==='compoundCondition')continue;
   if(key==='allowedTypes'){
    (value as string[]).forEach(color=>checks.add(`targetType:${color}`));
    if((value as string[]).length>1)operators.add('any');
   }else checks.add(`${key}:${value}`);
   if(key==='forbiddenType'||key==='forbiddenShape')exclusions++;
   if(key==='distractorCondition'&&value==='absent')absent++;
  }
  const fields=Object.keys(c).filter(k=>k!=='compoundCondition').length;
  if(fields+(c.compoundCondition?1:0)>1){andGroups++;operators.add('all');}
  if(c.compoundCondition){
   if(c.compoundCondition.conditions.length>1){operators.add(c.compoundCondition.op);if(c.compoundCondition.op==='all')andGroups++;}
   c.compoundCondition.conditions.forEach(visit);
  }
 };
 visit(condition);
 const count=checks.size,mixed=operators.size>1;
 const averageMs=count<=2&&!exclusions&&!andGroups?600:count<=3&&exclusions<=1?750:900;
 return {checks:count,averageMs,score:count*100+exclusions*10+(mixed?5:0)+andGroups*2+absent};
}
