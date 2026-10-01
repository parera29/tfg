/* ==========================================================================
   UI COMÚN — cabecera, pie, iconos, tarjetas, WhatsApp, formularios, etc.
   ========================================================================== */
(function () {
  var S = window.SITE || {};
  var TBC = window.TBC || 'DATO A CONFIRMAR';

  /* ---------------- utilidades ---------------- */
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function group(n) { return String(Math.round(Math.abs(n))).replace(/\B(?=(\d{3})+(?!\d))/g, '.'); }
  function price(n) { return (n == null || n === '' || isNaN(n)) ? 'Consultar' : (n < 0 ? '-' : '') + group(n) + ' €'; }
  function money(n) {
    if (!isFinite(n)) return '—';
    var fixed = Math.abs(n).toFixed(2).split('.');
    return (n < 0 ? '-' : '') + group(fixed[0]) + ',' + fixed[1] + ' €';
  }
  function km(n) { return (n == null || n === '') ? '—' : group(n) + ' km'; }
  function tbc(v, label) { return v ? esc(v) : '<span class="tbc">[' + esc(label || TBC) + ']</span>'; }
  function qs(name) { return new URLSearchParams(location.search).get(name); }
  function slug(s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); }
  function monthly(P, rate, n) {
    P = +P; rate = +rate; n = +n;
    if (!(P > 0) || !(n > 0)) return 0;
    var r = rate / 1200;
    return r === 0 ? P / n : P * r / (1 - Math.pow(1 + r, -n));
  }

  /* ---------------- iconos (SVG en línea) ---------------- */
  var I = {
    phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
    whatsapp: '<path fill="currentColor" stroke="none" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.3-.4.8-1.4.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/>',
    menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
    close: '<path d="M18 6 6 18M6 6l12 12"/>',
    arrow: '<path d="M5 12h14M13 5l7 7-7 7"/>',
    chevL: '<path d="m15 18-6-6 6-6"/>', chevR: '<path d="m9 18 6-6-6-6"/>', chevD: '<path d="m6 9 6 6 6-6"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    filter: '<path d="M4 6h16M7 12h10M10 18h4"/>',
    calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
    gauge: '<path d="M12 14l4-4"/><path d="M3.3 19a10 10 0 1 1 17.4 0"/>',
    fuel: '<path d="M3 22V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v17M3 22h12M6 8h6M15 12h2a2 2 0 0 1 2 2v3a1.5 1.5 0 0 0 3 0V9l-3-3"/>',
    gear: '<circle cx="6" cy="6" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="18" cy="6" r="2"/><circle cx="6" cy="18" r="2"/><circle cx="12" cy="18" r="2"/><path d="M6 8v8M12 8v8M18 8v4H6"/>',
    bolt: '<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>',
    car: '<path d="M5 17h14M5 17a2 2 0 1 1-4 0v-5l2.5-5.5A2 2 0 0 1 5.3 5h13.4a2 2 0 0 1 1.8 1.5L23 12v5a2 2 0 1 1-4 0"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
    body: '<path d="M3 13l2-5h14l2 5M3 13h18v4H3zM6 17v2M18 17v2"/>',
    palette: '<circle cx="12" cy="12" r="9"/><circle cx="8" cy="10" r="1.2"/><circle cx="12" cy="7.5" r="1.2"/><circle cx="16" cy="10" r="1.2"/>',
    leaf: '<path d="M11 20A7 7 0 0 1 4 13c0-5 4-9 16-9 0 12-4 16-9 16z"/><path d="M4 20c4-4 7-6 11-8"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="m9 12 2 2 4-4"/>',
    key: '<circle cx="7.5" cy="15.5" r="4.5"/><path d="m10.7 12.3 9.3-9.3M17 6l3 3M15 8l2 2"/>',
    euro: '<path d="M18 7a7 7 0 1 0 0 10M4 10h10M4 14h10"/>',
    check: '<path d="M20 6 9 17l-5-5"/>',
    mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 6-10 7L2 6"/>',
    pin: '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
    tag: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L2 12V2h10l8.6 8.6a2 2 0 0 1 0 2.8z"/><circle cx="7" cy="7" r="1.5"/>',
    eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/>',
    eyeOff: '<path d="M17.9 17.9A10.1 10.1 0 0 1 12 20c-7 0-11-8-11-8a18.5 18.5 0 0 1 5.1-5.9M9.9 4.2A9.1 9.1 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.2 3.2M1 1l22 22"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/>',
    edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
    trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
    upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
    image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/>',
    users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/>',
    handshake: '<path d="m11 17 2 2a1 1 0 0 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 0 0 3-3l-3.9-3.9a3 3 0 0 0-4.2 0l-.9.9a1 1 0 0 1-3-3l2.8-2.8a5.8 5.8 0 0 1 7 .9L21 8M3 13l6.5 6.5a1 1 0 0 0 3-3M3 4h8"/>',
    swap: '<path d="M7 16V4M3 8l4-4 4 4M17 8v12M21 16l-4 4-4-4"/>',
    steering: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2"/><path d="M12 14v7M10 12H3M14 12h7"/>',
    sparkle: '<path d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"/>',
    instagram: '<rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.5" cy="6.5" r=".5"/>',
    facebook: '<path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/>',
    expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 16v-4M12 8h.01"/>',
    grid: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>',
    inbox: '<path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.5 5.1 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.5-6.9A2 2 0 0 0 16.8 4H7.2a2 2 0 0 0-1.7 1.1z"/>',
    download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
    refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.5 9a9 9 0 0 1 14.8-3.4L23 10M1 14l4.7 4.4A9 9 0 0 0 20.5 15"/>'
  };
  function icon(name, cls) {
    return '<svg class="ico ' + (cls || '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (I[name] || '') + '</svg>';
  }

  /* ---------------- imágenes ---------------- */
  var PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1b1f26"/><stop offset="1" stop-color="#0c0e12"/></linearGradient></defs>' +
    '<rect width="800" height="500" fill="url(#g)"/><g fill="none" stroke="#c9a35c" stroke-width="5" stroke-linejoin="round" opacity=".85">' +
    '<path d="M150 300 L185 240 Q205 205 260 198 L360 192 Q400 150 470 150 L545 154 Q590 160 620 205 L655 238 Q680 246 680 275 L680 300 Z"/>' +
    '<circle cx="250" cy="305" r="38" fill="#0c0e12"/><circle cx="575" cy="305" r="38" fill="#0c0e12"/></g>' +
    '<text x="400" y="410" fill="#8a8f98" font-family="Arial,sans-serif" font-size="24" text-anchor="middle" letter-spacing="3">GABRIEL AUTOMOCIÓN</text></svg>');

  function isUnsplash(u) { return /images\.unsplash\.com/.test(u || ''); }
  function imgUrl(u, w) { return isUnsplash(u) ? u + (u.indexOf('?') > -1 ? '&' : '?') + 'auto=format&fit=crop&q=70&w=' + w : u; }
  function img(src, alt, opts) {
    opts = opts || {};
    if (!src) return '<img src="' + PLACEHOLDER + '" alt="' + esc(alt) + '" class="' + (opts.cls || '') + '">';
    var srcset = isUnsplash(src) ? ' srcset="' + [480, 800, 1200, 1600].map(function (w) { return esc(imgUrl(src, w)) + ' ' + w + 'w'; }).join(', ') + '" sizes="' + (opts.sizes || '(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 33vw') + '"' : '';
    return '<img src="' + esc(imgUrl(src, opts.w || 800)) + '"' + srcset + ' alt="' + esc(alt) + '"' +
      (opts.eager ? ' fetchpriority="high"' : ' loading="lazy"') + ' decoding="async" class="' + (opts.cls || '') + '" onerror="UI.imgFallback(this)">';
  }
  function imgFallback(el) { el.onerror = null; el.removeAttribute('srcset'); el.src = PLACEHOLDER; el.classList.add('is-fallback'); }

  /* ---------------- vehículos ---------------- */
  function title(v) { return [v.marca, v.modelo].filter(Boolean).join(' '); }
  function etiquetaBadge(e) {
    if (!e) return '';
    var key = slug(e).replace(/\s+/g, '');
    return '<span class="eco eco--' + esc(key) + '" title="Etiqueta ambiental DGT: ' + esc(e) + '">' + esc(e === 'Sin etiqueta' ? 'Sin' : e) + '</span>';
  }
  function statusBadge(v) {
    if (v.estado === 'vendido') return '<span class="ribbon ribbon--sold">Vendido</span>';
    if (v.estado === 'reservado') return '<span class="ribbon ribbon--reserved">Reservado</span>';
    return '';
  }
  function vehicleCard(v) {
    var url = 'vehiculo.html?id=' + encodeURIComponent(v.id);
    var foto = (v.fotos || [])[0];
    return '<article class="vcard' + (v.estado === 'vendido' ? ' is-sold' : '') + '">' +
      '<a class="vcard-media" href="' + url + '" aria-label="Ver ' + esc(title(v)) + '">' +
        img(foto, title(v) + ' ' + (v.version || ''), { sizes: '(max-width: 640px) 100vw, (max-width: 1100px) 50vw, 400px' }) +
        '<span class="vcard-badges">' + (v.tipo ? '<span class="chip chip--light">' + esc(v.tipo) + '</span>' : '') +
          (v.precioAnterior && v.precioAnterior > v.precio ? '<span class="chip chip--accent">Rebajado</span>' : '') + '</span>' +
        statusBadge(v) +
        ((v.fotos || []).length > 1 ? '<span class="vcard-count">' + icon('image') + v.fotos.length + '</span>' : '') +
      '</a>' +
      '<div class="vcard-body">' +
        '<div class="vcard-head"><div><p class="vcard-brand">' + esc(v.marca) + '</p>' +
          '<h3 class="vcard-title"><a href="' + url + '">' + esc(v.modelo) + '</a></h3>' +
          '<p class="vcard-version">' + esc(v.version || '') + '</p></div>' + etiquetaBadge(v.etiqueta) + '</div>' +
        '<ul class="vcard-specs">' +
          '<li>' + icon('calendar') + esc(v.anio || '—') + '</li>' +
          '<li>' + icon('gauge') + km(v.km) + '</li>' +
          '<li>' + icon('fuel') + esc(v.combustible || '—') + '</li>' +
          '<li>' + icon('gear') + esc(v.cambio || '—') + '</li>' +
        '</ul>' +
        '<div class="vcard-foot"><div class="vcard-price">' +
          (v.precioAnterior && v.precioAnterior > v.precio ? '<s>' + price(v.precioAnterior) + '</s>' : '') +
          '<strong>' + price(v.precio) + '</strong></div>' +
          '<a class="btn btn--dark btn--sm" href="' + url + '">Ver vehículo ' + icon('arrow') + '</a></div>' +
        (v.demo ? '<p class="demo-note">Vehículo de demostración · imagen ilustrativa</p>' : '') +
      '</div></article>';
  }
  function skeletonCards(n) {
    var s = '';
    for (var i = 0; i < n; i++) s += '<div class="vcard vcard--skeleton"><div class="sk sk-media"></div><div class="vcard-body"><div class="sk sk-line w40"></div><div class="sk sk-line w70"></div><div class="sk sk-line w90"></div></div></div>';
    return s;
  }
  // vendidos al final
  function sortAvailableFirst(a, b) { return (a.estado === 'vendido') - (b.estado === 'vendido'); }

  /* ---------------- contacto: WhatsApp y llamada ---------------- */
  function defaultWaMsg() { return 'Hola, he visto la web de ' + S.NAME + ' y me gustaría recibir más información.'; }
  function vehicleWaMsg(v) { return 'Hola, estoy interesado en el ' + title(v) + ' que he visto en la web de ' + S.NAME + '. Me gustaría recibir más información.'; }
  function waLink(msg) {
    var n = String(S.WHATSAPP_NUMBER || '').replace(/\D/g, '');
    return 'https://wa.me/' + n + '?text=' + encodeURIComponent(msg || defaultWaMsg());
  }
  function openWhatsApp(msg) {
    msg = msg || defaultWaMsg();
    if (String(S.WHATSAPP_NUMBER || '').replace(/\D/g, '')) { window.open(waLink(msg), '_blank', 'noopener'); return; }
    modal({
      title: 'WhatsApp pendiente de configurar',
      html: '<p>El número de WhatsApp del concesionario aún no está configurado <span class="tbc">[' + TBC + ']</span>. ' +
        'Se define en la variable <code>WHATSAPP_NUMBER</code> de <code>js/config.js</code>.</p>' +
        '<p class="muted small">Mensaje que se enviará automáticamente:</p><blockquote class="wa-preview">' + esc(msg) + '</blockquote>',
      actions: '<a class="btn btn--wa" target="_blank" rel="noopener" href="' + esc(waLink(msg)) + '">' + icon('whatsapp') + 'Probar mensaje en WhatsApp</a>'
    });
  }
  function call() {
    if (S.PHONE) { location.href = 'tel:' + String(S.PHONE).replace(/[^\d+]/g, ''); return; }
    modal({
      title: 'Teléfono pendiente de configurar',
      html: '<p>Teléfono del concesionario: <span class="tbc">[' + TBC + ']</span></p><p class="muted small">Se define en la variable <code>PHONE</code> de <code>js/config.js</code>. Al configurarlo, este botón iniciará la llamada directamente desde el móvil.</p>'
    });
  }

  /* ---------------- modal y avisos ---------------- */
  function modal(o) {
    var wrap = document.createElement('div');
    wrap.className = 'modal' + (o.wide ? ' modal--wide' : '');
    wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true');
    wrap.innerHTML = '<div class="modal-backdrop" data-close></div><div class="modal-card">' +
      '<button class="modal-x" data-close aria-label="Cerrar">' + icon('close') + '</button>' +
      (o.title ? '<h3 class="modal-title">' + esc(o.title) + '</h3>' : '') +
      '<div class="modal-body">' + (o.html || '') + '</div>' +
      (o.actions !== false ? '<div class="modal-actions">' + (o.actions || '') + '<button class="btn btn--ghost" data-close>' + (o.closeLabel || 'Cerrar') + '</button></div>' : '') + '</div>';
    var prevFocus = document.activeElement;
    function close() { wrap.classList.remove('is-open'); document.body.classList.remove('no-scroll'); setTimeout(function () { wrap.remove(); }, 200); document.removeEventListener('keydown', onKey); if (prevFocus) prevFocus.focus(); if (o.onClose) o.onClose(); }
    function onKey(e) { if (e.key === 'Escape') close(); }
    wrap.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(wrap);
    document.body.classList.add('no-scroll');
    requestAnimationFrame(function () { wrap.classList.add('is-open'); var f = wrap.querySelector('.modal-card [autofocus], .modal-actions .btn'); if (f) f.focus(); });
    return { el: wrap, close: close };
  }
  function toast(msg, type) {
    var host = document.getElementById('toasts');
    if (!host) { host = document.createElement('div'); host.id = 'toasts'; document.body.appendChild(host); }
    var t = document.createElement('div');
    t.className = 'toast toast--' + (type || 'ok');
    t.innerHTML = icon(type === 'error' ? 'info' : 'check') + '<span>' + esc(msg) + '</span>';
    host.appendChild(t);
    setTimeout(function () { t.classList.add('is-out'); setTimeout(function () { t.remove(); }, 300); }, 3800);
  }
  function confirmDialog(text, okLabel) {
    return new Promise(function (resolve) {
      var done = false;
      var m = modal({ title: 'Confirmar', html: '<p>' + esc(text) + '</p>', closeLabel: 'Cancelar',
        actions: '<button class="btn btn--danger" data-ok>' + esc(okLabel || 'Confirmar') + '</button>',
        onClose: function () { if (!done) resolve(false); } });
      m.el.querySelector('[data-ok]').addEventListener('click', function () { done = true; resolve(true); m.close(); });
    });
  }

  /* ---------------- layout ---------------- */
  var NAV = [
    ['index.html', 'Inicio', 'home'],
    ['vehiculos.html', 'Vehículos', 'vehiculos', [['vehiculos.html', 'Todo el stock'], ['ocasion.html', 'Vehículos de ocasión'], ['vehiculos.html?tipo=Km%200', 'Km 0'], ['vehiculos.html?tipo=Seminuevo', 'Seminuevos']]],
    ['financiacion.html', 'Financiación', 'financiacion'],
    ['servicios.html', 'Servicios', 'servicios'],
    ['nosotros.html', 'Nosotros', 'nosotros'],
    ['contacto.html', 'Contacto', 'contacto']
  ];
  function logo(light) {
    return '<a class="logo' + (light ? ' logo--light' : '') + '" href="index.html" aria-label="' + esc(S.NAME) + ' — Inicio">' +
      '<span class="logo-mark" aria-hidden="true"><svg viewBox="0 0 40 40"><path d="M29 13.5A11 11 0 1 0 31 22H20" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round"/></svg></span>' +
      '<span class="logo-text"><strong>GABRIEL</strong><small>AUTOMOCIÓN</small></span></a>';
  }
  function renderLayout() {
    var page = document.body.getAttribute('data-page') || '';
    var activeKey = page === 'detalle' || page === 'ocasion' ? 'vehiculos' : page;

    if (S.DEMO_MODE) {
      var bar = document.createElement('div');
      bar.className = 'demo-bar';
      bar.innerHTML = '<span>' + icon('info') + 'Web de demostración · Vehículos y datos de ejemplo, no corresponden al stock real.</span>';
      document.body.prepend(bar);
    }

    var h = document.getElementById('app-header');
    if (h) {
      var links = NAV.map(function (n) {
        var act = n[2] === activeKey ? ' is-active' : '';
        if (!n[3]) return '<li><a class="nav-link' + act + '" href="' + n[0] + '">' + n[1] + '</a></li>';
        return '<li class="has-sub"><a class="nav-link' + act + '" href="' + n[0] + '">' + n[1] + icon('chevD', 'ico-sm') + '</a>' +
          '<ul class="subnav">' + n[3].map(function (s) { return '<li><a href="' + s[0] + '">' + s[1] + '</a></li>'; }).join('') + '</ul></li>';
      }).join('');
      h.outerHTML = '<header class="site-header" id="siteHeader"><div class="container header-inner">' + logo() +
        '<nav class="main-nav" aria-label="Principal"><ul>' + links + '</ul></nav>' +
        '<div class="header-actions"><button class="icon-btn hide-mobile" data-action="call" aria-label="Llamar">' + icon('phone') + '</button>' +
        '<a class="btn btn--primary btn--sm hide-xs" href="vehiculos.html">Ver vehículos</a>' +
        '<button class="nav-toggle" aria-label="Abrir menú" aria-expanded="false" aria-controls="mobileMenu">' + icon('menu') + '</button></div></div></header>' +
        '<div class="mobile-menu" id="mobileMenu" aria-hidden="true"><div class="mobile-menu-inner"><nav><ul>' +
        NAV.map(function (n) {
          var r = '<li><a class="' + (n[2] === activeKey ? 'is-active' : '') + '" href="' + n[0] + '">' + n[1] + icon('chevR') + '</a></li>';
          if (n[3]) r += '<li><a class="sub" href="ocasion.html">Vehículos de ocasión' + icon('chevR') + '</a></li>';
          return r;
        }).join('') + '</ul></nav>' +
        '<div class="mobile-menu-cta"><a class="btn btn--primary btn--block" href="vehiculos.html">Ver vehículos</a>' +
        '<button class="btn btn--wa btn--block" data-action="whatsapp">' + icon('whatsapp') + 'Hablar por WhatsApp</button>' +
        '<button class="btn btn--outline btn--block" data-action="call">' + icon('phone') + 'Llamar</button></div>' +
        '<p class="mobile-menu-meta">' + icon('clock') + tbc(S.SCHEDULE, 'Horario: ' + TBC) + '</p></div></div>';
    }

    var f = document.getElementById('app-footer');
    if (f) {
      var year = new Date().getFullYear();
      f.outerHTML = '<footer class="site-footer"><div class="container">' +
        '<div class="footer-cta"><div><h2>¿Has visto un vehículo que te interesa?</h2><p>Escríbenos y te atendemos de forma personalizada.</p></div>' +
        '<div class="footer-cta-actions"><button class="btn btn--wa" data-action="whatsapp">' + icon('whatsapp') + 'WhatsApp</button><a class="btn btn--outline-light" href="contacto.html">Contactar</a></div></div>' +
        '<div class="footer-grid">' +
          '<div class="footer-brand">' + logo(true) + '<p>Compraventa de vehículos con atención personalizada y soluciones de financiación.</p>' +
            '<div class="social">' + (S.SOCIAL && S.SOCIAL.instagram ? '<a href="' + esc(S.SOCIAL.instagram) + '" aria-label="Instagram" target="_blank" rel="noopener">' + icon('instagram') + '</a>' : '') +
            (S.SOCIAL && S.SOCIAL.facebook ? '<a href="' + esc(S.SOCIAL.facebook) + '" aria-label="Facebook" target="_blank" rel="noopener">' + icon('facebook') + '</a>' : '') +
            (!(S.SOCIAL && (S.SOCIAL.instagram || S.SOCIAL.facebook)) ? '<span class="tbc">[Redes sociales: ' + TBC + ']</span>' : '') + '</div></div>' +
          '<div><h4>Vehículos</h4><ul><li><a href="vehiculos.html">Todo el stock</a></li><li><a href="ocasion.html">Vehículos de ocasión</a></li><li><a href="vehiculos.html?tipo=Km%200">Km 0</a></li><li><a href="vehiculos.html?tipo=Seminuevo">Seminuevos</a></li><li><a href="vehiculos.html?combustible=H%C3%ADbrido">Híbridos</a></li></ul></div>' +
          '<div><h4>Empresa</h4><ul><li><a href="financiacion.html">Financiación</a></li><li><a href="servicios.html">Servicios</a></li><li><a href="nosotros.html">Sobre nosotros</a></li><li><a href="contacto.html">Contacto</a></li></ul></div>' +
          '<div><h4>Contacto</h4><ul class="footer-contact">' +
            '<li>' + icon('phone') + '<span>' + tbc(S.PHONE_DISPLAY || S.PHONE) + '</span></li>' +
            '<li>' + icon('whatsapp') + '<span>' + tbc(S.WHATSAPP_NUMBER) + '</span></li>' +
            '<li>' + icon('mail') + '<span>' + tbc(S.EMAIL) + '</span></li>' +
            '<li>' + icon('pin') + '<span>' + tbc(S.ADDRESS) + '</span></li>' +
            '<li>' + icon('clock') + '<span>' + tbc(S.SCHEDULE) + '</span></li></ul></div>' +
        '</div>' +
        '<div class="footer-bottom"><p>© ' + year + ' ' + esc(S.NAME) + '. Todos los derechos reservados.</p>' +
          '<ul><li><a href="aviso-legal.html">Aviso legal</a></li><li><a href="privacidad.html">Privacidad</a></li><li><a href="cookies.html">Cookies</a></li><li><a href="admin.html" rel="nofollow">Acceso gestión</a></li></ul></div>' +
      '</div></footer>' +
      '<button class="wa-float" data-action="whatsapp" aria-label="Hablar por WhatsApp">' + icon('whatsapp') + '<span>¿Hablamos?</span></button>' +
      '<div class="mobile-bar" id="mobileBar"><button class="mobile-bar-btn" data-action="call">' + icon('phone') + 'Llamar</button>' +
        '<button class="mobile-bar-btn mobile-bar-btn--wa" data-action="whatsapp">' + icon('whatsapp') + 'WhatsApp</button></div>';
    }

    bindHeader();
    cookieBanner();
  }

  function bindHeader() {
    var header = document.getElementById('siteHeader');
    var menu = document.getElementById('mobileMenu');
    var toggle = document.querySelector('.nav-toggle');
    if (toggle && menu) {
      toggle.addEventListener('click', function () {
        var open = !document.body.classList.contains('menu-open');
        document.body.classList.toggle('menu-open', open);
        toggle.setAttribute('aria-expanded', String(open));
        menu.setAttribute('aria-hidden', String(!open));
        toggle.innerHTML = icon(open ? 'close' : 'menu');
      });
      menu.addEventListener('click', function (e) { if (e.target.closest('a')) document.body.classList.remove('menu-open'); });
    }
    if (header) {
      var onScroll = function () { header.classList.toggle('is-scrolled', window.scrollY > 24); };
      onScroll();
      window.addEventListener('scroll', onScroll, { passive: true });
    }
  }

  function cookieBanner() {
    var k = 'ga_cookie_consent';
    var v = null;
    try { v = localStorage.getItem(k); } catch (e) {}
    if (v) return;
    var el = document.createElement('div');
    el.className = 'cookie-banner';
    el.setAttribute('role', 'region'); el.setAttribute('aria-label', 'Aviso de cookies');
    el.innerHTML = '<p>Utilizamos almacenamiento técnico necesario para el funcionamiento de la web y, si lo aceptas, servicios de terceros (como mapas). ' +
      '<a href="cookies.html">Más información</a>.</p><div class="cookie-actions"><button class="btn btn--ghost btn--sm" data-c="rejected">Rechazar</button><button class="btn btn--primary btn--sm" data-c="accepted">Aceptar</button></div>';
    el.addEventListener('click', function (e) {
      var b = e.target.closest('[data-c]'); if (!b) return;
      try { localStorage.setItem(k, b.getAttribute('data-c')); } catch (err) {}
      el.classList.add('is-out'); setTimeout(function () { el.remove(); }, 300);
      document.dispatchEvent(new CustomEvent('cookieconsent', { detail: b.getAttribute('data-c') }));
    });
    document.body.appendChild(el);
  }
  function cookiesAccepted() { try { return localStorage.getItem('ga_cookie_consent') === 'accepted'; } catch (e) { return false; } }

  /* ---------------- acciones globales ---------------- */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-action]');
    if (!a) return;
    var act = a.getAttribute('data-action');
    if (act === 'whatsapp') { e.preventDefault(); openWhatsApp(a.getAttribute('data-msg')); }
    else if (act === 'call') { e.preventDefault(); call(); }
  });

  /* ---------------- formularios de contacto ---------------- */
  var EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  function setErr(field, msg) {
    var wrap = field.closest('.field') || field.parentElement;
    var e = wrap.querySelector(':scope > .field-error');
    if (!msg) { wrap.classList.remove('has-error'); if (e) e.remove(); return; }
    wrap.classList.add('has-error');
    if (!e) { e = document.createElement('span'); e.className = 'field-error'; wrap.appendChild(e); }
    e.textContent = msg;
  }
  function validateForm(form) {
    var ok = true, first = null;
    form.querySelectorAll('[name]').forEach(function (f) {
      if (f.classList.contains('hp')) return;
      var val = (f.type === 'checkbox') ? f.checked : String(f.value || '').trim();
      var msg = '';
      if (f.required && !val) msg = f.type === 'checkbox' ? 'Debes aceptar la política de privacidad.' : 'Este campo es obligatorio.';
      else if (val && f.type === 'email' && !EMAIL_RE.test(val)) msg = 'Introduce un email válido.';
      else if (val && f.type === 'tel' && String(val).replace(/\D/g, '').length < 9) msg = 'Introduce un teléfono válido.';
      setErr(f, msg);
      if (msg) { ok = false; if (!first) first = f; }
    });
    if (first) first.focus();
    return ok;
  }
  function bindLeadForm(form, getExtra) {
    if (!form || form.__bound) return;
    form.__bound = true;
    form.setAttribute('novalidate', '');
    form.addEventListener('input', function (e) { if (e.target.closest('.has-error')) setErr(e.target, ''); });
    form.addEventListener('change', function (e) { if (e.target.type === 'checkbox') setErr(e.target, ''); });
    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      if (form.querySelector('[name="website"]') && form.querySelector('[name="website"]').value) return; // anti-spam
      if (!validateForm(form)) return;
      var data = {};
      new FormData(form).forEach(function (v, k) { if (k !== 'website') data[k] = typeof v === 'string' ? v.trim() : v; });
      data.privacidad = !!data.privacidad;
      data.tipo = form.getAttribute('data-lead') || 'contacto';
      if (getExtra) Object.assign(data, getExtra());
      var btn = form.querySelector('[type="submit"]');
      var label = btn.innerHTML;
      btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Enviando…';
      try {
        await window.Store.addLead(data);
        form.innerHTML = '<div class="form-success">' + icon('check') + '<h3>¡Solicitud enviada!</h3>' +
          '<p>Gracias, ' + esc(data.nombre || '') + '. Hemos recibido tu solicitud y nos pondremos en contacto contigo lo antes posible.</p>' +
          '<button type="button" class="btn btn--wa" data-action="whatsapp"' + (data.vehiculoTitulo ? ' data-msg="' + esc('Hola, estoy interesado en el ' + data.vehiculoTitulo + ' que he visto en la web de ' + S.NAME + '. Me gustaría recibir más información.') + '"' : '') + '>' + icon('whatsapp') + 'También por WhatsApp</button></div>';
      } catch (err) {
        btn.disabled = false; btn.innerHTML = label;
        toast(err.message || 'No se ha podido enviar. Inténtalo de nuevo.', 'error');
      }
    });
  }
  function privacyCheckbox() {
    return '<label class="check field"><input type="checkbox" name="privacidad" required><span>He leído y acepto la <a href="privacidad.html" target="_blank">política de privacidad</a>.</span></label>' +
      '<input type="text" name="website" class="hp" tabindex="-1" autocomplete="off" aria-hidden="true">';
  }

  /* ---------------- animaciones al hacer scroll ---------------- */
  function reveal(root) {
    var els = (root || document).querySelectorAll('.reveal:not(.is-in)');
    if (!('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      els.forEach(function (e) { e.classList.add('is-in'); }); return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('is-in'); io.unobserve(en.target); } });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.05 });
    els.forEach(function (e) { io.observe(e); });
  }

  /* ---------------- rellenar datos de contacto en páginas ---------------- */
  function fillSiteData() {
    var map = {
      phone: S.PHONE_DISPLAY || S.PHONE, whatsapp: S.WHATSAPP_NUMBER, email: S.EMAIL, address: S.ADDRESS, schedule: S.SCHEDULE,
      'legal-owner': S.LEGAL && S.LEGAL.OWNER, 'legal-nif': S.LEGAL && S.LEGAL.NIF, 'legal-address': S.LEGAL && S.LEGAL.ADDRESS,
      'legal-registry': S.LEGAL && S.LEGAL.REGISTRY, 'legal-email': (S.LEGAL && S.LEGAL.EMAIL) || S.EMAIL,
      'legal-domain': S.LEGAL && S.LEGAL.DOMAIN, 'legal-updated': S.LEGAL && S.LEGAL.UPDATED, name: S.NAME
    };
    document.querySelectorAll('[data-site]').forEach(function (el) { el.innerHTML = tbc(map[el.getAttribute('data-site')]); });
  }

  window.UI = {
    esc: esc, price: price, money: money, km: km, tbc: tbc, qs: qs, slug: slug, monthly: monthly, group: group,
    icon: icon, img: img, imgUrl: imgUrl, imgFallback: imgFallback, PLACEHOLDER: PLACEHOLDER,
    title: title, vehicleCard: vehicleCard, skeletonCards: skeletonCards, etiquetaBadge: etiquetaBadge, statusBadge: statusBadge, sortAvailableFirst: sortAvailableFirst,
    vehicleWaMsg: vehicleWaMsg, openWhatsApp: openWhatsApp, call: call,
    modal: modal, toast: toast, confirm: confirmDialog,
    bindLeadForm: bindLeadForm, privacyCheckbox: privacyCheckbox, validateForm: validateForm, reveal: reveal, cookiesAccepted: cookiesAccepted
  };

  /* ---------------- arranque ---------------- */
  function hydrateIcons(root) {
    (root || document).querySelectorAll('[data-icon]').forEach(function (el) {
      el.insertAdjacentHTML('afterbegin', icon(el.getAttribute('data-icon')));
      el.removeAttribute('data-icon');
    });
  }
  window.UI.hydrateIcons = hydrateIcons;
  if (document.body.getAttribute('data-page') !== 'admin') renderLayout();
  fillSiteData();
  hydrateIcons();
  document.querySelectorAll('[data-privacy]').forEach(function (el) { el.outerHTML = privacyCheckbox(); });
  document.querySelectorAll('form[data-lead]').forEach(function (f) { bindLeadForm(f); });
  reveal();
  if (window.Store) window.Store.init();
})();
