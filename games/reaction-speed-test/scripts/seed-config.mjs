// One-time authoring helper. Runtime/build never overwrite the designer's workbook.
import XLSX from 'xlsx';
import fs from 'node:fs';
const settings={gameId:'reaction-speed-test',gameName:'反應速度測試',gameVersion:'1.0.0',debugMode:false,soundEnabled:true,language:'zh-Hant',historyLimit:100,positionMin:.2,positionMax:.8,inputGuardMs:280,countdownSeconds:3};
const rules=[
 ['gold','金色目標','看到金色圓形就點擊，其餘不要點。',{targetType:'gold'}],
 ['brown','棕色目標','看到棕色方形就點擊，其餘不要點。',{targetType:'brown'}],
 ['forbid','紅色禁止','點擊金色圓形；紅色三角形禁止點擊。',{targetType:'gold',forbiddenType:'red'}],
 ['left','左側金色','只有左半邊的金色圓形可以點擊。',{targetType:'gold',positionCondition:'left'}],
 ['dual','雙目標','金色圓形與棕色方形都可以點擊。',{allowedTypes:['gold','brown']}],
 ['distract','忽略干擾','點擊金色圓形；灰色星星是干擾物，不要理它。',{targetType:'gold'}],
 ['no-red','紅圈禁點','紅色不能點，其餘色環都要點。',{forbiddenType:'red'}],
 ['switch','中途切換','前半點金色圓形，後半改點棕色方形。',{targetType:'gold'},'brown'],
 ['compound','複合判斷','點左側金色圓形，或右側棕色方形。',{compoundCondition:{op:'any',conditions:[{targetType:'gold',positionCondition:'left'},{targetType:'brown',positionCondition:'right'}]}}],
 ['combined','綜合模式','前半：左側金色或右側棕色；後半：有灰色星星時甚麼都別點，沒有時只點金色。',{compoundCondition:{op:'any',conditions:[{targetType:'gold',positionCondition:'left'},{targetType:'brown',positionCondition:'right'}]}},'distract'],


 ['clear','無干擾時點擊','只有沒有灰色星星時，才點擊金色圓形。',{targetType:'gold',distractorCondition:'absent'}]
].map(([id,name,description,condition,ruleSwitch])=>({id,name,description,condition:JSON.stringify(condition),ruleSwitch:ruleSwitch||''}));
const stimuli=[['gold','金色圓形'],['brown','棕色方形'],['red','紅色三角形'],['blue','藍色菱形'],['green','綠色十字']].map(([type,name],i)=>({id:`target_0${i+1}`,name,type,image:type,enabled:true}));
const levels=rules.slice(0,10).map((r,i)=>({levelId:String(i+1),name:r.name,ruleId:r.id,stimulusCount:18,timeLimit:60,minInterval:500,maxInterval:850,stimulusDuration:1300,requiredAccuracy:.8,targetRatio:.55,distractorRatio:[5,9].includes(i)?.35:0,randomPosition:[3,8,9].includes(i),countdownEnabled:true,enabled:true,secondaryRuleId:r.ruleSwitch,switchAtTrial:9,switchAtPercent:.5}));
const infinite={ruleIds:'gold,brown,forbid,left,dual,distract,no-red,switch,compound,combined,clear',minStimuli:16,maxStimuli:24,minInterval:500,maxInterval:850,stimulusDuration:1300,timeLimit:75,targetRatio:.55,distractorRatio:.3,switchChance:.25,minClickableRatio:.15,recentSignatures:10,maxAttempts:1500};
const data={GameSettings:Object.entries(settings).map(([key,value])=>({key,value,description:{historyLimit:'最大保存筆數',inputGuardMs:'連點保護毫秒',positionMin:'水平位置下限 0–1',positionMax:'水平位置上限 0–1'}[key]||key})),Levels:levels,Rules:rules,Stimuli:stimuli,InfiniteMode:Object.entries(infinite).map(([key,value])=>({key,value})),Assets:[...stimuli.map(s=>({id:s.image,category:'target',file:`${s.type}.svg`,enabled:true,description:s.name})),{id:'noise',category:'distractor',file:'noise.svg',enabled:true,description:'灰色星星'}],Animations:[],Audio:[{id:'hit',category:'sfx',file:'hit.wav',volume:.18,loop:false,enabled:true}],Text:[{key:'disclaimer',text:'結果僅代表本次遊戲中的反應表現，不作為醫療或健康診斷。'}]};
const wb=XLSX.utils.book_new();for(const [name,rows] of Object.entries(data)){const sheet=XLSX.utils.json_to_sheet(rows.length?rows:[],{header:name==='Animations'?['id','image','frameWidth','frameHeight','frameCount','fps','loop','playMode']:undefined});sheet['!cols']=Object.keys(rows[0]||{id:0,image:0,frameWidth:0,frameHeight:0,frameCount:0,fps:0,loop:0,playMode:0}).map(k=>({wch:k==='condition'?100:k==='description'?65:Math.max(k.length+3,20)}));XLSX.utils.book_append_sheet(wb,sheet,name);}XLSX.writeFile(wb,'config/game_config.xlsx');
const colors=['#f6c453','#ad7954','#ec6b6b','#6f9fe8','#80c7a0'];
const shapes=['<circle cx="50" cy="50" r="34"/>','<rect x="18" y="18" width="64" height="64" rx="12"/>','<path d="M50 12L90 84H10Z"/>','<path d="M50 8L92 50 50 92 8 50Z"/>','<path d="M37 12H63V37H88V63H63V88H37V63H12V37H37Z"/>'];
stimuli.forEach((s,i)=>fs.writeFileSync(`assets/images/targets/${s.type}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><g fill="${colors[i]}" stroke="#ffffff" stroke-width="2">${shapes[i]}</g></svg>`));
fs.writeFileSync('assets/images/distractors/noise.svg','<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><path fill="#8e95a2" d="M50 8L61 36 92 38 68 58 77 90 50 72 23 90 32 58 8 38 39 36Z"/></svg>');
const samples=4410,b=Buffer.alloc(44+samples*2);b.write('RIFF');b.writeUInt32LE(b.length-8,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(44100,24);b.writeUInt32LE(88200,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(samples*2,40);for(let i=0;i<samples;i++)b.writeInt16LE(Math.round(Math.sin(i*2*Math.PI*660/44100)*8000*(1-i/samples)),44+i*2);fs.writeFileSync('assets/audio/sfx/hit.wav',b);

// Keep fresh authoring consistent with the current color/shape schema.
await import('./update-shape-rules.mjs');
