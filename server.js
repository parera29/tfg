/* ==========================================================================
   Servidor de Gabriel Automoción — sin dependencias (Node.js >= 18)
   --------------------------------------------------------------------------
   Para usar la web en un ordenador o en un servidor propio (VPS, Render, Railway).
   - Sirve la web estática.
   - API REST para el panel de administración (lógica en lib/api.js).
   - Datos en PostgreSQL si se define DATABASE_URL (ver bd/README.md);
     si no, en archivos JSON (data/), útil para probar sin instalar nada.
   - Fotos en uploads/.
   En Vercel no se usa este archivo: allí la API es api/router.js.

   Uso:   ADMIN_PASSWORD="una-contraseña-segura" node server.js
   Variables de entorno:
     PORT              Puerto (por defecto 3000)
     ADMIN_PASSWORD    Contraseña del panel (por defecto "demo" — CAMBIAR)
     DATABASE_URL      (opcional) postgres://usuario:clave@host:5432/gabriel
     LEAD_WEBHOOK_URL  (opcional) URL a la que se envía cada solicitud nueva
                       en JSON (p. ej. Make, Zapier, n8n) para recibirla por email.
   ========================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const api = require('./lib/api');
const { createListStore } = require('./lib/store-lists');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const VEH_FILE = path.join(DATA_DIR, 'vehicles.json');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const PORT = +process.env.PORT || 3000;
const CFG = {
  adminPassword: process.env.ADMIN_PASSWORD || 'demo',
  authSecret: process.env.AUTH_SECRET || '',
  leadWebhookUrl: process.env.LEAD_WEBHOOK_URL || ''
};

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json'
};
// Rutas que nunca se sirven como estáticos
const BLOCKED = [/^\/data(\/|$)/, /^\/\./, /^\/node_modules(\/|$)/, /^\/(lib|api)(\/|$)/, /^\/server\.js$/, /^\/package(-lock)?\.json$/, /^\/vercel\.json$/];

/* ---------------- almacén en archivos ---------------- */
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return null; }
}
let writing = Promise.resolve();
function writeJson(file, data) {
  // escrituras en serie y atómicas (archivo temporal + rename)
  writing = writing.then(async () => {
    const tmp = file + '.' + process.pid + '.tmp';
    await fsp.writeFile(tmp, JSON.stringify(data, null, 2));
    await fsp.rename(tmp, file);
  }).catch((e) => console.error('Error guardando', file, e));
  return writing;
}
let vehicles = readJson(VEH_FILE);
let leads = readJson(LEADS_FILE);
const buckets = new Map();
// Datos: PostgreSQL si hay DATABASE_URL; si no, las dos listas en data/*.json.
const dataStore = process.env.DATABASE_URL
  ? require('./lib/store-pg').createPgStore(process.env.DATABASE_URL, api.httpError)
  : createListStore({
    async getVehicles() { return vehicles ? JSON.parse(JSON.stringify(vehicles)) : null; },
    async setVehicles(list) { vehicles = list; await writeJson(VEH_FILE, list); },
    async getLeads() { return leads ? JSON.parse(JSON.stringify(leads)) : []; },
    async setLeads(list) { leads = list; await writeJson(LEADS_FILE, list); }
  });
const fileStore = Object.assign({}, dataStore, {
  name: process.env.DATABASE_URL ? 'postgresql' : 'archivos',
  async savePhoto(buf, ext) {
    const name = Date.now().toString(36) + '-' + crypto.randomBytes(6).toString('hex') + '.' + ext;
    await fsp.writeFile(path.join(UPLOAD_DIR, name), buf);
    return 'uploads/' + name;
  },
  ownsPhoto(url) { return /^\/?uploads\/[\w.-]+$/.test(url); },
  async deletePhotos(urls) {
    for (const u of urls) await fsp.unlink(path.join(UPLOAD_DIR, path.basename(u))).catch(() => {});
  },
  // limitador simple por IP, en memoria
  async rateLimit(key, max, windowMs) {
    const now = Date.now();
    const b = buckets.get(key) || { n: 0, reset: now + windowMs };
    if (now > b.reset) { b.n = 0; b.reset = now + windowMs; }
    b.n++;
    buckets.set(key, b);
    return b.n <= max;
  }
});
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k);
}, 10 * 60 * 1000).unref();

/* ---------------- utilidades HTTP ---------------- */
const SEC_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'SAMEORIGIN'
};
function send(res, status, body) {
  res.writeHead(status, Object.assign({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }, SEC_HEADERS));
  res.end(JSON.stringify(body));
}
function readBody(req, limit) {
  return new Promise((resolve, reject) => {
    let size = 0; const chunks = [];
    req.on('data', (c) => {
      size += c.length;
      if (size > limit) { reject(api.httpError(413, 'El contenido es demasiado grande')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (e) { reject(api.httpError(400, 'JSON no válido')); }
    });
    req.on('error', reject);
  });
}
function ip(req) { return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || ''; }

/* ---------------- API ---------------- */
async function handleApi(req, res, url) {
  const body = req.method === 'GET' || req.method === 'HEAD' ? {} : await readBody(req, 20 * 1024 * 1024);
  const r = await api.run({
    method: req.method, path: url.pathname.replace(/^\/api/, ''), query: url.searchParams,
    headers: req.headers, body, ip: ip(req)
  }, fileStore, CFG);
  send(res, r.status, r.body);
}

/* ---------------- estáticos ---------------- */
async function serveStatic(req, res, url) {
  let p;
  try { p = decodeURIComponent(url.pathname); } catch (e) { p = '/'; }
  if (p.endsWith('/')) p += 'index.html';
  if (BLOCKED.some((r) => r.test(p))) return notFound(res);
  const file = path.normalize(path.join(ROOT, p));
  if (!file.startsWith(ROOT + path.sep)) return notFound(res);
  let stat;
  try { stat = await fsp.stat(file); } catch (e) { stat = null; }
  if (!stat || !stat.isFile()) {
    // URLs sin extensión: /vehiculos → /vehiculos.html
    if (!path.extname(file)) {
      try { const s2 = await fsp.stat(file + '.html'); if (s2.isFile()) return streamFile(req, res, file + '.html', s2); } catch (e) {}
    }
    return notFound(res);
  }
  return streamFile(req, res, file, stat);
}
function streamFile(req, res, file, stat) {
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext];
  if (!type) return notFound(res);
  const longCache = /^\.(woff2|jpg|jpeg|png|webp|svg|mp4|webm)$/.test(ext);
  const headers = Object.assign({
    'Content-Type': type, 'Accept-Ranges': 'bytes',
    'Cache-Control': longCache ? 'public, max-age=604800' : 'no-cache',
    'Last-Modified': stat.mtime.toUTCString()
  }, SEC_HEADERS);
  // Peticiones parciales (Range): necesarias para reproducir vídeo en Safari/iPhone
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || '');
  if (m && (m[1] || m[2])) {
    let start = m[1] ? parseInt(m[1], 10) : Math.max(0, stat.size - parseInt(m[2], 10));
    let end = m[1] && m[2] ? Math.min(parseInt(m[2], 10), stat.size - 1) : stat.size - 1;
    if (start >= stat.size || start > end) {
      res.writeHead(416, Object.assign({ 'Content-Range': 'bytes */' + stat.size }, SEC_HEADERS));
      return res.end();
    }
    res.writeHead(206, Object.assign(headers, { 'Content-Range': `bytes ${start}-${end}/${stat.size}`, 'Content-Length': end - start + 1 }));
    if (req.method === 'HEAD') return res.end();
    return fs.createReadStream(file, { start, end }).pipe(res);
  }
  res.writeHead(200, Object.assign(headers, { 'Content-Length': stat.size }));
  if (req.method === 'HEAD') return res.end();
  fs.createReadStream(file).pipe(res);
}
function notFound(res) {
  res.writeHead(404, Object.assign({ 'Content-Type': 'text/html; charset=utf-8' }, SEC_HEADERS));
  res.end('<!doctype html><meta charset="utf-8"><title>Página no encontrada</title><body style="font-family:system-ui;text-align:center;padding:80px 20px"><h1>Página no encontrada</h1><p><a href="/">Volver al inicio</a></p>');
}

/* ---------------- arranque ---------------- */
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://localhost');
  try {
    if (url.pathname.startsWith('/api/') || url.pathname === '/api') await handleApi(req, res, url);
    else if (req.method === 'GET' || req.method === 'HEAD') await serveStatic(req, res, url);
    else send(res, 405, { error: 'Método no permitido' });
  } catch (e) {
    if (!e.status) console.error(e);
    if (!res.headersSent) send(res, e.status || 500, { error: e.status ? e.message : 'Error interno del servidor' });
  }
});
server.listen(PORT, () => {
  console.log('Gabriel Automoción → http://localhost:' + PORT);
  console.log('Panel de gestión  → http://localhost:' + PORT + '/admin.html');
  if (!process.env.ADMIN_PASSWORD) console.warn('AVISO: usando la contraseña por defecto "demo". Define ADMIN_PASSWORD para producción.');
});
