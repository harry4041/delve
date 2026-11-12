import {petInfo} from './pets.js';
import {farmHtml} from './farm.js';
import {lookStyle,capeColor} from './look.js';
import {drawBackdrop,drawShadows,drawForeground,drawEffects,drawCape,drawHeroAura,drawMobFx} from './scene.js';
import {$,PET,RC,S,SP,mode,run,save} from './state.js';
import {activeAuras} from './auras.js';
import {L,fmtN,mpMax,pReq,petStars,stats} from './stats.js';
import {GRAPHS} from './skilltree.js';
import {hasMagic,hasSp,maxSpd,petLc} from './ascension.js';
import {tree} from './treeview.js';
import {ename,tick} from './battle.js';
import {delveAgain} from './camp.js';
import {IMG,baseOf,iconSrc} from './assets.js';
/* ---------- drawing ---------- */
const cv=$('#c');let g=cv.getContext('2d');const g0=g;
const ZONES=[
 {ceil:'#1a1520',wall:'#2a2232',mort:'#151018',floor:'#1e1a28',flrd:'#16121e',glow:'#6040c0',name:'Crypt'},
 {ceil:'#141e14',wall:'#1e2e1a',mort:'#0e1610',floor:'#1a2218',flrd:'#121a10',glow:'#30a050',name:'Fungal Warren'},
 {ceil:'#201810',wall:'#30241a',mort:'#181008',floor:'#241c14',flrd:'#1c1410',glow:'#c06020',name:'Ember Hall'},
 {ceil:'#101820',wall:'#162030',mort:'#0a1018',floor:'#142028',flrd:'#0e1820',glow:'#2080c0',name:'Drowned Vaults'},
 {ceil:'#200a0a',wall:'#300e0e',mort:'#180606',floor:'#280c0c',flrd:'#1e0808',glow:'#d04040',name:'Infernal Pit'},
 {ceil:'#080818',wall:'#100c28',mort:'#050510',floor:'#0e0c20',flrd:'#080a18',glow:'#9030d0',name:'Void Sanctum'},
];
const TINT=['#5fbf6a','#8a6fd0','#d0a040','#6fb7d8','#e0603a','#a04fd0'];
function R(x,y,w,h,c){g.fillStyle=c;g.fillRect(Math.round(x),Math.round(y),Math.round(w),Math.round(h))}
function rr(h,f){const n=parseInt(h.slice(1),16),a=[n>>16,n>>8&255,n&255].map(v=>Math.max(0,Math.min(255,Math.round(v*f))));return'#'+a.map(v=>v.toString(16).padStart(2,'0')).join('')}
function spr(m,p,x,y){for(let j=0;j<m.length;j++)for(let i=0;i<m[j].length;i++){const k=m[j][i],c=p[k];if(k!='.'&&c){g.fillStyle=c;g.fillRect(x+i,y+j,1,1)}}}
// Pet sprites (pixel maps; o outline, b body, h highlight, d shade, e eye, w white, y gold, f flame)
export const PET_SPR={
 pip:['..ooooo..','.obbbbbo.','obbhhbbbo','obebbebbo','obbbbbbbo','.ooooooo.'],
 fang:['o.o.......','obboooo...','obbbbbbo..','obebbbbbbo','.obbbbbbbo','.obdobdbo.','..o.o.o.o.'],
 ember:['..o....o..','.obo..obo.','.obbooobbo','..obbbbbo.','.obebbbbbo','obbhbbbbbo','.obbdodbbo','..oo.f.oo.'],
 moss:['.ooooooo.','obbbbbbbo','obeebeebo','obbbbbbbo','oobhbbboo','obbbbbbbo','obbo.obbo','ooo...ooo'],
 coin:['..ooo....','.obbbo...','obebbboy.','obbbbbbbo','.obwwwbo.','..obbbo..','...o.o...'],
 spark:['...o...','.o.o.o.','..obo..','.obbbo.','obbebbo','.obhbo.','..obo..','...o...'],
};
function drawPet(P,t,x,yFloor,bob){const m=PET_SPR[P.k];if(!m)return;
 const pal={o:'#1a0f24',b:P.k=='coin'?'#2a2438':P.c,h:rr(P.k=='coin'?'#6a5f88':P.c,1.45),d:rr(P.c,.7),e:'#fff',w:'#f4f0ff',y:'#ffd34d',f:'#ff9a2e'};
 if(P.k=='spark'){g.globalAlpha=.18+.1*Math.sin(t*7);R(x-2,yFloor-m.length-bob-1,m[0].length+4,m.length+2,P.c);g.globalAlpha=1}
 spr(m,pal,x,yFloor-m.length-bob)}
function frame(x,y,w,h,c,a){g.globalAlpha=a;R(x,y,w,1,c);R(x,y+h-1,w,1,c);R(x,y,1,h,c);R(x+w-1,y,1,h,c);g.globalAlpha=a*.35;R(x+1,y+1,w-2,h-2,c);g.globalAlpha=1}
function ob(x,y,w,h,c){R(x-1,y-1,w+2,h+2,'#1a0f24');R(x,y,w,h,c)}
function gc(sl,d){const it=S.eq[sl];return it?RC[it.ri]:d}
const CH=['....oooooo....','...ohhhhhho...','..ohhhHhhhho..','.ohhhhhhhhhho.','.ohhkkkkkkhho.','.okkeekkeekko.','.okkeekkeekko.','.okpkkkkkkpko.','..okkkwwkkko..','...oookkooo...','..obbbbbbbbo..','.oqobbbbbboqo.','.oqobBBBBboqo.','..obbbbbbbbo..','..ollo..ollo..','..ollo..ollo..','..ottoo.ottoo.','..oooo..oooo..'];
const SLM=['....oooooo....','..ooggggggoo..','.oggggggggggo.','ogggwwgggwwggo','oggweegggweego','ogggggggggggGo','oGgggggggggGGo','.oGGGGGGGGGGo.','..oooooooooo..'];
const BTM=['oo..........oo','oPo..oooo..oPo','oPPooPPPPooPPo','.oPPPPPPPPPPo.','..oPwePPwePo..','...oPPffPPo...','....oooooo....'];
const GBM=['oo..oooooo..oo','oGooGGGGGGooGo','.oGGGGGGGGGGo.','..oGwwGGwwGo..','..oGweGGweGo..','..oGGGffGGGo..','...ooGGGGoo...','..obbbbbbbbo..','.oGobbbbbboGo.','..oobbbbbboo..','...obboobbo...','...oGGooGGo...','...oooooooo...'];
const SKM=['...oooooo...','..obbbbbbo..','.obbbbbbbbo.','.obeebbeebo.','.obbbooobbo.','..obbbbbbo..','...obobobo..','....oooo....','.oobbbbbboo.','obbobBBbobbo','obbobbbbobbo','.oobBBBBboo.','..oobbbboo..','..obbooobo..','..obo..obo..','..obo..obo..','.oobo..oboo.'];
const OGM=['....oooooooo....','...oPPPPPPPPo...','..oPPPPPPPPPPo..','..oPwwPPPPwwPo..','..oPweePPweePo..','..oPPPPPPPPPPo..','..oPfPPPPPPfPo..','...oPffffffPo...','..ooPPPPPPPPoo..','.oPPoPPPPPPoPPo.','oPPPoPPddPPoPPPo','oPPPoPPPPPPoPPPo','.ooooPPPPPPoooo.','....oPPooPPo....','....oPPooPPo....','...ooooooooooo..'];
const IM2={};
function itImg(it){const b=baseOf(it);if(!b||!IMG[b]||!IMG[b].complete||!IMG[b].naturalWidth)return null;const k=b+it.ri;let im=IM2[k];if(!im){im=IM2[k]=new Image();im.src=iconSrc(it)}return im.complete&&im.naturalWidth?im:null}
function put(it,cx,cy,s,sx,sy,sw,sh){const im=itImg(it);if(!im)return;if(sx===undefined){g.drawImage(im,cx-s/2,cy-s/2,s,s)}else{const w=s*sw/64,h=s*sh/64;g.drawImage(im,sx,sy,sw,sh,cx-w/2,cy-h/2,w,h)}}
const HB={Cap:[1.8,13],Helm:[4.5,14],Hood:[5.5,15],Crown:[-.5,13]};
// ---- character bodies -------------------------------------------------------------------------------------------
// Heroes and enemies share one body (20x29 px grid) that is shaded and detailed here, then wearing gear icons on top.
// A style may add `pre(C,e)` (drawn on the body, under the gear icons) and `post(C,e)` (drawn over the gear, e.g. hoods,
// pauldrons, scarves). `C` maps a colour to white while the character flashes from a hit.
let ART_T=0; // animation clock, set by draw(); drives blinking and cloth movement
const lit=c=>rr(c,1.22),shd=c=>rr(c,.72);
const blink=()=>ART_T%3.6<.13;
const HERO_ST={skin:'#ffd5ac',hair:'#ff9a2e',tun:'#3d8bff',leg:'#6a4f8a',boot:'#8a5a2a',belt:'#6a4a2a',
 face:(C,st)=>{const bl=blink(),ey=C(st.eye||'#2b2150');
  if(bl){R(8,5,2,1,ey);R(11,5,2,1,ey)}else{R(8,4,2,2,ey);R(11,4,2,2,ey);R(8,4,1,1,C('#fff'));R(11,4,1,1,C('#fff'))}
  {const br=C(rr(st.hairCol||'#ff9a2e',.7));R(8,3,2,1,br);R(11,3,2,1,br)}R(7,6,1,1,C('#ff9fb0'));R(13,6,1,1,C('#ff9fb0'));R(9,7,2,1,C('#c0705a'))},
 pre:(C,e,st)=>{ // tunic emblem and shoulder straps
  R(9,12,2,2,C('#ffd34d'));R(9,12,1,1,C('#fff3b0'));R(5,10,1,4,C(shd(st.tun)));R(14,10,1,4,C(shd(st.tun)))},
 post:(C,e,st)=>{ // scarf that flutters (none if the player chose no scarf)
  if(!st.scarf)return;const w=Math.round(Math.sin(ART_T*5)),sc=C(st.scarf),sd=C(shd(st.scarf));
  R(6,8,8,2,sc);R(6,9,8,1,sd);R(13,9,2,1,sc);R(14,10+(w>0?1:0),2,3,sc);R(15,12+(w>0?1:0),1,1,sd)}};
function drawFigure(x,y,e,st,fl,flip,sc){g.save();g.translate(x,y);if(sc&&sc!=1)g.scale(sc,sc);if(flip){g.translate(20,0);g.scale(-1,1)}
 const C=c=>fl?'#fff':c,sk=C(st.skin),hr=C(st.hair||'#000'),tun=C(st.tun),lg=C(st.leg),bt=C(st.boot),hb=e.head?baseOf(e.head):'';
 // legs and boots with a lit and a shaded edge
 if(!e.legs){ob(6,20,4,7,lg);ob(10,20,4,7,lg);R(6,20,1,7,C(lit(st.leg)));R(9,20,1,7,C(shd(st.leg)));R(10,20,1,7,C(lit(st.leg)));R(13,20,1,7,C(shd(st.leg)))}
 if(!e.boots){ob(5,26,5,3,bt);ob(10,26,5,3,bt);R(5,26,5,1,C(lit(st.boot)));R(10,26,5,1,C(lit(st.boot)));R(5,28,5,1,C(shd(st.boot)));R(10,28,5,1,C(shd(st.boot)))}
 // torso, belt and sleeves
 if(!e.chest){ob(4,9,12,11,tun);R(4,9,12,1,C(lit(st.tun)));R(4,10,1,9,C(lit(st.tun)));R(15,10,1,9,C(shd(st.tun)));R(5,18,10,1,C(shd(st.tun)));
  R(4,17,12,2,C(st.belt));R(4,17,12,1,C(lit(st.belt)));R(9,17,2,2,C('#e8c050'));R(9,17,1,1,C('#fff3b0'));
  ob(1,10,3,9,tun);R(1,10,1,9,C(lit(st.tun)));R(3,10,1,9,C(shd(st.tun)));ob(16,10,3,9,tun);R(16,10,1,9,C(lit(st.tun)));R(18,10,1,9,C(shd(st.tun)));
  if(st.ribs&&!fl){for(const yy of[11,13,15])R(5,yy,10,1,'#8a8266');R(9,10,2,8,'#a39b80')}
  if(st.pre)st.pre(C,e,st)}
 else{if(!e.gloves){ob(1,15,3,6,sk);ob(16,15,3,6,sk)}if(st.pre)st.pre(C,e,st)}
 if(!e.gloves){ob(1,18,3,3,sk);ob(16,18,3,3,sk);R(1,20,3,1,C(shd(st.skin)));R(16,20,3,1,C(shd(st.skin)))}
 R(8,8,4,2,C(shd(st.skin)));
 // head: ears, shading, hair with a highlight
 if(hb!='Helm'&&hb!='Hood'){ob(6,0,8,9,sk);R(5,4,1,2,sk);R(14,4,1,2,sk);R(13,1,1,8,C(shd(st.skin)));R(6,8,8,1,C(shd(st.skin)));R(7,3,2,1,C(lit(st.skin)))
  if(st.hair){const hs=st.hs||0;
   if(hs===0){R(6,0,8,3,hr);R(5,1,1,5,hr);R(14,1,1,5,hr);R(8,-1,3,1,hr);R(11,-1,2,1,hr);R(7,1,3,1,C(lit(st.hair)));R(7,3,1,1,hr);R(10,3,2,1,hr)} // spiky
   else if(hs===1){R(6,0,8,2,hr);R(5,1,1,3,hr);R(14,1,1,3,hr);R(7,0,3,1,C(lit(st.hair)));R(7,2,2,1,hr);R(11,2,2,1,hr)} // short crop
   else if(hs===2){R(6,0,8,3,hr);R(5,1,2,9,hr);R(13,1,2,9,hr);R(7,1,3,1,C(lit(st.hair)));R(7,3,1,1,hr);R(10,3,2,1,hr);R(5,9,2,1,C(shd(st.hair)));R(13,9,2,1,C(shd(st.hair)))} // long
   else if(hs===3){R(9,-3,2,4,hr);R(8,0,4,2,hr);R(9,-3,1,3,C(lit(st.hair)))} // mohawk
  }
  st.face(C,st)}
 g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
 if(e.legs)put(e.legs,10,22.2,11);
 if(e.boots)put(e.boots,10,27.6,11,0,35,64,29);
 if(e.chest)put(e.chest,10,14.5,14);
 if(e.gloves){put(e.gloves,2.8,19.5,8,0,0,32,64);put(e.gloves,17.2,19.5,8,32,0,32,64)}
 for(let i=1;i<=3;i++)if(e['amu'+i])put(e['amu'+i],[7,10,13][i-1],[11.5,12.5,11.5][i-1],5.5);
 if(e.head){const h=HB[hb]||[3,13];put(e.head,10,h[0],h[1])}
 const lh=e.lhand,rh=e.rhand;
 if(lh){if(lh.ty=='shield')put(lh,.5,17,14);else{g.save();g.translate(20,0);g.scale(-1,1);put(lh,20.5,14.5,17);g.restore()}}
 if(rh){if(rh.ty=='shield')put(rh,19.5,17,14);else put(rh,20.5,14.5,17)}
  if(st.post)st.post(C,e,st);
 g.imageSmoothingEnabled=false;g.restore()}
function heroStyle(){return{...HERO_ST,...lookStyle()}}
function drawHero(x,y,fl){drawFigure(x,y,S.eq,heroStyle(),fl,false,1)}
function enStyle0(ty,tint){const d=rr(tint,.55);
 if(ty==0)return{skin:'#7fae6a',hair:'#3a2a1a',tun:'#5a4a3a',leg:'#3a3a50',boot:'#2a2a2a',belt:'#2a1a10',face:C=>{R(7,3,2,3,C('#e04040'));R(11,4,2,2,C('#e8e0a0'));R(8,7,4,1,C('#2a1a10'));R(9,7,1,1,C('#e8e0c4'))}};
 if(ty==1)return{skin:'#e8e0c4',hair:null,tun:'#d6ceb2',leg:'#d6ceb2',boot:'#b9b196',belt:'#b9b196',ribs:1,face:C=>{R(7,3,2,3,'#1a0f24');R(11,3,2,3,'#1a0f24');R(8,4,1,1,'#ff4630');R(12,4,1,1,'#ff4630');R(9,7,2,2,'#1a0f24');R(8,7,1,1,C('#e8e0c4'));R(11,7,1,1,C('#e8e0c4'))}};
 if(ty==2)return{skin:'#e8b890',hair:'#c0392b',tun:d,leg:'#4a3a2a',boot:'#2a1a10',belt:'#2a1a10',face:C=>{R(7,4,2,2,C('#2b2150'));R(11,4,2,2,C('#2b2150'));R(8,7,4,1,C('#a0583a'));R(7,2,6,1,C('#8a2a20'))}};
 if(ty==3)return{skin:'#5a9a4a',hair:'#2a2a20',tun:d,leg:'#5a4a3a',boot:'#3a2a1a',belt:'#2a1a10',sc:1.15,face:C=>{R(7,3,6,1,C('#2a2a20'));R(7,4,2,2,C('#ffd24a'));R(11,4,2,2,C('#ffd24a'));R(7,7,1,2,'#fff');R(12,7,1,2,'#fff');R(8,7,4,1,C('#2a1a10'))}};
 if(ty==4)return{skin:'#9a8aa0',hair:rr(tint,.45),tun:rr(tint,.5),leg:rr(tint,.5),boot:'#1a1424',belt:'#d0b040',face:C=>{R(7,4,2,2,'#ff4fa0');R(11,4,2,2,'#ff4fa0');R(9,7,2,1,C('#4a3a50'))}};
 return{skin:'#cfc8dc',hair:'#8a2ab0',tun:'#2a2438',leg:'#2a2438',boot:'#1a1424',belt:'#d0b040',sc:1.4,face:C=>{R(7,4,2,2,'#ff3a3a');R(11,4,2,2,'#ff3a3a');R(8,7,4,1,'#1a0f24');R(6,-2,1,3,'#d0b040');R(9,-3,2,4,'#d0b040');R(13,-2,1,3,'#d0b040')}}}
// Extra detail per enemy type (0 zombie, 1 skeleton, 2 bandit, 3 orc, 4 cultist, 5 boss death knight).
const MOBX={
 0:{pre:C=>{R(6,12,3,2,C('#8a2a2a'));R(7,13,1,1,C('#e8c4c0'));R(11,11,3,1,C('#2a1a10'));R(12,10,1,3,C('#2a1a10'));R(4,19,2,1,'#1a0f24');R(8,19,1,1,'#1a0f24');R(12,19,2,1,'#1a0f24')},
    post:C=>{R(9,8,1,2,C('#9ad07a'));R(7,0,2,1,C('#6a7a5a'))}},
 1:{pre:C=>{R(5,18,4,3,C('#5a3a3a'));R(6,19,2,2,C('#3a2222'))},
    post:C=>{for(let q=0;q<4;q++)R(8+q,8,1,1,q%2?'#8a8266':'#f4ecd0');R(12,1,1,3,'#8a8266');R(11,3,1,1,'#8a8266')}},
 2:{pre:C=>{for(let q=0;q<6;q++)R(5+q,10+q,2,1,C('#6a4a2a'));R(9,13,2,2,C('#e8c050'));R(13,17,3,1,C('#6a6a78'));R(14,18,1,4,C('#cfd6e6'))},
    post:C=>{R(7,6,6,2,C('#6a1a14'));R(8,6,4,1,C('#8a2a20'));R(7,3,6,1,C('#2a1a10'))}},
 3:{pre:C=>{R(6,10,8,1,C('#e8e0c4'));for(const q of[7,9,11,13])R(q,11,1,1,C('#e8e0c4'));R(9,17,2,2,C('#e8e0c4'));R(9,18,2,1,C('#8a8266'))},
    post:C=>{R(7,2,2,1,C('#c03030'));R(11,2,2,1,C('#c03030'));R(8,8,1,2,C('#f4ecd0'));R(11,8,1,2,C('#f4ecd0'));
      R(0,9,5,3,C('#6a6a78'));R(0,9,5,1,C('#9a9aa8'));R(0,8,1,1,C('#cfd6e6'));R(2,7,1,2,C('#cfd6e6'));R(4,8,1,1,C('#cfd6e6'));
      R(15,9,5,3,C('#6a6a78'));R(15,9,5,1,C('#9a9aa8'));R(19,8,1,1,C('#cfd6e6'));R(17,7,1,2,C('#cfd6e6'));R(15,8,1,1,C('#cfd6e6'))}},
 4:{pre:(C,e)=>{const rb=C('#2a1a44');if(!e.legs){ob(3,19,14,9,rb);R(3,19,1,9,C('#3d2a5e'));R(16,20,1,8,C('#150c24'));R(4,27,12,1,C('#150c24'))}
      R(9,12,2,1,'#e050ff');R(9,14,2,1,'#e050ff');R(10,12,1,3,'#e050ff')},
    post:C=>{const hd=C('#2a1a44'),hl=C('#3d2a5e');R(4,-2,12,3,hd);R(5,-3,10,1,hd);R(4,0,2,9,hd);R(14,0,2,9,hd);R(5,0,1,8,hl);R(6,1,8,1,C('#150c24'));
      g.globalAlpha=.55;R(6,2,8,7,'#0c0814');g.globalAlpha=1;R(8,8,4,1,C('#150c24'));R(7,4,2,2,'#ff4fa0');R(11,4,2,2,'#ff4fa0')}},
 5:{pre:C=>{R(8,10,4,8,C('#3a3450'));const p=.5+.5*Math.sin(ART_T*3);g.globalAlpha=.6+.4*p;R(9,12,2,3,'#ff3a3a');g.globalAlpha=1;R(5,10,1,8,C('#4a4468'));R(14,10,1,8,C('#14101e'))},
    post:C=>{R(0,8,6,4,C('#2e2a3c'));R(0,8,6,1,C('#5a5470'));R(0,7,1,1,C('#8a8aa0'));R(2,6,1,2,'#8a8aa0');R(4,7,1,1,'#8a8aa0');
      R(14,8,6,4,C('#2e2a3c'));R(14,8,6,1,C('#5a5470'));R(19,7,1,1,'#8a8aa0');R(17,6,1,2,'#8a8aa0');R(15,7,1,1,'#8a8aa0');
      R(0,11,6,1,'#c01818');R(14,11,6,1,'#c01818');R(5,-1,1,2,'#7a1a1a');R(14,-1,1,2,'#7a1a1a')}},
};
function enStyle(ty,tint){const s=enStyle0(ty,tint),x=MOBX[ty];if(x){s.pre=x.pre;s.post=x.post}return s}
function eqFromDrops(d){const e={},best=(k,it)=>{if(!e[k]||it.ri>e[k].ri)e[k]=it},am=[],hands=[];
 for(const it of d){const t=it.ty;if(t=='head')best('head',it);else if(t=='chest')best('chest',it);else if(t=='gloves')best('gloves',it);else if(t=='legs')best('legs',it);else if(t=='boots')best('boots',it);else if(t=='amulet')am.push(it);else hands.push(it)}
 am.sort((a,b)=>b.ri-a.ri).slice(0,3).forEach((it,i)=>{e['amu'+(i+1)]=it});hands.sort((a,b)=>b.ri-a.ri);
 const w=hands.find(i=>i.ty=='weapon'),sh=hands.find(i=>i.ty=='shield');if(w)e.rhand=w;if(sh)e.lhand=sh;else{const w2=hands.find(i=>i.ty=='weapon'&&i!==w);if(w2)e.lhand=w2}
 return e}
export function petTab(){if(!L('den'))return '<div class="box"><b>Pets</b><div class="mute" style="margin-top:6px">Unlock the Pet den below to adopt companions.</div></div>'+tree(GRAPHS.p);
 let h='<div class="box"><div class="row sp"><b>Companions</b><span class="mute">Stars: '+petStars()+'</span></div><div class="mute" style="margin:6px 0">Ascend a pet at its required level to give it a star. Each star makes that pet hit 60% harder and gives your hero +1.5% damage and gold. Ascending resets the pet level, but stars are permanent and survive your own ascensions.</div>';
 h+=PET.map((P,i)=>{const p=S.pets[i],st=p.star||0,lc=petLc(i),req=pReq(st);return '<div class="it"><div><b style="color:'+P.c+'">'+P.n+'</b>'+(p.own?' lv'+p.lvl+(st?' '+'★'.repeat(Math.min(st,8))+(st>8?'+'+(st-8):''):''):'')+'<small><b>'+P.ab+'</b> ('+P.tag+'): '+(p.own?petInfo(i):P.desc)+'<br>Hits for '+Math.round(P.d*(1+.3*p.lvl+.25*L('bond'))*(1+.6*st)*100)+'% of your attack every '+P.iv+'s'+(p.own?' · ascends at lv'+req:'')+'</small></div><div class="row">'+(p.own?'<button class="s'+(S.ap==i?'':' alt')+'" data-a="ap" data-v="'+i+'">'+(S.ap==i?'Active':'Send')+'</button><button class="s" data-a="pl" data-v="'+i+'" '+(S.gold<lc?'disabled':'')+'>'+fmtN(lc)+'g</button>'+(p.lvl>=req?'<button class="s" data-a="pa" data-v="'+i+'">Ascend ★</button>':''):'<button class="s" data-a="bp" data-v="'+i+'" '+(S.gold<P.cost?'disabled':'')+'>'+fmtN(P.cost)+'g</button>')+'</div></div>'}).join('')+'</div>';return h+farmHtml()+'<h2>Pet skills</h2>'+tree(GRAPHS.p)}
export function magicTab(){const on=hasMagic();let h='<div class="box"><div class="px" style="font-size:9px;margin-bottom:6px">Magic</div>';
 if(!on)h+='<div class="mute">Spellcasting is locked. Buy the <b>Arcane Awakening</b> relic in the Ascend tab (5 relics) to unlock Fireball. Skills appear in the tree below as you unlock them.</div>';
 else{const st=stats(),pow=1+.2*L('arcana'),cdm=Math.pow(.97,L('spCdr')),row=(a,b)=>'<div class="row sp"><span class="mute">'+a+'</span><b>'+b+'</b></div>';
  h+=row('Max mana',mpMax())+row('Mana regen',(3+L('arcana')*.5+L('spRegen')*.4+st.mpr).toFixed(1)+' per second')+row('Cooldowns','x'+Math.round(cdm*100)+'%')+row('Spell crit',L('spCrit')?'yes, uses your crit chance':'locked')+row('Echo chance',Math.min(50,L('spEcho')*3)+'%');
  const info=[i=>'about '+fmtN(Math.round((st.atk*3+20)*pow*(1+.25*L('spFirePow'))))+' damage at stage 10'+(L('spBurn')?', plus a burn':''),i=>'heals '+fmtN(Math.round(st.hp*.35*(1+.08*L('spHeal'))))+' health',i=>'stuns for '+(3+L('arcana')*.2+L('spFrostDur')*.5).toFixed(1)+' s'+(L('spShatter')?', enemy takes +'+(L('spShatter')*10)+'% damage':''),i=>'about '+fmtN(Math.round((st.atk*6+40)*pow*(1+.25*L('spFirePow'))))+' damage at stage 10'];
  h+='<div style="margin-top:8px">'+SP.map((sp,i)=>hasSp(i)?'<div class="it"><div><b>'+sp.n+'</b><small>'+sp.c+' mana, '+(sp.cd*cdm).toFixed(1)+' s cooldown, '+info[i](i)+'</small></div></div>':'<div class="it mute"><div><b>'+sp.n+'</b><small>Locked</small></div></div>').join('')+'</div>'}
 return h+'</div><h2>Skill tree</h2>'+tree(GRAPHS.m)}
export function drawPortrait(n){n=n||0;const c=document.getElementById('pv');if(!c)return;g=c.getContext('2d');
 try{g.setTransform(4,0,0,4,0,0);g.imageSmoothingEnabled=false;R(0,0,48,40,'#0c0912');
  for(let a=0;a<7;a++)for(let q=-1;q<5;q++)R(q*12+(a%2?6:0),a*6,11,5,(q+a)%3?'#17121f':'#1f1829');
  for(let y=0;y<36;y++)for(let x=14;x<34;x++)if(Math.hypot(x-24,y-14)<11&&(x+y)%2==0)R(x,y,1,1,'#33283d');
  R(0,38,48,2,'#1a1420');R(0,38,48,1,'#2c2234');{const eqs=Object.values(S.eq).filter(Boolean),gri=eqs.reduce((m,it)=>Math.max(m,it.ri),-1),cc=capeColor(gri,gri>=0?RC[gri]:'#fff');if(cc)drawCape(g,9,8,ART_T,cc,false)}drawHero(9,8,false)}finally{g=g0}
 if(n<12&&Object.values(S.eq).some(it=>it&&!itImg(it)))setTimeout(()=>drawPortrait(n+1),120)}
function drawEnemy(ty,x,y,col,t,fl){const o='#1a0f24',d=rr(col,.65),W=p=>{if(fl)for(const k in p)p[k]='#fff';return p},f=Math.sin(t*14)>0?0:1;
 if(ty==0)spr(SLM,W({o,g:col,G:d,w:'#fff',e:'#2b2150'}),x,y-9);
 if(ty==1)spr(BTM,W({o,P:col,w:'#fff',e:'#ff3a3a',f:'#fff'}),x,y-15+f-Math.round(Math.sin(t*4)*2));
 if(ty==2)spr(GBM,W({o,G:col,w:'#fff',e:'#2b2150',f:'#fff',b:'#8a5a2a'}),x,y-13);
 if(ty==3)spr(SKM,W({o,b:'#e8e0c4',B:'#9a917a',e:'#ff4630'}),x,y-17);
 if(ty==4){spr(OGM,W({o,P:col,d,w:'#fff',e:'#2b2150',f:'#fff'}),x-1,y-16);ob(x+16,y-17,3,14,'#8a5a2a')}
 if(ty==5){const c=fl?'#fff':col,e=fl?'#fff':d;ob(x+3,y-20+f,10,9,e);ob(x,y-10,20,8,c);ob(x+16,y-20,6,12,c);ob(x+17,y-23,10,6,c);R(x+23,y-21,2,2,'#ffe45c');ob(x-6,y-8,7,3,c);ob(x+3,y-3,4,3,c);ob(x+13,y-3,4,3,c);R(x+3,y-5,14,2,fl?'#fff':'#ffd27a');R(x+27,y-21,3,1,'#ff7a1a')}}
const DM=[[14,9],[14,7],[14,13],[12,17],[16,16],[26,22]];
function sh(k,x,y,w,h,e){let a;if(k=='head')a=[x+w*.2-e,y-h-1-e,w*.6+2*e,2+2*e];else if(k=='chest')a=[x+w*.15-e,y-h*.6-e,w*.7+2*e,h*.28+2*e];else if(k=='gloves')a=[x-2-e,y-h*.45-e,2+2*e,2+2*e];else if(k=='legs')a=[x+w*.2-e,y-h*.3-e,w*.6+2*e,h*.2+2*e];else if(k=='boots')a=[x-e,y-1-e,w+2*e,1+2*e];else if(k=='amulet')a=[x+w/2-1-e,y-h*.68-e,2+2*e,2+2*e];else if(k=='weapon')a=[x+w+1-e,y-h*.9-e,2+2*e,h*.6+2*e];else a=[x-4-e,y-h*.65-e,3+2*e,h*.35+2*e];return a.map(Math.round)}
function wear(ty,x,d,t){if(!d)return;const[w,h]=DM[ty],y=44-(ty==1?8+Math.sin(t*4)*2:0),cn={};
 d.slice(0,10).forEach(it=>{const k=it.ty,n=cn[k]=(cn[k]||0)+1,o=(n-1)*3,c=RC[it.ri];
  if(it.ri>=3){const q=sh(k,x,y,w,h,2);g.globalAlpha=.3+.15*Math.sin(t*8);R(q[0]+o,q[1],q[2],q[3],c);g.globalAlpha=1}
  const q=sh(k,x,y,w,h,0);R(q[0]+o-1,q[1]-1,q[2]+2,q[3]+2,'#1a0f24');R(q[0]+o,q[1],q[2],q[3],c)})}
function draw(){const r=run,t=r.t;ART_T=t;const tier=Math.floor((r.stage-1)/5)%6,z=ZONES[tier],k=[rr(z.wall,1.1),rr(z.wall,1.5),z.floor,rr(z.floor,1.8),rr(z.glow,.4),'#ff8a2a'],fl=Math.floor(t*7)%3;
 const shk=r.shakeT>0;g.setTransform(2,0,0,2,shk?Math.round(Math.random()*6-3):0,shk?Math.round(Math.random()*6-3):0);g.imageSmoothingEnabled=false;drawBackdrop(g,tier,t,z);
 const tint=TINT[tier],es=enStyle(r.eType,tint),sc=es.sc||1,ex=(r.boss?58:68)-(r.elunge>0?3:0);drawShadows(g,14+(r.lunge>0?5:0),ex,sc,S.ap>=0);
 if(S.ap>=0){const P=PET[S.ap],b=Math.sin(t*8)>0?0:1;drawPet(P,t,2+(r.petT>0?Math.round(Math.sin((1-r.petT/.25)*Math.PI)*9):0),44,b)}
 const hx=14+(r.lunge>0?5:0),hy=14+(Math.sin(t*6)>0?0:1);
 // aura glow rings around hero
 const aa=activeAuras();if(aa.length){aa.forEach((aur,ai)=>{const alpha=(.1+.08*Math.sin(t*5+ai*1.2));g.globalAlpha=alpha;R(hx-1-ai,hy-5-ai,22+ai*2,34+ai*2,aur.c)});g.globalAlpha=1}
 const eqs=Object.values(S.eq).filter(Boolean),gearRi=eqs.reduce((m,it)=>Math.max(m,it.ri),-1),rcol=gearRi>=0?RC[gearRi]:'#ffffff',wi=S.eq.rhand||S.eq.lhand,wcol=wi?RC[wi.ri]:'#ffe45c';
 drawHeroAura(g,hx,hy,t,gearRi,rcol);{const cc=capeColor(gearRi,rcol);if(cc)drawCape(g,hx,hy,t,cc,r.lunge>0)}drawHero(hx,hy,r.hf>0);
 if(r.rn>0){for(let q=0;q<r.rn;q++){R(hx+2+q*4,hy-7,3,1,'#ff8a2a');R(hx+3+q*4,hy-8,1,1,'#ffd34d')}}
 if(r.swT>0){frame(hx-3,hy-4,26,38,'#ffd34d',Math.min(.9,r.swT));for(let q=0;q<5;q++){const sp=(Math.floor(t*12)+q*5)%9;R(hx-2+((q*7+sp*3)%24),hy-3+((q*13+sp*5)%36),1,1,'#fff3b0')}}
 const ey=44-30*sc-(Math.sin(t*4+r.stage)>.3?1:0);if(!r.eEq)r.eEq=eqFromDrops(r.eDrops||[]);
 const bestRi=(r.eDrops||[]).reduce((m,it)=>Math.max(m,it.ri),0);if(bestRi>=2){g.globalAlpha=.25+.15*Math.sin(t*6);R(ex-2,43,Math.round(24*sc),2,RC[bestRi]);g.globalAlpha=1}
 drawFigure(ex,ey,r.eEq,es,r.ef>0,true,sc);
 if(r.golden){frame(ex-1,ey-1,Math.round(20*sc)+2,Math.round(30*sc)+2,'#ffd34d',.55+.3*Math.sin(t*9));for(let q=0;q<4;q++){const sp=Math.floor(t*6+q*7)%12;R(ex+((q*7+sp)%20)*sc,ey+((q*11+sp*3)%30)*sc,1,1,sp%2?'#fff3b0':'#ffd34d')}}
 if(r.pb&&r.pb.n>0){for(let q=0;q<Math.min(6,r.pb.n+1);q++){const fh=2+((Math.floor(t*10)+q)%3);R(ex+2+q*3*sc,Math.round(ey+30*sc)-fh-2,2,fh,q%2?'#ffd34d':'#ff8a2a')}}
 if(r.stun>0){R(ex+4,ey-5,12,2,'#6ecbf5');R(ex+6,ey-7,8,2,'#bfeaff')}
 if(r.psnStacks>0){g.globalAlpha=.08+.03*r.psnStacks;R(ex,ey,Math.round(20*sc),Math.round(30*sc),'#40c060');g.globalAlpha=1}
 if(r.boss&&r.eHp/r.eMax<.35){g.globalAlpha=.6+.3*Math.sin(t*22);R(ex-6,30,6,3,'#ff7700');R(ex-10,32,5,2,'#ff4400');g.globalAlpha=1}
 g.globalAlpha=1
 drawMobFx(g,r,t,ex,ey,sc);drawEffects(g,r,t,ex,ey,sc,hx,hy,wcol);
 for(const o of r.orbs){R(o.x-1,o.y-1,4,4,'#1a0f24');R(o.x,o.y,2,2,o.c)}
 drawForeground(g,tier,t,z,r.boss);const fs=Math.max(10,Math.round((cv.clientWidth||380)/30));$('#fxl').innerHTML='<i style="color:'+z.glow+'">'+z.name+'</i>'+r.fx.map(f=>{const s=String(f.t),big=s[0]=='!';return '<b style="left:'+(f.x/96*100).toFixed(2)+'%;top:'+(f.y/54*100).toFixed(2)+'%;color:'+f.c+';opacity:'+Math.max(0,1-f.a/.8).toFixed(2)+';font-size:'+Math.round(big?fs*1.4:fs)+'px">'+(big?s.slice(1)+'!':s)+'</b>'}).join('');g.globalAlpha=1}

export function hud(){const st=stats(),r=run;$('#hpb').style.width=r.hp/st.hp*100+'%';$('#hpt').textContent=Math.ceil(r.hp)+' / '+Math.round(st.hp);
 $('#mpw').hidden=!hasMagic();$('#mpb').style.width=r.mp/mpMax()*100+'%';$('#mpt').textContent=Math.floor(r.mp)+' mana';
 $('#ehb').style.width=Math.max(0,r.eHp/r.eMax*100)+'%';$('#ent').textContent=(r.boss?'BOSS · ':'')+'Stage '+r.stage+' · '+ename()+' · '+r.eDrops.length+' loot';
 const gemStr=(S.gems||0)>0?'<span style="color:var(--gem)"> · 💎'+S.gems+'</span>':'';
 $('#top').innerHTML=fmtN(S.gold)+' gold'+gemStr+'<br><span class="mute">asc '+S.asc+' · best '+S.best+' · all-time '+S.bestOverall+'</span>';{const ab=$('#autob'),ao=$('#autoo');if(ab)ab.textContent='Auto-delve: '+(S.autoDelve?'ON':'OFF');if(ao)ao.textContent=S.autoDelve?'Auto-delve: ON (click to stop)':'Auto-delve: OFF'}$('#spdb').hidden=maxSpd()<2;$('#spdb').textContent='Speed x'+Math.min(S.speed,maxSpd());
 document.querySelectorAll('#spells button').forEach(b=>{const i=+b.dataset.v;b.disabled=r.over||r.cd[i]>0||r.mp<SP[i].c;b.textContent=SP[i].n+(r.cd[i]>0?' '+Math.ceil(r.cd[i]):'')})}
const AUTO_DELAY=1.5; // seconds the defeat screen stays up before auto-delve starts the next run
let last=0,sv=0;export function loop(ts){const dt=Math.min(.1,(ts-last)/1000||0);last=ts;
 if(mode=='battle'&&run){const n=Math.min(S.speed,maxSpd());for(let i=0;i<n;i++)tick(dt);if(run.over){run.ot=(run.ot||0)+dt;if(S.autoDelve&&run.ot>=AUTO_DELAY){delveAgain();requestAnimationFrame(loop);return}}draw();hud();sv+=dt;if(sv>5){sv=0;save()}}
 requestAnimationFrame(loop)}
