// Carga del webhook de Meta (AG-33): POST /api/webhooks/meta con firma X-Hub-Signature-256 calculada por k6.
//
// NO ejecutar contra produccion. Solo contra un servidor propio de pruebas (perfil dev/staging) con el canal de
// prueba y el motor/Claude y la Graph API simulados o apagados: cada evento valido llega al enrutador del bot.
// Ver docs/agente-ia/prueba-de-carga-webhook-meta.md (variables, umbrales, como interpretarlo).
//
// Requiere k6 (https://k6.io/docs/get-started/installation/). Ejemplo:
//   k6 run -e BASE_URL=http://localhost:8080 -e META_APP_SECRET=<la del servidor de pruebas> \
//          -e PHONE_NUMBER_ID=<id de cuenta del canal de prueba> loadtest/k6-webhook-meta.js
import http from 'k6/http';
import crypto from 'k6/crypto';
import { check } from 'k6';
import { Counter, Rate } from 'k6/metrics';

// -- Configuracion por variables de entorno (-e VAR=valor). Nunca valores por defecto sensibles. --
const BASE_URL = __ENV.BASE_URL || 'http://localhost:8080';
const META_APP_SECRET = __ENV.META_APP_SECRET; // obligatoria: mismo valor que meta.app-secret del servidor
const PHONE_NUMBER_ID = __ENV.PHONE_NUMBER_ID || 'PNID-PRUEBA';
const VUS = Number(__ENV.VUS || 20);
const STEADY_DURATION = __ENV.STEADY_DURATION || '2m';
const P95_MS = Number(__ENV.P95_MS || 500);
const P99_MS = Number(__ENV.P99_MS || 1500);

if (!META_APP_SECRET) {
  throw new Error('Falta META_APP_SECRET (-e META_APP_SECRET=...). No se calcula ninguna firma sin ella.');
}

const aceptados = new Counter('webhook_aceptados_200');
const rechazados = new Counter('webhook_rechazados_403');
const tasaAceptados = new Rate('webhook_tasa_aceptados');

// 403 es el resultado esperado del escenario de firma invalida; no debe contar como falla de infraestructura.
http.setResponseCallback(http.expectedStatuses(200, 403));

export const options = {
  scenarios: {
    // Mensajes de clientes: ritmo estable con rampa de subida y bajada.
    mensajes_firmados: {
      executor: 'ramping-vus',
      exec: 'mensajeFirmado',
      startVUs: 0,
      stages: [
        { duration: '20s', target: VUS },
        { duration: STEADY_DURATION, target: VUS },
        { duration: '20s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
    // Trafico hostil: firma incorrecta. Debe rechazarse rapido y sin tocar el motor.
    firma_invalida: {
      executor: 'constant-arrival-rate',
      exec: 'firmaInvalida',
      rate: 5,
      timeUnit: '1s',
      duration: STEADY_DURATION,
      preAllocatedVUs: 5,
      maxVUs: 20,
    },
  },
  thresholds: {
    // El webhook responde a Meta sin esperar a Claude: debe ser rapido incluso bajo carga.
    'http_req_duration{scenario:mensajes_firmados}': [`p(95)<${P95_MS}`, `p(99)<${P99_MS}`],
    'http_req_duration{scenario:firma_invalida}': ['p(95)<200'],
    // Ningun 5xx ni error de red; los 403 del escenario hostil estan declarados como esperados arriba.
    http_req_failed: ['rate<0.01'],
    // Todo mensaje con firma valida debe aceptarse (el servidor responde 200 aunque el procesamiento falle).
    webhook_tasa_aceptados: ['rate>0.99'],
    checks: ['rate>0.99'],
  },
};

function evento(texto, idMensaje) {
  return JSON.stringify({
    object: 'whatsapp_business_account',
    entry: [{
      changes: [{
        field: 'messages',
        value: {
          metadata: { phone_number_id: PHONE_NUMBER_ID },
          messages: [{
            from: `contacto-carga-${__VU}`, // identificador ficticio, nunca un telefono real
            id: idMensaje, // unico por iteracion: Meta deduplica por id y el servidor tambien
            timestamp: String(Math.floor(Date.now() / 1000)),
            type: 'text',
            text: { body: texto },
          }],
        },
      }],
    }],
  });
}

function enviar(cuerpo, firma) {
  return http.post(`${BASE_URL}/api/webhooks/meta`, cuerpo, {
    headers: { 'Content-Type': 'application/json', 'X-Hub-Signature-256': firma },
    tags: { name: 'POST /api/webhooks/meta' },
  });
}

export function mensajeFirmado() {
  const cuerpo = evento('Hola, quiero ver productos', `wamid.carga.${__VU}.${__ITER}.${Date.now()}`);
  const firma = 'sha256=' + crypto.hmac('sha256', META_APP_SECRET, cuerpo, 'hex');
  const r = enviar(cuerpo, firma);
  const ok = check(r, { 'firmado: 200': (x) => x.status === 200 });
  tasaAceptados.add(ok);
  if (ok) aceptados.add(1);
}

export function firmaInvalida() {
  const cuerpo = evento('mensaje con firma falsa', `wamid.falso.${__VU}.${__ITER}.${Date.now()}`);
  const r = enviar(cuerpo, 'sha256=' + '0'.repeat(64));
  const ok = check(r, { 'firma invalida: 403': (x) => x.status === 403 });
  if (ok) rechazados.add(1);
}
