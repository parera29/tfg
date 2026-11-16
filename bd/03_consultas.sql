-- ============================================================================
--  Gabriel Automoción · 03_consultas.sql — consultas que necesita la web
--  Cada consulta indica la pantalla que la usa. Los valores entre :parámetros
--  los pone el servidor (consultas preparadas, nunca concatenando texto).
-- ============================================================================

-- 1. Catálogo con filtros (vehiculos.html): diésel o gasolina, < 30.000 €, < 60.000 km
SELECT referencia, titulo, version, precio, precio_anterior, anio, km, combustible, portada
FROM v_catalogo
WHERE estado <> 'vendido'
  AND combustible IN ('Diésel', 'Gasolina')
  AND precio <= 30000
  AND km <= 60000
ORDER BY destacado DESC, precio;

-- 2. Ficha de un vehículo (vehiculo.html?id=GA-1005): datos, fotos y equipamiento
SELECT c.*,
       ARRAY(SELECT f.url FROM foto f WHERE f.vehiculo_id = c.id ORDER BY f.orden)     AS fotos,
       ARRAY(SELECT e.nombre FROM vehiculo_equipamiento ve
             JOIN equipamiento e ON e.id = ve.equipamiento_id
             WHERE ve.vehiculo_id = c.id ORDER BY e.nombre)                            AS equipamiento
FROM v_catalogo c
WHERE c.referencia = 'GA-1005';

-- 3. Portada (index.html): destacados disponibles, los más recientes primero
SELECT referencia, titulo, precio, portada
FROM v_catalogo
WHERE destacado AND estado = 'disponible'
ORDER BY creado DESC
LIMIT 6;

-- 4. Resumen del panel (admin.html): coches por estado y valor del stock
SELECT estado, count(*) AS vehiculos, sum(precio) AS valor_total, round(avg(precio)) AS precio_medio
FROM vehiculo
GROUP BY estado
ORDER BY estado;

-- 5. Solicitudes pendientes, con el coche al que se refieren (pestaña Solicitudes)
SELECT s.fecha, s.tipo, s.nombre, coalesce(s.telefono, s.email) AS contacto,
       coalesce(c.titulo, s.vehiculo_titulo) AS vehiculo, s.estado
FROM solicitud s
LEFT JOIN v_catalogo c ON c.id = s.vehiculo_id
WHERE s.estado = 'nuevo'
ORDER BY s.fecha DESC;

-- 6. Coches con más interés: guardados + solicitudes (para decidir rebajas)
SELECT * FROM (
    SELECT v.referencia, ma.nombre || ' ' || mo.nombre AS vehiculo,
           (SELECT count(*) FROM favorito  f WHERE f.vehiculo_id = v.id) AS guardados,
           (SELECT count(*) FROM solicitud s WHERE s.vehiculo_id = v.id) AS solicitudes
    FROM vehiculo v
    JOIN modelo mo ON mo.id = v.modelo_id
    JOIN marca  ma ON ma.id = mo.marca_id
) interes
ORDER BY guardados + solicitudes DESC, referencia
LIMIT 5;

-- 7. Lista de clientes del panel (pestaña Clientes): alta, guardados y avisos activos
SELECT cl.nombre, cl.email, cl.telefono, cl.fecha_alta::date AS alta,
       count(DISTINCT f.vehiculo_id) AS guardados,
       count(DISTINCT a.id) FILTER (WHERE a.activo) AS avisos
FROM cliente cl
LEFT JOIN favorito f ON f.cliente_id = cl.id
LEFT JOIN aviso    a ON a.cliente_id = cl.id
GROUP BY cl.id
ORDER BY cl.fecha_alta DESC;

-- 8. Mi cuenta (cliente logueado): sus coches guardados
SELECT c.referencia, c.titulo, c.precio, c.estado, f.guardado
FROM favorito f
JOIN v_catalogo c ON c.id = f.vehiculo_id
WHERE f.cliente_id = (SELECT id FROM cliente WHERE lower(email) = lower('lucia.martin@example.com'))
ORDER BY f.guardado DESC;

-- 9. A quién avisar cuando entra stock nuevo: búsquedas guardadas que cumple un coche
SELECT cl.email, v.referencia
FROM aviso a
JOIN cliente cl ON cl.id = a.cliente_id
JOIN vehiculo v ON NOT v.oculto AND v.estado = 'disponible'
JOIN modelo mo  ON mo.id = v.modelo_id
WHERE a.tipo = 'busqueda' AND a.activo AND cl.activo
  AND (a.marca_id       IS NULL OR a.marca_id       = mo.marca_id)
  AND (a.combustible_id IS NULL OR a.combustible_id = v.combustible_id)
  AND (a.precio_max     IS NULL OR v.precio <= a.precio_max)
  AND (a.km_max         IS NULL OR v.km     <= a.km_max);

-- 10. Bandeja de mensajes del panel y conversación abierta
SELECT * FROM v_bandeja_mensajes ORDER BY pendientes DESC, ultima_fecha DESC;

SELECT m.autor, coalesce(ad.nombre, cl.nombre) AS quien, m.texto, m.enviado, m.leido
FROM mensaje m
JOIN conversacion c ON c.id = m.conversacion_id
JOIN cliente cl     ON cl.id = c.cliente_id
LEFT JOIN administrador ad ON ad.id = m.administrador_id
WHERE c.id = 1
ORDER BY m.enviado;

-- 11. Comprobar un inicio de sesión: la sesión existe, no ha caducado y el cliente está activo
SELECT cl.id, cl.nombre
FROM sesion s JOIN cliente cl ON cl.id = s.cliente_id
WHERE s.token_hash = encode(sha256('token-de-ejemplo'::bytea), 'hex')
  AND s.expira > now() AND cl.activo;

-- 12. Mantenimiento: borrar sesiones caducadas
DELETE FROM sesion WHERE expira <= now();
