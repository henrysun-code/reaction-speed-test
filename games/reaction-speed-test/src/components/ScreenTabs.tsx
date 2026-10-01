export function ScreenTabs({items,value,onChange}:{items:string[];value:number;onChange:(value:number)=>void}){
 return <nav className="screen-tabs" aria-label="切換資訊">{items.map((label,i)=><button key={label} className="secondary" aria-pressed={value===i} onClick={()=>onChange(i)}>{label}</button>)}</nav>;
}
