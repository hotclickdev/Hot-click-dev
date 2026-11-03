# Traspaso — HotClick Dev Pagos 2 (2-nov-2026, hora CR)

> Fuente vigente para recrear este perfil. `dev-pagos-2.md` es solo un puntero a este archivo. El historial anterior queda en git (`git log -- docs/traspaso/hotclick-dev-pagos-2.md docs/traspaso/dev-pagos-2.md`). Sin secretos, cédulas reales, IBAN, SINPE ni teléfonos: acá solo se dice dónde están.

## Rol
Nombre del perfil: **HotClick Dev Pagos 2**. Descripción completa (literal de `profile.json`):

> Segundo desarrollador de pagos de HotClick: POS, IVA y Hacienda (áreas 1, 4 y 7). Te coordinás directo con HotClick Dev Pagos. Repo hotclickdev/Hot-click-dev (Spring Boot 3/Java 21, React 19/Vite/pnpm, Postgres/Flyway). Reportás solo a Grok Bot (id 2f876dbf-e82a-4b66-b209-2249a23ec8ca); nunca hablás con Andrés ni con humanos. Antes de empezar leé tu nota de traspaso docs/traspaso/hotclick-dev-pagos-2.md (rama docs/traspaso-cuenta-nueva). Reglas: push y PRs propios (máx 3 abiertos, sin force, sin --no-verify, sin rebase); merge solo con CI verde y APTO de HotClick Seguridad sobre el hash exacto; nunca deploy, gastos, cuentas ni servidores nuevos; ONVO fail-closed (mock solo en perfiles dev/test) y único procesador (Tilopay y Stripe son deuda técnica); Flyway solo aditivo y numerado después de V200 (renumerá V197/V198 de feat/iva-regimen); un test de regresión con cada fix; nada de secretos, cédulas, IBAN, SINPE ni teléfonos en chat o repo; worktree propio, sin git stash ni pkill; nunca digas que funciona sin correr la suite. Español de Costa Rica con voseo. Reporte: Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso.

## Reglas del Mentor
- El flag `hotclick.iva.cambio-regimen.enabled` se queda en **false**.
- ONVO **solo en modo TEST**. Las llaves de prueba nunca se imprimen, loguean ni commitean. No tocar el dashboard ni la llave live.
- Tests solo dirigidos (`-Dtest=...`). La suite completa o cualquier cosa pesada va con `flock /workspace/hotclick/.suite-completa.lock <cmd>`.
- Instancias locales: se apagan por PID exacto. Nada de `pkill`.
- Nada de CloudAgent.
- Nunca hablar con Andrés.

## Flujo de merge
1. Worktree nuevo desde `origin/master`, rama propia, el fix con su test de regresión y los tests dirigidos.
2. Push normal y PR. Con CI verde, pedir el APTO a HotClick Seguridad sobre el **hash exacto** del head. Darle head, tree, parents, base y `ls-remote`.
3. El merge lo hace HotClick CI/CD con `gh pr merge --match-head-commit <head con APTO>`.
4. Si master avanza, hacer un merge puro (`git merge --no-edit origin/master`, sin rebase ni force), correr los tests dirigidos y hacer push. **Cada merge puro necesita re-APTO** sobre el head nuevo.
5. Si el merge trae cambios en `frontend/src`, `static/` queda desactualizado y CI/CD lo reconstruye en un commit aparte.
6. Después del merge, avisar al Mentor y actualizar esta nota.
7. Falso positivo del gate SCALE1: label `skip-scale-gate` más un comentario con la justificación.

## Hecho
| PR | Qué | Merge |
|---|---|---|
| #323 | `fix/checkout-stock-lock` (P-05, lock por lote ordenado) | `8a1a103b` |
| #324 | `fix/checkout-bodega-direccion` (P-06/07/08) | `d552ab88` |
| #325 | `fix/hacienda-alto` (Hacienda ALTO 1–5, XSD 4.4, HaciendaLogSanitizer, V196) | `2c051030` |
| #336 | `fix/checkout-bodega-default-front` | `b1b6a2cf` |
| #343 | `fix/checkout-lock-expiracion-pedido-manual` (Andrés mantuvo la excepción ENTREGADO, solo para el admin de plataforma) | `c48cb9ea` |
| #429 | `fix/contingencia-y-oraculo-pos` | `d36f3816` |
| #431 | `fix/area7-emision-y-logs`: emisión solo por admin, `hacienda.emision-automatica` en false por defecto, logs sanitizados | `07592b27` |
| #436 | `feat/onvo-vencimiento-y-estado`: `GET /api/payments/status/{n}` con reconsulta a ONVO, fail-closed | `270236e3` |
| #438 | `fix/cedula-guiones`: `CedulaEmisor.normalizar` (APTO sobre `7f759a22`) | `98b70413` |
| #460 | `fix/pago-lows-seguridad`: guard de reembolso antes de CAPTURADO en ONVO, Tilopay y Stripe; reembolso parcial V215 (APTO sobre `2d4ef8e0`) | `dc1fabd5` |
| #473 | `fix/actualizado-sql-v215`: V215 en `Actualizado.sql` y `PagoReembolsoParcialMigrationTest` | `d2fabf55` |

También: E2E ONVO TEST completo sin bugs (tarjetas de prueba, 3DS, polling, expiración, fail-closed).

## Pendientes
- [PENDIENTE] **#501** `fix/pago-exito-token-status`: `PedidoStatusTokenService` (HMAC de `jwt.secret`, 60 min, solo para leer el status) en la URL de retorno ONVO (`&st=`), y un 404 que muestra «Iniciá sesión para ver tu pedido». Head `e3296487` (merge puro de master `3f9046df` hecho por CI/CD). Espera re-APTO y merge. **No hacer push a esa rama.**
- [PENDIENTE] BAJOs de Seguridad del #501 (PR aparte):
  - `history.replaceState` para quitar `st` de la URL en `PaymentStatusPage.tsx:23`.
  - Rate limit en `/api/payments/status/*`.
- [PENDIENTE] BAJOs del #460:
  - Tope de `monto_reembolso_pendiente + monto_reembolsado` contra `pago.monto`.
  - La alerta muestra el total en vez del parcial.
  - La cola de Admin Pagos no muestra los reembolsos parciales.
- [PENDIENTE] A `Actualizado.sql` le faltan V208 a V214 y V216. Revisar también las de V217 en adelante que haya en master.
- [PENDIENTE] Filtro por empresa en `OrdenCompraService:140` y `StockReservationService:59/136` (`findAllByIdsForUpdate` no filtra por empresa).
- [PENDIENTE] El sanitizer (`HaciendaLogSanitizer`) no enmascara cédulas con puntos ni con guiones en todos los casos.
- [PENDIENTE] BAJOs de área 7:
  - 408/429 del IdP en `HaciendaTokenService:115-119` → `HaciendaTransitoriaException`.
  - Excepciones HTTP: dejar solo `simpleName` y el status.
  - El check de admin en `FacturacionService:64`.
- [PENDIENTE] BAJOs de #436:
  - `sessionId` de ONVO en `log.info`.
  - Timing del HMAC cuando la orden no existe.
  - Limitador en memoria con N réplicas.
- [PENDIENTE] `VisitantePagoResultado.tsx` (flujo de visitante del prototipo) no lee `st` ni muestra `login_required`.
- [PENDIENTE] Andrés tiene que decidir el valor de producción de `hacienda.emision-automatica`. Se pide vía Grok Bot, nunca directo.
- LOW de Dev Pagos, no se corrige desde esta área: `SuscripcionOnvoChangeService.java:431-434` (usar `max(finTrial, hoy)`).

## Coordinación con Dev Pagos
- Su ALTO del checkout del storefront **reusa `PedidoStatusTokenService.emitir` y `esValido`** (#501). No cambiar el formato `<vence>.<hmac>` ni el prefijo `status|` sin avisar.
- Su PR A toca `OnvoArranqueProdGuard` y la lectura de `app.url`.
- Su PR B toca las transiciones a FALLIDO, la liberación de stock, el job de reconsulta de PENDIENTE y `PUT /pedidos/{id}/estado`.
- No tocar esas partes. `usePayment.ts` y el endpoint de status son de Dev Pagos 2.

## Rutas
- **Worktrees** (todos limpios y empujados al 2-nov):
  - `/workspace/ws20` (#429)
  - `/workspace/ws21` (#431)
  - `/workspace/ws22` (detached en `07592b27`)
  - `/workspace/ws23` (#436)
  - `/workspace/ws24` (#438)
  - `/workspace/ws24-docs` (rama `docs/traspaso-cuenta-nueva-dp2`; se empuja con `HEAD:docs/traspaso-cuenta-nueva`)
  - `/workspace/ws25` (#460, `fix/pago-lows-seguridad-dp3`, ya en master)
  - `/workspace/ws26` (#473)
  - `/workspace/ws27` (#501)
- **Fase 2:** `/workspace/hotclick/fase2/`
  - `prerevision-PR460.md`, `seguridad-P0.md`, `matriz-pruebas.md/.csv`, `datos-prueba.md`, `checklist-paso0.md`, `semilla/`.
  - Las cuentas QA están cifradas en `cuentas-qa-staging.tsv.gpg`. No se descifran ni se copian.
- **Evidencias:** `docs/traspaso/evidencia/` (por auditor) en esta rama.
- **Secretos:** en GitHub Secrets y en el `.env` del servidor. Nunca se leen. En tests se usan las variables dummy de CI (ver la skill hot-click-dev-workflow).
- **Maven:** `mvn -o -B test -Dtest=... -Dsurefire.failIfNoSpecifiedTests=false` desde `Hot_click_outlet`, con las variables de CI. El frontend no tiene `node_modules` en el box, así que vitest y `static/` los corre CI/CD.

## Flyway
Última migración en master al 2-nov: **V222** (`tipos_otp_registro_reset_en_tabla_jpa`). La próxima libre es **V223**. Revisar `git ls-tree origin/master Hot_click_outlet/src/main/resources/db/migration/` antes de numerar, y duplicar cada migración en `Actualizado.sql`.

## Próximos pasos exactos
1. Esperar el re-APTO de Seguridad y el merge de #501 por CI/CD (`--match-head-commit e3296487`). No hacer push a esa rama. Después, marcarlo MERGEADO acá y avisar al Mentor.
2. PR nuevo desde `origin/master` con los BAJOs del #501: `replaceState` de `st` y rate limit del status, cada uno con su test.
3. PR con los BAJOs del #460: tope del monto, alerta con el parcial y la cola de Admin Pagos.
4. PR de `Actualizado.sql` con V208–V214, V216 y las que falten, con su test.
5. PR del filtro por empresa (`OrdenCompraService`, `StockReservationService`).
6. PR del sanitizer (cédulas con puntos y guiones) y de los BAJOs del área 7.
7. `VisitantePagoResultado.tsx` con `st`, o confirmar que la ruta está muerta.
8. Respetar el máximo de 3 PRs abiertos propios.
