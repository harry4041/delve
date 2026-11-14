// No imports, so Node can load it (tests/netrandom.mjs).
// Bounty picks must be IDENTICAL to Unity (both versions can be played the same day): Meta.cs does
// POOL.Where(ok).OrderBy(_ => new System.Random(Seed(day) + n).Next()), so this reproduces .NET's seeded System.Random (the Knuth
// subtractive generator that `new Random(int)` uses in .NET and in Unity's Mono) and LINQ's OrderBy (one key per element, drawn in
// source order, then a stable ascending sort). It never touches Math.random, so the game's own rolls are unaffected.
// tests/netrandom.mjs checks it against real .NET output (tests/netrandom/Program.cs).
export function seed(str) { let h = 23; for (let i = 0; i < str.length; i++) h = (Math.imul(h, 31) + str.charCodeAt(i)) | 0; return h; } // C# unchecked int: h = h * 31 + ch
export function netRandom(sd) {
  const MBIG = 2147483647, MSEED = 161803398, a = new Array(56).fill(0);
  const sub = sd === -2147483648 ? MBIG : Math.abs(sd);
  let mj = (MSEED - sub) | 0, mk = 1; a[55] = mj; // C# int arithmetic wraps on overflow: | 0 everywhere
  for (let i = 1; i < 55; i++) { const ii = (21 * i) % 55; a[ii] = mk; mk = (mj - mk) | 0; if (mk < 0) mk += MBIG; mj = a[ii]; }
  for (let k = 1; k < 5; k++) for (let i = 1; i < 56; i++) { a[i] = (a[i] - a[1 + ((i + 30) % 55)]) | 0; if (a[i] < 0) a[i] += MBIG; }
  let inext = 0, inextp = 21;
  return () => { // Random.Next(): an int in [0, 2^31 - 1)
    if (++inext >= 56) inext = 1; if (++inextp >= 56) inextp = 1;
    let r = (a[inext] - a[inextp]) | 0; if (r === MBIG) r--; if (r < 0) r += MBIG;
    a[inext] = r; return r;
  };
}
export function shuffled(list, sd) {
  const next = netRandom(sd), keyed = list.map((x, i) => ({ x, i, k: next() }));
  keyed.sort((p, q) => (p.k - q.k) || (p.i - q.i));
  return keyed.map((e) => e.x);
}
