import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const url=process.env.TEST_URL||'http://127.0.0.1:5173/';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:390,height:844},hasTouch:true});
const errors=[],failedAssets=[],checks=[];
page.on('pageerror',e=>errors.push(e.message));
page.on('response',r=>{if(r.status()>=400&&!r.url().endsWith('/favicon.ico'))failedAssets.push(`${r.status()} ${r.url()}`);});
await page.addInitScript(()=>{let seed=101;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
fs.mkdirSync('tests/artifacts',{recursive:true});
const pass=(name,details={})=>{checks.push({name,status:'PASS',...details});console.log('PASS:',name);};
const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('reaction-speed-test:history:v1')||'[]'));
async function completeRound(strategy){
 await page.getByRole('button',{name:'開始測試',exact:true}).click();
 await page.locator('.arena').waitFor();
 let previous='',targets=0;
 const deadline=Date.now()+90000;
 while(await page.locator('.arena').count()){
  assert.ok(Date.now()<deadline,'round did not finish');
  const snapshot=await page.evaluate(()=>{const img=document.querySelector('.stimulus'),top=document.querySelector('.play-top');return img&&top?{key:top.textContent,alt:img.getAttribute('alt')}:null;});
  if(snapshot){
   const key=snapshot.key;
   if(key!==previous){
    previous=key;const alt=snapshot.alt;await page.waitForTimeout(140);
    let action=null;
    if(strategy==='mixed'){
     if(alt?.startsWith('金色')){targets++;if(targets<=2)action=targets===1?'touch':'mouse';}
     else action='touch';
    }else if(strategy==='brown'&&alt==='棕色方形')action='touch';
    else if(strategy==='all')action='touch';
    if(action==='touch')await page.locator('.arena').tap({position:{x:30,y:80}});
    if(action==='mouse')await page.locator('.arena').click({position:{x:30,y:80}});
   }
  }
  await page.waitForTimeout(35);
 }
 await page.getByRole('button',{name:'下一關',exact:true}).waitFor();
 return (await stored())[0];
}
try{
 if(!process.env.INFINITE_ONLY){
 await page.goto(url);await page.getByRole('button',{name:/關卡模式/}).waitFor();
 assert.equal(await page.getByRole('button',{name:'Developer Settings'}).count(),0);
 await page.getByRole('button',{name:/關卡模式/}).click();await page.locator('.level-grid button').first().click();
 const first=await completeRound('mixed');
 assert.equal(first.trials.length,18);assert.equal(first.overridden,false);
 assert.equal(first.stats.correctClicks,2);assert.ok(first.stats.falseAlarms>0);assert.ok(first.stats.misses>0);
 const hits=first.trials.filter(t=>t.shouldClick&&t.playerClicked).map(t=>t.reactionTime).sort((a,b)=>a-b);
 assert.ok(hits.every(x=>x>0&&x<1300));const avg=hits.reduce((a,b)=>a+b)/hits.length;
 assert.ok(Math.abs(first.stats.average-avg)<.001);assert.ok(Math.abs(first.stats.median-avg)<.001);
 assert.ok(Math.abs(first.stats.stability-Math.sqrt(hits.reduce((s,x)=>s+(x-avg)**2,0)/hits.length))<.001);
 assert.ok(await page.locator('.metrics').innerText().then(t=>t.includes(`${first.stats.correctClicks} / ${first.stats.falseAlarms} / ${first.stats.misses}`)));
 await page.screenshot({path:'tests/artifacts/final-result-mobile.png',fullPage:true});
 pass('1–6: default level completed with real touch + mouse input; hit, false alarm, miss and result statistics',{stats:first.stats});
 await page.getByRole('button',{name:'下一關',exact:true}).click();assert.equal(await page.locator('h1').innerText(),'棕色目標');pass('7: next level');
 await page.getByRole('button',{name:'回主畫面',exact:true}).click();await page.getByRole('button',{name:/查看歷史紀錄/}).click();assert.equal(await page.locator('.history-row').count(),1);
 await page.reload();await page.getByRole('button',{name:/查看歷史紀錄/}).click();assert.equal(await page.locator('.history-row').count(),1);assert.equal((await stored())[0].date,first.date);pass('8–9: history UI and persistence after reload');
 await page.setViewportSize({width:320,height:740});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await page.screenshot({path:'tests/artifacts/final-history-320.png',fullPage:true});
 await page.goto(url+'?debug=1');await page.getByRole('button',{name:'Developer Settings'}).click();
 await page.getByLabel('刺激數量',{exact:true}).fill('6');await page.getByLabel('最短間隔 ms',{exact:true}).fill('300');await page.getByLabel('最長間隔 ms',{exact:true}).fill('300');await page.getByLabel('停留時間 ms',{exact:true}).fill('600');await page.getByLabel('倒數',{exact:true}).selectOption('false');await page.getByLabel('指定規則',{exact:true}).selectOption('brown');await page.getByLabel('目標偏好比例 0–1',{exact:true}).fill('0.8');await page.getByLabel('Debug 面板',{exact:true}).selectOption('false');
 await page.getByRole('button',{name:'直接開始指定測試'}).click();
 const debug=await completeRound('brown');assert.equal(debug.level.ruleId,'brown');assert.equal(debug.level.stimulusCount,6);assert.equal(debug.level.stimulusDuration,600);assert.equal(debug.overridden,true);assert.ok(debug.stats.correctClicks>0);assert.equal(debug.stats.falseAlarms,0);assert.equal(debug.trials.length,6);
 pass('11: Developer Settings runtime overrides and direct brown-rule Debug test');
 await page.getByRole('button',{name:'回主畫面',exact:true}).click();await page.getByRole('button',{name:'Developer Settings'}).click();
 }else{
  await page.goto(url+'?debug=1');await page.getByRole('button',{name:'Developer Settings'}).click();
  for(const [label,value] of [['刺激數量','6'],['最短間隔 ms','300'],['最長間隔 ms','300'],['停留時間 ms','600']])await page.getByLabel(label,{exact:true}).fill(value);
  await page.getByLabel('倒數',{exact:true}).selectOption('false');await page.getByLabel('Debug 面板',{exact:true}).selectOption('false');
 }
 const beforeInfinite=(await stored()).length;
 await page.getByLabel('指定規則',{exact:true}).selectOption('');await page.getByLabel('測試模式',{exact:true}).selectOption('infinite');await page.getByRole('button',{name:'直接開始指定測試'}).click();
 const inf1=await completeRound('all');assert.equal(inf1.mode,'infinite');assert.equal(inf1.trials.length,6);assert.ok(inf1.trials.some(t=>t.shouldClick));
 await page.getByRole('button',{name:'下一關',exact:true}).click();const inf2=await completeRound('all');assert.equal(inf2.mode,'infinite');assert.equal(inf2.trials.length,6);assert.ok(inf2.trials.some(t=>t.shouldClick));assert.notEqual(inf1.level.levelId,inf2.level.levelId);assert.equal((await stored()).length,beforeInfinite+2);
 await page.screenshot({path:'tests/artifacts/final-infinite-result.png',fullPage:true});
 pass('10: two consecutive infinite rounds, separate results and history',{levels:[inf1.level.levelId,inf2.level.levelId]});
 assert.deepEqual(errors,[]);assert.deepEqual(failedAssets,[]);pass('browser runtime and asset loading');
 fs.writeFileSync('tests/artifacts/final-acceptance.json',JSON.stringify({date:new Date().toISOString(),url,checks},null,2));
}catch(error){await page.screenshot({path:'tests/artifacts/final-failure.png',fullPage:true}).catch(()=>{});throw error;}finally{await browser.close();}

