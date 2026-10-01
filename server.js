/* ==========================================================================
   Servidor de Gabriel Automoción — sin dependencias (Node.js >= 18)
   --------------------------------------------------------------------------
   - Sirve la web estática.
   - API REST para el panel de administración (stock, fotos y solicitudes).
   - Persistencia en archivos JSON (data/) y fotos en uploads/.

   Uso:   ADMIN_PASSWORD="una-contraseña-segura" node server.js
   Variables de entorno:
     PORT              Puerto (por defecto 3000)
     ADMIN_PASSWORD    Contraseña del panel (por defecto "demo" — CAMBIAR)
     LEAD_WEBHOOK_URL  (opcional) URL a la que se envía cada solicitud nueva
                       en JSON (p. ej. Make, Zapier, n8n) para recibirla por email.
   ========================================================================== */
'use strict';
const http = require('http');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const vm = require('vm');

const ROOT = __dirname;
const DATA_DIR = path.join(ROOT, 'data');
const UPLOAD_DIR = path.join(ROOT, 'uploads');
const VEH_FILE = path.join(DATA_DIR, 'vehicles.json');
const LEADS_FILE = path.join(DATA_DIR, 'leads.json');
const PORT = +process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'demo';
const LEAD_WEBHOOK_URL = process.env.LEAD_WEBHOOK_URL || '';
const TOKEN_TTL = 12 * 60 * 60 * 1000;

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8', '.xml': 'application/xml; charset=utf-8', '.webmanifest': 'application/manifest+json'
};
// Rutas que nunca se sirven como estáticos
const BLOCKED = [/^\/data(\/|$)/, /^\/\./, /^\/node_modules(\/|$)/, /^\/server\.js$/, /^\/package(-lock)?\.json$/];

/* ---------------- persistencia ---------------- */
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

function loadDemo() {
  const code = fs.readFileSync(path.join(ROOT, 'js', 'demo-data.js'), 'utf8');
  const ctx = { window: {} };
  vm.runInNewContext(code, ctx);
  return JSON.parse(JSON.stringify(ctx.window.DEMO_VEHICLES || []));
}
function readJson(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch (e) { return fallback; }
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
let vehicles = readJson(VEH_FILE, null);
if (!Array.isArray(vehicles)) { vehicles = loadDemo(); writeJson(VEH_FILE, vehicles); }
let leads = readJson(LEADS_FILE, []);
if (!Array.isArray(leads)) leads = [];

/* ---------------- validación ---------------- */
const str = (v, max = 200) => (v == null ? '' : String(v)).trim().slice(0, max);
const num = (v) => { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const ESTADOS = ['disponible', 'reservado', 'vendido'];
function cleanVehicle(input, existing) {
  const v = Object.assign({}, existing || {});
  const s = {
    marca: str(input.marca, 60), modelo: str(input.modelo, 80), version: str(input.version, 120),
    combustible: str(input.combustible, 40), cambio: str(input.cambio, 40), carroceria: str(input.carroceria, 40),
    color: str(input.color, 40), etiqueta: str(input.etiqueta, 20), tipo: str(input.tipo, 40),
    descripcion: str(input.descripcion, 8000)
  };
  Object.assign(v, s);
  v.precio = num(input.precio);
  v.precioAnterior = num(input.precioAnterior);
  v.anio = num(input.anio);
  v.km = num(input.km);
  v.potencia = num(input.potencia);
  v.equipamiento = Array.isArray(input.equipamiento) ? input.equipamiento.map((e) => str(e, 160)).filter(Boolean).slice(0, 150) : [];
  v.fotos = Array.isArray(input.fotos) ? input.fotos.map((f) => str(f, 600)).filter((f) => /^(\/?uploads\/[\w.-]+|https:\/\/[^\s"'<>]+)$/.test(f)).slice(0, 40) : [];
  v.estado = ESTADOS.includes(input.estado) ? input.estado : 'disponible';
  v.oculto = !!input.oculto;
  v.destacado = !!input.destacado;
  v.demo = !!input.demo;
  v.actualizado = new Date().toISOString();
  if (!v.marca || !v.modelo) throw httpError(400, 'Marca y modelo son obligatorios');
  return v;
}
function nextId() {
  let max = 1000;
  for (const v of vehicles) { const n = parseInt(String(v.id).replace(/\D/g, ''), 10); if (n > max) max = n; }
  return 'GA-' + (max + 1);
}
function httpError(status, message) { const e = new Error(message); e.status = status; return e; }

/* ---------------- borrado de fotos huérfanas ---------------- */
async function cleanupUploads(candidates) {
  const used = new Set();
  vehicles.forEach((v) => (v.fotos || []).forEach((f) => used.add(path.basename(f))));
  for (const f of candidates) {
    if (!/^\/?uploads\//.test(f)) continue;
    const name = path.basename(f);
    if (used.has(name)) continue;
    await fsp.unlink(path.join(UPLOAD_DIR, name)).catch(() => {});
  }
}

/* ---------------- autenticación ---------------- */
const tokens = new Map();
function issueToken() {
  const t = crypto.randomBytes(32).toString('hex');
  tokens.set(t, Date.now() + TOKEN_TTL);
  return t;
}
function isAuthed(req) {
  const h = req.headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  const exp = tokens.get(t);
  if (!exp) return false;
  if (exp < Date.now()) { tokens.delete(t); return false; }
  return true;
}
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
// limitador simple por IP
const buckets = new Map();
function rateLimit(key, max, windowMs) {
  const now = Date.now();
  const b = buckets.get(key) || { n: 0, reset: now + windowMs };
  if (now > b.reset) { b.n = 0; b.reset = now + windowMs; }
  b.n++;
  buckets.set(key, b);
  return b.n <= max;
}
setInterval(() => {
  const now = Date.now();
  for (const [k, b] of buckets) if (now > b.reset) buckets.delete(k);
  for (const [t, e] of tokens) if (e < now) tokens.delete(t);
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
      if (size > limit) { reject(httpError(413, 'El contenido es demasiado grande')); req.destroy(); return; }
      chunks.push(c);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try { resolve(JSON.parse(Buffer.concat(chunks).toString('utf8'))); } catch (e) { reject(httpError(400, 'JSON no válido')); }
    });
    req.on('error', reject);
  });
}
function ip(req) { return (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.socket.remoteAddress || ''; }

/* ---------------- API ---------------- */
async function handleApi(req, res, url) {
  const parts = url.pathname.replace(/^\/api\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
  const [resource, id] = parts;
  const method = req.method;
  const authed = isAuthed(req);
  const requireAuth = () => { if (!authed) throw httpError(401, 'Sesión no válida o caducada. Vuelve a iniciar sesión.'); };

  if (resource === 'health') return send(res, 200, { ok: true });

  if (resource === 'login' && method === 'POST') {
    if (!rateLimit('login:' + ip(req), 10, 15 * 60 * 1000)) throw httpError(429, 'Demasiados intentos. Espera unos minutos.');
    const body = await readBody(req, 10 * 1024);
    if (!safeEqual(body.password || '', ADMIN_PASSWORD)) throw httpError(401, 'Contraseña incorrecta');
    return send(res, 200, { token: issueToken() });
  }

  if (resource === 'vehicles') {
    const all = authed && url.searchParams.get('all') === '1';
    if (method === 'GET' && !id) return send(res, 200, all ? vehicles : vehicles.filter((v) => !v.oculto));
    if (method === 'GET' && id) {
      const v = vehicles.find((x) => x.id === id);
      if (!v || (v.oculto && !all)) throw httpError(404, 'Vehículo no encontrado');
      return send(res, 200, v);
    }
    requireAuth();
    if (method === 'POST' && !id) {
      const v = cleanVehicle(await readBody(req, 2 * 1024 * 1024));
      v.id = nextId(); v.creado = v.actualizado;
      vehicles.unshift(v);
      await writeJson(VEH_FILE, vehicles);
      return send(res, 201, v);
    }
    const i = vehicles.findIndex((x) => x.id === id);
    if (i === -1) throw httpError(404, 'Vehículo no encontrado');
    if (method === 'PUT') {
      const before = vehicles[i].fotos || [];
      const v = cleanVehicle(await readBody(req, 2 * 1024 * 1024), vehicles[i]);
      v.id = id;
      vehicles[i] = v;
      await writeJson(VEH_FILE, vehicles);
      await cleanupUploads(before.filter((f) => !v.fotos.includes(f)));
      return send(res, 200, v);
    }
    if (method === 'DELETE') {
      const [removed] = vehicles.splice(i, 1);
      await writeJson(VEH_FILE, vehicles);
      await cleanupUploads(removed.fotos || []);
      return send(res, 200, { ok: true });
    }
  }

  if (resource === 'upload' && method === 'POST') {
    requireAuth();
    const body = await readBody(req, 15 * 1024 * 1024);
    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(body.dataUrl || '');
    if (!m) throw httpError(400, 'Formato de imagen no válido (JPG, PNG o WEBP)');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 10 * 1024 * 1024) throw httpError(413, 'La imagen supera 10 MB');
    const name = Date.now().toString(36) + '-' + crypto.randomBytes(6).toString('hex') + '.' + (m[1] === 'jpeg' ? 'jpg' : m[1]);
    await fsp.writeFile(path.join(UPLOAD_DIR, name), buf);
    return send(res, 201, { url: 'uploads/' + name });
  }

  if (resource === 'leads') {
    if (method === 'POST' && !id) {
      if (!rateLimit('lead:' + ip(req), 20, 60 * 60 * 1000)) throw httpError(429, 'Has enviado demasiadas solicitudes. Inténtalo más tarde.');
      const b = await readBody(req, 50 * 1024);
      if (!b.privacidad) throw httpError(400, 'Debes aceptar la política de privacidad');
      const lead = {
        id: 'L' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex'),
        fecha: new Date().toISOString(), estado: 'nuevo',
        tipo: str(b.tipo, 40), motivo: str(b.motivo, 60), asunto: str(b.asunto, 80),
        nombre: str(b.nombre, 120), telefono: str(b.telefono, 40), email: str(b.email, 160),
        mensaje: str(b.mensaje, 4000), vehiculoId: str(b.vehiculoId, 40), vehiculoTitulo: str(b.vehiculoTitulo, 200),
        importe: str(b.importe, 20), pagina: str(b.pagina, 80), privacidad: true
      };
      if (!lead.nombre || (!lead.telefono && !lead.email)) throw httpError(400, 'Faltan datos de contacto');
      leads.unshift(lead);
      await writeJson(LEADS_FILE, leads);
      if (LEAD_WEBHOOK_URL) fetch(LEAD_WEBHOOK_URL, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) }).catch((e) => console.error('Webhook:', e.message));
      return send(res, 201, { ok: true, id: lead.id });
    }
    requireAuth();
    if (method === 'GET' && !id) return send(res, 200, leads);
    const i = leads.findIndex((l) => l.id === id);
    if (i === -1) throw httpError(404, 'Solicitud no encontrada');
    if (method === 'PUT') {
      const b = await readBody(req, 20 * 1024);
      if (b.estado) leads[i].estado = str(b.estado, 20);
      if (b.nota != null) leads[i].nota = str(b.nota, 2000);
      await writeJson(LEADS_FILE, leads);
      return send(res, 200, leads[i]);
    }
    if (method === 'DELETE') {
      leads.splice(i, 1);
      await writeJson(LEADS_FILE, leads);
      return send(res, 200, { ok: true });
    }
  }

  if (resource === 'reset' && method === 'POST') {
    requireAuth();
    const old = vehicles.flatMap((v) => v.fotos || []);
    vehicles = loadDemo();
    await writeJson(VEH_FILE, vehicles);
    await cleanupUploads(old);
    return send(res, 200, { ok: true });
  }

  if (resource === 'import' && method === 'POST') {
    requireAuth();
    const b = await readBody(req, 20 * 1024 * 1024);
    if (!Array.isArray(b.vehiculos)) throw httpError(400, 'Formato no válido');
    const seen = new Set();
    vehicles = b.vehiculos.map((x) => {
      const v = cleanVehicle(x);
      v.id = str(x.id, 40) || null;
      if (!v.id || seen.has(v.id)) v.id = null;
      if (v.id) seen.add(v.id);
      v.creado = str(x.creado, 40) || v.actualizado;
      return v;
    });
    vehicles.forEach((v) => { if (!v.id) { v.id = nextId(); seen.add(v.id); } });
    await writeJson(VEH_FILE, vehicles);
    return send(res, 200, { ok: true, total: vehicles.length });
  }

  throw httpError(404, 'Ruta no encontrada');
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
  const longCache = /^\.(woff2|jpg|jpeg|png|webp|svg)$/.test(ext);
  res.writeHead(200, Object.assign({
    'Content-Type': type, 'Content-Length': stat.size,
    'Cache-Control': longCache ? 'public, max-age=604800' : 'no-cache',
    'Last-Modified': stat.mtime.toUTCString()
  }, SEC_HEADERS));
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
