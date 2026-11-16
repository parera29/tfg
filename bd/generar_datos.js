/* ==========================================================================
   Genera bd/02_datos.sql a partir de los vehículos DEMO de la web
   (js/demo-data.js), para que la base de datos y la web tengan el mismo stock.
   Uso:  node bd/generar_datos.js
   ========================================================================== */
'use strict';
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const demo = require('../lib/demo').load();

const q = (v) => (v == null || v === '' ? 'NULL' : typeof v === 'number' || typeof v === 'boolean' ? String(v) : "'" + String(v).replace(/'/g, "''") + "'");
const uniq = (arr) => [...new Set(arr)];

/* Contraseña con scrypt (módulo crypto de Node, sin dependencias).
   Formato guardado: scrypt$<sal en hex>$<hash en hex>. La sal es fija aquí
   solo para que el archivo generado no cambie en cada ejecución. */
function hash(password, seed) {
  const salt = crypto.createHash('sha256').update('sal-demo-' + seed).digest().subarray(0, 16);
  return 'scrypt$' + salt.toString('hex') + '$' + crypto.scryptSync(password, salt, 64).toString('hex');
}

const out = [];
const w = (s = '') => out.push(s);

w('-- ============================================================================');
w('--  Gabriel Automoción · 02_datos.sql — datos de ejemplo');
w('--  GENERADO por bd/generar_datos.js a partir de js/demo-data.js. No editar a mano.');
w('--  Contraseña de todas las cuentas de ejemplo: demo1234');
w('-- ============================================================================');
w();
w('BEGIN;');
w();

/* ---- Tablas de referencia ---- */
const lists = {
  combustible: ['Gasolina', 'Diésel', 'Híbrido', 'Híbrido enchufable', 'Eléctrico', 'GLP', 'GNC'],
  carroceria: ['Berlina', 'Compacto', 'SUV', 'Familiar', 'Utilitario', 'Monovolumen', 'Coupé', 'Cabrio', 'Pick-up', 'Furgoneta']
};
for (const [t, vals] of Object.entries(lists)) {
  w(`INSERT INTO ${t} (nombre) VALUES`);
  w(vals.map((v) => `    (${q(v)})`).join(',\n') + ';');
  w();
}
const marcas = uniq(demo.map((v) => v.marca)).sort();
w('INSERT INTO marca (nombre) VALUES');
w(marcas.map((m) => `    (${q(m)})`).join(',\n') + ';');
w();
const modelos = uniq(demo.map((v) => v.marca + '|' + v.modelo)).map((s) => s.split('|'));
w('INSERT INTO modelo (marca_id, nombre)');
w('SELECT ma.id, x.modelo FROM (VALUES');
w(modelos.map(([m, mo]) => `    (${q(m)}, ${q(mo)})`).join(',\n'));
w(') AS x(marca, modelo) JOIN marca ma ON ma.nombre = x.marca;');
w();
const equip = uniq(demo.flatMap((v) => v.equipamiento)).sort((a, b) => a.localeCompare(b, 'es'));
w('INSERT INTO equipamiento (nombre) VALUES');
w(equip.map((e) => `    (${q(e)})`).join(',\n') + ';');
w();

/* ---- Personas ---- */
w('INSERT INTO administrador (nombre, email, password_hash, rol) VALUES');
w(`    ('Gabriel (propietario)', 'gabriel@gabrielautomocion.es', ${q(hash('demo1234', 'admin1'))}, 'propietario'),`);
w(`    ('Ventas', 'ventas@gabrielautomocion.es', ${q(hash('demo1234', 'admin2'))}, 'gestor');`);
w();
const clientes = [
  ['Lucía Martín', 'lucia.martin@example.com', '600111222', true],
  ['Javier Ruiz', 'javier.ruiz@example.com', null, false],
  ['Marta Gómez', 'marta.gomez@example.com', '611333444', true]
];
w('INSERT INTO cliente (nombre, email, telefono, password_hash, privacidad_aceptada, acepta_comunicaciones, fecha_alta) VALUES');
w(clientes.map(([n, e, t, c], i) => `    (${q(n)}, ${q(e)}, ${q(t)}, ${q(hash('demo1234', 'cliente' + i))}, '2026-10-0${i + 2} 10:00+01', ${c}, '2026-10-0${i + 2} 10:00+01')`).join(',\n') + ';');
w();

/* ---- Vehículos ---- */
w('-- Vehículos: se insertan con sus claves ajenas buscadas por nombre.');
for (const v of demo) {
  w('INSERT INTO vehiculo (referencia, modelo_id, version, combustible_id, carroceria_id, tipo, cambio, etiqueta,');
  w('                      precio, precio_anterior, anio, km, potencia_cv, color, descripcion, estado, destacado, oculto, demo, creado_por, creado, actualizado)');
  w(`SELECT ${q(v.id)}, mo.id, ${q(v.version)}, co.id, ca.id, ${q(v.tipo)}, ${q(v.cambio)}, ${q(v.etiqueta)},`);
  w(`       ${v.precio}, ${q(v.precioAnterior)}, ${v.anio}, ${v.km}, ${q(v.potencia)}, ${q(v.color)}, ${q(v.descripcion)},`);
  w(`       ${q(v.estado)}, ${!!v.destacado}, ${!!v.oculto}, ${!!v.demo}, 1, ${q(v.creado)}, ${q(v.actualizado)}`);
  w('FROM modelo mo JOIN marca ma ON ma.id = mo.marca_id, combustible co, carroceria ca');
  w(`WHERE ma.nombre = ${q(v.marca)} AND mo.nombre = ${q(v.modelo)} AND co.nombre = ${q(v.combustible)} AND ca.nombre = ${q(v.carroceria)};`);
  w();
}

w('INSERT INTO foto (vehiculo_id, url, orden)');
w('SELECT v.id, x.url, x.orden FROM (VALUES');
w(demo.flatMap((v) => v.fotos.map((f, i) => `    (${q(v.id)}, ${q(f)}, ${i + 1})`)).join(',\n'));
w(') AS x(ref, url, orden) JOIN vehiculo v ON v.referencia = x.ref;');
w();
w('INSERT INTO vehiculo_equipamiento (vehiculo_id, equipamiento_id, orden)');
w('SELECT v.id, e.id, x.orden FROM (VALUES');
w(demo.flatMap((v) => v.equipamiento.map((e, i) => `    (${q(v.id)}, ${q(e)}, ${i + 1})`)).join(',\n'));
w(') AS x(ref, equipo, orden) JOIN vehiculo v ON v.referencia = x.ref JOIN equipamiento e ON e.nombre = x.equipo;');
w();

/* ---- Actividad de ejemplo de los clientes ---- */
w(`-- Guardados y avisos
INSERT INTO favorito (cliente_id, vehiculo_id)
SELECT c.id, v.id FROM (VALUES
    ('lucia.martin@example.com', 'GA-1005'), ('lucia.martin@example.com', 'GA-1006'),
    ('marta.gomez@example.com', 'GA-1010'), ('javier.ruiz@example.com', 'GA-1011')
) AS x(email, ref) JOIN cliente c ON c.email = x.email JOIN vehiculo v ON v.referencia = x.ref;

INSERT INTO aviso (cliente_id, tipo, vehiculo_id, marca_id, combustible_id, precio_max, km_max)
VALUES
    ((SELECT id FROM cliente WHERE email = 'lucia.martin@example.com'), 'precio',
     (SELECT id FROM vehiculo WHERE referencia = 'GA-1006'), NULL, NULL, NULL, NULL),
    ((SELECT id FROM cliente WHERE email = 'marta.gomez@example.com'), 'busqueda', NULL,
     NULL, (SELECT id FROM combustible WHERE nombre = 'Eléctrico'), 35000, 60000);

-- Solicitudes de los formularios (una de un visitante sin cuenta)
INSERT INTO solicitud (tipo, motivo, asunto, nombre, telefono, email, mensaje, importe, pagina,
                       cliente_id, vehiculo_id, vehiculo_titulo, privacidad, estado, fecha)
VALUES
    ('vehiculo', 'Prueba del vehículo', NULL, 'Lucía Martín', '600111222', 'lucia.martin@example.com',
     'Hola, me gustaría probar el Golf este sábado por la mañana.', NULL, 'vehiculo.html',
     (SELECT id FROM cliente WHERE email = 'lucia.martin@example.com'),
     (SELECT id FROM vehiculo WHERE referencia = 'GA-1005'), 'Volkswagen Golf', TRUE, 'contactado', '2026-11-10 09:30+01'),
    ('financiacion', NULL, NULL, 'Pedro Sanz', '622555666', NULL,
     'Quiero financiar a 60 meses con 3.000 € de entrada.', 22000, 'financiacion.html',
     NULL, NULL, NULL, TRUE, 'nuevo', '2026-11-14 18:05+01'),
    ('contacto', NULL, 'Tasación', 'Javier Ruiz', NULL, 'javier.ruiz@example.com',
     '¿Tasáis mi coche si os compro el Clio?', NULL, 'contacto.html',
     (SELECT id FROM cliente WHERE email = 'javier.ruiz@example.com'), NULL, NULL, TRUE, 'nuevo', '2026-11-15 12:40+01');

-- Una conversación que nace de la primera solicitud
INSERT INTO conversacion (cliente_id, vehiculo_id, solicitud_id, asunto, creada)
SELECT s.cliente_id, s.vehiculo_id, s.id, 'Prueba del Volkswagen Golf', s.fecha
FROM solicitud s WHERE s.vehiculo_titulo = 'Volkswagen Golf';

INSERT INTO mensaje (conversacion_id, autor, administrador_id, texto, enviado, leido)
SELECT c.id, x.autor, x.admin, x.texto, x.enviado::timestamptz, x.leido::timestamptz
FROM conversacion c, (VALUES
    ('cliente', NULL::int, 'Hola, me gustaría probar el Golf este sábado por la mañana.', '2026-11-10 09:30+01', '2026-11-10 10:02+01'),
    ('concesionario', 2, '¡Hola Lucía! El sábado a las 10:30 lo tenemos libre. ¿Te viene bien?', '2026-11-10 10:05+01', '2026-11-10 11:20+01'),
    ('cliente', NULL::int, 'Perfecto, allí estaré. ¿Tengo que llevar algo?', '2026-11-10 11:21+01', NULL)
) AS x(autor, admin, texto, enviado, leido)
WHERE c.asunto = 'Prueba del Volkswagen Golf';
`);
w('COMMIT;');

fs.writeFileSync(path.join(__dirname, '02_datos.sql'), out.join('\n') + '\n');
console.log('bd/02_datos.sql generado:', demo.length, 'vehículos,', equip.length, 'elementos de equipamiento');
