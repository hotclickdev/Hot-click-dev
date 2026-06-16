// Load test: contención de stock entre POS (feria) y checkout web (tienda pública).
// Incluye 3 escenarios:
//   1. pos_feria        — vendedores en feria usando el POS físico.
//   2. checkout_web     — clientes comprando en la tienda pública.
//   3. contencion_extrema — ráfaga de 30 VUs (POS + web) peleando por el ÚLTIMO stock de un solo producto.
// Requiere: k6 (https://k6.io/docs/get-started/installation/)
// Ejecutar: ver instrucciones al final del chat / README.
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// ── Configuración por variables de entorno (-e VAR=valor) ──────────────────
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const JWT_TOKEN = __ENV.JWT_TOKEN; // requerido para POS, ver instrucciones
const TIENDA_SLUG = __ENV.TIENDA_SLUG || 'hotclick';
const BODEGA_ID = Number(__ENV.BODEGA_ID || 1);
const POS_VUS = Number(__ENV.POS_VUS || 50);
const CHECKOUT_VUS = Number(__ENV.CHECKOUT_VUS || 100);
const STEADY_DURATION = __ENV.STEADY_DURATION || '4m';

// Productos de alta demanda (mismo set para POS y checkout → fuerza competencia real por stock)
// IDs y precios deben coincidir con el seed real (V14__seed_productos_catalogo.sql).
const HOT_PRODUCTS = [
  { id: Number(__ENV.PRODUCTO_ID_1 || 1), precio: 34900 }, // HC-ELEC-001 Audífonos
  { id: Number(__ENV.PRODUCTO_ID_2 || 5), precio: 54900 }, // HC-ELEC-005 Teclado (stock bajo = más contención)
];

// Escenario 3 — "contención extrema": producto puntual con stock manualmente seteado en BD (ej. stock = 3)
// antes de correr la prueba. Se omite por completo si no se pasa PRODUCTO_ID_CRITICO, para no romper
// las corridas normales de los escenarios 1 y 2.
const PRODUCTO_ID_CRITICO = __ENV.PRODUCTO_ID_CRITICO ? Number(__ENV.PRODUCTO_ID_CRITICO) : null;
const PRECIO_PRODUCTO_CRITICO = Number(__ENV.PRECIO_PRODUCTO_CRITICO || 10000);
const STOCK_CRITICO_ESPERADO = Number(__ENV.STOCK_CRITICO_ESPERADO || 3);
const CONTENCION_VUS = Number(__ENV.CONTENCION_VUS || 30);
const CONTENCION_DURATION = __ENV.CONTENCION_DURATION || '15s';

const conflict409 = new Counter('business_conflict_409');
const forbidden403 = new Counter('business_forbidden_403');
const success200 = new Counter('business_success_200');
const conflictRate = new Rate('conflict_409_rate');
const forbiddenRate = new Rate('forbidden_403_rate');

// Métricas del escenario 3 (contención extrema por stock agotado)
const criticoSuccessTotal = new Counter('critico_success_total'); // total de 200/201 sobre el producto crítico
const contencion409Total = new Counter('contencion_409_total');
const contencion409Rate = new Rate('contencion_409_rate'); // tasa esperada de rechazos por falta de stock
const contencionDeadlock5xx = new Counter('contencion_deadlock_5xx_total'); // 500/504 → posible deadlock/lock timeout
// k6 ejecuta cada VU en su propia VM aislada, así que no existe un contador "vivo" compartido entre VUs
// dentro de un mismo request. Por eso la sobreventa se confirma contra el stock real en BD (verificarSobreventa),
// no contando en memoria — es la única fuente de verdad consistente entre los 30 VUs concurrentes.
const raceConditionOverdraft = new Counter('race_condition_overdraft');

// 409/403 son resultados de negocio esperados bajo contención, no fallas de infraestructura.
// Sin esto, http_req_failed se ensucia y no sirve para detectar errores 5xx reales.
http.setResponseCallback(http.expectedStatuses(200, 201, 400, 403, 409));

const scenarios = {
  pos_feria: {
    executor: 'ramping-vus',
    exec: 'posVenta',
    startVUs: 0,
    stages: [
      { duration: '30s', target: POS_VUS },
      { duration: STEADY_DURATION, target: POS_VUS },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '10s',
  },
  checkout_web: {
    executor: 'ramping-vus',
    exec: 'checkoutWeb',
    startVUs: 0,
    startTime: '10s', // arranca casi en paralelo, leve offset para no sincronizar el spike inicial
    stages: [
      { duration: '30s', target: CHECKOUT_VUS },
      { duration: STEADY_DURATION, target: CHECKOUT_VUS },
      { duration: '30s', target: 0 },
    ],
    gracefulRampDown: '10s',
  },
};

const thresholds = {
  http_req_duration: ['p(95)<1500', 'p(99)<3000'],
  'http_req_duration{scenario:pos_feria}': ['p(95)<1000'],
  'http_req_duration{scenario:checkout_web}': ['p(95)<1500'],
  http_req_failed: ['rate<0.02'], // solo cuenta 5xx / errores de red / timeouts reales
};

if (PRODUCTO_ID_CRITICO) {
  // 30 VUs disparando en ráfaga continua (sin sleep relevante) contra el mismo producto durante 15s,
  // para forzar el peor caso real: cajero de feria + decenas de clientes web en el mismo segundo.
  scenarios.contencion_extrema = {
    executor: 'constant-vus',
    exec: 'contencionExtrema',
    vus: CONTENCION_VUS,
    duration: CONTENCION_DURATION,
    startTime: '0s', // en paralelo total con pos_feria y checkout_web, no escalonado
  };

  // Si esto falla, hubo sobreventa real (bug de race condition) o el locking de Postgres se trabó.
  thresholds['critico_success_total'] = [`count<=${STOCK_CRITICO_ESPERADO}`];
  thresholds['contencion_deadlock_5xx_total'] = ['count==0'];
}

export const options = { scenarios, thresholds };

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function classify(res) {
  if (res.status === 409) { conflict409.add(1); conflictRate.add(1); }
  else { conflictRate.add(0); }
  if (res.status === 403) { forbidden403.add(1); forbiddenRate.add(1); }
  else { forbiddenRate.add(0); }
  if (res.status === 200 || res.status === 201) success200.add(1);
}

// ── Escenario 1: vendedores en feria usando el POS ──────────────────────────
export function posVenta() {
  if (!JWT_TOKEN) {
    throw new Error('Falta -e JWT_TOKEN=... (ver instrucciones de login antes de correr el test)');
  }
  const producto = randomItem(HOT_PRODUCTS);
  const payload = JSON.stringify({
    bodegaId: BODEGA_ID,
    clienteId: 999, // usuario mostrador default
    metodoPago: randomItem(['EFECTIVO', 'SINPE']),
    montoRecibido: producto.precio,
    descuentoGlobal: 0,
    notas: `LOADTEST vu=${__VU} iter=${__ITER}`,
    items: [{ productoId: producto.id, cantidad: 1, precioUnitario: producto.precio }],
  });

  const res = http.post(`${BASE_URL}/api/pos/venta`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${JWT_TOKEN}`,
    },
    tags: { name: 'POS_venta' },
  });

  classify(res);
  check(res, {
    'POS: respuesta es 200, 403 o 409 (no 5xx)': (r) => [200, 201, 403, 409, 400].includes(r.status),
  });

  sleep(randomBetween(2, 5)); // cadencia real de un vendedor de feria
}

// ── Escenario 2: clientes comprando en la tienda pública ────────────────────
export function checkoutWeb() {
  const producto = randomItem(HOT_PRODUCTS);
  const correoUnico = `loadtest+vu${__VU}-it${__ITER}@hotclick.test`;
  const payload = JSON.stringify({
    nombreCliente: `LoadTest VU${__VU}`,
    correoCliente: correoUnico,
    telefonoCliente: '+506 8888 0000',
    direccionEntrega: 'LOADTEST - eliminar',
    metodoPago: randomItem(['SINPE_MOVIL', 'EFECTIVO']),
    metodoEnvio: randomItem(['DOMICILIO', 'RETIRO']),
    notas: 'LOADTEST',
    items: [{ productoId: producto.id, cantidad: 1 }],
  });

  const res = http.post(`${BASE_URL}/api/tienda/${TIENDA_SLUG}/pedidos`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Checkout_pedido' },
  });

  classify(res);
  check(res, {
    'Checkout: respuesta es 200, 403 o 409 (no 5xx)': (r) => [200, 201, 403, 409, 400].includes(r.status),
  });

  sleep(randomBetween(1, 3)); // tiempo de navegación entre intentos de compra
}

// ── Escenario 3: contención extrema — últimas 3 unidades, POS y web al mismo tiempo ─
export function contencionExtrema() {
  if (!JWT_TOKEN) {
    throw new Error('Falta -e JWT_TOKEN=... (también requerido por la rama POS de contencion_extrema)');
  }

  const esPOS = Math.random() < 0.5;
  const res = esPOS ? dispararVentaPOSCritica() : dispararPedidoWebCritico();

  if (res.status === 200 || res.status === 201) {
    criticoSuccessTotal.add(1);
    contencion409Rate.add(0);
    verificarSobreventa();
  } else if (res.status === 409 || res.status === 400) {
    contencion409Total.add(1);
    contencion409Rate.add(1);
  } else {
    contencion409Rate.add(0);
  }

  if (res.status === 500 || res.status === 504) {
    contencionDeadlock5xx.add(1);
    console.error(
      `DEADLOCK/TIMEOUT sospechado: HTTP ${res.status} en producto crítico ${PRODUCTO_ID_CRITICO} ` +
      `(vu=${__VU} iter=${__ITER}, rama=${esPOS ? 'POS' : 'WEB'}). Revisar SELECT FOR UPDATE / lock_timeout en PostgreSQL.`
    );
  }

  check(res, {
    'Contención: sin deadlock/timeout (no 500/504)': (r) => ![500, 504].includes(r.status),
  });

  sleep(randomBetween(0, 0.3)); // mínimo a propósito: queremos ráfagas concurrentes reales, no espaciadas
}

function dispararVentaPOSCritica() {
  const payload = JSON.stringify({
    bodegaId: BODEGA_ID,
    clienteId: 999,
    metodoPago: 'EFECTIVO',
    montoRecibido: PRECIO_PRODUCTO_CRITICO,
    descuentoGlobal: 0,
    notas: `LOADTEST-CONTENCION vu=${__VU} iter=${__ITER}`,
    items: [{ productoId: PRODUCTO_ID_CRITICO, cantidad: 1, precioUnitario: PRECIO_PRODUCTO_CRITICO }],
  });

  return http.post(`${BASE_URL}/api/pos/venta`, payload, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${JWT_TOKEN}`,
    },
    tags: { name: 'Contencion_POS' },
  });
}

function dispararPedidoWebCritico() {
  const correoUnico = `loadtest-contencion+vu${__VU}-it${__ITER}@hotclick.test`;
  const payload = JSON.stringify({
    nombreCliente: `LoadTest Contencion VU${__VU}`,
    correoCliente: correoUnico,
    telefonoCliente: '+506 8888 0000',
    direccionEntrega: 'LOADTEST - eliminar',
    metodoPago: 'SINPE_MOVIL',
    metodoEnvio: 'RETIRO',
    notas: 'LOADTEST-CONTENCION',
    items: [{ productoId: PRODUCTO_ID_CRITICO, cantidad: 1 }],
  });

  return http.post(`${BASE_URL}/api/tienda/${TIENDA_SLUG}/pedidos`, payload, {
    headers: { 'Content-Type': 'application/json' },
    tags: { name: 'Contencion_Web' },
  });
}

// Confirma sobreventa contra el stock real en BD (ground truth), no contra un contador en memoria
// que no podría ser compartido de forma confiable entre los 30 VUs aislados.
function verificarSobreventa() {
  const res = http.get(`${BASE_URL}/api/productos/${PRODUCTO_ID_CRITICO}`, {
    tags: { name: 'Contencion_StockCheck' },
  });
  if (res.status !== 200) return;

  const data = res.json('data');
  const disponible = data ? data.stock : null;
  if (disponible !== null && disponible !== undefined && disponible < 0) {
    raceConditionOverdraft.add(1);
    console.error(
      `SOBREVENTA CONFIRMADA: stock disponible=${disponible} (negativo) en producto crítico ` +
      `${PRODUCTO_ID_CRITICO}. Race condition en StockService — revisar locking de filas en Postgres.`
    );
  }
}
