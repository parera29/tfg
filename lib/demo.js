/* Carga los vehículos DEMO desde js/demo-data.js (el mismo archivo que usa la web). */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

function load() {
  const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'demo-data.js'), 'utf8');
  const ctx = { window: {} };
  vm.runInNewContext(code, ctx);
  return JSON.parse(JSON.stringify(ctx.window.DEMO_VEHICLES || []));
}

module.exports = { load };
