# Estrategia: los dos `ProductCard`

Análisis del 2026-09-30. Rutas relativas a `Hot_click_outlet/frontend/src/`. **Solo análisis: no se migró ni se borró nada.**

## Los dos componentes

| | Nuevo | Antiguo |
| --- | --- | --- |
| Archivo | `components/comprador/ProductCard.tsx` (72 líneas) | `components/ui/ProductCard.tsx` (83) + `ui/productCard/ProductCardBody.tsx` (118) + `ProductCardImage.tsx` (131) |
| Origen | Rediseño Figma (`5:23`) | Sistema visual anterior (`hc-card`, `hc-btn`, clases legacy) |
| Modelo | Tarjeta compacta: foto 1:1, favorito, nombre a 2 líneas, vendedor, precio, botón Agregar de 32px | Tarjeta alta: imagen, marca, nombre, precio, stock, línea de envío, botón "Agregar al pedido" ancho completo |
| Animación | Ninguna | `framer-motion`: entrada escalonada y elevación al pasar el cursor |
| Clic en la tarjeta | Enlaces en foto y nombre | Toda la tarjeta navega a la ficha |

## Qué hace cada uno (responsabilidades)

| Responsabilidad | Nuevo | Antiguo | En Figma (`5:23`, `26:722`) |
| --- | --- | --- | --- |
| Foto 1:1 y favorito | Sí | Sí | Sí |
| Badge "Quedan N" (stock ≤ 5) | Sí | No (punto de color + texto de stock) | Sí |
| Badge "Hecho a pedido" (producto personalizado) | **No** | No | **Sí** (frame `26:722`, taza personalizada) |
| Nombre a 2 líneas y vendedor | Sí | Nombre sí; vendedor no | Sí |
| Precio (`textoPrecioProducto`) | Sí | Sí | Sí |
| Precio de lista tachado + badge "Oferta" | No | Sí (`tieneOfertaActiva`) | **No aparece** |
| Etiqueta roja `hotTag` ("HOT") | No | Sí | **No aparece** |
| Pastilla de marca (`marcaNombre`) | No | Sí | No |
| Condición (NUEVO / COMO_NUEVO) | No | Sí, sobre la imagen | No |
| Punto y texto de stock | No | Sí | No (lo reemplaza "Quedan N") |
| Línea "Envío a todo Costa Rica" | No | Sí | No |
| Producto a cotizar | Abre la ficha (`useAgregarAlPedido`) | Abre la ficha; el botón dice "Personalizar" | Abre la ficha |
| Agotado | Sí: precio → "Agotado", botón deshabilitado | Sí | Figma `44:1917` (ficha); tarjeta sin definir |
| Quick view (`onQuickView`) | No | **El componente lo ignora.** Solo el wrapper de tipos lo declara | No |
| Retroalimentación al agregar | Toast | Toast + botón "Agregado" 1,5 s | Toast (hoja `45:1607`) |

## Quién usa cada uno

**Nuevo** (`comprador/ProductCard`): `HomePage`, `catalogo/SinResultados`, `producto/ProductAgotado`.

**Antiguo** (`ui/ProductCard`): el pedido original mencionaba 3 consumidores. Hay **4 rutas de uso**:

| Consumidor | Cómo lo usa | Pasa |
| --- | --- | --- |
| `catalogo/OfertasView` | directo | `index`, `hotTag="HOT"` |
| `catalogo/EmprendimientosRow` | directo | `index` |
| `descubri/DescubriResultados` | directo | `priority`, `index` |
| `catalogo/catalogoProductCard.ts` (wrapper de tipos) | lo usan `CatalogProductGrid`, `CategoryRow`, `ParentCategoryRow` | `priority`, `index`, `onQuickView` (ignorado) |

Existen además **otras tarjetas con nombre parecido que no son este componente** y no se tocan aquí: `AIProductCard`, `CartAssistantProductCard`, `ProductsAssistantProductCard` (resultados dentro de los asistentes de IA), `SelfCheckoutProductCard` (QR), `VisitanteProductCard` (prototipo deprecado) y `BrandProductCard` (`producto/BrandProductsRow`, carrusel "Más de la marca").

## Conclusión

**Pueden converger en el componente nuevo.** El nuevo ya cubre lo que Figma define. Lo que el antiguo hace y Figma no muestra es secundario, salvo **dos funciones reales de negocio**:

1. **Ofertas (`precioOferta`)**. No es decoración: es el precio que paga el comprador. El nuevo ya muestra `textoPrecioProducto`, que devuelve el precio de oferta, así que el importe es correcto. Lo que se pierde es el precio de lista tachado y el badge "Oferta". Figma no define cómo se ven.
2. **Sección "Ofertas HOT" del catálogo** (`OfertasView`, con `hotTag="HOT"`). Figma no la contempla: el catálogo `26:722` no tiene pestañas de Ofertas ni Emprendimientos.

Hay una **carencia del nuevo**: no muestra "Hecho a pedido", que Figma sí define.

## Estrategia de migración (gradual, propiedad de CAT)

Un solo agente (CAT) es dueño de ambos componentes hasta eliminar el antiguo. PROD, CHK y HOME solo consumen el nuevo.

| Paso | Qué | Verificación |
| --- | --- | --- |
| C0 | Extender `comprador/ProductCard` **sin romper a Home, SinResultados ni ProductAgotado**: prop opcional para la etiqueta "Hecho a pedido" (producto personalizado) y, según decisión, precio de lista tachado para ofertas. Tests de los helpers | Home sigue igual a 1440 y 390 |
| C1 | Migrar `DescubriResultados` | Captura antes/después |
| C2 | **Eliminar** `EmprendimientosRow` (decisión del usuario 2026-09-30) y su uso en `CategoryRowsView` | `grep` sin referencias, catálogo intacto |
| C3 | **Eliminar** `OfertasView` (decisión del usuario 2026-09-30) junto con las pestañas Ofertas y Emprendimientos (ver abajo) | `grep` sin referencias, typecheck, tests |
| C4 | Migrar el wrapper del catálogo: `CatalogProductGrid`, `CategoryRow`, `ParentCategoryRow`. Quitar `onQuickView` del wrapper (prop muerta) | Captura antes/después, filtros y paginación intactos |
| C5 | Borrar `ui/ProductCard.tsx`, `ui/productCard/*` y `catalogoProductCard.ts` cuando ya nadie los importe | `grep` sin resultados, typecheck, tests |

Cada paso es un commit aparte, verificable y reversible. No se elimina nada hasta C5.

## Decisiones tomadas por el usuario (2026-09-30)

| Decisión | Alcance para CAT |
| --- | --- |
| Eliminar la sección **Ofertas HOT** del catálogo | Borrar `pages/catalogo/OfertasView.tsx`, el modo `ofertas` de `CatalogViewMode` (`catalogoTipos.ts`), su filtro en `catalogoFiltros.ts`, la pestaña en `CatalogViewTabs.tsx`, el caso en `CatalogSeoHelmet.tsx` y la clave `products.seoTitleOfertas`. **No tocar** el panel admin de promociones (`/admin/ofertas`): los vendedores siguen creando promociones |
| Eliminar la pestaña **Emprendimientos** del catálogo | Borrar `EmprendimientosView.tsx`, `EmprendimientosRow.tsx` (y su uso en `CategoryRowsView`), el modo `emprendimientos` y su pestaña. **No tocar** la página pública `/emprendimientos` (la lleva STORE) |
| Resultado | `CatalogViewTabs` queda sin pestañas alternativas: CAT decide con Figma `26:722` si el componente desaparece por completo |

Riesgo a cuidar: enlaces externos o guardados con `?view=ofertas` o `?view=emprendimientos`. CAT debe hacer que caigan en la vista normal, sin 404.

## Decisiones que siguen abiertas

| # | Pregunta | Mi recomendación |
| --- | --- | --- |
| 1 | ¿Se conserva el **precio tachado y el badge "Oferta"** en la tarjeta nueva? Es una función real que Figma no dibuja | Conservarlo, discreto: precio de lista tachado pequeño junto al precio, sin alterar el tamaño de la tarjeta |
| 2 | ~~Ofertas HOT~~ **Resuelto: se elimina** | — |
| 3 | `onQuickView` no hace nada en la tarjeta hoy. ¿Se elimina el **Quick view**? | Eliminar: es código muerto y Figma no lo tiene |
| 4 | Pastilla de marca, condición, punto de stock y línea de envío: ¿se descartan? | Descartar: no están en Figma, y esa información vive en la ficha |
