/* ==========================================================================
   CAPA DE DATOS
   --------------------------------------------------------------------------
   Funciona en dos modos, detectados automáticamente:
   - "api":   la web se sirve con server.js → stock, fotos y solicitudes se
              guardan en el servidor (data/*.json y uploads/).
   - "local": la web se abre como estática (hosting simple o doble clic) →
              los cambios se guardan en el navegador (localStorage).
   ========================================================================== */
(function () {
  var KEY_VEH = 'ga_vehicles_v1';
  var KEY_LEADS = 'ga_leads_v1';
  var KEY_AUTH = 'ga_admin_token';
  var KEY_MODE = 'ga_mode';

  function lsGet(k, fb) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } }
  function lsSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); return true; }
    catch (e) { throw new Error('No hay espacio suficiente en el navegador para guardar. Reduce el número o tamaño de las fotos.'); }
  }
  function ssGet(k) { try { return sessionStorage.getItem(k); } catch (e) { return null; } }
  function ssSet(k, v) { try { v == null ? sessionStorage.removeItem(k) : sessionStorage.setItem(k, v); } catch (e) {} }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  var mode = null;
  var readyPromise = null;

  async function api(path, opts) {
    opts = opts || {};
    var headers = { 'Content-Type': 'application/json' };
    var t = ssGet(KEY_AUTH);
    if (t) headers.Authorization = 'Bearer ' + t;
    var res = await fetch('/api' + path, {
      method: opts.method || 'GET', headers: headers, cache: 'no-store',
      body: opts.body ? JSON.stringify(opts.body) : undefined
    });
    var data = null;
    try { data = await res.json(); } catch (e) {}
    if (!res.ok) {
      if (res.status === 401) ssSet(KEY_AUTH, null);
      throw new Error((data && data.error) || 'Error de servidor (' + res.status + ')');
    }
    return data;
  }

  function init() {
    if (readyPromise) return readyPromise;
    readyPromise = (async function () {
      var cached = ssGet(KEY_MODE);
      if (cached) { mode = cached; return mode; }
      if (location.protocol === 'file:') { mode = 'local'; }
      else {
        try {
          var ctrl = new AbortController();
          var to = setTimeout(function () { ctrl.abort(); }, 2500);
          var r = await fetch('/api/health', { cache: 'no-store', signal: ctrl.signal });
          clearTimeout(to);
          var j = r.ok ? await r.json() : null;
          mode = j && j.ok ? 'api' : 'local';
        } catch (e) { mode = 'local'; }
      }
      ssSet(KEY_MODE, mode);
      return mode;
    })();
    return readyPromise;
  }

  /* ---------- local helpers ---------- */
  function localVehicles() {
    var list = lsGet(KEY_VEH, null);
    if (!list) { list = clone(window.DEMO_VEHICLES || []); try { lsSet(KEY_VEH, list); } catch (e) {} }
    return list;
  }
  function nextId(list) {
    var max = 1000;
    list.forEach(function (v) { var n = parseInt(String(v.id).replace(/\D/g, ''), 10); if (n > max) max = n; });
    return 'GA-' + (max + 1);
  }

  var Store = {
    init: init,
    get mode() { return mode; },

    /* ---------------- Vehículos ---------------- */
    async getVehicles(opts) {
      await init();
      opts = opts || {};
      var list;
      if (mode === 'api') list = await api('/vehicles' + (opts.admin ? '?all=1' : ''));
      else list = localVehicles();
      if (!opts.admin) list = list.filter(function (v) { return !v.oculto; });
      return list;
    },
    async getVehicle(id, opts) {
      await init();
      opts = opts || {};
      if (mode === 'api') {
        try { return await api('/vehicles/' + encodeURIComponent(id) + (opts.admin ? '?all=1' : '')); }
        catch (e) { return null; }
      }
      var v = localVehicles().find(function (x) { return x.id === id; });
      if (!v || (v.oculto && !opts.admin)) return null;
      return v;
    },
    async saveVehicle(v) {
      await init();
      v = clone(v);
      v.actualizado = new Date().toISOString();
      if (mode === 'api') {
        return v.id ? api('/vehicles/' + encodeURIComponent(v.id), { method: 'PUT', body: v })
                    : api('/vehicles', { method: 'POST', body: v });
      }
      var list = localVehicles();
      if (!v.id) { v.id = nextId(list); v.creado = v.actualizado; list.unshift(v); }
      else {
        var i = list.findIndex(function (x) { return x.id === v.id; });
        if (i === -1) list.unshift(v); else list[i] = Object.assign({}, list[i], v);
      }
      lsSet(KEY_VEH, list);
      return v;
    },
    async patchVehicle(id, changes) {
      var v = await Store.getVehicle(id, { admin: true });
      if (!v) throw new Error('Vehículo no encontrado');
      return Store.saveVehicle(Object.assign(v, changes));
    },
    async deleteVehicle(id) {
      await init();
      if (mode === 'api') return api('/vehicles/' + encodeURIComponent(id), { method: 'DELETE' });
      lsSet(KEY_VEH, localVehicles().filter(function (x) { return x.id !== id; }));
      return { ok: true };
    },
    /** Recibe un dataURL (ya redimensionado) y devuelve la URL utilizable. */
    async uploadPhoto(dataUrl) {
      await init();
      if (mode === 'api') { var r = await api('/upload', { method: 'POST', body: { dataUrl: dataUrl } }); return r.url; }
      return dataUrl; // en modo local la foto se guarda embebida
    },

    /* ---------------- Solicitudes (leads) ---------------- */
    async addLead(lead) {
      await init();
      lead = Object.assign({}, lead, { fecha: new Date().toISOString(), estado: 'nuevo', pagina: location.pathname.split('/').pop() || 'index.html' });
      if (mode === 'api') return api('/leads', { method: 'POST', body: lead });
      var leads = lsGet(KEY_LEADS, []);
      lead.id = 'L' + Date.now().toString(36);
      leads.unshift(lead);
      lsSet(KEY_LEADS, leads);
      return lead;
    },
    async getLeads() {
      await init();
      if (mode === 'api') return api('/leads');
      return lsGet(KEY_LEADS, []);
    },
    async updateLead(id, changes) {
      await init();
      if (mode === 'api') return api('/leads/' + encodeURIComponent(id), { method: 'PUT', body: changes });
      var leads = lsGet(KEY_LEADS, []);
      leads = leads.map(function (l) { return l.id === id ? Object.assign(l, changes) : l; });
      lsSet(KEY_LEADS, leads);
      return { ok: true };
    },
    async deleteLead(id) {
      await init();
      if (mode === 'api') return api('/leads/' + encodeURIComponent(id), { method: 'DELETE' });
      lsSet(KEY_LEADS, lsGet(KEY_LEADS, []).filter(function (l) { return l.id !== id; }));
      return { ok: true };
    },

    /* ---------------- Administración ---------------- */
    async login(password) {
      await init();
      if (mode === 'api') {
        var r = await api('/login', { method: 'POST', body: { password: password } });
        ssSet(KEY_AUTH, r.token);
        return true;
      }
      if (password === (window.SITE && window.SITE.ADMIN_DEMO_PASSWORD)) { ssSet(KEY_AUTH, 'local'); return true; }
      throw new Error('Contraseña incorrecta');
    },
    logout() { ssSet(KEY_AUTH, null); },
    isAuthed() { return !!ssGet(KEY_AUTH); },
    async resetDemo() {
      await init();
      if (mode === 'api') return api('/reset', { method: 'POST' });
      lsSet(KEY_VEH, clone(window.DEMO_VEHICLES || []));
      return { ok: true };
    },
    async exportData() {
      return { exportado: new Date().toISOString(), vehiculos: await Store.getVehicles({ admin: true }), solicitudes: await Store.getLeads() };
    },
    async importVehicles(list) {
      await init();
      if (!Array.isArray(list)) throw new Error('Formato no válido');
      if (mode === 'api') return api('/import', { method: 'POST', body: { vehiculos: list } });
      lsSet(KEY_VEH, list);
      return { ok: true };
    }
  };

  window.Store = Store;
})();
