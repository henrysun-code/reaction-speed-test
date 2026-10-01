import type {Config,Condition} from '../types/index';
import {describeCondition,RULE_GUIDE} from './session-rules';
export function tutorialDescription(condition:Condition,config:Config){
 return '只判斷本關規則：符合就點，不符合就不要點。\n\n'+describeCondition(condition,config).replace(RULE_GUIDE,'').trim().replace(/必要條件：|達成條件（全部符合）：|達成條件：/g,'本關規則：');
}
