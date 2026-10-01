# Gabriel Automoción — Web demo

Web **demo funcional** para el concesionario Gabriel Automoción: catálogo de vehículos con filtros, ficha de vehículo con galería, WhatsApp con mensaje automático por vehículo, calculadora de financiación, formularios de contacto y **panel de gestión de stock**.

> ⚠️ **Web de demostración.** Los vehículos incluidos son ficticios (marcados con `demo: true`) y las fotografías son ilustrativas. Ningún dato de contacto ni empresarial ha sido inventado: todo lo que falta aparece en la web como **[DATO A CONFIRMAR]**.

## Puesta en marcha

### Opción A — Con servidor (recomendada, todo funciona de verdad)
Requiere Node.js 18 o superior. **No hay dependencias que instalar.**

```bash
ADMIN_PASSWORD="una-contraseña-segura" npm start
# Web:   http://localhost:3000
# Panel: http://localhost:3000/admin.html
```

- El stock se guarda en `data/vehicles.json` (se crea con los vehículos DEMO la primera vez).
- Las solicitudes de los formularios se guardan en `data/leads.json` y se ven en el panel.
- Las fotos subidas se optimizan en el navegador y se guardan en `uploads/`.
- Opcional: `LEAD_WEBHOOK_URL=https://…` envía cada solicitud nueva a un webhook (Make, Zapier, n8n…) para recibirla por email.

### Opción B — Estática (para enseñar la demo sin servidor)
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
server.js     servidor sin dependencias (API + estáticos)
fonts/        tipografías Inter y Sora autoalojadas (SIL OFL)
```

## Pendiente antes de publicar
- Sustituir todos los **[DATO A CONFIRMAR]** y **[TEXTO A PERSONALIZAR…]**.
- Revisar los textos legales con un asesor.
- Cargar el stock real y eliminar los vehículos DEMO.
- Sustituir las fotografías ilustrativas y el logotipo provisional.
- Poner `DEMO_MODE: false` y definir `ADMIN_PASSWORD`.
- Servir la web con HTTPS.
