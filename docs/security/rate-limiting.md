# Rate Limiting

## Implementación

**Archivo:** `security/RateLimitingFilter.java`  
**Tipo:** Sliding-window counter por IP  
**Posición en filter chain:** Antes de `JwtRequestFilter` y `UsernamePasswordAuthenticationFilter`  
**Scope:** Solo requests POST (por diseño — los GETs de catálogo son públicos y no aplica)

### Mecanismo interno

```java
// Para cada request POST a un endpoint protegido:
// 1. Resolver IP del cliente (request.getRemoteAddr() — ya resuelto por ForwardedHeaderFilter)
// 2. Construir clave: "<ip>:<path>"
// 3. SlidingWindow.tryAcquire(maxRequests):
//    a. Si now - windowStart >= windowSeconds → resetear contador a 0
//    b. contador++
//    c. Si contador > maxRequests → retornar false → 429

// Limpieza de memoria:
// ScheduledExecutorService cada 5 minutos elimina buckets donde
// now - windowStart > windowSeconds * 2 (ventana expirada)
```

**Importante:** La IP se obtiene de `request.getRemoteAddr()`, que ya fue procesada por el `ForwardedHeaderFilter` de Spring (activado con `server.forward-headers-strategy=FRAMEWORK`). Esto previene spoofing via `X-Forwarded-For` a nivel de aplicación — Render ya resuelve la IP real y la propaga correctamente.

---

## Tabla de límites

| Endpoint | Método | Límite | Ventana | Razón |
|---|---|---|---|---|
| `/api/auth/login` | POST | **10 req** | 60s | Permite 10 intentos/min antes de detectar brute force |
| `/api/auth/2fa/verify` | POST | **5 req** | 60s | Códigos 6 dígitos — menor umbral, más sensible |
| `/api/auth/2fa/email/send` | POST | **3 req** | 300s | OTP por email — 3 por 5 minutos para prevenir flooding |
| `/api/auth/forgot-password` | POST | **5 req** | 60s | Prevenir abuso del email de recuperación |
| `/api/auth/verify-code` | POST | **5 req** | 60s | Verificación de OTP de contraseña |
| `/api/auth/registro-empresa` | POST | **5 req** | 60s | Registro de negocios |
| `/api/auth/register` | POST | **5 req** | 3600s | Registro de usuarios — 5 por hora |
| `/api/auth/send-verification` | POST | **5 req** | 60s | Reenvío de email de verificación |
| `/api/auth/refresh` | POST | **30 req** | 60s | Alto límite — aplica legítimamente con muchas pestañas |
| `/api/auth/change-password` | POST | **5 req** | 300s | Prevenir fuerza bruta de contraseña actual |
| `/api/contacto` | POST | **5 req** | 60s | Anti-spam en formulario de contacto |

---

## Respuesta ante rate limit

```http
HTTP/1.1 429 Too Many Requests
Content-Type: application/json

{
  "success": false,
  "message": "Demasiados intentos. Esperá un momento antes de volver a intentar."
}
```

Adicionalmente, se emite un evento de seguridad:
- **Tipo:** `RATE_LIMIT_TRIGGERED`
- **Severidad:** `MEDIUM`
- **Datos:** IP + endpoint

---

## Interacción con SecurityDetectionService

El rate limiting es la primera línea de defensa (rechaza el request). La detección de ataques es la segunda capa (analiza patrones en los eventos que pasaron el rate limit):

```
Request → RateLimitingFilter:
  Si excede límite → 429 + RATE_LIMIT_TRIGGERED event → fin
  Si dentro del límite → pasa al controlador

Controlador:
  Si login fallido → logLoginFailed() + recordFailedLogin()
  SecurityDetectionService analiza el patrón acumulado:
    - Misma IP: 5+ fallos en 10min → BRUTE_FORCE alert
    - Misma IP: 3+ targets distintos/5min → PASSWORD_SPRAY alert
    - Misma IP: 15+ JWTs inválidos/5min → JWT_SCANNING alert
```

---

## Limitaciones conocidas

### Memoria no distribuida

Los contadores de rate limiting viven **en memoria de la instancia JVM**. Si la aplicación tiene múltiples instancias (horizontal scaling), cada instancia tiene sus propios contadores. Un atacante podría distribuir sus requests entre instancias para evadir el límite.

**Mitigación actual:** Render free/starter tier corre con una sola instancia.  
**Solución futura:** Redis distribuido (ver [future-improvements.md](./future-improvements.md)).

### Reset en restart

Al reiniciar la aplicación, todos los contadores se pierden. Un atacante podría forzar un restart para limpiar sus contadores.

**Mitigación:** La capa de detección (`SecurityDetectionService`) tiene el mismo problema. Sin embargo, el bloqueo de cuenta en DB es persistente: si un usuario fue bloqueado, el `bloqueadoHasta` en DB persiste el restart.

### Solo POST

El rate limiter solo aplica a requests POST. Los endpoints GET no están rate-limited. Los endpoints GET sensibles deben protegerse con autenticación (lo que ya hacen).

---

## Ajustar límites

Para modificar un límite existente o agregar uno nuevo:

```java
// RateLimitingFilter.java
private static final Map<String, Limit> LIMITS = Map.ofEntries(
    Map.entry("/api/auth/login",    new Limit(10,  60)),   // maxReq, windowSeconds
    // agregar aquí:
    Map.entry("/api/ruta/nueva",    new Limit(5,  300)),
    // ...
);
```

**Regla:** Pensar en el usuario legítimo más activo. Si ese usuario tiene menos requests que el límite, el límite es seguro.
