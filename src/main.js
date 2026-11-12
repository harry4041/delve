import './style.css';
import {load,tab,mode} from './state.js';
import {loop} from './render.js';
import {view,camp} from './camp.js';
import {cloudBoot} from './cloud.js';
import './gifts.js';
import {initGate} from './gate.js';
load();cloudBoot();view();requestAnimationFrame(loop);initGate(); // the game boots behind the sign-in screen; the gate decides whether the player can see it
// Cloud events: a pulled save replaces the game state (re-render everything); other changes only matter on the Account tab.
window.addEventListener('hd-lb',()=>{if(tab==='l'&&mode==='camp')camp()});
window.addEventListener('hd-wiki',()=>{if(tab==='w'&&mode==='camp')camp()});
window.addEventListener('hd-bp',()=>{if(tab==='g'&&mode==='camp')camp()});
window.addEventListener('hd-cloud',e=>{if(e.detail==='applied')view();else if(tab==='x'&&mode==='camp')camp()});
