# HOTCLICK — Security Architecture Overview

> **Última actualización:** Mayo 2026  
> **Stack:** Spring Boot 3.4.4 · Java 24 · PostgreSQL (Supabase) · React  
> **Clasificación:** Interno — Conocimiento institucional de seguridad

---

## Índice de documentación

| Documento | Descripción |
|---|---|
| **Este archivo** | Vista ejecutiva, modelo de amenazas, cobertura OWASP |
| [security-overview.md](./security-overview.md) | Arquitectura completa de seguridad, capas, flujos |
| [authentication.md](./authentication.md) | Login flow, JWT, TempToken, account locking |
| [authorization-rbac.md](./authorization-rbac.md) | Roles, CompanyScope, tenant isolation |
| [2fa-mfa.md](./2fa-mfa.md) | TOTP, Email OTP, recovery codes, AES-256-GCM |
| [jwt-security.md](./jwt-security.md) | JWT lifecycle, tipos de token, rotación, revocación |
| [api-security.md](./api-security.md) | Input validation, CORS, anti-enumeration, error handling |
| [rate-limiting.md](./rate-limiting.md) | Todos los endpoints rate-limited con límites exactos |
| [upload-security.md](./upload-security.md) | Magic bytes, extension allowlist, MIME validation |
| [runtime-detection.md](./runtime-detection.md) | SecurityDetectionService, reglas de ataque, alertas |
| [audit-logging.md](./audit-logging.md) | SecurityAuditService, 32 event types, esquema DB |
| [security-center.md](./security-center.md) | Security Center UI, SecurityController API |
| [security-headers.md](./security-headers.md) | HTTP security headers, CSP, HSTS |
| [university-network-block.md](./university-network-block.md) | Bloqueo en red universitaria, whitelist IT, recategorización |
| [production-hardening.md](./production-hardening.md) | ProductionConfigValidator, env vars, checklist |
| [incident-response.md](./incident-response.md) | Runbooks para incidentes de seguridad |
| [future-improvements.md](./future-improvements.md) | Backlog priorizado de mejoras de seguridad |
| [security-roadmap.md](./security-roadmap.md) | Roadmap estratégico de seguridad |

---

## Estado actual de seguridad

```
RELEASE STATUS: READY WITH WARNINGS
Build:          PASSING (103 security tests)
OWASP Coverage: A01 ✓  A02 ✓  A03 ✓  A04 ✓  A05 ✓
                A06 ~  A07 ✓  A08 ~  A09 ✓  A10 ✓
```

---

## Objetivos de seguridad

El sistema HOTCLICK es una plataforma SaaS multi-tenant de e-commerce para Costa Rica. Los objetivos de seguridad, en orden de prioridad:

1. **Confidencialidad de datos de clientes** — emails, identidades, pedidos, datos de pago nunca expuestos
2. **Integridad transaccional** — los pedidos y pagos no pueden manipularse
3. **Aislamiento de tenants** — los negocios (empresas) no pueden acceder a datos de otros
4. **Resistencia a abuso** — brute force, credential stuffing, OTP flooding detectados y bloqueados
5. **Disponibilidad** — ataques de rate-limit controlados sin afectar UX legítima
6. **Trazabilidad operacional** — cada evento de seguridad queda registrado y auditable

---

## Modelo de amenazas

### Actores de amenaza

| Actor | Motivación | Capacidad | Prioridad defensa |
|---|---|---|---|
| Script kiddie automatizado | Credential stuffing, data scraping | Baja — herramientas públicas | Alta (volumen) |
| Competidor / insider malintencionado | Acceso a datos de otro negocio | Media — conoce el sistema | Alta (tenant isolation) |
| Atacante de cuentas de usuario | Account takeover | Media — phishing + brute force | Alta (2FA, rate limit) |
| Atacante de pagos | Fraude, chargeback | Media | Alta (PayPal webhook sig.) |
| Empleado descontento | Exfiltración de datos | Alta — acceso legítimo | Media (audit logging) |

### Superficies de ataque

```
Internet público
  │
  ├── API REST (/api/**)           ← Rate limiting, JWT auth, input validation
  ├── Webhooks (/api/webhooks/**)  ← Signature verification (PayPal)
  ├── Uploads (/api/*/imagen)      ← Magic bytes, extension allowlist
  └── SPA frontend                 ← CSP, HSTS, X-Frame-Options
          │
          ├── Auth endpoints       ← Rate limit + brute force detection
          ├── Admin endpoints      ← RBAC, ADMIN_IT only para operaciones críticas
          └── Tenant data          ← CompanyScope.assertCanAccess()
```

### Amenazas fuera de scope

- Ataques a infraestructura Supabase/Render (responsabilidad del proveedor)
- DDoS a nivel de red (requiere CDN/WAF externo)
- Compromiso físico de servidores

---

## Stack de seguridad implementado

```
┌─────────────────────────────────────────────────────┐
│                   CAPAS DE SEGURIDAD                 │
├─────────────────────────────────────────────────────┤
│  HTTP Layer       │ HSTS · CSP · X-Frame-Options    │
│                   │ Referrer-Policy · Permissions-   │
│                   │ Policy · COOP                    │
├─────────────────────────────────────────────────────┤
│  Filter Chain     │ MdcRequestIdFilter (trace IDs)   │
│  (in order)       │ RateLimitingFilter (11 endpoints)│
│                   │ JwtRequestFilter (auth + events) │
├─────────────────────────────────────────────────────┤
│  Auth & Identity  │ BCrypt passwords                 │
│                   │ JWT HS256 (15min / 5min / 10min) │
│                   │ TOTP 2FA (AES-256-GCM encrypted) │
│                   │ Email OTP 2FA (BCrypt hashed)    │
│                   │ Recovery codes (BCrypt hashed)   │
│                   │ Refresh tokens (DB, revocable)   │
│                   │ Account lockout (5 fails / 30min)│
├─────────────────────────────────────────────────────┤
│  Authorization    │ Spring Security RBAC             │
│                   │ @PreAuthorize method-level        │
│                   │ CompanyScope tenant isolation     │
├─────────────────────────────────────────────────────┤
│  Input Validation │ @Valid / @Validated              │
│                   │ GlobalExceptionHandler           │
│                   │ Upload: magic bytes + allowlist  │
├─────────────────────────────────────────────────────┤
│  Security Ops     │ SecurityAuditService (32 events) │
│                   │ SecurityDetectionService          │
│                   │ SecurityAlert (DB persisted)      │
│                   │ AdminSecurityCenter (UI)          │
├─────────────────────────────────────────────────────┤
│  Config Hardening │ ProductionConfigValidator        │
│                   │ Env-var only secrets             │
│                   │ ddl-auto=none (Flyway only)      │
└─────────────────────────────────────────────────────┘
```

---

## OWASP Top 10 (2021) — Cobertura

| OWASP | Categoría | Control implementado | Estado |
|---|---|---|---|
| A01 | Broken Access Control | RBAC + CompanyScope + @PreAuthorize | ✅ Cubierto |
| A02 | Cryptographic Failures | BCrypt + AES-256-GCM TOTP + HSTS | ✅ Cubierto |
| A03 | Injection | @Valid + JPA parameterized queries | ✅ Cubierto |
| A04 | Insecure Design | TempToken flow, single-purpose tokens | ✅ Cubierto |
| A05 | Security Misconfiguration | ProductionConfigValidator + security headers | ✅ Cubierto |
| A06 | Vulnerable Components | pom.xml Spring Boot 3.4.4 (recent) | ⚠️ Sin automatizar |
| A07 | Auth & Session Failures | JWT + 2FA + brute force + rate limit | ✅ Cubierto |
| A08 | Software/Data Integrity | Flyway migrations + webhook signature | ⚠️ Parcial |
| A09 | Logging & Monitoring | SecurityAuditService + SecurityCenter | ✅ Cubierto |
| A10 | SSRF | No user-supplied URLs procesadas | ✅ N/A |

---

## OWASP API Security Top 10 (2023)

| API | Categoría | Control | Estado |
|---|---|---|---|
| API1 | Broken Object Level Auth | CompanyScope.assertCanAccess() | ✅ |
| API2 | Broken Auth | JWT + 2FA + rate limit + account lock | ✅ |
| API3 | Broken Object Property Level Auth | DTOs explícitos, no exposición de entidades | ✅ |
| API4 | Unrestricted Resource Consumption | Rate limiting + upload size limits | ✅ |
| API5 | Broken Function Level Auth | @PreAuthorize + SecurityConfig | ✅ |
| API6 | Unrestricted Access to Sensitive Business Flows | OTP rate limit + detection | ✅ |
| API7 | Server Side Request Forgery | Sin proxy de URLs externas | ✅ |
| API8 | Security Misconfiguration | Headers + validator de config | ✅ |
| API9 | Improper Inventory Management | Swagger solo en dev | ⚠️ Verificar en prod |
| API10 | Unsafe Consumption of APIs | PayPal webhook signature verification | ✅ |

---

## Riesgos conocidos

| Riesgo | Severidad | Mitigación actual | Acción pendiente |
|---|---|---|---|
| Rate limiting en memoria (no distribuido) | MEDIUM | Restart limpia contadores | Ver [future-improvements.md](./future-improvements.md) |
| Sin alertas por email/Slack | MEDIUM | Alertas visibles en Security Center | Ver roadmap |
| JWT HS256 (simétrico) | LOW | Secreto en env var, rotación posible | Considerar RS256 |
| Sin session inventory / logout-all | LOW | Refresh token revocable individualmente | Backlog |
| Swagger accesible en producción | MEDIUM | Proteger o deshabilitar | Verificar en Render |
| Dependencias sin audit automatizado | MEDIUM | Sin CI/CD check | Implementar con GitHub Actions |

---

## Personas que deben leer esta documentación

| Rol | Documentos prioritarios |
|---|---|
| **Developer nuevo** | README → authentication → authorization-rbac → 2fa-mfa |
| **AppSec / Auditor** | security-overview → runtime-detection → audit-logging → incident-response |
| **DevOps / SRE** | production-hardening → security-headers → incident-response |
| **Security Center operator** | security-center → audit-logging → incident-response |
| **Arquitecto** | security-overview → jwt-security → future-improvements → security-roadmap |
