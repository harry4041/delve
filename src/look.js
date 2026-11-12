// Character customisation: purely cosmetic choices stored as palette INDICES in S.look (never free-form colours, so a bad or
// hostile save can only ever select one of these options). Index 0 of every group is the original look, so old saves look
// exactly as before.
import { S } from './state.js';
import { RL } from './stats.js';

const sw = (n, c) => ({ n, c });
export const LOOK_GROUPS = [
  { k: 'skin', n: 'Skin', opts: [sw('Peach', '#ffd5ac'), sw('Fair', '#f6e0cf'), sw('Tan', '#e0ac69'), sw('Bronze', '#c68642'), sw('Brown', '#8d5524'), sw('Deep', '#5c3a21'), sw('Moss', '#9bd18b'), sw('Frost', '#b8c4ff')] },
  { k: 'hs', n: 'Hair style', opts: [sw('Spiky', null), sw('Short', null), sw('Long', null), sw('Mohawk', null), sw('Bald', null)] },
  { k: 'hair', n: 'Hair colour', opts: [sw('Ginger', '#ff9a2e'), sw('Blonde', '#f2d16b'), sw('Brown', '#6b4226'), sw('Black', '#1f1a24'), sw('Red', '#c0392b'), sw('White', '#e8e8f0'), sw('Blue', '#3d8bff'), sw('Pink', '#ff7ab8'), sw('Green', '#4cc46a'), sw('Purple', '#a04fd0')] },
  { k: 'tun', n: 'Outfit', opts: [sw('Blue', '#3d8bff'), sw('Red', '#d94a4a'), sw('Green', '#3fa86a'), sw('Purple', '#8a5ad0'), sw('Gold', '#d9a63a'), sw('Teal', '#2fb5b0'), sw('Black', '#34303f'), sw('White', '#d8d8e8'), sw('Orange', '#e0803a'), sw('Pink', '#e070a8')] },
  { k: 'scarf', n: 'Scarf', opts: [sw('Red', '#d94a4a'), sw('None', null), sw('Blue', '#3d8bff'), sw('Gold', '#e8c050'), sw('Green', '#3fa86a'), sw('Purple', '#8a5ad0'), sw('White', '#e8e8f0'), sw('Black', '#2a2434')] },
  { k: 'cape', n: 'Cape', opts: [sw('Auto', 'auto'), sw('None', null), sw('Crimson', '#b02838'), sw('Royal', '#2a50b8'), sw('Forest', '#2a7a3a'), sw('Violet', '#7a3ab8'), sw('Gold', '#c8982a'), sw('Black', '#26202e'), sw('White', '#d8d8e8')] },
  { k: 'eye', n: 'Eye colour', opts: [sw('Night', '#2b2150'), sw('Sky', '#2a6fd0'), sw('Emerald', '#2a9a4a'), sw('Brown', '#6a3a1a'), sw('Violet', '#8a2ab0'), sw('Ember', '#d02a2a'), sw('Gold', '#d0a020')] },
  // Face: shapes are drawn by HERO_ST.face in render.js (all four default to the original look at index 0). Append new options at the END of a group.
  { k: 'es', n: 'Eye shape', opts: [sw('Round', null), sw('Narrow', null), sw('Wide', null), sw('Sleepy', null), sw('Happy', null)] },
  { k: 'br', n: 'Brows', opts: [sw('Neutral', null), sw('Angry', null), sw('Worried', null), sw('Raised', null), sw('None', null)] },
  { k: 'mo', n: 'Mouth', opts: [sw('Smile', null), sw('Grin', null), sw('Neutral', null), sw('Smirk', null), sw('Frown', null), sw('Surprised', null)] },
  { k: 'ch', n: 'Cheeks', opts: [sw('None', null), sw('Blush', null), sw('Freckles', null), sw('Both', null), sw('Stubble', null)] },
];
const G = Object.fromEntries(LOOK_GROUPS.map((g) => [g.k, g]));

// Index chosen for a group, always inside the option range.
export function lookIdx(k) {
  const v = S.look && S.look[k], n = G[k].opts.length;
  return Number.isInteger(v) && v >= 0 && v < n ? v : 0;
}
const opt = (k) => G[k].opts[lookIdx(k)];

// What the figure renderer needs for the hero.
export function lookStyle() {
  const hs = lookIdx('hs');
  return { skin: opt('skin').c, hs, hair: hs === 4 ? null : opt('hair').c, hairCol: opt('hair').c, tun: opt('tun').c, scarf: opt('scarf').c, eye: opt('eye').c, es: lookIdx('es'), br: lookIdx('br'), mo: lookIdx('mo'), ch: lookIdx('ch') };
}

// Cape colour for the battle scene and portrait: null = no cape, 'auto' = crimson, or the colour of the best gear from Epic up.
export const capesUnlocked = () => RL('rCape') > 0; // the Heroic mantle relic (Ascend tab) unlocks capes
export function capeColor(gearRi, gearCol) {
  if (!capesUnlocked()) return null;
  const c = opt('cape').c;
  if (c === null) return null;
  if (c === 'auto') return gearRi >= 3 ? gearCol : '#b02838';
  return c;
}

// data-v is "group:index", "rand" or "reset".
export function applyLook(v) {
  if (!S.look || typeof S.look !== 'object') S.look = {};
  if (v === 'reset') { S.look = {}; return; }
  if (v === 'rand') { for (const g of LOOK_GROUPS) S.look[g.k] = Math.floor(Math.random() * g.opts.length); return; }
  const parts = String(v).split(':');
  if (parts.length !== 2 || !/^[0-9]{1,2}$/.test(parts[1])) return;
  const k = parts[0], n = +parts[1];
  if (Object.prototype.hasOwnProperty.call(G, k) && Number.isInteger(n) && n >= 0 && n < G[k].opts.length) S.look[k] = n; // own keys only: '__proto__' and 'constructor' must not count as groups
}

export function lookTab() {
  const group = (g) => {
    const cur = lookIdx(g.k);
    if (g.k === 'cape' && !capesUnlocked()) return '<div style="margin-bottom:8px"><div class="mute" style="margin-bottom:3px">Cape: <b style="color:var(--ink)">locked</b></div><div class="mute">Capes are unlocked with the <b>Heroic mantle</b> relic (Ascend tab). Your first ascension earns the relics for it.</div></div>';
    return '<div style="margin-bottom:8px"><div class="mute" style="margin-bottom:3px">' + g.n + ': <b style="color:var(--ink)">' + g.opts[cur].n + '</b></div><div class="row" style="flex-wrap:wrap;gap:4px">'
      + g.opts.map((o, i) => (o.c && o.c !== 'auto'
        ? '<button class="sw' + (i === cur ? ' on' : '') + '" data-a="look" data-v="' + g.k + ':' + i + '" title="' + o.n + '" aria-label="' + g.n + ' ' + o.n + '" style="background:' + o.c + '"></button>'
        : '<button class="s' + (i === cur ? '' : ' alt') + '" data-a="look" data-v="' + g.k + ':' + i + '">' + o.n + '</button>')).join('') + '</div></div>';
  };
  return '<div class="box"><div class="px" style="font-size:9px;margin-bottom:6px">Appearance</div>'
    + '<div style="display:flex;gap:10px;align-items:flex-start;margin-bottom:8px"><canvas id="pv" width="192" height="160" style="width:52%;aspect-ratio:6/5;flex:none;border:2px solid var(--ink)"></canvas>'
    + '<div style="flex:1;min-width:0"><div class="mute" style="margin-bottom:6px">Pure style: nothing here changes your stats. Your gear is drawn on top.</div>'
    + '<div class="row" style="gap:6px;flex-wrap:wrap"><button class="s" data-a="look" data-v="rand">Randomise</button><button class="s alt" data-a="look" data-v="reset">Reset</button></div></div></div>'
    + LOOK_GROUPS.map(group).join('') + '</div>';
}
