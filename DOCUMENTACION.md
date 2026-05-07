# HOTCLICK Outlet — Documentación Técnica Completa

> Versión del documento: 1.3 | Fecha: 2026-05-06 | Actualizado con sistema de diseño UI, filtros de catálogo y carousel de proceso

---

## 1. Resumen Ejecutivo

**HOTCLICK Outlet** es una plataforma de e-commerce B2C orientada al mercado costarricense. Permite a usuarios finales explorar un catálogo de productos, agregarlos al carrito y realizar pedidos; mientras que los administradores gestionan inventario, bodegas, usuarios y métricas de negocio desde un panel dedicado.

**Problema que resuelve:** centraliza la operación de venta en línea de HOTCLICK —actualmente con poco más de un mes de actividad— proveyendo un sistema completo con autenticación segura, gestión de stock, subida de imágenes a la nube, cotizaciones para WhatsApp, y un sistema de fidelización con ruleta de premios y referidos.

**Tipo de sistema:** E-commerce full-stack monolítico (Spring Boot + HTML/CSS/JS vanilla + Supabase).

---

## 2. Arquitectura del Sistema

### Backend
- Patrón MVC clásico con capas Controller → Service → Repository → Entity.
- Spring Security con JWT stateless + 2FA TOTP (Google Authenticator).
- Hibernate/JPA con DDL `update` (el schema se auto-gestiona en Supabase PostgreSQL).
- Soft deletes universales: cada entidad tiene un campo `estado` que apunta a `hot_click_estado_tb`.

### Frontend
- HTML5 estático servido por Spring Boot desde `resources/static/`.
- JavaScript modular vanilla (sin framework) dividido en: `api.js`, `auth.js`, `cart.js`, `products.js`, `scanner.js`, `modals.js`, `ui.js`, `utils.js`, `app.js`.
- Panel de administración separado en `/admin/` con su propio CSS y JS.
- Diseño mobile-first con `responsive.css`.
- Animaciones con **GSAP 3.12.5 + ScrollTrigger** (CDN).
- Sistema de diseño propio basado en tokens CSS (sección 12).

### Base de Datos
- PostgreSQL 15 en Supabase (Session Pooler, región `aws-1-us-east-2`).
- 23 tablas con prefijo `hot_click_*_tb`.
- Nomenclatura física en MAYÚSCULAS via `UpperCaseNamingStrategy`.
- HikariCP con máximo 5 conexiones (ajustado al plan gratuito de Supabase).

### Integraciones Externas

| Servicio | Propósito | Credencial |
|---|---|---|
| Supabase PostgreSQL | Base de datos principal | `DB_PASSWORD` env |
| Supabase Storage | Imágenes de productos (bucket `HOT_CLICK`) | `SUPABASE_KEY` env |
| Gmail SMTP | Verificación de email, reset de contraseña | `MAIL_USERNAME/PASSWORD` env |
| Google Authenticator | 2FA TOTP (RFC 6238) | Secret en BD |

### Diagrama Lógico (texto)

```
Browser ──HTTP──► Spring Boot (puerto 8080)
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
    SecurityConfig  Controllers  Static Files
    (JWT Filter)    (REST API)   (HTML/JS/CSS)
          │            │
          └────────────►  Services
                            │
                        Repositories
                            │
                        Supabase PostgreSQL
                            
    Services ──HTTP──► Supabase Storage (imágenes)
    Services ──SMTP──► Gmail (emails)
```

---

## 3. Tecnologías Utilizadas

| Categoría | Tecnología | Versión |
|---|---|---|
| Lenguaje | Java | 21 |
| Framework | Spring Boot | 3.4.4 |
| Seguridad | Spring Security + JJWT | 0.11.5 |
| 2FA | dev.samstevens.totp | 1.7.1 |
| ORM | Spring Data JPA / Hibernate | (incluido en Boot) |
| Base de datos | PostgreSQL (Supabase) | 15 |
| Email | Spring Mail + Gmail SMTP | — |
| Almacenamiento | Supabase Storage REST API | — |
| API Docs | SpringDoc OpenAPI (Swagger UI) | 2.6.0 |
| Build | Maven local (`maven/bin/`) | — |
| Reducción boilerplate | Lombok | — |
| Frontend | HTML5 + CSS3 + JS vanilla | — |
| Despliegue | Render (render.yaml en raíz) | — |
| Contenedores | Docker / docker-compose (opcionales) | — |

---

## 4. Estructura del Proyecto

```
Hot_click_outlet/
├── src/main/java/com/hotclick/
│   ├── HotclickApplication.java          ← Punto de entrada Spring Boot
│   ├── config/
│   │   ├── DataSeeder.java               ← Siembra estados, roles, admin por defecto
│   │   ├── GlobalExceptionHandler.java   ← Maneja errores globales (ej: 413 upload)
│   │   ├── SecurityConfig.java           ← Reglas de autenticación/autorización
│   │   ├── UpperCaseNamingStrategy.java  ← Nombres de tabla/columna en MAYÚSCULAS
│   │   └── WebConfig.java                ← CORS para /api/**
│   ├── controller/                       ← Capa HTTP: recibe requests, llama services
│   ├── dto/                              ← Objetos de transferencia (request/response)
│   ├── model/                            ← Entidades JPA (19 clases)
│   ├── repository/                       ← Interfaces JPA (14 repositorios)
│   ├── security/
│   │   ├── JwtUtil.java                  ← Generación y validación de tokens JWT
│   │   └── JwtRequestFilter.java         ← Interceptor: extrae JWT de cada request
│   ├── service/                          ← Lógica de negocio (12 servicios)
│   └── utils/
│       └── Constants.java                ← IDs de estados, nombres de roles
└── src/main/resources/
    ├── application.properties            ← Configuración (DB, SMTP, Supabase)
    ├── ssl/prod-ca-2021.crt              ← Certificado SSL Supabase
    └── static/
        ├── index.html                    ← Redirect a pages/index.html
        ├── pages/                        ← Páginas públicas (10 páginas)
        ├── admin/                        ← Panel administrador (6 páginas)
        ├── css/                          ← Estilos globales y responsive
        └── js/                           ← Módulos JS del frontend
```

### Responsabilidades por capa

| Capa | Responsabilidad |
|---|---|
| `controller` | Recibir HTTP, validar básico, delegar a service, formatear respuesta con `ResponseDTO` |
| `service` | Lógica de negocio, validaciones complejas, transacciones |
| `repository` | Queries JPA/JPQL, ninguna lógica de negocio |
| `model` | Entidades de dominio con anotaciones JPA |
| `dto` | Contratos de entrada/salida de la API; desacoplan modelos de la red |
| `security` | Filtro JWT por request, utilitario de tokens |
| `config` | Beans de infraestructura, siembra inicial, estrategia de nombres |
| `utils` | Constantes compartidas (IDs de estado, strings de rol) |

---

## 5. Funcionalidades Implementadas

### Autenticación y Seguridad
- Registro con verificación de email (código 6 dígitos, 10 min de expiración)
- Login con JWT (24h de validez) + flujo de 2FA TOTP (Google Authenticator)
- Token temporal de 5 min para el paso intermedio del 2FA
- Recuperación de contraseña por email (código 6 dígitos)
- Bloqueo automático de cuenta tras 5 intentos fallidos

### Gestión de Usuarios (Admin)
- Flujo de aprobación: usuario se registra como PENDIENTE → admin aprueba/rechaza
- Cambio de rol, cambio de estado (activar/suspender)
- Listado con filtros por estado

### Gestión de Productos
- CRUD completo con soft delete
- Generación automática de SKU
- Subida de imágenes a Supabase Storage (validación tipo/tamaño)
- Campos de negocio: precio compra/venta, margen, ROI, stock mínimo/máximo
- Filtros: por categoría, bodega, destacados, artículos únicos, stock bajo
- Paginación en listados públicos

### Catálogo Público
- Listado paginado de productos visibles (visibleCatalogo=true, stock>0)
- Detalle de producto con imágenes
- Filtro por categoría
- Productos destacados
- **Sidebar de filtros** (precio, disponibilidad, categoría) en `productos.html`
- **Skeleton loading** durante la carga inicial de productos
- **Resultado en tiempo real** — contador de productos actualizado con cada filtro

### Carrito de Compras
- Carrito persistente por usuario (ACTIVO/ABANDONADO/CONVERTIDO)
- Agregar ítems con **reserva de stock** (bloqueo pesimista `SELECT FOR UPDATE`)
- Total calculado automáticamente
- Vaciar carrito libera automáticamente todas las reservas de stock
- Al finalizar compra, el carrito se marca como CONVERTIDO de forma atómica

### Gestión de Stock e Inventario

- **Validación estricta**: nunca se puede vender más unidades de las disponibles
- **Stock disponible** = `stockActual − stockReservado` (reservas en carritos activos)
- **Control de concurrencia**: `SELECT FOR UPDATE` en PostgreSQL evita sobreventa simultánea
- **Descuento automático** de stock al confirmar cada venta
- **Auditoría completa**: tabla `hot_click_movimiento_stock_tb` registra cada cambio con foto anterior/posterior
- **Ajuste manual de entrada** (reposición de inventario) desde el panel admin
- Marcado automático de artículos únicos como `vendido=true` al venderse

### Pedidos
- Creación con numeroPedido único (ORD-{timestamp})
- Transición de estados: PENDIENTE → CONFIRMADO → PREPARANDO → ENVIADO → ENTREGADO / CANCELADO
- Historial por usuario con paginación
- Vista detallada con ítems y datos del cliente para admin

### Cotizaciones (WhatsApp)
- Generación de cotización con productos y precios
- Mensaje formateado para enviar por WhatsApp

### Dashboard Administrativo
- Métricas: total usuarios, productos, pedidos, ventas
- Pedidos pendientes, productos con stock bajo
- Conteo de productos por categoría
- Último pedido con detalle

### Sistema de Ruleta / Premios
- Entidades Premio, GiroRuleta, ResultadoRuleta completamente modeladas
- Repositorios con queries de apoyo
- `PremioService` y `PremioController` presentes

### Sistema de Referidos
- Entidades Referido y ReferidoDetalle modeladas en BD
- Código único de referido por usuario

### Infraestructura
- Health endpoint (`GET /api/health`)
- Swagger UI disponible vía SpringDoc
- Dockerfile y docker-compose.yml presentes
- render.yaml con rootDir configurado para Render

### Paginación en Catálogo

- Paginación controlada por `paginaActual` / `totalPaginas` en `productos.html`
- Botones Anterior/Siguiente actualizados según filtros activos
- Variable `_filtradosActuales` separada de `todosLosProductos` para que la paginación opere sobre el conjunto filtrado correctamente

---

## 6. Funcionalidades Pendientes

### Alta prioridad (bloqueantes para negocio)
- **Pasarela de pago**: no existe integración con ningún proveedor de pago (SINPE Móvil, Stripe, PayPal)
- **Checkout completo**: flujo de selección de envío, confirmación y pago desde el frontend
- **Gestión de bodegas desde admin**: `BodegaController` existe pero la página `admin-bodegas.html` puede estar incompleta
- **Historial de pedidos para usuario final**: posiblemente falta la página `mis-pedidos.html`

### Media prioridad
- **Ruleta operativa**: los controladores de `PremioController` y la lógica de girar la ruleta existen en backend, pero el frontend de la ruleta no es visible en los archivos estáticos
- **Sistema de referidos activo**: entidades creadas pero sin controlador ni flujo de UI
- **Notificaciones por email al crear pedido**: no hay evidencia de envío de email al confirmar compra
- **Historial de estados de pedido** (`PEDIDO_HISTORIAL_ESTADO_TB` está en SQL pero no como entidad JPA)
- **Métodos de pago y envío configurables** (`METODO_ENVIO_TB`, `METODO_PAGO_CONFIG_TB` están en SQL pero sin modelo/repositorio)
- **Marcas**: entidad y repositorio existen, pero no hay `MarcaController` CRUD expuesto

### Baja prioridad (mejoras)
- Paginación en el frontend (actualmente carga todos los productos)
- Búsqueda de productos desde la barra del header
- Imagen de perfil del usuario (campo `fotoPerfilUrl` existe pero no hay flujo de upload para usuarios)
- Página de detalle de pedido para usuario final

---

## 7. Problemas Detectados

### Configuración y Seguridad
- **Credenciales hardcodeadas en `application.properties`**: la contraseña del admin por defecto (`Admin1234!`), la clave JWT (`SECRET_KEY` de 64 chars en `JwtUtil.java`), y credenciales de Supabase aparecen directamente en el archivo de propiedades en lugar de variables de entorno exclusivamente. En producción en Render, se configuran como env vars, pero el archivo local contiene valores reales que no deberían commitearse.
- **DDL auto = update en producción**: Hibernate en modo `update` puede causar migraciones implícitas no auditadas. Se recomienda Flyway o Liquibase.
- **Falta de rate limiting**: los endpoints de login, forgot-password y send-verification no tienen protección contra fuerza bruta a nivel HTTP (solo el bloqueo de cuenta por intentos fallidos).

### Arquitectura Backend
- **`UpperCaseNamingStrategy` vs convención Spring**: la estrategia en mayúsculas puede generar inconsistencias si alguna query nativa o SQL externo usa minúsculas.
- **`AdminCliente` referenciado en múltiples entidades sin consistencia**: Producto, Categoria, Bodega, Premio y Marca tienen un campo `adminCliente` (FK a Usuario). No hay restricción que valide que el usuario asignado tenga efectivamente el rol `ADMIN_CLIENTE`.
- **Carga EAGER de roles en Usuario**: `ManyToMany(fetch = EAGER)` puede causar N+1 queries en listados masivos de usuarios.
- ~~**Sin transacciones explícitas (`@Transactional`)**: la mayoría de services no anotan los métodos~~ → **RESUELTO** en v1.2: `VentaService`, `CarritoService` y `StockService` usan `@Transactional` con bloqueo pesimista explícito.

### Frontend
- **Sin manejo centralizado de errores HTTP**: el archivo `api.js` probablemente maneja errores request a request sin una capa unificada de feedback al usuario.
- **JWT almacenado en localStorage**: vulnerable a XSS. Preferible `httpOnly` cookie, aunque eso requiere ajustes en el backend.
- **Sin validación de formularios del lado cliente**: la validación ocurre solo en backend; UX puede ser mejorada con validación inmediata.

### Datos
- **`DataSeeder` no es idempotente por diseño propio**: verifica existencia antes de insertar, lo cual es correcto, pero si los datos iniciales cambian, no actualiza registros existentes.

---

## 8. Seguridad y Configuración

### Autenticación y Autorización
- JWT RS/HS256 con expiración de 24h; token temporal de 5 min para 2FA
- Rutas públicas configuradas en `SecurityConfig`: GET de productos, categorías, auth/*, health, archivos estáticos y admin HTML
- Roles: `ADMIN_IT` (nivel alto), `ADMIN_CLIENTE` (nivel medio), `USUARIO_FINAL` (nivel básico)

### Variables de Entorno (deben configurarse en Render / producción)

| Variable | Propósito |
|---|---|
| `SPRING_DATASOURCE_PASSWORD` | Contraseña PostgreSQL Supabase |
| `SUPABASE_KEY` | Service Role Key de Supabase |
| `MAIL_USERNAME` | Cuenta Gmail para SMTP |
| `MAIL_PASSWORD` | App Password de Gmail |
| `JWT_SECRET` | (Recomendado externalizarlo) |
| `ADMIN_DEFAULT_PASSWORD` | (Recomendado externalizarlo) |

### Configuración Sensible Identificada
- La clave JWT está hardcodeada en `JwtUtil.java` como string literal. Debe moverse a `application.properties` o env var.
- El certificado SSL de Supabase (`prod-ca-2021.crt`) está incluido en el jar, lo cual es correcto para producción.

---

## 9. Recomendaciones Técnicas

### Inmediatas (antes de escalar)
1. **Externalizar todas las credenciales** a variables de entorno y eliminar valores reales del repositorio Git. Considerar `.env.example` como documentación.
2. **Mover la `SECRET_KEY` de JWT** a `application.properties` con `${JWT_SECRET}` para que sea inyectable.
3. ~~**Agregar `@Transactional`**~~ → **COMPLETADO en v1.2**: `VentaService`, `CarritoService` y `StockService` implementan transacciones con bloqueo pesimista `SELECT FOR UPDATE`.
4. **Agregar rate limiting** en endpoints de autenticación (Spring's `RateLimiter` o Bucket4j).

### Mediano plazo
5. **Reemplazar DDL `update` con Flyway**: versionar el schema permite deploys seguros y auditoría.
6. **Cambiar fetch EAGER a LAZY** en `Usuario.roles` y agregar `@EntityGraph` donde se necesiten los roles.
7. **Paginación en el frontend**: cargar productos en bloques de 20 con scroll infinito o botón "cargar más".
8. **Tests de integración**: actualmente `test/` existe pero sin tests. Priorizar `AuthController` y `ProductoService`.

### Largo plazo
9. **Migrar imágenes a Cloudinary** (el campo `publicIdCloudinary` en `ProductoImagen` ya sugiere esto): más funcionalidades de transformación que Supabase Storage.
10. **Separar frontend**: si el tráfico crece, servir el frontend desde CDN (Netlify/Vercel) y el backend como API pura.
11. **WebSockets o SSE** para notificaciones de estado de pedido en tiempo real.

---

## 10. Plan de Continuación

### Fase 1 — Estabilización (1–2 semanas)

**Prioridad 1: Seguridad de configuración**
- [ ] Mover JWT secret y contraseña admin a variables de entorno
- [ ] Verificar que `application.properties` commiteado no tenga credenciales reales
- [ ] Agregar `@Transactional` en `CarritoService.agregarItem`, `PedidoService.crearPedido`, `EmailVerificationService.verificarYRegistrar`

**Prioridad 2: Completar flujo de compra**
- [ ] Crear página `mis-pedidos.html` para el usuario final
- [ ] Conectar el botón "Finalizar compra" del carrito al endpoint `POST /api/pedidos`
- [ ] Implementar confirmación por email al crear pedido (en `PedidoService.crearPedido`)

### Fase 2 — Features de Negocio (2–4 semanas)

**Pago y checkout**
- [ ] Integrar SINPE Móvil (flujo manual: usuario sube comprobante → admin confirma) como primera solución
- [ ] Modelar `MetodoPago` y conectar con `Pedido`
- [ ] Opcionalmente integrar Stripe para tarjetas

**Ruleta operativa**
- [ ] Crear página `ruleta.html` con interfaz animada
- [ ] Conectar `GiroRuletaController` para asignar y consumir giros
- [ ] Asignar giro al completar primer pedido

**Búsqueda y UX**
- [ ] Implementar barra de búsqueda conectada a `GET /api/productos?buscar={term}`
- [ ] Agregar paginación en `productos.html`

### Fase 3 — Escala y Calidad (4–8 semanas)

- [ ] Agregar Flyway para gestionar migraciones
- [ ] Escribir tests de integración para flujos críticos (auth, carrito, pedido)
- [ ] Activar sistema de referidos (controlador + UI + lógica de giros por referido)
- [ ] Dashboard con gráficas de ventas (Chart.js en frontend)
- [ ] Configurar logs estructurados (Logback JSON) para observabilidad en producción

---

## Apéndice A — Endpoints de la API

| Método | Ruta | Auth | Descripción |
|---|---|---|---|
| GET | `/api/health` | No | Estado del servicio |
| POST | `/api/auth/send-verification` | No | Inicia registro con email |
| POST | `/api/auth/verify-registration` | No | Completa registro |
| POST | `/api/auth/login` | No | Login → JWT o tempToken |
| POST | `/api/auth/2fa/verify` | No | Verifica código TOTP |
| POST | `/api/auth/2fa/setup` | Sí | Genera QR para 2FA |
| POST | `/api/auth/2fa/activate` | Sí | Activa 2FA |
| POST | `/api/auth/forgot-password` | No | Envía código de reset |
| POST | `/api/auth/reset-password` | No | Cambia contraseña |
| GET | `/api/productos` | No | Listado paginado |
| GET | `/api/productos/{id}` | No | Detalle de producto |
| POST | `/api/productos` | Sí | Crear producto |
| PUT | `/api/productos/{id}` | Sí | Actualizar producto |
| DELETE | `/api/productos/{id}` | Sí | Eliminar (soft) |
| POST | `/api/productos/imagen` | Sí | Subir imagen |
| GET | `/api/categorias` | No | Listado de categorías |
| POST | `/api/categorias` | Sí | Crear categoría |
| GET | `/api/carrito/{usuarioId}` | Sí | Obtener carrito activo |
| POST | `/api/carrito/{carritoId}/items` | Sí | Agregar ítem |
| DELETE | `/api/carrito/{carritoId}/vaciar` | Sí | Vaciar carrito |
| POST | `/api/pedidos` | Sí | Crear pedido |
| GET | `/api/pedidos/{id}` | Sí | Obtener pedido |
| PUT | `/api/pedidos/{id}/estado` | Sí | Cambiar estado |
| POST | `/api/cotizaciones` | No | Crear cotización |
| GET | `/api/admin/dashboard` | Sí | Métricas del dashboard |
| GET | `/api/admin/usuarios` | Sí | Listar usuarios |
| PUT | `/api/admin/usuarios/{id}/aprobar` | Sí | Aprobar usuario |
| GET | `/api/pedidos` | Sí | Listar todos los pedidos con detalles (admin) |
| GET | `/api/pedidos/pendientes` | Sí | Pedidos en estado PENDIENTE |
| GET | `/api/pedidos/usuario/{id}` | Sí | Pedidos de un usuario con paginación |
| POST | `/api/ventas` | Sí | Crear venta con validación y descuento de stock |
| GET | `/api/ventas/clientes` | Sí | Buscar clientes para selector del panel admin |
| GET | `/api/stock/movimientos/{productoId}` | Sí | Historial de movimientos de stock de un producto |
| POST | `/api/stock/ajuste-entrada/{productoId}` | Sí | Reposición manual de inventario |
| GET | `/api/bodegas` | No | Listar bodegas |
| POST | `/api/bodegas` | Sí | Crear bodega |
| PUT | `/api/bodegas/{id}` | Sí | Actualizar bodega |
| DELETE | `/api/bodegas/{id}` | Sí | Eliminar bodega (soft) |
| GET | `/api/admin/usuarios` | Sí | Listar todos los usuarios |
| PUT | `/api/admin/usuarios/{id}/aprobar` | Sí | Aprobar usuario pendiente |
| PUT | `/api/admin/usuarios/{id}/estado` | Sí | Cambiar estado de usuario |

## Apéndice B — Usuario Admin por Defecto

Creado automáticamente por `DataSeeder` al primer arranque:

| Campo | Valor |
|---|---|
| Correo | `admin@hotclick.com` |
| Contraseña | `Admin1234!` |
| Rol | `ADMIN_IT` |
| Estado | `ACTIVO` |

**Cambiar esta contraseña inmediatamente en producción.**

## Apéndice C — Estados del Sistema

---

## 11. Sistema de Stock, Reservas y Auditoría de Inventario

> Implementado en v1.2 (2026-05-04). Aplica a ventas de usuario y ventas manuales del admin.

### 11.1 Regla fundamental

Un producto **nunca puede venderse en cantidad mayor a su stock disponible**. Esta regla se aplica de forma idéntica en el panel de administración y en el flujo de compra del usuario final, sin excepciones.

### 11.2 Campos de stock en `Producto`

| Campo | Columna BD | Descripción |
|---|---|---|
| `stockActual` | `STOCK_ACTUAL` | Unidades físicas reales en inventario |
| `stockReservado` | `STOCK_RESERVADO` | Unidades en carritos activos (no vendidas aún) |
| `stockDisponible` | *(calculado)* | `stockActual − stockReservado` — lo que aún puede venderse |
| `stockMinimo` | `STOCK_MINIMO` | Umbral de alerta de stock bajo |

### 11.3 Flujo completo de estados de stock

```text
                     CARRITO
     ┌───────────────────────────────────────────┐
     │                                           │
     │  agregarItem()          vaciarCarrito()   │
     │  stockReservado++       stockReservado--  │
     │  (con SELECT FOR UPDATE)                  │
     └──────────────┬────────────────────────────┘
                    │ POST /api/ventas (con carritoId)
                    ▼
              VENTA DESDE CARRITO
              stockActual--
              stockReservado--   ← libera reserva previa
              estado carrito = CONVERTIDO

     POST /api/ventas (sin carritoId, admin directo)
              stockActual--      ← valida contra stockDisponible
              stockReservado sin cambio
```

### 11.4 Control de concurrencia

Se usa **bloqueo pesimista** (`SELECT FOR UPDATE` en PostgreSQL) para evitar sobreventa cuando dos usuarios compran el mismo producto simultáneamente:

```sql
-- Lo que Hibernate ejecuta al llamar findByIdForUpdate()
SELECT * FROM HOT_CLICK_PRODUCTO_TB WHERE ID_PRODUCTO = ? FOR UPDATE
```

**Comportamiento con concurrencia:**

```text
Transacción A (usuario 1): SELECT FOR UPDATE id=5  → adquiere lock, stock=1
Transacción B (usuario 2): SELECT FOR UPDATE id=5  → ESPERA (bloqueado por A)

A: valida stock=1 >= cant=1 ✓ → UPDATE stock=0 → COMMIT → libera lock
B: continúa → lee stock=0 → lanza StockInsuficienteException → ROLLBACK
```

**Resultado:** usuario 1 compra exitosamente, usuario 2 recibe error claro. Stock nunca queda en negativo.

### 11.5 Jerarquía de servicios de inventario

```text
VentaService          CarritoService
     │                      │
     └──────────┬───────────┘
                ▼
          StockService
          ┌─────────────────────────────────┐
          │ reservar()                      │
          │ liberarReserva()                │
          │ descontarPorVenta()             │
          │ ajustarEntrada()                │
          │ → registra MovimientoStock      │
          └────────────┬────────────────────┘
                       ▼
          ProductoRepository  MovimientoStockRepository
```

**Sin dependencias circulares:** `StockService` no depende de `VentaService` ni `CarritoService`.

### 11.6 Manejo de excepciones de stock

| Clase | HTTP | Cuándo se lanza |
|---|---|---|
| `StockInsuficienteException` | `409 Conflict` | `stockDisponible < cantidadSolicitada` al vender o reservar |
| `IllegalArgumentException` | `400 Bad Request` | `cantidad <= 0`, lista de ítems vacía |
| `RuntimeException` | `400 Bad Request` | Producto no activo, artículo único ya vendido |

**Mensaje de error ejemplo:**

```json
{
  "success": false,
  "message": "Stock insuficiente para 'Teclado Mecánico RGB': disponible=2, solicitado=5"
}
```

### 11.7 Auditoría de movimientos (`MovimientoStock`)

Tabla: `hot_click_movimiento_stock_tb`

| Columna | Tipo | Descripción |
|---|---|---|
| `ID_MOVIMIENTO` | BIGINT PK | Identificador autoincremental |
| `FK_ID_PRODUCTO` | BIGINT FK | Producto al que aplica el movimiento |
| `TIPO_MOVIMIENTO` | VARCHAR(30) | `VENTA`, `RESERVA`, `LIBERACION_RESERVA`, `AJUSTE_ENTRADA`, `AJUSTE_SALIDA` |
| `CANTIDAD` | INT | Unidades del movimiento |
| `STOCK_ACTUAL_ANTES` | INT | Foto de `stockActual` antes de la operación |
| `STOCK_ACTUAL_DESPUES` | INT | Foto de `stockActual` después |
| `STOCK_RESERVADO_ANTES` | INT | Foto de `stockReservado` antes |
| `STOCK_RESERVADO_DESPUES` | INT | Foto de `stockReservado` después |
| `REFERENCIA` | VARCHAR(100) | Número de pedido (`ORD-xxx`) o `carrito-{id}` |
| `OPERADOR_CORREO` | VARCHAR(200) | Correo del usuario que generó el movimiento |
| `FECHA_MOVIMIENTO` | TIMESTAMP | Momento exacto de la operación |
| `NOTAS` | VARCHAR(500) | Descripción libre (ajustes manuales) |

**Ejemplo de historial para un producto:**

```json
[
  {
    "tipoMovimiento": "VENTA",
    "cantidad": 1,
    "stockActualAntes": 5,
    "stockActualDespues": 4,
    "stockReservadoAntes": 1,
    "stockReservadoDespues": 0,
    "referencia": "ORD-1746413000000",
    "operadorCorreo": "cliente@gmail.com",
    "fechaMovimiento": "2026-05-04T20:42:00"
  },
  {
    "tipoMovimiento": "RESERVA",
    "cantidad": 1,
    "stockActualAntes": 5,
    "stockActualDespues": 5,
    "stockReservadoAntes": 0,
    "stockReservadoDespues": 1,
    "referencia": "carrito-12",
    "operadorCorreo": "carrito-usuario",
    "fechaMovimiento": "2026-05-04T20:38:00"
  }
]
```

### 11.8 Checkout desde carrito vs. venta directa admin

El campo `carritoId` en `VentaRequestDTO` es opcional y determina el comportamiento:

| Escenario | `carritoId` | Valida contra | Libera reserva | Convierte carrito |
| --- | --- | --- | --- | --- |
| Usuario finaliza compra | Sí | `stockActual` (reserva ya es suya) | ✅ Sí | ✅ Sí → CONVERTIDO |
| Admin crea venta manual | No | `stockDisponible` (respeta reservas) | ❌ No aplica | ❌ No aplica |

### 11.9 Endpoint de ajuste manual de stock

```http
POST /api/stock/ajuste-entrada/{productoId}
Authorization: Bearer {jwt}
Content-Type: application/json

{
  "cantidad": 10,
  "notas": "Reposición proveedor Amazon — factura #4521"
}
```

- Requiere autenticación.
- Usa `SELECT FOR UPDATE` internamente.
- Registra un `MovimientoStock` de tipo `AJUSTE_ENTRADA`.

### 11.10 Archivos implementados en v1.2

| Archivo | Tipo | Descripción |
|---|---|---|
| `exception/StockInsuficienteException.java` | Nuevo | Excepción tipada con stock disponible y solicitado |
| `model/MovimientoStock.java` | Nuevo | Entidad de auditoría de movimientos |
| `repository/MovimientoStockRepository.java` | Nuevo | Queries de historial por producto y tipo |
| `service/StockService.java` | Nuevo | Servicio central: reservar, liberar, descontar, ajustar |
| `service/VentaService.java` | Nuevo | Lógica de venta extraída del controller, con lock pesimista |
| `controller/StockController.java` | Nuevo | Endpoints de historial y ajuste manual |
| `model/Producto.java` | Modificado | Campo `stockReservado` + método `getStockDisponible()` |
| `dto/VentaRequestDTO.java` | Modificado | Campo opcional `carritoId` |
| `service/CarritoService.java` | Modificado | Reserva/libera stock vía `StockService` |
| `repository/ProductoRepository.java` | Modificado | Método `findByIdForUpdate()` con `@Lock(PESSIMISTIC_WRITE)` |
| `config/GlobalExceptionHandler.java` | Modificado | Maneja `StockInsuficienteException` con HTTP 409 |

| ID | Nombre | Uso |
|---|---|---|
| 0 | PENDIENTE | Usuario recién registrado, esperando aprobación |
| 1 | ACTIVO | Registro activo y operativo |
| 2 | INACTIVO | Desactivado temporalmente |
| 3 | ELIMINADO | Soft delete |
| 4 | SUSPENDIDO | Bloqueado por administrador |

---

## 12. Sistema de Diseño UI Frontend

> Implementado en v1.3 (2026-05-06). Reemplazo completo del sistema visual previo. Referencia estética: Apple / Linear / Stripe Press.

### 12.1 Tipografía

| Rol | Familia | Uso |
|---|---|---|
| Display | **Syne** (400, 600, 700, 800) | Títulos, logo, precios, números grandes |
| Body | **DM Sans** (300–700, opsz 9–40) | Todo el texto de UI, botones, inputs |

Ambas fuentes se cargan desde Google Fonts con `display=swap`.

### 12.2 Tokens de Color

| Variable | Valor | Uso |
|---|---|---|
| `--c-ink` | `#0a0a0a` | Botón primario, activos, texto fuerte |
| `--c-ink-hover` | `#1c1c1e` | Hover del botón primario |
| `--c-navy` | `#0D1B2A` | Títulos, footer background, hero dark |
| `--c-blue` | `#1E88E5` | Acentos, links, badge, botón circular "+" |
| `--c-red` | `#E53935` | Errores, precios originales tachados, badges de oferta |
| `--c-green` | `#00897B` | Stock disponible, badge "Nuevo" |
| `--c-cream` | `#F4F0E8` | Background del hero principal |
| `--c-bg` | `#F4F6F9` | Background general de página |
| `--c-white` | `#FFFFFF` | Cards, modales, superficies |
| `--c-border` | `#E8ECF0` | Bordes de separación |
| `--c-muted` | `#7B8A9A` | Texto secundario, placeholders |

### 12.3 Tokens de Radio y Sombra

| Variable | Valor | Uso |
|---|---|---|
| `--r-card` | `14px` | Tarjetas de producto |
| `--r-btn` | `10px` | Botones estándar |
| `--r-full` | `999px` | Botones pill, badges, tabs |
| `--shadow-card` | `0 2px 12px rgba(13,27,42,.08)` | Cards en reposo |
| `--shadow-float` | `0 24px 56px rgba(0,0,0,.11), 0 8px 20px rgba(0,0,0,.07)` | Cards en hover |

### 12.4 Tokens de Movimiento

| Variable | Valor | Uso |
|---|---|---|
| `--transition` | `.18s ease` (bg, color, border, opacity) | Cambios de estado genéricos |
| `--transition-spring` | `.22s cubic-bezier(.23,1,.32,1)` | Hover de cards, botón circle |

### 12.5 Sistema de Botones

Todos los botones tienen `height` fijo (no `padding` vertical) para consistencia cross-browser.

| Clase | Alto | Descripción |
|---|---|---|
| `.btn` | 40px | Base — todos los botones heredan de aquí |
| `.btn-primary` | 40px | Fondo negro `--c-ink`, texto blanco; shine en hover |
| `.btn-outline` | 40px | Borde sutil, fondo transparente |
| `.btn-secondary` | 40px | Fondo `--c-bg` |
| `.btn-ghost` | 40px | Sin borde ni fondo — para contextos sobre blanco |
| `.btn-ghost-light` | 40px | Versión para fondos oscuros (carousel, hero) |
| `.btn-whatsapp` | 40px | Verde WhatsApp |
| `.btn-sm` | 32px | Botón pequeño (filtros, breadcrumbs) |
| `.btn-lg` | 48px | Botón grande (CTAs hero) |
| `.btn-xl` | 56px | Botón extra grande |
| `.btn-pill` | — | Modificador: `border-radius: 999px` |

### 12.6 Sistema de Tarjetas de Producto

```text
┌──────────────────────────┐  ← .product-card (overflow: visible)
│  [imagen 4:3]            │  ← .product-card-image (overflow: hidden, top corners)
│                          │
│              ●+          │  ← .btn-add-circle (top:-18px, z-index:3)
│  CATEGORÍA               │
│  Nombre del producto     │  ← .product-card-body (bottom corners)
│  ▪ 3 disponibles         │
│  ₡45,000          [+]    │
└──────────────────────────┘
```

**Decisión de `overflow`:** El card usa `overflow: visible` para que el botón circular "+" (posicionado `top: -18px`) no quede cortado. El `overflow: hidden` se aplica solo en `.product-card-image` para que la imagen no desborde.

**Hover:** `translateY(-7px)` + `box-shadow: var(--shadow-float)` + overlay gradiente sutil en la imagen.

### 12.7 Sidebar de Filtros — `productos.html`

Layout grid de dos columnas: `210px sidebar + 1fr contenido`.

```text
┌──────────┬──────────────────────────────┐
│ FILTROS  │  Lo mejor                    │
│ ──────── │  disponible ahora            │
│ PRECIO   │  ─────────────────────────── │
│ [slider] │  [card][card][card]          │
│ DISPONI- │  [card][card][card]          │
│ BILIDAD  │                              │
│ ○ Stock  │  ← → Página 1 de 3          │
│ ○ Agotado│                              │
│ CATEG.   │                              │
│ [lista]  │                              │
└──────────┴──────────────────────────────┘
```

**Filtros disponibles:**

| Filtro | Tipo | Comportamiento |
|---|---|---|
| Precio | Range slider `<input type="range">` | Máximo dinámico calculado desde los productos cargados |
| Disponibilidad | Dos checkboxes con dot verde/rojo | Ninguno = todos; solo En Stock = oculta agotados; solo Agotado = oculta en stock; ambos = todos |
| Categoría | Lista de botones verticales | Sincronizado con `<select>` oculto (compatibilidad) |

**Bug corregido (v1.3):** El slider tenía `max` hardcodeado a ₡500 000. Ahora `actualizarSliderPrecio()` calcula el máximo real de los productos y lo redondea al ₡50 000 más cercano.

**Lógica de paginación corregida:** Se usa `_filtradosActuales` (array separado) en lugar de `todosLosProductos._filtrados` (hack previo), para que los botones de página operen correctamente sobre el conjunto filtrado.

### 12.8 Componentes Visuales Nuevos

#### Marquee strip

Banda horizontal navy oscuro que desplaza categorías/temas de la tienda en loop continuo. Aparece después del hero (index.html) y después del page-hero (productos.html).

- CSS puro: `animation: marqueeScroll 26s linear infinite`
- Se pausa al hacer hover (`:hover { animation-play-state: paused }`)
- Duplicado para loop seamless (16 items × 2)

#### Concentric rings (hero visual)

Tres anillos `border: 1px solid rgba(30,136,229,.12)` con `animation: ringBreath` en desfase (0s, 0.9s, 1.8s) alrededor del emoji del hero.

#### Live dot (hero kicker)

El punto del badge "Importado · Limitado · CR" es un círculo verde `#22c55e` con animación `box-shadow` pulsante que imita un indicador de actividad en vivo.

#### Skeleton loading

Reemplaza el texto "📦 Cargando..." con tarjetas esqueleto animadas (`animation: shimmer`). Generadas por `skeletonCards(n)` en JS.

```js
function skeletonCards(n = 6) {
    return Array.from({length: n}, () => `
        <div class="skeleton-card">
            <div class="skeleton-img"></div>
            <div class="skeleton-body">
                <div class="skeleton-line tall w80"></div>
                <div class="skeleton-line w60"></div>
                <div class="skeleton-line w40"></div>
            </div>
        </div>`).join('');
}
```

#### Scroll indicator

Línea vertical animada `translateY` en la parte inferior del hero. Solo visible en desktop; oculto con `display: none` en `≤768px`.

### 12.9 Carousel de Proceso — `index.html`

Sección `<section class="process-section">` entre EXCLUSIVIDAD y CATEGORÍAS.

**4 slides:**

| # | Título | Imagen (Unsplash) |
|---|---|---|
| 01 | Buscamos lo mejor en EE.UU. | `photo-1498049794561-7780e7231661` |
| 02 | Importamos directo, sin intermediarios | `photo-1553413077-190dd305871c` |
| 03 | Cada artículo, en cantidades exclusivas | `photo-1523275335684-37898b6baf30` |
| 04 | Te lo llevamos a donde estés en CR | `photo-1586864387967-d02ef85d93e8` |

**Funcionalidades del carousel:**

- Auto-avance cada 5 segundos; se pausa con `mouseenter` en el contenedor
- Progress bar azul en la parte inferior de la imagen (animación `width: 0% → 100%`)
- Tab bars en la parte superior izquierda (4 líneas que se llenan con `animation: tabFill`)
- Flechas SVG ← → para navegación manual
- Touch swipe: diferencia de 40px entre `touchstart` y `touchend` cambia de slide
- Imagen desliza con `translateX(-${idx * 100}%)` sobre un track flex
- Texto del slide: `animation: pcFadeUp` al activarse
- Número decorativo grande (01, 02…) en `color: rgba(255,255,255,.05)` como fondo tipográfico
- Overlay gradiente lateral conecta el panel oscuro izquierdo con la foto

**Estructura HTML:**

```text
.process-section
  .process-header          ← título centrado
  .process-carousel-box    ← grid 42fr/58fr
    .pc-left               ← panel oscuro (#0f1923)
      .pc-tabs             ← 4 tab bars de progreso
      .pc-content × 4      ← texto de cada slide
      .pc-arrows           ← flechas ← →
    .pc-right              ← panel de imagen
      .pc-img-track        ← flex con 4 slides
      .pc-progress-wrap    ← barra de progreso inferior
```

**Responsive:** En `≤900px` el layout cambia a una columna; la imagen sube arriba (260px de alto) y el texto queda debajo.

### 12.10 Página Nosotros — Rediseño

Estructura de 4 secciones editoriales:

| Sección | Clase | Descripción |
|---|---|---|
| Historia | `.about-story` | Título centrado + imagen wide `aspect-ratio: 21/8` |
| Stats | `.about-stats` `.stats-row` | Grid 4 columnas con `border-left` separadores |
| Misión | `.about-mission` | Grid 50/50: imagen emoji izquierda, texto derecha |
| Valores | `.about-values` | Grid 3 columnas de tarjetas |

### 12.11 Archivos modificados en v1.3

| Archivo | Cambio |
| --- | --- |
| `css/style.css` | Tokens nuevos, hero, botones, cards, skeleton, marquee, rings, carousel, footer, nosotros |
| `pages/index.html` | Hero split + rings, marquee strip, carousel de proceso, skeleton loading |
| `pages/productos.html` | Sidebar de filtros (`<style>` inline), skeleton loading, `_filtradosActuales`, `actualizarSliderPrecio()` |
| `pages/nosotros.html` | Rediseño completo con 4 secciones editoriales |
