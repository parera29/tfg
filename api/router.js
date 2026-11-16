/* ==========================================================================
   API de Gabriel Automoción en Vercel
   --------------------------------------------------------------------------
   Vercel no tiene disco permanente, así que aquí se guarda todo en servicios
   de almacenamiento que se añaden desde la pestaña "Storage" del proyecto:
   - Upstash for Redis → stock de vehículos y solicitudes (privado).
   - Vercel Blob (público) → fotos de los vehículos.
   Variables de entorno (Vercel las crea solas al conectar el almacenamiento,
   salvo ADMIN_PASSWORD, que hay que añadir a mano):
     ADMIN_PASSWORD                            Contraseña del panel
     KV_REST_API_URL / KV_REST_API_TOKEN       (o UPSTASH_REDIS_REST_URL / _TOKEN)
     BLOB_READ_WRITE_TOKEN
     LEAD_WEBHOOK_URL                          (opcional) aviso por cada solicitud
   Si falta el almacenamiento, /api/health responde ok:false y la web sigue
   funcionando en modo demostración (cambios solo en el navegador).
   Todas las rutas /api/* llegan aquí por la reescritura de vercel.json.
   ========================================================================== */
'use strict';
const crypto = require('crypto');
const api = require('../lib/api');

const REDIS_URL = (process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || '').replace(/\/+$/, '');
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || '';
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
const PREFIX = 'ga:';
const CFG = {
  adminPassword: process.env.ADMIN_PASSWORD || '',
  authSecret: process.env.AUTH_SECRET || '',
  leadWebhookUrl: process.env.LEAD_WEBHOOK_URL || ''
};

/* ---------------- Upstash Redis (API REST, sin dependencias) ---------------- */
async function redis(commands) {
  const res = await fetch(REDIS_URL + '/pipeline', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + REDIS_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify(commands)
  });
  if (!res.ok) throw new Error('Redis respondió ' + res.status);
  const out = await res.json();
  return out.map((r) => { if (r.error) throw new Error('Redis: ' + r.error); return r.result; });
}
async function getJson(key) {
  const [v] = await redis([['GET', PREFIX + key]]);
  if (v == null) return null;
  try { return JSON.parse(v); } catch (e) { return null; }
}
async function setJson(key, value) { await redis([['SET', PREFIX + key, JSON.stringify(value)]]); }

/* ---------------- almacén Vercel ---------------- */
let blob = null;
function blobLib() { if (!blob) blob = require('@vercel/blob'); return blob; }

const vercelStore = {
  name: 'vercel',
  getVehicles: () => getJson('vehicles'),
  setVehicles: (list) => setJson('vehicles', list),
  getLeads: () => getJson('leads'),
  setLeads: (list) => setJson('leads', list),
  async savePhoto(buf, ext, contentType) {
    const name = 'fotos/' + Date.now().toString(36) + '-' + crypto.randomBytes(6).toString('hex') + '.' + ext;
    try {
      const r = await blobLib().put(name, buf, { access: 'public', contentType, token: BLOB_TOKEN, addRandomSuffix: false });
      return r.url;
    } catch (e) {
      console.error('Blob:', e.message);
      throw api.httpError(500, /private/i.test(e.message)
        ? 'El almacén de fotos (Blob) es privado. Crea uno nuevo marcado como "Public" en Vercel → Storage.'
        : 'No se ha podido guardar la foto. Inténtalo de nuevo.');
    }
  },
  ownsPhoto(url) { return /^https:\/\/[\w.-]+\.blob\.vercel-storage\.com\//.test(url); },
  async deletePhotos(urls) { await blobLib().del(urls, { token: BLOB_TOKEN }); },
  async rateLimit(key, max, windowMs) {
    const k = PREFIX + 'rl:' + key;
    const [n] = await redis([['INCR', k], ['PEXPIRE', k, String(windowMs), 'NX']]);
    return n <= max;
  }
};

/* ---------------- manejador ---------------- */
function send(res, status, body) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.end(JSON.stringify(body));
}

module.exports = async function handler(req, res) {
  const url = new URL(req.url, 'http://localhost');
  // La reescritura de vercel.json pasa la ruta original en ?__p=…
  let path = url.searchParams.get('__p');
  url.searchParams.delete('__p');
  if (path == null) path = url.pathname.replace(/^\/api(\/router)?/, '');

  const ready = !!(REDIS_URL && REDIS_TOKEN && BLOB_TOKEN);
  if (!ready) {
    // Sin almacenamiento la web cae al modo demostración del navegador.
    const missing = [!(REDIS_URL && REDIS_TOKEN) && 'Upstash Redis', !BLOB_TOKEN && 'Vercel Blob'].filter(Boolean);
    return send(res, path.replace(/^\/+/, '') === 'health' ? 200 : 503,
      { ok: false, error: 'Falta conectar el almacenamiento en Vercel: ' + missing.join(' y ') + '.' });
  }

  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch (e) { return send(res, 400, { error: 'JSON no válido' }); } }
  if (!body || typeof body !== 'object' || Buffer.isBuffer(body)) body = {};

  const r = await api.run({
    method: req.method, path, query: url.searchParams, headers: req.headers, body,
    ip: String(req.headers['x-forwarded-for'] || '').split(',')[0].trim() || 'anon'
  }, vercelStore, CFG);
  send(res, r.status, r.body);
};
