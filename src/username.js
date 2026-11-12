// Usernames: one unique public name per verified account, shown on the leaderboards and findable in the Firebase console.
//   usernames/<lowercase name>  {uid, name, t}   doc id IS the name (unique; open it in the console to see the owner's uid)
//   users/<uid>                 {v, name, lower, t}   the player's own record (no email: look the uid up in Authentication)
// A claim is one transaction (check the name is free, write both docs, release the old name). firestore.rules enforce the shape,
// that a name can only be claimed by its owner, and that a leaderboard entry may only use the owner's username.
import { S, save } from './state.js';
import { cloudState, withFirebase, cloudErr, setCloudError, setCloudMessage, setAfterSync } from './cloud.js';
import { toast } from './toast.js';

export const USERNAME_RE = /^[A-Za-z0-9_.-]{3,18}$/;
const BAD = ['fuck', 'shit', 'cunt', 'nigg', 'nazi', 'hitler', 'whore', 'slut', 'bitch']; // unambiguous words only; the real tools are `banned/<uid>` and deleting entries
// Known tradeoff: substring matching also blocks names that merely contain a listed word (e.g. "Scunthorpe"); the player can pick another name.
const RESERVED = ['admin', 'administrator', 'moderator', 'mod', 'support', 'system', 'delve', 'official', 'null', 'undefined', 'anonymous'];
const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 7: 't', 8: 'b', '@': 'a', $: 's' };
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const changeFns = [];
export function onUsernameChange(f) { changeFns.push(f); }
const emit = () => window.dispatchEvent(new CustomEvent('hd-lb'));

export function validUsername(raw) {
  const n = String(raw || '').trim();
  if (!USERNAME_RE.test(n)) return { ok: false, why: 'Use 3-18 letters, numbers, dots, dashes or underscores (no spaces).' };
  const flat = n.toLowerCase().replace(/[013457 8@$]/g, (c) => LEET[c] || '').replace(/[^a-z]/g, '');
  if (BAD.some((w) => flat.includes(w))) return { ok: false, why: 'Please pick a different username.' };
  if (RESERVED.includes(n.toLowerCase())) return { ok: false, why: 'That username is reserved.' };
  return { ok: true, name: n };
}

// Claim (or change to) a username. Throws an Error with .code: username-invalid | username-unverified | username-taken | a Firestore code.
export async function claimUsername(raw) {
  const v = validUsername(raw);
  if (!v.ok) throw Object.assign(new Error(v.why), { code: 'username-invalid', why: v.why });
  const c = cloudState();
  if (!c.user || !c.user.verified) throw Object.assign(new Error('verify'), { code: 'username-unverified' });
  const { F, db } = await withFirebase(), uid = c.user.uid, lower = v.name.toLowerCase();
  await F.runTransaction(db, async (tx) => {
    const nameRef = F.doc(db, 'usernames', lower), meRef = F.doc(db, 'users', uid);
    const [owner, me] = [await tx.get(nameRef), await tx.get(meRef)];
    if (owner.exists() && owner.data().uid !== uid) throw Object.assign(new Error('taken'), { code: 'username-taken' });
    const old = me.exists() ? me.data().lower : null;
    tx.set(nameRef, { uid, name: v.name, t: F.serverTimestamp() });
    tx.set(meRef, { v: 1, name: v.name, lower, t: F.serverTimestamp() });
    if (old && old !== lower) tx.delete(F.doc(db, 'usernames', old)); // release the previous name
  });
  S.username = v.name; save();
  changeFns.forEach((f) => { try { f(); } catch (e) { /* ignore */ } });
  emit();
  return v.name;
}

// After a cloud sync the server is the source of truth for the username (a save from another account must not leak its name).
export async function loadUsername() {
  const c = cloudState();
  if (!c.user || !c.user.verified) return;
  const { F, db } = await withFirebase();
  const d = await F.getDoc(F.doc(db, 'users', c.user.uid));
  const name = d.exists() && typeof d.data().name === 'string' && USERNAME_RE.test(d.data().name) ? d.data().name : '';
  if (name !== S.username) { S.username = name; save(); emit(); }
}

export function usernameMessage(e) {
  const code = e && e.code;
  if (code === 'username-invalid') return e.why;
  if (code === 'username-taken') return 'That username is taken. Try another one.';
  if (code === 'username-unverified') return 'Verify your email first, then choose a username.';
  if (code === 'permission-denied') return 'The server did not accept that username. Your email must be verified, and a username can only be changed once a minute.';
  return cloudErr(e);
}

// Account-tab section (only for a verified, signed-in player).
export function usernameBlock(off) {
  const c = cloudState();
  if (!c.user || !c.user.verified) return '';
  return '<div class="it" style="margin-top:8px"><div><b>Username</b><small>'
    + (S.username ? 'You are <b>' + esc(S.username) + '</b>. It is shown on the leaderboards, and it lets support find your account.'
      : 'Choose a public username (3-18 letters, numbers, dots, dashes or underscores). It is shown on the leaderboards and lets support find your account.')
    + '</small></div></div>'
    + '<form id="un-form" class="row" style="gap:6px;margin-top:4px"><input id="un-name" maxlength="18" autocomplete="off" placeholder="' + (S.username ? 'New username' : 'Username')
    + '" style="font:inherit;padding:6px;border:3px solid var(--ink);background:var(--bg);color:var(--ink);min-width:0;flex:1"' + (off || '') + '>'
    + '<button type="submit" class="s"' + (off || '') + '>' + (S.username ? 'Change' : 'Save') + '</button></form>';
}

document.addEventListener('submit', async (e) => {
  if (!e.target || e.target.id !== 'un-form') return;
  e.preventDefault();
  const el = document.getElementById('un-name');
  try { const n = await claimUsername(el ? el.value : ''); setCloudMessage('Your username is now ' + n + '.'); toast('Username set: ' + n); }
  catch (err) { setCloudError(usernameMessage(err)); }
});

setAfterSync(() => loadUsername().catch(() => {}));
