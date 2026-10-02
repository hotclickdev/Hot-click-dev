# CAT · pasos C1 a C5 y pantallas del agente (2026-09-30)

Rutas relativas a `Hot_click_outlet/frontend/src/`. Rama `feat/figma/cat` (desde `feat/figma/base` `1c87c9d3`). Capturas y scripts de QA fuera del repo (`%TEMP%\cat-qa`).

## Decisión: columnas fijas de 167

Evidencia (Figma `TmxYFj2nauu10WZnZ0t6yt`):

- Las 113 instancias de `ProductCard` del archivo miden 167x280, también en desktop (catálogo `30:1824`).
- Desktop `30:1963`: la grilla es un `flex-wrap` con `gap` 20 entre filas y 16 entre columnas, tarjetas de 167 alineadas a la izquierda (x = 0, 183, 366, 549 dentro de 908 px).
- Móvil `26:761`, `43:1576`, `27:849`: dos tarjetas de 167 repartidas en 358 (x = 0 y 191), 12 px entre filas.
- Home ya usa pistas de 167 (`repeat(n, minmax(0,167px))`).

Implementación: `pages/catalogo/catalogoGrilla.ts` (`CLASE_GRILLA_TARJETAS`): móvil 2 columnas `minmax(0,167px)` con `justify-between` y 12 px entre filas; desde `sm`, `repeat(auto-fill, 167px)` alineado a la izquierda con 16 px entre columnas y 20 entre filas. A 1440 caben 5 tarjetas en los 908 px de resultados. Lo usan el catálogo, las filas por categoría, `SinResultados`, Descubrí (resultados) y Categorías.

## C1 a C5

| Paso | Hecho |
| --- | --- |
| C1 | `descubri/DescubriResultados` usa `comprador/ProductCard` (167x280 a 1440 y 390) |
| C2 | Se borran `EmprendimientosView`, `EmprendimientosRow`, `EmpCard` y el uso en `CategoryRowsView`; fuera el modo `emprendimientos`, el filtro por convenios y la carga de convenios del catálogo |
| C3 | Se borran `OfertasView` y `CatalogViewTabs`; fuera el tipo `CatalogViewMode`, `viewMode` de los hooks, el SEO por modo y 17 claves `products.*`. `?vista=ofertas` y `?vista=emprendimientos` caen en la vista normal (el parámetro ya no se lee). El panel admin de promociones y `/emprendimientos` no se tocaron |
| C4 | `CatalogProductGrid`, `CategoryRow`, `ParentCategoryRow` migrados a la tarjeta nueva; tarjeta "ver más" de 167x280 (`VerMasTarjeta`). Quick view fuera: `QuickViewModal`, `ui/quickView/*`, namespace `quickView`, evento `vista_rapida` de `utils/analytics.ts` |
| C5 | Borrados `ui/ProductCard.tsx`, `ui/productCard/*` y `pages/catalogo/catalogoProductCard.ts` (grep sin referencias) |

Otros borrados del catálogo anterior (sustituidos por la estructura de Figma): `CatalogHero`, `CatalogFilterBar`, `CategorySidebar`, `CatalogMobileSidebar`, `SubcategoryGrid`, `BrandShowcase`, `ActiveFilterChips` (con ello desaparece el `toLocaleString()` sin locale), `CartMiniBar`, `CatalogAiFab`, `DescubriHeader`.

## Pantallas (medidas Figma vs app, 390 y 1440, fuentes reales)

| Frame | Veredicto | Evidencia |
| --- | --- | --- |
| `26:722` Resultados · móvil | PASS (con datos de prueba) | Encabezado 116; buscador 326x46 en (48,12); cámara 34 en (334,18); "Entendí:" (16,79,5); barra de resultados y=130; tarjetas y=158 y 167x280; asistente 358x73 en y=450. `MainLayout variante="propia"` |
| `43:1530` Categoría abierta · móvil | PASS | Título (48,12); buscador 358x42 en (16,49); chips y=104 y anchos 59/124/121; tarjetas y=189 |
| `30:1824` Catálogo · desktop | PASS | Título (120,135); chips y=204; columna de filtros (120,255) 260 px; tarjetas desde (412,255) con paso 183; "Búsquedas relacionadas" y=636 |
| `26:887` Filtros · hoja | PASS | Cajas de precio 50 de alto; secciones de 135; pie 82; rango de 20 con dos tiradores. Hoja propia (`HojaFiltros`) porque `HojaInferior` (CHK) lleva agarradera y padding lateral |
| `27:804` Sin resultados | PASS en estructura y medidas | Icono 64 (lupa con × de Figma), título y=167, botones y=351 y 540, "Mientras tanto" y=632. Copy: se conserva el texto neutro de género |
| `27:882` Búsqueda por foto | PARTIAL | Barra interna, icono de galería, tienda y rótulo "Misma categoría". Falta la etiqueta "NUEVO · por programar" (anotación de diseño, no copy) |
| `27:939` Descubrí | PASS | Cartas (61,87.7), (22.3,123), (40,135); botones en x=101/185/253, y=619; pie y=677. Incluye "Deshacer la última" (nuevo) y contador mono en la barra |
| `43:1454` Categorías | PASS | Barra propia con título y buscador, chip del asistente, tiles 167 |
| `8:163` Búsqueda activa | PASS en estructura | Campo 330x42 en (44,12); asistente en y=70; filas de 64; "Ver los N resultados"; foto 57. Las sugerencias dependen de datos (hoy salen de nombres de producto) |
| `8:230` Asistente · respuesta | PARTIAL | Hoja inferior (arriba a 82), encabezado, burbuja azul, productos en fila con Agregar, chips, barra gris. Falta la fila "Entendí:" (el backend no manda filtros interpretados) |

## Decisiones

- **"Con stock" en los filtros rápidos (`43:1541`) no se agrega:** el catálogo ya filtra por stock por defecto (`filterStock='ok'`) y mostrarlo como chip dejaría "Todo" y "Con stock" a la vez activos. El filtro sigue en la hoja y en la columna. Si se prefiere el chip, hay que decidir el valor por defecto.
- **Chip de la búsqueda:** no se muestra (Figma la pone en el buscador y en el título); "Limpiar" (desktop) la quita junto con los filtros.
- **Marcas:** la sección "Compra por marca" ya no está (no existe en Figma). El filtro `?marcaId=` sigue funcionando y se ve como chip "Entendí".
- **Quedan sin UI de edición** `filterCond` y `filterTalla` (nadie los fijaba; solo se podían quitar desde `ActiveFilterChips`).
- **Tamaño de texto de inputs en móvil:** la regla global de `index.css` fuerza 16 px en inputs (evita el zoom de iOS), pero excluye `.hc-figma-ui` (raíz de `MainLayout`). Remedido en P10 (2-oct-2026) a 390: el buscador de `/productos` mide 14 px y el campo de `/productos?search=` 15 px; ningún campo de Home ni del catálogo mide 16. El alto se fija con `leading-[Npx]` para que las cajas midan lo de Figma.
- **Acciones de Descubrí:** el grupo va 12 px a la derecha del centro, como en Figma (`left-[101px]`).
- **Descubrí, "3 de 10":** el contador es `elecciones / min(8, mazo)` (`SWIPES_PARA_REVELAR`); el texto del pie usa el mismo total.
- **Asistente:** se conserva el icono de WhatsApp dentro de la barra y el botón de borrar la conversación (funciones del código actual que Figma no dibuja).
- **Copy de ejemplo de Figma** que depende del término buscado ("Para tu sala", "Pedirla", "la querés") no se copia: el texto del código es neutro.

## Dependencias para otros agentes

- **SHELL:** `MainLayout` manda "buscar con foto" a `/servicios` (`RUTA_BUSCAR_CON_FOTO`) aunque la ruta `/buscar/foto` ya existe. El header de desktop no muestra la búsqueda actual (`?search=`) en su campo (Figma `30:1824` sí). La barra inferior marca "Buscar" en `/productos?cat=` y Figma `43:1530` marca "Categorías". El título de `BarraInterna` es un `<p>`: las pantallas internas necesitan un `h1` (se añadió uno oculto en Descubrí y Búsqueda por foto).
- **CHK:** se editó una línea de `codigoDescuento.test.ts` en C0 (ya reportado). `HojaInferior` no se usa en CAT.
- **PROD:** `tests/pdp-comprar-ahora.spec.ts` perdió el bloque que leía `QuickViewModal.tsx` (archivo borrado). Sigue fallando una aserción de ese spec sobre `ProductDetail` (`addItem({ ...normalizeProduct(product), tallaSeleccionada }...`), anterior a este trabajo.
- **Tests e2e de otros agentes que ya fallaban:** `ui-sin-emoji.spec.ts` (archivos que ya no existen: `AdminConvenios`, `NavbarMobileCategorias`, `ShippingSection` de home, `navbarIcons`) y `nav-categorias.spec.ts` (botón "Menú" del header anterior); `catalogo-iconos.spec.ts` ("Ver más": las filas por categoría solo se ven sin filtros y el stock se filtra por defecto).
- **`utils/gustos.ts`:** se añadió `restaurarGustos` (deshacer en Descubrí).

## Texto propuesto

- **STRATEGY:** pasos C1 a C5 hechos. Columnas fijas de 167 en el catálogo (evidencia en este documento). `ui/ProductCard`, `ui/productCard/*` y `catalogoProductCard.ts` eliminados.
- **INVENTORY:** `8:163` PASS, `8:230` PARTIAL (falta "Entendí:" por el backend), `26:722` PASS, `26:887` PASS, `27:804` PASS, `27:882` PARTIAL (etiqueta "NUEVO · por programar" es anotación), `27:939` PASS, `30:1824` PASS, `43:1454` PASS, `43:1530` PASS.
- **PROGRESS:** CAT cerró C1 a C5 y las diez pantallas; pendientes de otros: SHELL (foto, búsqueda en el header, barra inferior, h1), backend del asistente (filtros interpretados).

## P10 HOME/CATÁLOGO (2-oct-2026)

- **Tokens:** `Casilla` pasa de `border-[var(--hc-n-400)]` a `border-hc-n-400` y la insignia "Oferta" de `comprador/ProductCard` (Home y catálogo) de `bg-[var(--hc-red-50)]` a `bg-hc-red-50`. El color resuelto no cambia (n/400 = rgb(154, 161, 174), red/50 = rgb(254, 242, 241)).
- **Revisión:** los demás archivos con frame de Home y catálogo (`HomePage`, `home/compra/*`, `searchPanel/*`, `SearchPanel`, `FiltrosPanel`, `EncabezadoCatalogoMovil`, `SinResultados`, `BusquedaFotoPage`, `CategoriasPage`, `Chip`, `CategoryTile`) ya no tienen `var()` en clases ni `style` con tokens.
- **Medido (Chrome, API simulada):** sin desborde a 390 y 1440 en `/`, `/productos`, `/productos?search=`, `/buscar/foto`, `/buscar/categorias` y `/descubri`; todas con `.hc-figma-ui`. Campos a 390: 14 y 15 px; a 1440: buscador del header 14 px, cajas de precio 13 px.
- **Tests:** `catalogo-cta.spec.ts` suma 2 casos con `tests/helpers/medidasFigma.ts` (390 en `/`: sin desborde, sin campos de 16 px, insignia con red/50; 1440 en `/productos`: sin desborde, casilla sin marcar con borde n/400).
- **Sin cambio de veredicto:** `7:2`, `12:346` y `9:171` siguen PARTIAL (fotos reales, "Quedan N" y badge del carrito dependen de datos; orden de categorías es Figma-D21). `8:230` sigue PARTIAL ("Entendí:" depende del backend) y `27:882` PARTIAL. "Con stock" (`43:1541`) y "Deshacer" siguen como decisiones.
- **Sin frame, para P13:** estados de `CatalogProductGrid` (vacío, error, paginación, carga), `CategoryRow`, `ParentCategoryRow`, `CatalogBrandLogo`, `DescubriResultados`, `DescubriRevelacion`, `DescubriLoading` (`--hc-surface-3` sin alias), `DescubriError` y los sellos de arrastre de `DescubriCarta` siguen con `style={{ var() }}`.
