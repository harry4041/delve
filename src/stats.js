import {LVN,PET,RC,RN,S,SL} from './state.js';
import {gen,sc} from './items.js';
import {ASC_BUFFS,ASC_DEBUFFS,SETS} from './sets.js';
import {activeAuras,auraApply} from './auras.js';
import {TREE} from './skilltree.js';
import {RTREE} from './ascension.js';
import {baseOf} from './assets.js';
import {powerMult} from './meta.js';
/* ===== POWER LEVEL ===== */
export function powerLevel(){
 const st=stats();
 // gear contribution — weighted stat score of equipped items
 let gearScore=0;
 for(const sl of SL){const it=S.eq[sl];if(it)gearScore+=sc(it.st)*(1+it.ri*.3)*(1+it.il*.05)}
 // upgrade contribution — sum of all training levels
 let upgScore=0;for(const n of TREE)upgScore+=L(n.k)*5;
 // relic tree contribution
 for(const n of RTREE)upgScore+=RL(n.k)*8;
 // set bonus contribution
 const syn=activeSynergies();const setScore=syn.length*120;
 // ascension
 const ascScore=(S.asc||0)*200;
 // pet contribution
 let petScore=0;for(let i=0;i<PET.length;i++){const p=S.pets[i];if(p.own)petScore+=(p.lvl||0)*15*(i+1)*10+(p.star||0)*80}
 // aura contribution
 const auraScore=activeAuras().reduce((n,a)=>n+(S.auras[a.k]||1),0)*150;
 // gems held (minor contribution)
 const gemScore=(S.gems||0)*10;
 const raw=gearScore+upgScore*2+setScore+ascScore+petScore+auraScore+gemScore;
 return Math.max(1,Math.round(raw/10))
}
export function plLabel(pl){if(pl<50)return'Novice';if(pl<150)return'Adventurer';if(pl<400)return'Warrior';if(pl<900)return'Champion';if(pl<2000)return'Veteran';if(pl<4000)return'Hero';if(pl<8000)return'Legend';if(pl<15000)return'Mythic';return'Transcendent'}
export function plColor(pl){if(pl<50)return RC[0];if(pl<150)return RC[1];if(pl<400)return RC[2];if(pl<900)return RC[3];if(pl<2000)return RC[4];if(pl<4000)return RC[5];if(pl<8000)return RC[6];if(pl<15000)return RC[7];return RC[8]}
/* gem costs for auras */
function auraCost(a){return (a.gems)}
function setSynergyBonuses(s){const names={};for(const sl of SL){const it=S.eq[sl];if(it){const base=it.nm.replace(/^\w+ /,'').replace(/ of .+/,'');names[base]=(names[base]||0)+1}}for(const[,bases,tiers]of SETS){const count=bases.reduce((n,b)=>(names[b]||0)+n,0);for(const[thresh,,fn]of tiers)if(count>=thresh)fn(s)}}
export function activeSynergies(){const names={};for(const sl of SL){const it=S.eq[sl];if(it){const base=it.nm.replace(/^\w+ /,'').replace(/ of .+/,'');names[base]=(names[base]||0)+1}}const out=[];for(const[nm,bases,tiers]of SETS){const count=bases.reduce((n,b)=>(names[b]||0)+n,0);for(const[thresh,desc]of tiers)if(count>=thresh)out.push(nm+' ('+thresh+'pc): '+desc)}return out}
export function stats(){
 // Base stats from gear first so % upgrades multiply on top
 const gearAtk=Object.values(S.eq).reduce((t,it)=>t+(it?.st?.atk||0),0)||0;
 const gearDef=Object.values(S.eq).reduce((t,it)=>t+(it?.st?.def||0),0)||0;
 const gearHp=Object.values(S.eq).reduce((t,it)=>t+(it?.st?.hp||0),0)||0;
 const baseAtk=3+gearAtk, baseDef=gearDef||1, baseHp=30+gearHp;
 // % multipliers from upgrades (each level = +12% atk, +15% hp, +10% def, +8% spd, +8% crit, +4% regen)
 const mightMult=Math.pow(1.12,L('might'))*Math.pow(1.06,L('mMight')),vigorMult=Math.pow(1.15,L('vigor'))*Math.pow(1.06,L('mVigor')),gritMult=Math.pow(1.10,L('grit'))*Math.pow(1.06,L('mGrit'));
 const s={atk:baseAtk*mightMult,def:baseDef*gritMult,hp:baseHp*vigorMult,crit:5+70*(1-Math.pow(.9943,L('fury')+.6*L('mFury'))),spd:3*(1-Math.pow(.9833,L('haste')+.6*L('mHaste'))),ls:0,dodge:0,gf:0,thorn:0,mpr:0,poison:0,_spellBonus:1,_luckBonus:0};
 for(const sl of SL){const it=S.eq[sl];if(it)for(const k in it.st)if(!['atk','def','hp'].includes(k))s[k]+=it.st[k]}
 s.ls+=1.0*L('vamp');s.dodge+=1.5*L('evasion');setSynergyBonuses(s);
 if(S.ascBuff){const b=ASC_BUFFS.find(x=>x.k===S.ascBuff);if(b)b.fn(s)}
 if(S.ascDebuff){const d=ASC_DEBUFFS.find(x=>x.k===S.ascDebuff);if(d)d.fn(s)}
 const pm=(1+.1*RL('rPow'))*Math.pow(1.15,RL('rMight'));const dOver=Math.max(0,s.dodge-50);s.dodge=Math.min(50,s.dodge);const ab=ascB();s.atk*=pm*ab.atk;s.hp*=pm*ab.hp;s.def*=ab.def*(1+dOver/100);{const mm=powerMult();s.atk*=mm;s.hp*=mm}/* trophies and the Spire (meta.js); exactly 1 with an empty S.meta */const cOver=Math.max(0,s.crit-75);s.crit=Math.min(75,s.crit);s.critDmg=2+cOver/100+.15*L('deadlyAim')+.05*L('mAim');const sOver=Math.max(0,s.spd-3.5);s.spd=Math.min(3.5,s.spd);s.atk*=1+sOver*.5;auraApply(s);return s}
export function L(k){return (S.tr[k]||0)}
export function RL(k){return ((S.rl&&S.rl[k])||0)}
export function fmtN(n){n=Math.floor(n);if(!isFinite(n))return'huge';if(n<1e5)return String(n);if(n>=1e36)return n.toExponential(2).replace('e+','e');const u=['','K','M','B','T','Qa','Qi','Sx','Sp','Oc','No','Dc'];let i=0,v=n;while(v>=1000&&i<u.length-1){v/=1000;i++}return v.toFixed(v<10?2:v<100?1:0)+u[i]}
export function mpMax(){return (60+L('arcana')*10+L('spMana')*15)}
export function petStars(){return ((S.pets||[]).reduce((n,p)=>n+(p.star||0),0))}
export function ascB(){const a=S.asc||0,ps=petStars();return{atk:Math.pow(1.03,a)*(a>=7?1.2:1)*(a>=15?1.25:1)*(1+.015*ps),hp:Math.pow(1.025,a)*(a>=4?1.2:1),def:Math.pow(1.025,a),gold:Math.pow(1.035,a)*(a>=3?1.25:1)*(a>=15?1.5:1)*(1+.015*ps)}}
export const ASC_MS=[[1,'+1 loot roll per enemy'],[2,'+15% relics gained'],[3,'+25% gold'],[4,'+20% health'],[5,'+3 free Vault slots'],[7,'+20% damage'],[10,'+2 loot rolls per enemy and +30% relics'],[15,'+50% gold and +25% damage']];
export function msRolls(){return (((S.asc||0)>=1?1:0)+((S.asc||0)>=10?2:0))}
export function forgeReq(it){return (Math.min(31,3+2*it.ri))}
export function forgeCost(it){return (Math.round(100*Math.pow(4,it.ri)*(1+it.il/25)*Math.pow(.96,L('effForge'))))}
export function rarLabel(it){return ((it.un?'★ Relic · ':'')+RN[it.ri]+' '+LVN[(it.lv||1)-1])}
export function nextLabel(it){const lv=it.lv||1;return lv<3?RN[it.ri]+' '+LVN[lv]:RN[Math.min(RN.length-1,it.ri+1)]+' I'}
export function pReq(st){return (10+5*st)}
export function fOK(it){return (it.ri<=L('forgeT')&&it.ri<RN.length-1&&!it.un)}
export function forgeIntro(){return ('Forge can currently work on '+RN[Math.min(L('forgeT'),RN.length-2)]+' items and below (making '+RN[Math.min(L('forgeT')+1,RN.length-1)]+'). Buy Forge mastery in Upgrades, under Camp, to forge higher tiers. Every tier has 3 levels (I, II, III): forging raises an item one level, and level III becomes level I of the next tier. Every level step needs as many items and as much gold as a whole tier step always did (3 items for Common, 2 more per tier).')}
export function forgeDo(items){const f0=items[0];if(!f0||!fOK(f0)||items.length!==forgeReq(f0))return false;if(!items.every(it=>it&&it.ri===f0.ri&&it.ty===f0.ty&&(it.lv||1)===(f0.lv||1)))return false;const cost=forgeCost(f0);if(S.gold<cost)return false;S.gold-=cost;const avgIl=Math.round(items.reduce((t,x)=>t+x.il,0)/items.length),cnt={};for(const it of items){const b=baseOf(it);if(b)cnt[b]=(cnt[b]||0)+1}const bn=Object.keys(cnt).sort((x,y)=>cnt[y]-cnt[x])[0];for(const it of items){const i=S.bag.indexOf(it);if(i>=0)S.bag.splice(i,1)}{const lv=f0.lv||1;S.bag.push(lv<3?gen(avgIl,f0.ri,f0.ty,bn,lv+1):gen(avgIl,f0.ri+1,f0.ty,bn,1))}if(Math.random()<.03*L('luckyForge'))S.bag.push(items[0]);return true}
export function forgeAll(){let n=0;for(let guard=0;guard<400;guard++){const gr={};for(const it of S.bag)if(fOK(it))(gr[it.ri+'|'+it.ty+'|'+(it.lv||1)]=gr[it.ri+'|'+it.ty+'|'+(it.lv||1)]||[]).push(it);let did=false;const ks=Object.keys(gr).sort((x,y)=>(+x.split('|')[0]*3+ +x.split('|')[2])-(+y.split('|')[0]*3+ +y.split('|')[2]));for(const k of ks){const need=forgeReq({ri:+k.split('|')[0],lv:+k.split('|')[2]});if(gr[k].length>=need){const pick=gr[k].slice().sort((x,y)=>sc(x.st)-sc(y.st)).slice(0,need);if(forgeDo(pick)){did=true;n++;break}}}if(!did)break}return n}
function idleStage(){return (Math.max(S.best||1,Math.floor((S.bestOverall||0)*.6),1))}
export function idleKg(){return (1.5*Math.pow(1.12,idleStage()*.7)*Math.pow(1.12,L('greed'))*Math.pow(1.06,L('mGreed'))*ascB().gold)}
export function idleEff(){return (Math.min(.6,.1+.025*RL('rIdleE')))}
export function idleCap(){return (Math.min(48,2+RL('rIdleT')))}
export function idleRate(){return (360*idleKg()*idleEff())}
export function offlineCalc(){if(!RL('rIdle')||!S.lastT)return;const hrs=Math.min((Date.now()-S.lastT)/36e5,idleCap());if(hrs<.05)return;const amt=Math.floor(hrs*idleRate());if(amt<1)return;S.gold+=amt;S.lastT=Date.now();S.offLast={hrs:hrs,amt:amt};S.offMsg='Welcome back! Your camp earned '+fmtN(amt)+' gold over '+hrs.toFixed(1)+' hours away.'}
