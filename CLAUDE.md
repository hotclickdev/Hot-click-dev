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

Flyway ejecuta las migraciones automáticamente al arrancar. Sin migración → la columna no existe en RDS → 500 en producción.

Migraciones existentes:

- `V1__initial_schema.sql` — baseline (no se ejecuta, ya estaba aplicado)
- `V2__marcas_y_fk_producto.sql` — tabla marcas, fk_id_marca en producto, testimonio+producto

## Infraestructura AWS (producción)

| Servicio | Recurso | Detalle |
|----------|---------|---------|
| **EC2** | `hotclick-app` t3.small | us-east-2, Elastic IP `18.227.68.15`, Docker + Nginx + Certbot |
| **RDS** | `hotclick-db` db.t4g.micro | PostgreSQL 18.4, us-east-2, SSL requerido |
| **S3** | `hotclick-media` | us-east-2, imágenes y archivos públicos |
| **IAM** | `hotclick-ec2-role` | Política `HotclickS3Access` — permisos S3 via Instance Profile |
| **Dominio** | `hotclick.lat` | DNS en Spaceship → Elastic IP; HTTPS via Let's Encrypt |

### Deploy en producción

```bash
# 1. Conectarse al EC2
ssh -i "C:\Users\pmdan\Downloads\hotclick-key.pem" ec2-user@18.227.68.15

# 2. Actualizar código
cd /home/ec2-user/app && git pull origin master

# 3. Rebuild Docker (requiere t3.small — el t3.micro se queda sin RAM)
docker build -t hotclick .

# 4. Reemplazar contenedor
docker stop hotclick && docker rm hotclick
docker run -d --name hotclick --env-file /home/ec2-user/app/.env -p 8080:8080 --restart unless-stopped hotclick

# 5. Verificar logs
docker logs -f hotclick
```

### Variables de entorno en EC2

El archivo `/home/ec2-user/app/.env` contiene todas las variables. Para modificar una variable:
```bash
nano /home/ec2-user/app/.env
docker restart hotclick
```

## Arquitectura

Proyecto Spring Boot 3.4.4 con Java 21 (`pom.xml` fija `java.version=21`; el JDK instalado puede ser más nuevo, p. ej. 25, y compila igual). El código vive bajo `Hot_click_outlet/`.

- **Punto de entrada**: `Hot_click_outlet/src/main/java/com/hotclick/HotclickApplication.java`
- **Paquete base**: `com.hotclick`
- **Controladores REST**: `com.hotclick.controller`
- **Modelos JPA**: `com.hotclick.model`
- **Servicios**: `com.hotclick.service`
- **Repositorios**: `com.hotclick.repository`
- **Seguridad**: `com.hotclick.security` (JWT)
- **Configuración**: `Hot_click_outlet/src/main/resources/application.properties`
- **Base de datos**: PostgreSQL en AWS RDS (`ddl-auto=none`, esquema en `Hot_click_outlet/Actualizado.sql`)

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
| POST | `/api/marcas/logo` | Subir logo a AWS S3 |
| POST | `/api/pedidos` | Crear pedido |
| GET | `/api/pedidos` | Listar todos los pedidos (admin) |
| GET | `/api/pedidos/{id}` | Obtener pedido |
| PUT | `/api/pedidos/{id}/estado` | Cambiar estado del pedido |
| PUT | `/api/pedidos/{id}/guia` | Asignar guía de envío → notifica por email |
| PUT | `/api/pedidos/{id}/envio` | Procesar envío con guía y costo |
| POST | `/api/pedidos/{id}/notificar` | Enviar email de seguimiento al cliente |
| POST | `/api/payment/checkout` | Iniciar pago Stripe |
| POST | `/api/webhooks/stripe` | Webhook de pagos |
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

## Constraints de infraestructura — PgBouncer transaction mode (CRÍTICO)

Supabase usa PgBouncer en **transaction mode**. Esto significa que la conexión se devuelve al pool al finalizar cada transacción. Las siguientes funcionalidades de PostgreSQL **NO FUNCIONAN** y nunca deben usarse:

| ❌ NO usar | Motivo |
|-----------|--------|
| `pg_advisory_lock()` / `pg_advisory_xact_lock()` | El lock se libera al devolver la conexión al pool |
| `SET app.variable = ?` / `set_config(...)` | Las session variables se resetean entre transacciones |
| `LISTEN` / `NOTIFY` | Requiere conexión persistente de sesión |
| Row Level Security vía `set_config('app.tenant_id', ...)` | Mismo problema que SET |
| Prepared statements persistentes entre requests | Se pierden al devolver la conexión |

**Para locking distribuido → usar ShedLock** (ya instalado, tabla `shedlock` en V30).

**Para consecutivos únicos** (ej: Hacienda CR) → usar `UPDATE tabla SET n = n + 1 RETURNING n` en transacción corta y separada, sin I/O externo dentro de ella.

**Para tenant isolation → usar `CompanyScope.assertCanAccess()`** en cada endpoint que recibe un ID de recurso.

## ShedLock — schedulers distribuidos

Todos los `@Scheduled` **deben** tener `@SchedulerLock`. Sin esto, en multi-pod (Render con 2+ instancias) el job se ejecuta N veces simultáneamente.

```java
@Scheduled(cron = "0 0 3 * * *")
@SchedulerLock(name = "nombre_unico_del_job", lockAtMostFor = "PT30M", lockAtLeastFor = "PT5M")
public void miJob() { ... }
```

- `lockAtMostFor`: tiempo máximo que el lock se mantiene aunque el pod muera (evita lock eterno).
- `lockAtLeastFor`: tiempo mínimo que el lock se mantiene (evita que otro pod tome el lock inmediatamente si el job termina rápido).
- El `name` debe ser único en toda la aplicación.

## Retención de datos

`DataRetentionScheduler` corre a las 2:30 AM con ShedLock. Política actual:

| Tabla | Retención |
|-------|-----------|
| `hot_click_auditoria_admin_tb` | 90 días |
| `hot_click_carrito_abandonado_tb` (VENCIDO/EMAIL_ENVIADO) | 30 días |

Al agregar nuevas tablas de alto volumen (webhook logs, AI messages, etc.) agregar la limpieza en `DataRetentionScheduler`.

## Optimistic locking en Producto

`Producto` tiene campo `@Version Integer version`. Hibernate lanza `OptimisticLockException` si dos threads modifican el mismo producto simultáneamente. `StockService` debe capturar esta excepción y reintentar (máx 3 veces) antes de lanzar `StockInsuficienteException`.
