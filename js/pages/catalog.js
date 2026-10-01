/* Catálogo de vehículos (vehiculos.html y ocasion.html) */
(async function () {
  var isOcasion = document.body.getAttribute('data-page') === 'ocasion';
  var form = document.getElementById('filterForm');
  var results = document.getElementById('results');
  var countEl = document.getElementById('resultCount');
  var chipsEl = document.getElementById('activeChips');
  var sortEl = document.getElementById('sort');
  var FIELDS = ['marca', 'modelo', 'precioMin', 'precioMax', 'kmMax', 'anioMin', 'combustible', 'cambio', 'carroceria', 'tipo', 'vendidos'];
  var LABELS = { marca: '', modelo: '', precioMin: 'Desde ', precioMax: 'Hasta ', kmMax: 'Hasta ', anioMin: 'Desde ', combustible: '', cambio: '', carroceria: '', tipo: '', vendidos: '' };

  results.innerHTML = UI.skeletonCards(6);

  var all = [];
  try { all = await Store.getVehicles(); } catch (e) { UI.toast('No se ha podido cargar el stock.', 'error'); }
  if (isOcasion) all = all.filter(function (v) { return v.tipo === 'Ocasión'; });

  function uniq(arr) { return arr.filter(function (x, i) { return x && arr.indexOf(x) === i; }); }
  function fillSelect(name, values, first) {
    var sel = form.elements[name];
    if (!sel || sel.tagName !== 'SELECT') return;
    var cur = sel.value;
    sel.innerHTML = '<option value="">' + first + '</option>' + values.map(function (v) { return '<option value="' + UI.esc(v) + '">' + UI.esc(v) + '</option>'; }).join('');
    sel.value = values.map(String).indexOf(cur) > -1 ? cur : '';
  }
  var alpha = function (a, b) { return String(a).localeCompare(String(b), 'es'); };
  fillSelect('marca', uniq(all.map(function (v) { return v.marca; })).sort(alpha), 'Todas');
  fillSelect('combustible', uniq(all.map(function (v) { return v.combustible; })).sort(alpha), 'Todos');
  fillSelect('carroceria', uniq(all.map(function (v) { return v.carroceria; })).sort(alpha), 'Todas');
  var years = uniq(all.map(function (v) { return v.anio; })).sort(function (a, b) { return b - a; });
  var anioSel = form.elements.anioMin;
  anioSel.innerHTML = '<option value="">Cualquiera</option>' + years.map(function (y) { return '<option value="' + y + '">Desde ' + y + '</option>'; }).join('');

  function refreshModels() {
    var m = form.elements.marca.value;
    var models = uniq(all.filter(function (v) { return !m || v.marca === m; }).map(function (v) { return v.modelo; })).sort(alpha);
    fillSelect('modelo', models, 'Todos');
  }

  // --- estado desde la URL
  function setField(name, val) {
    var el = form.elements[name];
    if (!el) return;
    if (el instanceof RadioNodeList) { Array.prototype.forEach.call(el, function (r) { r.checked = r.value === (val || ''); }); }
    else if (el.type === 'checkbox') el.checked = !!val;
    else {
      if (el.tagName === 'SELECT' && val && !Array.prototype.some.call(el.options, function (o) { return o.value === val; })) {
        el.insertAdjacentHTML('beforeend', '<option value="' + UI.esc(val) + '">' + UI.esc(val) + '</option>');
      }
      el.value = val || '';
    }
  }
  var params = new URLSearchParams(location.search);
  setField('marca', params.get('marca'));
  refreshModels();
  FIELDS.forEach(function (f) { if (f !== 'marca') setField(f, params.get(f)); });
  if (params.get('orden')) sortEl.value = params.get('orden');

  function readFilters() {
    var f = {};
    FIELDS.forEach(function (n) {
      var el = form.elements[n];
      if (!el) return;
      var v = el.type === 'checkbox' ? (el.checked ? '1' : '') : el.value;
      if (v) f[n] = v;
    });
    return f;
  }
  function match(v, f) {
    if (!f.vendidos && v.estado === 'vendido') return false;
    if (f.marca && v.marca !== f.marca) return false;
    if (f.modelo && v.modelo !== f.modelo) return false;
    if (f.precioMin && !(v.precio >= +f.precioMin)) return false;
    if (f.precioMax && !(v.precio <= +f.precioMax)) return false;
    if (f.kmMax && !(v.km <= +f.kmMax)) return false;
    if (f.anioMin && !(v.anio >= +f.anioMin)) return false;
    if (f.combustible && v.combustible !== f.combustible) return false;
    if (f.cambio && v.cambio !== f.cambio) return false;
    if (f.carroceria && v.carroceria !== f.carroceria) return false;
    if (f.tipo && v.tipo !== f.tipo) return false;
    return true;
  }
  var SORTS = {
    'recientes': function (a, b) { return (b.anio || 0) - (a.anio || 0) || String(b.creado || '').localeCompare(String(a.creado || '')); },
    'precio-asc': function (a, b) { return (a.precio || 0) - (b.precio || 0); },
    'precio-desc': function (a, b) { return (b.precio || 0) - (a.precio || 0); },
    'km-asc': function (a, b) { return (a.km || 0) - (b.km || 0); }
  };
  function chipLabel(k, v) {
    if (k === 'precioMin' || k === 'precioMax') return LABELS[k] + UI.price(+v);
    if (k === 'kmMax') return LABELS[k] + UI.km(+v);
    if (k === 'anioMin') return LABELS[k] + v;
    if (k === 'vendidos') return 'Incluye vendidos';
    return v;
  }

  function render() {
    var f = readFilters();
    var order = sortEl.value || 'recientes';
    var list = all.filter(function (v) { return match(v, f); }).sort(SORTS[order] || SORTS.recientes);
    if (f.vendidos) list.sort(UI.sortAvailableFirst);
    var n = list.length;
    countEl.innerHTML = '<span>' + n + '</span> ' + (n === 1 ? 'vehículo encontrado' : 'vehículos encontrados');
    var apply = document.getElementById('filtersApply');
    if (apply) apply.textContent = 'Ver ' + n + (n === 1 ? ' vehículo' : ' vehículos');
    results.innerHTML = n ? list.map(UI.vehicleCard).join('')
      : '<div class="empty-state">' + UI.icon('search') + '<h3>No hay vehículos con estos filtros</h3><p class="muted">Prueba a ampliar la búsqueda o cuéntanos qué buscas y te avisamos.</p>' +
        '<div class="hero-actions" style="justify-content:center"><button class="btn btn--dark" id="clearAll">Limpiar filtros</button><button class="btn btn--wa" data-action="whatsapp" data-msg="Hola, estoy buscando un vehículo y no lo encuentro en la web de Gabriel Automoción. ¿Podéis ayudarme?">' + UI.icon('whatsapp') + 'Te ayudamos</button></div></div>';
    chipsEl.innerHTML = Object.keys(f).map(function (k) {
      return '<button class="active-chip" data-clear="' + k + '">' + UI.esc(chipLabel(k, f[k])) + UI.icon('close') + '</button>';
    }).join('');
    // URL compartible
    var p = new URLSearchParams(f);
    if (order !== 'recientes') p.set('orden', order);
    history.replaceState(null, '', location.pathname + (p.toString() ? '?' + p.toString() : ''));
  }

  function clearAll() { form.reset(); refreshModels(); render(); }
  form.addEventListener('change', function (e) { if (e.target.name === 'marca') { form.elements.modelo.value = ''; refreshModels(); } render(); });
  sortEl.addEventListener('change', render);
  document.getElementById('filtersReset').addEventListener('click', clearAll);
  chipsEl.addEventListener('click', function (e) {
    var b = e.target.closest('[data-clear]'); if (!b) return;
    var k = b.getAttribute('data-clear');
    setField(k, '');
    if (k === 'marca') { form.elements.modelo.value = ''; refreshModels(); }
    render();
  });
  results.addEventListener('click', function (e) { if (e.target.closest('#clearAll')) clearAll(); });

  // --- panel de filtros en móvil
  document.getElementById('filtersOpen').addEventListener('click', function () { document.body.classList.add('filters-open-state', 'no-scroll'); });
  document.addEventListener('click', function (e) {
    if (e.target.closest('[data-filters-close]')) document.body.classList.remove('filters-open-state', 'no-scroll');
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') document.body.classList.remove('filters-open-state', 'no-scroll'); });

  render();
})();
