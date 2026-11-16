-- ============================================================================
--  Gabriel Automoción · 04_pruebas.sql — pruebas de integridad
--  Cada bloque intenta algo que la base de datos debe RECHAZAR (o, en los
--  disparadores, corregir). Todo va dentro de una transacción que se deshace
--  al final, así que no cambia los datos. Salida esperada: solo líneas «OK».
-- ============================================================================
\o /dev/null
SET client_min_messages = notice;
BEGIN;

CREATE FUNCTION pg_temp.debe_fallar(nombre text, sentencia text) RETURNS void AS $$
BEGIN
    EXECUTE sentencia;
    RAISE EXCEPTION 'FALLO: «%» se ha aceptado y no debía', nombre;
EXCEPTION
    WHEN integrity_constraint_violation OR check_violation OR not_null_violation
      OR unique_violation OR foreign_key_violation THEN
        RAISE NOTICE 'OK  %  (%)', nombre, SQLERRM;
END;
$$ LANGUAGE plpgsql;

SELECT pg_temp.debe_fallar('Correo de cliente repetido (con otras mayúsculas)',
  $q$INSERT INTO cliente (nombre, email, password_hash, privacidad_aceptada)
     VALUES ('Otra Lucía', 'LUCIA.MARTIN@example.com', 'x', now())$q$);

SELECT pg_temp.debe_fallar('Correo con formato inválido',
  $q$INSERT INTO cliente (nombre, email, password_hash, privacidad_aceptada)
     VALUES ('Sin arroba', 'correo-sin-arroba', 'x', now())$q$);

SELECT pg_temp.debe_fallar('Registro sin aceptar la privacidad',
  $q$INSERT INTO cliente (nombre, email, password_hash) VALUES ('Ana', 'ana@example.com', 'x')$q$);

SELECT pg_temp.debe_fallar('Precio negativo',
  $q$UPDATE vehiculo SET precio = -1 WHERE referencia = 'GA-1001'$q$);

SELECT pg_temp.debe_fallar('Estado que no existe',
  $q$UPDATE vehiculo SET estado = 'regalado' WHERE referencia = 'GA-1001'$q$);

SELECT pg_temp.debe_fallar('Referencia de vehículo repetida',
  $q$INSERT INTO vehiculo (referencia, modelo_id, combustible_id, carroceria_id, cambio, etiqueta, precio, anio)
     SELECT 'GA-1001', modelo_id, combustible_id, carroceria_id, cambio, etiqueta, 1000, 2020
     FROM vehiculo LIMIT 1$q$);

SELECT pg_temp.debe_fallar('Dos fotos con el mismo orden en un coche',
  $q$INSERT INTO foto (vehiculo_id, url, orden)
     SELECT vehiculo_id, 'https://example.com/x.jpg', 1 FROM foto LIMIT 1$q$);

SELECT pg_temp.debe_fallar('Borrar una marca que tiene coches',
  $q$DELETE FROM marca WHERE nombre = 'BMW'$q$);

SELECT pg_temp.debe_fallar('Solicitud sin teléfono ni correo',
  $q$INSERT INTO solicitud (tipo, nombre, privacidad) VALUES ('contacto', 'Anónimo', TRUE)$q$);

SELECT pg_temp.debe_fallar('Solicitud sin aceptar la privacidad',
  $q$INSERT INTO solicitud (tipo, nombre, email, privacidad) VALUES ('contacto', 'Ana', 'ana@example.com', FALSE)$q$);

SELECT pg_temp.debe_fallar('Sesión de cliente y de administrador a la vez',
  $q$INSERT INTO sesion (token_hash, cliente_id, administrador_id, expira)
     VALUES (repeat('a', 64), 1, 1, now() + interval '1 day')$q$);

SELECT pg_temp.debe_fallar('Aviso de precio sin coche',
  $q$INSERT INTO aviso (cliente_id, tipo) VALUES (1, 'precio')$q$);

SELECT pg_temp.debe_fallar('Mensaje del cliente firmado por un administrador',
  $q$INSERT INTO mensaje (conversacion_id, autor, administrador_id, texto) VALUES (1, 'cliente', 1, 'Hola')$q$);

SELECT pg_temp.debe_fallar('Mensaje vacío',
  $q$INSERT INTO mensaje (conversacion_id, autor, texto) VALUES (1, 'cliente', '   ')$q$);

-- Disparadores -------------------------------------------------------------
DO $$
DECLARE r record;
BEGIN
    -- Rebaja: el Audi A3 (27.450 €, sin precio anterior) baja a 26.000 €
    UPDATE vehiculo SET precio = 26000 WHERE referencia = 'GA-1002' RETURNING precio_anterior, actualizado INTO r;
    IF r.precio_anterior = 27450 AND r.actualizado = now() THEN
        RAISE NOTICE 'OK  Al rebajar se guarda el precio anterior (27450) y se actualiza la fecha';
    ELSE RAISE EXCEPTION 'FALLO: precio_anterior = %', r.precio_anterior; END IF;

    -- Subida por encima del anterior: deja de mostrarse como rebaja
    UPDATE vehiculo SET precio = 28000 WHERE referencia = 'GA-1002' RETURNING precio_anterior INTO r;
    IF r.precio_anterior IS NULL THEN
        RAISE NOTICE 'OK  Si el precio vuelve a subir se quita la rebaja';
    ELSE RAISE EXCEPTION 'FALLO: precio_anterior = %', r.precio_anterior; END IF;
END $$;

-- Borrado en cascada: al borrar un coche se van sus fotos, extras y guardados,
-- y las solicitudes se conservan con la copia del título.
DO $$
DECLARE vid int; n int;
BEGIN
    SELECT id INTO vid FROM vehiculo WHERE referencia = 'GA-1005';
    DELETE FROM vehiculo WHERE id = vid;
    SELECT (SELECT count(*) FROM foto WHERE vehiculo_id = vid)
         + (SELECT count(*) FROM vehiculo_equipamiento WHERE vehiculo_id = vid)
         + (SELECT count(*) FROM favorito WHERE vehiculo_id = vid) INTO n;
    IF n = 0 AND EXISTS (SELECT 1 FROM solicitud WHERE vehiculo_id IS NULL AND vehiculo_titulo = 'Volkswagen Golf') THEN
        RAISE NOTICE 'OK  Borrar un coche limpia fotos/extras/guardados y conserva la solicitud';
    ELSE RAISE EXCEPTION 'FALLO: quedan % filas huérfanas', n; END IF;
END $$;

ROLLBACK;
