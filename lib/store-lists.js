/* ==========================================================================
   Almacén sencillo sobre dos listas (vehículos y solicitudes)
   --------------------------------------------------------------------------
   Lo usa server.js cuando no hay base de datos: guarda las listas en
   data/vehicles.json y data/leads.json. Ofrece las mismas operaciones que
   lib/store-pg.js, así lib/api.js funciona igual con los dos.
   ========================================================================== */
'use strict';
const crypto = require('crypto');
const demo = require('./demo');

function nextId(list) {
  let max = 1000;
  for (const v of list) { const n = parseInt(String(v.id).replace(/\D/g, ''), 10); if (n > max) max = n; }
  return 'GA-' + (max + 1);
}

/** io = { getVehicles, setVehicles, getLeads, setLeads } (lectura/escritura de las listas). */
function createListStore(io) {
  async function vehicles() {
    let list = await io.getVehicles();
    if (!Array.isArray(list)) { list = demo.load(); await io.setVehicles(list); }
    return list;
  }
  async function leads() { const l = await io.getLeads(); return Array.isArray(l) ? l : []; }

  return {
    async listVehicles(includeHidden) {
      const list = await vehicles();
      return includeHidden ? list : list.filter((v) => !v.oculto);
    },
    async getVehicle(id) { return (await vehicles()).find((v) => v.id === id) || null; },
    async createVehicle(v) {
      const list = await vehicles();
      v = Object.assign({}, v, { id: nextId(list) });
      v.creado = v.actualizado;
      list.unshift(v);
      await io.setVehicles(list);
      return v;
    },
    async updateVehicle(id, v) {
      const list = await vehicles();
      const i = list.findIndex((x) => x.id === id);
      if (i === -1) return null;
      list[i] = Object.assign({}, v, { id, creado: list[i].creado });
      await io.setVehicles(list);
      return list[i];
    },
    async deleteVehicle(id) {
      const list = await vehicles();
      const i = list.findIndex((x) => x.id === id);
      if (i === -1) return false;
      list.splice(i, 1);
      await io.setVehicles(list);
      return true;
    },
    async replaceVehicles(list) {
      const seen = new Set();
      list.forEach((v) => { if (!v.id || seen.has(v.id)) v.id = null; else seen.add(v.id); });
      list.forEach((v) => { if (!v.id) v.id = nextId(list); });
      await io.setVehicles(list);
    },
    async photosInUse(urls) {
      const used = new Set();
      (await vehicles()).forEach((v) => (v.fotos || []).forEach((f) => used.add(f)));
      return new Set(urls.filter((u) => used.has(u)));
    },

    async listLeads() { return leads(); },
    async addLead(lead) {
      const list = await leads();
      lead = Object.assign({ id: 'L' + Date.now().toString(36) + crypto.randomBytes(2).toString('hex') }, lead);
      list.unshift(lead);
      await io.setLeads(list.slice(0, 2000));
      return lead.id;
    },
    async updateLead(id, changes) {
      const list = await leads();
      const l = list.find((x) => x.id === id);
      if (!l) return null;
      if (changes.estado) l.estado = changes.estado;
      if (changes.nota != null) l.nota = changes.nota;
      await io.setLeads(list);
      return l;
    },
    async deleteLead(id) {
      const list = await leads();
      const i = list.findIndex((x) => x.id === id);
      if (i === -1) return false;
      list.splice(i, 1);
      await io.setLeads(list);
      return true;
    }
  };
}

module.exports = { createListStore };
