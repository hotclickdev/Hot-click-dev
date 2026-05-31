# Audit Logging — Eventos de Seguridad

## Arquitectura

**Archivo:** `service/SecurityAuditService.java`  
**Tablas:** `hot_click_security_audit_log_tb`, `hot_click_security_alert_tb` (V20)

El sistema de audit logging tiene dos niveles:

```
Nivel 1: SLF4J (inmediato, sin latencia DB)
  → Cada evento se escribe primero al logger
  → Formato: [SEC] type=X severity=Y userId=Z email=A ip=B endpoint=C meta=D
  → Renderizado en logs de Render (sistema de logging externo)

Nivel 2: Persistencia en PostgreSQL
  → Mismos datos guardados en hot_click_security_audit_log_tb
  → Transacción REQUIRES_NEW: persiste aunque la transacción principal falle
  → Recuperable para auditorías, compliance, incident response
  → Try-catch: si DB falla, el log SLF4J ya está escrito
```

---

## Catálogo de eventos

### Autenticación

| Tipo | Severidad | Disparador | Datos adicionales |
|---|---|---|---|
| `LOGIN_SUCCESS` | LOW | Login correcto (con o sin 2FA) | userId, email, ip, ua |
| `LOGIN_FAILED` | MEDIUM | Contraseña incorrecta o usuario no encontrado | email, ip, reason |
| `LOGIN_BLOCKED` | HIGH | Cuenta bloqueada al intentar login | email, ip |
| `LOGOUT` | LOW | POST /auth/logout | ip |
| `TOKEN_REFRESH` | LOW | POST /auth/refresh (exitoso) | ip |

### Contraseña

| Tipo | Severidad | Disparador | Datos adicionales |
|---|---|---|---|
| `PASSWORD_RESET_REQUEST` | LOW | POST /auth/forgot-password | email, ip |
| `PASSWORD_RESET_SUCCESS` | LOW | POST /auth/reset-password | userId, email, ip |
| `PASSWORD_CHANGED` | LOW | POST /auth/change-password | userId, email, ip |

### Autenticación multi-factor

| Tipo | Severidad | Disparador | Datos adicionales |
|---|---|---|---|
| `TWO_FA_SETUP` | LOW | Setup de TOTP iniciado | userId, email |
| `TWO_FA_ENABLED` | LOW | 2FA habilitado exitosamente | userId, email, method |
| `TWO_FA_DISABLED` | LOW | 2FA deshabilitado | userId, email, method |
| `TWO_FA_FAILED` | MEDIUM | Código 2FA incorrecto | userId, email, ip, method |
| `OTP_SENT` | LOW | OTP enviado por email | userId, email, endpoint |
| `OTP_VERIFIED` | LOW | OTP verificado exitosamente | userId, email |

### Tokens

| Tipo | Severidad | Disparador | Datos adicionales |
|---|---|---|---|
| `TOKEN_REJECTED` | MEDIUM | JWT con firma inválida/malformado | ip, ua, endpoint, reason |
| `TOKEN_EXPIRED` | LOW | JWT expirado (flujo normal) | ip, ua, endpoint |

### Control de acceso

| Tipo | Severidad | Disparador | Datos adicionales |
|---|---|---|---|
| `PERMISSION_DENIED` | MEDIUM | 403 por rol insuficiente | userId, email, ip, endpoint |
| `ACCESS_CONTROL_BLOCKED` | MEDIUM | TenantAccessDeniedException | userId, ip, endpoint |
| `RATE_LIMIT_TRIGGERED` | MEDIUM | 429 del RateLimitingFilter | ip, endpoint |
| `UPLOAD_REJECTED` | MEDIUM | Archivo rechazado por validación | ip, endpoint |

### Detección de ataques

| Tipo | Severidad | Disparador | Datos adicionales |
|---|---|---|---|
| `SUSPICIOUS_ACTIVITY` | HIGH | Password spray u otra actividad anómala | ip, description |
| `BRUTE_FORCE_DETECTED` | HIGH | ≥5 fallos/10min misma IP | ip, count |
| `OTP_ABUSE_DETECTED` | MEDIUM | ≥5 OTPs/10min mismo usuario | userId, count |
| `JWT_SCANNING_DETECTED` | MEDIUM | ≥15 JWTs inválidos/5min misma IP | ip, count |
| `CREDENTIAL_STUFFING_DETECTED` | CRITICAL | ≥15 fallos/1h misma IP | ip, count |

### Admin y registro

| Tipo | Severidad | Disparador | Datos adicionales |
|---|---|---|---|
| `ADMIN_ACTION` | LOW | Acción administrativa relevante | adminId, action, entity |
| `ROLE_CHANGE` | LOW | Cambio de rol de usuario | adminId, targetUser, newRole |
| `REGISTRATION_SUCCESS` | LOW | Nuevo emprendedor registrado | userId, email, ip |
| `REGISTRATION_FAILED` | MEDIUM | Error en registro | email, ip, reason |

---

## Esquema de base de datos

```sql
-- Migración V20
CREATE TABLE hot_click_security_audit_log_tb (
    id          BIGSERIAL    PRIMARY KEY,
    timestamp   TIMESTAMP    NOT NULL DEFAULT NOW(),
    event_type  VARCHAR(50)  NOT NULL,
    severity    VARCHAR(10)  NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    user_id     BIGINT,       -- NULL si el usuario no está identificado (pre-auth)
    email       VARCHAR(150), -- NULL si no aplica
    ip_address  VARCHAR(45),  -- IPv4 o IPv6
    user_agent  VARCHAR(300), -- Truncado a 300 chars
    endpoint    VARCHAR(200), -- Path del endpoint
    metadata    TEXT          -- JSON con datos adicionales del evento
);

-- Índices para queries del Security Center
CREATE INDEX idx_sal_timestamp   ON hot_click_security_audit_log_tb (timestamp DESC);
CREATE INDEX idx_sal_event_type  ON hot_click_security_audit_log_tb (event_type);
CREATE INDEX idx_sal_severity    ON hot_click_security_audit_log_tb (severity);
CREATE INDEX idx_sal_user_id     ON hot_click_security_audit_log_tb (user_id);
CREATE INDEX idx_sal_ip_address  ON hot_click_security_audit_log_tb (ip_address);

CREATE TABLE hot_click_security_alert_tb (
    id          BIGSERIAL    PRIMARY KEY,
    alert_type  VARCHAR(50)  NOT NULL,
    severity    VARCHAR(10)  NOT NULL CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
    user_id     BIGINT,
    ip_address  VARCHAR(45),
    message     VARCHAR(500) NOT NULL,
    details     TEXT,
    resolved    BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMP    NOT NULL DEFAULT NOW(),
    resolved_at TIMESTAMP
);

CREATE INDEX idx_alert_unresolved ON hot_click_security_alert_tb (resolved, created_at DESC);
CREATE INDEX idx_alert_severity   ON hot_click_security_alert_tb (severity);
```

---

## Datos que NUNCA se guardan

El sistema tiene salvaguardas explícitas para no persistir:
- Contraseñas (ni en texto plano ni en hash)
- Códigos OTP
- Tokens JWT completos (solo fingerprints o razones de rechazo)
- Secretos TOTP
- Llaves de API
- Recovery codes

---

## API del SecurityAuditService

```java
// Métodos de conveniencia (llaman a log() internamente):
securityAuditService.logLoginSuccess(userId, email, request);
securityAuditService.logLoginFailed(email, request, reason);
securityAuditService.logLoginBlocked(email, request);
securityAuditService.logLogout(userId, email, request);
securityAuditService.log2FAFailed(userId, email, request, method);
securityAuditService.log2FASuccess(userId, email, request, method);
securityAuditService.logTokenRejected(ip, userAgent, endpoint, reason);
securityAuditService.logTokenExpired(ip, userAgent, endpoint);
securityAuditService.logRateLimitTriggered(ip, endpoint);
securityAuditService.logPermissionDenied(userId, email, ip, endpoint);
securityAuditService.logPasswordResetRequest(email, request);
securityAuditService.logPasswordResetSuccess(userId, email, request);
securityAuditService.logPasswordChanged(userId, email, request);
securityAuditService.logDetection(eventType, severity, ip, userId, description);
securityAuditService.logRegistration(userId, email, request);
securityAuditService.logAdminAction(adminId, adminEmail, action, entity, entityId);

// Método base:
securityAuditService.log(
    SecurityEventType type,
    SecurityEventSeverity severity,
    Long userId,
    String email,
    String ip,
    String userAgent,
    String endpoint,
    Map<String, Object> metadata
);

// Helpers públicos (usados en filtros sin HttpServletRequest):
String ip = securityAuditService.getIp(request);   // null-safe
String ua = securityAuditService.getUa(request);   // null-safe, trunca a 300
```

---

## Resiliencia del logging

```java
// SecurityAuditService.log() — resiliente a fallos de DB
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void log(...) {
    // 1. Log SLF4J siempre (sin DB, sin latencia)
    log.info("[SEC] type={} severity={} userId={} ...", ...);
    
    try {
        // 2. Intentar persistir en DB
        SecurityAuditLog record = new SecurityAuditLog();
        // ... populate fields ...
        auditRepo.save(record);
    } catch (Exception e) {
        // 3. Si DB falla, el log SLF4J ya existe → no se pierde el evento
        log.error("[SEC] Failed to persist audit log record type={}: {}", evt, e.getMessage());
        // No relanzar la excepción → no interrumpir el flujo del request
    }
}
```

Las llamadas al audit service desde controladores están envueltas en try-catch adicional:
```java
try { securityAuditService.logLoginFailed(...); } catch (Exception ignored) {}
```

Esto garantiza que un fallo del subsistema de auditoría nunca afecta la respuesta al usuario.

---

## Consultas del Security Center

El `SecurityController` usa estas queries para el dashboard:

```java
// Conteo por tipo de evento en período
auditRepo.countByEventTypeAfter(from)           // para gráfico de top eventos

// Conteo por severidad en período
auditRepo.countBySeverityAfter(from)             // para breakdown de severidad

// Top IPs con logins fallidos
auditRepo.countByIpForEventTypeAfter("LOGIN_FAILED", from)

// Totales
auditRepo.countByTimestampAfter(from)
auditRepo.countBySeverityAndTimestampAfter("CRITICAL", from)
auditRepo.countByEventTypeAndTimestampAfter("LOGIN_FAILED", from)
```

---

## Retención de logs

No hay política automática de purga implementada para los audit logs. Con el nivel de tráfico actual, la tabla crecerá a ~100-500 registros por día. 

**Recomendación futura:** Implementar purga automática de eventos LOW/MEDIUM con más de 90 días. Mantener eventos HIGH/CRITICAL indefinidamente o hasta 1 año.

---

## Integración con el audit log existente

El sistema tenía previamente `hot_click_auditoria_admin_tb` (`model/AuditoriaAdmin.java`) para acciones administrativas. Este log continúa existiendo y es complementario:
- `AuditoriaAdmin`: acciones de negocio (crear producto, cambiar estado de pedido)
- `SecurityAuditLog`: eventos de seguridad (autenticación, acceso, detección)

Ambos coexisten sin solapamiento.
