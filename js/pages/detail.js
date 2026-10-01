/* Ficha de vehículo */
(async function () {
  var root = document.getElementById('detail');
  var id = UI.qs('id');
  var v = id ? await Store.getVehicle(id) : null;
  var esc = UI.esc, icon = UI.icon;

  if (!v) {
    root.innerHTML = '<div class="not-found">' + icon('car', 'ico-xl') + '<h1>Vehículo no disponible</h1>' +
      '<p class="muted">Es posible que el vehículo se haya vendido o que el enlace no sea correcto.</p>' +
      '<a class="btn btn--dark btn--lg" href="vehiculos.html">Ver todo el stock</a></div>';
    document.title = 'Vehículo no disponible · ' + SITE.NAME;
    return;
  }

  var title = UI.title(v);
  var full = title + (v.version ? ' ' + v.version : '');
  var waMsg = UI.vehicleWaMsg(v);
  var fotos = (v.fotos && v.fotos.length) ? v.fotos : [''];
  var sold = v.estado === 'vendido';
  var hasDiscount = v.precioAnterior && v.precioAnterior > v.precio;
  var F = SITE.FINANCE;
  var cuota = UI.monthly(v.precio, F.DEFAULT_RATE, F.DEFAULT_TERM);

  document.title = full + ' · ' + SITE.NAME;
  var md = document.querySelector('meta[name="description"]');
  if (md) md.setAttribute('content', full + ' · ' + v.anio + ' · ' + UI.km(v.km) + ' · ' + v.combustible + ' · ' + UI.price(v.precio) + '. ' + SITE.NAME + '.');

  // datos estructurados (SEO)
  var ld = document.createElement('script');
  ld.type = 'application/ld+json';
  ld.textContent = JSON.stringify({
    '@context': 'https://schema.org', '@type': 'Car', name: full, brand: { '@type': 'Brand', name: v.marca }, model: v.modelo,
    vehicleModelDate: String(v.anio || ''), fuelType: v.combustible, vehicleTransmission: v.cambio, color: v.color, bodyType: v.carroceria,
    mileageFromOdometer: { '@type': 'QuantitativeValue', value: v.km, unitCode: 'KMT' },
    image: fotos.filter(Boolean).map(function (f) { return f.indexOf('data:') === 0 ? undefined : UI.imgUrl(f, 1200); }).filter(Boolean),
    offers: { '@type': 'Offer', price: v.precio, priceCurrency: 'EUR', availability: sold ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock' }
  });
  document.head.appendChild(ld);

  var specs = [
    ['tag', 'Marca', v.marca], ['car', 'Modelo', v.modelo], ['sparkle', 'Versión', v.version],
    ['calendar', 'Año', v.anio], ['gauge', 'Kilómetros', UI.km(v.km)], ['fuel', 'Combustible', v.combustible],
    ['gear', 'Cambio', v.cambio], ['bolt', 'Potencia', v.potencia ? v.potencia + ' CV' : ''], ['body', 'Carrocería', v.carroceria],
    ['palette', 'Color', v.color], ['leaf', 'Etiqueta ambiental', v.etiqueta ? (v.etiqueta === 'Sin etiqueta' ? 'Sin etiqueta' : 'Etiqueta ' + v.etiqueta) : ''], ['info', 'Referencia', v.id]
  ];

  var termOpts = F.TERMS.map(function (t) { return '<option value="' + t + '"' + (t === F.DEFAULT_TERM ? ' selected' : '') + '>' + t + ' meses</option>'; }).join('');

  root.innerHTML =
    '<div class="detail-top"><nav class="breadcrumb breadcrumb--light" aria-label="Ruta" style="margin:0"><a href="index.html">Inicio</a><span>/</span><a href="vehiculos.html">Vehículos</a><span>/</span><span>' + esc(title) + '</span></nav>' +
    '<a class="link-arrow small" href="vehiculos.html">' + icon('chevL') + 'Volver al stock</a></div>' +
    '<div class="detail-grid">' +

    /* ---- galería ---- */
    '<div class="d-gallery">' +
      '<div class="gallery-main" id="gallery">' +
        '<div class="gallery-track">' + fotos.map(function (f, i) {
          return '<div class="gallery-slide">' + UI.img(f, full + ' — foto ' + (i + 1), { eager: i === 0, w: 1200, sizes: '(max-width: 1100px) 100vw, 760px' }) + '</div>';
        }).join('') + '</div>' +
        UI.statusBadge(v) +
        (fotos.length > 1 ? '<button class="gallery-nav gallery-nav--prev" aria-label="Foto anterior">' + icon('chevL') + '</button><button class="gallery-nav gallery-nav--next" aria-label="Foto siguiente">' + icon('chevR') + '</button>' : '') +
        '<span class="gallery-counter">' + icon('image') + '<span id="gCount">1</span> / ' + fotos.length + '</span>' +
        '<button class="gallery-expand" aria-label="Ver a pantalla completa">' + icon('expand') + '</button>' +
      '</div>' +
      (fotos.length > 1 ? '<div class="gallery-thumbs">' + fotos.map(function (f, i) {
        return '<button class="gallery-thumb' + (i === 0 ? ' is-active' : '') + '" data-i="' + i + '" aria-label="Ver foto ' + (i + 1) + '">' + UI.img(f, '', { w: 240, sizes: '120px' }) + '</button>';
      }).join('') + '</div>' : '') +
      (v.demo ? '<p class="demo-note">Vehículo de demostración · fotografías ilustrativas que no corresponden al modelo.</p>' : '') +
    '</div>' +

    /* ---- columna de precio / CTA ---- */
    '<aside class="detail-aside"><div class="price-card">' +
      '<p class="vcard-brand">' + esc(v.marca) + (v.tipo ? ' · ' + esc(v.tipo) : '') + '</p>' +
      '<h1>' + esc(v.modelo) + '</h1><p class="version">' + esc(v.version || '') + '</p>' +
      '<div class="quick-specs">' +
        '<div>' + icon('calendar') + '<strong>' + esc(v.anio || '—') + '</strong><small>Año</small></div>' +
        '<div>' + icon('gauge') + '<strong>' + UI.group(v.km || 0) + '</strong><small>km</small></div>' +
        '<div>' + icon('fuel') + '<strong>' + esc(v.combustible || '—') + '</strong><small>Combustible</small></div>' +
        '<div>' + icon('gear') + '<strong>' + esc(v.cambio || '—') + '</strong><small>Cambio</small></div>' +
      '</div>' +
      '<div class="price-row"><div>' +
        (hasDiscount ? '<span class="price-old"><s>' + UI.price(v.precioAnterior) + '</s><span class="price-save">Ahorras ' + UI.price(v.precioAnterior - v.precio) + '</span></span>' : '') +
        '<span class="price-big">' + UI.price(v.precio) + '</span></div>' +
        (!sold && cuota ? '<div class="price-month">Desde<strong>' + UI.money(cuota) + '/mes*</strong><a href="#financiacion" style="text-decoration:underline">Simular</a></div>' : '') +
      '</div>' +
      (sold ? '<p class="disclaimer" style="margin:0 0 16px">' + icon('info') + '<span>Este vehículo ya se ha vendido. Consulta vehículos similares o pregúntanos por uno parecido.</span></p>' : '') +
      '<div class="cta-stack">' +
        '<button class="btn btn--wa btn--lg btn--block" data-action="whatsapp" data-msg="' + esc(waMsg) + '">' + icon('whatsapp') + 'Consultar por WhatsApp</button>' +
        '<div class="row"><button class="btn btn--dark" id="btnTest">' + icon('steering') + 'Solicitar prueba</button>' +
        '<button class="btn btn--outline" data-action="call">' + icon('phone') + 'Llamar</button></div>' +
        '<a class="btn btn--ghost btn--block" href="#solicitar">' + icon('mail') + 'Solicitar información</a>' +
      '</div>' +
      (!sold && cuota ? '<p class="form-note">*Cuota orientativa calculada a ' + F.DEFAULT_TERM + ' meses, sin entrada y con un TIN de ejemplo del ' + String(F.DEFAULT_RATE).replace('.', ',') + ' %. Simulación orientativa. Las condiciones definitivas dependerán de la entidad financiera y de la aprobación de la operación.</p>' : '') +
    '</div></aside>' +

    /* ---- contenido ---- */
    '<div class="d-main">' +
      '<section class="detail-section" style="margin-top:8px"><h2>Descripción</h2><p class="desc">' + esc(v.descripcion || 'Descripción pendiente de completar.') + '</p></section>' +
      '<section class="detail-section"><h2>Características</h2><dl class="spec-table">' + specs.map(function (s) {
        return '<div><dt>' + icon(s[0]) + s[1] + '</dt><dd>' + (s[2] ? esc(s[2]) : '—') + '</dd></div>';
      }).join('') + '</dl></section>' +
      '<section class="detail-section"><h2>Equipamiento</h2>' + ((v.equipamiento || []).length ?
        '<ul class="equip">' + v.equipamiento.map(function (e) { return '<li>' + icon('check') + esc(e) + '</li>'; }).join('') + '</ul>' :
        '<p class="muted">Equipamiento pendiente de completar.</p>') + '</section>' +

      '<section class="detail-section" id="financiacion"><h2>Financiación</h2><div class="mini-calc">' +
        '<p class="muted" style="margin-top:0">Calcula una cuota orientativa para este vehículo. Las operaciones de financiación están sujetas a estudio y aprobación por parte de la entidad financiera.</p>' +
        '<form class="form-grid" id="miniCalc" onsubmit="return false">' +
          '<div class="field"><label for="mc-price">Precio</label><div class="input-suffix"><input class="input" id="mc-price" type="number" inputmode="numeric" min="0" step="100" value="' + (v.precio || 0) + '"><span>€</span></div></div>' +
          '<div class="field"><label for="mc-down">Entrada</label><div class="input-suffix"><input class="input" id="mc-down" type="number" inputmode="numeric" min="0" step="100" value="0"><span>€</span></div></div>' +
          '<div class="field"><label for="mc-term">Plazo</label><select class="select" id="mc-term">' + termOpts + '</select></div>' +
          '<div class="field"><label for="mc-rate">Interés orientativo (TIN)</label><div class="input-suffix"><input class="input" id="mc-rate" type="number" inputmode="decimal" min="0" max="30" step="0.1" value="' + F.DEFAULT_RATE + '"><span>%</span></div></div>' +
        '</form>' +
        '<div class="calc-result"><div><small>Importe financiado</small><strong id="mc-amount">—</strong></div><div class="is-main"><small>Cuota mensual estimada</small><strong id="mc-quota">—</strong></div></div>' +
        '<p class="disclaimer">' + icon('info') + '<span>Simulación orientativa. Las condiciones definitivas dependerán de la entidad financiera y de la aprobación de la operación.</span></p>' +
        '<p style="margin:16px 0 0"><a class="link-arrow" href="financiacion.html?vehiculo=' + encodeURIComponent(full) + '&importe=' + (v.precio || '') + '">Solicitar estudio de financiación ' + icon('arrow') + '</a></p>' +
      '</div></section>' +

      '<section class="detail-section" id="solicitar"><h2>Solicita información</h2><div class="form-card">' +
        '<form data-lead="vehiculo" id="leadForm" class="form-grid">' +
          '<div class="field full"><span class="label">Motivo</span><div class="seg">' +
            '<label><input type="radio" name="motivo" value="Información" checked><span>Información</span></label>' +
            '<label><input type="radio" name="motivo" value="Prueba del vehículo"><span>Prueba</span></label>' +
            '<label><input type="radio" name="motivo" value="Financiación"><span>Financiación</span></label></div></div>' +
          '<div class="field"><label for="lf-nombre">Nombre *</label><input class="input" id="lf-nombre" name="nombre" autocomplete="name" required></div>' +
          '<div class="field"><label for="lf-tel">Teléfono *</label><input class="input" id="lf-tel" name="telefono" type="tel" autocomplete="tel" inputmode="tel" required></div>' +
          '<div class="field full"><label for="lf-email">Email *</label><input class="input" id="lf-email" name="email" type="email" autocomplete="email" required></div>' +
          '<div class="field full"><label for="lf-msg">Mensaje</label><textarea class="textarea" id="lf-msg" name="mensaje">' + esc('Hola, me interesa el ' + full + ' (ref. ' + v.id + '). Me gustaría recibir más información.') + '</textarea></div>' +
          '<div class="full">' + UI.privacyCheckbox() + '</div>' +
          '<div class="full"><button class="btn btn--dark btn--lg btn--block" type="submit">Solicitar información</button></div>' +
        '</form></div></section>' +
    '</div>' +
    '</div>' +
    '<section class="detail-section" id="similares" hidden><h2>Vehículos similares</h2><div class="vgrid" id="similarGrid"></div></section>';

  // --- formulario
  UI.bindLeadForm(document.getElementById('leadForm'), function () { return { vehiculoId: v.id, vehiculoTitulo: full }; });
  var msgEl = document.getElementById('lf-msg');
  var msgs = {
    'Información': 'Hola, me interesa el ' + full + ' (ref. ' + v.id + '). Me gustaría recibir más información.',
    'Prueba del vehículo': 'Hola, me gustaría solicitar una prueba del ' + full + ' (ref. ' + v.id + '). Indicadme disponibilidad, por favor.',
    'Financiación': 'Hola, me gustaría estudiar la financiación del ' + full + ' (ref. ' + v.id + ').'
  };
  document.getElementById('leadForm').addEventListener('change', function (e) {
    if (e.target.name === 'motivo' && msgs[e.target.value]) msgEl.value = msgs[e.target.value];
  });
  document.getElementById('btnTest').addEventListener('click', function () {
    var r = document.querySelector('input[name="motivo"][value="Prueba del vehículo"]');
    r.checked = true; r.dispatchEvent(new Event('change', { bubbles: true }));
    document.getElementById('solicitar').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(function () { document.getElementById('lf-nombre').focus({ preventScroll: true }); }, 500);
  });

  // --- calculadora
  function calc() {
    var price = +document.getElementById('mc-price').value || 0;
    var down = Math.min(+document.getElementById('mc-down').value || 0, price);
    var term = +document.getElementById('mc-term').value;
    var rate = Math.max(0, +document.getElementById('mc-rate').value || 0);
    var amount = Math.max(price - down, 0);
    document.getElementById('mc-amount').textContent = UI.money(amount);
    document.getElementById('mc-quota').textContent = amount > 0 ? UI.money(UI.monthly(amount, rate, term)) + '/mes' : '—';
  }
  document.getElementById('miniCalc').addEventListener('input', calc);
  calc();

  // --- galería
  var gallery = document.getElementById('gallery');
  var track = gallery.querySelector('.gallery-track');
  var thumbs = root.querySelectorAll('.gallery-thumb');
  var idx = 0;
  function go(i) {
    idx = (i + fotos.length) % fotos.length;
    track.style.transform = 'translateX(' + (-idx * 100) + '%)';
    document.getElementById('gCount').textContent = idx + 1;
    thumbs.forEach(function (t, j) { t.classList.toggle('is-active', j === idx); });
    if (thumbs[idx]) thumbs[idx].scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }
  gallery.addEventListener('click', function (e) {
    if (e.target.closest('.gallery-nav--prev')) go(idx - 1);
    else if (e.target.closest('.gallery-nav--next')) go(idx + 1);
    else if (e.target.closest('.gallery-expand') || e.target.closest('.gallery-slide')) lightbox(idx);
  });
  thumbs.forEach(function (t) { t.addEventListener('click', function () { go(+t.getAttribute('data-i')); }); });
  swipe(gallery, function () { go(idx + 1); }, function () { go(idx - 1); });

  function swipe(el, next, prev) {
    var x0 = null, y0 = null;
    el.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    el.addEventListener('touchend', function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      if (Math.abs(dx) > 40 && Math.abs(dx) > Math.abs(dy)) { dx < 0 ? next() : prev(); }
      x0 = null;
    }, { passive: true });
  }

  function lightbox(start) {
    var i = start;
    var lb = document.createElement('div');
    lb.className = 'lightbox';
    lb.setAttribute('role', 'dialog'); lb.setAttribute('aria-modal', 'true'); lb.setAttribute('aria-label', 'Galería de fotos');
    lb.innerHTML = '<img alt="">' +
      (fotos.length > 1 ? '<button class="gallery-nav gallery-nav--prev" aria-label="Anterior">' + icon('chevL') + '</button><button class="gallery-nav gallery-nav--next" aria-label="Siguiente">' + icon('chevR') + '</button>' : '') +
      '<button class="lightbox-close" aria-label="Cerrar">' + icon('close') + '</button><div class="lightbox-count"></div>';
    var im = lb.querySelector('img');
    function show() {
      var f = fotos[i];
      im.onerror = function () { UI.imgFallback(im); };
      im.src = f ? UI.imgUrl(f, 1800) : UI.PLACEHOLDER;
      im.alt = full + ' — foto ' + (i + 1);
      lb.querySelector('.lightbox-count').textContent = (i + 1) + ' / ' + fotos.length;
    }
    function close() { lb.classList.remove('is-open'); document.body.classList.remove('no-scroll'); document.removeEventListener('keydown', key); setTimeout(function () { lb.remove(); }, 250); go(i); }
    function key(e) {
      if (e.key === 'Escape') close();
      if (e.key === 'ArrowRight') { i = (i + 1) % fotos.length; show(); }
      if (e.key === 'ArrowLeft') { i = (i - 1 + fotos.length) % fotos.length; show(); }
    }
    lb.addEventListener('click', function (e) {
      if (e.target.closest('.gallery-nav--next')) { i = (i + 1) % fotos.length; show(); }
      else if (e.target.closest('.gallery-nav--prev')) { i = (i - 1 + fotos.length) % fotos.length; show(); }
      else if (e.target.closest('.lightbox-close') || e.target === lb) close();
    });
    swipe(lb, function () { i = (i + 1) % fotos.length; show(); }, function () { i = (i - 1 + fotos.length) % fotos.length; show(); });
    document.addEventListener('keydown', key);
    document.body.appendChild(lb); document.body.classList.add('no-scroll');
    show();
    requestAnimationFrame(function () { lb.classList.add('is-open'); lb.querySelector('.lightbox-close').focus(); });
  }

  // --- barra fija móvil con precio
  var bar = document.getElementById('mobileBar');
  if (bar) {
    bar.classList.add('mobile-bar--detail');
    bar.innerHTML = '<div class="mobile-bar-price"><small>' + esc(title) + '</small><strong>' + UI.price(v.precio) + '</strong></div>' +
      '<button class="mobile-bar-btn" data-action="call">' + icon('phone') + 'Llamar</button>' +
      '<button class="mobile-bar-btn mobile-bar-btn--wa" data-action="whatsapp" data-msg="' + esc(waMsg) + '">' + icon('whatsapp') + 'WhatsApp</button>';
  }
  var wf = document.querySelector('.wa-float');
  if (wf) wf.setAttribute('data-msg', waMsg);

  // --- similares
  try {
    var all = await Store.getVehicles();
    var sim = all.filter(function (x) { return x.id !== v.id && x.estado !== 'vendido'; })
      .map(function (x) {
        var s = (x.carroceria === v.carroceria ? 2 : 0) + (x.marca === v.marca ? 2 : 0) + (x.combustible === v.combustible ? 1 : 0) + (Math.abs((x.precio || 0) - (v.precio || 0)) < 6000 ? 1 : 0);
        return [s, x];
      }).sort(function (a, b) { return b[0] - a[0]; }).slice(0, 3).map(function (p) { return p[1]; });
    if (sim.length) {
      document.getElementById('similarGrid').innerHTML = sim.map(UI.vehicleCard).join('');
      document.getElementById('similares').hidden = false;
    }
  } catch (e) {}
})();
