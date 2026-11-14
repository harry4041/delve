// Web vs Unity: runs the same scenario in this game (tests/parity.html, headless Edge on 9333 + npm run dev) and in the Unity
// version's own compiled code (tests/parity-unity, .NET SDK), then compares every value exactly.
// usage: node tests/parity.mjs [unityDir]   (default C:/Users/Hrjco/Delve). Uses the editor's Library/ScriptAssemblies DLL when it
// is newer than every script, otherwise builds Assembly-CSharp.csproj with dotnet first.
import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
const unityDir = process.argv[2] || 'C:/Users/Hrjco/Delve', port = +(process.env.PORT || 9333), tmp = os.tmpdir();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
// 1 web
const tgt = await (await fetch(`http://127.0.0.1:${port}/json/new?${encodeURIComponent('http://localhost:5173/tests/parity.html')}`, { method: 'PUT' })).json();
const ws = new WebSocket(tgt.webSocketDebuggerUrl); await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map(); ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pend.has(d.id)) { pend.get(d.id)(d); pend.delete(d.id); } };
const ev = (expression) => new Promise((r) => { const i = ++id; pend.set(i, (d) => r(d.result?.result?.value)); ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression, returnByValue: true } })); });
let title = ''; for (let i = 0; i < 240; i++) { title = (await ev('document.title')) || ''; if (title && !title.startsWith('running')) break; await sleep(500); }
const webJson = title.startsWith('done') ? await ev('JSON.stringify(window.__parity)') : null;
ws.close(); try { await fetch(`http://127.0.0.1:${port}/json/close/${tgt.id}`); } catch { /* ignore */ }
if (!webJson) { console.log('web side failed: ' + title); process.exit(1); }
const webFile = path.join(tmp, 'delve-parity-web.json'), unityFile = path.join(tmp, 'delve-parity-unity.json'); fs.writeFileSync(webFile, webJson);
// 2 unity
const newest = (d) => fs.readdirSync(d, { withFileTypes: true }).reduce((t, e) => Math.max(t, e.isDirectory() ? newest(path.join(d, e.name)) : e.name.endsWith('.cs') ? fs.statSync(path.join(d, e.name)).mtimeMs : 0), 0);
let dll = path.join(unityDir, 'Library', 'ScriptAssemblies', 'Assembly-CSharp.dll');
if (!fs.existsSync(dll) || fs.statSync(dll).mtimeMs < newest(path.join(unityDir, 'Assets', 'Scripts'))) {
  const out = path.join(tmp, 'delve-parity-unitybuild');
  console.log('the editor has not compiled the latest scripts yet: building Assembly-CSharp with dotnet');
  // Unity's own project file only lists scripts it has imported, so build a copy that includes every script under Assets/Scripts
  // (it must sit next to the original: its package references are relative paths). It is deleted again right after.
  const bs = String.fromCharCode(92), tmpProj = path.join(unityDir, 'Assembly-CSharp.parity.csproj');
  let proj = fs.readFileSync(path.join(unityDir, 'Assembly-CSharp.csproj'), 'utf8').replace(/<Compile Include="[^"]*" \/>/g, '');
  proj = proj.replace('</Project>', '<ItemGroup><Compile Include="Assets' + bs + 'Scripts' + bs + '**' + bs + '*.cs" Exclude="Assets' + bs + 'Scripts' + bs + '**' + bs + 'Editor' + bs + '**" /></ItemGroup></Project>');
  fs.writeFileSync(tmpProj, proj);
  try { execFileSync('dotnet', ['build', tmpProj, '-nologo', '-v', 'q', '-o', out], { stdio: 'inherit' }); } finally { fs.rmSync(tmpProj, { force: true }); }
  dll = path.join(out, 'Assembly-CSharp.dll');
}
execFileSync('dotnet', ['run', '--project', 'tests/parity-unity', '-c', 'Release', `-p:UnityDir=${unityDir}`, `-p:UnityDll=${dll}`, '--', webFile, unityFile], { stdio: 'inherit' });
// 3 compare
const W = JSON.parse(webJson).steps, U = JSON.parse(fs.readFileSync(unityFile, 'utf8')).steps;
function diff(a, b, p) {
  if (typeof a === 'number' && typeof b === 'number') return a === b || (Number.isNaN(a) && Number.isNaN(b)) ? null : p + ': web ' + a + ' vs unity ' + b;
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return a === b ? null : p + ': web ' + JSON.stringify(a)?.slice(0, 300) + ' vs unity ' + JSON.stringify(b)?.slice(0, 300);
  if (Array.isArray(a) !== Array.isArray(b)) return p + ': array vs object';
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = diff(a[k], b[k], p + '.' + k); if (d) return d; }
  return null;
}
let bad = 0;
for (let i = 0; i < Math.max(W.length, U.length); i++) {
  const w = W[i], u = U[i], name = (w || u).name, d = !w || !u ? 'missing on one side' : diff(w.data, u.data, name);
  if (d) bad++; console.log((d ? 'FAIL ' : 'ok   ') + name + (d ? '  ' + d : ''));
}
{ const WT = JSON.parse(webJson).traces || {}, UT = JSON.parse(fs.readFileSync(unityFile, 'utf8')).traces || {};
  for (const k of Object.keys(WT)) { const a = WT[k], b = UT[k] || []; const i = a.findIndex((x, j) => !b[j] || x.some((v, q) => v !== b[j][q]));
    if (i >= 0) console.log('     delve seed ' + k + ': first different tick ' + (i + 1) + ' [n,stage,eHp,hp,gold,randoms]  web ' + JSON.stringify(a[i]) + '  unity ' + JSON.stringify(b[i]) + (i ? '  (tick before: ' + JSON.stringify(a[i - 1]) + ')' : '')); } }
{ const a = JSON.parse(webJson).sites || [], b = JSON.parse(fs.readFileSync(unityFile, 'utf8')).sites || []; const i = a.findIndex((x, j) => x !== b[j]);
  if (i >= 0 && bad) console.log('     random calls (seed 101) first differ at call ' + (i + 1) + ':' + String.fromCharCode(10) + '       web   ' + a.slice(Math.max(0, i - 6), i + 10).join(' ') + String.fromCharCode(10) + '       unity ' + b.slice(Math.max(0, i - 6), i + 10).join(' ')); }
console.log(bad ? bad + ' step(s) differ' : 'web and Unity identical in all ' + W.length + ' steps');
process.exit(bad ? 1 : 0);
