/* Página de inicio: destacados, buscador rápido y accesos por categoría */
(async function () {
  var featuredEl = document.getElementById('featured');
  featuredEl.innerHTML = UI.skeletonCards(6);

  var all = [];
  try { all = await Store.getVehicles(); } catch (e) { UI.toast('No se ha podido cargar el stock.', 'error'); }
  var available = all.filter(function (v) { return v.estado !== 'vendido'; });

  // --- Destacados (máx. 6). Si hay menos de 6 marcados, se completa con los más recientes.
  var featured = available.filter(function (v) { return v.destacado; });
  if (featured.length < 6) {
    featured = featured.concat(available.filter(function (v) { return !v.destacado; })
      .sort(function (a, b) { return (b.creado || '').localeCompare(a.creado || ''); })).slice(0, 6);
  }
  featured = featured.slice(0, 6);
  featuredEl.innerHTML = featured.length ? featured.map(UI.vehicleCard).join('')
    : '<div class="empty-state">' + UI.icon('car') + '<h3>Próximamente nuevo stock</h3><p class="muted">Contacta con nosotros para conocer los vehículos disponibles.</p></div>';

  // --- Buscador rápido
  function uniq(arr) { return arr.filter(function (x, i) { return x && arr.indexOf(x) === i; }).sort(function (a, b) { return a.localeCompare(b, 'es'); }); }
  var selMarca = document.getElementById('qs-marca');
  var selModelo = document.getElementById('qs-modelo');
  var selComb = document.getElementById('qs-comb');
  function opts(sel, values, first) {
    sel.innerHTML = '<option value="">' + first + '</option>' + values.map(function (v) { return '<option>' + UI.esc(v) + '</option>'; }).join('');
  }
  opts(selMarca, uniq(available.map(function (v) { return v.marca; })), 'Todas');
  opts(selComb, uniq(available.map(function (v) { return v.combustible; })), 'Todos');
  selMarca.addEventListener('change', function () {
    var m = selMarca.value;
    opts(selModelo, uniq(available.filter(function (v) { return v.marca === m; }).map(function (v) { return v.modelo; })), 'Todos');
    selModelo.disabled = !m;
  });
  document.getElementById('quickSearch').addEventListener('submit', function (e) {
    e.preventDefault();
    var p = new URLSearchParams();
    new FormData(e.target).forEach(function (v, k) { if (v) p.set(k, v); });
    location.href = 'vehiculos.html' + (p.toString() ? '?' + p.toString() : '');
  });

  // --- Tipos de carrocería y marcas
  function counts(key) {
    var c = {};
    available.forEach(function (v) { if (v[key]) c[v[key]] = (c[v[key]] || 0) + 1; });
    return Object.keys(c).sort(function (a, b) { return c[b] - c[a]; }).map(function (k) { return [k, c[k]]; });
  }
  document.getElementById('bodyTypes').innerHTML = counts('carroceria').map(function (x) {
    return '<a class="brand-pill" href="vehiculos.html?carroceria=' + encodeURIComponent(x[0]) + '">' + UI.icon('car') + UI.esc(x[0]) + ' <small>' + x[1] + '</small></a>';
  }).join('') + counts('combustible').map(function (x) {
    return '<a class="brand-pill" href="vehiculos.html?combustible=' + encodeURIComponent(x[0]) + '">' + UI.icon(x[0] === 'Eléctrico' ? 'bolt' : 'fuel') + UI.esc(x[0]) + ' <small>' + x[1] + '</small></a>';
  }).join('');
  document.getElementById('brands').innerHTML = counts('marca').map(function (x) {
    return '<a class="brand-pill" href="vehiculos.html?marca=' + encodeURIComponent(x[0]) + '">' + UI.esc(x[0]) + ' <small>' + x[1] + '</small></a>';
  }).join('');

  // --- Teaser de cuota (orientativo)
  var q = UI.monthly(20000, SITE.FINANCE.DEFAULT_RATE, 60);
  document.getElementById('teaserQuota').innerHTML = UI.money(q) + '<small style="display:inline;font-size:.9rem"> /mes</small>';

  UI.reveal();
})();
