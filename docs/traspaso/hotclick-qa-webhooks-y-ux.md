# Traspaso: HotClick QA Webhooks y UX (QA 8)

Nota detallada del área 5: [qa-webhooks.md](qa-webhooks.md).

## Rol

Soy **QA 8 de HotClick**, el tester funcional de hotclickdev/Hot-click-dev. Cubro:

- **Webhooks de ONVO:** firma inválida, eventos duplicados, eventos fuera de orden y JSON malformado.
- **Suscripciones en sandbox:** renovaciones y cancelaciones.
- **Web SDK de ONVO.**
- **UX:** vista móvil a 360 px, PWA, voseo, y montos en ₡ y US$.
- **Áreas:** 1 (pagos y checkout), 8 (bot de Telegram) y 9 (front y UX). También hice el re-QA del área 5 (webhooks de suscripción).

Solo hago QA: no toco código ni hago commit de producción, merge o deploy. ONVO solo en modo test (tarjeta 4242) o MOCK. Nunca digo que algo pasa sin evidencia. Hablo en español de Costa Rica, con voseo.

**Formato de reporte:** Tarea | Estado | Hecho | Evidencia (comandos, salidas, rutas) | Archivos | Riesgos | Bloqueos | Siguiente paso. Siempre con el hash exacto y un veredicto: APTA, NO APTA o BLOQUEADA, con la razón.

## Reglas

- Todo se comunica vía el Mentor (HotClick QA). Ningún bot le escribe a Andrés por privado.
- **Regla del box:** las suites completas van con `flock /workspace/hotclick/.suite-completa.lock`. No levantar la app ni correr suites sin que lo pidan. Detener solo los procesos propios, por PID. No tocar el staging de CI/CD ni los procesos de otros agentes.
- **Secret del webhook:** está en `/workspace/hotclick/staging/webhook.secret`. Se lee solo dentro del comando curl (`$(cat …)` o el HMAC en el mismo pipe). Nunca se imprime ni se guarda en logs, archivos o reportes.
- Nada contra ONVO real ni producción. Sin gasto ni deploy.
- Los críticos y altos van directo a Grok Bot vía el Mentor. Los medios y bajos van como fila en el archivo de pendientes.
- Merge a master solo con CI verde y APTO sobre el hash exacto.

## Lo hecho

- **Re-QA del área 5 sobre master `649387e7945832d7f7027ca4bf6d4ab34b892013`:** 81 de 81 tests de backend en verde (webhooks ONVO, idempotencia, billing y suscripciones).
  - Con evidencia: firma (401, 429, 413), duplicados y renovación.
  - Sin evidencia: fuera de orden, JSON malformado y cancelación ONVO.
- **Prueba en vivo del área 5: BLOQUEADA.** El staging en `:8081` corría `3323bd1a82c0b25c16d6508646dcc66b772b13ab` en vez de `649387e7`. Me detuve antes de mandar cualquier webhook y no creé datos.
- **Antes (master `a22501f7b`):**
  - Webhook en vivo: sin secret, con secret vacío o con secret inválido → 401.
  - Área 8: C1 y C5 arreglados. Siguen abiertos C2 (ALTO), C3, C4 y C7. Tengo 4 tests de reproducción.
  - Área 9: vitest 195 de 195; a 360 px no hay desborde y los montos salen en ₡. Siguen abiertos C3 a C10 y los textos en tuteo.

## [PENDIENTE]

- Los 7 casos en vivo del área 5, **una sola vez**, con el hash nuevo de master. Van después de que Dev Pagos 2 agregue los tests de fuera de orden, JSON malformado y cancelación ONVO, y de que se actualice el staging. Los casos:
  1. Sin firma o con firma mala → 401.
  2. Evento duplicado.
  3. Fuera de orden: un evento viejo no pisa el estado.
  4. JSON malformado → 400.
  5. Cancelación.
  6. Renovación.
  7. `/api/webhooks/stripe` → 404.
- Re-QA del área 8 cuando el #338 esté en master.
- Prueba del pago de suscripción con el Web SDK de ONVO, en modo test, cuando Dev Pagos lo indique. Antes dio "Error con la pasarela de pago" y 403.
- Verificar QA8-003 (pestañas del video) con un producto de prueba que tenga video.

## Próximos pasos exactos

1. Esperar el aviso del Mentor: tests de Dev Pagos 2 mergeados y staging actualizado.
2. Anotar el hash con `git rev-parse origin/master`.
3. Revisar el hash del staging: `ss -ltnp | grep 8081` → PID → `ls -l /proc/<PID>/cwd` → `git rev-parse HEAD` en ese repo. Si no coincide, detenerse y reportar.
4. Correr los 7 casos con curl contra `http://localhost:8081` (perfil dev, ONVO MOCK). Guardar comandos y respuestas, sin el secret, en `/workspace/qa-area5/live/`.
5. Borrar los datos creados y dejar escrito cómo se verificó.
6. Reportar vía el Mentor, con el formato de arriba, el hash y el veredicto.

## Evidencia

- `/workspace/qa-area5/mvn-tests.log`: los 81 tests sobre `649387e7`.
- `/workspace/qa-area5/live/hash-check.txt`: el staging en `3323bd1a` y por qué me detuve.
- `/workspace/qa/verif/qa8/`: evidencia anterior (`vivo-8081/`, `tests-repro-a8/`, `reqa-area8-9.md`, `webhook.log`).
- Pendientes medios y bajos: `/workspace/hotclick-reportes/bugs-pendientes-media-baja-2026-10-23.md`.

## Entorno

- Staging local: front en `:3000`, backend en `:8081`, Mailpit en `:8025`. Lo administra CI/CD. No reiniciarlo ni cambiarle el hash.
- Trabajar siempre en un clon o worktree propio, nunca sobre el checkout compartido.
- Revisar los inodos con `df -i /`.
