import {useLayoutEffect,useRef,useState} from 'react';

/** Keep long conditions readable without scrolling or discarding any lines. */
export function RuleText({text}:{text:string}){
 const root=useRef<HTMLDivElement>(null),measure=useRef<HTMLHeadingElement>(null);
 const [pages,setPages]=useState([text]),[page,setPage]=useState(0);
 useLayoutEffect(()=>{
  const layout=()=>{
   const box=root.current!,probe=measure.current!;
   probe.style.width=`${box.clientWidth}px`;probe.textContent=text;
   const available=box.clientHeight;
   if(!available)return;
   const next:string[]=[];
   if(probe.getBoundingClientRect().height<=available)next.push(text);
   else {
    const budget=Math.max(24,available-48);let lines:string[]=[];
    for(const line of text.split('\n')){
     probe.textContent=[...lines,line].join('\n');
     if(lines.length&&probe.getBoundingClientRect().height>budget){next.push(lines.join('\n'));lines=[];}
     lines.push(line);
    }
    if(lines.length)next.push(lines.join('\n'));
   }
   probe.textContent='';setPages(next);setPage(current=>Math.min(current,next.length-1));
  };
  setPage(0);layout();const observer=new ResizeObserver(layout);observer.observe(root.current!);
  return()=>observer.disconnect();
 },[text]);
 return <div className="paged-rule" ref={root}><h2 className="rule-measure" ref={measure} aria-hidden="true"/><h2>{pages[page]??text}</h2>{pages.length>1&&<nav className="rule-pagination" aria-label="規則分頁"><button className="secondary" disabled={page===0} onClick={()=>setPage(page-1)}>上一頁</button><span>{page+1} / {pages.length}</span><button className="secondary" disabled={page===pages.length-1} onClick={()=>setPage(page+1)}>下一頁</button></nav>}</div>;
}
