/* ==========================================================================
   API de Gabriel Automoción — lógica común
   --------------------------------------------------------------------------
   La usan los dos modos de servidor:
   - server.js      (ordenador o VPS): guarda en data/*.json y uploads/
   - api/router.js  (Vercel): guarda en Upstash Redis y Vercel Blob
   Cada uno le pasa un "almacén" (store) con la misma interfaz:
     getVehicles() / setVehicles(list)
     getLeads()    / setLeads(list)
     savePhoto(buffer, ext, contentType) → url
     deletePhotos(urls)
     rateLimit(key, max, windowMs) → true si se permite
   ========================================================================== */
'use strict';
const crypto = require('crypto');
const demo = require('./demo');

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
function nextId(list) {
  let max = 1000;
  for (const v of list) { const n = parseInt(String(v.id).replace(/\D/g, ''), 10); if (n > max) max = n; }
  return 'GA-' + (max + 1);
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
async function removeUnused(store, vehicles, candidates) {
  if (!candidates || !candidates.length) return;
  const used = new Set();
  vehicles.forEach((v) => (v.fotos || []).forEach((f) => used.add(f)));
  const gone = candidates.filter((f) => !used.has(f) && store.ownsPhoto(f));
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

  if (resource === 'health') return ok({ ok: true, storage: store.name });

  if (resource === 'login' && method === 'POST') {
    if (!cfg.adminPassword) throw httpError(503, 'Falta configurar la contraseña del panel (variable ADMIN_PASSWORD).');
    if (!(await store.rateLimit('login:' + req.ip, 10, 15 * 60 * 1000))) throw httpError(429, 'Demasiados intentos. Espera unos minutos.');
    if (!safeEqual(body.password || '', cfg.adminPassword)) throw httpError(401, 'Contraseña incorrecta');
    return ok({ token: issueToken(cfg) });
  }

  if (resource === 'vehicles') {
    let vehicles = await store.getVehicles();
    if (!Array.isArray(vehicles)) { vehicles = demo.load(); await store.setVehicles(vehicles); }
    const all = authed && req.query.get('all') === '1';
    if (method === 'GET' && !id) return ok(all ? vehicles : vehicles.filter((v) => !v.oculto));
    if (method === 'GET' && id) {
      const v = vehicles.find((x) => x.id === id);
      if (!v || (v.oculto && !all)) throw httpError(404, 'Vehículo no encontrado');
      return ok(v);
    }
    requireAuth();
    if (method === 'POST' && !id) {
      const v = cleanVehicle(body);
      v.id = nextId(vehicles); v.creado = v.actualizado;
      vehicles.unshift(v);
      await store.setVehicles(vehicles);
      return ok(v, 201);
    }
    const i = vehicles.findIndex((x) => x.id === id);
    if (i === -1) throw httpError(404, 'Vehículo no encontrado');
    if (method === 'PUT') {
      const before = vehicles[i].fotos || [];
      const v = cleanVehicle(body, vehicles[i]);
      v.id = id;
      vehicles[i] = v;
      await store.setVehicles(vehicles);
      await removeUnused(store, vehicles, before.filter((f) => !v.fotos.includes(f)));
      return ok(v);
    }
    if (method === 'DELETE') {
      const [removed] = vehicles.splice(i, 1);
      await store.setVehicles(vehicles);
      await removeUnused(store, vehicles, removed.fotos || []);
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
    let leads = await store.getLeads();
    if (!Array.isArray(leads)) leads = [];
    if (method === 'POST' && !id) {
      if (!(await store.rateLimit('lead:' + req.ip, 20, 60 * 60 * 1000))) throw httpError(429, 'Has enviado demasiadas solicitudes. Inténtalo más tarde.');
      const b = body;
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
      await store.setLeads(leads.slice(0, 2000));
      if (cfg.leadWebhookUrl) {
        await fetch(cfg.leadWebhookUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(lead) })
          .catch((e) => console.error('Webhook:', e.message));
      }
      return ok({ ok: true, id: lead.id }, 201);
    }
    requireAuth();
    if (method === 'GET' && !id) return ok(leads);
    const i = leads.findIndex((l) => l.id === id);
    if (i === -1) throw httpError(404, 'Solicitud no encontrada');
    if (method === 'PUT') {
      if (body.estado) leads[i].estado = str(body.estado, 20);
      if (body.nota != null) leads[i].nota = str(body.nota, 2000);
      await store.setLeads(leads);
      return ok(leads[i]);
    }
    if (method === 'DELETE') {
      leads.splice(i, 1);
      await store.setLeads(leads);
      return ok({ ok: true });
    }
  }

  if (resource === 'reset' && method === 'POST') {
    requireAuth();
    const old = ((await store.getVehicles()) || []).flatMap((v) => v.fotos || []);
    const vehicles = demo.load();
    await store.setVehicles(vehicles);
    await removeUnused(store, vehicles, old);
    return ok({ ok: true });
  }

  if (resource === 'import' && method === 'POST') {
    requireAuth();
    if (!Array.isArray(body.vehiculos)) throw httpError(400, 'Formato no válido');
    const seen = new Set();
    const vehicles = body.vehiculos.map((x) => {
      const v = cleanVehicle(x);
      v.id = str(x.id, 40) || null;
      if (!v.id || seen.has(v.id)) v.id = null;
      if (v.id) seen.add(v.id);
      v.creado = str(x.creado, 40) || v.actualizado;
      return v;
    });
    vehicles.forEach((v) => { if (!v.id) { v.id = nextId(vehicles); seen.add(v.id); } });
    await store.setVehicles(vehicles);
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
