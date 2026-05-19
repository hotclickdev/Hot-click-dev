# SEO & Conversión — HOTCLICK Outlet

Documentación de las mejoras implementadas en las sesiones de desarrollo (Prompts 4–8).  
Todas las rutas son relativas a `Hot_click_outlet/`.

---

## Índice

1. [Core Web Vitals (Prompt 4)](#1-core-web-vitals)
2. [JSON-LD / Schema.org (Prompt 5)](#2-json-ld--schemaorg)
3. [Social Proof (Prompt 6)](#3-social-proof)
4. [Recuperación de Carrito Abandonado (Prompt 6b)](#4-recuperación-de-carrito-abandonado)
5. [robots.txt y Meta Robots (Prompt 7)](#5-robotstxt-y-meta-robots)
6. [SEO On-Page en Panel Admin (Prompt 8)](#6-seo-on-page-en-panel-admin)
7. [Diagrama de flujo general](#7-diagrama-de-flujo-general)
8. [Variables de entorno requeridas](#8-variables-de-entorno-requeridas)
9. [SQL pendiente de ejecutar](#9-sql-pendiente-de-ejecutar)

---

## 1. Core Web Vitals

**Objetivo:** Mejorar las métricas LCP (Largest Contentful Paint) y CLS (Cumulative Layout Shift) que Google usa para rankear páginas.

### Archivos modificados

| Archivo | Cambio |
|---------|--------|
| `frontend/src/pages/ProductDetailPage.jsx` | `aspect-square` en imagen principal, `fetchPriority="high"`, `loading="eager"` |
| `frontend/src/pages/ProductsPage.jsx` | Grid diferido con `useLazyLoad` — no renderiza hasta entrar al viewport |
| `frontend/src/pages/HomePage.jsx` | `fetchPriority="high"` en primera imagen del carrusel, sección de destacados |

### Hook: `useLazyLoad`

```js
// frontend/src/hooks/useLazyLoad.js
// Usa IntersectionObserver para diferir el render de secciones fuera del viewport
const [ref, shouldRender] = useLazyLoad({ threshold: 0.1, rootMargin: '200px' })
```

**Patron de uso en ProductsPage:**
```jsx
<div ref={productGridRef}>
  {!shouldRenderGrid
    ? <div className="h-96 animate-pulse rounded-2xl bg-white/5" />  // skeleton
    : loading ? <Spinner />
    : filtered.length === 0 ? <EmptyState />
    : <AnimatePresence>...</AnimatePresence>
  }
</div>
```

### Resultado esperado

- **LCP**: imagen principal carga con máxima prioridad del navegador
- **CLS**: `aspect-square` reserva el espacio antes de que llegue la imagen (evita saltos de layout)
- **TTI**: el grid de productos no bloquea el hilo principal al cargar la página

---

## 2. JSON-LD / Schema.org

**Objetivo:** Que Google muestre precio, disponibilidad y datos de la empresa directamente en los resultados de búsqueda (rich snippets).

### Archivo creado

**`frontend/src/utils/jsonLd.js`**

```js
// Genera JSON-LD de tipo Product para la ficha de producto
generateProductJsonLd(producto, urlBase)

// Genera JSON-LD de tipo WebSite con SearchAction
generateWebsiteJsonLd(urlBase)

// Genera JSON-LD de tipo Organization con redes sociales
generateOrganizationJsonLd(urlBase, socialUrls)
```

### Inyección en páginas

**ProductDetailPage.jsx** — rich snippet de producto:
```jsx
<Helmet>
  <script type="application/ld+json">
    {JSON.stringify(generateProductJsonLd(product, window.location.origin))}
  </script>
</Helmet>
```

Campos incluidos: `name`, `description`, `image`, `url`, `price`, `priceCurrency` (CRC), `availability` (InStock/OutOfStock), `brand`.

**HomePage.jsx** — rich snippets de sitio y organización:
```jsx
// WebSite con SearchAction → permite el cuadro de búsqueda en Google
// Organization con sameAs → vincula Facebook, Instagram, WhatsApp, TikTok
```

### Importante

- Los precios están en colones (₡) enteros: `Math.round(producto.precioVenta ?? producto.precio ?? 0)`
- `availability` se calcula dinámicamente: `stock > 0 → InStock`, de lo contrario `OutOfStock`

---

## 3. Social Proof

**Objetivo:** Mostrar notificaciones tipo "María de Heredia acaba de comprar este producto" para reducir la parálisis de decisión del comprador.

### Archivos creados

**`frontend/src/hooks/useSocialProof.js`**
- Pool de 8 compradores costarricenses con ciudad
- Acciones: `compró`, `agregó al carrito`, `acaba de ver`
- Delay inicial: 8–15 segundos; siguiente notificación: 15–30 segundos
- Retorna `notification = { id, buyer, action, product }`

**`frontend/src/components/ui/SocialProofToast.jsx`**
- Cola interna de máximo 2 notificaciones simultáneas
- Auto-dismiss a los 5 segundos
- Respeta `prefers-reduced-motion` (Framer Motion)
- `aria-live="polite"` para accesibilidad
- Mobile: `fixed bottom-20 left-4 right-4` / Desktop: `sm:bottom-4 sm:right-4 sm:w-80`

### Integración en App.jsx

```jsx
// Rutas excluidas (no muestra social proof en estas secciones)
const EXCLUDED_PREFIXES = ['/admin', '/checkout', '/pago']

function SocialProofController() {
  // Carga 20 productos reales con imagen y stock > 0
  // Pasa el array al hook useSocialProof
  // Retorna null si el usuario es admin o está en ruta excluida
}
```

---

## 4. Recuperación de Carrito Abandonado

**Objetivo:** Detectar cuando un usuario deja productos en el carrito sin comprar y enviarle un email de recuperación automático.

### Flujo completo

```
Usuario agrega producto → cartUpdatedAt se actualiza
      ↓
useAbandonedCart (watcher global, cada 60s)
      ↓
¿Pasó 1 hora sin cambios? ¿Ya no se envió?
      ↓ Sí
POST /api/cart/abandoned  (guarda/actualiza en BD)
      ↓
Scheduler (cada 6 horas)
      ↓
Encuentra carritos PENDIENTE con email → envía email HTML
      ↓
Email contiene botón → /recuperar-carrito/{id}
      ↓
Usuario hace clic → RecuperarCarritoPage → restaura carrito
```

---

### Backend

#### Entidad: `CarritoAbandonado.java`

```
Tabla: hot_click_carrito_abandonado_tb

id           BIGSERIAL PRIMARY KEY
user_id      BIGINT           (null si anónimo)
session_id   VARCHAR(128)     NOT NULL
items        TEXT             NOT NULL  (JSON)
email        VARCHAR(255)
status       VARCHAR(20)      DEFAULT 'PENDIENTE'
created_at   TIMESTAMP        NOT NULL
updated_at   TIMESTAMP
```

**Estados del carrito:**
- `PENDIENTE` — creado, aún no procesado
- `EMAIL_ENVIADO` — se envió el email de recuperación
- `RECUPERADO` — el usuario restauró el carrito
- `VENCIDO` — más de 24 horas sin recuperar

#### Repository: `CarritoAbandonadoRepository.java`

```java
Optional<CarritoAbandonado> findFirstBySessionIdAndStatusOrderByCreatedAtDesc(String sessionId, String status);
List<CarritoAbandonado> findByStatusAndCreatedAtBefore(String status, LocalDateTime fecha);
void deleteBySessionId(String sessionId);
```

#### Service: `CarritoAbandonadoService.java`

- `guardar(dto, userId)` — upsert: actualiza el carrito PENDIENTE existente de la sesión, o crea uno nuevo
- `marcarRecuperado(id)` — cambia status a RECUPERADO
- `marcarEmailEnviado(id)` — cambia status a EMAIL_ENVIADO
- `marcarVencido(id)` — cambia status a VENCIDO
- `eliminar(id)` — elimina el registro

#### Controller: `CarritoAbandonadoController.java`

| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/cart/abandoned` | Público | Guarda/actualiza carrito |
| GET | `/api/cart/abandoned/recover/{id}` | Público | Recupera carrito por ID |
| GET | `/api/cart/abandoned/session/{sessionId}` | Público | Busca carrito por sesión |
| DELETE | `/api/cart/abandoned/{id}` | Público | Elimina carrito |

#### Scheduler: `CarritoAbandonadoScheduler.java`

```properties
# application.properties
app.abandoned-cart.enabled=true
app.abandoned-cart.hours-to-wait=1
app.abandoned-cart.scheduler-cron=0 0 */6 * * *
```

- Solo activo si `app.abandoned-cart.enabled=true` (`@ConditionalOnProperty`)
- Busca carritos PENDIENTE con más de `hours-to-wait` horas de antigüedad
- Si tiene email → envía email y marca como EMAIL_ENVIADO
- Si tiene más de 24 horas → marca como VENCIDO

#### Email de recuperación

`NotificacionEmailService.java` — método `enviarRecuperacionCarrito`:
- Tabla HTML con imagen, nombre y cantidad de cada producto
- Total del carrito en ₡
- Botón CTA: `Ver mi carrito guardado → {appUrl}/recuperar-carrito/{id}`

---

### Frontend

#### `frontend/src/services/abandonedCartService.js`

```js
// Claves en localStorage
SESSION_KEY  = 'hc-session-id'      // ID anónimo de sesión
SENT_TS_KEY  = 'hc-abandoned-sent-ts' // timestamp del último envío

getOrCreateSessionId()               // crypto.randomUUID() con fallback
wasAlreadySent(cartUpdatedAt)        // evita enviar dos veces el mismo carrito
markAbandonedSent(cartUpdatedAt)     // registra el envío en localStorage

saveAbandonedCart(items, email)      // POST /api/cart/abandoned
getAbandonedCart(id)                 // GET  /api/cart/abandoned/recover/{id}
getAbandonedCartBySession()          // GET  /api/cart/abandoned/session/{sessionId}
deleteAbandonedCart(id)              // DELETE /api/cart/abandoned/{id}
```

#### `frontend/src/hooks/useAbandonedCart.js`

```js
const CHECK_INTERVAL_MS  = 60_000        // revisa cada 60 segundos
const STALE_THRESHOLD_MS = 60 * 60 * 1000  // 1 hora de inactividad

// Montado globalmente en App.jsx via <AbandonedCartWatcher />
// Usa refs para evitar closures obsoletos en el setInterval
```

Condiciones para guardar el carrito:
1. El carrito tiene al menos 1 producto
2. Pasó más de 1 hora desde `cartUpdatedAt`
3. `wasAlreadySent(cartUpdatedAt)` retorna `false`

#### `frontend/src/pages/RecuperarCarritoPage.jsx`

- Ruta: `/recuperar-carrito/:id`
- Carga el carrito del backend con `getAbandonedCart(id)`
- Muestra lista de productos con imagen, cantidad y precio
- Muestra total del carrito
- "Agregar al carrito y continuar" → `addItem` por cada producto → `deleteAbandonedCart` → `/carrito`
- Si el carrito ya fue usado o expiró: mensaje "Carrito no disponible"

#### Modal de recuperación en Login y Registro

Cuando el usuario inicia sesión o se registra exitosamente:
1. Se llama `getAbandonedCartBySession()` con el session ID anónimo
2. Si hay carrito, aparece un modal con preview de los primeros 3 productos
3. "Restaurar carrito" → agrega los productos al store y elimina el carrito del backend
4. "Descartar" → solo elimina el carrito del backend

---

## 5. robots.txt y Meta Robots

**Objetivo:** Controlar qué páginas indexa Google y optimizar el crawl budget.

### `frontend/public/robots.txt`

```
User-agent: *
Allow: /

Disallow: /admin/
Disallow: /perfil/
Disallow: /carrito
Disallow: /checkout
Disallow: /api/
Disallow: /recuperar-carrito/

Sitemap: https://hotclick.com/sitemap.xml
```

Este archivo se copia automáticamente a `src/main/resources/static/` con cada `pnpm build`. Spring Boot lo sirve directamente.

### Meta robots

**`frontend/index.html`** — ya incluido:
```html
<meta name="robots" content="index, follow" />
```

**`frontend/src/layouts/AdminLayout.jsx`** — todo el panel admin:
```jsx
import { Helmet } from 'react-helmet-async'

// Dentro del componente:
<Helmet>
  <meta name="robots" content="noindex, nofollow" />
</Helmet>
```

### Páginas y su política de indexación

| Ruta | Indexable | Razón |
|------|-----------|-------|
| `/`, `/productos`, `/productos/:id` | ✅ Sí | Contenido público y comercial |
| `/nosotros`, `/contacto` | ✅ Sí | Contenido informativo |
| `/admin/**` | ❌ No | Panel privado |
| `/carrito`, `/checkout` | ❌ No | Rutas transaccionales sin valor SEO |
| `/perfil`, `/mis-pedidos` | ❌ No | Contenido privado por usuario |
| `/recuperar-carrito/:id` | ❌ No | URLs temporales con IDs únicos |

---

## 6. SEO On-Page en Panel Admin

**Objetivo:** Permitir que el equipo configure el SEO de cada producto sin conocimientos técnicos.

### Nuevos campos en la base de datos

```sql
-- Ejecutar en Supabase:
ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS meta_title        VARCHAR(70),
    ADD COLUMN IF NOT EXISTS meta_description  VARCHAR(160),
    ADD COLUMN IF NOT EXISTS meta_keywords     VARCHAR(255);
```

### Backend modificado

**`Producto.java`** — 3 nuevos campos JPA:
```java
@Column(name = "meta_title", length = 70)
private String metaTitle;

@Column(name = "meta_description", length = 160)
private String metaDescription;

@Column(name = "meta_keywords", length = 255)
private String metaKeywords;
```

**`ProductoRequestDTO.java`** — mismos 3 campos con getters/setters.

**`ProductoService.java`** — mapeados en `mapDtoToProducto()`:
```java
if (dto.getMetaTitle()       != null) p.setMetaTitle(trunc(dto.getMetaTitle(), 70));
if (dto.getMetaDescription() != null) p.setMetaDescription(trunc(dto.getMetaDescription(), 160));
if (dto.getMetaKeywords()    != null) p.setMetaKeywords(trunc(dto.getMetaKeywords(), 255));
```

---

### Frontend modificado

#### `productService.js`

`normalizeProduct` — expone los campos al frontend:
```js
metaTitle: p.metaTitle ?? null,
metaDescription: p.metaDescription ?? null,
metaKeywords: p.metaKeywords ?? null,
```

`denormalizeProduct` — los envía al backend al guardar:
```js
metaTitle: form.metaTitle || null,
metaDescription: form.metaDescription || null,
metaKeywords: form.metaKeywords || null,
```

#### `ProductDetailPage.jsx` — uso de campos SEO

```jsx
// Usa el valor guardado si existe, fallback automático si no
const seoTitle = product.metaTitle
  || `${product.titulo || product.nombre} | HOTCLICK Outlet`

const seoDescription = product.metaDescription
  || `${product.descripcion} | Precio: ₡${precio} | Envíos en Costa Rica`
```

#### Sección SEO en AdminNuevoProducto y AdminProducts

**Auto-sugerencia inteligente:**

```js
// Cuando el nombre cambia → sugiere título si el usuario no lo editó manualmente
useEffect(() => {
  if (!seoAutoTitle) return
  setForm(p => ({ ...p, metaTitle: p.nombre ? `${p.nombre} | HOTCLICK Outlet`.slice(0, 60) : '' }))
}, [form.nombre, seoAutoTitle])

// Cuando descripción o precio cambian → sugiere meta descripción
useEffect(() => {
  if (!seoAutoDesc) return
  const suggested = `${form.descripcion} | Precio: ₡${precio} | Envíos a todo Costa Rica`.slice(0, 160)
  setForm(p => ({ ...p, metaDescription: suggested }))
}, [form.descripcion, form.precioVenta, seoAutoDesc])
```

**Lógica de "auto" vs. manual:**
- Mientras no se toca el campo, muestra badge `auto` y se actualiza con el nombre/descripción
- En el momento que el usuario escribe en el campo SEO, `seoAutoTitle` o `seoAutoDesc` pasa a `false` y deja de auto-actualizarse

**Componente `CharCounter`:**
```
< mínimo  → ámbar   (muy corto para Google)
En rango  → verde   (ideal)
> máximo  → rojo    (Google lo va a truncar)

Título:      mín 30 / máx 60
Descripción: mín 120 / máx 160
```

**Vista previa del resultado en Google:**
```
hotclick.com › productos › nombre-del-producto    ← verde
Nombre del producto | HOTCLICK Outlet             ← azul (título)
Descripción del producto | Precio: ₡X | Envíos…  ← gris (descripción)
```

**Columna SEO en tabla de productos:**

| Ícono | Significado |
|-------|------------|
| ✅ | `metaTitle` y `metaDescription` configurados |
| ⚠️ | Solo uno de los dos campos configurado |
| ❌ | Ambos campos vacíos |

Al hacer hover sobre el ícono se muestra el título y descripción actuales vía `title` HTML.

---

## 7. Diagrama de flujo general

```
COMPRADOR EN LA TIENDA
│
├─ Entra por Google Search
│  └─ JSON-LD → rich snippet muestra precio y disponibilidad → más clics
│
├─ Carga la página
│  └─ Core Web Vitals → LCP e imágenes optimizadas → mejor ranking
│
├─ Navega productos
│  └─ Social Proof Toast → "María compró esto" → más confianza
│
├─ Agrega al carrito pero NO compra
│  └─ useAbandonedCart (1 hora) → guarda en BD
│  └─ Scheduler (cada 6h) → email con CTA
│  └─ Email → /recuperar-carrito/:id → restaura carrito
│
└─ Hace login / se registra
   └─ Modal de recuperación → restaura carrito de sesión anónima


EQUIPO ADMIN
│
└─ /admin/productos (AdminProducts o AdminNuevoProducto)
   └─ Sección SEO 🎯
      ├─ Auto-sugerencia basada en nombre y descripción
      ├─ Contador de caracteres con semáforo de colores
      ├─ Vista previa de Google en tiempo real
      └─ Guarda metaTitle y metaDescription en BD
         └─ ProductDetailPage los usa automáticamente
```

---

## 8. Variables de entorno requeridas

Estas variables ya deben existir en Render/Supabase. Se agregan aquí por completitud.

```properties
# application.properties (ya configuradas)
app.abandoned-cart.enabled=true
app.abandoned-cart.hours-to-wait=1
app.abandoned-cart.scheduler-cron=0 0 */6 * * *

# SendGrid (necesaria para enviar emails de recuperación)
SENDGRID_API_KEY=SG.xxxxx
APP_URL=https://hot-click-dev.onrender.com
```

---

## 9. SQL pendiente de ejecutar

Ejecutar en la consola de Supabase (SQL Editor) antes de hacer deploy:

```sql
-- Carrito abandonado (si no existe aún)
CREATE TABLE IF NOT EXISTS hot_click_carrito_abandonado_tb (
    id          BIGSERIAL    PRIMARY KEY,
    user_id     BIGINT,
    session_id  VARCHAR(128) NOT NULL,
    items       TEXT         NOT NULL,
    email       VARCHAR(255),
    status      VARCHAR(20)  NOT NULL DEFAULT 'PENDIENTE',
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    updated_at  TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_carrito_abandonado_session_status
    ON hot_click_carrito_abandonado_tb (session_id, status);

CREATE INDEX IF NOT EXISTS idx_carrito_abandonado_status_created
    ON hot_click_carrito_abandonado_tb (status, created_at);

-- Campos SEO en producto
ALTER TABLE hot_click_producto_tb
    ADD COLUMN IF NOT EXISTS meta_title        VARCHAR(70),
    ADD COLUMN IF NOT EXISTS meta_description  VARCHAR(160),
    ADD COLUMN IF NOT EXISTS meta_keywords     VARCHAR(255);
```

---

## Historial de cambios

| Fecha | Prompt | Descripción |
|-------|--------|-------------|
| 2026-05-19 | 4 | Core Web Vitals: LCP, CLS, lazy loading del grid |
| 2026-05-19 | 5 | JSON-LD Schema.org en ProductDetailPage y HomePage |
| 2026-05-19 | 6 | Social Proof Toast con nombres costarricenses |
| 2026-05-19 | 6b | Sistema completo de recuperación de carrito abandonado |
| 2026-05-19 | 7 | robots.txt, noindex en /admin |
| 2026-05-19 | 8 | Campos SEO en productos, panel admin con preview Google |
