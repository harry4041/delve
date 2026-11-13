// Loot tuning knobs, kept in one place so the career bot (tests/career.html?stb=..&top=..) can try variants.
//   stb: [a, b]  stage at which item step n (3 per rarity tier: I, II, III) first drops = round(1 + a*n + b*n*(n-1)); the old game was [9, .45]
//   top: 0       old behaviour: drop weights fall off from the LOWEST unlocked step (most drops are the lowest step)
//        r > 0   new: weights fall off from the HIGHEST unlocked step by factor r per step down (most drops are near your top tier)
//   dg:  extra enemy growth per stage (added to both hp and attack growth), to absorb the extra gear power an earlier tier ladder gives
// Chosen with tests/career.html (3 h runs, probe=1): rarity becomes visible inside a normal life (equipped average about Rare), while the
// extra gear power is absorbed by dg so the pace stays close to the old game (stage 50 at ~50 min, stage 80 at ~2 h, stage 100 at ~2.5 h; the old game was 55 min / 2 h 35 / later).
// 2026-11-13 re-tune (24 h career run: gear was almost irrelevant, best worn tier 5 in 24 h): stb [3,.1] puts Divine (wings) at stage ~106 and tier 10 at ~178, dg .04 keeps the pace close to before
// (3 h probe: stage 100 at 68 min vs 88, honest max rise 25 stages/10 min vs 26, best worn tier 9 vs 5, naked hero reaches 57% of the geared stage vs 52%).
export const LOOT = { stb: [3, .1], top: .6, dg: .04 };
