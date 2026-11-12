import {RC,mode} from './state.js';
import {rarLabel} from './stats.js';
import {ICONS} from './icons-data.js';
import {camp} from './camp.js';
export const IMG={};let imgN=0;const IMGN=Object.keys(ICONS).length;
for(const k in ICONS){const im=new Image();im.onload=()=>{if(++imgN==IMGN&&mode=='camp')camp()};im.src=ICONS[k];IMG[k]=im}
const TINTA=[0,.16,.26,.34,.42,.5,.56,.6,.64],TC={};for(let i=9;i<400;i++)TINTA.push(.64);
export function baseOf(it){return it.nm.split(' ').find(w=>ICONS[w])||''}
export function iconSrc(it){const b=baseOf(it);if(!b)return'';const im=IMG[b];if(!im||!im.complete||!it.ri)return ICONS[b]||'';const key=b+it.ri;if(!TC[key]){const c=document.createElement('canvas');c.width=c.height=64;const x=c.getContext('2d');x.drawImage(im,0,0);x.fillStyle=RC[it.ri];x.globalCompositeOperation='overlay';x.globalAlpha=Math.min(.9,TINTA[it.ri]*1.9);x.fillRect(0,0,64,64);x.globalCompositeOperation='destination-in';x.globalAlpha=1;x.drawImage(im,0,0);x.globalCompositeOperation='source-atop';x.globalAlpha=TINTA[it.ri]*.35;x.fillRect(0,0,64,64);TC[key]=c.toDataURL()}return TC[key]}
export function icon(it,sz){const u=iconSrc(it);return u?'<span class="ic" style="--rc:'+RC[it.ri]+';--s:'+(sz||36)+'px"><img src="'+u+'" alt=""></span>':''}
export function chip(it){return (icon(it)+'<b style="color:'+RC[it.ri]+'">'+it.nm+'</b> <span class="mute">'+rarLabel(it)+'</span>')}
