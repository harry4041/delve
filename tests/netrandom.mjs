// Bounty picks must match the Unity version exactly. Recomputes, with src/netrandom.js, every line tests/netrandom/Program.cs prints
// (raw System.Random sequences, and the daily set, both top-ups and the swap for 731 days x all 32 pool combinations, using Meta.cs's
// own Seed/Random/OrderBy calls) and compares the SHA-256 of the whole output with the one .NET produced.
// usage: node tests/netrandom.mjs [file]   file = fresh .NET output (dotnet run --project tests/netrandom > out.txt) to diff line by line
import fs from 'fs';
import crypto from 'crypto';
import { seed, netRandom, shuffled } from '../src/netrandom.js';
const DOTNET_SHA256 = '982cdc15577eb437c91e3cf30dd2c177d111cb37c2967d231d3e4d2252fcbd74'; // of the .NET 10 output, 2026-11-14
const POOL = ['kill', 'boss', 'unc', 'gold', 'stage', 'spell', 'golden', 'floor'], OPTIONAL = ['boss', 'unc', 'spell', 'golden', 'floor'];
const lines = [];
for (const sd of [0, 1, -1, 7919, 123456789, -987654321, 2147483647, -2147483648, -2147483647, seed('2026-11-14')]) {
  const r = netRandom(sd); lines.push('raw ' + sd + ' ' + Array.from({ length: 12 }, () => r()).join(','));
}
const pad = (n) => (n < 10 ? '0' : '') + n;
for (let dd = 0; dd < 731; dd++) {
  const d = new Date(Date.UTC(2026, 0, 1 + dd)), today = d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate());
  for (let mask = 0; mask < 32; mask++) {
    const ok = (k) => { const i = OPTIONAL.indexOf(k); return i < 0 || (mask & (1 << i)) !== 0; };
    const pick = shuffled(POOL.filter(ok), seed(today)).slice(0, 3);
    let line = today + ' ' + mask + ' ' + pick.join(',');
    for (let have = 1; have <= 2; have++) { const hs = new Set(pick.slice(0, have)); line += ' | ' + shuffled(POOL.filter((k) => ok(k) && !hs.has(k)), (seed(today) + have) | 0).slice(0, 3 - have).join(','); }
    const used = new Set(pick); line += ' | ' + (shuffled(POOL.filter((k) => ok(k) && !used.has(k)), (seed(today) + 7919) | 0)[0] || '-');
    lines.push(line);
  }
}
const text = lines.join('\n') + '\n', sha = crypto.createHash('sha256').update(text).digest('hex');
let ok = sha === DOTNET_SHA256, why = '';
const file = process.argv[2];
if (file) {
  const exp = fs.readFileSync(file, 'utf8').split(String.fromCharCode(13)).join('').split('\n');
  const bad = lines.findIndex((l, i) => l !== exp[i]);
  ok = bad < 0 && exp.length === lines.length + 1; why = bad < 0 ? '' : ' first difference at line ' + (bad + 1) + ':\n  .NET: ' + exp[bad] + '\n  JS:   ' + lines[bad];
}
console.log((ok ? 'ok   ' : 'FAIL ') + 'bounty picks identical to .NET (' + lines.length + ' lines, sha256 ' + sha.slice(0, 16) + ')' + why);
process.exit(ok ? 0 : 1);
