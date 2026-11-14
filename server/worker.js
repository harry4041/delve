// Delve shop server: a Cloudflare Worker (free plan, no card). It is the ONLY thing that can change a player's wallet
// (Firestore wallet/<uid>; firestore.rules let players read their own wallet and never write it).
//   POST /spend        body {item}, header Authorization: Bearer <Firebase ID token>  -> spends Crystals (shopcat.js rules)
//   POST /ls-webhook   Lemon Squeezy order notifications, signed with the webhook secret -> credits / refunds Crystal packs
//   GET  /health
// Settings (wrangler.toml [vars] and secrets, see server/README.md): FIREBASE_PROJECT, SA_EMAIL, SA_KEY (secret, the service
// account's PKCS#8 private key), LS_SECRET (secret), LS_VARIANTS (JSON {"<variant id>":"c100",...}), ALLOW_ORIGIN.
import { cleanWallet, spend, creditOrder, refundOrder, validItemId } from '../src/shopcat.js';

const enc = new TextEncoder();
const b64u = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const fromB64u = (s) => { const t = s.replace(/-/g, '+').replace(/_/g, '/'); return Uint8Array.from(atob(t + '='.repeat((4 - (t.length % 4)) % 4)), (c) => c.charCodeAt(0)); };
const json = (obj, status = 200, headers = {}) => new Response(JSON.stringify(obj), { status, headers: { 'content-type': 'application/json', ...headers } });
const UID = /^[A-Za-z0-9]{1,128}$/;
let jwks = null, jwksUntil = 0, saToken = null, saUntil = 0;
export function _reset() { jwks = null; jwksUntil = 0; saToken = null; saUntil = 0; } // for tests

// ---------------------------------------------------------------- Firebase ID tokens (RS256, Google's securetoken keys)
const JWKS_URL = 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';
async function verifyIdToken(token, env, nowMs) {
  const parts = String(token || '').split('.');
  if (parts.length !== 3) throw new Error('bad token');
  const head = JSON.parse(new TextDecoder().decode(fromB64u(parts[0]))), claims = JSON.parse(new TextDecoder().decode(fromB64u(parts[1])));
  if (head.alg !== 'RS256' || typeof head.kid !== 'string') throw new Error('bad token');
  if (!jwks || nowMs > jwksUntil) { const r = await fetch(JWKS_URL); if (!r.ok) throw new Error('keys unavailable'); jwks = (await r.json()).keys || []; jwksUntil = nowMs + 3600e3; }
  const jwk = jwks.find((k) => k.kid === head.kid);
  if (!jwk) throw new Error('bad token');
  const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
  const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromB64u(parts[2]), enc.encode(parts[0] + '.' + parts[1]));
  const now = nowMs / 1000, p = env.FIREBASE_PROJECT;
  if (!ok || claims.aud !== p || claims.iss !== 'https://securetoken.google.com/' + p || !(claims.exp > now) || !(claims.iat <= now + 300) || !UID.test(claims.sub || ''))
    throw new Error('bad token');
  if (claims.email_verified !== true) throw new Error('verify your email first');
  return claims.sub;
}

// ---------------------------------------------------------------- service account -> Google access token
async function accessToken(env, nowMs) {
  if (saToken && nowMs < saUntil) return saToken;
  const pem = String(env.SA_KEY || '').replace(/\\n/g, '\n').replace(/-----[^-]+-----/g, '').replace(/\s+/g, '');
  const key = await crypto.subtle.importKey('pkcs8', fromB64u(pem.replace(/\+/g, '-').replace(/\//g, '_')), { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['sign']);
  const iat = Math.floor(nowMs / 1000);
  const body = b64u(enc.encode(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))) + '.' + b64u(enc.encode(JSON.stringify({ iss: env.SA_EMAIL, scope: 'https://www.googleapis.com/auth/datastore', aud: 'https://oauth2.googleapis.com/token', iat, exp: iat + 3600 })));
  const jwt = body + '.' + b64u(await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, enc.encode(body)));
  const r = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=' + jwt });
  if (!r.ok) throw new Error('google auth failed');
  const t = await r.json(); saToken = t.access_token; saUntil = nowMs + (t.expires_in || 3600) * 1000 - 60e3;
  return saToken;
}

// ---------------------------------------------------------------- Firestore REST (wallet/<uid>)
function toValue(v) {
  if (Array.isArray(v)) return { arrayValue: v.length ? { values: v.map(toValue) } : {} };
  if (v && typeof v === 'object') return { mapValue: { fields: Object.fromEntries(Object.entries(v).map(([k, x]) => [k, toValue(x)])) } };
  if (typeof v === 'number') return Number.isInteger(v) ? { integerValue: String(v) } : { doubleValue: v };
  if (typeof v === 'boolean') return { booleanValue: v };
  return { stringValue: String(v) };
}
function fromValue(v) {
  if ('integerValue' in v) return Number(v.integerValue);
  if ('doubleValue' in v) return v.doubleValue;
  if ('stringValue' in v) return v.stringValue;
  if ('booleanValue' in v) return v.booleanValue;
  if ('timestampValue' in v) return v.timestampValue;
  if ('arrayValue' in v) return (v.arrayValue.values || []).map(fromValue);
  if ('mapValue' in v) return Object.fromEntries(Object.entries(v.mapValue.fields || {}).map(([k, x]) => [k, fromValue(x)]));
  return null;
}
const docPath = (env, uid) => 'projects/' + env.FIREBASE_PROJECT + '/databases/(default)/documents/wallet/' + uid;

// Reads the wallet, applies fn (pure, from shopcat.js), writes it back only if nobody changed it meanwhile (retries on conflict).
async function updateWallet(env, uid, fn, nowMs) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const tok = await accessToken(env, nowMs), auth = { authorization: 'Bearer ' + tok };
    const g = await fetch('https://firestore.googleapis.com/v1/' + docPath(env, uid), { headers: auth });
    if (!g.ok && g.status !== 404) throw new Error('read failed');
    const doc = g.ok ? await g.json() : null;
    const before = cleanWallet(doc ? Object.fromEntries(Object.entries(doc.fields || {}).map(([k, v]) => [k, fromValue(v)])) : null);
    const r = fn(before);
    if (!r.ok || r.err === 'duplicate') return r;
    const fields = Object.fromEntries(Object.entries({ ...r.wallet, t: new Date(nowMs).toISOString() }).map(([k, v]) => [k, toValue(v)]));
    fields.t = { timestampValue: new Date(nowMs).toISOString() };
    const c = await fetch('https://firestore.googleapis.com/v1/projects/' + env.FIREBASE_PROJECT + '/databases/(default)/documents:commit', {
      method: 'POST', headers: { ...auth, 'content-type': 'application/json' },
      body: JSON.stringify({ writes: [{ update: { name: docPath(env, uid), fields }, currentDocument: doc ? { updateTime: doc.updateTime } : { exists: false } }] }),
    });
    if (c.ok) return r;
    if (c.status !== 409 && c.status !== 400) throw new Error('write failed');
  }
  throw new Error('busy, try again');
}

// ---------------------------------------------------------------- Lemon Squeezy signature (HMAC-SHA256, hex)
async function lsSignatureOk(env, raw, sig) {
  if (!env.LS_SECRET || !/^[0-9a-f]{64}$/.test(sig || '')) return false;
  const key = await crypto.subtle.importKey('raw', enc.encode(env.LS_SECRET), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const mac = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(raw)))].map((b) => b.toString(16).padStart(2, '0')).join('');
  let d = 0; for (let i = 0; i < 64; i++) d |= mac.charCodeAt(i) ^ sig.charCodeAt(i); // constant time
  return d === 0;
}

// ---------------------------------------------------------------- routes
export default {
  async fetch(req, env) {
    const url = new URL(req.url), now = Date.now();
    const origins = String(env.ALLOW_ORIGIN || '').split(',').map((s) => s.trim()).filter(Boolean), origin = req.headers.get('origin') || '';
    const cors = origins.includes(origin) ? { 'access-control-allow-origin': origin, 'access-control-allow-headers': 'authorization, content-type', 'access-control-allow-methods': 'POST, OPTIONS', vary: 'origin' } : {};
    try {
      if (url.pathname === '/health') return new Response('ok');
      if (url.pathname === '/spend') {
        if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
        if (req.method !== 'POST') return json({ ok: false, err: 'method' }, 405, cors);
        let uid;
        try { uid = await verifyIdToken((req.headers.get('authorization') || '').replace(/^Bearer /, ''), env, now); } catch (e) { return json({ ok: false, err: e.message }, 401, cors); }
        const body = await req.json().catch(() => ({}));
        if (!validItemId(body.item)) return json({ ok: false, err: 'unknown item' }, 400, cors);
        const r = await updateWallet(env, uid, (w) => spend(w, body.item, now), now);
        return json({ ok: r.ok, err: r.err, wallet: r.wallet }, r.ok ? 200 : 409, cors);
      }
      if (url.pathname === '/ls-webhook' && req.method === 'POST') {
        const raw = await req.text();
        if (!(await lsSignatureOk(env, raw, req.headers.get('x-signature')))) return json({ ok: false, err: 'bad signature' }, 401);
        const ev = JSON.parse(raw), name = ev.meta && ev.meta.event_name, uid = ev.meta && ev.meta.custom_data && ev.meta.custom_data.uid;
        const a = (ev.data && ev.data.attributes) || {}, orderId = String((ev.data && ev.data.id) || '');
        const variant = String((a.first_order_item && a.first_order_item.variant_id) || ''), pack = JSON.parse(env.LS_VARIANTS || '{}')[variant];
        if (!UID.test(uid || '') || !orderId || !pack) return json({ ok: true, ignored: 'not a Crystal order' }); // 200: nothing to retry
        if (name === 'order_created' && a.status === 'paid') { const r = await updateWallet(env, uid, (w) => creditOrder(w, orderId, pack), now); return json({ ok: r.ok, err: r.err }); }
        if (name === 'order_refunded') { const r = await updateWallet(env, uid, (w) => refundOrder(w, orderId, pack), now); return json({ ok: r.ok, err: r.err }); }
        return json({ ok: true, ignored: name });
      }
      return json({ ok: false, err: 'not found' }, 404);
    } catch (e) {
      return json({ ok: false, err: 'server error' }, 500, cors); // Lemon Squeezy retries a 500 later
    }
  },
};
