# Mejoras de Seguridad — Backlog Priorizado

> Este documento refleja el estado real del proyecto a Mayo 2026.  
> Las mejoras están priorizadas por impacto en seguridad vs esfuerzo de implementación.

---

## Alta prioridad

### 1. Redis para detección distribuida

**Problema actual:** El `SecurityDetectionService` usa ConcurrentHashMap en memoria. Con múltiples instancias de la aplicación (horizontal scaling), los contadores no se comparten.

**Impacto:** Un atacante puede distribuir sus requests entre instancias y evadir los umbrales de detección.

**Solución:**
```java
// Reemplazar:
ConcurrentHashMap<String, Queue<Long>> failedLoginsByIp

// Por:
// Redis con INCR + EXPIRE (sliding window vía sorted sets)
// Spring Data Redis + @EnableCaching
// Mismo patrón de sliding window, pero atómico y distribuido
```

**Esfuerzo:** ~2 días de desarrollo + configuración en Render  
**Costo:** Redis Cloud free tier disponible / Render add-on

---

### 2. Deshabilitar/proteger Swagger en producción

**Problema actual:** `springdoc-openapi-starter-webmvc-ui 2.6.0` expone `/swagger-ui.html` y `/v3/api-docs` en producción, facilitando reconocimiento de la API.

**Solución (opción A — deshabilitar):**
```properties
# application-prod.properties o env var
springdoc.swagger-ui.enabled=false
springdoc.api-docs.enabled=false
```

**Solución (opción B — proteger):**
```java
// SecurityConfig.java:
.requestMatchers("/swagger-ui/**", "/v3/api-docs/**").hasRole("ADMIN_IT")
```

**Esfuerzo:** 30 minutos  
**Impacto:** MEDIUM — dificulta el reconocimiento de atacantes

---

### 3. Alertas por email / Slack para incidentes críticos

**Problema actual:** Las alertas CRITICAL/HIGH solo son visibles si alguien activamente revisa el Security Center. Sin notificación push, un ataque puede durar horas antes de ser detectado.

**Solución:**
```java
// SecurityDetectionService.generateAlert():
// Después de persistir en DB, si severity == HIGH o CRITICAL:
//   notificacionEmailService.enviarAlertaSeguridad(adminEmail, alert)
// O:
//   HTTP POST a Slack webhook (SLACK_WEBHOOK_URL env var)
```

**Esfuerzo:** ~4 horas  
**Impacto:** HIGH — mejora el tiempo de detección de incidentes

---

### 4. Revocación de access tokens (JWT blocklist)

**Problema actual:** Al hacer logout o cambiar contraseña, solo se revoca el refresh token. El access token JWT sigue siendo válido hasta su expiración (≤15 min).

**Solución:**
```java
// Opción A: Reducir TTL de access token a 5 minutos
//   → Mayor tráfico al endpoint /refresh
//   → Sin infraestructura adicional

// Opción B: Redis blocklist de JWT JTI (JWT ID)
//   → Cada JWT recibe un UUID único (jti claim)
//   → Al logout: agregar jti a Redis con TTL = tiempo restante del token
//   → JwtRequestFilter: verificar que jti no esté en blocklist
```

**Esfuerzo:** Opción A: 1 hora. Opción B: 4 horas + Redis  
**Impacto:** LOW-MEDIUM — ventana actual de 15 min es razonable para mayoría de casos

---

### 5. Dependency audit automatizado (CI/CD)

**Problema actual:** Las dependencias se verifican manualmente. Un CVE en Spring Boot o JJWT podría pasar desapercibido.

**Solución:**
```yaml
# .github/workflows/security-audit.yml
- name: OWASP Dependency Check
  run: mvn org.owasp:dependency-check-maven:check
  
# O: Habilitar Dependabot en GitHub Settings
# → Alerta automática y PR para actualizar dependencias vulnerables
```

**Esfuerzo:** 2 horas  
**Impacto:** MEDIUM — cubre OWASP A06 (Vulnerable Components) de forma continua

---

## Prioridad media

### 6. Session inventory — ver sesiones activas

**Problema actual:** Un usuario no puede ver desde qué dispositivos tiene sesión activa, ni hacer "cerrar sesión en todos los dispositivos".

**Solución:**
```sql
-- Agregar a hot_click_refresh_token_tb:
ALTER TABLE hot_click_refresh_token_tb
  ADD COLUMN IF NOT EXISTS device_info VARCHAR(300),
  ADD COLUMN IF NOT EXISTS ip_address  VARCHAR(45);
```

```java
// RefreshTokenService.crear(): guardar IP y User-Agent al crear el token
// Nuevo endpoint: GET /api/auth/mis-sesiones → lista de refresh tokens activos
// Nuevo endpoint: DELETE /api/auth/sesiones/{id} → revocar sesión específica
// Nuevo endpoint: DELETE /api/auth/sesiones → revocar todas excepto la actual
```

**Esfuerzo:** ~1 día  
**Impacto:** MEDIUM — mejora UX de seguridad y ayuda en incident response

---

### 7. Avisos de seguridad al usuario

**Problema actual:** Los usuarios no reciben notificación cuando:
- Se hace login desde una IP nueva/inusual
- Se cambia su contraseña
- Se deshabilita 2FA en su cuenta

**Solución:**
```java
// En AuthController.login(): si IP != últimas IPs conocidas:
//   notificacionEmailService.enviarAvisoLoginNuevoDispositivo(usuario, ip)
//
// En AuthController.changePassword(): siempre enviar:
//   notificacionEmailService.enviarAvisoCambioContrasena(usuario, ip)
```

**Esfuerzo:** ~4 horas  
**Impacto:** MEDIUM — alerta proactiva al usuario de actividad sospechosa

---

### 8. Política de retención de audit logs

**Problema actual:** La tabla `hot_click_security_audit_log_tb` crece indefinidamente. Con tráfico bajo actual no es urgente, pero debe planificarse.

**Solución:**
```java
// SecurityAuditLogCleanupScheduler.java
@Scheduled(cron = "0 0 3 * * SUN")  // Domingos a las 3 AM
@Transactional
void purgarLogsAntiguos() {
    // Conservar HIGH y CRITICAL indefinidamente
    // Purgar LOW y MEDIUM con más de 90 días
    auditRepo.deleteByTimestampBeforeAndSeverityIn(
        LocalDateTime.now().minusDays(90),
        List.of("LOW", "MEDIUM")
    );
}
```

**Esfuerzo:** 2 horas  
**Impacto:** LOW — performance a largo plazo

---

### 9. CSP sin 'unsafe-inline' para scripts

**Problema actual:** El header CSP incluye `'unsafe-inline'` y `'unsafe-eval'` para scripts, reduciendo la protección contra XSS.

**Solución:** Configurar el build de Vite para generar un nonce por request y usarlo en el CSP:
```java
// SecurityConfig: por cada request, generar un nonce y agregarlo al CSP
String nonce = Base64.getEncoder().encodeToString(SecureRandom.getSeed(16));
// ...
"script-src 'self' 'nonce-" + nonce + "' https://www.paypal.com"
```

**Esfuerzo:** ~1 día (configuración de Vite + Spring)  
**Impacto:** HIGH para XSS — pero alto esfuerzo de implementación

---

### 10. TOTP backup con múltiples recovery codes

**Problema actual:** Al habilitar 2FA se generan 8 recovery codes. Si el usuario agota los 8, no tiene forma de recuperar el acceso sin soporte. No hay alerta cuando quedan pocos códigos.

**Solución:**
```java
// En TwoFactorService.verifyCodeWithReplayProtection():
// Después de usar un recovery code, contar cuántos quedan
// Si quedan ≤ 2 → notificacionEmailService.enviarAvisoRecoveryCodesAgotandose(usuario)
```

**Esfuerzo:** 2 horas  
**Impacto:** LOW — mejora UX de recuperación

---

## Baja prioridad / Futuro

### 11. Geo-anomaly detection

Detectar logins desde países o regiones inesperadas para cada usuario.

**Requiere:** Integración con GeoIP database (MaxMind GeoLite2 — gratuito).

---

### 12. Device trust / Device fingerprinting

Identificar dispositivos conocidos y marcar logins desde dispositivos nuevos como más sospechosos.

**Requiere:** Fingerprint de browser enviado desde frontend, almacenado en refresh token.

---

### 13. SIEM integration

Enviar eventos de seguridad a un SIEM externo (Elastic, Splunk, Datadog) para análisis avanzado, correlación y reglas personalizadas.

**Requiere:** Budget para SIEM externo.

---

### 14. Behavioral analytics

Machine learning para detectar anomalías en el comportamiento de usuarios (horarios inusuales, velocidad de navegación, patrones de compra anómalos).

**Requiere:** Volumen de datos suficiente y plataforma de ML.

---

### 15. RS256 para JWT (asimétrico)

Migrar de HS256 (clave simétrica) a RS256 (par de claves RSA). Permite verificar tokens sin acceso a la clave privada, útil si se agregan microservicios.

**Requiere:** Gestión de par de claves RSA + actualización de todos los endpoints de token.

---

## Scorecard de mejoras

| Mejora | Impacto | Esfuerzo | Recomendación |
|---|---|---|---|
| 1. Redis detección distribuida | HIGH | MEDIUM | Q3 2026 |
| 2. Deshabilitar Swagger prod | MEDIUM | BAJO | Esta semana |
| 3. Alertas email/Slack | HIGH | BAJO | Q2 2026 |
| 4. JWT blocklist | MEDIUM | MEDIUM | Q3 2026 |
| 5. Dependency audit CI | MEDIUM | BAJO | Q2 2026 |
| 6. Session inventory | MEDIUM | MEDIUM | Q3 2026 |
| 7. Avisos de seguridad usuario | MEDIUM | BAJO | Q2 2026 |
| 8. Retención de logs | LOW | BAJO | Q4 2026 |
| 9. CSP sin unsafe-inline | HIGH | ALTO | Q4 2026 |
| 10. Aviso recovery codes | LOW | BAJO | Q3 2026 |
