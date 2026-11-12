// Global leaderboards (Firestore collection `lb`, one public document per player who opted in) plus the old local run
// history as a "My runs" sub-tab. Reading is public; writing needs a signed-in, verified player and passes firestore.rules.
//
// Honesty about cheating: the game runs in the player's browser, so scores are self-reported. The rules reject malformed,
// absurd or fast-rising values, throttle writes, forbid values that go down, and let an admin ban an account (create
// `banned/<uid>` in the console) or delete an entry. They cannot prove that a stage was really reached.
import { S } from './state.js';
import { powerLevel, petStars, fmtN } from './stats.js';
import { cloudState, withFirebase, setAfterSync, setAfterPush, cloudErr } from './cloud.js';
import { lbTab as runsTab } from './vault-leaderboard.js';
import { toast } from './toast.js';

export const BOARDS = [
  { k: 'stage', n: 'Deepest stage', f: 'stage', unit: 'stage' },
  { k: 'power', n: 'Power level', f: 'power', unit: 'power' },
  { k: 'asc', n: 'Ascensions', f: 'asc', unit: 'ascensions' },
  { k: 'stars', n: 'Pet stars', f: 'stars', unit: 'stars' },
];
const TTL = 10 * 60e3, PUBLISH_EVERY = 10 * 60e3, REFRESH_MIN = 60e3, LIMIT = 25, AT = 'hd-lb-pub';
const NAME_RE = /^[A-Za-z0-9 _.'-]{3,18}$/;
const BAD = ['fuck', 'shit', 'cunt', 'nigg', 'nazi', 'hitler', 'whore', 'slut', 'bitch']; // unambiguous words only; the real tools are `banned/<uid>` and deleting entries
// Known tradeoff: substring matching also blocks names that merely contain a listed word (e.g. "Scunthorpe"); the player can pick another name.
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's' };
const ui = { sub: 'stage', loading: false, err: '', msg: '' };
const cache = {}; // board key -> { t, rows }
const emit = () => window.dispatchEvent(new CustomEvent('hd-lb'));

export function validName(raw) {
  const n = String(raw || '').trim().replace(/\s+/g, ' ');
  if (!NAME_RE.test(n)) return { ok: false, why: 'Use 3-18 letters, numbers, spaces or . _ \' -' };
  const flat = n.toLowerCase().replace(/[013457 8@$]/g, (c) => LEET[c] || '').replace(/[^a-z]/g, '');
  if (BAD.some((w) => flat.includes(w))) return { ok: false, why: 'Please pick a different name.' };
  return { ok: true, name: n };
}
export function snapshot() {
  return { v: 1, name: S.lbName, stage: Math.max(0, Math.floor(S.bestOverall || S.best || 0)), power: Math.max(0, Math.floor(powerLevel())), asc: Math.max(0, Math.floor(S.asc || 0)), stars: Math.max(0, Math.floor(petStars())) };
}

let lastSig = '', lastAt = 0, known = null; // known: this account's entry as last read or written; stage/asc/stars in it can never fall (firestore.rules)
try { lastAt = +localStorage.getItem(AT) || 0; } catch (e) { /* ignore */ }
export function resetPublishState() { lastSig = ''; lastAt = 0; known = null; } // for tests and for switching accounts
export async function publish(force) {
  const c = cloudState();
  if (!c.user || !c.user.verified || !S.lbName) return 'skipped';
  const e = snapshot(), sig = JSON.stringify(e);
  if (!force && (Date.now() - lastAt < PUBLISH_EVERY || sig === lastSig)) return 'skipped';
  const { F, db } = await withFirebase(), ref = F.doc(db, 'lb', c.user.uid);
  // The rules never let stage, ascensions or pet stars fall, so after a "Reset save" (or on a second device) publish the best of what is
  // already on the board and what this save has: a reset game keeps its old leaderboard entry until it overtakes it.
  if (!known || known.uid !== c.user.uid) { const d = await F.getDoc(ref); known = { uid: c.user.uid, ...(d.exists() ? d.data() : {}) }; }
  const m = { ...e, stage: Math.max(e.stage, known.stage || 0), asc: Math.max(e.asc, known.asc || 0), stars: Math.max(e.stars, known.stars || 0) };
  if (!force && ['name', 'stage', 'power', 'asc', 'stars'].every((k) => m[k] === known[k])) { lastSig = sig; return 'skipped'; } // nothing new to say: save a write
  await F.setDoc(ref, { ...m, t: F.serverTimestamp() });
  known = { uid: c.user.uid, ...m };
  lastSig = sig; lastAt = Date.now();
  try { localStorage.setItem(AT, String(lastAt)); } catch (err) { /* ignore */ }
  return 'published';
}

export async function loadBoard(key, force) {
  const b = BOARDS.find((x) => x.k === key), c = cache[key];
  if (c && (!force || Date.now() - c.t < REFRESH_MIN) && Date.now() - c.t < TTL) return c;
  const { F, db } = await withFirebase();
  const snap = await F.getDocs(F.query(F.collection(db, 'lb'), F.orderBy(b.f, 'desc'), F.limit(LIMIT)));
  return (cache[key] = { t: Date.now(), rows: snap.docs.map((d) => ({ uid: d.id, ...d.data() })) });
}
export function clearCache() { for (const k in cache) delete cache[k]; }

function ensureLoaded() {
  if (ui.sub === 'runs' || ui.loading) return;
  const c = cache[ui.sub];
  if (c && Date.now() - c.t < TTL) return;
  ui.loading = true; ui.err = '';
  loadBoard(ui.sub).catch((e) => { ui.err = cloudErr(e); }).finally(() => { ui.loading = false; emit(); });
}

// Publishing is refused by firestore.rules (permission-denied) for several different reasons; say the one that most likely applies.
function pubErr(e) {
  if (!(e && e.code === 'permission-denied')) return cloudErr(e);
  const c = cloudState(), wait = 5 * 60e3 - (Date.now() - lastAt);
  if (c.user && !c.user.verified) return 'Verify your email on the Account tab to join the leaderboards.';
  if (wait > 0) return 'Entries can only be updated every 5 minutes. Please try again in about ' + Math.ceil(wait / 60e3) + ' min.';
  return 'The leaderboard did not accept these scores. A new entry can start at up to stage 300, power 500,000, 60 ascensions and 60 pet stars, and scores can only rise at a realistic pace. Try again in a few minutes.';
}
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const medal = (i) => (i === 0 ? '#ffd34d' : i === 1 ? '#cfd6e6' : i === 2 ? '#d9955a' : 'var(--mute)');

function joinBlock() {
  const c = cloudState();
  if (!c.user) return '<div class="mute">Sign in on the Account tab and verify your email to put yourself on the boards. You can always view them.</div>';
  if (!c.user.verified) return '<div class="mute">Verify your email (Account tab) to join the boards.</div>';
  if (!S.lbName) {
    return '<div class="mute" style="margin-bottom:4px">Join with a public name. Only the name and your four scores are shown, never your email.</div>'
      + '<form id="lb-form" class="row"><input id="lb-name" maxlength="18" placeholder="Your name" autocomplete="off" style="font:inherit;padding:6px;border:3px solid var(--ink);background:var(--bg);color:var(--ink);min-width:0;flex:1">'
      + '<button type="submit" class="s">Join</button></form>';
  }
  return '<div class="row sp"><span>On the boards as <b>' + esc(S.lbName) + '</b></span><span class="row"><button class="s alt" data-lbr="refresh">Refresh</button><button class="s alt" data-lbl="leave">Leave</button></span></div>';
}
function boardTable(b) {
  const c = cache[b.k];
  if (!c) return '<div class="mute">' + (ui.loading ? 'Loading…' : '') + '</div>';
  if (!c.rows.length) return '<div class="mute">Nobody is on this board yet. Be the first!</div>';
  const me = cloudState().user;
  let h = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse"><tr style="text-align:left;border-bottom:2px solid var(--ink)"><th>#</th><th>Player</th><th style="text-align:right">' + b.n + '</th></tr>';
  c.rows.forEach((r, i) => {
    const you = me && r.uid === me.uid;
    h += '<tr style="border-bottom:1px dotted var(--mute);' + (you ? 'background:color-mix(in srgb,var(--panel) 75%,var(--gold));' : '') + '"><td style="color:' + medal(i) + '"><b>' + (i + 1) + '</b></td><td>' + esc(r.name) + (you ? ' <span class="mute">(you)</span>' : '') + '</td><td style="text-align:right"><b>' + fmtN(r[b.f] || 0) + '</b></td></tr>';
  });
  h += '</table></div>';
  const mine = S.lbName && cloudState().user && c.rows.findIndex((r) => r.uid === cloudState().user.uid);
  if (S.lbName && mine === -1) h += '<div class="mute" style="margin-top:6px">You are not in the top ' + LIMIT + ' yet. Your value: ' + fmtN(snapshot()[b.f]) + '.</div>';
  return h + '<div class="mute" style="margin-top:6px">Top ' + LIMIT + ', refreshed every few minutes.</div>';
}
export function leaderboardTab() {
  ensureLoaded();
  let h = '<div class="box lb"><div class="px" style="font-size:9px;margin-bottom:6px">Leaderboards</div><div class="tabs" style="margin-bottom:8px">'
    + BOARDS.map((b) => '<button class="s' + (ui.sub === b.k ? '' : ' alt') + '" data-lbt="' + b.k + '">' + b.n + '</button>').join('')
    + '<button class="s' + (ui.sub === 'runs' ? '' : ' alt') + '" data-lbt="runs">My runs</button></div>';
  if (ui.msg) h += '<div class="acok">' + esc(ui.msg) + '</div>';
  if (ui.err) h += '<div class="acerr">' + esc(ui.err) + '</div>';
  if (ui.sub === 'runs') return h + '</div>' + runsTab();
  h += '<div style="margin-bottom:8px">' + joinBlock() + '</div>' + boardTable(BOARDS.find((b) => b.k === ui.sub))
    + '<div class="mute" style="margin-top:8px;font-size:16px">Scores come from each player\'s own game, so they cannot be fully verified. Impossible entries are removed.</div></div>';
  return h;
}

// ---- interaction ----
document.addEventListener('click', async (e) => {
  const t = e.target && e.target.closest;
  if (!t) return;
  const tab = e.target.closest('[data-lbt]');
  if (tab) { ui.sub = tab.dataset.lbt; ui.err = ''; ui.msg = ''; emit(); return; }
  const rf = e.target.closest('[data-lbr]');
  if (rf) { ui.loading = true; emit(); try { await publish(true).catch(() => {}); clearCache(); await loadBoard(ui.sub, true); } catch (err) { ui.err = cloudErr(err); } ui.loading = false; emit(); return; }
  const lv = e.target.closest('[data-lbl]');
  if (lv) {
    try {
      const c = cloudState(), { F, db } = await withFirebase();
      await F.deleteDoc(F.doc(db, 'lb', c.user.uid));
      S.lbName = null; lastSig = ''; known = null; clearCache(); ui.msg = 'You have left the leaderboards.';
    } catch (err) { ui.err = cloudErr(err); }
    emit();
  }
});
document.addEventListener('submit', async (e) => {
  if (!e.target || e.target.id !== 'lb-form') return;
  e.preventDefault();
  const v = validName(document.getElementById('lb-name').value);
  if (!v.ok) { ui.err = v.why; emit(); return; }
  S.lbName = v.name; ui.err = ''; ui.msg = '';
  try { await publish(true); clearCache(); ui.msg = 'You are on the boards!'; toast('Joined the leaderboards as ' + v.name); }
  catch (err) { S.lbName = null; ui.err = pubErr(err); }
  emit();
});

setAfterSync(() => publish(false));
setAfterPush(() => publish(false));
