/**
 * F29.3 — Load Test: Billing concurrente
 *
 * Simula múltiples empresas creando checkouts de suscripción simultáneamente.
 * Valida: que TX1→HTTP→TX2 de SuscripcionService no bloquea conexiones BD,
 *         que Stripe no retorna 429 bajo carga moderada.
 *
 * IMPORTANTE: Solo ejecutar con Stripe TEST mode.
 *             Las llamadas REALES a Stripe cuentan para rate limits del plan.
 *
 * Ejecutar:
 *   k6 run billing-concurrente.js \
 *     -e BASE_URL=https://hotclick-app.onrender.com \
 *     -e JWT=<admin_token> \
 *     -e PLAN_ID=<id_plan_basico>
 */
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Counter, Rate } from 'k6/metrics';

const billingLatency = new Trend('billing_latency_ms', true);
const stripeErrors   = new Counter('stripe_errors');
const stripeRate429  = new Counter('stripe_rate_limit');

export const options = {
  // Carga conservadora — Stripe tiene rate limits estrictos
  stages: [
    { duration: '20s', target: 3 },
    { duration: '40s', target: 5 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    billing_latency_ms: ['p(95)<8000'],  // Stripe puede tardar hasta 5-7s
    http_req_failed:    ['rate<0.05'],
    stripe_errors:      ['count<10'],
    stripe_rate_limit:  ['count<1'],     // CERO 429s tolerados
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const JWT      = __ENV.JWT      || '';
const PLAN_ID  = __ENV.PLAN_ID  || '1';

export default function () {
  const headers = {
    'Content-Type':  'application/json',
    'Authorization': `Bearer ${JWT}`,
  };

  // Crear checkout URL de Stripe
  const start = Date.now();
  const res = http.post(
    `${BASE_URL}/api/billing/checkout`,
    JSON.stringify({ planId: parseInt(PLAN_ID) }),
    { headers, timeout: '30s' }
  );
  billingLatency.add(Date.now() - start);

  const ok = check(res, {
    'checkout URL creada (200)': (r) => r.status === 200,
    'URL de Stripe presente':    (r) => {
      try { return JSON.parse(r.body)?.data?.includes('stripe.com'); } catch { return false; }
    },
  });

  if (!ok) {
    if (res.status === 429) stripeRate429.add(1);
    else stripeErrors.add(1);
  }

  // Think time largo — Stripe procesa async y el usuario tarda en el checkout
  sleep(Math.random() * 5 + 3); // 3–8s entre checkouts
}
