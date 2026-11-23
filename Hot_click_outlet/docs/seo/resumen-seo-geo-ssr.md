# SEO/GEO — HTML inicial de fichas, tiendas y landings

Rama `feat/seo-geo-ssr`. Sin commit, push, PR ni deploy.

## Qué cambió
- **Ficha `/productos/{id}`**: el HTML inicial trae title, description, canonical, Open Graph, `hreflang` es-CR/x-default con la URL de la ficha, JSON-LD `Product` + `Offer` (price, `CRC`, InStock/OutOfStock según stock disponible, url) + `BreadcrumbList` (Inicio > Productos > nombre), y texto visible (h1, descripción corta, precio en colones, disponibilidad). Marca: la del producto o, si no hay, el nombre de la tienda. `aggregateRating` solo con reseñas aprobadas, dentro del mismo nodo `Product`.
- **Tienda `/tienda/{slug}`**: `OnlineStore` (nombre, url, imagen, descripción, `areaServed` Costa Rica; sin dirección) + `BreadcrumbList`, y h1 + párrafo visibles.
- **Landings de planes** (`/emprende`, `/para-pymes`, `/negocio-plus-plan`, `/planes`): `WebPage` + `BreadcrumbList`, h1 y párrafo propios. Servicios, sectores, provincias y blog: texto visible y hreflang propios.
- **Home**: sin cambios de contenido (Organization+OnlineStore, WebSite, FAQPage). Esos tres bloques ahora van entre `HC_HOME_LD_START/END` y el servidor los quita de toda página inyectada (fichas, tiendas, landings, sectores…). El `<noscript>` de la home va entre `HC_SEO_BODY_START/END` y se reemplaza por el texto de cada página.
- **hreflang**: pasó de fuera del bloque a dentro de `HC_SEO_BLOCK`; en cada página inyectada es-CR y x-default son su propia URL canónica. No hay `/en` ni `/pt`. Las páginas noindex no llevan hreflang.
- **Escape**: `escJson` ahora escapa `<`, `>`, `&`, U+2028/2029, saltos y control (un `</script>` del vendedor no cierra el bloque); `xa` escapa también `>` y saltos. Siguen usando `ContactoTextoPublico` en título, descripción, marca y tagline.
- **es_prueba**: tienda o ficha de un negocio de prueba pedida por URL → `noindex, nofollow`, sin JSON-LD, sin hreflang y sin nombre del negocio. La landing de sector descarta sus productos (`EmpresaRepository.findIdsProductosDeEmpresasPrueba`).
- **Content-Language**: `es-CR` en todas las respuestas HTML inyectadas por `SpaController`.
- **Cliente**: `ProductDetailSeo` y `TiendaLayout` quitan el JSON-LD del servidor (`data-hc-ssr`) al montar el suyo, para no duplicar Product/OnlineStore.
- **IndexNow** (`com.hotclick.seo.indexnow`): `IndexNowService` avisa a `https://api.indexnow.org/indexnow` al crear/actualizar/borrar producto (`ProductoService`) y artículo (`BlogController`), tras el commit y en un hilo aparte; sin clave es no-op. `IndexNowKeyFilter` sirve `/{clave}.txt` solo si hay clave.

## Archivos
- Java: `controller/SpaController`, `controller/spa/SpaSeoSupport`, `controller/BlogController`, `service/ProductoService`, `seo/SeoPublicoService`, `repository/EmpresaRepository`, `seo/indexnow/IndexNowService`, `seo/indexnow/IndexNowKeyFilter`.
- Frontend: `index.html`, `pages/producto/ProductDetailSeo.tsx`, `pages/tienda/TiendaLayout.tsx`, `components/seo/QuitarJsonLdServidor.tsx`, `utils/quitarJsonLdServidor.ts`, y `static/` regenerado con `pnpm build` (commit aparte; `sw.js` restaurado, ver notas).
- Docs: `checklist-buscadores.md`, `notas-conflicto-pr-seo-geo.md`, este resumen.

## Tests
Nuevos: `SpaSeoHtmlInicialTest` (ficha, tienda, XSS, es_prueba, landing sin FAQ, 404 de producto), `IndexNowServiceTest` (sin clave no hay red; con clave de prueba y servidor local envía la URL; filtro del .txt), `SeoPublicoServiceSectorPruebaTest` (filtro de sector + laguna documentada).
Corridos y en verde (67 tests): `Spa*`, `SeoPublicoService*`, `SeoSlugsTest`, `IndexNow*`, feed/sitemap existentes, `ProductoService*`, `SecurityAuthorizationRules*`. `pnpm typecheck` y `pnpm build` OK. `pnpm lint` global ya falla en el repo (203 errores previos, sobre todo en `tests/`); en los archivos tocados solo queda un error previo de `TiendaLayout` (`set-state-in-effect` en `cargarInfo`).

## Aplazado
Ver `notas-conflicto-pr-seo-geo.md`: llms.txt/robots.txt, `/para-negocios` en sitemap y `application.properties` (586); exclusión de `es_prueba` en feed Merchant y sitemap de productos (`ProductoRepository`, followups-seguridad-1123).

## Configurar IndexNow
1. Generar una clave propia (8–128 caracteres: letras, números, guion). No commitearla.
2. En el `.env` del servidor: `INDEXNOW_KEY=<clave>` (o `INDEXNOW_KEY_FILE=/ruta/fuera/de/git` con la clave en el archivo). Opcional: `INDEXNOW_ENDPOINT` (por defecto `https://api.indexnow.org/indexnow`).
3. Reiniciar la app y comprobar que `https://hotclick.lat/<clave>.txt` devuelve la clave.
4. Sin clave: todo queda apagado y `/<clave>.txt` responde como cualquier otra ruta.
