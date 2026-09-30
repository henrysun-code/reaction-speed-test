import {loadConfig} from '../../../../shared/config/config-loader.js';
import {preloadAssets} from '../../../../shared/preload/asset-preloader.js';
import type {Config} from '../types/index';
// Keep workbook conditions intact while making the current color cue explicit.
const ringText=(text:string)=>text.replace(/(金色|棕色|紅色|藍色|綠色)(圖形|方形|三角形|圓形|菱形|十字)?/g,(_,color,shape)=>`${color}外圈${shape&&shape!=='圖形'?'的'+shape:''}`);
export async function load(){
 const raw=await loadConfig(`${import.meta.env.BASE_URL}config/generated/game_config.json`);
 const pairs=(rows:any[])=>Object.fromEntries(rows.map(r=>[r.key,r.value]));const setting=pairs(raw.GameSettings);
 for(const k of ['debugMode','soundEnabled'])setting[k]=String(setting[k]).toLowerCase()==='true';
 const folders:Record<string,string>={target:'targets',distractor:'distractors',background:'backgrounds',effect:'effects',ui:'ui'};
 const assets=Object.fromEntries(raw.Assets.filter((r:any)=>String(r.enabled).toLowerCase()==='true').map((r:any)=>[r.id,`${import.meta.env.BASE_URL}assets/images/${r.file.includes('/')?r.file:folders[r.category]+'/'+r.file}`]));
 const audio=raw.Audio.filter((r:any)=>String(r.enabled).toLowerCase()==='true').map((r:any)=>({...r,src:`${import.meta.env.BASE_URL}assets/audio/${r.category}/${r.file}`}));
 const loaded=await preloadAssets([...Object.values(assets).map(src=>({src,type:'image'})),...audio.map((a:any)=>({src:a.src,type:'audio'}))]);if(loaded.some((r:any)=>!r.ok))throw Error('素材載入失敗，請檢查 Assets 與 Audio 設定。');
 return {config:{settings:setting,levels:raw.Levels.filter((l:any)=>l.enabled),rules:raw.Rules.map((r:any)=>({...r,description:ringText(r.description)})),stimuli:raw.Stimuli.map((s:any)=>({...s,name:ringText(s.name)})),infinite:pairs(raw.InfiniteMode),assets,audio,text:Object.fromEntries(raw.Text.map((r:any)=>[r.key,r.text]))} as Config,loaded};
}
