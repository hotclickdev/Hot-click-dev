# Auditor 3 — Re-auditoría SOLO LECTURA área 3, master 23f8c156 (rango 8ee8ada8..23f8c156)

**Veredicto: MED-4 se CIERRA. No hay ALTO nuevo ni abierto en área 3.**
- 91 tests dirigidos en 11 clases, todos en verde (EXIT=0, `/workspace/auditor3/tests-23f8.log`).
- No corrí la suite completa porque el lock existe.

## #449 — MED-4 (CERRADO)
- `SelfCheckoutService.java:82`: el catálogo QR usa `OrderPricingService.precioEfectivo(p)`.
- `SelfCheckoutService.java:185`: el pedido usa el mismo `precioEfectivo`, que también queda guardado en el ítem.
- Sigue el guard que rechaza productos de otra empresa (403, l.181).
- Test `SelfCheckoutPrecioOfertaTest`: con oferta, 2 × 1500 = 3000 y el catálogo muestra 1500; sin oferta cobra 2000.

## #455 — self-checkout
- **Cantidad 1..100:** `cantidadValida` solo acepta enteros JSON. Decimales, texto, null, 0, negativos, 101 y valores Long gigantes dan 400 y no se guarda nada.
- **Máximo 50 líneas:** se valida en el controller y en el service. 51 líneas dan 400.
- **Tipos inválidos → 400:** un ítem que no es objeto, `items` que no es lista, o un `productoId` decimal o en texto dan 400 y no 500.
- **Token enmascarado:** el log del 500 solo muestra `****` y los últimos 4 caracteres.
- **Totales — matiz:** no se usa BigDecimal. Son `int` con `Math.multiplyExact/addExact/subtractExact`, y el overflow da `ArithmeticException` → 400 "Total fuera de rango". Igual son exactos, porque los colones son enteros y el desborde se rechaza en vez de envolver. Funcionalmente cumple; el brief decía BigDecimal y no es así. El IVA sigue el cálculo previo, que no cambió en este rango.

## #448 — envío (CONFIRMADO)
- **Sin provincia/cantón → 400:** `DestinoEnvio.exigir` lo aplica:
  - En checkout (`CheckoutPaquetesPlanner`), tanto si el método general es de envío como si cualquier paquete planificado va a domicilio.
  - En la tienda invitado, con `ENVIO_DOMICILIO`.
  - En retiro no se pide.
- **Destino antes de reservar stock:** `StorefrontGuestOrderService.java:58-61` valida el destino y calcula el costo antes de `resolverBodega` y de `stockService.reservar` (l.101). Test: `StorefrontDestinoAntesDeStockTest` (3).
- **503 si falla la config:** `ConfiguracionEnvioService` ahora falla cerrado y lanza `EnvioNoDisponibleException`. `GlobalExceptionHandler` responde 503 `ENVIO_NO_DISPONIBLE` con Retry-After 60.
  - `PaymentController` y `SinpeController` relanzan la excepción, así que no se convierte en 500.
  - `StorefrontController` no la atrapa y le llega al handler.
  - Test: `CheckoutEnvioNoDisponible503Test`.

## Estado de abiertos
| Ítem | Estado |
|---|---|
| MED-1 personalizados en carrito/tienda | **Abierto, sin cambio** (`CarritoService:74`, `StorefrontGuestOrderService:101` siguen con `stockService.reservar`) |
| MED-2 residuales M-08 (Stripe/Tilopay/manual) | **Abierto, sin cambio** (el rango no toca esos flujos) |
| B-5 Telegram `crearProductoTx` sin `ProductoAltaService` | Abierto, sin cambio |
| B-6 bulk no atómico por lote | Abierto, sin cambio (aceptado por diseño) |
| direccionFinal (texto libre en medio de las señas) | Aceptado y documentado en el javadoc; la fuente de verdad son los campos estructurados |
| envioMontoZona ≠ lo cobrado | **Cerrado:** el javadoc de `Pedido.java` ahora lo aclara (tarifa de la zona; lo cobrado es `costoEnvio`) |
| BAJO multi-negocio en bodega HotClick (un solo envío) | Aceptado |
| B-1 sin destino cobra fuera del GAM | **Cerrado por #448** (ahora da 400) |
| B-1..B-3 de 92e633f9, B-4 cobertura MED-1 | Sin cambio |

## Fuera del área 3 en el rango (no auditado a fondo)
Hay cambios en asistente (cuotas/HMAC), Hacienda (cédula/sanitizer), CI y follow-redirects. Ninguno toca precios, stock ni pedidos del marketplace.
