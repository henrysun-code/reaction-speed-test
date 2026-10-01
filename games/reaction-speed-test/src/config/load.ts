import {loadConfig} from '../../../../shared/config/config-loader.js';
import {preloadAssets} from '../../../../shared/preload/asset-preloader.js';
import type {Config} from '../types/index';
// Keep workbook conditions intact while making the current color cue explicit.
const ringText=(text:string)=>text.replace(/(金色|棕色|紅色|藍色|綠色)(圖形|方形|三角形|圓形|菱形|十字)?/g,(_,color,shape)=>`${color}外圈${shape&&shape!=='圖形'?'的'+shape:''}`);
export async function load(base=import.meta.env?.BASE_URL??"./"){
 const raw=await loadConfig(`${base}config/generated/game_config.json`);
 const pairs=(rows:any[])=>Object.fromEntries(rows.map(r=>[r.key,r.value]));const setting=pairs(raw.GameSettings);
 for(const k of ['debugMode','soundEnabled'])setting[k]=String(setting[k]).toLowerCase()==='true';
 const folders:Record<string,string>={target:'targets',distractor:'distractors',background:'backgrounds',effect:'effects',ui:'ui'};
 const assets=Object.fromEntries(raw.Assets.filter((r:any)=>String(r.enabled).toLowerCase()==='true').map((r:any)=>[r.id,`${base}assets/images/${r.file.includes('/')?r.file:folders[r.category]+'/'+r.file}`]));
 const audio=raw.Audio.filter((r:any)=>String(r.enabled).toLowerCase()==='true').map((r:any)=>({...r,src:`${base}assets/audio/${r.category}/${r.file}`}));
 // Render the menu without waiting for artwork or optional audio. Only warm
 // images used by enabled stimuli and the star cue; unused legacy art is omitted.
 const images=new Set<string>(raw.Stimuli.filter((s:any)=>s.enabled).map((s:any)=>assets[s.image]));
 if(assets.noise)images.add(assets.noise);
 const preloading=preloadAssets([...images].map(src=>({src,type:'image'})));
 return {config:{settings:setting,levels:raw.Levels.filter((l:any)=>l.enabled),rules:raw.Rules.map((r:any)=>({...r,description:ringText(r.description)})),stimuli:raw.Stimuli.map((s:any)=>({...s,name:ringText(s.name)})),infinite:pairs(raw.InfiniteMode),assets,audio,text:Object.fromEntries(raw.Text.map((r:any)=>[r.key,r.text]))} as Config,preloading};
}
