import {createRoot} from 'react-dom/client';
import {applySafeArea} from '../../../shared/responsive/safe-area.js';
import {App} from './App';
import {load} from './config/load';
import './style.css';
applySafeArea(document.body);
load().then(({config,preloading})=>createRoot(document.getElementById('app')!).render(<App config={config} preloading={preloading}/>)).catch(error=>{document.getElementById('app')!.textContent=`無法啟動：${error.message}`;});
