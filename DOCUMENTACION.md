# HOTCLICK Outlet — Documentación Técnica

> Versión: 2.1 | Fecha: 2026-05-13 | Stack migrado a React 19 + Vite

---

## 1. Resumen Ejecutivo

**HOTCLICK Outlet** es una plataforma e-commerce B2C para el mercado costarricense. Los usuarios exploran el catálogo, agregan al carrito y realizan pedidos. Los administradores gestionan inventario, bodegas, usuarios y ventas desde un panel React dedicado.

**Stack**: Spring Boot 3.4.4 + Java 21 (backend API) + React 19 + Vite (frontend SPA) + Supabase PostgreSQL.

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
- ~30 tablas con prefijo `hot_click_*_tb`
- Schema definido en `Hot_click_outlet/Actualizado.sql`
- HikariCP con pool limitado al plan gratuito de Supabase

### Integraciones Externas

| Servicio | Propósito |
|---|---|
| Supabase PostgreSQL | Base de datos principal |
| Supabase Storage | Imágenes de productos (bucket `HOT_CLICK`) — upload directo desde React |
| Gmail SMTP | Verificación de email, reset de contraseña |
| Google Authenticator | 2FA TOTP (RFC 6238) |
| PayXpert | Pasarela de pago (pendiente activación) |

---

## 3. Tecnologías

| Categoría | Tecnología | Versión |
|---|---|---|
| Lenguaje backend | Java | 21 |
| Framework backend | Spring Boot | 3.4.4 |
| Seguridad | Spring Security + JJWT | 0.11.5 |
| 2FA | dev.samstevens.totp | 1.7.1 |
| ORM | Spring Data JPA / Hibernate | (incluido en Boot) |
| Base de datos | PostgreSQL (Supabase) | 15 |
| Build backend | Maven local (`maven/bin/`) | — |
| Frontend | React | 19 |
| Bundler | Vite | — |
| Estado global | Zustand | — |
| HTTP client | Axios | — |
| Query cache | TanStack Query | — |
| Animaciones | Framer Motion | — |
| Contenerización | Docker + docker-compose | — |
| Deploy | Render.com | — |

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
│   ├── service/                         ← lógica de negocio
│   └── utils/
│       └── Constants.java               ← estados, roles, estados de pedido
├── src/main/resources/
│   ├── application.properties           ← DB, SMTP, Supabase, JWT
│   ├── static/                          ← build React (generado por npm run build)
│   └── Actualizado.sql                  ← schema completo de la BD
└── frontend/                            ← fuente React
    ├── src/
    │   ├── App.jsx                      ← rutas + guards (ProtectedRoute, AdminRoute)
    │   ├── pages/
    │   │   ├── admin/                   ← panel admin (Dashboard, Products, Orders…)
    │   │   └── (tienda pública)
    │   ├── services/
    │   │   ├── api.js                   ← Axios instance + interceptores
    │   │   ├── productService.js        ← normalizeProduct, denormalizeProduct
    │   │   └── orderService.js          ← orderService, ventaService, adminService, warehouseService
    │   ├── store/
    │   │   └── authStore.js             ← Zustand: token, userId, userRole, userName
    │   ├── layouts/
    │   │   ├── MainLayout.jsx
    │   │   └── AdminLayout.jsx
    │   └── components/ui/               ← Button, Input, Modal, Badge, Toast, Spinner
    ├── vite.config.js                   ← proxy /api → :8080, outDir → ../src/main/resources/static
    └── package.json
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
- Detalle de producto (especificaciones, cómo usar, imágenes)
- Productos destacados en inicio
- Carrito persistente con reserva de stock

### Panel Admin

| Página | Ruta | Funcionalidad |
|---|---|---|
| Dashboard | `/admin` | Métricas: usuarios, productos, pedidos, ventas, stock bajo, pendientes aprobación |
| Productos | `/admin/productos` | CRUD + subida imagen a Supabase, toggle destacado, filtros |
| Categorías | `/admin/categorias` | CRUD |
| Bodegas | `/admin/bodegas` | CRUD |
| Pedidos | `/admin/pedidos` | Listado por estado, cambio de estado |
| Usuarios | `/admin/usuarios` | Listado, aprobar/rechazar, cambiar rol y estado |
| Nueva Venta | `/admin/ventas` | Venta con cliente, venta rápida, cotización WhatsApp |
| Finanzas | `/admin/finanzas` | Ventas filtradas por fecha/método/estado |
| Reportes | `/admin/reportes` | Análisis de ventas |

### Stock e Inventario

- `stockActual − stockReservado = stockDisponible`
- `SELECT FOR UPDATE` evita sobreventa concurrente
- Auditoría completa en `hot_click_movimiento_stock_tb`
- Ajuste manual de entrada desde admin

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
|---|---|
| `ADMIN_IT` | Panel admin completo incluyendo gestión de usuarios |
| `ADMIN_CLIENTE` | Panel admin sin gestión de usuarios |
| `USUARIO_FINAL` | Tienda pública, carrito, pedidos propios |

### Variables de entorno (Render / producción)

| Variable | Propósito |
|---|---|
| `SPRING_DATASOURCE_URL` | URL JDBC Supabase con Transaction Pooler |
| `SPRING_DATASOURCE_PASSWORD` | Contraseña PostgreSQL |
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_KEY` | Service Role Key de Supabase Storage |
| `MAIL_USERNAME` | Cuenta Gmail SMTP |
| `MAIL_PASSWORD` | App Password Gmail |
| `JWT_SECRET` | Clave secreta para firmar tokens JWT |

---

## 8. Convenciones de Código

- **Naming BD**: `PhysicalNamingStrategyStandardImpl` — los nombres de entidad deben coincidir exactamente con los de la BD (minúsculas con guiones bajos)
- **Montos**: siempre enteros en colones costarricenses (₡), sin decimales
- **`ddl-auto=none`**: NUNCA cambiar este valor; todo cambio de schema se aplica manualmente con `Actualizado.sql`
- **ResponseDTO**: todos los endpoints retornan `{ success: boolean, message: string, data: any }`
- **normalizeProduct / denormalizeProduct**: usar estas funciones en el frontend para mapear campos backend ↔ formulario React

---

## 9. Problemas Conocidos / Deuda Técnica

| Problema | Severidad | Notas |
|---|---|---|
| Supabase key expuesta en `AdminProducts.jsx` | Media | El service role key está en el código frontend para upload de imágenes; debería ir por el backend |
| JWT en `localStorage` | Baja | Vulnerable a XSS; alternativa es `httpOnly` cookie |
| Sin rate limiting en `/api/auth/**` | Media | Solo tiene bloqueo de cuenta por intentos fallidos |
| Carga EAGER de roles en Usuario | Baja | `ManyToMany(fetch=EAGER)` puede causar N+1 en listados masivos |
| Sin tests de integración | Media | Directorio `test/` existe pero vacío |
| `ddl-auto=none` requiere gestión manual de migraciones | Media | Considerar Flyway para auditoría |

---

## 10. Comandos de Desarrollo

```bash
# Iniciar backend
.\maven\bin\mvn spring-boot:run

# Iniciar frontend (dev server con hot reload)
cd Hot_click_outlet/frontend
npm run dev                  # puerto 3000

# Build de producción (actualiza static/ que sirve Spring Boot)
npm run build

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
