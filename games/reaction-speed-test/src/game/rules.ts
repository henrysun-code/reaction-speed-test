import type {Condition, Planned, Rule, Level} from '../types/index';
// Equivalent nested operators can share one visual group; mixed operators retain scope.
export function conditionBranches(c:Condition):Condition[]{
 const compound=c.compoundCondition;
 if(!compound)return [c];
 return compound.conditions.flatMap(child=>Object.keys(child).length===1&&child.compoundCondition?.op===compound.op?conditionBranches(child):[child]);
}
export function evaluate(c:Condition, plan:Planned[], i:number):boolean {
 const p=plan[i]; if(!p)return false;
 return (!c.targetType||p.stimulus.type===c.targetType)
 &&(!c.forbiddenType||p.stimulus.type!==c.forbiddenType)
 &&(!c.targetShape||p.stimulus.shape===c.targetShape)
 &&(!c.forbiddenShape||p.stimulus.shape!==c.forbiddenShape)
 &&(!c.allowedTypes||c.allowedTypes.includes(p.stimulus.type))
 &&(!c.positionCondition||(c.positionCondition==='left'?p.x<.5:p.x>=.5))
 &&(!c.distractorCondition||p.distractor===(c.distractorCondition==='present'))
 &&(!c.compoundCondition||(c.compoundCondition.op==='all'?c.compoundCondition.conditions.every(k=>evaluate(k,plan,i)):c.compoundCondition.conditions.some(k=>evaluate(k,plan,i))));
}
export function activeRule(level:Level,rules:Rule[],i:number){
 const first=rules.find(r=>r.id===level.ruleId)!;
 const second=level.secondaryRuleId||first.ruleSwitch;
 const at=level.switchAtTrial||Math.max(1,Math.floor(level.stimulusCount*(level.switchAtPercent||.5)));
 return {rule:rules.find(r=>r.id===(second&&i>=at?second:first.id))!,phase:second&&i>=at?2:1};
}
