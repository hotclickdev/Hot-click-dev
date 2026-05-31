# JWT Security — Lifecycle, Tipos, Rotación

## Implementación técnica

**Librería:** `io.jsonwebtoken` (JJWT) versión 0.11.5  
**Archivo:** `security/JwtUtil.java`  
**Algoritmo:** HMAC SHA-256 (HS256)  
**Clave:** `${JWT_SECRET}` — string de env var convertido a bytes, mínimo 64 chars recomendado

---

## Tipos de tokens

El sistema emite tres tipos de JWT, cada uno con propósito único:

### 1. Access Token (autenticación completa)

```
Duración:   15 minutos (900,000 ms)
Clave:      JWT_SECRET
Claim identidad: ninguno especial (token "estándar")

Claims:
  sub:           email del usuario
  userId:        Long
  rol:           String (e.g. "ADMIN_IT", "EMPRENDEDOR")
  empresaId:     Long (opcional — para usuarios en contexto de empresa)
  empresaSlug:   String (opcional)
  iat:           epoch segundos de emisión
  exp:           iat + 900

Uso:
  Authorization: Bearer <access_token>
```

### 2. TempToken 2FA (propósito único — segundo factor pendiente)

```
Duración:   5 minutos (300,000 ms)
Claim especial: "2fa_pending": true

Claims:
  sub:           email del usuario
  userId:        Long
  2fa_pending:   true
  iat, exp

Uso PERMITIDO:
  POST /api/auth/2fa/verify        ← valida el TempToken internamente
  POST /api/auth/2fa/email/send    ← extrae userId para enviar OTP

Uso BLOQUEADO:
  Cualquier endpoint autenticado → JwtRequestFilter lo rechaza
```

### 3. EmpresaSelectionToken (propósito único — selección de negocio)

```
Duración:   10 minutos (600,000 ms)
Claim especial: "empresa_selection": true

Claims:
  sub:               email del usuario
  userId:            Long
  empresa_selection: true
  iat, exp

Uso PERMITIDO:
  POST /api/auth/seleccionar-empresa  ← valida el token y emite AccessToken con empresaId

Uso BLOQUEADO:
  Cualquier endpoint autenticado → JwtRequestFilter lo rechaza
```

---

## Validación de tokens

### JwtRequestFilter — flujo de validación

```java
// Para cada request con Authorization: Bearer <token>:
//
// 1. Extraer username de JWT
//    - Si el token está expirado → ExpiredJwtException
//      → logTokenExpired(ip, ua, path)
//      → Continuar (endpoints públicos siguen funcionando con token expirado)
//    - Si el token es inválido → JwtException
//      → logTokenRejected(ip, ua, path, reason)
//      → detectionService.recordInvalidJwt(ip)
//
// 2. Si username != null y no hay autenticación activa:
//    - Si es TempToken o EmpresaSelectionToken → NO autenticar → continuar
//    - Cargar UserDetails del usuario
//    - jwtUtil.validateToken(token, username):
//        - Verifica firma HMAC
//        - Verifica username == sub
//        - Verifica !isExpired()
//    - Si válido → setear SecurityContext con authorities del UserDetails
```

### Rechazo de tokens single-purpose

```java
// JwtRequestFilter.java — protección crítica
if (jwtUtil.isTempToken(jwt) || jwtUtil.isEmpresaSelectionToken(jwt)) {
    chain.doFilter(request, response);
    return;    // ← NO autenticar con token de propósito único
}
```

Esto previene que un atacante que obtenga un TempToken (p.ej. durante 2FA) lo use para acceder a endpoints protegidos. El test `tempToken_doesNotAuthenticateProtectedEndpoints()` verifica esto.

---

## Refresh tokens

Los refresh tokens **NO son JWT**. Son UUIDs v4 almacenados en base de datos:

```
Tabla: hot_click_refresh_token_tb
  token:      UUID (128-bit, aleatorio)
  fk_usuario: Long
  expires_at: timestamp (now + 30 días)
  revoked_at: timestamp | null

Ciclo de vida:
  1. Creación: RefreshTokenService.crear(usuario)
     - Genera UUID.randomUUID().toString()
     - Revoca todos los tokens previos del usuario (revokedAt = now)
     - Persiste nuevo token
  
  2. Uso: POST /api/auth/refresh { "refreshToken": "<UUID>" }
     - RefreshTokenService.validar(tokenStr)
     - Busca en DB, verifica expiresAt > now, verifica revokedAt == null
     - Si válido → emite nuevo AccessToken
  
  3. Revocación: POST /api/auth/logout
     - RefreshTokenService.revocar(tokenStr) → revokedAt = now
  
  4. Limpieza: @Scheduled (3 AM diario)
     - Elimina tokens con expiresAt < now
```

---

## Rotación y revocación

**Rotación automática:** Al crear un nuevo refresh token, todos los anteriores del mismo usuario quedan revocados. Esto implementa **refresh token rotation** implícita: si se detecta reuso de un token revocado, el sistema lo rechaza.

**Revocación por cambio de contraseña:** `changePassword()` llama a `refreshTokenService.revocar(tokenStr)` del token que se envió en el body, forzando re-login.

**Revocación de access tokens:** No implementada (stateless). Los access tokens expiran en 15 minutos. Para revocación inmediata ver [future-improvements.md](./future-improvements.md#alta-prioridad).

---

## Extracción de claims tipada

```java
// JwtUtil — métodos de extracción seguros
// Todos manejan coerción de tipos (Integer vs Long en JSON claims):

Long userId   = jwtUtil.extractUserId(token);
// → Handles: claims.get("userId") puede ser Integer o Long (Jackson)
// → Convierte: ((Number) claim).longValue()

Long empresaId = jwtUtil.extractEmpresaId(token);
// → Mismo manejo de coerción

String slug    = jwtUtil.extractEmpresaSlug(token);
String username = jwtUtil.extractUsername(token);  // = sub claim
Date expiration = jwtUtil.extractExpiration(token);
```

---

## Fortaleza de la clave JWT

**Algoritmo HS256 requiere:** Clave ≥ 256 bits (32 bytes)  
**Recomendación del sistema:** ≥ 64 caracteres (≥ 512 bits para margen)

El `ProductionConfigValidator` verifica en startup:
```java
if (jwtSecret.length() < 64) {
    // En producción: log CRITICAL
    // En desarrollo: log WARNING
}
```

**Generación de clave segura:**
```bash
openssl rand -base64 64
# o
openssl rand -hex 48
```

---

## Ataques cubiertos

| Ataque | Cómo se previene |
|---|---|
| **Token forjado** | Firma HMAC verifica integridad. Sin JWT_SECRET, imposible forjar |
| **Role escalation** | Rol en JWT válido solo si firma verifica. @PreAuthorize valida en servidor |
| **Token replay** | TOTP: replay protection 90s. Refresh token: revocación en uso |
| **Token de propósito cruzado** | TempToken/EmpresaSelectionToken bloqueados en JwtRequestFilter |
| **JWT escaneo** | recordInvalidJwt() → alerta MEDIUM tras 15 tokens inválidos/5min |
| **Algoritmo "none"** | JJWT 0.11.5 rechaza algoritmo none por defecto |
| **JWK confusion** | Solo HS256 implementado, sin soporte RS256 → sin confusión de algoritmo |

---

## Prueba de tokens en tests

```java
// BaseIntegrationTest.java — generación de tokens para tests
userToken  = "Bearer " + jwtUtil.generateToken(
    testUser.getCorreo(), testUser.getId(), Constants.ROL_USUARIO_FINAL);
adminToken = "Bearer " + jwtUtil.generateToken(
    adminUser.getCorreo(), adminUser.getId(), Constants.ROL_ADMIN_IT);
```

Los tests de seguridad cubren:
- Token con firma alterada → 401
- Token firmado con clave diferente → 401
- Payload de ADMIN_IT con firma falsa → 401
- Token basura → 401 (no 500)
- TempToken en endpoint protegido → 401
- EmpresaSelectionToken en endpoint protegido → 401
