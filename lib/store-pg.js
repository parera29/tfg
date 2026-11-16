/* ==========================================================================
   Almacén en PostgreSQL (Neon en Vercel, o cualquier PostgreSQL 14+)
   --------------------------------------------------------------------------
   Traduce entre los objetos que usa la web (un vehículo con sus fotos y su
   equipamiento dentro) y las tablas de bd/01_esquema.sql.
   - La primera vez que se conecta a una base de datos vacía crea las tablas
     con bd/01_esquema.sql y carga los vehículos DEMO.
   - Todas las consultas van con parámetros ($1, $2…): nunca se concatena
     texto que venga del usuario, así no hay inyección SQL.
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const net = require('net');
const { Pool } = require('pg');
const demo = require('./demo');

const SCHEMA_FILE = path.join(__dirname, '..', 'bd', '01_esquema.sql');

/* Mensajes claros para las restricciones del esquema que puede saltar la web. */
const CONSTRAINT_MSG = {
  vehiculo_precio_check: 'El precio debe ser mayor que 0',
  vehiculo_anio_check: 'El año debe estar entre 1950 y 2100',
  vehiculo_km_check: 'Los kilómetros no pueden ser negativos',
  vehiculo_potencia_cv_check: 'La potencia debe ser mayor que 0',
  vehiculo_tipo_check: 'Tipo de vehículo no válido',
  vehiculo_cambio_check: 'Tipo de cambio no válido',
  vehiculo_etiqueta_check: 'Etiqueta ambiental no válida',
  vehiculo_estado_check: 'Estado no válido',
  vehiculo_referencia_key: 'Ya existe un vehículo con esa referencia',
  solicitud_estado_check: 'Estado de la solicitud no válido',
  solicitud_tipo_check: 'Tipo de solicitud no válido',
  ck_solicitud_contacto: 'Faltan datos de contacto'
};

function createPgStore(connectionString, httpError) {
  const local = /@(localhost|127\.0\.0\.1)[:/]|host=\/|^postgres(ql)?:\/\/[^@]*\/\w+$/.test(connectionString);
  const pool = new Pool({
    connectionString,
    max: 3,
    idleTimeoutMillis: 10000,
    ssl: local || /sslmode=disable/.test(connectionString) ? false : { rejectUnauthorized: true }
  });
  pool.on('error', (e) => console.error('PostgreSQL:', e.message));

  /* ---------- utilidades ---------- */
  function dbError(e) {
    if (e.status) return e;
    if (['23514', '23505', '23502', '22003', '22001', '23503'].includes(e.code)) {
      const msg = CONSTRAINT_MSG[e.constraint] ||
        (e.code === '22001' ? 'Algún texto es demasiado largo' :
         e.code === '22003' ? 'Algún número es demasiado grande' :
         e.code === '23502' ? 'Falta un dato obligatorio (' + (e.column || '') + ')' : 'Datos no válidos');
      return httpError(400, msg);
    }
    return e;
  }
  async function tx(fn) {
    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const r = await fn(c);
      await c.query('COMMIT');
      return r;
    } catch (e) {
      await c.query('ROLLBACK').catch(() => {});
      throw dbError(e);
    } finally { c.release(); }
  }
  const iso = (d) => (d instanceof Date ? d.toISOString() : d || null);
  const n = (v) => (v == null ? null : Number(v));

  /* ---------- creación del esquema la primera vez ---------- */
  let ready = null;
  function init() {
    if (!ready) {
      ready = (async () => {
        const c = await pool.connect();
        try {
          // Cerrojo para que dos funciones arrancando a la vez no creen el esquema dos veces.
          await c.query('SELECT pg_advisory_lock(727001)');
          const { rows } = await c.query("SELECT to_regclass('public.vehiculo') AS t");
          if (!rows[0].t) {
            console.log('PostgreSQL vacío: creando tablas y cargando vehículos de demostración');
            await c.query(fs.readFileSync(SCHEMA_FILE, 'utf8'));
            await c.query('BEGIN');
            try {
              for (const v of demo.load().reverse()) await insertVehicle(c, v, v.id);
              await c.query('COMMIT');
            } catch (e) { await c.query('ROLLBACK'); throw e; }
          }
        } finally {
          await c.query('SELECT pg_advisory_unlock(727001)').catch(() => {});
          c.release();
        }
      })().catch((e) => { ready = null; throw e; });
    }
    return ready;
  }
  async function q(text, params) {
    await init();
    try { return await pool.query(text, params); } catch (e) { throw dbError(e); }
  }

  /* ---------- vehículos ---------- */
  const SELECT_VEHICLE = `
    SELECT v.*, ma.nombre AS marca, mo.nombre AS modelo, co.nombre AS combustible, ca.nombre AS carroceria,
           COALESCE((SELECT json_agg(f.url ORDER BY f.orden) FROM foto f WHERE f.vehiculo_id = v.id), '[]') AS fotos,
           COALESCE((SELECT json_agg(e.nombre ORDER BY ve.orden, e.nombre)
                     FROM vehiculo_equipamiento ve JOIN equipamiento e ON e.id = ve.equipamiento_id
                     WHERE ve.vehiculo_id = v.id), '[]') AS equipamiento
    FROM vehiculo v
    JOIN modelo mo      ON mo.id = v.modelo_id
    JOIN marca ma       ON ma.id = mo.marca_id
    JOIN combustible co ON co.id = v.combustible_id
    JOIN carroceria ca  ON ca.id = v.carroceria_id`;

  // Fila de la base de datos → objeto que usa la web (mismos nombres que antes).
  function toWeb(r) {
    return {
      id: r.referencia, marca: r.marca, modelo: r.modelo, version: r.version || '',
      precio: n(r.precio), precioAnterior: n(r.precio_anterior), anio: r.anio, km: r.km, potencia: r.potencia_cv,
      combustible: r.combustible, cambio: r.cambio, carroceria: r.carroceria, color: r.color || '',
      etiqueta: r.etiqueta, tipo: r.tipo, estado: r.estado, destacado: r.destacado, oculto: r.oculto, demo: r.demo,
      descripcion: r.descripcion || '', equipamiento: r.equipamiento, fotos: r.fotos,
      creado: iso(r.creado), actualizado: iso(r.actualizado)
    };
  }

  // Busca un valor en una tabla de referencia (sin distinguir mayúsculas) o lo crea.
  async function lookup(c, table, nombre, extra) {
    const where = extra ? ' AND marca_id = $2' : '';
    const params = extra ? [nombre, extra] : [nombre];
    const found = await c.query(`SELECT id FROM ${table} WHERE lower(nombre) = lower($1)${where} LIMIT 1`, params);
    if (found.rows.length) return found.rows[0].id;
    const cols = extra ? '(nombre, marca_id) VALUES ($1, $2)' : '(nombre) VALUES ($1)';
    return (await c.query(`INSERT INTO ${table} ${cols} RETURNING id`, params)).rows[0].id;
  }
  const required = (v, label) => { if (!v) throw httpError(400, 'Falta ' + label); return v; };

  async function vehicleRow(c, v) {
    const marcaId = await lookup(c, 'marca', required(v.marca, 'la marca'));
    return {
      modeloId: await lookup(c, 'modelo', required(v.modelo, 'el modelo'), marcaId),
      combustibleId: await lookup(c, 'combustible', required(v.combustible, 'el combustible')),
      carroceriaId: await lookup(c, 'carroceria', required(v.carroceria, 'la carrocería')),
      // La base de datos no admite un «precio anterior» igual o menor que el actual.
      precioAnterior: v.precioAnterior != null && v.precio != null && v.precioAnterior > v.precio ? v.precioAnterior : null
    };
  }
  async function saveChildren(c, id, v) {
    await c.query('DELETE FROM foto WHERE vehiculo_id = $1', [id]);
    const fotos = [...new Set(v.fotos || [])];
    for (let i = 0; i < fotos.length; i++) {
      await c.query('INSERT INTO foto (vehiculo_id, url, orden) VALUES ($1, $2, $3)', [id, fotos[i], i + 1]);
    }
    await c.query('DELETE FROM vehiculo_equipamiento WHERE vehiculo_id = $1', [id]);
    const seen = new Set();
    let orden = 0;
    for (const nombre of v.equipamiento || []) {
      if (seen.has(nombre.toLowerCase())) continue;
      seen.add(nombre.toLowerCase());
      const eqId = await lookup(c, 'equipamiento', nombre);
      await c.query('INSERT INTO vehiculo_equipamiento (vehiculo_id, equipamiento_id, orden) VALUES ($1, $2, $3)', [id, eqId, ++orden]);
    }
  }
  async function nextRef(c) {
    const { rows } = await c.query("SELECT COALESCE(max(substring(referencia FROM '[0-9]+')::int), 1000) + 1 AS n FROM vehiculo");
    return 'GA-' + rows[0].n;
  }
  async function insertVehicle(c, v, ref) {
    const r = await vehicleRow(c, v);
    const { rows } = await c.query(
      `INSERT INTO vehiculo (referencia, modelo_id, version, combustible_id, carroceria_id, tipo, cambio, etiqueta,
                             precio, precio_anterior, anio, km, potencia_cv, color, descripcion, estado,
                             destacado, oculto, demo, creado, actualizado)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,
               COALESCE($20::timestamptz, now()), COALESCE($21::timestamptz, now()))
       RETURNING id, referencia`,
      [ref || (await nextRef(c)), r.modeloId, v.version || null, r.combustibleId, r.carroceriaId, v.tipo || 'Ocasión',
       v.cambio || null, v.etiqueta || null, v.precio, r.precioAnterior, v.anio, v.km || 0, v.potencia, v.color || null,
       v.descripcion || null, v.estado || 'disponible', !!v.destacado, !!v.oculto, !!v.demo, v.creado || null, v.actualizado || null]);
    await saveChildren(c, rows[0].id, v);
    return rows[0].referencia;
  }
  async function getOne(c, ref) {
    const { rows } = await c.query(SELECT_VEHICLE + ' WHERE v.referencia = $1', [ref]);
    return rows.length ? toWeb(rows[0]) : null;
  }

  /* ---------- solicitudes ---------- */
  const SELECT_LEAD = 'SELECT s.*, v.referencia FROM solicitud s LEFT JOIN vehiculo v ON v.id = s.vehiculo_id';
  function toLead(r) {
    return {
      id: String(r.id), fecha: iso(r.fecha), estado: r.estado, tipo: r.tipo, motivo: r.motivo || '', asunto: r.asunto || '',
      nombre: r.nombre, telefono: r.telefono || '', email: r.email || '', mensaje: r.mensaje || '',
      vehiculoId: r.referencia || '', vehiculoTitulo: r.vehiculo_titulo || '',
      importe: r.importe == null ? '' : String(Number(r.importe)), pagina: r.pagina || '',
      privacidad: r.privacidad, nota: r.nota_interna || ''
    };
  }

  return {
    name: 'postgresql',
    init,
    end: () => pool.end(),

    async listVehicles(includeHidden) {
      const { rows } = await q(SELECT_VEHICLE + (includeHidden ? '' : ' WHERE NOT v.oculto') + ' ORDER BY v.creado DESC, v.id DESC');
      return rows.map(toWeb);
    },
    async getVehicle(ref) {
      const { rows } = await q(SELECT_VEHICLE + ' WHERE v.referencia = $1', [ref]);
      return rows.length ? toWeb(rows[0]) : null;
    },
    async createVehicle(v) {
      await init();
      return tx(async (c) => getOne(c, await insertVehicle(c, v)));
    },
    async updateVehicle(ref, v) {
      await init();
      return tx(async (c) => {
        const cur = await c.query('SELECT id FROM vehiculo WHERE referencia = $1 FOR UPDATE', [ref]);
        if (!cur.rows.length) return null;
        const id = cur.rows[0].id;
        const r = await vehicleRow(c, v);
        await c.query(
          `UPDATE vehiculo SET modelo_id=$2, version=$3, combustible_id=$4, carroceria_id=$5, tipo=$6, cambio=$7,
                  etiqueta=$8, precio=$9, precio_anterior=$10, anio=$11, km=$12, potencia_cv=$13, color=$14,
                  descripcion=$15, estado=$16, destacado=$17, oculto=$18, demo=$19
           WHERE id = $1`,
          [id, r.modeloId, v.version || null, r.combustibleId, r.carroceriaId, v.tipo || 'Ocasión', v.cambio || null,
           v.etiqueta || null, v.precio, r.precioAnterior, v.anio, v.km || 0, v.potencia, v.color || null,
           v.descripcion || null, v.estado || 'disponible', !!v.destacado, !!v.oculto, !!v.demo]);
        await saveChildren(c, id, v);
        return getOne(c, ref);
      });
    },
    async deleteVehicle(ref) {
      const { rowCount } = await q('DELETE FROM vehiculo WHERE referencia = $1', [ref]);
      return rowCount > 0;
    },
    /** Sustituye todo el stock (restaurar demo o importar copia). */
    async replaceVehicles(list) {
      await init();
      return tx(async (c) => {
        await c.query('DELETE FROM vehiculo');
        for (const v of [...list].reverse()) await insertVehicle(c, v, v.id || null);
      });
    },
    /** De estas URLs, ¿cuáles siguen usándose en algún vehículo? */
    async photosInUse(urls) {
      if (!urls.length) return new Set();
      const { rows } = await q('SELECT DISTINCT url FROM foto WHERE url = ANY($1)', [urls]);
      return new Set(rows.map((r) => r.url));
    },

    /* ---------- solicitudes ---------- */
    async listLeads() {
      const { rows } = await q(SELECT_LEAD + ' ORDER BY s.fecha DESC, s.id DESC LIMIT 2000');
      return rows.map(toLead);
    },
    async addLead(l, ip) {
      const importe = Number(l.importe);
      const { rows } = await q(
        `INSERT INTO solicitud (tipo, motivo, asunto, nombre, telefono, email, mensaje, importe, pagina,
                                vehiculo_id, vehiculo_titulo, privacidad, ip)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,(SELECT id FROM vehiculo WHERE referencia = $10),$11,$12,$13)
         RETURNING id`,
        [['contacto', 'vehiculo', 'financiacion'].includes(l.tipo) ? l.tipo : 'contacto', l.motivo || null, l.asunto || null,
         l.nombre, l.telefono || null, l.email || null, l.mensaje || null, importe > 0 && importe < 1e8 ? importe : null, l.pagina || null,
         l.vehiculoId || null, l.vehiculoTitulo || null, !!l.privacidad, net.isIP(ip || '') ? ip : null]);
      return String(rows[0].id);
    },
    async updateLead(id, changes) {
      if (!/^\d+$/.test(id)) return null;
      const { rows } = await q(
        `UPDATE solicitud SET estado = COALESCE($2, estado), nota_interna = COALESCE($3, nota_interna)
         WHERE id = $1 RETURNING id`, [id, changes.estado || null, changes.nota != null ? changes.nota : null]);
      if (!rows.length) return null;
      return toLead((await q(SELECT_LEAD + ' WHERE s.id = $1', [id])).rows[0]);
    },
    async deleteLead(id) {
      if (!/^\d+$/.test(id)) return false;
      const { rowCount } = await q('DELETE FROM solicitud WHERE id = $1', [id]);
      return rowCount > 0;
    },

    /* ---------- límite de peticiones por IP ---------- */
    async rateLimit(key, max, windowMs) {
      const { rows } = await q(
        `INSERT INTO limite_peticion (clave, contador, reinicio)
         VALUES ($1, 1, now() + make_interval(secs => $2))
         ON CONFLICT (clave) DO UPDATE SET
           contador = CASE WHEN limite_peticion.reinicio < now() THEN 1 ELSE limite_peticion.contador + 1 END,
           reinicio = CASE WHEN limite_peticion.reinicio < now() THEN EXCLUDED.reinicio ELSE limite_peticion.reinicio END
         RETURNING contador`, [String(key).slice(0, 120), windowMs / 1000]);
      return rows[0].contador <= max;
    }
  };
}

module.exports = { createPgStore };
