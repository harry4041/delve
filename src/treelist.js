// List view of the skill webs (Upgrades, Magic, Pets): EVERY upgrade, what it does, what you have, what it needs and its price, like the original
// plain list. Upgrades whose prerequisites are not met yet are dimmed and say what they need; "Hide locked" tucks them away (the web hides them
// the same way). It buys through the same `data-a="tr"` action. The web is still one tap away.
// View mode and list options are remembered in localStorage (hd-tv, hd-tl).
import { S } from './state.js';
import { L, fmtN } from './stats.js';
import { MAGIC_K, NODE, NODEC, can, cost } from './skilltree.js';
import { hasMagic } from './ascension.js';
import { treeVal } from './gear.js';

const MODE = 'hd-tv', OPTS = 'hd-tl';
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const emit = () => window.dispatchEvent(new CustomEvent('hd-tree'));

export function treeMode() { try { return localStorage.getItem(MODE) === 'web' ? 'web' : 'list'; } catch (e) { return 'list'; } } // list is the default
export function setTreeMode(m) { try { localStorage.setItem(MODE, m === 'web' ? 'web' : 'list'); } catch (e) { /* ignore */ } }
const QTY = 'hd-bq'; // how many levels one Buy press gets: 1, 5 or 10 (a per-device preference, not part of the save)
export function buyQty() { try { const v = +localStorage.getItem(QTY); return v === 5 || v === 10 ? v : 1; } catch (e) { return 1; } }
export function setBuyQty(q) { try { localStorage.setItem(QTY, String(q === 5 || q === 10 ? q : 1)); } catch (e) { /* ignore */ } }
// What a Buy press would do right now: up to the chosen quantity, stopping at the maximum level or when gold runs out. cnt = levels, tot = their total price.
export function bulk(n) {
  const q = buyQty(), l = L(n.k); let cnt = 0, tot = 0;
  for (let i = 0; i < q && l + i < n.m; i++) { const c = Math.round(n.b * Math.pow(n.g, l + i)); if (!Number.isFinite(c) || S.gold < tot + c) break; tot += c; cnt++; }
  return { cnt, tot };
}
export function buyLabel(n) { const b = bulk(n); return b.cnt > 1 ? '×' + b.cnt + ' · ' + fmtN(b.tot) + 'g' : fmtN(cost(n)) + 'g'; }
const defaults = { f: 'all', s: 'tree', locked: true }; // filter: all | buy | owned; sort: tree | cost; locked: show the upgrades that are not available yet (default: yes)
function opts() { try { const o = JSON.parse(localStorage.getItem(OPTS) || '{}'); return { ...defaults, ...(['all', 'buy', 'owned'].includes(o.f) ? { f: o.f } : {}), ...(o.s === 'cost' ? { s: 'cost' } : {}), ...(o.locked === false ? { locked: false } : {}) }; } catch (e) { return { ...defaults }; } }
function setOpts(o) { try { localStorage.setItem(OPTS, JSON.stringify(o)); } catch (e) { /* ignore */ } }

function info(k) {
  const n = NODE[k], l = L(k), mx = l >= n.m, ok = can(n), magic = MAGIC_K.includes(k) && !hasMagic(), c = cost(n), blocked = magic || !ok;
  return { k, n, l, mx, ok, magic, c, blocked, aff: !blocked && !mx && S.gold >= c, visible: l > 0 || ok };
}

function row(it, col) {
  const { k, n, l, mx, ok, magic, c, blocked, aff } = it;
  const lvl = n.m >= 999 ? 'Lv ' + l : n.m > 1 ? l + '/' + n.m : (l ? 'owned' : '');
  const eff = l > 0 ? treeVal(k) : '';
  const reqs = Object.entries(n.r).filter(([q, v]) => L(q) < v).map(([q, v]) => esc(NODE[q].n) + ' ' + v).join(', ');
  const need = magic ? 'Needs the Arcane Awakening relic' : (!ok && reqs ? 'Needs: ' + reqs : '');
  return '<div class="it tl' + (aff ? ' aff' : '') + (blocked && !l ? ' lk' : '') + '" style="border-left:4px solid var(' + col + ');padding-left:8px">'
    + '<div style="min-width:0"><b>' + esc(n.n) + '</b> <span class="mute">' + lvl + '</span><small>' + esc(n.d) + (eff ? ' <span style="color:var(--c1)">' + esc(eff) + '</span>' : '')
    + (need ? '<br><span style="color:var(--hp)">' + need + '</span>' : '') + '</small></div>'
    + '<div class="row" style="flex:none">' + (mx ? '<span class="mute">Max</span>' : '<button class="s' + (aff ? '' : ' alt') + '" data-a="tr" data-v="' + k + '"' + (blocked || S.gold < c ? ' disabled' : '') + '>' + buyLabel(n) + '</button>') + '</div></div>';
}

export function viewToggle(mode) {
  return '<div class="tabs" style="margin:0 0 8px"><button class="s' + (mode === 'list' ? '' : ' alt') + '" data-tm="list">List</button><button class="s' + (mode === 'web' ? '' : ' alt') + '" data-tm="web">Web</button>'
    + '<span class="mute" style="margin:0 4px 0 12px">Buy</span>' + [1, 5, 10].map((q) => '<button class="s' + (buyQty() === q ? '' : ' alt') + '" data-tq="' + q + '" aria-label="Buy ' + q + ' at a time">x' + q + '</button>').join('') + '</div>';
}

export function treeList(G) {
  const o = opts(), colOf = (k, arm) => NODEC[k] || (arm ? arm.c : '--c2');
  const groups = [];
  if (G.hub && NODE[G.hub]) groups.push({ name: 'Core', col: '--c2', keys: [G.hub] });
  for (const a of G.arms) groups.push({ name: a.n, col: a.c, keys: a.ks, arm: a });
  const all = groups.flatMap((g) => g.keys.map((k, i) => ({ ...info(k), g, i }))); // i = fixed position in the arm: the default order never depends on prices, so rows do not jump after a purchase
  const vis = all.filter((x) => x.visible), hidden = all.filter((x) => !x.visible);
  const nBuy = vis.filter((x) => x.aff).length, nOwned = vis.filter((x) => x.l > 0).length;
  const pass = (x) => (o.f === 'buy' ? x.aff : o.f === 'owned' ? x.l > 0 : true);
  let h = '<div class="box tlist"><div class="row sp" style="flex-wrap:wrap;gap:6px"><span class="mute">' + fmtN(S.gold) + ' gold · <b style="color:var(--gold)">' + nBuy + '</b> you can buy now</span></div>'
    + '<div class="tabs" style="margin:8px 0">'
    + [['all', 'All (' + (o.locked ? all.length : vis.length) + ')'], ['buy', 'Can buy (' + nBuy + ')'], ['owned', 'Owned (' + nOwned + ')']].map(([f, t]) => '<button class="s' + (o.f === f ? '' : ' alt') + '" data-tf="' + f + '">' + t + '</button>').join('')
    + '<button class="s' + (o.s === 'cost' ? '' : ' alt') + '" data-ts="cost">Cheapest first</button>'
    + (hidden.length ? '<button class="s alt" data-tl="1">' + (o.locked ? 'Hide' : 'Show') + ' locked (' + hidden.length + ')</button>' : '') + '</div>';
  const show = (x) => (o.locked || x.visible) && pass(x);
  if (o.s === 'cost') {
    const rows = all.filter(show).sort((a, b) => (a.mx - b.mx) || (a.blocked - b.blocked) || (a.c - b.c));
    h += rows.length ? rows.map((x) => row(x, colOf(x.k, x.g.arm))).join('') : '<div class="mute" style="padding:6px 0">Nothing matches this filter.</div>';
  } else {
    let any = false;
    for (const g of groups) {
      const rows = all.filter((x) => x.g === g && show(x)).sort((a, b) => (depOf(a.k) - depOf(b.k)) || (a.i - b.i));
      const lockedHere = all.filter((x) => x.g === g && !x.visible).length;
      if (!rows.length && !(lockedHere && !o.locked && o.f === 'all')) continue;
      any = any || rows.length > 0;
      h += '<div class="px" style="font-size:9px;margin:10px 0 4px;color:var(' + g.col + ')">' + esc(g.name) + '</div>' + rows.map((x) => row(x, colOf(x.k, g.arm))).join('')
        + (lockedHere && !o.locked && o.f === 'all' ? '<div class="mute" style="padding:4px 0 0 12px;font-size:16px">+ ' + lockedHere + ' more unlock as you buy the ones above</div>' : '');
    }
    if (!any) h += '<div class="mute" style="padding:6px 0">Nothing matches this filter.</div>';
  }
  return h + '</div>';
}
function depOf(k) { const n = NODE[k]; return Object.keys(n.r).length ? 1 + Math.max(...Object.keys(n.r).map(depOf)) : 0; }

document.addEventListener('click', (e) => {
  const t = e.target && e.target.closest ? e.target : null;
  if (!t) return;
  const m = t.closest('[data-tm]');
  if (m) { setTreeMode(m.dataset.tm); emit(); return; }
  const bq = t.closest('[data-tq]');
  if (bq) { setBuyQty(+bq.dataset.tq); emit(); return; }
  const f = t.closest('[data-tf]');
  if (f) { setOpts({ ...opts(), f: f.dataset.tf }); emit(); return; }
  const s = t.closest('[data-ts]');
  if (s) { const o = opts(); setOpts({ ...o, s: o.s === 'cost' ? 'tree' : 'cost' }); emit(); return; }
  const l = t.closest('[data-tl]');
  if (l) { const o = opts(); setOpts({ ...o, locked: !o.locked }); emit(); }
});
