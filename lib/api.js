/* ==========================================================================
   API de Gabriel Automoción — lógica común
   --------------------------------------------------------------------------
   La usan los dos modos de servidor:
   - server.js      (ordenador o VPS): guarda en data/*.json y uploads/
   - api/router.js  (Vercel): guarda en Upstash Redis y Vercel Blob
   Cada uno le pasa un "almacén" (store) con la misma interfaz:
     listVehicles(incluirOcultos) / getVehicle(ref) / createVehicle(v)
     updateVehicle(ref, v) / deleteVehicle(ref) / replaceVehicles(lista)
     photosInUse(urls) → Set con las que aún usa algún vehículo
     listLeads() / addLead(lead, ip) → id / updateLead(id, cambios) / deleteLead(id)
     savePhoto(buffer, ext, contentType) → url / ownsPhoto(url) / deletePhotos(urls)
     rateLimit(key, max, windowMs) → true si se permite
   Hay dos almacenes de datos: lib/store-pg.js (PostgreSQL, el principal)
   y lib/store-lists.js (archivos JSON, para probar sin base de datos).
   ========================================================================== */
'use strict';
const crypto = require('crypto');
const demo = require('./demo');
const LEAD_ESTADOS = ['nuevo', 'contactado', 'cerrado'];

const TOKEN_TTL = 12 * 60 * 60 * 1000;
const ESTADOS = ['disponible', 'reservado', 'vendido'];

function httpError(status, message) { const e = new Error(message); e.status = status; return e; }
const str = (v, max = 200) => (v == null ? '' : String(v)).trim().slice(0, max);
const num = (v) => { if (v === '' || v == null) return null; const n = Number(v); return Number.isFinite(n) ? n : null; };

/* ---------------- validación ---------------- */
function cleanVehicle(input, existing) {
  const v = Object.assign({}, existing || {});
  Object.assign(v, {
    marca: str(input.marca, 60), modelo: str(input.modelo, 80), version: str(input.version, 120),
    combustible: str(input.combustible, 40), cambio: str(input.cambio, 40), carroceria: str(input.carroceria, 40),
    color: str(input.color, 40), etiqueta: str(input.etiqueta, 20), tipo: str(input.tipo, 40),
    descripcion: str(input.descripcion, 8000)
  });
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
/* ---------------- autenticación ----------------
   Tokens firmados (HMAC) con caducidad: no hace falta guardarlos en memoria,
   así funcionan igual en un servidor normal que en funciones de Vercel. */
function secret(cfg) { return 'ga-admin:' + (cfg.authSecret || '') + ':' + cfg.adminPassword; }
function b64url(buf) { return Buffer.from(buf).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_'); }
function sign(payload, cfg) { return b64url(crypto.createHmac('sha256', secret(cfg)).update(payload).digest()); }
function issueToken(cfg) {
  const payload = b64url(JSON.stringify({ exp: Date.now() + TOKEN_TTL, n: crypto.randomBytes(6).toString('hex') }));
  return payload + '.' + sign(payload, cfg);
}
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}
function isAuthed(headers, cfg) {
  if (!cfg.adminPassword) return false;
  const h = headers.authorization || '';
  const t = h.startsWith('Bearer ') ? h.slice(7) : '';
  const [payload, sig] = t.split('.');
  if (!payload || !sig || !safeEqual(sig, sign(payload, cfg))) return false;
  try {
    const data = JSON.parse(Buffer.from(payload.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8'));
    return typeof data.exp === 'number' && data.exp > Date.now();
  } catch (e) { return false; }
}

/* ---------------- fotos ---------------- */
async function removeUnused(store, candidates) {
  candidates = (candidates || []).filter((f) => store.ownsPhoto(f));
  if (!candidates.length) return;
  const used = await store.photosInUse(candidates);
  const gone = candidates.filter((f) => !used.has(f));
  if (gone.length) await store.deletePhotos(gone).catch((e) => console.error('Borrando fotos:', e.message));
}

/* ---------------- peticiones ----------------
   req = { method, path ('/vehicles/GA-1001'), query (URLSearchParams), headers, body (objeto), ip }
   Devuelve { status, body }. */
async function handle(req, store, cfg) {
  const parts = req.path.replace(/^\/+/, '').split('/').filter(Boolean).map((p) => { try { return decodeURIComponent(p); } catch (e) { return p; } });
  const [resource, id] = parts;
  const method = req.method;
  const body = req.body || {};
  const authed = isAuthed(req.headers, cfg);
  const requireAuth = () => { if (!authed) throw httpError(401, 'Sesión no válida o caducada. Vuelve a iniciar sesión.'); };
  const ok = (b, status = 200) => ({ status, body: b });

  if (resource === 'health') {
    if (store.init) await store.init();   // crea las tablas si la base de datos está vacía
    return ok({ ok: true, storage: store.name });
  }

  if (resource === 'login' && method === 'POST') {
    if (!cfg.adminPassword) throw httpError(503, 'Falta configurar la contraseña del panel (variable ADMIN_PASSWORD).');
    if (!(await store.rateLimit('login:' + req.ip, 10, 15 * 60 * 1000))) throw httpError(429, 'Demasiados intentos. Espera unos minutos.');
    if (!safeEqual(body.password || '', cfg.adminPassword)) throw httpError(401, 'Contraseña incorrecta');
    return ok({ token: issueToken(cfg) });
  }

  if (resource === 'vehicles') {
    const all = authed && req.query.get('all') === '1';
    if (method === 'GET' && !id) return ok(await store.listVehicles(all));
    if (method === 'GET' && id) {
      const v = await store.getVehicle(id);
      if (!v || (v.oculto && !all)) throw httpError(404, 'Vehículo no encontrado');
      return ok(v);
    }
    requireAuth();
    if (method === 'POST' && !id) return ok(await store.createVehicle(cleanVehicle(body)), 201);
    const existing = await store.getVehicle(id);
    if (!existing) throw httpError(404, 'Vehículo no encontrado');
    if (method === 'PUT') {
      const v = await store.updateVehicle(id, cleanVehicle(body, existing));
      await removeUnused(store, (existing.fotos || []).filter((f) => !v.fotos.includes(f)));
      return ok(v);
    }
    if (method === 'DELETE') {
      await store.deleteVehicle(id);
      await removeUnused(store, existing.fotos || []);
      return ok({ ok: true });
    }
  }

  if (resource === 'upload' && method === 'POST') {
    requireAuth();
    const m = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(body.dataUrl || '');
    if (!m) throw httpError(400, 'Formato de imagen no válido (JPG, PNG o WEBP)');
    const buf = Buffer.from(m[2], 'base64');
    if (buf.length > 10 * 1024 * 1024) throw httpError(413, 'La imagen supera 10 MB');
    const ext = m[1] === 'jpeg' ? 'jpg' : m[1];
    const url = await store.savePhoto(buf, ext, 'image/' + m[1]);
    return ok({ url }, 201);
  }

  if (resource === 'leads') {
    if (method === 'POST' && !id) {
      if (!(await store.rateLimit('lead:' + req.ip, 20, 60 * 60 * 1000))) throw httpError(429, 'Has enviado demasiadas solicitudes. Inténtalo más tarde.');
      const b = body;
      if (!b.privacidad) throw httpError(400, 'Debes aceptar la política de privacidad');
      const lead = {
        fecha: new Date().toISOString(), estado: 'nuevo',
        tipo: str(b.tipo, 40), motivo: str(b.motivo, 60), asunto: str(b.asunto, 80),
        nombre: str(b.nombre, 120), telefono: str(b.telefono, 40), email: str(b.email, 160),
        mensaje: str(b.mensaje, 4000), vehiculoId: str(b.vehiculoId, 40), vehiculoTitulo: str(b.vehiculoTitulo, 200),
        importe: str(b.importe, 20), pagina: str(b.pagina, 80), privacidad: true
      };
      if (!lead.nombre || (!lead.telefono && !lead.email)) throw httpError(400, 'Faltan datos de contacto');
      lead.id = await store.addLead(lead, req.ip);
      if (cfg.leadWebhookUrl) {
        await fetch(cfg.leadWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) })
          .catch((e) => console.error('Webhook:', e.message));
      }
      return ok({ ok: true, id: lead.id }, 201);
    }
    requireAuth();
    if (method === 'GET' && !id) return ok(await store.listLeads());
    if (method === 'PUT' && id) {
      if (body.estado && !LEAD_ESTADOS.includes(body.estado)) throw httpError(400, 'Estado de la solicitud no válido');
      const l = await store.updateLead(id, { estado: body.estado || null, nota: body.nota != null ? str(body.nota, 2000) : null });
      if (!l) throw httpError(404, 'Solicitud no encontrada');
      return ok(l);
    }
    if (method === 'DELETE' && id) {
      if (!(await store.deleteLead(id))) throw httpError(404, 'Solicitud no encontrada');
      return ok({ ok: true });
    }
  }

  if (resource === 'reset' && method === 'POST') {
    requireAuth();
    const old = (await store.listVehicles(true)).flatMap((v) => v.fotos || []);
    await store.replaceVehicles(demo.load());
    await removeUnused(store, old);
    return ok({ ok: true });
  }

  if (resource === 'import' && method === 'POST') {
    requireAuth();
    if (!Array.isArray(body.vehiculos)) throw httpError(400, 'Formato no válido');
    const seen = new Set();
    const vehicles = body.vehiculos.map((x) => {
      const v = cleanVehicle(x);
      v.id = str(x.id, 12) || null;
      if (v.id && seen.has(v.id)) v.id = null;
      if (v.id) seen.add(v.id);
      v.creado = str(x.creado, 40) || v.actualizado;
      return v;
    });
    await store.replaceVehicles(vehicles);
    return ok({ ok: true, total: vehicles.length });
  }

  throw httpError(404, 'Ruta no encontrada');
}

/** Ejecuta handle() y convierte los errores en respuestas JSON. */
async function run(req, store, cfg) {
  try { return await handle(req, store, cfg); }
  catch (e) {
    if (!e.status) console.error(e);
    return { status: e.status || 500, body: { error: e.status ? e.message : 'Error interno del servidor' } };
  }
}

module.exports = { run, httpError };
