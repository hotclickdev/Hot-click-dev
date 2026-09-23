# Auditoría estática READ-ONLY — Hot_click_outlet

Mapa de integraciones, jobs y deploy. Sin cambios en archivos.

---

## 1. Tabla de integraciones

| Servicio | Propósito | Clases / rutas clave | Vars env | Crítico | Fallback |
|---|---|---|---|---|---|
| **Tilopay** | Checkout tienda con tarjeta (SDK embebido) | `TilopayPaymentProvider`, `TilopayService`, `TilopayConfirmacionService`, `TilopayWebhookController` → `POST /api/webhooks/tilopay`; FE `CheckoutTilopayCard`, default `metodoPago='TILOPAY'` | `TILOPAY_API_USER`, `TILOPAY_PASSWORD`, `TILOPAY_KEY`, `TILOPAY_BASE_URL` | **Sí** (pagos tarjeta tienda) | Sin credenciales → **modo MOCK** (`loginSdk` = `mock-sdk-token`) — HECHO OBSERVADO |
| **ONVO** | Pagos tarjeta CR; billing SaaS; POS QR | `OnvoPaymentProvider`, `OnvoService`, `OnvoBillingClient`, `OnvoBillingWebhookHandler`, `OnvoWebhookController` → `/api/webhooks/onvo`; `PosQrVentaService` | `ONVO_*`, `PAYMENTS_ONVO_ENABLED` (default **false**) | Parcial: billing/POS sí; checkout tienda **off** | Sin key → mock/error; checkout ONVO rechazado si flag false — HECHO OBSERVADO |
| **Stripe** | Billing SaaS + provider de checkout (legado / API) | `StripePaymentProvider`, `StripeService`, `BillingWebhookController` → `/api/webhooks/stripe`; `SuscripcionService` | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID_*` | Parcial (suscripciones); **no** es UI checkout tienda | Sin key → mock; `crearSesion` lanza si mock — HECHO OBSERVADO |
| **SINPE** | Transferencia móvil + comprobante | `SinpeService`, `SinpeCheckoutService`, `SinpeComprobanteService`, `SinpeController`; FE `CheckoutSinpePending` | Número UI hardcodeado `8666-7888`; `ONVO_SINPE_DESTINO` solo POS/ONVO | **Sí** (canal CR) | Aprobación admin o auto a 1 AM — HECHO OBSERVADO |
| **SendGrid** (clase `ResendEmailService`) | Email transaccional | `ResendEmailService`, `NotificacionEmailService`, OTP, tickets, alertas | `SENDGRID_API_KEY`, `SENDGRID_FROM_*` | **Sí** | Sin key → fallos al enviar; no hay SMTP fallback — HECHO OBSERVADO (nombre “Resend” es legado) |
| **AWS S3** | Media (imágenes, comprobantes) | `S3Config`, `SupabaseStorageService` (nombre legado; usa S3 SDK) | `AWS_S3_BUCKET/REGION/PUBLIC_URL`; keys opcionales vía Instance Profile | **Sí** | `DefaultCredentialsProvider`; sin bucket/credenciales → uploads fallan — HECHO OBSERVADO |
| **Clerk** | Auth social | `ClerkTokenService`, `ClerkSyncController`/`ClerkSyncService`; FE `VITE_CLERK_PUBLISHABLE_KEY` | `CLERK_JWKS_URI`, `CLERK_ISSUER` | Medio | Defaults en `application.properties` a tenant Clerk de demo — POSIBLE PROBLEMA en prod si no se overridea |
| **Anthropic / Claude** | Copilot admin, chat tienda, Telegram sync, RAG, catálogo, incidentes | `AiCopilotClaudeClient`, `PublicChatClaude*`, `AiGenerationService`, `RagPipeline`, etc. | `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | **Sí** (IA) | Sin key → features IA degradadas — HECHO OBSERVADO |
| **NVIDIA NIM** | Solo sidecar guardrails / deepteam | Config en `application.properties`; **cero usos en Java** | `NVIDIA_API_KEY`, `NVIDIA_MODEL`, `NVIDIA_BASE_URL` | No (copilot ya no lo usa) | Sidecar opcional; compose prod aún lo levanta — HECHO OBSERVADO |
| **Telegram** | Alertas ops + bot clientes | `TelegramService`, `TelegramClienteBotService`, `TelegramBotWebhookController`, `TelegramInventarioScheduler` | `TELEGRAM_BOT_*`, `TELEGRAM_CLIENT_*` | Medio | Sin token → jobs/alertas no-op (`isConfigured()`) — HECHO OBSERVADO |
| **Hacienda CR** | Factura electrónica | `HaciendaTokenService`, `HaciendaApiClient`, `FacturacionService`, `FacturacionContingenciaService` | Credenciales **por empresa** (BD cifrada), no env globales | Medio (compliance) | Sin credenciales → stub token vacío; cola offline + polling — HECHO OBSERVADO |
| **PostHog** | Analytics server (`pedido_pagado`) + FE | `PostHogCaptureService`; FE `VITE_POSTHOG_*` | `POSTHOG_PROJECT_TOKEN`, `POSTHOG_HOST` | No | Vacío = no envía — HECHO OBSERVADO |
| **Sentry** | Errores BE/FE + webhook → Telegram | SDK props; `SentryWebhookService`, `WebhookController` | `SENTRY_DSN`, `SENTRY_ENVIRONMENT`, `SENTRY_WEBHOOK_SECRET`; FE `VITE_SENTRY_DSN` | Medio | DSN vacío = off — HECHO OBSERVADO |
| **WhatsApp Meta** | Notificaciones cloud API | `WhatsAppService`, `WhatsAppMetaApiClient` | `WHATSAPP_PHONE_ID`, `WHATSAPP_TOKEN` | Medio | Sin creds → **modo SIMULADO** — HECHO OBSERVADO |
| **Twilio SMS** | Aviso cambio cuenta cobro | `TwilioSmsClient` | `TWILIO_*` | No | Vacío → no SMS (cae a WA/email) — HECHO OBSERVADO |
| **Voyage AI** | Embeddings RAG | `VoyageEmbeddingService` | `VOYAGE_API_KEY` | Medio (asistente compras) | Gemini embedding desactivado (comentario V64) — HECHO OBSERVADO |
| **Google Vision / Gemini** | Análisis imagen / texto WA | `GoogleVisionService`, `WhatsAppGeminiTextClient` | `GOOGLE_VISION_API_KEY`, `GEMINI_API_KEY` | No | Vacío = deshabilitado — HECHO OBSERVADO |
| **BCCR** | Tipo de cambio USD (Stripe) | `BccrService` | `app.tc.usd.fallback` (530) | Solo si Stripe checkout | Fallback numérico fijo — HECHO OBSERVADO |
| **AbuseIPDB** | Reputación IP en login | `GeoIpService` | `ABUSEIPDB_API_KEY` | No | Vacío = skip — HECHO OBSERVADO |
| **Cloudflare Turnstile** | Anti-bot login/registro | `TurnstileService` | `TURNSTILE_SECRET_KEY` | Medio prod | Vacío = siempre pasa (dev) — HECHO OBSERVADO |
| **n8n** | Webhooks automatización | `N8nWebhookService` | `N8N_WEBHOOK_*` | No | URL vacía = no-op — HECHO OBSERVADO |
| **GitHub** | Incident remediation bot | `GitHubService` | `GITHUB_TOKEN`, `GITHUB_REPO` | No | Sin token → fallos en incidentes — ❓ REQUIERE VALIDACIÓN uso en prod |
| **UptimeRobot** | Webhook disponibilidad → Telegram | `WebhookController` `/api/webhooks/uptime` | `UPTIME_WEBHOOK_SECRET` | No | Secret inválido → 401 — HECHO OBSERVADO |
| **Facebook “publicaciones”** | Cola de borradores FB en BD | `PublicacionFacebookService` | `app.publication.*` | No | **No llama Graph API**; solo genera texto LISTO — HECHO OBSERVADO |
| **WebAuthn** | Llaves FIDO2 ADMIN_IT | `WebAuthnService` | `WEBAUTHN_RP_ID`, `WEBAUTHN_RP_NAME` | Medio ADMIN_IT | Defaults `hotclick.lat` — HECHO OBSERVADO |
| **PostgreSQL / Flyway** | Persistencia | Datasource + Flyway | `DB_URL`, `DB_USERNAME`, `DB_PASSWORD` | **Sí** | Sin DB no arranca — HECHO OBSERVADO |

**Checkout tienda (HECHO OBSERVADO):** FE orden `TILOPAY` → `SINPE` → `EFECTIVO` (`PaymentMethods.smoke.test.ts`); API `POST /api/payments/checkout` (plural). Backend default si `provider` null sigue siendo `"STRIPE"` — POSIBLE PROBLEMA para clientes API que no envían provider.

---

## 2. Jobs / schedulers

Todos con `@SchedulerLock` salvo nota. Config: `ShedLockConfig.java:26`.

| Lock name | Cron / rate | Qué hace | Cita |
|---|---|---|---|
| `payment_expiration_cleanup` | fixedRate 5 min | Cancela pagos PENDIENTES >30 min; reconsulta Tilopay antes de cancelar | `PaymentExpirationCleanupService.java:33-34` |
| `payout_auto_approval` | `0 */15 * * * *` | Auto-aprueba payouts ≤ umbral | `PayoutAutoApprovalScheduler.java:43-44` |
| `data_retention` | `0 30 2 * * *` | Limpia auditoría, carritos, AI msgs, webhooks, rate limit, shedlock, chat, cola FE, IPs, encargos | `DataRetentionScheduler.java:50-51` |
| `refresh_token_cleanup` | `0 15 3 * * *` | Borra refresh tokens expirados/revocados | `RefreshTokenService.java:50-51` |
| `carrito_abandonado` | `${app.abandoned-cart.scheduler-cron}` default cada 6 h | Email + n8n carritos abandonados (`@ConditionalOnProperty`) | `CarritoAbandonadoScheduler.java:38-39` |
| `sinpe_auto_approval` | `0 0 1 * * *` | Auto-aprueba comprobantes SINPE vencidos | `SinpeService.java:52-53` |
| `facturacion_polling` | `0 */5 * * * *` | Polling estado Hacienda | `FacturacionService.java:70-71` |
| `procesarColaFacturacionOffline` | `0 */5 * * * *` | Reenvía cola contingencia Hacienda | `FacturacionContingenciaScheduler.java:33-34` |
| `sse-heartbeat` | fixedDelay 25 s | Heartbeat SSE stock | `StockSseRegistry.java:71-72` — **POSIBLE PROBLEMA**: ShedLock + emitters locales multi-pod |
| `publicacion_facebook_scheduler` | fixedDelay `${app.publication.interval-ms:1800000}` | Genera entradas cola FB (no publica a Meta) | `PublicacionFacebookService.java:79-80` |
| `wallet_reconciliacion_dlq` | fixedRate 5 min | Reintenta acreditaciones wallet fallidas | `WalletReconciliacionScheduler.java:52-55` |
| `telegram_chequeo_inventario` | `0 0 9 * * MON` zona CR | Chequeo semanal stock vía bot clientes | `TelegramInventarioScheduler.java:49-50` |
| `productos_inactivos` | `0 30 3 * * *` | Inactiva productos agotados >3 meses | `ProductoScheduler.java:24-25` |
| `demand_forecast` | `0 30 4 * * *` | Forecast demanda por empresa | `ForecastScheduler.java:27-28` |
| `abc_analysis` | `0 0 4 * * *` | Análisis ABC inventario | `AbcAnalysisScheduler.java:28-29` |
| `billing_renewal` | `0 0 3 * * *` | Expira trials / PAST_DUE → FREE | `BillingRenewalScheduler.java:29-30` |
| `embedding_indexer_job` | `${rag.indexer.cron:0 0 4 * * *}` | Batch embeddings Voyage | `EmbeddingIndexerService.java:69-71` — **POSIBLE PROBLEMA**: mismo horario que `abc_analysis` |
| `assistant-metrics-log-stats` | fixedDelay 6 h | Log métricas clasificador RAG | `AssistantMetricsService.java:70-71` |

---

## 3. Docker / deploy overview

| Artefacto | Rol | Hallazgos |
|---|---|---|
| `Dockerfile` | Multi-stage Maven 21 → JRE Alpine + Chromium | FE **no** se buildea en imagen; exige `pnpm build` previo — HECHO OBSERVADO `Dockerfile:1-4` |
| `docker-compose.prod.yml` | `app` + `guardrails` (sidecar NeMo) | App `depends_on: guardrails`; ambos `env_file: .env` — HECHO OBSERVADO |
| `docker-compose.lightsail.yml` | App + Postgres local; **sin** guardrails | Alternativa Lightsail 4 GB — HECHO OBSERVADO |
| `render.yaml` | Servicio Docker mínimo | Solo declara `DB_*` + **`MAIL_PASSWORD`** (no existe en `application.properties`) — POSIBLE PROBLEMA / legado |
| Prod doc (`CLAUDE.md`) | EC2 + RDS + Nginx | Compose con `docker build` separado por buildx viejo — HECHO OBSERVADO en docs |

**Guardrails** (`../security-tools/guardrails/`): FastAPI + NeMo; pensado para proxy NVIDIA. Copilot Java ya usa Anthropic directo; README admite que hay que apuntar `NVIDIA_BASE_URL` a `http://guardrails:8001/v1/` — hoy Java **no lee** `nvidia.*` — HECHO OBSERVADO. Sidecar en compose = RAM sin tráfico útil — POSIBLE PROBLEMA.

---

## 4. Variables documentadas vs usadas

### Alineadas (`.env.example` ↔ `application.properties`)
Casi todo el set de pago, S3, JWT, TOTP, Clerk, Anthropic, NVIDIA, Voyage, Telegram, Sentry, PostHog, WhatsApp, Twilio, GitHub, n8n, Turnstile, AbuseIPDB, WebAuthn, RAG indexer.

### Frontend (`frontend/.env.example`)
`VITE_CLERK_*`, GA4, Sentry, PostHog, GSC/Bing, Clarity, `VITE_ONVO_PUBLISHABLE_KEY`, `VITE_PUBLIC_APP_URL` — HECHO OBSERVADO.

### En código / Docker, no (o mal) documentadas
| Var | Uso | Etiqueta |
|---|---|---|
| `EMPRESA_PRINCIPAL_ID` | `ProductoCatalogQueries` default 1 | POSIBLE PROBLEMA (no en `.env.example`) |
| `ADMIN_EMAIL` | `DataSeeder` | ❓ REQUIERE VALIDACIÓN |
| `CHROME_BIN` / `CHROMEDRIVER_PATH` | Set en Dockerfile; props existen | HECHO OBSERVADO (implícito en imagen) |
| `VITE_TILOPAY_TEST` | `TilopayCardForm.tsx:8` | POSIBLE PROBLEMA (no en FE `.env.example`) |
| `MAIL_PASSWORD` | Solo `render.yaml` | POSIBLE PROBLEMA (huérfana) |
| `HOTCLICK_COMISION_GATEWAY_PCT` | Comentada en `.env.example`; props usan literals `hotclick.comision.*` | ❓ REQUIERE VALIDACIÓN si ops espera override por env |
| `NVIDIA_*` en Java | Solo properties; **ningún `@Value`/uso Java** | HECHO OBSERVADO (muertas para app) |

### Documentadas pero de valor bajo / opcional
`GOOGLE_VISION_*`, `GEMINI_*`, `N8N_*`, `GITHUB_*`, `TWILIO_*`, `UPTIME_*` — fail-open.

---

## 5. Docs desatualizadas

| Doc | Dice | Código real | Etiqueta |
|---|---|---|---|
| `CLAUDE.md:160-161` | `POST /api/payment/checkout` Stripe; webhook Stripe “de pagos” | `POST /api/payments/checkout`; checkout UI = Tilopay/SINPE; Stripe webhook = billing + provider aún vivo | **POSIBLE PROBLEMA** docs |
| `CLAUDE.md` tabla rotación keys | Solo Stripe como pasarela | Faltan Tilopay, ONVO | POSIBLE PROBLEMA |
| `CLAUDE.md` email | “SendGrid (ResendEmailService)” | Correcto técnicamente (SendGrid SDK); nombre confunde con Resend.com | HECHO OBSERVADO |
| `CLAUDE.md` guardrails | Copilot ya no pasa por NVIDIA | Coincide; compose prod aún arranca sidecar | HECHO OBSERVADO + POSIBLE PROBLEMA ops |
| `application.properties:150` | “PayPalConfig y StripePaymentProvider” | PayPal no es provider activo de checkout | POSIBLE PROBLEMA comentario |
| `application.properties:298` | RAG “Requiere GEMINI_API_KEY” | Embeddings activos = Voyage | POSIBLE PROBLEMA |
| `render.yaml` | Stack Render mínimo + `MAIL_PASSWORD` | Prod documentada = EC2; YAML incompleto vs `.env.example` | POSIBLE PROBLEMA |
| Guardrails README | “entre AiCopilotService y NVIDIA” | AiCopilot → Anthropic | POSIBLE PROBLEMA |

---

## 6. Citas archivo:línea (anclas)

```35:43:Hot_click_outlet/src/main/java/com/hotclick/service/payment/CheckoutValidator.java
        String provider = req.getProvider() != null ? req.getProvider().toUpperCase() : "STRIPE";
        if (Constants.PROVEEDOR_ONVO.equals(provider) && !onvoEnabled) {
            throw new IllegalArgumentException(
                "ONVO no está habilitado. Usá TILOPAY para pagos con tarjeta.");
```

```112:112:Hot_click_outlet/frontend/src/pages/checkout/useCheckoutForm.ts
  const [metodoPago, setMetodoPago] = useState('TILOPAY')
```

```17:18:Hot_click_outlet/src/main/java/com/hotclick/controller/PaymentController.java
@RestController
@RequestMapping("/api/payments")
```

```52:58:Hot_click_outlet/src/main/java/com/hotclick/service/TilopayService.java
    void init() {
        mockMode = blank(apiUser) || blank(password) || blank(apiKey);
        // ...
        if (mockMode) {
            log.warn("[tilopay] Credenciales incompletas — modo MOCK activo. "
```

```15:34:Hot_click_outlet/src/main/java/com/hotclick/service/ResendEmailService.java
public class ResendEmailService {
    @Value("${sendgrid.api-key}")
    private String apiKey;
    // ... SendGrid sg = new SendGrid(apiKey);
```

```16:21:Hot_click_outlet/src/main/java/com/hotclick/config/S3Config.java
    public S3Client s3Client() {
        return S3Client.builder()
                .region(Region.of(region))
                .credentialsProvider(DefaultCredentialsProvider.create())
```

```160:161:CLAUDE.md
| POST | `/api/payment/checkout` | Iniciar pago Stripe |
| POST | `/api/webhooks/stripe` | Webhook de pagos |
```

```1:23:Hot_click_outlet/docker-compose.prod.yml
services:
  app:
    ...
    depends_on:
      - guardrails
  guardrails:
    build: ../security-tools/guardrails
```

```69:71:Hot_click_outlet/src/main/java/com/hotclick/rag/scheduler/EmbeddingIndexerService.java
    @Scheduled(cron = "${rag.indexer.cron:0 0 4 * * *}")
    @SchedulerLock(name = "embedding_indexer_job",
```

```18:22:Hot_click_outlet/src/main/java/com/hotclick/service/HaciendaTokenService.java
 * ESTADO: STUB — retorna token vacío hasta que las credenciales estén configuradas.
```
*(comentario de cabecera; `getToken` sí implementa OAuth si la empresa tiene credenciales — ❓ REQUIERE VALIDACIÓN cuántas empresas en prod las tienen)*

---

## Resumen ejecutivo

| Área | Veredicto |
|---|---|
| Pasarela tienda | **Tilopay + SINPE (+ efectivo)** — HECHO OBSERVADO |
| Stripe / ONVO | Vivos para **billing / POS / webhooks**; ONVO checkout tienda **disabled** por default |
| Email | SendGrid vía clase mal nombrada `ResendEmailService` |
| IA | Anthropic; NVIDIA config muerta en Java; guardrails sidecar opcional/legacy |
| Jobs | **18** schedulers, todos con ShedLock |
| Docs | `CLAUDE.md` payment paths + Stripe-as-primary **desactualizados** |
| Deploy | EC2 compose 2 servicios; `render.yaml` residual |

**❓ REQUIERE VALIDACIÓN en runtime:** credenciales Tilopay/SendGrid/S3 reales en EC2; uso real de Stripe billing vs ONVO billing; si guardrails consume RAM sin tráfico; si `sse-heartbeat` con ShedLock rompe SSE en multi-pod; estado real de Hacienda por tenant.