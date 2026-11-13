// Wiki tab (a player-facing guide built from the game's own data tables, so the numbers cannot drift out of date)
// and Updates tab (the changelog below, newest first, with a "new" dot until the player has looked at it).
import { S, RN, RC, RM, RW, LVN, LVM, BASE, TT, SPEC, SUFS, SLN, SLOTOF, PET, SP } from './state.js';
import { AURAS } from './auras.js';
import { ASC_MS } from './stats.js';
import { RTREE, STB, reqStage, ascFee } from './ascension.js';

// ---------------------------------------------------------------- changelog (add new entries at the TOP; `id` must be unique)
export const CHANGELOG = [
  { id: '2026-11-13d', date: '2026-11-13', title: 'Grown-up enemies', items: [
    'Shields are bigger and better drawn: the Buckler is a large studded round shield, the Shield has a bevelled rim, chevron and boss, and the Aegis has a large gem and gilded wings.',
    'Zombies, bandits, orcs and the Death Knight boss now have the same adult-proportioned heads as your hero, with faces redrawn to match (skeletons and cultists keep their skull and hood).',
  ] },
  { id: '2026-11-13c', date: '2026-11-13', title: 'Upgrades as a list (and the web)', items: [
    'The Upgrades, Magic and Pets tabs now open as a plain list of EVERY upgrade, like before: what it does, your level, what you get now, what it needs and its price. Affordable ones are highlighted and ones you cannot get yet are dimmed with what they need.',
    'Filter by Can buy or Owned, sort cheapest first, or tap Hide locked for a shorter list.',
    'Prefer the old skill web? Tap Web at the top of the tab. The game remembers your choice.',
  ] },
  { id: '2026-11-13b', date: '2026-11-13', title: 'A more grown-up hero', items: [
    'The default hero has a weathered, muted look to match the enemies: a laced leather jerkin over linen sleeves, bracers, a belt pouch, dark patched trousers, boots, a short dark crop and stubble.',
    'New muted colour options for skin, hair, outfit and scarf, a steel eye colour, and Scar and Rugged cheek options. Anything you already chose in the Look tab stays as it was; press Reset to try the new default.',
  ] },
  { id: '2026-11-13a', date: '2026-11-13', title: 'Fix: saving for newly verified accounts', items: [
    'Fixed a problem where an account that had just verified its email could show "The server refused the request" and never sync. The game now refreshes your sign-in automatically before saving to the cloud. If you saw this, reload the page (or sign out and back in) once.',
  ] },
  { id: '2026-11-12l', date: '2026-11-12', title: 'Sign in to play', items: [
    'You now sign in (or create an account) when the game opens. Your progress is tied to your account, so you can carry on from any device.',
    'If you played before accounts were required, the first account you sign in with keeps your existing progress.',
    'Two accounts on one device no longer share a save: signing in as someone else starts clean (or loads that account’s own cloud save).',
  ] },
  { id: '2026-11-12k', date: '2026-11-12', title: 'Loot matters again, new Look options', items: [
    'Rarer gear now drops during a normal run: Uncommon from about stage 16, Rare from about stage 35 and Epic from about stage 58. Most drops are close to your highest unlocked tier instead of mostly the lowest.',
    'New relic Heirlooms: keep your best equipped items (one per level) when you ascend, so a great find carries into your next climb.',
    'New relic Heroic mantle: capes are now unlocked with this relic instead of being free; once unlocked you can pick the colour in the Look tab.',
    'Enemies grow a little tougher per stage to match the stronger gear, so the pace of progress is about the same.',
    'Your hero now has adult proportions with a calmer face, a stubble option, and redrawn shields that look like real shields.',
  ] },
  { id: '2026-11-12j', date: '2026-11-12', title: 'New gear looks and face customisation', items: [
    'All worn gear has been redrawn from scratch to fit the new character models: helmets, hoods, crowns, plate, mail, robes, tunics, greaves, boots, sandals, gauntlets, shields, pendants and every weapon. The bag and menus keep the existing icons.',
    'Rarity shows in the trim and gems of your gear (and a little in its colour), while steel still looks like steel and cloth like cloth.',
    'The Look tab now lets you pick eye shape, brows, mouth and cheeks (blush, freckles) for a whole range of expressions.',
  ] },
  { id: '2026-11-12i', date: '2026-11-12', title: 'Characters redrawn to match the gear', items: [
    'The hero and every enemy are now drawn in much finer pixels, with softer outlines, shading and detailed faces, so they match the quality of the gear icons instead of looking blocky next to them.',
    'The skeleton has a real bone body, the cultist a proper robe and hood, and the orc, bandit and zombie each have more detail.',
    'Pauldrons on orcs and bosses only show when they are not already wearing chest armour.',
  ] },
  { id: '2026-11-12h', date: '2026-11-12', title: 'Gear sits better on characters', items: [
    'Armour no longer makes the arms vanish: sleeves now stay on, coloured like your chest piece, so gloves and hands connect to the body.',
    'The scarf tucks away under helmets and hoods instead of cutting across the visor.',
    'Shields are smaller and sit on the arm instead of hanging off the side.',
  ] },
  { id: '2026-11-12g', date: '2026-11-12', title: 'Usernames and a tidier tab bar', items: [
    'Choose a unique username on the Account tab (once your email is verified). It is the name shown on the leaderboards, and it lets support find your account.',
    'Joining the leaderboards is now one tap: you join under your username.',
    'The tab bar is shorter: Gear, Upgrades, Magic, Pets and Ascend stay in view, and everything else (Vault, Look, Auras, Idle, Leaderboards, Wiki, Updates, Account) is under More.',
  ] },
  { id: '2026-11-12f', date: '2026-11-12', title: 'Leaderboard fix after Reset save', items: [
    'Joining the leaderboards after a Reset save no longer fails: your old entry stays at its best-ever scores until your new game overtakes them.',
    'When the leaderboard refuses an update, the message now says why (verify your email, wait 5 minutes, or the score limits).',
  ] },
  { id: '2026-11-12e', date: '2026-11-12', title: 'Cleaner skill trees', items: [
    'Upgrades, Magic and Pets webs: connector lines no longer overlap each other or run through other nodes or their names.',
    'Node names on the up and down arms now sit beside the node, and siblings share one trunk line, so the trees read more like proper family trees.',
  ] },
  { id: '2026-11-12d', date: '2026-11-12', title: 'Character customisation', items: [
    'New Look tab: choose your skin tone, hair style and colour, outfit colour, scarf, cape and eye colour, with a live preview. Or press Randomise.',
    'The cape is now your choice. Auto keeps the old behaviour (crimson, turning to the colour of your best gear from Epic up), or pick a colour, or no cape at all. It also shows in the Gear-tab portrait now, so what you see there matches the battle.',
    'Looks are cosmetic only and are saved with your game (and synced to the cloud).',
  ] },
  { id: '2026-11-12c', date: '2026-11-12', title: 'New hero and enemy art', items: [
    'The hero is shaded and detailed: hair highlights, blinking eyes, a tunic emblem, a belt buckle and a red scarf that flutters.',
    'Every enemy type now looks different: rotting zombies, ribbed skeletons, masked bandits, tusked orcs with spiked pauldrons, hooded cultists and the crowned death-knight boss.',
  ] },
  { id: '2026-11-12b', date: '2026-11-12', title: 'Auto-delve, Wiki and Updates', items: [
    'Auto-delve: a toggle on the battle screen and the defeat screen starts the next run 1.5 seconds after you fall, banking your loot. It never runs from camp.',
    'Pet farm pays 30 times more gold per hour (about 15-20% of active income early on, still capped at 8 hours).',
    'New Wiki tab: items and their tiers, slots, stats, upgrades, magic, pets, auras, ascension and more, generated from the live game data.',
    'New Updates tab (this page).',
    'Damaged or hand-edited saves are now repaired on load instead of showing a blank page.',
  ] },
  { id: '2026-11-12a', date: '2026-11-12', title: 'Leaderboards, backpack and pet farm', items: [
    'The Scores tab is now Leaderboards: deepest stage, power level, ascensions and pet stars, plus your own run history. Sign in, verify your email and pick a public name to join.',
    'Backpack filter and sort: filter by rarity and type, sort by price, rarity, item level or biggest upgrade.',
    'Pet farm: pets you own but are not using work on the farm and earn gold (and some gems) while you play or are away, up to 8 hours.',
    'Seven fixes: Reset save crash, spell cooldowns scaling with battle speed, ascension buffs, Venom aura damage, Arcane Scholar and Lucky Wanderer set bonuses, the forge counter and ascension enemy scaling.',
  ] },
  { id: '2026-11-12-art', date: '2026-11-12', title: 'Battle art and cleaner skill trees', items: [
    'New battle backdrops for all six zones, with scenery, ambient particles and lighting.',
    'Slash arcs coloured by weapon rarity, hit sparks, crit starbursts and spell effects.',
    'Skill trees only show a node once you meet its prerequisites, and every connector is a straight right angle.',
  ] },
  { id: '2026-11-11b', date: '2026-11-11', title: 'Pets and upgrades overhaul', items: [
    'Six pets with unique abilities (only one can be active at a time): Pip, Fang, Ember, Moss, Coin and Spark.',
    'Sixteen new upgrade mechanics and six endless Masteries.',
    'Pixel-art sprites for every pet and a richer skill-tree look.',
  ] },
  { id: '2026-11-11a', date: '2026-11-11', title: 'Accounts and cloud saves', items: [
    'Sign in with email to keep your progress across devices (Account tab). Your save is stored in the cloud and kept in sync.',
    'Gifts: from time to time we can send gold, gems or items to everyone or to one player. Use the Account tab to check for them.',
    'The game now runs from a proper hosted site.',
  ] },
];
export const LATEST_UPDATE = CHANGELOG[0].id;
export function hasNewUpdate() { return S.seenUp !== LATEST_UPDATE; }

// ---------------------------------------------------------------- helpers
const SECTIONS = [
  ['start', 'Getting started'], ['items', 'Items & tiers'], ['gear', 'Slots & types'], ['stats', 'Stats'],
  ['power', 'Upgrades & magic'], ['pets', 'Pets'], ['auras', 'Auras & gems'], ['asc', 'Ascension'], ['idle', 'Idle & auto'], ['online', 'Online'],
];
const ui = { sec: 'start' };
const STAT = {
  atk: ['Attack', 'Damage you deal with each hit.'], def: ['Defense', 'Reduces the damage enemies deal to you.'], hp: ['Health', 'How much damage you can take before you fall.'],
  crit: ['Crit chance', 'Chance for a hit to land as a critical hit for extra damage.'], spd: ['Attack speed', 'How often you attack.'],
  ls: ['Lifesteal', 'Heals you for a share of the damage you deal.'], dodge: ['Dodge', 'Chance to avoid an enemy attack completely.'],
  gf: ['Gold find', 'More gold from kills and sales.'], thorn: ['Thorns', 'Damages enemies that hit you.'], mpr: ['Mana regen', 'Mana restored over time for spells.'],
  poison: ['Poison', 'Your hits poison the enemy for damage over time.'],
};
const sn = (k) => (STAT[k] ? STAT[k][0] : k);
const h = (t) => '<div class="px" style="font-size:9px;margin:10px 0 6px">' + t + '</div>';
const p = (t) => '<p style="margin:0 0 8px">' + t + '</p>';
const li = (a) => '<ul style="margin:0 0 8px;padding-left:20px">' + a.map((x) => '<li>' + x + '</li>').join('') + '</ul>';
const tbl = (head, rows, right = []) => '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;margin-bottom:8px"><tr style="text-align:left;border-bottom:2px solid var(--ink)">'
  + head.map((c, i) => '<th style="padding:2px 10px 2px 0;vertical-align:bottom' + (right.includes(i) ? ';text-align:right' : '') + '">' + c + '</th>').join('') + '</tr>'
  + rows.map((r) => '<tr style="border-bottom:1px dotted var(--mute)">' + r.map((c, i) => '<td style="padding:3px 10px 3px 0;vertical-align:top' + (right.includes(i) ? ';text-align:right' : '') + '">' + c + '</td>').join('') + '</tr>').join('') + '</table></div>';
const pc = (n) => (n >= 1 ? fx(n, 1) : (+n.toPrecision(2)).toString()) + '%';
const fx = (n, d = 2) => String(+(+n).toFixed(d));

// ---------------------------------------------------------------- sections
function start() {
  return h('What is Delve?')
    + p('Delve is an idle dungeon crawler. You descend through the dungeon one stage at a time, fighting an enemy on each stage. Enemies grow tougher every stage and every 10th stage is a boss. When you fall, the run ends: you keep your gold and loot, spend them, and go again, a little stronger each time.')
    + h('The loop')
    + li([
      '<b>Delve</b>: fight downwards until you fall. Gold and loot drop as you go.',
      '<b>Camp</b>: equip better gear (Gear tab), sell the rest, and spend gold on upgrades (Upgrades tab).',
      '<b>Ascend</b>: once you are deep enough, restart with a permanent bonus (relics) and go deeper next time. See the Ascension section.',
    ])
    + h('Good first steps')
    + li([
      'Spend gold on upgrades after every run. Cheap nodes are often the best value; spreading gold across many nodes beats pouring it all into one.',
      'Equip anything that is clearly better than what you wear. Sell the rest for gold.',
      'Your first ascension unlocks at stage 15. Ascending early and often is usually faster than pushing one long run.',
      'Turn on <b>Auto-delve</b> (on the battle screen) so the next run starts by itself after a defeat.',
      'Make the hero yours in the <b>Look</b> tab: skin, hair, outfit, scarf, cape and eyes. It is purely cosmetic.',
    ])
    + h('Enemies')
    + p('Enemy types cycle as you descend (Zombie, Skeleton, Bandit, Orc, Cultist) and change theme every 5 stages across six zones. A boss with six times the health and over twice the attack waits on every 10th stage and drops extra loot, and sometimes a gem.');
}

function items() {
  const SHOW = 12; // the game has hundreds of tiers; the table lists the first dozen
  const rows = RN.slice(0, SHOW).map((n, r) => {
    const st = [0, 1, 2].map((l) => STB(3 * r + l));
    return ['<b style="color:' + RC[r] + '">' + n + '</b>', 'x' + fx(RM[r], 1), st.join(' / ')];
  });
  const ex = (2 + 40 * 1.6) * RM[2] * LVM[1];
  return h('Rarity tiers')
    + p('Every item has a rarity (tier) and a level within it: ' + LVN.join(', ') + '. Each tier has three steps, and higher steps are worth far more and can only drop once you are deep enough. The nine classic tiers run from ' + RN[0] + ' to ' + RN[8] + ', and the ladder keeps going beyond them: ' + RN.slice(9, 12).join(', ') + ' and on through ' + RN.slice(9, 9 + 17).length + ' named tiers to the endless "Beyond" tiers (' + RN.length + ' tiers in total).')
    + tbl(['Tier', 'Stat power', 'Drops from stage (I / II / III)'], rows, [1])
    + p('Every tier above ' + RN[8] + ' has ' + fx(RM[9] / RM[8], 2) + 'x the stat power of the one below it and is about ' + fx(RW[8] / RW[9], 1) + 'x rarer.')
    + p('Within a tier, level ' + LVN[1] + ' has ' + fx(LVM[1], 2) + 'x and level ' + LVN[2] + ' has ' + fx(LVM[2], 2) + 'x the stats of level ' + LVN[0] + '. Most drops are close to the highest tier you have unlocked, and bosses drop one tier higher. The Mythic sense relic lowers the stages needed.')
    + h('How item strength works')
    + p('An item\'s level equals the stage it dropped on. Its base power is (2 + 1.6 x level) x tier power x sub-level power. For example, a level-40 ' + RN[2] + ' ' + LVN[1] + ' has a base power of ' + fx(ex, 0) + ', which is split into the stats listed for its slot.')
    + h('Keeping your best gear')
    + p('Ascending resets your gear, but the <b>Heirlooms</b> relic keeps your best-scoring equipped items (one per relic level) so a great find is not lost. The <b>Vault</b> keeps anything you store in it.')
    + h('Selling, forging and the vault')
    + li([
      '<b>Sell</b> items for gold. Value grows with item level and tier (Greed upgrades and Gold find raise it). The Quartermaster upgrade adds an Auto-sell setting that sells low tiers as they drop.',
      '<b>Forge</b>: combine duplicate items into a stronger one. Upgrades such as Efficient forge and Lucky forge improve this.',
      '<b>Vault</b>: stores items safely and, unlike your bag and gear, survives ascension.',
      '<b>Bag size</b> is limited; upgrade it. When the bag is full the cheapest items are sold to make room.',
    ]);
}

function gear() {
  const rows = Object.keys(BASE).map((ty) => {
    const slots = [...new Set(SLOTOF[ty].map((s) => SLN[s]))].join(', ');
    const main = Object.keys(TT[ty]).map(sn).join(', ');
    const names = BASE[ty].map((b) => b + (SPEC[b] ? ' <span class="mute">(' + sn(SPEC[b]) + ')</span>' : '')).join(', ');
    return ['<b>' + ty[0].toUpperCase() + ty.slice(1) + '</b>', slots, main, names];
  });
  return h('Gear slots and types')
    + p('You have ten slots: ' + Object.values({ ...SLN }).filter((v, i, a) => a.indexOf(v) === i).join(', ') + ' (three amulet slots, and either a weapon or a shield in each hand).')
    + tbl(['Type', 'Slot', 'Main stats', 'Kinds (bonus stat)'], rows)
    + p('Each kind of item has its own flavour. For example a Dagger leans towards attack speed and a Crown towards gold find, shown in brackets above.')
    + h('Suffixes')
    + p('Some items carry a suffix that adds a particular stat:')
    + tbl(['Suffix', 'Adds'], Object.entries(SUFS).map(([k, v]) => [k, sn(v)]));
}

function stats() {
  return h('Stats')
    + tbl(['Stat', 'What it does'], Object.keys(STAT).map((k) => ['<b>' + STAT[k][0] + '</b>', STAT[k][1]]))
    + p('Your total comes from your gear, the upgrade tree, auras, set bonuses, pets and ascension bonuses. Attack speed, crit chance and dodge have caps; anything above a cap is converted into smaller bonuses rather than wasted. The <b>power level</b> at the top of the screen is a quick summary of how strong you are overall.');
}

function power() {
  return h('Upgrades')
    + p('The Upgrades tab lists the upgrades you can buy with gold (switch to the Web view at the top for a skill-tree picture). Core nodes such as Might (damage), Vigor (health), Haste (speed) and Greed (gold) get more expensive with every level. Many other nodes unlock special mechanics. A node appears once you meet its prerequisites. Round nodes can be levelled, diamonds are one-off unlocks, and hexagons are endless Masteries. A pulsing gold ring means you can afford it now.')
    + p('Upgrades are reset when you ascend (a few logistics upgrades can be kept with a relic).')
    + h('Magic')
    + p('Buy <b>Arcane Awakening</b> with relics to unlock spells and the Magic web. Spells use mana and have a cooldown:')
    + tbl(['Spell', 'Mana', 'Cooldown (s)'], SP.map((s) => [s.n, s.c, s.cd]), [1, 2])
    + p('Mend and Frost need their unlock nodes in the Magic web; Meteor has its own unlock too.')
    + h('Sets')
    + p('Wearing several items that share a theme can activate a set bonus. Check your Gear tab for the sets you are close to.');
}

function pets() {
  const cards = PET.map((x) => '<div style="border:3px solid var(--ink);padding:6px 8px;margin-bottom:6px"><div class="row sp"><b style="color:' + x.c + '">' + x.n + '</b><span class="mute">' + x.tag + ' · ' + x.cost.toLocaleString() + ' gold</span></div>'
    + '<div><b>' + x.ab + '</b>: ' + x.desc + '</div><div class="mute">Farm job: ' + x.farm.n + (x.farm.gem ? ' (also finds gems)' : '') + '</div></div>').join('');
  return h('Pets')
    + p('Pets are bought with gold. <b>Only one pet is active</b> and fights beside you; it has its own ability that scales with a build stat. Levelling a pet costs gold; its level can be turned into a <b>star</b> (a permanent boost) once it reaches the required level.')
    + cards
    + p('Pets that you own but are not using rest on the <b>farm</b> and earn gold (and for some, gems) in real time, up to 8 hours between visits. Collect from the Pets tab. Swapping your active pet settles the farm first, so nothing is lost.')
    + p('No pet is best for everything: each shines with certain builds, so try a few. The Pet den upgrade unlocks the farm and the Signatures and Kennel branches of the pet web.');
}

function auras() {
  return h('Auras and gems')
    + p('Gems are rare, mostly dropped by bosses. Spend them in the Auras tab to buy permanent passive bonuses, then spend more to upgrade them (each level adds 40% of the base effect).')
    + tbl(['Aura', 'Effect', 'Gems'], AURAS.map((a) => ['<b style="color:' + a.c + '">' + a.n + '</b>', a.d, a.gems]), [2])
    + p('Auras are not lost when you ascend.');
}

function asc() {
  const ms = ASC_MS.map((m) => ['Ascension ' + m[0], m[1]]);
  return h('Ascension')
    + p('Ascending resets your run and spends your gold to earn <b>relics</b>, a permanent currency. Your next ascension needs a best stage of <b>' + reqStage() + '</b> and <b>' + ascFee().toLocaleString() + '</b> gold (both rise with every ascension). The deeper you got this life, the more relics you earn.')
    + h('What resets, what stays')
    + li([
      '<b>Reset</b>: gold, upgrades, gear and bag, pet levels, and your best stage for this life.',
      '<b>Kept</b>: relics and what you bought with them, pet ownership and stars, the vault, auras and gems, and your all-time records.',
      'Each new ascension rolls a random <b>blessing</b> and <b>curse</b> for that life, so every climb feels a little different.',
    ])
    + h('Milestones')
    + tbl(['When', 'Bonus'], ms)
    + h('Relic tree')
    + tbl(['Relic', 'Effect', 'Levels'], RTREE.map((r) => ['<b>' + r.n + '</b>', r.d, r.m >= 999 ? 'endless' : r.m]), [2])
    + p('Enemies get tougher faster as you ascend more, so each life tends to push a bit further than the last rather than racing ahead.');
}

function idle() {
  return h('Auto-delve')
    + p('Use the <b>Auto-delve</b> button on the battle screen (or the defeat screen). When on, the next run starts 1.5 seconds after you fall and your loot goes to the bag. It does not spend gold or change your gear, so visit camp now and then.')
    + h('Speed')
    + p('Unlock faster battle speeds with the Fast forward and Time rush upgrades, then change them with the speed button during a run.')
    + h('Idle camp')
    + p('The <b>Idle camp</b> relic makes your camp earn gold while you are away (up to a few hours at first; more with Longer rests and Better camp). Open the Idle tab to collect.')
    + h('Pet farm')
    + p('Resting pets earn gold in real time, up to 8 hours, collected from the Pets tab.');
}

function online() {
  return h('Accounts and cloud saves')
    + p('You need an account to play: sign in with your email and password (or create an account) when the game opens, and you stay signed in on that device. Verify your email (Account tab) to turn on cloud saves, then your progress follows you between devices. Your game always saves on the device first; the cloud copy is updated every few minutes and when you leave the page. If two devices disagree you are asked which one to keep.')
    + h('Leaderboards')
    + p('The Leaderboards tab lists the top players for deepest stage, power level, ascensions and pet stars. To appear on it you must be signed in with a verified email and have chosen a <b>username</b> on the Account tab (3 to 18 letters, numbers, dots, dashes or underscores; every username is unique). Joining is then one tap. Only your username and four scores are shown, never your email. Scores come from each player\'s own game, so impossible entries may be removed. You can leave the boards at any time.')
    + h('Gifts')
    + p('Sometimes we send gifts (gold, gems or items) to everyone or to one player. They are collected automatically after signing in, or with the button on the Account tab, and each can only be claimed once.');
}

const BODY = { start, items, gear, stats, power, pets, auras, asc, idle, online };

export function wikiTab() {
  const nav = SECTIONS.map(([k, n]) => '<button class="s' + (ui.sec === k ? '' : ' alt') + '" data-wk="' + k + '">' + n + '</button>').join('');
  return '<div class="box"><div class="px" style="font-size:9px;margin-bottom:6px">Wiki</div><div class="tabs" style="margin-bottom:8px;flex-wrap:wrap">' + nav + '</div>' + BODY[ui.sec]() + '</div>';
}

export function updatesTab() {
  S.seenUp = LATEST_UPDATE;
  return '<div class="box"><div class="px" style="font-size:9px;margin-bottom:6px">Updates</div>'
    + CHANGELOG.map((c, i) => '<div style="margin-bottom:12px"><div class="row sp"><b>' + c.title + (i === 0 ? ' <span style="color:var(--gold)">(latest)</span>' : '') + '</b><span class="mute">' + c.date + '</span></div>'
      + li(c.items) + '</div>').join('') + '</div>';
}

document.addEventListener('click', (e) => {
  const b = e.target && e.target.closest && e.target.closest('[data-wk]');
  if (!b) return;
  ui.sec = BODY[b.dataset.wk] ? b.dataset.wk : 'start';
  window.dispatchEvent(new CustomEvent('hd-wiki'));
});
