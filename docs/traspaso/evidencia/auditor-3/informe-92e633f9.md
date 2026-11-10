# Informe Auditor 3 · Marketplace (catálogo, tiendas, ofertas, envíos)

- **Commit auditado:** `92e633f9` de master (checkout detached en `/workspace/auditor3/src`, clon de solo lectura; no se modificó nada).
- **Fecha:** 27-oct-2026 (hora Costa Rica).
- **Base previa:** `docs/traspaso/auditor-3-marketplace.md` y `evidencia/auditor-3-marketplace/fase1-marketplace.md` (rama `docs/traspaso-cuenta-nueva`, hallazgos M-01..M-08 sobre `aa907776`).
- **Método:** lectura de código en el hash exacto + tests dirigidos (sin suite completa, no se tomó el lock). Sin POST a prod/staging. Ningún secreto ni dato sensible en este informe.
- **Tests dirigidos ejecutados (verde, `mvn -o test`, exit 0):** `PaqueteSinBodegaEnvioTest`, `StockReservationPersonalizadoTest`, `StockReservationPublicableTest`, `StorefrontCostoEnvioTest`. No corrí `OnvoSobreventaPostCobroTest` (integración, necesita contexto completo) ni la suite completa.

## Veredicto

**Queda 1 ALTO abierto en 92e633f9** (A-1, el bulk de productos) y **1 ALTO condicionado a decisión de negocio** (A-2, envío fuera del GAM a ₡4.000 contra la regla ₡5.000–₡10.000). El ✅ de QA sobre M-08 (#368), personalizados (#370) y bodegaId (#367) se sostiene para esos tres cambios puntuales, pero el área 3 no está limpia de ALTOs.

---

## ALTO

### A-1 · `POST /api/productos/bulk` se salta las reglas que sí aplican al alta individual (ABIERTO, nuevo)
Un EMPRENDEDOR puede crear productos por el bulk con campos que la plataforma reserva al admin y sin pasar por los filtros del alta normal.

- **Evidencia (por lectura de código; no reproducido en staging):**
  - `controller/ProductoController.java:153-158` y `controller/producto/ProductoWriteHandler.java:130-135` → `ProductoBulkOperationsService.importar` (`service/producto/ProductoBulkOperationsService.java:62-82`) llama a `productoService.crearProducto(dto, …)` directo.
  - El alta individual (`ProductoCreateHandler.persistirAlta`, `controller/producto/ProductoCreateHandler.java:~58-72`) antes hace `restringirCamposSoloAdmin` (borra `destacado` y los meta SEO), `isTextoPermitido` (moderación), `aplicarReglasPublicacion` (`ProductoApprovalService.java:52-67`: oculta del catálogo si el negocio aún no está aprobado o falta ubicación de despacho) e idempotencia. El bulk no hace nada de eso.
  - `ProductoDtoMapper.java:42` aplica `destacado` y `:43-52` los meta SEO si vienen en el JSON.
  - La ruta está abierta a `ADMIN`/`EMPRENDEDOR` (`SecurityAuthorizationRules.java:80`, `POST /api/productos/**`).
- **Impacto:**
  1. Rompe la regla "destacados solo por admin": un vendedor se pone `destacado=true` y aparece en `GET /api/productos/destacados` (`ProductoRepository.findDestacadosPublicos`, :105-114).
  2. Un negocio no aprobado publica productos en el catálogo (`visibleCatalogo=true` desde el DTO) sin pasar por aprobación.
  3. Sin moderación de texto.
  4. `crearProducto` hace `bodegaRepository.findById(dto.getBodegaId())` (`ProductoWriteOperations.java:~58-60`) sin comprobar que la bodega sea del negocio; en el bulk no hay ninguna otra guarda. Conviene confirmar en staging si el alta individual la tiene en otra capa (no la vi).
- **Arreglo sugerido:** reutilizar el mismo pipeline del alta individual dentro del bucle del bulk (sanitizer + moderación + `aplicarReglasPublicacion` + chequeo de bodega del tenant), y agregar tests de regresión (bulk con `destacado:true`, negocio no aprobado, bodega ajena).

### A-2 · Envío fuera del GAM cobra ₡4.000 y no ₡5.000–₡10.000 (ABIERTO, depende de decisión)
- `service/payment/OrderPricingService.java:121-134`: `ENVIO_NORMAL_FUERA_GAM -> 4000` (igual que GAM), `ENVIO_RAPIDO -> 5000`, `ENCOMIENDA_PROPIA -> 2000` (comentario "12-oct-2026": lo demás lo paga el comprador a la encomienda). Front: `pages/checkout/checkoutHelpers.ts:49` y `paquetesCompra.ts:20` replican los mismos montos.
- La regla que me pasaron dice ₡4.000 GAM y ₡5.000–₡10.000 fuera. El código no la cumple: todos los pedidos fuera del GAM se cobran ₡1.000–₡6.000 de menos.
- **Lo marco ALTO por ser dinero y regla explícita**, pero si la decisión vigente es la del comentario del 12-oct (encomienda ₡2.000), el hallazgo pasa a "regla desactualizada" y se cierra cambiando la regla, no el código. Necesito que el dueño confirme cuál manda. Los docs de traspaso no mencionan esta regla de montos.
- Relacionado: `StorefrontGuestOrderService.costoEnvioTienda` (:191-193) cobra siempre `ENVIO_NORMAL_GAM` (₡4.000) para el domicilio de la tienda propia, sin distinguir fuera del GAM.

---

## MEDIO

### MED-1 · Personalizados (#370) solo cubren el checkout multipaquete (ABIERTO, nuevo)
- `StockReservationService` (:77, :138, :159, :197) ya no exige, reserva ni libera stock de personalizados; `StockReservationPersonalizadoTest` pasa.
- Pero `CarritoService.agregarItem` (:74) y `StorefrontGuestOrderService` (:103) siguen llamando `stockService.reservar`, que valida `stockDisponible >= cantidad` (`StockService.java:49-56`). Un personalizado sin stock no se puede agregar al carrito de servidor ni pedir como invitado; con stock, la reserva queda sumada y el checkout después no la toma en cuenta. Hay que confirmarlo en staging; no lo reproduje.
- Arreglo: aplicar la misma excepción de personalizados en esas dos rutas.

### MED-2 · M-08 (#368): sobreventa post-cobro, residuales (PARCIALMENTE CERRADO)
- **Corregido en lo crítico:** el stock ya no queda negativo, el pago se registra, el pedido pasa a `REVISION_SOBREVENTA` y el pago a `REEMBOLSO_PENDIENTE`, y el webhook de ONVO responde 200 (`PaymentOrderConfirmationService.java:58-130`, `OnvoCapturaService.java:38-101`, `OnvoWebhookController.java:169,182`, `SinpeOnvoMarketplaceService.java:171`, `Constants.java:86,91`).
- **Residuales (no bloquean, pero dejan la regla a medias):**
  - Stripe (`StripePaymentProvider.java:145`), Tilopay (`TilopayConfirmacionService.java~:234`) y pago manual (`PedidoPagoManualService.java:205`) ignoran el resultado de sobreventa. El manual además pisa `REVISION_SOBREVENTA` con `PAGADO` y aprueba el comprobante. El despacho sigue bloqueado porque `PedidoDespachoVerificador` exige `Pago=CAPTURADO`, pero el estado queda engañoso.
  - No se avisa al dueño ni al comprador, no se registra `MovimientoStock` OVERSELL (solo log) y no hay cola/UI de admin para `REVISION_SOBREVENTA`/`REEMBOLSO_PENDIENTE`: alguien tiene que mirar la base para reembolsar.
- Gift cards: `consumeForGiftCard` recorta en silencio a 0 (BAJO, ver abajo).

### MED-3 · Envío por negocio vs. por bodega (#367, ABIERTO, a confirmar)
- Backend y checkout agrupan por **bodega** (`CheckoutPaquetesPlanner`, `checkoutHelpers.paquetesDesdeItems`), y el carrito anuncia por negocio (`paquetesCompra.ts`, `SumaMismaTienda.tsx`). Un negocio con dos bodegas paga dos envíos.
- Camino sin bodega propia: `CheckoutPaquetesPlanner.envioDe` (:91-105) asigna el envío sin `bodegaId` solo a paquetes "sin bodega propia". Si el producto no tiene bodega pero la empresa tiene `bodegaVentaOnline`, el paquete se trata como "propio" y no recibe su envío: cae al `metodoEnvio` global del request o a `RETIRO_EN_TIENDA` (costo ₡0). `PaqueteSinBodegaEnvioTest` cubre sin bodega y bodega real, pero no este caso. No lo reproduje.
- Invitado + bodega de plataforma (`CheckoutValidator.assertBodegaTenant` :127-140): puede juntar varios negocios en un solo paquete con un solo envío, contra la regla "envío por negocio".

### MED-4 · `SelfCheckoutService` sigue con `getPrecioVenta()` (:81, :147)
Es el único camino de cobro que no usa `OrderPricingService.precioEfectivo`. Si el self-checkout vende productos en oferta, cobra el precio sin oferta (el mismo problema que M-01/M-07 en otro canal). Verificar si el self-checkout admite productos con oferta.

---

## BAJO

- **B-1** Gift card: `StockReservationService.consumeForGiftCard` recorta el stock a 0 sin log de sobreventa.
- **B-2** M-07 sin vigencia de oferta (fecha de fin) ni recálculo cuando cambia `precioVenta` (la validación de rango sí existe, `OrderPricingService.java:36-51`).
- **B-3** `findDestacadosPublicos` exige `stock_actual > 0`, por lo que un personalizado destacado con stock 0 no aparece en destacados.
- **B-4** Los cuatro tests dirigidos pasan, pero no cubren los casos A-1, MED-1 y MED-3.

---

## Estado de hallazgos previos (aa907776 → 92e633f9)

| ID | Antes | Ahora | Evidencia |
|---|---|---|---|
| M-01 ofertas no se cobran | ALTO | **CERRADO** | `precioEfectivo` único en checkout, carrito y storefront (`OrderPricingService.java:26-33`, `StorefrontGuestOrderService.java:149`, `CarritoService.java:~76`). Queda MED-4 en self-checkout. |
| M-02 productos/tiendas de prueba en el catálogo público de prod | ALTO | **NO VERIFICABLE** | Es un problema de datos de prod; solo se podía verificar con GET anónimo y no lo ejecuté. Sigue sin cierre documentado. |
| M-03 cantidad ≤ 0 en carrito | MEDIO | **CERRADO** | `CarritoService.java:47-49` y `StockService.reservar` :50-52. |
| M-04 pedido invitado sin validar producto/negocio | MEDIO | **CERRADO** | `StorefrontGuestOrderService.validarComprable` :137-144. |
| M-05 artículo único / ítems duplicados | MEDIO | **CERRADO** | `CarritoService.java:~68-83` (guarda de único vendido; suma cantidad en la línea existente). |
| M-06 `/variantes` no filtra | BAJO | **No re-verificado** | No lo revisé en este pase. |
| M-07 oferta sin validar | MEDIO | **MAYORMENTE CERRADO** | Ver B-2 y MED-4. |
| M-08 sobreventa oculta | MEDIO | **PARCIAL** | Ver MED-2. |

## Reglas de negocio pedidas

| Regla | Estado |
|---|---|
| Envío por pedido y por negocio, ₡4.000 GAM / ₡5.000–₡10.000 fuera | **No cumple** el rango fuera del GAM (A-2). Por pedido: ok. Por negocio: se agrupa por bodega (MED-3). |
| Tienda pausada al vencer la gracia: oculta/agota productos, redes y botón compartir | **Cumple.** `SUSPENDIDO_IMPAGO`/`EXTENSION_IMPAGO` (`SuspensionImpago`, `SuspensionImpagoInterceptor`): las consultas públicas filtran `estadoEmpresa='ACTIVO'` (`ProductoRepository`, `EmpresaRepository.findNegociosPublicos`), `SlugTenantInterceptor` responde 404 a la tienda por slug, `CobroNegocioGuard` y `esPublicableEnMemoria` bloquean checkout. El directorio no expone redes ni contacto (`NegocioPublicoDTO`). La pausa manual `tiendaPausada` es otro mecanismo (410). No revisé el render del botón compartir en el front. |
| Destacados solo por admin | **Se rompe por el bulk (A-1).** Los demás caminos están bien: `PATCH /{id}/destacado` es ADMIN, el alta/edición individual sanitiza, `PUT /empresas/{id}/destacado` es ADMIN. |
| IBAN visible solo al negocio y admin | **Cumple en lo revisado:** `MetodoCobroDto` devuelve solo la máscara y el destino completo solo se usa en `WalletController`/payout. No audité todos los endpoints del front. |
| Nunca número SINPE fuera de ONVO | **Cumple:** `PosQrSessionService.destinoSinpe` y `CheckoutConfigPublicoController` salen de `onvo.sinpeDestino()`; no hay camino que use teléfono o WhatsApp del negocio. |

## Cambios verificados

- **#368 M-08:** ok en lo crítico (MED-2).
- **#370 personalizados:** ok en el checkout; incompleto en carrito y storefront (MED-1).
- **#367 bodegaId:** funciona para bodega real y sin bodega; el borde con `bodegaVentaOnline` y el invitado con bodega de plataforma están pendientes (MED-3). `assertBodegaTenant` sigue bloqueando bodegas ajenas con id (tests verdes).

## No verificado

- M-02 (datos de prod) y M-06.
- Render del botón compartir y redes en el front de una tienda suspendida.
- Todos los endpoints del front que muestran métodos de cobro.
- Integración de sobreventa (`OnvoSobreventaPostCobroTest`) y suite completa: no ejecutadas por presupuesto.
- Nada de A-1, MED-1 y MED-3 se reprodujo en staging; salen de leer el código.
