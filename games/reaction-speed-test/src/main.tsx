import {createRoot} from 'react-dom/client';
import {applySafeArea} from '../../../shared/responsive/safe-area.js';
import {App} from './App';
import {load} from './config/load';
import './style.css';
applySafeArea(document.body);
load().then(({config,loaded})=>createRoot(document.getElementById('app')!).render(<App config={config} loaded={loaded}/>)).catch(error=>{document.getElementById('app')!.textContent=`無法啟動：${error.message}`;});
