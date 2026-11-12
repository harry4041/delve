// Set synergies: [setName, baseNames[], pieceThresholds[[count,bonusDesc,bonusFn]]]
export const SETS=[
 ['Iron Warrior',['Helm','Mail','Gauntlets','Greaves','Boots'],[[3,'+20% defense',(s)=>{s.def*=1.2}],[5,'+35% HP + thorns',(s)=>{s.hp*=1.35;s.thorn+=s.def*.1}]]],
 ['Shadow Stalker',['Hood','Tunic','Wraps','Trousers','Treads'],[[3,'+15% dodge + speed',(s)=>{s.dodge+=15;s.spd+=.1}],[5,'+40% crit + lifesteal',(s)=>{s.crit+=20;s.ls+=8}]]],
 ['Arcane Scholar',['Crown','Robe','Wraps','Breeches','Sandals'],[[2,'+25% spell power (arcana)',(s)=>{s._spellBonus=(s._spellBonus||1)*1.25}],[4,'+50% mana regen',(s)=>{s.mpr+=s.mpr*.5+.5}]]],
 ['Lucky Wanderer',['Cap','Tunic','Mitts','Breeches','Boots'],[[3,'+20% gold find + drop chance',(s)=>{s.gf+=20;s._luckBonus=(s._luckBonus||0)+.1}],[5,'+30% all stats',(s)=>{s.atk*=1.3;s.def*=1.3;s.hp*=1.3}]]]
];
export const ASC_BUFFS=[
 {k:'bloodlust',n:'Bloodlust',d:'+30% attack',fn:(s)=>{s.atk*=1.3}},
 {k:'ironhide',n:'Iron Hide',d:'+40% health',fn:(s)=>{s.hp*=1.4}},
 {k:'swiftness',n:'Swiftness',d:'+25% attack speed',fn:(s)=>{s.spd+=.25}},
 {k:'sharpened',n:'Sharpened',d:'+20% crit chance',fn:(s)=>{s.crit+=20}},
 {k:'fortune',n:'Fortune\'s Smile',d:'+25% gold find',fn:(s)=>{s.gf+=25}},
 {k:'thorn_wall',n:'Thorn Wall',d:'+30% defense',fn:(s)=>{s.def*=1.3}},
 {k:'lifesteal',n:'Vampiric',d:'+10% lifesteal',fn:(s)=>{s.ls+=10}},
 {k:'evasion',n:'Ghost Step',d:'+15% dodge',fn:(s)=>{s.dodge+=15}},
];
export const ASC_DEBUFFS=[
 {k:'brittle',n:'Brittle',d:'-20% max health',fn:(s)=>{s.hp*=0.8}},
 {k:'sluggish',n:'Sluggish',d:'-15% attack speed',fn:(s)=>{s.spd=Math.max(0,s.spd-.15)}},
 {k:'poverty',n:'Poverty',d:'-20% gold rewards',fn:()=>{}}, // applied in kill()
 {k:'exposed',n:'Exposed',d:'-15% defense',fn:(s)=>{s.def*=0.85}},
 {k:'clumsy',n:'Clumsy',d:'-10% crit chance',fn:(s)=>{s.crit=Math.max(0,s.crit-10)}},
 {k:'frail',n:'Frail',d:'-15% attack',fn:(s)=>{s.atk*=0.85}},
 {k:'cursed',n:'Cursed',d:'+20% enemy speed',fn:()=>{}}, // applied in spawn()
 {k:'leaden',n:'Leaden Feet',d:'-10% dodge',fn:(s)=>{s.dodge=Math.max(0,s.dodge-10)}},
];
export function rollAscModifiers(){const b=ASC_BUFFS[Math.floor(Math.random()*ASC_BUFFS.length)];let d;do{d=ASC_DEBUFFS[Math.floor(Math.random()*ASC_DEBUFFS.length)]}while(d.k===b.k);return{buff:b.k,debuff:d.k}}

