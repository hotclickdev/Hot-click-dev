# HOTCLICK — Progreso del Proyecto

> Fecha última actualización: 2026-05-21

---

## Credenciales Admin

| Campo | Valor |
|-------|-------|
| URL local (producción) | `http://localhost:8080` |
| URL dev frontend | `http://localhost:3000` |
| Correo | `admin@hotclick.com` |
| Contraseña | `Admin1234!` |
| Panel admin | `/admin` (React Router) |

---

## Stack Técnico (actual)

| Componente | Tecnología |
|---|---|
| Backend | Spring Boot 3.4.4 / Java 21 |
| Seguridad | Spring Security + JWT (stateless) |
| BD | Supabase PostgreSQL — Transaction Pooler `aws-1-us-east-2.pooler.supabase.com:6543` |
| ORM | JPA/Hibernate, `ddl-auto=none`, `PhysicalNamingStrategyStandardImpl` |
| Frontend | React 19 + Vite (en `Hot_click_outlet/frontend/`) |
| Imágenes | Supabase Storage (bucket `HOT_CLICK`) — upload vía backend `/api/productos/imagen` |
| Gestor paquetes frontend | pnpm 11.1.2 (en lugar de npm) |
| Pagos online | PayPal Orders API v2 |
| Pagos offline | SINPE manual (pendiente) · Efectivo |
| Pagos archivados | PayXpert (ver `archive/payxpert/REACTIVACION.md`) |
| Build local | Maven local `.\maven\bin\mvn` |
| Deploy | Render.com (`render.yaml`) |

---

## Comandos

```bash
# Backend — compilar y ejecutar
.\maven\bin\mvn spring-boot:run

# Frontend — dev server (puerto 3000, proxy /api → 8080)
cd Hot_click_outlet/frontend && pnpm run dev

# Frontend — build de producción → src/main/resources/static/
cd Hot_click_outlet/frontend && pnpm run build
```

---

## LO QUE ESTÁ HECHO

### Arquitectura y stack
- Migración completa de HTML/JS vanilla → React 19 + Vite
- SPA con React Router; `SpaController.java` redirige rutas al `index.html`
- Axios con interceptor que auto-desenvuelve `ResponseDTO` y maneja 401 → redirect a login
- Zustand con persistencia `localStorage` para auth (token, userId, userRole)
- Vite proxy `/api → http://localhost:8080` en dev

### Autenticación y Seguridad
- Registro + verificación email (código 6 dígitos, 10 min)
- Login con JWT (24 h) + 2FA TOTP (Google Authenticator)
- Recuperación de contraseña por email
- Bloqueo de cuenta tras 5 intentos fallidos
- Roles: `ADMIN_IT`, `ADMIN_CLIENTE`, `USUARIO_FINAL`
- `AdminRoute` en React bloquea acceso al panel si no es admin

### Catálogo y Tienda
- Listado paginado de productos con filtros (categoría, condición, stock)
- Detalle de producto con especificaciones y cómo usar
- Productos destacados en inicio
- Carrito persistente con reserva de stock (`SELECT FOR UPDATE`)

### Panel Admin (React)
- **Dashboard** — métricas: usuarios, productos, pedidos, ventas, stock bajo, pendientes aprobación
- **Productos** — CRUD completo + galería hasta 10 fotos drag & drop, toggle destacado
- **Create with AI** — sube foto → Vision AI analiza → rellena formulario + galería multi-imagen
- **Categorías** — CRUD completo
- **Bodegas** — CRUD completo
- **Pedidos** — listado con filtros por estado, cambio de estado
- **Usuarios** — listado, aprobar/rechazar pendientes, cambiar rol y estado
- **Nueva Venta** — venta con cliente, venta rápida, cotización WhatsApp
- **Finanzas** — filtros por fecha, método de pago, estado; totales calculados
- **Reportes** — análisis de ventas con filtros
- **Publicaciones FB** — cola de publicación a Facebook Marketplace vía extensión Chrome

### Stock e Inventario
- Control estricto: nunca vende más de `stockDisponible = stockActual − stockReservado`
- Bloqueo pesimista (`SELECT FOR UPDATE`) para evitar sobreventa concurrente
- Auditoría completa en `hot_click_movimiento_stock_tb`
- Ajuste manual de entrada (reposición) desde admin
- Marcado automático de artículos únicos como vendidos
- **Agotado automático**: al vender el último stock → `visibleCatalogo=false`, `destacado=false`, `fechaAgotado=now()`
- **Scheduler diario (3 AM)**: inactiva definitivamente productos agotados hace más de 3 meses

### Pagos
- **PayPal** — integración completa (Orders API v2, webhook, capture, anti-fraude)
- **PayXpert** — archivado temporalmente (ver `archive/payxpert/REACTIVACION.md`)
- **SINPE manual** — pendiente de implementación
- **Efectivo** — pendiente de implementación

### Correos CR
- Plan de integración en 3 etapas documentado en `CORREOS_CR_INTEGRACION.md`
- Volumen bajo actual → mayoría contra entrega; integración en etapas

---

## BUGS CORREGIDOS (2026-05-13)

| Bug | Archivo(s) | Descripción |
|-----|-----------|-------------|
| Crear producto fallaba con error críptico | `ProductoService.java` | `findById(null)` al no seleccionar categoría/bodega → ahora valida con mensaje claro |
| Cambiar estado pedido no funcionaba | `PedidoController.java` | `@RequestParam` → `@RequestBody` para el campo `estado` |
| Admin no veía productos con stock=0 | `ProductoController.java`, `ProductoService.java`, `ProductoRepository.java` | Nuevo endpoint `GET /api/productos/admin/todos` para admin |
| Selector de bodegas mostraba en blanco | `AdminProducts.jsx` | `b.nombre` → `b.nombreBodega` |
| Sin validación de categoría en formulario | `AdminProducts.jsx` | Agregada validación + select `required` |
| Lista de productos admin filtraba stock=0 | `productService.js`, `AdminProducts.jsx` | Nuevo `adminGetAll()` que usa el endpoint exclusivo de admin |
| Datos de pedidos vacíos en dashboard | `PedidoService.java`, `VentaController.java` | Claves del mapa renombradas para coincidir con el frontend |
| Stats del dashboard con ceros | `DashboardDTO.java`, `DashboardService.java` | Campos `stockBajo` y `usuariosPendientes` añadidos y conectados |
| 403 en endpoints admin (PUT/PATCH) | `SecurityConfig.java` | Spring Security 6.4: reglas con método específico + `anyRequest()` comportamiento inconsistente → simplificado a `/api/**` catch-all |
| 403 al cambiar estado de pedido | `PedidoService.java` | `LazyInitializationException` en `Pedido.items` → Jackson no podía serializar → Spring reenviaba a `/error` → 403. Fix: `getItems().size()` dentro de la transacción |
| Docker: frontend no incluido en la imagen | `Dockerfile`, `Hot_click_outlet/Dockerfile` | Dockerfile solo copiaba `src/`. Reescrito con 3 stages: Node 20 (build React) → Maven 21 (build JAR) → JRE Alpine (runtime) |
| docker-compose.yml usaba puerto 5432 | `docker-compose.yml` | Cambiado a Transaction Pooler puerto 6543; agregadas vars de entorno faltantes |

## BUGS CORREGIDOS (2026-05-15)

| Bug | Archivo(s) | Descripción |
| --- | --- | --- |
| `value too long for type character varying(255)` al guardar con Vision AI | `ProductoService.java`, `ProductoController.java` | Truncación aplicada en `descripcion_larga`, `especificaciones`, `como_usar`; error amigable devuelto al frontend |
| Solo se podía subir 1 foto por producto | `AdminProducts.jsx`, `AdminNuevoProducto.jsx` | Reemplazado `ImagePicker` con `MultiImagePicker` (hasta 10 fotos, drag & drop, subida paralela) |
| Upload de imagen en Create with AI era al guardar | `AdminNuevoProducto.jsx` | Upload en paralelo con Vision API al analizar — la foto aparece inmediatamente en la galería |
| Supabase key expuesta en el frontend | `AdminProducts.jsx` | Upload migrado a backend (`POST /api/productos/imagen`) — key ya no está en el código frontend |
| `npm install` en Docker (riesgo de seguridad) | `Dockerfile`, `package.json` | Migrado a pnpm 11.1.2 con `corepack`; `pnpm-lock.yaml` generado |

---

## EN DESARROLLO — Módulo Publicación Automatizada

### Objetivo

Sistema completo para cargar un producto desde una foto y publicarlo en Facebook Marketplace con extracción automática de nombre, características y precios.

### Flujo definido

```
Foto del producto (celular/PC)
  → Google Cloud Vision API → identifica producto + URLs de ecommerce
  → Jsoup scrapea esas URLs → extrae precios (Amazon, Encuentra24, Crautos, Tiendamia, eBay)
  → BCCR API → convierte USD a CRC en tiempo real
  → Admin revisa/edita + llena datos faltantes → guarda en BD
  → Extensión Chrome → llena formulario FB Marketplace automáticamente
  → Admin hace click "Publicar" en Facebook
```

### Decisiones de arquitectura

| Decisión | Motivo |
|---|---|
| Google Cloud Vision API | Render Free sin Chrome; CAPTCHA bloquea Selenium en servidores |
| Extensión Chrome local para FB | 2FA de FB impide login server-side; extensión usa sesión ya abierta |
| Sin subir de plan en Render | 512 MB RAM — Chrome consumiría todo |
| Jsoup para scraping de precios | Más ligero que Selenium, sin Chrome necesario |

### Prerequisito pendiente (acción del usuario)

- [ ] **Configurar Google Cloud Vision API** — ver sección 13 de DOCUMENTACION.md:

  1. Crear cuenta en [console.cloud.google.com](https://console.cloud.google.com)
  2. Crear proyecto `hotclick-vision`
  3. Habilitar **Cloud Vision API**
  4. Crear **API Key** y restringirla a Cloud Vision API
  5. Agregar en Render → Environment: `GOOGLE_VISION_API_KEY=AIzaSy...`

### Tareas de implementación pendientes

#### Backend

- [ ] Agregar dependencia en `pom.xml`: Jsoup 1.17.2
- [ ] `BccrService.java` — tipo de cambio BCCR en tiempo real con caché 1h
- [ ] `GoogleVisionService.java` — llamada a Vision API Web Detection
- [ ] `ExtraccionService.java` — Jsoup scraping de URLs encontradas por Vision
- [ ] `PrecioSugerido.java` — entidad + repositorio + tabla `hot_click_precio_sugerido_tb`
- [ ] `PublicacionFacebook.java` — entidad + repositorio + tabla `hot_click_publicacion_fb_tb`
- [ ] `PrecioSugeridoService.java` — calcula precio con IVA 13% e importación 25%
- [ ] `PublicacionFacebookService.java` — genera texto FB formateado, gestiona cola
- [ ] `ExtraccionController.java` — `POST /api/extraccion/analizar`
- [ ] `PublicacionFbController.java` — CRUD de la cola FB
- [ ] `PublicacionScheduler.java` — `@Scheduled` genera texto FB para productos nuevos

#### Base de datos (SQL incremental)

- [ ] `CREATE TABLE hot_click_precio_sugerido_tb`
- [ ] `CREATE TABLE hot_click_publicacion_fb_tb`

#### Frontend

- [ ] `AdminPublicaciones.jsx` — página completa en `/admin/publicaciones`
- [ ] Componente `MultiImageUploader` — drag & drop N fotos
- [ ] Componente `VisionResultPanel` — resultados de Vision API editables
- [ ] Componente `PriceChart` — gráfica de barras de precios por fuente
- [ ] Componente `PublicationQueue` — cola de publicaciones FB con botón Copiar
- [ ] Actualizar `App.jsx` — nueva ruta `/admin/publicaciones`
- [ ] Actualizar `AdminLayout.jsx` — nueva entrada en sidebar

#### Extensión Chrome

- [ ] `chrome-extension/manifest.json`
- [ ] `chrome-extension/content.js` — detecta FB Marketplace, llena formulario
- [ ] `chrome-extension/popup.html` + `popup.js` — muestra productos pendientes
- [ ] `chrome-extension/background.js` — llama API de Render

#### Variables de entorno nuevas

- [ ] `GOOGLE_VISION_API_KEY` — en Render Environment
- [ ] `app.publication.enabled=true` — en `application.properties`
- [ ] `app.publication.interval-minutes=30` — en `application.properties`
- [ ] `app.tc.usd.fallback=530` — en `application.properties`

---

## PENDIENTE (otras funcionalidades)

### Alta prioridad

- [ ] **PayXpert** — activar integración real cuando el proveedor responda
- [ ] **Verificar RLS Supabase** — si `rowsecurity = true` en las tablas, los INSERTs fallan silenciosamente:

  ```sql
  SELECT tablename, rowsecurity FROM pg_tables
  WHERE schemaname = 'public' AND tablename LIKE 'hot_click%';
  -- Si alguna tiene rowsecurity=true:
  ALTER TABLE hot_click_bodega_tb DISABLE ROW LEVEL SECURITY;
  -- (repetir para cada tabla afectada)
  ```

- [ ] **Historial de pedidos para el usuario final** — página `/perfil/pedidos` no existe aún

### Media prioridad

- [ ] **Correos CR** — integración envíos (etapa 1: formulario de envío manual)
- [ ] **Ruleta de premios** — frontend de la ruleta no está conectado
- [ ] **Sistema de referidos** — entidades creadas pero sin controlador ni UI
- [ ] **Email al confirmar pedido** — `PedidoService` no envía email al crear pedido
- [ ] **Búsqueda global en tienda** — barra de búsqueda del header no está implementada
- [ ] **Paginación real** — admin carga hasta 200 productos; necesita paginación server-side para catálogos grandes

### Baja prioridad

- [ ] Imagen de perfil de usuario (campo existe en BD, falta flujo de upload)
- [ ] Marcas (`MarcaController` no existe)
- [ ] Métodos de pago y envío configurables (tablas existen en BD, sin entidad JPA)
- [ ] Tests de integración (directorio `test/` existe pero sin tests)

---

## Flujo de datos (cómo funciona ahora)

```
Dev:
  localhost:3000 (Vite) → proxy /api → localhost:8080 (Spring Boot)

Producción:
  localhost:8080 sirve index.html (build React) + API REST

Admin crea datos
  → React form → Axios (JWT en header) → Spring Security → Service → Supabase PostgreSQL

Usuario visita tienda
  → React Router → productService.getAll() → GET /api/productos (público)
  → Spring → Supabase → JSON → React renderiza

Imágenes
  → React sube archivo → POST /api/productos/imagen (backend) → Supabase Storage
  → URL pública guardada en producto (imagenPrincipalUrl) y galería (hot_click_producto_imagen_tb)
```
