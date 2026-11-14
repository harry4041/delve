// The goal tabs under More -> Goals: Bounties (q), Trophies (t), Bestiary (b) and the Spire (s), plus the Spire's defeat text.
// Ported line for line from the Unity version's GoalViews.cs so both versions show the same screens; keep them in step.
import { S } from './state.js';
import { fmtN } from './stats.js';
import {
  M, ensureBounties, untilReset, bountyGold, bountyDef, bountyProgress, chestReady, CHEST_GEMS, CHEST_RUSH_MIN,
  BOOSTS, BOOST_CAP_MIN, boostLeftText, canBuyBoost, LINES, trophyPoints, trophyMaxPoints, trophyPowerMult, trophyGoldMult,
  trophyClaimed, trophyCanClaim, trophyGems, beasts, beastTotalStars, beastMaxStars, beastKills, beastStars, beastThresholds,
  spireUnlocked, spireNext, spireMod, spireStage, floorGold, floorGems, SPIRE_UNLOCK, MODS, bountiesClaimable, trophiesClaimable,
} from './meta.js';
import { TP } from './state.js';

const F = (v) => fmtN(v);
const E = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pct = (m) => ((m - 1) * 100).toFixed(1).replace('.0', '') + '%';
function bar(frac, col = 'var(--c1)') {
  const p = Math.max(0, Math.min(1, frac)) * 100;
  return '<div style="height:6px;background:var(--bg);margin:4px 0 2px"><div style="height:6px;width:' + p.toFixed(1) + '%;background:' + col + '"></div></div>';
}
const head = (title, right = '') => '<div class="row sp"><div class="px" style="font-size:9px">' + title + '</div>' + (right !== '' ? '<span class="mute">' + right + '</span>' : '') + '</div>';

// ---------------------------------------------------------------- bounties + boosts
export function bountyTab() {
  ensureBounties(); const m = M(), left = untilReset();
  let h = '<div class="box">' + head('Daily bounties', 'new in ' + Math.floor(left / 3600000) + 'h ' + Math.floor((left % 3600000) / 60000) + 'm');
  h += '<div class="mute" style="margin:6px 0">Three tasks a day. Each pays 1 gem and ' + F(bountyGold()) + ' gold. Finish all three to open the daily chest. Nothing is lost if you skip a day.</div>';
  m.bounties.forEach((b, i) => {
    const d = bountyDef(b.k), p = bountyProgress(b), ok = p >= b.goal;
    const btn = b.done ? '<span class="mute">Claimed ✓</span>'
      : ok ? '<button class="s" data-a="bClaim" data-v="' + i + '">Claim</button>'
        : !m.rerolled ? '<button class="s alt" data-a="bReroll" data-v="' + i + '">Swap task</button>' : '';
    h += '<div class="it"><div style="min-width:0;flex:1"><b' + (b.done ? ' class="mute"' : '') + '>' + E(d ? d.text(b.goal) : b.k) + '</b><small>'
      + F(Math.min(p, b.goal)) + ' / ' + F(b.goal) + (b.k === 'stage' ? ' (deepest today)' : '') + '</small>' + bar(p / b.goal, b.done ? 'var(--mute)' : 'var(--c1)') + '</div><div class="row">' + btn + '</div></div>';
  });
  if (!m.rerolled && m.bounties.some((b) => !b.done)) h += '<div class="mute" style="font-size:16px;margin-top:4px">You can swap one unfinished task a day.</div>';
  const ready = chestReady();
  h += '<div style="margin-top:8px">' + (m.chest ? '<span class="mute">Daily chest opened. New bounties tomorrow.</span>'
    : '<button class="' + (ready ? '' : 'alt') + '" data-a="bChest"' + (ready ? '' : ' disabled') + '>🎁 Daily chest: 💎' + F(CHEST_GEMS) + ' + ' + F(CHEST_RUSH_MIN) + ' min Gold rush</button>') + '</div>';
  h += '</div>';

  h += '<div class="box">' + head('Boosts', '💎' + F(S.gems || 0) + ' gems');
  h += '<div class="mute" style="margin:6px 0">Spend gems on a timed boost. Buying again adds more time (up to ' + F(BOOST_CAP_MIN / 60) + ' hours). Boosts keep running while you are away.</div>';
  for (const d of BOOSTS) {
    const lt = boostLeftText(d.k), can = canBuyBoost(d);
    h += '<div class="it"><div><b' + (lt !== '' ? ' style="color:var(--gold)"' : '') + '>' + E(d.n) + '</b>' + (lt !== '' ? ' <span class="up">active · ' + lt + '</span>' : '')
      + '<small>' + E(d.d) + '</small></div><div class="row"><button class="s' + (can ? '' : ' alt') + '" data-a="boost" data-v="' + d.k + '"' + (can ? '' : ' disabled') + '>+' + F(d.minutes) + ' min · 💎' + F(d.gems) + '</button></div></div>';
  }
  return h + '</div>';
}

// ---------------------------------------------------------------- trophies
export function trophyTab() {
  const pts = trophyPoints();
  let h = '<div class="box">' + head('Trophies', pts + ' / ' + trophyMaxPoints() + ' points');
  h += '<div style="margin:6px 0">Every trophy tier you claim pays gems and a trophy point. Points give <span class="up">+' + pct(trophyPowerMult()) + ' attack and health</span> and <span class="up">+' + pct(trophyGoldMult()) + ' gold from enemies</span> (0.5% and 1% per point).</div>';
  for (const l of LINES) {
    const c = trophyClaimed(l.k), max = c >= l.tiers.length, v = l.val();
    const stars = '★'.repeat(Math.min(c, l.tiers.length)) + '☆'.repeat(Math.max(0, l.tiers.length - c));
    let body;
    if (max) body = '<small>All tiers claimed. ' + E(l.d(l.tiers[l.tiers.length - 1])) + '.</small>';
    else { const t = l.tiers[c]; body = '<small>' + E(l.d(t)) + ' · ' + F(Math.min(v, t)) + ' / ' + F(t) + '</small>' + bar(v / t); }
    const btn = max ? '<span class="mute">Max</span>'
      : trophyCanClaim(l) ? '<button class="s" data-a="trClaim" data-v="' + l.k + '">Claim · 💎' + F(trophyGems(c)) + '</button>' : '';
    h += '<div class="it"><div style="min-width:0;flex:1"><b>' + E(l.n) + '</b> <span style="color:var(--gold)">' + stars + '</span>' + body + '</div><div class="row">' + btn + '</div></div>';
  }
  return h + '</div>';
}

// ---------------------------------------------------------------- bestiary
export function bestiaryTab() {
  const ts = beastTotalStars();
  let h = '<div class="box">' + head('Bestiary', ts + ' / ' + beastMaxStars() + ' stars');
  h += '<div class="mute" style="margin:6px 0">Every kind of enemy earns up to three stars as you defeat it (50, 500 and 5,000 kills; 5, 50 and 500 for death knights). Each star adds 4% damage against that kind. Pick your Start stage to farm a zone.</div>';
  for (let z = 0; z < 6; z++) {
    const first = z * 5 + 1;
    h += '<div class="px" style="font-size:9px;margin:10px 0 4px;color:var(--c3)">' + E(TP[z]) + ' · stages ' + first + '-' + (first + 4) + ' (and every 30 after)</div>';
    for (const e of beasts().filter((x) => x.zone === z)) {
      const k = beastKills(e.key), st = beastStars(e.key, e.boss), th = beastThresholds(e.boss);
      const next = st >= 3 ? 'mastered' : 'next star at ' + F(th[st]);
      const bonus = st > 0 ? ' <span class="up">+' + (st * 4) + '% damage</span>' : '';
      h += '<div class="it"><div style="min-width:0;flex:1"><b' + (k > 0 ? (e.boss ? ' style="color:var(--hp)"' : '') : ' class="mute"') + '>' + (k > 0 ? E(e.name) : '???') + '</b> <span style="color:var(--gold)">'
        + '★'.repeat(st) + '☆'.repeat(3 - st) + '</span>' + bonus + '<small>' + F(k) + ' defeated · ' + next + '</small></div></div>';
    }
  }
  return h + '</div>';
}

// ---------------------------------------------------------------- the Spire
export function spireTab() {
  if (!spireUnlocked())
    return '<div class="box">' + head('The Spire') + '<div style="margin:6px 0">A tower of wardens beside the dungeon. Reach stage ' + SPIRE_UNLOCK + ' to unlock it (your best is ' + (S.bestOverall || 0) + ').</div></div>';
  const best = M().spireBest, next = spireNext(), mod = spireMod(next);
  let h = '<div class="box">' + head('The Spire', 'best floor ' + best);
  h += '<div style="margin:6px 0">Climb a tower of single, boss-strength wardens. Each climb starts at your first uncleared floor with full health and goes on until you fall. Floors pay out once, the first time you clear them, and every floor cleared gives <span class="up">+1% attack and health</span> everywhere (now <span class="up">+' + best + '%</span>).</div>';
  h += '<div class="it"><div><b>Floor ' + next + ': ' + E(mod.n) + ' warden</b><small>' + E(mod.d) + ' As strong as the stage ' + spireStage(next) + ' boss. First clear: ' + F(floorGold(next)) + ' gold'
    + (floorGems(next) > 0 ? ' and 💎' + F(floorGems(next)) : '') + '.</small></div></div>';
  h += '<div style="margin:8px 0"><button data-a="spire" style="width:100%;font-size:22px;padding:8px">▲ Climb from floor ' + next + '</button></div>';
  h += '<div class="mute" style="font-size:16px">Gems every 5th floor. Twists repeat in a cycle: ' + MODS.map((m) => m.n).join(', ') + '.</div>';
  return h + '</div>';
}

export function spireDefeat(r) {
  const n = r.towerFloors || 0, gm = r.towerGems || 0;
  return 'Fell on floor ' + r.floor + '<br>' + (n > 0 ? 'Cleared ' + n + (n === 1 ? ' floor' : ' floors') + ', +' + F(r.gold) + ' gold' + (gm > 0 ? ', 💎' + F(gm) : '') : 'No new floors this time')
    + '<br><span class="mute">Spire bonus: +' + M().spireBest + '% attack and health</span>';
}

// The More menu's dot: something to claim on the goal tabs.
export function goalsClaimable() { return bountiesClaimable() || trophiesClaimable(); }
