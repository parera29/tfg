-- ============================================================================
--  Gabriel Automoción · 02_datos.sql — datos de ejemplo
--  GENERADO por bd/generar_datos.js a partir de js/demo-data.js. No editar a mano.
--  Contraseña de todas las cuentas de ejemplo: demo1234
-- ============================================================================

BEGIN;

INSERT INTO combustible (nombre) VALUES
    ('Gasolina'),
    ('Diésel'),
    ('Híbrido'),
    ('Híbrido enchufable'),
    ('Eléctrico'),
    ('GLP'),
    ('GNC');

INSERT INTO carroceria (nombre) VALUES
    ('Berlina'),
    ('Compacto'),
    ('SUV'),
    ('Familiar'),
    ('Utilitario'),
    ('Monovolumen'),
    ('Coupé'),
    ('Cabrio'),
    ('Pick-up'),
    ('Furgoneta');

INSERT INTO marca (nombre) VALUES
    ('Audi'),
    ('BMW'),
    ('Cupra'),
    ('Ford'),
    ('Hyundai'),
    ('Kia'),
    ('Mercedes-Benz'),
    ('Peugeot'),
    ('Renault'),
    ('Seat'),
    ('Tesla'),
    ('Toyota'),
    ('Volkswagen'),
    ('Volvo');

INSERT INTO modelo (marca_id, nombre)
SELECT ma.id, x.modelo FROM (VALUES
    ('BMW', 'Serie 3'),
    ('Audi', 'A3 Sportback'),
    ('Mercedes-Benz', 'Clase A'),
    ('Toyota', 'C-HR'),
    ('Volkswagen', 'Golf'),
    ('Cupra', 'Formentor'),
    ('Seat', 'León'),
    ('Peugeot', '3008'),
    ('Kia', 'Sportage'),
    ('Tesla', 'Model 3'),
    ('Renault', 'Clio'),
    ('Volvo', 'XC40'),
    ('Hyundai', 'Tucson'),
    ('Ford', 'Focus')
) AS x(marca, modelo) JOIN marca ma ON ma.nombre = x.marca;

INSERT INTO equipamiento (nombre) VALUES
    ('Android Auto / Apple CarPlay'),
    ('App-Connect'),
    ('Apple CarPlay'),
    ('Arranque sin llave'),
    ('Asientos calefactados'),
    ('Asientos deportivos'),
    ('Asistente de carril'),
    ('Asistente de mantenimiento de carril'),
    ('Autopilot'),
    ('Cámara 360º'),
    ('Cámara de visión trasera'),
    ('Cámara trasera'),
    ('Cámaras 360º'),
    ('Carga inalámbrica'),
    ('Carga rápida'),
    ('Climatizador'),
    ('Climatizador bizona'),
    ('Climatizador tri-zona'),
    ('Control de crucero'),
    ('Control de crucero adaptativo'),
    ('Digital Cockpit'),
    ('Faros Full LED'),
    ('Faros LED'),
    ('Full Link'),
    ('Google integrado'),
    ('Grip Control'),
    ('i-Cockpit'),
    ('Iluminación ambiental'),
    ('Limitador de velocidad'),
    ('Llantas 17"'),
    ('Llantas 19"'),
    ('Llantas de aleación 18"'),
    ('Llave inteligente'),
    ('Navegador'),
    ('Navegador 3D'),
    ('Pantalla 10,25"'),
    ('Pantalla 12"'),
    ('Pantalla 15"'),
    ('Pantalla panorámica curva'),
    ('Pantalla táctil'),
    ('Pilot Assist'),
    ('Portón eléctrico'),
    ('Sensor de lluvia'),
    ('Sensores de aparcamiento'),
    ('Sensores de aparcamiento delanteros y traseros'),
    ('Sensores traseros'),
    ('Sistema MBUX'),
    ('SYNC 3'),
    ('Techo panorámico de cristal'),
    ('Toyota Safety Sense'),
    ('Virtual Cockpit'),
    ('Volante calefactado');

INSERT INTO administrador (nombre, email, password_hash, rol) VALUES
    ('Gabriel (propietario)', 'gabriel@gabrielautomocion.es', 'scrypt$90676e7229f127701576ea279f6c707a$463467b06e2722d4dfc6c58ac3b8d9dd9c17e05c7950eb1e24e0096499bfd9f3623dec30747959cffef4a4aafe1fb317cedf86f9380bc3e21f919792b56a460f', 'propietario'),
    ('Ventas', 'ventas@gabrielautomocion.es', 'scrypt$2e285e5ad133004f4b9428917cfb5bf3$740c5ad345a29697c6a15efe510f7cc4989f16b78669ace2dcba21071dafa3e1e150854dedcb531be550445937b515bba887d26435479395103df51df5ba6358', 'gestor');

INSERT INTO cliente (nombre, email, telefono, password_hash, privacidad_aceptada, acepta_comunicaciones, fecha_alta) VALUES
    ('Lucía Martín', 'lucia.martin@example.com', '600111222', 'scrypt$220753dfd0c77aba3368105134a36105$79e4df25e7f96deab0e9aba4e061a82e3b2a57e384d517d63fef0376a562922d70ade6ca97da23f5c85977ee6a095783ece9e8b4b77544a7497dbdb95cca4f72', '2026-10-02 10:00+01', true, '2026-10-02 10:00+01'),
    ('Javier Ruiz', 'javier.ruiz@example.com', NULL, 'scrypt$30c5d9e303878192a1e802d7f23dbd9f$6a08c391335fbd340578567c9f26017a6873ba273cae0bd30d4eeab9160de66df16614c133e781e9fe13b8783372ea9c2c9aa448656f99b18c3946a39e39070b', '2026-10-03 10:00+01', false, '2026-10-03 10:00+01'),
    ('Marta Gómez', 'marta.gomez@example.com', '611333444', 'scrypt$4f37d28a3711af6895ab2601ed4342b4$e8dd03b8833b99fca3df5e9deb54afd3521e03687bc0f41f1cee03a9e8f2ea201309ec498fb17d66c44364eba9a592f8065f59f0842ee27e1b75ab0c6714b787', '2026-10-04 10:00+01', true, '2026-10-04 10:00+01');

-- Vehículos: se insertan con sus claves ajenas buscadas por nombre.
INSERT INTO vehiculo (referencia, modelo_id, version, combustible_id, carroceria_id, tipo, cambio, etiqueta,
                      precio, precio_anterior, anio, km, potencia_cv, color, descripcion, estado, destacado, oculto, demo, creado_por, creado, actualizado)
SELECT 'GA-1001', mo.id, '320d Sport Line', co.id, ca.id, 'Ocasión', 'Automático', 'C',
       28900, 30500, 2021, 54200, 190, 'Negro', 'Vehículo de demostración incluido para mostrar el funcionamiento de la web. Aquí se describirá el estado real del vehículo, su historial de mantenimiento, número de propietarios y cualquier detalle relevante para el comprador. [TEXTO A PERSONALIZAR]',
       'disponible', true, false, true, 1, '2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z'
FROM modelo mo JOIN marca ma ON ma.id = mo.marca_id, combustible co, carroceria ca
WHERE ma.nombre = 'BMW' AND mo.nombre = 'Serie 3' AND co.nombre = 'Diésel' AND ca.nombre = 'Berlina';

INSERT INTO vehiculo (referencia, modelo_id, version, combustible_id, carroceria_id, tipo, cambio, etiqueta,
                      precio, precio_anterior, anio, km, potencia_cv, color, descripcion, estado, destacado, oculto, demo, creado_por, creado, actualizado)
SELECT 'GA-1002', mo.id, '35 TFSI S line S tronic', co.id, ca.id, 'Seminuevo', 'Automático', 'C',
       27450, NULL, 2022, 31800, 150, 'Gris', 'Vehículo de demostración incluido para mostrar el funcionamiento de la web. Aquí se describirá el estado real del vehículo, su historial de mantenimiento, número de propietarios y cualquier detalle relevante para el comprador. [TEXTO A PERSONALIZAR]',
       'disponible', true, false, true, 1, '2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z'
FROM modelo mo JOIN marca ma ON ma.id = mo.marca_id, combustible co, carroceria ca
WHERE ma.nombre = 'Audi' AND mo.nombre = 'A3 Sportback' AND co.nombre = 'Gasolina' AND ca.nombre = 'Compacto';

INSERT INTO vehiculo (referencia, modelo_id, version, combustible_id, carroceria_id, tipo, cambio, etiqueta,
                      precio, precio_anterior, anio, km, potencia_cv, color, descripcion, estado, destacado, oculto, demo, creado_por, creado, actualizado)
SELECT 'GA-1003', mo.id, 'A 180 d Progressive', co.id, ca.id, 'Ocasión', 'Automático', 'C',
       24900, 25900, 2021, 48900, 116, 'Blanco', 'Vehículo de demostración incluido para mostrar el funcionamiento de la web. Aquí se describirá el estado real del vehículo, su historial de mantenimiento, número de propietarios y cualquier detalle relevante para el comprador. [TEXTO A PERSONALIZAR]',
       'disponible', true, false, true, 1, '2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z'
FROM modelo mo JOIN marca ma ON ma.id = mo.marca_id, combustible co, carroceria ca
WHERE ma.nombre = 'Mercedes-Benz' AND mo.nombre = 'Clase A' AND co.nombre = 'Diésel' AND ca.nombre = 'Compacto';

INSERT INTO vehiculo (referencia, modelo_id, version, combustible_id, carroceria_id, tipo, cambio, etiqueta,
                      precio, precio_anterior, anio, km, potencia_cv, color, descripcion, estado, destacado, oculto, demo, creado_por, creado, actualizado)
SELECT 'GA-1004', mo.id, '125H Advance', co.id, ca.id, 'Seminuevo', 'Automático', 'ECO',
       23500, NULL, 2022, 27400, 122, 'Rojo', 'Vehículo de demostración incluido para mostrar el funcionamiento de la web. Aquí se describirá el estado real del vehículo, su historial de mantenimiento, número de propietarios y cualquier detalle relevante para el comprador. [TEXTO A PERSONALIZAR]',
       'disponible', true, false, true, 1, '2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z'
FROM modelo mo JOIN marca ma ON ma.id = mo.marca_id, combustible co, carroceria ca
WHERE ma.nombre = 'Toyota' AND mo.nombre = 'C-HR' AND co.nombre = 'Híbrido' AND ca.nombre = 'SUV';

INSERT INTO vehiculo (referencia, modelo_id, version, combustible_id, carroceria_id, tipo, cambio, etiqueta,
                      precio, precio_anterior, anio, km, potencia_cv, color, descripcion, estado, destacado, oculto, demo, creado_por, creado, actualizado)
SELECT 'GA-1005', mo.id, '1.5 eTSI Life DSG', co.id, ca.id, 'Km 0', 'Automático', 'ECO',
       25200, 26400, 2023, 15600, 150, 'Azul', 'Vehículo de demostración incluido para mostrar el funcionamiento de la web. Aquí se describirá el estado real del vehículo, su historial de mantenimiento, número de propietarios y cualquier detalle relevante para el comprador. [TEXTO A PERSONALIZAR]',
       'disponible', true, false, true, 1, '2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z'
FROM modelo mo JOIN marca ma ON ma.id = mo.marca_id, combustible co, carroceria ca
WHERE ma.nombre = 'Volkswagen' AND mo.nombre = 'Golf' AND co.nombre = 'Híbrido' AND ca.nombre = 'Compacto';

INSERT INTO vehiculo (referencia, modelo_id, version, combustible_id, carroceria_id, tipo, cambio, etiqueta,
                      precio, precio_anterior, anio, km, potencia_cv, color, descripcion, estado, destacado, oculto, demo, creado_por, creado, actualizado)
SELECT 'GA-1006', mo.id, '1.5 TSI 150 CV DSG', co.id, ca.id, 'Km 0', 'Automático', 'C',
       31900, NULL, 2023, 12300, 150, 'Gris', 'Vehículo de demostración incluido para mostrar el funcionamiento de la web. Aquí se describirá el estado real del vehículo, su historial de mantenimiento, número de propietarios y cualquier detalle relevante para el comprador. [TEXTO A PERSONALIZAR]',
       'disponible', true, false, true, 1, '2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z'
FROM modelo mo JOIN marca ma ON ma.id = mo.marca_id, combustible co, carroceria ca
WHERE ma.nombre = 'Cupra' AND mo.nombre = 'Formentor' AND co.nombre = 'Gasolina' AND ca.nombre = 'SUV';

INSERT INTO vehiculo (referencia, modelo_id, version, combustible_id, carroceria_id, tipo, cambio, etiqueta,
                      precio, precio_anterior, anio, km, potencia_cv, color, descripcion, estado, destacado, oculto, demo, creado_por, creado, actualizado)
SELECT 'GA-1007', mo.id, '1.5 TSI FR', co.id, ca.id, 'Ocasión', 'Manual', 'C',
       19900, 20900, 2021, 46100, 130, 'Blanco', 'Vehículo de demostración incluido para mostrar el funcionamiento de la web. Aquí se describirá el estado real del vehículo, su historial de mantenimiento, número de propietarios y cualquier detalle relevante para el comprador. [TEXTO A PERSONALIZAR]',
       'disponible', false, false, true, 1, '2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z'
FROM modelo mo JOIN marca ma ON ma.id = mo.marca_id, combustible co, carroceria ca
WHERE ma.nombre = 'Seat' AND mo.nombre = 'León' AND co.nombre = 'Gasolina' AND ca.nombre = 'Compacto';

INSERT INTO vehiculo (referencia, modelo_id, version, combustible_id, carroceria_id, tipo, cambio, etiqueta,
                      precio, precio_anterior, anio, km, potencia_cv, color, descripcion, estado, destacado, oculto, demo, creado_por, creado, actualizado)
SELECT 'GA-1008', mo.id, 'PureTech 130 GT EAT8', co.id, ca.id, 'Seminuevo', 'Automático', 'C',
       26700, NULL, 2022, 33500, 130, 'Gris', 'Vehículo de demostración incluido para mostrar el funcionamiento de la web. Aquí se describirá el estado real del vehículo, su historial de mantenimiento, número de propietarios y cualquier detalle relevante para el comprador. [TEXTO A PERSONALIZAR]',
       'disponible', false, false, true, 1, '2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z'
FROM modelo mo JOIN marca ma ON ma.id = mo.marca_id, combustible co, carroceria ca
WHERE ma.nombre = 'Peugeot' AND mo.nombre = '3008' AND co.nombre = 'Gasolina' AND ca.nombre = 'SUV';

INSERT INTO vehiculo (referencia, modelo_id, version, combustible_id, carroceria_id, tipo, cambio, etiqueta,
                      precio, precio_anterior, anio, km, potencia_cv, color, descripcion, estado, destacado, oculto, demo, creado_por, creado, actualizado)
SELECT 'GA-1009', mo.id, '1.6 T-GDi HEV Drive', co.id, ca.id, 'Seminuevo', 'Automático', 'ECO',
       29800, 31200, 2023, 21900, 230, 'Negro', 'Vehículo de demostración incluido para mostrar el funcionamiento de la web. Aquí se describirá el estado real del vehículo, su historial de mantenimiento, número de propietarios y cualquier detalle relevante para el comprador. [TEXTO A PERSONALIZAR]',
       'disponible', false, false, true, 1, '2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z'
FROM modelo mo JOIN marca ma ON ma.id = mo.marca_id, combustible co, carroceria ca
WHERE ma.nombre = 'Kia' AND mo.nombre = 'Sportage' AND co.nombre = 'Híbrido' AND ca.nombre = 'SUV';

INSERT INTO vehiculo (referencia, modelo_id, version, combustible_id, carroceria_id, tipo, cambio, etiqueta,
                      precio, precio_anterior, anio, km, potencia_cv, color, descripcion, estado, destacado, oculto, demo, creado_por, creado, actualizado)
SELECT 'GA-1010', mo.id, 'Gran Autonomía AWD', co.id, ca.id, 'Ocasión', 'Automático', '0',
       33900, NULL, 2022, 39800, 440, 'Blanco', 'Vehículo de demostración incluido para mostrar el funcionamiento de la web. Aquí se describirá el estado real del vehículo, su historial de mantenimiento, número de propietarios y cualquier detalle relevante para el comprador. [TEXTO A PERSONALIZAR]',
       'disponible', false, false, true, 1, '2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z'
FROM modelo mo JOIN marca ma ON ma.id = mo.marca_id, combustible co, carroceria ca
WHERE ma.nombre = 'Tesla' AND mo.nombre = 'Model 3' AND co.nombre = 'Eléctrico' AND ca.nombre = 'Berlina';

INSERT INTO vehiculo (referencia, modelo_id, version, combustible_id, carroceria_id, tipo, cambio, etiqueta,
                      precio, precio_anterior, anio, km, potencia_cv, color, descripcion, estado, destacado, oculto, demo, creado_por, creado, actualizado)
SELECT 'GA-1011', mo.id, 'TCe 90 Evolution', co.id, ca.id, 'Ocasión', 'Manual', 'C',
       14900, NULL, 2022, 28700, 90, 'Rojo', 'Vehículo de demostración incluido para mostrar el funcionamiento de la web. Aquí se describirá el estado real del vehículo, su historial de mantenimiento, número de propietarios y cualquier detalle relevante para el comprador. [TEXTO A PERSONALIZAR]',
       'disponible', false, false, true, 1, '2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z'
FROM modelo mo JOIN marca ma ON ma.id = mo.marca_id, combustible co, carroceria ca
WHERE ma.nombre = 'Renault' AND mo.nombre = 'Clio' AND co.nombre = 'Gasolina' AND ca.nombre = 'Utilitario';

INSERT INTO vehiculo (referencia, modelo_id, version, combustible_id, carroceria_id, tipo, cambio, etiqueta,
                      precio, precio_anterior, anio, km, potencia_cv, color, descripcion, estado, destacado, oculto, demo, creado_por, creado, actualizado)
SELECT 'GA-1012', mo.id, 'B3 Core Auto', co.id, ca.id, 'Seminuevo', 'Automático', 'ECO',
       32400, 33900, 2023, 18200, 163, 'Azul', 'Vehículo de demostración incluido para mostrar el funcionamiento de la web. Aquí se describirá el estado real del vehículo, su historial de mantenimiento, número de propietarios y cualquier detalle relevante para el comprador. [TEXTO A PERSONALIZAR]',
       'disponible', false, false, true, 1, '2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z'
FROM modelo mo JOIN marca ma ON ma.id = mo.marca_id, combustible co, carroceria ca
WHERE ma.nombre = 'Volvo' AND mo.nombre = 'XC40' AND co.nombre = 'Híbrido' AND ca.nombre = 'SUV';

INSERT INTO vehiculo (referencia, modelo_id, version, combustible_id, carroceria_id, tipo, cambio, etiqueta,
                      precio, precio_anterior, anio, km, potencia_cv, color, descripcion, estado, destacado, oculto, demo, creado_por, creado, actualizado)
SELECT 'GA-1013', mo.id, '1.6 TGDI 48V Maxx', co.id, ca.id, 'Ocasión', 'Manual', 'ECO',
       25900, NULL, 2022, 36400, 150, 'Blanco', 'Vehículo de demostración incluido para mostrar el funcionamiento de la web. Aquí se describirá el estado real del vehículo, su historial de mantenimiento, número de propietarios y cualquier detalle relevante para el comprador. [TEXTO A PERSONALIZAR]',
       'reservado', false, false, true, 1, '2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z'
FROM modelo mo JOIN marca ma ON ma.id = mo.marca_id, combustible co, carroceria ca
WHERE ma.nombre = 'Hyundai' AND mo.nombre = 'Tucson' AND co.nombre = 'Híbrido' AND ca.nombre = 'SUV';

INSERT INTO vehiculo (referencia, modelo_id, version, combustible_id, carroceria_id, tipo, cambio, etiqueta,
                      precio, precio_anterior, anio, km, potencia_cv, color, descripcion, estado, destacado, oculto, demo, creado_por, creado, actualizado)
SELECT 'GA-1014', mo.id, '1.0 EcoBoost MHEV ST-Line', co.id, ca.id, 'Ocasión', 'Manual', 'ECO',
       18500, NULL, 2021, 52900, 125, 'Gris', 'Vehículo de demostración incluido para mostrar el funcionamiento de la web. Aquí se describirá el estado real del vehículo, su historial de mantenimiento, número de propietarios y cualquier detalle relevante para el comprador. [TEXTO A PERSONALIZAR]',
       'vendido', false, false, true, 1, '2026-09-01T10:00:00.000Z', '2026-09-01T10:00:00.000Z'
FROM modelo mo JOIN marca ma ON ma.id = mo.marca_id, combustible co, carroceria ca
WHERE ma.nombre = 'Ford' AND mo.nombre = 'Focus' AND co.nombre = 'Híbrido' AND ca.nombre = 'Compacto';

INSERT INTO foto (vehiculo_id, url, orden)
SELECT v.id, x.url, x.orden FROM (VALUES
    ('GA-1001', 'https://images.unsplash.com/photo-1555215695-3004980ad54e', 1),
    ('GA-1001', 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8', 2),
    ('GA-1001', 'https://images.unsplash.com/photo-1514316454349-750a7fd3da3a', 3),
    ('GA-1001', 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b', 4),
    ('GA-1002', 'https://images.unsplash.com/photo-1525609004556-c46c7d6cf023', 1),
    ('GA-1002', 'https://images.unsplash.com/photo-1580273916550-e323be2ae537', 2),
    ('GA-1002', 'https://images.unsplash.com/photo-1514316454349-750a7fd3da3a', 3),
    ('GA-1003', 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6', 1),
    ('GA-1003', 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738', 2),
    ('GA-1003', 'https://images.unsplash.com/photo-1544636331-e26879cd4d9b', 3),
    ('GA-1004', 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2', 1),
    ('GA-1004', 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7', 2),
    ('GA-1004', 'https://images.unsplash.com/photo-1514316454349-750a7fd3da3a', 3),
    ('GA-1005', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7', 1),
    ('GA-1005', 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d', 2),
    ('GA-1005', 'https://images.unsplash.com/photo-1514316454349-750a7fd3da3a', 3),
    ('GA-1006', 'https://images.unsplash.com/photo-1542362567-b07e54358753', 1),
    ('GA-1006', 'https://images.unsplash.com/photo-1583121274602-3e2820c69888', 2),
    ('GA-1006', 'https://images.unsplash.com/photo-1514316454349-750a7fd3da3a', 3),
    ('GA-1007', 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c', 1),
    ('GA-1007', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf', 2),
    ('GA-1008', 'https://images.unsplash.com/photo-1590362891991-f776e747a588', 1),
    ('GA-1008', 'https://images.unsplash.com/photo-1568605117036-5fe5e7bab0b7', 2),
    ('GA-1009', 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d', 1),
    ('GA-1009', 'https://images.unsplash.com/photo-1549317661-bd32c8ce0db2', 2),
    ('GA-1010', 'https://images.unsplash.com/photo-1560958089-b8a1929cea89', 1),
    ('GA-1010', 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf', 2),
    ('GA-1011', 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8', 1),
    ('GA-1011', 'https://images.unsplash.com/photo-1511919884226-fd3cad34687c', 2),
    ('GA-1012', 'https://images.unsplash.com/photo-1541899481282-d53bffe3c35d', 1),
    ('GA-1012', 'https://images.unsplash.com/photo-1503376780353-7e6692767b70', 2),
    ('GA-1013', 'https://images.unsplash.com/photo-1503736334956-4c8f8e92946d', 1),
    ('GA-1013', 'https://images.unsplash.com/photo-1492144534655-ae79c964c9d7', 2),
    ('GA-1014', 'https://images.unsplash.com/photo-1580273916550-e323be2ae537', 1),
    ('GA-1014', 'https://images.unsplash.com/photo-1555215695-3004980ad54e', 2)
) AS x(ref, url, orden) JOIN vehiculo v ON v.referencia = x.ref;

INSERT INTO vehiculo_equipamiento (vehiculo_id, equipamiento_id, orden)
SELECT v.id, e.id, x.orden FROM (VALUES
    ('GA-1001', 'Navegador', 1),
    ('GA-1001', 'Climatizador bizona', 2),
    ('GA-1001', 'Sensores de aparcamiento delanteros y traseros', 3),
    ('GA-1001', 'Cámara de visión trasera', 4),
    ('GA-1001', 'Asientos deportivos', 5),
    ('GA-1001', 'Faros LED', 6),
    ('GA-1001', 'Apple CarPlay', 7),
    ('GA-1001', 'Control de crucero', 8),
    ('GA-1002', 'Virtual Cockpit', 1),
    ('GA-1002', 'Faros LED', 2),
    ('GA-1002', 'Climatizador', 3),
    ('GA-1002', 'Sensores de aparcamiento', 4),
    ('GA-1002', 'Android Auto / Apple CarPlay', 5),
    ('GA-1002', 'Llantas de aleación 18"', 6),
    ('GA-1002', 'Asistente de mantenimiento de carril', 7),
    ('GA-1003', 'Sistema MBUX', 1),
    ('GA-1003', 'Pantalla táctil', 2),
    ('GA-1003', 'Climatizador', 3),
    ('GA-1003', 'Cámara trasera', 4),
    ('GA-1003', 'Iluminación ambiental', 5),
    ('GA-1003', 'Control de crucero', 6),
    ('GA-1003', 'Sensor de lluvia', 7),
    ('GA-1004', 'Toyota Safety Sense', 1),
    ('GA-1004', 'Cámara trasera', 2),
    ('GA-1004', 'Climatizador bizona', 3),
    ('GA-1004', 'Navegador', 4),
    ('GA-1004', 'Llave inteligente', 5),
    ('GA-1004', 'Faros LED', 6),
    ('GA-1004', 'Control de crucero adaptativo', 7),
    ('GA-1005', 'Digital Cockpit', 1),
    ('GA-1005', 'App-Connect', 2),
    ('GA-1005', 'Climatizador', 3),
    ('GA-1005', 'Faros LED', 4),
    ('GA-1005', 'Asistente de carril', 5),
    ('GA-1005', 'Sensores de aparcamiento', 6),
    ('GA-1005', 'Arranque sin llave', 7),
    ('GA-1006', 'Pantalla 12"', 1),
    ('GA-1006', 'Full Link', 2),
    ('GA-1006', 'Cámara 360º', 3),
    ('GA-1006', 'Asientos deportivos', 4),
    ('GA-1006', 'Llantas 19"', 5),
    ('GA-1006', 'Faros Full LED', 6),
    ('GA-1006', 'Climatizador tri-zona', 7),
    ('GA-1007', 'Full Link', 1),
    ('GA-1007', 'Climatizador', 2),
    ('GA-1007', 'Faros LED', 3),
    ('GA-1007', 'Sensores traseros', 4),
    ('GA-1007', 'Control de crucero', 5),
    ('GA-1007', 'Llantas 17"', 6),
    ('GA-1008', 'i-Cockpit', 1),
    ('GA-1008', 'Navegador 3D', 2),
    ('GA-1008', 'Cámara trasera', 3),
    ('GA-1008', 'Portón eléctrico', 4),
    ('GA-1008', 'Grip Control', 5),
    ('GA-1008', 'Faros Full LED', 6),
    ('GA-1009', 'Pantalla panorámica curva', 1),
    ('GA-1009', 'Cámara trasera', 2),
    ('GA-1009', 'Climatizador bizona', 3),
    ('GA-1009', 'Volante calefactado', 4),
    ('GA-1009', 'Carga inalámbrica', 5),
    ('GA-1009', 'Faros LED', 6),
    ('GA-1010', 'Autopilot', 1),
    ('GA-1010', 'Techo panorámico de cristal', 2),
    ('GA-1010', 'Pantalla 15"', 3),
    ('GA-1010', 'Asientos calefactados', 4),
    ('GA-1010', 'Cámaras 360º', 5),
    ('GA-1010', 'Carga rápida', 6),
    ('GA-1011', 'Pantalla táctil', 1),
    ('GA-1011', 'Android Auto / Apple CarPlay', 2),
    ('GA-1011', 'Climatizador', 3),
    ('GA-1011', 'Sensores traseros', 4),
    ('GA-1011', 'Limitador de velocidad', 5),
    ('GA-1012', 'Google integrado', 1),
    ('GA-1012', 'Cámara trasera', 2),
    ('GA-1012', 'Pilot Assist', 3),
    ('GA-1012', 'Climatizador bizona', 4),
    ('GA-1012', 'Faros LED', 5),
    ('GA-1012', 'Portón eléctrico', 6),
    ('GA-1013', 'Pantalla 10,25"', 1),
    ('GA-1013', 'Cámara trasera', 2),
    ('GA-1013', 'Climatizador', 3),
    ('GA-1013', 'Faros LED', 4),
    ('GA-1013', 'Asistente de carril', 5),
    ('GA-1014', 'SYNC 3', 1),
    ('GA-1014', 'Climatizador', 2),
    ('GA-1014', 'Sensores de aparcamiento', 3),
    ('GA-1014', 'Faros LED', 4)
) AS x(ref, equipo, orden) JOIN vehiculo v ON v.referencia = x.ref JOIN equipamiento e ON e.nombre = x.equipo;

-- Guardados y avisos
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

COMMIT;
