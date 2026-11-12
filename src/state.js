import {offlineCalc} from './stats.js';
export function $(s){return (document.querySelector(s))}
export function pick(a){return (a[Math.random()*a.length|0])}
export const SL=['head','chest','gloves','legs','boots','amu1','amu2','amu3','lhand','rhand'];
export const SLN={head:'Helmet',chest:'Chest',gloves:'Gloves',legs:'Trousers',boots:'Boots',amu1:'Amulet',amu2:'Amulet',amu3:'Amulet',lhand:'Left hand',rhand:'Right hand'};
export const SLOTOF={head:['head'],chest:['chest'],gloves:['gloves'],legs:['legs'],boots:['boots'],amulet:['amu1','amu2','amu3'],weapon:['lhand','rhand'],shield:['lhand','rhand']};
export const RC=['#8a8499','#4cc46a','#4aa0ff','#c06bff','#ff9a2e','#ff4f8b','#4ff0ff','#fff3b0','#a6ff3a'],RN=['Common','Uncommon','Rare','Epic','Legendary','Mythic','Celestial','Divine','Primordial'];
export const RM=[1,1.5,2.2,3.2,4.8,7,10,15,22],RW=[60,25,10,4,1.2,.25,.06,.015,.004];
function ROM(n){const v=[[1000,'M'],[900,'CM'],[500,'D'],[400,'CD'],[100,'C'],[90,'XC'],[50,'L'],[40,'XL'],[10,'X'],[9,'IX'],[5,'V'],[4,'IV'],[1,'I']];let o='';for(const[a,b]of v)while(n>=a){o+=b;n-=a}return o}
function hsl2hex(h,sa,l){sa/=100;l/=100;const a=sa*Math.min(l,1-l),f=n=>{const k=(n+h/30)%12,c=l-a*Math.max(-1,Math.min(k-3,9-k,1));return Math.round(255*c).toString(16).padStart(2,'0')};return'#'+f(0)+f(8)+f(4)}
const TXN=['Ascendant','Transcendent','Immortal','Infinite','Cosmic','Stellar','Eclipsed','Sovereign','Omniscient','Absolute','Boundless','Eternal','Paramount','Apex','Zenith','Genesis','Omega'];
export const LVN=['I','II','III'],LVM=[1,1.15,1.3];
export function rollLv(m=3){const w=[.851,.128,.021].slice(0,m),t=w.reduce((a,c)=>a+c);let r=Math.random()*t;for(let i=0;i<w.length;i++){r-=w[i];if(r<=0)return i+1}return 1}
(function(){for(let i=9;i<400;i++){RN.push(i-9<TXN.length?TXN[i-9]:'Beyond '+(i-9-TXN.length+1));RC.push(hsl2hex((i*47)%360,95,64));RM.push(RM[i-1]*1.45);RW.push(Math.max(1e-300,RW[i-1]*.3))}})();
export const PRE=[['Worn','Frayed','Rusty'],['Sturdy','Hardy','Keen'],['Gleaming','Fine','Honed'],['Runed','Warded','Vicious'],['Mythic','Ancient','Dawnforged'],['Eternal','Primal','Godforged'],['Celestial','Astral','Radiant'],['Divine','Sacred','Hallowed'],['Primordial','Cosmic','Worldforged']];
export const BASE={head:['Cap','Helm','Hood','Crown'],chest:['Tunic','Mail','Plate','Robe'],gloves:['Mitts','Gauntlets','Wraps'],legs:['Breeches','Greaves','Trousers'],boots:['Boots','Sandals','Treads'],amulet:['Charm','Amulet','Talisman','Locket'],weapon:['Sword','Axe','Dagger','Mace','Spear'],shield:['Buckler','Shield','Aegis']};
export const TT={head:{def:1,hp:1.5},chest:{def:1.5,hp:3},gloves:{atk:.6,def:.6},legs:{def:1,hp:2},boots:{def:.6,spd:1.5},amulet:{atk:.6,hp:1.5,crit:1.2},weapon:{atk:2,crit:.5},shield:{def:1.6,hp:2}};
export const W={atk:.7,def:.7,hp:3,crit:.12,spd:.0035,ls:.05,dodge:.06,gf:.2,thorn:.4,mpr:.02,poison:.08};
export const SPEC={Dagger:'spd',Axe:'atk',Spear:'crit',Mace:'thorn',Robe:'mpr',Crown:'gf',Hood:'dodge',Aegis:'thorn',Locket:'ls',Talisman:'mpr',Treads:'dodge',Sandals:'spd',Wraps:'crit',Gauntlets:'thorn',Charm:'gf',Amulet:'ls',Plate:'def'};
export const SUFS={'of the Fox':'dodge','of the Bear':'hp','of Embers':'atk','of the Deep':'mpr','of Storms':'spd','of the Wyrm':'def','of Ruin':'crit','of Thieves':'gf','of Leeches':'ls','of Briars':'thorn','of Venom':'poison'};
export const SP=[{n:'Fireball',c:20,cd:4},{n:'Mend',c:30,cd:8},{n:'Frost',c:25,cd:10},{n:'Meteor',c:60,cd:20}];
export const PET=[
{k:'pip',n:'Pip the slime',d:.26,iv:1.2,cost:1500,t:1,c:'#5fe08a',ab:'Gooey Guard',tag:'Sustain',farm:{n:'Forager',g:1.0,gem:0},desc:'Heals you on every hit (much more with Vigor) and slows enemies a little.'},
{k:'fang',n:'Fang the wolf',d:.26,iv:.85,cost:9000,t:2,c:'#b9b3c9',ab:'Pack Hunter',tag:'Crit',farm:{n:'Hunter',g:1.3,gem:0},desc:'Hits crit with your crit chance and damage, and hit bosses harder. Grows with Fury and crit gear.'},
{k:'ember',n:'Ember the drake',d:.50,iv:1.7,cost:40000,t:3,c:'#ff7a3a',ab:'Dragonfire',tag:'Fire',farm:{n:'Smelter',g:1.8,gem:0},desc:'Slow heavy hits that stack a burn. Burn grows with your Arcana and Fire upgrades.'},
{k:'moss',n:'Moss the golem',d:.24,iv:1.4,cost:25000,t:3,c:'#8aa05a',ab:'Stoneheart',tag:'Defence',farm:{n:'Miner',g:0.9,gem:0.06},desc:'Takes a share of every hit aimed at you and reflects it. Grows with Grit and thorns gear.'},
{k:'coin',n:'Coin the magpie',d:.22,iv:1.3,cost:6000,t:2,c:'#ffd34d',ab:'Gold Rush',tag:'Economy',farm:{n:'Treasure hunter',g:2.2,gem:0},desc:'Bonus gold on every kill (far more with Greed), extra loot rolls and better loot.'},
{k:'spark',n:'Spark the sprite',d:.24,iv:1,cost:20000,t:3,c:'#7fd6ff',ab:'Arc Flow',tag:'Magic',farm:{n:'Prospector',g:0.8,gem:0.08},desc:'Faster mana and spell recharge, and stronger spells (damage, healing, stun). Grows with Arcana.'}];
export const TR=[{k:'might',n:'Might',d:'+12% attack (multiplicative)',b:25},{k:'vigor',n:'Vigor',d:'+15% health (multiplicative)',b:25},{k:'grit',n:'Grit',d:'+10% defense (multiplicative)',b:30},{k:'arcana',n:'Arcana',d:'+20% spell power, +10 mana',b:60,m:1}];
export const NM=['Zombie','Skeleton','Bandit','Orc','Cultist'],TP=['Mossy','Cave','Ashen','Frost','Ember','Void'];

export let S,run=null,mode='camp',tab='g',uid=1,forgeSelected=[],forgeMode=false;
export function setS(v){return (S=v)}
export function setRun(v){return (run=v)}
export function setMode(v){return (mode=v)}
export function setTab(v){return (tab=v)}
export function setUid(v){return (uid=v)}
export function nextUid(){return (uid++)}
export function setForgeMode(v){return (forgeMode=v)}
export function setForgeSelected(v){return (forgeSelected=v)}

export function def(){return{gold:0,gems:0,best:0,bestOverall:0,tr:{},eq:{rhand:{id:0,ty:'weapon',ri:0,il:1,nm:'Rusty Sword',st:{atk:2}}},bag:[],magic:false,petsOn:false,pets:PET.map(()=>({own:0,lvl:0})),giftsClaimed:[],autoDelve:false,farm:{t:Date.now(),gold:0,gems:0},ap:-1,speed:1,uid:1,rl:{},relics:0,asc:0,life:0,sd:0,vault:[],vaultLvl:0,vaultUnlocked:false,ascBuff:null,ascDebuff:null,bagLvl:0,auras:{}}}
// Repairs a save whose fields have the wrong type (hand-edited, damaged or from a bad cloud doc) so the game never crashes on load.
// Healthy saves pass through untouched. Items must have a known type and a stats object.
function sanitize(){
  const num=(o,k)=>{if(typeof o[k]!=='number'||!Number.isFinite(o[k])||o[k]<0)o[k]=0};
  const obj=(o,k)=>{if(!o[k]||typeof o[k]!=='object'||Array.isArray(o[k]))o[k]={}};
  const arr=(o,k)=>{if(!Array.isArray(o[k]))o[k]=[]};
  for(const k of ['gold','gems','relics','asc','life','best','bestOverall','sd','bagLvl','vaultLvl'])num(S,k);
  for(const k of ['tr','rl','auras','eq'])obj(S,k);
  for(const k of ['bag','vault','giftsClaimed'])arr(S,k);
  for(const m of [S.tr,S.rl,S.auras])for(const k of Object.keys(m))if(typeof m[k]!=='number'||!Number.isFinite(m[k])||m[k]<0)delete m[k];
  const okItem=(it)=>it&&typeof it==='object'&&typeof it.ty==='string'&&Object.prototype.hasOwnProperty.call(SLOTOF,it.ty)&&it.st&&typeof it.st==='object'&&!Array.isArray(it.st)&&Number.isFinite(it.ri)&&it.ri>=0&&it.ri<RN.length&&Number.isFinite(it.il)&&typeof it.nm==='string';
  S.bag=S.bag.filter(okItem);S.vault=S.vault.filter(okItem);
  for(const k of Object.keys(S.eq))if(!okItem(S.eq[k]))delete S.eq[k];
  S.pets=S.pets.map((p)=>(p&&typeof p==='object'?p:{own:0,lvl:0}));
  S.pets.forEach((p)=>{num(p,'own');num(p,'lvl');if(p.star!==undefined)num(p,'star')});
  if(!S.farm||typeof S.farm!=='object'||Array.isArray(S.farm))S.farm={t:Date.now(),gold:0,gems:0};
  num(S.farm,'t');num(S.farm,'gold');num(S.farm,'gems');
}
export function load(){try{S=JSON.parse(localStorage.getItem('hollow-delve-2'))}catch(e){}if(!S||!S.eq)S=def();S.tr=S.tr||{};S.pets=Array.isArray(S.pets)?S.pets:[];while(S.pets.length<PET.length)S.pets.push({own:0,lvl:0});S.eq=S.eq||{};S.bag=S.bag||[];S.rl=S.rl||{};S.relics=S.relics||0;if(S.rl.rKeep){let t=0;for(let i=0;i<S.rl.rKeep;i++)t+=Math.max(1,Math.round(6*Math.pow(1.5,i)));S.relics+=t;delete S.rl.rKeep}if(S.tr&&S.tr.offl){let g0=0;for(let i=0;i<S.tr.offl;i++)g0+=Math.round(8000*Math.pow(1.5,i));S.gold=(S.gold||0)+g0;delete S.tr.offl}S.asc=S.asc||0;S.life=S.life||S.best||0;S.sd=S.sd||0;uid=S.uid||1;S.vault=S.vault||[];S.vaultLvl=S.vaultLvl||0;S.vaultUnlocked=S.vaultUnlocked||false;S.bestOverall=S.bestOverall||S.best||0;S.ascBuff=S.ascBuff||null;S.ascDebuff=S.ascDebuff||null;S.bagLvl=S.bagLvl||0;S.gems=S.gems||0;S.auras=S.auras||{};S.giftsClaimed=S.giftsClaimed||[];S.autoDelve=!!S.autoDelve;S.farm=S.farm||{t:Date.now(),gold:0,gems:0};sanitize();offlineCalc()}
let saveHook=null;export function setSaveHook(f){saveHook=f}
export function save(){S.uid=uid;S.lastT=Date.now();try{localStorage.setItem('hollow-delve-2',JSON.stringify(S))}catch(e){}if(saveHook)try{saveHook()}catch(e){}}
