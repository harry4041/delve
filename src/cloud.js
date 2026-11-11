// Cloud sync: Firebase Auth (email + password) and one Firestore document per player (saves/<uid>).
// The game stays local-first: localStorage is always written; the cloud copy is a mirror that is only
// touched for signed-in players whose email is verified. The Firebase SDK is loaded lazily.
import { firebaseConfig } from './firebase-config.js';
import { S, mode, load, setSaveHook } from './state.js';

const KEY = 'hollow-delve-2', BACKUP = 'hollow-delve-2-backup', BASE = 'hd-cloud-base', FLAG = 'hd-cloud';
const PUSH_DELAY = 45000; // push at most once per 45 s while playing

// Shared UI state (read by account.js). `conflict` is set when both copies changed.
const st = { ready: false, user: null, busy: false, msg: '', err: '', syncAt: 0, conflict: null, dirty: false };
export const cloudState = () => st;
const emit = (t) => window.dispatchEvent(new CustomEvent('hd-cloud', { detail: t }));
export function setCloudError(msg) { st.err = msg; st.msg = ''; emit('state'); }

let fb = null, timer = 0;

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
  'permission-denied': 'The server refused the save. Verify your email address first.',
  'unavailable': 'Could not reach the server. It will retry.',
};
export function cloudErr(e) {
  const code = e && e.code ? String(e.code).replace('firestore/', '') : '';
  return ERR[code] || 'Something went wrong (' + (code || (e && e.message) || 'unknown') + ').';
}

// ---- save summaries & local helpers ----
const summ = (s) => ({ asc: s.asc || 0, best: s.bestOverall || s.best || 0, gold: s.gold || 0, relics: s.relics || 0, t: s.lastT || 0 });
const isFresh = (s) => !s.bestOverall && !s.best && !s.gold && !s.asc && !(s.bag && s.bag.length) && !Object.keys(s.tr || {}).length;
function readBase() { try { const b = JSON.parse(localStorage.getItem(BASE)); return b && st.user && b.uid === st.user.uid ? b : null; } catch (e) { return null; } }
function writeBase(b) { try { localStorage.setItem(BASE, JSON.stringify(b)); } catch (e) { /* storage unavailable */ } }

// ---- auth state ----
async function onUser(u) {
  st.user = u ? { uid: u.uid, email: u.email, verified: !!u.emailVerified } : null;
  if (!u) { emit('user'); return; }
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
    const { F, db } = await init();
    const snap = await F.getDoc(F.doc(db, 'saves', st.user.uid));
    if (!snap.exists()) { await push(true); return; }
    const c = snap.data(), b = readBase();
    if (isFresh(S)) { applyCloud(c); return; }                         // brand-new device: take the cloud save
    if (b && b.version === c.clientT) { await push(false); return; }   // cloud unchanged since our last sync: send ours
    if (b && b.localT >= (S.lastT || 0)) { applyCloud(c); return; }    // we have not played since last sync: take cloud
    st.conflict = { cloud: c.summary || {}, local: summ(S), data: c.data, version: c.clientT }; // both changed: ask the player
  } catch (e) { st.err = cloudErr(e); } finally { st.busy = false; emit('state'); }
}

async function push(force) {
  const { F, db } = await init(), ref = F.doc(db, 'saves', st.user.uid);
  const data = localStorage.getItem(KEY) || JSON.stringify(S), clientT = Date.now(), b = readBase();
  await F.runTransaction(db, async (tx) => {
    const s = await tx.get(ref);
    if (!force && s.exists() && (!b || s.data().clientT !== b.version)) throw Object.assign(new Error('conflict'), { code: 'hd/conflict' });
    tx.set(ref, { v: 1, data, clientT, summary: summ(JSON.parse(data)), updatedAt: F.serverTimestamp() });
  });
  writeBase({ uid: st.user.uid, version: clientT, localT: S.lastT || 0 });
  st.syncAt = Date.now(); st.dirty = false;
}

function applyCloud(c) {
  try { const cur = localStorage.getItem(KEY); if (cur) localStorage.setItem(BACKUP, cur); } catch (e) { /* ignore */ }
  localStorage.setItem(KEY, c.data);
  load();
  writeBase({ uid: st.user.uid, version: c.clientT, localT: S.lastT || 0 });
  st.syncAt = Date.now(); st.conflict = null; st.dirty = false;
  emit('applied');
}

export async function resolveConflict(which) {
  const c = st.conflict; if (!c) return;
  st.busy = true; st.err = ''; emit('state');
  try {
    if (which === 'cloud') applyCloud({ data: c.data, clientT: c.version });
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
  try { await push(false); emit('state'); }
  catch (e) { if (e.code === 'hd/conflict') await syncNow(); else { st.err = cloudErr(e); emit('state'); } }
}

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
  st.conflict = null; st.dirty = false; st.syncAt = 0;
  try { localStorage.removeItem(FLAG); localStorage.removeItem(BASE); } catch (e) { /* ignore */ }
});

// ---- boot ----
export function cloudBoot() {
  setSaveHook(schedule);
  const leaving = () => { if (st.dirty) flush(); };
  window.addEventListener('pagehide', leaving);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') leaving(); });
  try { if (localStorage.getItem(FLAG) === '1') init().catch(() => { /* offline: stay local */ }); } catch (e) { /* ignore */ }
}

// Test seam: lets tests inject a fake Firebase and drive the sync logic directly.
export const _test = {
  inject(f) { fb = Promise.resolve(f); st.ready = true; },
  onUser, syncNow, push, flush, schedule,
  reset() { Object.assign(st, { user: null, busy: false, msg: '', err: '', syncAt: 0, conflict: null, dirty: false }); if (timer) { clearTimeout(timer); timer = 0; } },
};
