# Prueba de carga del webhook de Meta (AG-33)

Script: `loadtest/k6-webhook-meta.js` (mismo lugar y estilo que `loadtest/k6-pos-checkout.js`).

## Regla de oro

No se ejecuta contra produccion ni contra ningun servidor real de Meta. Solo contra un servidor propio de pruebas
(perfil `dev` o staging) donde Claude y la Graph API estan simulados o apagados: cada evento valido llega al enrutador
del bot y puede disparar una llamada a Claude y un envio por el canal.

## Variables

| Variable | Obligatoria | Que es |
|---|---|---|
| `META_APP_SECRET` | si | Mismo valor que `meta.app-secret` del servidor de pruebas. Solo por `-e`, nunca en el repo. |
| `BASE_URL` | no (`http://localhost:8080`) | Servidor de pruebas. |
| `PHONE_NUMBER_ID` | no | `phone_number_id` de un canal de prueba registrado en ese servidor. |
| `VUS` | no (20) | Usuarios virtuales en el escenario de mensajes firmados. |
| `STEADY_DURATION` | no (`2m`) | Duracion de la meseta. |
| `P95_MS` / `P99_MS` | no (500 / 1500) | Umbrales de latencia. |

La firma `X-Hub-Signature-256` se calcula dentro del script con HMAC-SHA256 sobre el cuerpo exacto que se envia. Sin
`META_APP_SECRET` el script falla antes de enviar nada.

## Ejemplo

```bash
k6 run -e BASE_URL=http://localhost:8080 -e META_APP_SECRET=$META_APP_SECRET -e PHONE_NUMBER_ID=$PHONE_NUMBER_ID \
  loadtest/k6-webhook-meta.js
```

## Escenarios

1. `mensajes_firmados`: rampa a `VUS`, meseta y bajada. Cada iteracion manda un mensaje de texto con id unico
   (el servidor deduplica por id) y un remitente ficticio por VU.
2. `firma_invalida`: 5 peticiones por segundo con firma falsa. Deben responder 403 sin tocar el motor.

## Umbrales (fallan la corrida si no se cumplen)

| Metrica | Umbral | Por que |
|---|---|---|
| p95 de `mensajes_firmados` | < 500 ms | El webhook responde a Meta sin esperar a Claude; Meta reintenta si tarda. |
| p99 de `mensajes_firmados` | < 1500 ms | Colas largas indican saturacion del pool o del despacho asincrono. |
| p95 de `firma_invalida` | < 200 ms | Se rechaza antes de parsear. |
| `http_req_failed` | < 1 % | Los 403 del escenario hostil estan declarados como esperados; cualquier 5xx cuenta. |
| `webhook_tasa_aceptados` | > 99 % | Toda firma valida debe recibir 200. |
| `checks` | > 99 % | Resumen de las verificaciones de estado. |

Los umbrales son una linea base inicial: se ajustan con la primera medicion real en el servidor de pruebas y se
registra el cambio en el PR.

## Que mirar ademas del resumen de k6

- Con el motor simulado, el tiempo de respuesta del webhook no debe crecer con la carga; si crece, el despacho
  asincrono (`taskExecutor`) esta encolando en vez de liberar el hilo.
- Limite por contacto (`agente.limite.mensajes-por-minuto`): con un VU por contacto y mas de 10 mensajes por minuto
  el bot deja de responder ese turno por diseno; no es una falla.
- Pool de conexiones y `meta_evento_dedup`: una escritura por mensaje.

## Estado

Primera corrida real: 2026-11-26, en una PC de desarrollo (no en ningun servidor remoto).

### Entorno

- Windows 11, Ryzen 7 5800X, 32 GB de RAM. k6 1.2.3, Java 21, PostgreSQL 16.4 portable (binarios zip de EDB) en
  `127.0.0.1`, sin pgvector (no hay binario ya compilado para Windows; no se compilo).
- App: `java -Xmx2g -jar hot-click-outlet-1.0.0.jar --spring.profiles.active=dev`, con `SPRING_DATASOURCE_URL`,
  `META_APP_SECRET` y `META_WEBHOOK_VERIFY_TOKEN` inventados y pasados solo por variables de entorno. Sin clave de
  Claude ni token de Graph API: el motor y el envio quedan apagados/simulados, que es lo que pide la regla de oro.
- La app y k6 corren en la misma maquina, asi que compiten por CPU; los numeros son un techo optimista de latencia
  de red (loopback) y no sustituyen una corrida en el servidor de pruebas.

### Como reproducirlo

1. Postgres local vacio con base `hotclick_dev` y el usuario `hotclick_dev` (como `docker-compose.dev.yml`).
2. Arrancar la app con perfil `dev` (Hibernate `ddl-auto=update` crea las tablas de entidades; el perfil dev solo
   hace baseline de Flyway, no repite V1..VN).
3. El perfil dev no aplica las migraciones nuevas. Aplicar a mano, en orden, solo en esa base local:
   `V244`, `V245`, `V246`, `V249`, `V250`, `V254`, `V255`, `V257`, `V258`, `V259`, `V260` de
   `Hot_click_outlet/src/main/resources/db/migration/` (V249 es idempotente y omite la columna de embeddings si no
   hay pgvector). Sin V244 no existe la tabla de deduplicacion persistente.
4. Insertar un canal de prueba: fila `WHATSAPP` con `id_externo = PNID-PRUEBA`, estado `ACTIVA`, sin token.
5. `k6 run -e BASE_URL=http://127.0.0.1:<puerto> -e META_APP_SECRET=<el inventado> -e PHONE_NUMBER_ID=PNID-PRUEBA
   loadtest/k6-webhook-meta.js` (para ver p99 en el resumen agregar `--summary-trend-stats="avg,med,p(95),p(99),max"`).

Limitaciones conocidas del montaje local: la aplicacion registra un error de un job programado por tablas que
no existen en esa base parcial (`hot_click_lead_tb`); no afecta al webhook.

### Resultados

| Corrida | Config | Peticiones | Throughput | p95 firmados | p99 firmados | p95 firma invalida | Errores |
|---|---|---|---|---|---|---|---|
| 1 | 20 VUs, meseta 2 min | 156 680 | ~979 req/s | 33.7 ms | no impreso (umbral p99 < 1500 ms: cumplido) | 14.0 ms | 0 % |
| 2 | 20 VUs, meseta 1 min | 50 420 | ~504 req/s | 59.1 ms | 86.8 ms | 17.9 ms | 0 % |

- Todos los umbrales se cumplieron en ambas corridas; 100 % de los mensajes firmados recibio 200 y todos los de firma
  falsa recibieron 403 (601 en la corrida 1). Cero 5xx.
- Maximo observado: 496 ms (corrida 1) y 499 ms (corrida 2), picos aislados.
- La corrida 2 salio mas lenta que la 1 (la tabla de eventos ya tenia ~156 mil filas y se comparte CPU con k6): hay
  variacion entre corridas y conviene repetir en el servidor de pruebas antes de fijar numeros.
- Deduplicacion: 5 envios seguidos del mismo `id` con firma valida devolvieron 200 los cinco; el controlador registro
  "1 nuevo(s)" y luego "0 nuevo(s)" cuatro veces, y la tabla de eventos procesados quedo con una sola fila.
- Memoria de la app al terminar: ~1.0 GB de working set con `-Xmx2g`.
- Con el motor apagado el webhook no se degrada con la carga; no se mide aqui el costo de una llamada real a Claude.

### Umbrales

Se mantienen los de la linea base (p95 < 500 ms, p99 < 1500 ms, firma invalida p95 < 200 ms): lo medido esta uno
o dos ordenes de magnitud por debajo, pero el entorno es loopback y sin motor, asi que apretarlos aqui daria falsas
alarmas en el servidor de pruebas. Reajustar tras la primera corrida en ese servidor.

### Pendiente

- Repetir en el servidor de pruebas (con red real, pgvector y el motor simulado) y ajustar umbrales.
- Esta corrida no ejercita pgvector ni el motor de IA. Alternativa barata para una corrida repetible sin PC local:
  un job manual (`workflow_dispatch`) de GitHub Actions con un servicio `pgvector/pgvector:pg16`, que arranque la app
  con perfil dev, aplique las migraciones de la lista anterior, inserte el canal de prueba y ejecute k6 con
  `grafana/setup-k6-action`, subiendo el resumen como artefacto. Es solo una propuesta: no esta en `.github/workflows`.
