/* Página de financiación: calculadora orientativa + formulario */
(async function () {
  var F = SITE.FINANCE;
  var $ = function (id) { return document.getElementById(id); };
  var term = F.DEFAULT_TERM;

  $('terms').innerHTML = F.TERMS.map(function (t) {
    return '<label><input type="radio" name="plazo" value="' + t + '"' + (t === term ? ' checked' : '') + '><span>' + t + ' m</span></label>';
  }).join('');
  $('c-rate').value = F.DEFAULT_RATE;

  // valores desde la ficha del vehículo (?importe=&vehiculo=)
  var imp = +UI.qs('importe');
  if (imp > 0) { $('c-price').value = imp; $('c-down').value = 0; $('ff-imp').value = imp; }

  function paint(range) {
    var p = (range.value - range.min) / (range.max - range.min) * 100;
    range.style.setProperty('--p', Math.max(0, Math.min(100, p)) + '%');
  }
  function sync(from) {
    var price = Math.max(0, +$('c-price').value || 0);
    if (from === 'r-price') { price = +$('r-price').value; $('c-price').value = price; }
    $('r-price').max = Math.max(100000, price);
    $('r-price').value = price;
    $('r-down').max = Math.max(price, 0);
    var down = Math.max(0, +$('c-down').value || 0);
    if (from === 'r-down') { down = +$('r-down').value; $('c-down').value = down; }
    if (down > price) { down = price; $('c-down').value = down; }
    $('r-down').value = down;
    paint($('r-price')); paint($('r-down'));

    var rate = Math.max(0, +$('c-rate').value || 0);
    var amount = price - down;
    var q = UI.monthly(amount, rate, term);
    $('o-price').textContent = UI.price(price);
    $('o-down').textContent = UI.price(down);
    $('o-quota').textContent = amount > 0 ? UI.money(q) : '—';
    $('o-amount').textContent = UI.money(amount);
    $('o-term').textContent = term + ' meses';
    $('o-rate').textContent = String(rate).replace('.', ',') + ' %';
    $('o-total').textContent = amount > 0 ? UI.money(q * term) : '—';
    $('o-int').textContent = amount > 0 ? UI.money(q * term - amount) : '—';
  }
  $('calc').addEventListener('input', function (e) {
    if (e.target.name === 'plazo') term = +e.target.value;
    sync(e.target.id);
  });
  sync();

  // formulario: listado de vehículos disponibles
  var sel = $('ff-veh');
  try {
    var list = (await Store.getVehicles()).filter(function (v) { return v.estado !== 'vendido'; });
    sel.insertAdjacentHTML('beforeend', list.map(function (v) {
      var t = UI.title(v) + (v.version ? ' ' + v.version : '');
      return '<option value="' + UI.esc(t) + '">' + UI.esc(t) + ' — ' + UI.price(v.precio) + '</option>';
    }).join(''));
  } catch (e) {}
  var pre = UI.qs('vehiculo');
  if (pre) {
    if (!Array.prototype.some.call(sel.options, function (o) { return o.value === pre; })) sel.insertAdjacentHTML('beforeend', '<option>' + UI.esc(pre) + '</option>');
    sel.value = pre;
  }
})();
