# HOTCLICK — Documentación Frontend

## Stack tecnológico

| Tecnología | Versión | Uso |
|---|---|---|
| React | 19.2.5 | Framework UI |
| Vite | 8.0.10 | Bundler y dev server |
| Tailwind CSS | 4.2.4 | Estilos (integración Vite nativa) |
| React Router | 7.15.0 | Enrutamiento SPA |
| Zustand | 5.0.13 | Estado global |
| TanStack React Query | 5.100.9 | Caché y fetching de datos |
| Axios | 1.16.0 | Cliente HTTP |
| Framer Motion | 12.38.0 | Animaciones |
| i18next | 26.1.0 | Internacionalización (ES / EN / PT) |
| React Helmet Async | 3.0.0 | SEO y meta tags dinámicos |
| pnpm | 11.1.2 | Gestor de paquetes |

---

## Comandos

```bash
# Desde Hot_click_outlet/frontend/

pnpm dev          # Dev server en puerto 3000 (proxy /api → localhost:8080)
pnpm build        # Build de producción → ../src/main/resources/static/
pnpm build:watch  # Build con watch para desarrollo integrado
pnpm install      # Instalar dependencias
```

> **Importante:** siempre correr `pnpm build` antes de hacer commit. El build compilado es el que se despliega en Render.

---

## Estructura de directorios

```
frontend/src/
├── pages/
│   ├── (público)
│   └── admin/
├── components/
│   ├── layout/
│   ├── ui/
│   └── seo/
├── services/
├── store/
├── hooks/
├── layouts/
├── i18n/
│   └── locales/   (es.json, en.json, pt.json)
└── utils/
```

---

## Páginas

### Públicas

| Ruta | Componente | Descripción |
|---|---|---|
| `/` | `HomePage` | Hero carousel, rotación de colores, productos destacados |
| `/productos` | `ProductsPage` | Catálogo con filtros, búsqueda y paginación |
| `/productos/:id` | `ProductDetailPage` | Detalle, recomendaciones, tabs, wishlist |
| `/carrito` | `CartPage` | Carrito de compras |
| `/checkout` | `CheckoutPage` | Pago multi-paso con stepper (requiere auth) |
| `/mis-pedidos` | `MisPedidosPage` | Historial y seguimiento de pedidos |
| `/login` | `LoginPage` | Login con soporte 2FA |
| `/registro` | `RegisterPage` | Registro con verificación de email |
| `/perfil` | `ProfilePage` | Perfil del usuario (ruta protegida) |
| `/pago` | `PaymentStatusPage` | Confirmación de pago (éxito / cancelado) |
| `/wishlist` | `WishlistPage` | Lista de deseos |
| `/recuperar-carrito` | `RecuperarCarritoPage` | Recuperación de carrito abandonado |
| `/contacto` | `ContactoPage` | Formulario de contacto |
| `/nosotros` | `NosotrosPage` | Quiénes somos |
| `/informacion` | `InformacionPage` | FAQ e información general |

### Admin

| Ruta | Componente | Descripción |
|---|---|---|
| `/admin` | `AdminDashboard` | KPIs y métricas clave |
| `/admin/productos` | `AdminProducts` | CRUD de productos |
| `/admin/productos/nuevo` | `AdminNuevoProducto` | Creación asistida por IA con selector de imágenes |
| `/admin/pedidos` | `AdminOrders` | Gestión de pedidos, guías de envío, historial de pagos |
| `/admin/marcas` | `AdminMarcas` | Marcas con logo (drag-and-drop) |
| `/admin/categorias` | `AdminCategories` | Categorías |
| `/admin/finanzas` | `AdminFinanzas` | Ingresos, costos de envío, filtros por período |
| `/admin/reportes` | `AdminReportes` | Reportes generales |
| `/admin/publicaciones` | `AdminPublicaciones` | Publicaciones en Facebook |
| `/admin/pagos` | `AdminPagos` | Webhooks y pagos |
| `/admin/configuracion` | `AdminConfiguracion` | 2FA, cuenta, herramientas del sistema |
| `/admin/usuarios` | `AdminUsers` | Gestión de usuarios (solo rol IT) |
| `/admin/bodegas` | `AdminWarehouses` | Bodegas y movimientos de stock |

---

## Componentes

### Layout (`components/layout/`)

| Componente | Descripción |
|---|---|
| `Navbar` | Cabecera con nav, badge de carrito, wishlist, auth, barra de progreso de scroll, menú móvil |
| `Footer` | Pie de página con links e info de la empresa |
| `BottomNav` | Navegación inferior para móvil |

### UI (`components/ui/`)

| Componente | Descripción |
|---|---|
| `ProductCard` | Tarjeta de producto: imagen, precio, add-to-cart, wishlist |
| `QuickViewModal` | Vista rápida del producto en modal |
| `MiniCartDrawer` | Drawer lateral de carrito |
| `CheckoutStepper` | Indicador de progreso multi-paso |
| `ShippingProgress` | Visualizador de estado de envío |
| `SearchPanel` | Overlay de búsqueda full-page |
| `AuthPromptModal` | Modal de auth para usuarios anónimos que intentan acciones protegidas |
| `ExitIntentModal` | Modal de intención de salida (descuento / engagement) |
| `SocialProof` | Componente de prueba social |
| `SocialProofToast` | Toasts rotativos con actividad de compradores (cada 15-30s) |
| `WhatsAppFab` | Botón flotante de WhatsApp (oculto en `/login` y `/registro`) |
| `AccessibilityPanel` | Panel de accesibilidad: tema, tamaño fuente, contraste, filtros de color, reducir movimiento |
| `LanguageSelector` | Selector de idioma (ES/EN/PT) |
| `MultiImagePicker` | Selector de imágenes para admin |
| `Modal` | Contenedor genérico de modal |
| `Button` | Botón reutilizable |
| `Input` | Campo de formulario |
| `Badge` | Etiqueta / badge |
| `Spinner` / `PageLoader` | Indicadores de carga |
| `Toast` | Notificaciones toast (provider + hook) |
| `ThemeToggle` | Toggle de tema claro/oscuro |

### SEO (`components/seo/`)

| Componente | Descripción |
|---|---|
| `Seo` | Meta tags dinámicos (title, description, keywords, OG tags) |

---

## Layouts

| Layout | Uso | Contenido |
|---|---|---|
| `MainLayout` | Páginas públicas | Navbar, Footer, BottomNav, SearchPanel, MiniCartDrawer, ExitIntentModal, transiciones Framer Motion |
| `AuthLayout` | Login / Registro | Header mínimo con logo, caja animada centrada, fondos decorativos con blur |
| `AdminLayout` | Panel admin | Sidebar fijo en desktop / drawer en móvil, header top en móvil, links con visibilidad por rol, logout, 14 items de navegación |

---

## Stores Zustand

Todos los stores usan middleware `persist` (localStorage).

### `authStore`
- **Estado:** `token`, `refreshToken`, `userId`, `userEmail`, `userRole`, `userName`
- **Selectores:** `isAuthenticated()`, `isAdmin()`, `isAdminIT()`
- **Acciones:** `login(data)`, `updateAccessToken()`, `setUserName()`, `logout()`

### `cartStore`
- **Estado:** `items[]`, `cartUpdatedAt`
- **Acciones:** `addItem(product, qty)`, `removeItem(id)`, `updateQuantity(id, qty)`, `clearCart()`
- **Computed:** `total()`, `count()`, `toWhatsAppMessage()`
- Dispara eventos de analytics en cada cambio

### `wishlistStore`
- **Estado:** `items[]` (campos mínimos: id, nombre, precio, imagenUrl, stock)
- **Acciones:** `toggle(product)`, `isLiked(id)`, `remove(id)`
- **Computed:** `count()`

### `uiStore`
- **Persistido:** `theme`, `language`, `fontSize`, `highContrast`, `reduceMotion`, `colorFilter`
- **Transiente (no persistido):** `cartDrawerOpen`, `searchOpen`, `authPromptOpen`
- **Acciones:** setters individuales para cada preferencia y estado UI

### `recentlyViewedStore`
- **Estado:** `items[]` — máximo 6 productos, campos mínimos
- **Acciones:** `addItem(product)`

---

## Servicios (`services/`)

| Servicio | Archivo | Funciones clave |
|---|---|---|
| API base | `api.js` | Axios con interceptor JWT, refresh en 401, desempaquetado de `ResponseDTO` |
| Auth | `authService.js` | `login`, `refresh`, `logout`, `register`, `verifyEmail`, `setup2FA`, `activate2FA`, `disable2FA` |
| Productos | `productService.js` | `getAll`, `getById`, `getRecommendations`, `create`, `update`, `delete`, `search`; `normalizeProduct` / `denormalizeProduct` |
| Pedidos | `orderService.js` | `create`, `getById`, `getByUser`, `getAll`, `updateStatus`, `assignGuide`, `processShipping`, `notify`, `delete` |
| Pagos | `paymentService.js` | `checkout`, `consultarEstado`, `capturarPayPal`, `cancelarPedido` |
| Marcas | `marcaService.js` | `getPublicas` (sin auth), CRUD completo |
| Publicaciones | `publicacionService.js` | Publicaciones en Facebook |
| Carrito abandonado | `abandonedCartService.js` | Generación de sessionId, marcar enviado, polling |
| Admin | `adminService.js` | `approve`, `reject`, `block`, `setRole`, `setStatus` de usuarios |
| Bodegas | `warehouseService.js` | CRUD, movimientos de stock, ajustes |
| Ventas | `ventaService.js` | Creación manual de ventas |

### Interceptor de API (`api.js`)

1. Adjunta automáticamente `Bearer <token>` en cada request.
2. En respuesta `401`: intenta refresh con `refreshToken`.
3. Si el refresh falla o no hay refresh token: limpia localStorage y redirige a `/login` **solo si el usuario tenía sesión previa**.
4. Desempaqueta `ResponseDTO` (`{ success, message, data }`) → devuelve solo `data`.

---

## Hooks

| Hook | Descripción |
|---|---|
| `useAbandonedCart` | Watcher en segundo plano; envía carrito al backend si lleva 1 hora inactivo (poll cada 60s) |
| `usePayment` | Flujo completo de pago: iniciar checkout, polling de estado (90s), capturar PayPal, cancelar, reintentos (máx 3) |
| `useSocialProof` | Genera notificaciones rotativas de compradores falsos (15-30s) |
| `useScrollReveal` | Animaciones activadas por scroll |
| `useLazyLoad` | Lazy loading de imágenes |

---

## Internacionalización

- 3 idiomas: **Español** (default), **Inglés**, **Portugués**
- Configuración: `src/i18n/index.js`
- Traducciones: `src/i18n/locales/{es,en,pt}.json`
- Idioma activo guardado en `uiStore` (localStorage `hotclick-ui`)
- Uso en componentes: `const { t } = useTranslation()`

---

## SEO y structured data

- `<Seo>` en cada página: title, description, keywords, OG tags.
- `src/utils/jsonLd.js` genera JSON-LD (Schema.org):
  - `generateProductJsonLd` — para páginas de producto
  - `generateWebsiteJsonLd` — con search box
  - `generateOrganizationJsonLd` — con contact point y redes sociales
- Rutas admin excluidas de indexación (sin meta robots).

---

## Accesibilidad (`AccessibilityPanel`)

Controles globales persistidos en `uiStore`:

| Control | Valores |
|---|---|
| Tema | `light` / `dark` |
| Tamaño de fuente | `normal` / `lg` / `xl` |
| Alto contraste | on / off |
| Reducir movimiento | on / off |
| Filtro de color | `none` / `grayscale` / `deuteranopia` / `protanopia` / `tritanopia` (filtros SVG) |

---

## Flujo de autenticación

```
Login → JWT + refreshToken guardados en authStore (localStorage)
  ↓
Request → interceptor adjunta Bearer token
  ↓
401 → intenta refresh → nuevo token → reintentar request
  ↓
Refresh falla → logout + redirect /login (solo si había sesión)
```

**Guardias de ruta:**
- `ProtectedRoute` — valida expiración del JWT antes de renderizar.
- `AdminRoute` — valida token + rol (`ADMIN_IT` o `ADMIN_CLIENTE`); puede restringir a solo IT.

---

## Flujo de pago

```
CheckoutPage → paymentService.checkout()
  → crea pedido pendiente en backend
  → redirige a proveedor de pago (PayXpert / PayPal)
  ↓
usePayment.pollStatus() cada N segundos (máx 90s, 3 reintentos)
  ↓
Éxito → capturarPayPal() → PaymentStatusPage (success)
Fallo → cancelarPedido() → PaymentStatusPage (cancelled)
```

---

## Convenciones de código

- **Montos:** enteros en colones costarricenses (₡). Formatear con `formatPrice()` de `utils/format.js` (usa `Intl.NumberFormat('es-CR')`).
- **Fechas:** formatear con `formatDate()` / `formatDateTime()` del mismo archivo (locale `es-CR`).
- **Nombres de estado:** `conditionLabel()` para condición de producto, `statusColor()` para colores de badge de estado.
- **Analytics:** usar `analytics.js` para registrar eventos (`productView`, `addToCart`, `checkoutStart`, etc.). No llamar directamente a GA4.
- **Normalización de productos:** siempre usar `normalizeProduct()` al recibir datos del backend y `denormalizeProduct()` al enviar.
- **Stores:** guardar solo campos mínimos en wishlist y recentlyViewed para no saturar localStorage.

---

## Variables CSS de tema

Definidas globalmente y usadas en todas las clases Tailwind:

```css
--hc-bg        /* fondo principal */
--hc-text      /* texto principal */
--hc-border    /* bordes */
--hc-surface   /* superficies (cards, modals) */
--hc-muted     /* texto secundario / apagado */
```

---

## Code splitting (Vite)

| Chunk | Contenido |
|---|---|
| `vendor-motion` | Framer Motion |
| `vendor-react` | React core |
| `vendor-query` | TanStack React Query |
| `vendor-misc` | Resto de dependencias |

Todas las páginas se cargan con `React.lazy()` + `<Suspense fallback={<PageLoader />}>`.

---

## Providers globales (App.jsx)

```jsx
<HelmetProvider>         // SEO
  <QueryClientProvider>  // React Query (stale: 30s)
    <ToastProvider>      // Notificaciones
      <BrowserRouter>    // Enrutamiento
        ...
      </BrowserRouter>
    </ToastProvider>
  </QueryClientProvider>
</HelmetProvider>
```

---

## Ventajas del frontend actual

### Arquitectura y rendimiento

- **Code splitting agresivo** — 4 chunks vendor separados + lazy loading en todas las páginas. El usuario descarga solo lo que necesita en cada ruta.
- **React Query como capa de caché** — evita refetching innecesario (stale time 30s). Las listas de productos y pedidos no se vuelven a pedir si el usuario navega entre páginas.
- **Zustand liviano** — sin boilerplate de Redux. Los stores son funciones simples, fáciles de leer y testear.
- **Vite 8 + Rolldown** — builds de producción rápidos. El dev server arranca en segundos.
- **Tailwind v4 con integración Vite nativa** — sin postcss plugin, sin config adicional. CSS purgeado automáticamente en build.

### Experiencia de usuario

- **Framer Motion en transiciones de página** — la navegación entre rutas se siente fluida, no brusca.
- **MiniCartDrawer + BottomNav** — el usuario nunca pierde el contexto del carrito, especialmente en móvil.
- **AccessibilityPanel completo** — filtros de visión (deuteranopia, protanopia, tritanopia), alto contraste, reducir movimiento. Poco común en e-commerce de este tamaño.
- **AuthPromptModal en lugar de redirección** — los usuarios anónimos no son expulsados de la página cuando intentan acciones protegidas; se les ofrece login en contexto.
- **ExitIntentModal + SocialProofToast** — técnicas de conversión incorporadas directamente sin depender de scripts externos.
- **WhatsApp como canal de soporte** — `toWhatsAppMessage()` genera el mensaje con detalle del carrito listo para enviar; reduce fricción.

### Mantenibilidad

- **Normalización de productos centralizada** — `normalizeProduct` / `denormalizeProduct` en un solo archivo. Si el backend cambia un nombre de campo, solo se toca un lugar.
- **Interceptor de API unificado** — el manejo de JWT, refresh y errores vive en `api.js`. Ningún servicio individual necesita manejar auth.
- **`ResponseDTO` desempaquetado automáticamente** — los servicios reciben directamente `data`, no tienen que hacer `.data.data`.
- **uiStore con `partialize`** — las preferencias de accesibilidad se persisten pero el estado transiente (drawer abierto, etc.) no llena el localStorage con ruido.
- **3 layouts claros** — `MainLayout`, `AuthLayout`, `AdminLayout` — es evidente dónde va cada página nueva.

### SEO y visibilidad

- **JSON-LD por página** — productos, organización y website con search box. Mejora la apariencia en resultados de Google (rich snippets).
- **Meta tags dinámicos por página** — cada producto tiene su propio title y description para redes sociales y buscadores.
- **Rutas admin excluidas de indexación** — el panel no aparece en búsquedas.

---

## Problemas actuales

### Deuda técnica

- **JWT decodificado en el cliente** — `isTokenAlive()` en `App.jsx` parsea el token sin verificar firma. Es aceptable para UX (evitar flash de redirección), pero la validación real debe vivir solo en el backend. Si el token es manipulado en localStorage, el frontend cree que sigue activo.
- **`socialProof` con datos falsos hardcodeados** — `useSocialProof` genera compradores y acciones inventados. Si un usuario técnico inspecciona el código o la red, puede dañar la credibilidad de la tienda. No hay ningún freno si el volumen real de ventas es bajo.
- **Sin tests** — no hay ningún archivo `*.test.*` ni `*.spec.*` en el proyecto. Cualquier refactor es ciego.
- **`AdminOrders.jsx` tiene 826 líneas** — concentra demasiada lógica en un solo componente. Es difícil de mantener y cualquier cambio en el flujo de pedidos toca un archivo enorme.
- **`normalizeProduct` / `denormalizeProduct` como única fuente de verdad de tipos** — el contrato entre frontend y backend está implícito en esas funciones JS, no en un schema compartido (TypeScript, Zod, OpenAPI). Si el backend cambia silenciosamente un campo, el error solo aparece en runtime.
- **`ventaService.js` y `adminService.js` con lógica mezclada** — no queda claro si los endpoints que usa `adminService` para gestión de usuarios están documentados o son coherentes con el resto.

### Rendimiento

- **Framer Motion pesa ~150 KB gzipped** — para animaciones relativamente simples (transiciones de página, fades). Hay alternativas más ligeras si el bundle size se vuelve un problema.
- **Sin estrategia de imagen** — no hay `srcset`, no hay formatos modernos (WebP/AVIF) generados automáticamente. En e-commerce, las imágenes de producto son el principal cuello de botella de carga.
- **Polling de carrito abandonado cada 60s** — el hook `useAbandonedCart` hace un intervalo activo en cada sesión aunque el usuario esté navegando activamente. Debería basarse en inactividad real (evento `visibilitychange` o `blur`).
- **`useSocialProof` con `setInterval` sin cleanup verificable** — si el componente se monta y desmonta rápido, puede dejar timers huérfanos.
- **localStorage como único storage** — si el usuario borra datos del navegador, pierde carrito, wishlist, preferencias y sesión de golpe. No hay sincronización con backend para carrito de usuarios autenticados.

### UX y flujo

- **Checkout requiere auth** — si el usuario llena el carrito y no tiene cuenta, se interrumpe el flujo en el paso de pago. El `AuthPromptModal` mitiga esto, pero no recupera el estado del checkout ni el paso en que estaba.
- **`PaymentStatusPage` depende del polling** — si el usuario cierra la pestaña antes de que el webhook llegue, la UI queda en estado desconocido. No hay pantalla de "tu pedido está siendo procesado, revisa en mis-pedidos".
- **i18n con 3 idiomas pero sin cobertura verificada** — no hay ningún mecanismo que garantice que `en.json` y `pt.json` están al día con las claves en `es.json`. Las claves faltantes simplemente muestran la clave raw.
- **`recentlyViewedStore` sin sincronización** — el historial de vistos vive solo en localStorage del dispositivo actual. En móvil no se ve lo que se revisó en desktop.
- **`ExitIntentModal` sin frecuency capping** — si el usuario visita varias páginas seguidas, el modal puede dispararse repetidamente en la misma sesión.

### Seguridad

- **Token en localStorage** — vulnerable a XSS. Si alguna dependencia comprometida inyecta código, puede robar el JWT. La alternativa más segura es `httpOnly cookie` gestionada por el backend.
- **Sin CSP (Content Security Policy)** — no hay cabeceras ni meta tags que restrinjan scripts externos. Relevante porque se usa i18next, analytics, y potencialmente scripts de terceros.
- **`SocialProofToast` expone datos de "compradores"** — aunque son falsos, si se reemplazaran por datos reales, habría que cuidar no exponer nombres de usuarios o emails en el cliente.

---

## Temas técnicos en detalle

### Normalización de productos

El backend usa `snake_case` o nombres históricos de columna que no coinciden con lo que el frontend necesita. `normalizeProduct()` hace el mapeo al recibir datos y `denormalizeProduct()` lo revierte al enviar. Este patrón evita que los componentes conozcan el esquema del backend, pero crea una dependencia implícita que no está tipada.

**Riesgo:** si el backend añade un campo nuevo y el frontend no actualiza `normalizeProduct`, el campo simplemente no aparece en la UI sin ningún error.

### Flujo de refresh de JWT

```
Request falla con 401
  ↓
interceptor llama a authService.refresh(refreshToken)
  ↓
  éxito → updateAccessToken(nuevoToken) en authStore
         → reintenta el request original automáticamente
  fallo → logout() + redirect /login
           (solo redirige si el usuario tenía sesión previa,
            para no interrumpir a usuarios anónimos)
```

El reintento automático del request original es conveniente pero puede causar problemas si el endpoint original tenía efectos secundarios (POST, PUT). Un doble envío de pedido o pago sería catastrófico.

### Carrito abandonado

```
useAbandonedCart (hook global en MainLayout)
  ↓
setInterval cada 60s
  ↓
¿cartUpdatedAt > 1 hora atrás y cart no vacío?
  ↓
  sí → abandonedCartService.save(sessionId, items)
       → marca como enviado para no reenviar
```

El backend recibe el carrito y puede enviar un email de recuperación. El `sessionId` se genera una vez por dispositivo y se guarda en localStorage.

### Build y deploy

```
pnpm build (Hot_click_outlet/frontend/)
  ↓
Vite compila → dist/
  ↓
Los archivos se copian a ../src/main/resources/static/
  ↓
Spring Boot sirve static/ como assets
  ↓
SpaController.java hace fallback a index.html
para cualquier ruta que no sea /api/** ni un archivo existente
```

El deploy en Render construye el JAR de Spring Boot que ya incluye el frontend compilado. No hay dos servicios separados.

### React Query — estrategia de caché

- `staleTime: 30_000` (30s) — si el dato se pidió hace menos de 30s, se usa sin refetch.
- Sin `gcTime` personalizado, usa el default de 5 minutos.
- Páginas de admin (`AdminOrders`, `AdminFinanzas`) probablemente tienen `staleTime` más corto o `refetchOnWindowFocus: true` porque los datos cambian más frecuentemente (no verificado — depende de la implementación en cada página).
- No hay `queryKey` centralizado/tipado; las claves están distribuidas en cada `useQuery`. Un typo en una clave genera un caché separado sin error visible.

---

## Mejoras futuras

### Prioritarias (impacto alto, esfuerzo medio)

**1. Tests unitarios y de integración**
Añadir Vitest + React Testing Library. Empezar por los flujos críticos: auth, carrito, checkout. Sin tests, cualquier cambio en `api.js` o los stores puede romper la app silenciosamente.

**2. TypeScript**
Migrar progresivamente. El contrato entre frontend y backend (normalización de productos, ResponseDTO, estados de pedido) está implícito en JS. Con TypeScript + Zod o con un cliente generado desde OpenAPI, los errores de tipos aparecen en compilación, no en producción.

**3. Optimización de imágenes**

Generar WebP/AVIF en Supabase Storage al subir (transform en la URL de Supabase). Usar `<img srcset>` para tamaños correctos. En `ProductCard`, las imágenes grandes en grids de 4 columnas son el principal peso de página.

**4. Refactorizar `AdminOrders.jsx`**
Dividir en sub-componentes: `OrderTable`, `OrderDetailDrawer`, `ShippingForm`, `PaymentHistory`. El archivo actual de 826 líneas concentra demasiada lógica y es el más difícil de tocar sin introducir bugs.

**5. Sincronizar carrito con backend para usuarios autenticados**
Actualmente el carrito solo vive en localStorage. Si el usuario cambia de dispositivo, pierde el carrito. Guardar el carrito en el backend (asociado al userId) y sincronizarlo al hacer login mejoraría la conversión.

### Importantes (impacto medio, esfuerzo variable)

**6. Mover JWT a httpOnly cookie**
Requiere cambios en el backend (Spring Security debe emitir la cookie) y en el frontend (eliminar el token de localStorage, el interceptor de Axios deja de adjuntarlo manualmente). Elimina la vulnerabilidad de robo de token por XSS.

**7. `queryKey` centralizado**
Crear `src/lib/queryKeys.js` con constantes para todas las claves de React Query. Evita inconsistencias y facilita la invalidación selectiva de caché después de mutaciones.

**8. Validación de formularios con Zod o React Hook Form**
Los formularios admin (producto nuevo, pedido, configuración) validan en el backend pero no dan feedback inmediato en el frontend. Añadir validación en cliente con mensajes inline mejora la UX del admin.

**9. `i18n` con verificación de cobertura**
Añadir un script que compara las claves de `es.json` con `en.json` y `pt.json` y falla el build si hay claves faltantes. Actualmente las traducciones pueden estar desactualizadas sin saberlo.

**10. Frequency capping para `ExitIntentModal` y `SocialProofToast`**

`ExitIntentModal` solo mostrar una vez por sesión (flag en sessionStorage). `SocialProofToast` pausar si el usuario lleva más de N segundos sin interacción (evitar fatiga de notificaciones).

### A considerar para escala (esfuerzo alto)

**11. SSR / SSG con Next.js o Astro**
El frontend actual es 100% SPA. Para SEO de productos, el Google bot tiene que ejecutar JS para ver el contenido. Con SSR, las páginas de producto se renderizan en servidor y se indexan directamente. El cambio es significativo pero el impacto en SEO orgánico es alto.

**12. PWA (Progressive Web App)**
Añadir un Service Worker con Workbox para cachear assets offline, instalar en pantalla de inicio de móvil, y enviar push notifications de estado de pedidos como alternativa al email.

**13. Analytics real**
`analytics.js` tiene la arquitectura correcta (patrón adaptador) pero en producción solo hace `console.log`. Conectar GA4 o Mixpanel requiere solo cambiar el adaptador, no tocar los componentes. Hacerlo permite entender qué productos se ven más, dónde se abandona el checkout, y qué filtros usa la gente.

**14. Sistema de revisiones / ratings**
Modelo de datos, endpoint y componente de estrellas en `ProductDetailPage`. Genera contenido fresco (SEO), prueba social real, y feedback de producto sin depender de `SocialProofToast` con datos inventados.

**15. Eliminar `SocialProofToast` con datos falsos**
Reemplazar por notificaciones reales cuando haya volumen suficiente, o eliminar completamente. En un negocio pequeño, los datos falsos son un riesgo de credibilidad mayor que el beneficio de conversión.
