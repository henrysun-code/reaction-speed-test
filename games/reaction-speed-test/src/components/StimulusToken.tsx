import {forwardRef,type CSSProperties} from 'react';
import type {Config,Stimulus,Rule,Condition,Level} from '../types/index';
import {colorName,productName} from '../game/session-rules';

/** Color belongs to the ring; the inner image independently identifies the item. */
export const StimulusToken=forwardRef<HTMLImageElement,{stimulus:Stimulus;config:Config;className?:string;style?:CSSProperties;neutral?:boolean}>(function StimulusToken({stimulus,config,className='',style,neutral},ref){
 const src=config.assets[stimulus.image];
 // Legacy SVG shapes stay neutral; product PNG/JPEG/WebP artwork keeps its colors.
 const neutralImage=neutral??/\.svg(?:[?#]|$)/i.test(src||'');
 return <span className={`stimulus-token ${className}`} data-tone={stimulus.type} style={style}>
  <img ref={ref} className={neutralImage?'neutral-shape':undefined} src={src} alt={stimulus.name} draggable={false}/>
 </span>;
});

export function RuleExamples({config,rule,level}:{config:Config;rule:Rule;level?:Level}){
 const colors=new Set<string>(),products=new Set<string>();let star=false;
 const gather=(c:Condition)=>{
  if(c.targetType)colors.add(c.targetType);
  if(c.forbiddenType)colors.add(c.forbiddenType);
  c.allowedTypes?.forEach(color=>colors.add(color));
  if(c.targetShape)products.add(c.targetShape);
  if(c.forbiddenShape)products.add(c.forbiddenShape);
  if(c.distractorCondition)star=true;
  c.compoundCondition?.conditions.forEach(gather);
 };
 gather(rule.condition);
 const second=config.rules.find(r=>r.id===(level?.secondaryRuleId||rule.ruleSwitch));
 if(second)gather(second.condition);
 return <div className="rule-visual-guide"><div className="reference-gallery" aria-label="本次商品與符號辨識圖">
  {[...colors].map(color=><div className="reference-item" key={'ring:'+color}><span className="stimulus-token reference-ring" data-tone={color} role="img" aria-label={colorName(color)+'外圈'}/><small>{colorName(color)}外圈</small></div>)}
  {[...products].map(shape=>{const sample=config.stimuli.find(s=>s.enabled&&s.shape===shape);return sample?<div className="reference-item" key={'item:'+shape}><img className="reference-product" src={config.assets[sample.image]} alt={productName(shape,config)} draggable={false}/><small>{productName(shape,config)}</small></div>:null;})}
  {star&&<div className="reference-item"><img className="reference-symbol" src={config.assets.noise} alt="背景水母"/><small>背景水母</small></div>}
 </div></div>;
}
