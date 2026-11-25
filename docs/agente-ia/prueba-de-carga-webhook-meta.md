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

Entregado sin ejecutar: k6 no esta instalado en la maquina de desarrollo donde se escribio y la regla es no apuntar
a ningun servidor real. Primera corrida pendiente en el servidor de pruebas.
