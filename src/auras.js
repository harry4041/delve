import {S} from './state.js';
/* ===== AURAS ===== */
export const AURAS=[
 {k:'aura_flame',n:'Flame Aura',d:'Enemies take 5% of your attack as fire damage on hit',gems:1,c:'#ff6a1a',apply:(st,lv)=>{st._auraFlame=1+.4*(lv-1)}},
 {k:'aura_frost',n:'Frost Aura',d:'10% chance to slow enemy attack speed by 30% for 2 seconds',gems:2,c:'#4ff0ff',apply:(st,lv)=>{st._auraFrost=1+.4*(lv-1)}},
 {k:'aura_void',n:'Void Aura',d:'+8% lifesteal',gems:3,c:'#c06bff',apply:(st,lv)=>{st.ls+=8*(1+.4*(lv-1))}},
 {k:'aura_iron',n:'Iron Aura',d:'+15% defense',gems:2,c:'#8a8499',apply:(st,lv)=>{st.def*=1+.15*(1+.4*(lv-1))}},
 {k:'aura_gold',n:'Golden Aura',d:'+20% gold from all sources',gems:2,c:'#ffd34d',apply:(st,lv)=>{st.gf+=20*(1+.4*(lv-1))}},
 {k:'aura_storm',n:'Storm Aura',d:'+10% crit chance and crits deal 20% more damage',gems:4,c:'#4aa0ff',apply:(st,lv)=>{const m=1+.4*(lv-1);st.crit+=10*m;st._auraCritBonus=1+.2*m}},
 {k:'aura_venom',n:'Venom Aura',d:'Attacks poison enemies for 2% of your attack per second per stack (stacks 5x)',gems:3,c:'#5fe08a',apply:(st,lv)=>{st._auraVenom=1+.4*(lv-1)}},
 {k:'aura_light',n:'Light Aura',d:'+10% dodge',gems:3,c:'#fff3b0',apply:(st,lv)=>{st.dodge+=10*(1+.4*(lv-1))}},
];
export function auraUpCost(a){return (Math.ceil(a.gems*(1+.6*((S.auras&&S.auras[a.k])||1))))}
export function auraOwned(k){return (!!(S.auras&&S.auras[k]))}
export function auraApply(st){for(const a of AURAS)if(auraOwned(a.k)&&a.apply)a.apply(st,S.auras[a.k]||1)}
export function activeAuras(){return AURAS.filter(a=>auraOwned(a.k))}

