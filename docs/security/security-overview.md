# Security Architecture — Vista Completa

## Arquitectura de capas

```
┌─────────────────────────────────────────────────────────────────┐
│                         INTERNET                                 │
└─────────────────────┬───────────────────────────────────────────┘
                      │ HTTPS (Render CDN)
┌─────────────────────▼───────────────────────────────────────────┐
│                    HTTP LAYER                                    │
│  HSTS · CSP · X-Frame-Options · Referrer-Policy                 │
│  Permissions-Policy · Cross-Origin-Opener-Policy                 │
│  X-Content-Type-Options · X-Request-Id                          │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                  SPRING FILTER CHAIN                             │
│                                                                  │
│  1. MdcRequestIdFilter      (HIGHEST_PRECEDENCE)                │
│     └─ Genera UUID de traza por request → X-Request-Id header  │
│                                                                  │
│  2. ForwardedHeaderFilter   (framework)                          │
│     └─ Resuelve IP real desde X-Forwarded-For                  │
│                                                                  │
│  3. RateLimitingFilter                                          │
│     └─ Sliding window por IP · 11 endpoints · Emite eventos    │
│                                                                  │
│  4. JwtRequestFilter                                            │
│     └─ Valida JWT · Detecta anomalías de token · Emite eventos │
│                                                                  │
│  5. UsernamePasswordAuthenticationFilter (Spring Security)       │
│                                                                  │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                  AUTHORIZATION LAYER                             │
│                                                                  │
│  Spring Security HttpSecurity rules                              │
│    permitAll()    → catálogo público, health, webhooks           │
│    authenticated()→ rutas de perfil, pedidos propios             │
│    hasRole(X)     → rutas admin, según tabla de roles            │
│                                                                  │
│  @PreAuthorize ("hasRole('ADMIN_IT')")                          │
│    → Doble validación a nivel de método                          │
│                                                                  │
│  CompanyScope.assertCanAccess(empresaId)                        │
│    → Tenant isolation: recursos deben pertenecer a la empresa   │
│       del JWT o ser ADMIN_IT                                     │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                  BUSINESS / SERVICE LAYER                        │
│                                                                  │
│  Input validation: @Valid · ConstraintViolation                 │
│  Business rules: stock, estado de cuenta, 2FA required           │
│  Audit calls: SecurityAuditService.log(event, severity, ...)    │
│  Detection: SecurityDetectionService.record*(...)               │
└─────────────────────┬───────────────────────────────────────────┘
                      │
┌─────────────────────▼───────────────────────────────────────────┐
│                   DATA LAYER                                     │
│                                                                  │
│  PostgreSQL on Supabase                                          │
│  ORM: JPA/Hibernate (ddl-auto=none, Flyway managed)            │
│  Connection pool: HikariCP (max 3 conn — Supabase free tier)   │
│  Secrets: env vars only (never in code/properties)              │
│  Migrations: V1–V20 (V20 = security audit + alerts tables)      │
└─────────────────────────────────────────────────────────────────┘
```

---

## Flujos de seguridad principales

### Flujo de login completo

```mermaid
flowchart TD
    A[POST /api/auth/login] --> B{Usuario existe?}
    B -- No --> C[401 Credenciales inválidas\n+ logLoginFailed\n+ recordFailedLogin]
    B -- Sí --> D{Cuenta bloqueada?}
    D -- Sí --> E[403 Bloqueada hasta...\n+ logLoginBlocked]
    D -- No --> F{Contraseña válida?}
    F -- No --> G[incrementarIntentosFallidos\n+ logLoginFailed\n+ recordFailedLogin\n→ 401]
    G --> H{Intentos >= 5?}
    H -- Sí --> I[bloquear cuenta 30min\nenviar email recovery]
    F -- Sí --> J[resetearIntentosFallidos\nlogLoginSuccess]
    J --> K{2FA habilitado?}
    K -- Sí --> L[Generar TempToken 5min\n2fa_pending=true]
    L --> M[Retornar tempToken\n+ métodos 2FA disponibles]
    K -- No --> N{Multi-empresa?}
    N -- Sí --> O[Generar EmpresaSelectionToken\n10min · empresa_selection=true]
    N -- No --> P[Generar AccessToken 15min\n+ RefreshToken 30 días DB]
    P --> Q[Retornar AuthResponse]
```

### Flujo de verificación 2FA

```mermaid
flowchart TD
    A[POST /api/auth/2fa/verify\ntempToken + code/recoveryCode + method] --> B{tempToken válido\ny tiene 2fa_pending?}
    B -- No --> C[401 Token inválido]
    B -- Sí --> D{Cuenta bloqueada?}
    D -- Sí --> E[403 Bloqueada]
    D -- No --> F{Método?}
    F -- RECOVERY_CODE --> G[Buscar en lista BCrypt\n+ removeAtIndex + persistir]
    G -- No match --> H[incrementarIntentos\nlog2FAFailed\n→ 401]
    G -- Match --> I[log2FASuccess]
    F -- EMAIL_OTP --> J[otpService.verificarOtp\nmarcarUsado]
    J -- Fallo --> K[incrementarIntentos\nlog2FAFailed\n→ 401]
    J -- OK --> I
    F -- TOTP --> L[verifyCodeWithReplayProtection\ndescifrar AES-256-GCM\nvalidar RFC 6238\nchequear replay 90s]
    L -- Fallo --> M[incrementarIntentos\nlog2FAFailed\n→ 401]
    L -- OK --> I
    I --> N{Multi-empresa?}
    N -- Sí --> O[EmpresaSelectionToken]
    N -- No --> P[AccessToken 15min\n+ RefreshToken 30d]
```

### Flujo de evento de seguridad

```mermaid
flowchart LR
    A[Acción del sistema] --> B[SecurityAuditService.log]
    B --> C[SLF4J logger\ninmediato]
    B --> D[SecurityAuditLog.save\nhot_click_security_audit_log_tb]
    A --> E[SecurityDetectionService.record*]
    E --> F{Umbral\nsuperado?}
    F -- No --> G[Solo contador\nen memoria]
    F -- Sí --> H{Cooldown\n5min activo?}
    H -- Sí --> I[Ignorar\nno duplicar]
    H -- No --> J[SecurityAlert.save\nhot_click_security_alert_tb]
    J --> K[SecurityAuditService\nlogDetection]
    D --> L[Security Center\n/api/security/dashboard]
    J --> L
```

---

## Componentes de seguridad — Mapa de archivos

```
com.hotclick/
├── config/
│   ├── SecurityConfig.java            ← Spring Security config, CORS, headers
│   ├── GlobalExceptionHandler.java    ← Error handling seguro
│   └── ProductionConfigValidator.java ← Validación de config en startup
│
├── security/
│   ├── JwtUtil.java                   ← Generación/validación JWT (3 tipos)
│   ├── JwtRequestFilter.java          ← Intercepta Bearer tokens, emite eventos
│   ├── RateLimitingFilter.java        ← Rate limit por IP, sliding window
│   ├── CompanyScope.java              ← Tenant isolation, RBAC helpers
│   ├── MdcRequestIdFilter.java        ← UUID de traza por request
│   ├── SecurityEventType.java         ← 32 tipos de evento
│   └── SecurityEventSeverity.java     ← LOW / MEDIUM / HIGH / CRITICAL
│
├── service/
│   ├── SecurityAuditService.java      ← Log centralizado: SLF4J + DB
│   ├── SecurityDetectionService.java  ← Detección en memoria + alertas
│   ├── TwoFactorService.java          ← TOTP RFC 6238, recovery codes
│   ├── TotpSecretEncryptionService.java ← AES-256-GCM para secretos TOTP
│   ├── OtpService.java                ← Email OTP, rate limit, brute force
│   ├── RefreshTokenService.java       ← Tokens UUID, revocación, limpieza
│   ├── PasswordResetService.java      ← Flow de recuperación con OTP
│   ├── CustomUserDetailsService.java  ← UserDetails para Spring Security
│   └── UsuarioService.java            ← incrementarIntentos, bloquear cuenta
│
├── model/
│   ├── SecurityAuditLog.java          ← Entidad log de eventos
│   └── SecurityAlert.java             ← Entidad de alertas de ataque
│
├── repository/
│   ├── SecurityAuditLogRepository.java ← Queries para Security Center
│   └── SecurityAlertRepository.java    ← Queries de alertas
│
└── controller/
    ├── AuthController.java             ← Login, 2FA, refresh, logout
    └── SecurityController.java         ← Security Center API (ADMIN_IT only)

frontend/
└── src/
    ├── pages/admin/AdminSecurityCenter.jsx  ← Security Center UI
    └── services/securityService.js          ← Calls a /api/security/**
```

---

## Naming strategy y base de datos

**Tablas de seguridad (V20):**
```sql
hot_click_security_audit_log_tb  -- Log de eventos (índices en timestamp, event_type, severity, ip)
hot_click_security_alert_tb      -- Alertas de ataque (índices en resolved, severity)
```

**Naming convention:** `PhysicalNamingStrategyStandardImpl` — nombres de columna coinciden exactamente con los campos Java (snake_case → snake_case).

**Restricción crítica:** `ddl-auto=none`. Todo cambio de esquema requiere migración Flyway (`V{N}__descripcion.sql`). Nunca modificar entidades JPA sin su migración correspondiente.
