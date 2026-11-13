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
// Relics with their own always-on effects (the generic rarity fire/halo effects are skipped for these)
const OWNFX = new Set(['drowned', 'stormcaller', 'rime', 'windrunner', 'midas', 'seer', 'voidreaver']);
const own = (it) => !!it && OWNFX.has(it.un);
const hsh = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }; // stable pseudo-random 0..1
let CLK = 0; // animation clock (seconds), set at the top of drawWorn
function pal(it, mat) {
  // Rarity looks, by tier: 0 Common = old, dull and rusty; 1 plain; 2-3 polished; 4+ glowing gems; 5+ burning weapons; 7+ embers; (wings and aura: scene.js)
  const rc = RC[it.ri] || '#ffffff', cloth = mat === 'cloth', base = cloth && CLOTH[baseOf(it)] ? CLOTH[baseOf(it)] : MAT[mat];
  let m = mix(base, rc, Math.min(.16, .02 + it.ri * .018));                      // materials stay steel / leather / cloth; rarity lives in trim, gems and glow
  if (it.ri === 0) m = mix(mix(m, '#5a4636', .4), '#000000', .08);                       // old: dulled toward rusty brown-grey
  else if (it.ri === 1) m = mix(m, '#5a4636', .12);
  else if (it.ri >= 2) m = mix(m, '#ffffff', Math.min(.22, .05 + it.ri * .012));         // polished: a little brighter
  const pulse = .5 + .5 * Math.sin(CLK * 3 + (it.id || 0));
  return { m, ri: it.ri, acc: rc, gem: it.ri >= 4 ? mix(rc, '#ffffff', .12 + .38 * pulse) : rc,
    trim: it.ri === 0 ? '#5d5648' : it.ri >= 1 ? mix(MAT.gold, rc, .15) : mix('#7d8494', rc, .3), dk: mix(m, '#000000', .5), wood: mix(MAT.wood, rc, .12 + it.ri * .03),
    rust: cloth ? ['#5a4a38', '#3e3226'] : mat === 'wood' ? ['#4a3220', '#33200f'] : ['#8a4a22', '#5a3318'] };
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
  CLK = c.t || 0;
  // Old gear (Common, a little on Uncommon) is speckled with rust or grime inside the given box.
  const rust = (it, x, y, w, h) => {
    if (!it || it.ri > 1) return; const P = pal(it, 'steel'), n = Math.round(w * h * (it.ri === 0 ? .13 : .035)), sd = (it.id || 1) * 3.7 + x * .91 + y * 1.3;
    for (let i = 0; i < n; i++) r(x + Math.floor(hsh(sd + i * 1.7) * w), y + Math.floor(hsh(sd + i * 2.9 + 5) * h), 1, hsh(sd + i) > .75 ? 2 : 1, hsh(sd + i * 4.1) > .5 ? P.rust[0] : P.rust[1]);
    if (it.ri === 0) { const cx0 = x + Math.floor(hsh(sd) * (w - 2)) + 1; r(cx0, y + 1, 1, Math.min(4, h - 2), P.dk); r(cx0 + 1, y + 3, 1, 1, P.dk); } // a crack
  };
  // Fire: tongues of flame rising from a baseline (y) over w columns, flickering. Rarity 9+ burns in the item's own colour instead of orange.
  const fireCols = (it) => (it.ri >= 9 ? { o: RC[it.ri] || '#ffffff', m: mix(RC[it.ri] || '#ffffff', '#ffffff', .45), i: '#ffffff' } : { o: '#ff5a14', m: '#ffa21f', i: '#ffe45c' });
  const flame = (it, x, y, w, h, seed) => {
    const F = fireCols(it);
    for (let i = 0; i < w; i++) {
      const hh = Math.round(h * (.45 + .55 * Math.abs(Math.sin(CLK * 8 + i * 1.9 + seed)))) * (hsh(i * 3.3 + seed + Math.floor(CLK * 6)) > .25 ? 1 : 0);
      if (hh < 1) continue; r(x + i, y - hh, 1, hh, F.o); const m = Math.ceil(hh * .62); r(x + i, y - m, 1, m, F.m); const k = Math.ceil(hh * .28); if (hh > 1) r(x + i, y - k, 1, k, F.i);
    }
  };
  const embers = (it, x, y, w, n, seed) => { // sparks that drift upward and fade out by shrinking away
    const F = fireCols(it);
    for (let i = 0; i < n; i++) { const ph = (CLK * (.9 + hsh(i + seed) * .8) + hsh(i * 7 + seed)) % 1; r(x + hsh(i * 5 + seed) * w + Math.sin(CLK * 3 + i) * 2, y - ph * 16, 1, 1, ph > .6 ? F.o : F.m); }
  };
  // Weapon enchantments: 4+ a travelling glint, 5+ it burns, 7+ it throws embers.
  const weaponFx = (it, bx0, by0, bw, bh) => {
    if (it.ri >= 4) r(bx0 + Math.floor(bw / 2), by0 + Math.floor((CLK * 14) % bh), 1, 2, '#ffffff');
    if (it.ri >= 5) {
      flame(it, bx0, by0 + 1, bw, 3 + (it.ri >= 7 ? 3 : 0) + (it.ri >= 9 ? 2 : 0), 1);
      if (bh > 12) for (let yy = by0 + 7; yy < by0 + bh - 2; yy += 6) { flame(it, bx0 - 2, yy, 2, 3 + (it.ri >= 7 ? 2 : 0), yy); flame(it, bx0 + bw, yy, 2, 3 + (it.ri >= 7 ? 2 : 0), yy + 9); }
    }
    if (it.ri >= 7) embers(it, bx0 - 2, by0, bw + 4, 3 + Math.min(5, it.ri - 7), it.id || 0);
  };
  const mailTex = (x, y, w, h, col) => { for (let j = 0; j < h; j += 2) for (let i = (j / 2) % 2; i < w; i += 2) { r(x + i, y + j, 1, 1, lit(col)); if (j + 1 < h) r(x + i + 1, y + j + 1, 1, 1, shd(col)); } };

  // ---- legs ----
  if (e.legs) {
    const b = baseOf(e.legs), P = pal(e.legs, b === 'Greaves' ? 'steel' : 'cloth');
    for (const x of [g.legL, g.legR]) {
      if (e.legs.un === 'rime') { // Rimeplate Greaves (relic): ice-blue plate with frosted knees, crystal spikes and glittering rime
        const ice = '#6fa8c8', fr = '#bfe8ff';
        B(x, 40, 8, 6, ice); r(x + 3, 41, 1, 4, '#e8f8ff'); B(x - 1, 45, 10, 4, fr); B(x, 49, 8, 4, ice); r(x, 40, 8, 1, '#ffffff');
        r(x + 4, 43, 1, 3, '#ffffff'); r(x + 3, 44, 3, 1, '#ffffff'); r(x + 4, 47, 1, 2, '#ffffff'); r(x - 1, 46, 1, 2, '#ffffff'); r(x + 8, 46, 1, 2, '#ffffff');
        for (let i = 0; i < 3; i++) r(x + Math.floor(hsh(i * 3 + Math.floor(CLK * 4) + x) * 8), 41 + Math.floor(hsh(i + 7 + Math.floor(CLK * 4)) * 11), 1, 1, '#ffffff');
      } else if (b === 'Trousers') { B(x, 40, 8, 13, P.m, { tex: 1 }); r(x + 1, 46, 6, 1, shd(P.m)); r(x, 40, 8, 1, P.trim); }
      else if (b === 'Breeches') { B(x - 1, 40, 10, 9, P.m, { tex: 1 }); r(x - 1, 47, 10, 2, shd(P.m)); r(x - 1, 48, 10, 1, P.trim); B(x + 1, 49, 6, 4, mix(P.m, '#ffffff', .3)); }
      else { B(x, 40, 8, 6, P.m); B(x - 1, 45, 10, 4, lit(P.m)); r(x + 4, 46, 1, 1, P.trim); r(x + 1, 46, 1, 1, P.trim); B(x, 49, 8, 4, P.m); r(x + 3, 49, 1, 4, lit(P.m)); r(x, 40, 8, 1, P.trim); }
    }
  }
  if (e.legs) for (const x of [g.legL, g.legR]) rust(e.legs, x, 40, 8, 13);
  // ---- boots ----
  if (e.boots) {
    const b = baseOf(e.boots), P = pal(e.boots, b === 'Treads' ? 'steel' : 'leather');
    for (const x of [g.bootL, g.bootR]) {
      if (e.boots.un === 'windrunner') { // Windrunner Boots (relic): cream leather with gold trim, a small wing at each ankle and a trail of dust
        const sg = x === g.bootL ? -1 : 1, fl = Math.round(Math.sin(CLK * 9));
        B(x, 50, 10, 8, '#e6dcc4'); B(x, 49, 10, 3, '#f6efe0'); r(x, 53, 10, 1, '#d8b040'); r(x, 57, 10, 1, '#8a7a5a'); r(x + 4, 53, 2, 1, '#fff3b0');
        for (let k = 0; k < 4; k++) { const w = 5 - k; r(sg < 0 ? x - 1 - w : x + 10, 49 + k * 2 + (k === 0 ? fl : 0), w, 1, k % 2 ? '#dfe9f5' : '#ffffff'); }
        for (let i = 0; i < 3; i++) { const ph = (CLK * 1.6 + i * .33 + (sg < 0 ? 0 : .5)) % 1; r(sg < 0 ? x + 9 + ph * 6 : x - ph * 6, 58 - Math.floor(ph * 3), 1, 1, '#cfc4a8'); }
      } else if (b === 'Boots') { B(x, 50, 10, 8, P.m); B(x, 49, 10, 3, lit(P.m)); r(x, 53, 10, 1, P.trim); r(x + 4, 53, 2, 1, '#fff3b0'); r(x, 57, 10, 1, P.dk); }
      else if (b === 'Sandals') { B(x, 56, 10, 2, P.m); r(x + 1, 52, 2, 4, P.m); r(x + 5, 52, 2, 4, P.m); r(x + 1, 50, 8, 1, P.m); r(x + 1, 52, 1, 1, P.trim); }
      else { B(x - 1, 49, 12, 9, P.m); r(x, 50, 10, 2, lit(P.m)); r(x, 53, 10, 1, P.trim); for (let i = 0; i < 10; i += 2) r(x + i, 57, 1, 1, P.dk); r(x + 1, 51, 1, 1, P.trim); r(x + 8, 51, 1, 1, P.trim); }
    }
  }
  if (e.boots) for (const x of [g.bootL, g.bootR]) rust(e.boots, x, 50, 10, 8);
  if (e.boots && e.boots.ri >= 3 && !own(e.boots)) for (const x of [g.bootL, g.bootR]) { // boots: a glowing rune on the toe, ground-fire at the heel from 5, bigger with embers from 7
    const it = e.boots, P = pal(it, 'steel'); r(x + 3, 55, 4, 1, P.gem); r(x + 4, 54, 2, 1, mix(P.gem, '#ffffff', .5));
    if (it.ri >= 5) flame(it, x, 58, 10, 2 + (it.ri >= 7 ? 2 : 0) + (it.ri >= 9 ? 2 : 0), x);
    if (it.ri >= 7) embers(it, x, 56, 10, 2 + Math.min(3, it.ri - 7), x + 3);
  }
  // ---- chest (with its own sleeves, shoulders, belt) ----
  if (e.chest) {
    const b = baseOf(e.chest), P = pal(e.chest, b === 'Plate' || b === 'Mail' ? 'steel' : 'cloth');
    if (e.chest.un === 'phoenix') { // Phoenix Robe (relic): crimson feathered robe, gold-and-flame plumage, plumed shoulders, a hem that never stops burning
      const pu = .5 + .5 * Math.sin(CLK * 3), fl = '#ff7a1a', gold = '#ffcc4d', red = '#8a1c14', dk = '#4a0e0c', FR = { ri: 5 };
      B(tx - 1, 18, tw + 2, 22, red); B(tx - 2, 38, tw + 4, 16, red);
      for (let y = 21; y < 38; y += 3) for (let x = tx + 1 + ((y / 3) % 2 ? 0 : 2); x < tx + tw - 2; x += 4) { r(x, y, 3, 1, gold); r(x + 1, y + 1, 1, 1, fl); }
      for (let y = 40; y < 53; y += 3) for (let x = tx - 1 + ((y / 3) % 2 ? 0 : 2); x < tx + tw; x += 4) { r(x, y, 3, 1, fl); r(x + 1, y + 1, 1, 1, gold); }
      r(tx, 33, tw, 3, dk); B(cx - 2, 33, 4, 3, gold); r(cx - 3, 18, 6, 3, gold);
      for (const x of [ax - 1, bx]) { B(x, 20, 7, 16, red); r(x, 34, 7, 2, gold); r(x + 3, 24, 1, 8, fl); }
      for (const [x0, hs] of [[ax - 3, [6, 5, 4, 3]], [bx - 2, [3, 4, 5, 6]]]) { B(x0, 17, 9, 5, dk); hs.forEach((h, k) => { r(x0 + k * 2, 17 - h, 2, h, k % 2 ? fl : gold); r(x0 + k * 2, 17 - h, 1, 1, '#ffffff'); }); }
      r(cx - 1, 23, 2, 7, mix(fl, '#ffe45c', pu)); r(cx - 2, 26, 4, 2, gold); r(cx - 1, 22, 2, 1, '#ffffff'); // a flame crest on the chest
      flame(FR, tx - 2, 55, tw + 4, 4, 41); embers(FR, tx, 40, tw, 6, 77);
    } else if (b === 'Tunic') {
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
  if (e.chest) rust(e.chest, tx, 18, tw, 21);
  // ---- gloves (over the hands) ----
  if (e.gloves) {
    const b = baseOf(e.gloves), P = pal(e.gloves, b === 'Gauntlets' ? 'steel' : 'leather');
    for (const x of [ax, bx]) {
      if (e.gloves.un === 'stormcaller') { // Stormcaller Gauntlets (relic): blue-steel with a gold bolt inlay and crackling arcs
        B(x - 1, 31, 8, 11, '#2c3a5c'); B(x - 2, 29, 10, 3, '#3d4f7a'); r(x - 2, 29, 10, 1, '#ffe45c'); r(x, 40, 6, 2, shd('#2c3a5c'));
        r(x + 3, 32, 2, 1, '#ffe45c'); r(x + 2, 33, 2, 1, '#ffe45c'); r(x + 3, 34, 2, 1, '#ffe45c'); r(x + 2, 35, 2, 1, '#ffe45c'); r(x + 3, 36, 1, 2, '#ffffff');
        if (Math.floor(CLK * 14) % 3) for (let k = 0; k < 5; k++) r(x - 1 + k * 2, 27 - ((k + Math.floor(CLK * 14)) % 3), 1, 1, k % 2 ? '#bfe8ff' : '#ffffff');
      } else if (b === 'Mitts') { B(x - 1, 34, 8, 8, P.m); r(x - 1, 34, 8, 2, P.trim); r(x + 1, 38, 1, 3, shd(P.m)); }
      else if (b === 'Gauntlets') { B(x - 1, 31, 8, 11, P.m); B(x - 2, 29, 10, 3, lit(P.m)); r(x, 40, 6, 2, shd(P.m)); r(x + 2, 33, 1, 6, lit(P.m)); r(x - 2, 29, 10, 1, P.trim); }
      else { for (let y = 33; y < 41; y += 2) r(x, y, 6, 1, P.m); r(x, 34, 6, 1, lit(P.m)); r(x, 31, 6, 2, P.trim); }
    }
  }
  if (e.gloves && e.gloves.ri >= 3 && !own(e.gloves)) for (const x of [ax, bx]) { // gloves: a glowing rune on the back of the hand, flames above the knuckles from 5
    const it = e.gloves, P = pal(it, 'steel'); r(x + 2, 37, 2, 2, P.gem); r(x + 2, 37, 1, 1, '#ffffff');
    if (it.ri >= 5) flame(it, x, 35, 6, 3 + (it.ri >= 7 ? 2 : 0), x + 5);
    if (it.ri >= 7) embers(it, x - 1, 34, 8, 2 + Math.min(3, it.ri - 7), x);
  }
  if (e.chest && e.chest.ri >= 3) { // chest: glowing seams, a pulsing rune, burning shoulders from 5, embers from 7, a burning hem from 9
    const it = e.chest, P = pal(it, 'steel'), pu = .5 + .5 * Math.sin(CLK * 3), seam = mix(P.gem, '#ffffff', .1 + .3 * pu);
    for (const sx of [tx + 6, tx + tw - 7]) r(sx, 21, 1, 14, seam);
    r(cx - 1, 25, 2, 3, P.gem); r(cx - 2, 26, 4, 1, seam); r(cx - 1, 26, 1, 1, '#ffffff');
    if (it.ri >= 5) for (const x of [ax - 1, bx]) flame(it, x, 21, 7, 3 + (it.ri >= 7 ? 2 : 0), x);
    if (it.ri >= 7) embers(it, tx, 36, tw, 3 + Math.min(5, it.ri - 7), 21);
    if (it.ri >= 9) flame(it, tx, 39, tw, 3 + Math.min(3, it.ri - 9), 33);
  }
  // ---- amulets: up to three pendants on the chest ----
  [[cx - 1, 23], [cx - 6, 22], [cx + 4, 22]].forEach(([x, y], i) => {
    const it = e['amu' + (i + 1)]; if (!it) return;
    const b = baseOf(it), P = pal(it, 'gold');
    r(x + 1, y - 3, 1, 3, P.trim);
    if (it.un === 'midas') { // Midas Locket (relic): a heavy gold locket stamped with a coin, shedding gold
      B(x - 1, y, 6, 6, '#e8c050'); r(x + 1, y + 1, 2, 4, '#fff3b0'); r(x, y + 2, 4, 1, '#fff3b0'); r(x - 1, y, 6, 1, '#fff3b0');
      for (let i = 0; i < 3; i++) { const ph = (CLK * 1.2 + i * .33) % 1; r(x - 1 + i * 3, y + 6 + Math.round(ph * 8), 1, 1, ph > .7 ? '#a07820' : '#ffd34d'); }
    } else if (it.un === 'seer') { // Eye of the Seer (relic): a dark talisman holding an open violet eye
      const pu2 = .5 + .5 * Math.sin(CLK * 2.5), eye = mix('#8a4fff', '#ff7aff', pu2);
      B(x - 1, y + 1, 6, 4, '#2a1f4a'); r(x, y + 2, 4, 2, '#f4f0ff'); r(x + 1, y + 2, 2, 2, eye); r(x + 1, y + 2, 1, 1, '#ffffff'); r(x + 2, y - 1, 1, 2, eye); r(x - 2, y + 2, 1, 1, eye); r(x + 5, y + 2, 1, 1, eye);
    } else if (b === 'Charm') { B(x, y, 4, 4, P.trim); r(x + 1, y + 1, 2, 2, P.gem); }
    else if (b === 'Amulet') { B(x, y, 4, 5, P.trim); r(x + 1, y + 1, 2, 3, P.gem); r(x + 1, y + 1, 1, 1, '#ffffff'); }
    else if (b === 'Talisman') { r(x + 1, y, 2, 1, P.trim); B(x, y + 1, 4, 3, P.gem); r(x + 1, y + 4, 2, 1, P.trim); r(x + 1, y + 2, 2, 1, '#ffffff'); }
    else { B(x, y, 4, 5, P.trim); r(x + 1, y + 1, 2, 2, lit(P.trim)); r(x + 1, y + 3, 2, 1, shd(P.trim)); }
    if (it.ri >= 3) { // the gem radiates: a pulsing diamond halo, then light rays, then drifting sparks
      const pu = .5 + .5 * Math.sin(CLK * 3 + i), gx0 = x + 2, gy0 = y + 2, hc = P.gem, d = 3 + (pu > .5 ? 1 : 0);
      for (const [dx, dy] of [[0, -d], [0, d], [-d, 0], [d, 0]]) r(gx0 + dx, gy0 + dy, 1, 1, hc);
      if (it.ri >= 6) for (const [dx, dy, w, h] of [[-d - 1, -d - 1, 1, 1], [d + 1, -d - 1, 1, 1], [-d - 1, d + 1, 1, 1], [d + 1, d + 1, 1, 1]]) r(gx0 + dx, gy0 + dy, w, h, mix(hc, '#ffffff', .6));
      if (it.ri >= 9) embers(it, x - 2, y + 4, 8, 3, i * 11);
    }
  });
  // ---- shields: strapped to the forearm, standing slightly proud of the body ----
  const heater = (px, py, w, h, rim, left, right) => { // flat top with a curved taper to a point; 2px rim, then a field split down the middle
    const half = (i) => (i < h * .42 ? w : Math.max(0, Math.round(w * Math.cos(((i - h * .42) / (h * .58)) * Math.PI / 2)))), top = py - Math.floor(h / 2);
    for (let i = 0; i < h; i++) { const hw = half(i) + 1; r(px - hw, top + i, 2 * hw + 1, 1, c.ink(rim)); }
    for (let i = 0; i < h; i++) { const hw = half(i); r(px - hw, top + i, 2 * hw + 1, 1, rim); }
    for (let i = 2; i < h - 1; i++) { const hw = half(i) - 2; if (hw < 0) continue; r(px - hw, top + i, hw + 1, 1, left); r(px + 1, top + i, hw, 1, right); }
    for (let i = 1; i < h - 1; i++) { const hw = half(i) - 1; if (hw < 1) continue; r(px - hw, top + i, 1, 1, shd(rim)); r(px + hw, top + i, 1, 1, shd(rim)); } // inner bevel line
    r(px - w, top, 1, Math.floor(h * .55), lit(rim)); r(px - w, top, 2 * w + 1, 1, lit(rim));                                                          // lit top and left edge
  };
  for (const [it, px] of [[e.lhand, ax + 4], [e.rhand, bx + 2]]) {
    if (!it || it.ty !== 'shield') continue;
    const b = baseOf(it), P = pal(it, 'steel'), py = 30;
    if (it.un === 'wyrmscale') { // Wyrmscale Aegis (relic): a gold-rimmed shield of teal dragon scales with a glaring dragon head
      const pu = .5 + .5 * Math.sin(CLK * 3), eye = mix('#ff3a1a', '#ffe45c', pu), FR = { ri: 5 };
      heater(px, py, 8, 26, '#d8b040', '#1f6b55', '#154a3b');
      for (let y = py - 9; y < py + 12; y += 3) for (let x = px - 6 + (((y - py) % 2 + 2) % 2 ? 0 : 2); x < px + 6; x += 4) { r(x, y, 3, 1, '#3aa080'); r(x + 1, y + 1, 1, 1, '#0e3329'); }
      r(px - 7, py - 12, 2, 6, '#e8dcc0'); r(px + 6, py - 12, 2, 6, '#e8dcc0'); r(px - 7, py - 13, 1, 1, '#ffffff'); r(px + 7, py - 13, 1, 1, '#ffffff'); // horns
      B(px - 4, py - 6, 9, 5, '#2a8a6c'); B(px - 2, py - 2, 5, 8, '#2a8a6c'); r(px, py - 6, 1, 12, '#1d6a52');
      r(px - 3, py - 4, 2, 2, eye); r(px + 2, py - 4, 2, 2, eye); r(px - 3, py - 4, 1, 1, '#ffffff'); r(px + 2, py - 4, 1, 1, '#ffffff');                 // glaring eyes
      r(px - 1, py + 2, 1, 1, '#0e3329'); r(px + 1, py + 2, 1, 1, '#0e3329'); r(px - 2, py + 5, 1, 3, '#ffffff'); r(px + 2, py + 5, 1, 3, '#ffffff');     // nostrils, fangs
      embers(FR, px - 3, py + 1, 6, 4, 21);
    } else if (b === 'Buckler') {
      disc(px, py, 10, c.ink(P.m)); disc(px, py, 9, P.m);                                                        // steel rim
      for (let dy = -7; dy <= 7; dy++) { const hw = Math.round(Math.sqrt(64 - dy * dy)); r(px - hw, py + dy, 2 * hw + 1, 1, dy % 2 ? P.wood : lit(P.wood)); r(px - hw, py + dy, 1, 1, shd(P.wood)); r(px + hw, py + dy, 1, 1, shd(P.wood)); } // wooden planks
      r(px, py - 7, 1, 15, shd(P.wood));                                                                         // centre plank seam
      disc(px, py, 4, c.ink(P.m)); disc(px, py, 3, lit(P.m)); disc(px, py, 1, P.trim); r(px - 1, py - 2, 2, 1, '#ffffff'); // domed boss
      for (const [dx, dy] of [[0, -8], [0, 8], [-8, 0], [8, 0], [-6, -6], [6, -6], [-6, 6], [6, 6]]) r(px + dx, py + dy, 1, 1, P.trim); // rivets
    } else if (b === 'Shield') {
      const left = mix(P.m, P.acc, .4), right = shd(left), rim = e.rhand === it || e.lhand === it ? P.trim : P.m;
      heater(px, py, 8, 26, rim, left, right);
      for (let k = 0; k < 6; k++) { r(px - 7 + k, py - 6 + k, 3, 2, P.trim); r(px + 5 - k, py - 6 + k, 3, 2, P.trim); } // chevron
      r(px - 3, py - 11, 7, 1, lit(P.trim)); r(px, py - 10, 1, 20, shd(left));                                  // top bar, centre ridge
      disc(px, py - 2, 3, c.ink(P.trim)); disc(px, py - 2, 2, lit(P.trim)); r(px, py - 3, 1, 1, '#ffffff');      // central boss
      for (const [dx, dy] of [[-6, -10], [6, -10], [-6, 1], [6, 1]]) r(px + dx, py + dy, 1, 1, lit(P.trim));    // rivets
    } else { // Aegis: gilded, with a winged crest and a gem
      const left = mix('#e8c050', P.acc, .25), right = shd(left);
      for (const sg of [-1, 1]) for (let k = 0; k < 4; k++) { const x = sg < 0 ? px - 13 + k : px + 9 - k, y = py - 17 + k * 3; r(x, y, 5, 3, c.ink(P.trim)); r(x + 1, y + 1, 3, 1, k % 2 ? P.trim : lit(P.trim)); } // wing feathers
      heater(px, py, 8, 26, P.trim, left, right);
      r(px - 6, py - 10, 13, 1, lit(P.trim)); r(px, py - 11, 1, 22, shd(left));                                 // gilded top bar, ridge
      for (let k = 0; k < 5; k++) { r(px - 6 + k, py - 8 + k * 2, 1, 1, P.trim); r(px + 6 - k, py - 8 + k * 2, 1, 1, P.trim); } // engraved scallop
      B(px - 3, py - 6, 7, 10, P.gem); r(px - 2, py - 5, 2, 3, '#ffffff'); r(px - 1, py - 1, 3, 1, shd(P.gem));  // large gem
    }
    rust(it, px - 7, py - 12, 15, 14);
    if (it.ri >= 8) { flame(it, px - 6, py - 12, 13, 4 + (it.ri >= 10 ? 3 : 0), 5); embers(it, px - 6, py - 13, 12, 2 + Math.min(4, it.ri - 8), it.id || 0); }  // a burning crest on the top edge
  }
  // ---- head (hl = left edge of the headgear, hw = its width: adults have a smaller head than the cartoon enemies) ----
  if (e.head) {
    const b = baseOf(e.head), hw = (st.adult || st.ah) ? 14 : 18, hl = hx + 8 - hw / 2, mid = hl + hw / 2;
    if (e.head.un === 'drowned') { // Crown of the Drowned King (relic): a gold crown crusted with coral and pearls, dripping seawater
      const pu = .5 + .5 * Math.sin(CLK * 2), aqua = '#3aa7b8', gold = '#c9a24a';
      S([[hl + 1, -8, 3, 6], [mid - 2, -12, 4, 10], [hl + hw - 4, -8, 3, 6]], gold);
      B(hl, -3, hw, 5, '#2a6a7a'); r(hl, -3, hw, 1, aqua); r(hl, 1, hw, 1, gold);
      for (const px of [hl + 2, mid - 1, hl + hw - 3]) { r(px, -2, 2, 2, '#ffffff'); r(px, -2, 1, 1, mix('#9fe8ff', '#ffffff', pu)); }
      r(mid - 1, -13, 2, 2, '#ffffff'); r(hl + 2, -9, 1, 1, aqua); r(hl + hw - 3, -9, 1, 1, aqua); r(hl - 1, 0, 1, 4, aqua); r(hl + hw, 0, 1, 4, aqua);
      for (let i = 0; i < 4; i++) { const ph = (CLK * 1.1 + i * .27) % 1; r(hl + 1 + i * Math.floor(hw / 4), 2 + Math.round(ph * 16), 1, 2, ph > .7 ? '#9fe8ff' : aqua); }
    } else if (b === 'Cap') { const P = pal(e.head, 'cloth'); S([[hl, -3, hw, 6], [hl + 2, -5, hw - 4, 3]], P.m); r(hl + 3, -4, hw / 2 - 1, 1, lit(P.m)); B(hl - 3, 3, hw + 6, 2, shd(P.m)); r(hl, 2, hw, 1, P.trim); r(mid - 1, -7, 2, 2, e.head.ri >= 3 ? P.gem : lit(P.m)); }
    else if (b === 'Helm') {
      const P = pal(e.head, 'steel');
      if (e.head.ri >= 3) { S([[mid - 2, -12, 4, 9]], P.acc); r(mid - 1, -11, 1, 6, lit(P.acc)); }
      B(hl + 1, -6, hw - 2, 4, P.m); B(hl - 1, -3, hw + 2, 20, P.m); r(hl + 1, -6, hw - 2, 1, lit(P.m)); r(hl, -3, hw, 1, lit(P.m));
      r(hl + 2, 6, hw - 4, 3, '#0c0a12'); r(mid - 1, 5, 2, 12, lit(P.m)); r(hl, 4, hw, 1, P.trim); r(hl, 14, hw, 1, P.trim);
      r(hl - 1, 9, 3, 8, shd(P.m)); r(hl + hw - 2, 9, 3, 8, shd(P.m)); r(hl + 1, 1, 1, 1, lit(P.m)); r(hl + hw - 2, 1, 1, 1, lit(P.m)); r(hl + 2, 11, 1, 1, P.dk); r(hl + hw - 3, 11, 1, 1, P.dk);
    } else if (b === 'Hood') {
      const P = pal(e.head, 'cloth'); S([[hl - 1, -3, hw + 2, 8], [hl - 2, 3, 5, 16], [hl + hw - 3, 3, 5, 16]], P.m); r(hl + 1, -2, hw - 2, 1, lit(P.m)); r(hl + 1, 2, hw - 2, 2, shd(P.m)); B(mid - 3, -9, 6, 4, P.m);
      B(hl - 6, 15, hw + 12, 6, P.m, { tex: 1 }); r(hl - 6, 19, hw + 12, 1, P.trim);
    } else {
      const P = pal(e.head, 'gold'); S([[hl + 1, -8, 3, 6], [mid - 2, -11, 4, 9], [hl + hw - 4, -8, 3, 6]], P.m); r(mid - 1, -10, 1, 6, lit(P.m)); B(hl, -3, hw, 5, P.m); r(hl, -3, hw, 1, lit(P.m)); // three points, tallest in the middle
      r(mid - 1, -2, 2, 3, P.gem); r(mid - 1, -2, 1, 1, '#ffffff'); r(hl + 2, -1, 1, 2, P.gem); r(hl + hw - 3, -1, 1, 2, P.gem); r(mid - 1, -12, 2, 1, P.gem); r(hl + 2, -9, 1, 1, P.gem); r(hl + hw - 3, -9, 1, 1, P.gem);
    }
  }
  if (e.head) { // helmet wear and enchantments: rust on old helms, a flame crest from 6, a floating halo from 10
    const hw2 = (st.adult || st.ah) ? 14 : 18, hl2 = hx + 8 - hw2 / 2, mid2 = hl2 + hw2 / 2, hb = baseOf(e.head);
    if (hb === 'Helm') rust(e.head, hl2, -3, hw2, 14); else if (hb === 'Cap' || hb === 'Hood') rust(e.head, hl2, -3, hw2, 7);
    if (e.head.ri >= 6 && !own(e.head)) { const top = hb === 'Helm' ? (e.head.ri >= 3 ? -12 : -6) : hb === 'Crown' ? -12 : hb === 'Hood' ? -9 : -7; flame(e.head, mid2 - 4, top + 1, 8, 4 + Math.min(5, e.head.ri - 6), 9); }
    if (e.head.ri >= 10 && !own(e.head)) { const hc = RC[e.head.ri] || '#ffffff', b2 = .5 + .5 * Math.sin(CLK * 3); for (let i = -7; i <= 7; i++) r(mid2 + i, -16 + Math.round(Math.abs(i) * .12), 1, 1, i % 3 ? hc : mix(hc, '#ffffff', .7)); r(mid2 - 8, -15, 1, 1, hc); r(mid2 + 8, -15, 1, 1, hc); if (b2 > .5) r(mid2, -17, 1, 1, '#ffffff'); } // halo
  }
  // ---- weapons (right hand, then left), held upright in the fist ----
  for (const [it, gx] of [[e.rhand, bx + 1], [e.lhand, ax + 1]]) {
    if (!it || it.ty === 'shield') continue;
    const b = baseOf(it), P = pal(it, 'steel');
    if (it.un === 'emberfang') { // Emberfang (relic): a blackened blade with a molten core, a jagged edge, fang-shaped guard and a flame that never dies
      const pu = .5 + .5 * Math.sin(CLK * 4), core = mix('#ff7a1a', '#ffe45c', pu), FR = { ri: 5 };
      S([[gx - 1, 4, 6, 30], [gx, 1, 4, 4], [gx + 1, -1, 2, 3]], '#3a2228'); r(gx - 1, 4, 1, 28, '#7a2a24'); r(gx + 4, 4, 1, 28, '#1e1014');
      r(gx + 2, 1, 1, 31, core); r(gx + 2, 1, 1, 4, '#ffffff');
      for (let y = 8; y < 32; y += 4) { r(gx - 2, y, 1, 2, '#3a2228'); r(gx + 5, y + 2, 1, 2, '#3a2228'); }
      B(gx - 4, 34, 12, 3, '#5a1a14'); r(gx - 4, 34, 12, 1, '#c04a2a'); r(gx - 5, 36, 2, 4, '#e8dcc0'); r(gx + 7, 36, 2, 4, '#e8dcc0');
      B(gx + 1, 37, 3, 6, '#3a1a10'); for (let y = 38; y < 43; y += 2) r(gx + 1, y, 3, 1, '#7a3a20');
      B(gx, 43, 5, 3, '#c04a2a'); r(gx + 2, 44, 1, 1, core);
      flame(FR, gx - 1, 6, 6, 5, 3); embers(FR, gx - 3, 4, 10, 5, 9);
    } else if (it.un === 'voidreaver') { // Voidreaver Axe (relic): a double-bladed axe of near-black iron with a violet void edge and orbiting motes
      const pu = .5 + .5 * Math.sin(CLK * 3), edge = mix('#8a4fff', '#e0b8ff', pu);
      B(gx + 1, 4, 2, 42, '#1a1424'); r(gx + 1, 2, 2, 3, '#3a2a52');
      S([[gx + 3, 8, 7, 4], [gx + 3, 12, 9, 8], [gx + 3, 20, 7, 4]], '#241a34'); S([[gx - 6, 8, 7, 4], [gx - 8, 12, 9, 8], [gx - 6, 20, 7, 4]], '#241a34');
      B(gx - 1, 13, 6, 6, '#3a2a52'); r(gx + 11, 13, 1, 6, edge); r(gx - 8, 13, 1, 6, edge); r(gx + 4, 14, 5, 1, '#b06bff'); r(gx - 6, 14, 5, 1, '#b06bff'); r(gx + 1, 15, 2, 2, edge);
      for (let i = 0; i < 6; i++) r(gx + 2 + Math.round(Math.cos(CLK * 3 + i * 1.05) * 11), 16 + Math.round(Math.sin(CLK * 3 + i * 1.05) * 8), 1, 1, i % 2 ? '#d8a8ff' : '#8a4fff');
    } else if (b === 'Sword') { S([[gx, 8, 4, 27], [gx + 1, 5, 2, 3]], P.m); r(gx + 1, 9, 1, 24, lit(P.m)); r(gx + 3, 9, 1, 24, shd(P.m)); B(gx - 3, 34, 10, 3, P.trim); B(gx + 1, 37, 2, 6, '#5a3a1c'); B(gx, 43, 4, 3, P.trim); }
    else if (b === 'Axe') { B(gx + 1, 8, 2, 38, P.wood); S([[gx + 3, 8, 7, 4], [gx + 3, 12, 9, 8], [gx + 3, 20, 7, 4]], P.m); r(gx + 11, 13, 1, 6, lit(P.m)); r(gx + 4, 9, 5, 1, lit(P.m)); B(gx - 2, 12, 3, 3, P.m); }
    else if (b === 'Dagger') { S([[gx + 1, 26, 3, 11], [gx + 2, 24, 1, 2]], P.m); r(gx + 2, 27, 1, 8, lit(P.m)); B(gx - 1, 36, 7, 2, P.trim); B(gx + 1, 38, 2, 5, '#5a3a1c'); B(gx + 1, 43, 2, 2, P.trim); }
    else if (b === 'Mace') { B(gx + 1, 14, 2, 32, P.wood); disc(gx + 2, 10, 5, P.m); r(gx + 2, 2, 1, 3, P.m); r(gx - 4, 10, 3, 1, P.m); r(gx + 6, 10, 3, 1, P.m); r(gx + 2, 15, 1, 3, P.m); if (it.ri >= 3) r(gx + 1, 9, 2, 2, P.gem); }
    else { B(gx + 1, 0, 2, 48, P.wood); S([[gx, -8, 4, 9], [gx + 1, -11, 2, 3]], P.m); r(gx + 1, -7, 1, 7, lit(P.m)); r(gx - 1, 2, 6, 1, P.trim); r(gx - 1, 3, 1, 2, P.trim); r(gx + 4, 3, 1, 2, P.trim); }
    const BOX = { Sword: [gx, 6, 4, 28], Axe: [gx + 3, 8, 9, 16], Dagger: [gx + 1, 24, 3, 12], Mace: [gx - 3, 5, 11, 10] }, bx2 = BOX[b] || [gx, -11, 4, 14]; // where the blade / head is
    rust(it, bx2[0], bx2[1], bx2[2], bx2[3]); if (!own(it)) weaponFx(it, bx2[0], bx2[1], bx2[2], bx2[3]);
  }
}
