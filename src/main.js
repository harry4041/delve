import './style.css';
import {load,tab,mode} from './state.js';
import {loop} from './render.js';
import {view,camp} from './camp.js';
import {cloudBoot} from './cloud.js';
load();cloudBoot();view();requestAnimationFrame(loop);
// Cloud events: a pulled save replaces the game state (re-render everything); other changes only matter on the Account tab.
window.addEventListener('hd-cloud',e=>{if(e.detail==='applied')view();else if(tab==='x'&&mode==='camp')camp()});
