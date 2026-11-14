// Writes the Unity version's wiki.json (see tests/wikijson.html). usage: node tests/wikijson.mjs <output path>   (needs npm run dev + headless Edge on 9333)
import fs from 'fs';
const outPath = process.argv[2], port = +(process.env.PORT || 9333), url = 'http://localhost:5173/tests/wikijson.html';
if (!outPath) { console.log('usage: node tests/wikijson.mjs <output path>'); process.exit(1); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const tgt = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent(url)}`, { method: 'PUT' })).json();
const ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const call = (method, params = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expression) => (await call('Runtime.evaluate', { expression, returnByValue: true })).result?.result?.value;
let title = ''; for (let i = 0; i < 60; i++) { title = (await ev('document.title')) || ''; if (title && !title.startsWith('running')) break; await sleep(500); }
const json = title.startsWith('done') ? await ev('JSON.stringify(window.__wiki)') : null;
ws.close(); try { await fetch(`http://127.0.0.1:${port}/json/close/${tgt.id}`); } catch { /* ignore */ }
if (!json) { console.log('failed: ' + title); process.exit(1); }
fs.writeFileSync(outPath, json); console.log(title + ' -> ' + outPath + ' (' + json.length + ' chars)');
