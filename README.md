# HOTCLICK — Marketplace de Emprendedores · Costa Rica

Plataforma SaaS de e-commerce B2C para el mercado costarricense con modelo híbrido: HotClick vende directamente productos de outlets y liquidación, y además opera un marketplace donde emprendedores y negocios publican sus productos con su propia marca. Incluye POS, CRM, analítica y cumplimiento legal completo (Ley N.° 8968).

**URL producción:** <https://hotclick.lat/>

---

## Stack tecnológico

| Capa | Tecnología |
| --- | --- |
| Backend | Spring Boot 3.4.4 · Java 21 |
| Frontend | React 19 · Vite 8 · Tailwind CSS · Zustand · Framer Motion |
| Base de datos | PostgreSQL en Supabase (PgBouncer transaction mode) |
| Migraciones | Flyway (129 archivos, V1–V131) |
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
# Backend — requiere Java 21
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

### Cuentas QA (DataSeeder)

Al arrancar el backend se aseguran estas cuentas (si no existen). Contraseña local por defecto: `QaDemo1234!` (o `QA_DEFAULT_PASSWORD`). Para reescribir la clave en una cuenta ya creada: `QA_RESET_PASSWORD=true`.

| Rol | Correo | Plan |
| --- | --- | --- |
| Admin | `admin@hotclick.com` | — |
| QA Emprendedor | `qa.emprendedor.demo@hotclick.test` | EMPRENDEDOR |
| QA Pyme | `qa.pyme.demo@hotclick.test` | PYME |
| QA Negocio Plus | `qa.negocioplus.demo@hotclick.test` | NEGOCIO_PLUS |

Reset destructivo de datos (conserva admin + 3 cuentas QA + mostrador POS): al **arrancar el backend** se ejecuta una sola vez. También: Configuración admin → **Vaciar tiendas, usuarios y productos** (frase `ELIMINAR PLATAFORMA`), o [`scripts/reset_qa_keep_admin.sql`](scripts/reset_qa_keep_admin.sql) en PostgreSQL. **No es Flyway.** Hacer backup antes. No borra Storage, embeddings RAG, Clerk/OAuth ni publicaciones externas.

SKU: cada negocio tiene numeración propia (`E{empresa}-0001`). El id global lo ve el admin. El comprador público no ve el SKU.

Código de barras: opcional al registrar o editar un producto (EAN/UPC). Si no lo tenés en el momento, se puede agregar después.

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
│   │   ├── db/migration/              ← Flyway V1–V131
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

Última migración: `V130__ticket_soporte_prioridad.sql` (canónico: [docs/GENERATED_STACK.md](docs/GENERATED_STACK.md)). V56 consentimiento Ley 8968 sigue existiendo.

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

## PR gates (ola 1)

Además de `ci.yml` (Maven + Vitest/Playwright) y `security.yml` (gitleaks), los PRs a `master` pueden disparar:

- **E1 Flyway** — entidad JPA con cambio de esquema ⇒ debe haber `V*__.sql` (no se aplica SQL a prod).
- **E2 Tenant** — diff de controllers/services/repos: IDOR `findById`, `@Async` sin `TenantContext`, PgBouncer (`SET`/`LISTEN`/`pg_advisory`).
- **E3 SPA** — cambios en `frontend/src` ⇒ `static/` actualizado o `pnpm build` en CI (Docker no buildea React).
- **E6 Dependabot** — labels; majors de Spring Boot / jjwt / stripe-java y Spring Boot 4.x ⇒ `needs-human`, sin auto-merge.
- **E11 Sensibles** — `Payment*` / `Auth*` / `Pos*` / `Sinpe*` / `Wallet*` ⇒ debe existir un `*Test*` nominal.
- **DOC1** — semanal: `docs/GENERATED_STACK.md` (Java 21 / Flyway real). Local: `scripts/generate-stack-docs.sh`.
- **SCALE1** — PRs Java/TS: listas sin página, N+1, I/O bloqueante (FAIL P1); issue semanal de hotspots.
- **D5** — el backup diario falla el job (e issue) si el dump no existe o está vacío.

Skip **solo** con labels explícitos (`skip-flyway-gate`, `skip-tenant-gate`, `skip-spa-gate`, `skip-sensitive-gate`, `skip-dependabot-gate`, `skip-scale-gate`). Detalle: [docs/AGENTES_ENG_GATES.md](docs/AGENTES_ENG_GATES.md).

Ola 2 (D2 IDOR diario, S1 Sonar, S3 E2E gaps, E10 authz, S8 restore drill): [docs/AGENTES_OLA2.md](docs/AGENTES_OLA2.md).

Ola 3 (D1 Flyway↔JPA diario, D3 SPA stale, D4/E8 Sentry digest, S2 Dependabot weekly, E4 commit-gate, E7 CI red, E9 health pager): [docs/AGENTES_OLA3.md](docs/AGENTES_OLA3.md).

Ola 4–5 (D6–D11, S4/S5/S7, E5/E12/E14/E18): [docs/AGENTES_OLA4.md](docs/AGENTES_OLA4.md), [docs/AGENTES_OLA5.md](docs/AGENTES_OLA5.md).

Ola 6 (S6 k6/Hikari, S9 lint:ci, S10–S12, E13/E15/E17): [docs/AGENTES_OLA6.md](docs/AGENTES_OLA6.md).

Ola 7 (D12 health real, S14 a11y+POS, E16 runtime endpoints): [docs/AGENTES_OLA7.md](docs/AGENTES_OLA7.md). Checklist olas 1–6 en master vs ola 7: sección *Cobertura del catálogo* en [docs/AGENTES_ENG_GATES.md](docs/AGENTES_ENG_GATES.md).

## Documentación

| Carpeta / Archivo | Contenido |
| --- | --- |
| [CLAUDE.md](CLAUDE.md) | Guía de desarrollo para Claude Code |
| [docs/GENERATED_STACK.md](docs/GENERATED_STACK.md) | Versiones reales (Java/Flyway/React) — DOC1 |
| [docs/AGENTES_ENG_GATES.md](docs/AGENTES_ENG_GATES.md) | PR gates E1/E2/E3/E6/E11 + DOC1/SCALE1 + D5 |
| [docs/AGENTES_OLA2.md](docs/AGENTES_OLA2.md) | Agentes ola 2 (D2/S1/S3/E10/S8) |
| [docs/AGENTES_OLA3.md](docs/AGENTES_OLA3.md) | Agentes ola 3 (D1/D3/D4+E8/S2/E4/E7/E9) |
| [docs/AGENTES_OLA4.md](docs/AGENTES_OLA4.md) | Agentes ola 4 (D6/D7/D8/D11/S4/E5) |
| [docs/AGENTES_OLA5.md](docs/AGENTES_OLA5.md) | Agentes ola 5 (D9/D10/S5/S7/E12/E14/E18) |
| [docs/AGENTES_OLA6.md](docs/AGENTES_OLA6.md) | Agentes ola 6 (S6/S9–S12/E13/E15/E17) |
| [docs/AGENTES_OLA7.md](docs/AGENTES_OLA7.md) | Agentes ola 7 (D12/S14/E16) — cierre catálogo eng-gates |
| [docs/COMPLIANCE.md](docs/COMPLIANCE.md) | Cumplimiento legal, SEO, plataformas externas |
| [docs/legal/](docs/legal/) | 8 documentos legales en formato `.md` |
| [docs/security/](docs/security/) | 16 documentos de arquitectura de seguridad |
| [DOCUMENTACION.md](DOCUMENTACION.md) | Documentación técnica detallada |

---

## Contacto

HOTCLICK · Costa Rica · <hotclick.cr@gmail.com> · WhatsApp: +506 8974-5370 (Andrés Zúñiga)
