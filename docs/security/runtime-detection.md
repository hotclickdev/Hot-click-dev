# Runtime Attack Detection

## Arquitectura del sistema de detección

**Archivo:** `service/SecurityDetectionService.java`

El sistema de detección funciona en dos capas independientes que se complementan:

```
Capa 1: Rate Limiting (RateLimitingFilter)
  → Rechaza requests que superan umbrales por IP/endpoint
  → Protección reactiva: bloquea el request

Capa 2: SecurityDetectionService
  → Analiza PATRONES de comportamiento a través del tiempo
  → Genera alertas cuando detecta ataques en progreso
  → No bloquea directamente — alerta y persiste para análisis
```

**Principio:** El rate limiter protege en tiempo real. La detección identifica campañas de ataque sostenidas que podrían estar bajo el umbral del rate limiter.

---

## Estado del detector

Todo el estado vive en memoria (in-process):

```java
// Rastreo de logins fallidos por IP
ConcurrentHashMap<String, Queue<Long>> failedLoginsByIp

// Rastreo de emails objetivo distintos por IP (spray)
ConcurrentHashMap<String, Set<String>>  sprayTargetsByIp
ConcurrentHashMap<String, Long>         sprayWindowStartMs

// Rastreo de JWTs inválidos por IP
ConcurrentHashMap<String, Queue<Long>> invalidJwtsByIp

// Rastreo de solicitudes OTP por usuario
ConcurrentHashMap<Long, Queue<Long>>   otpRequestsByUser

// Cooldown de alertas: "TIPO:ip_o_userId" → último timestamp de alerta
ConcurrentHashMap<String, Long> alertCooldowns
```

**Limpieza:** Scheduled task cada 15 minutos limpia entradas expiradas para prevenir memory leak.

---

## Reglas de detección

### Brute Force

```
Trigger:     ≥ 5 logins fallidos desde la misma IP en 10 minutos
Severidad:   HIGH
Tipo alerta: BRUTE_FORCE
Cooldown:    5 minutos (para no duplicar alertas de la misma campaña)

Llamada:     detectionService.recordFailedLogin(ip, targetEmail)
             → en AuthController después de password incorrecto o usuario no encontrado
```

### Credential Stuffing

```
Trigger:     ≥ 15 logins fallidos desde la misma IP en 1 hora
Severidad:   CRITICAL
Tipo alerta: CREDENTIAL_STUFFING
Cooldown:    5 minutos

Mismo método: recordFailedLogin() — se detecta con ventana más amplia
```

### Password Spray

```
Trigger:     ≥ 3 cuentas distintas atacadas desde la misma IP en 5 minutos
Severidad:   HIGH
Tipo alerta: PASSWORD_SPRAY
Cooldown:    5 minutos

Lógica:
  - Cada llamada a recordFailedLogin(ip, targetEmail) agrega el email al Set de esa IP
  - Si el Set crece hasta 3 → alerta
  - El Set se resetea cada 5 minutos (ventana rolling)
```

### JWT Scanning

```
Trigger:     ≥ 15 tokens JWT inválidos desde la misma IP en 5 minutos
Severidad:   MEDIUM
Tipo alerta: JWT_SCANNING
Cooldown:    5 minutos

Llamada:     detectionService.recordInvalidJwt(ip)
             → en JwtRequestFilter al capturar JwtException (firma inválida, malformado)
             → NO se llama para tokens meramente expirados (esto es normal)
```

**Distinguir expirado vs inválido:**
- `ExpiredJwtException` → token expirado → solo `logTokenExpired` → NO `recordInvalidJwt`
- `JwtException` o `IllegalArgumentException` → token manipulado → `logTokenRejected` + `recordInvalidJwt`

### OTP Flood

```
Trigger:     ≥ 5 solicitudes de OTP del mismo usuario en 10 minutos
Severidad:   MEDIUM
Tipo alerta: OTP_FLOOD
Cooldown:    5 minutos

Llamada:     detectionService.recordOtpRequest(userId)
             → en OtpService al enviar un OTP (tanto de registro, reset, como 2FA)

Nota: OtpService también tiene su propio rate limit de 3/10min.
      recordOtpRequest detecta si alguien logra evadir ese límite (e.g. múltiples instancias).
```

---

## Algoritmo de sliding window

```java
// Para cada tipo de evento, se mantiene una queue de timestamps:
Queue<Long> timestamps = new ConcurrentLinkedQueue<>();

// Al registrar un evento:
timestamps.add(System.currentTimeMillis());
pruneOld(timestamps, now, windowMs);    // eliminar timestamps fuera de la ventana
// Contar eventos recientes:
int recent = (int) timestamps.stream().filter(t -> now - t <= windowMs).count();
```

La limpieza de timestamps es crítica para no acumular memoria indefinidamente.

---

## Generación de alertas

```java
// SecurityDetectionService.generateAlert()
@Transactional(propagation = Propagation.REQUIRES_NEW)
public void generateAlert(String alertType, SecurityEventSeverity severity,
                           String ip, Long userId, String message, String details) {

    // 1. Verificar cooldown para esta clave (tipo + ip/user)
    String cooldownKey = alertType + ":" + (ip != null ? ip : "user:" + userId);
    if (alertCooldowns.get(cooldownKey) es reciente) return;  // skip

    // 2. Actualizar cooldown
    alertCooldowns.put(cooldownKey, now);

    // 3. Persistir en DB
    SecurityAlert alert = new SecurityAlert();
    alert.setAlertType(alertType);
    alert.setSeverity(severity.name());
    alert.setIpAddress(ip);
    alert.setUserId(userId);
    alert.setMessage(message);
    alert.setDetails(details);
    alert.setResolved(false);
    alert.setCreatedAt(LocalDateTime.now());
    alertRepo.save(alert);

    // 4. Log prominente
    log.warn("[SEC-ALERT] type={} severity={} ip={} userId={} msg={}",
        alertType, severity, ip, userId, message);
}
```

**`REQUIRES_NEW`:** La persistencia de alertas usa una transacción separada para asegurar que el alert se grabe incluso si la transacción principal del request hace rollback.

---

## Flujo de detección end-to-end

```
Usuario malicioso hace 10 intentos de login fallidos en 2 minutos:

1-5 intentos:
  → RateLimitingFilter: dentro del límite (10/min) → pasa
  → AuthController: password incorrecto → logLoginFailed + recordFailedLogin(ip, email)
  → Brute force: 5 fallos en <10min → generateAlert(BRUTE_FORCE, HIGH, ip, ...)
  → log: [SEC-ALERT] type=BRUTE_FORCE severity=HIGH ip=...
  → DB: hot_click_security_alert_tb INSERT

6-10 intentos (en el mismo minuto):
  → RateLimitingFilter: excede 10/min → 429 + RATE_LIMIT_TRIGGERED event
  → No llega al controlador

Siguiente día, mismo IP, 20 fallos en 1 hora:
  → Credential stuffing: generateAlert(CREDENTIAL_STUFFING, CRITICAL, ip, ...)
  → log: [SEC-ALERT] type=CREDENTIAL_STUFFING severity=CRITICAL ip=...
```

---

## Visualización

Las alertas generadas son visibles en:
- **AdminSecurityCenter.jsx** → pestaña "Alertas" → lista con severidad, IP, mensaje, timestamp
- **Security Center dashboard** → contador "Alertas activas" en KPIs
- **Alertas activas** en banner rojo en la pestaña Dashboard

Para resolver una alerta:
1. Investigar IP en el log de eventos (pestaña "Eventos")
2. Determinar si es legítimo o ataque real
3. Clic "Resolver" → `PUT /api/security/alerts/{id}/resolve`

---

## Limitaciones del detector

| Limitación | Impacto | Mitigación |
|---|---|---|
| Estado en memoria (no distribuido) | Con múltiples instancias, los umbrales se multiplican | Render corre instancia única actualmente |
| Reset al restart | Un atacante podría forzar restart para limpiar estado | El bloqueo de cuenta en DB persiste |
| No detecta lentitud (slow and low) | 1 intento/hora durante días no se detecta | El bloqueo de cuenta actúa antes (5 intentos acumulados en DB) |
| Cooldown de 5 minutos | Campaña que pausa y reanuda podría evadir deduplicación | El log en SLF4J persiste todos los eventos |
| No hay geo-anomaly detection | IPs de países inesperados no se detectan | No implementado (ver roadmap) |
