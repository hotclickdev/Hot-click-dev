# Auditoría estática REST — Hot_click_outlet

**Alcance:** READ-ONLY · `src/main/java/**/*Controller.java` (106) · `SecurityAuthorizationRules.java` · `JwtRequestFilter` · `CompanyScope` · `PlatformStaff` · `Constants`  
**Conteo observado:** **~469** mappings HTTP (incluye SPA/`/error`/`sitemap`; ~460 API REST)

**Capas de auth (HECHO OBSERVADO):**
1. `SecurityAuthorizationRules` — orden de matchers; catchall `.requestMatchers("/api/**").authenticated()`  
2. `@PreAuthorize` — `@EnableMethodSecurity` en `SecurityConfig.java:34`  
3. `CompanyScope` / guards en servicio — aislamiento tenant (no HTTP filter)

**Roles (`Constants.java:48-61`):** `ADMIN` · `EMPRENDEDOR` · `USUARIO_FINAL` · legacy `SUPPORT`/`FINANCE`/`TRUST` · perms `global.companies|approvals|metrics`  
**PlatformStaff:** `ROLES` vacío; solo `ADMIN` sin tenant (`PlatformStaff.java:14-17`)

---

## 1. Controllers con `@RequestMapping` base

| Controller | Base | #eps |
|---|---|---|
| AuthController | `/api/auth` | 28 |
| WebAuthnController | `/api/auth/webauthn` | 5 |
| ClerkSyncController | `/api/auth` | 1 |
| ProductoController | `/api/productos` | 25 |
| ProductoImagenController | `/api/productos/{productoId}/imagenes` | 4 |
| ProductoFeedController | _(sin base; paths absolutos)_ | 2 |
| PedidoController | `/api/pedidos` | 11 |
| PaymentController | `/api/payments` | 7 |
| SinpeController | `/api/sinpe` | 7 |
| PosController | `/api/pos` | 2 |
| PosQrController | `/api/pos/qr` | 8 |
| TurnoCajaController | `/api/pos/caja` | 4 |
| SelfCheckoutController | `/api/qr` | 3 |
| SuscripcionController | `/api/billing` | 8 |
| AdminBillingController | `/api/admin/billing` | 2 |
| WalletController | `/api` | 7 |
| EmpresaController | `/api/admin/empresas` | 12 |
| EmpresaPerfilController | `/api/empresa/perfil` | 6 |
| EquipoController | `/api/empresa/equipo` | 4 |
| ImpersonacionController | `/api/impersonacion` | 1 |
| InventarioPaqueteController | `/api/inventario` | 13 |
| InventarioController | `/api/admin/inventario` | 2 |
| AiCopilotController | `/api/admin/ai` | 7 |
| ShoppingAssistantController | `/api/public/shopping-assistant` | 6 |
| PublicChatController | `/api/public/chat` | 1 |
| SecurityController | `/api/security` | 12 |
| SolicitudAprobacionController | `/api/admin/solicitudes-aprobacion` | 13 |
| AdminUsuarioController | `/api/admin/usuarios` | 10 |
| StorefrontController | `/api/tienda/{slug}` | 6 |
| TestimonioController | `/api/testimonios` | 11 |
| CrmController | `/api/crm/clientes` | 8 |
| CotizacionController | `/api/cotizaciones` | 9 |
| PluginController | `/api/admin/plugins` | 6 |
| TelegramConfigController | `/api/telegram` | 6 |
| EncargoAdminController | `/api/encargos` | 6 |
| EncargoPublicController | `/api/public/encargos` | 4 |
| Billing/Tilopay/Onvo/Telegram/Webhook* | `/api/webhooks` | 7 |
| SpaController / CustomErrorController | SPA / `/error` | 5 |
| *(+ ~70 controllers restantes — ver §4)* | | |

---

## 2–4. Inventario por dominio

Leyenda auth efectiva (filter + PreAuthorize): **PUB** permitAll · **AUTH** authenticated · **A** ADMIN · **E** EMPRENDEDOR · **perm** `global.*` · **pos.** authority POS

### Auth / identidad

| Método | Path | Auth | In/Out | Cite |
|---|---|---|---|---|
| POST | `/api/auth/register` | PUB | `RegisterRequest` → `ResponseDTO` | AuthController:28 |
| POST | `/api/auth/login` | PUB | `JwtRequest` → JWT | :88 |
| POST | `/api/auth/refresh` | PUB | `Map` refresh | :95 |
| POST | `/api/auth/logout` | PUB | `Map` | :102 |
| POST | `/api/auth/change-password` | PUB* | `Map` | :109 · ❓ valida JWT en servicio |
| POST | `/api/auth/registro-empresa` | PUB | `RegistroEmpresaDTO` | :43 |
| POST | `/api/auth/upgrade-emprendedor` | PUB* | `UpgradeEmprendedorDTO` | :37 |
| POST | `/api/auth/verificar-correo-negocio` | PUB | `Map` | :53 · Rules:32 |
| POST | `/api/auth/reenviar-codigo-negocio` | AUTH† | — | :48 · Rules:33 **vs** :34 |
| GET | `/api/auth/mis-negocios` | PUB† | — | :67 · Rules:213 **muerta** |
| POST | `/api/auth/seleccionar-empresa` | PUB | `Map` | :74 |
| POST | `/api/auth/cambiar-negocio` | PUB† | `Map` | :60 · Rules:214 **muerta** |
| POST | `/api/auth/nuevo-negocio` | PUB† | `RegistroEmpresaDTO` | :81 · Rules:215 **muerta** |
| POST | `/api/auth/2fa/verify` | PUB | `Map` | :117 · Rules:25 |
| POST | `/api/auth/2fa/email/send` | PUB | `Map` | :122 · Rules:26 |
| POST | `/api/auth/2fa/email/{enable,activate,disable}` | AUTH | — | :127-138 · Rules:28-30 |
| POST | `/api/auth/2fa/{setup,activate,disable}` | AUTH | — | :144-155 · Rules:31 |
| POST | `/api/auth/2fa/recovery-codes/regenerate` | AUTH | — | :161 |
| GET | `/api/auth/2fa/status` | AUTH | — | :167 |
| POST | `/api/auth/{send-verification,verify-registration,forgot-password,verify-code,reset-password}` | PUB | `Usuario`/`Map` | :174-196 |
| POST | `/api/auth/clerk-sync` | PUB | — | ClerkSyncController:29 |
| POST | `/api/auth/webauthn/{register,login}/{start,finish}` | AUTH‡ | WebAuthn | WebAuthnController:41-83 · bajo `/api/auth/**` PUB filter |
| GET | `/api/auth/webauthn/credentials` | AUTH‡ | — | :117 |

† **POSIBLE PROBLEMA:** Rules:212-215 quedan después de `permitAll /api/auth/**` (Rules:34) → nunca aplican.  
‡ WebAuthn: filter PUB; ❓ depende de validación interna / sesión.

### Health / público genérico

| Método | Path | Auth | Cite |
|---|---|---|---|
| GET | `/api/health` | PUB | HealthController:21 · Rules:35 |
| GET | `/api/img` | PUB | ImageProxyController:42 · Rules:171 |
| GET | `/api/public/branding` | PUB | BrandingController:28 · Rules:91 |
| GET | `/api/public/emprende/cupos` | PUB | EmprendePublicController:19 |
| POST | `/api/contacto` | PUB | ContactoController:22 · Rules:113 |
| POST | `/api/consentimiento` | PUB | ConsentimientoController:30 · Rules:38 |
| GET | `/api/hacienda/contribuyente/{cedula}` | PUB | HaciendaContribuyenteController:20 · Rules:169 |
| GET | `/api/public/feed/shopping.xml` | PUB | ProductoFeedController:35 · Rules:173 |
| GET | `/sitemap.xml` | PUB | :83 · Rules:174 |

### Productos / catálogo / marcas / categorías

| Método | Path | Auth | DTO | Cite |
|---|---|---|---|---|
| GET | `/api/productos` | PUB | page | ProductoController:26 · Rules:64 |
| GET | `/api/productos/{id}` | PUB | — | :109 · Rules:70 |
| GET | `/api/productos/destacados` `/carrusel` `/marca/{id}` `/{id}/recomendaciones` `/{id}/variantes` | PUB | — | :60-114 · Rules:65-69 |
| GET | `/api/productos/buscar` `/en-oferta` | PUB§ | — | :50,:178 · match `/api/productos/*` |
| GET | `/api/productos/{id}/kardex` | AUTH | — | :55 |
| GET | `/api/productos/admin/todos` | AUTH | — | :33 · Rules:62 |
| GET | `/api/productos/pos/**` | AUTH | — | :40-45 · Rules:63 |
| PATCH | `/{id}/carrusel` `/{id}/destacado` | A | `Map` | :71,:79 |
| PATCH | `/{id}/visibilidad-catalogo` | A\|E | `Map` | :87 · Rules:76 |
| POST/PUT/DELETE | `/` `/{id}` | A\|E | `ProductoRequestDTO` | :119-160 · Rules:74-78 |
| POST | `/bulk` `/imagen` `/archivar-sin-stock` `/oferta/...` | A\|E | DTO/`Map` | :136-174 |
| POST | `/ajustar-precios` | A | `Map` | :143 |
| CRUD | `/api/productos/{id}/imagenes` | GET PUB / mut A\|E | — | ProductoImagenController · Rules:68,78 |
| GET | `/api/marcas/publicas` | PUB | — | MarcaController:36 · Rules:83 |
| CRUD | `/api/marcas` | AUTH (+scope) | — | :46-113 |
| GET | `/api/categorias/**` | PUB | — | CategoriaController · Rules:79-80 |
| POST/PUT/DELETE | `/api/categorias` | A\|E `@PreAuthorize` | — | :59-151 |
| GET | `/api/marketplace/buscar` `.../productos/{id}` | AUTH | — | MarketplaceController:30 · ❓ |
| GET | `/api/marketplace/productos/{id}/stock-stream` | PUB SSE | — | StockNotificationController:34 · Rules:72 |
| POST/PUT | `/api/admin/marketplace/catalogo` | A\|E (`/api/admin/**`) | — | MarketplaceController:66 |

§ HECHO: patrón Spring `*` = 1 segmento → `buscar`/`carrusel` quedan públicos.

### Pedidos / carrito / storefront / QR mesa

| Método | Path | Auth | DTO | Cite |
|---|---|---|---|---|
| POST | `/api/pedidos` | AUTH | `Pedido` | PedidoController:59 |
| POST | `/api/pedidos/manual` | A\|E | `ManualPedidoDTO` | :48 · Rules:223 |
| GET | `/api/pedidos/{id}` | AUTH + `pedidoAccessGuard` | — | :75 |
| GET | `/api/pedidos/usuario/{usuarioId}` | AUTH + self/admin | — | :89 |
| GET | `/api/pedidos` `/pendientes` | A\|E | — | :170-178 · Rules:221-222 |
| PUT | `/{id}/estado` `/guia` `/envio` | A\|E | `Map` | :103-146 · Rules:224-226 |
| POST | `/{id}/notificar` | A\|E | — | :188 · Rules:228 |
| DELETE | `/{id}` | A\|E | — | :196 · Rules:227 |
| GET/POST/DELETE | `/api/carrito/...` | AUTH + self | — | CarritoController:35 |
| POST/GET/DELETE | `/api/cart/abandoned/**` | PUB | — | CarritoAbandonadoController · Rules:162-165 |
| GET/POST | `/api/tienda/{slug}/**` | PUB (POST pedidos) | — | StorefrontController · Rules:58-59 |
| GET | `/api/tienda/cupones/validar` | PUB | — | TiendaCuponController:43 |
| GET/POST | `/api/qr/{token}...` | PUB | — | SelfCheckoutController · Rules:40-41 |
| CRUD | `/api/admin/mesas` | A\|E | — | MesaController |

### Pagos / webhooks / SINPE / gift cards / wallet

| Método | Path | Auth | DTO | Cite |
|---|---|---|---|---|
| POST | `/api/payments/checkout` | AUTH | `PaymentCheckoutRequest` | PaymentController:27 |
| POST | `/api/payments/guest-checkout` | PUB | idem | :65 · Rules:48 |
| GET | `/api/payments/status/{n}` | PUB | — | :40 · Rules:50 |
| POST | `/api/payments/cancel/{n}` | AUTH | — | :50 |
| POST | `/api/payments/guest/cancel/{n}` | PUB | — | :77 · Rules:49 |
| POST | `/api/payments/tilopay/{confirmar,reintentar}/{n}` | PUB | `Map?` | :89-104 · Rules:51-52 |
| POST | `/api/sinpe/checkout` | AUTH | — | SinpeController:27 |
| POST | `/api/sinpe/guest-checkout` `guest/.../comprobante` | PUB | — | :41-76 · Rules:54-55 |
| POST | `/api/sinpe/{n}/comprobante` | AUTH | — | :54 |
| * | `/api/sinpe/admin/comprobantes...` | A\|E | — | :99-131 |
| POST | `/api/webhooks/{stripe,tilopay,onvo,telegram,uptime,payxpert,sentry}` | PUB | raw | *Webhook* · Rules:36 |
| GET | `/api/gift-cards/validar` | AUTH | query `codigo` | GiftCardController:78 · Rules:88 · comentario “pública” desactualizado |
| CRUD | `/api/admin/gift-cards` | A\|E | `Map` | :26-62 |
| GET/POST | `/api/wallet/*` | E\|A (payout solo E) | — | WalletController:32-62 |
| GET/PATCH | `/api/admin/payouts/**` | A \| `global.metrics` | — | :81-96 · Rules:207-208 |
| * | `/api/admin/pagos/**` `/webhooks` | A\|E \| `global.metrics` | — | AdminPagoController · Rules:209-211 |

### Billing / suscripción / facturación electrónica

| Método | Path | Auth | Cite |
|---|---|---|---|
| GET | `/api/billing/planes` `/api/planes` | PUB | SuscripcionController:36 · TenantController:52 · Rules:84-85 |
| GET/POST | `/api/billing/{suscripcion,facturas,trial,checkout,portal,cancelar,cambiar-plan}` | AUTH + PreAuth E\|A | :65-151 · Rules:86 |
| GET | `/api/admin/billing/empresas[/{id}]` | A | AdminBillingController:30 · Rules:201 |
| POST | `/api/facturas/emitir/{pedidoId}` + GETs | A\|E | FacturaController |
| GET | `/api/admin/finanzas/reporte-iva` | A\|E | FinanzasReporteController:39 |

### Empresa / equipo / sucursales / impersonación

| Método | Path | Auth | Cite |
|---|---|---|---|
| * | `/api/admin/empresas/**` | A \| `global.companies` | EmpresaController · Rules:203-204 · `assertCanAccess` |
| POST | `.../impersonar` | A `@PreAuthorize` | EmpresaController:124 |
| POST | `/api/impersonacion/{id}/finalizar` | AUTH | ImpersonacionController:24 |
| GET/PUT/POST | `/api/empresa/perfil/**` | A\|E | EmpresaPerfilController · Rules:176-181 |
| * | `/api/empresa/equipo` | GET A\|E; mut E | EquipoController · Rules:183-186 |
| CRUD | `/api/sucursales` | A\|E | SucursalController · Rules:188-191 |
| GET | `/api/tenant/info` `/uso` | AUTH | TenantController:29-42 · Rules:111 |

### POS / caja / QR pago

| Método | Path | Auth | Cite |
|---|---|---|---|
| POST | `/api/pos/venta` | `pos.usar` \| A\|E | PosController:29 |
| GET | `/api/pos/historial` | idem | :49 |
| POST/PUT/GET | `/api/pos/caja/{abrir,cerrar,activo,historial}` | `pos.caja.*` \| A\|E | TurnoCajaController |
| POST/PUT/DELETE | `/api/pos/qr` (staff) | `pos.usar` \| A\|E | PosQrController:37-83 |
| GET/POST | `/api/pos/qr/pago/**` | PUB | :97-167 · Rules:43-46 |

### Inventario / compras / proveedores / gastos / stock / bodegas

| Base | Auth | Cite |
|---|---|---|
| `/api/inventario/**` (paquetes) | A class+Rules:193 | InventarioPaqueteController |
| `/api/admin/inventario/**` | AUTH Rules:109 + PreAuth A\|E | InventarioController |
| `/api/compras` `/api/proveedores` `/api/gastos` | A\|E PreAuth + CompanyScope | OrdenCompra/Proveedor/Gasto |
| `/api/bodegas` `/api/stock/**` | AUTH (+scope) | BodegaController, StockController |
| `/api/extraccion/**` | AUTH | ExtraccionController |
| `/api/admin/importar/**` | A\|E (`/api/admin/**`) | ImportController |

### CRM / cotizaciones / cupones / ruleta / garantías / servicios / encargos

| Base | Auth tipica | Cite |
|---|---|---|
| `/api/crm/clientes/**` | A\|E PreAuth | CrmController |
| `/api/cotizaciones` | AUTH; GET `publica/{token}` PUB | CotizacionController · Rules:167 |
| `/api/cotizaciones/clientes` | A class | CotizacionClienteController |
| `/api/cupones/validar` | PUB | CuponController:46 · Rules:97 |
| `/api/cupones` resto | AUTH | :26-87 |
| `/api/ruleta/premios` | PUB | PremioController:32 · Rules:112 |
| `/api/ruleta/giros-disponibles/{usuarioId}` etc. | AUTH **sin check ownership** | :38-64 · **POSIBLE IDOR** |
| `/api/garantias/**` | AUTH / A\|E | Garantia + SolicitudGarantia · Rules:143-145 |
| `/api/servicios` POST fotos/crear | PUB | SolicitudServicio · Rules:115-116 |
| GET/PUT/DELETE `/api/servicios` | A | Rules:117-119 |
| `/api/public/encargos/**` | PUB | EncargoPublic · Rules:121-124 |
| GET `/api/encargos` PUT aprobar/rechazar | A\|E | EncargoAdmin · Rules:125-127 |
| GET `/kpis` `/{id}/eventos` PUT `fulfillment` | **solo AUTH** | EncargoAdmin:28-62 · **POSIBLE PROBLEMA** |
| `/api/recolecciones/**` | A\|E / tarifa+rechazar A | RecoleccionController · Rules:129-133 |
| `/api/metodos-cobro` | A\|E | MetodoCobro · Rules:135-138 |
| POST `/api/public/solicitud-especial` | PUB | SolicitudEspecial · Rules:99 |
| `/api/mis-solicitudes/ofertas` | AUTH | MisSolicitudesController |

### Admin plataforma / moderación / usuarios / flags / multipais

| Base | Auth | Cite |
|---|---|---|
| `/api/admin/usuarios/**` | A PreAuth | AdminUsuarioController |
| `/api/admin/solicitudes-aprobacion/**` | A \| `global.approvals` | Rules:205-206 |
| `/api/admin/moderacion/**` | A \| `global.approvals` | ModeracionResumen · Rules:159 |
| `/api/admin/reportes-producto/**` | A \| `global.approvals` | ReporteProducto · Rules:156 |
| POST `/api/reportes-producto` | AUTH | :23 · Rules:155 |
| `/api/admin/soporte/tickets` | Filter: **solo A** · PreAuth: A\|`global.companies` | AdminTicketSoporte · Rules:158 · **mismatch** |
| `/api/soporte/tickets` | AUTH | TicketSoporteController |
| `/api/admin/flags/**` | A | FeatureFlagController |
| GET `/api/admin/multipais/paises` | PUB | Multipais:43 · Rules:104 |
| resto multipais | AUTH | Rules:105 |
| `/api/admin/auditorias/**` | A | Rules:199 |
| `/api/admin/observabilidad/**` | A | Observability + TenantUso · Rules:197 |
| `/api/admin/configuracion/comision` | A\|E (`/api/admin/**`) | AdminComision |
| `/api/admin/asignar/**` | A\|E PreAuth | AdminAsignar |
| POST `/api/admin/reset-datos` | A\|E PreAuth | AdminReset:33 |
| GET `/api/admin/dashboard` | A\|E | DashboardController:19 |
| GET `/api/usuarios` | A | UsuarioController:37 · Rules:230 |
| GET/PUT `/api/usuarios/{id}` | AUTH + self/admin | :43 |

### AI / executive / forecast / RAG / chat público

| Método | Path | Auth | Cite |
|---|---|---|---|
| * | `/api/admin/ai/**` | AUTH Rules:110 + PreAuth A\|E | AiCopilotController |
| POST | `/api/admin/productos/generar-ia` | A\|E | AiProductoController:28 |
| * | `/api/admin/executive/**` `/forecast/**` | AUTH + PreAuth A\|E | Executive/Forecast · Rules:107-108 |
| POST | `/api/admin/rag/indexar` | A\|E (admin catchall) | RagAdminController:42 · ❓ E puede indexar |
| POST | `/api/public/chat` | PUB | PublicChatController:49 · Rules:92 |
| POST | `/api/public/shopping-assistant/{chat,search-by-image,feedback}` | PUB | ShoppingAssistant · Rules:93-95 |
| DELETE | `.../session/**` | PUB | Rules:96 |
| GET | `.../session/{id}/history` | PUB (`GET /api/public/**`) | :123 · Rules:173 |
| GET | `.../metrics` | PUB filter + **@PreAuthorize A** | :152 · OK si method security |
| GET | `/api/security/ai/dashboard` | A | AiControlController:30 |
| GET | `/api/customer-memory/affinity` | AUTH | CustomerMemoryController:31 |

### Security center / Telegram / blog / homepage / branding / plugins / FB / ventas / convenios

| Base | Auth | Cite |
|---|---|---|
| `/api/security/**` | A | SecurityController · Rules:195 |
| `/api/telegram/**` | A\|E; `/admin/**` A | TelegramConfig · Rules:140-141 |
| GET `/api/blog/publico[/{slug}]` | PUB | BlogController · Rules:150-151 |
| CRUD `/api/blog` | A\|E PreAuth | :39-103 |
| GET `/api/homepage/publico` | PUB | HomepageConfig · Rules:82 |
| GET/PUT `/api/homepage` | A | :30-37 |
| GET/PUT `/api/admin/branding` | AUTH | BrandingController · Rules:100 |
| `/api/admin/plugins/**` | AUTH + PreAuth A | PluginController · Rules:102 |
| `/api/publicaciones-fb` | A | PublicacionFbController |
| `/api/ventas` | AUTH + scope | VentaController |
| GET `/api/convenios/publicos` | PUB | ConvenioController · Rules:81 |
| CRUD convenios | AUTH | :30-66 |
| GET `/api/testimonios/publicos` rating resenas | PUB | Testimonio · Rules:147-148,98 |
| GET admin / PUT aprobar\|rechazar | A | Rules:152-154 |
| POST testimonio/resena/imagen | AUTH | TestimonioController |

### Actuator / SPA (no REST negocio)

| Path | Auth | Cite |
|---|---|---|
| `/actuator/**` | A | Rules:23 |
| `/productos/{id}` `/blog/{slug}` catch-all SPA | PUB | SpaController · Rules:237+ |
| `/error` | PUB | CustomErrorController · Rules:234 |

---

## 3. Resumen público vs autenticado vs roles

| Clase | Ejemplos (Rules líneas) |
|---|---|
| **PUB** | auth login/register/2fa verify, health, webhooks, guest payments/SINPE, catálogo GET, tienda slug, QR mesa/POS pago, cart abandoned, encargos públicos, chat/shopping-assistant, blog público, consent, contacto, hacienda, img, sitemap |
| **AUTH** (cualquier JWT válido) | catchall `/api/**` (Rules:232); billing (salvo planes); gift-card validar; reportes-producto POST; carrito; pedidos GET by id; tenant; etc. |
| **A \| E** | productos write, pedidos admin, POS (o authority), CRM, compras, empresa perfil, `/api/admin/**` catchall (Rules:217-218) |
| **A only** | inventario paquetes, security center, observabilidad, auditorías, admin billing, admin usuarios, actuator |
| **A \| global.\*** | empresas (`companies`), aprobaciones/moderación (`approvals`), payouts/pagos metrics |

---

## 5. Posibles inconsistencias de auth

| # | Hallazgo | Etiqueta | Cite |
|---|---|---|---|
| 1 | `mis-negocios` / `cambiar-negocio` / `nuevo-negocio` declarados `authenticated()` **después** de `permitAll("/api/auth/**")` → reglas muertas | **POSIBLE PROBLEMA** | Rules:34 vs 213-215 · AuthController:60-81 |
| 2 | Comentario Security “gift cards validación pública” vs `authenticated()` + código 401 sin tenant | **HECHO OBSERVADO** (comentario stale) | Rules:87-88 · GiftCardController:73-82 |
| 3 | `AdminTicketSoporte`: filter `hasRole(ADMIN)` vs `@PreAuthorize(... or global.companies)` → staff con solo perm nunca pasa filter | **POSIBLE PROBLEMA** | Rules:158 · AdminTicketSoporteController:16 |
| 4 | Encargos admin: `kpis`, `eventos`, `fulfillment` **no** en matchers A\|E → cualquier usuario autenticado (p.ej. `USUARIO_FINAL`) | **POSIBLE PROBLEMA** | Rules:125-127 · EncargoAdminController:28-62 |
| 5 | `/api/ruleta/.../{usuarioId}` sin `assertSelf` → IDOR si se conoce ID | **POSIBLE PROBLEMA** | PremioController:38-61 |
| 6 | `GET /api/public/shopping-assistant/metrics` permitAll por `GET /api/public/**` + `@PreAuthorize(ADMIN)` — OK **si** method security siempre activo | **❓ REQUIERE VALIDACIÓN** | Rules:173 · ShoppingAssistantController:152 · SecurityConfig:34 |
| 7 | WebAuthn bajo `/api/auth/**` → filter PUB; seguridad depende de implementación interna | **❓ REQUIERE VALIDACIÓN** | Rules:34 · WebAuthnController |
| 8 | `POST /api/auth/change-password` y `upgrade-emprendedor` PUB en filter | **❓ REQUIERE VALIDACIÓN** | AuthController:37,109 |
| 9 | `PlatformStaff.ROLES` vacío pero reglas `global.*` siguen en filter/PreAuthorize | **HECHO OBSERVADO** | PlatformStaff:14 · Constants:59-61 |
| 10 | Auth dead-rules + `seleccionar-empresa` ya cubierto por permitAll (redundante) | **HECHO OBSERVADO** | Rules:212 |
| 11 | `/api/admin/webhooks` (AdminPago) accesible a EMPRENDEDOR vía catchall admin | **❓ REQUIERE VALIDACIÓN** (¿intencional?) | AdminPagoController:60 · Rules:217 |
| 12 | Marketplace buscar no está en permitAll → requiere JWT (puede romper storefront anónimo si se usa) | **❓ REQUIERE VALIDACIÓN** | MarketplaceController:30 · Rules:232 |
| 13 | DELETE cart abandoned PUB — controller debe validar sessionId | **❓ REQUIERE VALIDACIÓN** | Rules:165 · CarritoAbandonadoController:87 |

**CompanyScope (HECHO):** usado en pedidos, CRM, wallet, empresa, compras, etc.; ADMIN → `empresaId=null` (cross-tenant). Impersonación: authorities del claim JWT (`JwtRequestFilter:85-89`).

---

## 6. Citas clave de seguridad

```23:36:src/main/java/com/hotclick/security/config/SecurityAuthorizationRules.java
.requestMatchers("/actuator/**").hasRole(Constants.ROL_ADMIN)
// ...
.requestMatchers("/api/auth/**").permitAll()
.requestMatchers("/api/health").permitAll()
.requestMatchers("/api/webhooks/**").permitAll()
```

```212:232:src/main/java/com/hotclick/security/config/SecurityAuthorizationRules.java
.requestMatchers("/api/auth/seleccionar-empresa").permitAll()
.requestMatchers("/api/auth/mis-negocios").authenticated()
.requestMatchers("/api/auth/cambiar-negocio").authenticated()
.requestMatchers("/api/auth/nuevo-negocio").authenticated()
.requestMatchers("/api/admin/**").hasAnyRole(
    Constants.ROL_ADMIN, Constants.ROL_EMPRENDEDOR)
// ...
.requestMatchers("/api/**").authenticated()
```

```48:56:src/main/java/com/hotclick/utils/Constants.java
public static final String ROL_ADMIN        = "ADMIN";
public static final String ROL_EMPRENDEDOR  = "EMPRENDEDOR";
public static final String ROL_USUARIO_FINAL = "USUARIO_FINAL";
// SUPPORT/FINANCE/TRUST + PERM_GLOBAL_*
```

```14:17:src/main/java/com/hotclick/security/PlatformStaff.java
public static final Set<String> ROLES = Set.of();
public static final Set<String> ROLES_SIN_TENANT = Set.of(Constants.ROL_ADMIN);
```

---

**Metodología:** parseo estático de 106 `*Controller.java` + lectura de `SecurityAuthorizationRules` (orden de matchers). No se ejecutó la app ni se probaron requests en runtime.