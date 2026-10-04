# B16 — QR, POS y estados de pago

Fecha: 2-oct-2026. Investigación. Sin cambios de QR, POS, lectores, comprobantes ni backend.

## Estado Git

| | |
| --- | --- |
| Branch | `feat/figma/base` |
| HEAD al comenzar | `264abca4` |
| Master | `b355fd20` |
| PASS / PARTIAL | 37 / 53 |

Frames: `29:1650`, `29:1741`, `29:1781`, `29:1830`, `29:1888`, `29:1913`. Docs: `QR.md`, `INVENTORY.md`, `B8-decisiones-Figma.md` (D14, D15). Código: `SelfCheckoutFormulario.tsx`, `PosPagoSinpe.tsx`, `QrResultado.tsx`.

## Mesa: nombre, teléfono y notas

`29:1650` dibuja menú, buscador y carrito flotante. No dibuja el formulario. `29:1741` (pedido enviado) está en PASS.

`SelfCheckoutFormulario` pide nombre, teléfono y notas, opcionales, antes de enviar. El comentario dice que Figma no dibuja ese paso. `QR.md` lo deja como decisión: mantener o quitar.

### Clasificación

DECISIÓN HUMANA

Quitar el paso iguala `29:1650` y deja de mandar esos campos. La ausencia no ordena el borrado.

## Pago QR: método, cobro y caja

`29:1781` dibuja la elección de método. El código muestra solo el método que fijó el cajero. `QR.md` pide número de cobro y caja en `GET /pos/qr/pago/:token`, y deja abierta la elección por el cliente.

### Clasificación

- Quién elige el método: DECISIÓN HUMANA
- Número de cobro y caja: BACKEND

## SINPE: datos del pagador

`29:1830` mide pasos, registro y espera. `PosPagoSinpe` muestra nombre, cédula y teléfono cuando el formulario está abierto. El inventario dice que ese formulario no tiene frame. Es Figma-D15.

### Clasificación

FIGMA PENDIENTE

No se quita el formulario por la ausencia. Tampoco se redibuja sin un frame.

## Pagado: comprobante y correo

`29:1888` coincide salvo «comprobante por correo» y «Ver comprobante». `QR.md`: el pago por QR no tiene correo ni ruta de comprobante.

### Clasificación

BACKEND

No se inventa el comprobante ni el correo.

## Vencido: «Escanear otro QR»

`29:1913` dibuja el botón. La app no tiene lector de QR para el comprador. No hay un destino definido para ese botón. `QR.md` lo deja como agregar un lector o no mostrar el botón.

### Clasificación

DECISIÓN HUMANA

No se inventa el lector ni el destino en esta fase.

## Pedido enviado

`29:1741` está en PASS. El bloque de confirmación medido no pide un cambio.

### Clasificación

RESUELTO

## Decisión

Ningún punto de QR queda IMPLEMENTABLE. No se toca el flujo de mesa ni el de caja.

## Siguiente bloque

B17, correos transaccionales.
