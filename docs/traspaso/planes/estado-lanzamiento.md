# Estado del lanzamiento (actualizado 25-oct 1:36 CR)
- Master: aa907776 desplegado en prod (Andrés, 1:32). Incluye #276, #277, #278, #279.
- C3: código listo (#279); prod sigue en ONVO prueba por opt-in hasta Fase 5.
- C4: comprobantes nuevos privados (#279); falta el front con enlace firmado y el script S3 (Andrés). Logs sin PII en send-verification (#278).
- En curso: Swagger/api-docs apagados en prod (Dev Marketplace); PR SINPE con número ONVO en checkout y POS (Dev Pagos).
- FASE 1: iniciada 1:36.
- 1:37 Auditor 2 terminó (3 ALTO, 4 MEDIO, 2 BAJO). A1 (correo sin normalizar en el login, probable 401) y A2 (EDITOR/LECTOR con permisos de más) asignados a Dev Marketplace. Para A3 (rol cajero), propuesta primero.
- 1:38 Auditor 10 terminó (3 ALTO, 3 MEDIO, 2 BAJO). INF-03 (alertas de pagos y webhooks ONVO) e INF-02 (deploy y rollback con versión, solo código) asignados a CI/CD. INF-01 (backup diario en AWS) ESPERA A ANDRÉS porque implica gasto.
- 1:39 Auditor 4 terminó (3 ALTO, 4 MEDIO, 2 BAJO). ALTO 2 y 3 (QR atado a Tilopay, stock sin apartar) y MEDIO 4 van al PR de POS/ONVO de Dev Pagos. ALTO 1 (cantidades negativas en caja) y MEDIO 5 (venta sin turno) van a Dev Pagos 2.
- 1:40 Auditor 3 terminó (2 ALTO, 5 MEDIO, 1 BAJO). M-01 (la oferta se muestra pero no se cobra), M-07 (regla de oferta unificada) y M-03 (cantidades negativas en el carrito) van a Dev Pagos 2. M-02 (9 productos de prueba de las empresas "Prueba Andrés" en el catálogo público) ESPERA A ANDRÉS porque cambia datos de prod.
- FASE 1: listas las auditorías 2, 3, 4 y 10. Falta el bot comprador en móvil. Los logs de prod y los casos raros en staging esperan acceso.

## Actualización 2026-10-25 04:25 CR
- Mergeados (CI verde + APTO, sin deploy): #281 POS cantidad/turno, #282 precio oferta, #283 Swagger off prod, #284 A1 correo login. Master = 7382cb84.
- #285 A2 roles (0b248f2a): APTO, CI verde según Mentor; CI/CD a cargo del merge.
- #280 SINPE ONVO: fix Sonar en eefc3145 con APTO, sin push; espera OK de Andrés.
- fix/pos-qr-onvo (3dd6550f): APTO; espera OK de Andrés para push/PR, después de #280.
- fix/test-onvo-llave-entorno (44916144, Bugs): APTO; espera OK de Andrés.
- fix/lector-solo-lectura (81d63925): APTO; fix/lector-deny-por-defecto en curso (3 bajos + ocultar botones de recolección para LECTOR); espera APTO nuevo y OK.
- INF-02 (6fbb07fc): APTO; INF-03 local; ambos esperan OK de Andrés para push.
- Decisión pendiente de Andrés: rol CAJERO, ¿anula o devuelve ventas?

## Actualización 2026-10-25 05:18 CR
- #285 A2 roles mergeado a las 4:24 CR; CI de master en verde. Sin deploy.
- Sin PRs nuevos ni movimiento desde 4:24; lo pendiente sigue esperando el OK de Andrés (#280, POS QR, test ONVO, lector, INF-02/03, rol CAJERO).

## Revisión 2026-10-25 06:20 CR
- Sin cambios: último merge #285 (4:24). Único PR abierto #280 (sin push nuevo desde 2:40, Sonar rojo ya conocido). Todo lo pendiente sigue esperando a Andrés.

## Revisión 2026-10-25 07:15 CR
- Sin cambios: último merge #285 (4:24). Único PR abierto #280 (sin push desde 2:40). Todo lo pendiente sigue esperando a Andrés.

## Revisión 2026-10-25 08:18 CR
- Sin cambios: último merge #285 (4:24). Único PR abierto #280 (sin push desde 2:40). Todo lo pendiente sigue esperando a Andrés.

## Revisión 2026-10-25 09:16 CR
- Sin cambios: último merge #285 (4:24). Único PR abierto #280 (sin push desde 2:40, Sonar rojo conocido). Todo lo pendiente sigue esperando a Andrés. Última revisión programada; rutina de seguimiento borrada (vencía 10 AM).

## Revisión 2026-10-25 22:08 CR (ciclo auditoría → corrección → QA)
Auditorías: las 6 pendientes ya están hechas (1 Pagos, 5 Suscripciones, 6 Chatbots, 7 Hacienda, 8 Telegram, 9 Front), en `auditoria/`.
Mergeados desde la última revisión (CI verde + APTO, sin deploy): #280 SINPE ONVO, #286 test ONVO, #287 y #288 LECTOR, #289 INF-02, #290 INF-03, #291 POS QR, #292 anulaciones/CAJERO, #293 asistente 200 (ALTO-2), #294 asistente logs B1/B2, #295 Telegram token (C1/C5).
Abierto: #296 pausa baja PAST_DUE (S-01 parcial), CI verde, APTO en 3642ae2b; ojo con la baja masiva en la primera corrida con llave live.
En curso local: Hacienda ALTO (8c5da8841), IVA régimen simplificado (ba0a1e9ca), checkout stock lock y dirección/bodega, billing webhook S-02..S-06 y renovación, cuota del chat, teléfono.

| Área | Auditoría | Correcciones | QA | Estado |
|---|---|---|---|---|
| 1 Pagos y Checkout | ✔ | parcial (P-01..P-03 ALTO pendientes) | — | ⏳ |
| 2 Cuentas y Roles | ✔ | A1, A2, LECTOR mergeados | pendiente | ⏳ |
| 3 Marketplace | ✔ | M-01/M-03/M-07 mergeados; M-02 espera a Andrés | pendiente | ⏳ |
| 4 POS e Inventario | ✔ | ALTO 1-3 mergeados | pendiente | ⏳ |
| 5 Suscripciones | ✔ | S-01 parcial (#296); S-02..S-06 en curso | — | ⏳ |
| 6 Chatbots | ✔ | ALTO-2, B1/B2 mergeados; ALTO-1 cuota en curso | — | ⏳ |
| 7 Hacienda | ✔ | 5 ALTO en curso | — | ⏳ |
| 8 Telegram | ✔ | C1, C5 mergeados; C2 pendiente | — | ⏳ |
| 9 Front y UX | ✔ | C1/C2 ALTO pendientes | — | ⏳ |
| 10 Infraestructura | ✔ | INF-02, INF-03 mergeados; INF-01 espera a Andrés | pendiente | ⏳ |
Ninguna área en ✅ todavía.

## Revisión 2026-10-26 00:05 CR
- Mergeados desde 22:08 (CI verde + APTO, sin deploy): #296 pausa baja PAST_DUE (22:38), #297 teléfono de soporte Telegram a config (23:09), #298 SINPE P-02 lock aprobar/rechazar + P-03 /api/sinpe/guest (23:38).
- Abiertos con actividad de los bots (~23:50):
  - #299 P-01 SINPE solo por ONVO + E2E POS: rojo en Build React, Tests Java y SCALE1.
  - #300 billing ONVO S-02/S-04/S-05/S-06: todo verde salvo SonarCloud.
  - #301 P-04 pedidos con llave test marcados como prueba: rojo solo en SCALE1.
  - #302 logs sin PII en pagos/SINPE: Tests Java corriendo, resto verde.
- Pendiente aún: Hacienda 5 ALTO, IVA régimen simplificado, Telegram C2 (antiabuso), Front C1/C2, cuota del chat (Chatbots ALTO-1). Ninguna área en QA todavía.

| Área | Auditoría | Correcciones | QA | Estado |
|---|---|---|---|---|
| 1 Pagos y Checkout | ✔ | P-02/P-03 mergeados; P-01 (#299) y P-04 (#301) abiertos | — | ⏳ |
| 2 Cuentas y Roles | ✔ | A1, A2, LECTOR mergeados | pendiente | ⏳ |
| 3 Marketplace | ✔ | M-01/M-03/M-07 mergeados; M-02 espera a Andrés | pendiente | ⏳ |
| 4 POS e Inventario | ✔ | ALTO 1-3 mergeados | pendiente | ⏳ |
| 5 Suscripciones | ✔ | S-01 parcial mergeado (#296); S-02..S-06 en #300 | — | ⏳ |
| 6 Chatbots | ✔ | ALTO-2, B1/B2 mergeados; ALTO-1 cuota en curso | — | ⏳ |
| 7 Hacienda | ✔ | 5 ALTO en curso | — | ⏳ |
| 8 Telegram | ✔ | C1, C5, teléfono mergeados; C2 pendiente | — | ⏳ |
| 9 Front y UX | ✔ | C1/C2 ALTO pendientes | — | ⏳ |
| 10 Infraestructura | ✔ | INF-02, INF-03 mergeados; INF-01 espera a Andrés | pendiente | ⏳ |
Ninguna área en ✅ todavía.

## Revisión 2026-10-26 02:05 CR
- Mergeados desde 00:05 (CI verde + APTO, sin deploy): #302 logs sin PII pagos/SINPE (00:03), #299 P-01 SINPE solo ONVO + E2E POS (01:13), #301 P-04 pedidos test marcados (01:37), #304 teléfono de soporte desde config (01:53).
- Abiertos:
  - #300 billing ONVO S-02/S-04/S-05/S-06: verde salvo SonarCloud (sin push desde ~23:46).
  - #303 webhook billing 2xx/401/5xx + dedupe: rojo en E4 Commit-gate VEREDICTO y SCALE1 Diff review (falta veredicto/ajustes).
  - #305 renovación ONVO, cierre cancelaciones, baja escalonada (S-01/S-03/S-05/S-07): Tests Java corriendo, resto verde.
- Área 1 Pagos: P-01..P-04 ya mergeados; falta QA del área. Pendiente aún: Hacienda 5 ALTO, IVA simplificado, Telegram C2, Front C1/C2, cuota del chat.

| Área | Auditoría | Correcciones | QA | Estado |
|---|---|---|---|---|
| 1 Pagos y Checkout | ✔ | P-01..P-04 mergeados | pendiente | ⏳ |
| 2 Cuentas y Roles | ✔ | A1, A2, LECTOR mergeados | pendiente | ⏳ |
| 3 Marketplace | ✔ | M-01/M-03/M-07 mergeados; M-02 espera a Andrés | pendiente | ⏳ |
| 4 POS e Inventario | ✔ | ALTO 1-3 mergeados | pendiente | ⏳ |
| 5 Suscripciones | ✔ | #296 mergeado; #300, #303, #305 abiertos | — | ⏳ |
| 6 Chatbots | ✔ | ALTO-2, B1/B2 mergeados; ALTO-1 cuota en curso | — | ⏳ |
| 7 Hacienda | ✔ | 5 ALTO en curso | — | ⏳ |
| 8 Telegram | ✔ | C1, C5, teléfono mergeados; C2 pendiente | — | ⏳ |
| 9 Front y UX | ✔ | C1/C2 ALTO pendientes | — | ⏳ |
| 10 Infraestructura | ✔ | INF-02, INF-03 mergeados; INF-01 espera a Andrés | pendiente | ⏳ |
Ninguna área en ✅ todavía.

## Revisión 2026-10-26 04:05 CR
- Sin merges ni pushes desde 01:55 (último merge #304).
- Abiertos:
  - #305 renovación ONVO/baja escalonada: CI todo verde; falta APTO de Seguridad.
  - #303 webhook billing: E4 BLOQUEADO (posible secreto en el diff) y SCALE1 Diff review rojo.
  - #300 billing S-02/S-04/S-05/S-06: solo SonarCloud Quality Gate rojo; sin push desde ~23:46.
- Pedido a Grok Bot (4:04): APTO + merge de #305, corregir #303 y #300, reactivar Hacienda, IVA, Telegram C2, Front C1/C2, cuota del chat y QA de áreas 1, 2, 3, 4 y 10.
- Tabla sin cambios respecto de 02:05. Ninguna área en ✅ todavía.

## Revisión 2026-10-26 06:08 CR
- Mergeados desde 04:05 (CI verde + APTO, sin deploy): #305 renovación ONVO/baja escalonada (04:26), #306 Telegram C2 saneo (04:27), #308 SINPE mobileNumber + enum identificationType (05:06, QA ALTO 1 y 2), #319 logs sin PII en WhatsApp/correo de negocio (05:07). Master = 949eaa41.
- #300 cerrado sin merge (10:03 UTC); su alcance quedó en #305.
- QA Área 1 (local, ONVO test): halló 2 ALTO en SINPE (mobileNumber sin número, tipo de id) -> corregidos y mergeados en #308, re-QA OK (casos 1, 2 y 4 OK). Caso 3 (sesión ONVO paid+open dejaba el pedido PENDIENTE) -> fix en rama fix/onvo-sesion-pagada-open (62b7c0e1), re-QA OK a las 4:47, SIN PR todavía.
- Abiertos: #307 Front C1 y #318 E2E-REG-01 con CI verde (falta APTO/merge); #303 rojo en E4 y SCALE1 sin push desde ~01:15. Dependabot #309-#317 fuera del ciclo.
- Pedido a Grok Bot (06:08): PR + APTO + merge de 62b7c0e1, APTO/merge #307 y #318, decidir #303, y avanzar Hacienda, IVA, Front C2, cuota del chat y QA de las demás áreas.

| Área | Auditoría | Correcciones | QA | Estado |
|---|---|---|---|---|
| 1 Pagos y Checkout | ✔ | P-01..P-04 y #308 mergeados; fix caso 3 sin PR | casos 1, 2, 4 OK; caso 3 OK en rama | ⏳ |
| 2 Cuentas y Roles | ✔ | A1, A2, LECTOR mergeados; #318 abierto | pendiente | ⏳ |
| 3 Marketplace | ✔ | M-01/M-03/M-07 mergeados; M-02 espera a Andrés | pendiente | ⏳ |
| 4 POS e Inventario | ✔ | ALTO 1-3 mergeados | pendiente | ⏳ |
| 5 Suscripciones | ✔ | #296, #305 mergeados; #303 rojo | pendiente | ⏳ |
| 6 Chatbots | ✔ | ALTO-2, B1/B2, #319 mergeados; ALTO-1 cuota en curso | — | ⏳ |
| 7 Hacienda | ✔ | 5 ALTO en curso | — | ⏳ |
| 8 Telegram | ✔ | C1, C2, C5, teléfono mergeados | pendiente | ⏳ |
| 9 Front y UX | ✔ | C1 en #307 (CI verde); C2 pendiente | — | ⏳ |
| 10 Infraestructura | ✔ | INF-02, INF-03 mergeados; INF-01 espera a Andrés | pendiente | ⏳ |
Ninguna área en ✅ todavía.

## Revisión 2026-10-26 08:18 CR
- Mergeados desde 06:08 (CI verde + APTO, sin deploy): #318 E2E-REG-01 identificación en registro (06:11), #307 Front C1 moneda de línea (06:29), #321 E2E-CMP-01 bodega del vendedor en marketplace (06:56).
- Abiertos:
  - #320 fix ONVO sesión paid+open (QA5 caso 3): CI todo verde, E4 LISTO; falta APTO/merge.
  - #322 Front C2 unidad de precio en cotizaciones: CI todo verde, E4 LISTO; falta APTO/merge.
  - #303 webhook billing: E4 BLOQUEADO y SCALE1 rojo, sin push desde ~01:15.
- Pedido a Grok Bot (08:18): APTO + merge de #320 y #322, corregir o cerrar #303, seguir Hacienda, IVA, cuota del chat y QA de las demás áreas.

| Área | Auditoría | Correcciones | QA | Estado |
|---|---|---|---|---|
| 1 Pagos y Checkout | ✔ | P-01..P-04, #308, #321 mergeados; caso 3 en #320 | casos 1, 2, 4 OK; caso 3 OK en rama | ⏳ |
| 2 Cuentas y Roles | ✔ | A1, A2, LECTOR, #318 mergeados | pendiente | ⏳ |
| 3 Marketplace | ✔ | M-01/M-03/M-07 mergeados; M-02 espera a Andrés | pendiente | ⏳ |
| 4 POS e Inventario | ✔ | ALTO 1-3 mergeados | pendiente | ⏳ |
| 5 Suscripciones | ✔ | #296, #305 mergeados; #303 rojo | pendiente | ⏳ |
| 6 Chatbots | ✔ | ALTO-2, B1/B2, #319 mergeados; ALTO-1 cuota en curso | — | ⏳ |
| 7 Hacienda | ✔ | 5 ALTO en curso | — | ⏳ |
| 8 Telegram | ✔ | C1, C2, C5, teléfono mergeados | pendiente | ⏳ |
| 9 Front y UX | ✔ | C1 mergeado (#307); C2 en #322 (CI verde) | pendiente | ⏳ |
| 10 Infraestructura | ✔ | INF-02, INF-03 mergeados; INF-01 espera a Andrés | pendiente | ⏳ |
Ninguna área en ✅ todavía.

## Revisión 2026-10-26 10:07 CR
- Sin merges ni pushes desde 06:56 (último merge #321). Abiertos sin cambios: #320 y #322 (CI verde, E4 LISTO, falta APTO/merge), #303 rojo sin push desde ~01:15.
- Recordatorio a Grok Bot (10:07): APTO + merge de #320 y #322, corregir o cerrar #303, reactivar Hacienda, IVA, cuota del chat y QA de las demás áreas.
- Tabla sin cambios respecto de 08:18. Ninguna área en ✅ todavía.

## Revisión 2026-10-26 12:13 CR
- Mergeados desde 10:07 (CI verde + APTO, sin deploy): #322 Front C2 unidad de precio (11:35), #320 ONVO sesión paid+open (11:37), #323 P-05 locks de stock ordenados (12:08), #324 P-06/P-07/P-08 dirección obligatoria con envío (12:10).
- #303 webhook billing cerrado sin merge (11:37).
- Abiertos (todos de 11:38 en adelante):
  - Verdes: #326 quitar editor de cotizaciones sin ruta, #329 Sentry opcional sin PII, #330 backup local cifrado, #331 staging en código. Falta APTO/merge.
  - Corriendo: #332 comisiones 9/7,5/6 %, #333 8 días de gracia y suspensión.
  - Rojos: #325 Hacienda XAdES-EPES + XSD 4.4 (SCALE1, gitleaks); #327 cuota del asistente (E2 Tenant/IDOR, SonarCloud, gitleaks); #328 tope global del chat público (Amenazas/pentest copilot).
- Borradores legales listos en `legal/` (términos, privacidad, hoja de ruta, informe persona física) y `plan-piloto.docx`.

| Área | Auditoría | Correcciones | QA | Estado |
|---|---|---|---|---|
| 1 Pagos y Checkout | ✔ | P-01..P-08, #308, #320, #321 mergeados | casos 1-4 OK (re-QA sobre master pendiente) | ⏳ |
| 2 Cuentas y Roles | ✔ | A1, A2, LECTOR, #318 mergeados | pendiente | ⏳ |
| 3 Marketplace | ✔ | M-01/M-03/M-07 mergeados; M-02 espera a Andrés | pendiente | ⏳ |
| 4 POS e Inventario | ✔ | ALTO 1-3 mergeados | pendiente | ⏳ |
| 5 Suscripciones | ✔ | #296, #305 mergeados; #333, #332 abiertos | pendiente | ⏳ |
| 6 Chatbots | ✔ | ALTO-2, B1/B2, #319 mergeados; cuota en #327/#328 (rojos) | — | ⏳ |
| 7 Hacienda | ✔ | firma/XSD en #325 (rojo) | — | ⏳ |
| 8 Telegram | ✔ | C1, C2, C5, teléfono mergeados | pendiente | ⏳ |
| 9 Front y UX | ✔ | C1 (#307) y C2 (#322) mergeados | pendiente | ⏳ |
| 10 Infraestructura | ✔ | INF-02, INF-03 mergeados; #329/#330/#331 verdes; INF-01 local (#330) | pendiente | ⏳ |
Ninguna área en ✅ todavía.

## Revisión 2026-10-26 14:05 CR
- Mergeados desde 12:13 (CI verde + APTO, sin deploy): #326 quitar editor cotizaciones (12:40), #330 backup local cifrado (12:14), #331 staging en código (12:15) y su revert #335 (12:48), #327 cuota del asistente (12:48), #328 tope global chat público (12:49), #333 8 días de gracia/suspensión (13:18), #341 POS kardex 500 y turno 404 (13:37), #339 suspensión manual por impago (13:38), #340 infra re-QA INF-05/06 + CSP sin Stripe (13:47), #342 impago solo se reactiva con pago ONVO (13:58), #325 Hacienda XAdES-EPES + XSD 4.4 (13:59).
- QA nuevo:
  - Área 1 re-QA en master d552ab88 (13:05): todo OK salvo NUEVO ALTO (PaymentExpirationCleanupService deja transacciones "idle in transaction" y bloquea pagos/productos) y QA5-M-01 MEDIO (compra manual de admin da 400 pero crea el pedido; reintentos duplican). Fix en #343, rojo en SCALE1.
  - Área 4 re-QA (12:46): todo OK salvo QA6-R4-01 MEDIO (kardex 500) y R4-02 BAJO; ambos corregidos en #341. Falta re-QA corto.
  - Suite backend en 82860ab: 2698 tests, 0 fallos.
- Abiertos: verdes sin merge #332, #334, #337, #338; corriendo #329, #344, #345; rojo #343 (SCALE1); #336 sin checks.
- Pedido a Grok Bot (14:05): arreglar/merge #343 y re-QA área 1, APTO/merge de los verdes, re-disparar CI de #336, re-QA área 4 y QA del resto.

| Área | Auditoría | Correcciones | QA | Estado |
|---|---|---|---|---|
| 1 Pagos y Checkout | ✔ | P-01..P-08 mergeados; ALTO cleanup + QA5-M-01 en #343 (rojo); #336 abierto | re-QA master: ALTO + MEDIO | ⏳ |
| 2 Cuentas y Roles | ✔ | A1, A2, LECTOR, #318 mergeados | pendiente | ⏳ |
| 3 Marketplace | ✔ | M-01/M-03/M-07 mergeados; #337 abierto; M-02 espera a Andrés | pendiente | ⏳ |
| 4 POS e Inventario | ✔ | ALTO 1-3, #341 mergeados | re-QA OK salvo R4-01/02 (ya corregidos); falta re-QA corto | ⏳ |
| 5 Suscripciones | ✔ | #296, #305, #333, #339, #342 mergeados; #332, #344 abiertos | pendiente | ⏳ |
| 6 Chatbots | ✔ | ALTO-1 (#327, #328), ALTO-2, B1/B2, #319 mergeados | pendiente | ⏳ |
| 7 Hacienda | ✔ | firma/XSD #325 mergeado | pendiente | ⏳ |
| 8 Telegram | ✔ | C1, C2, C5 mergeados; A8 C3/C4 en #338 (verde) | pendiente | ⏳ |
| 9 Front y UX | ✔ | C1, C2 mergeados; 6 MEDIO en #334 (verde) | re-QA halló 6 MEDIO | ⏳ |
| 10 Infraestructura | ✔ | INF-01..03, #330, #340 mergeados; #329 Sentry, #345 correo abiertos | pendiente | ⏳ |
Ninguna área en ✅ todavía.

## 2026-10-26 14:10 CR
- ✅ Área 4 POS e Inventario: re-QA sobre master 2c051030 sin fallos (QA6-R4-01 y R4-02 cerrados). Master 61211cf1, sin deploy.
