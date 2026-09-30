import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:320,height:740},hasTouch:true});
const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.addInitScript(()=>{let seed=101;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};});
try{
 await page.goto((process.env.TEST_URL||'http://127.0.0.1:5173/')+'?debug=1');
 await page.getByRole('button',{name:'Developer Settings'}).waitFor();
 assert.equal(await page.locator('.sample-pool img[alt^="金色"]').count(),5);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 await page.getByRole('button',{name:'Developer Settings'}).click();
 for(const [label,value] of [['刺激數量','12'],['最短間隔 ms','300'],['最長間隔 ms','300'],['停留時間 ms','800'],['目標偏好比例 0–1','1']])await page.getByLabel(label,{exact:true}).fill(value);
 await page.getByLabel('指定規則',{exact:true}).selectOption('forbid');
 await page.getByLabel('倒數',{exact:true}).selectOption('false');await page.getByLabel('Debug 面板',{exact:true}).selectOption('false');
 await page.getByRole('button',{name:'直接開始指定測試'}).click();
 assert.match(await page.locator('.rule-card h2').innerText(),/金色三角形也不能點/);
 await page.getByRole('button',{name:'開始測試',exact:true}).click();await page.locator('.arena').waitFor();
 let key='',clickedTriangle=false;const deadline=Date.now()+40000;
 while(await page.locator('.arena').count()){
  assert.ok(Date.now()<deadline,'game timed out');
  const view=await page.evaluate(()=>{const img=document.querySelector('.stimulus'),top=document.querySelector('.play-top');return img&&top?{key:top.textContent,alt:img.getAttribute('alt')}:null;});
  if(view&&view.key!==key){
   key=view.key;await page.waitForTimeout(140);
   if(view.alt!=='金色三角形'||!clickedTriangle){
    await page.locator('.arena').tap({position:{x:30,y:80}});
    if(view.alt==='金色三角形')clickedTriangle=true;
   }
  }
  await page.waitForTimeout(30);
 }
 await page.getByRole('button',{name:'下一關',exact:true}).waitFor();
 const result=await page.evaluate(()=>JSON.parse(localStorage.getItem('reaction-speed-test:history:v1'))[0]);
 assert.equal(result.trials.length,12);assert.ok(clickedTriangle);
 assert.ok(new Set(result.trials.map(t=>t.stimulusShape)).size>=3);
 for(const t of result.trials){assert.equal(t.stimulusType,'gold');assert.equal(t.shouldClick,t.stimulusShape!=='triangle');}
 assert.equal(result.stats.falseAlarms,1);assert.equal(result.stats.misses,0);assert.ok(result.stats.correctClicks>0);
 assert.ok(result.trials.some(t=>t.stimulusShape==='triangle'&&t.falseAlarm));
 assert.deepEqual(errors,[]);
 fs.mkdirSync('tests/artifacts',{recursive:true});
 await page.screenshot({path:'tests/artifacts/color-shape-result.png',fullPage:true});
 fs.writeFileSync('tests/artifacts/color-shape-acceptance.json',JSON.stringify({date:new Date().toISOString(),status:'PASS',shapes:[...new Set(result.trials.map(t=>t.stimulusShape))],stats:result.stats},null,2));
 console.log('PASS: five gold assets, 320px layout, shape rule text, gold non-triangle hits, gold triangle false alarm, and zero missed valid targets');
}finally{await browser.close();}
