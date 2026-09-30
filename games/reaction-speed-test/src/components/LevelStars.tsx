import type {Stars} from '../types/index';
export function LevelStars({stars}:{stars:Stars}){
 const items=[['完成',stars.completed],['準確率',stars.accuracy],['平均判斷時間',stars.speed]] as const;
 return <span className="level-stars" role="img" aria-label={items.map(([label,earned])=>`${label}：${earned?'已取得':'未取得'}`).join('，')}>
  {items.map(([label,earned])=><span key={label} aria-hidden="true" className={earned?'earned':''}>{earned?'★':'☆'}</span>)}
 </span>;
}
