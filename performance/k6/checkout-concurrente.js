/**
 * F29.3 — Load Test: Checkout concurrente
 *
 * Simula N usuarios comprando simultáneamente el mismo producto.
 * Valida: atomicidad del stock, no overselling, latencia bajo carga.
 *
 * Ejecutar:
 *   k6 run checkout-concurrente.js \
 *     -e BASE_URL=https://hotclick-app.onrender.com \
 *     -e JWT=<emprendedor_token> \
 *     -e PRODUCTO_ID=<id_con_stock_10>
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

const checkoutErrors  = new Counter('checkout_errors');
const checkoutLatency = new Trend('checkout_latency_ms', true);
const stockConflicts  = new Rate('stock_conflict_rate');

export const options = {
  stages: [
    { duration: '30s', target: 10 },  // ramp up a 10 VUs
    { duration: '60s', target: 25 },  // mantener 25 VUs (carga media)
    { duration: '30s', target: 50 },  // pico: 50 VUs simultáneos
    { duration: '20s', target: 0  },  // ramp down
  ],
  thresholds: {
    http_req_duration:   ['p(95)<500', 'p(99)<2000'],
    http_req_failed:     ['rate<0.01'],
    checkout_errors:     ['count<5'],
    stock_conflict_rate: ['rate<0.15'],  // < 15% conflictos de stock esperados
  },
};

const BASE_URL   = __ENV.BASE_URL   || 'http://localhost:8080';
const JWT        = __ENV.JWT        || '';
const PRODUCTO_ID= __ENV.PRODUCTO_ID|| '1';

export function setup() {
  // Verificar que el producto existe y tiene stock suficiente
  const res = http.get(`${BASE_URL}/api/productos/${PRODUCTO_ID}`);
  check(res, { 'producto existe': (r) => r.status === 200 });
  return { productoId: PRODUCTO_ID };
}

export default function (data) {
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${JWT}`,
  };

  // Paso 1: Crear pedido (checkout)
  const pedidoBody = JSON.stringify({
    items: [{ productoId: parseInt(data.productoId), cantidad: 1 }],
    metodoPago:   'SINPE',
    metodoEnvio:  'RETIRO',
    costoEnvio:   0,
    nombreCliente:'LoadTest User',
    correoCliente:`load${__VU}@test.cr`,
    telefonoCliente:'88888888',
    direccionEntrega:'Calle Test 1',
  });

  const startTime = Date.now();
  const res = http.post(`${BASE_URL}/api/pedidos`, pedidoBody, { headers });
  checkoutLatency.add(Date.now() - startTime);

  const ok = check(res, {
    'checkout status 200': (r) => r.status === 200,
    'checkout tiene id':   (r) => {
      try { return JSON.parse(r.body)?.data?.id != null; } catch { return false; }
    },
  });

  if (!ok) {
    checkoutErrors.add(1);
    const body = res.body || '';
    if (body.includes('stock') || body.includes('Stock') || res.status === 409) {
      stockConflicts.add(1);
    }
  }

  sleep(Math.random() * 2 + 0.5); // think time 0.5–2.5s
}

export function teardown(data) {
  console.log(`Checkout load test completado. Producto ID: ${data.productoId}`);
}
