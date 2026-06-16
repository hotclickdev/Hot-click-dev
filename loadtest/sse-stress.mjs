// Stress de conexiones SSE contra StockSseRegistry: abre N conexiones, las mantiene
// vivas un tiempo aleatorio y luego las cierra — una parte de forma normal y otra
// con corte abrupto de socket (sin handshake), simulando wifi caído / app cerrada
// de golpe. Sirve para verificar que el registry limpia entradas muertas (sin leak)
// bajo el mismo tráfico que genera el k6-pos-checkout.js.
//
// Sin dependencias externas — usa solo node:http. Ejecutar con: node sse-stress.mjs

import http from 'node:http';
import https from 'node:https';
import { URL } from 'node:url';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const PRODUCT_IDS = (process.env.PRODUCT_IDS || '1,5').split(',').map((s) => s.trim());
const CONNECTIONS = Number(process.env.SSE_CONNECTIONS || 150);
const DURATION_SECONDS = Number(process.env.SSE_DURATION_SECONDS || 300);
const ABRUPT_KILL_RATIO = Number(process.env.SSE_ABRUPT_KILL_RATIO || 0.15);
const RAMP_UP_MS = Number(process.env.SSE_RAMP_UP_MS || 8000);

const client = BASE_URL.startsWith('https') ? https : http;
const stats = {
  opened: 0,
  closedGraceful: 0,
  killedAbrupt: 0,
  errors: 0,
  eventsReceived: 0,
  activeNow: 0,
};

const testEndAt = Date.now() + DURATION_SECONDS * 1000;

function randomBetween(min, max) {
  return Math.floor(Math.random() * (max - min) + min);
}

function openConnection(slotId, productoId) {
  if (Date.now() > testEndAt) return;

  const url = new URL(`${BASE_URL}/api/marketplace/productos/${productoId}/stock-stream`);
  const req = client.get(url, { headers: { Accept: 'text/event-stream' } }, (res) => {
    if (res.statusCode !== 200) {
      stats.errors++;
      res.resume();
      scheduleReconnect(slotId, productoId);
      return;
    }

    stats.opened++;
    stats.activeNow++;
    res.setEncoding('utf8');

    let buffer = '';
    res.on('data', (chunk) => {
      buffer += chunk;
      let idx;
      while ((idx = buffer.indexOf('\n\n')) >= 0) {
        const rawEvent = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        if (rawEvent.split('\n').some((l) => l.startsWith('data:'))) {
          stats.eventsReceived++;
        }
      }
    });
    res.on('end', () => {
      stats.activeNow--;
      scheduleReconnect(slotId, productoId);
    });
    res.on('error', () => {
      stats.activeNow--;
      stats.errors++;
      scheduleReconnect(slotId, productoId);
    });

    const lifetimeMs = randomBetween(20_000, 60_000);
    setTimeout(() => {
      if (Math.random() < ABRUPT_KILL_RATIO) {
        stats.killedAbrupt++;
        req.destroy(); // corte de socket sin cierre limpio (simula desconexión sucia)
      } else {
        stats.closedGraceful++;
        res.destroy(); // cierre normal del stream (simula que el cliente navegó a otra página)
      }
    }, lifetimeMs);
  });

  req.on('error', () => {
    stats.errors++;
    scheduleReconnect(slotId, productoId);
  });
}

function scheduleReconnect(slotId, productoId) {
  if (Date.now() < testEndAt) {
    setTimeout(() => openConnection(slotId, productoId), 1000);
  }
}

console.log(
  `[sse-stress] abriendo ${CONNECTIONS} conexiones contra ${BASE_URL} ` +
    `(productos: ${PRODUCT_IDS.join(', ')}, duración: ${DURATION_SECONDS}s, kill abrupto: ${(ABRUPT_KILL_RATIO * 100).toFixed(0)}%)`
);

for (let i = 0; i < CONNECTIONS; i++) {
  const productoId = PRODUCT_IDS[i % PRODUCT_IDS.length];
  setTimeout(() => openConnection(i, productoId), randomBetween(0, RAMP_UP_MS));
}

const reportInterval = setInterval(() => {
  const mem = process.memoryUsage();
  console.log(
    `[${new Date().toISOString()}] activas=${stats.activeNow} ` +
      `abiertas_total=${stats.opened} cierres_normales=${stats.closedGraceful} ` +
      `cortes_abruptos=${stats.killedAbrupt} errores=${stats.errors} ` +
      `eventos_stock=${stats.eventsReceived} rss_cliente_mb=${(mem.rss / 1024 / 1024).toFixed(1)}`
  );
}, 10_000);

setTimeout(() => {
  clearInterval(reportInterval);
  console.log('--- Resultado final sse-stress ---');
  console.log(JSON.stringify(stats, null, 2));
  process.exit(0);
}, DURATION_SECONDS * 1000 + 15_000);
