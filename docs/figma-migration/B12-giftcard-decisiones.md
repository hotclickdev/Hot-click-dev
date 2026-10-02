# B12 — Decisiones Figma Gift Card

Fecha: 2-oct-2026. Investigación. Sin cambios de checkout, gift card, rutas, CSS, backend ni tests.

B8 dejó D09 y D10 abiertas. B11 las marcó como el siguiente par. B7, B9 y B10 no las contestaron.

## Estado Git

| | |
| --- | --- |
| Branch | `feat/figma/base` |
| HEAD al investigar | `652fa8ee` |
| Master | `b355fd20` |
| PASS / PARTIAL | 37 / 53 |

## D09 — Gift Card válida

### Figma 55:2220

`CHK.md` y el inventario ubican el frame en `/checkout`, paso 3, con sesión y tarjeta de regalo válida. No lo describen como otro producto ni otra ruta.

Lo que los docs dicen que el frame dibuja, y el checkout de `29:1344` no:

- una barra con el texto «Pago · paso 3 de 3»;
- un número de pedido anterior al pago;
- «Total restante» y la nota de la tarjeta.

### Código actual

El campo está en `CampoCodigo`, armado por `CodigosCheckout` en `PasoPago.tsx`. Solo con sesión. El comentario cita `55:2220` y `55:2284` como presentación; la validación sigue en `ejecutarValidarGiftCard`.

En móvil el paso 3 usa el chrome de `29:1344`:

- `CabeceraCompraSegura`;
- `IndicadorPasos` con tres etiquetas (`checkout.f.paso1`, `paso2`, `paso3`);
- título `checkout.f.pagoTitulo`;
- `PieCheckoutMovil`.

No existe la cadena «Pago · paso 3 de 3». No hay número de pedido en el paso 3. `numeroPedido` aparece después del pago, en `CheckoutPaidGiftCard`, cuando el proveedor es `GIFT_CARD`.

Si `gcAplicado > 0`, el pie cambia la etiqueta a `checkout.codigo.totalRestante` y el resumen muestra la línea de la tarjeta y la nota. El estado `valid` pinta borde verde, «Quitar» y el saldo. Eso es el contenido del frame, no la barra ni el número.

En escritorio el mismo bloque va en el resumen lateral. El total grande sigue siendo `cart.total`. No hay frame de escritorio de este estado en el inventario.

### Diferencias

| Pieza | `55:2220` | Código en el paso 3 |
| --- | --- | --- |
| Barra de paso | «Pago · paso 3 de 3» | Indicador de tres pasos de `29:1344` |
| Número de pedido | Previo al pago | No existe hasta que el pago responde |
| Total restante y nota | Dibujados | El pie y el resumen los muestran si hay saldo aplicado |
| Campo válido | Dibujado | `CampoCodigo` en estado `valid` |

### Interpretación

`55:2220` es el mismo paso de pago con tarjeta aplicada, no un flujo aparte. Muestra un chrome distinto al de `29:1344` para esa misma pantalla. El contenido de la tarjeta ya está en el paso 3. La barra y el número previo no están, y el número no se puede pintar antes del pago sin inventar un dato: el API lo devuelve al cobrar.

Aplicar la barra de `55:2220` deja de coincidir con `29:1344` en el mismo paso. Conservar el indicador de tres pasos deja sin pintar la barra y el número del frame de gift card.

### Clasificación

DECISIÓN HUMANA

### Conclusión

No hay un cambio que cumpla los dos frames a la vez. Elegir cuál gobierna el chrome del paso 3 con tarjeta válida es la pregunta de B8 (Figma-D09). El total restante y la nota no están en disputa. El número previo al pago no es un ajuste de CSS.

## D10 — Gift Card inválida

### Figma 55:2284

El inventario dice que las diferencias son las mismas que `55:2220`. B8 dice que el frame repite ese chrome en el estado inválido. No hay, en estos docs, un texto de error citado aparte del chrome.

### Código actual

El mismo `CampoCodigo` y el mismo `IndicadorPasos`. Si la validación falla, `gcEstado` pasa a `invalid`, el saldo queda en 0 y el campo muestra borde rojo y un `role="alert"` (`giftInvalidoTitulo`, `giftInvalidoAyuda`). El botón sigue siendo Aplicar, no Quitar. El pie no usa «Total restante» porque `gcAplicado` es 0.

`codigoDescuento.test.ts` cubre el markup de inválido, válido y reposo. No hay un spec de Playwright del paso 3 con tarjeta inválida. `cart-cta.spec.ts` solo ve el campo deshabilitado en el carrito sin sesión.

### Diferencias

El error del código está en el campo. El chrome inválido del frame es el de `55:2220`: barra «Pago · paso 3 de 3» y número previo al pago. El paso 3 no los usa, ni en válido ni en inválido.

### Interpretación

`55:2284` no es otro flujo. Es el estado de error del mismo paso. Lo que cambia respecto de `55:2220`, en la documentación, es el estado del código, no un header distinto. El código ya separa válido e inválido en el campo. El chrome compartido con D09 sigue sin aplicarse.

### Clasificación

DECISIÓN HUMANA

### Conclusión

D10 no se puede implementar sola. Usa el chrome que se defina para D09. El alerta del código inválido ya existe y no pide ese chrome.

## Comparación con 29:1344

`29:1344` es el paso Pago móvil sin el estado de tarjeta de regalo como tema del frame. El inventario dice que coincide al píxel en lo dibujado, con SINPE por defecto. Su indicador es el de tres pasos. No menciona «Total restante», la barra «Pago · paso 3 de 3» ni un número de pedido.

`55:2220` y `55:2284` son ese mismo `/checkout` en paso 3, con sesión, cuando la tarjeta es válida o inválida. No son una ruta nueva. Añaden contenido de la tarjeta y, en el dibujo, un chrome que `29:1344` no tiene.

En el código, válido, inválido y sin tarjeta comparten `CabeceraCompraSegura` e `IndicadorPasos`. Lo que cambia es el campo, el resumen y la etiqueta del pie.

El flujo normal de pago es `29:1344`. El flujo de gift card, en Figma y en código, es un estado de ese paso, no una pantalla aparte. Por eso los dos chromes no pueden gobernar el paso 3 al mismo tiempo sin una elección.

## Matriz final

| Decisión | Estado | ¿Implementable? | Motivo |
| --- | --- | --- | --- |
| D09 | DECISIÓN HUMANA | No | `55:2220` y `29:1344` dibujan dos chromes para el mismo paso 3. El contenido de la tarjeta ya está. La barra y el número previo exigen elegir frame, y el número no existe antes del pago. |
| D10 | DECISIÓN HUMANA | No | `55:2284` repite el chrome de D09 en el error. El alerta del código ya está. No hay un cambio de chrome distinto del de D09. |

## Bloque desbloqueado

Este bloque no desbloquea implementación.

Pintar «Pago · paso 3 de 3» y un número de pedido en el paso 3 dejaría de coincidir con `29:1344` e inventaría un número que el flujo solo recibe al cobrar. Dejar el indicador de tres pasos deja D09 y D10 abiertas. Las dos lecturas están en los docs. Elegir una es la decisión.

## Siguiente bloque

Después de checkout (B10), tienda (B11) y gift card (B12), el siguiente ítem de B8 con dos frames sobre el mismo control es Figma-D03: el stepper de la ficha con variantes (`44:1775`) frente a la ficha general (`28:839`) y al carrito (`28:989`).

Sigue clasificado como decisión humana en B7 y B8. No hay en la matriz una decisión que ya cumpla frame único, código existente, sin backend y sin elección pendiente.
