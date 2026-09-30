# CAT · Paso C0 del `ProductCard` (2026-09-30)

Rutas relativas a `Hot_click_outlet/frontend/src/`. Rama `feat/figma/cat`. Capturas y scripts de QA fuera del repo (`%TEMP%\cat-qa`).

## Qué quedó

`components/comprador/ProductCard.tsx` mide **167x280** como Figma `5:23` (antes 167x278), en 1440 y 390, con todas las variantes.

| Medida (Figma `9:430`, `26:804`) | Figma | App ahora |
| --- | --- | --- |
| Tarjeta | 167x280, borde 1, radio 14 | 167x280 |
| Foto | 167x167 (2 px más ancha que el interior, recortada) | 167x167 (`w-[calc(100%+2px)]` + `aspect-square`) |
| Favorito | 32x32 en (128, 9) desde la tarjeta | (128, 9) |
| Badge | alto 19, x=9, y=9 | alto 19 (`leading-[13px]`), (9, 9) |
| Nombre / tienda | 13/17 Medium y 11/15, en y=178 y y=214 | iguales |
| Botón Agregar | 32x32 en (124, 237) | (124, 237) |
| Home desktop, alto total | 1857 | **1857** (antes 1855) |

Causa del 278: en Figma el borde entra en el auto-layout y la foto mide el ancho total (167); en la app la foto era cuadrada sobre el ancho interior (165). Alto = 1 + 167 + 111 + 1 = 280.

## Variantes

- **Una sola insignia** sobre la foto, prioridad: *Hecho a pedido* (Figma `26:804`, mismo estilo warning que *Quedan N*), *Quedan N* (stock 1 a 5), *Oferta* (rojo suave, discreta). Si coinciden *Quedan N* y *Oferta*, manda *Quedan N*. Un agotado no lleva insignia.
- **Oferta:** precio de lista tachado (11 px, n/500) junto al precio de oferta. Si no cabe en la línea (precios de 5+5 dígitos o más), baja debajo; la altura de la fila (32) no cambia y la tarjeta no crece. El tachado lleva "Precio anterior" solo para lectores de pantalla.
- **Por rango ("Desde")**: "Desde" pequeño sobre el monto mínimo (antes el texto largo se salía hacia el botón).
- **Agotado:** sin variante nueva (Figma no define una para la tarjeta): precio sustituido por "Agotado" y botón deshabilitado, como antes.
- **Corrección funcional:** un producto a cotizar (COTIZACION o RANGO) con stock 0 ya no sale como "Agotado" con el botón muerto (`tarjetaAgotada` = stock 0 y no cotizable, igual que el catálogo anterior).
- Figma no define hover, selected, disabled ni loading para la tarjeta; no se añadió nada.

i18n solo en `comprador.tarjeta` (es, en, pt): `hechoAPedido`, `desde`, `oferta`, `precioAnterior`.

## Decisión `formatPrice`

- `utils/format.ts`: nueva `formatMiles(n)` y `formatPrice` la usa. Sigue siendo `Intl.NumberFormat('es-CR')`; solo se cambia el separador de grupo (NBSP en es-CR) por `.`. Resultado `₡6.200`. La convención de CLAUDE.md ("usar `Intl.NumberFormat('es-CR')`") se respeta.
- Evidencia: Figma usa punto en el 100% de los montos de 4+ dígitos (238 de 238 textos revisados en las 21 pantallas del archivo); no hay ninguno con espacio o coma.
- Seguro: 259 usos en 86 archivos (40 de comprador, 45 de admin); ninguno parsea el texto. Un solo test lo fijaba (`pages/checkout/codigoDescuento.test.ts:46`, línea actualizada a `'− ₡50.000'`). Efecto colateral aceptado: las pantallas admin que usan `formatPrice` también pasan a punto.
- **No migrados** (siguen con espacio): los formateadores paralelos (`fmt` de admin y POS, asistentes de IA, `theme/formatoColon.ts`, `cotizacionService`, `encargoService`, `ProductGallery`, `PersonalizacionPanel`, `features/pos-pago`, `selfCheckoutFormat`, texto de WhatsApp del carrito). Cada dueño puede usar `formatMiles` si su pantalla de Figma lo pide.
- `pages/catalogo/ActiveFilterChips.tsx` usa `toLocaleString()` sin locale (depende del navegador): pendiente de la pantalla de catálogo.

## Verificación

- vitest 83 archivos / 376 tests; `pnpm typecheck` limpio; eslint sin hallazgos en lo tocado; `vite build` a carpeta temporal compila.
- Playwright (1440 y 390, Sora y Public Sans reales, API simulada): normal, oferta, oferta+quedan, quedan, agotado, cotizable, cotizable con stock 0, FIJO, rango, nombre largo, sin foto: todas 167x280.
- Consumidores: Home 167x280 en destacados y nuevos; `ProductAgotado` 167x280; `SinResultados` funciona con ancho fluido (173x286 en móvil, 230x343 en desktop; Figma fija 167: queda para la pantalla de resultados).
- Comparación numérica con la captura de Figma `9:430`: bandas de texto del nombre y del precio coinciden (±1 px de métrica de fuente).

## Dependencias para otros

- **PROD:** usar `comprador/ProductCard` tal cual (`product`, `className`, `priority`); la foto es fluida y mide el ancho total de la tarjeta. Sus formateadores propios de precio siguen con espacio.
- **CHK:** se editó una línea de `pages/checkout/codigoDescuento.test.ts` (formato del descuento); los importes del checkout ya salen de `formatPrice`.
- **STORE / HOME:** sin cambios necesarios. Home no se modificó.

## Texto propuesto para PRODUCTCARD_STRATEGY / INVENTORY / PROGRESS

- STRATEGY, paso C0: "Hecho (2026-09-30). `comprador/ProductCard` 167x280, insignias Hecho a pedido / Quedan N / Oferta, precio de lista tachado, bug de cotizable con stock 0 corregido. Ver `CAT_C0.md`."
- INVENTORY (Home `7:2`, `9:171`, `12:*`): quitar el pendiente "ProductCard mide 278 y Figma 280" y "₡6 200 vs ₡6.200"; Home desktop ahora mide 1857.
- PROGRESS: "C0 cerrado; `formatPrice` global con punto de miles; 1 línea de test de CHK actualizada."
