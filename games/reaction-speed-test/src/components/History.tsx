import {RuleText} from './RuleText';
import {RULE_GUIDE} from '../game/session-rules';
import {useState} from 'react';
import type {Result} from '../types/index';
import {LevelStars} from './LevelStars';
import {earnedStars} from '../utils/stars';
import {ms} from './Results';
import {ScreenTabs} from './ScreenTabs';
export function History({history,limit,onHome}:{history:Result[];limit:number;onHome:()=>void}){
 const [index,setIndex]=useState(0),[view,setView]=useState(0);const r=history[index];
 return <section className="history-screen"><span className="eyebrow">YOUR RECORDS</span><h1>歷史紀錄</h1><p className="muted">此瀏覽器最近 {limit} 筆成績</p>{!r?<div className="rule-card">尚無紀錄，開始第一個挑戰吧。</div>:<><ScreenTabs items={['成績','本場規則','點擊原則']} value={view} onChange={setView}/><article className="history-row"><div><strong>{r.level.name}</strong><LevelStars stars={r.stars??earnedStars(r)}/><small>{new Date(r.date).toLocaleString('zh-TW')} · {r.mode}{r.overridden?' · 測試覆寫':''}</small>{view===1&&<RuleText text={r.rule.replace(RULE_GUIDE,'').trim()}/>}<p className="history-principle" hidden={view!==2}>{RULE_GUIDE}</p></div>{view===0&&<div><strong>{ms(r.stats.average)}</strong><small>正確率 {Math.round(r.stats.accuracy*100)}% · 誤點 {r.stats.falseAlarms} · 漏點 {r.stats.misses}<br/>穩定度 {r.stats.stability===null?'資料不足':'±'+ms(r.stats.stability)}</small></div>}</article><nav className="record-pagination" aria-label="歷史分頁"><button className="secondary" disabled={index===0} onClick={()=>setIndex(index-1)}>上一筆</button><span>{index+1} / {history.length}</span><button className="secondary" disabled={index===history.length-1} onClick={()=>setIndex(index+1)}>下一筆</button></nav></>}<button className="ghost" onClick={onHome}>回主畫面</button></section>;
}
