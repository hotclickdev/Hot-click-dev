/**
 * F29.3 — Load Test: SSE concurrente (AI Copilot + Public Chat)
 *
 * Valida que el sseExecutor (maxPool=20) maneje N conexiones simultáneas
 * sin degradar el tiempo de primera respuesta.
 *
 * Nota: k6 no tiene soporte nativo de SSE — usa websocket experimental
 * o HTTP streaming. Este script usa http.get con timeout largo para
 * simular una conexión SSE abierta y medir el time-to-first-byte (TTFB).
 *
 * Ejecutar:
 *   k6 run sse-concurrente.js \
 *     -e BASE_URL=https://hotclick-app.onrender.com \
 *     -e JWT=<emprendedor_token> \
 *     -e SLUG=mi-tienda
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter } from 'k6/metrics';

const sseConnectTime  = new Trend('sse_connect_ms', true);
const sseTimeoutCount = new Counter('sse_timeouts');
const sseErrors       = new Counter('sse_errors');

export const options = {
  stages: [
    { duration: '20s', target: 5  },  // warm-up: 5 conexiones
    { duration: '60s', target: 15 },  // carga media: 15 (< maxPool=20)
    { duration: '30s', target: 18 },  // pico: cerca del límite del pool
    { duration: '10s', target: 0  },
  ],
  thresholds: {
    sse_connect_ms:   ['p(95)<3000'], // Primera respuesta en < 3s
    sse_timeouts:     ['count<5'],
    sse_errors:       ['count<5'],
    http_req_failed:  ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const JWT      = __ENV.JWT      || '';
const SLUG     = __ENV.SLUG     || 'test-tienda';

// Escenario 1: Chat público (sin auth — simula visitantes de la tienda)
function testPublicChat() {
  const body = JSON.stringify({ message: 'quiero algo para sala', offset: 0 });
  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/api/public/chat?slug=${SLUG}`,
    body,
    {
      headers: { 'Content-Type': 'application/json', 'Accept': 'text/event-stream' },
      timeout: '15s',
    }
  );
  sseConnectTime.add(Date.now() - start);

  const ok = check(res, {
    'public chat SSE: status 200': (r) => r.status === 200,
    'public chat recibe datos':    (r) => r.body && r.body.length > 0,
  });

  if (!ok) {
    if (res.timings.duration >= 15000) sseTimeoutCount.add(1);
    else sseErrors.add(1);
  }
}

// Escenario 2: AI Copilot admin (con auth)
function testAiCopilot() {
  if (!JWT) return;
  const body = JSON.stringify({ message: '¿cuáles son mis productos más vendidos?' });
  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/api/admin/ai/chat`,
    body,
    {
      headers: {
        'Content-Type':  'application/json',
        'Accept':        'text/event-stream',
        'Authorization': `Bearer ${JWT}`,
      },
      timeout: '25s',
    }
  );
  sseConnectTime.add(Date.now() - start);

  const ok = check(res, {
    'AI copilot SSE: status 200': (r) => r.status === 200,
    'AI copilot recibe datos':    (r) => r.body && r.body.length > 0,
  });

  if (!ok) {
    if (res.timings.duration >= 25000) sseTimeoutCount.add(1);
    else sseErrors.add(1);
  }
}

export default function () {
  // Alterna entre chat público y AI copilot
  if (__VU % 2 === 0) {
    testPublicChat();
  } else {
    testAiCopilot();
  }
  sleep(Math.random() * 3 + 1); // espera entre 1-4s antes de nueva conexión
}
