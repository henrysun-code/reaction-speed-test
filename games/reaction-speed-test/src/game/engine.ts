import type {Level,Planned,Trial} from '../types/index';
export type Snapshot={phase:'idle'|'countdown'|'gap'|'presenting'|'active'|'paused'|'done';index:number;count:number;item:Planned|null;token:number;elapsed:number};
export class Engine {
 state:Snapshot={phase:'idle',index:0,count:3,item:null,token:0,elapsed:0};trials:Trial[]=[];
 private timer:ReturnType<typeof setTimeout>|undefined;private onset:number|null=null;private clicked:number|null=null;private lastInput=-Infinity;private segment=0;private accumulated=0;private stopped=false;
 constructor(public level:Level,public plan:Planned[],private guard:number,private countdown:number,private update:(s:Snapshot)=>void,private complete:(trials:Trial[])=>void,private now=()=>performance.now()){}
 private emit(){this.update({...this.state});}
 private later(fn:()=>void,ms:number){clearTimeout(this.timer);this.timer=setTimeout(fn,ms);}
 start(){this.segment=this.now();if(this.level.countdownEnabled){this.state.phase='countdown';this.state.count=this.countdown;this.emit();this.later(()=>this.tick(),1000);}else this.gap();}
 private tick(){if(--this.state.count>0){this.emit();this.later(()=>this.tick(),1000);}else this.gap();}
 private elapsed(){return this.accumulated+(this.segment?this.now()-this.segment:0);}
 private gap(){if(this.stopped)return;if(this.state.index>=this.plan.length||this.elapsed()>=this.level.timeLimit*1000){this.finish();return;}this.state.phase='gap';this.state.item=null;this.state.elapsed=this.elapsed();this.emit();this.later(()=>this.present(),Math.max(this.plan[this.state.index].interval,this.guard));}
 private present(){this.state.phase='presenting';this.state.item=this.plan[this.state.index];this.state.token++;this.onset=null;this.clicked=null;this.emit();}
 // UI calls this only after the image is decoded and a paint opportunity has passed.
 painted(token:number){if(this.state.phase!=='presenting'||token!==this.state.token)return;this.onset=this.now();this.state.phase='active';this.emit();this.later(()=>this.closeTrial(),this.level.stimulusDuration);}
 input(){const now=this.now(),last=this.lastInput;this.lastInput=now;if(this.state.phase!=='active'||this.onset===null||this.clicked!==null||now-this.onset>this.level.stimulusDuration||now-last<this.guard)return false;this.clicked=now;return true;}
 private closeTrial(){if(this.onset===null)return;const p=this.plan[this.state.index],clicked=this.clicked!==null;
 this.trials.push({trialIndex:this.state.index+1,stimulusId:p.stimulus.id,stimulusType:p.stimulus.type,stimulusShape:p.stimulus.shape,distractor:p.distractor,ruleId:p.ruleId,appearanceTime:this.onset,disappearanceTime:this.now(),positionX:p.x,positionY:p.y,shouldClick:p.shouldClick,playerClicked:clicked,clickTime:this.clicked,reactionTime:clicked?this.clicked!-this.onset:null,correct:clicked===p.shouldClick,falseAlarm:clicked&&!p.shouldClick,miss:!clicked&&p.shouldClick,previousStimulusId:this.plan[this.state.index-1]?.stimulus.id??null,rulePhase:p.rulePhase});this.state.index++;this.gap();}
 pause(){if(['idle','paused','done'].includes(this.state.phase))return;clearTimeout(this.timer);this.accumulated=this.elapsed();this.segment=0;this.onset=null;this.clicked=null;this.state.token++;this.state.phase='paused';this.state.item=null;this.emit();}
 resume(){if(this.state.phase!=='paused')return;this.segment=this.now();this.lastInput=this.now();this.gap();}
 private finish(){clearTimeout(this.timer);this.state.phase='done';this.state.item=null;this.emit();this.complete([...this.trials]);}
 destroy(){this.stopped=true;clearTimeout(this.timer);}
}

