// Account tab: email/password sign-in, verification, cloud-save status and conflict resolution.
import { $ } from './state.js';
import { claimGifts } from './gifts.js';
import { usernameBlock } from './username.js';
import { cloudState, cloudErr, setCloudError, setCloudMessage, syncManual, signUp, signIn, resetPassword, resendVerification, recheckVerified, signOutCloud, resolveConflict } from './cloud.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const when = (t) => (t ? new Date(t).toLocaleString() : 'never');
let email = ''; // remembered across re-renders; the password is never kept

export function accountStatus() {
  const u = cloudState().user;
  return u ? (u.verified ? 'cloud save on' : 'verify email') : 'not signed in';
}

const sumRow = (label, s) => '<div class="it"><div><b>' + label + '</b><small>Ascensions ' + (s.asc || 0) + ' · best stage ' + (s.best || 0)
  + ' · gold ' + esc(Math.floor(s.gold || 0)) + ' · relics ' + (s.relics || 0) + ' · last played ' + when(s.t) + '</small></div></div>';

export function accountTab() {
  const c = cloudState(), u = c.user, off = c.busy ? ' disabled' : '';
  let h = '<div class="box ac"><div class="px" style="font-size:9px;margin-bottom:6px">Account</div>';
  h += '<div class="mute" style="margin-bottom:8px">Sign in to back up your progress and play on other devices. The game always saves on this device too, so it works offline.</div>';
  if (c.err) h += '<div class="acerr">' + esc(c.err) + '</div>';
  if (c.msg) h += '<div class="acok">' + esc(c.msg) + '</div>';
  if (c.busy) h += '<div class="mute">Working…</div>';
  if (!u) {
    h += '<form id="ac-form" autocomplete="on"><label class="mute" for="ac-email">Email</label>'
      + '<input id="ac-email" type="email" inputmode="email" autocomplete="email" value="' + esc(email) + '"' + off + '>'
      + '<label class="mute" for="ac-pass">Password (at least 8 characters)</label>'
      + '<input id="ac-pass" type="password" autocomplete="current-password" minlength="8"' + off + '>'
      + '<div class="row" style="margin-top:8px"><button type="submit"' + off + '>Sign in</button>'
      + '<button type="button" class="alt" data-c="signup"' + off + '>Create account</button>'
      + '<button type="button" class="s alt" data-c="reset"' + off + '>Forgot password</button></div></form>';
  } else {
    h += '<div class="it"><div><b>' + esc(u.email) + '</b><small>' + (u.verified ? 'Email verified' : 'Email not verified yet') + '</small></div>'
      + '<button class="s alt" data-c="signout"' + off + '>Sign out</button></div>';
    if (u.verified) h += usernameBlock(off);
    if (!u.verified) {
      h += '<div class="mute" style="margin:8px 0">Open the link we emailed you, then come back and press the button. Cloud saving starts once your email is verified.</div>'
        + '<div class="row"><button data-c="recheck"' + off + '>I verified my email</button><button class="s alt" data-c="resend"' + off + '>Resend email</button></div>';
    } else if (c.conflict) {
      h += '<div style="margin:8px 0"><b>Two different saves found.</b><div class="mute">Pick the one to keep. The other is replaced.'
        + ' Your current save on this device is backed up first if you choose the cloud one.</div></div>'
        + sumRow('This device', c.conflict.local) + sumRow('Cloud', c.conflict.cloud)
        + '<div class="row" style="margin-top:8px"><button data-c="usecloud"' + off + '>Use cloud save</button><button class="alt" data-c="uselocal"' + off + '>Use this device</button></div>';
    } else {
      h += '<div class="mute" style="margin-top:8px">Cloud save is on. Last synced: ' + when(c.syncAt) + (c.dirty ? ' (changes waiting to upload; it syncs every few minutes)' : '') + '</div>';
      if (c.trimmed) h += '<div class="mute" style="margin-top:4px">The cloud copy left out your ' + c.trimmed + ' lowest-value bag items to stay within the size limit. Your save on this device is complete.</div>';
      h += '<div class="row" style="margin-top:8px"><button class="s alt" data-c="syncnow"' + off + '>Sync now</button><button class="s alt" data-c="gifts"' + off + '>Check for gifts</button></div>';
    }
  }
  return h + '</div>';
}

const vals = () => ({ email: ($('#ac-email') && $('#ac-email').value || '').trim(), pass: ($('#ac-pass') && $('#ac-pass').value) || '' });

async function run(a) {
  const v = vals();
  if (v.email) email = v.email;
  if (a === 'signin') { if (!v.email || !v.pass) return setCloudError('Enter your email and password.'); await signIn(v.email, v.pass); }
  else if (a === 'signup') {
    if (!v.email) return setCloudError('Enter your email address.');
    if (v.pass.length < 8) return setCloudError('Choose a password with at least 8 characters.');
    await signUp(v.email, v.pass);
  }
  else if (a === 'reset') { if (!v.email) return setCloudError('Enter your email address first.'); await resetPassword(v.email); }
  else if (a === 'resend') await resendVerification();
  else if (a === 'recheck') await recheckVerified();
  else if (a === 'signout') await signOutCloud();
  else if (a === 'syncnow') await syncManual();
  else if (a === 'gifts') {
    try { const n = await claimGifts(true); setCloudMessage(n ? 'Gift claimed. Check your bag.' : 'No new gifts right now.'); }
    catch (e) { setCloudError(cloudErr(e)); }
  }
  else if (a === 'usecloud') await resolveConflict('cloud');
  else if (a === 'uselocal') await resolveConflict('local');
}

document.addEventListener('input', (e) => { if (e.target && e.target.id === 'ac-email') email = e.target.value; });
document.addEventListener('submit', (e) => { if (e.target && e.target.id === 'ac-form') { e.preventDefault(); run('signin'); } });
document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('[data-c]'); if (b && !b.disabled) run(b.dataset.c); });
