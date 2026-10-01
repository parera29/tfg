/* ==========================================================================
   Panel de administración — gestión del stock y de las solicitudes
   ========================================================================== */
(async function () {
  var esc = UI.esc, icon = UI.icon;
  var $ = function (id) { return document.getElementById(id); };
  var mode = await Store.init();
  var vehicles = [];
  var leads = [];

  /* ---------------- acceso ---------------- */
  function showLogin() {
    $('app').hidden = true; $('login').hidden = false;
    $('loginHint').innerHTML = mode === 'local'
      ? 'Modo demostración (sin servidor). Contraseña de prueba: <strong>' + esc(SITE.ADMIN_DEMO_PASSWORD) + '</strong>'
      : '';
    setTimeout(function () { $('pw').focus(); }, 50);
  }
  $('loginForm').addEventListener('submit', async function (e) {
    e.preventDefault();
    var btn = e.target.querySelector('button');
    btn.disabled = true;
    try { await Store.login($('pw').value); $('pw').value = ''; await start(); }
    catch (err) { UI.toast(err.message, 'error'); $('pw').select(); }
    btn.disabled = false;
  });
  $('logout').addEventListener('click', function () { Store.logout(); showLogin(); });

  async function start() {
    $('login').hidden = true; $('app').hidden = false;
    $('modeBanner').innerHTML = mode === 'api'
      ? icon('check') + '<span><strong>Conectado al servidor.</strong> Los cambios se guardan para todos los visitantes de la web.</span>'
      : icon('info') + '<span><strong>Modo demostración sin servidor.</strong> Los cambios se guardan solo en este navegador. Para publicar cambios reales, ejecuta la web con <code>server.js</code> (ver README).</span>';
    $('modeBanner').className = 'mode-banner mode-banner--' + mode;
    if (mode === 'api') {
      // comprueba que la sesión sigue siendo válida (p. ej. tras reiniciar el servidor)
      try { await Store.getLeads(); } catch (e) { Store.logout(); showLogin(); return; }
    }
    await Promise.all([loadVehicles(), loadLeads()]);
    renderSettings();
  }

  async function guard(fn) {
    try { return await fn(); }
    catch (err) {
      UI.toast(err.message || 'Se ha producido un error', 'error');
      if (/Sesión/.test(err.message)) showLogin();
      throw err;
    }
  }

  /* ---------------- navegación ---------------- */
  document.querySelector('.admin-nav').addEventListener('click', function (e) {
    var b = e.target.closest('[data-view]'); if (!b) return;
    document.querySelectorAll('.admin-nav [data-view]').forEach(function (x) { x.classList.toggle('is-active', x === b); });
    document.querySelectorAll('[data-panel]').forEach(function (p) { p.hidden = p.getAttribute('data-panel') !== b.getAttribute('data-view'); });
    if (b.getAttribute('data-view') === 'leads') loadLeads();
    window.scrollTo(0, 0);
  });

  /* ---------------- stock ---------------- */
  async function loadVehicles() {
    vehicles = await guard(function () { return Store.getVehicles({ admin: true }); });
    renderStats(); renderList(); fillDatalists();
  }
  function renderStats() {
    var c = function (fn) { return vehicles.filter(fn).length; };
    var items = [
      ['Total', vehicles.length, ''], ['Disponibles', c(function (v) { return v.estado === 'disponible' && !v.oculto; }), 'disponible'],
      ['Reservados', c(function (v) { return v.estado === 'reservado'; }), 'reservado'], ['Vendidos', c(function (v) { return v.estado === 'vendido'; }), 'vendido'],
      ['Destacados', c(function (v) { return v.destacado; }), 'destacado'], ['Ocultos', c(function (v) { return v.oculto; }), 'oculto']
    ];
    $('stats').innerHTML = items.map(function (s) {
      return '<button class="stat" data-filter="' + s[2] + '"><strong>' + s[1] + '</strong><span>' + s[0] + '</span></button>';
    }).join('');
  }
  $('stats').addEventListener('click', function (e) {
    var b = e.target.closest('[data-filter]'); if (!b) return;
    $('fEstado').value = b.getAttribute('data-filter'); renderList();
  });
  $('q').addEventListener('input', renderList);
  $('fEstado').addEventListener('change', renderList);

  function renderList() {
    var q = UI.slug($('q').value.trim());
    var f = $('fEstado').value;
    var list = vehicles.filter(function (v) {
      if (q && UI.slug([v.id, v.marca, v.modelo, v.version, v.color, v.anio].join(' ')).indexOf(q) === -1) return false;
      if (f === 'oculto') return v.oculto;
      if (f === 'destacado') return v.destacado;
      if (f) return v.estado === f;
      return true;
    });
    if (!list.length) {
      $('vlist').innerHTML = '<div class="empty-state">' + icon('car') + '<h3>' + (vehicles.length ? 'Ningún vehículo coincide con la búsqueda' : 'Todavía no hay vehículos') + '</h3>' +
        '<button class="btn btn--primary" data-act="new">' + icon('plus') + 'Añadir vehículo</button></div>';
      return;
    }
    $('vlist').innerHTML = list.map(function (v) {
      var foto = (v.fotos || [])[0];
      return '<article class="vrow' + (v.oculto ? ' is-hidden' : '') + '" data-id="' + esc(v.id) + '">' +
        '<div class="vrow-img">' + UI.img(foto, '', { w: 320, sizes: '160px' }) + (v.demo ? '<span class="demo-tag">DEMO</span>' : '') + '</div>' +
        '<div class="vrow-info">' +
          '<p class="vrow-ref">' + esc(v.id) + (v.tipo ? ' · ' + esc(v.tipo) : '') + (v.oculto ? ' · <span class="hidden-tag">' + icon('eyeOff') + 'Oculto</span>' : '') + '</p>' +
          '<h3>' + esc(UI.title(v)) + ' <span>' + esc(v.version || '') + '</span></h3>' +
          '<p class="vrow-meta">' + esc(v.anio || '—') + ' · ' + UI.km(v.km) + ' · ' + esc(v.combustible || '') + ' · ' + esc(v.cambio || '') + ' · ' + (v.fotos || []).length + ' fotos</p>' +
        '</div>' +
        '<div class="vrow-price"><label class="sr-only" for="p-' + esc(v.id) + '">Precio</label>' +
          '<div class="input-suffix"><input class="input input--sm" id="p-' + esc(v.id) + '" type="number" min="0" step="100" value="' + (v.precio == null ? '' : v.precio) + '" data-act="price"><span>€</span></div>' +
          (v.precioAnterior ? '<small>Antes: ' + UI.price(v.precioAnterior) + '</small>' : '') + '</div>' +
        '<div class="vrow-state"><select class="select select--sm state-' + esc(v.estado) + '" data-act="estado" aria-label="Estado">' +
          ['disponible', 'reservado', 'vendido'].map(function (s) { return '<option value="' + s + '"' + (v.estado === s ? ' selected' : '') + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>'; }).join('') +
        '</select></div>' +
        '<div class="vrow-actions">' +
          '<button class="act' + (v.destacado ? ' is-on' : '') + '" data-act="destacado" title="' + (v.destacado ? 'Quitar de destacados' : 'Marcar como destacado') + '" aria-pressed="' + !!v.destacado + '">' + icon('star') + '<span>Destacar</span></button>' +
          '<button class="act' + (v.oculto ? ' is-on' : '') + '" data-act="oculto" title="' + (v.oculto ? 'Mostrar en la web' : 'Ocultar de la web') + '" aria-pressed="' + !!v.oculto + '">' + icon(v.oculto ? 'eyeOff' : 'eye') + '<span>' + (v.oculto ? 'Mostrar' : 'Ocultar') + '</span></button>' +
          '<a class="act" href="vehiculo.html?id=' + encodeURIComponent(v.id) + '" target="_blank" title="Ver en la web">' + icon('expand') + '<span>Ver</span></a>' +
          '<button class="act" data-act="edit" title="Editar">' + icon('edit') + '<span>Editar</span></button>' +
          '<button class="act act--danger" data-act="delete" title="Eliminar">' + icon('trash') + '<span>Eliminar</span></button>' +
        '</div></article>';
    }).join('');
  }

  function findV(id) { return vehicles.find(function (v) { return v.id === id; }); }
  async function patch(id, changes, msg) {
    var v = findV(id); if (!v) return;
    var saved = await guard(function () { return Store.saveVehicle(Object.assign({}, v, changes)); });
    Object.assign(v, saved || changes);
    renderStats(); renderList();
    if (msg) UI.toast(msg);
  }

  $('vlist').addEventListener('click', async function (e) {
    var b = e.target.closest('[data-act]'); if (!b || b.tagName === 'SELECT' || b.tagName === 'INPUT') return;
    var act = b.getAttribute('data-act');
    if (act === 'new') return openEditor(null);
    var row = b.closest('[data-id]'); if (!row) return;
    var id = row.getAttribute('data-id');
    var v = findV(id);
    if (act === 'edit') openEditor(v);
    else if (act === 'destacado') patch(id, { destacado: !v.destacado }, v.destacado ? 'Quitado de destacados' : 'Marcado como destacado');
    else if (act === 'oculto') patch(id, { oculto: !v.oculto }, v.oculto ? 'Vehículo visible en la web' : 'Vehículo oculto');
    else if (act === 'delete') {
      if (!(await UI.confirm('¿Eliminar definitivamente el ' + UI.title(v) + ' (' + v.id + ')? Esta acción no se puede deshacer.', 'Eliminar'))) return;
      await guard(function () { return Store.deleteVehicle(id); });
      vehicles = vehicles.filter(function (x) { return x.id !== id; });
      renderStats(); renderList(); UI.toast('Vehículo eliminado');
    }
  });
  $('vlist').addEventListener('change', function (e) {
    var el = e.target; var row = el.closest('[data-id]'); if (!row) return;
    var id = row.getAttribute('data-id');
    if (el.getAttribute('data-act') === 'estado') patch(id, { estado: el.value }, 'Estado actualizado: ' + el.value);
    if (el.getAttribute('data-act') === 'price') {
      var n = el.value === '' ? null : Math.max(0, Math.round(+el.value));
      var v = findV(id);
      var changes = { precio: n };
      // Si baja el precio, se guarda automáticamente el anterior para mostrarlo tachado
      if (v.precio && n && n < v.precio && !v.precioAnterior) changes.precioAnterior = v.precio;
      if (v.precioAnterior && n && n >= v.precioAnterior) changes.precioAnterior = null;
      patch(id, changes, 'Precio actualizado: ' + UI.price(n));
    }
  });
  $('vlist').addEventListener('keydown', function (e) { if (e.key === 'Enter' && e.target.getAttribute('data-act') === 'price') e.target.blur(); });
  $('addVehicle').addEventListener('click', function () { openEditor(null); });

  function fillDatalists() {
    var u = function (k) { return vehicles.map(function (v) { return v[k]; }).filter(function (x, i, a) { return x && a.indexOf(x) === i; }).sort(); };
    $('dl-marca').innerHTML = u('marca').map(function (m) { return '<option value="' + esc(m) + '">'; }).join('');
    $('dl-modelo').innerHTML = u('modelo').map(function (m) { return '<option value="' + esc(m) + '">'; }).join('');
  }

  /* ---------------- editor ---------------- */
  var form = $('vForm');
  var editing = null, photos = [], equip = [], dirty = false;

  function openEditor(v) {
    editing = v ? JSON.parse(JSON.stringify(v)) : { estado: 'disponible', tipo: 'Ocasión', combustible: 'Gasolina', cambio: 'Manual', carroceria: 'Compacto', etiqueta: 'C', destacado: false, oculto: false };
    form.reset();
    $('edTitle').textContent = v ? 'Editar ' + UI.title(v) : 'Nuevo vehículo';
    $('edId').textContent = v ? 'ID: ' + v.id + (v.demo ? ' · Vehículo DEMO' : '') : 'El ID se asignará automáticamente al guardar';
    ['marca', 'modelo', 'version', 'precio', 'precioAnterior', 'anio', 'km', 'potencia', 'color', 'descripcion'].forEach(function (k) {
      form.elements[k].value = editing[k] == null ? '' : editing[k];
    });
    ['tipo', 'combustible', 'cambio', 'carroceria', 'etiqueta', 'estado'].forEach(function (k) {
      var sel = form.elements[k];
      if (editing[k] && !Array.prototype.some.call(sel.options, function (o) { return o.value === editing[k]; })) sel.insertAdjacentHTML('beforeend', '<option>' + esc(editing[k]) + '</option>');
      if (editing[k]) sel.value = editing[k];
    });
    form.elements.destacado.checked = !!editing.destacado;
    form.elements.oculto.checked = !!editing.oculto;
    photos = (editing.fotos || []).slice();
    equip = (editing.equipamiento || []).slice();
    renderPhotos(); renderEquip();
    form.querySelectorAll('.has-error').forEach(function (x) { x.classList.remove('has-error'); });
    form.querySelectorAll('.field-error').forEach(function (x) { x.remove(); });
    $('editor').hidden = false;
    document.body.classList.add('no-scroll');
    requestAnimationFrame(function () { $('editor').classList.add('is-open'); });
    form.querySelector('.editor-body').scrollTop = 0;
    dirty = false;
    if (!v) setTimeout(function () { form.elements.marca.focus(); }, 250);
  }
  async function closeEditor(force) {
    if (!force && dirty && !(await UI.confirm('Hay cambios sin guardar. ¿Salir sin guardar?', 'Salir sin guardar'))) return;
    $('editor').classList.remove('is-open');
    document.body.classList.remove('no-scroll');
    setTimeout(function () { $('editor').hidden = true; }, 250);
  }
  $('editor').addEventListener('click', function (e) { if (e.target.closest('[data-editor-close]')) closeEditor(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && !$('editor').hidden && !document.querySelector('.modal')) closeEditor(); });
  form.addEventListener('input', function () { dirty = true; });

  // --- fotos
  function renderPhotos() {
    $('photos').innerHTML = photos.map(function (p, i) {
      return '<div class="photo' + (i === 0 ? ' is-main' : '') + '" data-i="' + i + '">' + UI.img(p, 'Foto ' + (i + 1), { w: 320, sizes: '160px' }) +
        (i === 0 ? '<span class="photo-main">Principal</span>' : '') +
        '<div class="photo-tools">' +
          (i > 0 ? '<button type="button" data-ph="main" title="Usar como principal">' + icon('star') + '</button><button type="button" data-ph="left" title="Mover a la izquierda">' + icon('chevL') + '</button>' : '') +
          (i < photos.length - 1 ? '<button type="button" data-ph="right" title="Mover a la derecha">' + icon('chevR') + '</button>' : '') +
          '<button type="button" data-ph="del" class="danger" title="Eliminar foto">' + icon('trash') + '</button>' +
        '</div></div>';
    }).join('') || '<p class="muted small" style="margin:0">Aún no hay fotos. Se mostrará una imagen genérica hasta que añadas alguna.</p>';
  }
  $('photos').addEventListener('click', function (e) {
    var b = e.target.closest('[data-ph]'); if (!b) return;
    var i = +b.closest('[data-i]').getAttribute('data-i');
    var a = b.getAttribute('data-ph');
    if (a === 'del') photos.splice(i, 1);
    if (a === 'main') photos.unshift(photos.splice(i, 1)[0]);
    if (a === 'left') photos.splice(i - 1, 0, photos.splice(i, 1)[0]);
    if (a === 'right') photos.splice(i + 1, 0, photos.splice(i, 1)[0]);
    dirty = true; renderPhotos();
  });

  function resize(file) {
    var max = mode === 'api' ? 1800 : 1280;
    var q = mode === 'api' ? 0.84 : 0.72;
    return new Promise(function (resolve, reject) {
      if (!/^image\//.test(file.type)) return reject(new Error(file.name + ' no es una imagen'));
      var url = URL.createObjectURL(file);
      var im = new Image();
      im.onload = function () {
        var s = Math.min(1, max / Math.max(im.width, im.height));
        var c = document.createElement('canvas');
        c.width = Math.round(im.width * s); c.height = Math.round(im.height * s);
        var ctx = c.getContext('2d');
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(im, 0, 0, c.width, c.height);
        URL.revokeObjectURL(url);
        resolve(c.toDataURL('image/jpeg', q));
      };
      im.onerror = function () { URL.revokeObjectURL(url); reject(new Error('No se ha podido leer ' + file.name)); };
      im.src = url;
    });
  }
  async function addFiles(files) {
    files = Array.prototype.slice.call(files || []);
    if (!files.length) return;
    var dz = $('dropzone');
    dz.classList.add('is-busy');
    var ok = 0;
    for (var i = 0; i < files.length; i++) {
      dz.querySelector('strong').textContent = 'Procesando foto ' + (i + 1) + ' de ' + files.length + '…';
      try {
        var data = await resize(files[i]);
        var url = await guard(function () { return Store.uploadPhoto(data); });
        photos.push(url); ok++; dirty = true; renderPhotos();
      } catch (err) { if (!/Sesión/.test(err.message)) UI.toast(err.message, 'error'); }
    }
    dz.classList.remove('is-busy');
    dz.querySelector('strong').textContent = 'Arrastra aquí las fotos o pulsa para seleccionarlas';
    if (ok) UI.toast(ok + (ok === 1 ? ' foto añadida' : ' fotos añadidas'));
  }
  $('photoInput').addEventListener('change', function (e) { addFiles(e.target.files); e.target.value = ''; });
  ['dragenter', 'dragover'].forEach(function (ev) { $('dropzone').addEventListener(ev, function (e) { e.preventDefault(); $('dropzone').classList.add('is-over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { $('dropzone').addEventListener(ev, function (e) { e.preventDefault(); $('dropzone').classList.remove('is-over'); }); });
  $('dropzone').addEventListener('drop', function (e) { addFiles(e.dataTransfer.files); });

  // --- equipamiento
  function renderEquip() {
    $('equipTags').innerHTML = equip.map(function (t, i) {
      return '<span class="tag">' + esc(t) + '<button type="button" data-i="' + i + '" aria-label="Quitar ' + esc(t) + '">' + icon('close') + '</button></span>';
    }).join('') || '<p class="muted small" style="margin:0">Sin elementos de equipamiento.</p>';
  }
  function addEquip(text) {
    text.split(/\n|,|;/).map(function (s) { return s.trim(); }).filter(Boolean).forEach(function (s) {
      if (equip.map(function (x) { return x.toLowerCase(); }).indexOf(s.toLowerCase()) === -1) equip.push(s);
    });
    dirty = true; renderEquip();
  }
  $('equipInput').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') { e.preventDefault(); addEquip(e.target.value); e.target.value = ''; }
  });
  $('equipAdd').addEventListener('click', function () { addEquip($('equipInput').value); $('equipInput').value = ''; $('equipInput').focus(); });
  $('equipBulkAdd').addEventListener('click', function () { addEquip($('equipBulk').value); $('equipBulk').value = ''; });
  $('equipTags').addEventListener('click', function (e) {
    var b = e.target.closest('[data-i]'); if (!b) return;
    equip.splice(+b.getAttribute('data-i'), 1); dirty = true; renderEquip();
  });

  // --- guardar
  form.addEventListener('submit', async function (e) {
    e.preventDefault();
    if ($('equipInput').value.trim()) { addEquip($('equipInput').value); $('equipInput').value = ''; }
    if (!UI.validateForm(form)) { UI.toast('Revisa los campos obligatorios', 'error'); return; }
    var num = function (k) { var x = form.elements[k].value; return x === '' ? null : Number(x); };
    var data = Object.assign({}, editing, {
      marca: form.elements.marca.value.trim(), modelo: form.elements.modelo.value.trim(), version: form.elements.version.value.trim(),
      precio: num('precio'), precioAnterior: num('precioAnterior'), anio: num('anio'), km: num('km'), potencia: num('potencia'),
      tipo: form.elements.tipo.value, combustible: form.elements.combustible.value, cambio: form.elements.cambio.value,
      carroceria: form.elements.carroceria.value, color: form.elements.color.value.trim(), etiqueta: form.elements.etiqueta.value,
      estado: form.elements.estado.value, destacado: form.elements.destacado.checked, oculto: form.elements.oculto.checked,
      descripcion: form.elements.descripcion.value.trim(), equipamiento: equip.slice(), fotos: photos.slice()
    });
    var btn = $('saveBtn');
    btn.disabled = true; btn.innerHTML = '<span class="spinner"></span>Guardando…';
    try {
      var saved = await guard(function () { return Store.saveVehicle(data); });
      var i = vehicles.findIndex(function (v) { return v.id === saved.id; });
      if (i === -1) vehicles.unshift(saved); else vehicles[i] = saved;
      renderStats(); renderList(); fillDatalists();
      UI.toast(editing.id ? 'Cambios guardados' : 'Vehículo añadido (' + saved.id + ')');
      closeEditor(true);
    } catch (err) {}
    btn.disabled = false; btn.textContent = 'Guardar vehículo';
  });

  /* ---------------- solicitudes ---------------- */
  var TIPOS = { vehiculo: 'Vehículo', financiacion: 'Financiación', contacto: 'Contacto' };
  async function loadLeads() {
    try { leads = await Store.getLeads(); } catch (e) { leads = []; }
    var n = leads.filter(function (l) { return l.estado === 'nuevo'; }).length;
    $('leadBadge').hidden = !n; $('leadBadge').textContent = n;
    renderLeads();
  }
  $('fLead').addEventListener('change', renderLeads);
  function renderLeads() {
    var f = $('fLead').value;
    var list = leads.filter(function (l) { return !f || l.estado === f; });
    if (!list.length) {
      $('leadList').innerHTML = '<div class="empty-state">' + icon('inbox') + '<h3>No hay solicitudes' + (f ? ' con este estado' : ' todavía') + '</h3><p class="muted">Las solicitudes enviadas desde los formularios de la web aparecerán aquí.</p></div>';
      return;
    }
    $('leadList').innerHTML = list.map(function (l) {
      var d = new Date(l.fecha);
      var tel = String(l.telefono || '').replace(/[^\d+]/g, '');
      var waNum = tel.replace(/\D/g, '');
      if (waNum.length === 9) waNum = '34' + waNum;
      return '<article class="lead lead--' + esc(l.estado) + '" data-id="' + esc(l.id) + '">' +
        '<div class="lead-top"><div><span class="chip chip--soft">' + esc(TIPOS[l.tipo] || l.tipo || 'Contacto') + (l.motivo ? ' · ' + esc(l.motivo) : '') + (l.asunto ? ' · ' + esc(l.asunto) : '') + '</span>' +
          '<h3>' + esc(l.nombre) + '</h3><p class="muted small">' + d.toLocaleDateString('es-ES') + ' · ' + d.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + '</p></div>' +
          '<select class="select select--sm" data-lead-state aria-label="Estado de la solicitud">' +
            ['nuevo', 'contactado', 'cerrado'].map(function (s) { return '<option value="' + s + '"' + (l.estado === s ? ' selected' : '') + '>' + s.charAt(0).toUpperCase() + s.slice(1) + '</option>'; }).join('') +
          '</select></div>' +
        (l.vehiculoTitulo ? '<p class="lead-veh">' + icon('car') + (l.vehiculoId ? '<a href="vehiculo.html?id=' + encodeURIComponent(l.vehiculoId) + '" target="_blank">' + esc(l.vehiculoTitulo) + '</a>' : esc(l.vehiculoTitulo)) + '</p>' : '') +
        (l.importe ? '<p class="lead-veh">' + icon('euro') + 'Importe aproximado: ' + UI.price(+l.importe) + '</p>' : '') +
        (l.mensaje ? '<p class="lead-msg">' + esc(l.mensaje) + '</p>' : '') +
        '<div class="lead-actions">' +
          (tel ? '<a class="btn btn--outline btn--sm" href="tel:' + esc(tel) + '">' + icon('phone') + esc(l.telefono) + '</a>' : '') +
          (waNum ? '<a class="btn btn--wa btn--sm" target="_blank" rel="noopener" href="https://wa.me/' + waNum + '?text=' + encodeURIComponent('Hola ' + (l.nombre || '') + ', te escribimos de ' + SITE.NAME + ' en relación con tu solicitud.') + '">' + icon('whatsapp') + 'WhatsApp</a>' : '') +
          (l.email ? '<a class="btn btn--outline btn--sm" href="mailto:' + esc(l.email) + '">' + icon('mail') + esc(l.email) + '</a>' : '') +
          '<button class="btn btn--ghost btn--sm" data-lead-del>' + icon('trash') + 'Eliminar</button>' +
        '</div></article>';
    }).join('');
  }
  $('leadList').addEventListener('change', async function (e) {
    if (!e.target.matches('[data-lead-state]')) return;
    var id = e.target.closest('[data-id]').getAttribute('data-id');
    await guard(function () { return Store.updateLead(id, { estado: e.target.value }); });
    UI.toast('Solicitud marcada como ' + e.target.value);
    loadLeads();
  });
  $('leadList').addEventListener('click', async function (e) {
    if (!e.target.closest('[data-lead-del]')) return;
    var id = e.target.closest('[data-id]').getAttribute('data-id');
    if (!(await UI.confirm('¿Eliminar esta solicitud?', 'Eliminar'))) return;
    await guard(function () { return Store.deleteLead(id); });
    UI.toast('Solicitud eliminada'); loadLeads();
  });

  /* ---------------- ajustes ---------------- */
  function renderSettings() {
    var rows = [['WhatsApp (WHATSAPP_NUMBER)', SITE.WHATSAPP_NUMBER], ['Teléfono (PHONE)', SITE.PHONE], ['Email (EMAIL)', SITE.EMAIL],
      ['Dirección (ADDRESS)', SITE.ADDRESS], ['Horario (SCHEDULE)', SITE.SCHEDULE], ['Mapa (MAP_EMBED_URL)', SITE.MAP_EMBED_URL ? 'Configurado' : ''],
      ['Titular legal (LEGAL.OWNER)', SITE.LEGAL.OWNER], ['NIF/CIF (LEGAL.NIF)', SITE.LEGAL.NIF]];
    $('cfgList').innerHTML = rows.map(function (r) { return '<div><dt>' + esc(r[0]) + '</dt><dd>' + UI.tbc(r[1]) + '</dd></div>'; }).join('');
  }
  $('exportBtn').addEventListener('click', async function () {
    var data = await guard(Store.exportData);
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'gabriel-automocion-copia-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $('importFile').addEventListener('change', async function (e) {
    var file = e.target.files[0]; e.target.value = '';
    if (!file) return;
    try {
      var json = JSON.parse(await file.text());
      var list = Array.isArray(json) ? json : json.vehiculos;
      if (!Array.isArray(list)) throw new Error('El archivo no contiene un stock válido');
      if (!(await UI.confirm('Se sustituirá el stock actual por ' + list.length + ' vehículos de la copia. ¿Continuar?', 'Restaurar'))) return;
      await guard(function () { return Store.importVehicles(list); });
      await loadVehicles(); UI.toast('Stock restaurado');
    } catch (err) { UI.toast(err.message || 'Archivo no válido', 'error'); }
  });
  $('resetBtn').addEventListener('click', async function () {
    if (!(await UI.confirm('Se sustituirá todo el stock por los vehículos de demostración. ¿Continuar?', 'Restablecer'))) return;
    await guard(Store.resetDemo);
    await loadVehicles(); UI.toast('Stock de demostración restablecido');
  });

  /* ---------------- arranque ---------------- */
  if (Store.isAuthed()) {
    try { await start(); } catch (e) { showLogin(); }
  } else showLogin();
})();
