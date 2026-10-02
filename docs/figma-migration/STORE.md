# STORE · Perfil del negocio, tienda con su color y directorio de emprendimientos

Rama `feat/figma/store`, puesta al día con `feat/figma/base` en `e3227842` por fast-forward (ya incluye CHK, ACC y SRV). Archivo Figma `TmxYFj2nauu10WZnZ0t6yt`. Este documento lo mantiene STORE; `INVENTORY.md` y `PROGRESS.md` resumen su estado.

Todos los veredictos son **agent verified**: los verificó el propio agente con la API simulada y fotos de color, sin QA independiente y sin backend real. **Ninguna de las 4 pantallas queda en PASS**: las cuatro tienen una decisión pendiente o una dependencia de backend (ver abajo).

## Cómo se verificó

- Capturas con Playwright (Chrome, fuentes reales Sora y Public Sans, móvil 390 y escritorio 1440) con la API simulada (`/api/tienda/casa-luna`, `/productos`, `/categorias`, `/api/convenios/publicos`) y los datos de Figma. Scripts y capturas viven fuera del repo, en el scratchpad de la sesión.
- Posiciones medidas en la app contra la metadata de cada frame (`get_metadata`) y comparación visual con `get_design_context` y la captura del frame. Tolerancia: ±1 px (el texto de Figma se mide con otra tipografía de respaldo: los chips salen 0,6 px más angostos).
- Cada pantalla se capturó, se comparó, se corrigió y se volvió a capturar. Correcciones de la segunda pasada (todas de 1 px): alto del nombre (28), alto del sello de factura (28), alto del buscador (41), borde inferior del encabezado solo en escritorio, alto de la descripción de escritorio (18), títulos de sección de escritorio (23 y 28), subtítulo de la primera fila de "Cómo comprarle" (una línea con puntos suspensivos en móvil, dos en escritorio, como Figma) y alto de la fila de retiro (56).
- No hay frames de tablet.

## Pantallas

| Frame | Pantalla | Ruta | Veredicto | Móvil | Escritorio |
| --- | --- | --- | --- | --- | --- |
| `29:922` | Perfil del negocio · móvil | `/tienda/:slug` | **PARTIAL** | medido (0 a 1 px) | n/a |
| `29:2308` | Perfil del negocio · desktop | `/tienda/:slug` | **PARTIAL** | n/a | medido (0 a 1 px debajo del header) |
| `51:2468` | G · Tienda con su color · perfil del negocio · móvil | `/tienda/:slug` | **PARTIAL** | medido: mismas posiciones que `29:922`, colores de la tienda verificados con `#134E4A` y `#0F766E` | n/a |
| `29:1159` | Directorio de emprendimientos · móvil | `/emprendimientos` | **PARTIAL** | cabecera medida (0 px); tarjetas incompletas por backend | sin frame |

Resultado: **0 PASS, 4 PARTIAL, 0 BLOCKED** (de 4 frames).

Posiciones medidas del perfil móvil (Figma contra app): portada 150; encabezado 264; logo 76 en (16,116); nombre y=204; acciones y=356; "Sobre nosotros" y=432; buscador y=583 (358x41); chips y=636; tarjetas y=681 y 296 de paso (167x280); "Cómo comprarle" y=1581; caja y=1614 (167 de alto: filas 54, 56 y 55). Escritorio: portada 220; encabezado 164; logo 120 a 19 px de la portada; lateral 320; columna de productos en x=480; buscador 320x44 en x=1000; tarjetas con paso 183; caja 197 (filas 75, 60, 60).

## Qué se implementó

- **Perfil del negocio** (`TiendaHomePage`): portada del color secundario de la tienda (con Atrás y Compartir en móvil), encabezado con logo flotante (logo de la tienda o iniciales), nombre, descripción corta, datos (categoría, "En HotClick desde sept. 2026", zona de envío), sello de factura electrónica, WhatsApp, Instagram y Compartir, "Sobre nosotros", "Productos (N)" con buscador y chips de categoría, grilla de tarjetas 167x280 y "Cómo comprarle". Escritorio: dos columnas (lateral de 320 y productos).
- **Tienda con su color**: el mismo componente. `--t-secondary` pinta portada y logo; `--t-accent` pinta WhatsApp, chip activo, íconos de "Cómo comprarle" y barra inferior. El rojo de "Agregar" sigue `--t-primary` (rojo por defecto).
- **Tarjeta de producto de la tienda** (`TiendaProductoCard`): la geometría de `comprador/ProductCard` (foto 1:1, favorito, nombre, vendedor, precio y botón cuadrado "+") pero con el pedido aislado de la tienda. Los productos a cotizar abren su ficha; el favorito usa `wishlistStore`.
- **Directorio**: barra propia con atrás y título, descripción, buscador, conteo y tarjetas en lista (logo o iniciales, nombre, descripción, chevron y pie "Sitio externo" / "Ver productos"). Sin barra inferior, como el frame.

## Diferencias que quedan, por pantalla

- **Perfil móvil `29:922` y color `51:2468` (PARTIAL por decisión pendiente):** la barra inferior de la tienda ("Catálogo", "Pedido", "HotClick") y el botón de WhatsApp flotante (solo escritorio) no están en Figma, pero se conservan: la barra es la única entrada móvil al pedido aislado de la tienda. Si se quitan, el comprador móvil pierde acceso a su pedido. El frame tampoco dibuja la barra. Decisión del usuario: ver "Decisiones abiertas".
- **Perfil escritorio `29:2308` (PARTIAL por decisión pendiente):** Figma dibuja el header del marketplace (HotClick, buscador híbrido, Ingresar, favoritos, carrito con "2", categorías). La app conserva el header de la tienda (color secundario, "Marketplace", carrito del pedido aislado). Cambiarlo mezclaría dos carritos: las tarjetas suman al pedido de la tienda y el header mostraría el carrito global.
- **Textos fijos de "Cómo comprarle":** "Desde ₡4.000 con Correos de Costa Rica o por encomienda" y "Según la política de HotClick" son copy de Figma, no datos del backend (la tarifa coincide con `enviosData`). El horario de retiro muestra solo "9:00 a 18:00": el backend no manda los días ("Lunes a sábado" no se inventó).
- **Chevron de "Cómo comprarle":** Figma lo dibuja en envío y retiro. Envío abre `/envios`; retiro abre Google Maps con la dirección (solo si hay dirección; si no, sin chevron). Devoluciones no lo trae y no enlaza.
- **Etiquetas de diseño no renderizadas:** "SI inscritoHacienda" y "SI permiteRetiro" son anotaciones para el equipo (el sello y la fila de retiro ya aparecen condicionados por `facturaElectronica` y `retiro`).
- **Portada:** Figma pone la foto debajo de un rectángulo opaco del color de la tienda: queda un color plano. No se muestra `ogImagenUrl`.
- **Directorio `29:1159` (PARTIAL por backend):** `GET /api/convenios/publicos` solo devuelve nombre, logo, descripción y sitio. Faltan para el diseño: **ciudad** (el propio frame lo anota: "la ciudad sale de la bodega del negocio"), **categoría** para los chips (Todos, Hogar, Accesorios…), **tres fotos de productos**, **conteo de productos** y el **slug** para "Ver tienda" → `/tienda/:slug`. Por eso la tarjeta muestra la descripción, "Sitio externo" y "Ver productos", y no hay chips ni miniaturas. El directorio real necesita un endpoint nuevo (backend) que liste empresas públicas.
- **Directorio, "Ver productos":** enlaza a `RUTA_CATALOGO_EMPRENDIMIENTOS` (`/productos?vista=emprendimientos`); CAT eliminó la pestaña Emprendimientos del catálogo, así que abre el catálogo general. Se deja como estaba hasta tener el slug.
- **Directorio, escritorio:** sin frame; es la misma columna centrada de 720 px.
- **Nota de ejemplo** ("Zonas de ejemplo: la ciudad sale de la bodega del negocio.") es una anotación y no se renderiza.

## Reverificación contra Figma (1-oct-2026)

Se recapturaron las 4 pantallas con `tests/store-capturas.spec.ts` (solo corre con `STORE_SHOTS=<carpeta>`; perfil móvil y de escritorio, tienda con su color y directorio) y se compararon lado a lado con los frames. La composición coincide: portada, encabezado, datos, acciones, buscador, chips, grilla de tarjetas de 167x280 con el botón "+", "Cómo comprarle" y el directorio (barra, descripción y buscador). Lo que difiere es de datos de ejemplo, backend o decisiones ya documentadas (barra inferior y header del perfil de escritorio, directorio sin ciudad, categorías ni fotos, anotaciones de diseño sin renderizar). Se conservan sin cambios la búsqueda con Enter, el botón "+" y el pedido aislado.

Un defecto real corregido: `TiendaAnfitrion` pintaba "Tienda de Casa Luna 506en HotClick" en el header de la tienda (escritorio): el espacio inicial de un ítem flex se colapsa. Ahora usa `&nbsp;`; `tienda-theme.spec.ts:159` (que lee el código fuente) se actualizó a la nueva cadena.

Los cuatro frames conservan su veredicto (4 PARTIAL).

## P01 · implementación de STORE (2-oct-2026)

Bloque de implementación sobre `feat/figma/base`. Figma: no hubo acceso directo en esta sesión (sin token ni MCP utilizable desde la terminal). Las medidas de referencia son las de este documento, tomadas antes con `get_metadata` y `get_design_context`. No se inventó ninguna medida.

### Decisiones

D01 (barra inferior), D20 (WhatsApp del vendedor) y D02 (header de escritorio) siguen sin respuesta. El commit `652fa8ee` («resolve store design decisions») y `B19-CIERRE.md` las dejan como DECISIÓN HUMANA (lista D). No se quitó ni se reemplazó ningún control.

Qué falta para cerrarlas:

- **D01** (`29:922`, `51:2468`): elegir entre mantener `TiendaBottomNav` en móvil o quitarla. Si se quita, hace falta el frame de la entrada al pedido aislado en la portada; `29:922` no la dibuja.
- **D20** (`51:2468`): decidir si se quedan `TiendaWhatsAppFab` (solo escritorio) y el botón «WhatsApp» del encabezado móvil. Ningún frame del perfil los dibuja.
- **D02** (`29:2308`): elegir entre el header del marketplace (carrito global `cartStore`) y el header de la tienda (pedido aislado `tiendaStore`). Si gana el del marketplace, hay que definir cómo conviven los dos carritos y el checkout de la tienda.

### Implementado

- Tokens de SHELL en lugar de valores sueltos, con el mismo color medido: chevrones de «Cómo comprarle» y del directorio con `text-hc-n-400` (`#9AA1AE`), sello de factura con `bg-hc-success-bg` (`#E9F7F0`).
- `store-capturas.spec.ts` usaba `sitioWeb` en los convenios. El backend (`Convenio.urlWeb`) y `ConvenioCard` usan `urlWeb`, así que las capturas no mostraban «Sitio externo». Ya está corregido.
- `store-perfil.spec.ts` suma 3 casos: perfil a 390 y 1440 (sin desborde horizontal, buscador a 14 px, sin errores de consola) y directorio a 390 (sin desborde, buscador a 14 px).

### Remedición (Playwright, Chrome, API simulada con los datos de Figma)

- Perfil a 390: nombre y=204, «Sobre nosotros» y=432, buscador 358x41 en y=583, tarjetas 167x280 desde y=681 con paso de 296, «Cómo comprarle» y=1581. Todo igual a lo medido antes contra `29:922` (0 px). Con el color de `51:2468` las posiciones son las mismas; `--t-secondary` y `--t-accent` se aplican.
- Perfil a 1440: lateral 320 en x=120, productos en x=480, buscador 320x44 en x=1000, tarjetas con paso de 183. Igual a `29:2308` debajo del header.
- Directorio a 390 y 1440: sin desborde.
- `scrollWidth` igual a `clientWidth` en las 6 vistas medidas, contando `/tienda/:slug/carrito` a 390. Sin errores de consola.
- Dependencia SHELL cerrada: los buscadores de la tienda y del directorio ya miden 14 px en móvil, como Figma. La regla de 16 px excluye `.hc-tenant-theme` y `.hc-figma-ui`. También existen ya los alias `--color-hc-n-400` y `--color-hc-success-bg`.

### Sin cambio, sigue bloqueado

- Directorio `29:1159`: el backend no tiene un endpoint de empresas públicas. Solo existe `GET /api/convenios/publicos` (nombre, logo, descripción, `urlWeb`). Faltan ciudad, categoría, tres fotos, conteo de productos y slug. Es backend (P11).
- Días del retiro («Lunes a sábado»): `StorefrontInfoMapper.retiroEnTienda` solo manda las horas de apertura y cierre. Es backend (P11).
- `ogImagenUrl` no se muestra en la portada: Figma tapa la foto con el color de la tienda.

Veredicto: las 4 filas siguen PARTIAL. Contador global: 37 PASS / 53 PARTIAL.

## Funcionalidad preservada

- Información de la tienda, tema por vendedor, SEO y JSON-LD (`TiendaLayout` sin cambios salvo ocultar el header en el perfil móvil), pedido aislado por tienda (`tiendaStore`, no toca `cartStore`), búsqueda y filtro por categoría contra `/api/tienda/:slug/productos` (`q`, `categoriaId`), paginación, estados de catálogo nuevo, búsqueda sin resultados, error con reintento y esqueleto, WhatsApp del vendedor con mensaje, Instagram, "Personalizar" para productos cotizables, y subrutas de producto, carrito y checkout intactas.
- Directorio: la misma lista pública de convenios, filtro por nombre y descripción, enlace al sitio externo (con `rel` y aviso de pestaña nueva), enlace a productos y estado vacío "Próximamente" con "Emprender en HotClick".
- Compartir es nuevo en comportamiento (Figma lo pide): usa la hoja del sistema si existe y, si no, copia el enlace con un aviso.

## Cambios de comportamiento deliberados

1. **Buscador**: Figma no dibuja el botón "Buscar": el campo ("Buscar en <tienda>") se envía con Enter. Antes había un botón.
2. **Chip "Todos"** pasa a "Todo" (Figma) y pierde el ícono de embudo; el ícono de la tarjeta "Agregar al pedido" pasa a un botón "+" (nombre accesible: "Agregar al pedido: <producto>"; "Agregado al pedido: <producto>" tras agregar, con el check del Figma).
3. **Hero del directorio**: se quitaron los botones "Emprender en HotClick" y "Crear mi negocio" del encabezado (no están en Figma). El acceso sigue en el header, el pie y el estado vacío del directorio.
4. **Tagline y descripción**: la tagline pasa al encabezado; el bloque "Sobre nosotros" muestra solo la descripción. Ya no se muestran el sello de categoría como pastilla ni "Retiro en tienda disponible" con dirección completa dentro de la descripción: ahora salen en los datos y en "Cómo comprarle".
5. **Cuando la tienda no tiene catálogo**, el título dice "Productos" (sin "(0)") y "Esta tienda está empezando" pasa de `h1` a `h2` (el `h1` es ahora el nombre de la tienda).

## Defectos previos encontrados y corregidos

1. **El header de la tienda era invisible en escritorio.** Una regla global de `index.css` (SHELL) pinta toda etiqueta `header` con `bg-surface !important`: sobre el fondo blanco el texto blanco del nombre y del "Marketplace" no se veía. `TiendaHeader` pasa a `div role="banner"`.

## Dependencias hacia otros módulos

- **Backend:** endpoint de empresas públicas para el directorio (slug, ciudad de la bodega, categoría, fotos y conteo de productos); días de atención del retiro.
- **SHELL (`index.css`):** (1) la regla de `header`/`aside`/`footer` con `!important` obliga a usar `div` para bloques con fondo propio; (2) los inputs móviles se fuerzan a 16 px; Figma pide 14 (el buscador de la tienda y el del directorio miden 16 en móvil, 14 en escritorio; la altura de 41 se mantiene); (3) falta el alias `--color-hc-n-400` (se usa `var(--hc-n-400)`) y `--color-hc-success-bg` (se usa `bg-hc-green-50`).
- **CAT:** `ProductCard` global no se reutiliza: suma al carrito global y enlaza a `/productos/:id`. La tarjeta de la tienda replica su geometría. Si CAT cambia la tarjeta, hay que replicarlo.
- **SYS:** el botón de WhatsApp flotante de la tienda (`TiendaWhatsAppFab`, solo escritorio) y el botón con isotipo no están en Figma.

## Decisiones abiertas (pasar al usuario)

1. **Barra inferior de la tienda en el perfil móvil** (`TiendaBottomNav`): Figma no la dibuja; se conservó por el acceso al pedido aislado. Si se aprueba quitarla, el acceso al pedido debería moverse a la portada (ícono de pedido junto a Compartir), que Figma no dibuja.
2. **Header del perfil en escritorio**: Figma usa el del marketplace con el carrito global; la app usa el de la tienda con el pedido aislado. Resolverlo implica decidir si el perfil usa el carrito global (checkout multivendedor) y no el pedido aislado.
3. **Directorio**: aprobar el endpoint nuevo de backend para llegar al diseño completo (hoy solo hay convenios).

## Excepciones de ownership

- `tests/tienda-theme.spec.ts` y `tests/tienda-vacia.spec.ts` (specs de STORE) se actualizaron a los cambios de arriba: `getByRole('banner')` en vez de `header`, el anfitrión se prueba en `/tienda/demo/carrito` (el perfil móvil ya no tiene header) y el buscador se envía con Enter.
- Reutilización sin editar: `IconoFigma` (SHELL), `ICONOS_COMPRADOR.favorito/agregar/agregadoCheck` (SHELL), `wishlistStore`, `useToast`, `MainLayout` variante `propia` (SHELL).
- Íconos nuevos en `assets/figma/tienda/` con registro propio `pages/tienda/iconosTienda.ts` (no en `iconosComprador.ts`), descargados del Figma sin redibujar.
- No se tocaron `AppRoutes.tsx`, `index.css`, `MainLayout`, `static/`, `package.json` ni i18n (los textos de la tienda ya estaban en español dentro del código). `ROUTES_REQUESTED.md` no cambia.

## Código eliminado

`TiendaSobreNosotros` (reemplazado por `TiendaEncabezadoNegocio` y la sección "Sobre nosotros" de `TiendaHomePage`) y `EmprendimientosHero` (el encabezado vive en `EmprendimientosPage`).

## Pruebas

- `tsc --noEmit` limpio (los tres tsconfig). Vitest: 97 archivos y 477 tests en verde (la base tenía 96 y 469): nuevo `tiendaHelpers.test.ts` (8).
- eslint: los 4 hallazgos que quedan en `src/pages/tienda` ya existían en `base` (`TiendaHomePage` efecto de carga inicial, `TiendaLayout:45` y `TiendaProductoPage:22`, regla `set-state-in-effect`); ninguno nuevo. `vite build` OK en carpeta temporal; `static/` intacto.
- E2E (`tests/store-perfil.spec.ts`, 6 casos): perfil móvil (portada, datos, acciones, retiro, header oculto), escritorio (header y tarjetas), agregar al pedido y subruta con header, buscador y categoría contra la API, directorio con filtro y estado vacío. Pasan también `tienda-vacia`, `tienda-no-disponible`, `tienda-pdp-comprar`, `sistema-tienda-publica`, `sistema-marca`, `fase0-prefijos` y `tienda-theme` (salvo lo de abajo).
- **Fallos previos, fuera de STORE, sin tocar:** `tienda-checkout.spec.ts:77` (lee el código de `TiendaCheckoutPage`, que STORE no cambió), `tienda-theme.spec.ts:115` (la última aserción mira el carrito global `/carrito`, de CHK) y `convenios-marquee.spec.ts` (Home). Los tres fallan igual en `base` `e3227842`.
