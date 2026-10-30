# Traspaso: QA Compra (QA 5)

Nota anterior, con el historial completo del área 1: [hotclick-qa-compra.md](hotclick-qa-compra.md).

## Rol
Sos QA 5, tester funcional de compra punta a punta. Te toca el área 1 (pagos y checkout: carrito, checkout, pago manual `PedidoPagoManualService`, ONVO, el pedido visto por la tienda y el admin, posventa y concurrencia) y el re-QA del área 3 (marketplace: catálogo, tiendas, carrito, ofertas, envíos y checkout del marketplace). Le reportás a HotClick QA (el líder).

## Reglas
- ONVO solo en modo test: nunca llaves live ni cobros reales.
- No tocás código. Sin commit de código, sin deploy, sin push a master. Solo docs de traspaso en `docs/traspaso-cuenta-nueva`, y solo cuando te lo piden.
- Nada en prod ni en staging (:3000 y :8081).
- En el box corrés solo tests dirigidos. Cualquier suite completa o app levantada va con `flock /workspace/hotclick/.suite-completa.lock <comando>`, porque el box se queda sin memoria (ya pasó, con un límite de 15,6 GB).
- Nada de datos sensibles en reportes: llaves, tokens, teléfonos ni correos reales.
- Nada se da por bueno sin evidencia (salida de tests, logs, HTTP o BD). Lo que no se puede probar va como BLOQUEADO, con el motivo.
- Detené tus procesos por PID; nunca uses `pkill`.

## Resultados

### Área 1 sobre `3323bd1a82c0b25c16d6508646dcc66b772b13ab` (P-02 #356 + lock #357): PARCIAL
- 152 tests OK, 0 fallos: `PedidoPagoManualTest` 62, `PedidoPagoManualLockTest` 5, `ConfirmarVsCancelarPagoConcurrenteTest` 5, `PagoExpiradoCanceladorConcurrenciaTest` 3, `OnvoCapturaConcurrenteTest` 4, `CapturaSinpeSoloOnvoTest` 2, `OnvoPagoVerificacionTest` 14, `RutasConfirmacionPagoTest` 3, `PedidoServiceTest` 52 y `PosAnulacionConcurrenciaTest` 2.
- El flujo en vivo quedó BLOQUEADO: no hay base Postgres propia ni llave `onvo_test_` en el box, y HotClick QA confirmó que no las va a dar.
- Riesgo: los tests de concurrencia corren sobre H2, y los locks no se comportan igual que en Postgres. El bug ALTO del auto-bloqueo del cleanup se valida en Postgres; eso lo hace HotClick QA aparte.

### Área 3 sobre `649387e7945832d7f7027ca4bf6d4ab34b892013`: PARCIAL
- Backend: 59 clases, 292 tests OK. Frontend (vitest): 26 archivos, 153 tests OK.

| Hallazgo | Estado | Dónde |
|---|---|---|
| M-01 ofertas no cobradas | Corregido | `OrderPricingService.precioEfectivo`, usado en carrito, storefront y checkout; `PrecioEfectivoOfertaTest`, `StorefrontPrecioOfertaTest` y `cartStore.precioOferta.test.ts` |
| M-02 datos de prueba en prod | Fuera de alcance | Espera la decisión de Andrés |
| M-03 cantidad ≤ 0 | Corregido | `CarritoService` rechaza `cantidad <= 0`; `CarritoCantidadInvalidaTest` |
| M-04 pedido de invitado sin validar | Corregido | `StorefrontGuestOrderService` (publicable y vendido); `StorefrontGuestOrderPublicableTest` |
| M-05 artículo único y fusión de ítems | Corregido | Guarda en `CarritoService`; `MarketplaceReqaArea3Test.carritoFusiona` |
| M-06 `/variantes` | Corregido | `MarketplaceReqaArea3Test` (404 por guard o por id inexistente; un error interno no se devuelve como 404) |
| M-07 reglas de oferta | Parcial | La regla está unificada, pero las ofertas no tienen vigencia (el Producto no tiene campos de fecha) |
| M-08 sobreventa oculta | ABIERTO | `StockReservationService` sigue con `Math.max(0, …)` y solo un `log.error("OVERSELL…")`; está con Dev Pagos |

- El #266 (`fix/checkout-bodega-envio`, CMP-4 / QA5-002) está CERRADO sin mergear, con 3 commits fuera de master. No verifiqué si otro PR lo reemplazó.
- La rama `cursor/carrito-eliminar-mobile-085b` tiene 1 commit suelto y no tiene PR.
- El flujo en vivo quedó BLOQUEADO por el mismo motivo que en el área 1.

## Evidencia
Estaba en `/tmp/hc5-tests.log` (área 1), `/tmp/a3r/` (reportes de surefire del área 3) y `/tmp/a3b_*.log`. **`/tmp` no es persistente**: al escribir esta nota, `/tmp/a3r/` ya no estaba. Reproducila con los comandos de abajo.

## Cómo reproducir
Desde `Hot_click_outlet`, con las variables de CI (H2, sin llaves reales):
```bash
export DB_URL=jdbc:h2:mem:testdb DB_USERNAME=sa DB_PASSWORD= JWT_SECRET=test-secret-for-ci-only-not-production SENTRY_DSN= STRIPE_SECRET_KEY=ci-mock-not-a-stripe-key STRIPE_WEBHOOK_SECRET=whsec_placeholder MAVEN_OPTS=-Xmx768m
# Área 1
mvn -B -q test "-Dtest=PedidoPagoManualTest,PedidoPagoManualLockTest,ConfirmarVsCancelarPagoConcurrenteTest,OnvoCapturaConcurrenteTest,CapturaSinpeSoloOnvoTest,PagoExpiradoCanceladorConcurrenciaTest,RutasConfirmacionPagoTest,OnvoPagoVerificacionTest,PedidoServiceTest,PosAnulacionConcurrenciaTest" -Dsurefire.failIfNoSpecifiedTests=false
# Área 3: lista de clases, corrida en lotes de 15 para no quedarse sin memoria
find src/test -name "*.java" | grep -iE "marketplace|carrito|oferta|precio|tienda|envio|checkout|catalog|variante|storefront|bodega" \
  | grep -viE "chat|telegram|agentes|facturacion|reenvio|Csp|territorial|Pdf|Csv|Seeder" | xargs -n1 basename | sed 's/.java//' > /tmp/a3list
split -l 15 /tmp/a3list /tmp/a3b_
for f in /tmp/a3b_??; do flock /workspace/hotclick/.suite-completa.lock mvn -B -q test "-Dtest=$(paste -sd, $f)" -Dsurefire.failIfNoSpecifiedTests=false -DargLine=-Xmx1536m > $f.log 2>&1; echo "$f exit=$?"; done
```
Frontend (pide Node ≥ 22.13; en el box está en `/tmp/node-v22.13.1-linux-x64/bin`), desde `Hot_click_outlet/frontend`:
```bash
pnpm install --frozen-lockfile
npx vitest run $(find src -name "*.test.*" | grep -iE "carrito|cart|checkout|oferta|precio|tienda|envio|marketplace" | grep -viE "chatProducto|reenvio|planesPrecios")
```

## Pendientes
1. Flujo en vivo con Postgres y llave de test (carrito, checkout, ONVO test exitoso y fallido, webhook, tienda y admin, posventa). Lo corre HotClick QA aparte.
2. Re-QA sobre el hash nuevo cuando entren los fixes de M-08, #266 (o su reemplazo) y M-07.
3. QA5-M-01 / P-07 (el pedido manual sin bodega devuelve 400 con el pedido ya guardado y queda PENDIENTE aunque se pida ENTREGADO): sigue sin re-probar.
4. Revisar o descartar la rama mobile suelta.

## Cómo continuar
Hacé `git fetch` y anotá el hash de `origin/master`. Hacé un clon o worktree aparte en HEAD separado, revisá con `gh pr list` y `git log --first-parent` qué entró y corré los comandos de arriba. Reportá con el formato Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso, más el hash.
