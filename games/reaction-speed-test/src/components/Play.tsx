import {useEffect,useLayoutEffect,useRef,useState,type ReactNode} from 'react';
import {connectInput} from '../game/input';
import {Engine,type Snapshot} from '../game/engine';
import {activeRule} from '../game/rules';
import type {Config,Level,Planned,Trial} from '../types/index';
import {StimulusToken} from './StimulusToken';
import {RULE_GUIDE} from '../game/session-rules';
export function Play({config,level,plan,onComplete,onHit,initialPhase='countdown',prestart}:{config:Config;level:Level;plan:Planned[];onComplete:(t:Trial[])=>void;onHit:()=>void;initialPhase?:'countdown'|'ready';prestart?:ReactNode}){
 const area=useRef<HTMLDivElement>(null),img=useRef<HTMLImageElement>(null),background=useRef<HTMLImageElement>(null),engine=useRef<Engine|null>(null);const [s,setS]=useState<Snapshot>({phase:'idle',index:0,count:3,item:null,token:0,elapsed:0});
 const [feedback,setFeedback]=useState<{token:number;x:number;y:number}|null>(null);
 useEffect(()=>{const e=new Engine(level,plan,Number(config.settings.inputGuardMs),Number(config.settings.countdownSeconds),setS,onComplete);engine.current=e;const disconnect=connectInput(area.current!,d=>{if((d.type==='pointerdown'&&d.button===0)||(d.type==='keydown'&&d.key===' '&&!d.repeat)){if(e.input()){const rect=area.current!.getBoundingClientRect();setFeedback({token:e.state.token,x:d.type==='pointerdown'?(d.x-rect.left)/rect.width*100:50,y:d.type==='pointerdown'?(d.y-rect.top)/rect.height*100:50});onHit();}}if(d.type==='visibilitychange'&&d.hidden)e.pause();});const blur=()=>e.pause();window.addEventListener('blur',blur);if(initialPhase==='countdown')e.start();return()=>{e.destroy();disconnect();window.removeEventListener('blur',blur);};},[initialPhase]);
 useEffect(()=>{if(feedback===null)return;const timer=window.setTimeout(()=>setFeedback(null),420);return()=>window.clearTimeout(timer);},[feedback]);
 useLayoutEffect(()=>{if(s.phase!=='presenting')return;let cancelled=false,a=0,b=0;const ready=async()=>{await Promise.all([img.current?.decode().catch(()=>{}),background.current?.decode().catch(()=>{})]);if(cancelled)return;a=requestAnimationFrame(()=>{b=requestAnimationFrame(()=>{if(!cancelled&&!document.hidden)engine.current?.painted(s.token);});});};void ready();return()=>{cancelled=true;cancelAnimationFrame(a);cancelAnimationFrame(b);};},[s.token,s.phase]);
 const side=!level.randomPosition?'centered':s.item&&s.item.x<.5?'left':'right';
 const localX=s.item?(side==='left'?s.item.x*2:side==='right'?(s.item.x-.5)*2:s.item.x):.5;
 const rule=activeRule(level,config.rules,s.index).rule;
 const compactDescription=rule.description.startsWith(RULE_GUIDE)?rule.description.slice(RULE_GUIDE.length).trim():rule.description;
 return <><div className="play-top"><span>{level.name}</span><span>{Math.min(s.index+1,plan.length)} / {plan.length}</span></div><progress max={plan.length} value={s.index}/><div className="rule-banner" key={rule.id}><small>目前規則 · {rule.name}</small><h2>{compactDescription}</h2></div><div className="arena" ref={area} role="button" tabIndex={0} aria-label="反應測試區域，符合規則時點擊任意位置或按空白鍵" onContextMenu={e=>e.preventDefault()}>
 <span className="side left">左側</span><span className="side right">右側</span><div className="divider"/>
 {feedback?.token===s.token&&s.phase==='active'&&<div className="input-feedback" key={feedback.token} aria-hidden="true"><i className="input-ripple" style={{left:`${feedback.x}%`,top:`${feedback.y}%`}}/></div>}
 {s.phase==='countdown'&&<div className="center countdown">{s.count}</div>}{s.phase==='gap'&&<div className="center waiting">等待下一個刺激</div>}
 {s.item&&<><div className={`stimulus-region ${side}`}><StimulusToken ref={img} className="stimulus" stimulus={s.item.stimulus} config={config} style={{left:`clamp(var(--stimulus-edge-inset), ${localX*100}%, calc(100% - var(--stimulus-edge-inset)))`,top:`clamp(var(--stimulus-edge-inset), ${s.item.y*100}%, calc(100% - var(--stimulus-edge-inset)))`}}/></div>{s.item.distractor&&<img ref={background} className="noise" draggable={false} alt="背景水母" src={config.assets.noise}/>}</>}
 {s.phase==='idle'&&initialPhase==='ready'&&<div className="center waiting">挑戰準備中</div>}{s.phase==='paused'&&<div className="center pause"><h2>測試已暫停</h2><p>目前刺激已取消，繼續後重新呈現。</p><button onClick={()=>engine.current?.resume()}>繼續測試</button></div>}
 </div><p className="muted">符合規則時，點擊遊戲區任意位置。無須追著圖示點。<br/>每個刺激只記錄第一次輸入。</p>{prestart&&<div className="prestart-backdrop">{prestart}</div>}</>;
}

