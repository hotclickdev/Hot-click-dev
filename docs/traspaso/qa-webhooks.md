# Traspaso: QA Webhooks (área 5, suscripciones ONVO)

Nota anterior de este rol: [hotclick-qa-webhooks-y-ux.md](hotclick-qa-webhooks-y-ux.md). Esta la complementa con el re-QA del área 5.

## Estado de las pruebas (re-QA sobre master `649387e7945832d7f7027ca4bf6d4ab34b892013`)

- **Tests de backend:** 81 de 81 en verde (0 fallos, 0 errores, 0 omitidos). Son los tests de webhooks ONVO, idempotencia, billing y suscripciones, corridos sobre H2 con las variables de CI.
- **Con evidencia (tests):**
  - Firma: secret ausente o inválido → 401; servidor sin secret → 401; muchos intentos malos → 429; cuerpo de más de 64 KB → 413.
  - Duplicados: un evento duplicado no vuelve a activar el plan; dedup de `checkout-session.succeeded` x2.
  - Renovación: la exitosa activa el plan; la fallida marca PAST_DUE; 8 días de gracia.
- **Sin evidencia:** eventos fuera de orden, JSON malformado (400) y cancelación de suscripción ONVO. Los tests de cancelación que hay son de Tilopay.
- **Prueba en vivo: BLOQUEADA.** El staging en `:8081` corría `3323bd1a82c0b25c16d6508646dcc66b772b13ab`, no `649387e7`. Me detuve antes de mandar cualquier webhook.
- **Decisión de HotClick QA:** esperar a que Dev Pagos 2 agregue los tests de fuera de orden, JSON malformado y cancelación ONVO, y a que se actualice el staging.

**Veredicto actual del área 5: BLOQUEADA.**

## Evidencia

- `/workspace/qa-area5/mvn-tests.log`: salida de Maven con los 81 tests.
- `/workspace/qa-area5/live/hash-check.txt`: PID, ruta y hash del staging, y por qué me detuve.

## Pendiente

Correr los 7 casos en vivo **una sola vez**, contra el hash nuevo de master:

1. Sin firma o con firma mala → 401.
2. Evento duplicado → no se reprocesa.
3. Fuera de orden: una renovación o cancelación vieja que llega después de una más nueva no debe pisar el estado.
4. JSON malformado → 400.
5. Cancelación de suscripción.
6. Renovación.
7. `/api/webhooks/stripe` → 404.

Después, borrar los datos creados y dejar escrito cómo se verificó.

## Cómo continuar

- Staging local en `http://localhost:8081`, perfil dev, ONVO en MOCK. No reiniciarlo ni cambiarle el hash.
- **Revisar el hash antes de probar:** `ss -ltnp | grep 8081` → PID → `ls -l /proc/<PID>/cwd` → `git rev-parse HEAD` en ese repo. Si no coincide con el hash pedido, detenerse y reportar.
- El secret del webhook se lee solo dentro del comando curl o del cálculo del HMAC en el mismo pipe. Nunca se imprime ni se guarda en logs, archivos o reportes.
- Las suites completas van con `flock /workspace/hotclick/.suite-completa.lock`. Respetar la regla del box: no levantar suites ni la app sin que lo pidan.
- Detener solo los procesos propios, por PID. No tocar el staging de CI/CD ni los procesos de otros agentes.
- Guardar comandos y respuestas, sin el secret, en `/workspace/qa-area5/live/`.

## Reglas

- ONVO solo en modo test o MOCK. Nada contra ONVO real ni producción.
- No tocar código, ni hacer push, merge o deploy.
- Nunca dar un caso por bueno sin evidencia.
- Comunicar todo vía el Mentor (HotClick QA).
