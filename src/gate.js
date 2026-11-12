// Login gate: the game is only shown to a signed-in player. Until then a sign-in screen covers it (body.gated hides #app).
//   phase 'loading'  a returning player: we are waiting for Firebase Auth to restore the saved session (works offline)
//   phase 'login'    nobody is signed in: email + password form (sign in, create account, forgot password)
//   phase 'game'     signed in: the gate is hidden and the game is shown
// There is no guest mode. This is a client-side gate (the game itself runs in the browser), but a player has to have an account to
// reach it, their progress is tied to that account, and cloud.js keeps one account's local save from leaking into another's.
// The gate does nothing when the page has no #gate element (the test pages), so they can still drive the game directly.
import { cloudState, signIn, signUp, resetPassword } from './cloud.js';
import { setMode } from './state.js';
import { view } from './camp.js';

const LOADING_TIMEOUT = 12000;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function initGate() {
  const el = document.getElementById('gate');
  if (!el) return null;
  let phase = 'login', email = '', note = '', timer = 0;
  try { if (localStorage.getItem('hd-cloud') === '1') phase = 'loading'; } catch (e) { /* ignore */ }

  const splash = () => '<div class="gbox box ac" style="text-align:center"><div class="px" style="font-size:16px;margin:8px 0 12px">Delve</div><div class="mute">Signing you in…</div></div>';
  const login = () => {
    const c = cloudState(), off = c.busy ? ' disabled' : '';
    return '<div class="gbox box ac"><div class="px" style="font-size:16px;margin:4px 0 8px;text-align:center">Delve</div>'
      + '<div class="mute" style="margin-bottom:10px;text-align:center">Sign in to play. Your progress is saved to your account, so you can carry on from any device.</div>'
      + (note ? '<div class="mute" style="margin-bottom:8px">' + esc(note) + '</div>' : '')
      + (c.err ? '<div class="acerr">' + esc(c.err) + '</div>' : '') + (c.msg ? '<div class="acok">' + esc(c.msg) + '</div>' : '') + (c.busy ? '<div class="mute">Working…</div>' : '')
      + '<form id="g-form" autocomplete="on"><label class="mute" for="g-email">Email</label>'
      + '<input id="g-email" type="email" inputmode="email" autocomplete="email" value="' + esc(email) + '"' + off + '>'
      + '<label class="mute" for="g-pass">Password (at least 8 characters)</label>'
      + '<input id="g-pass" type="password" autocomplete="current-password" minlength="8"' + off + '>'
      + '<div class="row" style="margin-top:8px"><button type="submit"' + off + '>Sign in</button><button type="button" class="alt" data-g="signup"' + off + '>Create account</button>'
      + '<button type="button" class="s alt" data-g="reset"' + off + '>Forgot password</button></div></form>'
      + '<div class="mute" style="margin-top:10px;font-size:16px">New here? Choose "Create account". Verify your email afterwards to switch on cloud saves and the leaderboards.</div></div>';
  };

  function show() {
    document.body.classList.toggle('gated', phase !== 'game');
    el.hidden = phase === 'game';
    if (phase !== 'game') el.innerHTML = phase === 'loading' ? splash() : login();
  }
  function enter() { if (phase === 'game') return; phase = 'game'; clearTimeout(timer); show(); setMode('camp'); view(); }

  const sync = () => {
    const c = cloudState();
    if (c.user) { enter(); return; }
    if (phase === 'game') { phase = 'login'; note = ''; setMode('camp'); show(); return; } // signed out (even mid-battle): back to the sign-in screen with the game stopped
    if (phase === 'loading') { if (c.ready) { phase = 'login'; show(); } return; } // Auth answered "nobody": show the form
    show();                                                                       // login: refresh messages / busy state
  };
  window.addEventListener('hd-cloud', sync);
  if (phase === 'loading') timer = setTimeout(() => { if (phase === 'loading') { phase = 'login'; note = 'We could not restore your session yet. Check your connection, then sign in.'; show(); } }, LOADING_TIMEOUT);
  show();

  const vals = () => ({ email: ((document.getElementById('g-email') || {}).value || '').trim(), pass: (document.getElementById('g-pass') || {}).value || '' });
  document.addEventListener('input', (e) => { if (e.target && e.target.id === 'g-email') email = e.target.value; });
  document.addEventListener('submit', (e) => {
    if (!e.target || e.target.id !== 'g-form') return;
    e.preventDefault();
    const v = vals(); email = v.email;
    if (!v.email || !v.pass) { note = 'Enter your email and password.'; show(); return; }
    note = ''; signIn(v.email, v.pass);
  });
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-g]');
    if (!b || b.disabled) return;
    const v = vals(); email = v.email;
    if (b.dataset.g === 'signup') {
      if (!v.email) { note = 'Enter your email address.'; show(); return; }
      if (v.pass.length < 8) { note = 'Choose a password with at least 8 characters.'; show(); return; }
      note = ''; signUp(v.email, v.pass);
    } else if (b.dataset.g === 'reset') {
      if (!v.email) { note = 'Enter your email address first.'; show(); return; }
      note = ''; resetPassword(v.email);
    }
  });
  return { phase: () => phase };
}
