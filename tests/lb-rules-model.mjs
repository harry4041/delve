// Model of the leaderboard rules in firestore.rules (no emulator needed). It READS the numbers out of the rules file, so it
// fails if the file drifts from the model, checks that the client's limits (src/lbrules.js) are the same numbers, then plays
// honest and cheating traces against them, including the client's own trimming (lbClamp).
// usage: node tests/lb-rules-model.mjs
import fs from 'fs';
import { LB, lbClamp } from '../src/lbrules.js';
const src = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');
const num = (re, name) => { const m = src.match(re); if (!m) throw new Error('rules file no longer matches the model: ' + name); return m.slice(1).map(Number); };
const [stageCap] = num(/d\.stage <= (\d+)/, 'stage cap'), [powerCap] = num(/d\.power <= (\d+)\n/, 'power cap'), [ascCap] = num(/d\.asc <= (\d+)\n/, 'asc cap'), [starCap] = num(/d\.stars <= (\d+)\n/, 'star cap');
const [sA, sD] = num(/old\.stage \+ (\d+) \+ \(.*?\) \/ (\d+)/, 'stage growth'), [aA, aD] = num(/old\.asc \+ (\d+) \+ \(.*?\) \/ (\d+)/, 'asc growth'), [rA, rD] = num(/old\.stars \+ (\d+) \+ \(.*?\) \/ (\d+)/, 'star growth');
const [pFloor, pMul, pD] = num(/\(old\.power > (\d+) \? old\.power : \d+\) \* (\d+) \+ \(.*?\) \/ (\d+)/, 'power growth');
const firstFree = /resource == null \|\| lbGrowth\(/.test(src);
const MIN_GAP = 5 * 60e3;
const shape = (d) => d.stage >= 0 && d.stage <= stageCap && d.power >= 0 && d.power <= powerCap && d.asc >= 0 && d.asc <= ascCap && d.stars >= 0 && d.stars <= starCap;
const grow = (o, d, dt) => dt > MIN_GAP && d.stage >= o.stage && d.asc >= o.asc && d.stars >= o.stars && d.stage <= o.stage + sA + dt / sD && d.asc <= o.asc + aA + dt / aD && d.stars <= o.stars + rA + dt / rD && d.power <= (o.power > pFloor ? o.power : pFloor) * pMul + dt / pD;
const allow = (old, d, dt) => shape(d) && (old ? grow(old, d, dt) : firstFree);
const out = [], ck = (n, c, x) => out.push((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : ''));
const E = (stage, power, asc, stars) => ({ stage, power, asc, stars });

// 0 the client uses the same numbers as the rules
ck('client caps match the rules', LB.cap.stage === stageCap && LB.cap.power === powerCap && LB.cap.asc === ascCap && LB.cap.stars === starCap, JSON.stringify(LB.cap));
ck('client growth matches the rules', LB.grow.stage[0] === sA && LB.grow.stage[1] === sD && LB.grow.asc[0] === aA && LB.grow.asc[1] === aD && LB.grow.stars[0] === rA && LB.grow.stars[1] === rD && LB.power[0] === pFloor && LB.power[1] === pMul && LB.power[2] === pD);
ck('client waits at least the rules gap', LB.gap >= MIN_GAP);
// 1 first entries: no start ceiling, only the hard caps
ck('first entries have no start ceiling', firstFree);
ck('a veteran can join (stage 201, power 5.6M, 8 asc: the reported case)', allow(null, E(201, 5618705, 8, 0)));
ck('a very long-lived player can join', allow(null, E(5000, 9e12, 400, 90)));
ck('values over the hard caps are refused', !allow(null, E(stageCap + 1, 1, 0, 0)) && !allow(null, E(1, powerCap + 1, 0, 0)));
ck('but the client trims them to the caps, so joining still works', allow(null, lbClamp(E(1e9, 1e300, 1e6, 1e6), null, 0)));
// 2 honest play at the pace measured by tests/career.html (2026-11-13: +55 stages and +9M power in the worst 10 minutes), published every 10 min
{ let o = E(0, 300, 0, 0), ok = true; const dt = 600e3;
  for (let i = 0; i < 60; i++) { const d = { stage: o.stage + 55, power: Math.max(o.power * 3, o.power + 9e6), asc: o.asc + 2, stars: o.stars + 1 }; if (!allow(o, d, dt)) { ok = false; break } o = { ...d, power: Math.min(d.power, 1e12) }; }
  ck('sustained worst-case honest pace for 10 h passes', ok, ok ? '(ends at stage ' + o.stage + ')' : 'blocked at stage ' + o.stage); }
ck('honest catch-up after 8 h offline (stage +300, asc +6, power x8)', allow(E(100, 3e6, 20, 0), E(400, 2.4e7, 26, 0), 8 * 3600e3));
ck('power falls after an ascension (allowed)', allow(E(100, 5000, 20, 2), E(100, 40, 21, 2), 600e3));
ck('stage can never go down', !allow(E(100, 5000, 20, 2), E(99, 5000, 20, 2), 600e3));
ck('asc can never go down', !allow(E(100, 5000, 20, 2), E(100, 5000, 19, 2), 600e3));
ck('writes closer than 5 minutes are refused', !allow(E(100, 5000, 20, 2), E(100, 5000, 20, 2), 4 * 60e3));
// 3 the client's trimming: whatever the save says, a write the client sends (after waiting gap+skew) is accepted, even if the
// client's clock runs up to LB.skew ahead of the server, and repeated writes converge on the real scores
{ let bad = 0, n = 0, conv = true; let seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let t = 0; t < 400; t++) {
    let o = E(Math.floor(rnd() * 500), Math.floor(rnd() * 1e8), Math.floor(rnd() * 30), Math.floor(rnd() * 20));
    const real = E(o.stage + Math.floor(rnd() * 5000), Math.floor(rnd() * 1e14), o.asc + Math.floor(rnd() * 300), o.stars + Math.floor(rnd() * 100));
    let k = 0;
    for (; k < 400; k++) {
      const serverDt = LB.gap + LB.skew + 5000 + Math.floor(rnd() * 3600e3), clientDt = serverDt + Math.floor(rnd() * LB.skew); // client clock ahead by up to skew
      const d = lbClamp(real, o, clientDt); n++;
      if (!allow(o, d, serverDt)) { bad++; break; }
      o = d; if (['stage', 'power', 'asc', 'stars'].every((x) => o[x] === Math.min(real[x], LB.cap[x]))) break;
    }
    if (k === 400) conv = false;
  }
  ck('every trimmed write is accepted by the rules', bad === 0, bad + ' refused of ' + n);
  ck('trimmed entries reach the real scores', conv); }
// 4 cheating: a cheater can now post anything under the caps by joining (or leaving and rejoining); the pace rules only stop
// sudden jumps between ordinary updates. Admins remove entries (delete lb/<uid>, create banned/<uid>).
ck('a jump of +10,000 stages in one update is refused', !allow(E(100, 5000, 5, 0), E(10100, 5000, 5, 0), 600e3));
ck('power cannot grow more than tenfold per update plus the allowance', !allow(E(10, 2e7, 0, 0), E(10, 2e8 + 6e5 + 1, 0, 0), 600e3));
console.log(out.join('\n')); process.exit(out.some((l) => l.startsWith('FAIL')) ? 1 : 0);
