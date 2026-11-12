// Backpack filter + sort. The gear tab passes its (default-ordered) bag through bpView() and prints bpControls().
// Choices are remembered in localStorage; changing a control resets paging. Changes emit `hd-bp` so main.js re-renders.
import { S, RN, RC, BASE } from './state.js';
import { val, sc } from './items.js';
import { target } from './gear.js';

const KEY = 'hd-bp', PAGE = 60;
const TYPE_NAMES = { head: 'Helmets', chest: 'Chest armour', gloves: 'Gloves', legs: 'Trousers', boots: 'Boots', amulet: 'Amulets', weapon: 'Weapons', shield: 'Shields' };
const SORTS = [
  ['default', 'Default order'], ['price-asc', 'Price: low to high'], ['price-desc', 'Price: high to low'],
  ['rarity-desc', 'Rarity: high to low'], ['rarity-asc', 'Rarity: low to high'],
  ['level-desc', 'Item level: high to low'], ['level-asc', 'Item level: low to high'], ['upgrade', 'Biggest upgrade first'],
];

export const bpState = { ri: 'all', ty: 'all', sort: 'default', limit: PAGE };
try { Object.assign(bpState, JSON.parse(localStorage.getItem(KEY) || '{}'), { limit: PAGE }); } catch (e) { /* first run */ }
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify({ ri: bpState.ri, ty: bpState.ty, sort: bpState.sort })); } catch (e) { /* ignore */ } };

const upgradeOf = (it) => { const o = S.eq[target(it)]; return sc(it.st) - (o ? sc(o.st) : 0); };
const COMPARE = {
  'price-asc': (a, b) => val(a) - val(b) || b.ri - a.ri,
  'price-desc': (a, b) => val(b) - val(a) || b.ri - a.ri,
  'rarity-desc': (a, b) => b.ri - a.ri || (b.lv || 1) - (a.lv || 1) || b.il - a.il,
  'rarity-asc': (a, b) => a.ri - b.ri || (a.lv || 1) - (b.lv || 1) || a.il - b.il,
  'level-desc': (a, b) => b.il - a.il || b.ri - a.ri,
  'level-asc': (a, b) => a.il - b.il || a.ri - b.ri,
  upgrade: (a, b) => upgradeOf(b) - upgradeOf(a),
};

// bag: the items in the order the game would normally show them. Returns the visible page plus counts.
export function bpView(bag) {
  let l = bag;
  if (bpState.ri !== 'all') l = l.filter((it) => it.ri === +bpState.ri);
  if (bpState.ty !== 'all') l = l.filter((it) => it.ty === bpState.ty);
  if (bpState.sort !== 'default' && COMPARE[bpState.sort]) l = l.slice().sort(COMPARE[bpState.sort]);
  return { list: l.slice(0, bpState.limit), matched: l.length, total: bag.length, more: Math.max(0, l.length - bpState.limit) };
}

const opt = (v, label, cur) => '<option value="' + v + '"' + (String(cur) === String(v) ? ' selected' : '') + '>' + label + '</option>';
export function bpControls(view) {
  const rc = {}, tc = {};
  for (const it of S.bag) { rc[it.ri] = (rc[it.ri] || 0) + 1; tc[it.ty] = (tc[it.ty] || 0) + 1; }
  const rarities = opt('all', 'All rarities (' + S.bag.length + ')', bpState.ri) + RN.map((n, i) => rc[i] ? opt(i, n + ' (' + rc[i] + ')', bpState.ri) : '').join('');
  const types = opt('all', 'All types', bpState.ty) + Object.keys(BASE).map((t) => tc[t] ? opt(t, (TYPE_NAMES[t] || t) + ' (' + tc[t] + ')', bpState.ty) : '').join('');
  const sorts = SORTS.map(([v, n]) => opt(v, n, bpState.sort)).join('');
  const active = bpState.ri !== 'all' || bpState.ty !== 'all' || bpState.sort !== 'default';
  const dot = bpState.ri !== 'all' ? '<span style="color:' + RC[bpState.ri] + '">&#9679;</span> ' : '';
  return '<div class="box bp"><div class="row">' + dot
    + '<select data-bp="ri" aria-label="Rarity">' + rarities + '</select>'
    + '<select data-bp="ty" aria-label="Type">' + types + '</select>'
    + '<select data-bp="sort" aria-label="Sort">' + sorts + '</select>'
    + (active ? '<button class="s alt" data-bpa="reset">Clear</button>' : '') + '</div>'
    + '<div class="mute" style="margin-top:4px">' + (active ? 'Showing ' + view.matched + ' of ' + view.total + ' items' : view.total + ' items') + '</div></div>';
}

document.addEventListener('change', (e) => {
  const s = e.target && e.target.closest && e.target.closest('[data-bp]');
  if (!s) return;
  bpState[s.dataset.bp] = s.value; bpState.limit = PAGE; persist();
  window.dispatchEvent(new CustomEvent('hd-bp'));
});
document.addEventListener('click', (e) => {
  const b = e.target && e.target.closest && e.target.closest('[data-bpa]');
  if (!b) return;
  if (b.dataset.bpa === 'more') bpState.limit += PAGE;
  else { Object.assign(bpState, { ri: 'all', ty: 'all', sort: 'default', limit: PAGE }); persist(); }
  window.dispatchEvent(new CustomEvent('hd-bp'));
});
