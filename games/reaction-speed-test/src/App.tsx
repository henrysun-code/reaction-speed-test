import {useEffect,useRef,useState} from 'react';
import {AudioManager} from '../../../shared/audio/audio-manager.js';
import {GameLifecycle} from '../../../shared/lifecycle/game-lifecycle.js';
import {DebugPanel} from '../../../shared/debug/debug-panel.js';
import {InputManager} from '../../../shared/input/input-manager.js';
import type {Config,Level,Planned,Result,Trial} from './types/index';
import {planLevel,infiniteLevel} from './game/generator';
import {drawSessionRules,sessionRuleSummary,describeCondition} from './game/session-rules';
import {dailyChallenge,dailyDate} from './game/daily';
import {statistics} from './utils/statistics';
import {earnedStars,emptyStars,mergeProgress,readProgress,writeProgress,starTargets,progressId} from './utils/stars';
import {LevelStars} from './components/LevelStars';
import {readHistory,saveHistory} from './utils/history';
import {Play} from './components/Play';
import {StimulusToken,RuleExamples} from './components/StimulusToken';
import {Results} from './components/Results';
import {Developer,type Overrides} from './components/Developer';
import {tutorialDescription} from "./game/tutorial";
import {History} from './components/History';
type Session={level:Level;plan:Planned[];config:Config;mode:string;id:number};
export function App({config,preloading}:{config:Config;preloading:Promise<any[]>}){
 const [loaded,setLoaded]=useState<any[]>([]),[assetStatus,setAssetStatus]=useState('loading');
 useEffect(()=>{let active=true;preloading.then(items=>{if(active){setLoaded(items);setAssetStatus(items.every(item=>item.ok)?'ready':'failed');}}).catch(()=>{if(active)setAssetStatus('failed');});return()=>{active=false;};},[preloading]);
 const [page,setPage]=useState('home'),[session,setSession]=useState<Session|null>(null),[result,setResult]=useState<Result|null>(null),[history,setHistory]=useState(readHistory),[override,setOverride]=useState<Overrides>({}),[error,setError]=useState('');
 const [progress,setProgress]=useState(readProgress);
 const [today,setToday]=useState(dailyDate);
 useEffect(()=>{if(page==='rules')document.querySelector<HTMLElement>('.prestart-card')?.focus({preventScroll:true});},[page,session?.id]);
 const lastDraw=useRef<Record<string,string>>({});
 const recent=useRef<string[]>([]),counter=useRef(0),audio=useRef<AudioManager|null>(null),life=useRef<GameLifecycle|null>(null);
 const enabledProducts=config.stimuli.filter(s=>s.enabled);
 const homepageProducts=enabledProducts.filter((s,i)=>enabledProducts.findIndex(other=>config.assets[other.image]===config.assets[s.image])===i);
 const tutorials=config.tutorials||[];
 const debug=config.settings.debugMode||new URLSearchParams(location.search).get('debug')==='1';
 useEffect(()=>{const update=()=>setToday(dailyDate());const timer=window.setInterval(update,30000);window.addEventListener('focus',update);return()=>{window.clearInterval(timer);window.removeEventListener('focus',update);};},[]);
 useEffect(()=>{audio.current=new AudioManager({enabled:config.settings.soundEnabled});const lifecycle=new GameLifecycle();lifecycle.transition('ready');life.current=lifecycle;return()=>{audio.current?.destroy();lifecycle.destroy();};},[]);
 useEffect(()=>{if(!debug||override.debug===false)return;const input=new InputManager();const panel=new DebugPanel({enabled:true,gameId:config.settings.gameId,version:config.settings.gameVersion,lifecycle:life.current,input,loadedAssets:loaded} as any);return()=>{panel.destroy();input.destroy();};},[debug,override.debug,loaded]);
 function prepare(base:Level,mode='level',repeat=false){try{setError('');let c=structuredClone(config),l={...base};
  if(mode==='tutorial'){const lesson=tutorials.find(t=>t.levelId===base.levelId);if(!lesson)throw Error('找不到教學關卡。');c.rules=[...c.rules,{id:lesson.ruleId,name:lesson.name,description:describeCondition(lesson.condition,c),condition:lesson.condition}];}
  if(mode==='daily'){
   const date=dailyDate(),key=`daily:${date}`;const d=dailyChallenge(c,date,lastDraw.current[key]);lastDraw.current[key]=d.selection;setToday(d.date);audio.current!.enabled=override.soundEnabled??c.settings.soundEnabled;setSession({level:d.level,config:d.config,plan:d.plan,mode,id:performance.now()});setPage('rules');return;
  }
  if(mode==='infinite'&&!repeat){const generated=infiniteLevel(c,++counter.current,recent.current);l=generated.level;recent.current=[...recent.current,generated.signature].slice(-Number(c.infinite.recentSignatures));}
  if(mode!=='tutorial')l={...l,...Object.fromEntries(Object.entries(override).filter(([,v])=>v!==undefined))};
  if(mode!=='tutorial'&&override.ruleId){l.secondaryRuleId='';l.switchAtTrial=Math.floor(l.stimulusCount/2);}
  const drawKey=`${mode}:${l.levelId}`;const drawn=drawSessionRules(c,l,lastDraw.current[drawKey]);c=drawn.config;if(mode==="tutorial")c.rules=c.rules.map(r=>r.id===l.ruleId?{...r,description:tutorialDescription(r.condition,c)}:r);
  if(mode!=='tutorial'&&(override.targetType||override.forbiddenType)){const rule=structuredClone(c.rules.find(r=>r.id===l.ruleId)!);rule.id=l.ruleId;rule.condition={...rule.condition,...(override.targetType?{targetType:override.targetType}:{}),...(override.forbiddenType?{forbiddenType:override.forbiddenType}:{})};rule.description=describeCondition(rule.condition,c);c.rules=c.rules.map(r=>r.id===rule.id?rule:r);l.ruleId=rule.id;}
  if(!Number.isInteger(l.stimulusCount)||l.stimulusCount<3||l.stimulusCount>500||l.minInterval<Number(c.settings.inputGuardMs)||l.maxInterval<l.minInterval||l.stimulusDuration<300||![l.targetRatio,l.requiredAccuracy].every(v=>v>=0&&v<=1))throw Error('覆寫數值無效：請檢查數量、間隔及 0–1 比例。');
  const plan=planLevel(c,l);lastDraw.current[drawKey]=drawn.selection;audio.current!.enabled=override.soundEnabled??c.settings.soundEnabled;setSession({level:l,plan,config:c,mode,id:performance.now()});setPage('rules');
 }catch(e){setError(String(e));}}
 function begin(){if(assetStatus!=='ready')return;life.current?.transition('ready');life.current?.transition('playing');window.dispatchEvent(new CustomEvent('012s:gameStart',{detail:{gameId:config.settings.gameId,version:config.settings.gameVersion,timestamp:performance.now(),level:session!.level.levelId,mode:session!.mode}}));setPage('play');}
 function returnToLevels(){
  if(life.current?.state==='playing'||life.current?.state==='paused'){
   life.current.destroy();life.current=new GameLifecycle();life.current.transition('ready');
  }else if(life.current?.state==='completed')life.current.transition('ready');
  const destination=session?.mode==='tutorial'?'tutorials':'levels';setSession(null);setPage(destination);
 }
 function finish(trials:Trial[]){const current=session!;const r:Result={date:new Date().toISOString(),level:current.level,mode:current.mode,rule:sessionRuleSummary(current.config,current.level),rules:current.config.rules.filter(r=>r.id===current.level.ruleId||r.id===(current.level.secondaryRuleId||current.config.rules.find(first=>first.id===current.level.ruleId)?.ruleSwitch)),stats:statistics(trials,current.level.requiredAccuracy),trials,overridden:current.mode!=='tutorial'&&Object.values(override).some(v=>v!==undefined)};r.stars=earnedStars(r);setResult(r);const nextProgress=mergeProgress(progress,r);setProgress(nextProgress);try{writeProgress(nextProgress);}catch{setError('星星暫存於目前頁面，瀏覽器未允許永久儲存。');}try{setHistory(saveHistory(r,Number(config.settings.historyLimit)));}catch{setHistory([r,...history]);setError('瀏覽器未允許儲存，這次成績只保留於目前頁面。');}life.current?.transition('playing');life.current?.transition('completed');window.dispatchEvent(new CustomEvent('012s:gameComplete',{detail:{gameId:config.settings.gameId,version:config.settings.gameVersion,timestamp:performance.now(),results:r}}));setPage('result');}
 function next(){if(session?.mode==='tutorial'){const i=tutorials.findIndex(l=>l.levelId===session.level.levelId);if(i+1<tutorials.length)prepare(tutorials[i+1],'tutorial');else returnToLevels();}else if(session?.mode==='daily')returnToLevels();else if(session?.mode==='infinite')prepare(session.level,'infinite');else{const i=config.levels.findIndex(l=>l.levelId===session?.level.levelId);if(i+1<config.levels.length)prepare(config.levels[i+1]);else setPage('levels');}}
 return <div className={`shell page-${page} ${page!=="home"&&page!=="levels"&&page!=="tutorials"?"single-screen":""}`}><header><button className="brand" onClick={()=>{if(page!=='play')setPage('home');}}>012s <span>PLAY LAB</span></button><span className="version">REACTION / 01 · v{config.settings.gameVersion}</span></header>{error&&<p role="alert" className="error">{error}</p>}
 {page==='home'&&<><section className="intro"><span className="eyebrow">觀察 · 判斷 · 行動</span><h1>你的反應，<br/><em>跟得上判斷嗎？</em></h1><p>看清楚規則，在對的時刻點擊。<br/>100 關挑戰，同一組商品，不同的思考方式。</p><div className="sample-pool">{homepageProducts.map(s=><StimulusToken key={s.id} stimulus={s} config={config}/>)}</div></section><div className="menu">{tutorials.length>0&&<button className="secondary" onClick={()=>setPage('tutorials')}><span>學</span><strong>新手教學<small>每關一種規則，從辨識開始</small></strong><b>↗</b></button>}<button onClick={()=>setPage('levels')}><span>01</span><strong>關卡模式<small>100 種規則，逐一挑戰</small></strong><b>↗</b></button><button className="secondary" onClick={()=>prepare(config.levels[0],'infinite')}><span>∞</span><strong>無限模式<small>持續生成新的規則組合</small></strong><b>↗</b></button><button className="secondary" onClick={()=>prepare(config.levels[0],'daily')}><span>日</span><strong>每日關卡<small>{today} · 每天一組固定規則</small></strong><b>↗</b></button><button className="ghost" onClick={()=>setPage('history')}>查看歷史紀錄 →</button></div>{debug&&<Developer config={config} value={override} onChange={setOverride} onStart={()=>prepare(config.levels[0],override.mode||'level')}/>}</>}
 {page==='tutorials'&&<><span className="eyebrow">TUTORIAL</span><h1>新手教學</h1><p>每關只練一種規則。符合時點擊遊戲區任意位置，其餘不要點。</p><div className="tutorial-grid">{tutorials.map((l,i)=><button className="secondary tutorial-lesson" key={l.levelId} onClick={()=>prepare(l,'tutorial')}><span className="level-number">{String(i+1).padStart(2,'0')}</span><strong>{l.name}</strong><LevelStars stars={progress[progressId(l)]||emptyStars()}/></button>)}</div><div className="actions"><button onClick={()=>setPage('levels')}>進入正式關卡</button><button className="ghost" onClick={()=>setPage('home')}>回主畫面</button></div></>}
 {page==='levels'&&<><span className="eyebrow">LEVEL SELECT</span><h1>選一種挑戰</h1><p>選擇關卡編號，查看本次目標。</p><p className="star-legend">三顆星依序為：完成 · 準確率 · 平均判斷時間</p><div className="level-grid">{config.levels.map((l,i)=><button className="secondary" key={l.levelId} aria-label={`第 ${i+1} 關：${l.name}，已取得 ${Object.values(progress[progressId(l)]||emptyStars()).filter(Boolean).length} 顆星`} onClick={()=>prepare(l)}><span className="level-number">{String(i+1).padStart(2,'0')}</span><LevelStars stars={progress[progressId(l)]||emptyStars()}/></button>)}</div><button className="ghost" onClick={()=>setPage('home')}>回主畫面</button></>}
 {page==='rules'&&session&&<><div className="play-nav"><button className="secondary" onClick={returnToLevels}>{session?.mode==='tutorial'?'退出本局 · 教學選單':'退出本局 · 選擇關卡'}</button></div><Play key={session.id} config={session.config} level={session.level} plan={session.plan} onComplete={finish} onHit={()=>{const hit=config.audio.find(a=>a.id==='hit');if(hit)audio.current?.playSfx(hit.src,{volume:hit.volume});}} initialPhase="ready" prestart={<section className="prestart-card" tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="prestart-title"><h1 id="prestart-title">{session.mode==='tutorial'?`教學 ${tutorials.findIndex(t=>t.levelId===session.level.levelId)+1} · ${session.level.name}`:session.mode==='daily'?session.level.name:`第 ${session.level.levelId} 關`}</h1><div className="prestart-information"><div className="rule-card"><h2>{sessionRuleSummary(session.config,session.level).replace(/\n\n/g,"\n")}</h2></div><p className="star-goals">★ 完成全部 {session.level.stimulusCount} 次　★ 準確率 ≥ {Math.round(starTargets(session.level).accuracy*100)}%　★ 平均判斷 ≤ {starTargets(session.level).averageMs}ms</p><RuleExamples config={session.config} level={session.level} rule={session.config.rules.find(r=>r.id===session.level.ruleId)!}/></div><div className="actions"><button disabled={assetStatus!=="ready"} onClick={()=>{begin();document.querySelector<HTMLDivElement>('.arena')?.focus();}}>{assetStatus==="ready"?"開始本次挑戰":assetStatus==="failed"?"圖片載入失敗，請重新整理":"正在準備遊戲圖片…"}</button><button className="secondary" onClick={returnToLevels}>{session.mode==='tutorial'?'回到教學選單':'回到選擇關卡'}</button></div></section>}/></>}
 {page==='play'&&session&&<><div className="play-nav"><button className="secondary" onClick={returnToLevels}>{session?.mode==="tutorial"?"退出本局 · 教學選單":"退出本局 · 選擇關卡"}</button></div><Play key={session.id} config={session.config} level={session.level} plan={session.plan} onComplete={finish} onHit={()=>{const hit=config.audio.find(a=>a.id==='hit');if(hit)audio.current?.playSfx(hit.src,{volume:hit.volume});}}/> </>}
 {page==='result'&&result&&<Results result={result} history={history} disclaimer={config.text.disclaimer} onNext={next} onRetry={()=>prepare(session!.level,session!.mode,true)} onHome={()=>setPage('home')} onSelectLevels={returnToLevels}/>}
 {page==='history'&&<History history={history} limit={Number(config.settings.historyLimit)} onHome={()=>setPage('home')}/>}
 <footer>012s WORKS <span>每一次，都專注在當下。</span></footer></div>;
}




