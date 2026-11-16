# Gabriel Automoción — Web demo

Web **demo funcional** para el concesionario Gabriel Automoción: catálogo de vehículos con filtros, ficha de vehículo con galería, WhatsApp con mensaje automático por vehículo, calculadora de financiación, formularios de contacto y **panel de gestión de stock**.

> ⚠️ **Web de demostración.** Los vehículos incluidos son ficticios (marcados con `demo: true`) y las fotografías son ilustrativas. Ningún dato de contacto ni empresarial ha sido inventado: todo lo que falta aparece en la web como **[DATO A CONFIRMAR]**.

## Puesta en marcha

### Opción A — En Vercel (recomendada para tenerla en internet)
Vercel publica la web automáticamente cada vez que se sube un cambio a GitHub. Como Vercel no tiene disco permanente, los datos se guardan en una base de datos **PostgreSQL en Neon** (diseño en [`bd/`](bd/README.md)) y las fotos en **Vercel Blob** (los dos tienen plan gratuito suficiente para esta web). La API está en `api/router.js` y comparte toda la lógica con `server.js` (`lib/api.js`).

1. En [vercel.com](https://vercel.com), entra con tu cuenta de GitHub → **Add New → Project** → importa este repositorio → **Deploy** (no hay que cambiar ningún ajuste).
2. En el proyecto, pestaña **Storage**:
   - **Create Database → Neon** (Serverless Postgres, plan gratuito, región Frankfurt o la más cercana) → **Connect** al proyecto. La primera vez que arranca, la web crea sola las tablas de `bd/01_esquema.sql` y carga los vehículos DEMO.
   - **Create → Blob** → elige acceso **Public** → **Connect** al proyecto.
3. En **Settings → Environment Variables** añade `ADMIN_PASSWORD` con la contraseña que quieras para el panel. Opcional: `LEAD_WEBHOOK_URL`.
4. En **Deployments**, en el último despliegue, pulsa **⋯ → Redeploy** para que coja las variables nuevas.

Comprobación: `https://TU-PROYECTO.vercel.app/api/health` debe responder `{"ok":true,"storage":"postgresql"}`. Si falta algo, la web sigue funcionando en modo demostración y el panel dice qué falta conectar.

### Opción B — Con servidor propio (ordenador, VPS, Render, Railway)
Requiere Node.js 18 o superior.

```bash
npm install
ADMIN_PASSWORD="una-contraseña-segura" DATABASE_URL="postgres://usuario:clave@localhost:5432/gabriel" npm start
# Web:   http://localhost:3000
# Panel: http://localhost:3000/admin.html
```

- Con `DATABASE_URL`, todo se guarda en PostgreSQL (las tablas se crean solas si la base de datos está vacía).
- Sin `DATABASE_URL`, para probar sin instalar nada, el stock se guarda en `data/vehicles.json` y las solicitudes en `data/leads.json`.
- Las fotos subidas se optimizan en el navegador y se guardan en `uploads/`.
- Opcional: `LEAD_WEBHOOK_URL=https://…` envía cada solicitud nueva a un webhook (Make, Zapier, n8n…) para recibirla por email.

### Opción C — Estática (para enseñar la demo sin servidor)
Basta con abrir `index.html` o publicar la carpeta en cualquier hosting estático (GitHub Pages, Netlify…).
La web detecta que no hay servidor y el panel guarda los cambios **solo en ese navegador** (localStorage). Contraseña de prueba: `demo`.

## Configuración (datos reales)
Todo se edita en **`js/config.js`**:

| Variable | Descripción |
|---|---|
| `WHATSAPP_NUMBER` | Número de WhatsApp en formato internacional, solo dígitos (ej. `34XXXXXXXXX`) |
| `PHONE` / `PHONE_DISPLAY` | Teléfono para el botón “Llamar” y cómo se muestra |
| `EMAIL`, `ADDRESS`, `SCHEDULE` | Email, dirección y horario |
| `MAP_EMBED_URL` | URL de “Insertar mapa” de Google Maps |
| `SOCIAL` | Instagram / Facebook |
| `LEGAL.*` | Titular, NIF, domicilio, registro… para los textos legales |
| `FINANCE` | Valores iniciales de la calculadora (orientativos) |
| `DEMO_MODE` | `false` para quitar la franja “Web de demostración” |

## Vídeo de portada
Arriba del todo de la portada se muestra en bucle el vídeo de marca de Gabriel Automoción (carpeta `media/`, 10 s, sin audio). Se ve completo en todos los tamaños de pantalla y el texto de bienvenida va debajo.
- `hero-1280.webm` / `hero-1280.mp4` para ordenador y tablet, `hero-640.webm` / `hero-640.mp4` para móvil.
- `hero-poster.jpg` / `hero-poster-640.jpg`: imagen fija mientras carga.
- Si el usuario tiene activado "reducir movimiento" o el ahorro de datos, no se descarga el vídeo y se queda la imagen fija.
- Botón para pausar el vídeo; se pausa solo cuando no está a la vista.
- Para cambiarlo, sustituye esos archivos manteniendo los mismos nombres y sube el número `?v=` en `index.html` y `js/pages/home.js` para que los navegadores no muestren el antiguo.

## Panel de gestión (`/admin.html`)
Pensado para usarse sin conocimientos técnicos, también desde el móvil:
- Añadir, editar y eliminar vehículos.
- Subir fotos (arrastrar y soltar), elegir la principal y reordenarlas.
- Cambiar el precio directamente desde el listado (si baja, se guarda el precio anterior y se muestra tachado).
- Marcar como destacado (aparece en la portada), vendido/reservado u ocultar de la web.
- Editar descripción y equipamiento.
- Ver y gestionar las solicitudes recibidas (llamar, WhatsApp o email con un clic).
- Copia de seguridad (descargar / restaurar) y restablecer el stock de demostración.

## Estructura
```
index.html, vehiculos.html, vehiculo.html, ocasion.html, financiacion.html,
servicios.html, nosotros.html, contacto.html, aviso-legal.html,
privacidad.html, cookies.html, admin.html
css/          estilos (styles.css, admin.css)
js/config.js  configuración editable
js/demo-data.js  vehículos DEMO
js/store.js   capa de datos (servidor o navegador)
js/ui.js      cabecera, pie, tarjetas, WhatsApp, formularios…
js/pages/     lógica de cada página
server.js     servidor sin dependencias (API + estáticos) para ordenador o VPS
api/router.js API para Vercel (Neon PostgreSQL + Vercel Blob)
lib/api.js    lógica común de la API (validación, acceso, stock, solicitudes)
lib/store-pg.js     almacén PostgreSQL (traduce entre la web y las tablas)
lib/store-lists.js  almacén en archivos JSON (sin base de datos)
bd/           diseño de la base de datos: esquema, datos, consultas, pruebas y diagrama E/R
vercel.json   reescritura /api/* → api/router.js y cabeceras
fonts/        tipografías Inter y Sora autoalojadas (SIL OFL)
media/        vídeo e imagen de la portada
img/          logotipo (logo-mark, logo-footer), favicons, iconos y og-image
site.webmanifest  iconos para "Añadir a pantalla de inicio"
```

## Pendiente antes de publicar
- Sustituir todos los **[DATO A CONFIRMAR]** y **[TEXTO A PERSONALIZAR…]**.
- Revisar los textos legales con un asesor.
- Cargar el stock real y eliminar los vehículos DEMO.
- Sustituir las fotografías ilustrativas.
- Poner `DEMO_MODE: false` y definir `ADMIN_PASSWORD`.
- Servir la web con HTTPS (Vercel ya lo hace).
