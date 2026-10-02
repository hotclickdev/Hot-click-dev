# B17 — Correos transaccionales

Fecha: 2-oct-2026. Investigación. Sin cambios de templates, asuntos ni backend.

## Estado Git

| | |
| --- | --- |
| Branch | `feat/figma/base` |
| HEAD al comenzar | `264abca4` |
| Master | `b355fd20` |
| PASS / PARTIAL | 37 / 53 |

Frames: `30:1599`, `30:1643`, `30:1669`, `30:1708`, `30:1733`, `30:1768`, `30:1793`. Docs: `QR.md`. Código en `com.hotclick.service.email` y `PaymentFailureHandler`.

## Confirmación (`30:1599`)

`ConfirmacionPedidoEmailBuilder` dice «Envío a domicilio. Vas a recibir tu pedido en la dirección indicada.» o el texto de retiro. No incluye la dirección concreta ni la etiqueta «Envío normal GAM». `QR.md`: el pedido no guarda la dirección.

### Clasificación

BACKEND

## Guía (`30:1643`)

Faltan «Paquete N de M» y los pedidos hermanos. Hace falta `grupoPago`. El enlace «Ver el estado de todo mi pedido» se conserva.

### Clasificación

BACKEND

## Seguimiento (`30:1669`)

Figma solo dibuja «En preparación». Los demás estados reutilizan esa estructura. Los pasos solo aparecen en los estados que el frame nombra. Se quitaron lista de productos y total, que no están en el frame.

### Clasificación

RESUELTO

No hay una diferencia de implementación contra el único estado dibujado. Los otros estados no tienen frame propio.

## Pago fallido (`30:1708`)

Figma dice «Tu pedido quedó guardado».

El HTML de `PagoFallidoEmailBuilder` dice: «Tu pedido #… no se completó. No se hizo ningún cobro.»

`PaymentFailureHandler.marcarFallido` llama a `stockReservationService.liberarReservas(pedido)`. `StockReservationService` dice que solo libera `stockReservado` y no toca `stockActual`, y que se usa en pago cancelado, fallido y expirado.

El correo no dice «stock liberado». La reserva sí se libera. El stock actual no se mueve en ese método.

### Clasificación

DECISIÓN HUMANA

El frame afirma que el pedido quedó guardado. El correo dice que no se completó y que no hubo cobro. La reserva se libera. Elegir el texto implica decir si el pedido sigue guardado. No se cambia el template en esta fase.

## Carrito abandonado (`30:1733`)

`CartItemDTO` trae producto, cantidad, precio, nombre e imagen. No trae tienda ni stock. El builder lo documenta: Figma muestra tienda y «Quedan N»; el carrito guardado no.

### Clasificación

BACKEND

## Cupón (`30:1768`)

`NegocioEmailBuilder` comenta que Figma dice «Válido por 30 días» y que el cupón no tiene vencimiento. El cuerpo dice «Válido para una sola compra, una vez por persona». `enviarCuponBienvenida` no recibe una fecha.

### Clasificación

BACKEND

## OTP (`30:1793`)

El asunto de Figma es «Tu código de verificación: 482 913». `OtpService` envía «Tu código de verificación — HotClick». El comentario dice que el asunto nunca lleva el código, porque se ve en la pantalla de bloqueo. El código va en el cuerpo, en dos grupos de tres.

### Clasificación

DECISIÓN HUMANA

Poner el código en el asunto iguala el frame y lo deja visible en la pantalla de bloqueo. No es un ajuste de HTML del cuerpo.

## Decisión

Ningún correo queda IMPLEMENTABLE. Seguimiento queda RESUELTO respecto del único estado dibujado.

## Siguiente bloque

B18, login, accesibilidad y cookies.
