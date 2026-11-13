// Mythic Relics: a few handmade unique items with their own art and a signature power. They drop from bosses (stage 30+) with a pity timer,
// only one of each can exist in your gear at a time, they survive Ascension, and the Gear tab keeps a collection page.
// Powers are applied by hooks in battle.js (hasRelic('id')); the art is drawn by gearart.js (it.un === id).
import { S, RN } from './state.js';
import { gen } from './items.js';

export const RELICS = [
  { id: 'emberfang', nm: 'Emberfang Sword', ty: 'weapon', base: 'Sword', title: 'Emberfang',
    power: 'Every hit sets the enemy ablaze: it burns for 30% of that hit every half second for 3 seconds.', flavor: 'Forged in the throat of a dying furnace.' },
  { id: 'wyrmscale', nm: 'Wyrmscale Aegis', ty: 'shield', base: 'Aegis', title: 'Wyrmscale Aegis',
    power: 'Every 5th enemy attack is blocked completely and answered with dragonfire for 200% of your attack.', flavor: 'The dragon is long dead. Its pride is not.' },
  { id: 'phoenix', nm: 'Phoenix Robe', ty: 'chest', base: 'Robe', title: 'Phoenix Robe',
    power: 'Once per delve, a killing blow instead burns you back to 60% health and scorches the enemy for 400% of your attack.', flavor: 'It has died before. It remembers how.' },
  { id: 'drowned', nm: 'Crown of the Drowned King', ty: 'head', base: 'Crown', title: 'Crown of the Drowned King',
    power: 'Each kill restores 10% of your maximum health.', flavor: 'The sea took his kingdom. It never took his crown.' },
  { id: 'stormcaller', nm: 'Stormcaller Gauntlets', ty: 'gloves', base: 'Gauntlets', title: 'Stormcaller Gauntlets',
    power: 'Critical hits call down lightning for 60% of the hit.', flavor: 'Every clenched fist is a thunderclap.' },
  { id: 'rime', nm: 'Rimeplate Greaves', ty: 'legs', base: 'Greaves', title: 'Rimeplate Greaves',
    power: 'Every 6th hit freezes the enemy solid for 1.5 seconds.', flavor: 'Worn for a thousand years in a glacier that never melted.' },
  { id: 'windrunner', nm: 'Windrunner Boots', ty: 'boots', base: 'Boots', title: 'Windrunner Boots',
    power: '+25% attack speed.', flavor: 'The wind keeps trying to catch them.' },
  { id: 'midas', nm: 'Midas Locket', ty: 'amulet', base: 'Locket', title: 'Midas Locket',
    power: '+60% gold from kills.', flavor: 'Everything it touches wants to be paid.' },
  { id: 'seer', nm: 'Eye of the Seer Talisman', ty: 'amulet', base: 'Talisman', title: 'Eye of the Seer',
    power: '+20% critical hit chance.', flavor: 'It blinks a moment before you do.' },
  { id: 'voidreaver', nm: 'Voidreaver Axe', ty: 'weapon', base: 'Axe', title: 'Voidreaver Axe',
    power: 'Hits against enemies below 25% health deal triple damage.', flavor: 'It does not cut. It subtracts.' },
];
export const RELIC_MIN_STAGE = 30;
// A relic is easy to miss in a pile of loot, so finding one raises a big gold banner (plain text only), flags the Gear tab until it has been seen,
// and the defeat screen mentions it. S.relicNew holds the id of the relic the player has not looked at yet.
export function announceRelic(it) {
  const r = it && it.un ? byId[it.un] : null; if (!r) return;
  S.relicNew = it.un;
  if (typeof document === 'undefined') return;
  const old = document.getElementById('relicbn'); if (old) old.remove();
  const d = document.createElement('div'); d.id = 'relicbn';
  const mk = (cls, txt) => { const e = document.createElement('div'); e.className = cls; e.textContent = txt; return e; };
  d.append(mk('rb-top', '\u2605 MYTHIC RELIC FOUND \u2605'), mk('rb-name', r.title), mk('rb-pow', r.power), mk('rb-fl', r.flavor), mk('rb-hint', 'It is in your Gear tab. Tap to close.'));
  d.addEventListener('click', () => d.remove()); document.body.appendChild(d); setTimeout(() => { if (d.isConnected) d.remove(); }, 10000);
}
const byId = Object.fromEntries(RELICS.map((r) => [r.id, r]));
export const relicInfo = (it) => (it && it.un ? byId[it.un] || null : null);

// Is this relic equipped right now? (the power only works while worn)
export function hasRelic(id) { const e = S.eq; for (const k in e) if (e[k] && e[k].un === id) return true; return false; }
// Does the player hold it anywhere (worn, bag or vault)?
export function ownsRelic(id) { return Object.values(S.eq).some((x) => x && x.un === id) || S.bag.some((x) => x.un === id) || (S.vault || []).some((x) => x.un === id); }

// Build the item: a strong item of its type (two tiers above the current top tier, at least Mythic) with its own name and id.
export function makeRelic(id, stage, topRi) {
  const d = byId[id], ri = Math.min(RN.length - 1, Math.max(5, (topRi || 0) + 2)), it = gen(stage + 10, ri, d.ty, d.base, 3);
  it.nm = d.nm; it.un = id; return it;
}
// Called when a boss spawns: maybe returns a relic the player does not hold yet. The chance grows with every boss without one (pity).
export function rollRelic(stage, topRi) {
  if (stage < RELIC_MIN_STAGE || stage % 10 !== 0) return null;
  const pool = RELICS.filter((r) => !ownsRelic(r.id)); if (!pool.length) return null;
  const chance = Math.min(.6, .01 + .02 * (S.relicPity || 0)); // 1% per boss kill, +2% for each boss kill without a relic (about 9 boss kills per relic on average)
  if (Math.random() >= chance) { S.relicPity = (S.relicPity || 0) + 1; return null; }
  S.relicPity = 0; return makeRelic(pool[Math.floor(Math.random() * pool.length)].id, stage, topRi);
}
