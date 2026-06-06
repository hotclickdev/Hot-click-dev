# SEO Roadmap — HOTCLICK Marketplace

> Documento de referencia para el estado actual, lo implementado y lo pendiente del SEO de HOTCLICK.
> Última actualización: junio 2026.

---

## Índice

1. [Resumen ejecutivo](#resumen-ejecutivo)
2. [Lo que ya está implementado](#lo-que-ya-está-implementado)
3. [Pendientes críticos (sin código)](#pendientes-críticos-sin-código)
4. [Pendientes técnicos (requieren código)](#pendientes-técnicos-requieren-código)
5. [Checklist de mantenimiento continuo](#checklist-de-mantenimiento-continuo)
6. [Glosario técnico](#glosario-técnico)

---

## Resumen ejecutivo

HOTCLICK es un marketplace React SPA (Single Page Application) servido por Spring Boot. El mayor desafío de SEO para una SPA es que los crawlers que no ejecutan JavaScript ven solo `<div id="root"></div>`. La estrategia implementada ataca este problema desde tres ángulos:

1. **Inyección server-side** — `SpaController.java` devuelve `<title>`, `<meta description>`, Open Graph y Twitter Cards específicos por producto y artículo de blog antes de que corra el JavaScript.
2. **Schema.org estructurado** — Datos estructurados en JSON-LD que permiten a Google mostrar rich snippets (precios, estrellas, breadcrumbs, FAQ, envío, devolución).
3. **Sitemap dinámico** — `/sitemap.xml` generado en tiempo real desde la base de datos con todas las URLs de productos, categorías y blog.

---

## Lo que ya está implementado

### Infraestructura técnica

| Componente | Archivo | Descripción |
|-----------|---------|-------------|
| Meta tags server-side por producto | `SpaController.java` | `/productos/{id}` consulta la BD y sirve title/description/og/twitter únicos por producto antes de que corra JS |
| Meta tags server-side por blog | `SpaController.java` | `/blog/{slug}` idem para artículos del blog |
| Marcadores de bloque SEO | `frontend/index.html` | `<!-- HC_SEO_BLOCK_START/END -->` delimitan el bloque que `SpaController` reemplaza por URL |
| Sitemap dinámico | `ProductoFeedController.java` → `/sitemap.xml` | Incluye productos, categorías, páginas estáticas, blog; con `<lastmod>` real y extensión de imagen de Google |
| Feed Google Shopping | `ProductoFeedController.java` → `/api/public/feed/shopping.xml` | RSS de productos activos con stock para Google Merchant Center |
| robots.txt | `frontend/public/robots.txt` | Disallows para admin, checkout, carrito, mis-pedidos, API; Allows para catálogo y blog |

### Metadatos y Open Graph

| Elemento | Cobertura |
|---------|-----------|
| `<title>` único | Todas las páginas (homepage, productos, catálogo, blog, artículos) |
| `<meta description>` único | Todas las páginas |
| `<link rel="canonical">` | Todas las páginas |
| Open Graph (og:title, og:description, og:image, og:url, og:type) | Todas las páginas |
| Twitter Cards (summary_large_image) | Todas las páginas |
| `<meta name="robots">` | Index/follow por defecto; noindex en vistas con filtros combinados |
| hreflang (es-CR, es, en, x-default) | Homepage en `index.html` |
| Geo tags (geo.region, geo.placename) | Pendiente — ver sección de pendientes |

### Schema.org / Datos estructurados

| Schema | Página | Descripción |
|--------|--------|-------------|
| `Organization + OnlineStore` | Homepage (`index.html`) | Nombre, logo, redes sociales, horarios, métodos de pago, área de servicio |
| `WebSite + SearchAction` | Homepage | Activa el cuadro de búsqueda de Google Sitelinks |
| `FAQPage` | Homepage | 5 preguntas frecuentes — activa rich snippets de FAQ en Google |
| `Product` | `/productos/{id}` | Precio, disponibilidad, SKU, marca, `priceValidUntil` |
| `shippingDetails` | `/productos/{id}` | Tarifa de envío, destino CR, tiempo de entrega 1–5 días — mostrado por Google |
| `hasMerchantReturnPolicy` | `/productos/{id}` | 7 días de devolución — requerido por Google Merchant Center |
| `VideoObject` | `/productos/{id}` | Cuando el producto tiene `videoUrl` — activa video rich snippets |
| `AggregateRating` | `/productos/{id}` | **Listo pero inactivo** — se activa automáticamente cuando existan reseñas en la BD |
| `BreadcrumbList` | `/productos/{id}` | Ruta de navegación — mostrada por Google en el resultado de búsqueda |
| `ItemList` | `/productos` | Top 12 productos del catálogo activo |
| `BlogPosting` | `/blog/{slug}` | Headline, datePublished, author, publisher, mainEntityOfPage |
| `Blog` | `/blog` | Listado de todos los artículos publicados |

### Frontend React

| Componente/Página | Mejora SEO |
|-------------------|-----------|
| `ProductDetailPage.jsx` | Breadcrumbs semánticos `<nav><ol><li><a>` con `aria-current="page"`; alt descriptivo con marca y país |
| `ProductsPage.jsx` | `<Helmet>` dinámico por vista (catálogo, ofertas, emprendimientos, categoría, marca); canonical fijo; ItemList JSON-LD |
| `BlogPage.jsx` | `<Helmet>` con title, description, canonical; Blog JSON-LD |
| `BlogPostPage.jsx` | Página nueva de artículo individual con BlogPosting JSON-LD, breadcrumb semántico, og:type="article" |
| `Seo.jsx` | SITE_NAME corregido de "HOTCLICK Outlet" a "HOTCLICK" |
| `HeroRotator.jsx` | SVG arrows con `aria-hidden="true"`; CTAs descriptivos |
| `HomePage.jsx` | `<h1 className="sr-only">` para crawlers; FAQPage y ItemList JSON-LD |
| `Footer.jsx` | Links sociales reales (Instagram, Facebook, TikTok) |

### Rendimiento

| Mejora | Impacto |
|--------|---------|
| Google Fonts non-blocking (`rel="preload" onload`) | Ahorra ~180ms de FCP |
| `cssMinify: true` en Vite | CSS más pequeño |
| Code splitting manual en `vite.config.js` | Chunks separados por vendor (react, motion, query, misc) |
| `fetchPriority="high"` en imágenes priority | LCP más rápido para imagen principal de producto |

---

## Pendientes críticos (sin código)

Estas 3 acciones son las de **mayor impacto** y no requieren escribir ni una línea de código.

### 1. Dominio propio (MÁXIMA PRIORIDAD)

**Problema:** `hot-click-dev-production.up.railway.app` tiene la palabra "dev" y es un subdominio de Railway. Google le asigna autoridad de dominio muy baja. Todo el SEO construido beneficia a `railway.app`, no a HOTCLICK.

**Solución:**
- Registrar `hotclick.cr` en NICR (Registro de Costa Rica) → ~$35/año
- O `hotclick.com` en Namecheap/GoDaddy → ~$15/año
- Configurar DNS en Railway apuntando el dominio propio al servidor actual
- Agregar redirección 301 del subdominio de Railway al nuevo dominio
- Actualizar `app.url` en `application.properties` y todas las URLs hardcodeadas en `index.html`

**Archivos que tienen la URL hardcodeada y deben actualizarse:**
- `Hot_click_outlet/frontend/index.html` — ~15 ocurrencias
- `Hot_click_outlet/frontend/src/utils/jsonLd.js` — `SITE_URL` constante en línea 2
- `Hot_click_outlet/frontend/src/pages/BlogPostPage.jsx` — `SITE_URL` constante
- `Hot_click_outlet/frontend/src/pages/BlogPage.jsx` — URL hardcodeada en Helmet
- `Hot_click_outlet/frontend/src/pages/ProductsPage.jsx` — `canonicalUrl` constante
- `Hot_click_outlet/frontend/public/robots.txt` — Sitemap URL
- `Hot_click_outlet/src/main/resources/application.properties` → `app.url`

**Impacto esperado:** Puede mover el ranking general 10–30 posiciones en 3 a 6 meses.

---

### 2. Google Search Console (urgente)

**Problema:** Google no sabe que el sitemap dinámico existe. Sin Search Console no hay visibilidad sobre qué páginas están indexadas.

**Pasos:**
1. Ir a `search.google.com/search-console`
2. Agregar propiedad → "URL prefix" → escribir la URL del sitio
3. Verificar con el método "HTML tag" (pegar el meta tag en `index.html` dentro de `<head>`)
4. Una vez verificado → "Sitemaps" → ingresar `[dominio]/sitemap.xml` → Enviar
5. Revisar semanalmente: cobertura, errores de rastreo, Core Web Vitals

**Costo:** Gratuito.

---

### 3. Google Merchant Center (gratuito para listados orgánicos)

**Problema:** El feed de Shopping en `/api/public/feed/shopping.xml` existe pero nunca fue registrado en Merchant Center. Los productos no aparecen en la pestaña "Shopping" de Google.

**Pasos:**
1. Ir a `merchants.google.com` → Crear cuenta
2. Verificar y reclamar el sitio web (con el mismo método que Search Console)
3. En "Fuentes de datos" → Agregar feed → Tipo: "Archivo XML programado" → URL del feed
4. Completar configuración de envío (Costa Rica, tarifa estimada en colones)
5. Completar política de devolución (7 días según el schema ya implementado)
6. Esperar revisión de Google (3–5 días hábiles)

**Costo:** Gratuito para listados orgánicos.

**Impacto:** Productos aparecen en búsquedas de intención comercial con imagen, precio y disponibilidad.

---

### 4. Comprimir imágenes del carrusel hero

**Problema:** LCP (Largest Contentful Paint) en móvil es 5.7s. El umbral de Google es < 2.5s. La causa principal son las imágenes del carrusel hero que probablemente superan 500KB.

**Solución sin código:**
- Usar `squoosh.app` (gratis, en el navegador) para comprimir cada imagen del hero
- Objetivo: < 100KB por imagen
- Formato preferido: WebP o JPEG optimizado
- Subir las imágenes comprimidas a Supabase Storage reemplazando las existentes

**Impacto:** Puede bajar el LCP de 5.7s a < 2s, que es la mejora de Core Web Vitals más importante para el ranking.

---

## Pendientes técnicos (requieren código)

### Alta prioridad

#### A. Sistema de reseñas y calificaciones

El schema `AggregateRating` ya está implementado en `jsonLd.js` y se activará automáticamente cuando existan datos. Las **estrellitas** en Google aumentan el CTR hasta un 35%.

**Qué se necesita:**
- Nueva migración Flyway: tabla `hot_click_resena_tb` con `id_producto`, `id_usuario`, `puntuacion` (1–5), `comentario`, `fecha`
- Endpoint `POST /api/productos/{id}/resenas` (requiere auth)
- Endpoint `GET /api/productos/{id}/resenas` (público)
- Campo en `ProductoResponseDTO` con `ratingPromedio` y `totalResenas` calculados
- Componente de estrellas en `ProductDetailPage.jsx`

**Nota:** El schema en `jsonLd.js` ya tiene el bloque listo — solo necesita datos.

#### B. URLs limpias para categorías y marcas

**Qué se necesita:**
- Rutas nuevas en `SpaController.java`: `/categoria/{slug}` y `/marca/{slug}`
- Nuevos componentes: `CategoryPage.jsx` y `MarcaPage.jsx` con H1 temático, descripción y lista de productos filtrados
- Slugs en la tabla `hot_click_categoria_tb` (campo `slug` que ya puede existir)
- Actualizar `ProductoFeedController.sitemap()` para usar `/categoria/{slug}` en vez de `/productos?cat={id}`

**Impacto:** Crea 30–100 nuevas URLs indexables con contenido temático único.

#### C. hreflang en todas las páginas (no solo homepage)

**Estado actual:** hreflang solo está en `index.html` (homepage).

**Qué se necesita:** Agregar en el componente `Seo.jsx` los 4 tags `<link rel="alternate" hreflang>` con la URL canónica de cada página. También en los `<Helmet>` de `ProductDetailPage`, `ProductsPage`, `BlogPostPage`, `BlogPage`.

#### D. Geo tags en index.html

4 líneas que refuerzan la relevancia geográfica para Costa Rica:

```html
<meta name="geo.region" content="CR" />
<meta name="geo.placename" content="Costa Rica" />
<meta name="geo.position" content="9.748917;-83.753428" />
<meta name="ICBM" content="9.748917, -83.753428" />
```

Deben ir en `frontend/index.html` dentro de `<head>`, fuera del bloque `HC_SEO_BLOCK`.

#### E. OpenSearch XML para búsqueda desde barra del navegador

Un archivo `frontend/public/opensearch.xml` permite que Chrome/Firefox/Edge ofrezcan búsqueda directa en HOTCLICK desde la barra de URL.

Estructura básica del archivo:
```xml
<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>HOTCLICK</ShortName>
  <Description>Buscar productos en HOTCLICK Costa Rica</Description>
  <Url type="text/html" template="https://[dominio]/productos?search={searchTerms}"/>
  <Image width="16" height="16" type="image/svg+xml">https://[dominio]/favicon.svg</Image>
</OpenSearchDescription>
```

Y en `index.html` agregar: `<link rel="search" type="application/opensearchdescription+xml" href="/opensearch.xml" title="HOTCLICK" />`

#### F. Schema.org para páginas informativas

| Página | Schema a agregar |
|--------|-----------------|
| `/nosotros` | `AboutPage` con `description` y `author: Organization` |
| `/contacto` | `ContactPage` con `telephone`, `email`, `contactType` |
| `/servicios` | `ItemList` de objetos `Service` |

#### G. Open Graph images dinámicas por producto

**Estado actual:** Todos los productos muestran `og-image.png` genérico al compartir en WhatsApp/redes.

**Solución recomendada:** Endpoint Spring Boot `GET /api/public/og-image/{id}.png` que:
1. Obtiene el producto de la BD
2. Descarga la imagen del producto desde Supabase
3. Usa Java AWT o una librería como Thumbnailator para superponer nombre y precio
4. Devuelve la imagen generada con `Cache-Control: public, max-age=86400`

Luego en `SpaController.injectProductMeta()` usar esta URL en vez de la imagen original.

### Media prioridad

#### H. Google Business Profile

- Crear perfil en `business.google.com` con la dirección real de HOTCLICK en Costa Rica
- Categoría: "Tienda en línea" o "Marketplace"
- Agregar logo, banner, horarios, WhatsApp, sitio web
- Una vez activo: HOTCLICK aparece en Google Maps y en búsquedas locales con ficha completa

#### I. Speakable schema para Google Assistant

En `index.html` dentro del schema del FAQ existente, agregar:
```json
"speakable": {
  "@type": "SpeakableSpecification",
  "cssSelector": ["[data-speakable]"]
}
```
Y marcar la sección FAQ con `data-speakable` en el HTML. Activa respuestas de voz en Google Assistant.

---

## Checklist de mantenimiento continuo

Tareas que deben hacerse periódicamente para mantener el SEO saludable:

### Cada vez que se sube un producto nuevo
- [ ] Asegurarse de que el producto tiene `descripcionCorta` de al menos 80 caracteres
- [ ] Verificar que la imagen principal es < 200KB
- [ ] Completar `metaTitle` y `metaDescription` en el formulario de admin si el producto es de alta prioridad
- [ ] Si el producto tiene video, completar el campo `videoUrl`

### Cada semana
- [ ] Revisar Search Console → Cobertura → Errores nuevos
- [ ] Revisar Search Console → Rendimiento → Keywords con impresiones pero sin clicks (posición > 10)
- [ ] Comprobar que el sitemap sigue respondiendo: `GET /sitemap.xml`
- [ ] Comprobar el feed de Shopping: `GET /api/public/feed/shopping.xml`

### Cada mes
- [ ] Publicar al menos 1 artículo en el blog con > 500 palabras relacionadas a las categorías de productos
- [ ] Revisar los Core Web Vitals en Search Console → Experiencia de página
- [ ] Verificar que el número de URLs indexadas en Search Console creció (señal de que el sitemap está funcionando)
- [ ] Revisar que el feed de Merchant Center no tiene errores en el panel de Merchant Center

### Antes de cada deploy
- [ ] Correr `pnpm build` — el `index.html` compilado en `src/main/resources/static/` debe tener los marcadores `HC_SEO_BLOCK_START/END`
- [ ] Si se cambia la URL del sitio, actualizar `SITE_URL` en `jsonLd.js`, `app.url` en `application.properties`, y todas las URLs hardcodeadas en `index.html`

---

## Archivos clave de SEO

```
Hot_click_outlet/
├── frontend/
│   ├── index.html                          ← Meta tags globales + HC_SEO_BLOCK + hreflang + schemas estáticos
│   ├── public/
│   │   └── robots.txt                      ← Directivas de rastreo
│   └── src/
│       ├── utils/jsonLd.js                 ← Todas las funciones de Schema.org
│       ├── components/seo/Seo.jsx          ← Componente reutilizable de meta tags
│       └── pages/
│           ├── HomePage.jsx                ← FAQPage + ItemList JSON-LD
│           ├── ProductDetailPage.jsx       ← Product + BreadcrumbList JSON-LD + breadcrumb semántico
│           ├── ProductsPage.jsx            ← Helmet dinámico + ItemList + canonical
│           ├── BlogPage.jsx                ← Blog JSON-LD + Helmet
│           └── BlogPostPage.jsx            ← BlogPosting JSON-LD + Helmet dinámico
└── src/main/java/com/hotclick/controller/
    ├── SpaController.java                  ← Inyección server-side por producto y blog
    └── ProductoFeedController.java         ← /sitemap.xml + /api/public/feed/shopping.xml
```

---

## Glosario técnico

| Término | Significado en contexto |
|---------|------------------------|
| **LCP** (Largest Contentful Paint) | Tiempo hasta que el elemento más grande visible carga. Umbral Google: < 2.5s. HOTCLICK: 5.7s |
| **INP** (Interaction to Next Paint) | Tiempo de respuesta a clicks/taps. Umbral: < 200ms. HOTCLICK: 1.895s |
| **CLS** (Cumulative Layout Shift) | Movimiento inesperado de elementos. Umbral: < 0.1. HOTCLICK: 0.103 |
| **Schema.org** | Vocabulario estándar de datos estructurados que Google, Bing y Yahoo comprenden |
| **JSON-LD** | Formato de serialización de Schema.org recomendado por Google. Va en `<script type="application/ld+json">` |
| **Rich Snippets** | Resultados de búsqueda mejorados (estrellas, precios, FAQ, breadcrumbs) que Google muestra cuando detecta Schema.org válido |
| **Open Graph** | Protocolo de Facebook/Meta para controlar cómo se ve un link al compartirse en redes sociales |
| **hreflang** | Tag HTML que indica a Google qué versión de idioma/región servir a cada usuario |
| **Canonical** | `<link rel="canonical">` indica a Google cuál es la URL "oficial" de un contenido para evitar penalizaciones por duplicados |
| **SPA (Single Page Application)** | App donde todo el contenido se renderiza con JavaScript. El mayor desafío de SEO porque los crawlers sin JS ven solo el shell HTML vacío |
| **Server-side meta injection** | Técnica de `SpaController.java` que reemplaza el bloque de meta tags en el HTML antes de enviarlo al navegador, sin renderizado del lado del servidor completo |
| **Sitemap XML** | Archivo que lista todas las URLs del sitio para que Google las descubra y rastree |
| **Google Merchant Center** | Panel de Google donde se registran los productos para que aparezcan en la pestaña Shopping |
| **Search Console** | Herramienta gratuita de Google para monitorear la indexación, errores de rastreo y rendimiento de búsqueda |
| **Autoridad de dominio** | Métrica que refleja cuánto confía Google en un dominio basado en sus backlinks y antigüedad |
| **AggregateRating** | Schema que muestra las estrellitas de calificación en resultados de Google. Requiere datos de reseñas |
| **Core Web Vitals** | Los tres métricas (LCP, INP, CLS) que Google usa como factor de ranking desde mayo 2021 |
