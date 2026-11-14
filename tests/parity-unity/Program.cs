// Unity half of the web-vs-Unity comparison: the same scenario, step for step, as tests/parity.html, run on the Unity version's own
// compiled game code. usage: dotnet run --project tests/parity-unity -- <web output json> <unity output json>  (tests/parity.mjs does this)
using System.Globalization;
using Newtonsoft.Json.Linq;
using Delve.Core;
using Delve.Core.Ui;
using Look = Delve.Core.Art.Look;

CultureInfo.CurrentCulture = CultureInfo.InvariantCulture;
var web = JObject.Parse(File.ReadAllText(args[0]));
string S0 = (string)web["save"]; var damaged = web["damaged"].Select(x => (string)x).ToList();
long T0 = 1794657600000, clock = T0; J.Clock = () => clock;
Store.Dir = Path.Combine(Path.GetTempPath(), "delve-parity-store"); Directory.CreateDirectory(Store.Dir);
Store.Delete("hd-wallet-test"); Shop.DevBuild = true; Shop.ModeOverride = "test";
void SeedRng(int n) => J.Rng = new SeqRandom(n) { log = n == 101 };
var steps = new JArray();
void Put(string name, object data) => steps.Add(new JObject { ["name"] = name, ["data"] = JToken.FromObject(data) });
JToken Meta_() => JObject.Parse(SaveSystem.ToJson(Game.S))["meta"];
object St() { var x = Stats.Get(); return new { atk = x.atk, hp = x.hp, def = x.def }; }
object Rn() { var r = Game.Run; return new { stage = r.stage, gold = r.gold, loot = r.loot.Count, totalDmg = r.totalDmg, over = r.over, floor = r.floor, towerFloors = r.towerFloors, towerGems = r.towerGems }; }
var traces = new JObject();
int Delve(int seed) { SeedRng(seed); Battle.StartRun(); var r = Game.Run; int n = 0; var tr = new JArray(); traces[seed.ToString()] = tr; while (!r.over && n < 4000) { if (n % 40 == 0) Battle.Cast(0); Battle.Tick(.05); n++; tr.Add(new JArray(n, r.stage, r.eHp, r.hp, r.gold, ((SeqRandom)J.Rng).calls)); } return n; }
void Load(string json) { Store.Write(SaveSystem.KEY, json); SaveSystem.Load(); }
var S = (Func<SaveState>)(() => Game.S); var M = (Func<MetaState>)(() => Meta.M);

SeedRng(1); Load(S0); Put("load", new { meta = Meta_(), gold = S().gold, gems = S().gems, stats = St(), pm = Meta.PowerMult(), gm = Meta.GoldMult() });
SeedRng(2); Bounties.Ensure(); Put("ensure", new { meta = Meta_() });
{ int n = Delve(101); Put("delve", new { n, run = Rn(), gold = S().gold, gems = S().gems, meta = Meta_() }); }
SeedRng(4);
{
    var msgs = new JArray();
    for (int i = 0; i < 3; i++)
    {
        var b = M().bounties[i]; if (b.k == "stage") M().dayBest = Math.Max(M().dayBest, b.goal); else M().c[b.k] = b.b + b.goal;
        msgs.Add(Bounties.Claim(i)); if (i == 0) msgs.Add(Bounties.Claim(0));
    }
    msgs.Add(Bounties.Reroll(1)); msgs.Add(Bounties.OpenChest()); msgs.Add(Bounties.OpenChest());
    Put("bounties", new { msgs, meta = Meta_(), gold = S().gold, gems = S().gems });
}
SeedRng(5); Put("boosts", new { res = new JArray(Boosts.Buy("gold"), Boosts.Buy("loot"), Boosts.Buy("gold"), Boosts.LeftText("gold"), Boosts.LeftText("loot")), boosts = Meta_()["boosts"], gems = S().gems });
SeedRng(6);
{
    var msgs = new JArray(); foreach (var l in Trophies.LINES) while (Trophies.CanClaim(l)) msgs.Add(Trophies.Claim(l.k));
    Put("trophies", new { msgs, trophies = Meta_()["trophies"], points = Trophies.Points(), gems = S().gems, stats = St(), pm = Meta.PowerMult(), gm = Meta.GoldMult() });
}
SeedRng(202);
{
    Spire.Start(); var r = Game.Run; int n = 0; var names = new List<string> { Battle.EName() };
    while (!r.over && n < 6000) { Battle.Tick(.05); n++; if (n % 500 == 0) names.Add(Battle.EName()); }
    Put("spire", new { n, run = Rn(), names, gold = S().gold, gems = S().gems, spireBest = M().spireBest, c = Meta_()["c"], defeat = GoalViews.SpireDefeat(r) });
}
{ int n = Delve(303); Put("delve2", new { n, run = Rn(), gold = S().gold, gems = S().gems, meta = Meta_() }); }
{ var outs = new List<object>(); for (int sd = 500; sd < 506; sd++) { int n = Delve(sd); outs.Add(new { n, run = Rn(), gold = S().gold, gems = S().gems, c = Meta_()["c"], beasts = Meta_()["beasts"], relicFound = JObject.Parse(SaveSystem.ToJson(Game.S))["relicFound"], best = S().best }); } Put("more-delves", outs); }
SeedRng(8); Put("tabs", new { q = GoalViews.BountyTab(), t = GoalViews.TrophyTab(), b = GoalViews.BestiaryTab(), s = GoalViews.SpireTab() });
SeedRng(9); clock += 86400000; Bounties.Ensure(); Put("nextday", new { meta = Meta_() });
SeedRng(11);
{
    Shop.ResetForTests(); Shop.Refresh().GetAwaiter().GetResult(); var html0 = Shop.Tab(); Shop.BuyPack("c1200").GetAwaiter().GetResult();
    var res = new JArray(); foreach (var id in new[] { "gold30", "loot60", "outfit_royal", "capes", "gold60", "c100", "outfit_royal" }) { res.Add(id + ":" + ShopCat.SpendBlock(Shop.Now, id, J.Now())); Shop.BuyItem(id).GetAwaiter().GetResult(); res.Add(null); }
    Look.Apply("tun:14"); Look.Apply("hair:12"); Look.Apply("cape:9"); var W = Shop.Now;
    Put("shop", new { html0, res, wallet = W.ToJson(), gold = Boosts.Active("gold"), loot = Boosts.Active("loot"), gm = Meta.GoldMult(), paidGold = Shop.PaidBoostLeft("gold"), paidMin = ShopCat.PaidMinLeft(W, J.Now()), look = new[] { Look.Idx("tun"), Look.Idx("hair"), Look.Idx("cape") }, capes = Look.CapesUnlocked(), cape = Look.CapeColor(0, "#000"), tab = Shop.Tab(), top = Shop.Top() });
}
{ int n = Delve(404); Put("delve-paid", new { n, run = Rn(), gold = S().gold, gems = S().gems, c = Meta_()["c"] }); }
SeedRng(10); Put("damaged", new { metas = damaged.Select(d => { Load(d); return Meta_(); }).ToList() });
File.WriteAllText(args[1], new JObject { ["steps"] = steps, ["traces"] = traces, ["sites"] = new JArray(SeqRandom.Sites) }.ToString(Newtonsoft.Json.Formatting.None));
Console.WriteLine("unity steps: " + steps.Count);

/// <summary>The same random stream as tests/parity.html's Math.random (mulberry32).</summary>
class SeqRandom : Random
{
    uint a; public int calls; public SeqRandom(int s) { a = (uint)s; }
    public static List<string> Sites = new List<string>(); public bool log;
    public override double NextDouble() { calls++; if (log && Sites.Count < 600) Sites.Add(new System.Diagnostics.StackTrace().GetFrame(2)?.GetMethod()?.Name.ToLowerInvariant() ?? "?"); a += 0x6D2B79F5; uint t = a; t = (t ^ (t >> 15)) * (t | 1u); t = (t + (t ^ (t >> 7)) * (t | 61u)) ^ t; return (t ^ (t >> 14)) / 4294967296.0; }
    protected override double Sample() => NextDouble();
}
