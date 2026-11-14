// The shop (More -> Shop, tab 'h'): Crystals bought with real money, spent on paid boost time and cosmetics.
// The wallet (Crystals, owned cosmetics, paid boost timers) lives on the server in Firestore wallet/<uid>; only the shop server
// (server/worker.js) can change it, so editing the save cannot create Crystals. Rules and prices: shopcat.js (shared with the server).
// Modes: 'live' once shop-config.js has the server URL; 'test' in the dev server while it has none (a fake server in this browser,
// clearly labelled, no money); 'off' in a deployed game without a server (the Shop is hidden).
import { fmtN } from './stats.js';
import { cloudState, withFirebase, setAfterSync } from './cloud.js';
import { toast } from './toast.js';
import { SHOP, cleanWallet, spend, creditOrder, spendBlock, paidMinLeft, boostLeftMs, shopItem } from './shopcat.js';
import { SHOP_API, CHECKOUT } from './shop-config.js';
import { setPaidBoostSource } from './meta.js';

export function shopMode() {
  const dev = !!(import.meta.env && import.meta.env.DEV);
  if (dev && typeof window !== 'undefined' && ['live', 'test', 'off'].includes(window.__HD_SHOP_MODE)) return window.__HD_SHOP_MODE; // tests only: a deployed build ignores it, so test mode can never be switched on there
  return SHOP_API ? 'live' : dev ? 'test' : 'off';
}
const TEST_KEY = 'hd-wallet-test', CACHE_KEY = 'hd-wallet';
let wallet = null, busy = false, note = '';
const emit = () => window.dispatchEvent(new CustomEvent('hd-shop'));

// The wallet as last read from the server (or the test wallet). A cached copy keeps paid boosts and cosmetics working offline.
export function walletNow() { return wallet; }
export function owns(id) { return !!wallet && wallet.owned.includes(id); }
export function paidBoostLeft(k) { return wallet ? boostLeftMs(wallet, k, Date.now()) : 0; }
setPaidBoostSource(paidBoostLeft);

function readJson(key) { try { return JSON.parse(localStorage.getItem(key)); } catch (e) { return null; } }
function writeJson(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* ignore */ } }
function setWallet(w, uid) { wallet = cleanWallet(w); if (shopMode() === 'test') writeJson(TEST_KEY, wallet); else if (uid) writeJson(CACHE_KEY, { uid, w: wallet }); emit(); }
export function resetShopForTests() { wallet = null; busy = false; note = ''; }

// Reads the wallet (test: from this browser; live: wallet/<uid>, which the rules let only its owner read).
export async function refreshWallet() {
  const m = shopMode();
  if (m === 'test') { setWallet(readJson(TEST_KEY)); return wallet; }
  if (m !== 'live') return null;
  const c = cloudState();
  if (!c.user) { wallet = null; return null; }
  const cached = readJson(CACHE_KEY);
  if (!wallet && cached && cached.uid === c.user.uid) wallet = cleanWallet(cached.w); // show the cached wallet at once
  try {
    const { F, db } = await withFirebase();
    const d = await F.getDoc(F.doc(db, 'wallet', c.user.uid));
    setWallet(d.exists() ? d.data() : null, c.user.uid);
  } catch (e) { /* offline: keep the cached wallet */ }
  return wallet;
}
setAfterSync(() => refreshWallet());

// Spend Crystals on a boost or cosmetic. The server decides; test mode runs the same rules here.
export async function buyItem(id) {
  const item = shopItem(id), m = shopMode();
  if (!item || busy || m === 'off') return;
  if (m === 'test') {
    const r = spend(wallet || cleanWallet(null), id, Date.now());
    if (!r.ok) { toast(r.err); return; }
    setWallet(r.wallet); toast(boughtText(item));
    return;
  }
  busy = true; note = ''; emit();
  try {
    const c = cloudState(); if (!c.user || !c.user.verified) throw new Error('Verify your email on the Account tab to use the shop.');
    const { auth } = await withFirebase();
    const res = await fetch(SHOP_API + '/spend', { method: 'POST', headers: { authorization: 'Bearer ' + (await auth.currentUser.getIdToken()), 'content-type': 'application/json' }, body: JSON.stringify({ item: id }) });
    const r = await res.json();
    if (r.wallet) setWallet(r.wallet, c.user.uid);
    if (!r.ok) throw new Error(r.err || 'The shop could not complete that.');
    toast(boughtText(item));
  } catch (e) { note = e.message || 'The shop is not reachable right now.'; toast(note); }
  busy = false; emit();
}
const boughtText = (it) => (it.k ? it.n + ': +' + it.min + ' min (paid timer)' : it.n + ' unlocked: choose it on the Look tab');

// Buy a Crystal pack. Live: the payment provider's checkout opens in a new tab and the server credits the wallet when the
// payment is confirmed (we check again for a few minutes). Test: credited at once, no money involved.
export async function buyPack(id) {
  const p = SHOP.packs.find((x) => x.id === id), m = shopMode();
  if (!p || m === 'off') return;
  if (m === 'test') { setWallet(creditOrder(wallet || cleanWallet(null), 'test-' + Date.now() + '-' + Math.random().toString(36).slice(2, 7), id).wallet); toast('TEST MODE: +' + p.crystals + ' Crystals (no money)'); return; }
  const c = cloudState();
  if (!c.user || !c.user.verified || !CHECKOUT[id]) { toast('Verify your email on the Account tab to buy Crystals.'); return; }
  window.open(CHECKOUT[id] + (CHECKOUT[id].includes('?') ? '&' : '?') + 'checkout[custom][uid]=' + encodeURIComponent(c.user.uid), '_blank', 'noopener');
  note = 'Finish the payment in the new tab. Your Crystals appear here within a minute of paying.'; emit();
  const before = wallet ? wallet.crystals : 0;
  for (let i = 0; i < 20; i++) { await new Promise((r) => setTimeout(r, 15000)); await refreshWallet(); if (wallet && wallet.crystals > before) { note = ''; toast('+' + (wallet.crystals - before) + ' Crystals. Thank you!'); emit(); break; } }
}

// ---------------------------------------------------------------- the Shop tab
const left = (ms) => { const m = Math.ceil(ms / 60000); return m >= 60 ? Math.floor(m / 60) + 'h ' + (m % 60) + 'm' : m + 'm'; };
export function shopTab() {
  const m = shopMode(), c = cloudState();
  let h = '<div class="box"><div class="row sp"><div class="px" style="font-size:9px">Shop</div><span class="mute">' + (wallet ? '✦ ' + fmtN(wallet.crystals) + ' Crystals' : '') + '</span></div>';
  if (m === 'off') return h + '<div style="margin:6px 0">The shop is coming soon.</div></div>';
  if (m === 'test') h += '<div class="acerr" style="margin:6px 0">TEST MODE: purchases here are free and fake. No money is involved and nothing reaches the real game.</div>';
  else if (!c.user || !c.user.verified) return h + '<div style="margin:6px 0">Sign in and verify your email on the Account tab to use the shop.</div></div>';
  if (!wallet) { refreshWallet(); return h + '<div class="mute">Loading your wallet…</div></div>'; }
  if (note) h += '<div class="acok" style="margin:6px 0">' + note + '</div>';
  const now = Date.now(), dis = (id) => { const why = busy ? 'busy' : spendBlock(wallet, id, now); return why ? ' disabled title="' + why + '"' : ''; };
  h += '<div class="mute" style="margin:6px 0">Crystals buy extra boost time and cosmetics. Everything that makes you stronger can also be earned for free, and boosts never stack: a paid Gold rush is the same x2 as a free one.</div>';
  h += '<div class="px" style="font-size:9px;margin:10px 0 4px">Crystals</div>' + SHOP.packs.map((p) => '<div class="it"><div><b>✦ ' + fmtN(p.crystals) + ' Crystals</b>' + (p.bonus ? ' <span class="up">' + p.bonus + '</span>' : '') + '</div><div class="row"><button class="s" data-a="shopPack" data-v="' + p.id + '">' + (m === 'test' ? 'Test: free' : p.price) + '</button></div></div>').join('');
  const pl = paidMinLeft(wallet, now);
  h += '<div class="px" style="font-size:9px;margin:10px 0 4px">Boost time</div><div class="mute" style="margin-bottom:4px">Paid boost time today: ' + pl + ' of ' + SHOP.PAID_MIN_PER_DAY + ' min left (resets at midnight UTC). A paid timer holds up to ' + SHOP.BOOST_CAP_MIN / 60 + ' hours and runs in real time.</div>';
  for (const k of ['gold', 'loot']) { const l = boostLeftMs(wallet, k, now); if (l > 0) h += '<div class="up" style="margin-bottom:4px">' + (k === 'gold' ? 'Gold rush' : 'Lucky find') + ' (paid): ' + left(l) + ' left</div>'; }
  h += SHOP.boosts.map((b) => '<div class="it"><div><b>' + b.n + ' · ' + b.min + ' min</b><small>' + b.d + '</small></div><div class="row"><button class="s" data-a="shopBuy" data-v="' + b.id + '"' + dis(b.id) + '>✦ ' + b.cost + '</button></div></div>').join('');
  h += '<div class="px" style="font-size:9px;margin:10px 0 4px">Cosmetics</div>' + SHOP.cosmetics.map((x) => '<div class="it"><div><b>' + x.n + '</b><small>' + x.d + '</small></div><div class="row">'
    + (owns(x.id) ? '<span class="mute">Owned ✓</span>' : '<button class="s" data-a="shopBuy" data-v="' + x.id + '"' + dis(x.id) + '>✦ ' + x.cost + '</button>') + '</div></div>').join('');
  return h + '</div>';
}
export const shopTop = () => (wallet ? fmtN(wallet.crystals) + ' Crystals' : 'shop');
if (shopMode() === 'test') wallet = cleanWallet(readJson(TEST_KEY)); // the test wallet survives reloads, so paid test boosts keep running
