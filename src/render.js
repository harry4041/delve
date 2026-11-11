import {petInfo} from './pets.js';
import {$,PET,RC,S,SP,mode,run,save} from './state.js';
import {activeAuras} from './auras.js';
import {L,fmtN,mpMax,pReq,petStars,stats} from './stats.js';
import {GRAPHS} from './skilltree.js';
import {hasMagic,hasSp,maxSpd,petLc} from './ascension.js';
import {tree} from './treeview.js';
import {ename,tick} from './battle.js';
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
const HERO_ST={skin:'#ffd5ac',hair:'#ff9a2e',tun:'#3d8bff',leg:'#6a4f8a',boot:'#8a5a2a',belt:'#6a4a2a',face:C=>{R(8,4,1,2,C('#2b2150'));R(11,4,1,2,C('#2b2150'));R(7,6,1,1,C('#ff9fb0'));R(12,6,1,1,C('#ff9fb0'));R(9,7,2,1,C('#c0705a'))}};
function drawFigure(x,y,e,st,fl,flip,sc){g.save();g.translate(x,y);if(sc&&sc!=1)g.scale(sc,sc);if(flip){g.translate(20,0);g.scale(-1,1)}
 const C=c=>fl?'#fff':c,sk=C(st.skin),hr=C(st.hair||'#000'),tun=C(st.tun),lg=C(st.leg),bt=C(st.boot),hb=e.head?baseOf(e.head):'';
 if(!e.legs){ob(6,20,4,7,lg);ob(10,20,4,7,lg)}
 if(!e.boots){ob(5,26,5,3,bt);ob(10,26,5,3,bt)}
 if(!e.chest){ob(4,9,12,11,tun);R(4,17,12,2,C(st.belt));ob(1,10,3,9,tun);ob(16,10,3,9,tun);if(st.ribs&&!fl){for(const yy of[11,13,15])R(5,yy,10,1,'#8a8266')}}
 else if(!e.gloves){ob(1,15,3,6,sk);ob(16,15,3,6,sk)}
 if(!e.gloves){ob(1,18,3,3,sk);ob(16,18,3,3,sk)}
 R(8,8,4,2,sk);
 if(hb!='Helm'&&hb!='Hood'){ob(6,0,8,9,sk);if(st.hair){R(6,0,8,3,hr);R(5,1,1,5,hr);R(14,1,1,5,hr)}st.face(C)}
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
 g.imageSmoothingEnabled=false;g.restore()}
function drawHero(x,y,fl){drawFigure(x,y,S.eq,HERO_ST,fl,false,1)}
function enStyle(ty,tint){const d=rr(tint,.55);
 if(ty==0)return{skin:'#7fae6a',hair:'#3a2a1a',tun:'#5a4a3a',leg:'#3a3a50',boot:'#2a2a2a',belt:'#2a1a10',face:C=>{R(7,3,2,3,C('#e04040'));R(11,4,2,2,C('#e8e0a0'));R(8,7,4,1,C('#2a1a10'));R(9,7,1,1,C('#e8e0c4'))}};
 if(ty==1)return{skin:'#e8e0c4',hair:null,tun:'#d6ceb2',leg:'#d6ceb2',boot:'#b9b196',belt:'#b9b196',ribs:1,face:C=>{R(7,3,2,3,'#1a0f24');R(11,3,2,3,'#1a0f24');R(8,4,1,1,'#ff4630');R(12,4,1,1,'#ff4630');R(9,7,2,2,'#1a0f24');R(8,7,1,1,C('#e8e0c4'));R(11,7,1,1,C('#e8e0c4'))}};
 if(ty==2)return{skin:'#e8b890',hair:'#c0392b',tun:d,leg:'#4a3a2a',boot:'#2a1a10',belt:'#2a1a10',face:C=>{R(7,4,2,2,C('#2b2150'));R(11,4,2,2,C('#2b2150'));R(8,7,4,1,C('#a0583a'));R(7,2,6,1,C('#8a2a20'))}};
 if(ty==3)return{skin:'#5a9a4a',hair:'#2a2a20',tun:d,leg:'#5a4a3a',boot:'#3a2a1a',belt:'#2a1a10',sc:1.15,face:C=>{R(7,3,6,1,C('#2a2a20'));R(7,4,2,2,C('#ffd24a'));R(11,4,2,2,C('#ffd24a'));R(7,7,1,2,'#fff');R(12,7,1,2,'#fff');R(8,7,4,1,C('#2a1a10'))}};
 if(ty==4)return{skin:'#9a8aa0',hair:rr(tint,.45),tun:rr(tint,.5),leg:rr(tint,.5),boot:'#1a1424',belt:'#d0b040',face:C=>{R(7,4,2,2,'#ff4fa0');R(11,4,2,2,'#ff4fa0');R(9,7,2,1,C('#4a3a50'))}};
 return{skin:'#cfc8dc',hair:'#8a2ab0',tun:'#2a2438',leg:'#2a2438',boot:'#1a1424',belt:'#d0b040',sc:1.4,face:C=>{R(7,4,2,2,'#ff3a3a');R(11,4,2,2,'#ff3a3a');R(8,7,4,1,'#1a0f24');R(6,-2,1,3,'#d0b040');R(9,-3,2,4,'#d0b040');R(13,-2,1,3,'#d0b040')}}}
function eqFromDrops(d){const e={},best=(k,it)=>{if(!e[k]||it.ri>e[k].ri)e[k]=it},am=[],hands=[];
 for(const it of d){const t=it.ty;if(t=='head')best('head',it);else if(t=='chest')best('chest',it);else if(t=='gloves')best('gloves',it);else if(t=='legs')best('legs',it);else if(t=='boots')best('boots',it);else if(t=='amulet')am.push(it);else hands.push(it)}
 am.sort((a,b)=>b.ri-a.ri).slice(0,3).forEach((it,i)=>{e['amu'+(i+1)]=it});hands.sort((a,b)=>b.ri-a.ri);
 const w=hands.find(i=>i.ty=='weapon'),sh=hands.find(i=>i.ty=='shield');if(w)e.rhand=w;if(sh)e.lhand=sh;else{const w2=hands.find(i=>i.ty=='weapon'&&i!==w);if(w2)e.lhand=w2}
 return e}
export function petTab(){if(!L('den'))return '<div class="box"><b>Pets</b><div class="mute" style="margin-top:6px">Unlock the Pet den below to adopt companions.</div></div>'+tree(GRAPHS.p);
 let h='<div class="box"><div class="row sp"><b>Companions</b><span class="mute">Stars: '+petStars()+'</span></div><div class="mute" style="margin:6px 0">Ascend a pet at its required level to give it a star. Each star makes that pet hit 60% harder and gives your hero +1.5% damage and gold. Ascending resets the pet level, but stars are permanent and survive your own ascensions.</div>';
 h+=PET.map((P,i)=>{const p=S.pets[i],st=p.star||0,lc=petLc(i),req=pReq(st);return '<div class="it"><div><b style="color:'+P.c+'">'+P.n+'</b>'+(p.own?' lv'+p.lvl+(st?' '+'★'.repeat(Math.min(st,8))+(st>8?'+'+(st-8):''):''):'')+'<small><b>'+P.ab+'</b> ('+P.tag+'): '+(p.own?petInfo(i):P.desc)+'<br>Hits for '+Math.round(P.d*(1+.3*p.lvl+.25*L('bond'))*(1+.6*st)*100)+'% of your attack every '+P.iv+'s'+(p.own?' · ascends at lv'+req:'')+'</small></div><div class="row">'+(p.own?'<button class="s'+(S.ap==i?'':' alt')+'" data-a="ap" data-v="'+i+'">'+(S.ap==i?'Active':'Send')+'</button><button class="s" data-a="pl" data-v="'+i+'" '+(S.gold<lc?'disabled':'')+'>'+fmtN(lc)+'g</button>'+(p.lvl>=req?'<button class="s" data-a="pa" data-v="'+i+'">Ascend ★</button>':''):'<button class="s" data-a="bp" data-v="'+i+'" '+(S.gold<P.cost?'disabled':'')+'>'+fmtN(P.cost)+'g</button>')+'</div></div>'}).join('')+'</div>';return h+'<h2>Pet skills</h2>'+tree(GRAPHS.p)}
export function magicTab(){const on=hasMagic();let h='<div class="box"><div class="px" style="font-size:9px;margin-bottom:6px">Magic</div>';
 if(!on)h+='<div class="mute">Spellcasting is locked. Buy the <b>Arcane Awakening</b> relic in the Ascend tab (5 relics) to unlock Fireball. The skill tree below shows what you can build.</div>';
 else{const st=stats(),pow=1+.2*L('arcana'),cdm=Math.pow(.97,L('spCdr')),row=(a,b)=>'<div class="row sp"><span class="mute">'+a+'</span><b>'+b+'</b></div>';
  h+=row('Max mana',mpMax())+row('Mana regen',(3+L('arcana')*.5+L('spRegen')*.4+st.mpr).toFixed(1)+' per second')+row('Cooldowns','x'+Math.round(cdm*100)+'%')+row('Spell crit',L('spCrit')?'yes, uses your crit chance':'locked')+row('Echo chance',Math.min(50,L('spEcho')*3)+'%');
  const info=[i=>'about '+fmtN(Math.round((st.atk*3+20)*pow*(1+.25*L('spFirePow'))))+' damage at stage 10'+(L('spBurn')?', plus a burn':''),i=>'heals '+fmtN(Math.round(st.hp*.35*(1+.08*L('spHeal'))))+' health',i=>'stuns for '+(3+L('arcana')*.2+L('spFrostDur')*.5).toFixed(1)+' s'+(L('spShatter')?', enemy takes +'+(L('spShatter')*10)+'% damage':''),i=>'about '+fmtN(Math.round((st.atk*6+40)*pow*(1+.25*L('spFirePow'))))+' damage at stage 10'];
  h+='<div style="margin-top:8px">'+SP.map((sp,i)=>hasSp(i)?'<div class="it"><div><b>'+sp.n+'</b><small>'+sp.c+' mana, '+(sp.cd*cdm).toFixed(1)+' s cooldown, '+info[i](i)+'</small></div></div>':'<div class="it mute"><div><b>'+sp.n+'</b><small>Locked</small></div></div>').join('')+'</div>'}
 return h+'</div><h2>Skill tree</h2>'+tree(GRAPHS.m)}
export function drawPortrait(n){n=n||0;const c=document.getElementById('pv');if(!c)return;g=c.getContext('2d');
 try{g.setTransform(4,0,0,4,0,0);g.imageSmoothingEnabled=false;R(0,0,48,40,'#0c0912');
  for(let a=0;a<7;a++)for(let q=-1;q<5;q++)R(q*12+(a%2?6:0),a*6,11,5,(q+a)%3?'#17121f':'#1f1829');
  for(let y=0;y<36;y++)for(let x=14;x<34;x++)if(Math.hypot(x-24,y-14)<11&&(x+y)%2==0)R(x,y,1,1,'#33283d');
  R(0,38,48,2,'#1a1420');R(0,38,48,1,'#2c2234');drawHero(9,8,false)}finally{g=g0}
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
function draw(){const r=run,t=r.t,tier=Math.floor((r.stage-1)/5)%6,z=ZONES[tier],k=[rr(z.wall,1.1),rr(z.wall,1.5),z.floor,rr(z.floor,1.8),rr(z.glow,.4),'#ff8a2a'],fl=Math.floor(t*7)%3;
 g.setTransform(2,0,0,2,0,0);g.imageSmoothingEnabled=false;R(0,0,96,54,rr(k[0],.45));
 for(let a=0;a<7;a++)for(let q=-1;q<9;q++)R(q*12+(a%2?6:0),a*6,11,5,(q+a)%3?k[0]:k[1]);
 for(let y=0;y<44;y++)for(let x=30;x<66;x++)if(Math.hypot(x-48,y-20)<13+fl&&(x+y)%2==0)R(x,y,1,1,k[4]);
 R(46,24,4,2,'#4a3a2a');R(47,26,2,6,'#4a3a2a');R(46,17+(fl?1:0),4,6,k[5]);R(47,15+fl,2,6,'#ffe45c');
 R(0,44,96,10,k[2]);R(0,44,96,1,k[3]);for(let x=2;x<96;x+=11)R(x,48+(x%2),6,1,rr(k[3],.8));
 if(S.ap>=0){const P=PET[S.ap],b=Math.sin(t*8)>0?0:1;ob(3,39-b,7,5,P.c);ob(8,37-b,4,4,P.c);R(10,38-b,1,1,'#1a0f24')}
 const hx=14+(r.lunge>0?5:0),hy=14+(Math.sin(t*6)>0?0:1);
 // aura glow rings around hero
 const aa=activeAuras();if(aa.length){aa.forEach((aur,ai)=>{const alpha=(.1+.08*Math.sin(t*5+ai*1.2));g.globalAlpha=alpha;R(hx-1-ai,hy-5-ai,22+ai*2,34+ai*2,aur.c)});g.globalAlpha=1}
 drawHero(hx,hy,r.hf>0);
 const tint=TINT[tier],es=enStyle(r.eType,tint),sc=es.sc||1,ey=44-30*sc,ex=(r.boss?58:68)-(r.elunge>0?3:0);if(!r.eEq)r.eEq=eqFromDrops(r.eDrops||[]);
 const bestRi=(r.eDrops||[]).reduce((m,it)=>Math.max(m,it.ri),0);if(bestRi>=2){g.globalAlpha=.25+.15*Math.sin(t*6);R(ex-2,43,Math.round(24*sc),2,RC[bestRi]);g.globalAlpha=1}
 drawFigure(ex,ey,r.eEq,es,r.ef>0,true,sc);
 if(r.stun>0){R(ex+4,ey-5,12,2,'#6ecbf5');R(ex+6,ey-7,8,2,'#bfeaff')}
 if(r.psnStacks>0){g.globalAlpha=.08+.03*r.psnStacks;R(ex,ey,Math.round(20*sc),Math.round(30*sc),'#40c060');g.globalAlpha=1}
 if(r.boss&&r.eHp/r.eMax<.35){g.globalAlpha=.6+.3*Math.sin(t*22);R(ex-6,30,6,3,'#ff7700');R(ex-10,32,5,2,'#ff4400');g.globalAlpha=1}
 g.globalAlpha=1
 if(r.ef>0){const sy=Math.round(ey+12*sc);R(ex-4,sy+1,5,1,'#ffe45c');R(ex-2,sy-1,1,5,'#ffe45c');R(ex-3,sy,3,3,'#fff')}
 for(const o of r.orbs){R(o.x-1,o.y-1,4,4,'#1a0f24');R(o.x,o.y,2,2,o.c)}
 const fs=Math.max(10,Math.round((cv.clientWidth||380)/30));$('#fxl').innerHTML='<i style="color:'+z.glow+'">'+z.name+'</i>'+r.fx.map(f=>{const s=String(f.t),big=s[0]=='!';return '<b style="left:'+(f.x/96*100).toFixed(2)+'%;top:'+(f.y/54*100).toFixed(2)+'%;color:'+f.c+';opacity:'+Math.max(0,1-f.a/.8).toFixed(2)+';font-size:'+Math.round(big?fs*1.4:fs)+'px">'+(big?s.slice(1)+'!':s)+'</b>'}).join('');g.globalAlpha=1}

export function hud(){const st=stats(),r=run;$('#hpb').style.width=r.hp/st.hp*100+'%';$('#hpt').textContent=Math.ceil(r.hp)+' / '+Math.round(st.hp);
 $('#mpw').hidden=!hasMagic();$('#mpb').style.width=r.mp/mpMax()*100+'%';$('#mpt').textContent=Math.floor(r.mp)+' mana';
 $('#ehb').style.width=Math.max(0,r.eHp/r.eMax*100)+'%';$('#ent').textContent=(r.boss?'BOSS · ':'')+'Stage '+r.stage+' · '+ename()+' · '+r.eDrops.length+' loot';
 const gemStr=(S.gems||0)>0?'<span style="color:var(--gem)"> · 💎'+S.gems+'</span>':'';
 $('#top').innerHTML=fmtN(S.gold)+' gold'+gemStr+'<br><span class="mute">asc '+S.asc+' · best '+S.best+' · all-time '+S.bestOverall+'</span>';$('#spdb').hidden=maxSpd()<2;$('#spdb').textContent='Speed x'+Math.min(S.speed,maxSpd());
 document.querySelectorAll('#spells button').forEach(b=>{const i=+b.dataset.v;b.disabled=r.over||r.cd[i]>0||r.mp<SP[i].c;b.textContent=SP[i].n+(r.cd[i]>0?' '+Math.ceil(r.cd[i]):'')})}
let last=0,sv=0;export function loop(ts){const dt=Math.min(.1,(ts-last)/1000||0);last=ts;
 if(mode=='battle'&&run){const n=Math.min(S.speed,maxSpd());for(let i=0;i<n;i++)tick(dt);draw();hud();sv+=dt;if(sv>5){sv=0;save()}}
 requestAnimationFrame(loop)}
