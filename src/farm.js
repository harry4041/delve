// Pet farm: owned pets that are NOT the active battle pet rest on the farm and work for you, in real time, so they
// earn while you battle and while you are away. Income is banked in S.farm ({t,gold,gems}) and collected by hand.
// Each settle credits at most FARM_CAP_H hours, so an absence longer than that stops paying (the usual idle-game cap).
import { S, PET } from './state.js';
import { idleKg, fmtN } from './stats.js';
import { PET_SPR } from './render.js';

export const FARM_CAP_H = 8;
const GOLD_PER_HOUR = 120; // x idleKg() (which already follows your deepest stage, Greed and ascension gold)

// Resting pets with their hourly output. farm.g scales gold, farm.gem is gems per hour.
export function farmRates() {
  const pets = [];
  let gold = 0, gems = 0;
  PET.forEach((P, i) => {
    const p = S.pets && S.pets[i];
    if (!p || !p.own || i === S.ap) return;
    const lvl = 1 + .2 * (p.lvl || 0), star = 1 + .5 * (p.star || 0);
    const g = GOLD_PER_HOUR * idleKg() * P.farm.g * lvl * star, gm = P.farm.gem * star;
    pets.push({ i, gold: g, gems: gm }); gold += g; gems += gm;
  });
  return { gold, gems, pets };
}

const fresh = (now) => ({ t: now, gold: 0, gems: 0 });
// What is waiting right now (bank plus work done since the last settle). Does not change anything.
export function farmPending(now = Date.now()) {
  const f = S.farm || fresh(now), hrs = Math.max(0, Math.min(now - f.t, FARM_CAP_H * 3600e3)) / 3600e3, r = farmRates();
  return { gold: f.gold + r.gold * hrs, gems: f.gems + r.gems * hrs, rates: r };
}
// Move the work done so far into the bank. Call before anything that changes who is resting.
export function farmSettle(now = Date.now()) {
  const p = farmPending(now);
  S.farm = { t: Math.max(now, 0), gold: p.gold, gems: p.gems };
  return S.farm;
}
export function farmCollect(now = Date.now()) {
  farmSettle(now);
  const g = Math.floor(S.farm.gold), gm = Math.floor(S.farm.gems);
  S.gold += g; S.gems = (S.gems || 0) + gm;
  S.farm.gold -= g; S.farm.gems -= gm;
  return { gold: g, gems: gm };
}

// ---- UI ----
const iconCache = {};
export function petIcon(i) {
  const P = PET[i];
  if (iconCache[P.k]) return iconCache[P.k];
  const m = PET_SPR[P.k], c = document.createElement('canvas'), S3 = 3;
  c.width = 11 * S3; c.height = 8 * S3;
  const g = c.getContext('2d'), ox = Math.floor((11 - m[0].length) / 2), oy = 8 - m.length;
  const shade = (h, f) => { const n = parseInt(h.slice(1), 16), a = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f)))); return '#' + a.map((v) => v.toString(16).padStart(2, '0')).join(''); };
  const pal = { o: '#1a0f24', b: P.k === 'coin' ? '#2a2438' : P.c, h: shade(P.k === 'coin' ? '#6a5f88' : P.c, 1.45), d: shade(P.c, .7), e: '#fff', w: '#f4f0ff', y: '#ffd34d', f: '#ff9a2e' };
  for (let j = 0; j < m.length; j++) for (let k = 0; k < m[j].length; k++) { const ch = m[j][k]; if (ch !== '.' && pal[ch]) { g.fillStyle = pal[ch]; g.fillRect((ox + k) * S3, (oy + j) * S3, S3, S3); } }
  return (iconCache[P.k] = c.toDataURL());
}
const rateText = (r) => '+' + fmtN(r.gold) + ' gold/hr' + (r.gems >= .005 ? ', +' + r.gems.toFixed(2) + ' gems/hr' : '');
export function pendingText() {
  const p = farmPending();
  return 'Ready: ' + fmtN(p.gold) + ' gold' + (p.gems >= 1 ? ' + ' + Math.floor(p.gems) + ' gems' : '');
}
export function farmHtml() {
  const p = farmPending(), r = p.rates;
  let h = '<div class="box" id="farm"><div class="row sp"><b>Pet farm</b><span class="mute" id="farm-pend">' + pendingText() + '</span></div>'
    + '<div class="mute" style="margin:4px 0">Pets you own but are not using in battle rest here and work for you, even while you are away (up to ' + FARM_CAP_H + ' hours per visit).</div>';
  if (!r.pets.length) h += '<div class="mute">No pets are resting. Buy another pet or send your active one out, and the rest go to work.</div>';
  else h += r.pets.map((e) => { const P = PET[e.i]; return '<div class="it"><div class="row"><img src="' + petIcon(e.i) + '" alt="" style="width:44px;height:32px;image-rendering:pixelated"><div><b style="color:' + P.c + '">' + P.n + '</b><small>' + P.farm.n + ': ' + rateText(e) + '</small></div></div></div>'; }).join('')
    + '<div class="row sp" style="margin-top:6px"><span class="mute">Together: ' + rateText(r) + '</span></div>';
  h += '<div class="row" style="margin-top:6px"><button class="s" data-a="farmCollect"' + (p.gold < 1 && p.gems < 1 ? ' disabled' : '') + '>Collect</button></div></div>';
  return h;
}
// keep the "Ready" line live while the Pets tab is open
setInterval(() => { const el = document.getElementById('farm-pend'); if (el) el.textContent = pendingText(); }, 2000);
