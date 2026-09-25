# Auditoría estática READ-ONLY — modelo de datos Hot_click_outlet

**Alcance:** `com.hotclick.model` (88 archivos Java), 131 migraciones Flyway `V1`–`V133`, retención, seeds de roles/planes, mapeo FE→API. Sin modificaciones.

**Conteo HECHO OBSERVADO:** 87 `@Entity` + `BaseEntity` (`@MappedSuperclass`) · 131 SQL · huecos **V100** y **V104**.

---

## 1. Entidades principales → `@Table`

| Entidad | Tabla | Notas |
|---|---|---|
| `Usuario` | `hot_click_usuario_tb` | Roles M2M; CRM; 2FA |
| `Empresa` | `hot_click_empresa_tb` | Tenant; plan dual |
| `Rol` / `Permiso` | `hot_click_rol_tb` / `hot_click_permiso_tb` | Join `hot_click_usuario_rol_tb`, `hot_click_rol_permiso_tb` |
| `MiembroEmpresa` | `hot_click_miembro_empresa_tb` | Rol *en empresa* (PROPIETARIO/EDITOR/…) |
| `Plan` / `Suscripcion` | `hot_click_plan_tb` / `hot_click_suscripcion_tb` | SaaS |
| `Producto` / `ProductoImagen` | `hot_click_producto_tb` / `hot_click_producto_imagen_tb` | `@Version`; variantes |
| `Categoria` / `Marca` / `Bodega` / `Sucursal` | `hot_click_*_tb` | Catálogo + logística |
| `CatalogoMaestro` | `hot_click_catalogo_maestro_tb` | Marketplace |
| `Pedido` / `PedidoItem` | `hot_click_pedido_tb` / `hot_click_pedido_item_tb` | Core commerce |
| `Carrito` / `CarritoItem` / `CarritoAbandonado` | `hot_click_carrito*` | |
| `Pago` / `TransaccionPago` / `PaymentLog` / `WebhookEvent` | `hot_click_pago_tb`, `_transaccion_pago_tb`, `_payment_log_tb`, `_webhook_event_tb` | |
| `ComprobanteSinpe` / `SplitPago` / `GiftCard` / `MetodoCobro` | tablas homónimas | Pagos CR / POS |
| `Wallet` / `WalletTransaccion` / `PayoutRequest` / `WalletAcreditacionFallida` | `hot_click_wallet_tb`, `_transaccion_tb`, `_payout_request_tb`, `_wallet_dlq_tb` | PK wallet = `fk_id_empresa` |
| `BillingLedger` / `FacturaSaas` / `StripeEvento` | billing plataforma | |
| `ComprobanteFiscal` / `ColaFacturacionOffline` | Hacienda CR | |
| `OrdenCompra*` / `Proveedor` / `MovimientoStock` / `PaqueteInventario*` | compras/inventario | |
| `TurnoCaja` / `Mesa` / `PosQrSesion` | POS | |
| `Cotizacion*` / `Encargo*` / `TicketSoporte` | B2B / fulfillment / soporte | |
| `AiMensaje` / `AiUso` / `FeatureFlag` / `Forecast` / `AuditoriaAdmin` / security* | ops / IA / seguridad | |

**Citas:** `Usuario.java:12`, `Empresa.java:9`, `Producto.java:10`, `Pedido.java:15`, `Pago.java:7`, `Plan.java:6`, `Wallet.java:8`.

**Soft-delete:** muchas entidades extienden `BaseEntity` → columna `fk_id_estado` (`BaseEntity.java:8-9`). `Empresa`/`Plan`/`Suscripcion`/`Wallet` no usan ese patrón de la misma forma.

---

## 2. Árbol de relaciones clave

```
Estado (catálogo soft-delete)
│
├─ Usuario ──M2M── Rol ──M2M── Permiso
│     │  fk_id_empresa ──────────────► Empresa
│     │  fk_id_empresa_registro ─────► Empresa (CRM)
│     │
│     ├─ MiembroEmpresa ──► Empresa   (rol_en_empresa: PROPIETARIO|EDITOR|LECTOR|…)
│     ├─ RefreshToken, CodigoOtp→TipoOtp, WebAuthnCredential
│     └─ (como comprador) Pedido.usuarioFinal, Carrito, Pago.usuario
│
Empresa (tenant)
│  fk_id_plan ──► Plan
│  fk_id_bodega_venta_online ──► Bodega
│  plan_saas VARCHAR (legado, paralelo a Plan)
│
├─ Suscripcion ──► Plan (+ Stripe/Onvo IDs)
├─ BillingLedger ──► Suscripcion?
├─ Wallet (1:1 por empresaId) ── WalletTransaccion / PayoutRequest / DLQ
├─ Bodega / Sucursal / Categoria / Marca / Producto
│       Producto ──► Bodega, Categoria, Marca?, Usuario(adminCliente),
│                    Empresa?, CatalogoMaestro?
│       ProductoImagen ──► Producto
├─ Pedido ──► Usuario(final), Bodega, Empresa?
│       └─ PedidoItem ──► Producto
│       └─ Pago ──► Pedido, Usuario
│       └─ ComprobanteFiscal, ComprobanteSinpe, SplitPago…
├─ Carrito ──► Usuario?, Empresa? ── CarritoItem ──► Producto
├─ OrdenCompra ──► Proveedor, Empresa ── OrdenCompraItem ──► Producto
├─ Cotizacion ──► CotizacionItem; CotizacionCliente
├─ EncargoPersonalizado ── EncargoEvento; GiftCard; Cupon; Mesa; TurnoCaja
├─ TicketSoporte; MetodoCobro; HomepageConfig; Plugin*; FeatureFlag (vía JDBC empresa_feature)
└─ AiMensaje, AiUso, Forecast, Reporte, AuditoriaAdmin, …
```

**Citas relaciones:**
- Usuario→Empresa / roles: `Usuario.java:92-129`
- Empresa→Plan / bodega online: `Empresa.java:125-171`
- Producto FKs: `Producto.java:94-119`
- Pedido 1:N items: `Pedido.java:118-135`
- Pago→Pedido: `Pago.java:45-51`
- Suscripcion: `Suscripcion.java:17-23`
- MiembroEmpresa: `MiembroEmpresa.java:17-26`

**HECHO OBSERVADO:** dos sistemas de “rol”: JWT/`hot_click_rol_tb` (plataforma) vs `rol_en_empresa` en membresía (equipo del tenant).

---

## 3. Roles y planes en BD (seeds)

### Roles — evolución

| Migración | Qué hace |
|---|---|
| **V1** | Seed: `ADMIN_IT`(1), `ADMIN_CLIENTE`(2), `USUARIO_FINAL`(3) — `V1__initial_schema.sql:1344-1347` |
| **V8** | Inserta `EMPRENDEDOR`(4) + permisos RBAC — `V8__saas_empresa_y_roles.sql:44-46`, `62-107` |
| **V24** | Roles POS 5–11: CAJERO…SOPORTE — `V24__nuevos_roles_pos.sql:27-35` |
| **V89** | `ADMIN_IT`→`ADMIN`; migra `ADMIN_CLIENTE`→`EMPRENDEDOR` e inactiva; oculta POS — `V89__restructura_roles_planes.sql:12-39` |
| **V126** | Inserta `SUPPORT`/`FINANCE`/`TRUST` — `V126__roles_staff_plataforma.sql:6-16` |
| **V132** | Remapea staff→`ADMIN`, inactiva SUPPORT/FINANCE/TRUST y refuerza POS muertos — `V132__limpiar_roles_muertos.sql:5-40` |

**JWT vivos (documentado en V132):** `ADMIN`, `EMPRENDEDOR`, `USUARIO_FINAL` — `V132__limpiar_roles_muertos.sql:33`.

**Frontend alineado:** `ROLES_PLATAFORMA = {ADMIN}`, `ROLES_STAFF = {}` (post-V132), vendedor incluye EMPRENDEDOR + PROPIETARIO/EDITOR/LECTOR (membresía) — `frontend/src/utils/sistemaUser.ts:4-22`.

### Planes — evolución

| Migración | Planes |
|---|---|
| **V31** | FREE / PRO / ENTERPRISE — `V31__plan_tenant.sql:25-36` |
| **V76** | Inicio Ferial, Emprendedor Pro, Comercio Expansión, Personalizado — `V76__plan_creditos_ai_seed.sql:13-39` |
| **V89** | Inactiva anteriores; activos: **EMPRENDEDOR** (0 USD, 1.5% comisión), **PYME** ($11.99), **NEGOCIO_PLUS** ($19.99) — `V89__restructura_roles_planes.sql:54-145` |
| **V102** | EMPRENDEDOR `tiene_reportes=true` — `V102__emprendedor_tiene_reportes.sql:1-3` |
| **V105** | Re-seed demos QA + sync `plan_saas` — `V105__seed_planes_saas_demos.sql` |
| **V121** | `tiene_gift_cards` en PYME/NEGOCIO_PLUS — `V121__plan_gift_cards.sql` |

**HECHO OBSERVADO:** planes legacy quedan en tabla con `activo=false` (no se borran).

---

## 4. Alto volumen / retención

Fuente: `DataRetentionScheduler.java:16-32`, `50-66` + `Constants.DIAS_RETENCION_AUDITORIA_ADMIN`.

| Tabla | Retención | Cita |
|---|---|---|
| `hot_click_auditoria_admin_tb` | 90 días | `:74-83` |
| `hot_click_carrito_abandonado_tb` | 30 d (VENCIDO/EMAIL_ENVIADO) | `:91-102` |
| `hot_click_ai_mensaje_tb` | 30 días | `:105-117` |
| `hot_click_webhook_event_tb` | 90 d procesados | `:120-128` |
| `hot_click_rate_limit_tb` | on-expiry | `:132-136` |
| `shedlock` | 7 días | `:139-142` |
| `hot_click_chat_sesion_tb` (+ mensajes CASCADE) | 30 d inactividad | `:171-185` |
| `hot_click_cola_facturacion_offline_tb` | 30 d COMPLETADO/AGOTADO | `:145-154` |
| `hot_click_encargo_tb` | marca VENCIDO + delete 90 d RECHAZADO/VENCIDO | `:188-212` |
| `hot_click_ip_bloqueada_tb` | desactiva expiradas | `:157-168` |

**Otros volumenes sin retención explícita en ese scheduler (❓):** `hot_click_chat_log_tb`, `hot_click_payment_log_tb`, `hot_click_security_audit_log_tb`, `hot_click_wa_log_tb`, `hot_click_plugin_evento_tb`, embeddings, `customer_memory`.

Refresh tokens: cleanup aparte (`RefreshTokenService`).

---

## 5. Inconsistencias sospechosas modelo ↔ migraciones

### POSIBLE PROBLEMA — retención webhook usa columna inexistente
Scheduler: `WHERE … created_at < ?` — `DataRetentionScheduler.java:123-126`.  
Tabla/entidad: `fecha_recepcion` — `WebhookEvent.java:48-49`, `V1__initial_schema.sql:912`, índice en `V53` sobre `fecha_recepcion`.  
`created_at` **no** aparece en migraciones de webhook → el DELETE puede fallar en runtime.

### POSIBLE PROBLEMA — doble fuente de plan
`Empresa.planSaas` (string, default `GRATUITO`) — `Empresa.java:50-51` · y `fk_id_plan` → `Plan` — `:125-127`.  
V8 default `GRATUITO`; planes actuales EMPRENDEDOR/PYME/NEGOCIO_PLUS. Riesgo de desync si solo se actualiza uno (V105 intenta alinear demos).

### HECHO OBSERVADO — tablas en migraciones **sin** entidad JPA (JDBC)
Entre otras: `hot_click_cupo_emprendedor_tb` (V127), `hot_click_empresa_config_tb` (V8, sin uso Java encontrado), `hot_click_chat_sesion_tb` / `_chat_mensaje_shopping_tb`, `hot_click_chat_log_tb`, `hot_click_producto_embedding_tb`, `customer_memory`, `hot_click_rate_limit_tb`, `hot_click_api_key_tb`, `hot_click_empresa_feature_tb`, `hot_click_consecutivo_fiscal_tb`, `hot_click_tasa_cambio_tb`, `hot_click_solicitud_especial_tb`, `shedlock`.

### HECHO OBSERVADO — huecos Flyway
131 archivos; faltan **V100** y **V104** en el rango V1–V133 (intencional o renombre perdido).

### ❓ REQUIERE VALIDACIÓN — casing V1 vs lowercase
V1 crea `"HOT_CLICK_*"` quoted; migraciones posteriores y JPA usan `hot_click_*`. V9 mezcla ambos — `V9__tenant_isolation.sql:3-7`. En PG son nombres distintos si existen ambos. Baseline V1 “ya aplicado” (docs) → validar en RDS/`pg_tables` que el naming real es lowercase.

### POSIBLE PROBLEMA — V8 seeds contra identificadores uppercase
`INSERT INTO "HOT_CLICK_ROL_TB"` — `V8__saas_empresa_y_roles.sql:44` mientras V89+ usan `hot_click_rol_tb`. Depende del nombre físico real.

### HECHO OBSERVADO — `plan_saas` default vs seeds
Columna default `GRATUITO` (V8/entidad) vs plan semilla `EMPRENDEDOR` (V89+).

### POSIBLE PROBLEMA — frontend aún tipa roles POS
`ROLES_POS` CAJERO/GERENTE/SUPERVISOR — `sistemaUser.ts:13` — roles inactivos en BD post-V89/V132.

### HECHO OBSERVADO — `Empresa` no extiende `BaseEntity` pero tiene `fk_id_estado`; `Plan`/`Suscripcion` sin soft-delete uniforme.

---

## 6. Mapa conceptual FE store/service → API → entidad → tabla

Axios `baseURL: '/api'` — `frontend/src/services/api.ts:10-14`.

| Dominio | Store / Service | API (ej.) | Entidad | Tabla |
|---|---|---|---|---|
| Auth / sesión | `authStore` + `authService` | `/auth/login`, `/auth/refresh`, 2FA… | `Usuario`, `Rol`, `RefreshToken`, `CodigoOtp` | `hot_click_usuario_tb`, `_usuario_rol_tb`, `_refresh_token_tb`, `_codigo_otp_tb` |
| Tenant / perfil | `tenantStore` + `empresaService` | `/empresa/perfil` | `Empresa`, `Plan` | `hot_click_empresa_tb`, `_plan_tb` |
| Carrito UI | `cartStore` (localStorage) | checkout → pedidos/pagos | (persistencia al pagar) `Pedido`/`Pago` | `hot_click_pedido_tb`, `_pago_tb` |
| Catálogo | `productService` | `/productos`, `/categorias` | `Producto`, `Categoria`, `Marca` | `hot_click_producto_tb`, … |
| Pedidos admin/cliente | `orderService` | `/pedidos`, `/pedidos/{id}/estado`… | `Pedido`, `PedidoItem` | `hot_click_pedido_tb`, `_pedido_item_tb` |
| Pagos | `paymentService` | `/payments/checkout`, `/sinpe/…`, webhooks | `Pago`, `WebhookEvent`, `ComprobanteSinpe` | tablas pago/webhook/sinpe |
| Billing SaaS | `billingService` | `/billing/planes`, `/billing/suscripcion` | `Plan`, `Suscripcion`, `FacturaSaas` | `_plan_tb`, `_suscripcion_tb`, `_factura_saas_tb` |
| Wallet / payouts | `walletService` | `/wallet/saldo`, `/wallet/payout` | `Wallet`, `WalletTransaccion`, `PayoutRequest` | `_wallet_*`, `_payout_request_tb` |
| POS | `posStore` + `posService` | `/pos/venta`, `/pos/caja` | `Pedido`, `TurnoCaja`, `PosQrSesion` | … |
| Tienda pública | `tiendaStore` + `tiendaService` | storefront por slug | `Empresa`, `Producto`, `Bodega` | … |
| Equipo multi-tienda | `adminService` equipo | `/admin/empresas/{id}/equipo` | `MiembroEmpresa` | `hot_click_miembro_empresa_tb` |
| Cupo emprendedor | `emprendeCupoService` | público cupos | *(sin entidad)* JDBC | `hot_click_cupo_emprendedor_tb` |

**Citas FE:** `orderService.ts:4-15`, `authService` login `:6`, `productService.ts:130`, `billingService.ts:15-16`, `walletService.ts:6-11`, `paymentService.ts:12`.

---

## 7. Citas archivo:línea (índice rápido)

| Tema | Ubicación |
|---|---|
| Usuario @Table + FKs | `Usuario.java:12`, `:92-129` |
| Empresa @Table + Plan | `Empresa.java:9`, `:50-51`, `:125-127` |
| Producto relaciones + @Version | `Producto.java:10`, `:94-119`, `:274-276` |
| Pedido 1:N | `Pedido.java:15`, `:134-135` |
| Pago | `Pago.java:7`, `:45-51` |
| Plan flags | `Plan.java:6`, `:36-72` |
| Roles seed V1 | `V1__initial_schema.sql:1344-1347` |
| EMPRENDEDOR + permisos | `V8__saas_empresa_y_roles.sql:44-107` |
| Restructura roles/planes | `V89__restructura_roles_planes.sql:12-157` |
| Staff → muertos | `V126__…:6-16`, `V132__…:5-40` |
| Planes demos | `V105__seed_planes_saas_demos.sql:4-43` |
| Retención | `DataRetentionScheduler.java:16-66`, `:120-128` |
| FE roles vivos | `sistemaUser.ts:4-22` |
| API base | `api.ts:10-14` |

---

### Resumen ejecutivo

Modelo multi-tenant centrado en **Empresa**, con **Usuario↔Rol** (JWT) y **MiembroEmpresa** (equipo). Commerce: **Producto → Pedido → Pago**; SaaS: **Plan ↔ Suscripcion ↔ BillingLedger**; dinero marketplace: **Wallet**. Planes activos: EMPRENDEDOR / PYME / NEGOCIO_PLUS. Roles JWT activos: ADMIN / EMPRENDEDOR / USUARIO_FINAL.

Hallazgos prioritarios: (1) retención webhook vs `fecha_recepcion`, (2) dualidad `plan_saas`/`fk_id_plan`, (3) tablas JDBC sin entidad, (4) casing V1 vs lowercase (validar en BD real).