# HOTCLICK — Documentación Técnica

> Versión: 3.0 | Fecha: 2026-06-05 | Stack: React + Vite + pnpm · Spring Boot 3.4.4 + Java 24

---

## 1. Resumen Ejecutivo

**HOTCLICK** es una plataforma SaaS multi-tenant de e-commerce para el mercado costarricense. Conecta compradores con emprendedores locales a través de un marketplace con POS, CRM, analytics, WhatsApp API y cumplimiento legal completo (Ley N.° 8968).

**Stack**: Spring Boot 3.4.4 + Java 24 (backend API) + React + Vite (frontend SPA) + Supabase PostgreSQL + Flyway (56 migraciones).

---

## 2. Arquitectura

### Backend

- MVC clásico: Controller → Service → Repository → Entity
- Spring Security con JWT stateless + 2FA TOTP
- JPA/Hibernate con `ddl-auto=none` (schema gestionado con `Actualizado.sql`)
- Naming strategy: `PhysicalNamingStrategyStandardImpl` — nombres exactos en minúsculas
- Soft deletes universales: campo `fk_id_estado` en todas las entidades (`BaseEntity`)
- Montos monetarios en enteros (colones costarricenses, sin decimales)

### Frontend

- React 19 + Vite en `Hot_click_outlet/frontend/`
- React Router v6 para routing del SPA
- Zustand con `persist` (localStorage key `hotclick-auth`) para estado de auth
- Axios con interceptores:
  - **Request**: agrega `Authorization: Bearer <token>` desde localStorage
  - **Response success**: auto-desenvuelve `ResponseDTO { success, message, data }` → deja `data` directamente
  - **Response error 401**: limpia token y redirige a `/login`
- TanStack Query para cache de llamadas
- Build de producción → `src/main/resources/static/` (Vite `emptyOutDir: true`)
- `SpaController.java` redirige todas las rutas no-API al `index.html`

### Base de Datos

- PostgreSQL en Supabase, Transaction Pooler puerto **6543**
- ~60 tablas con prefijo `hot_click_*_tb`
- Schema gestionado exclusivamente con Flyway (V1–V56) — `ddl-auto=none`
- `Actualizado.sql` refleja el schema completo para referencia y staging
- HikariCP con pool limitado al plan de Supabase
- **Constraint crítico:** PgBouncer en transaction mode — prohibido `pg_advisory_lock`, `SET session`, `LISTEN/NOTIFY`

### Integraciones Externas

| Servicio | Propósito |
| --- | --- |
| Supabase PostgreSQL | Base de datos principal (PgBouncer transaction mode, puerto 6543) |
| Supabase Storage | Imágenes de productos y logos (bucket `HOT_CLICK`) |
| SendGrid | Email transaccional — confirmaciones, guías, seguimiento de pedidos |
| Stripe | Pagos con tarjeta — webhook para confirmar pedidos |
| PayXpert | Pasarela alternativa — webhook integrado |
| Clerk | OAuth social login: Google, Microsoft, Apple, GitHub |
| Google Analytics 4 | Analítica con consentimiento previo (CookieBanner) |
| Meta Cloud API | Mensajería WhatsApp — plantillas y logs (`WaMensajeLog`) |
| Google Authenticator | 2FA TOTP (RFC 6238, AES-256-GCM en DB) |

---

## 3. Tecnologías

| Categoría | Tecnología | Versión |
| --- | --- | --- |
| Lenguaje backend | Java | 24 |
| Framework backend | Spring Boot | 3.4.4 |
| Seguridad | Spring Security + JJWT | — |
| Migraciones DB | Flyway | V1–V56 |
| Jobs distribuidos | ShedLock | — |
| 2FA | dev.samstevens.totp | 1.7.1 |
| ORM | Spring Data JPA / Hibernate | (incluido en Boot) |
| Base de datos | PostgreSQL (Supabase) | 15 |
| Build backend | Maven local (`maven/bin/`) | — |
| Frontend | React | 18 |
| Bundler | Vite | 8.x |
| Gestor de paquetes | pnpm | 11.1.2 |
| Estado global | Zustand | — |
| HTTP client | Axios | — |
| Query cache | TanStack Query | — |
| Animaciones | Framer Motion | — |
| OAuth | Clerk | v6 |
| Contenerización | Docker + docker-compose | — |

---

## 4. Estructura del Proyecto

```
Hot_click_outlet/
├── src/main/java/com/hotclick/
│   ├── AppApplication.java
│   ├── config/
│   │   ├── SecurityConfig.java          ← reglas JWT, CORS, rutas públicas/protegidas
│   │   └── DataSeeder.java              ← siembra estados, roles, admin por defecto
│   ├── controller/                      ← capa HTTP; recibe requests, llama services
│   ├── dto/                             ← contratos entrada/salida de la API
│   │   └── ResponseDTO.java             ← wrapper: { success, message, data }
│   ├── model/                           ← entidades JPA
│   │   └── BaseEntity.java              ← campo estado compartido por todas
│   ├── repository/                      ← interfaces Spring Data JPA
│   ├── security/
│   │   ├── JwtUtil.java
│   │   └── JwtRequestFilter.java        ← extrae y valida JWT en cada request
│   ├── scheduler/
│   │   └── ProductoScheduler.java       ← job diario 3 AM: inactiva productos agotados > 3 meses
│   ├── service/                         ← lógica de negocio
│   └── utils/
│       └── Constants.java               ← estados, roles, estados de pedido
├── src/main/resources/
│   ├── application.properties           ← DB, SMTP, Supabase, JWT
│   ├── static/                          ← build React (generado por pnpm run build)
│   └── Actualizado.sql                  ← schema completo de la BD
└── frontend/                            ← fuente React
    ├── src/
    │   ├── App.jsx                      ← rutas + guards (ProtectedRoute, AdminRoute)
    │   ├── pages/
    │   │   ├── admin/                   ← panel admin (Dashboard, Products, Orders…)
    │   │   └── (tienda pública)
    │   ├── services/
    │   │   ├── api.js                   ← Axios instance + interceptores
    │   │   ├── productService.js        ← normalizeProduct, denormalizeProduct, getImagenes, sincronizarImagenes
    │   │   └── orderService.js          ← orderService, ventaService, adminService, warehouseService
    │   ├── store/
    │   │   └── authStore.js             ← Zustand: token, userId, userRole, userName
    │   ├── layouts/
    │   │   ├── MainLayout.jsx
    │   │   └── AdminLayout.jsx
    │   └── components/ui/               ← Button, Input, Modal, Badge, Toast, Spinner, MultiImagePicker
    ├── vite.config.js                   ← proxy /api → :8080, outDir → ../src/main/resources/static
    ├── package.json                     ← packageManager: pnpm@11.1.2
    └── pnpm-lock.yaml
```

---

## 5. Funcionalidades Implementadas

### Autenticación

- Registro con verificación de email (código 6 dígitos, 10 min)
- Login JWT (24 h) + 2FA TOTP opcional
- Recuperación de contraseña por email
- Bloqueo de cuenta tras 5 intentos fallidos

### Tienda pública

- Catálogo paginado con filtros (categoría, condición, stock)
- Detalle de producto (especificaciones, cómo usar, galería de imágenes)
- Productos destacados en inicio (se quitan automáticamente al agotarse)
- Carrito persistente con reserva de stock

### Panel Admin

| Página | Ruta | Funcionalidad |
|---|---|---|
| Dashboard | `/admin` | Métricas: usuarios, productos, pedidos, ventas, stock bajo, pendientes aprobación |
| Productos | `/admin/productos` | CRUD + galería hasta 10 fotos (drag & drop), toggle destacado, filtros |
| Create with AI | `/admin/nuevo-producto` | Sube foto → Vision AI analiza → rellena formulario + galería multi-imagen |
| Categorías | `/admin/categorias` | CRUD |
| Bodegas | `/admin/bodegas` | CRUD |
| Pedidos | `/admin/pedidos` | Listado por estado, cambio de estado |
| Usuarios | `/admin/usuarios` | Listado, aprobar/rechazar, cambiar rol y estado |
| Nueva Venta | `/admin/ventas` | Venta con cliente, venta rápida, cotización WhatsApp |
| Finanzas | `/admin/finanzas` | Ventas filtradas por fecha/método/estado |
| Reportes | `/admin/reportes` | Análisis de ventas |
| Publicaciones FB | `/admin/publicaciones` | Cola de publicación a Facebook Marketplace |

### Stock e Inventario

- `stockActual − stockReservado = stockDisponible`
- `SELECT FOR UPDATE` evita sobreventa concurrente
- Auditoría completa en `hot_click_movimiento_stock_tb`
- Ajuste manual de entrada desde admin
- **Agotado automático**: al vender el último stock → `visibleCatalogo=false`, `destacado=false`, `fechaAgotado=now()`
- **Scheduler diario (3 AM)**: inactiva definitivamente productos agotados hace más de 3 meses

### Imágenes de Productos

- Upload vía backend (`POST /api/productos/imagen` → Supabase Storage)
- Galería de hasta 10 fotos por producto (`hot_click_producto_imagen_tb`)
- Primera foto = imagen principal (`imagenPrincipalUrl` en `Producto`)
- Drag & drop múltiple en admin — uploads en paralelo con spinners por foto
- Al editar, carga fotos existentes desde `GET /api/productos/{id}/imagenes`

### Pedidos y Ventas

- Número único `ORD-{timestamp}`
- Estados: PENDIENTE → CONFIRMADO → PREPARANDO → ENVIADO → ENTREGADO/CANCELADO/COMPLETADO
- Venta admin descuenta stock con bloqueo pesimista
- Venta desde carrito libera reservas y marca el carrito como CONVERTIDO

---

## 6. Endpoints de la API

### Públicos (sin auth)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/health` | Estado del servicio |
| POST | `/api/auth/**` | Login, registro, 2FA, reset contraseña |
| GET | `/api/productos` | Catálogo paginado (solo stock > 0) |
| GET | `/api/productos/{id}` | Detalle de producto |
| GET | `/api/productos/destacados` | Productos destacados |
| GET | `/api/categorias` | Listado de categorías activas |
| POST | `/api/webhooks/payxpert` | Webhook de pagos PayXpert |

### Requieren autenticación (JWT)

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/productos/admin/todos` | Todos los productos activos (sin filtro stock) |
| POST | `/api/productos` | Crear producto |
| PUT | `/api/productos/{id}` | Actualizar producto |
| DELETE | `/api/productos/{id}` | Eliminar producto (soft) |
| PATCH | `/api/productos/{id}/destacado` | Toggle destacado |
| GET | `/api/productos/{id}/imagenes` | Listar imágenes del producto |
| POST | `/api/productos/{id}/imagenes` | Agregar imagen al producto |
| DELETE | `/api/productos/{id}/imagenes/{imgId}` | Eliminar imagen |
| PUT | `/api/productos/{id}/imagenes` | Sincronizar galería completa (`{ urls: [...] }`) |
| POST | `/api/productos/imagen` | Upload de archivo → URL en Supabase Storage |
| POST | `/api/categorias` | Crear categoría |
| PUT | `/api/categorias/{id}` | Actualizar categoría |
| DELETE | `/api/categorias/{id}` | Eliminar categoría (soft) |
| GET | `/api/bodegas` | Listar bodegas activas |
| POST | `/api/bodegas` | Crear bodega |
| PUT | `/api/bodegas/{id}` | Actualizar bodega |
| DELETE | `/api/bodegas/{id}` | Eliminar bodega (soft) |
| POST | `/api/pedidos` | Crear pedido |
| GET | `/api/pedidos/{id}` | Obtener pedido |
| GET | `/api/pedidos` | Listar todos los pedidos (admin) |
| PUT | `/api/pedidos/{id}/estado` | Cambiar estado del pedido |
| GET | `/api/pedidos/usuario/{id}` | Pedidos de un usuario |
| GET | `/api/pedidos/pendientes` | Pedidos PENDIENTE |
| POST | `/api/ventas` | Crear venta (admin) con validación de stock |
| GET | `/api/ventas` | Listar todas las ventas |
| GET | `/api/ventas/clientes` | Buscar clientes para selector |
| GET | `/api/stock/movimientos/{productoId}` | Historial de movimientos de stock |
| POST | `/api/stock/ajuste-entrada/{productoId}` | Reposición de inventario |
| GET | `/api/admin/dashboard` | Métricas del dashboard |
| GET | `/api/admin/usuarios` | Listar todos los usuarios |
| GET | `/api/admin/usuarios/pendientes` | Usuarios pendientes de aprobación |
| PUT | `/api/admin/usuarios/{id}/aprobar` | Aprobar usuario |
| PUT | `/api/admin/usuarios/{id}/rechazar` | Rechazar usuario |
| PUT | `/api/admin/usuarios/{id}/rol` | Cambiar rol |
| PUT | `/api/admin/usuarios/{id}/estado` | Activar/desactivar usuario |
| POST | `/api/payment/checkout` | Iniciar pago PayXpert |

---

## 7. Seguridad

### Roles

| Rol | Acceso |
| --- | --- |
| `ADMIN_IT` | Panel admin completo — usuarios, seguridad, superadmin |
| `ADMIN_CLIENTE` | Panel admin sin gestión de usuarios ni seguridad |
| `EMPRENDEDOR` | Panel de emprendedor — productos, pedidos, finanzas propias |
| `CAJERO` | Solo POS |
| `GERENTE` | POS + historial |
| `SUPERVISOR` | POS + configuración de turno |
| `USUARIO_FINAL` | Tienda pública, carrito, pedidos propios |

### Variables de entorno (producción)

| Variable | Propósito |
| --- | --- |
| `SPRING_DATASOURCE_URL` | URL JDBC Supabase con Transaction Pooler (puerto 6543) |
| `SPRING_DATASOURCE_PASSWORD` | Contraseña PostgreSQL |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_KEY` | Service Role Key de Supabase Storage |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT |
| `RESEND_API_KEY` | SendGrid (email transaccional) |
| `STRIPE_SECRET_KEY` | Stripe — pagos con tarjeta |
| `STRIPE_WEBHOOK_SECRET` | Stripe — verificación de webhook |
| `PAYXPERT_API_KEY` | PayXpert — pasarela alternativa |
| `CLERK_SECRET_KEY` | Clerk — OAuth social login backend |
| `VITE_CLERK_PUBLISHABLE_KEY` | Clerk — OAuth social login frontend |
| `WHATSAPP_TOKEN` | Meta Cloud API — mensajería WhatsApp |
| `WHATSAPP_PHONE_NUMBER_ID` | Meta Cloud API — ID del número |

---

## 8. Convenciones de Código

- **Naming BD**: `PhysicalNamingStrategyStandardImpl` — los nombres de entidad deben coincidir exactamente con los de la BD (minúsculas con guiones bajos)
- **Montos**: siempre enteros en colones costarricenses (₡), sin decimales
- **`ddl-auto=none`**: NUNCA cambiar este valor; todo cambio de schema se aplica manualmente con `Actualizado.sql`
- **ResponseDTO**: todos los endpoints retornan `{ success: boolean, message: string, data: any }`
- **normalizeProduct / denormalizeProduct**: usar estas funciones en el frontend para mapear campos backend ↔ formulario React

---

## 9. Cumplimiento Legal (Ley N.° 8968)

Ver reporte completo en [docs/COMPLIANCE.md](docs/COMPLIANCE.md) y los 8 documentos legales en [docs/legal/](docs/legal/).

### Mecanismo de consentimiento

| Flujo | Tipo | Archivo |
| --- | --- | --- |
| Registro de usuario | `REGISTRO` | `RegisterPage.jsx` |
| Proceso de pago | `CHECKOUT` | `CheckoutPage.jsx` |
| Registro de negocio | `VENDEDOR` | `RegistrarNegocioPage.jsx` |

Cada aceptación graba `usuario_id`, `ip_address`, `user_agent` y `fecha_consentimiento` en `hot_click_consentimiento_log_tb` (V56).

### Endpoint

```http
POST /api/consentimiento   → público (invitados graban usuario_id = NULL)
```

---

## 10. Problemas Conocidos / Deuda Técnica

| Problema | Severidad | Notas |
| --- | --- | --- |
| JWT en `localStorage` | Baja | Vulnerable a XSS; alternativa es `httpOnly` cookie |
| Rate limiting en memoria (no distribuido) | Media | Se resetea al reiniciar; usar ShedLock para distributed lock |
| Carga EAGER de roles en Usuario | Baja | `ManyToMany(fetch=EAGER)` puede causar N+1 en listados masivos |
| Swagger accesible en producción | Media | Verificar y proteger o deshabilitar |
| Dependencias sin audit automatizado | Media | Considerar OWASP dependency-check en CI/CD |

---

## 10. Comandos de Desarrollo

```bash
# Iniciar backend
.\maven\bin\mvn spring-boot:run

# Iniciar frontend (dev server con hot reload)
cd Hot_click_outlet/frontend
pnpm run dev                 # puerto 3000

# Build de producción (actualiza static/ que sirve Spring Boot)
pnpm run build

# Compilar solo backend (sin tests)
.\maven\bin\mvn clean package -DskipTests
```

---

## 11. Docker

### Estructura

El Dockerfile usa 3 stages:

1. **`frontend-builder`** — Node 20 Alpine: compila React con Vite
2. **`backend-builder`** — Maven + Java 21: compila el JAR (incluye el build de React)
3. **Runtime** — Eclipse Temurin 21 JRE Alpine: imagen final ligera

### Comandos

```bash
# Desde Hot_click_outlet/ (usa docker-compose.yml + Dockerfile de esa carpeta)
cd Hot_click_outlet
docker compose up --build

# Desde la raíz del proyecto
docker build -t hotclick-outlet .
docker run -p 8080:8080 \
  -e SUPABASE_SERVICE_KEY=<key> \
  -e MAIL_PASSWORD=<pass> \
  hotclick-outlet
```

### Variables de entorno requeridas en producción

| Variable | Descripción |
|---|---|
| `SUPABASE_SERVICE_KEY` | Service Role Key de Supabase Storage |
| `MAIL_PASSWORD` | App Password de Gmail SMTP |
| `APP_URL` | URL pública de la app (para callbacks PayXpert) |
| `PAYXPERT_ORIGINATOR_ID` | ID de comercio PayXpert |
| `PAYXPERT_ORIGINATOR_PASSWORD` | Contraseña PayXpert |

> Las credenciales de BD están embebidas en `docker-compose.yml`. Para producción usar un `.env` o secrets manager.

---

## Apéndice — Usuario Admin por Defecto

Creado automáticamente por `DataSeeder` al primer arranque:

| Campo | Valor |
|---|---|
| Correo | `admin@hotclick.com` |
| Contraseña | `Admin1234!` |
| Rol | `ADMIN_IT` |

**Cambiar esta contraseña en producción.**

---

## Apéndice — Estados del Sistema

| Valor | Nombre | Uso |
|---|---|---|
| 0 | PENDIENTE | Usuario registrado esperando aprobación admin |
| 1 | ACTIVO | Registro activo y operativo |
| 2 | INACTIVO | Desactivado temporalmente |
| 3 | ELIMINADO | Soft delete |
| 4 | SUSPENDIDO | Bloqueado por admin |

## Apéndice — Sistema de Stock (resumen)

```
stockDisponible = stockActual − stockReservado

Agregar al carrito  → stockReservado++  (SELECT FOR UPDATE)
Vaciar carrito      → stockReservado--
Completar venta     → stockActual--  y  stockReservado-- (si venía de carrito)
Venta admin directa → stockActual--  (valida contra stockDisponible)
Auditoría           → registra cada cambio en hot_click_movimiento_stock_tb
```

---

## 12. Módulo de Publicación Automatizada (EN DESARROLLO)

### Descripción

Sistema para cargar productos desde una foto y publicarlos automáticamente en Facebook Marketplace, con extracción automática de características y precios vía IA.

### Flujo completo

```
1. Admin sube foto(s) del producto (celular o PC)
        ↓
2. Google Cloud Vision API analiza la imagen
   → Identifica: nombre del producto, marca, modelo
   → Devuelve: URLs de páginas ecommerce donde aparece el producto
        ↓
3. Backend (Jsoup) visita esas páginas → extrae precios
   → Fuentes: Amazon, Encuentra24, Crautos, Tiendamia, eBay
   → Convierte USD → CRC con tipo de cambio en tiempo real (API BCCR)
   → Calcula precio promedio y precio sugerido (con/sin IVA 13%, importación 25%)
        ↓
4. Admin revisa resultados en /admin/publicaciones:
   → Edita nombre, descripción, precio si es necesario
   → Llena campos faltantes: precioCompra, stock, condición, categoría, bodega
   → Aprueba → producto guardado en BD
        ↓
5. Admin hace click "Publicar en Facebook"
   → Se abre Facebook Marketplace en nueva pestaña
   → Extensión Chrome (instalada una vez) detecta la página
   → Llena el formulario automáticamente: título, descripción, precio, condición, fotos
   → Admin solo hace click en "Publicar" en Facebook
```

### Componentes técnicos

| Componente | Tecnología | Propósito |
|---|---|---|
| Identificación de producto | Google Cloud Vision API (Web Detection) | Reconoce el producto desde la foto |
| Extracción de precios | Jsoup + headers realistas | Scrapea páginas ecommerce encontradas por Vision |
| Tipo de cambio | API BCCR (indicador 318) | Convierte USD → CRC en tiempo real |
| Cálculo de precios | Backend Java | IVA 13%, importación 25%, precio sugerido |
| Publicación FB | Extensión Chrome | Llena formulario FB Marketplace desde el panel |
| Scheduler | `@Scheduled` Spring | Genera texto FB para productos nuevos automáticamente |

### Nuevas tablas en BD

| Tabla | Propósito |
|---|---|
| `hot_click_precio_sugerido_tb` | Histórico de precios extraídos por fuente con impuestos |
| `hot_click_publicacion_fb_tb` | Cola de publicaciones Facebook: PENDIENTE → PUBLICADO |

### Variables de entorno nuevas

| Variable | Descripción | Dónde configurar |
|---|---|---|
| `GOOGLE_VISION_API_KEY` | API Key de Google Cloud Vision | Render → Environment |
| `app.publication.enabled` | Activar/desactivar scheduler | `application.properties` |
| `app.publication.interval-minutes` | Intervalo del scheduler (default: 30) | `application.properties` |
| `app.tc.usd.fallback` | Tipo de cambio fallback si BCCR falla (default: 530) | `application.properties` |

### Nueva ruta admin

| Ruta | Componente | Descripción |
|---|---|---|
| `/admin/publicaciones` | `AdminPublicaciones.jsx` | Flujo: subir foto, analizar, editar, guardar, publicar FB |

### Extensión Chrome

Carpeta: `Hot_click_outlet/chrome-extension/`

Instalación (sin publicar en Chrome Web Store):

1. Abrir `chrome://extensions`
2. Activar "Modo desarrollador"
3. Click "Cargar sin empaquetar"
4. Seleccionar la carpeta `chrome-extension/`

La extensión se conecta al backend de Render usando el mismo JWT del admin. La URL del backend se configura una vez en el popup de la extensión.

### Limitaciones conocidas

| Limitación | Motivo | Solución |
|---|---|---|
| Google Vision puede no identificar productos muy genéricos | La imagen es de baja calidad o el producto no tiene presencia web | El admin completa los datos manualmente |
| Jsoup bloqueado por algunos sitios | Anti-bot del sitio | Reintenta hasta 3 veces con headers distintos; marca error y permite ingreso manual |
| FB Marketplace cambia su DOM frecuentemente | Meta actualiza la UI | La extensión se actualiza cuando sea necesario (código abierto, fácil de editar) |

---

## 13. Configuración Google Cloud Vision API

### Pasos para obtener la API Key

1. Ir a [console.cloud.google.com](https://console.cloud.google.com)
2. Crear un proyecto nuevo llamado `hotclick-vision` (o usar uno existente)
3. En el menú lateral: **APIs y servicios → Biblioteca**
4. Buscar **"Cloud Vision API"** → Click → **Habilitar**
5. Ir a **APIs y servicios → Credenciales**
6. Click **"Crear credenciales" → "Clave de API"**
7. Copiar la clave generada (formato: `AIzaSy...`)
8. Click en **"Restringir clave"** (recomendado):
   - En "Restricciones de API": seleccionar solo **Cloud Vision API**
9. Agregar la clave en Render: **Dashboard → hotclick-outlet → Environment → Add Variable**
   - Key: `GOOGLE_VISION_API_KEY`
   - Value: `AIzaSy...` (tu clave)

### Cuota gratuita

| Recurso | Límite gratuito | Costo extra |
|---|---|---|
| Web Detection (búsqueda inversa) | **1,000 solicitudes/mes** | $1.50 por cada 1,000 adicionales |
| Label Detection (identificar objetos) | 1,000 solicitudes/mes | $1.50 por cada 1,000 adicionales |

Para el volumen típico de un outlet (20-50 productos/mes), el tier gratuito es suficiente.

### Qué devuelve Vision API para un producto

```json
{
  "webDetection": {
    "bestGuessLabels": [{ "label": "Samsung Galaxy A55 5G" }],
    "webEntities": [
      { "description": "Samsung Galaxy A55", "score": 0.97 },
      { "description": "Android smartphone", "score": 0.85 }
    ],
    "pagesWithMatchingImages": [
      { "url": "https://www.amazon.com/...", "pageTitle": "Samsung Galaxy A55 - Amazon" },
      { "url": "https://encuentra24.com/...", "pageTitle": "Samsung Galaxy A55 en venta CR" }
    ],
    "fullMatchingImages": [
      { "url": "https://m.media-amazon.com/images/..." }
    ]
  }
}
```

El backend usa `bestGuessLabels` como nombre del producto y `pagesWithMatchingImages` para buscar precios con Jsoup.
