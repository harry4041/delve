// Battle-screen art: zone backdrops, lighting, ambient particles and combat effects.
// The canvas is 192x108 drawn on a 96x54 logical grid (render.js sets a 2x transform). Everything here is pixel
// rects, so it stays crisp. Floor line is y=44; the hero stands at x~14-34 and the enemy at x~58-80.
// Functions take the 2D context `g` so this module has no dependency on render.js.

const hz = (n) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }; // stable pseudo-random 0..1
const R = (g, x, y, w, h, c) => { g.fillStyle = c; g.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
function shade(hex, f) {
  const n = parseInt(hex.slice(1), 16), a = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.max(0, Math.min(255, Math.round(v * f))));
  return '#' + a.map((v) => v.toString(16).padStart(2, '0')).join('');
}
const A = (g, a) => { g.globalAlpha = Math.max(0, Math.min(1, a)); };

// soft radial light: concentric translucent discs
function glow(g, cx, cy, r, col, a) {
  for (let pass = 0; pass < 4; pass++) {
    const rr = r * (1 - pass * .22);
    for (let y = -rr; y <= rr; y++) { const hw = Math.sqrt(rr * rr - y * y); A(g, a / 4); R(g, cx - hw, cy + y, hw * 2, 1, col); }
  }
  A(g, 1);
}
function shadow(g, cx, y, w, a) { // soft ground shadow
  A(g, a); R(g, cx - w / 2, y, w, 1, '#000'); R(g, cx - w / 2 + 2, y + 1, w - 4, 1, '#000'); A(g, a * .6); R(g, cx - w / 2 - 1, y, w + 2, 1, '#000'); A(g, 1);
}

// ---------------------------------------------------------------- shared structure
function bricks(g, z, tier) {
  R(g, 0, 0, 96, 54, shade(z.wall, .45));
  for (let a = 0; a < 8; a++) for (let q = -1; q < 9; q++) {
    const x = q * 12 + (a % 2 ? 6 : 0), y = a * 6; let c = shade(z.wall, .85 + hz(tier * 211 + a * 13 + q * 7) * .4);
    if (tier === 1 && hz(a * 17 + q * 3 + 5) > .7) c = shade('#2f7a30', .8 + hz(a + q) * .35); // mossy bricks
    R(g, x, y, 11, 5, c); R(g, x, y, 11, 1, shade(c, 1.28)); R(g, x, y + 4, 11, 1, shade(c, .7));
    if (hz(tier * 97 + a * 31 + q * 5) > .93) { R(g, x + 3, y + 1, 1, 3, shade(c, .55)); R(g, x + 4, y + 3, 2, 1, shade(c, .55)); } // cracks
  }
}
function pillars(g, z) {
  for (const x of [0, 92]) {
    R(g, x, 0, 4, 44, shade(z.wall, .8)); R(g, x + (x ? 0 : 3), 0, 1, 44, shade(z.wall, .4)); R(g, x + (x ? 3 : 0), 0, 1, 44, shade(z.wall, 1.2));
    R(g, x - (x ? 1 : 0), 0, 5, 3, shade(z.wall, 1)); R(g, x - (x ? 1 : 0), 40, 5, 4, shade(z.wall, .95)); // capital and base
    for (let y = 4; y < 40; y += 5) R(g, x + 1, y, 2, 1, shade(z.wall, .62));
  }
}
function ceilingShadow(g) { for (let i = 0; i < 6; i++) { A(g, .42 - i * .07); R(g, 0, i * 2, 96, 2, '#000'); } A(g, 1); }
function torch(g, z, t, cx = 48) {
  const fl = Math.floor(t * 7) % 3, f2 = Math.sin(t * 13) * .5;
  glow(g, cx, 22, 20 + fl, z.glow, .5);
  R(g, cx - 2, 24, 4, 2, '#4a3a2a'); R(g, cx - 1, 26, 2, 6, '#4a3a2a'); R(g, cx - 2, 32, 4, 1, '#2a2018');
  R(g, cx - 2, 17 + (fl ? 1 : 0), 4, 6, '#ff8a2a'); R(g, cx - 1, 15 + fl, 2, 6, '#ffe45c'); R(g, cx - 1, 20, 2, 2, '#fff6c0');
  A(g, .5 + f2 * .3); R(g, cx + 1, 14 + fl, 1, 2, '#ffd34d'); A(g, 1);
}
function floor(g, z, t, tier) {
  const f = tier === 3 ? '#10303c' : z.floor;
  R(g, 0, 44, 96, 10, f); R(g, 0, 44, 96, 1, shade(f, 1.9));
  for (const y of [47, 50, 53]) { A(g, .55); R(g, 0, y, 96, 1, shade(f, .62)); }
  A(g, 1);
  for (let x = -24; x <= 120; x += 12) for (let yy = 45; yy < 54; yy++) { const xx = 48 + (x - 48) * (1 + (yy - 44) * .075); A(g, .5); R(g, xx, yy, 1, 1, shade(f, .62)); }
  A(g, 1);
  for (let i = 0; i < 12; i++) { const x = hz(tier * 61 + i) * 94, y = 45 + hz(tier * 29 + i * 3) * 8; A(g, .35); R(g, x, y, 2 + hz(i) * 3, 1, shade(f, 1.45)); } // worn stones
  A(g, 1);
  A(g, .16); R(g, 36, 45, 24, 1, z.glow); R(g, 40, 46, 16, 1, z.glow); A(g, 1); // torchlight on the floor
}
function vignette(g) {
  for (let i = 0; i < 12; i++) { A(g, .3 * Math.pow(1 - i / 12, 2)); R(g, i, 0, 1, 54, '#000'); R(g, 95 - i, 0, 1, 54, '#000'); }
  for (let i = 0; i < 6; i++) { A(g, .24 * Math.pow(1 - i / 6, 2)); R(g, 0, 53 - i, 96, 1, '#000'); }
  A(g, 1);
}
function motes(g, t, n, col, speed, seed, sway = 4, a = .5) {
  for (let i = 0; i < n; i++) {
    const x = (hz(seed + i) * 96 + Math.sin(t * .7 + i) * sway + 96) % 96, y = ((hz(seed + i * 3) * 54 + t * speed * (.6 + hz(i) * .8)) % 54 + 54) % 54;
    A(g, a * (.5 + .5 * Math.sin(t * 3 + i))); R(g, x, y, 1, 1, col);
  }
  A(g, 1);
}

// ---------------------------------------------------------------- zones
function crypt(g, z, t) {
  for (const x of [7, 80]) { // arched alcoves with candles and skulls
    R(g, x - 1, 19, 12, 18, shade(z.wall, 1.4)); R(g, x, 21, 10, 15, '#06040a');
    for (let r = 0; r < 3; r++) R(g, x + r + 1, 18 + 2 - (2 - r), 10 - 2 * r - 2, 1, shade(z.wall, 1.4));
    R(g, x + 1, 33, 8, 3, shade(z.wall, .7));
    R(g, x + 6, 29, 2, 4, '#d8d0b0'); const fl = Math.floor(t * 8 + x) % 2; R(g, x + 6, 27 - fl, 2, 2, '#ffd34d'); R(g, x + 7, 26 - fl, 1, 1, '#fff6c0');
    glow(g, x + 7, 27, 7, '#ffb04a', .22);
    R(g, x + 1, 31, 4, 3, '#cfc8dc'); R(g, x + 2, 32, 1, 1, '#06040a'); R(g, x + 4, 32, 1, 1, '#06040a'); R(g, x + 2, 34, 2, 1, '#cfc8dc');
  }
  for (let i = 0; i < 10; i++) { A(g, .32); R(g, i, Math.floor(i * .45), 1, 1, '#c8c0e0'); R(g, Math.floor(i * .45), i, 1, 1, '#c8c0e0'); R(g, 95 - i, Math.floor(i * .45), 1, 1, '#c8c0e0'); R(g, 95 - Math.floor(i * .45), i, 1, 1, '#c8c0e0'); }
  A(g, 1);
  motes(g, t, 9, '#b8b0d8', 1.5, 3);
}
function fungal(g, z, t) {
  for (const [x, len] of [[14, 15], [29, 10], [63, 17], [81, 12], [88, 8]]) for (let y = 0; y < len; y++) {
    const xx = x + Math.round(Math.sin(t * 1.2 + x + y * .35) * 1.4);
    R(g, xx, y, 1, 1, '#2e6a2a'); if (y % 4 === 3) R(g, xx + 1, y, 2, 1, '#4aa03a');
  }
  for (const x of [6, 12, 84, 90]) { // glowing mushrooms in the foreground corners
    const h = 2 + hz(x) * 2, p = .5 + .4 * Math.sin(t * 2 + x);
    glow(g, x + 2, 49, 6, z.glow, .22 * p); R(g, x + 2, 50, 1, 3, '#d8e8d0'); R(g, x, 48, 5, 2, z.glow); R(g, x + 1, 47, 3, 1, shade(z.glow, 1.4)); R(g, x + 1, 48, 1, 1, '#fff');
  }
  motes(g, t, 16, '#80ff90', -3, 11, 5, .6);
}
function ember(g, z, t) {
  for (const x of [9, 81]) { // banners
    R(g, x - 1, 2, 8, 1, '#5a4a30');
    for (let y = 3; y < 24; y++) { const sw = Math.round(Math.sin(t * 1.6 + y * .2 + x) * (y / 24) * 1.2); R(g, x + sw, y, 6, 1, y % 5 === 0 ? '#7a1a1a' : '#a02828'); }
    for (let i = 0; i < 3; i++) R(g, x + 2 + (i === 1 ? 0 : 0) + Math.round(Math.sin(t * 1.6 + 12 * .2 + x) * .6), 11 + i * 2, 2, 1, '#ffd34d');
    R(g, x + 2, 24, 2, 1, '#7a1a1a'); R(g, x, 23, 2, 1, '#7a1a1a'); R(g, x + 4, 23, 2, 1, '#7a1a1a');
  }
  for (let i = 0; i < 6; i++) { // lava cracks in the floor
    const x = 6 + hz(40 + i) * 80, y = 45 + hz(50 + i) * 7, p = .55 + .4 * Math.sin(t * 2.4 + i * 1.7);
    A(g, p); R(g, x, y, 4, 1, '#ff7a1a'); R(g, x + 3, y + 1, 3, 1, '#ff5a0a'); R(g, x + 1, y, 2, 1, '#ffd34d'); A(g, p * .3); R(g, x - 1, y - 1, 8, 3, '#ff7a1a');
  }
  A(g, 1);
  motes(g, t, 20, '#ff9a3a', -6, 21, 3, .8);
}
function vaults(g, z, t) {
  for (const x of [22, 62]) { A(g, .06 + .03 * Math.sin(t * .8 + x)); for (let y = 0; y < 44; y++) R(g, x - 3 - y * .08, y, 8 + y * .16, 1, '#9fe0ff'); } // light shafts
  A(g, 1);
  const cyc = (t * .7) % 2, dx = 36; // drip from the ceiling
  if (cyc < 1.4) { R(g, dx, 4 + cyc * 28, 1, 2, '#9fe0ff'); } else { const k = (cyc - 1.4) / .6; A(g, 1 - k); R(g, dx - 1 - k * 4, 46, 3 + k * 8, 1, '#9fe0ff'); A(g, 1); }
  for (let y = 45; y < 54; y += 2) for (let x = 0; x < 96; x += 7) { A(g, .45); R(g, (x + Math.sin(t * 1.4 + y) * 3 + y * 2) % 96, y, 3, 1, '#4aa8c8'); }
  A(g, 1);
  for (const x of [5, 91]) for (let y = 0; y < 14; y++) { const xx = x + Math.round(Math.sin(t * 1.5 + y * .4 + x) * 1.2); R(g, xx, 43 - y, 1, 1, y % 3 ? '#1f6a48' : '#2f9a68'); }
  motes(g, t, 12, '#bfeaff', -5, 31, 2, .7);
}
function infernal(g, z, t) {
  for (const [x, len] of [[11, 22], [34, 17], [76, 25]]) for (let y = 0; y < len; y += 2) { // chains
    const xx = x + Math.round(Math.sin(t * 1.1 + x + y * .12) * 1.5);
    R(g, xx, y, 2, 2, '#5a5560'); R(g, xx, y, 1, 1, '#9a94a0'); R(g, xx + 1 - (y % 4 ? 1 : 0), y + 1, 1, 1, '#2a2630');
  }
  for (let x = 2; x < 96; x += 6) { R(g, x, 3, 4, 1, '#0a0406'); R(g, x + 1, 4, 2, 1, '#0a0406'); R(g, x + 1, 5, 1, 1, '#0a0406'); } // ceiling spikes
  A(g, .3 + .1 * Math.sin(t * 2)); glow(g, 48, 56, 44, '#ff3a00', .55); A(g, 1);
  for (let i = 0; i < 7; i++) {
    const x = 4 + hz(70 + i) * 86, y = 45 + hz(80 + i) * 7, p = .6 + .4 * Math.sin(t * 3 + i * 2);
    A(g, p); R(g, x, y, 5, 1, '#ff5a0a'); R(g, x + 2, y + 1, 4, 1, '#ff3a00'); R(g, x + 1, y, 2, 1, '#ffd34d'); A(g, 1);
  }
  motes(g, t, 26, '#ff8a3a', -9, 41, 2, .9);
}
function voidz(g, z, t) {
  R(g, 33, 5, 30, 28, shade(z.wall, 1.7)); R(g, 35, 7, 26, 26, '#04030e'); // arched window
  for (let r = 0; r < 4; r++) { R(g, 35 + r, 7 - 3 + r, 26 - r * 2, 1, '#04030e'); R(g, 33 + r, 5 - 3 + r + 1, 30 - r * 2, 1, shade(z.wall, 1.7)); }
  for (let i = 0; i < 26; i++) { A(g, .4 + .6 * Math.abs(Math.sin(t * 1.5 + i))); R(g, 36 + hz(900 + i) * 24, 6 + hz(930 + i) * 26, 1, 1, i % 5 ? '#c8c0ff' : '#fff'); }
  A(g, 1);
  const px = 49 + Math.sin(t * .3) * 4; glow(g, px, 18, 9, '#9030d0', .4); R(g, px - 4, 15, 8, 6, '#6a2a9a'); R(g, px - 3, 14, 6, 1, '#6a2a9a'); R(g, px - 3, 21, 6, 1, '#6a2a9a'); R(g, px - 2, 16, 3, 2, '#a060d8');
  for (let i = 0; i < 6; i++) { // floating rune shards
    const x = 8 + i * 16 + hz(i) * 6, y = 14 + Math.sin(t * 1.1 + i * 1.3) * 5 + hz(i + 9) * 8, p = .5 + .4 * Math.sin(t * 2.5 + i);
    glow(g, x, y, 5, z.glow, .25 * p); R(g, x, y - 2, 1, 5, '#c070ff'); R(g, x - 1, y - 1, 3, 3, '#a050e0'); R(g, x, y, 1, 1, '#fff');
  }
  motes(g, t, 14, '#b070ff', -4, 51, 5, .7);
}
const ZONE_FX = [crypt, fungal, ember, vaults, infernal, voidz];

// ---------------------------------------------------------------- public API
export function drawBackdrop(g, tier, t, z) {
  bricks(g, z, tier); pillars(g, z); ceilingShadow(g);
  if (tier !== 5) torch(g, z, t);
  floor(g, z, t, tier);
  (ZONE_FX[tier] || crypt)(g, z, t);
}
export function drawShadows(g, hx, ex, sc, pet) {
  shadow(g, hx + 10, 44, 18, .38); if (pet) shadow(g, 7, 44, 10, .3); shadow(g, ex + 10 * sc, 44, 16 * sc + 2, .38);
}
export function drawForeground(g, tier, t, z, boss) {
  if (tier === 5) { for (let b = 0; b < 3; b++) { A(g, .1); R(g, (t * (4 + b * 2) + b * 40) % 120 - 20, 46 + b * 2, 40, 2, '#8040c0'); } A(g, 1); } // drifting fog
  if (boss) { A(g, .1 + .06 * Math.sin(t * 3)); R(g, 0, 0, 96, 54, '#a01010'); A(g, 1); } // boss arenas pulse red
  vignette(g);
}

// Combat effects drawn over the characters. `r` is the run object.
export function drawEffects(g, r, t, ex, ey, sc, hx, hy, wcol = '#ffe45c') {
  const ecx = ex + 10 * sc, ecy = ey + 14 * sc;
  if (r.lunge > 0) { // sword slash arc
    const p = 1 - r.lunge / .15;
    for (let i = 0; i <= 12 * p + 1; i++) {
      const a = -1.1 + i * .17, x = ecx + 2 - Math.cos(a) * 13, y = ecy + Math.sin(a) * 15;
      A(g, 1 - i * .04); R(g, x - 1, y - 1, 4, 4, wcol); A(g, Math.max(0, 1 - i * .04)); R(g, x, y, 2, 2, '#fff');
    }
    A(g, 1);
  }
  if (r.ef > 0) { // hit sparks
    const k = 1 - Math.min(1, r.ef / .2);
    for (let i = 0; i < 7; i++) { const a = i * .9 + .3; A(g, 1 - k); R(g, ecx - 6 + Math.cos(a) * (3 + k * 9), ecy + Math.sin(a) * (3 + k * 9), 1, 1, i % 2 ? '#ffe45c' : '#fff'); }
    A(g, 1);
  }
  if (r.critT > 0) { // critical hit starburst
    const k = 1 - r.critT / .3; A(g, 1 - k);
    for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, len = 4 + k * 12; for (let s = 2; s < len; s++) R(g, ecx - 4 + Math.cos(a) * s, ecy + Math.sin(a) * s, 1, 1, s % 3 ? '#ffd34d' : '#fff'); }
    A(g, 1);
  }
  for (const v of r.vfx || []) {
    const p = v.t / v.d;
    if (v.k === 'death') { // dust, bone fragments and (for golden mobs) coins burst out where the enemy stood
      const k = Math.min(1, v.t / v.d), bx = (v.boss ? 58 : 68) + (v.boss ? 14 : 10), by = v.boss ? 22 : 30;
      A(g, 1 - k);
      for (let i = 0; i < 16; i++) { const a = i * .39 + hz(i) * .4, d = 3 + k * (10 + hz(i + 4) * 10), x = bx + Math.cos(a) * d, y = by + Math.sin(a) * d * .8 + k * k * 10;
        R(g, x, y, 2, 2, v.golden ? (i % 2 ? '#ffd34d' : '#fff3b0') : (i % 3 ? '#d8d0e8' : '#8a7aa8')); }
      if (v.golden) for (let i = 0; i < 6; i++) { const a = -1.2 + i * .45, d = 4 + k * 22, x = bx + Math.cos(a) * d, y = by - Math.sin(Math.abs(a)) * d * .6 + k * k * 18; R(g, x, y, 3, 3, '#ffd34d'); R(g, x + 1, y, 1, 3, '#b8860b'); }
      A(g, .6 * (1 - k)); glow(g, bx, by, 10 + k * 10, v.boss ? '#ff4040' : '#d8d0e8', .5); A(g, 1);
    } else if (v.k === 'fire') { // fireball flies to the enemy then bursts
      if (p < 1) { const x = hx + 20 + (ecx - hx - 20) * p, y = hy + 14 + (ecy - hy - 14) * p; glow(g, x, y, 6, '#ff6a1a', .5); R(g, x - 2, y - 2, 4, 4, '#ff8a2a'); R(g, x - 1, y - 1, 2, 2, '#ffe45c'); for (let i = 1; i < 6; i++) { A(g, .6 - i * .1); R(g, x - i * 3, y + Math.sin(t * 20 + i) * 1.5, 2, 2, '#ff5a0a'); } A(g, 1); }
      else { const k = Math.min(1, (v.t - v.d) / .35); A(g, 1 - k); glow(g, ecx, ecy, 8 + k * 8, '#ff7a1a', .8); for (let i = 0; i < 10; i++) { const a = i * .63; R(g, ecx + Math.cos(a) * k * 12, ecy + Math.sin(a) * k * 12, 2, 2, i % 2 ? '#ffd34d' : '#ff5a0a'); } A(g, 1); }
    } else if (v.k === 'heal') { // green rising crosses
      for (let i = 0; i < 7; i++) { const x = hx + 4 + hz(i + 3) * 18, y = hy + 34 - ((v.t * 22 + i * 6) % 34); A(g, 1 - p); R(g, x, y - 1, 1, 3, '#7aff9a'); R(g, x - 1, y, 3, 1, '#7aff9a'); }
      A(g, .25 * (1 - p)); R(g, hx - 2, hy - 3, 24, 38, '#5fe08a'); A(g, 1);
    } else if (v.k === 'frost') { // ice shards snap in around the enemy
      A(g, 1 - Math.max(0, p - .6) * 2.5);
      for (let i = 0; i < 8; i++) { const a = i * .78, d = 12 - Math.min(1, v.t / .25) * 6, x = ecx - 4 + Math.cos(a) * d, y = ecy + Math.sin(a) * d * 1.3; R(g, x, y - 2, 1, 5, '#bfeaff'); R(g, x - 1, y - 1, 3, 3, '#6ecbf5'); R(g, x, y, 1, 1, '#fff'); }
      glow(g, ecx - 4, ecy, 12, '#6ecbf5', .35); A(g, 1);
    } else if (v.k === 'meteor') { // a meteor falls from the top right
      if (p < 1) { const x = ecx + 40 - 40 * p, y = -10 + (ecy + 10) * p; for (let i = 0; i < 9; i++) { A(g, .7 - i * .07); R(g, x + i * 2, y - i * 2, 4 - i * .3, 4 - i * .3, i % 2 ? '#ff7a1a' : '#ffd34d'); } A(g, 1); glow(g, x, y, 9, '#ff6a1a', .6); R(g, x - 3, y - 3, 7, 7, '#7a3a1a'); R(g, x - 2, y - 2, 4, 4, '#ff8a2a'); }
      else { const k = Math.min(1, (v.t - v.d) / .35); A(g, 1 - k); glow(g, ecx, ecy + 4, 14 + k * 16, '#ff5a0a', .9); R(g, ecx - 12 * k - 2, ecy + 6, 24 * k + 4, 2, '#ffd34d'); for (let i = 0; i < 14; i++) { const a = i * .45; R(g, ecx + Math.cos(a) * k * 22, ecy + Math.sin(a) * k * 18, 2, 2, i % 2 ? '#ffd34d' : '#ff3a00'); } A(g, 1); }
    }
  }
}

// ---------------------------------------------------------------- characters
// Cape behind the hero; colour follows the best equipped rarity. `lunge` pulls it back while attacking.
export function drawCape(g, hx, hy, t, col, lunge) {
  const dark = shade(col, .55), mid = shade(col, .8), hi = shade(col, 1.1);
  for (let y = 9; y < 29; y++) {
    const k = (y - 9) / 20, sway = Math.sin(t * 2.6 + y * .32) * k * 2.4 - (lunge ? k * 3 : 0), x0 = hx + 4 - k * 5 + sway, w = 7 + k * 5;
    R(g, x0, hy + y, w, 1, y % 4 === 0 ? dark : mid); R(g, x0, hy + y, 1, 1, dark); R(g, x0 + w - 1, hy + y, 1, 1, dark);
    if (y % 6 === 1) R(g, x0 + 2, hy + y, 2, 1, hi);
  }
  for (let i = 0; i < 5; i++) R(g, hx + 4 - 5 + i * 2.4 + Math.sin(t * 2.6 + 28 * .32) * 2.4, hy + 29, 2, 1, i % 2 ? dark : mid); // ragged hem
}
// Rotating rune circle at the hero's feet (richer with rarity) and sparkles for Legendary and above.
export function drawHeroAura(g, hx, hy, t, bestRi, col) {
  if (bestRi < 1) return;
  const cx = hx + 10, n = Math.min(18, 6 + bestRi * 2);
  A(g, .16 + bestRi * .02); R(g, cx - 14, 43, 28, 1, col); R(g, cx - 12, 44, 24, 1, col); R(g, cx - 14, 45, 28, 1, col); A(g, 1);
  for (let i = 0; i < n; i++) { const a = t * .9 + i * 2 * Math.PI / n; A(g, .35 + .55 * (Math.sin(a * 2 + t) * .5 + .5)); R(g, cx + Math.cos(a) * 13, 44 + Math.sin(a) * 2.6, 1, 1, i % 3 ? col : '#fff'); }
  A(g, 1);
  if (bestRi >= 4) for (let i = 0; i < 4 + bestRi; i++) { // rising sparkles
    const x = hx + 2 + hz(i * 3) * 16, y = hy + 32 - ((t * (6 + hz(i) * 6) + i * 7) % 34); A(g, .8 * (1 - (hy + 32 - y) / 34)); R(g, x, y, 1, 1, i % 2 ? '#fff' : col); if (bestRi >= 6 && i % 3 === 0) { R(g, x - 1, y, 3, 1, col); R(g, x, y - 1, 1, 3, col); }
  }
  A(g, 1);
}
// Mob extras: menace aura on bosses, glowing eyes on cultists and bosses.
export function drawMobFx(g, r, t, ex, ey, sc) {
  if (r.boss) { const p = .5 + .5 * Math.sin(t * 2.2); glow(g, ex + 10 * sc, ey + 16 * sc, 22 * sc, '#c01818', .35 + .15 * p); }
  if (r.boss || r.eType === 4) {
    const p = .55 + .45 * Math.sin(t * 5), col = r.boss ? '#ff3a3a' : '#e050ff';
    glow(g, ex + 10 * sc, ey + 5 * sc, 5 * sc, col, .3 * p);
    A(g, .6 + .4 * p); R(g, ex + 6 * sc, ey + 5 * sc, 2, 1, col); R(g, ex + 12 * sc, ey + 5 * sc, 2, 1, col); R(g, ex + 6 * sc, ey + 5 * sc, 1, 1, '#fff'); R(g, ex + 12 * sc, ey + 5 * sc, 1, 1, '#fff'); A(g, 1);
  }
}
