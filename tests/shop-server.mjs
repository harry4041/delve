// The shop server (server/worker.js) and its rules (src/shopcat.js), run in Node against a fake Google: generated RSA keys stand
// in for Firebase's token keys and the service account, and an in-memory Firestore answers the REST calls.
// usage: node tests/shop-server.mjs
import worker, { _reset } from '../server/worker.js';
import { SHOP, spend, creditOrder, refundOrder, cleanWallet, freshWallet, spendBlock, utcDay } from '../src/shopcat.js';

const out = [], ck = (n, c, x) => out.push((c ? 'ok   ' : 'FAIL ') + n + (x !== undefined && !c ? '  ' + x : ''));
const enc = new TextEncoder(), b64u = (b) => Buffer.from(b).toString('base64url');
const PROJECT = 'delve-test', T0 = Date.UTC(2026, 10, 16, 10); let now = T0; Date.now = () => now;

// ---------------------------------------------------------------- shopcat rules (pure)
{
  let w = freshWallet();
  ck('fresh wallet cannot buy', spendBlock(w, 'gold30', now) === 'not enough Crystals');
  w = creditOrder(w, 'A1', 'c100').wallet;
  ck('order credits a pack', w.crystals === 100);
  ck('the same order never credits twice', creditOrder(w, 'A1', 'c100').wallet.crystals === 100 && creditOrder(w, 'A1', 'c100').err === 'duplicate');
  const r = spend(w, 'gold30', now);
  ck('boost spend', r.ok && r.wallet.crystals === 70 && r.wallet.boosts.gold === now + 30 * 60000 && r.wallet.paidMin === 30 && r.wallet.day === utcDay(now));
  ck('spend does not modify its input', w.crystals === 100 && !w.boosts.gold);
  w = creditOrder(creditOrder(w, 'B', 'c1200').wallet, 'C', 'c1200').wallet;
  for (const id of ['gold60', 'gold60', 'gold60', 'gold60']) w = spend(w, id, now).wallet; // 240 min of Gold rush
  { const carried = cleanWallet({ crystals: 500, boosts: { gold: now + 220 * 60000 } }); // a timer carried over from yesterday's purchases
    ck('a timer holds at most 4 hours', spendBlock(carried, 'gold30', now) === 'timer is full' && spend(cleanWallet({ crystals: 500, boosts: { gold: now + 205 * 60000 } }), 'gold30', now).wallet.boosts.gold === now + 235 * 60000); }
  ck('daily paid limit is 240 minutes', w.paidMin === 240 && spendBlock(w, 'loot30', now) === 'daily limit reached', w.paidMin);
  ck('the limit resets the next UTC day', spendBlock(w, 'loot30', now + 24 * 3600e3) === '');
  ck('cosmetic once', spend(spend(w, 'capes', now).wallet, 'capes', now).err === 'already owned');
  const rf = refundOrder(w, 'C', 'c1200');
  ck('refund takes the Crystals back once', rf.ok && rf.wallet.crystals === w.crystals - 1200 && !refundOrder(rf.wallet, 'C', 'c1200').ok);
  ck('a refunded-below-zero wallet cannot spend', spendBlock(cleanWallet({ crystals: -50 }), 'gold30', now) === 'not enough Crystals');
  const dirty = cleanWallet({ crystals: 1.5, owned: ['capes', 'nope', 7, 'capes'], boosts: { gold: 'x', loot: 5, hack: 9 }, day: 'today', paidMin: -3, orders: [1, 'o:1'], __proto__: { x: 1 } });
  ck('cleanWallet repairs hostile data', dirty.crystals === 0 && dirty.owned.join() === 'capes' && JSON.stringify(dirty.boosts) === '{"loot":5}' && dirty.day === '' && dirty.paidMin === 0 && dirty.orders.join() === 'o:1');
  ck('unknown items refused', spend(w, 'free_gems', now).err === 'unknown item');
  ck('every boost is an existing boost and 30/60 min', SHOP.boosts.every((b) => ['gold', 'loot'].includes(b.k) && [30, 60].includes(b.min)));
}

// ---------------------------------------------------------------- fake Google
const tokenKeys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const otherKeys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const saKeys = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const jwk = { ...(await crypto.subtle.exportKey('jwk', tokenKeys.publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
const pem = '-----BEGIN PRIVATE KEY-----\n' + Buffer.from(await crypto.subtle.exportKey('pkcs8', saKeys.privateKey)).toString('base64').replace(/(.{64})/g, '$1\n') + '\n-----END PRIVATE KEY-----\n';
async function idToken(claims, key = tokenKeys.privateKey, kid = 'k1') {
  const s = Math.floor(now / 1000), body = b64u(enc.encode(JSON.stringify({ alg: 'RS256', kid }))) + '.' + b64u(enc.encode(JSON.stringify({ aud: PROJECT, iss: 'https://securetoken.google.com/' + PROJECT, sub: 'u1', iat: s, exp: s + 3600, email_verified: true, ...claims })));
  return body + '.' + b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(body)));
}
const docs = new Map(); let ver = 0, conflictNext = 0, saAuthOk = true, calls = { token: 0 };
globalThis.fetch = async (url, o = {}) => {
  url = String(url);
  const res = (status, obj) => new Response(obj === undefined ? null : JSON.stringify(obj), { status, headers: { 'content-type': 'application/json' } });
  if (url.includes('securetoken@system')) return res(200, { keys: [jwk] });
  if (url === 'https://oauth2.googleapis.com/token') {
    calls.token++;
    const jwt = new URLSearchParams(o.body).get('assertion').split('.');
    saAuthOk = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', saKeys.publicKey, Buffer.from(jwt[2], 'base64url'), enc.encode(jwt[0] + '.' + jwt[1]));
    return saAuthOk ? res(200, { access_token: 'tok', expires_in: 3600 }) : res(401, {});
  }
  if (!String(o.headers && (o.headers.authorization || '')).includes('Bearer tok')) return res(403, {});
  const m = url.match(/documents\/wallet\/(\w+)$/);
  if (m && (!o.method || o.method === 'GET')) { const d = docs.get(m[1]); return d ? res(200, d) : res(404, {}); }
  if (url.endsWith('documents:commit')) {
    const wr = JSON.parse(o.body).writes[0], id = wr.update.name.split('/').pop(), cur = docs.get(id);
    if (conflictNext > 0) { conflictNext--; ver++; if (cur) cur.updateTime = 'v' + ver; return res(400, { error: { status: 'FAILED_PRECONDITION' } }); }
    if (wr.currentDocument.exists === false ? !!cur : !cur || cur.updateTime !== wr.currentDocument.updateTime) return res(400, { error: { status: 'FAILED_PRECONDITION' } });
    docs.set(id, { name: wr.update.name, fields: wr.update.fields, updateTime: 'v' + ++ver });
    return res(200, {});
  }
  return res(404, {});
};
const env = { FIREBASE_PROJECT: PROJECT, SA_EMAIL: 'sa@delve-test.iam.gserviceaccount.com', SA_KEY: pem, LS_SECRET: 'whsec', LS_VARIANTS: JSON.stringify({ 111: 'c100', 222: 'c1200' }), ALLOW_ORIGIN: 'https://delve-game-4041.web.app' };
const call = (path, o = {}) => worker.fetch(new Request('https://shop.example' + path, o), env);
const spendReq = async (item, tok) => { const r = await call('/spend', { method: 'POST', headers: { authorization: 'Bearer ' + tok, 'content-type': 'application/json', origin: env.ALLOW_ORIGIN }, body: JSON.stringify({ item }) }); return { status: r.status, body: await r.json(), r }; };
async function hook(event, orderId, variant, uid = 'u1', secret = 'whsec', status = 'paid') {
  const raw = JSON.stringify({ meta: { event_name: event, custom_data: { uid } }, data: { id: orderId, attributes: { status, first_order_item: { variant_id: variant } } } });
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = Buffer.from(await crypto.subtle.sign('HMAC', key, enc.encode(raw))).toString('hex');
  const r = await call('/ls-webhook', { method: 'POST', headers: { 'x-signature': sig }, body: raw }); return { status: r.status, body: await r.json() };
}
const wallet = (uid = 'u1') => { const d = docs.get(uid); return d ? Object.fromEntries(Object.entries(d.fields).map(([k, v]) => [k, 'integerValue' in v ? +v.integerValue : 'stringValue' in v ? v.stringValue : 'arrayValue' in v ? (v.arrayValue.values || []).map((x) => x.stringValue) : 'mapValue' in v ? Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([a, b]) => [a, +b.integerValue])) : v])) : null; };

// ---------------------------------------------------------------- the worker
_reset();
ck('health', (await (await call('/health')).text()) === 'ok');
const good = await idToken({});
ck('spend needs a token', (await spendReq('gold30', '')).status === 401);
ck('token signed by another key is refused', (await spendReq('gold30', await idToken({}, otherKeys.privateKey))).status === 401);
ck('expired token refused', (await spendReq('gold30', await idToken({ exp: Math.floor(now / 1000) - 10 }))).status === 401);
ck('token for another project refused', (await spendReq('gold30', await idToken({ aud: 'other-project' }))).status === 401);
ck('unverified email refused', (await spendReq('gold30', await idToken({ email_verified: false }))).body.err === 'verify your email first');
ck('unknown item refused', (await spendReq('gems999', good)).status === 400);
{ const r = await spendReq('gold30', good); ck('empty wallet cannot spend', r.status === 409 && r.body.err === 'not enough Crystals' && !docs.has('u1'), JSON.stringify(r.body)); }
ck('webhook with a bad signature refused', (await hook('order_created', 'o1', '111', 'u1', 'wrong')).status === 401 && !docs.has('u1'));
{ const r = await hook('order_created', 'o1', '111'); ck('paid order credits Crystals', r.status === 200 && wallet().crystals === 100 && saAuthOk, JSON.stringify(r.body)); }
await hook('order_created', 'o1', '111'); ck('the same notification twice credits once', wallet().crystals === 100);
ck('unpaid order ignored', (await hook('order_created', 'o2', '111', 'u1', 'whsec', 'pending')).status === 200 && wallet().crystals === 100);
ck('unknown product ignored (200, no retry)', (await hook('order_created', 'o3', '999')).body.ignored !== undefined && wallet().crystals === 100);
ck('bad uid ignored', (await hook('order_created', 'o4', '111', '../etc')).body.ignored !== undefined);
{ const r = await spendReq('gold30', good); const w = wallet();
  ck('spend Crystals on Gold rush', r.status === 200 && r.body.ok && w.crystals === 70 && w.boosts.gold === now + 30 * 60000 && w.paidMin === 30, JSON.stringify(r.body));
  ck('CORS allowed for the game', r.r.headers.get('access-control-allow-origin') === env.ALLOW_ORIGIN); }
await hook('order_created', 'o5', '222');
conflictNext = 1; { const r = await spendReq('loot60', good); ck('a write conflict is retried', r.status === 200 && wallet().boosts.loot === now + 60 * 60000 && wallet().crystals === 70 + 1200 - 55, JSON.stringify(r.body)); }
for (let i = 0; i < 2; i++) await spendReq('loot60', good);
{ const r = await spendReq('loot60', good); ck('daily limit enforced by the server', r.status === 409 && r.body.err === 'daily limit reached' && wallet().paidMin === 210, JSON.stringify(r.body) + ' ' + wallet().paidMin); }
{ const r = await spendReq('capes', good); ck('cosmetic recorded as owned', r.status === 200 && wallet().owned.includes('capes')); }
{ const r = await spendReq('capes', good); ck('cosmetic cannot be bought twice', r.status === 409 && r.body.err === 'already owned'); }
{ const before = wallet().crystals; await hook('order_refunded', 'o5', '222'); await hook('order_refunded', 'o5', '222'); ck('refund once', wallet().crystals === before - 1200, wallet().crystals); }
{ const r = await spendReq('gold30', good); ck('negative balance after a refund blocks spending', r.status === 409 && wallet().crystals < 0, wallet().crystals); }
{ const r = await call('/spend', { method: 'OPTIONS', headers: { origin: env.ALLOW_ORIGIN } }); ck('CORS preflight', r.status === 204 && r.headers.get('access-control-allow-methods').includes('POST')); }
{ const r = await call('/spend', { method: 'OPTIONS', headers: { origin: 'https://evil.example' } }); ck('other sites get no CORS headers', !r.headers.get('access-control-allow-origin')); }
ck('the access token is cached', calls.token === 1, calls.token);
console.log(out.join('\n')); process.exit(out.some((l) => l.startsWith('FAIL')) ? 1 : 0);
