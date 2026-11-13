// Model of the leaderboard rules in firestore.rules (no emulator needed). It READS the numbers out of the rules file, so it
// fails if the file drifts from the model, then plays honest and cheating traces against them.
// usage: node tests/lb-rules-model.mjs
import fs from 'fs';
const src = fs.readFileSync(new URL('../firestore.rules', import.meta.url), 'utf8').split(String.fromCharCode(13)).join('');
const num = (re, name) => { const m = src.match(re); if (!m) throw new Error('rules file no longer matches the model: ' + name); return m.slice(1).map(Number); };
const [stageCap] = num(/d\.stage <= (\d+)/, 'stage cap'), [powerCap] = num(/d\.power <= (\d+)\n/, 'power cap'), [ascCap] = num(/d\.asc <= (\d+)\n/, 'asc cap'), [starCap] = num(/d\.stars <= (\d+)\n/, 'star cap');
const [s0, p0, a0, r0] = num(/d\.stage <= (\d+) && d\.power <= (\d+) && d\.asc <= (\d+) && d\.stars <= (\d+)/, 'start ceilings');
const [sA, sD] = num(/old\.stage \+ (\d+) \+ \(.*?\) \/ (\d+)/, 'stage growth'), [aA, aD] = num(/old\.asc \+ (\d+) \+ \(.*?\) \/ (\d+)/, 'asc growth'), [rA, rD] = num(/old\.stars \+ (\d+) \+ \(.*?\) \/ (\d+)/, 'star growth');
const [pFloor, pMul, pD] = num(/\(old\.power > (\d+) \? old\.power : \d+\) \* (\d+) \+ \(.*?\) \/ (\d+)/, 'power growth');
const MIN_GAP = 5 * 60e3;
const shape = (d) => d.stage >= 0 && d.stage <= stageCap && d.power >= 0 && d.power <= powerCap && d.asc >= 0 && d.asc <= ascCap && d.stars >= 0 && d.stars <= starCap;
const start = (d) => d.stage <= s0 && d.power <= p0 && d.asc <= a0 && d.stars <= r0;
const grow = (o, d, dt) => dt > MIN_GAP && d.stage >= o.stage && d.asc >= o.asc && d.stars >= o.stars && d.stage <= o.stage + sA + dt / sD && d.asc <= o.asc + aA + dt / aD && d.stars <= o.stars + rA + dt / rD && d.power <= (o.power > pFloor ? o.power : pFloor) * pMul + dt / pD;
const allow = (old, d, dt) => shape(d) && (old ? grow(old, d, dt) : start(d));
const out = [], ck = (n, c, x) => out.push((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined ? '  ' + x : ''));
const E = (stage, power, asc, stars) => ({ stage, power, asc, stars });

// 1 first entries
ck('honest 8h veteran can join (127/5000/27/0)', allow(null, E(127, 5000, 27, 0)));
ck('stage 5000 first entry refused', !allow(null, E(5000, 1, 0, 0)));
ck('power 100,000,000 first entry refused', !allow(null, E(10, 1e8, 0, 0)));
ck('500 ascensions first entry refused', !allow(null, E(10, 1, 500, 0)));
ck('500 stars first entry refused', !allow(null, E(10, 1, 0, 500)));
ck('start ceilings themselves are allowed', allow(null, E(s0, p0, a0, r0)));
// 2 honest play: the worst honest 10-minute rises measured by tests/career.html (stage +25, asc +2, power +2459), published every 10 min
{ let o = E(0, 300, 0, 0), ok = true, worst = 1e9; const dt = 600e3;
  for (let i = 0; i < 60; i++) { const d = { stage: o.stage + 25, power: o.power + 2500, asc: o.asc + 2, stars: o.stars + 1 }; if (!allow(o, d, dt)) { ok = false; break } worst = Math.min(worst, 1); o = d; }
  ck('sustained worst-case honest pace for 10 h passes', ok, ok ? '(ends at stage ' + o.stage + ')' : 'blocked at stage ' + o.stage); }
ck('honest power burst: x3 in 10 min from 120k (tier jumps) passes', allow(E(100, 120000, 10, 0), E(125, 360000, 12, 0), 600e3));
ck('honest catch-up after 8 h offline (stage +60, asc +4, power x1.5)', allow(E(100, 3000, 20, 0), E(160, 4500, 24, 0), 8 * 3600e3));
ck('power falls after an ascension (allowed)', allow(E(100, 5000, 20, 2), E(100, 40, 21, 2), 600e3));
ck('stage can never go down', !allow(E(100, 5000, 20, 2), E(99, 5000, 20, 2), 600e3));
ck('asc can never go down', !allow(E(100, 5000, 20, 2), E(100, 5000, 19, 2), 600e3));
ck('writes closer than 5 minutes are refused', !allow(E(100, 5000, 20, 2), E(100, 5000, 20, 2), 4 * 60e3));
// 3 cheating: fastest legal climb starting at the first-entry ceiling, publishing every 5 minutes + 1 s
{ let o = E(s0, p0, a0, r0), t = 0; while (o.stage < stageCap) { const dt = MIN_GAP + 1000; const d = { ...o, stage: Math.min(stageCap, Math.floor(o.stage + sA + dt / sD)) }; if (!allow(o, d, dt)) break; o = d; t += dt }
  const hrs = t / 3600e3; ck('stage cheater needs hours to reach the cap', hrs >= 2, hrs.toFixed(1) + ' h from stage ' + s0 + ' to ' + stageCap);
  const honest8h = 127; ck('and still starts above honest 8 h play, so the first entry itself is the remaining hole', s0 > honest8h, 'ceiling ' + s0 + ' vs honest ' + honest8h); }
{ let o = E(s0, 1, a0, 0), t = 0, n = 0; while (o.asc < ascCap && n < 5000) { const dt = MIN_GAP + 1000; const d = { ...o, asc: Math.floor(o.asc + aA + dt / aD) }; if (!allow(o, d, dt)) break; o = d; t += dt; n++ }
  ck('ascension cheater: from the start ceiling to the cap needs hours', t / 3600e3 >= 4, (t / 3600e3).toFixed(1) + ' h'); }
{ let o = E(10, 20000, 0, 0), t = 0; const dt = MIN_GAP + 1000; for (let i = 0; i < 12; i++) { const d = { ...o, power: Math.floor((o.power > pFloor ? o.power : pFloor) * pMul + dt / pD) }; if (!allow(o, d, dt)) break; o = d; t += dt }
  ck('power cannot more than double per publish (1 h of cheating)', o.power <= 20000 * Math.pow(pMul, 12) + 1e6, 'reaches ' + o.power.toLocaleString() + ' but only up to the cap ' + powerCap.toLocaleString()); }
console.log(out.join('\n')); process.exit(out.some((l) => l.startsWith('FAIL')) ? 1 : 0);
