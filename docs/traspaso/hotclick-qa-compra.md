# Traspaso: HotClick QA Compra (QA 5)

Actualizada el 2 nov 2026. Esta es la versión vigente. `qa-compra.md` es una versión vieja (commit cee9c58bd) que se conserva como historial.

## 1. Rol (para recrearme en otra cuenta)
- **Nombre:** HotClick QA Compra
- **Título:** HotClick QA Compra
- **Descripción (tal cual del perfil):**

> QA 5 de HotClick: compra de punta a punta (área 1): carrito, checkout con ONVO en modo test, pago exitoso y fallido, el pedido visto por la tienda y el admin, y posventa. Proponés mejoras al flujo. Nunca llaves live ni cobros reales. Repo hotclickdev/Hot-click-dev. Reportás solo a Grok Bot (id 2f876dbf-e82a-4b66-b209-2249a23ec8ca); nunca hablás con Andrés ni con humanos. Leé tu nota docs/traspaso/hotclick-qa-compra.md (rama docs/traspaso-cuenta-nueva). No tocás código ni hacés deploy; nada de datos sensibles en reportes; nunca digas que algo pasa sin evidencia. Español de Costa Rica con voseo. Reporte: Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso.

- Rama de código propia: **ninguna**. Soy QA y no toco código, así que no hay PR draft [INCOMPLETO] que abrir. Mi única contribución en git son las notas de traspaso en `docs/traspaso-cuenta-nueva`.

## 2. Reglas que sigo
- ONVO solo en modo test. Nunca llaves live ni cobros reales. Tarjetas de test: aprobada 4242424242424242, rechazada 4000000000000002.
- SINPE Móvil vía ONVO está apagado (falta `ONVO_SINPE_DESTINO`): no se prueba.
- Sin ensayo MOCK.
- No toco código ni hago deploy. Nunca push a master.
- Nada sensible en reportes (llaves, tokens, claves, correos, teléfonos).
- Nunca digo que algo pasa sin evidencia (salida de tests, logs, HTTP, BD o captura). Lo que no se puede probar va como BLOQUEADO con el motivo.
- Formato de reporte: Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso.
- No hablo con humanos (ni con Andrés). Solo con agentes.
- **Claves de cuentas QA:** archivo cifrado `/workspace/hotclick/fase2/cuentas-qa-staging.tsv.gpg`; la passphrase está en `/workspace/hotclick/.qa-cuentas.pass`. El TSV tiene encabezado `usuario\tclave` (filtrá por el usuario exacto o usá NR>1). Se usa **solo** en un único comando de este tipo, que descifra, escribe y borra la variable:
  `CLAVE=$(gpg --batch --quiet --passphrase-file <pass> -d <tsv.gpg> | awk -F'\t' '$1=="<usuario exacto>" {printf "%s",$2; exit}'); printf '%s' "$CLAVE" | xdotool type --clearmodifiers --delay 30 --file -; unset CLAVE`
  - Nunca echo, cat, head ni imprimir claves; no mirar la estructura del TSV. Ningún subagente imprime claves.
  - En el navegador la clave se escribe con xdotool dentro de ese mismo comando (lo hace el subagente de escritorio).
  - No usar el vault para esto; no pedirle a CI/CD que instale nada.
- Tests locales solo dirigidos. Suites completas o instancias locales siempre bajo `flock /workspace/hotclick/.suite-completa.lock <comando>`. Mato mis procesos por PID al terminar (nunca pkill).
- El Mentor asigna el trabajo de QA. HotClick QA (líder) da los ✅ finales.
- El staging local en :8081 lo despliega HotClick CI/CD, no yo.
- La página hospedada de ONVO no carga en headless: usar el navegador normal del box.
- Probar el login en ventana incógnito para evitar el bundle viejo del service worker cacheado.

## 3. Lo que hice (con hashes)
- **Área 1 sobre `3323bd1a`: PARCIAL.** 152 tests dirigidos OK (detalle en `qa-compra.md`).
- **Área 3 sobre `649387e7`: PARCIAL.** 292 tests backend + 153 frontend OK. Pendientes: M-08 (sobreventa oculta, abierto), #266 cerrado sin merge, M-07 sin vigencia en ofertas.
- **E2E checkout en staging `53138281` con ONVO test: APROBADO CON OBSERVACIONES.**
  - Pedidos 12 y 14 PAGADOS con una sola transición de estado.
  - Pedido 13 (tarjeta rechazada 4000000000000002) queda PENDIENTE porque no llega webhook.
  - PUT estado no es idempotente: manda correos duplicados.
  - `/pago/exito` sin sesión hace polling ~3 min y termina en "Tu pago está siendo revisado" (MEDIO, UX).
- **ALTO enviado a Dev Pagos:** el checkout del storefront nunca pasa por ONVO (`TiendaCheckoutPage.tsx:23-24`, `PAGO_PRINCIPAL` = `SINPE_MOVIL`). El comprador no puede pagar con tarjeta ni cancelar (cancelar da 500 "Pago no encontrado").
- **ORD-BD690F4AF4C8 (pedidoId 15)** cancelado por la API de la tienda: stock del producto 41 de 14 a 16, liberación de reservas registrada una sola vez.
- **Re-QA de PR #503** (merge `64212015`, fila 27 de Bugs) en staging `64212015`: **APROBADO 3/3**. Token con empresa activa; panel sin "sin negocio asociado"; selector con varias membresías (usa cambiar-negocio); toast "¡Hola, Diego!" en incógnito.
  - Riesgos BAJO reportados: el SW en modo prompt deja el bundle viejo a quien tiene sesión abierta; `/logout` por URL daba 404 (atendido en #506, pendiente de re-QA).
- **Mis pedidos de prueba:** 9, 12, 13, 14, 15.

## 4. Pendientes
- [PENDIENTE] Re-QA de #505 (`b93608e1`) y #506 (`61b36a38`) cuando staging corra un hash que incluya `61b36a38` (al 2 nov 13:53 hora de Costa Rica seguía en `64212015`):
  1. `/logout` por URL cierra sesión, muestra "Sesión cerrada", redirige a `/` y después el refresh falla.
  2. Con un SW viejo cacheado, después del login se aplica la versión nueva una sola vez, sin bucle de recarga.
  3. El logout desde `/perfil` sigue funcionando.
- [PENDIENTE] Re-QA del fix del ALTO storefront→ONVO cuando Dev Pagos lo entregue.
- [PENDIENTE] Re-QA de M-08, #266 y M-07 en un hash nuevo.
- [PENDIENTE] Pedido 13 PENDIENTE sin webhook y PUT estado no idempotente: seguir con Dev Pagos.

## 5. Evidencia (en el box, sin subir por contener datos sin redactar)
- `/workspace/hotclick-reportes/qa5/staging-53138281-20261102/`
  - cancelacion-storefront.txt
  - checkout-onvo-test.txt
  - onvo-aprobada.png
  - onvo-hosted-headless.png
  - onvo-rechazada.png
  - pago-real-navegador.txt
  - panel-sin-negocio.png
  - reqa-pago-exito.png
  - verificacion.txt
- `/workspace/hotclick-reportes/qa5/staging-64212015-20261102/`
  - emprendedor-pyme.png
  - mode-select-pyme.png
  - pedidos-pyme.png
  - reqa-503.txt
  - selector-plus.png
  - toast-pyme.png
- Evidencia redactada más vieja en el repo: `docs/traspaso/evidencia/hotclick-qa-compra/`.

## 6. Próximos pasos exactos, en orden
1. Leer esta nota y `qa-compra.md`. Confirmar con el Mentor qué QA te toca.
2. Preguntarle a HotClick CI/CD (o revisar el health de :8081) qué hash corre staging. No desplegar vos.
3. Si el hash incluye `61b36a38`: hacer el re-QA de #505/#506 (los 3 puntos de arriba) en incógnito, con capturas en una carpeta nueva `/workspace/hotclick-reportes/qa5/staging-<hash>-<fecha>/`, y reportarle a HotClick Dev Marketplace y HotClick QA.
4. Cuando Dev Pagos entregue el fix del storefront→ONVO y esté en staging: comprar en el storefront con 4242 (aprobada) y 4000000000000002 (rechazada), verificar el estado del pedido para tienda y admin, y probar la cancelación.
5. Seguir con Dev Pagos el pedido 13 sin webhook y la idempotencia de PUT estado; re-probar cuando haya fix.
6. Re-QA de M-08, #266 y M-07 con tests dirigidos sobre el hash nuevo (comandos en `qa-compra.md`).
7. Reportar siempre con el formato de la sección 2 y esperar el ✅ de HotClick QA.

## Historial anterior (nota del 26 oct, se conserva lo útil)
### En qué quedé (26-oct-2026)
Re-QA del **área 1 (pagos y checkout)** sobre master `d552ab88` (master avanzó a `f9f0e506`, solo scripts de staging/backup, sin cambios de pagos). Todo local, backend propio, ONVO solo test, sin tocar staging ni su `.env`.

- **ALTO nuevo — auto-bloqueo del cleanup:** `PaymentExpirationCleanupService` (al arrancar) bloquea la fila del producto vía `StockReservationService.bloquearActual`, y la captura de un pago paid+open queda esperando ese mismo lock en la misma ejecución; Postgres no lo detecta como deadlock y los checkouts de ese producto se cuelgan (>5 min). Fix sugerido: una transacción por pago. Pasado a Dev Pagos 2 con test de reproducción. Evidencia: `evidencia/hotclick-qa-compra/bloqueo-cleanup.md`.
- **MEDIO QA5-M-01 (P-07):** pedido manual de admin de plataforma sin bodega → resuelve bien la bodega, pero la anotación `CacheEvict(key="#empresa.id.toString()")` en `PedidoService.crearPedidoManual` revienta con empresa null después del commit → 400 genérico con el pedido ya guardado → cada reintento duplica pedidos. Además queda PENDIENTE aunque se pida ENTREGADO. En archivo de pendientes. Pasado a Dev Pagos 2.
- **OK:** SINPE marketplace y POS con tipo de identificación 0 y 1; 410 en confirmar/rechazar SINPE; tarjeta paid+open en ONVO + webhook duplicado; P-05 concurrencia sin deadlock; P-06 dirección obligatoria; P-08 bodega de otra tienda rechazada.
- Casos 1–3 del área 1 OK sobre los fixes de #308 y #320.
- **Área 1 sigue ABIERTA** hasta que los fixes de Dev Pagos 2 estén en master; ahí se re-prueba.

### Ramas y PRs
Ninguno propio. Los worktrees locales `qa5-b4560f3c`, `qa5-b7b61632`, `qa5-62b7c0e1` eran checkouts (HEAD separado, sin cambios) de commits de otros bots, ya en origin. Única contribución git: esta nota y su evidencia en `docs/traspaso-cuenta-nueva`.

### Bugs abiertos (QA 5)
QA5-B456-01, QA5-B456-02, QA5-62B7-01, QA5-62B7-02, QA5-M-01, QA5-001, QA5-003 (ver `evidencia/hotclick-qa-compra/QA5-003.md`), el ALTO del auto-bloqueo del cleanup, y **Clerk/CSP en prod** (bloquea el login en prod, y con eso la compra de prueba en prod).

### Pendientes / próximos pasos
1. Re-probar área 1 cuando los fixes del auto-bloqueo y QA5-M-01 estén en master (correr el test de reproducción + flujo en vivo).
2. Compra en prod del producto 666, **una sola vez**, con login de la cuenta de prueba Emprendedor, Retiro en tienda + SINPE ficticio `PRUEBA`, **nunca tarjeta**, solo cuando se arregle Clerk/CSP en prod.
3. Venta con envío solo después de que #266 esté desplegado.
4. Limpiar lo listado en `evidencia/hotclick-qa-compra/prod-creados.md`.
5. Limpiar leftovers en ONVO test (sesiones / payment methods de prueba creados por QA 5).

### Decisiones de Andrés que conozco
- Pruebas en prod autorizadas solo con cuentas de prueba, contra negocios "Prueba Andrés", sin tarjeta, con SINPE ficticio `PRUEBA`; no tocar los 7 negocios demo.
- Bugs medio/bajo → archivo de pendientes; alto/crítico → aviso inmediato.
- Cada fix lleva su test de reproducción.
- Sin deploy; las pruebas locales no usan prod. ONVO solo en modo test (nunca llaves live ni cobros reales).
- Merges a master: CI verde + APTO sobre el hash exacto.

### Evidencia
- Resumida en el repo: `docs/traspaso/evidencia/hotclick-qa-compra/` (solo .md, redactados: teléfonos, identificaciones, correos, sesiones y tokens reemplazados por marcadores).
- Completa (logs de backend, threaddumps, capturas) en el box: `/workspace/hotclick-reportes/qa5/` (area1-b4560f3c, area1-b7b61632, area1-caso3-fix, area1-master, QA5-003.md, prod-creados.md). No se subió por tamaño y por contener datos sin redactar.
- Variables relevantes (solo nombres): `ONVO_SECRET_KEY` (onvo_test_), `ONVO_WEBHOOK_SECRET`, `EMPRESA_PLATAFORMA_ID`.

### Correcciones al README

**(a) Errores o datos viejos**
- Fila de QA Compra: la compra en prod solo va después del fix de Clerk/CSP. Es una sola compra del producto 666 con la cuenta Emprendedor, Retiro en tienda y SINPE PRUEBA. Nunca Tarjeta ni Efectivo, porque ONVO en prod está en LIVE. La venta con envío espera el deploy de #266.
- Área 1: además del fix #343, el re-QA tiene que confirmar los dos bugs por separado. El ALTO es el congelamiento por candado: `PaymentExpirationCleanupService` es Transactional y retiene el FOR UPDATE del producto, mientras la captura en REQUIRES_NEW espera en `StockReservationService.bloquearActual`. El MEDIO es QA5-M-01/P-07: el CacheEvict con empresa null devuelve 400 aunque el pedido se guarda, y además el pedido queda PENDIENTE aunque se pida ENTREGADO. P-05, P-06 y P-08 ya pasaron en master d552ab88.

**(b) Lo que necesita mi reemplazo**
- Logins de hotclick.lat en el Vault de Grok Bot, solo por nombre: Cliente, Emprendedor, PYME, Plus y Admin. Nunca se escriben en chat ni en reportes.
- Re-QA local: hacer un worktree del hash de master con los fixes y levantar el backend con un perfil local, en un puerto que no sea 8081. Usar una base de datos local propia y ONVO en modo test con la tarjeta 4242. Los webhooks se simulan con el secreto de test, por nombre de variable y nunca en el `.env` de staging.
- Trampas:
  - No tocar staging (:3000 y :8081), no usar pkill y detener procesos solo por PID.
  - No borrar los node_modules de staging ni node22.
  - Si el checkout se congela, sacar un thread dump; es el bug ALTO.
  - Para probar la expiración hay que ajustar `fecha_creacion` de los pagos locales.
  - No tocar las 7 empresas demo.
  - Borrar lo que está en `qa5/prod-creados.md` solo cuando se pida.

**(c) Mejoras**
- Agregar al README un comando de re-QA reproducible por área: el hash más la lista de casos.
- Marcar en la tabla qué pruebas se pueden hacer en prod y cuáles solo en local.
