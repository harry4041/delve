import {S} from './state.js';
import {AURAS,activeAuras,auraUpCost} from './auras.js';
import {ASC_MS,RL,ascB,fmtN,idleCap,idleEff,idleRate} from './stats.js';
import {RT,rcost} from './ascension.js';
export function auraTab(){
 const owned=activeAuras();
 let h='<div class="box"><div class="px" style="font-size:9px;margin-bottom:6px">Auras</div>';
 h+='<div class="mute" style="margin-bottom:8px">Auras are permanent passive effects purchased with 💎 Gems. Gems are extremely rare — only bosses drop them, and even then rarely. You have <b style="color:var(--gem)">'+(S.gems||0)+' 💎</b>.</div>';
 if(owned.length){h+='<div style="margin:6px 0;color:var(--c1)">Active auras: '+owned.map(a=>'<span style="color:'+a.c+'">'+a.n+'</span>').join(', ')+'</div>'}
 h+='</div><div class="box">';
 for(const a of AURAS){const lv=(S.auras&&S.auras[a.k])||0,have=lv>0,cost=have?auraUpCost(a):a.gems,canBuy=(S.gems||0)>=cost;h+='<div class="it"><div><b style="color:'+a.c+'">'+(have?'✓ ':'')+a.n+(have?' · level '+lv:'')+'</b><small>'+a.d+'</small><small style="color:var(--gem)">'+(have?'Next level: ':'Cost: ')+cost+(cost===1?' gem':' gems')+(have?' (+40% effect)':'')+'</small></div><button class="s" data-a="'+(have?'upAura':'buyAura')+'" data-v="'+a.k+'" '+(canBuy?'':'disabled')+'>'+(have?'Level up ':'')+cost+' 💎</button></div>'}
 if(0)for(const a of []){const have=0,canBuy=0;h+='<div class="it"><div><b style="color:'+a.c+'">'+(have?'✓ ':'')+a.n+'</b><small>'+a.d+'</small><small style="color:var(--gem)">Cost: '+a.gems+(a.gems===1?' gem':' gems')+'</small></div>'+(have?'<span style="color:var(--c1)">Owned</span>':'<button class="s" data-a="buyAura" data-v="'+a.k+'" '+(canBuy?'':'disabled')+'>'+a.gems+' 💎</button>')+'</div>'}
 h+='</div>';return h}
export function idleTab(){let h='<div class="box"><div class="px" style="font-size:9px;margin-bottom:6px">Idle camp</div>';
 if(!RL('rIdle'))return h+'<div class="mute">Your camp earns nothing while you are away. Buy <b>Idle camp</b> (10 relics) to unlock offline earnings.</div><div style="margin-top:8px"><button class="s" data-a="rb" data-v="rIdle" '+(S.relics<rcost(RT.rIdle)?'disabled':'')+'>Buy Idle camp ('+rcost(RT.rIdle)+' relics)</button></div><div class="mute" style="margin-top:6px">You have '+S.relics+' relics. You earn relics by ascending.</div></div>';
 const cap=idleCap(),eff=idleEff(),rate=idleRate(),row=(a,b)=>'<div class="row sp"><span class="mute">'+a+'</span><b>'+b+'</b></div>';
 h+=row('Away time counted','up to '+cap+' h')+row('Efficiency',Math.round(eff*100)+'%')+row('Earning rate',fmtN(rate)+' gold/h')+row('A full rest ('+cap+' h)',fmtN(rate*cap)+' gold');
 h+='<div class="mute" style="margin-top:8px">Earnings scale with how deep you have been and your gold upgrades. Time is counted from when you last played.</div>';
 if(S.offLast)h+='<div class="mute" style="margin-top:6px">Last time away: '+S.offLast.hrs.toFixed(1)+' h, earned '+fmtN(S.offLast.amt)+' gold.</div>';
 h+='</div><div class="row sp"><h2 style="margin:12px 0 6px">Idle upgrades</h2><span class="mute">'+S.relics+' relics</span></div><div class="box">';
 for(const k of['rIdleT','rIdleE']){const n=RT[k],l=RL(k),mx=l>=n.m;h+='<div class="it"><div><b>'+n.n+' '+l+'/'+n.m+'</b><small>'+n.d+'</small></div>'+(mx?'<span class="mute">Max</span>':'<button class="s" data-a="rb" data-v="'+k+'" '+(S.relics<rcost(n)?'disabled':'')+'>'+rcost(n)+' relics</button>')+'</div>'}
 return h+'</div>'}
export function asBonusHtml(){const a=ascB(),p=v=>((v-1)*100).toFixed(1)+'%',n=S.asc||0;return '<div style="margin:6px 0;color:var(--c1)">Permanent ascension bonuses: +'+p(a.atk)+' damage, +'+p(a.hp)+' health, +'+p(a.def)+' defense, +'+p(a.gold)+' gold. Every ascension adds about +3% damage, +2.5% health and defense, and +3.5% gold.</div><div style="margin:6px 0"><b>Milestones</b>'+ASC_MS.map(m=>'<div class="'+(n>=m[0]?'':'mute')+'">'+(n>=m[0]?'✓ ':'· ')+'Ascension '+m[0]+': '+m[1]+'</div>').join('')+'</div>'}
