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
];
export const RELIC_MIN_STAGE = 30;
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
  const chance = Math.min(.6, .04 + .025 * (S.relicPity || 0));
  if (Math.random() >= chance) { S.relicPity = (S.relicPity || 0) + 1; return null; }
  S.relicPity = 0; return makeRelic(pool[Math.floor(Math.random() * pool.length)].id, stage, topRi);
}
