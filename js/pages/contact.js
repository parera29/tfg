/* Página de contacto: asunto precargado y mapa */
(function () {
  var map = { tasacion: 'Tasación', venta: 'Venta de mi vehículo', garantia: 'Garantía', financiacion: 'Financiación', prueba: 'Prueba de vehículo' };
  var a = map[UI.qs('asunto')];
  if (a) document.getElementById('cf-asunto').value = a;

  var box = document.getElementById('mapBox');
  function placeholder(extra) {
    box.innerHTML = '<div class="map-placeholder"><span class="pin">' + UI.icon('pin') + '</span><h3>Ubicación del concesionario</h3>' +
      '<p>Dirección: ' + UI.tbc(SITE.ADDRESS) + '</p>' + (extra || '') + '</div>';
  }
  function render() {
    if (!SITE.MAP_EMBED_URL) {
      placeholder('<p class="small">Mapa preparado para insertar la ubicación real (variable <code>MAP_EMBED_URL</code> en <code>js/config.js</code>).</p>');
    } else if (!UI.cookiesAccepted()) {
      placeholder('<p class="small">El mapa lo proporciona un servicio de terceros que puede instalar cookies.</p><button class="btn btn--dark btn--sm" id="loadMap">Aceptar y cargar mapa</button>');
      document.getElementById('loadMap').addEventListener('click', function () {
        try { localStorage.setItem('ga_cookie_consent', 'accepted'); } catch (e) {}
        var cb = document.querySelector('.cookie-banner'); if (cb) cb.remove();
        render();
      });
    } else {
      box.innerHTML = '<iframe src="' + UI.esc(SITE.MAP_EMBED_URL) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" title="Mapa de ubicación de ' + UI.esc(SITE.NAME) + '" allowfullscreen></iframe>';
    }
  }
  document.addEventListener('cookieconsent', render);
  render();
})();
