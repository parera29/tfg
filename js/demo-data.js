/* ==========================================================================
   STOCK DE DEMOSTRACIÓN
   --------------------------------------------------------------------------
   TODOS estos vehículos son FICTICIOS y están marcados con  demo: true.
   No corresponden al stock real de Gabriel Automoción. Las fotografías son
   ilustrativas (Unsplash) y no se corresponden con cada modelo.
   Se sustituyen desde el panel de administración (admin.html).
   ========================================================================== */
(function (root) {
  var U = function (id) { return 'https://images.unsplash.com/photo-' + id; };
  var P = {
    a: U('1555215695-3004980ad54e'), b: U('1503376780353-7e6692767b70'),
    c: U('1494976388531-d1058494cdd8'), d: U('1492144534655-ae79c964c9d7'),
    e: U('1542362567-b07e54358753'), f: U('1525609004556-c46c7d6cf023'),
    g: U('1580273916550-e323be2ae537'), h: U('1606664515524-ed2f786a0bd6'),
    i: U('1617814076367-b759c7d7e738'), j: U('1583121274602-3e2820c69888'),
    k: U('1549317661-bd32c8ce0db2'), l: U('1552519507-da3b142c6e3d'),
    m: U('1511919884226-fd3cad34687c'), n: U('1533473359331-0135ef1b58bf'),
    o: U('1568605117036-5fe5e7bab0b7'), p: U('1590362891991-f776e747a588'),
    q: U('1541899481282-d53bffe3c35d'), r: U('1514316454349-750a7fd3da3a'),
    s: U('1503736334956-4c8f8e92946d'), t: U('1618843479313-40f8afb4b4d8'),
    u: U('1544636331-e26879cd4d9b'), v: U('1560958089-b8a1929cea89')
  };
  var NOW = '2026-09-01T10:00:00.000Z';
  var base = { demo: true, oculto: false, estado: 'disponible', creado: NOW, actualizado: NOW };
  function V(o) { var r = {}; for (var k in base) r[k] = base[k]; for (var j in o) r[j] = o[j]; return r; }

  var DESC = 'Vehículo de demostración incluido para mostrar el funcionamiento de la web. ' +
    'Aquí se describirá el estado real del vehículo, su historial de mantenimiento, ' +
    'número de propietarios y cualquier detalle relevante para el comprador. [TEXTO A PERSONALIZAR]';

  root.DEMO_VEHICLES = [
    V({ id: 'GA-1001', marca: 'BMW', modelo: 'Serie 3', version: '320d Sport Line', precio: 28900, precioAnterior: 30500, anio: 2021, km: 54200, combustible: 'Diésel', cambio: 'Automático', potencia: 190, carroceria: 'Berlina', color: 'Negro', etiqueta: 'C', tipo: 'Ocasión', destacado: true,
      descripcion: DESC, equipamiento: ['Navegador', 'Climatizador bizona', 'Sensores de aparcamiento delanteros y traseros', 'Cámara de visión trasera', 'Asientos deportivos', 'Faros LED', 'Apple CarPlay', 'Control de crucero'],
      fotos: [P.a, P.t, P.r, P.u] }),
    V({ id: 'GA-1002', marca: 'Audi', modelo: 'A3 Sportback', version: '35 TFSI S line S tronic', precio: 27450, precioAnterior: null, anio: 2022, km: 31800, combustible: 'Gasolina', cambio: 'Automático', potencia: 150, carroceria: 'Compacto', color: 'Gris', etiqueta: 'C', tipo: 'Seminuevo', destacado: true,
      descripcion: DESC, equipamiento: ['Virtual Cockpit', 'Faros LED', 'Climatizador', 'Sensores de aparcamiento', 'Android Auto / Apple CarPlay', 'Llantas de aleación 18"', 'Asistente de mantenimiento de carril'],
      fotos: [P.f, P.g, P.r] }),
    V({ id: 'GA-1003', marca: 'Mercedes-Benz', modelo: 'Clase A', version: 'A 180 d Progressive', precio: 24900, precioAnterior: 25900, anio: 2021, km: 48900, combustible: 'Diésel', cambio: 'Automático', potencia: 116, carroceria: 'Compacto', color: 'Blanco', etiqueta: 'C', tipo: 'Ocasión', destacado: true,
      descripcion: DESC, equipamiento: ['Sistema MBUX', 'Pantalla táctil', 'Climatizador', 'Cámara trasera', 'Iluminación ambiental', 'Control de crucero', 'Sensor de lluvia'],
      fotos: [P.h, P.i, P.u] }),
    V({ id: 'GA-1004', marca: 'Toyota', modelo: 'C-HR', version: '125H Advance', precio: 23500, precioAnterior: null, anio: 2022, km: 27400, combustible: 'Híbrido', cambio: 'Automático', potencia: 122, carroceria: 'SUV', color: 'Rojo', etiqueta: 'ECO', tipo: 'Seminuevo', destacado: true,
      descripcion: DESC, equipamiento: ['Toyota Safety Sense', 'Cámara trasera', 'Climatizador bizona', 'Navegador', 'Llave inteligente', 'Faros LED', 'Control de crucero adaptativo'],
      fotos: [P.k, P.o, P.r] }),
    V({ id: 'GA-1005', marca: 'Volkswagen', modelo: 'Golf', version: '1.5 eTSI Life DSG', precio: 25200, precioAnterior: 26400, anio: 2023, km: 15600, combustible: 'Híbrido', cambio: 'Automático', potencia: 150, carroceria: 'Compacto', color: 'Azul', etiqueta: 'ECO', tipo: 'Km 0', destacado: true,
      descripcion: DESC, equipamiento: ['Digital Cockpit', 'App-Connect', 'Climatizador', 'Faros LED', 'Asistente de carril', 'Sensores de aparcamiento', 'Arranque sin llave'],
      fotos: [P.d, P.s, P.r] }),
    V({ id: 'GA-1006', marca: 'Cupra', modelo: 'Formentor', version: '1.5 TSI 150 CV DSG', precio: 31900, precioAnterior: null, anio: 2023, km: 12300, combustible: 'Gasolina', cambio: 'Automático', potencia: 150, carroceria: 'SUV', color: 'Gris', etiqueta: 'C', tipo: 'Km 0', destacado: true,
      descripcion: DESC, equipamiento: ['Pantalla 12"', 'Full Link', 'Cámara 360º', 'Asientos deportivos', 'Llantas 19"', 'Faros Full LED', 'Climatizador tri-zona'],
      fotos: [P.e, P.j, P.r] }),
    V({ id: 'GA-1007', marca: 'Seat', modelo: 'León', version: '1.5 TSI FR', precio: 19900, precioAnterior: 20900, anio: 2021, km: 46100, combustible: 'Gasolina', cambio: 'Manual', potencia: 130, carroceria: 'Compacto', color: 'Blanco', etiqueta: 'C', tipo: 'Ocasión', destacado: false,
      descripcion: DESC, equipamiento: ['Full Link', 'Climatizador', 'Faros LED', 'Sensores traseros', 'Control de crucero', 'Llantas 17"'],
      fotos: [P.m, P.n] }),
    V({ id: 'GA-1008', marca: 'Peugeot', modelo: '3008', version: 'PureTech 130 GT EAT8', precio: 26700, precioAnterior: null, anio: 2022, km: 33500, combustible: 'Gasolina', cambio: 'Automático', potencia: 130, carroceria: 'SUV', color: 'Gris', etiqueta: 'C', tipo: 'Seminuevo', destacado: false,
      descripcion: DESC, equipamiento: ['i-Cockpit', 'Navegador 3D', 'Cámara trasera', 'Portón eléctrico', 'Grip Control', 'Faros Full LED'],
      fotos: [P.p, P.o] }),
    V({ id: 'GA-1009', marca: 'Kia', modelo: 'Sportage', version: '1.6 T-GDi HEV Drive', precio: 29800, precioAnterior: 31200, anio: 2023, km: 21900, combustible: 'Híbrido', cambio: 'Automático', potencia: 230, carroceria: 'SUV', color: 'Negro', etiqueta: 'ECO', tipo: 'Seminuevo', destacado: false,
      descripcion: DESC, equipamiento: ['Pantalla panorámica curva', 'Cámara trasera', 'Climatizador bizona', 'Volante calefactado', 'Carga inalámbrica', 'Faros LED'],
      fotos: [P.l, P.k] }),
    V({ id: 'GA-1010', marca: 'Tesla', modelo: 'Model 3', version: 'Gran Autonomía AWD', precio: 33900, precioAnterior: null, anio: 2022, km: 39800, combustible: 'Eléctrico', cambio: 'Automático', potencia: 440, carroceria: 'Berlina', color: 'Blanco', etiqueta: '0', tipo: 'Ocasión', destacado: false,
      descripcion: DESC, equipamiento: ['Autopilot', 'Techo panorámico de cristal', 'Pantalla 15"', 'Asientos calefactados', 'Cámaras 360º', 'Carga rápida'],
      fotos: [P.v, P.n] }),
    V({ id: 'GA-1011', marca: 'Renault', modelo: 'Clio', version: 'TCe 90 Evolution', precio: 14900, precioAnterior: null, anio: 2022, km: 28700, combustible: 'Gasolina', cambio: 'Manual', potencia: 90, carroceria: 'Utilitario', color: 'Rojo', etiqueta: 'C', tipo: 'Ocasión', destacado: false,
      descripcion: DESC, equipamiento: ['Pantalla táctil', 'Android Auto / Apple CarPlay', 'Climatizador', 'Sensores traseros', 'Limitador de velocidad'],
      fotos: [P.c, P.m] }),
    V({ id: 'GA-1012', marca: 'Volvo', modelo: 'XC40', version: 'B3 Core Auto', precio: 32400, precioAnterior: 33900, anio: 2023, km: 18200, combustible: 'Híbrido', cambio: 'Automático', potencia: 163, carroceria: 'SUV', color: 'Azul', etiqueta: 'ECO', tipo: 'Seminuevo', destacado: false,
      descripcion: DESC, equipamiento: ['Google integrado', 'Cámara trasera', 'Pilot Assist', 'Climatizador bizona', 'Faros LED', 'Portón eléctrico'],
      fotos: [P.q, P.b] }),
    V({ id: 'GA-1013', marca: 'Hyundai', modelo: 'Tucson', version: '1.6 TGDI 48V Maxx', precio: 25900, precioAnterior: null, anio: 2022, km: 36400, combustible: 'Híbrido', cambio: 'Manual', potencia: 150, carroceria: 'SUV', color: 'Blanco', etiqueta: 'ECO', tipo: 'Ocasión', destacado: false, estado: 'reservado',
      descripcion: DESC, equipamiento: ['Pantalla 10,25"', 'Cámara trasera', 'Climatizador', 'Faros LED', 'Asistente de carril'],
      fotos: [P.s, P.d] }),
    V({ id: 'GA-1014', marca: 'Ford', modelo: 'Focus', version: '1.0 EcoBoost MHEV ST-Line', precio: 18500, precioAnterior: null, anio: 2021, km: 52900, combustible: 'Híbrido', cambio: 'Manual', potencia: 125, carroceria: 'Compacto', color: 'Gris', etiqueta: 'ECO', tipo: 'Ocasión', destacado: false, estado: 'vendido',
      descripcion: DESC, equipamiento: ['SYNC 3', 'Climatizador', 'Sensores de aparcamiento', 'Faros LED'],
      fotos: [P.g, P.a] })
  ];
})(typeof window !== 'undefined' ? window : globalThis);
