/* ==========================================================================
   API de Gabriel Automoción en Vercel
   --------------------------------------------------------------------------
   Vercel no tiene disco permanente, así que se usan dos servicios que se
   añaden desde la pestaña "Storage" del proyecto:
   - Neon (PostgreSQL) → vehículos, equipamiento, solicitudes… (bd/01_esquema.sql).
     La primera vez que arranca con la base de datos vacía crea las tablas y
     carga los vehículos de demostración.
   - Vercel Blob (público) → fotos de los vehículos.
   Variables de entorno (Vercel las crea solas al conectar el almacenamiento,
   salvo ADMIN_PASSWORD, que hay que añadir a mano):
     ADMIN_PASSWORD                  Contraseña del panel
     DATABASE_URL (o POSTGRES_URL)   Conexión a PostgreSQL
     BLOB_READ_WRITE_TOKEN
     LEAD_WEBHOOK_URL                (opcional) aviso por cada solicitud
   Si falta el almacenamiento, /api/health responde ok:false y la web sigue
   funcionando en modo demostración (cambios solo en el navegador).
   Todas las rutas /api/* llegan aquí por la reescritura de vercel.json.
   ========================================================================== */
'use strict';
const crypto = require('crypto');
const api = require('../lib/api');
const { createPgStore } = require('../lib/store-pg');

const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL || '';
const BLOB_TOKEN = process.env.BLOB_READ_WRITE_TOKEN || '';
const CFG = {
  adminPassword: process.env.ADMIN_PASSWORD || '',
  authSecret: process.env.AUTH_SECRET || '',
  leadWebhookUrl: process.env.LEAD_WEBHOOK_URL || ''
};

/* ---------------- fotos en Vercel Blob ---------------- */
let blob = null;
function blobLib() { if (!blob) blob = require('@vercel/blob'); return blob; }

const photos = {
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
  async deletePhotos(urls) { await blobLib().del(urls, { token: BLOB_TOKEN }); }
};

// La conexión se crea una vez por instancia y se reutiliza entre peticiones.
const vercelStore = DB_URL ? Object.assign(createPgStore(DB_URL, api.httpError), photos) : null;

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

  const ready = !!(DB_URL && BLOB_TOKEN);
  if (!ready) {
    // Sin almacenamiento la web cae al modo demostración del navegador.
    const missing = [!DB_URL && 'Neon (PostgreSQL)', !BLOB_TOKEN && 'Vercel Blob'].filter(Boolean);
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
