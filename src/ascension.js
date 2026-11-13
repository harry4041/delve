import {LOOT} from './lootcfg.js';
import {PET,RN,S,save} from './state.js';
import {ASC_BUFFS,ASC_DEBUFFS,rollAscModifiers} from './sets.js';
import {L,RL,fmtN} from './stats.js';
import {sc} from './items.js';
import {asBonusHtml} from './tabs-aura-idle.js';
export const RTREE=[{k:'rMagic',n:'Arcane Awakening',d:'Unlocks spellcasting (Fireball, Mend, Frost). Buy Arcana upgrades in the Arcane tree to strengthen.',m:1,b:5,g:1},{k:'rPow',n:'Ancient blood',d:'+10% attack and health',m:999,b:1,g:1.35},{k:'rGold',n:'Hoarder',d:'+15% gold and sale value',m:999,b:1,g:1.4},{k:'rLoot',n:'Treasure sense',d:'+1 loot roll per enemy',m:999,b:3,g:1.8},{k:'rStart',n:'Head start',d:'Runs begin 3 stages deeper',m:999,b:4,g:1.9},{k:'rLog',n:'Camp memory',d:'Keep bag tool unlocks when you ascend',m:1,b:6,g:1},{k:'rTime',n:'Time memory',d:'Keep speed unlocks when you ascend',m:1,b:8,g:1},{k:'rEcho',n:'Relic echo',d:'+10% relics gained per level',m:999,b:12,g:1.4},{k:'rMight',n:'Eternal might',d:'Attack and health x1.15 per level',m:999,b:15,g:1.35},{k:'rBoss',n:'Bounty hunter',d:'Bosses drop +1 top-tier piece per level',m:999,b:20,g:1.8},{k:'rMyth',n:'Mythic sense',d:'Mythic gear drops 10 stages earlier per level',m:5,b:30,g:2},
{k:'rIdle',n:'Idle camp',d:'Your camp earns gold while you are away (2 hours counted, 10% efficiency). Has its own tab.',m:1,b:10,g:1},
{k:'rIdleT',n:'Longer rests',d:'Idle camp: +1 hour of away time counted per level (up to 48 hours)',m:46,b:5,g:1.2},
{k:'rIdleE',n:'Better camp',d:'Idle camp: +2.5% earning efficiency per level (up to 60%)',m:20,b:6,g:1.35},
{k:'rHeir',n:'Heirlooms',d:'Keep your best equipped item in this many slots when you ascend (1 per level)',m:10,b:8,g:1.55},
{k:'rCape',n:'Heroic mantle',d:'Unlocks capes: your hero wears a cape, and you can pick its colour in the Look tab',m:1,b:5,g:1}];
export const RT=Object.fromEntries(RTREE.map(n=>[n.k,n]));
export function rcost(n){return (Math.max(1,Math.round(n.b*Math.pow(n.g,RL(n.k)))))}
export function relicGain(){return (Math.floor(Math.pow(S.life,1.4)/4*(1+.15*S.asc)*(1+.1*RL('rEcho'))*(S.asc>=2?1.15:1)*(S.asc>=10?1.3:1)*(1+.04*L('relicChannel'))))}
export function ascend(){if(S.life<reqStage()||S.gold<ascFee())return;const g=relicGain(),kept={};
 if(RL('rLog'))for(const k of['sort','tidy','bulk1','bulk2','bulk3','bulk4','bulk5','bulk6','bulk7','bulk8','bulk9','bulkX','forgeT','autof','massf'])if(L(k))kept[k]=L(k);
 if(RL('rTime'))for(const k of['sim1','sim2'])if(L(k))kept[k]=L(k);
 const savedVault=S.vault||[];const savedVaultLvl=S.vaultLvl||0;const savedVaultUnlocked=S.vaultUnlocked||false;
 const relicEq=Object.entries(S.eq).filter(([k,v])=>v&&v.un),relicBag=S.bag.filter(x=>x.un); // Mythic Relics survive ascending
 S.relics+=g;S.asc++;S.gold=0;S.tr=kept;S.bag=[];S.pets=S.pets.map(p=>({own:p.own,lvl:0,star:p.star||0}));S.life=0;
 S.vault=savedVault;S.vaultLvl=savedVaultLvl;S.vaultUnlocked=savedVaultUnlocked;S.best=0;if(S.asc>0){const m=rollAscModifiers();S.ascBuff=m.buff;S.ascDebuff=m.debuff}else{S.ascBuff=null;S.ascDebuff=null}
 // Heirlooms: the best-scoring equipped items (one per slot, as many as the relic has levels) survive the ascension
 const heirs=Object.entries(S.eq).filter(([k,v])=>v&&v.id!==0).sort((a,b)=>sc(b[1].st)*(1+b[1].ri*.3)-sc(a[1].st)*(1+a[1].ri*.3)).slice(0,RL('rHeir'));
 S.eq={rhand:{id:0,ty:'weapon',ri:0,il:1,nm:'Rusty Sword',st:{atk:2}}};for(const [k,v] of heirs)S.eq[k]=v;for(const [k,v] of relicEq)S.eq[k]=v;S.bag=relicBag;save()}
export function ascTab(){const ok=S.life>=reqStage()&&S.gold>=ascFee();
 const curBuff=S.ascBuff?ASC_BUFFS.find(x=>x.k===S.ascBuff):null;
 const curDebuff=S.ascDebuff?ASC_DEBUFFS.find(x=>x.k===S.ascDebuff):null;
 const modHtml=S.asc>0&&(curBuff||curDebuff)?
  '<div style="margin:6px 0"><span style="color:var(--c1)">⬆ '+curBuff?.n+': '+curBuff?.d+'</span><br><span style="color:#d94a4a">⬇ '+curDebuff?.n+': '+curDebuff?.d+'</span></div>':
  (S.asc===0?'<div class="mute" style="margin:6px 0">First ascension unlocks random buffs and debuffs each life.</div>':'');
 let h='<div class="box"><div class="row sp"><b>Relics: '+S.relics+'</b><span class="mute">Ascension '+S.asc+'</span></div>'+modHtml+asBonusHtml()+'<div style="margin:6px 0">Ascending resets gold, upgrades, pets, bag and gear (unless kept by relics). You earn relics from the deepest stage cleared this life ('+S.life+'). Relics never reset. Ascending needs stage '+reqStage()+' and '+fmtN(ascFee())+' gold. Each ascension makes enemies tougher at higher stages (now +'+Math.round((Math.pow(hpG()/1.2,10)-1)*100)+'% health by stage 10), but the first stages stay beatable.</div><button data-a="asc" '+(ok?'':'disabled')+'>'+(ok?'Ascend for '+relicGain()+' relics ('+fmtN(ascFee())+'g)':S.life<reqStage()?'Clear stage '+reqStage()+' to ascend':'Need '+fmtN(ascFee())+' gold to ascend')+'</button></div><h2>Relic upgrades</h2><div class="box">';
 return h+RTREE.map(n=>{const l=RL(n.k),mx=l>=n.m,c=rcost(n);return '<div class="it"><div><b>'+n.n+(n.m>=999?' '+l:n.m>1?' '+l+'/'+n.m:(mx?' ✓':''))+'</b><small>'+n.d+'</small></div>'+(mx?'<span class="mute">Max</span>':'<button class="s" data-a="rb" data-v="'+n.k+'" '+(S.relics<c?'disabled':'')+'>'+c+' relics</button>')+'</div>'}).join('')+'</div><div style="margin:10px 0"><button class="s alt" data-a="respec">Refund relic upgrades</button></div>'}
export function hpG(){return (Math.min(1.25+LOOT.dg,1.22+LOOT.dg+.003*S.asc))}
export function atG(){return (Math.min(1.24+LOOT.dg,1.22+LOOT.dg+.002*S.asc))}
export function reqStage(){return (15+4*S.asc)}
export function ascFee(){return (Math.round(300*Math.pow(1.8,S.asc)))}
export function STB(n){return (Math.round(1+LOOT.stb[0]*n+LOOT.stb[1]*n*(n-1)))}
function STG(n){return (Math.max(1,STB(n)-Math.round(10*RL('rMyth')*Math.min(1,Math.max(0,(n-14)/6)))))}
export function maxStep(s){let n=0;const mx=RN.length*3-1;while(n<mx&&s>=STG(n+1))n++;return n}
// The stage at which tier r (0 Common ... 8 Primordial) can first drop, including the Mythic sense relic.
export function tierStage(r){for(let s=1;s<20000;s++)if(maxStep(s)>=3*r)return s;return Infinity}
export function maxTier(s){return (Math.floor(maxStep(s)/3))}
function lvMax(t,s){return (Math.min(3,Math.max(1,maxStep(s)-t*3+1)))}
function TTH(t){return (STG(t*3))}
const maxR=maxTier;
export function startStage(){return (1+3*Math.min(S.sd||0,RL('rStart')))}
export function hasMagic(){return (RL('rMagic')>0)}
export function hasSp(i){return (i==0?hasMagic():i==1?(hasMagic()&&L('mender')>0):i==2?(hasMagic()&&L('frost')>0):(hasMagic()&&L('spMeteor')>0))}
export function maxSpd(){return (L('sim2')?4:L('sim1')?2:1)}
export function petLc(i){return (Math.round(200*Math.pow(1.8,S.pets[i].lvl)*PET[i].t*(1+2*(S.pets[i].star||0))*Math.pow(.97,L('ptMaster'))))}
function pets(){return (PET.map((P,i)=>{const p=S.pets[i],lc=petLc(i);return '<div class="it"><div><b style="color:'+P.c+'">'+P.n+'</b>'+(p.own?' lv'+p.lvl:'')+'<small>'+Math.round(P.d*(1+.3*p.lvl+.25*L('bond'))*100)+'% of your attack every '+P.iv+'s</small></div><div class="row">'+(p.own?'<button class="s'+(S.ap==i?'':' alt')+'" data-a="ap" data-v="'+i+'">'+(S.ap==i?'Active':'Send')+'</button><button class="s" data-a="pl" data-v="'+i+'" '+(S.gold<lc?'disabled':'')+'>'+lc+'g</button>':'<button class="s" data-a="bp" data-v="'+i+'" '+(S.gold<P.cost?'disabled':'')+'>'+P.cost+'g</button>')+'</div></div>'}).join(''))}
