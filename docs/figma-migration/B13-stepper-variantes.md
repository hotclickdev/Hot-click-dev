# B13 — Stepper de variantes

Fecha: 2-oct-2026. Investigación. Sin cambios de ficha, carrito, CSS, rutas, backend ni tests.

B8 dejó D03 abierta. B12 la señaló como el siguiente ítem. `PROD_DECISIONES.md` sección 4 ya la marcó como decisión del usuario y no la cerró. B7 y B9 no la contestaron.

No se toma la ausencia del stepper en `44:1775` como orden de quitarlo. Tampoco se toma el código actual como cierre.

## Estado Git

| | |
| --- | --- |
| Branch | `feat/figma/base` |
| HEAD al investigar | `c07efad4` |
| Master | `b355fd20` |
| PASS / PARTIAL | 37 / 53 |

## Figma 44:1775

Ficha con variantes, móvil. Alto documentado 772. La barra `44:1844` es un botón de ancho completo, 358×46, con el texto «Agregar talla 40 · ₡6.200». Ese nodo no incluye stepper.

El inventario midió título en 376, swatches de 34 px, talla en 597 y chips en 623. La fila sigue PARTIAL porque el código conserva el stepper que este frame no dibuja.

`PROD_DECISIONES.md` anota que este frame también omite bloques que sí están en `28:839`: «Disponible · N en stock», «IVA incluido», descripción, «Entrega y pago», «Preguntale» y «Opiniones». El alto 772 no cubre la ficha completa (la de `28:839` mide 1522 en el inventario).

El mismo documento calcula que un stepper de 81 px cabría en la barra de 358 junto a un texto de unos 180 px. La omisión no se explica por falta de ancho.

## Figma 28:839

Ficha general móvil. PASS en el inventario. La barra fija está en y=761. El stepper es el nodo `28:978`, 81×45, junto al botón de agregar.

La ficha de escritorio `29:2072` también dibuja stepper (`29:2151`, 97×49) y está en PASS. No es el frame de variantes.

## Figma 28:989

Carrito móvil por paquetes. Cada línea tiene su propio stepper: nodo `37:1534`, 72×25, «−  1  +». El inventario dice que las medidas del carrito coinciden; la fila sigue PARTIAL por «Sale de &lt;provincia&gt;», que es backend y no es D03.

El stepper del carrito no dice en qué pantalla se eligió la cantidad. El precio del botón de la ficha con cantidad 1 coincide con el unitario que muestra el frame de variantes.

## Código actual

`ProductInfo` monta `AccionesCompra` dos veces: fila de escritorio (`inline`) y barra móvil (`barra`).

El stepper (− / cantidad / +) sale solo en la rama de compra normal y solo si `product.esPersonalizado` es falso.

No sale si:

- el producto está agotado (`BotonAgotado`);
- es cotizable (personalizado sin precio fijo): solo «Solicitar encargo»;
- es personalizado, aunque el precio sea fijo.

Talla o color no apagan el stepper. Solo cambian el texto del botón móvil: «Agregar talla {talla} · {precio}». El precio es unitario por la cantidad elegida.

Al agregar, la línea entra al carrito con esa cantidad. En el carrito, `FilaProductoCarrito` dibuja otro stepper por línea, sin mirar si el producto tiene variantes o cómo se agregó. Bajar de 1 quita la línea.

No hay un test que pulse el stepper de la ficha. `pdp-agregar-hoja.spec.ts` pulsa el botón Agregar. `productoAgotado.test.ts` cubre agotado y cotizable, no la visibilidad del stepper en variantes.

## Comparación

| | Stepper en la ficha | Cantidad después |
| --- | --- | --- |
| `28:839` ficha general | Dibujado (`28:978`) | El código lo muestra si no es personalizado |
| `44:1775` variantes | La barra dibujada no lo trae | El código lo muestra igual |
| `28:989` carrito | Stepper por línea | El código lo muestra siempre |
| `44:1849` personalizado | No lo trae | El código tampoco lo muestra |

La diferencia de D03 es solo la ficha con variantes: el frame de la barra no tiene stepper y `AccionesCompra` sí, porque la condición es «no personalizado», no «no tiene talla».

## ¿El frame 44:1775 es completo?

NO.

El alto y los bloques que omite, y que `28:839` sí incluye, indican que no es la ficha entera. PROD conservó en variantes entrega, preguntas y opiniones, que este frame no dibuja.

Eso no cierra el stepper. La barra `44:1844` sí está dibujada, como un botón completo, y en ese nodo no hay stepper. A diferencia de las secciones ausentes, el control de compra está en el frame y se ve sin − / cantidad / +. Cabe en el ancho, según la medida de `PROD_DECISIONES.md`. No hay un hilo de Figma en el repo que diga si esa omisión es recorte del frame o el diseño de la barra.

## D03

### Clasificación

DECISIÓN HUMANA

### Conclusión

Hay dos lecturas con evidencia:

- El frame de página es parcial, igual que otras omisiones que el código conservó. El stepper de `28:839` y el del carrito `28:989` siguen existiendo. La cantidad se puede cambiar en el carrito aunque la ficha entre con 1.
- La barra de variantes está dibujada y no incluye stepper, y el espacio alcanza. El botón del frame muestra el precio de una unidad.

Ninguna de las dos se deduce sola. Quitar el stepper en variantes iguala `44:1844` y deja la cantidad para el carrito. Mantenerlo alinea variantes con `28:839` y no con la barra de `44:1775`.

El personalizado no entra en esta pregunta: `44:1849` no tiene stepper y el código ya lo oculta.

### ¿Requiere decisión humana?

SÍ

## Matriz

| Referencia | Evidencia | Conclusión |
| --- | --- | --- |
| `44:1775` | Barra `44:1844`, botón 358×46, sin stepper. El frame omite otras secciones de `28:839`. Alto 772. | La página no está completa. La barra de compra sí está dibujada y no trae stepper. |
| `28:839` | Stepper `28:978`, 81×45, junto al botón. Fila PASS. | La ficha sin variantes sí define el stepper. |
| `28:989` | Stepper de línea `37:1534`, 72×25. | La cantidad también se edita en el carrito. No dice que la ficha no pueda tener stepper. |

## Bloque de implementación

Este bloque no desbloquea implementación.

Ocultar el stepper cuando hay talla sería elegir la barra de `44:1775` y contradecir `28:839` para ese caso. Dejarlo sería elegir `28:839` y dejar `44:1775` en PARTIAL. No hay un tercer dato en el repo que fije cuál de los dos frames manda en la barra de variantes.

## Siguiente bloque

Después de D03, el siguiente ítem de B8 que no tuvo una pasada propia es Figma-D07: «Pedir por WhatsApp» y la tarjeta de guardar por correo en el carrito de escritorio (`30:2268`).

Sigue clasificado como decisión humana. El frame de escritorio no los dibuja y el código los restauró. No hay en B8 una decisión que ya cumpla frame único, código existente, sin backend y sin elección pendiente.
