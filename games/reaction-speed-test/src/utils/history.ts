import type {Result} from '../types/index';
export const HISTORY_KEY='reaction-speed-test:history:v1';
export function readHistory():Result[]{try{const rows=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');return Array.isArray(rows)?rows.filter(r=>r?.stats&&r?.level&&r?.date):[];}catch{return [];}}
export function saveHistory(result:Result,max:number){const rows=[result,...readHistory()].slice(0,max);localStorage.setItem(HISTORY_KEY,JSON.stringify(rows));return rows;}
