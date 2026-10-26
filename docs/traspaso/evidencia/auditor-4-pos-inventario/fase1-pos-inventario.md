# Fase 1 · Auditoría POS e Inventario (Auditor 4)
Commit: master `aa907776` (worktree de solo lectura: /workspace/hc-audit-pos). Fecha: 25-oct-2026 (CR).
Método: lectura estática del código. No se ejecutaron suites ni se tocó prod. Rutas relativas a `Hot_click_outlet/src/main/java/com/hotclick/`.
Nota ONVO: la pasarela del QR del POS sigue en Tilopay (ver C-03). No se proponen arreglos de SINPE manual, porque ese flujo lo reemplaza ONVO (Dev Pagos).

## CORRECCIONES

### C-01 · ALTO · C1 (descuento de stock) / C2 · La venta directa del POS acepta cantidad negativa o cero
- **Archivo:** `service/pos/PosVentaService.java:162` (cantidad sin validar), `:170-175` (chequeo de stock), `:176` (descuento), `:178` (subtotal). DTO sin validación: `dto/PosVentaDTO.java:42`. El controlador no usa `@Valid`: `controller/PosController.java:33`.
- **Evidencia:**
```java
int cantidad = itemDto.getCantidad() != null ? itemDto.getCantidad() : 1;   // sin >0
...
if (disponible < cantidad) { throw ... }          // -5 nunca dispara
stockService.descontarPorVentaPOS(producto, cantidad, ...);  // stockActual = actual - (-5) → SUMA 5
subtotal += precio * cantidad;                     // subtotal negativo
```
`StockVentaOperations.descontarPorVentaConTipo` (`service/stock/StockVentaOperations.java:41-43`) hace `actAntes - cantidad` sin validar. En cambio, `VentaService.validarProductoParaVenta` (`service/VentaService.java:199`) y el QR (`PosQrSessionService.cantidadDe`, `:272-277`, rango 1..999) sí validan.
- **Cómo reproducirlo (staging):** con un usuario con `pos.usar`, `POST /api/pos/venta` con `{"metodoPago":"EFECTIVO","items":[{"productoId":<id>,"cantidad":-5}]}`. Resultado esperado según el código: 200, el stock sube 5, el pedido queda ENTREGADO con total negativo y el turno de caja resta efectivo (`actualizarTurno`). Un cajero puede inflar el inventario o tapar faltantes de caja sin dejar un ajuste auditado.
- **Corrección:** en `cargarItemsYStock`, reutilizar `PosQrSessionService.cantidadDe` o validar `1 <= cantidad <= 999` y lanzar `IllegalArgumentException`. Como defensa en profundidad, en `StockVentaOperations.descontarPorVentaConTipo` lanzar si `cantidad <= 0`. Agregar `@Min(1)`/`@NotNull` al DTO y `@Valid` en el controlador.
- **Prueba (C2):** test unitario de `PosVentaService` con cantidad -1 y 0 que espere 400, sin movimiento de stock ni cambio en el turno.

### C-02 · ALTO · C1 / C6 · QR del POS: el stock no se reserva al generar el QR y se descuenta después de cobrar. Si se agota en medio, el cliente paga y el pedido falla
- **Archivo:** `service/pos/PosQrSessionService.java:80-93` (crea la sesión con `findById`, sin lock ni reserva); `service/pos/PosQrPedidoFactory.java:166-177` (chequea y descuenta stock recién al completar); `service/pos/PosQrVentaService.java:240-242` (`reclamar` y `completarVentaTarjeta` dentro de la misma transacción).
- **Evidencia:**
```java
// PosQrPedidoFactory.lineaDeItem
if (producto.getStockDisponible() < cantidad) {
    throw new StockInsuficienteException(...);   // se lanza DESPUÉS de que la pasarela confirmó el pago
}
```
- **Cómo reproducirlo (staging, ONVO de prueba):** producto con stock 1. Cajero A genera un QR por 1 unidad. Mientras el cliente paga, el cajero B vende esa unidad en caja directa (`/api/pos/venta`). El cliente completa el pago y `verificarEstado` lanza `StockInsuficienteException`: se hace rollback del reclamo, la sesión queda PENDIENTE con el pago cobrado y no se crea ningún pedido. Cada consulta de estado vuelve a fallar. Es el caso "dos compras del último producto" del plan.
- **Corrección (encaja con la migración a ONVO):** reservar stock al crear la sesión QR (`StockService.reservar` con `findByIdForUpdate`), liberarlo al cancelar o expirar, y al completar descontar con `liberarReservaPrevia=true`. Si aun así falta stock, marcar la sesión `PAGADO_SIN_STOCK`, alertar (C6) y dejar el reembolso ONVO pendiente en vez de lanzar.
- **Para Dev Pagos:** esto aplica al nuevo flujo ONVO del QR; conviene incluirlo en ese mismo PR.

### C-03 · ALTO · C1 / C3 · La confirmación de pago del QR del POS sigue atada a Tilopay
- **Archivo:** `service/pos/PosQrVentaService.java:258-266`; `controller/PosQrController.java:124,139` (`/pago/{token}/tilopay`, `/tilopay/confirmar`).
- **Evidencia:**
```java
// Tarjeta y SINPE Móvil van por Tilopay: se confirma consultando la orden (monto, CRC y orden).
if (!pasarelaId.startsWith(PREFIJO_TILOPAY) || sesion.getTotal() == null) return false;
return coincideTilopay(pasarelaId, sesion.getTotal(), tilopayService.consultarTransaccion(pasarelaId),
    tilopayService.isMockMode());
```
También acepta `isMockMode()`, lo que va contra C3 (en prod, ningún cobro debería salir de un modo de prueba).
- **Cómo reproducirlo:** lectura de código. Toda sesión cuyo id de pasarela no empiece con el prefijo Tilopay nunca se confirma, así que un cobro ONVO del POS hoy no se completaría.
- **Corrección:** es la migración que ya lleva Dev Pagos. Checklist para ese PR: confirmar por webhook ONVO (y no por sondeo del front), verificar monto, moneda y `mode=live`, y reclamar de forma idempotente (`reclamarParaCompletar` ya existe). Después, retirar los endpoints Tilopay del QR. No tocar la confirmación SINPE manual (`confirmar-sinpe`), porque queda obsoleta.

### C-04 · MEDIO · C1 · El total del pedido del QR se recalcula con el precio del momento del pago, no con el monto cobrado
- **Archivo:** `service/pos/PosQrSessionService.java:86-92` (fija `precioUnitario` y `total` al crear); `service/pos/PosQrPedidoFactory.java:168-172,195` (usa `producto.getPrecioEfectivo()` actual).
- **Cómo reproducirlo:** generar un QR, cambiar el precio o quitar la oferta del producto antes de que el cliente pague y completar el pago. El cobro es `sesion.total`, pero `pedido.totalPedido` y la utilidad salen con el precio nuevo, así que el panel y los reportes no cuadran con lo cobrado.
- **Corrección:** en `lineaDeItem`, usar `itemMap.precioUnitario` (snapshot de la sesión) y comprobar que `totalPedido == sesion.getTotal()`. Si no coincide, registrar una alerta.

### C-05 · MEDIO · C1 / C6 · Se puede vender en caja sin turno abierto, y el efectivo no queda en ningún turno
- **Archivo:** `service/pos/PosVentaService.java:240-247` (`actualizarTurno`: usa `ifPresent` y se traga las excepciones).
- **Cómo reproducirlo:** con un cajero sin turno ABIERTO, `POST /api/pos/venta` devuelve 200. La venta existe, pero el cierre de caja no la incluye y el arqueo queda descuadrado.
- **Corrección:** en `crearVenta`, exigir un turno abierto del usuario (400 "Abrí caja antes de vender") o crear el turno de forma explícita. No silenciar el fallo al actualizar el turno: que sea parte de la transacción.

### C-06 · MEDIO · C4 / C5 · `GET /api/ventas/clientes` entrega hasta 500 clientes con correo y teléfono a cualquier usuario con `pos.usar` (cajero)
- **Archivo:** `controller/VentaController.java:64-88`.
- **Evidencia:** `m.put("telefono", ...)`, `m.put("correo", ...)` sobre `findTop500ByEmpresaIdOrderByIdDesc`. El filtro `q` se aplica en memoria, después de cargar los 500.
- **Corrección:** exigir `q` con al menos 3 caracteres, paginar con un límite de 20, buscar con LIKE en la base de datos y enmascarar el teléfono (últimos 4 dígitos) para el cajero.
- **Prueba (C5):** con el rol cajero, la respuesta no trae el teléfono completo.

### C-07 · MEDIO · C1 · `ajustarAExistencia` (conteo por Telegram) no valida negativos ni el stock reservado
- **Archivo:** `service/stock/StockAjusteOperations.java:64-75`; llamadores: `service/TelegramFlujoService.java:209` y `service/telegram/TelegramStockCheckService.java:139`.
- **Evidencia:** `producto.setStockActual(cantidadReal);` sin chequear `cantidadReal >= 0` ni `>= stockReservado`. Si queda menor que lo reservado, `getStockDisponible()` da negativo (`model/Producto.java:349`) y la confirmación de una compra del marketplace en curso cae en la rama `OVERSELL` (`StockReservationService.java:104-107`).
- **Corrección:** rechazar `cantidadReal < 0`. Si `cantidadReal < stockReservado`, aplicarlo y además emitir una alerta de sobreventa al dueño.
- **No verificado:** no revisé si el parser de Telegram ya filtra los negativos antes de llamar.

### C-08 · BAJO · C1 · La sobreventa del marketplace se tapa con `clamp` a 0 y solo deja un log
- **Archivo:** `service/payment/StockReservationService.java:104-108` y `:86` (`consumeForGiftCard` con `Math.max(0, ...)`).
- **Corrección:** además del log, registrar un `MovimientoStock` de tipo OVERSELL y avisar al dueño o a la alerta de C6, para que una venta sin respaldo de stock no pase desapercibida.

### C-09 · BAJO · C5 · POS y `/api/ventas` aceptan `clienteId` de cualquier usuario de la plataforma
- **Archivo:** `service/pos/PosVentaService.java:131-134`; `service/VentaService.java:236-240`.
- **Riesgo:** un cajero puede asociar una venta a un usuario de otro negocio (por id), y ese usuario la ve en su historial o recibe avisos. Además, el POS cae en silencio a "mostrador" si el id no existe.
- **Corrección:** solo aceptar clientes de la misma empresa o que ya le hayan comprado. Si no, devolver 400.

## MEJORAS

| # | Mejora | Impacto | Esfuerzo | Archivos | Cambio propuesto |
|---|---|---|---|---|---|
| M-01 | Una sola validación de ítems para POS, QR y `/api/ventas` | Alto: evita regresiones como C-01 | Bajo | `service/pos/PosVentaService.java`, `service/VentaService.java`, `service/pos/PosQrSessionService.java` | Extraer `ItemVentaValidator` (cantidad 1..999, producto activo, mismo negocio, vendible) y usarlo en los tres flujos |
| M-02 | Precio consistente entre canales | Medio: hoy el POS y el QR cobran `getPrecioEfectivo()` (con oferta), mientras el marketplace (`CheckoutOrderFactory.java:99-101`, `StockReservationService.java:73-75`) y `/api/ventas` (`VentaService.java:92`) usan `getPrecioVenta()` | Bajo | esos archivos | Decidir la regla (con o sin oferta) y centralizarla en `Producto`. Coordinar con el Auditor 3 si en el marketplace la oferta se muestra pero no se cobra |
| M-03 | Pruebas de concurrencia de stock (C2) | Alto | Medio | `src/test/.../stock` | Test de integración (Testcontainers) con dos hilos que venden la última unidad por POS y marketplace. Debe vender uno solo y dejar el stock en 0, nunca negativo |
| M-04 | Restricción en la base de datos | Alto | Bajo | migración Flyway nueva | `CHECK (stock_actual >= 0 AND stock_reservado >= 0)` en `producto`, como última barrera. Antes, revisar si hay datos negativos en prod (solo lectura) |
| M-05 | Paginar el historial del POS | Medio: el rendimiento empeora a medida que crece el negocio | Bajo | `service/pos/PosVentaService.java:79-83` | Agregar `Pageable` y filtro de fechas; hoy trae todas las ventas POS de la empresa |
| M-06 | Validar la entrada del controlador POS | Medio | Bajo | `controller/PosController.java:33`, `dto/PosVentaDTO.java` | `@Valid`, `@Size(max=100)` en los ítems y `@Size(max=500)` en las notas. Quitar `precioUnitario` del DTO, que se ignora y confunde |
| M-07 | Mensajes de error claros en caja | Medio (UX) | Bajo | `PosController.java`, front POS | Devolver código y producto en el 400 por falta de stock (`StockInsuficienteException` con `disponible`), para que la caja muestre "Solo quedan N" |
| M-08 | Impuestos explícitos | Medio: hoy `aplicaImpuesto=false` y `montoImpuesto=0` están fijos (`PosVentaService.java:154-155`, `VentaService.java:65-66`) | Medio | mismos archivos | Documentar que los precios incluyen IVA o calcular el desglose de IVA por producto (necesario para Hacienda, que está pausado). No bloquea el lanzamiento si se comunica que los precios incluyen IVA |
| M-09 | Pruebas de permisos POS (C5) | Alto | Medio | `src/test/.../security` | Matriz: un cajero (`pos.usar`) puede vender pero no ajustar stock (`/api/stock/**` exige ADMIN o EMPRENDEDOR), no editar bodegas, no aplicar descuento sin `pos.descuento` y no cerrar el turno de otro |
| M-10 | Retirar el código Tilopay del QR después de ONVO | Medio | Bajo | `PosQrController.java:124-149`, `PosQrVentaService.java` | Borrarlo en un PR aparte cuando el QR por ONVO esté verde |

## Verificado como correcto (sin hallazgo)
- POS y `/api/ventas` usan `findByIdForUpdate` (`PESSIMISTIC_WRITE`) y validan contra `stockDisponible`.
- Aislamiento: el producto y la bodega deben ser del mismo negocio en POS (`PosProductoDeEmpresa`, `PosVentaService.resolverBodega`), en `/api/ventas` y en el QR. Editar y borrar bodegas pasa por `companyScope.assertCanAccessNullable`. `/api/stock` verifica la empresa dueña del producto.
- El precio del POS sale siempre del catálogo, no del body. El descuento está limitado al subtotal y exige `pos.descuento`.
- El marketplace valida `cantidad >= 1` y el override de precio es `@JsonIgnore`.
- El QR del POS reclama la sesión de forma idempotente (`reclamarParaCompletar`) y exige un confirmador distinto para SINPE manual.
