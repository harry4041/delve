// Minimal dependency-free static server for the built game (dist/), used by the Ruust deploy (see Procfile).
// Binds 0.0.0.0 and reads PORT. Serves index.html for extension-less paths (SPA fallback), gzips text assets.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { gzipSync } from 'node:zlib';
import { extname, join, normalize, resolve, sep } from 'node:path';

const root = resolve(process.env.DIST_DIR || 'dist');
const port = Number(process.env.PORT) || 3000;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8',
  '.webmanifest': 'application/manifest+json', '.map': 'application/json',
};
const COMPRESSIBLE = new Set(['.html', '.js', '.css', '.json', '.svg', '.txt', '.webmanifest', '.map']);
const cache = new Map(); // file -> { raw, gz, mtimeMs }

async function load(file, st) {
  const hit = cache.get(file);
  if (hit && hit.mtimeMs === st.mtimeMs) return hit;
  const raw = await readFile(file);
  const entry = { raw, gz: COMPRESSIBLE.has(extname(file)) && raw.length > 1024 ? gzipSync(raw) : null, mtimeMs: st.mtimeMs };
  cache.set(file, entry);
  return entry;
}

const server = createServer(async (req, res) => {
  const send = (code, body, headers = {}) => { res.writeHead(code, { 'X-Content-Type-Options': 'nosniff', ...headers }); res.end(body); };
  try {
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(405, 'Method Not Allowed', { Allow: 'GET, HEAD' });
    let pathname;
    try { pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { return send(400, 'Bad Request'); }
    if (pathname.includes('\0')) return send(400, 'Bad Request');
    let file = resolve(join(root, normalize(pathname)));
    if (file !== root && !file.startsWith(root + sep)) return send(403, 'Forbidden');
    let st = await stat(file).catch(() => null);
    if (st && st.isDirectory()) { file = join(file, 'index.html'); st = await stat(file).catch(() => null); }
    if (!st) {
      if (extname(pathname)) return send(404, 'Not Found');           // missing asset
      file = join(root, 'index.html'); st = await stat(file).catch(() => null);   // SPA route
      if (!st) return send(404, 'Not Found');
    }
    const ext = extname(file), entry = await load(file, st);
    const useGz = entry.gz && /\bgzip\b/.test(req.headers['accept-encoding'] || '');
    const body = useGz ? entry.gz : entry.raw;
    const headers = {
      'Content-Type': TYPES[ext] || 'application/octet-stream',
      'Content-Length': body.length,
      'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache',
      Vary: 'Accept-Encoding',
    };
    if (useGz) headers['Content-Encoding'] = 'gzip';
    res.writeHead(200, { 'X-Content-Type-Options': 'nosniff', ...headers });
    res.end(req.method === 'HEAD' ? undefined : body);
  } catch (e) {
    console.error(e);
    send(500, 'Internal Server Error');
  }
});

server.listen(port, '0.0.0.0', () => console.log(`Serving ${root} on 0.0.0.0:${port}`));
