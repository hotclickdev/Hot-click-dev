# Notas de conflicto — PR SEO/GEO SSR

Archivos que este PR **no** toca porque otras sesiones los tienen en curso, y lo que quedó pendiente por eso.

## Diferido a PR 585/586 (landing /para-negocios)
- `frontend/public/llms.txt` y `static/llms.txt`: describir fichas/tiendas con texto inicial. No se actualizó.
- `frontend/public/robots.txt` y `static/robots.txt`: sin cambios.
- Sitemap: no se agregó `/para-negocios` (`ProductoFeedController`).
- `application.properties`: no se agregaron claves `indexnow.*`; IndexNow se configura solo por variable de entorno.
- `SecurityAuthorizationRules`: no se tocó. El archivo `/{clave}.txt` de IndexNow lo sirve un filtro de servlet (`IndexNowKeyFilter`) que corre antes de Spring Security.
- `static/sw.js`: `pnpm build` lo regenera, pero se restauró al original. Antes de mergear hay que correr un último `pnpm build` y commitear `static/` aparte; no resolver conflictos de `static/` a mano.

## Diferido a followups-seguridad-1123
- `ProductoRepository.findParaFeed` y `findActivosVisibles` (feed Merchant y sitemap de productos) **no filtran `es_prueba`**. Propuesta: agregar `AND e.esPrueba = false` en ambas consultas JPQL.
- `ProductoRepository.findProductosDeSector` y `CategoriaRepository.findSectoresIndexables`: tampoco filtran `es_prueba`. Mitigación en este PR: `SeoPublicoService` descarta los productos de prueba de la landing de sector con `EmpresaRepository.findIdsProductosDeEmpresasPrueba`, pero el **conteo** de productos del sector aún los incluye.
- Test que documenta la laguna: `SeoPublicoServiceSectorPruebaTest.lagunaDocumentada_...` (pasa mientras la laguna exista; al arreglar los repositorios hay que invertirlo).

## Otros límites conocidos
- Las rutas SPA que no inyectan nada (p. ej. `/nosotros`, `/productos`) siguen sirviendo el index con Organization, WebSite y FAQPage de la home y el `<noscript>` de la home.
- El JSON-LD que monta el cliente en `/tienda/{slug}` (LocalBusiness) sigue saliendo tras ejecutar JS, también en tiendas de prueba; la página lleva `noindex` desde el servidor.
