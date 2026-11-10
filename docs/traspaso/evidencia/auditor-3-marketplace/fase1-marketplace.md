# FASE 1 · Auditoría Marketplace (productos, tiendas, catálogo, búsqueda, carrito)
Commit: master `aa907776` (copia con `git archive` en /tmp/mk; ningún clon modificado). Prod: solo GET anónimos, 25-oct-2026 ~1:37 CR.
Rutas relativas a `Hot_click_outlet/`.

Conteo: ALTO 2 · MEDIO 5 · BAJO 1 · Mejoras 6.

## CORRECCIONES

### M-01 · ALTO · C1 — Las ofertas se muestran pero no se cobran: carrito y checkout usan `precioVenta`
- Archivos:
  - `frontend/src/services/productService.ts:19` (`precio: p.precioVenta`) y `:37` (`precioOferta` aparte)
  - `frontend/src/store/cartStore.ts:113` (total = `i.precio ?? i.precioVenta`)
  - `src/main/java/com/hotclick/service/payment/StockReservationService.java:73-75` y `service/payment/CheckoutOrderFactory.java:99-101` (sin override → `p.getPrecioVenta()`)
  - `src/main/java/com/hotclick/controller/storefront/StorefrontGuestOrderService.java:107` y `:140` (`getPrecioVenta()`)
  - Contraste: `model/Producto.java:563-565` define `getPrecioEfectivo()` (usa oferta) y el POS sí lo usa (`service/pos/PosVentaService.java:189`).
- Reproducir: ver un producto en oferta (p. ej. id 621 en prod: precioVenta 8900, precioOferta 7900). La tarjeta muestra ₡7.900 (`utils/precioProducto.ts`), al agregarlo el carrito suma ₡8.900 y el backend calcula el subtotal con 8900.
- Evidencia: `GET https://hotclick.lat/api/productos/en-oferta` devuelve 10 productos con `enOferta=true` y `precioEfectivo < precioVenta` (621, 628, 633, 638, 642, 643, 645, 650, 653, 658). Lo del código está verificado leyendo el commit. No hice ninguna compra en prod.
- Corrección: en backend usar `p.getPrecioEfectivo()` en StockReservationService, CheckoutOrderFactory y StorefrontGuestOrderService (subtotal y `precioUnitarioMomento`). En front, normalizar `precio` al efectivo o hacer que cartStore sume `precioOferta` si hay oferta activa (`tieneOfertaActiva`). Prueba: un producto en oferta da subtotal = precioOferta × cantidad en los 3 caminos (C2).

### M-02 · ALTO · C1 — Productos y tiendas de prueba visibles en el catálogo público de prod
- Archivo: datos de prod (las empresas "Prueba Andrés Emprendedor/PYME/Negocio Plus" tienen `visibilidad_publica = true`). El filtro está en `repository/ProductoRepository.java:71-77`.
- Reproducir: `GET https://hotclick.lat/api/productos?page=0&size=50`.
- Evidencia: 50 productos en total; 9 son de las 3 empresas "Prueba Andrés …", entre ellos el id 669 "PRUEBA QA3 Pulsera" con la descripción "Producto de prueba QA, no comprar", que sale primero (orden id DESC). Un cliente real los ve y los puede comprar.
- Corrección (cambia datos de prod, así que lo aprueba Andrés): poner `visibilidad_publica=false` en esas empresas, o `visible_catalogo=false` en sus productos. Para que no vuelva a pasar: una bandera `es_prueba` en la empresa, excluida en la query pública.

### M-03 · MEDIO · C1/C2 — `POST /api/carrito/{id}/items` acepta cantidad negativa o cero y libera stock reservado
- Archivos: `controller/CarritoController.java:56-60` (`@RequestParam Integer cantidad` sin validar), `service/CarritoService.java:46-71`, `service/StockService.java:49-57` (`disponible < cantidad` es falso con un valor negativo y `stockReservado` baja).
- Reproducir (solo en staging): un comprador autenticado con contexto de empresa llama `POST /api/carrito/{suCarrito}/items?productoId=X&cantidad=-5`. `stockReservado` baja 5, sube el disponible y se puede sobrevender. El item queda con un total negativo.
- Evidencia: lectura de código. No lo ejecuté. El front de comprador no usa este endpoint (el carrito vive en `frontend/src/store/cartStore.ts`, persistido en el cliente; no hay referencias a `/carrito` en services), pero el endpoint está expuesto (`GET /api/carrito/1` en prod responde 401, no 404).
- Corrección: `@Min(1) @Max(...)` en `cantidad` con `@Validated`, y un guard `cantidad <= 0 → IllegalArgumentException` en `StockService.reservar`. Si el carrito de servidor no se usa, otra opción es desactivar el controller. Prueba de regresión con cantidad -1 y 0.

### M-04 · MEDIO · C1 — El pedido de invitado del storefront no valida estado del producto ni la visibilidad del negocio
- Archivo: `controller/storefront/StorefrontGuestOrderService.java:93-98`. Solo revisa empresa, `visibleCatalogo` y `vendido`. No mira `estado` (archivado/borrado), `esPublicableEnMemoria` ni el negocio activo y visible. En cambio, `CarritoService.java:60-62` sí lo hace.
- Reproducir (staging): archivar un producto que tenga `visible_catalogo=true` y mandar el pedido de invitado con su id. El pedido se crea.
- Evidencia: lectura de código. No lo ejecuté.
- Corrección: reusar el mismo gate que CarritoService (`estado == ACTIVO && StockReservationService.esPublicableEnMemoria(p)`), con prueba.

### M-05 · MEDIO · C1 — La guarda de artículo único no se repite en el storefront y los ítems duplicados no se fusionan en el carrito de servidor
- Archivos: `service/CarritoService.java:73-79` agrega una línea nueva cada vez, aunque el producto ya esté en el carrito, y el total suma líneas repetidas. `StorefrontGuestOrderService.java:96` solo bloquea si `vendido`. Un producto `esUnico` repetido en dos ítems del mismo pedido depende solo del stock.
- Evidencia: lectura de código.
- Corrección: si el producto ya está, sumar la cantidad a esa línea. Para `esUnico`, forzar cantidad 1 y rechazar duplicados.

### M-06 · BAJO · C1 — `/api/productos/{id}/variantes` no filtra por negocio visible ni vendido, ni revisa el acceso al producto base
- Archivo: `controller/producto/ProductoCatalogHandler.java:150-170`.
- Reproducir: pedir las variantes de un producto cuyo negocio está suspendido. Devuelve hermanos con nombre, precio y stock aunque la ficha (`obtenerProducto`, línea 136) los bloquee.
- Evidencia: lectura de código. En prod, un id inexistente da 404 bien.
- Corrección: llamar `productoAccessGuard.assertCanAccessProductoDetalle(base)` y filtrar los hermanos con el gate público (empresa ACTIVO, `visibilidadPublica` y `vendido=false`).

### M-07 · MEDIO · C1 — La oferta no se valida (no tiene vigencia ni límites) y el POS y el front la aplican con reglas distintas
**Cómo se calcula hoy:**
- No hay vigencia. `model/Producto.java` no tiene campos de fecha de oferta (lo busqué con grep). Una oferta queda activa hasta que alguien la apaga a mano.
- Al guardar la oferta: `service/producto/ProductoWriteOperations.java:116-131` y, por categoría, `controller/producto/ProductoWriteHandler.java:175-192`. Con un porcentaje, `precioOferta = round(precioVenta × (1 − pct/100))`. Con un precio fijo, se guarda tal cual y el porcentaje queda en 0 si `precioOferta ≥ precioVenta`. No se valida `pct ≤ 100`, ni `precioOferta > 0`, ni `precioOferta < precioVenta`. Con `pct = 150` el precio de oferta sale negativo.
- `precioOferta` se calcula una sola vez. Si después se edita `precioVenta`, la oferta no se recalcula: `ProductoUpdateHandler`/`ProductoWriteOperations` no tocan `precioOferta` fuera de `aplicarOferta`. Lo vi por grep; no hice una prueba que lo ejecute.

**Dónde se aplica:**
| Canal | Regla | Archivo:línea |
|---|---|---|
| Backend `getPrecioEfectivo()` (POS, QR) | `enOferta && precioOferta != null ? precioOferta : precioVenta`. No compara contra `precioVenta` | `model/Producto.java:563-565`; `service/pos/PosVentaService.java:189`, `PosQrPedidoFactory.java:168`, `PosQrSessionService.java:86` |
| Catálogo (front) | Muestra la oferta solo si `0 < precioOferta < precio`. No mira `enOferta` | `frontend/src/utils/precioProducto.ts:10-21` |
| Carrito (front) | Suma `precio` (= `precioVenta`). Ignora la oferta | `frontend/src/services/productService.ts:19`, `store/cartStore.ts:113` |
| Checkout marketplace y storefront (back) | `precioVenta`. Ignora la oferta | `StockReservationService.java:73-75`, `CheckoutOrderFactory.java:99-101`, `StorefrontGuestOrderService.java:107,140` |

**Diferencias con el POS** (según `fase1-pos-inventario.md`, mejora M-02 de ese informe):
1. El POS cobra la oferta y el marketplace no (ver M-01): el mismo producto cuesta distinto según el canal.
2. Si `precioOferta ≥ precioVenta`, el POS cobra el precio más alto, porque `getPrecioEfectivo` no compara. El catálogo, en cambio, oculta la oferta y muestra `precioVenta`.
3. Ninguno de los dos canales tiene vigencia.

**Corrección:** que la regla única viva en `Producto.getPrecioEfectivo()` (`enOferta && precioOferta != null && 0 < precioOferta < precioVenta`, más `ofertaHasta` si se agrega vigencia) y que el marketplace, el storefront, `/api/ventas` y el POS la usen. Validar `1 ≤ pct ≤ 99` y `0 < precioOferta < precioVenta` en `aplicarOferta` y en la oferta por categoría. Recalcular o anular la oferta cuando cambia `precioVenta`. Agregar pruebas para cada caso.

### M-08 · MEDIO · C1/C6 — La sobreventa del marketplace se oculta: se recorta a 0 y solo queda un `log.error`
- Archivo: `service/payment/StockReservationService.java:95-113`. Al confirmar el pago (`confirmAndConsumeStock`), si `stockActual − cantidad < 0` se escribe `log.error("OVERSELL…")` y `nuevoStock = 0`. El pedido se confirma igual y el cliente ya pagó. No se registra ningún `MovimientoStock` de sobreventa, no le llega aviso al dueño ni hay alerta. `stockReservado` también se recorta con `Math.max(0, …)` (línea 111).
- Cómo se llega: dos compras del último producto, o un ajuste de inventario por debajo de lo reservado (C-07 del informe POS). También el M-03 de este informe, con cantidad negativa.
- Evidencia: lectura de código. Coincide con el C-08 del informe POS. Ahí figura como BAJO; acá lo subo a MEDIO porque en el marketplace el cliente ya pagó y nadie se entera, y eso afecta a C6 (detectar).
- Corrección: registrar `MovimientoStock` de tipo OVERSELL, marcar el pedido (`requiereRevision`), avisar al dueño y emitir una métrica o alerta de C6. Agregar una prueba con dos confirmaciones sobre stock 1.

## MEJORAS

1. **Catálogo paginado en servidor** · Impacto alto (rendimiento móvil, escala) · Esfuerzo medio · `frontend/src/pages/catalogo/useCatalogoFetch.ts:8-49`, `ProductoCatalogHandler.listarProductos`. Hoy se baja el catálogo entero en lotes de 50, hasta 40 lotes, y por encima de 2000 productos se corta sin avisar. Propuesta: filtros y facetas (`cat`, `marca`, precio, `q`) en el endpoint con conteos desde el backend, y en el cliente scroll infinito.
2. **Revalidar el carrito persistido** · Impacto alto · Esfuerzo bajo-medio · `frontend/src/store/cartStore.ts`. El precio y el stock quedan guardados en el cliente desde que se agregó el producto. Propuesta: al abrir `/carrito` y `/checkout`, pedir los precios efectivos y el stock actuales, avisar si algo cambió y quitar lo que ya no está disponible.
3. **Pruebas de regresión del marketplace (C2)** · Impacto alto · Esfuerzo bajo · Agregar pruebas para M-01 (oferta en los 3 caminos de checkout), M-03 (cantidad ≤0) y M-04 (producto archivado en pedido invitado).
4. **Errores claros en el carrito** · Impacto medio · Esfuerzo bajo · `CarritoController.java`. Hoy toda excepción sale como 400. Propuesta: 409 con código `STOCK_INSUFICIENTE` o `PRODUCTO_NO_DISPONIBLE` y un mensaje accionable para el comprador.
5. **Calidad del catálogo** · Impacto medio · Esfuerzo bajo · De los 50 productos públicos en prod, 9 no tienen `imagenPrincipalUrl`. Propuesta: un aviso en el panel del vendedor ("publicá con al menos 1 foto"), o que el orden público ponga primero los productos con imagen.
6. **Limpiar la respuesta pública de producto** · Impacto medio (privacidad y peso) · Esfuerzo medio · La entidad `Producto` se serializa entera: `bodega.direccionExacta`, `stockReservado`, 9 campos meta por idioma, etc. Propuesta: un DTO público con solo lo que muestra la ficha. Confirmar con el dueño si la dirección exacta de la bodega debe ser pública cuando hay retiro en tienda.

## Fuera de alcance / no verificado
- No ejecuté ningún POST en prod ni en staging. M-03, M-04 y M-05 salen solo de leer el código y conviene reproducirlos en staging.
- El buscador público del comprador abre el chat (`useCatalogoPage.ts:22`). Las ramas de chat no las audité.
