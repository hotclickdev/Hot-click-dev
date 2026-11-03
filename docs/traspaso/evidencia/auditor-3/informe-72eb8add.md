# Auditor 3 Marketplace — Informe sobre master 72eb8add (re-verificación A-1)

Solo lectura. Checkout detached en /workspace/auditor3/src (72eb8addb), sin commits, push, PRs ni mensajes.
Rango revisado: 92e633f9..72eb8add (incluye #392 `9bbc84b69` y #402 `bc10601e5`). Fecha: 2026-10-27 (hora Costa Rica).

## Veredicto
**No queda ningún ALTO de código en 72eb8add en el área 3.**
- **A-1: CERRADO.**
- **A-2 (envío fuera del GAM): pendiente de decisión de negocio.** No cuenta como ALTO de código en esta verificación (ver sección propia).
- MEDIOs previos (MED-1..MED-4): sin cambios en el código (siguen abiertos). Sin MEDIO nuevo de fondo; 2 observaciones BAJO nuevas.

## A-1 — bulk/import sin las reglas del alta individual: CERRADO
| Criterio | Estado | Evidencia (archivo:línea aprox., 72eb8add) |
|---|---|---|
| `restringirCamposSoloAdmin` en bulk | CERRADO | `service/producto/ProductoAltaService.java` `crearSaneado` (1ª línea) llama `productoRequestSanitizer.restringirCamposSoloAdmin(dto, hasRole("ADMIN"))`. `ProductoBulkOperationsService.importar` (~:90) pasa por `productoAltaService.crearYPublicar`. |
| Moderación de texto | CERRADO | Mismo `crearSaneado`: `productoModerationFacade.isTextoPermitido(dto)` → `ContenidoNoPermitidoException`. En bulk la fila queda como error de fila; en el alta individual responde 400 (`ProductoCreateHandler.persistirAlta`). Test: frase bloqueada ("video porno") rechazada en el log de la corrida. |
| `aplicarReglasPublicacion` | CERRADO | `ProductoAltaService.crearYPublicar` la aplica sobre el producto creado; la usan alta individual, bulk e import. Negocio sin aprobar ⇒ no publica. |
| Bodega del propio negocio | CERRADO | Nuevo `BodegaTenantGuard.exigirDeLaEmpresa` (misma regla que `CheckoutValidator.assertBodegaTenant`; bodega ajena ≡ inexistente, mismo mensaje, sin filtrar datos). Usado en `ProductoWriteOperations.crearProducto` (:~88, reemplaza el `findById` sin tenant), `ProductoUpdater` (edición, valida antes de tocar la entidad) y en `ProductoBulkOperationsService.importar` (valida todas las bodegas del lote ANTES de crear nada: lote rechazado completo con 400). |
| Import saneado | CERRADO | `ImportController` `/api/admin/importar/confirmar` (~:145) ya no llama `productoService.crearProducto`; usa `crearYPublicar` (empresa de sesión/`EmpresaDestinoAlta`, tope 100). Auditoría fallida ya no se cuenta como error de fila (devuelve `advertencias`, evita duplicar al reintentar). |
| Creación atómica | CERRADO | `crearYPublicar` es `@Transactional` en un bean separado (proxy efectivo): producto + reglas de publicación en una sola transacción; si las reglas fallan no queda fila publicada. Esto cierra además el BAJO que la QA había visto en #392 (falla inyectada dejaba fila visible). La auditoría va después del commit. |
| Bulk vacío | CERRADO | `ProductoWriteHandler.importarBulk`: `dtos.isEmpty()` ⇒ 400; `RecursoNoEncontradoException` (bodega ajena) ⇒ 400 sin datos. |
| Otros callers de `crearProducto` | CERRADO / BAJO | `InventarioPaqueteService` ahora usa `crearSaneado` (moderación + campos solo-admin; el producto nace invisible igual). `TelegramFlujoService.crearProductoTx` (:172) sigue llamando `productoService.crearProducto` directo, pero el DTO lo arma el servidor desde el borrador (sin destacado ni meta SEO), `visibleCatalogo` depende de `empresaPublicada` y la bodega sale del negocio ⇒ sin escalada; ver B-5. |
| Edición (ya existente) | OK | `ProductoUpdateHandler` mantiene sanitizer + moderación + `getAccessibleProducto`; ahora también valida la bodega por tenant. |
| Rutas de seguridad | OK | `POST /api/productos/bulk` y `/api/admin/importar/**` siguen ADMIN/EMPRENDEDOR; la empresa sale siempre de la sesión (`requireEmpresaId`), admin sin empresa ⇒ 403. |

Tests dirigidos que corrí (H2, perfil test, `mvn -o`): **27 tests, 0 fallas, exit 0** (log: /workspace/auditor3/tests-72eb.log):
- `BodegaTenantGuardTest` (4), `ProductoBodegaAjenaIdorTest` (6), `ProductoBulkMismasReglasAltaTest` (5), `ImportConfirmarMismasReglasAltaTest` (7), `ProductoAltaAtomicaTest` (5).
No tomé el lock de suite completa porque no corrí la suite completa. Los tests de la corrida anterior (92e633f9) no se repitieron: las clases de checkout/stock/envío no cambiaron.

## Otros ALTO en el área 3
Ninguno. Diff del área 3 en 92e633f9..72eb8add en main: solo lo de A-1 (arriba), un `toUpperCase(Locale.ROOT)` en `OrderPricingService` (gift card, sin cambio de lógica), `PaymentNotificationsFacade` (3 líneas) y cambios ajenos al área (ONVO billing/suscripciones, logs de Telegram, front compilado). Sin cambios en `CarritoService`, `StockService`, `StockReservationService`, `CheckoutValidator`, `CheckoutPaquetesPlanner`, `StorefrontGuestOrderService`, `SelfCheckoutService`, pagos Stripe/Tilopay/manual.

## A-2 — envío fuera del GAM: PENDIENTE DE DECISIÓN (no es ALTO de código acá)
`OrderPricingService.calcularCostoEnvio` (:124-126) sigue con `ENVIO_NORMAL_FUERA_GAM = 4000` (regla de negocio: ₡5.000–₡10.000 fuera del GAM) y `StorefrontGuestOrderService.costoEnvioTienda` cobra siempre tarifa GAM. Sin cambios respecto a 92e633f9. Requiere decisión de negocio (tarifa/zonas) antes de tocar código.

## Estado de MEDIOs previos (sin cambios)
| ID | Tema | Estado en 72eb8add |
|---|---|---|
| MED-1 | Personalizados (#370) solo en checkout marketplace; `CarritoService.agregarItem` (:74) y `StorefrontGuestOrderService` (:103) siguen llamando `stockService.reservar` | Abierto, sin cambio |
| MED-2 | Residuales M-08: Stripe, Tilopay y pago manual ignoran el resultado de sobreventa (sin notificación/OVERSELL/cola admin) | Abierto, sin cambio |
| MED-3 | #367 bodegaId: producto sin bodega con `bodegaVentaOnline` sin envío; envío agrupado por bodega, no por negocio (guest + bodega plataforma puede mezclar negocios) | Abierto, sin cambio |
| MED-4 | `SelfCheckoutService` (:81, :147) usa `getPrecioVenta()` en vez de `OrderPricingService.precioEfectivo` | Abierto, sin cambio |

## BAJO
- B-1..B-3 (gift card clamp silencioso, M-07 sin vigencia/recómputo, destacados públicos exigen stock>0): sin cambio.
- B-4: la cobertura de tests de A-1 y de bodega ajena ahora existe (cierra la parte de A-1 de este BAJO); sigue sin cobertura de MED-1 y MED-3.
- B-5 (nuevo): `TelegramFlujoService.crearProductoTx` no pasa por `ProductoAltaService` (sin moderación de texto ni `aplicarReglasPublicacion`; decide visibilidad con su propia regla `empresaPublicada`). Sin escalada de privilegios (DTO armado por el servidor), pero conviene unificarlo al pipeline único.
- B-6 (nuevo): el bulk no es "todo o nada" por lote: tras validar bodegas, las filas se procesan una a una (cada fila es atómica; las que fallan se reportan y el resto se crea). Es consistente con el mensaje "Importados N, errores M"; solo se aclara que la atomicidad es por producto, no por lote (excepto bodega ajena y lote vacío, que rechazan todo).

## Reglas de negocio (re-chequeo rápido)
| Regla | Estado |
|---|---|
| Destacados solo admin | OK también en bulk/import (sanitizer en el pipeline único) |
| IBAN solo negocio/admin; nunca SINPE fuera de ONVO | Sin cambios en el área; no re-auditado más allá del diff |
| Tienda pausada oculta productos/redes/compartir | Sin cambios en el diff; no re-verificado |
| Envío por pedido y negocio ₡4.000 GAM / ₡5.000–₡10.000 fuera | Ver A-2 y MED-3 (sin cambio) |

## No verificado
- Datos de producción (M-02) ni comportamiento con PostgreSQL real (tests en H2).
- Suite completa (no corrida) y CI de 72eb8add (la QA anotó CI "in_progress"; no lo consulté).
- /workspace/qa/a3/ lo usé solo para contexto; no di por cierto nada de ahí, lo comprobé contra el código y los tests propios.
- Front compilado (`static/assets`) no auditado.
