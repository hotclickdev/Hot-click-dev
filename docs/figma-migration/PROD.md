# PROD · Ficha de producto (2026-09-30)

Rutas relativas a `Hot_click_outlet/frontend/src/`. Rama `feat/figma/prod`. Capturas y scripts de QA fuera del repo (`%TEMP%\prod-qa`).

## Pantallas

| Frame Figma | Pantalla | Veredicto |
| --- | --- | --- |
| `28:839` | Ficha móvil | PASS — agent verified (reverificada 1-oct-2026) |
| `29:2072` | Ficha desktop | PASS — agent verified (reverificada 1-oct-2026) |
| `44:1775` | Ficha con variantes | PARTIAL |
| `44:1849` | Ficha personalizada | PARTIAL |
| `44:1917` | Ficha agotada | PARTIAL |
| `55:2167` | Galería a pantalla completa | PASS (móvil; solo existe el frame móvil) |
| `55:2191` | Galería · foto ampliada | PASS (zoom 2x con contador "1 / 4 · 2×") |

Las fichas principal móvil y desktop pasan a PASS tras reverificar en píxeles (1-oct-2026): las decisiones que las mantenían en PARTIAL (#10 y #11) ya están resueltas y la hoja "Agregado" la entrega CHK. Las otras tres fichas siguen PARTIAL: variantes (stepper que Figma omite, decisión del usuario), personalizado (falta el dato "Elaboración", backend) y agotado (etiqueta de diseño no renderizada, 14 px).

**Nota de reverificación:** en el escritorio, Figma pinta con borde negro los chips de "Preguntale" (`29:2188`, `29:2193`, `29:2198`) porque el trazo de la instancia está ligado a una variable que resuelve a negro; el componente `Chip` (`5:44`) y la ficha móvil usan el azul claro `blue/100`. Se considera un descuido del archivo y se mantiene el azul claro. Si el diseñador confirma el negro, es un cambio de una línea en `PreguntaProducto`.

## Medidas (Playwright, Sora y Public Sans reales, API simulada)

| Elemento | Figma | App antes | App ahora |
| --- | --- | --- | --- |
| Móvil principal: galería | 390 de alto, a sangre | caja 3:2 con borde y migas | 390 |
| Título / vendedor / precio (y) | 442 / 412,5 / 480 | 520 / 553 / 645 | 442 / 412,5 / 480 |
| Caja Entrega y pago (y, alto) | 610, 131 | no existía | 610, 131 |
| Tarjeta Preguntale (y, alto) | 765, 172 | caja de chat | 765, 172 |
| Carrusel recomendados (y) | 1132 | tarjetas de 160 | 1132, tarjetas 167x280, la tercera en x=374 |
| Alto total de la página móvil | 1522 | 1955 | 1522 |
| Barra de compra fija | y=761, 83 | sticky con precio y "Comprar ahora" | y=761, 83; stepper 81x45, botón 267x46 |
| Desktop: galería / foto | x=204, 560x560, miniaturas 72 | 3:2 | idéntico |
| Desktop: título, precio, stock, descripción (y) | 210, 264, 323, 355 | otras | 210, 264, 323, 355 |
| Desktop: acciones, entrega y pago, Preguntale (y) | 394, 462, 599 | otras | 394, 462, 599 |
| Desktop: opiniones, título, tarjetas (y) | 781, 867, 915 | otras | 781, 867, 914 (el título mide 27 y no 28) |
| Variantes: título, color, talla, chips (y) | 376, 479, 597, 623 | no existía | idénticos |
| Personalizado: tag, título, vendedor (y) | 376, 401, 459 | caja | idénticos; panel 27 px más arriba (sin fila Elaboración) |
| Agotado: galería, etiqueta, carrusel (y) | rectángulo blanco 390x360, 376, 754 | foto visible | rectángulo (0,0,390,360), 376, 740 (14 px menos por la etiqueta no mostrada) |
| Galería completa: cerrar, visor, pista, miniaturas, título | (16,10) 40, (0,88) 390x520, (67,5,560), (52,650), y=740 | otra | idénticos |

Causa de las diferencias de alto en Sora: Figma usa un interlineado de 1,265 y el navegador 1,385; se fijaron `leading` explícitos (33, 30, 43, 28, 21, 20). El `h1-h4` global de `index.css` aplica Sora y tracking de -0,02em; Figma no tiene tracking, por eso los títulos de la ficha llevan `tracking-normal` y los encabezados en Public Sans `font-sans`.

## Diferencias que quedan

1. **Elaboración** ("Se elabora en 3 a 5 días hábiles", `44:1876`): no existe el dato en backend y Figma la marca como "NUEVO · por programar". No se muestra.
2. **"NUEVO · por programar"** (`44:1882`, `44:1952`): anotación de diseño, no se muestra. `FormularioAvisoReposicion` ya no la pinta y se borraron `restockNuevo` y `restockNoAccount` en es/en/pt (el texto "Si ingresaste a tu cuenta, también te avisamos por WhatsApp" es ahora el único, como en Figma). El encabezado del aviso mide 18 y no 32 sin la etiqueta.
3. **Foto del agotado** (decisión del usuario): se aplica Figma literalmente. Un rectángulo blanco opaco (`n/0`, opacidad 1) de 390x360 en (0,0) cubre la foto al 100 %, por debajo de los botones atrás/compartir/favorito y del contador "1 / 4" (que siguen visibles). Medido: rectángulo (0,0,390,360), píxeles de la galería blancos como en Figma, pastilla del contador rgba(115,115,115) idéntica. Solo en móvil: desktop no tiene frame de agotado y muestra la foto. Si el diseñador aclara otra intención se ajusta (prop `cubierta` de `ProductGallery`).
4. **Guía de tallas** (`44:1813`): no existe contenido ni ruta. No se muestra.
5. **Stepper de cantidad** (decisión del usuario): se MANTIENE en variantes (Figma lo omite en esa barra; verificado en 390: botones de cantidad presentes) y se mantiene la omisión en personalizado (la etiqueta "Agregar pedido personalizado · ₡11.000" no cabe con el stepper).
6. **"Comprar ahora"** ya no existe: Figma solo tiene "Agregar". `handleComprarAhora` queda en el hook sin uso.
7. **Barra superior**: la ficha usa `MainLayout variante="propia" barraInferior={false}`, no `interna`: Figma no tiene barra, la foto llega a y=0 con atrás/compartir/favorito encima.
8. **Panel de personalizado con precio fijo** oculta presupuesto y "¿Cómo funciona?" (el frame no los muestra); con cotización se conservan.
9. **Pregunta sobre el producto**: las tres preguntas fijas abren el asistente global con el nombre del producto, en lugar del chat embebido anterior (`AIProductSection` ya no se usa en la ficha).
10. Se quitaron los distintivos de confianza, la prueba social y la insignia de garantía (no están en Figma; los cubre "Entrega y pago").
11. Anchos de texto de Sora ±2 px por métricas de fuente (p. ej. precio 138,9 vs 141 en desktop).
12. Estados sin frame (hover, enfocado, favorito activo): favorito activo se pinta en rojo; stock bajo (≤5) usa color de advertencia; oferta muestra el precio de lista tachado.
13. Tablet: no hay frame; entre 390 y 1023 el diseño móvil se estira, desde 1024 usa el de desktop con la columna de compra de al menos 360 px.

## P02 · implementación de PRODUCTO (2-oct-2026)

Bloque de implementación sobre `feat/figma/base`. No hubo acceso directo a Figma (sin token ni MCP utilizable desde la terminal). Las referencias son las medidas de este documento, de `PROD_DECISIONES.md` y de `B13-stepper-variantes.md`.

### Remedición (Playwright, Chrome, API simulada, 390x844 y 1440x900)

| Frame | Medido en P02 | Referencia |
| --- | --- | --- |
| `28:839` | título 442, precio 480, alto 1522, barra fija y=761 de 83, botón 267x46 | igual |
| `29:2072` | título 210, precio 264, stock 323, botón «Agregar al pedido» 339x49 en y≈395 | igual |
| `44:1775` (con `grupoVarianteId`) | título 376, «Color» 479, «Talla» 597, chips 623 | igual |
| `44:1849` (título de dos líneas) | etiqueta 376, título 401, vendedor 459 | igual |
| `44:1917` | etiqueta 376, tarjetas de «Parecidos disponibles» en 740 | igual a lo medido por PROD (Figma 754: anotación no pintada) |

En las 8 vistas, `scrollWidth` es igual a `clientWidth` y no hay errores de consola. En móvil no hay botones flotantes encima de la barra de compra. En escritorio se ve el WhatsApp global en (1368, 828), regla de SYS.

### Corregido

- **«Quedan N» sin selector de talla** (punto 5 de «Diferencias reales» en `PROD_DECISIONES.md`). La cabecera compacta oculta la línea de stock porque en `44:1775` el aviso vive en el selector de talla. Un producto con color y sin talla (por ejemplo, stock 3) no mostraba la escasez en ningún lado. Ahora `avisoStockBajoSinTalla` (`productoHelpers.ts`) mantiene en la cabecera la línea de `28:839` solo si no hay selector de talla. No aplica a personalizados, cotizables ni agotados. Los frames de estado no cambian de posición.
- Pruebas: 3 casos unitarios en `productoFicha.test.ts` y `tests/prod-estados.spec.ts` con 10 casos: cuatro estados a 390 y 1440, aviso en el selector de talla y aviso en la cabecera con solo color.

### Sigue PARTIAL

- `44:1775`: D03 (stepper en variantes). B13 y B19 (lista D) la dejan como DECISIÓN HUMANA sin respuesta. Falta elegir entre la barra de `44:1844` sin stepper y la de `28:839` con stepper. El código conserva el stepper.
- `44:1849`: no existe el dato «Elaboración» (`44:1876`) en el backend. El panel queda 27 px más arriba.
- `44:1917`: la cubierta opaca ya está. El único corrimiento (14 px) es la anotación «NUEVO · por programar», que no se pinta por la regla del inventario. B19 la deja en la lista E, sin promoción. Para promoverla hay que remedir el frame completo con acceso a Figma.
- Guía de tallas (`44:1813`): sin contenido ni ruta. No se inventó.
## Consumidores

- `ProductDetailPage` es la única que monta estos componentes. Se eliminaron `AddToCartButton`, `HeartDetailIcon`, `ProductBuyActions`, `ProductLowStockAlert`, `ProductPriceRow`, `QuantitySelector`, `RecommendationsRow`, `StickyCartBar`, `TitleAndBadges` y `TrustBadges` (sin otros consumidores).
- `ProductAgotado`: `AlternativasAgotado` se reemplazó por `AvisameAgotado`; "Parecidos disponibles" usa `CarruselProductos`.

## i18n

Solo namespace `product` (es, en, pt en el mismo commit): 67 claves nuevas, 2 borradas. Sin namespaces nuevos.

## Dependencias para otros

- **CHK**: se editó una línea de `pages/checkout/codigoDescuento.test.ts` (lista de claves de la ficha agotada, sin `restockNuevo` ni `restockNoAccount`).
- **SYS**: el FAB del asistente y el botón de WhatsApp flotantes se superponen a la barra de compra móvil (no están en Figma).
- **SHELL**: sin cambios; `MainLayout variante="propia"` en móvil y `encabezadoEscritorio="completo"`.
- **CAT**: se usa `comprador/ProductCard` sin cambios (167x280).
- **Backend**: dato de tiempo de elaboración y guía de tallas si se decide programarlos.

## No verificado

- Fotos reales del catálogo y reseñas reales (API simulada; la lista de opiniones con datos solo tiene prueba unitaria).
- Subida real de imágenes de referencia y envío de encargo (cotización) contra backend.
- Pinch real en táctil de la galería (solo doble clic y rueda).
- Safari/iOS.
