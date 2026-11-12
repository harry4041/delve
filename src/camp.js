import {leaderboardTab} from './leaderboard.js';
import {farmSettle,farmCollect} from './farm.js';
import {toast} from './toast.js';
import {bpView,bpControls} from './backpack.js';
import {accountTab,accountStatus} from './account.js';
import {$,PET,RC,RN,S,SL,SLN,SP,TR,def,forgeMode,forgeSelected,mode,run,save,setForgeMode,setForgeSelected,setMode,setRun,setS,setTab,setUid,tab} from './state.js';
import {fmt,sc,val} from './items.js';
import {AURAS,activeAuras,auraOwned,auraUpCost} from './auras.js';
import {L,RL,activeSynergies,fOK,fmtN,forgeAll,forgeCost,forgeDo,forgeIntro,forgeReq,nextLabel,pReq,petStars,plColor,plLabel,powerLevel,stats} from './stats.js';
import {auraTab,idleTab} from './tabs-aura-idle.js';
import {GRAPHS,NODE,bagCap,bagUpgradeCost,can,cost,qmT,vaultCap,vaultUnlockCost,vaultUpgradeCost} from './skilltree.js';
import {lbTab,vaultTab} from './vault-leaderboard.js';
import {RT,RTREE,ascTab,ascend,hasMagic,hasSp,maxSpd,petLc,rcost,startStage} from './ascension.js';
import {autoEquip,equip,sell,target} from './gear.js';
import {tree} from './treeview.js';
import {cast,die,startRun} from './battle.js';
import {drawPortrait,hud,magicTab,petTab} from './render.js';
import {chip} from './assets.js';
export function view(){$('#battle').hidden=mode!='battle';$('#camp').hidden=mode!='camp';
 $('#spells').innerHTML=SP.map((s,i)=>hasSp(i)?'<button class="s" data-a="cast" data-v="'+i+'">'+s.n+'</button>':'').join('');
 if(mode=='camp')camp();else hud()}
export function camp(){const st=stats();$('#sdw').innerHTML=(RL('rStart')?'<span>Start stage</span><button class="s alt" data-a="sd" data-v="-1">-</button><b>'+startStage()+'</b><button class="s alt" data-a="sd" data-v="1">+</button>':'')+(L('sorter')?'<span style="margin-left:8px">Auto-sell</span><button class="s alt" data-a="qm" data-v="-1">-</button><b>'+(qmT()?RN[qmT()-1]+' and below':'Off')+'</b><button class="s alt" data-a="qm" data-v="1">+</button>':'');$('#tg').className=tab=='g'?'on':'';$('#ta').className=tab=='a'?'on':'';$('#tv').className=tab=='v'?'on':'';$('#tl').className=tab=='l'?'on':'';$('#tp').className=tab=='p'?'on':'';$('#tm').className=tab=='m'?'on':'';$('#ti').className=tab=='i'?'on':'';$('#tu').className=tab=='u'?'on':'';if($('#tr2'))$('#tr2').className=tab=='r'?'on':'';if($('#tx'))$('#tx').className=tab=='x'?'on':'';
 const pl=powerLevel(),plC=plColor(pl),plLbl=plLabel(pl);
 const gemHtml=(S.gems||0)>0?'<span style="color:var(--gem)"> · 💎'+S.gems+'</span>':'';
 const plHtml='<span style="color:'+plC+'"> · ⚡'+pl+' ('+plLbl+')</span>';
 if(tab=='x'){$('#top').innerHTML=fmtN(S.gold)+' gold'+plHtml+gemHtml+'<br><span class="mute">'+accountStatus()+'</span>';$('#cbody').innerHTML=accountTab();return}
 if(tab=='m'){$('#top').innerHTML=fmtN(S.gold)+' gold'+plHtml+gemHtml+'<br><span class="mute">'+(hasMagic()?'magic unlocked':'magic locked')+'</span>';$('#cbody').innerHTML=magicTab();return}
 if(tab=='i'){$('#top').innerHTML=fmtN(S.gold)+' gold'+plHtml+gemHtml+'<br><span class="mute">'+S.relics+' relics</span>';$('#cbody').innerHTML=idleTab();return}
 if(tab=='p'){$('#top').innerHTML=fmtN(S.gold)+' gold'+plHtml+gemHtml+'<br><span class="mute">'+petStars()+' pet stars</span>';$('#cbody').innerHTML=petTab();return}
 if(tab=='l'){$('#top').innerHTML=fmtN(S.gold)+' gold'+plHtml+gemHtml+'<br><span class="mute">asc '+S.asc+'</span>';$('#cbody').innerHTML=leaderboardTab();return}
 if(tab=='v'){$('#top').innerHTML=fmtN(S.gold)+' gold'+plHtml+gemHtml+'<br><span class="mute">best '+S.best+'</span>';$('#cbody').innerHTML=vaultTab();return}
 if(tab=='a'){$('#top').innerHTML=fmtN(S.gold)+' gold'+plHtml+gemHtml+'<br><span class="mute">'+S.relics+' relics</span>';$('#cbody').innerHTML=ascTab();return}
 if(tab=='r'){$('#top').innerHTML=fmtN(S.gold)+' gold'+gemHtml+'<br><span class="mute">'+plLbl+' · ⚡'+pl+'</span>';$('#cbody').innerHTML=auraTab();return}
 $('#tu').className=tab=='u'?'on':'';if(tab=='u'){$('#top').innerHTML=fmtN(S.gold)+' gold'+plHtml+gemHtml+'<br><span class="mute">asc '+S.asc+' · best '+S.best+'</span>';$('#cbody').innerHTML=tree(GRAPHS.u);return}
 $('#top').innerHTML=fmtN(S.gold)+' gold'+plHtml+gemHtml+'<br><span class="mute">asc '+S.asc+' · best '+S.best+' · all-time '+(S.bestOverall||S.best)+'</span>';let h='';
 if(tab=='g'){
  const syn=activeSynergies();const synHtml=syn.length?'<div style="margin-top:4px;color:var(--c4)">⚡ '+syn.join(' · ')+'</div>':'<div class="mute" style="margin-top:4px">No set bonuses active. Match base item types for synergies.</div>';
  if(S.offMsg)h+='<div class="box"><div>'+S.offMsg+'</div><button class="s" data-a="offOk">Nice</button></div>';
  const srows=[['Attack',Math.round(st.atk)],['Defense',Math.round(st.def)],['Health',Math.round(st.hp)],['Crit',Math.round(st.crit)+'%'],['Speed','+'+Math.round(st.spd*100)+'%']];
  if(st.ls)srows.push(['Lifesteal',Math.round(st.ls)+'%']);if(st.dodge)srows.push(['Dodge',Math.round(st.dodge)+'%']);if(st.gf)srows.push(['Gold find',Math.round(st.gf)+'%']);if(st.thorn)srows.push(['Thorns',Math.round(st.thorn)]);if(st.mpr)srows.push(['Mana/s','+'+st.mpr.toFixed(1)]);
  const aurasActive=activeAuras();const auraDisplay=aurasActive.length?'<div style="margin-top:4px">'+aurasActive.map(a=>'<span style="color:'+a.c+';font-size:16px">◈ '+a.n+'</span>').join(' ')+'</div>':'';
  h+='<div class="box"><div style="display:flex;gap:10px;align-items:flex-start"><canvas id="pv" width="192" height="160" style="width:52%;aspect-ratio:6/5;flex:none;border:2px solid var(--ink)"></canvas><div style="flex:1;min-width:0"><div class="px" style="font-size:9px;margin-bottom:6px">Hero</div><div class="row sp" style="gap:4px"><span class="mute">Power</span><b style="color:'+plC+'">⚡'+pl+' <span style="font-size:16px">('+plLbl+')</span></b></div>'+srows.map(r=>'<div class="row sp" style="gap:4px"><span class="mute">'+r[0]+'</span><b>'+r[1]+'</b></div>').join('')+'</div></div>'+synHtml+auraDisplay+'</div>';
  h+='<div class="slots">'+SL.map(sl=>{const it=S.eq[sl];return '<div class="sl'+(it?' f':'')+'" '+(it?'data-a="un" data-v="'+sl+'"':'')+'><small>'+SLN[sl]+'</small>'+(it?chip(it)+'<small>'+fmt(it.st)+'</small>':'<span class="mute">empty</span>')+'</div>'}).join('')+'</div>';
  const cap=bagCap(),isFull=S.bag.length>=cap,isUnlimited=cap===Infinity;
  const bagUpCost=bagUpgradeCost();
  h+='<h2>Bag ('+S.bag.length+(isUnlimited?' / ∞':' / '+cap)+')</h2>';
  h+='<div class="mute">Uncommon drops from stage 10, rare from 25, epic from 45, legendary from 70. Bosses drop one tier higher. Lucky finds may rarely appear earlier.</div>';
  h+='<div class="row" style="margin:4px 0">'+(isUnlimited?'<span style="color:var(--c1)">∞ Unlimited capacity</span>':'<span'+(isFull?' style="color:#d94a4a"':'')+'>'+S.bag.length+'/'+cap+' slots used</span> <button class="s" data-a="bagUp" '+(S.gold<bagUpCost?'disabled':'')+'>Expand ('+(isUnlimited?'∞':bagUpCost+'g')+')</button>')+'</div>';
  h+='<div class="row">'+(L('tidy')?'<button class="s" data-a="best">Equip upgrades</button>':'')+''+bulkBtns()+'</div><div class="box">';
  // Forge panel
  const fs0=forgeSelected[0]?S.bag.find(x=>x.id===forgeSelected[0]):null,fNeed=fs0?forgeReq(fs0):3,fCost=fs0?forgeCost(fs0):0;
  const forgeValid=!!fs0&&forgeSelected.length===fNeed&&fOK(fs0)&&S.gold>=fCost&&forgeSelected.every(id=>{const it=S.bag.find(x=>x.id===id);return it&&it.ri===fs0.ri&&it.ty===fs0.ty&&(it.lv||1)===(fs0.lv||1)});
  if(forgeMode){
   h+='<div class="box" style="border-color:var(--c4);box-shadow:4px 4px 0 var(--c4)">';
   h+='<div class="row sp"><b>⚒ Forge</b><button class="s alt" data-a="forgeClose">✕ Close</button></div>';
   h+='<div class="mute" style="margin:4px 0">'+forgeIntro()+'</div>';
   if(forgeSelected.length>0){
    h+='<div class="row" style="margin:6px 0;gap:4px">'+forgeSelected.map((id,i)=>{const it=S.bag.find(x=>x.id===id);return it?'<span style="border:2px solid var(--c4);padding:2px 6px;color:'+RC[it.ri]+'">'+it.nm+'</span>':'<span class="mute">slot '+(i+1)+'</span>'}).join('<span class="mute">+</span>')+'</div>';
   } else {
    h+='<div class="mute" style="margin:6px 0">Tap items below to select them (0/'+fNeed+')</div>';
   }
   h+='<div class="row" style="margin:4px 0">';
   h+='<button class="s" data-a="forge" '+(forgeValid?'':'disabled')+'>Forge '+forgeSelected.length+'/'+fNeed+(fs0&&forgeValid?' → '+nextLabel(fs0):'')+(fs0?' ('+fmtN(fCost)+'g)':'')+'</button>'+(L('autof')?'<button class="s alt" data-a="forgeAuto">Auto-select</button>':'')+(L('massf')?'<button class="s alt" data-a="forgeAll">Forge all</button>':'');
   if(forgeSelected.length>0)h+='<button class="s alt" data-a="forgeClear">Clear</button>';
   h+='</div></div>';
  } else {
   h+='<div class="row" style="margin:4px 0"><button class="s alt" data-a="forgeOpen">⚒ Open Forge</button></div>';
  }
  const bag0=L('sort')?(L('sortType')?S.bag.slice().sort((a,b)=>a.ty.localeCompare(b.ty)||b.ri-a.ri||b.il-a.il):S.bag.slice().sort((a,b)=>b.ri-a.ri||b.il-a.il)):S.bag.slice().reverse(),bv=bpView(bag0),bag=bv.list;
  h+=bpControls(bv)+(bag.length?bag.map(it=>{const o=S.eq[target(it)],d=Math.round(sc(it.st)-(o?sc(o.st):0));const fSel=forgeSelected.includes(it.id);const forgeBtn=forgeMode?'<button class="s'+(fSel?' ':' alt')+'" data-a="fSel" data-v="'+it.id+'">'+(fSel?'✓ '+(forgeSelected.indexOf(it.id)+1):'+ Forge')+'</button>':'';return '<div class="it" style="'+(fSel?'background:color-mix(in srgb,var(--panel) 80%,var(--c4));':'')+'"><div>'+chip(it)+' <small style="display:inline">lv'+it.il+' <span class="'+(d>0?'up':'dn')+'">'+(d>0?'▲':'▼')+Math.abs(d)+'</span></small><small>'+fmt(it.st)+'</small></div><div class="row">'+forgeBtn+'<button class="s'+(forgeMode?' alt':'')+'" data-a="eq" data-v="'+it.id+'">'+(forgeMode?'Eq':'Equip')+'</button><button class="s alt" data-a="sell" data-v="'+it.id+'">'+val(it)+'g</button></div></div>'}).join('')+(bv.more>0?'<button class="s alt" data-bpa="more">Show '+Math.min(60,bv.more)+' more ('+bv.more+' hidden)</button>':''):'<span class="mute">'+(S.bag.length?'No items match these filters.':'Nothing here. Delve to find loot.')+'</span>');
  h+='</div>'}
 else{
  h+='<h2>Training</h2><div class="box">'+TR.filter(t=>!t.m||hasMagic()).map(t=>{const c=Math.round(t.b*Math.pow(1.35,S.tr[t.k]));return '<div class="it"><div><b>'+t.n+' '+S.tr[t.k]+'</b><small>'+t.d+'</small></div><button class="s" data-a="tr" data-v="'+t.k+'" '+(S.gold<c?'disabled':'')+'>'+c+'g</button></div>'}).join('')+'</div>';
  h+='<h2>Magic</h2><div class="box">'+(hasMagic()?'<span>Spellcasting active! Buy Arcana upgrades below to learn Mend and Frost.</span>':'<div class="it"><div><b>Arcane Awakening</b><small>Unlock spellcasting via the <b>Arcane Awakening</b> relic (Ascend tab). Requires first rebirth.</small></div></div>')+'</div>';
  h+='<h2>Pets</h2><div class="box">';
  if(!S.petsOn)h+='<div class="it"><div><b>Pet den</b><small>'+(S.best<12?'Reach stage 12 to unlock':'Companions that fight beside you')+'</small></div><button class="s" data-a="pets" '+(S.best<12||S.gold<1200?'disabled':'')+'>1200g</button></div>';
  else h+=PET.map((P,i)=>{const p=S.pets[i],lc=Math.round(80*Math.pow(1.5,p.lvl)*(i+1));return '<div class="it"><div><b style="color:'+P.c+'">'+P.n+'</b>'+(p.own?' lv'+p.lvl:'')+'<small>'+Math.round(P.d*(1+.3*p.lvl)*100)+'% of your attack every '+P.iv+'s</small></div><div class="row">'+(p.own?'<button class="s'+(S.ap==i?'':' alt')+'" data-a="ap" data-v="'+i+'">'+(S.ap==i?'Active':'Send')+'</button><button class="s" data-a="pl" data-v="'+i+'" '+(S.gold<lc?'disabled':'')+'>'+lc+'g</button>':'<button class="s" data-a="bp" data-v="'+i+'" '+(S.gold<P.cost?'disabled':'')+'>'+P.cost+'g</button>')+'</div></div>'}).join('');
  h+='</div>'}
 $('#cbody').innerHTML=h;drawPortrait()}
function bulkBtns(){let o='',any=false;for(let i=0;i<9+L('bulkX');i++)if(i<9?L('bulk'+(i+1)):L('bulkX')>=i-8){any=true;o+='<button class="s alt" data-a="sellr" data-v="'+i+'">Sell '+(i<9?RN[i].toLowerCase():RN[i])+(i?' and below':'')+'</button>'}return any?o:'<span class="mute">Filter and sort your bag below, any time. More tools (quick equip, bulk selling) unlock in Upgrades, under Camp.</span>'}
function sellBelow(m){S.bag=S.bag.filter(it=>{if(it.ri<=m){S.gold+=val(it);return false}return true})}
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||b.disabled)return;const a=b.dataset.a,v=b.dataset.v;
 if(a=='delve'||a=='delveAgain'){if(a=='delveAgain'&&run){S.bag.push(...run.loot);run.loot=[];const bc=bagCap();while(S.bag.length>bc&&bc!==Infinity){let m=0;S.bag.forEach((x,i)=>{if(val(x)<val(S.bag[m]))m=i});sell(S.bag[m].id)}}startRun();return}
 else if(a=='camp'){S.bag.push(...run.loot);run.loot=[];const bc=bagCap();while(S.bag.length>bc&&bc!==Infinity){let m=0;S.bag.forEach((x,i)=>{if(val(x)<val(S.bag[m]))m=i});sell(S.bag[m].id)}setMode('camp');setRun(null);view()}
 else if(a=='spd'){S.speed=S.speed>=maxSpd()?1:S.speed*2}else if(a=='end'){if(run&&!run.over){run.hp=0;die()}}else if(a=='reset'){if(b.dataset.c){setS(def());setUid(1);setTab('g');save();camp()}else{b.dataset.c=1;b.textContent='Tap again to erase all progress';setTimeout(()=>{delete b.dataset.c;b.textContent='Reset save'},4000)}}
 else if(a=='cast')cast(+v);
 else{if(a=='eq')equip(v);if(a=='sell')sell(v);if(a=='un'){const it=S.eq[v];delete S.eq[v];S.bag.push(it)}
  if(a=='best'&&L('tidy'))autoEquip();if(a=='sellr'&&(+v<9?L('bulk'+(+v+1)):L('bulkX')>=+v-8))sellBelow(+v);if(a=='asc')ascend();
  if(a=='lbClear'){try{localStorage.removeItem('hd-lb')}catch(e){}}
  if(a=='bagUp'){const c=bagUpgradeCost();if(S.gold>=c&&bagCap()!==Infinity){S.gold-=c;S.bagLvl++}}
  if(a=='forgeOpen'){setForgeMode(true);setForgeSelected([])}
  if(a=='forgeClose'){setForgeMode(false);setForgeSelected([])}
  if(a=='fSel'){const id=+v;if(forgeSelected.includes(id)){setForgeSelected(forgeSelected.filter(x=>x!==id))}else{const f=forgeSelected[0]?S.bag.find(x=>x.id===forgeSelected[0]):S.bag.find(x=>x.id===id);if(f&&fOK(f)&&forgeSelected.length<forgeReq(f))forgeSelected.push(id)}}
  if(a=='forgeClear')setForgeSelected([]);
  if(a=='forge'){const items=forgeSelected.map(id=>S.bag.find(x=>x.id===id));if(items.length&&items.every(Boolean)&&forgeDo(items))setForgeSelected([])}
  if(a=='forgeAll'&&L('massf')){forgeAll();setForgeSelected([])}
  if(a=='forgeAuto'&&L('autof')){const f0=forgeSelected[0]?S.bag.find(x=>x.id===forgeSelected[0]):null,gr={};for(const it of S.bag)if(fOK(it))(gr[it.ri+'|'+it.ty+'|'+(it.lv||1)]=gr[it.ri+'|'+it.ty+'|'+(it.lv||1)]||[]).push(it);let pick=null;if(f0){const g0=gr[f0.ri+'|'+f0.ty+'|'+(f0.lv||1)];if(g0&&g0.length>=forgeReq(f0))pick=g0}if(!pick){const ks=Object.keys(gr).filter(k=>gr[k].length>=forgeReq({ri:+k.split('|')[0],lv:+k.split('|')[2]})).sort((x,y)=>(+x.split('|')[0]*3+ +x.split('|')[2])-(+y.split('|')[0]*3+ +y.split('|')[2]));if(ks.length)pick=gr[ks[0]]}if(pick){const need=forgeReq(pick[0]);setForgeSelected(pick.slice().sort((x,y)=>sc(x.st)-sc(y.st)).slice(0,need).map(x=>x.id))}}
  if(a=='vUnlock'&&S.gold>=vaultUnlockCost()){S.gold-=vaultUnlockCost();S.vaultUnlocked=true}
  if(a=='vUp'&&S.gold>=vaultUpgradeCost()){S.gold-=vaultUpgradeCost();S.vaultLvl++}
  if(a=='vIn'){const i=S.bag.findIndex(x=>x.id==+v);if(i>=0&&S.vault.length<vaultCap()){S.vault.push(S.bag[i]);S.bag.splice(i,1)}}
  if(a=='vAll'){for(const sl of SL){const it=S.eq[sl];if(it&&S.vault.length<vaultCap()){S.vault.push(it);delete S.eq[sl]}}}
  if(a=='vOut'){const i=S.vault.findIndex(x=>x.id==+v);if(i>=0){S.bag.push(S.vault[i]);S.vault.splice(i,1)}}if(a=='offOk')S.offMsg=null;if(a=='pa'){const p=S.pets[+v];if(p&&p.own&&p.lvl>=pReq(p.star||0)){p.star=(p.star||0)+1;p.lvl=0}}if(a=='qm')S.qmT=Math.max(0,Math.min(L('sorter'),qmT()+ +v));if(a=='sd')S.sd=Math.max(0,Math.min(RL('rStart'),(S.sd||0)+ +v));if(a=='respec'){let t=0;for(const n of RTREE)for(let i=0;i<RL(n.k);i++)t+=Math.max(1,Math.round(n.b*Math.pow(n.g,i)));S.relics+=t;S.rl={};S.sd=0}if(a=='rb'){const n=RT[v],c=rcost(n);if(RL(v)<n.m&&S.relics>=c){S.relics-=c;S.rl[v]=RL(v)+1;if(v=='rMagic')S.magic=true;}}if(a=='tab'){setTab(v);if(v!=='g'){setForgeMode(false);setForgeSelected([])}}
  if(a=='tr'){const n=NODE[v],c=cost(n);const needsMagic=['arcana','mender','frost'].includes(v);if(can(n)&&L(v)<n.m&&S.gold>=c&&(!needsMagic||hasMagic())){S.gold-=c;S.tr[v]=L(v)+1}}
  
  if(a=='magic'&&!hasMagic()&&S.gold>=300&&S.best>=6){S.gold-=300;S.magic=true}
  if(a=='bp'){farmSettle();S.gold-=PET[v].cost;S.pets[v].own=1;S.ap=+v}if(a=='ap'){farmSettle();S.ap=+v}if(a=='farmCollect'){const fc=farmCollect();if(fc.gold||fc.gems)toast('Collected '+fmtN(fc.gold)+' gold'+(fc.gems?' and '+fc.gems+' gems':'')+' from the farm')}
  if(a=='pl'&&S.gold>=petLc(+v)){S.gold-=petLc(+v);S.pets[v].lvl++}
  if(a=='upAura'){const aur=AURAS.find(x=>x.k===v),lv=S.auras&&S.auras[v];if(aur&&lv){const c=auraUpCost(aur);if((S.gems||0)>=c){S.gems-=c;S.auras[v]=lv+1}}}
  if(a=='buyAura'){const aur=AURAS.find(x=>x.k===v);if(aur&&!auraOwned(v)&&(S.gems||0)>=aur.gems){S.gems-=aur.gems;S.auras=S.auras||{};S.auras[v]=1}}
  save();camp()}});
