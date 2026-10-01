import {test} from 'node:test';
import assert from 'node:assert/strict';
import raw from '../config/generated/game_config.json';
import {load} from '../src/config/load';

test('menu configuration resolves before artwork; only unique gameplay images block starting',async()=>{
 const originalFetch=globalThis.fetch;
 const originalImage=globalThis.Image;
 const images:FakeImage[]=[];
 class FakeImage{
  src='';onload:(()=>void)|null=null;onerror:(()=>void)|null=null;
  constructor(){images.push(this);}
 }
 globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(raw)}) as Response;
 globalThis.Image=FakeImage as unknown as typeof Image;
 try{
  const {config,preloading}=await load('/reaction-speed-test/');
  assert.equal(config.levels.length,100);
  const expected=new Set(config.stimuli.filter(s=>s.enabled).map(s=>config.assets[s.image]));
  expected.add(config.assets.noise);
  assert.deepEqual(new Set(images.map(image=>image.src)),expected);
  assert.equal(images.length,9);
  let ready=false;preloading.then(()=>{ready=true;});
  await Promise.resolve();assert.equal(ready,false);
  images.slice(0,-1).forEach(image=>image.onload?.());
  await Promise.resolve();assert.equal(ready,false);
  images.at(-1)!.onerror?.();
  const results=await preloading;
  assert.equal(results.filter((item:any)=>!item.ok).length,1);
 }finally{globalThis.fetch=originalFetch;globalThis.Image=originalImage;}
});
