// Cloud sync: Firebase Auth (email + password) and one Firestore document per player (saves/<uid>).
// Local-first: localStorage is always written; the cloud copy is a mirror, only touched for signed-in players
// with a verified email. The Firebase SDK is loaded lazily.
//
// Cost/size controls (Firestore bills per document write, not per byte, but documents are capped at 1 MiB):
//  - pushes are throttled (PUSH_DELAY) and skipped when nothing but the timestamp changed
//  - firestore.rules also refuses writes less than 60 s apart per player
//  - the save is gzip-compressed; if it is still too big the cloud copy drops the lowest-value bag items
import { firebaseConfig } from './firebase-config.js';
import { S, mode, load, setSaveHook } from './state.js';
import { val } from './items.js';

const KEY = 'hollow-delve-2', BACKUP = 'hollow-delve-2-backup', BASE = 'hd-cloud-base', FLAG = 'hd-cloud', OWNER = 'hd-owner', OTHER = 'hollow-delve-2-other-account';
const PUSH_DELAY = 5 * 60 * 1000;  // push at most every 5 minutes while playing
const MIN_GAP = 90 * 1000;         // never push more often than this (server rule enforces 60 s)
let MAX_DATA = 900000;           // chars of encoded save we allow (Firestore hard limit is 1 MiB per document)

// Shared UI state (read by account.js). `conflict` is set when both copies changed.
const st = { ready: false, user: null, busy: false, msg: '', err: '', syncAt: 0, conflict: null, dirty: false, trimmed: 0 };
export const cloudState = () => st;
const emit = (t) => window.dispatchEvent(new CustomEvent('hd-cloud', { detail: t }));
export function setCloudError(msg) { st.err = msg; st.msg = ''; emit('state'); }
export function setCloudMessage(msg) { st.msg = msg; st.err = ''; emit('state'); }

let fb = null, timer = 0, lastPushAt = 0, lastSig = '';
const afterSyncFns = [], afterPushFns = []; // features (gifts, leaderboard) that run after a sync / a successful push
export function setAfterSync(f) { afterSyncFns.push(f); }
export function setAfterPush(f) { afterPushFns.push(f); }
// Firebase Auth restores a returning user with an up-to-date `emailVerified`, but the cached ID token it holds was minted BEFORE they
// verified, so the server-side email_verified claim can stay false for up to an hour: Firestore then refuses writes for a player the
// app shows as verified (the "server refused the request" message). So the first Firestore use per page session forces a token refresh,
// and syncNow retries once with a fresh token if the server still refuses.
let tokenFresh = false;
async function freshToken(f) {
  if (tokenFresh) return;
  const u = f && f.auth && f.auth.currentUser;
  if (!u || !u.getIdToken) return;
  try { await u.getIdToken(true); tokenFresh = true; } catch (e) { /* offline: try again on the next call */ }
}
export const withFirebase = async () => { const f = await init(); await freshToken(f); return f; };

function init() {
  if (!fb) {
    fb = (async () => {
      const [appMod, A, F] = await Promise.all([import('firebase/app'), import('firebase/auth'), import('firebase/firestore')]);
      const app = appMod.initializeApp(firebaseConfig), auth = A.getAuth(app), db = F.getFirestore(app);
      A.onAuthStateChanged(auth, (u) => { onUser(u); });
      st.ready = true;
      return { A, F, auth, db };
    })().catch((e) => { fb = null; throw e; });
  }
  return fb;
}

const ERR = {
  'auth/invalid-email': 'That email address does not look right.',
  'auth/missing-password': 'Enter a password.',
  'auth/weak-password': 'Choose a longer password (at least 6 characters).',
  'auth/email-already-in-use': 'That email already has an account. Try signing in.',
  'auth/invalid-credential': 'Email or password is incorrect.',
  'auth/wrong-password': 'Email or password is incorrect.',
  'auth/user-not-found': 'Email or password is incorrect.',
  'auth/too-many-requests': 'Too many attempts. Wait a few minutes and try again.',
  'auth/network-request-failed': 'Network problem. Check your connection and try again.',
  'auth/operation-not-allowed': 'Email sign-in is not switched on for this game yet.',
  'auth/configuration-not-found': 'Email sign-in is not switched on for this game yet.',
  'permission-denied': 'The server refused the request. Make sure your email is verified, and avoid syncing more than once a minute.',
  'resource-exhausted': 'Cloud saving is busy right now. Your progress is safe on this device and will sync later.',
  'unavailable': 'Could not reach the server. It will retry.',
  'hd/too-big': 'Your save is too large to sync even after trimming. Sell some items and try again.',
  'hd/wait': 'Please wait a minute between syncs.',
};
export function cloudErr(e) {
  const code = e && e.code ? String(e.code).replace('firestore/', '') : '';
  return ERR[code] || 'Something went wrong (' + (code || (e && e.message) || 'unknown') + ').';
}

// ---- save summaries & local helpers ----
const summ = (s) => ({ asc: s.asc || 0, best: s.bestOverall || s.best || 0, gold: s.gold || 0, relics: s.relics || 0, t: s.lastT || 0 });
const isFresh = (s) => !s.bestOverall && !s.best && !s.gold && !s.asc && !(s.bag && s.bag.length) && !Object.keys(s.tr || {}).length;
const sigOf = (json) => json.replace(/"lastT":\d+/, ''); // a save that only differs by timestamp is not worth a write
function readBase() { try { const b = JSON.parse(localStorage.getItem(BASE)); return b && st.user && b.uid === st.user.uid ? b : null; } catch (e) { return null; } }
function writeBase(b) { try { localStorage.setItem(BASE, JSON.stringify(b)); } catch (e) { /* storage unavailable */ } }

// ---- compression (gzip + base64) with a plain fallback; old uncompressed docs (no `enc`) still load ----
const CAN_GZ = typeof CompressionStream !== 'undefined' && typeof DecompressionStream !== 'undefined';
async function gzB64(str) {
  const cs = new CompressionStream('gzip'), w = cs.writable.getWriter();
  w.write(new TextEncoder().encode(str)); w.close();
  const buf = new Uint8Array(await new Response(cs.readable).arrayBuffer());
  let bin = ''; for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
  return btoa(bin);
}
async function unGzB64(b64) {
  const bin = atob(b64), buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  const ds = new DecompressionStream('gzip'), w = ds.writable.getWriter();
  w.write(buf); w.close();
  return await new Response(ds.readable).text();
}
const encodeSave = async (json) => (CAN_GZ ? { enc: 'gz1', data: await gzB64(json) } : { enc: 'raw', data: json });
export const decodeSave = async (doc) => (doc.enc === 'gz1' ? unGzB64(doc.data) : doc.data);

// Shrink the CLOUD copy until it fits by dropping the lowest-value bag items (the local save is never touched).
async function fit(json) {
  let enc = await encodeSave(json), trimmed = 0;
  if (enc.data.length <= MAX_DATA) return { payload: enc, trimmed };
  const obj = JSON.parse(json), orig = obj.bag || [];
  const byValue = orig.slice().sort((a, b) => val(a) - val(b)), drop = new Set();
  for (let i = 0, step = Math.max(1, Math.ceil(orig.length * 0.1)); i < 12 && enc.data.length > MAX_DATA && drop.size < orig.length; i++) {
    for (const it of byValue.slice(drop.size, drop.size + step)) drop.add(it);
    obj.bag = orig.filter((it) => !drop.has(it)); // keeps the original order
    enc = await encodeSave(JSON.stringify(obj)); trimmed = drop.size;
    step = Math.max(1, Math.ceil((orig.length - drop.size) * 0.2));
  }
  if (enc.data.length > MAX_DATA) throw Object.assign(new Error('too big'), { code: 'hd/too-big' });
  return { payload: enc, trimmed };
}

// ---- auth state ----
// The local save belongs to ONE account (OWNER = its uid). When a different account signs in on this device, the old save is set aside
// (kept under OTHER) and the new account starts clean, so one player's progress can never be uploaded to another player's account.
// A save with no owner (made before accounts were required) is adopted by the first account that signs in.
function claimDevice(uid) {
  let owner = null;
  try { owner = localStorage.getItem(OWNER); } catch (e) { /* ignore */ }
  if (owner && owner !== uid) {
    try { const cur = localStorage.getItem(KEY); if (cur) localStorage.setItem(OTHER, cur); localStorage.removeItem(KEY); localStorage.removeItem(BASE); } catch (e) { /* ignore */ }
    load();
  }
  try { localStorage.setItem(OWNER, uid); } catch (e) { /* ignore */ }
}
async function onUser(u) {
  st.user = u ? { uid: u.uid, email: u.email, verified: !!u.emailVerified } : null;
  tokenFresh = false; // a new sign-in state: get a fresh token before the next Firestore call
  if (!u) { emit('user'); return; }
  claimDevice(u.uid);
  try { localStorage.setItem(FLAG, '1'); } catch (e) { /* ignore */ }
  emit('user');
  if (u.emailVerified) await syncNow();
}

// ---- sync ----
async function syncNow() {
  if (!st.user || !st.user.verified) return;
  if (mode !== 'camp') { setTimeout(syncNow, 30000); return; } // never swap saves mid-run
  st.busy = true; st.err = ''; emit('state');
  try {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const { F, db } = await withFirebase();
        const snap = await F.getDoc(F.doc(db, 'saves', st.user.uid));
        if (!snap.exists()) { await push(true); break; }
        const c = snap.data(), b = readBase();
        if (isFresh(S)) { await applyCloud(c); break; }                         // brand-new device: take the cloud save
        if (b && b.version === c.clientT) { await push(false); break; }         // cloud unchanged since our last sync: send ours
        if (b && b.localT >= (S.lastT || 0)) { await applyCloud(c); break; }    // we have not played since last sync: take cloud
        st.conflict = { cloud: c.summary || {}, local: summ(S), doc: c, version: c.clientT }; // both changed: ask the player
        break;
      } catch (e) {
        if (e && e.code === 'permission-denied' && attempt === 0) { tokenFresh = false; continue; } // stale token claim: refresh once and retry
        throw e;
      }
    }
  } catch (e) { st.err = cloudErr(e); } finally {
    st.busy = false; emit('state');
    if (!st.err && !st.conflict) for (const f of afterSyncFns) Promise.resolve().then(f).catch(() => { /* best-effort extras */ });
  }
}

async function push(force) {
  const { F, db } = await withFirebase(), ref = F.doc(db, 'saves', st.user.uid);
  const json = localStorage.getItem(KEY) || JSON.stringify(S), b = readBase(), sig = sigOf(json);
  if (!force && b && sig === lastSig) { st.dirty = false; return 'skipped'; } // nothing meaningful changed: no write
  const { payload, trimmed } = await fit(json), clientT = Date.now();
  await F.runTransaction(db, async (tx) => {
    const s = await tx.get(ref);
    if (!force && s.exists() && (!b || s.data().clientT !== b.version)) throw Object.assign(new Error('conflict'), { code: 'hd/conflict' });
    tx.set(ref, { v: 1, enc: payload.enc, data: payload.data, clientT, summary: summ(JSON.parse(json)), updatedAt: F.serverTimestamp() });
  });
  writeBase({ uid: st.user.uid, version: clientT, localT: S.lastT || 0 });
  st.syncAt = lastPushAt = Date.now(); st.dirty = false; st.trimmed = trimmed; lastSig = sig;
  for (const f of afterPushFns) Promise.resolve().then(f).catch(() => { /* best-effort extras */ });
  return 'pushed';
}

async function applyCloud(c) {
  const json = await decodeSave(c);
  try { const cur = localStorage.getItem(KEY); if (cur) localStorage.setItem(BACKUP, cur); } catch (e) { /* ignore */ }
  localStorage.setItem(KEY, json);
  load();
  writeBase({ uid: st.user.uid, version: c.clientT, localT: S.lastT || 0 });
  lastSig = sigOf(json); st.syncAt = Date.now(); st.conflict = null; st.dirty = false;
  emit('applied');
}

export async function resolveConflict(which) {
  const c = st.conflict; if (!c) return;
  st.busy = true; st.err = ''; emit('state');
  try {
    if (which === 'cloud') await applyCloud(c.doc);
    else { await push(true); st.conflict = null; }
  } catch (e) { st.err = cloudErr(e); } finally { st.busy = false; emit('state'); }
}

function schedule() { // called after every local save
  if (!st.user || !st.user.verified || st.conflict) return;
  st.dirty = true;
  if (!timer) timer = setTimeout(flush, PUSH_DELAY);
}
async function flush() {
  timer = 0;
  if (!st.dirty || !st.user || !st.user.verified || st.conflict) return;
  if (Date.now() - lastPushAt < MIN_GAP) { timer = setTimeout(flush, MIN_GAP); return; }
  try { await push(false); emit('state'); }
  catch (e) {
    if (e.code === 'hd/conflict') await syncNow();
    else { st.err = cloudErr(e); emit('state'); if (e.code !== 'hd/too-big') timer = setTimeout(flush, PUSH_DELAY); }
  }
}

// "Sync now" button
export const syncManual = () => act(async () => {
  if (Date.now() - lastPushAt < MIN_GAP) throw Object.assign(new Error('wait'), { code: 'hd/wait' });
  try { const r = await push(false); st.msg = r === 'skipped' ? 'Already up to date.' : 'Saved to the cloud.'; }
  catch (e) { if (e.code === 'hd/conflict') await syncNow(); else throw e; }
});

// ---- account actions (each returns when done; errors become st.err) ----
async function act(fn) {
  st.busy = true; st.err = ''; st.msg = ''; emit('state');
  try { await fn(await init()); } catch (e) { st.err = cloudErr(e); } finally { st.busy = false; emit('state'); }
}
export const signUp = (email, pw) => act(async ({ A, auth }) => {
  const cr = await A.createUserWithEmailAndPassword(auth, email, pw);
  await A.sendEmailVerification(cr.user);
  st.msg = 'Account created. We sent a verification link to ' + email + '. Open it, then press "I verified my email".';
});
export const signIn = (email, pw) => act(async ({ A, auth }) => { await A.signInWithEmailAndPassword(auth, email, pw); });
export const resetPassword = (email) => act(async ({ A, auth }) => {
  await A.sendPasswordResetEmail(auth, email);
  st.msg = 'If that address has an account, a reset link is on its way.';
});
export const resendVerification = () => act(async ({ A, auth }) => {
  await A.sendEmailVerification(auth.currentUser);
  st.msg = 'Verification email sent again. Check your spam folder too.';
});
export const recheckVerified = () => act(async ({ auth }) => {
  const u = auth.currentUser; if (!u) return;
  await u.reload(); await u.getIdToken(true); // refresh the token so the server sees email_verified
  await onUser(u);
});
export const signOutCloud = () => act(async ({ A, auth }) => {
  await A.signOut(auth);
  if (timer) { clearTimeout(timer); timer = 0; }
  st.conflict = null; st.dirty = false; st.syncAt = 0; st.trimmed = 0; lastSig = '';
  try { localStorage.removeItem(FLAG); localStorage.removeItem(BASE); } catch (e) { /* ignore */ }
});

// ---- boot ----
export function cloudBoot() {
  setSaveHook(schedule);
  const leaving = () => { if (st.dirty && Date.now() - lastPushAt >= MIN_GAP) flush(); };
  window.addEventListener('pagehide', leaving);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leaving(); });
  try { if (!window.__HD_NO_BOOT_INIT && localStorage.getItem(FLAG) === '1') init().catch(() => { /* offline: stay local */ }); } catch (e) { /* ignore */ } // __HD_NO_BOOT_INIT: test seam so a fake Firebase is not raced by the real SDK
}

// Test seam: lets tests inject a fake Firebase and drive the sync logic directly.
export const _test = {
  inject(f) { fb = Promise.resolve(f); st.ready = true; },
  setMax(n) { MAX_DATA = n; },
  onUser, syncNow, push, flush, schedule, fit, encodeSave,
  reset() { Object.assign(st, { user: null, busy: false, msg: '', err: '', syncAt: 0, conflict: null, dirty: false, trimmed: 0 }); lastPushAt = 0; lastSig = ''; if (timer) { clearTimeout(timer); timer = 0; } },
};
