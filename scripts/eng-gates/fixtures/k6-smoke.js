/**
 * S6 — k6 smoke mínimo (1 VU). Solo contra mock o K6_BASE_URL de staging.
 * No apunta a producción. Sin JWT ni claves.
 */
import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  vus: 1,
  duration: '8s',
  thresholds: {
    http_req_duration: ['p(95)<1500'],
    http_req_failed: ['rate<0.02'],
  },
};

const BASE = __ENV.BASE_URL || 'http://127.0.0.1:8099';

export default function () {
  const res = http.get(`${BASE}/api/health`, { tags: { name: 'health' } });
  check(res, { 'health 200': (r) => r.status === 200 });
  sleep(0.2);
}
