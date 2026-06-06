# HOTCLICK — Marketplace de Emprendedores · Costa Rica

Plataforma SaaS de e-commerce B2C para el mercado costarricense con modelo híbrido: HotClick vende directamente productos de outlets y liquidación, y además opera un marketplace donde emprendedores y negocios publican sus productos con su propia marca. Incluye POS, CRM, analítica y cumplimiento legal completo (Ley N.° 8968).

**URL producción:** <https://hotclick.lat/>

---

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Backend | Spring Boot 3.4.4 · Java 24 |
| Frontend | React 18 · Vite 8 · Tailwind CSS · Zustand · Framer Motion |
| Base de datos | PostgreSQL en Supabase (PgBouncer transaction mode) |
| Migraciones | Flyway (56 versiones, V1–V56) |
| Almacenamiento | Supabase Storage (imágenes de productos, logos de marcas) |
| Email | SendGrid (ResendEmailService) |
| Pagos | Stripe (webhook) · SINPE Móvil |
| Auth / OAuth | JWT + 2FA TOTP · Clerk (Google, Microsoft, Apple, GitHub) |
| Analytics | Google Analytics 4 (consentimiento previo) |
| WhatsApp | Meta Cloud API (WaMensajeLog) |
| Scheduler | ShedLock (jobs distribuidos anti-duplicación) |
| Package manager | pnpm (frontend) · Maven local `maven/bin/` (backend) |

---

## Levantar el proyecto localmente

```bash
# Backend — requiere Java 24
.\maven\bin\mvn spring-boot:run
# → http://localhost:8080

# Frontend — dev server con proxy /api → 8080
cd Hot_click_outlet/frontend
pnpm install
pnpm dev
# → http://localhost:3000

# Build de producción
cd Hot_click_outlet/frontend
pnpm build
# → genera archivos en src/main/resources/static/
```

---

## Estructura del proyecto

```text
proyecto-2026/
├── Hot_click_outlet/
│   ├── src/main/java/com/hotclick/
│   │   ├── config/          ← SecurityConfig, DataSeeder, CacheConfig
│   │   ├── controller/      ← REST controllers (/api/**)
│   │   ├── model/           ← Entidades JPA (~60 modelos)
│   │   ├── service/         ← Lógica de negocio
│   │   ├── repository/      ← Spring Data JPA
│   │   ├── security/        ← JWT, JwtUtil, CompanyScope, JwtRequestFilter
│   │   ├── scheduler/       ← DataRetentionScheduler, jobs ShedLock
│   │   └── dto/             ← ResponseDTO + DTOs de entrada/salida
│   ├── src/main/resources/
│   │   ├── application.properties     ← Config (env vars)
│   │   ├── db/migration/              ← Flyway V1–V56
│   │   └── static/                    ← Frontend compilado (build output)
│   ├── frontend/                      ← React SPA (Vite)
│   │   ├── src/
│   │   │   ├── pages/                 ← Páginas cliente + admin
│   │   │   ├── components/            ← UI reutilizable
│   │   │   ├── store/                 ← Zustand (auth, cart, wishlist, chat, ui)
│   │   │   ├── services/              ← Axios services + api.js
│   │   │   ├── layouts/               ← MainLayout, AdminLayout
│   │   │   └── utils/                 ← format.js, analytics.js, ga4.js
│   │   └── public/                    ← robots.txt, sitemap.xml, manifest
│   ├── Actualizado.sql                ← Schema PostgreSQL completo
│   └── Dockerfile
├── docs/
│   ├── legal/                         ← 8 documentos legales (.md)
│   ├── security/                      ← 16 documentos de seguridad
│   └── COMPLIANCE.md                  ← Informe de cumplimiento legal y SEO
├── CLAUDE.md                          ← Guía para Claude Code
└── README.md                          ← Este archivo
```

---

## Módulos implementados

### Tienda pública (clientes)

| Módulo | Ruta | Descripción |
| --- | --- | --- |
| Home | `/` | Hero, destacados, rotador, retorno |
| Catálogo | `/productos` | Filtros por categoría, marca, precio, condición |
| Detalle | `/productos/:id` | Galería, tallas, recomendaciones |
| Carrito | `/carrito` | Persistido en localStorage |
| Checkout | `/checkout` | Stripe · SINPE · WhatsApp |
| Mis pedidos | `/mis-pedidos` | Historial del cliente |
| Lista de deseos | `/wishlist` | Alertas de bajada de precio |
| Blog | `/blog` | Publicaciones del marketplace |
| Emprendimientos | `/emprendimientos` | Directorio de vendedores |
| Self-checkout QR | `/checkout/qr/:token` | Pago sin registrarse vía QR |

### Panel Admin (`/admin`)

| Módulo | Descripción |
| --- | --- |
| Dashboard | KPIs: ventas, pedidos, usuarios, tendencias |
| Productos | CRUD con imágenes múltiples, tallas, bodegas, variantes |
| Pedidos | Tracker de estados, email + WhatsApp al cliente, guía Correos CR |
| POS | Sistema de punto de venta con turnos de caja y historial |
| Inventario | Kardex, barcodes, conteo de stock |
| Finanzas | Desglose de pedidos entregados: productos vs costos de envío |
| CRM | Clientes, historial de pedidos por persona |
| Marcas | CRUD con logo (Supabase Storage), soft delete |
| Categorías | Árbol de categorías y subcategorías |
| Blog | Publicaciones del marketplace |
| Ofertas | Descuentos y cupones |
| Garantías | Solicitudes de garantía por producto |
| WhatsApp | Plantillas, logs de mensajes (WaMensajeLog) |
| Mi Empresa | Perfil del negocio, branding white-label |
| Observabilidad | Logs, métricas, alertas |
| Security Center | Auditoría de accesos, alertas de seguridad (32 tipos de eventos) |
| AI Copilot | Asistente de inventario y análisis |
| Reportes | Gráficos de ventas, forecast |
| Configuración | Ajustes globales, fiscal (Hacienda CR), API keys |

### Páginas legales

| Ruta | Descripción |
| --- | --- |
| `/privacidad` | Política de Privacidad — Ley N.° 8968, ARCO |
| `/terminos` | Términos y Condiciones — Contrato de Adhesión (10 cláusulas) |
| `/devoluciones` | Política de Devoluciones — Ley 7472 |
| `/envios` | Política de Envíos — Correos CR, entrega directa |
| `/cookies` | Política de Cookies — PRODHAB, tabla por categoría |
| `/acuerdo-vendedores` | Acuerdo para Vendedores — Encargado de Tratamiento |

---

## Variables de entorno

```properties
# Base de datos (Supabase)
spring.datasource.url=jdbc:postgresql://...supabase.com:6543/postgres
spring.datasource.username=postgres
spring.datasource.password=...

# JWT
jwt.secret=...

# SendGrid (email transaccional)
resend.api-key=...

# Supabase Storage (imágenes)
supabase.url=https://...supabase.co
supabase.key=...
supabase.bucket=hotclick-images

# Pagos
stripe.secret-key=...
stripe.webhook-secret=...
payxpert.api-key=...

# Clerk (OAuth social login)
clerk.secret-key=...
clerk.publishable-key=...   # → VITE_CLERK_PUBLISHABLE_KEY en frontend

# WhatsApp (Meta Cloud API)
whatsapp.token=...
whatsapp.phone-number-id=...
```

---

## Reglas críticas de desarrollo

### Cambios de esquema DB

**Nunca cambiar una entidad JPA sin migración Flyway.** Ver `CLAUDE.md` sección "Regla obligatoria: cambios de esquema DB".

Última migración: `V56__consentimiento_log.sql` (bitácora de consentimiento Ley 8968).

### PgBouncer transaction mode

Supabase usa PgBouncer en transaction mode. **No usar:** `pg_advisory_lock`, `SET session variables`, `LISTEN/NOTIFY`, ni prepared statements persistentes. Ver `CLAUDE.md` sección "Constraints de infraestructura".

### Build antes de commit

```bash
cd Hot_click_outlet/frontend && pnpm build
```

Los archivos compilados en `src/main/resources/static/` son los que se despliegan.

---

## Cumplimiento legal (Ley N.° 8968 — Costa Rica)

| Requisito | Estado |
| --- | --- |
| Política de Privacidad pública | ✅ `/privacidad` |
| Términos y Condiciones públicos | ✅ `/terminos` |
| Política de Cookies | ✅ `/cookies` |
| Consentimiento en registro | ✅ Checkbox obligatorio en `RegisterPage` |
| Consentimiento en checkout | ✅ Checkbox obligatorio en `CheckoutPage` |
| Consentimiento en registro de vendedor | ✅ Checkbox en `RegistrarNegocioPage` |
| Bitácora de consentimiento con IP | ✅ Tabla `hot_click_consentimiento_log_tb` (V56) |
| Acuerdo de Vendedores | ✅ `/acuerdo-vendedores` |
| Canal ARCO | ✅ <hotclick.cr@gmail.com> |

Ver reporte completo en [docs/COMPLIANCE.md](docs/COMPLIANCE.md).

---

## Documentación

| Carpeta / Archivo | Contenido |
| --- | --- |
| [CLAUDE.md](CLAUDE.md) | Guía de desarrollo para Claude Code |
| [docs/COMPLIANCE.md](docs/COMPLIANCE.md) | Cumplimiento legal, SEO, plataformas externas |
| [docs/legal/](docs/legal/) | 8 documentos legales en formato `.md` |
| [docs/security/](docs/security/) | 16 documentos de arquitectura de seguridad |
| [DOCUMENTACION.md](DOCUMENTACION.md) | Documentación técnica detallada |

---

## Contacto

HOTCLICK · Costa Rica · <hotclick.cr@gmail.com> · WhatsApp: +506 8974-5370 (Andrés Zúñiga)
