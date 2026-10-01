/* ==========================================================================
   CONFIGURACIÓN DEL SITIO — Gabriel Automoción
   --------------------------------------------------------------------------
   Este es el ÚNICO archivo que hay que editar para poner los datos reales.
   Los campos vacíos ('') se muestran en la web como "[DATO A CONFIRMAR]".
   No se ha inventado ningún dato de contacto ni empresarial.
   ========================================================================== */
window.SITE = {
  NAME: 'Gabriel Automoción',

  // Muestra una franja superior indicando que es una web de demostración.
  // Poner a false cuando la web pase a producción con datos reales.
  DEMO_MODE: true,

  // WhatsApp en formato internacional, SOLO dígitos, sin "+" ni espacios.
  // Ejemplo de formato (no es un número real): 34XXXXXXXXX
  WHATSAPP_NUMBER: '', // DATO A CONFIRMAR

  // Teléfono para el botón "Llamar" (formato internacional, ej. +34XXXXXXXXX)
  PHONE: '',           // DATO A CONFIRMAR
  PHONE_DISPLAY: '',   // Cómo se muestra en pantalla, ej. "XXX XX XX XX"

  EMAIL: '',           // DATO A CONFIRMAR
  ADDRESS: '',         // DATO A CONFIRMAR (calle, número, CP, localidad)
  SCHEDULE: '',        // DATO A CONFIRMAR (ej. "L-V 9:00-14:00 / 16:00-20:00")

  // URL "Insertar mapa" de Google Maps (src del iframe). Vacío = marcador de posición.
  MAP_EMBED_URL: '',   // DATO A CONFIRMAR

  SOCIAL: {
    instagram: '',     // DATO A CONFIRMAR
    facebook: ''       // DATO A CONFIRMAR
  },

  // Datos para los textos legales (Aviso legal / Privacidad / Cookies)
  LEGAL: {
    OWNER: '',         // Razón social o nombre del titular — DATO A CONFIRMAR
    NIF: '',           // NIF / CIF — DATO A CONFIRMAR
    ADDRESS: '',       // Domicilio social — DATO A CONFIRMAR
    REGISTRY: '',      // Datos registrales (si aplica) — DATO A CONFIRMAR
    EMAIL: '',         // Email para ejercer derechos RGPD — DATO A CONFIRMAR
    DOMAIN: '',        // Dominio de la web — DATO A CONFIRMAR
    UPDATED: ''        // Fecha de última actualización de los textos — DATO A CONFIRMAR
  },

  // Calculadora de financiación: valores INICIALES de ejemplo (el usuario los modifica).
  // No representan condiciones reales de ninguna entidad.
  FINANCE: {
    DEFAULT_RATE: 7.5,           // % TIN orientativo de ejemplo
    DEFAULT_TERM: 60,            // meses
    TERMS: [12, 24, 36, 48, 60, 72, 84, 96]
  },

  // Contraseña del panel de administración en MODO DEMO (sin servidor).
  // Con el servidor Node se usa la variable de entorno ADMIN_PASSWORD.
  ADMIN_DEMO_PASSWORD: 'demo'
};

window.TBC = 'DATO A CONFIRMAR';
