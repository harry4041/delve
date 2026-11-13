// Delve admin: a LOCAL tool (binds to 127.0.0.1 only, never deployed) to browse every player's cloud save by username and edit it.
// Needs a Firebase service-account key at admin/serviceAccountKey.json (Firebase console > Project settings > Service accounts > Generate new private key).
// Run: cd admin && npm install && npm start, then open http://localhost:5180
import http from 'node:http';
import fs from 'node:fs';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import admin from 'firebase-admin';

const here = path.dirname(fileURLToPath(import.meta.url)), keyFile = path.join(here, 'serviceAccountKey.json'), PORT = +(process.env.ADMIN_PORT || 5180);
if (!fs.existsSync(keyFile)) { console.error('Missing admin/serviceAccountKey.json (see the comment at the top of admin/server.mjs).'); process.exit(1); }
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(keyFile, 'utf8'))) });
const db = admin.firestore(), MAX_DATA = 900000;

const decode = (d) => (d.enc === 'gz1' ? zlib.gunzipSync(Buffer.from(d.data, 'base64')).toString('utf8') : d.data);
const encode = (json) => ({ enc: 'gz1', data: zlib.gzipSync(Buffer.from(json, 'utf8')).toString('base64') });
const summ = (s) => ({ asc: s.asc || 0, best: s.bestOverall || s.best || 0, gold: s.gold || 0, relics: s.relics || 0, t: s.lastT || 0 });
const send = (res, code, obj) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(obj)); };
const body = (req) => new Promise((ok, no) => { const c = []; req.on('data', (d) => c.push(d)); req.on('end', () => ok(Buffer.concat(c).toString('utf8'))); req.on('error', no); });

async function listPlayers() {
  const [saves, users] = await Promise.all([db.collection('saves').get(), db.collection('users').get()]);
  const names = new Map(users.docs.map((d) => [d.id, d.data().name || '']));
  return saves.docs.map((d) => { const x = d.data(); return { uid: d.id, name: names.get(d.id) || '', summary: x.summary || {}, updated: x.updatedAt && x.updatedAt.toMillis ? x.updatedAt.toMillis() : 0 }; })
    .sort((a, b) => (a.name || '￿').toLowerCase().localeCompare((b.name || '￿').toLowerCase()));
}

const server = http.createServer(async (req, res) => {
  try {
    const u = new URL(req.url, 'http://x'), m = u.pathname.match(/^\/api\/save\/([A-Za-z0-9]{6,64})$/);
    if (u.pathname === '/' ) { res.writeHead(200, { 'content-type': 'text/html; charset=utf-8' }); return res.end(fs.readFileSync(path.join(here, 'index.html'))); }
    if (u.pathname === '/api/players') return send(res, 200, await listPlayers());
    if (m && req.method === 'GET') {
      const s = await db.collection('saves').doc(m[1]).get(); if (!s.exists) return send(res, 404, { error: 'no save' });
      return send(res, 200, { save: JSON.parse(decode(s.data())), clientT: s.data().clientT });
    }
    if (m && req.method === 'POST') {
      const save = JSON.parse(await body(req)); if (!save || typeof save !== 'object' || Array.isArray(save)) return send(res, 400, { error: 'not a save object' });
      const ref = db.collection('saves').doc(m[1]), cur = await ref.get(); if (!cur.exists) return send(res, 404, { error: 'no save' });
      const json = JSON.stringify(save), enc = encode(json); if (enc.data.length > MAX_DATA) return send(res, 400, { error: 'save too big (' + enc.data.length + ' chars)' });
      await db.collection('saves_backup').doc(m[1] + '_' + Date.now()).set({ ...cur.data(), backedUpAt: admin.firestore.FieldValue.serverTimestamp() }); // keep the previous version
      await ref.set({ v: 1, enc: enc.enc, data: enc.data, clientT: Date.now(), summary: summ(save), updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      return send(res, 200, { ok: true });
    }
    send(res, 404, { error: 'not found' });
  } catch (e) { send(res, 500, { error: String(e.message || e) }); }
});
server.listen(PORT, '127.0.0.1', () => console.log('Delve admin on http://localhost:' + PORT));
