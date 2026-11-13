// Creates (or resets) a pre-verified TEST account whose cloud save is the maxed-out one in admin/maxsave.json.
// Build the save first: with `npm run dev` running, open /tests/maxsave.html (or use the getsave helper) and write window.__save to admin/maxsave.json.
// Run: cd admin && node make-test-account.mjs <email> <password>
// The account has emailVerified=true, so it can sign in and sync immediately (no inbox needed). It does NOT join the leaderboards unless you do that in-game.
import fs from 'node:fs';
import zlib from 'node:zlib';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import admin from 'firebase-admin';

const [email, password] = process.argv.slice(2);
if (!email || !password || password.length < 6) { console.error('usage: node make-test-account.mjs <email> <password (6+ chars)>'); process.exit(1); }
const here = path.dirname(fileURLToPath(import.meta.url));
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(fs.readFileSync(path.join(here, 'serviceAccountKey.json'), 'utf8'))) });
const save = JSON.parse(fs.readFileSync(path.join(here, 'maxsave.json'), 'utf8')), json = JSON.stringify(save);
const summ = { asc: save.asc || 0, best: save.bestOverall || save.best || 0, gold: save.gold || 0, relics: save.relics || 0, t: save.lastT || 0 };

let user;
try { user = await admin.auth().getUserByEmail(email); await admin.auth().updateUser(user.uid, { password, emailVerified: true }); console.log('Account existed: password reset, marked verified.'); }
catch (e) { if (e.code !== 'auth/user-not-found') throw e; user = await admin.auth().createUser({ email, password, emailVerified: true }); console.log('Account created.'); }

const db = admin.firestore(), ref = db.collection('saves').doc(user.uid), cur = await ref.get();
if (cur.exists) await db.collection('saves_backup').doc(user.uid + '_' + Date.now()).set({ ...cur.data(), backedUpAt: admin.firestore.FieldValue.serverTimestamp() });
await ref.set({ v: 1, enc: 'gz1', data: zlib.gzipSync(Buffer.from(json, 'utf8')).toString('base64'), clientT: Date.now(), summary: summ, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
console.log('Maxed save uploaded for uid ' + user.uid + '.');
