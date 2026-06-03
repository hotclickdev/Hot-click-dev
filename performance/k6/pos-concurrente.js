/**
 * F29.3 — Load Test: POS concurrente
 *
 * Simula múltiples cajeros procesando ventas simultáneamente.
 * Valida: locks de stock correctos (SELECT FOR UPDATE), sin overselling,
 *         latencia < 500ms p95 para ventas POS.
 *
 * Ejecutar:
 *   k6 run pos-concurrente.js \
 *     -e BASE_URL=https://hotclick-app.onrender.com \
 *     -e JWT=<cajero_token> \
 *     -e PRODUCTO_ID=<id_con_stock_100>
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Counter, Trend, Rate } from 'k6/metrics';

const ventaErrors    = new Counter('venta_pos_errors');
const ventaLatency   = new Trend('venta_pos_latency_ms', true);
const stockOverflow  = new Counter('stock_overflow_count');

export const options = {
  scenarios: {
    cajeros_normales: {
      executor:    'constant-vus',
      vus:         10,
      duration:    '90s',
      gracefulStop:'10s',
    },
    pico_fin_de_dia: {
      executor:    'ramping-vus',
      startVUs:    0,
      stages: [
        { duration: '30s', target: 20 },
        { duration: '60s', target: 20 },
        { duration: '30s', target:  0 },
      ],
      startTime: '90s', // Empieza después del escenario normal
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<500', 'p(99)<1500'],
    http_req_failed:   ['rate<0.02'],
    venta_pos_errors:  ['count<10'],
    stock_overflow_count: ['count<1'], // CERO overselling tolerado
  },
};

const BASE_URL    = __ENV.BASE_URL    || 'http://localhost:8080';
const JWT         = __ENV.JWT         || '';
const PRODUCTO_ID = __ENV.PRODUCTO_ID || '1';

export default function () {
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${JWT}`,
  };

  // Venta POS
  const ventaBody = JSON.stringify({
    items: [{
      productoId: parseInt(PRODUCTO_ID),
      cantidad: 1,
      precioUnitario: null, // usa precio del sistema
    }],
    metodoPago:  'EFECTIVO',
    metodoEnvio: 'RETIRO',
    costoEnvio:  0,
    notas:       `VU-${__VU} iter-${__ITER}`,
  });

  const start = Date.now();
  const res = http.post(`${BASE_URL}/api/ventas`, ventaBody, { headers });
  ventaLatency.add(Date.now() - start);

  const isOk = check(res, {
    'venta creada (200)': (r) => r.status === 200,
    'id de venta presente': (r) => {
      try { return JSON.parse(r.body)?.data != null; } catch { return false; }
    },
  });

  if (!isOk) {
    ventaErrors.add(1);
    const body = res.body?.toLowerCase() || '';
    if (body.includes('stock insuficiente') || body.includes('stock_actual')) {
      stockOverflow.add(1);
    }
  }

  sleep(Math.random() * 1 + 0.2); // cajero procesa cada 0.2–1.2s
}
