const TREE=[
{k:'might',n:'Might',d:'+12% attack per level (multiplicative)',m:999,b:40,g:1.7,r:{}},
{k:'vigor',n:'Vigor',d:'+15% max health per level (multiplicative)',m:999,b:40,g:1.7,r:{}},
{k:'grit',n:'Grit',d:'+10% defense per level (multiplicative)',m:999,b:80,g:1.75,r:{vigor:2}},
{k:'regen',n:'Recovery',d:'About +3% max health restored per kill per level, no cap',m:999,b:100,g:1.8,r:{vigor:1}},
{k:'haste',n:'Haste',d:'+5% attack speed per level, slowly diminishing, no cap',m:999,b:150,g:1.9,r:{}},
{k:'fury',n:'Fury',d:'More crit chance per level, slowly diminishing, no cap',m:999,b:250,g:1.9,r:{haste:2}},
{k:'sim1',n:'Fast forward',d:'Unlocks x2 battle speed',m:1,b:500,g:1,r:{haste:2}},
{k:'sim2',n:'Time rush',d:'Unlocks x4 battle speed',m:1,b:4000,g:1,r:{sim1:1,haste:4}},
{k:'greed',n:'Greed',d:'+12% gold/sale per level (multiplicative)',m:999,b:120,g:1.85,r:{}},
{k:'eyes',n:'Keen eyes',d:'Higher loot drop chance per level, no cap',m:999,b:220,g:1.85,r:{greed:1}},
{k:'luck',n:'Fortune',d:'Rare loot drops more often',m:999,b:600,g:2,r:{eyes:2,greed:3}},
{k:'plunder',n:'Plunder',d:'+1 loot roll per enemy',m:999,b:350,g:1.9,r:{eyes:1}},
{k:'sorter',n:'Quartermaster',d:'Auto-sells drops up to a rarity tier. Each level covers one more tier. New tiers keep appearing, so it never ends.',m:999,b:300,g:3,r:{greed:2}},
{k:'sort',n:'Bag sorting',d:'Sorts the bag by rarity and level',m:1,b:3000,g:1,r:{}},
{k:'sortType',n:'Type sorting',d:'Also groups bag by item type',m:1,b:1200,g:1,r:{sort:1}},
{k:'tidy',n:'Quick equip',d:'Unlocks the Equip upgrades button',m:1,b:5000,g:1,r:{sort:1}},
{k:'bulk1',n:'Bulk sell I',d:'Unlocks Sell common',m:1,b:350,g:1,r:{tidy:1}},
{k:'bulk2',n:'Bulk sell II',d:'Unlocks Sell uncommon and below',m:1,b:1500,g:1,r:{bulk1:1}},
{k:'bulk3',n:'Bulk sell III',d:'Unlocks Sell rare and below',m:1,b:6000,g:1,r:{bulk2:1}},
{k:'bulk4',n:'Bulk sell IV',d:'Unlocks Sell epic and below',m:1,b:25000,g:1,r:{bulk3:1}},
{k:'bulk5',n:'Bulk sell V',d:'Unlocks Sell legendary and below',m:1,b:100000,g:1,r:{bulk4:1}},
{k:'bulk6',n:'Bulk sell VI',d:'Unlocks Sell mythic and below',m:1,b:400000,g:1,r:{bulk5:1}},
{k:'bulk7',n:'Bulk sell VII',d:'Unlocks Sell celestial and below',m:1,b:1600000,g:1,r:{bulk6:1}},
{k:'bulk8',n:'Bulk sell VIII',d:'Unlocks Sell divine and below',m:1,b:6400000,g:1,r:{bulk7:1}},
{k:'bulk9',n:'Bulk sell IX',d:'Unlocks Sell primordial and below',m:1,b:25600000,g:1,r:{bulk8:1}},
{k:'arcana',n:'Arcana',d:'+10 mana, stronger spells (requires Arcane Awakening relic)',m:999,b:200,g:1.85,r:{}},
{k:'mender',n:'Mend',d:'Unlocks the healing spell',m:1,b:1200,g:1,r:{arcana:2}},
{k:'frost',n:'Frost',d:'Unlocks the stun spell',m:1,b:2200,g:1,r:{arcana:4}},
{k:'den',n:'Pet den',d:'Unlocks companions',m:1,b:2000,g:1,r:{vigor:4,greed:2}},
{k:'spMana',n:'Deep reservoir',d:'+15 max mana per level',m:999,b:300,g:1.7,r:{arcana:1}},
{k:'spRegen',n:'Flow',d:'+0.4 mana per second per level',m:999,b:400,g:1.8,r:{arcana:2,spMana:1}},
{k:'spCdr',n:'Quickcasting',d:'Spell cooldowns 3% shorter per level (multiplicative)',m:999,b:600,g:1.9,r:{arcana:3,spRegen:1}},
{k:'spCrit',n:'Spell crit',d:'Spells can crit using your crit chance (double damage)',m:1,b:5000,g:1,r:{arcana:3,spCdr:1}},
{k:'spEcho',n:'Echo',d:'Chance for a spell to cast twice for free, rising with each level (slowly diminishing, up to 60%)',m:999,b:2500,g:1.8,r:{arcana:5,spCdr:2}},
{k:'spFirePow',n:'Searing fire',d:'Fireball and Meteor deal +25% damage per level',m:999,b:400,g:1.8,r:{arcana:1}},
{k:'spBurn',n:'Ignite',d:'Fireball also burns for +15% of its damage per level over 4 seconds',m:999,b:1500,g:1.8,r:{spFirePow:2}},
{k:'spMeteor',n:'Meteor',d:'Unlocks the Meteor spell: 60 mana, 20s cooldown, huge damage',m:1,b:25000,g:1,r:{spFirePow:5,arcana:5}},
{k:'spHeal',n:'Greater mend',d:'Mend heals +8% more per level',m:999,b:400,g:1.8,r:{mender:1}},
{k:'spFrostDur',n:'Deep freeze',d:'Frost stuns for 0.5 seconds longer per level',m:999,b:500,g:1.8,r:{frost:1}},
{k:'spShatter',n:'Shatter',d:'Frozen enemies take +10% damage per level from every hit',m:999,b:1200,g:1.85,r:{frost:1,spFrostDur:2}},
{k:'ptClaws',n:'Sharper claws',d:'+20% pet damage per level (multiplicative)',m:999,b:600,g:1.8,r:{den:1}},
{k:'ptHaste',n:'Quick paws',d:'Pets attack faster: +4% attack speed per level, slowly diminishing',m:999,b:800,g:1.85,r:{ptClaws:1}},
{k:'ptMaster',n:'Beastmaster',d:'Pet level-ups cost 3% less per level',m:999,b:1500,g:1.7,r:{den:1}},
{k:'ptFire',n:'Fire pact',d:'Pet hits add +20% extra fire damage per level',m:999,b:1500,g:1.8,r:{ptClaws:2}},
{k:'ptFrost',n:'Frost pact',d:'Pet hits have a chance to chill the enemy for 1 second, rising with each level (slowly diminishing, up to 60%)',m:999,b:2000,g:1.8,r:{ptClaws:2}},
{k:'ptVenom',n:'Venom pact',d:'Pet hits poison the enemy: +10% of the hit every half second for 4 seconds, per level',m:999,b:2500,g:1.85,r:{ptClaws:3}},
{k:'ptStorm',n:'Storm pact',d:'A chance for a pet hit to strike twice with lightning, rising with each level (slowly diminishing, up to 70%)',m:999,b:3000,g:1.9,r:{ptClaws:3}},
{k:'bulkX',n:'Bulk sell X and beyond',d:'Each level adds a Sell button for one more tier beyond Primordial. It never ends.',m:999,b:100000000,g:4,r:{bulk9:1}},
{k:'forgeT',n:'Forge mastery',d:'The forge can work on one rarity tier higher per level. You start able to forge Common only. Costs a lot.',m:999,b:25000,g:5,r:{}},
{k:'autof',n:'Auto-forge',d:'Unlocks Auto-select in the forge',m:1,b:15000,g:1,r:{forgeT:1}},
{k:'massf',n:'Mass forge',d:'Unlocks Forge all: forges every group your forge tier allows, weakest items first',m:1,b:150000,g:1,r:{autof:1,forgeT:3}},
{k:'bond',n:'Beast bond',d:'+25% pet damage',m:999,b:500,g:1.9,r:{den:1}},
{k:'mMight',n:'Mastery: Might',d:'+6% attack per level, no cap',m:999,b:25000,g:1.3,r:{might:10,vigor:10}},
{k:'mVigor',n:'Mastery: Vigor',d:'+6% health per level, no cap',m:999,b:25000,g:1.3,r:{vigor:10,might:10}},
{k:'mGreed',n:'Mastery: Greed',d:'+6% gold and sale value per level, no cap',m:999,b:30000,g:1.32,r:{greed:8}},
{k:'mLoot',n:'Mastery: Fortune',d:'+4% chance to bump a drop up one rarity',m:999,b:60000,g:1.5,r:{luck:8}},
{k:'mPlunder',n:'Mastery: Plunder',d:'+1 loot roll per enemy',m:999,b:50000,g:1.45,r:{plunder:8}}];
const NODE=Object.fromEntries(TREE.map(n=>[n.k,n]));
/* Skill-tree webs: hub in the centre, one arm per compass direction. Each node's parent in the drawing is its deepest prerequisite inside the same arm. */
const GRAPHS={
u:{id:'u',hub:null,hubName:'Delver',arms:[
 {n:'Warrior',d:'N',c:'--c4',ks:['might','vigor','grit','regen','mMight','mVigor']},
 {n:'Tempo',d:'E',c:'--btn',ks:['haste','fury','sim1','sim2']},
 {n:'Fortune',d:'S',c:'--c3',ks:['greed','eyes','luck','plunder','sorter','mGreed','mLoot','mPlunder']},
 {n:'Camp',d:'W',c:'--c1',ks:['sort','sortType','tidy','bulk1','bulk2','bulk3','bulk4','bulk5','bulk6','bulk7','bulk8','bulk9','bulkX','forgeT','autof','massf']}]},
m:{id:'m',hub:'arcana',arms:[
 {n:'Fire',d:'N',c:'--c4',ks:['spFirePow','spBurn','spMeteor']},
 {n:'Mind',d:'E',c:'--c2',ks:['spMana','spRegen','spCdr','spCrit','spEcho']},
 {n:'Frost',d:'S',c:'--gem',ks:['frost','spFrostDur','spShatter']},
 {n:'Restoration',d:'W',c:'--c1',ks:['mender','spHeal']}]},
p:{id:'p',hub:'den',arms:[
 {n:'Claws',d:'N',c:'--c3',ks:['ptClaws','ptHaste','ptFire','ptFrost','ptVenom','ptStorm']},
 {n:'Bond',d:'E',c:'--btn',ks:['bond']},
 {n:'Beastmaster',d:'S',c:'--c2',ks:['ptMaster']}]}};
const NODEC={ptFire:'--c4',ptFrost:'--gem',ptVenom:'--c1',ptStorm:'--btn'};
const MAGIC_K=['arcana','mender','frost','spMana','spRegen','spCdr','spCrit','spEcho','spFirePow','spBurn','spMeteor','spHeal','spFrostDur','spShatter'];
const can=n=>Object.entries(n.r).every(([k,v])=>L(k)>=v);
const cost=n=>Math.round(n.b*Math.pow(n.g,L(n.k)));
const dep=n=>Object.keys(n.r).length?1+Math.max(...Object.keys(n.r).map(k=>dep(NODE[k]))):0;
const qmT=()=>Math.min(L('sorter'),S.qmT==null?L('sorter'):S.qmT);
const vaultCap=()=>S.vaultUnlocked?5+S.vaultLvl*5+(S.asc>=5?3:0):0;
const vaultUnlockCost=()=>50000;
const vaultUpgradeCost=()=>Math.round(25000*Math.pow(3,S.vaultLvl));
// Bag: starts at 10, +10 per upgrade, unlimited at level 15+
const BAG_CAPS=[10,15,20,25,30,40,50,60,75,90,110,135,165,200,250,Infinity];
const bagCap=()=>BAG_CAPS[Math.min(S.bagLvl,BAG_CAPS.length-1)];
const BAG_COSTS=[20,40,70,110,160,250,400,650,1000,1600,2600,4200,7000,12000,20000];
const bagUpgradeCost=()=>S.bagLvl>=BAG_COSTS.length?Infinity:BAG_COSTS[S.bagLvl];
