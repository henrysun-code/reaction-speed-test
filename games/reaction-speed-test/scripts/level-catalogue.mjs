import {ruleDifficulty} from '../src/game/difficulty.ts';
// Authoring helpers only. The game continues to read its Excel-generated config.
const join=(op,...children)=>({op,children});
const OR=(...c)=>join('any',...c),AND=(...c)=>join('all',...c);
const truth=(tree,values)=>typeof tree==='string'?values[tree]:tree.op==='any'?tree.children.some(c=>truth(c,values)):tree.children.every(c=>truth(c,values));
const fingerprint=tree=>Array.from({length:16},(_,i)=>truth(tree,Object.fromEntries(['C','P','S','T'].map((k,j)=>[k,Boolean(i&(1<<j))])))?'1':'0').join('');
function insert(tree,leaf){
 const result=['all','any'].map(op=>join(op,tree,leaf));
 if(typeof tree!=='string')tree.children.forEach((child,i)=>insert(child,leaf).forEach(replacement=>result.push({...tree,children:tree.children.map((c,j)=>i===j?replacement:c)})));
 return result;
}
function unique(trees){return [...new Map(trees.map(tree=>[fingerprint(tree),tree])).values()];}
const modes=[['single','single'],['multiple','single'],['single','multiple'],['multiple','multiple'],['exclude','single'],['single','exclude'],['exclude','multiple'],['multiple','exclude'],['exclude','exclude']];
const label={single:'單一',multiple:'多種',exclude:'排除'};
const leaf=(dimension,mode)=>dimension==='C'?mode==='single'?{targetType:'gold'}:mode==='multiple'?{allowedTypes:['gold','brown']}:{forbiddenType:'gold'}:mode==='single'?{targetShape:'circle'}:mode==='multiple'?{compoundCondition:{op:'any',conditions:[{targetShape:'circle'},{targetShape:'square'}]}}:{forbiddenShape:'circle'};
function condition(tree,c,p,star){
 if(typeof tree==='string')return tree==='C'?leaf('C',c):tree==='P'?leaf('P',p):tree==='S'?{positionCondition:'left'}:{distractorCondition:star};
 return {compoundCondition:{op:tree.op,conditions:tree.children.map(child=>condition(child,c,p,star))}};
}
export function catalogue(){
 const sideRaw=insert(OR('C','P'),'S');
 const sideTrees=unique(sideRaw);
 const starTrees=unique(sideRaw.flatMap(tree=>insert(tree,'T')));
 if(sideTrees.length!==4||starTrees.length!==26)throw Error('Unexpected template count');
 const make=(tree,[c,p],star,index)=>({condition:condition(tree,c,p,star),templateKey:`${c}:${p}:${fingerprint(tree)}:${star||'none'}`,difficulty:ruleDifficulty(condition(tree,c,p,star)).score,starAverageMs:ruleDifficulty(condition(tree,c,p,star)).averageMs,name:`${label[c]}色環／${label[p]}商品${star?'／星星'+(star==='present'?'有':'無'):tree==='base'?'':'／位置'}`,base:index+1});
 const order=(a,b)=>a.difficulty-b.difficulty||a.base-b.base||a.templateKey.localeCompare(b.templateKey);
 const base=modes.map((mode,i)=>make(OR('C','P'),mode,undefined,i));
 base.forEach(r=>r.name=r.name.replace('／位置',''));
 const side=modes.flatMap((mode,i)=>sideTrees.map(tree=>make(tree,mode,undefined,i))).sort(order);
 const stars=modes.flatMap((mode,i)=>starTrees.flatMap(tree=>['present','absent'].map(star=>make(tree,mode,star,i)))).sort(order);
 return {base,side,stars,selected:[...base,...side.slice(0,31),...stars.slice(0,60)]};
}
