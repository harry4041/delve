// Gifts from the game's owner via Firestore (read-only for players; written by you in the Firebase console):
//   gifts/global      -> { gifts: [ ... ] }   everyone signed in with a verified email reads this one
//   gifts/<uid>       -> { gifts: [ ... ] }   only that player reads theirs
// A gift: { id:'launch-1', note:'Welcome!', until:<ms epoch, optional>, gold:5000, gems:50,
//           gen:[{ ri:5, il:100, n:3, ty:'weapon' (optional), lv:1..3 (optional) }],          // random items
//           items:[{ ty:'head', ri:4, il:80, lv:1, nm:'Mythic Crown of the Wyrm', st:{ def:490, hp:2857 } }] } // exact items
// Claiming is idempotent: claimed ids live in the synced save (S.giftsClaimed). Everything read from the server is
// validated and clamped here, because the game renders item names as HTML and trusts item stats.
import { S, mode, BASE, RN, W, nextUid, save } from './state.js';
import { gen } from './items.js';
import { cloudState, withFirebase, setAfterSync } from './cloud.js';
import { toast } from './toast.js';

const AT = 'hd-gifts-at', EVERY = 6 * 3600 * 1000;
const MAX_GIFTS = 25, MAX_ITEMS = 100, MAX_TOTAL = 500, MAX_CLAIMED = 300, MAX_GOLD = 1e12, MAX_GEMS = 1e6;
let running = false;

const int = (v, lo, hi) => { const n = Math.floor(+v); return n >= lo && n <= hi ? n : null; };
const has = (o, k) => Object.prototype.hasOwnProperty.call(o, k);

function cleanItem(x) {
  if (!x || typeof x !== 'object') return null;
  const ty = String(x.ty), ri = int(x.ri, 0, RN.length - 1), il = int(x.il, 1, 100000);
  if (!has(BASE, ty) || ri === null || il === null) return null;
  const lv = [1, 2, 3].includes(+x.lv) ? +x.lv : 1;
  const nm = typeof x.nm === 'string' ? x.nm.trim() : '';
  if (!/^[A-Za-z0-9 '’-]{1,48}$/.test(nm)) return null;
  const st = {};
  for (const k of Object.keys(x.st && typeof x.st === 'object' ? x.st : {})) {
    const v = +x.st[k];
    if (has(W, k) && isFinite(v) && v >= 0 && v <= 1e12) st[k] = v;
  }
  return Object.keys(st).length ? { id: nextUid(), ty, ri, lv, il, nm, st } : null;
}

// Returns { items, gold, gems } for a valid gift, or null. `budget.left` caps the total items per claim run.
function redeem(g, budget) {
  const items = [];
  for (const x of (Array.isArray(g.items) ? g.items : []).slice(0, MAX_ITEMS)) {
    if (budget.left <= 0) break;
    const it = cleanItem(x);
    if (it) { items.push(it); budget.left--; }
  }
  for (const spec of (Array.isArray(g.gen) ? g.gen : []).slice(0, 10)) {
    if (!spec || typeof spec !== 'object') continue;
    const ri = int(spec.ri, 0, RN.length - 1), il = int(spec.il, 1, 100000), n = int(spec.n, 1, MAX_ITEMS);
    const ty = has(BASE, String(spec.ty)) ? String(spec.ty) : undefined;
    const lv = [1, 2, 3].includes(+spec.lv) ? +spec.lv : undefined;
    if (ri === null || il === null || n === null) continue;
    for (let i = 0; i < n && budget.left > 0; i++) { items.push(gen(il, ri, ty, undefined, lv)); budget.left--; }
  }
  const gold = Math.min(MAX_GOLD, Math.max(0, Math.floor(+g.gold || 0)));
  const gems = Math.min(MAX_GEMS, Math.max(0, Math.floor(+g.gems || 0)));
  return items.length || gold || gems ? { items, gold, gems } : null;
}

export async function claimGifts(force) {
  const c = cloudState();
  if (!c.user || !c.user.verified || running) return 0;
  if (mode !== 'camp') { setTimeout(() => claimGifts(force), 30000); return 0; } // never change the save mid-run
  if (!force && Date.now() - (+localStorage.getItem(AT) || 0) < EVERY) return 0;
  running = true;
  try {
    const { F, db } = await withFirebase();
    const sources = [['g', 'global'], ['u', c.user.uid]];
    const snaps = await Promise.all(sources.map(([, id]) => F.getDoc(F.doc(db, 'gifts', id))));
    try { localStorage.setItem(AT, String(Date.now())); } catch (e) { /* ignore */ }
    S.giftsClaimed = Array.isArray(S.giftsClaimed) ? S.giftsClaimed : [];
    const budget = { left: MAX_TOTAL }, notes = [];
    let n = 0, nItems = 0, gold = 0, gems = 0;
    snaps.forEach((snap, i) => {
      const list = snap.exists() && Array.isArray(snap.data().gifts) ? snap.data().gifts.slice(0, MAX_GIFTS) : [];
      for (const g of list) {
        if (!g || typeof g !== 'object' || typeof g.id !== 'string' || !/^[\w.-]{1,60}$/.test(g.id)) continue;
        const key = sources[i][0] + ':' + g.id;
        if (S.giftsClaimed.includes(key)) continue;
        if (typeof g.until === 'number' && Date.now() > g.until) continue;
        if (budget.left <= 0) break;
        const r = redeem(g, budget);
        if (!r) continue;
        S.bag.push(...r.items); S.gold = (S.gold || 0) + r.gold; S.gems = (S.gems || 0) + r.gems;
        S.giftsClaimed.push(key); n++; nItems += r.items.length; gold += r.gold; gems += r.gems;
        if (typeof g.note === 'string' && g.note.trim()) notes.push(g.note.trim().slice(0, 120));
      }
    });
    S.giftsClaimed = S.giftsClaimed.slice(-MAX_CLAIMED);
    if (n) {
      save();
      const parts = [];
      if (nItems) parts.push(nItems + ' item' + (nItems > 1 ? 's' : ''));
      if (gold) parts.push(gold + ' gold');
      if (gems) parts.push(gems + ' gems');
      toast('Gift received: ' + parts.join(', ') + (notes.length ? ' - ' + notes[0] : ''));
      window.dispatchEvent(new CustomEvent('hd-cloud', { detail: 'applied' })); // refresh the screen
    }
    return n;
  } finally { running = false; }
}

setAfterSync(() => claimGifts(false)); // check for gifts after each successful sign-in sync (at most every 6 hours)
