// Leaderboard limits shared by the client (leaderboard.js) and tests/lb-rules-model.mjs. No imports, so Node can load it.
// The limits firestore.rules enforces (tests/lb-rules-model.mjs checks that these match the rules file). publish() trims the
// scores it sends to what the rules accept right now, so a write is never refused for being too high: a first entry (joining or
// rejoining) shows the real scores (only the hard caps apply), and later updates climb at the allowed pace if they ever jump faster.
export const LB = {
  cap: { stage: 100000, power: 1000000000000000, asc: 10000, stars: 10000 },
  grow: { stage: [50, 6000], asc: [2, 120000], stars: [5, 300000] }, // [allowance, ms per extra point]
  power: [1000000, 10, 1], // [floor, multiplier, ms per extra point]
  gap: 5 * 60e3, skew: 2 * 60e3, // minimum time between writes; margin for a client clock that runs ahead of the server
};
export const tMs = (t) => (t && typeof t.toMillis === 'function' ? t.toMillis() : typeof t === 'number' ? t : 0);
// What the rules accept for this write: the snapshot m, trimmed (old = the existing entry or null, dt = ms since it was written).
export function lbClamp(m, old, dt) {
  const r = { ...m };
  for (const k of ['stage', 'power', 'asc', 'stars']) r[k] = Math.max(0, Math.min(Math.floor(r[k]) || 0, LB.cap[k]));
  if (!old) return r;
  const d = Math.max(0, dt - LB.skew);
  for (const k of ['stage', 'asc', 'stars']) { const o = old[k] || 0, [a, per] = LB.grow[k]; r[k] = Math.min(Math.max(r[k], o), o + a + Math.floor(d / per)); }
  const [fl, mul, per] = LB.power; r.power = Math.min(r.power, Math.max(old.power || 0, fl) * mul + Math.floor(d / per));
  return r;
}
