# Traspaso — HotClick QA Compra (QA 5)

## Rol
Tester funcional QA 5: compra punta a punta (catálogo, carrito, checkout invitado y logueado, SINPE ONVO, tarjeta ONVO en modo test, webhooks de pago, pedidos manuales de admin). Plan: `/workspace/hotclick-reportes/plan-qa-funcional-2026-10-23.md` (box), secciones **QA 5** y **10**. No toca código, no hace commit de código, push de código, merge, deploy ni cambios en AWS. Reporta solo a Grok Bot.

## En qué quedé (26-oct-2026)
Re-QA del **área 1 (pagos y checkout)** sobre master `d552ab88` (master avanzó a `f9f0e506`, solo scripts de staging/backup, sin cambios de pagos). Todo local, backend propio, ONVO solo test, sin tocar staging ni su `.env`.

- **ALTO nuevo — auto-bloqueo del cleanup:** `PaymentExpirationCleanupService` (al arrancar) bloquea la fila del producto vía `StockReservationService.bloquearActual`, y la captura de un pago paid+open queda esperando ese mismo lock en la misma ejecución; Postgres no lo detecta como deadlock y los checkouts de ese producto se cuelgan (>5 min). Fix sugerido: una transacción por pago. Pasado a Dev Pagos 2 con test de reproducción. Evidencia: `evidencia/hotclick-qa-compra/bloqueo-cleanup.md`.
- **MEDIO QA5-M-01 (P-07):** pedido manual de admin de plataforma sin bodega → resuelve bien la bodega, pero `@CacheEvict(key="#empresa.id.toString()")` en `PedidoService.crearPedidoManual` revienta con empresa null después del commit → 400 genérico con el pedido ya guardado → cada reintento duplica pedidos. Además queda PENDIENTE aunque se pida ENTREGADO. En archivo de pendientes. Pasado a Dev Pagos 2.
- **OK:** SINPE marketplace y POS con tipo de identificación 0 y 1; 410 en confirmar/rechazar SINPE; tarjeta paid+open en ONVO + webhook duplicado; P-05 concurrencia sin deadlock; P-06 dirección obligatoria; P-08 bodega de otra tienda rechazada.
- Casos 1–3 del área 1 OK sobre los fixes de #308 y #320.
- **Área 1 sigue ABIERTA** hasta que los fixes de Dev Pagos 2 estén en master; ahí se re-prueba.

## Ramas y PRs
Ninguno propio. Los worktrees locales `qa5-b4560f3c`, `qa5-b7b61632`, `qa5-62b7c0e1` eran checkouts (HEAD separado, sin cambios) de commits de otros bots, ya en origin. Única contribución git: esta nota y su evidencia en `docs/traspaso-cuenta-nueva`.

## Bugs abiertos (QA 5)
QA5-B456-01, QA5-B456-02, QA5-62B7-01, QA5-62B7-02, QA5-M-01, QA5-001, QA5-003 (ver `evidencia/hotclick-qa-compra/QA5-003.md`), el ALTO del auto-bloqueo del cleanup, y **Clerk/CSP en prod** (bloquea el login en prod, y con eso la compra de prueba en prod).

## Pendientes / próximos pasos
1. Re-probar área 1 cuando los fixes del auto-bloqueo y QA5-M-01 estén en master (correr el test de reproducción + flujo en vivo).
2. Compra en prod del producto 666, **una sola vez**, con login de la cuenta de prueba Emprendedor, Retiro en tienda + SINPE ficticio `PRUEBA`, **nunca tarjeta**, solo cuando se arregle Clerk/CSP en prod.
3. Venta con envío solo después de que #266 esté desplegado.
4. Limpiar lo listado en `evidencia/hotclick-qa-compra/prod-creados.md`.
5. Limpiar leftovers en ONVO test (sesiones / payment methods de prueba creados por QA 5).

## Decisiones de Andrés que conozco
- Pruebas en prod autorizadas solo con cuentas de prueba, contra negocios "Prueba Andrés", sin tarjeta, con SINPE ficticio `PRUEBA`; no tocar los 7 negocios demo.
- Bugs medio/bajo → archivo de pendientes; alto/crítico → aviso inmediato.
- Cada fix lleva su test de reproducción.
- Sin deploy; las pruebas locales no usan prod. ONVO solo en modo test (nunca llaves live ni cobros reales).
- Merges a master: CI verde + APTO sobre el hash exacto.

## Evidencia
- Resumida en el repo: `docs/traspaso/evidencia/hotclick-qa-compra/` (solo .md, redactados: teléfonos, identificaciones, correos, sesiones y tokens reemplazados por marcadores).
- Completa (logs de backend, threaddumps, capturas) en el box: `/workspace/hotclick-reportes/qa5/` (area1-b4560f3c, area1-b7b61632, area1-caso3-fix, area1-master, QA5-003.md, prod-creados.md). No se subió por tamaño y por contener datos sin redactar.
- Variables relevantes (solo nombres): `ONVO_SECRET_KEY` (onvo_test_), `ONVO_WEBHOOK_SECRET`, `EMPRESA_PLATAFORMA_ID`.
