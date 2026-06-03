# HOTCLICK — Roadmap SaaS F10–F25+
**Fecha:** 2026-06-01  
**Stack:** Spring Boot 3.4.4 + Java 24 | React + Vite + Zustand + Tailwind | PostgreSQL Supabase  
**Base:** F1–F9 implementadas (ver `HOTCLICK_POS_ERP_IMPLEMENTACION.md`)  
**Objetivo:** Evolucionar de ecommerce+POS+ERP a plataforma SaaS multi-tenant nivel Shopify/Odoo

---

## Mapa de fases

| Bloque | Fases | Descripción |
|--------|-------|-------------|
| **Enterprise Expansion** | F10–F14 | Fundaciones SaaS: multi-tenant, planes, facturación CR, billing |
| **Commerce Expansion** | F15–F18 | POS moderno: mobile, self-checkout, split payments, white label |
| **Developer Platform** | F19–F20 | API keys, webhooks, marketplace de plugins |
| **AI Enterprise** | F21–F24 | Inventario inteligente, copilot de negocio, forecasting, BI ejecutivo |
| **LATAM Expansion** | F25+ | Multi-país, multi-moneda, facturación regional |

---

## Próxima migración Flyway

Las fases F10+ arrancan en **V30**. Resumen:

| Versión | Fase | Descripción |
|---------|------|-------------|
| V30 | F10 | Tabla `hot_click_plan_tb`, columnas tenant en `hot_click_empresa_tb` |
| V31 | F11 | Tabla `hot_click_feature_flag_tb`, `hot_click_plan_feature_tb` |
| V32 | F12 | Tablas facturación electrónica CR |
| V33 | F13 | ABAC: `hot_click_politica_acceso_tb`, atributos de contexto |
| V34 | F14 | Tablas billing: `hot_click_suscripcion_tb`, `hot_click_factura_saas_tb` |
| V35 | F15 | Configuración PWA: `hot_click_pwa_config_tb` |
| V36 | F16 | `hot_click_qr_pedido_tb`, `hot_click_mesa_tb` |
| V37 | F17 | `hot_click_pago_split_tb`, `hot_click_gift_card_tb` |
| V38 | F18 | `hot_click_branding_tb` (white label) |
| V39 | F19 | `hot_click_plugin_tb`, `hot_click_plugin_instalacion_tb` |
| V40 | F20 | `hot_click_api_key_tb`, `hot_click_webhook_tb`, `hot_click_webhook_log_tb` |
| V41 | F21 | `hot_click_prediccion_stock_tb`, `hot_click_reorden_sugerencia_tb` |
| V42 | F22 | `hot_click_copilot_sesion_tb`, `hot_click_copilot_insight_tb` |
| V43 | F23 | `hot_click_demanda_forecast_tb` |
| V44 | F24 | `hot_click_kpi_ejecutivo_tb` |
| V45 | F25 | `hot_click_pais_config_tb`, `hot_click_moneda_tb` |

---

## FASE F10 — Multi-tenant SaaS (Fundación)

### Objetivo
Convertir la arquitectura actual (una empresa fija) en un sistema **multi-tenant real**: cada cliente SaaS tiene su propia empresa aislada, sus datos están separados por `empresa_id` en todas las queries, y hay un contexto de tenant resuelto automáticamente por JWT en cada request.

### Contexto actual
La app ya tiene `hot_click_empresa_tb` y la mayoría de entidades tienen `fk_id_empresa`. El problema: el `empresa_id` no se valida automáticamente en todos los controladores, y no existe un mecanismo de **tenant resolver** que impida que un usuario de empresa A lea datos de empresa B.

### Migración V30
```sql
-- Plan del tenant (FREE, PRO, ENTERPRISE)
CREATE TABLE IF NOT EXISTS hot_click_plan_tb (
  id_plan        BIGSERIAL PRIMARY KEY,
  nombre         VARCHAR(50) NOT NULL UNIQUE,  -- FREE, PRO, ENTERPRISE
  descripcion    TEXT,
  precio_mensual INTEGER DEFAULT 0,            -- en colones
  max_usuarios   INTEGER DEFAULT 3,
  max_productos  INTEGER DEFAULT 100,
  max_bodegas    INTEGER DEFAULT 1,
  max_cajas      INTEGER DEFAULT 1,
  tiene_pos      BOOLEAN DEFAULT FALSE,
  tiene_crm      BOOLEAN DEFAULT FALSE,
  tiene_compras  BOOLEAN DEFAULT FALSE,
  tiene_reportes BOOLEAN DEFAULT FALSE,
  tiene_ai       BOOLEAN DEFAULT FALSE,
  tiene_api      BOOLEAN DEFAULT FALSE,
  activo         BOOLEAN DEFAULT TRUE
);

-- Enriquecer empresa con tenant metadata
ALTER TABLE hot_click_empresa_tb
  ADD COLUMN IF NOT EXISTS fk_id_plan       BIGINT REFERENCES hot_click_plan_tb(id_plan),
  ADD COLUMN IF NOT EXISTS estado_plan      VARCHAR(20) DEFAULT 'ACTIVO',  -- ACTIVO, VENCIDO, TRIAL
  ADD COLUMN IF NOT EXISTS fecha_venc_plan  DATE,
  ADD COLUMN IF NOT EXISTS trial_hasta      DATE,
  ADD COLUMN IF NOT EXISTS slug             VARCHAR(100) UNIQUE,  -- para subdominios
  ADD COLUMN IF NOT EXISTS timezone         VARCHAR(50) DEFAULT 'America/Costa_Rica',
  ADD COLUMN IF NOT EXISTS moneda_defecto   VARCHAR(3) DEFAULT 'CRC';

-- Planes seed
INSERT INTO hot_click_plan_tb (nombre, descripcion, precio_mensual, max_usuarios, max_productos,
  max_bodegas, max_cajas, tiene_pos, tiene_crm, tiene_compras, tiene_reportes, tiene_ai, tiene_api)
VALUES
  ('FREE',       'Plan gratuito',       0,       2,   50,  1, 1, false, false, false, false, false, false),
  ('PRO',        'Plan profesional',    19900,   10,  500, 2, 3, true,  true,  true,  true,  false, false),
  ('ENTERPRISE', 'Plan empresarial',    49900,   50,  -1,  5, 10, true,  true,  true,  true,  true,  true)
ON CONFLICT DO NOTHING;
```

### Backend nuevo/modificado

| Archivo | Descripción |
|---------|-------------|
| `model/Plan.java` | Entidad JPA para `hot_click_plan_tb` con todos los límites y flags |
| `model/Empresa.java` | Campos nuevos: `plan`, `estadoPlan`, `fechaVencPlan`, `trialHasta`, `slug`, `timezone`, `monedaDefecto` |
| `repository/PlanRepository.java` | `findByNombre()`, `findAllActivos()` |
| `security/TenantContext.java` | `ThreadLocal<Long>` — almacena `empresaId` del JWT actual. `TenantContext.get()` / `.set()` / `.clear()` |
| `security/TenantFilter.java` | `OncePerRequestFilter`: extrae `empresaId` del JWT → `TenantContext.set()`. `afterCompletion` limpia el contexto |
| `security/PlanGuard.java` | Anotación `@RequiresPlan("PRO")` + AOP Aspect que lee `TenantContext.get()` y valida el plan de la empresa |
| `security/LimitGuard.java` | Aspecto AOP para `@CheckLimit("max_productos")`: cuenta registros de la empresa y lanza `PlanLimitException` si se excede |
| `exception/PlanLimitException.java` | `RuntimeException` con HTTP 402 Payment Required |
| `service/TenantService.java` | `getEmpresaActual()`, `validarLimite(String campo, long actual)`, `tieneFeature(String feature)` |
| Todos los `*Controller.java` | Reemplazar lookups hardcodeados por `TenantContext.get()` donde no se haga ya |

### Frontend nuevo/modificado

| Archivo | Descripción |
|---------|-------------|
| `store/tenantStore.js` | Zustand: `plan`, `limites`, `features`, `trialDias`. Cargado en login desde `/api/tenant/info` |
| `hooks/usePlan.js` | `usePlan()` → `{ plan, hasFeature, isAtLimit, trialDias }` |
| `components/ui/PlanGate.jsx` | `<PlanGate feature="pos">` — renderiza children si la empresa tiene la feature, sino muestra `<UpgradePrompt>` |
| `components/ui/UpgradePrompt.jsx` | Banner/modal de upgrade con CTA a planes. Props: `feature`, `planRequerido` |
| `components/ui/LimitWarning.jsx` | Banner de aviso cuando el uso está al 80%+ del límite (productos, usuarios, etc.) |
| `pages/admin/AdminPlanes.jsx` | Página de selección y comparación de planes. Tabla de features. Botón "Upgrade" integrado con Stripe (F14) |

### APIs nuevas

| Método | Ruta | Descripción |
|--------|------|-------------|
| GET | `/api/tenant/info` | Plan, limites, features, días de trial, timezone |
| GET | `/api/tenant/uso` | Uso actual: `{ productos: 47, max: 100, ... }` |
| GET | `/api/planes` | Listado de planes disponibles (público) |

### UX / Seguridad
- `TenantFilter` se registra antes de `JwtAuthFilter`; si no hay `empresa_id` en JWT → 403
- `PlanGate` en frontend oculta menús de features que el plan no incluye (sidebar dinámico)
- Banner de trial: si `trialHasta` está a ≤7 días, banner naranja permanente
- Plan VENCIDO: redirige a `/plan/vencido` con opción de pagar (solo lectura mientras tanto)

---

## FASE F11 — Plan System + Feature Flags

### Objetivo
Sistema granular de feature flags por empresa, independiente del plan (permite activar/desactivar features individualmente para pruebas A/B, early access, o excepciones comerciales).

### Migración V31
```sql
CREATE TABLE IF NOT EXISTS hot_click_feature_flag_tb (
  id_flag     BIGSERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL UNIQUE,  -- 'facturacion_electronica', 'ai_copilot'
  descripcion TEXT,
  activo_defecto BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS hot_click_empresa_feature_tb (
  fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa),
  fk_id_flag    BIGINT REFERENCES hot_click_feature_flag_tb(id_flag),
  activo        BOOLEAN DEFAULT TRUE,
  fecha_exp     TIMESTAMP,  -- NULL = sin expiración
  PRIMARY KEY (fk_id_empresa, fk_id_flag)
);

-- Flags iniciales
INSERT INTO hot_click_feature_flag_tb (nombre, descripcion, activo_defecto) VALUES
  ('facturacion_electronica', 'Integración Hacienda CR', false),
  ('ai_copilot',              'Asistente AI de negocio', false),
  ('ai_forecast',             'Predicción de demanda AI', false),
  ('mobile_pos',              'Modo POS móvil/tablet', false),
  ('self_checkout',           'Terminal autoservicio', false),
  ('split_payments',          'Pagos divididos', false),
  ('marketplace_plugins',     'Marketplace de plugins', false),
  ('api_keys',                'API keys y webhooks', false),
  ('white_label',             'White label (branding custom)', false)
ON CONFLICT DO NOTHING;
```

### Backend nuevo/modificado

| Archivo | Descripción |
|---------|-------------|
| `model/FeatureFlag.java` | Entidad `hot_click_feature_flag_tb` |
| `model/EmpresaFeature.java` | Entidad join `hot_click_empresa_feature_tb` con FK compuesta |
| `repository/FeatureFlagRepository.java` | `findFlagsActivosParaEmpresa(empresaId)` — query nativa con JOIN |
| `service/FeatureFlagService.java` | `isEnabled(String flag, Long empresaId)` — caché en memoria (Caffeine) de 5 min; `activar()`, `desactivar()`, `listarTodos()` |
| `controller/FeatureFlagController.java` | `GET /api/admin/flags` (super-admin), `POST /api/admin/flags/{empresa}/{flag}/toggle` — solo `ADMIN_IT` global |
| `TenantService.java` | Integra `FeatureFlagService`: `tieneFeature()` consulta tanto plan como flags individuales |

### Frontend nuevo/modificado

| Archivo | Descripción |
|---------|-------------|
| `store/tenantStore.js` | Agrega `flags: Set<string>` cargados desde `/api/tenant/info` |
| `hooks/usePlan.js` | `hasFeature(flag)` ahora combina plan + flags individuales |
| `pages/admin/AdminSuperAdmin.jsx` | Panel `ADMIN_IT` global: tabla de empresas con plan, estado, toggle de flags por empresa, cambio de plan manual |

### Innovación: Flag Scheduling
- Campo `fecha_exp` permite activar un feature hasta una fecha → A/B testing con expiración automática
- Backend verifica `fecha_exp` en `FeatureFlagService` antes de devolver `true`

---

## FASE F12 — Facturación Electrónica Costa Rica (Hacienda)

### Objetivo
Generar, firmar y enviar comprobantes electrónicos XML a la plataforma de Hacienda CR. Compatible con: **Facturas electrónicas**, **Tiquetes**, **Notas de crédito**, **Notas de débito**. Diseño extensible a LATAM (F25).

### Contexto legal
- API: Hacienda CR (`api.hacienda.go.cr`)
- Formatos: XML 4.3 (2023)
- Firma: PKCS#12 con cédula jurídica del contribuyente
- Clave numérica única: 50 dígitos (país+fecha+cédula+consecutivo+situación+seguridad)

### Migración V32
```sql
CREATE TABLE IF NOT EXISTS hot_click_comprobante_fiscal_tb (
  id_comprobante     BIGSERIAL PRIMARY KEY,
  fk_id_empresa      BIGINT REFERENCES hot_click_empresa_tb(id_empresa),
  fk_id_pedido       BIGINT REFERENCES hot_click_pedido_tb(id_pedido),
  tipo               VARCHAR(20) NOT NULL,     -- FACTURA, TIQUETE, NOTA_CREDITO, NOTA_DEBITO
  clave_numerica     VARCHAR(50) UNIQUE NOT NULL,
  numero_consecutivo VARCHAR(20),
  estado             VARCHAR(20) DEFAULT 'PENDIENTE',  -- PENDIENTE, ACEPTADO, RECHAZADO, ERROR
  xml_enviado        TEXT,
  xml_respuesta      TEXT,
  fecha_emision      TIMESTAMP DEFAULT NOW(),
  fecha_respuesta    TIMESTAMP,
  referencia_id      BIGINT,  -- para notas crédito/débito: id del comprobante original
  total_neto         INTEGER,
  total_impuesto     INTEGER,
  total_factura      INTEGER,
  moneda             VARCHAR(3) DEFAULT 'CRC'
);

-- Config fiscal por empresa
ALTER TABLE hot_click_empresa_tb
  ADD COLUMN IF NOT EXISTS cedula_juridica    VARCHAR(20),
  ADD COLUMN IF NOT EXISTS nombre_comercial   VARCHAR(200),
  ADD COLUMN IF NOT EXISTS actividad_economica VARCHAR(10),
  ADD COLUMN IF NOT EXISTS usuario_hacienda   VARCHAR(100),
  ADD COLUMN IF NOT EXISTS clave_hacienda     TEXT,  -- encriptada AES-256
  ADD COLUMN IF NOT EXISTS cert_p12_path      VARCHAR(500),
  ADD COLUMN IF NOT EXISTS pin_cert           TEXT;  -- encriptada AES-256
```

### Backend nuevo

| Archivo | Descripción |
|---------|-------------|
| `model/ComprobanteFiscal.java` | Entidad completa con todos los campos del comprobante |
| `repository/ComprobanteFiscalRepository.java` | `findByPedidoId()`, `findByEmpresaAndEstado()`, `findByClaveNumerica()` |
| `service/HaciendaTokenService.java` | OAuth2 con Hacienda (`api.hacienda.go.cr/token`); caché de token + refresh automático |
| `service/XmlFacturaBuilder.java` | Genera XML 4.3 desde `Pedido` + items. Usa `javax.xml` + JAXB. Maneja IVA (13%), productos exentos, descuentos |
| `service/FirmaDigitalService.java` | Carga PKCS#12 desde Storage, firma XML con `java.security` + `org.apache.xml.security` |
| `service/ClaveNumericaService.java` | Genera la clave de 50 dígitos según algoritmo Hacienda |
| `service/HaciendaApiClient.java` | `POST /api/v1/recepcion` (envío), `GET /api/v1/recepcion/{clave}` (consulta estado) |
| `service/FacturacionService.java` | Orquesta: genera XML → firma → envía → guarda respuesta → actualiza estado. Retry con backoff para rechazados |
| `controller/FacturaController.java` | `POST /api/facturas/emitir/{pedidoId}`, `GET /api/facturas/{id}/xml`, `GET /api/facturas/{id}/pdf`, `POST /api/facturas/{id}/nota-credito`, `GET /api/facturas?page=&desde=&hasta=` |
| `service/PdfFacturaService.java` | Genera PDF desde el comprobante usando iText/OpenPDF. Layout estándar Hacienda |
| `config/EncryptionConfig.java` | AES-256 para credenciales Hacienda guardadas en BD |

### Frontend nuevo/modificado

| Archivo | Descripción |
|---------|-------------|
| `services/facturaService.js` | `emitir(pedidoId)`, `getXml(id)`, `getPdf(id)`, `notaCredito(id, motivo)`, `listar(params)` |
| `pages/admin/AdminFacturas.jsx` | Lista de comprobantes: tipo (badge), clave, estado (coloreado), total, acciones (Ver XML, Descargar PDF, Nota crédito) |
| `components/admin/FacturaDetailModal.jsx` | Modal con XML formateado, estado Hacienda, botón reenviar si error |
| `pages/admin/AdminConfigFiscal.jsx` | Formulario de configuración fiscal: cédula, actividad económica, upload PKCS#12, credenciales Hacienda |
| `pages/admin/AdminOrders.jsx` | Botón "Emitir Factura" por pedido entregado (si feature `facturacion_electronica` activo) |
| `components/pos/POSReceipt.jsx` | Sección "Comprobante Fiscal": número consecutivo, clave, QR de validación si fue emitido |

### Seguridad
- Credenciales Hacienda (usuario, clave, PIN) se guardan encriptadas AES-256 en BD
- PKCS#12 se guarda en Supabase Storage, ruta guardada en BD. Nunca en classpath
- Permiso nuevo: `factura.emitir`, `factura.anular` — solo ADMIN_CLIENTE y CONTABILIDAD
- Rate limiting en `/api/facturas/emitir` → máx 10 req/min por empresa (Hacienda tiene límites)

### Flujo completo
1. Admin marca pedido ENTREGADO → aparece botón "Emitir Factura"
2. `FacturacionService` genera clave numérica única → construye XML → firma con PKCS#12
3. Envía a Hacienda API → guarda respuesta XML (puede ser asíncrono con retry)
4. Estado cambia a ACEPTADO → PDF disponible para descarga
5. Si error → estado ERROR → admin puede reintentar desde `AdminFacturas`

---

## FASE F13 — ABAC Avanzado (Attribute-Based Access Control)

### Objetivo
Ir más allá de roles y permisos granulares: agregar **políticas de acceso** basadas en atributos de contexto (empresa, bodega, horario, IP, tipo de recurso). Preparar el sistema para escenarios enterprise donde un usuario solo puede ver pedidos de su bodega, o solo operar en horario de 8am–8pm.

### Migración V33
```sql
CREATE TABLE IF NOT EXISTS hot_click_politica_acceso_tb (
  id_politica    BIGSERIAL PRIMARY KEY,
  nombre         VARCHAR(100) NOT NULL,
  descripcion    TEXT,
  fk_id_empresa  BIGINT REFERENCES hot_click_empresa_tb(id_empresa),
  recurso        VARCHAR(50),   -- 'pedido', 'producto', 'venta_pos', '*'
  accion         VARCHAR(30),   -- 'read', 'write', 'delete', '*'
  condicion_json JSONB,         -- { "bodegas": [1,2], "horario": {"desde": "08:00", "hasta": "20:00"} }
  activo         BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS hot_click_rol_politica_tb (
  fk_id_rol      BIGINT REFERENCES hot_click_rol_tb(id_rol),
  fk_id_politica BIGINT REFERENCES hot_click_politica_acceso_tb(id_politica),
  PRIMARY KEY (fk_id_rol, fk_id_politica)
);

-- Bodega asignada al usuario (para ABAC de bodega)
ALTER TABLE hot_click_usuario_rol_tb
  ADD COLUMN IF NOT EXISTS fk_id_bodega BIGINT REFERENCES hot_click_bodega_tb(id_bodega);
```

### Backend nuevo/modificado

| Archivo | Descripción |
|---------|-------------|
| `model/PoliticaAcceso.java` | Entidad con `condicionJson` (Map<String, Object>) |
| `repository/PoliticaAccesoRepository.java` | `findByRolIdAndRecursoAndAccion(rolId, recurso, accion)` |
| `service/AbacEvaluatorService.java` | `isAllowed(Usuario, String recurso, String accion, Map<String,Object> context)` — evalúa políticas activas contra el contexto: bodega actual, hora local, IP de origen |
| `security/AbacInterceptor.java` | `HandlerInterceptor` que evalúa ABAC para recursos configurados. Lee política de caché (5 min) |
| `annotation/AbacProtected.java` | Anotación `@AbacProtected(recurso="pedido", accion="write")` para métodos de servicio |
| `controller/PoliticaController.java` | CRUD de políticas: `GET/POST/PUT/DELETE /api/abac/politicas` — solo ADMIN_IT |

### Frontend nuevo/modificado

| Archivo | Descripción |
|---------|-------------|
| `pages/admin/AdminAcceso.jsx` | Tabla de políticas con condición JSON visualizada en forma amigable (chips: "Bodegas: 1,2", "Horario: 8am–8pm") |
| `components/admin/PoliticaFormModal.jsx` | Formulario visual para crear/editar políticas: selector de recurso, acción, condiciones con builder visual |

---

## FASE F14 — Billing Engine + Suscripciones

### Objetivo
Motor de suscripciones SaaS: cobra automáticamente el plan mensual/anual, genera facturas internas del SaaS, maneja upgrades/downgrades, pruebas gratuitas y vencimientos.

### Migración V34
```sql
CREATE TABLE IF NOT EXISTS hot_click_suscripcion_tb (
  id_suscripcion   BIGSERIAL PRIMARY KEY,
  fk_id_empresa    BIGINT REFERENCES hot_click_empresa_tb(id_empresa),
  fk_id_plan       BIGINT REFERENCES hot_click_plan_tb(id_plan),
  estado           VARCHAR(20) DEFAULT 'TRIAL',  -- TRIAL, ACTIVA, PAUSADA, CANCELADA, VENCIDA
  ciclo            VARCHAR(10) DEFAULT 'MENSUAL', -- MENSUAL, ANUAL
  fecha_inicio     DATE NOT NULL DEFAULT CURRENT_DATE,
  fecha_renovacion DATE,
  fecha_cancelacion DATE,
  stripe_sub_id    VARCHAR(100),  -- ID en Stripe (si usa tarjeta)
  metodo_pago      VARCHAR(20),   -- STRIPE, SINPE, MANUAL
  precio_final     INTEGER        -- puede diferir del plan (descuentos)
);

CREATE TABLE IF NOT EXISTS hot_click_factura_saas_tb (
  id_factura_saas  BIGSERIAL PRIMARY KEY,
  fk_id_empresa    BIGINT REFERENCES hot_click_empresa_tb(id_empresa),
  fk_id_suscripcion BIGINT REFERENCES hot_click_suscripcion_tb(id_suscripcion),
  periodo_desde    DATE,
  periodo_hasta    DATE,
  monto            INTEGER,
  estado           VARCHAR(20) DEFAULT 'PENDIENTE', -- PENDIENTE, PAGADA, VENCIDA
  fecha_emision    TIMESTAMP DEFAULT NOW(),
  fecha_pago       TIMESTAMP,
  stripe_inv_id    VARCHAR(100),
  pdf_url          VARCHAR(500)
);
```

### Backend nuevo

| Archivo | Descripción |
|---------|-------------|
| `model/Suscripcion.java` | Entidad con Stripe ID y estados |
| `model/FacturaSaas.java` | Factura interna del SaaS (distinta a factura electrónica CR) |
| `repository/SuscripcionRepository.java` | `findByEmpresaId()`, `findRenovacionesPendientes(LocalDate fecha)` |
| `service/SuscripcionService.java` | `crearTrial(empresaId, plan)`, `upgrade(suscripcionId, nuevoPlan)`, `cancelar(id)`, `renovar(id)`, `verificarVencimientos()` (cron diario) |
| `service/StripeService.java` | Wraps Stripe Java SDK: `createSubscription()`, `updateSubscription()`, `cancelSubscription()`, `createInvoice()` |
| `controller/SuscripcionController.java` | `GET /api/suscripcion/actual`, `POST /api/suscripcion/upgrade`, `POST /api/suscripcion/cancelar` |
| `controller/BillingWebhookController.java` | `POST /api/webhooks/stripe` — procesa `invoice.paid`, `invoice.payment_failed`, `customer.subscription.deleted` |
| `schedule/BillingCronJob.java` | `@Scheduled(cron = "0 0 9 * * *")` — verifica vencimientos diariamente, envía emails de recordatorio |
| `controller/AdminBillingController.java` | Panel super-admin: `GET /api/superadmin/billing/empresas`, gestión manual de planes |

### Frontend nuevo

| Archivo | Descripción |
|---------|-------------|
| `pages/admin/AdminPlanes.jsx` | Comparador de planes con toggle mensual/anual, descuento anual visible, botón "Upgrade" abre checkout Stripe |
| `pages/admin/AdminSuscripcion.jsx` | Panel de suscripción actual: plan, estado, próxima renovación, historial de facturas, botón cancelar |
| `components/billing/StripeCheckout.jsx` | Integración Stripe Elements para pago con tarjeta |
| `components/ui/TrialBanner.jsx` | Banner global: "Tienes X días de prueba — Upgrade ahora" |
| `pages/plan/PlanVencido.jsx` | Página de plan vencido con opciones de renovar, solo lectura hasta pagar |

---

## FASE F15 — Mobile POS (PWA Offline-First)

### Objetivo
Convertir el POS en una **Progressive Web App** instalable en tablet/móvil con capacidad **offline**: registrar ventas sin internet y sincronizar cuando vuelva la conexión.

### Arquitectura Offline-First
```
IndexedDB (local) ←→ Service Worker ←→ Spring Boot API
    ↑                      ↑
Zustand POS store    Background Sync
```

### Backend nuevo

| Archivo | Descripción |
|---------|-------------|
| `controller/PosSyncController.java` | `POST /api/pos/sync/ventas` — recibe batch de ventas offline, las procesa secuencialmente. Devuelve `{ exitosas, fallidas, conflictos }` |
| `dto/PosVentaOfflineDTO.java` | Extiende `PosVentaDTO` con `uuidLocal` (UUID generado offline) y `timestampLocal` |
| `service/PosSyncService.java` | Procesa batch: detecta duplicados por `uuidLocal`, maneja conflictos de stock (venta que no pudo completarse offline) |
| `controller/PosConfigController.java` | `GET /api/pos/config/productos-cache` — devuelve todos los productos de la empresa en formato comprimido para precachear |

### Frontend nuevo/modificado

| Archivo | Descripción |
|---------|-------------|
| `public/sw.js` | Service Worker: caché de assets, estrategia Network-First para API, Background Sync para ventas offline |
| `public/manifest.json` | PWA manifest: nombre, ícono, colores, `display: standalone`, `start_url: /admin/pos` |
| `utils/posOfflineDB.js` | IndexedDB wrapper: `guardarVentaPendiente(venta)`, `getVentasPendientes()`, `eliminarVenta(uuid)` |
| `services/posSyncService.js` | `sincronizarVentas()` — lee IndexedDB, envía batch, limpia exitosas, reporta fallidas |
| `hooks/useOnlineStatus.js` | `useOnlineStatus()` — escucha `online`/`offline` events del browser |
| `pages/admin/pos/AdminPOS.jsx` | Banner offline (rojo) con contador de ventas pendientes; modo offline muestra stock desde caché local; "Sincronizar" manual en banner de reconexión |
| `components/pos/OfflineSyncStatus.jsx` | Widget en header del POS: ícono wifi, `N ventas pendientes de sync`, progress bar durante sync |

### Configuración PWA

| Archivo | Descripción |
|---------|-------------|
| `vite.config.js` | Agrega plugin `vite-plugin-pwa` con Workbox: runtime caching para `/api/productos/buscar`, precache de assets compilados |

### UX / Seguridad
- En modo offline: el POS funciona con stock pre-cacheado (última sync)
- Stock optimista: se descuenta localmente; al sincronizar, el servidor valida. Si no hay stock: la venta queda marcada CONFLICTO con alerta al cajero
- Las ventas offline no disparan emails (flag `sincronizadaOffline = true`)
- La primera carga en línea descarga productos al IndexedDB (< 500KB comprimido)

---

## FASE F16 — Smart Checkout: QR Ordering + Self-Checkout

### Objetivo
Clientes escanean un QR en el punto de venta (mesa, mostrador, vitrina) y hacen su pedido directamente desde el móvil sin asistencia. Sistema de mesas para restaurantes/cafeterías.

### Migración V36
```sql
CREATE TABLE IF NOT EXISTS hot_click_mesa_tb (
  id_mesa       BIGSERIAL PRIMARY KEY,
  fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa),
  numero        INTEGER,
  nombre        VARCHAR(50),
  zona          VARCHAR(50),
  estado        VARCHAR(20) DEFAULT 'LIBRE',  -- LIBRE, OCUPADA, RESERVADA
  qr_token      VARCHAR(100) UNIQUE
);

CREATE TABLE IF NOT EXISTS hot_click_qr_pedido_tb (
  id_qr         BIGSERIAL PRIMARY KEY,
  fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa),
  fk_id_mesa    BIGINT REFERENCES hot_click_mesa_tb(id_mesa),
  fk_id_producto BIGINT,    -- NULL si es QR de mesa completa
  qr_token      VARCHAR(100) UNIQUE NOT NULL,
  tipo          VARCHAR(20), -- MESA, PRODUCTO, CATALOGO
  activo        BOOLEAN DEFAULT TRUE,
  creado_en     TIMESTAMP DEFAULT NOW()
);
```

### Backend nuevo

| Archivo | Descripción |
|---------|-------------|
| `model/Mesa.java` | Entidad con número, zona, estado, QR token |
| `model/QrPedido.java` | QR token asociado a mesa, producto, o catálogo completo |
| `repository/MesaRepository.java` | `findByEmpresaId()`, `findByQrToken()` |
| `controller/MesaController.java` | CRUD mesas + `GET /api/mesas/{qrToken}/menu` (público, retorna catálogo de la empresa) |
| `controller/SelfCheckoutController.java` | `POST /api/self-checkout/pedido` — cliente crea pedido desde QR (sin auth, asociado a mesa). Valida QR token, crea `Pedido` con `origen=SELF_CHECKOUT` |
| `service/QrService.java` | `generarQrToken()`, `generarImagenQR(token)` usando ZXing library → PNG en base64 |

### Frontend nuevo/modificado

| Archivo | Descripción |
|---------|-------------|
| `pages/admin/AdminMesas.jsx` | Grid visual de mesas por zona: coloreadas por estado (libre/ocupada/reservada), drag-to-reorder, botón "Generar QR" descarga PNG |
| `pages/admin/AdminMesasMonitor.jsx` | Monitor en tiempo real (WebSocket/polling) del estado de mesas con pedidos activos por mesa |
| `pages/public/SelfCheckout.jsx` | Página pública `/sc/:qrToken` — catálogo mobile-first, carrito, checkout sin login (solo nombre + teléfono) |
| `components/pos/MesaSelector.jsx` | En AdminPOS: dropdown de mesa para asignar al turno actual |

### UX / Flujo
1. Admin genera QR para cada mesa → descarga imagen, la imprime
2. Cliente escanea → `/sc/{token}` → ve menú → pide → paga (SINPE/efectivo al mesero)
3. Pedido aparece en AdminOrders con origen SELF_CHECKOUT y número de mesa
4. POS puede asignarse a una mesa para cobrar el total al cerrar

---

## FASE F17 — Split Payments + Gift Cards

### Objetivo
Pagos divididos: un pedido se puede pagar con múltiples métodos (ej: mitad efectivo, mitad SINPE). Gift cards: saldo prepagado canjeable en tienda/POS.

### Migración V37
```sql
CREATE TABLE IF NOT EXISTS hot_click_pago_split_tb (
  id_pago       BIGSERIAL PRIMARY KEY,
  fk_id_pedido  BIGINT REFERENCES hot_click_pedido_tb(id_pedido),
  metodo        VARCHAR(30),
  monto         INTEGER NOT NULL,
  referencia    VARCHAR(100),
  creado_en     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hot_click_gift_card_tb (
  id_card       BIGSERIAL PRIMARY KEY,
  fk_id_empresa BIGINT REFERENCES hot_click_empresa_tb(id_empresa),
  codigo        VARCHAR(20) UNIQUE NOT NULL,
  saldo_inicial INTEGER NOT NULL,
  saldo_actual  INTEGER NOT NULL,
  estado        VARCHAR(20) DEFAULT 'ACTIVA',  -- ACTIVA, USADA, VENCIDA
  fecha_exp     DATE,
  creado_por    BIGINT REFERENCES hot_click_usuario_tb(id_usuario),
  creado_en     TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hot_click_gift_card_uso_tb (
  id_uso        BIGSERIAL PRIMARY KEY,
  fk_id_card    BIGINT REFERENCES hot_click_gift_card_tb(id_card),
  fk_id_pedido  BIGINT REFERENCES hot_click_pedido_tb(id_pedido),
  monto_usado   INTEGER NOT NULL,
  fecha_uso     TIMESTAMP DEFAULT NOW()
);
```

### Backend nuevo

| Archivo | Descripción |
|---------|-------------|
| `model/PagoSplit.java` | Una línea de pago: método + monto + referencia |
| `model/GiftCard.java` | Tarjeta con saldo, estado, expiración |
| `model/GiftCardUso.java` | Registro de cada uso |
| `repository/GiftCardRepository.java` | `findByCodigo()`, `findByEmpresaId()` |
| `service/SplitPaymentService.java` | Valida que la suma de splits == total del pedido. Registra cada split en BD |
| `service/GiftCardService.java` | `validar(codigo, monto)`, `canjear(codigo, monto, pedidoId)`, `generar(empresaId, monto, fechaExp)` |
| `controller/GiftCardController.java` | `GET /api/gift-cards`, `POST /api/gift-cards/generar`, `POST /api/gift-cards/{codigo}/canjear` |
| `controller/PosController.java` | Modificado: acepta `splits[]` en `PosVentaDTO`; si un split es tipo `GIFT_CARD`, llama `GiftCardService` |

### Frontend nuevo/modificado

| Archivo | Descripción |
|---------|-------------|
| `components/pos/POSPaymentPanel.jsx` | Modo split: `+ Agregar pago`, lista de splits con método+monto editable, indicador de total restante en tiempo real |
| `components/pos/GiftCardInput.jsx` | Input de código de gift card con validación en tiempo real, muestra saldo disponible |
| `pages/admin/AdminGiftCards.jsx` | Lista de gift cards: código, saldo, estado (coloreado), expiración, historial de uso. Botón "Generar nueva" |

---

## FASE F18 — White Label (Branding por Empresa)

### Objetivo
Cada empresa SaaS puede personalizar la apariencia de su panel admin y tienda: logo, colores primarios, nombre de marca, favicon, dominio custom.

### Migración V38
```sql
CREATE TABLE IF NOT EXISTS hot_click_branding_tb (
  id_branding     BIGSERIAL PRIMARY KEY,
  fk_id_empresa   BIGINT UNIQUE REFERENCES hot_click_empresa_tb(id_empresa),
  logo_url        VARCHAR(500),
  favicon_url     VARCHAR(500),
  nombre_marca    VARCHAR(100),
  color_primario  VARCHAR(7) DEFAULT '#3B82F6',  -- hex
  color_secundario VARCHAR(7) DEFAULT '#1E40AF',
  color_acento    VARCHAR(7) DEFAULT '#F59E0B',
  fuente_primaria VARCHAR(50) DEFAULT 'Inter',
  dominio_custom  VARCHAR(200),   -- para futuro: mystore.com → SaaS
  footer_texto    TEXT,
  activo          BOOLEAN DEFAULT TRUE
);
```

### Backend nuevo

| Archivo | Descripción |
|---------|-------------|
| `model/Branding.java` | Entidad con todos los campos de personalización |
| `repository/BrandingRepository.java` | `findByEmpresaId()` |
| `controller/BrandingController.java` | `GET /api/branding` (público, por empresa), `PUT /api/branding` (admin), `POST /api/branding/logo`, `POST /api/branding/favicon` |

### Frontend nuevo/modificado

| Archivo | Descripción |
|---------|-------------|
| `store/brandingStore.js` | Carga branding de la empresa actual al login. Expone `logoUrl`, `colors`, `nombre` |
| `hooks/useBranding.js` | `useBranding()` — acceso al store + helper para inyectar CSS variables |
| `components/BrandingProvider.jsx` | Context provider que inyecta `--color-primary`, `--color-secondary` en `:root` al montar |
| `pages/admin/AdminBranding.jsx` | Editor visual: preview en tiempo real de logo, colores, nombre. Color pickers con eyedropper |
| `layouts/AdminLayout.jsx` | Usa `useBranding()` para mostrar logo y colores de la empresa en vez de los de HOTCLICK |

---

## FASE F19 — Marketplace de Plugins

### Objetivo
Ecosistema de plugins de terceros: los desarrolladores pueden crear módulos (contabilidad, delivery, ecommerce externo) que se instalan por empresa. Arquitectura sandboxed vía webhooks + API gateway.

### Migración V39
```sql
CREATE TABLE IF NOT EXISTS hot_click_plugin_tb (
  id_plugin       BIGSERIAL PRIMARY KEY,
  nombre          VARCHAR(100) NOT NULL,
  slug            VARCHAR(100) UNIQUE NOT NULL,
  descripcion     TEXT,
  version         VARCHAR(20),
  autor           VARCHAR(100),
  url_icono       VARCHAR(500),
  url_config      VARCHAR(500),   -- endpoint de configuración del plugin
  webhook_url     VARCHAR(500),   -- donde HOTCLICK envía eventos
  eventos         TEXT[],         -- ['pedido.creado', 'venta.pos.creada']
  precio_mensual  INTEGER DEFAULT 0,
  plan_minimo     VARCHAR(20),    -- FREE, PRO, ENTERPRISE
  aprobado        BOOLEAN DEFAULT FALSE,
  activo          BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS hot_click_plugin_instalacion_tb (
  id_instalacion  BIGSERIAL PRIMARY KEY,
  fk_id_empresa   BIGINT REFERENCES hot_click_empresa_tb(id_empresa),
  fk_id_plugin    BIGINT REFERENCES hot_click_plugin_tb(id_plugin),
  estado          VARCHAR(20) DEFAULT 'ACTIVO',
  config_json     JSONB,
  instalado_en    TIMESTAMP DEFAULT NOW(),
  UNIQUE (fk_id_empresa, fk_id_plugin)
);
```

### Backend nuevo

| Archivo | Descripción |
|---------|-------------|
| `model/Plugin.java` | Entidad de plugin del marketplace |
| `model/PluginInstalacion.java` | Instalación por empresa con config JSON |
| `repository/PluginRepository.java` | `findAprobadosActivos()`, `findBySlug()` |
| `service/PluginEventService.java` | `dispatch(String evento, Long empresaId, Object payload)` — busca plugins instalados que escuchan el evento, envía webhook HTTP async con retry |
| `service/PluginService.java` | `instalar(empresaId, pluginId)`, `desinstalar()`, `getInstalados(empresaId)` |
| `controller/PluginController.java` | `GET /api/plugins` (marketplace público), `GET /api/plugins/instalados`, `POST /api/plugins/{id}/instalar`, `DELETE /api/plugins/{id}` |
| `controller/AdminPluginController.java` | Super-admin: aprobar/rechazar plugins, gestión del marketplace |

### Frontend nuevo

| Archivo | Descripción |
|---------|-------------|
| `pages/admin/AdminMarketplace.jsx` | Grid de plugins: icono, nombre, precio, rating, botón instalar. Filtros por categoría |
| `pages/admin/AdminPluginsInstalados.jsx` | Lista de plugins activos, configuración por plugin (iframe del `url_config`), botón desinstalar |

---

## FASE F20 — Developer Platform (API Keys + Webhooks + SDK)

### Objetivo
HOTCLICK como plataforma abierta: empresas y developers externos pueden integrar sus propios sistemas vía API Keys autenticadas, suscribirse a webhooks de eventos, y usar un SDK documentado.

### Migración V40
```sql
CREATE TABLE IF NOT EXISTS hot_click_api_key_tb (
  id_key         BIGSERIAL PRIMARY KEY,
  fk_id_empresa  BIGINT REFERENCES hot_click_empresa_tb(id_empresa),
  nombre         VARCHAR(100),
  key_prefix     VARCHAR(8) NOT NULL,   -- primeros 8 chars visibles
  key_hash       VARCHAR(64) NOT NULL,  -- SHA-256 del key completo
  permisos       TEXT[],               -- ['productos.read', 'pedidos.read', 'pos.write']
  ultimo_uso     TIMESTAMP,
  expira_en      TIMESTAMP,
  activo         BOOLEAN DEFAULT TRUE,
  creado_en      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hot_click_webhook_tb (
  id_webhook     BIGSERIAL PRIMARY KEY,
  fk_id_empresa  BIGINT REFERENCES hot_click_empresa_tb(id_empresa),
  url            VARCHAR(500) NOT NULL,
  eventos        TEXT[],              -- ['pedido.creado', 'pago.aprobado', 'stock.bajo']
  secret         VARCHAR(64),         -- HMAC-SHA256 signing secret
  activo         BOOLEAN DEFAULT TRUE,
  creado_en      TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS hot_click_webhook_log_tb (
  id_log         BIGSERIAL PRIMARY KEY,
  fk_id_webhook  BIGINT REFERENCES hot_click_webhook_tb(id_webhook),
  evento         VARCHAR(50),
  payload_json   JSONB,
  status_code    INTEGER,
  respuesta      TEXT,
  intentos       INTEGER DEFAULT 1,
  enviado_en     TIMESTAMP DEFAULT NOW(),
  exito          BOOLEAN
);
```

### Backend nuevo

| Archivo | Descripción |
|---------|-------------|
| `model/ApiKey.java` | API Key con hash, prefijo, permisos array |
| `model/Webhook.java` | Webhook subscription con URL, eventos, secret |
| `model/WebhookLog.java` | Log de cada entrega con status y respuesta |
| `security/ApiKeyAuthFilter.java` | `OncePerRequestFilter`: extrae `Authorization: Bearer hck_...` → busca por SHA-256 hash → autentica empresa sin JWT |
| `service/WebhookDispatchService.java` | `dispatch(String evento, Long empresaId, Object payload)` — firma payload HMAC-SHA256, envía HTTP async con retry exponencial (1s, 5s, 30s) |
| `service/ApiKeyService.java` | `generar(empresaId, nombre, permisos)` — genera key segura con `SecureRandom`, guarda hash. La key completa solo se muestra una vez |
| `controller/ApiKeyController.java` | `GET/POST/DELETE /api/developer/keys` |
| `controller/WebhookController.java` | `GET/POST/PUT/DELETE /api/developer/webhooks`, `GET /api/developer/webhooks/{id}/logs`, `POST /api/developer/webhooks/{id}/test` |
| `controller/PublicApiController.java` | Endpoints documentados para consumo externo con API Key: `GET /api/v1/productos`, `GET /api/v1/pedidos`, etc. |

### Frontend nuevo

| Archivo | Descripción |
|---------|-------------|
| `pages/admin/AdminDeveloper.jsx` | Portal de developer: tabs Keys / Webhooks / Logs / Documentación |
| `components/developer/ApiKeyCard.jsx` | Tarjeta de API key: prefijo visible, permisos como chips, botón "Revocar" |
| `components/developer/WebhookCard.jsx` | Tarjeta de webhook: URL, eventos suscritos, último log, botón test |
| `components/developer/WebhookLogs.jsx` | Tabla de logs: evento, código HTTP, tiempo, payload expandible |

### Eventos disponibles para webhooks

| Evento | Descripción |
|--------|-------------|
| `pedido.creado` | Nuevo pedido (online o POS) |
| `pedido.estado.cambiado` | Cambio de estado del pedido |
| `pago.aprobado` | Pago procesado exitosamente |
| `pago.fallido` | Pago rechazado |
| `stock.bajo` | Producto alcanza stock mínimo |
| `stock.agotado` | Producto llega a 0 |
| `venta.pos.creada` | Venta en POS registrada |
| `cliente.nuevo` | Registro de nuevo cliente |
| `factura.emitida` | Comprobante fiscal generado |

---

## FASE F21 — AI Smart Inventory (Predicción de Stock)

### Objetivo
Modelo de predicción de demanda por producto/período usando datos históricos de ventas. Sugiere cuándo y cuánto reordenar antes de que el stock llegue a cero.

### Migración V41
```sql
CREATE TABLE IF NOT EXISTS hot_click_prediccion_stock_tb (
  id_pred        BIGSERIAL PRIMARY KEY,
  fk_id_empresa  BIGINT REFERENCES hot_click_empresa_tb(id_empresa),
  fk_id_producto BIGINT REFERENCES hot_click_producto_tb(id_producto),
  fecha_calculo  TIMESTAMP DEFAULT NOW(),
  demanda_7d     INTEGER,    -- unidades proyectadas próximos 7 días
  demanda_30d    INTEGER,    -- próximos 30 días
  fecha_agotamiento DATE,    -- cuándo se acaba el stock si no se repone
  confianza      NUMERIC(5,2), -- % de confianza del modelo
  modelo         VARCHAR(50)  -- 'moving_avg_30d', 'weighted_avg', etc.
);

CREATE TABLE IF NOT EXISTS hot_click_reorden_sugerencia_tb (
  id_sugerencia  BIGSERIAL PRIMARY KEY,
  fk_id_empresa  BIGINT REFERENCES hot_click_empresa_tb(id_empresa),
  fk_id_producto BIGINT REFERENCES hot_click_producto_tb(id_producto),
  fk_id_proveedor BIGINT REFERENCES hot_click_proveedor_tb(id_proveedor),
  cantidad_sugerida INTEGER,
  urgencia       VARCHAR(20),  -- CRITICA, ALTA, MEDIA, BAJA
  razon          TEXT,         -- 'Stock actual: 3. Se agota en 4 días según ventas promedio'
  creada_en      TIMESTAMP DEFAULT NOW(),
  atendida       BOOLEAN DEFAULT FALSE
);
```

### Backend nuevo

| Archivo | Descripción |
|---------|-------------|
| `service/DemandaForecastService.java` | Motor de predicción: media móvil ponderada de 30 días, ajuste por estacionalidad (día de semana), cálculo de fecha de agotamiento. Sin ML externo: algoritmos estadísticos en Java puro |
| `service/ReordenService.java` | Compara predicción vs stock actual vs stock mínimo. Genera sugerencias priorizadas por urgencia. Considera proveedor habitual del producto |
| `schedule/ForecastCronJob.java` | `@Scheduled(cron = "0 0 3 * * *")` — recalcula predicciones nocturnamente para todos los productos activos |
| `controller/ForecastController.java` | `GET /api/ai/forecast?productoId=`, `GET /api/ai/reordenes`, `PUT /api/ai/reordenes/{id}/atender` |

### Frontend nuevo/modificado

| Archivo | Descripción |
|---------|-------------|
| `pages/admin/AdminInventarioAI.jsx` | Dashboard AI: tabla de productos en riesgo con predicción de agotamiento (barra de tiempo visual), demanda proyectada, confianza del modelo |
| `components/admin/ReordenSugerencia.jsx` | Card de sugerencia: producto, cantidad, urgencia (badge rojo/naranja/amarillo), razón, botón "Crear Orden de Compra" directo |
| `pages/admin/AdminReportes.jsx` | Tab "IA Inventario" con widget de próximas sugerencias y acceso a `AdminInventarioAI` |

### Algoritmos implementados

| Modelo | Descripción | Cuándo se usa |
|--------|-------------|---------------|
| Media móvil simple 30d | Promedio de unidades vendidas últimos 30 días | Default |
| Media móvil ponderada | Más peso a datos recientes (semana actual = 40%, anterior = 35%, resto = 25%) | Productos con ventas variables |
| Por día de semana | Factoriza el día de semana (ej: más ventas el viernes) | Productos con patrón semanal claro |

---

## FASE F22 — AI Business Copilot (Asistente de Negocio)

### Objetivo
Asistente conversacional en el panel admin que responde preguntas de negocio en lenguaje natural. Ej: "¿Cuál fue mi producto más vendido este mes?", "¿Cuánto gasté en envíos vs ingresos?". Usa la API de Claude para razonar sobre datos de la empresa.

### Migración V42
```sql
CREATE TABLE IF NOT EXISTS hot_click_copilot_sesion_tb (
  id_sesion      BIGSERIAL PRIMARY KEY,
  fk_id_empresa  BIGINT REFERENCES hot_click_empresa_tb(id_empresa),
  fk_id_usuario  BIGINT REFERENCES hot_click_usuario_tb(id_usuario),
  iniciada_en    TIMESTAMP DEFAULT NOW(),
  mensajes_count INTEGER DEFAULT 0
);

CREATE TABLE IF NOT EXISTS hot_click_copilot_mensaje_tb (
  id_mensaje     BIGSERIAL PRIMARY KEY,
  fk_id_sesion   BIGINT REFERENCES hot_click_copilot_sesion_tb(id_sesion),
  rol            VARCHAR(10),  -- 'user', 'assistant'
  contenido      TEXT,
  tokens_usados  INTEGER,
  creado_en      TIMESTAMP DEFAULT NOW()
);
```

### Backend nuevo

| Archivo | Descripción |
|---------|-------------|
| `service/CopilotDataService.java` | Construye el "contexto de negocio": KPIs del mes (ingresos, ventas POS, clientes nuevos, top 5 productos, gastos, margen), stock crítico. Retorna JSON estructurado para el prompt |
| `service/CopilotService.java` | Llama a Claude API (`claude-sonnet-4-6`) con: system prompt de contexto de negocio + historial de mensajes + pregunta del usuario. Streaming de respuesta via SSE |
| `controller/CopilotController.java` | `POST /api/ai/copilot/mensaje` (SSE stream), `GET /api/ai/copilot/historial`, `DELETE /api/ai/copilot/sesion` |

### Prompt de sistema (template)
```
Eres el asistente de negocio de {nombre_empresa}. Tienes acceso a los siguientes datos actuales:

PERÍODO: Últimos 30 días ({desde} al {hasta})
INGRESOS TOTALES: ₡{ingresos}
VENTAS POS: ₡{ventas_pos} ({pct_pos}% del total)
VENTAS ONLINE: ₡{ventas_online}
CLIENTES NUEVOS: {clientes_nuevos}
PEDIDOS COMPLETADOS: {pedidos}
TICKET PROMEDIO: ₡{ticket_promedio}
GASTOS: ₡{gastos_total}
MARGEN NETO: {margen}%

TOP 5 PRODUCTOS:
{top_productos}

STOCK CRÍTICO (≤ stock mínimo): {stock_critico}

Responde siempre en español. Sé conciso y orientado a acción. Si el usuario pregunta por datos que no tienes, dilo claramente.
```

### Frontend nuevo

| Archivo | Descripción |
|---------|-------------|
| `components/admin/CopilotChat.jsx` | Widget flotante (bottom-right): chat con burbuja de mensaje, streaming de respuesta (texto aparece letra a letra), sugerencias rápidas de preguntas frecuentes |
| `pages/admin/AdminDashboard.jsx` | Botón "Pregúntale a tu asistente AI" abre `CopilotChat` |
| `hooks/useCopilot.js` | `sendMessage(text)` — maneja SSE stream, acumula el texto de respuesta |

---

## FASE F23 — AI Demand Forecasting (Pronóstico de Demanda)

### Objetivo
Forecasting de demanda a 90 días por producto y categoría, con análisis de estacionalidad, ciclos de vida de producto, y simulación de escenarios (qué pasa si bajo el precio 10%).

### Migración V43
```sql
CREATE TABLE IF NOT EXISTS hot_click_demanda_forecast_tb (
  id_forecast    BIGSERIAL PRIMARY KEY,
  fk_id_empresa  BIGINT,
  fk_id_producto BIGINT,
  fk_id_categoria BIGINT,
  tipo           VARCHAR(20),  -- PRODUCTO, CATEGORIA, EMPRESA
  horizonte_dias INTEGER,      -- 7, 30, 90
  fecha_inicio   DATE,
  unidades       INTEGER[],    -- array: una proyección por día
  ingresos       INTEGER[],
  lower_bound    INTEGER[],    -- intervalo de confianza inferior
  upper_bound    INTEGER[],    -- intervalo de confianza superior
  metodo         VARCHAR(50),
  calculado_en   TIMESTAMP DEFAULT NOW()
);
```

### Backend nuevo

| Archivo | Descripción |
|---------|-------------|
| `service/SeasonalityAnalyzer.java` | Detecta patrones: día de semana, quincena, mes del año. Genera índices de estacionalidad para ajustar proyecciones |
| `service/ProductLifecycleService.java` | Clasifica productos en: NUEVO (< 3 meses), CRECIMIENTO, MADUREZ, DECLIVE basado en tendencia de ventas |
| `service/DemandForecastingService.java` | Holt-Winters triple exponential smoothing implementado en Java. Genera intervalos de confianza. Produce el array de proyecciones por día |
| `service/ScenarioSimulator.java` | `simular(productoId, variablePrecio, variablePromo)` → proyecta impacto en demanda usando elasticidad histórica |
| `controller/DemandForecastController.java` | `GET /api/ai/forecast/producto/{id}?horizonte=30`, `GET /api/ai/forecast/categoria/{id}`, `POST /api/ai/forecast/simulacion` |

### Frontend nuevo

| Archivo | Descripción |
|---------|-------------|
| `pages/admin/AdminForecast.jsx` | Dashboard de forecast: selector de producto/categoría/empresa, gráfico de línea con área de confianza (Recharts), ciclo de vida del producto, comparativo real vs proyectado |
| `components/admin/ScenarioSimulator.jsx` | Sliders para precio y descuento → muestra impacto proyectado en tiempo real |

---

## FASE F24 — Executive AI Dashboard (BI Ejecutivo)

### Objetivo
Dashboard nivel C-suite con KPIs predictivos, alertas inteligentes, benchmarking interno, y reportes ejecutivos auto-generados listos para presentar.

### Migración V44
```sql
CREATE TABLE IF NOT EXISTS hot_click_kpi_ejecutivo_tb (
  id_kpi         BIGSERIAL PRIMARY KEY,
  fk_id_empresa  BIGINT,
  periodo_desde  DATE,
  periodo_hasta  DATE,
  ingresos       INTEGER,
  costo_ventas   INTEGER,
  gastos_operativos INTEGER,
  utilidad_bruta INTEGER,
  utilidad_neta  INTEGER,
  margen_bruto   NUMERIC(5,2),
  margen_neto    NUMERIC(5,2),
  num_pedidos    INTEGER,
  ticket_promedio INTEGER,
  clientes_nuevos INTEGER,
  clientes_recurrentes INTEGER,
  churn_rate     NUMERIC(5,2),
  ltv_promedio   INTEGER,
  calculado_en   TIMESTAMP DEFAULT NOW()
);
```

### Backend nuevo

| Archivo | Descripción |
|---------|-------------|
| `service/KpiCalculatorService.java` | Calcula todos los KPIs financieros y operativos desde fuentes primarias: pedidos, gastos, clientes |
| `service/BenchmarkService.java` | Compara KPIs actuales vs período anterior (MoM, YoY). Calcula tasas de crecimiento y variaciones |
| `service/ExecutiveReportService.java` | Genera reporte ejecutivo en texto usando Claude API: narrativa de los KPIs, logros del período, riesgos identificados, recomendaciones top 3 |
| `schedule/KpiCronJob.java` | `@Scheduled(cron = "0 30 2 * * *")` — calcula KPIs diariamente. Semanal genera insight con Claude |
| `controller/ExecutiveDashboardController.java` | `GET /api/ai/executive/kpis?periodo=`, `GET /api/ai/executive/insights`, `GET /api/ai/executive/reporte/pdf` |

### Frontend nuevo

| Archivo | Descripción |
|---------|-------------|
| `pages/admin/AdminExecutiveDashboard.jsx` | Dashboard ejecutivo: tarjetas de KPI grandes, comparativo vs período anterior (flecha verde/roja), gráficos de tendencia, sección "Insights del período" generados por AI |
| `components/admin/ExecutiveReportCard.jsx` | Card con narrativa del negocio: texto generado por AI con highlights de logros y alertas |
| `components/admin/KpiTrendChart.jsx` | Gráfico de área apilada: ingresos, gastos, utilidad neta — trend de 6 meses |

---

## FASE F25 — LATAM Expansion (Multi-país + Multi-moneda)

### Objetivo
Soporte para operar en múltiples países de LATAM: facturación electrónica por país (empezando por CR, extensible a MX, CO, PE, CL), multi-moneda, adaptación de impuestos (IVA), métodos de pago regionales.

### Migración V45
```sql
CREATE TABLE IF NOT EXISTS hot_click_pais_config_tb (
  id_pais        BIGSERIAL PRIMARY KEY,
  codigo         VARCHAR(2) UNIQUE NOT NULL,  -- CR, MX, CO, PE, CL
  nombre         VARCHAR(100),
  moneda         VARCHAR(3),           -- CRC, MXN, COP, PEN, CLP
  iva_tasa       NUMERIC(5,2),         -- 13.00 (CR), 16.00 (MX), 19.00 (CO)
  formato_rut    VARCHAR(50),          -- regex para validar cédula/NIT/RUC
  api_hacienda   VARCHAR(500),         -- URL del sistema fiscal del país
  metodos_pago   TEXT[],               -- ['SINPE', 'EFECTIVO'] para CR
  activo         BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS hot_click_moneda_tb (
  id_moneda      BIGSERIAL PRIMARY KEY,
  codigo         VARCHAR(3) UNIQUE NOT NULL,
  nombre         VARCHAR(50),
  simbolo        VARCHAR(5),
  tasa_vs_usd    NUMERIC(12,4),
  actualizado_en TIMESTAMP
);

-- Config por empresa
ALTER TABLE hot_click_empresa_tb
  ADD COLUMN IF NOT EXISTS fk_id_pais BIGINT REFERENCES hot_click_pais_config_tb(id_pais);

-- Países seed
INSERT INTO hot_click_pais_config_tb (codigo, nombre, moneda, iva_tasa, metodos_pago) VALUES
  ('CR', 'Costa Rica',  'CRC', 13.00, ARRAY['SINPE', 'EFECTIVO', 'TARJETA', 'TRANSFERENCIA']),
  ('MX', 'México',      'MXN', 16.00, ARRAY['EFECTIVO', 'TARJETA', 'TRANSFERENCIA', 'OXXO']),
  ('CO', 'Colombia',    'COP', 19.00, ARRAY['EFECTIVO', 'TARJETA', 'NEQUI', 'DAVIPLATA']),
  ('PE', 'Perú',        'PEN', 18.00, ARRAY['EFECTIVO', 'TARJETA', 'YAPE', 'PLIN']),
  ('CL', 'Chile',       'CLP', 19.00, ARRAY['EFECTIVO', 'TARJETA', 'WEBPAY'])
ON CONFLICT DO NOTHING;
```

### Backend nuevo

| Archivo | Descripción |
|---------|-------------|
| `model/PaisConfig.java` | Configuración por país: IVA, métodos de pago, formato de identificación |
| `model/Moneda.java` | Tabla de cambio con tasa vs USD |
| `service/MonedaService.java` | `convertir(monto, desdeCodigo, hastaCodigo)`, `actualizarTasas()` (consume API de tasas de cambio) |
| `service/FacturacionStrategy.java` | Interfaz: `emitirComprobante(Pedido)` — implementaciones por país: `FacturacionCRStrategy`, `FacturacionMXStrategy` (CFDI SAT), etc. |
| `service/FacturacionMXService.java` | Generador de CFDI XML para SAT México |
| `controller/PaisController.java` | `GET /api/paises` (público), `GET /api/paises/{codigo}/config` |

### Frontend nuevo/modificado

| Archivo | Descripción |
|---------|-------------|
| `utils/currency.js` | `formatMonto(monto, moneda)` — usa `Intl.NumberFormat` con el locale y moneda del país de la empresa |
| `store/tenantStore.js` | Agrega `pais`, `moneda`, `ivaRate` cargados desde `/api/tenant/info` |
| `pages/admin/AdminConfigEmpresa.jsx` | Selector de país de operación (afecta IVA, métodos de pago, facturación) |

---

## Roadmap de implementación — Orden sugerido

```
PRIORIDAD 1 — Fundacional (implementar primero)
├── F10: Multi-tenant     ← Sin esto nada escala
└── F11: Feature flags    ← Controla el rollout de todo lo demás

PRIORIDAD 2 — Revenue (monetización)
├── F12: Facturación CR   ← Requerimiento legal, retención de clientes
└── F14: Billing engine   ← Monetización del SaaS

PRIORIDAD 3 — Commerce moderno
├── F15: Mobile POS       ← Diferenciador competitivo
├── F16: Self-checkout    ← Valor nuevo para restaurantes/retail
└── F17: Split payments   ← Cierre de ventas difíciles

PRIORIDAD 4 — Plataforma
├── F18: White label      ← Ventas enterprise
├── F19: Marketplace      ← Ecosistema de partners
└── F20: API keys/SDK     ← Integraciones externas

PRIORIDAD 5 — AI (diferenciador largo plazo)
├── F21: Smart inventory  ← ROI inmediato para clientes
├── F22: AI Copilot       ← Stickiness / retención
├── F23: Demand forecast  ← Enterprise
└── F24: Executive BI     ← C-suite

PRIORIDAD 6 — LATAM
└── F25: Multi-país       ← Expansión geográfica
```

---

## Dependencias entre fases

```
F10 (tenant) ──→ F11 (flags) ──→ Todas las demás (usan TenantContext + PlanGate)
F10 ──────────→ F14 (billing, necesita plan FK)
F12 (facturación) depende de: F10 (empresa activa) + F11 (flag: facturacion_electronica)
F13 (ABAC) depende de: F10 (tenant) + F1 (RBAC base)
F15 (mobile PWA) depende de: F2 (POS base)
F16 (self-checkout) depende de: F10 (tenant) + F2 (POS, crea Pedidos)
F17 (split payments) depende de: F2 (POS, método de pago)
F18 (white label) depende de: F10 (empresa)
F19 (marketplace) depende de: F11 (flags) + F20 (webhooks para plugins)
F20 (API keys) depende de: F10 (empresa tenant) + F11 (flags)
F21 (AI stock) depende de: F4 (kardex) + F5 (compras)
F22 (AI copilot) depende de: F7 (finanzas) + F6 (CRM) + Claude API
F23 (forecast) depende de: F21 (predicción base)
F24 (exec BI) depende de: F23 (forecast) + F7 (finanzas) + F22 (AI)
F25 (LATAM) depende de: F12 (facturación base CR) + F10 (empresa tenant)
```

---

## Estimación de esfuerzo por fase

| Fase | Backend | Frontend | Migraciones | Total sesiones |
|------|---------|----------|-------------|----------------|
| F10 Multi-tenant | Alto | Medio | V30 | 2–3 |
| F11 Feature flags | Medio | Medio | V31 | 1 |
| F12 Facturación CR | Muy alto | Medio | V32 | 3–4 |
| F13 ABAC | Medio | Bajo | V33 | 1–2 |
| F14 Billing | Alto | Alto | V34 | 2–3 |
| F15 Mobile PWA | Medio | Alto | — | 2 |
| F16 Self-checkout | Medio | Alto | V36 | 2 |
| F17 Split payments | Medio | Medio | V37 | 1–2 |
| F18 White label | Bajo | Alto | V38 | 1 |
| F19 Marketplace | Alto | Medio | V39 | 2 |
| F20 API keys | Alto | Medio | V40 | 2 |
| F21 AI inventario | Alto | Medio | V41 | 2 |
| F22 AI copilot | Medio | Medio | V42 | 1–2 |
| F23 AI forecast | Alto | Medio | V43 | 2 |
| F24 Executive BI | Medio | Alto | V44 | 2 |
| F25 LATAM | Alto | Medio | V45 | 2–3 |

**Total estimado: 30–45 sesiones de desarrollo**

---

## Convenciones heredadas (aplican a todas las fases)

- **Montos:** `Integer` en colones CRC (o la moneda de la empresa desde F25). `Intl.NumberFormat` en frontend.
- **Migraciones:** `V{N}__descripcion.sql` + mismo SQL en `Actualizado.sql`. Siempre `IF NOT EXISTS`.
- **Nunca cambiar** `ddl-auto=none`.
- **Build antes de commit:** `cd Hot_click_outlet/frontend && pnpm build`
- **Naming BD:** `hot_click_*` en minúsculas.
- **Soft delete:** `estado = 0` o `activo = false` según la entidad.
- **Tenant isolation:** Toda query nueva debe filtrar por `empresa_id` vía `TenantContext.get()` (desde F10).
- **Feature gates:** Todo endpoint de features nuevas detrás de `@RequiresPlan` o `@FeatureFlag`.
- **POS no dispara emails** de notificación al cliente (heredado de F2).
- **AI endpoints:** Solo disponibles para empresas con plan ENTERPRISE o flag `ai_*` activo.
