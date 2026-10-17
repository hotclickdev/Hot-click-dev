# Contrato S4-22 · Estado del pago SINPE / ONVO desde la página de gracias (Frontend #179)

El SINPE es **el de ONVO** (sin número de destino propio). `GET /api/payments/status/{numeroPedido}` queda como estaba.

## Token
El checkout (`POST /api/payments/checkout` y `/api/payments/guest-checkout`) devuelve un campo nuevo:
```json
{ "numeroPedido": "ORD-…", "cancelToken": "…", "estadoPagoToken": "<64 hex>", "...": "…" }
```
`estadoPagoToken` es un HMAC-SHA256 del número de pedido, solo de lectura y **distinto del `cancelToken`** (uno no sirve por el otro). No vence. La página de gracias lo guarda junto al número.

## GET /api/public/pedidos/{numero}/estado-pago?token=…
Público (sin sesión). Respuesta `Cache-Control: no-store`, `X-Robots-Tag: noindex, nofollow`.
```json
{ "success": true, "message": "Estado del pago",
  "data": { "estado": "PENDIENTE", "numero": "ORD-1A2B", "tienda": "Café Estado",
            "correo": "c***@test.cr", "cantidadProductos": 3, "subtotal": 10000,
            "envioEtiqueta": "Envío a domicilio", "envio": 2500, "total": 12500,
            "reservadoHasta": null } }
```
- `estado`:
  - `CONFIRMADO`: pago `CAPTURADO` (o `REEMBOLSADO`, que antes se confirmó).
  - `VENCIDO`: pago `FALLIDO` o `CANCELADO`, o `PENDIENTE` con el plazo vencido (solo si hay plazo configurado).
  - `PENDIENTE`: el resto, incluido «todavía no hay pago».
- Pago de varias tiendas (un pago, varios subpedidos): los montos y `cantidadProductos` suman todos los paquetes; `tienda` une los nombres con «, »; `numero` es el del subpedido principal. Cualquier número del grupo con su token funciona.
- `tienda`: nombre comercial (si no hay, razón social).
- `envioEtiqueta`: «Envío a domicilio» | «Retiro en tienda» | «Encomienda (se paga al retirar)» | «Envío» (mezcla u otro) | `null`.
- `total`: lo que se cobró (`pago.monto`); sin pago, la suma de los subpedidos.
- `reservadoHasta`: ISO con zona CR, o `null`.

## Plazo (configurable, sin valor por defecto)
ONVO no documenta un plazo para SINPE. Propiedad `hotclick.sinpe.plazo-minutos`, **sin valor por defecto**: sin ella (o con ≤ 0) un pago `PENDIENTE` nunca pasa a `VENCIDO` por tiempo y `reservadoHasta` es `null`. Con valor, `reservadoHasta` = creación del pago + plazo. Si el pago trae su propia `fechaExpiracion`, esa manda. Elegir el valor es decisión del dueño (S4-03).

## Errores
| Código | Cuándo |
|---|---|
| 404 `{success:false, message:"No encontramos un pedido con este enlace."}` | sin `token`, token mal formado, token de otro pedido, `cancelToken` en lugar del de estado, pedido inexistente o eliminado. Siempre el mismo mensaje: no revela si el pedido existe. |

No hay 400 ni 403: el pedido es del comprador y la autorización es el token. Un acceso que no vale se responde 404, como pide Frontend.

## Desviaciones
- El token es `estadoPagoToken`, un campo nuevo del checkout. Frontend decía «el de la página de gracias»; no se reutiliza el `cancelToken` para que un enlace de solo lectura no permita cancelar.
- `CANCELADO` y `FALLIDO` se muestran como `VENCIDO` (el enum del front no tiene otros valores): ya no se puede pagar.
