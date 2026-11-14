// Reference output for tests/netrandom.mjs: the bounty picks exactly as the Unity version's Meta.cs makes them (same Seed(), same
// System.Random, same LINQ calls). Run: dotnet run --project tests/netrandom > out.txt   (the .NET SDK is not needed to play or build)
using System.Globalization;

static int Seed(string s) { unchecked { int h = 23; foreach (var ch in s) h = h * 31 + ch; return h; } }
string[] POOL = { "kill", "boss", "unc", "gold", "stage", "spell", "golden", "floor" };   // Meta.cs Bounties.POOL order
string[] OPTIONAL = { "boss", "unc", "spell", "golden", "floor" };                      // kill, gold and stage are always eligible
var w = Console.Out;
foreach (var sd in new[] { 0, 1, -1, 7919, 123456789, -987654321, int.MaxValue, int.MinValue, int.MinValue + 1, Seed("2026-11-14") })
{
    var r = new Random(sd); w.WriteLine("raw " + sd + " " + string.Join(",", Enumerable.Range(0, 12).Select(_ => r.Next())));
}
var day0 = new DateTime(2026, 1, 1);
for (int dd = 0; dd < 731; dd++)
{
    string today = day0.AddDays(dd).ToString("yyyy-MM-dd", CultureInfo.InvariantCulture);
    for (int mask = 0; mask < 32; mask++)
    {
        bool Ok(string k) { int i = Array.IndexOf(OPTIONAL, k); return i < 0 || (mask & (1 << i)) != 0; }
        var rng = new Random(Seed(today));
        var pick = POOL.Where(Ok).OrderBy(_ => rng.Next()).Take(3).ToList();
        var line = today + " " + mask + " " + string.Join(",", pick);
        for (int have = 1; have <= 2; have++)   // Ensure()'s top-up of a short list
        {
            var hs = pick.Take(have).ToHashSet(); var r2 = new Random(Seed(today) + have);
            line += " | " + string.Join(",", POOL.Where(k => Ok(k) && !hs.Contains(k)).OrderBy(_ => r2.Next()).Take(3 - have));
        }
        var used = pick.ToHashSet(); var r3 = new Random(Seed(today) + 7919);   // Reroll()
        line += " | " + (POOL.Where(k => Ok(k) && !used.Contains(k)).OrderBy(_ => r3.Next()).FirstOrDefault() ?? "-");
        w.WriteLine(line);
    }
}
