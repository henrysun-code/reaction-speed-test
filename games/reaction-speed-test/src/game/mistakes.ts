import type {Condition,Config,Planned,Rule,Stimulus,Trial} from '../types/index';
import {evaluate} from './rules';
import {colorName,productName,ruleRequirements} from './session-rules';

export function trialStimulus(trial:Trial,config:Config):Stimulus {
 const image=config.stimuli.find(s=>s.id===trial.stimulusId)
  ??config.stimuli.find(s=>s.shape===trial.stimulusShape);
 return {id:trial.stimulusId,name:trial.stimulusShape?productName(trial.stimulusShape,config):'商品未記錄',type:trial.stimulusType,shape:trial.stimulusShape??'',image:image?.image??'',enabled:true};
}
function requirement(c:Condition,config:Config):string {
 if(c.targetType)return `外圈須為${colorName(c.targetType)}`;
 if(c.forbiddenType)return `外圈不能是${colorName(c.forbiddenType)}`;
 if(c.allowedTypes)return `外圈須為${c.allowedTypes.map(colorName).join('或')}`;
 if(c.targetShape)return `商品須為 ${productName(c.targetShape,config)}`;
 if(c.forbiddenShape)return `商品不能是 ${productName(c.forbiddenShape,config)}`;
 if(c.positionCondition)return `商品須在${c.positionCondition==='left'?'左':'右'}半邊`;
 if(c.distractorCondition)return c.distractorCondition==='present'?'背景須有水母':'背景不能有水母';
 return '';
}
/** Use the saved session rule, including branch scope and the trial's switch phase. */
export function mistakeReason(trial:Trial,rules:Rule[]|undefined,config:Config):string {
 const rule=rules?.find(r=>r.id===trial.ruleId);
 if(!rule||!trial.stimulusShape||typeof trial.distractor!=='boolean')
  return '此筆舊紀錄未保存完整情境，無法還原詳細原因。';
 const item:Planned={stimulus:trialStimulus(trial,config),x:trial.positionX,y:trial.positionY,distractor:trial.distractor,interval:0,ruleId:trial.ruleId,rulePhase:trial.rulePhase,shouldClick:trial.shouldClick};
 const fits=(c:Condition)=>evaluate(c,[item],0);
 if(fits(rule.condition)!==trial.shouldClick)return '此筆紀錄的規則與情境不一致，無法還原詳細原因。';
 const {necessary,alternatives}=ruleRequirements(rule.condition);
 if(trial.miss){
  const matched=alternatives.find(row=>row.every(fits))??[];
  const labels=[...necessary,...matched].map(atom=>requirement(atom,config));
  return `這次應該點擊，但你沒有點。${labels.length?'\n符合的條件：\n'+labels.join('\n'):'\n本次規則要求所有商品都要點。'}`;
 }
 const missing=necessary.filter(atom=>!fits(atom));
 if(missing.length)return '未符合必要條件：\n'+missing.map(atom=>requirement(atom,config)).join('\n');
 const rows=alternatives.map(row=>row.filter(atom=>!fits(atom)).map(atom=>requirement(atom,config)).join('、'));
 return rows.length===1?'這次不應點擊，未符合：\n'+rows[0]
  :'沒有符合任一達成項目：\n'+rows.map((text,i)=>`項目 ${i+1} 缺少：${text}`).join('\n');
}
