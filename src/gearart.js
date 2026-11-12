// Worn gear, drawn from scratch for the character bodies (see drawFigure in render.js). One design per base item type, in the same
// FINE pixels as the bodies (1 unit = 1 canvas pixel), fitted to the body's real geometry: sleeves, shoulder plates, knee caps, belts
// that meet the tunic, weapons that sit in the hand. The 64px icons in icons-data.js are still used for the bag and menus.
//
// Colour: each material is pulled toward the item's rarity colour (more for rarer items, so rarity reads at a glance); Uncommon and up
// get gold-ish trim, and the gem colour is the rarity colour. Every colour goes through the context (`c`), which turns it white while a
// character flashes from a hit.
import { RC } from './state.js';
import { baseOf } from './assets.js';

const hex = (s) => [parseInt(s.slice(1, 3), 16), parseInt(s.slice(3, 5), 16), parseInt(s.slice(5, 7), 16)];
export const mix = (a, b, t) => { const A = hex(a), B = hex(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
const MAT = { steel: '#9ca6ba', leather: '#8f5e2e', cloth: '#9a8a76', wood: '#7a5230', gold: '#e8c050' };
const CLOTH = { Tunic: '#a08e74', Robe: '#7d6aa0', Hood: '#5f7a62', Cap: '#8a7a6a', Breeches: '#94805f', Trousers: '#6f7488', Wraps: '#c0ae8c' }; // natural colour of each cloth piece
function pal(it, mat) {
  // rarity only TINTS the material (up to half-way for the rarest); the real rarity signal is the trim and gem colours
  const rc = RC[it.ri] || '#ffffff', base = mat === 'cloth' && CLOTH[baseOf(it)] ? CLOTH[baseOf(it)] : MAT[mat], m = mix(base, rc, Math.min(.5, .04 + it.ri * .065));
  return { m, ri: it.ri, acc: rc, gem: rc, trim: it.ri >= 1 ? mix(MAT.gold, rc, .15) : mix('#7d8494', rc, .3), dk: mix(m, '#000000', .5), wood: mix(MAT.wood, rc, .12 + it.ri * .03) };
}

// Body geometry for this character (torso x/width come from the style: orcs and bosses are wider).
export function geometry(st) {
  const tx = st.tx || 8, tw = st.tw || 24;
  return { tx, tw, ax: tx - 6, bx: tx + tw, hx: tx + 4, cx: tx + tw / 2, legL: tx + 3, legR: tx + tw - 11, bootL: tx + 2, bootR: tx + tw - 12 };
}

export function drawWorn(c, e, st) {
  const g = geometry(st), { tx, tw, ax, bx, hx, cx } = g;
  const r = (x, y, w, h, col) => c.Rf(x, y, w, h, c.F(col)), B = (x, y, w, h, col, o) => c.blk(x, y, w, h, col, o), S = (rects, col) => c.shape(rects, col);
  const lit = c.lit, shd = c.shd;
  const disc = (px, py, rad, col) => {
    for (let dy = -rad - 1; dy <= rad + 1; dy++) { const hw = Math.round(Math.sqrt((rad + 1) * (rad + 1) - dy * dy)); r(px - hw, py + dy, 2 * hw + 1, 1, c.ink(col)); }
    for (let dy = -rad; dy <= rad; dy++) { const hw = Math.round(Math.sqrt(rad * rad - dy * dy)); r(px - hw, py + dy, 2 * hw + 1, 1, col); }
    r(px - Math.round(rad * .6), py - Math.round(rad * .6), Math.max(1, Math.round(rad * .5)), 1, lit(col));
  };
  const heater = (px, py, P, fill) => { // heater shield: flat top, tapering to a point
    const hw = (dy) => (dy < 3 ? 6 : Math.max(0, Math.round(6 - (dy - 3) * .5)));
    for (let dy = -9; dy <= 9; dy++) { const w = hw(dy + 9); r(px - w - 1, py + dy, 2 * w + 3, 1, c.ink(fill)); }
    for (let dy = -9; dy <= 9; dy++) { const w = hw(dy + 9); r(px - w, py + dy, 2 * w + 1, 1, fill); r(px - w, py + dy, 1, 1, lit(fill)); r(px + w, py + dy, 1, 1, shd(fill)); }
    r(px - 6, py - 9, 13, 2, P.trim);
  };
  const mailTex = (x, y, w, h, col) => { for (let j = 0; j < h; j += 2) for (let i = (j / 2) % 2; i < w; i += 2) { r(x + i, y + j, 1, 1, lit(col)); if (j + 1 < h) r(x + i + 1, y + j + 1, 1, 1, shd(col)); } };

  // ---- legs ----
  if (e.legs) {
    const b = baseOf(e.legs), P = pal(e.legs, b === 'Greaves' ? 'steel' : 'cloth');
    for (const x of [g.legL, g.legR]) {
      if (b === 'Trousers') { B(x, 40, 8, 13, P.m, { tex: 1 }); r(x + 1, 46, 6, 1, shd(P.m)); r(x, 40, 8, 1, P.trim); }
      else if (b === 'Breeches') { B(x - 1, 40, 10, 9, P.m, { tex: 1 }); r(x - 1, 47, 10, 2, shd(P.m)); r(x - 1, 48, 10, 1, P.trim); B(x + 1, 49, 6, 4, mix(P.m, '#ffffff', .3)); }
      else { B(x, 40, 8, 6, P.m); B(x - 1, 45, 10, 4, lit(P.m)); r(x + 4, 46, 1, 1, P.trim); r(x + 1, 46, 1, 1, P.trim); B(x, 49, 8, 4, P.m); r(x + 3, 49, 1, 4, lit(P.m)); r(x, 40, 8, 1, P.trim); }
    }
  }
  // ---- boots ----
  if (e.boots) {
    const b = baseOf(e.boots), P = pal(e.boots, b === 'Treads' ? 'steel' : 'leather');
    for (const x of [g.bootL, g.bootR]) {
      if (b === 'Boots') { B(x, 50, 10, 8, P.m); B(x, 49, 10, 3, lit(P.m)); r(x, 53, 10, 1, P.trim); r(x + 4, 53, 2, 1, '#fff3b0'); r(x, 57, 10, 1, P.dk); }
      else if (b === 'Sandals') { B(x, 56, 10, 2, P.m); r(x + 1, 52, 2, 4, P.m); r(x + 5, 52, 2, 4, P.m); r(x + 1, 50, 8, 1, P.m); r(x + 1, 52, 1, 1, P.trim); }
      else { B(x - 1, 49, 12, 9, P.m); r(x, 50, 10, 2, lit(P.m)); r(x, 53, 10, 1, P.trim); for (let i = 0; i < 10; i += 2) r(x + i, 57, 1, 1, P.dk); r(x + 1, 51, 1, 1, P.trim); r(x + 8, 51, 1, 1, P.trim); }
    }
  }
  // ---- chest (with its own sleeves, shoulders, belt) ----
  if (e.chest) {
    const b = baseOf(e.chest), P = pal(e.chest, b === 'Plate' || b === 'Mail' ? 'steel' : 'cloth');
    if (b === 'Tunic') {
      B(tx, 18, tw, 21, P.m, { tex: 1 }); r(cx - 4, 18, 8, 3, shd(P.m)); r(cx - 1, 21, 2, 12, shd(P.m)); r(tx, 33, tw, 3, '#5a3a1c'); B(cx - 2, 33, 4, 3, P.trim); r(tx, 37, tw, 2, P.trim);
      for (const x of [ax, bx]) { B(x, 20, 6, 13, P.m, { tex: 1 }); r(x, 31, 6, 2, P.trim); }
    } else if (b === 'Mail') {
      B(tx, 18, tw, 22, P.m); mailTex(tx + 1, 19, tw - 2, 14, P.m); r(tx, 33, tw, 3, '#5a3a1c'); B(cx - 2, 33, 4, 3, P.trim); r(cx - 5, 18, 10, 2, shd(P.m)); mailTex(tx + 1, 36, tw - 2, 3, P.m);
      for (const x of [ax, bx]) { B(x, 20, 6, 15, P.m); mailTex(x + 1, 21, 4, 13, P.m); }
    } else if (b === 'Plate') {
      B(tx, 18, tw, 20, P.m); r(cx - 1, 20, 2, 16, lit(P.m)); r(tx + 2, 24, tw / 2 - 3, 1, shd(P.m)); r(cx + 1, 24, tw / 2 - 3, 1, shd(P.m)); r(tx + 2, 29, tw / 2 - 3, 1, shd(P.m)); r(cx + 1, 29, tw / 2 - 3, 1, shd(P.m));
      r(tx, 18, tw, 2, P.trim); r(tx, 36, tw, 2, P.trim); B(cx - 6, 15, 12, 5, P.m); r(cx - 6, 15, 12, 1, P.trim);
      for (const x of [ax, bx]) { B(x, 24, 6, 11, shd(P.m)); r(x, 28, 6, 1, P.trim); B(x - 1, 16, 8, 9, P.m); r(x - 1, 16, 8, 1, P.trim); r(x - 1, 23, 8, 1, P.trim); r(x + 3, 19, 1, 1, lit(P.m)); }
    } else { // Robe
      B(tx - 1, 18, tw + 2, 22, P.m, { tex: 1 }); B(tx - 1, 38, tw + 2, 16, P.m, { tex: 1 });
      for (const x of [tx + 4, tx + 9, tx + tw - 10, tx + tw - 5]) r(x, 40, 1, 12, shd(P.m));
      r(tx - 1, 52, tw + 2, 2, P.trim); r(tx, 32, tw, 3, P.acc); r(cx - 3, 18, 6, 4, shd(st.skin)); r(cx - 3, 18, 1, 5, P.trim); r(cx + 2, 18, 1, 5, P.trim);
      for (const x of [ax - 1, bx]) { B(x, 20, 7, 16, P.m, { tex: 1 }); r(x, 34, 7, 2, P.trim); }
    }
  }
  // ---- gloves (over the hands) ----
  if (e.gloves) {
    const b = baseOf(e.gloves), P = pal(e.gloves, b === 'Gauntlets' ? 'steel' : 'leather');
    for (const x of [ax, bx]) {
      if (b === 'Mitts') { B(x - 1, 34, 8, 8, P.m); r(x - 1, 34, 8, 2, P.trim); r(x + 1, 38, 1, 3, shd(P.m)); }
      else if (b === 'Gauntlets') { B(x - 1, 31, 8, 11, P.m); B(x - 2, 29, 10, 3, lit(P.m)); r(x, 40, 6, 2, shd(P.m)); r(x + 2, 33, 1, 6, lit(P.m)); r(x - 2, 29, 10, 1, P.trim); }
      else { for (let y = 33; y < 41; y += 2) r(x, y, 6, 1, P.m); r(x, 34, 6, 1, lit(P.m)); r(x, 31, 6, 2, P.trim); }
    }
  }
  // ---- amulets: up to three pendants on the chest ----
  [[cx - 1, 23], [cx - 6, 22], [cx + 4, 22]].forEach(([x, y], i) => {
    const it = e['amu' + (i + 1)]; if (!it) return;
    const b = baseOf(it), P = pal(it, 'gold');
    r(x + 1, y - 3, 1, 3, P.trim);
    if (b === 'Charm') { B(x, y, 4, 4, P.trim); r(x + 1, y + 1, 2, 2, P.gem); }
    else if (b === 'Amulet') { B(x, y, 4, 5, P.trim); r(x + 1, y + 1, 2, 3, P.gem); r(x + 1, y + 1, 1, 1, '#ffffff'); }
    else if (b === 'Talisman') { r(x + 1, y, 2, 1, P.trim); B(x, y + 1, 4, 3, P.gem); r(x + 1, y + 4, 2, 1, P.trim); r(x + 1, y + 2, 2, 1, '#ffffff'); }
    else { B(x, y, 4, 5, P.trim); r(x + 1, y + 1, 2, 2, lit(P.trim)); r(x + 1, y + 3, 2, 1, shd(P.trim)); }
  });
  // ---- shields (left arm by default) ----
  for (const [it, px] of [[e.lhand, ax + 3], [e.rhand, bx + 3]]) {
    if (!it || it.ty !== 'shield') continue;
    const b = baseOf(it), P = pal(it, b === 'Buckler' ? 'steel' : 'steel'), py = 29;
    if (b === 'Buckler') { disc(px, py, 8, P.m); disc(px, py, 5, P.wood); disc(px, py, 2, lit(P.m)); }
    else if (b === 'Shield') { heater(px, py, P, P.m); r(px - 1, py - 6, 3, 15, P.acc); r(px - 5, py - 2, 11, 3, P.acc); r(px - 1, py - 6, 1, 15, lit(P.acc)); }
    else { heater(px, py, P, mix(P.m, '#e8c050', .45)); r(px - 6, py - 12, 3, 4, P.trim); r(px + 4, py - 12, 3, 4, P.trim); B(px - 2, py - 3, 5, 6, P.gem); r(px - 1, py - 2, 1, 2, '#ffffff'); }
  }
  // ---- head ----
  if (e.head) {
    const b = baseOf(e.head);
    if (b === 'Cap') { const P = pal(e.head, 'cloth'); S([[hx - 1, -3, 18, 6], [hx + 1, -5, 14, 3]], P.m); r(hx + 2, -4, 7, 1, lit(P.m)); B(hx - 4, 3, 24, 2, shd(P.m)); r(hx - 1, 2, 18, 1, P.trim); r(hx + 7, -7, 2, 2, e.head.ri >= 3 ? P.gem : lit(P.m)); }
    else if (b === 'Helm') {
      const P = pal(e.head, 'steel');
      if (e.head.ri >= 3) { S([[hx + 6, -11, 4, 8]], P.acc); r(hx + 7, -10, 1, 6, lit(P.acc)); }
      B(hx - 1, -6, 18, 4, P.m); B(hx - 3, -3, 22, 20, P.m); r(hx, -6, 16, 1, lit(P.m)); r(hx - 2, -3, 20, 1, lit(P.m)); r(hx + 1, 6, 14, 3, '#0c0a12'); r(hx + 7, 5, 2, 12, lit(P.m)); r(hx - 1, 4, 18, 1, P.trim); r(hx - 1, 14, 18, 1, P.trim);
      r(hx - 3, 9, 3, 8, shd(P.m)); r(hx + 16, 9, 3, 8, shd(P.m)); r(hx, 1, 1, 1, lit(P.m)); r(hx + 14, 1, 1, 1, lit(P.m)); r(hx + 1, 11, 1, 1, P.dk); r(hx + 13, 11, 1, 1, P.dk);
    } else if (b === 'Hood') {
      const P = pal(e.head, 'cloth'); S([[hx - 3, -4, 22, 7], [hx - 4, 2, 5, 17], [hx + 15, 2, 5, 17]], P.m); r(hx, -3, 15, 1, lit(P.m)); r(hx + 1, 2, 14, 2, shd(P.m)); B(hx + 5, -8, 6, 4, P.m);
      B(hx - 7, 15, 30, 6, P.m, { tex: 1 }); r(hx - 7, 19, 30, 1, P.trim);
    } else {
      const P = pal(e.head, 'gold'); S([[hx + 1, -7, 2, 5], [hx + 5, -9, 2, 7], [hx + 9, -9, 2, 7], [hx + 13, -7, 2, 5]], P.m); B(hx - 1, -3, 18, 5, P.m); r(hx, -3, 16, 1, lit(P.m));
      r(hx + 7, -2, 2, 3, P.gem); r(hx + 7, -2, 1, 1, '#ffffff'); r(hx + 2, -1, 1, 2, P.gem); r(hx + 13, -1, 1, 2, P.gem); r(hx + 2, -9, 2, 1, P.gem); r(hx + 12, -9, 2, 1, P.gem);
    }
  }
  // ---- weapons (right hand, then left), held upright in the fist ----
  for (const [it, gx] of [[e.rhand, bx + 1], [e.lhand, ax + 1]]) {
    if (!it || it.ty === 'shield') continue;
    const b = baseOf(it), P = pal(it, 'steel');
    if (b === 'Sword') { S([[gx, 8, 4, 27], [gx + 1, 5, 2, 3]], P.m); r(gx + 1, 9, 1, 24, lit(P.m)); r(gx + 3, 9, 1, 24, shd(P.m)); B(gx - 3, 34, 10, 3, P.trim); B(gx + 1, 37, 2, 6, '#5a3a1c'); B(gx, 43, 4, 3, P.trim); }
    else if (b === 'Axe') { B(gx + 1, 8, 2, 38, P.wood); S([[gx + 3, 8, 7, 4], [gx + 3, 12, 9, 8], [gx + 3, 20, 7, 4]], P.m); r(gx + 11, 13, 1, 6, lit(P.m)); r(gx + 4, 9, 5, 1, lit(P.m)); B(gx - 2, 12, 3, 3, P.m); }
    else if (b === 'Dagger') { S([[gx + 1, 26, 3, 11], [gx + 2, 24, 1, 2]], P.m); r(gx + 2, 27, 1, 8, lit(P.m)); B(gx - 1, 36, 7, 2, P.trim); B(gx + 1, 38, 2, 5, '#5a3a1c'); B(gx + 1, 43, 2, 2, P.trim); }
    else if (b === 'Mace') { B(gx + 1, 14, 2, 32, P.wood); disc(gx + 2, 10, 5, P.m); r(gx + 2, 2, 1, 3, P.m); r(gx - 4, 10, 3, 1, P.m); r(gx + 6, 10, 3, 1, P.m); r(gx + 2, 15, 1, 3, P.m); if (it.ri >= 3) r(gx + 1, 9, 2, 2, P.gem); }
    else { B(gx + 1, 0, 2, 48, P.wood); S([[gx, -8, 4, 9], [gx + 1, -11, 2, 3]], P.m); r(gx + 1, -7, 1, 7, lit(P.m)); r(gx - 1, 2, 6, 1, P.trim); r(gx - 1, 3, 1, 2, P.trim); r(gx + 4, 3, 1, 2, P.trim); }
  }
}
