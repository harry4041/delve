// Pet abilities. Only ONE pet is active at a time (S.ap); each has a signature ability that scales with a
// particular kind of build. petFx() turns the active pet + its level/stars + your upgrades into the numbers
// battle.js uses, so combat code only reads fields from this object.
import { S, PET } from './state.js';
import { L } from './stats.js';

export const petScale = (p) => 1 + .03 * (p.lvl || 0) + .15 * (p.star || 0); // pet level and stars strengthen abilities
const NONE = Object.freeze({
  slow: 0, heal: 0,                       // Pip: enemy attack interval +slow, heal fraction of max HP per pet hit
  crit: false, boss: 1, critBonus: 0,     // Fang: pet hits crit like the hero, boss damage multiplier
  burnCap: 0, burnTick: 0, burnDur: 0,    // Ember: max burn stacks, per-stack tick as a fraction of a pet hit, duration
  redirect: 0, reflect: 0,                // Moss: share of incoming damage taken by the golem, reflect multiplier
  gold: 0, loot: 0, luck: 0,              // Coin: bonus gold per kill, extra loot rolls per enemy, better loot quality
  mana: 0, cdr: 0, haste: 0, spell: 0,    // Spark: mana/s, spell recharge speed, hero attack speed, spell damage bonus
});

export function petFx(i = S.ap) {
  const P = PET[i], p = S.pets && S.pets[i];
  if (i < 0 || !P || !p || !p.own) return NONE;
  const A = petScale(p), f = { ...NONE };
  switch (P.k) {
    case 'pip':   // sustain: heals every hit (scales with Vigor) and slows enemies a little
      f.slow = Math.min(.40, (.10 + .04 * L('pipSticky')) * A);
      f.heal = .012 * A * (1 + Math.min(1.5, L('vigor') / 20)) * (1 + .3 * L('pipThick'));
      break;
    case 'fang':  // crit: hits crit with YOUR crit chance and damage; hunts bosses
      f.crit = true; f.boss = 1.2 + .1 * L('fangAlpha'); f.critBonus = .12 * L('fangBlood');
      break;
    case 'ember': // fire: stacking burn that grows with Arcana and Fire upgrades
      f.burnCap = 4 + L('embInferno');
      f.burnTick = .04 * (1 + .6 * Math.sqrt(L('arcana') + 2 * L('spFirePow'))) * (1 + .15 * L('embRoast'));
      f.burnDur = 4 + .5 * L('embRoast');
      break;
    case 'moss':  // defence: takes a share of every hit and reflects it; grows with Grit and thorns
      f.redirect = Math.min(.50, (.12 + Math.min(.22, L('grit') / 130) + .04 * L('mossGranite')) * A);
      f.reflect = .7 * (1 + .2 * L('mossQuake'));
      break;
    case 'coin':  // economy: more gold per kill and extra loot rolls; grows with Greed
      f.gold = (.10 + Math.min(.80, L('greed') / 30) + .04 * L('coinPick') * (1 + Math.min(2, L('greed') / 10))) * A;
      f.loot = (3 + .5 * L('coinMap')) * A;  // extra loot rolls per enemy (fractions roll a chance)
      f.luck = (1.8 + .15 * L('coinMap')) * A;   // added to the loot-quality factor
      break;
    case 'spark': // casting: mana, faster spells, a little hero attack speed; grows with Arcana
      f.mana = (2.5 + .08 * L('arcana')) * A + .5 * L('sparkSurge');
      f.cdr = Math.min(.6, (.22 + .03 * L('sparkOver')) * A);
      f.spell = Math.min(1.2, (.25 + .015 * L('arcana')) * A); // spell damage, Mend healing and Frost stun length
      f.haste = Math.min(.12, .05 * A);
      break;
  }
  return f;
}

const pc = (v) => Math.round(v * 100);
// One-line description of what a pet does for you right now (shown in the Pets tab).
export function petInfo(i) {
  const f = petFx(i), P = PET[i];
  switch (P.k) {
    case 'pip': return 'enemies attack ' + pc(f.slow) + '% slower, each hit heals ' + (f.heal * 100).toFixed(1) + '% of your health';
    case 'fang': return 'hits crit like you do, +' + pc(f.boss - 1) + '% damage to bosses';
    case 'ember': return 'stacks a burn up to x' + f.burnCap + ', each stack burns ' + (f.burnTick * 100).toFixed(1) + '% of a hit every 0.5s';
    case 'moss': return 'takes ' + pc(f.redirect) + '% of damage for you and reflects it x' + f.reflect.toFixed(1);
    case 'coin': return '+' + pc(f.gold) + '% gold per kill, +' + f.loot.toFixed(1) + ' loot rolls per enemy and better loot';
    case 'spark': return '+' + f.mana.toFixed(1) + ' mana/s, spells recharge ' + pc(f.cdr) + '% faster and are ' + pc(f.spell) + '% stronger (damage, healing, stun), +' + pc(f.haste) + '% attack speed';
  }
  return '';
}
