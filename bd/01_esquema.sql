-- ============================================================================
--  Gabriel Automoción · Base de datos relacional
--  01_esquema.sql — creación de tablas, claves, restricciones e índices
-- ----------------------------------------------------------------------------
--  SGBD: PostgreSQL 16 (compatible con Neon / Vercel Postgres).
--  Ejecución:  psql -d gabriel -f bd/01_esquema.sql
--  El script se puede lanzar varias veces: borra y vuelve a crear todo.
-- ============================================================================

SET client_min_messages = warning;

BEGIN;

DROP TABLE IF EXISTS mensaje, conversacion, solicitud, aviso, favorito, sesion,
                     vehiculo_equipamiento, equipamiento, foto, vehiculo,
                     modelo, marca, combustible, carroceria,
                     cliente, administrador CASCADE;

-- ----------------------------------------------------------------------------
--  1. PERSONAS: quien gestiona la web y quien la usa
-- ----------------------------------------------------------------------------

-- Personal del concesionario que entra en el panel de gestión (admin.html).
CREATE TABLE administrador (
    id              SERIAL       PRIMARY KEY,
    nombre          VARCHAR(120) NOT NULL,
    email           VARCHAR(160) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,          -- scrypt/bcrypt, nunca la contraseña en claro
    rol             VARCHAR(20)  NOT NULL DEFAULT 'gestor'
                    CHECK (rol IN ('propietario', 'gestor')),
    activo          BOOLEAN      NOT NULL DEFAULT TRUE,
    creado          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    ultimo_acceso   TIMESTAMPTZ
);

-- Clientes que se registran en la web (pestañas Entrar / Crear cuenta / Mi cuenta).
CREATE TABLE cliente (
    id                   SERIAL       PRIMARY KEY,
    nombre               VARCHAR(120) NOT NULL,
    email                VARCHAR(160) NOT NULL,
    telefono             VARCHAR(20),                -- opcional en el registro
    password_hash        VARCHAR(255) NOT NULL,
    privacidad_aceptada  TIMESTAMPTZ  NOT NULL,      -- RGPD: cuándo aceptó la política
    acepta_comunicaciones BOOLEAN     NOT NULL DEFAULT FALSE,
    activo               BOOLEAN      NOT NULL DEFAULT TRUE,
    fecha_alta           TIMESTAMPTZ  NOT NULL DEFAULT now(),
    ultimo_acceso        TIMESTAMPTZ,
    CONSTRAINT ck_cliente_email CHECK (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')
);
-- El correo es único sin distinguir mayúsculas (Ana@x.com = ana@x.com).
CREATE UNIQUE INDEX ux_cliente_email ON cliente (lower(email));

-- Sesiones iniciadas (cookie HttpOnly). Se guarda el hash del token, no el token.
CREATE TABLE sesion (
    token_hash      CHAR(64)     PRIMARY KEY,         -- SHA-256 en hexadecimal
    cliente_id      INT          REFERENCES cliente(id)       ON DELETE CASCADE,
    administrador_id INT         REFERENCES administrador(id) ON DELETE CASCADE,
    creada          TIMESTAMPTZ  NOT NULL DEFAULT now(),
    expira          TIMESTAMPTZ  NOT NULL,
    ip              INET,
    user_agent      VARCHAR(300),
    -- Una sesión es de un cliente o de un administrador, nunca de los dos.
    CONSTRAINT ck_sesion_un_titular CHECK (num_nonnulls(cliente_id, administrador_id) = 1),
    CONSTRAINT ck_sesion_expira     CHECK (expira > creada)
);
CREATE INDEX ix_sesion_expira ON sesion (expira);

-- ----------------------------------------------------------------------------
--  2. CATÁLOGO DE VEHÍCULOS
-- ----------------------------------------------------------------------------

-- Tablas de referencia: listas que el concesionario puede ampliar.
CREATE TABLE marca (
    id      SERIAL      PRIMARY KEY,
    nombre  VARCHAR(60) NOT NULL UNIQUE
);

CREATE TABLE modelo (
    id        SERIAL      PRIMARY KEY,
    marca_id  INT         NOT NULL REFERENCES marca(id) ON DELETE RESTRICT,
    nombre    VARCHAR(80) NOT NULL,
    CONSTRAINT uq_modelo UNIQUE (marca_id, nombre)
);

CREATE TABLE combustible (
    id      SERIAL      PRIMARY KEY,
    nombre  VARCHAR(40) NOT NULL UNIQUE
);

CREATE TABLE carroceria (
    id      SERIAL      PRIMARY KEY,
    nombre  VARCHAR(40) NOT NULL UNIQUE
);

-- Vehículo en stock. Los valores fijos y cortos (tipo, cambio, etiqueta, estado)
-- se validan con CHECK en lugar de con una tabla aparte.
CREATE TABLE vehiculo (
    id               SERIAL        PRIMARY KEY,
    referencia       VARCHAR(12)   NOT NULL UNIQUE,   -- la que ve el cliente: GA-1001
    modelo_id        INT           NOT NULL REFERENCES modelo(id)      ON DELETE RESTRICT,
    version          VARCHAR(120),
    combustible_id   INT           NOT NULL REFERENCES combustible(id) ON DELETE RESTRICT,
    carroceria_id    INT           NOT NULL REFERENCES carroceria(id)  ON DELETE RESTRICT,
    tipo             VARCHAR(12)   NOT NULL DEFAULT 'Ocasión'
                     CHECK (tipo IN ('Ocasión', 'Seminuevo', 'Km 0', 'Nuevo')),
    cambio           VARCHAR(12)   NOT NULL CHECK (cambio IN ('Manual', 'Automático')),
    etiqueta         VARCHAR(12)   NOT NULL CHECK (etiqueta IN ('0', 'ECO', 'C', 'B', 'Sin etiqueta')),
    precio           NUMERIC(10,2) NOT NULL CHECK (precio > 0),
    precio_anterior  NUMERIC(10,2),                   -- para mostrar «antes 30.500 €»
    anio             SMALLINT      NOT NULL CHECK (anio BETWEEN 1950 AND 2100),
    km               INT           NOT NULL DEFAULT 0 CHECK (km >= 0),
    potencia_cv      SMALLINT      CHECK (potencia_cv > 0),
    color            VARCHAR(40),
    descripcion      TEXT,
    estado           VARCHAR(12)   NOT NULL DEFAULT 'disponible'
                     CHECK (estado IN ('disponible', 'reservado', 'vendido')),
    destacado        BOOLEAN       NOT NULL DEFAULT FALSE,   -- sale en la portada
    oculto           BOOLEAN       NOT NULL DEFAULT FALSE,   -- no se publica
    demo             BOOLEAN       NOT NULL DEFAULT FALSE,   -- vehículo de demostración
    creado_por       INT           REFERENCES administrador(id) ON DELETE SET NULL,
    creado           TIMESTAMPTZ   NOT NULL DEFAULT now(),
    actualizado      TIMESTAMPTZ   NOT NULL DEFAULT now(),
    -- Un precio rebajado solo tiene sentido si el anterior era más alto.
    CONSTRAINT ck_vehiculo_rebaja CHECK (precio_anterior IS NULL OR precio_anterior > precio)
);
CREATE INDEX ix_vehiculo_modelo   ON vehiculo (modelo_id);
CREATE INDEX ix_vehiculo_catalogo ON vehiculo (estado, precio) WHERE NOT oculto;

-- Fotos de cada vehículo (1:N). La primera (orden 1) es la portada.
CREATE TABLE foto (
    id           SERIAL       PRIMARY KEY,
    vehiculo_id  INT          NOT NULL REFERENCES vehiculo(id) ON DELETE CASCADE,
    url          VARCHAR(600) NOT NULL,              -- Vercel Blob, /uploads/... o https://
    orden        SMALLINT     NOT NULL CHECK (orden >= 1),
    subida       TIMESTAMPTZ  NOT NULL DEFAULT now(),
    CONSTRAINT uq_foto_orden UNIQUE (vehiculo_id, orden)
);

-- Equipamiento: relación N:M (un extra lo tienen muchos coches y al revés).
CREATE TABLE equipamiento (
    id      SERIAL       PRIMARY KEY,
    nombre  VARCHAR(160) NOT NULL UNIQUE
);

CREATE TABLE vehiculo_equipamiento (
    vehiculo_id      INT NOT NULL REFERENCES vehiculo(id)     ON DELETE CASCADE,
    equipamiento_id  INT NOT NULL REFERENCES equipamiento(id) ON DELETE RESTRICT,
    PRIMARY KEY (vehiculo_id, equipamiento_id)
);
CREATE INDEX ix_veheq_equipamiento ON vehiculo_equipamiento (equipamiento_id);

-- ----------------------------------------------------------------------------
--  3. LO QUE HACE EL CLIENTE: guardados y avisos
-- ----------------------------------------------------------------------------

-- Vehículos guardados («Guardados» en Mi cuenta). N:M entre cliente y vehículo.
CREATE TABLE favorito (
    cliente_id   INT         NOT NULL REFERENCES cliente(id)  ON DELETE CASCADE,
    vehiculo_id  INT         NOT NULL REFERENCES vehiculo(id) ON DELETE CASCADE,
    guardado     TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (cliente_id, vehiculo_id)
);
CREATE INDEX ix_favorito_vehiculo ON favorito (vehiculo_id);

-- Avisos: «avísame si baja de precio» (de un coche concreto) o
-- «avísame cuando entre un coche que cumpla estos filtros» (búsqueda guardada).
CREATE TABLE aviso (
    id              SERIAL        PRIMARY KEY,
    cliente_id      INT           NOT NULL REFERENCES cliente(id)  ON DELETE CASCADE,
    tipo            VARCHAR(12)   NOT NULL CHECK (tipo IN ('precio', 'busqueda')),
    vehiculo_id     INT           REFERENCES vehiculo(id)    ON DELETE CASCADE,
    marca_id        INT           REFERENCES marca(id)       ON DELETE CASCADE,
    combustible_id  INT           REFERENCES combustible(id) ON DELETE CASCADE,
    precio_max      NUMERIC(10,2) CHECK (precio_max > 0),
    km_max          INT           CHECK (km_max > 0),
    activo          BOOLEAN       NOT NULL DEFAULT TRUE,
    creado          TIMESTAMPTZ   NOT NULL DEFAULT now(),
    ultimo_envio    TIMESTAMPTZ,
    -- Un aviso de precio va ligado a un coche; una búsqueda, no.
    CONSTRAINT ck_aviso_tipo CHECK (
        (tipo = 'precio'   AND vehiculo_id IS NOT NULL) OR
        (tipo = 'busqueda' AND vehiculo_id IS NULL)
    )
);
CREATE INDEX ix_aviso_cliente ON aviso (cliente_id);

-- ----------------------------------------------------------------------------
--  4. CONTACTO: solicitudes de los formularios y conversaciones
-- ----------------------------------------------------------------------------

-- Solicitud enviada desde un formulario (contacto, ficha de vehículo o
-- financiación). La puede enviar cualquiera, con cuenta o sin ella.
CREATE TABLE solicitud (
    id                SERIAL        PRIMARY KEY,
    tipo              VARCHAR(14)   NOT NULL CHECK (tipo IN ('contacto', 'vehiculo', 'financiacion')),
    motivo            VARCHAR(60),                  -- Información / Prueba del vehículo / Financiación
    asunto            VARCHAR(80),
    nombre            VARCHAR(120)  NOT NULL,
    telefono          VARCHAR(20),
    email             VARCHAR(160),
    mensaje           TEXT,
    importe           NUMERIC(10,2),                -- importe a financiar, si lo hay
    pagina            VARCHAR(80),                  -- página desde la que se envió
    cliente_id        INT           REFERENCES cliente(id)  ON DELETE SET NULL,
    vehiculo_id       INT           REFERENCES vehiculo(id) ON DELETE SET NULL,
    vehiculo_titulo   VARCHAR(200),                 -- copia del título por si se borra el coche
    privacidad        BOOLEAN       NOT NULL CHECK (privacidad),  -- debe ser TRUE
    estado            VARCHAR(12)   NOT NULL DEFAULT 'nuevo'
                      CHECK (estado IN ('nuevo', 'contactado', 'cerrado')),
    nota_interna      TEXT,
    atendida_por      INT           REFERENCES administrador(id) ON DELETE SET NULL,
    fecha             TIMESTAMPTZ   NOT NULL DEFAULT now(),
    ip                INET,                         -- para limitar envíos abusivos
    -- Igual que la web: hace falta al menos un teléfono o un correo.
    CONSTRAINT ck_solicitud_contacto CHECK (telefono IS NOT NULL OR email IS NOT NULL)
);
CREATE INDEX ix_solicitud_estado_fecha ON solicitud (estado, fecha DESC);
CREATE INDEX ix_solicitud_vehiculo     ON solicitud (vehiculo_id);

-- Conversación entre un cliente registrado y el concesionario (sección Mensajes).
-- Puede nacer de una solicitud y puede tratar sobre un coche concreto.
CREATE TABLE conversacion (
    id             SERIAL       PRIMARY KEY,
    cliente_id     INT          NOT NULL REFERENCES cliente(id)   ON DELETE CASCADE,
    vehiculo_id    INT          REFERENCES vehiculo(id)  ON DELETE SET NULL,
    solicitud_id   INT          UNIQUE REFERENCES solicitud(id) ON DELETE SET NULL,
    asunto         VARCHAR(120) NOT NULL,
    estado         VARCHAR(10)  NOT NULL DEFAULT 'abierta' CHECK (estado IN ('abierta', 'cerrada')),
    creada         TIMESTAMPTZ  NOT NULL DEFAULT now()
);
CREATE INDEX ix_conversacion_cliente ON conversacion (cliente_id);

-- Cada mensaje de una conversación. Si lo escribe el concesionario se guarda
-- qué administrador fue; si lo escribe el cliente, administrador_id es NULL.
CREATE TABLE mensaje (
    id                SERIAL      PRIMARY KEY,
    conversacion_id   INT         NOT NULL REFERENCES conversacion(id)  ON DELETE CASCADE,
    autor             VARCHAR(14) NOT NULL CHECK (autor IN ('cliente', 'concesionario')),
    administrador_id  INT         REFERENCES administrador(id) ON DELETE SET NULL,
    texto             TEXT        NOT NULL CHECK (length(trim(texto)) > 0),
    enviado           TIMESTAMPTZ NOT NULL DEFAULT now(),
    leido             TIMESTAMPTZ,                    -- NULL = pendiente de leer
    CONSTRAINT ck_mensaje_autor CHECK (autor = 'concesionario' OR administrador_id IS NULL)
);
CREATE INDEX ix_mensaje_conversacion ON mensaje (conversacion_id, enviado);

-- ----------------------------------------------------------------------------
--  5. AUTOMATISMOS
-- ----------------------------------------------------------------------------

-- Mantiene vehiculo.actualizado al día en cada UPDATE.
CREATE OR REPLACE FUNCTION fn_tocar_actualizado() RETURNS trigger AS $$
BEGIN
    NEW.actualizado := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_vehiculo_actualizado
    BEFORE UPDATE ON vehiculo
    FOR EACH ROW EXECUTE FUNCTION fn_tocar_actualizado();

-- Al bajar el precio de un coche se guarda el precio anterior automáticamente,
-- salvo que el administrador haya puesto otro a mano en la misma operación.
CREATE OR REPLACE FUNCTION fn_rebaja_precio() RETURNS trigger AS $$
BEGIN
    IF NEW.precio < OLD.precio AND NEW.precio_anterior IS NOT DISTINCT FROM OLD.precio_anterior THEN
        NEW.precio_anterior := GREATEST(OLD.precio, COALESCE(OLD.precio_anterior, 0));
    ELSIF NEW.precio_anterior IS NOT NULL AND NEW.precio >= NEW.precio_anterior THEN
        NEW.precio_anterior := NULL;   -- ya no hay rebaja que mostrar
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tg_vehiculo_rebaja
    BEFORE UPDATE OF precio ON vehiculo
    FOR EACH ROW EXECUTE FUNCTION fn_rebaja_precio();

-- ----------------------------------------------------------------------------
--  6. VISTAS que usa la web
-- ----------------------------------------------------------------------------

-- Catálogo público: solo lo publicado, con nombres legibles y la foto de portada.
CREATE OR REPLACE VIEW v_catalogo AS
SELECT v.id, v.referencia,
       ma.nombre AS marca, mo.nombre AS modelo, v.version,
       ma.nombre || ' ' || mo.nombre AS titulo,
       v.precio, v.precio_anterior, v.anio, v.km, v.potencia_cv,
       co.nombre AS combustible, v.cambio, ca.nombre AS carroceria,
       v.color, v.etiqueta, v.tipo, v.estado, v.destacado,
       (SELECT f.url FROM foto f WHERE f.vehiculo_id = v.id ORDER BY f.orden LIMIT 1) AS portada,
       v.creado
FROM vehiculo v
JOIN modelo mo      ON mo.id = v.modelo_id
JOIN marca ma       ON ma.id = mo.marca_id
JOIN combustible co ON co.id = v.combustible_id
JOIN carroceria ca  ON ca.id = v.carroceria_id
WHERE NOT v.oculto;

-- Bandeja del panel: conversaciones con su último mensaje y los pendientes de leer.
CREATE OR REPLACE VIEW v_bandeja_mensajes AS
SELECT c.id, c.asunto, c.estado, cl.nombre AS cliente, cl.email,
       ma.nombre || ' ' || mo.nombre AS vehiculo,
       ult.texto AS ultimo_mensaje, ult.enviado AS ultima_fecha,
       (SELECT count(*) FROM mensaje m
         WHERE m.conversacion_id = c.id AND m.autor = 'cliente' AND m.leido IS NULL) AS pendientes
FROM conversacion c
JOIN cliente cl ON cl.id = c.cliente_id
LEFT JOIN vehiculo v ON v.id = c.vehiculo_id
LEFT JOIN modelo mo  ON mo.id = v.modelo_id
LEFT JOIN marca ma   ON ma.id = mo.marca_id
LEFT JOIN LATERAL (
    SELECT m.texto, m.enviado FROM mensaje m
    WHERE m.conversacion_id = c.id ORDER BY m.enviado DESC LIMIT 1
) ult ON TRUE;

COMMIT;
