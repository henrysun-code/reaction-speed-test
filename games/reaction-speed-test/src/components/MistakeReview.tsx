import {useState} from 'react';
import type {Config,Result} from '../types/index';
import {colorName} from '../game/session-rules';
import {mistakeReason,trialStimulus} from '../game/mistakes';
import {StimulusToken} from './StimulusToken';
import {RuleText} from './RuleText';

export function MistakeReview({result,config}:{result:Result;config:Config}){
 const mistakes=result.trials.filter(t=>t.falseAlarm||t.miss);
 const [index,setIndex]=useState(0);
 const trial=mistakes[Math.min(index,mistakes.length-1)];
 if(!trial)return <div className="review-empty">這次沒有誤點或漏點。</div>;
 const stimulus=trialStimulus(trial,config);
 return <section className="mistake-review" aria-label="錯題回顧">
  <div className="review-title"><strong>第 {trial.trialIndex} 次 · {trial.falseAlarm?'誤點':'漏點'}</strong><span>應該{trial.shouldClick?'點擊':'不點'}</span></div>
  <div className="review-body">
   <div className="review-example">
    <div className="review-art">{trial.distractor===true&&<img className="review-jelly" src={config.assets.noise} alt="背景有水母"/>}{config.assets[stimulus.image]?<StimulusToken stimulus={stimulus} config={config}/>:<span>商品圖片未記錄</span>}</div>
    <strong>{stimulus.name}</strong>
    <small>{colorName(trial.stimulusType)}外圈 · {result.level.randomPosition?(trial.positionX<.5?'左半邊':'右半邊'):'中央'} · {typeof trial.distractor==='boolean'?(trial.distractor?'有水母':'沒有水母'):'水母狀態未記錄'}</small>
   </div>
   <div className="review-reason"><RuleText key={trial.trialIndex} text={mistakeReason(trial,result.rules,config)}/></div>
  </div>
  <nav className="review-pagination" aria-label="錯題切換"><button className="secondary" disabled={index===0} onClick={()=>setIndex(index-1)}>上一題</button><span>{index+1} / {mistakes.length}</span><button className="secondary" disabled={index>=mistakes.length-1} onClick={()=>setIndex(index+1)}>下一題</button></nav>
 </section>;
}
