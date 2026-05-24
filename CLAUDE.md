# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos principales

El proyecto incluye una instalación local de Maven en `maven/bin/`. Usar `.\maven\bin\mvn` en lugar de `mvn` global.

```bash
# Compilar
.\maven\bin\mvn clean package

# Ejecutar la aplicación
.\maven\bin\mvn spring-boot:run

# Ejecutar pruebas
.\maven\bin\mvn test

# Compilar sin ejecutar pruebas
.\maven\bin\mvn clean package -DskipTests
```

La aplicación corre en `http://localhost:8080`.

## Frontend React (Hot_click_outlet/frontend/)

El frontend React vive dentro del mismo proyecto Spring Boot.

```bash
# Servidor de desarrollo (puerto 3000, proxy /api → 8080)
cd Hot_click_outlet/frontend && pnpm dev

# Build de producción → src/main/resources/static/
cd Hot_click_outlet/frontend && pnpm build

# Build con watch
cd Hot_click_outlet/frontend && pnpm build:watch

# Instalar dependencias
cd Hot_click_outlet/frontend && pnpm install
```

El frontend compilado se sirve desde Spring Boot en producción. `SpaController.java` redirige rutas SPA a `index.html`.

**IMPORTANTE:** Siempre correr `pnpm build` antes de hacer commit. Los archivos compilados en `src/main/resources/static/` son los que se despliegan en Render.

## Regla obligatoria: cambios de esquema DB

**Nunca cambiar una entidad JPA sin crear la migración Flyway correspondiente.**

Cuando agregas o modificas `@Column`, `@Table`, `@JoinColumn` en cualquier entidad de `com.hotclick.model`:

1. Crea el archivo de migración en `Hot_click_outlet/src/main/resources/db/migration/`
2. El nombre sigue el patrón `V{N}__descripcion_breve.sql` (V2, V3, V4…)
3. Usa siempre `IF NOT EXISTS` / `ADD COLUMN IF NOT EXISTS` para que sea idempotente
4. Agrega el mismo SQL al final de `Hot_click_outlet/Actualizado.sql`

```text
Ejemplo: agregás campo en Java → creás V3__nuevo_campo.sql al mismo tiempo
```

Flyway ejecuta las migraciones automáticamente al arrancar en Render. Sin migración → la columna no existe en Supabase → 500 en producción.

Migraciones existentes:

- `V1__initial_schema.sql` — baseline (no se ejecuta, ya estaba aplicado)
- `V2__marcas_y_fk_producto.sql` — tabla marcas, fk_id_marca en producto, testimonio+producto

## Arquitectura

Proyecto Spring Boot 3.4.4 con Java 24. El código vive bajo `Hot_click_outlet/`.

- **Punto de entrada**: `Hot_click_outlet/src/main/java/com/hotclick/AppApplication.java`
- **Paquete base**: `com.hotclick`
- **Controladores REST**: `com.hotclick.controller`
- **Modelos JPA**: `com.hotclick.model`
- **Servicios**: `com.hotclick.service`
- **Repositorios**: `com.hotclick.repository`
- **Seguridad**: `com.hotclick.security` (JWT)
- **Configuración**: `Hot_click_outlet/src/main/resources/application.properties`
- **Base de datos**: PostgreSQL en Supabase (`ddl-auto=none`, esquema en `Hot_click_outlet/Actualizado.sql`)

### Principales endpoints

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/health` | Estado del servicio |
| POST | `/api/auth/login` | Login → JWT |
| POST | `/api/auth/register` | Registro de usuario |
| GET | `/api/productos` | Catálogo paginado |
| GET | `/api/marcas/publicas` | Marcas activas (público, sin auth) |
| GET | `/api/marcas` | Marcas (admin) |
| POST | `/api/marcas` | Crear marca (admin) |
| PUT | `/api/marcas/{id}` | Actualizar marca (admin) |
| DELETE | `/api/marcas/{id}` | Eliminar marca — soft delete (admin) |
| POST | `/api/marcas/logo` | Subir logo a Supabase Storage |
| POST | `/api/pedidos` | Crear pedido |
| GET | `/api/pedidos` | Listar todos los pedidos (admin) |
| GET | `/api/pedidos/{id}` | Obtener pedido |
| PUT | `/api/pedidos/{id}/estado` | Cambiar estado del pedido |
| PUT | `/api/pedidos/{id}/guia` | Asignar guía de envío → notifica por email |
| PUT | `/api/pedidos/{id}/envio` | Procesar envío con guía y costo |
| POST | `/api/pedidos/{id}/notificar` | Enviar email de seguimiento al cliente |
| POST | `/api/payment/checkout` | Iniciar pago PayXpert |
| POST | `/api/webhooks/payxpert` | Webhook de pagos |
| GET | `/api/admin/dashboard/**` | KPIs para panel admin |

## Frontend — páginas y rutas

| Ruta | Componente | Descripción |
|------|------------|-------------|
| `/` | `HomePage` | Página principal |
| `/productos` | `ProductsPage` | Catálogo con filtros |
| `/productos/:id` | `ProductDetailPage` | Detalle de producto |
| `/carrito` | `CartPage` | Carrito de compras |
| `/checkout` | `CheckoutPage` | Proceso de pago (requiere auth) |
| `/mis-pedidos` | `MisPedidosPage` | Historial de pedidos del cliente |
| `/login` | `LoginPage` | Inicio de sesión |
| `/registro` | `RegisterPage` | Registro de usuario |
| `/admin` | `AdminDashboard` | Panel admin — KPIs |
| `/admin/productos` | `AdminProducts` | Gestión de productos |
| `/admin/productos/nuevo` | `AdminNuevoProducto` | Crear/editar producto |
| `/admin/pedidos` | `AdminOrders` | Gestión de pedidos con tracker |
| `/admin/marcas` | `AdminMarcas` | CRUD de marcas con logo |
| `/admin/finanzas` | `AdminFinanzas` | Finanzas — pedidos entregados con desglose |
| `/admin/usuarios` | `AdminUsers` | Gestión de usuarios |
| `/admin/reportes` | `AdminReportes` | Reportes |
| `/admin/publicaciones` | `AdminPublicaciones` | Blog / publicaciones |

## Stores Zustand

- `authStore` — usuario autenticado, JWT, refresh token
- `cartStore` — carrito persistido en localStorage (`hotclick-cart`); método `toWhatsAppMessage()` genera mensaje para wa.me
- `uiStore` — estado transiente de UI: `authPromptOpen` (modal de login para usuarios anónimos)
- `wishlistStore` — lista de deseos

## Servicios frontend (src/services/)

- `api.js` — Axios con interceptor JWT; en 401 refresca token; solo redirige a `/login` si el usuario tenía sesión previa
- `authService.js` — login, registro, refresh
- `orderService.js` — pedidos; incluye `notificar(id)` para email de seguimiento
- `marcaService.js` — marcas; `getPublicas()` no requiere auth
- `productService.js` — productos y catálogo
- `ventaService` (en orderService.js) — ventas

## Notificaciones al cliente

`NotificacionEmailService.java` envía emails HTML via SendGrid (ResendEmailService):
- `enviarConfirmacionPedido(pedido)` — al crear pedido pagado
- `enviarNotificacionGuia(pedido)` — al asignar guía de Correos CR
- `enviarSeguimientoEstado(pedido)` — desde admin, botón "Email cliente" en AdminOrders
- `enviarPagoFallido(pedido, motivo)` — cuando falla el pago

El email de seguimiento distingue automáticamente:
- **Correos de Costa Rica** — si `urlTracking` es null o contiene "correos.go.cr"
- **Entrega directa HOTCLICK** — si `urlTracking` es un link externo

El botón "WhatsApp cliente" en AdminOrders genera un link `wa.me` con los productos, estado, guía y courier sin llamar al backend.

## Finanzas

`AdminFinanzas.jsx` lee de `/api/pedidos` filtrando por `estado === 'ENTREGADO'`. Muestra:
- KPI: ingresos por productos, costos de envío (moto), total cobrado
- Tabla con desglose por pedido: subtotal productos + costoEnvio + total
- Filtros por período (hoy / 7 días / 30 días / todo / rango manual)

Un pedido aparece en finanzas automáticamente al marcarlo como ENTREGADO.

## Convenciones

- Los controladores REST se ubican en `com.hotclick.controller` y usan `@RestController` con `@RequestMapping("/api")` como prefijo de ruta.
- Naming strategy: `PhysicalNamingStrategyStandardImpl` — los nombres de entidad deben coincidir exactamente con los nombres de columna/tabla en BD (minúsculas).
- Todos los montos monetarios son enteros en colones costarricenses (₡), sin decimales. Usar `Intl.NumberFormat('es-CR')` en frontend y `NumberFormat.getInstance(Locale.forLanguageTag("es-CR"))` en backend.
- **Nunca cambiar `ddl-auto=none`**; todo cambio de esquema se aplica manualmente con `Actualizado.sql`.
- El número de WhatsApp de HOTCLICK es `50689745370` (Andrés Zúñiga).
- Soft delete en Marcas: `estado = 0` (INACTIVO) en vez de borrar el registro.
