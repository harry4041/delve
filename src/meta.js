// Goal systems shared with the Unity version (Meta.cs): lifetime counters, daily bounties, trophies, the bestiary, the Spire and
// gem boosts. Everything lives in S.meta, which BOTH versions read and write through the shared cloud save, so the field names,
// numbers and formulas here must stay identical to Meta.cs. S.meta survives ascension (ascend() edits S in place); Reset save
// builds a fresh one (def()), and load() repairs a damaged one (sanitize() in state.js).
// With an empty S.meta every multiplier here is exactly 1, so old saves play exactly as before.
import { S, NM, TP, run, freshMeta } from './state.js';
import { L, fmtN, petStars } from './stats.js';
import { hasMagic } from './ascension.js';
import { seed, shuffled } from './netrandom.js';

export function M() { if (!S.meta || typeof S.meta !== 'object' || Array.isArray(S.meta)) S.meta = freshMeta(); return S.meta; }
export function C(k) { const v = M().c[k]; return typeof v === 'number' ? v : 0; }
export function count(k, n = 1) { if (n > 0 && Number.isFinite(n)) M().c[k] = C(k) + n; }

// Attack and health multiplier from trophies and the Spire; gold-from-enemies multiplier from trophies and a running Gold rush.
export function powerMult() { return trophyPowerMult() * spirePowerMult(); }
export function goldMult() { return trophyGoldMult() * (boostActive('gold') ? 2 : 1); }

// Gold one ordinary enemy at stage s pays before bonuses (kill() in battle.js, stripped down): sizes bounty goals and rewards.
export function killGold(s) { return 1.5 * Math.pow(1.12, s) * Math.pow(1.12, L('greed')) * Math.pow(1.06, L('mGreed')); }
// C#'s Math.Round rounds halves to even; nice() must match it.
function roundEven(x) { const f = Math.floor(x), d = x - f; return d > .5 ? f + 1 : d < .5 ? f : (f % 2 === 0 ? f : f + 1); }
// Rounds to two significant figures so goals read cleanly (12,345 -> 12,000).
export function nice(v) {
  if (!(v > 0) || !Number.isFinite(v)) return 0;
  const p = Math.pow(10, Math.max(0, Math.floor(Math.log10(v)) - 1));
  return Math.max(1, roundEven(v / p) * p);
}

// Hooks from the battle (dungeon runs only): an enemy died, with the final kill gold g.
export function onKill(r, g) {
  count('kill'); if (r.boss) count('boss'); if (r.golden) count('golden'); count('gold', g);
  for (const it of r.eDrops) { if (it.ri >= 1) count('unc'); if (it.ri >= 3) count('epic'); }
  beastRecord(r.stage, r.eType);
}
// Called after the stage counter moved on.
export function onStage(stage) { ensureBounties(); const m = M(); if (stage > m.dayBest) m.dayBest = stage; }

// ------------------------------------------------------------------------------------------------ daily bounties
const best = () => Math.max(1, S.bestOverall || 0);
const tierT = () => Math.max(1, Math.min(10, Math.floor(best() / 10)));
export const POOL = [
  { k: 'kill', ok: () => true, goal: () => 40 + 20 * tierT(), text: (g) => 'Defeat ' + fmtN(g) + ' enemies' },
  { k: 'boss', ok: () => best() >= 10, goal: () => 2 + Math.min(tierT(), 6), text: (g) => (g === 1 ? 'Slay a boss' : 'Slay ' + fmtN(g) + ' bosses') },
  { k: 'unc', ok: () => best() >= 12, goal: () => 8 + 2 * Math.min(tierT(), 8), text: (g) => 'Find ' + fmtN(g) + ' items of Uncommon or better' },
  { k: 'gold', ok: () => true, goal: () => nice(killGold(best()) * 100), text: (g) => 'Earn ' + fmtN(g) + ' gold from enemies' },
  { k: 'stage', ok: () => true, goal: () => Math.max(5, Math.floor(best() * .8 + .5)), text: (g) => 'Reach stage ' + fmtN(g) + ' in one delve' },
  { k: 'spell', ok: () => hasMagic(), goal: () => 20 + 5 * tierT(), text: (g) => 'Cast ' + fmtN(g) + ' spells' },
  { k: 'golden', ok: () => L('goblin') > 0, goal: () => 1, text: () => 'Defeat a golden enemy' },
  { k: 'floor', ok: () => spireUnlocked(), goal: () => 2, text: (g) => 'Clear ' + fmtN(g) + ' Spire floors' },
];
export const CHEST_GEMS = 2, CHEST_RUSH_MIN = 15;

const pad = (n) => (n < 10 ? '0' : '') + n;
export function today() { const d = new Date(Date.now()); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); }
export function untilReset() { const d = new Date(Date.now()), m = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1); return m - d; }
// Bounty picks use .NET's System.Random + LINQ OrderBy, exactly as Meta.cs does (src/netrandom.js), so both versions hand out the same set.
function make(d) { return { k: d.k, goal: d.goal(), b: d.k === 'stage' ? 0 : C(d.k), done: false }; }

// Hands out a new set of bounties when the day has changed.
export function ensureBounties() {
  const m = M(), t = today();
  if (m.day === t && m.bounties.length >= 3) return;
  if (m.day === t && m.bounties.length > 0) { // a new player has a small pool: top the set up as more kinds become available
    const have = new Set(m.bounties.map((b) => b.k));
    for (const d of shuffled(POOL.filter((d) => d.ok() && !have.has(d.k)), (seed(t) + m.bounties.length) | 0).slice(0, 3 - m.bounties.length)) m.bounties.push(make(d));
    return;
  }
  m.day = t; m.rerolled = false; m.chest = false; m.dayBest = run && !run.over && !run.tower ? run.stage : 0;
  m.bounties = shuffled(POOL.filter((d) => d.ok()), seed(t)).slice(0, 3).map(make);
}

export function bountyDef(k) { return POOL.find((d) => d.k === k) || null; }
export function bountyProgress(b) { return b.k === 'stage' ? M().dayBest : C(b.k) - b.b; }
export function bountyComplete(b) { return bountyProgress(b) >= b.goal; }
export function bountyGold() { return nice(killGold(best()) * 40); }
export function chestReady() { const m = M(); return !m.chest && m.bounties.length > 0 && m.bounties.every((b) => b.done); }
export function bountiesClaimable() { ensureBounties(); return M().bounties.some((b) => !b.done && bountyComplete(b)) || chestReady(); }

export function claimBounty(i) {
  ensureBounties(); const m = M(); if (!(i >= 0 && i < m.bounties.length)) return null;
  const b = m.bounties[i]; if (b.done || !bountyComplete(b)) return null;
  b.done = true; const g = bountyGold();
  S.gems = (S.gems || 0) + 1; S.gold += g; count('bounty');
  return 'Bounty complete: +1 gem and ' + fmtN(g) + ' gold';
}
export function openChest() {
  ensureBounties(); if (!chestReady()) return null;
  M().chest = true; S.gems = (S.gems || 0) + CHEST_GEMS; addBoost('gold', CHEST_RUSH_MIN);
  return 'Daily chest: +' + fmtN(CHEST_GEMS) + ' gems and ' + fmtN(CHEST_RUSH_MIN) + ' minutes of Gold rush';
}
export function rerollBounty(i) {
  ensureBounties(); const m = M(); if (m.rerolled || !(i >= 0 && i < m.bounties.length) || m.bounties[i].done) return false;
  const used = new Set(m.bounties.map((b) => b.k));
  const d = shuffled(POOL.filter((x) => x.ok() && !used.has(x.k)), (seed(m.day) + 7919) | 0)[0];
  if (!d) return false;
  m.bounties[i] = make(d); m.rerolled = true;
  return true;
}

// ------------------------------------------------------------------------------------------------ trophies
const P = (n, one, many) => fmtN(n) + ' ' + (n === 1 ? one : many);
export const ATK_PER_POINT = .005, GOLD_PER_POINT = .01;
export const LINES = [
  { k: 'slayer', n: 'Slayer', d: (t) => 'Defeat ' + P(t, 'enemy', 'enemies'), tiers: [100, 1e3, 1e4, 1e5, 1e6], val: () => C('kill') },
  { k: 'bosses', n: 'Kingslayer', d: (t) => 'Slay ' + P(t, 'boss', 'bosses'), tiers: [10, 100, 1e3, 5e3, 2e4], val: () => C('boss') },
  { k: 'depth', n: 'Deep delver', d: (t) => 'Reach stage ' + fmtN(t), tiers: [25, 50, 100, 200, 400], val: () => S.bestOverall || 0 },
  { k: 'hoard', n: 'Hoarder', d: (t) => 'Find ' + P(t, 'Epic or better item', 'Epic or better items'), tiers: [10, 100, 1e3, 1e4], val: () => C('epic') },
  { k: 'tycoon', n: 'Tycoon', d: (t) => 'Earn ' + fmtN(t) + ' gold from enemies', tiers: [1e6, 1e9, 1e12, 1e15, 1e18], val: () => C('gold') },
  { k: 'golden', n: 'Golden touch', d: (t) => 'Defeat ' + P(t, 'golden enemy', 'golden enemies'), tiers: [1, 10, 100, 1e3], val: () => C('golden') },
  { k: 'ascend', n: 'Ascendant', d: (t) => (t === 1 ? 'Ascend once' : 'Ascend ' + fmtN(t) + ' times'), tiers: [1, 3, 5, 10, 25], val: () => S.asc || 0 },
  { k: 'mythic', n: 'Relic seeker', d: (t) => 'Find ' + P(t, 'Mythic Relic', 'Mythic Relics'), tiers: [1, 3, 5, 8, 10], val: () => Object.keys(S.relicFound || {}).length },
  { k: 'tamer', n: 'Beast tamer', d: (t) => 'Earn ' + P(t, 'pet star', 'pet stars'), tiers: [1, 5, 10, 25], val: () => petStars() },
  { k: 'arcane', n: 'Arcanist', d: (t) => 'Cast ' + fmtN(t) + ' spells', tiers: [100, 1e3, 1e4, 1e5], val: () => C('spell') },
  { k: 'climber', n: 'Spire climber', d: (t) => 'Clear Spire floor ' + fmtN(t), tiers: [5, 10, 25, 50, 100], val: () => M().spireBest },
  { k: 'hunter', n: 'Bounty hunter', d: (t) => 'Complete ' + P(t, 'daily bounty', 'daily bounties'), tiers: [3, 20, 75, 250], val: () => C('bounty') },
  { k: 'naturalist', n: 'Naturalist', d: (t) => 'Earn ' + P(t, 'bestiary star', 'bestiary stars'), tiers: [5, 20, 50, 99], val: () => beastTotalStars() },
];
export function trophyClaimed(k) { const n = M().trophies[k]; return Number.isInteger(n) && n > 0 ? n : 0; }
export function trophyPoints() { let p = 0; for (const l of LINES) p += Math.min(trophyClaimed(l.k), l.tiers.length); return p; }
export function trophyMaxPoints() { return LINES.reduce((n, l) => n + l.tiers.length, 0); }
export function trophyCanClaim(l) { const c = trophyClaimed(l.k); return c < l.tiers.length && l.val() >= l.tiers[c]; }
export function trophiesClaimable() { return LINES.some(trophyCanClaim); }
export function trophyGems(tier) { return tier >= 3 ? 2 : 1; } // tier is 0-based
export function roman(n) { return n >= 1 && n <= 10 ? ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'][n - 1] : String(n); }
export function claimTrophy(k) {
  const l = LINES.find((x) => x.k === k); if (!l || !trophyCanClaim(l)) return null;
  const c = trophyClaimed(k); M().trophies[k] = c + 1; const g = trophyGems(c); S.gems = (S.gems || 0) + g;
  return l.n + ' ' + roman(c + 1) + ': +' + fmtN(g) + (g === 1 ? ' gem' : ' gems') + ', +1 trophy point';
}
export function trophyPowerMult() { return 1 + ATK_PER_POINT * trophyPoints(); }
export function trophyGoldMult() { return 1 + GOLD_PER_POINT * trophyPoints(); }

// ------------------------------------------------------------------------------------------------ bestiary
export const DMG_PER_STAR = .04;
const NORMAL = [50, 500, 5000], BOSS = [5, 50, 500];
export function beastZone(stage) { return Math.floor((stage - 1) / 5) % 6; }
export function beastKey(zone, type) { return zone + ':' + type; }
let all = null; // built on first use: TP/NM come from state.js, which may not have run yet when this module loads
// Every kind the dungeon spawns: five per zone, plus death knights in the zones bosses fall in (stages 10, 20, 30...).
export function beasts() {
  if (all) return all;
  const bossZones = new Set(); for (let s = 10; s <= 60; s += 10) bossZones.add(beastZone(s));
  all = [];
  for (let z = 0; z < 6; z++) {
    for (let t = 0; t < 5; t++) all.push({ zone: z, type: t, key: beastKey(z, t), name: TP[z] + ' ' + NM[t], boss: false });
    if (bossZones.has(z)) all.push({ zone: z, type: 5, key: beastKey(z, 5), name: TP[z] + ' death knight', boss: true });
  }
  return all;
}
export function beastKills(key) { const v = M().beasts[key]; return typeof v === 'number' ? v : 0; }
export function beastThresholds(boss) { return boss ? BOSS : NORMAL; }
export function beastStars(key, boss) { const k = beastKills(key); return beastThresholds(boss).filter((t) => k >= t).length; }
export function beastTotalStars() { return beasts().reduce((n, e) => n + beastStars(e.key, e.boss), 0); }
export function beastMaxStars() { return beasts().length * 3; }
export function beastRecord(stage, type) { const k = beastKey(beastZone(stage), type); M().beasts[k] = beastKills(k) + 1; }
export function bestiaryDmgMult(stage, type) { return 1 + DMG_PER_STAR * beastStars(beastKey(beastZone(stage), type), type === 5); }

// ------------------------------------------------------------------------------------------------ the Spire
export const SPIRE_UNLOCK = 15;
export function spireUnlocked() { return (S.bestOverall || 0) >= SPIRE_UNLOCK; }
export function spireNext() { return M().spireBest + 1; }
// The dungeon stage whose boss a floor's warden is built from.
export function spireStage(floor) { return 6 + 4 * floor; }
export const MODS = [
  { n: 'Warden', d: 'No twist: a straight fight.', hp: 1, atk: 1, spd: 1, regen: 0 },
  { n: 'Swift', d: 'Attacks 30% more often.', hp: 1, atk: 1, spd: .7, regen: 0 },
  { n: 'Armoured', d: '50% more health.', hp: 1.5, atk: 1, spd: 1, regen: 0 },
  { n: 'Brutal', d: 'Hits 35% harder.', hp: 1, atk: 1.35, spd: 1, regen: 0 },
  { n: 'Regenerating', d: 'Heals 3% of its health every second.', hp: 1, atk: 1, spd: 1, regen: .03 },
  { n: 'Giant', d: '30% more health and hits 15% harder.', hp: 1.3, atk: 1.15, spd: 1, regen: 0 },
];
export function spireMod(floor) { return MODS[(floor - 1) % MODS.length]; }
export function spirePowerMult() { return 1 + .01 * M().spireBest; }
export function floorGold(floor) { return nice(killGold(spireStage(floor)) * 30); }
export function floorGems(floor) { return floor % 5 === 0 ? 2 : 0; }
// A warden fell: first-clear rewards (returns what was paid; the battle shows it).
export function spireCleared(floor) {
  count('floor');
  const m = M(); if (floor <= m.spireBest) return { gold: 0, gems: 0 };
  m.spireBest = floor;
  const g = floorGold(floor), gm = floorGems(floor);
  S.gold += g; S.gems = (S.gems || 0) + gm;
  return { gold: g, gems: gm };
}

// ------------------------------------------------------------------------------------------------ boosts
export const BOOSTS = [
  { k: 'gold', n: 'Gold rush', d: 'Double gold from enemies.', gems: 2, minutes: 30 },
  { k: 'loot', n: 'Lucky find', d: 'Two extra loot rolls on every enemy.', gems: 2, minutes: 30 },
];
export const BOOST_CAP_MIN = 240;
export function boostLeft(k) { const t = M().boosts[k]; return typeof t === 'number' ? Math.max(0, t - Date.now()) : 0; }
export function boostActive(k) { return boostLeft(k) > 0; }
export function addBoost(k, minutes) {
  const now = Date.now(), from = Math.max(now, now + boostLeft(k));
  M().boosts[k] = Math.min(now + BOOST_CAP_MIN * 60000, from + minutes * 60000);
}
export function canBuyBoost(d) { return (S.gems || 0) >= d.gems && boostLeft(d.k) < (BOOST_CAP_MIN - d.minutes) * 60000; }
export function buyBoost(k) {
  const d = BOOSTS.find((x) => x.k === k); if (!d || !canBuyBoost(d)) return false;
  S.gems -= d.gems; addBoost(k, d.minutes);
  return true;
}
export function boostLeftText(k) {
  const ms = boostLeft(k); if (ms <= 0) return '';
  const m = Math.ceil(ms / 60000);
  return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm left' : m + 'm left';
}
