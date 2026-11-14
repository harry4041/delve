// The shop's catalogue and rules, shared by the game (shop.js), the server (server/worker.js) and the tests. No imports, so the
// Cloudflare Worker and Node can load it. The server is the only one that can change a real wallet; the game uses these same
// functions to show prices and limits, and its test mode uses them to fake a server.
//
// Fairness (see tests/career.html ?boost=): money only buys boosted TIME, never a bigger multiplier. Paid boosts are the same
// Gold rush (x2 gold) and Lucky find (+2 loot rolls) the game already has, they never stack with free ones, each paid timer holds
// at most 4 hours, and a wallet can add at most 4 paid hours a day (UTC). The 6-hour bot runs showed a payer ~2% deeper than a
// player who watches ads.

export const SHOP = {
  // Crystal packs bought with real money (live prices and checkout links live in the payment provider; these are for display).
  packs: [
    { id: 'c100', crystals: 100, price: '£0.99' },
    { id: 'c550', crystals: 550, price: '£4.99', bonus: '+10% bonus' },
    { id: 'c1200', crystals: 1200, price: '£9.99', bonus: '+20% bonus' },
  ],
  // Paid boost time. k = the boost it extends (meta.js BOOSTS).
  boosts: [
    { id: 'gold30', k: 'gold', min: 30, cost: 30, n: 'Gold rush', d: 'Double gold from enemies.' },
    { id: 'gold60', k: 'gold', min: 60, cost: 55, n: 'Gold rush', d: 'Double gold from enemies.' },
    { id: 'loot30', k: 'loot', min: 30, cost: 30, n: 'Lucky find', d: 'Two extra loot rolls on every enemy.' },
    { id: 'loot60', k: 'loot', min: 60, cost: 55, n: 'Lucky find', d: 'Two extra loot rolls on every enemy.' },
  ],
  // Cosmetics: pure style, no stats (look.js shows them as extra options in the Look tab once owned).
  cosmetics: [
    { id: 'outfit_royal', n: 'Royal outfit', d: 'A deep royal purple outfit.', cost: 150 },
    { id: 'outfit_obsidian', n: 'Obsidian outfit', d: 'Near-black armour cloth with a faint sheen.', cost: 150 },
    { id: 'hair_star', n: 'Starlight hair', d: 'Pale, glowing silver-blue hair.', cost: 120 },
    { id: 'capes', n: "Patron's mantle", d: 'Unlocks capes, like the Heroic mantle relic.', cost: 200 },
    { id: 'cape_phoenix', n: 'Phoenix cape', d: 'A blazing orange cape (needs capes unlocked).', cost: 150 },
  ],
  PAID_MIN_PER_DAY: 240, // paid boost minutes a wallet can add per UTC day
  BOOST_CAP_MIN: 240, // a paid boost timer never holds more than this
  MAX_ORDERS: 200, // order ids remembered (a repeated payment notification never credits twice)
};

const ID = /^[a-z0-9_]{1,32}$/;
export function utcDay(ms) { return new Date(ms).toISOString().slice(0, 10); }
export function freshWallet() { return { v: 1, crystals: 0, owned: [], boosts: {}, day: '', paidMin: 0, orders: [] }; }
const findBoost = (id) => SHOP.boosts.find((b) => b.id === id) || null;
const findCos = (id) => SHOP.cosmetics.find((c) => c.id === id) || null;
const findPack = (id) => SHOP.packs.find((p) => p.id === id) || null;

// Accepts anything (a Firestore doc, localStorage, a hostile value) and returns a well-formed wallet.
export function cleanWallet(x) {
  const w = freshWallet();
  if (!x || typeof x !== 'object' || Array.isArray(x)) return w;
  if (Number.isInteger(x.crystals)) w.crystals = x.crystals; // may be negative after a refund of spent Crystals
  if (Array.isArray(x.owned)) w.owned = [...new Set(x.owned.filter((id) => typeof id === 'string' && findCos(id)))];
  if (x.boosts && typeof x.boosts === 'object' && !Array.isArray(x.boosts))
    for (const k of ['gold', 'loot']) if (Number.isFinite(x.boosts[k]) && x.boosts[k] > 0) w.boosts[k] = x.boosts[k];
  if (typeof x.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(x.day)) w.day = x.day;
  if (Number.isInteger(x.paidMin) && x.paidMin >= 0) w.paidMin = x.paidMin;
  if (Array.isArray(x.orders)) w.orders = x.orders.filter((o) => typeof o === 'string' && o.length <= 80).slice(-SHOP.MAX_ORDERS);
  return w;
}

// Paid minutes still allowed today, and how long a paid boost has left.
export function paidMinLeft(w, now) { return SHOP.PAID_MIN_PER_DAY - (w.day === utcDay(now) ? w.paidMin : 0); }
export function boostLeftMs(w, k, now) { return Math.max(0, ((w.boosts && w.boosts[k]) || 0) - now); }

// Why an item cannot be bought right now ('' = it can). Used for the buttons and, identically, by the server.
export function spendBlock(w, itemId, now) {
  const b = findBoost(itemId), c = findCos(itemId);
  if (!b && !c) return 'unknown item';
  const cost = (b || c).cost;
  if (w.crystals < cost) return 'not enough Crystals';
  if (c && w.owned.includes(c.id)) return 'already owned';
  if (b) {
    if (paidMinLeft(w, now) < b.min) return 'daily limit reached';
    if (boostLeftMs(w, b.k, now) > (SHOP.BOOST_CAP_MIN - b.min) * 60000) return 'timer is full';
  }
  return '';
}

// Spend Crystals: returns { ok, wallet, err }. The input wallet is not modified.
export function spend(w0, itemId, now) {
  const w = cleanWallet(w0), err = spendBlock(w, itemId, now);
  if (err) return { ok: false, wallet: w, err };
  const b = findBoost(itemId), c = findCos(itemId);
  if (b) {
    if (w.day !== utcDay(now)) { w.day = utcDay(now); w.paidMin = 0; }
    w.paidMin += b.min; w.crystals -= b.cost;
    w.boosts[b.k] = Math.min(now + SHOP.BOOST_CAP_MIN * 60000, now + boostLeftMs(w, b.k, now) + b.min * 60000);
  } else { w.crystals -= c.cost; w.owned.push(c.id); }
  return { ok: true, wallet: w, err: '' };
}

// A paid order (payment provider notification): credits the pack once per order id.
export function creditOrder(w0, orderId, packId) {
  const w = cleanWallet(w0), p = findPack(packId);
  if (!p || typeof orderId !== 'string' || !orderId) return { ok: false, wallet: w, err: 'bad order' };
  if (w.orders.includes('o:' + orderId)) return { ok: true, wallet: w, err: 'duplicate' };
  w.crystals += p.crystals; w.orders = [...w.orders, 'o:' + orderId].slice(-SHOP.MAX_ORDERS);
  return { ok: true, wallet: w, err: '' };
}
// A refunded order takes its Crystals back (the balance may go below zero if they were already spent), once.
export function refundOrder(w0, orderId, packId) {
  const w = cleanWallet(w0), p = findPack(packId);
  if (!p || !w.orders.includes('o:' + orderId) || w.orders.includes('r:' + orderId)) return { ok: false, wallet: w, err: 'nothing to refund' };
  w.crystals -= p.crystals; w.orders = [...w.orders, 'r:' + orderId].slice(-SHOP.MAX_ORDERS);
  return { ok: true, wallet: w, err: '' };
}

export const shopItem = (id) => findBoost(id) || findCos(id) || findPack(id);
export const validItemId = (id) => typeof id === 'string' && ID.test(id) && !!shopItem(id);
