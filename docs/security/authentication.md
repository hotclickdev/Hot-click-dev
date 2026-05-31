# Autenticación — Login, JWT, TempToken, Account Locking

## Responsabilidades del módulo

El subsistema de autenticación maneja:
- Validación de credenciales (email + contraseña BCrypt)
- Protección contra brute force y enumeración de usuarios
- Emisión de tokens JWT tipados (acceso, temp 2FA, selección empresa)
- Flujo multi-etapa: contraseña → 2FA → selección de negocio
- Bloqueo temporal de cuentas
- Refresh de tokens
- Logout con revocación

---

## Archivos principales

| Archivo | Responsabilidad |
|---|---|
| `controller/AuthController.java` | Endpoints de auth |
| `security/JwtUtil.java` | Generación y validación de tokens |
| `security/JwtRequestFilter.java` | Interceptor de cada request autenticado |
| `service/UsuarioService.java` | `incrementarIntentosFallidos()`, `bloquear()` |
| `service/RefreshTokenService.java` | Ciclo de vida del refresh token |
| `service/PasswordResetService.java` | Recuperación de contraseña vía OTP |

---

## Endpoint de login

```
POST /api/auth/login
Content-Type: application/json
Rate limit: 10 requests / 60 segundos por IP

Body:
{
  "correo": "user@example.com",
  "contrasena": "..."
}
```

### Lógica de validación (en orden)

1. **Búsqueda de usuario** por correo (case-sensitive en DB)  
   → Si no existe: `401 Credenciales inválidas` (mismo mensaje que contraseña incorrecta — anti-enumeración)  
   → Log: `LOGIN_FAILED / MEDIUM` con reason=`user_not_found`  
   → Detection: `recordFailedLogin(ip, email)`

2. **Bloqueo activo** — `bloqueadoHasta != null && now < bloqueadoHasta`  
   → `403 Cuenta temporalmente bloqueada`  
   → Log: `LOGIN_BLOCKED / HIGH`

3. **Validación de contraseña** con `BCryptPasswordEncoder.matches()`  
   → Si falla: incrementar `intentosFallidos`, verificar si alcanza umbral de bloqueo  
   → Log: `LOGIN_FAILED / MEDIUM` con reason=`wrong_password`  
   → Detection: `recordFailedLogin(ip, email)`

4. **Estado de cuenta**  
   → `PENDIENTE (0)`: 403 — Verificar correo primero  
   → `INACTIVO (2) / SUSPENDIDO (3)`: 403 — Contactar administrador  
   → `ELIMINADO (4)`: 401 — Respuesta genérica (anti-enumeración)

5. **Reset de contadores** — `resetearIntentosFallidos()`, `actualizarUltimoAcceso()`  
   → Log: `LOGIN_SUCCESS / LOW`

6. **Rama 2FA** — si `twoFactorEnabled = true`  
   → Generar TempToken (5 min)  
   → Retornar lista de métodos habilitados

7. **Rama multi-empresa** — si el usuario tiene ≥ 2 membresías activas  
   → Generar EmpresaSelectionToken (10 min)

8. **Login simple** → generar AccessToken + RefreshToken

---

## Bloqueo de cuenta

```java
// Umbral: 5 intentos fallidos → bloqueo 30 minutos
// Implementado en: UsuarioService.incrementarIntentosFallidos()

// Disparadores:
//   - Contraseña incorrecta en /login
//   - 2FA incorrecto en /2fa/verify
//   - Recovery code incorrecto

// En el bloqueo:
//   - Se envía email de recuperación de contraseña automáticamente
//   - bloqueadoHasta = now() + 30 minutos
//   - El usuario puede usar "Olvidé mi contraseña" para desbloquear

// Reset del bloqueo:
//   - Login exitoso: resetearIntentosFallidos(), bloqueadoHasta = null (implícito)
//   - Reset de contraseña exitoso: también resetea intentos y bloqueadoHasta
```

**Por qué 5 intentos y 30 minutos:** Balance entre UX (errores legítimos de escritura) y seguridad (brute force manual o semiautomático). El rate limiter por IP (10/min) ya frena ataques automáticos antes de llegar a los 5 intentos.

---

## Refresh de tokens

```
POST /api/auth/refresh
Body: { "refreshToken": "<UUID>" }

Sin autenticación JWT requerida — el refresh token es la credencial.
```

**Implementación:**
- Los refresh tokens son UUIDs (128-bit aleatoriedad) almacenados en `hot_click_refresh_token_tb`
- Duración: 30 días desde creación
- **Rotación implícita:** Al crear un nuevo refresh token, todos los anteriores del usuario son revocados (`revocar()` sí → `revokedAt = now()`)
- **Revocación:** Al hacer logout o cambiar contraseña
- **Limpieza:** Scheduled job diario a las 3:00 AM que purga tokens expirados

```java
// RefreshTokenService.validar(String tokenStr)
//   1. Busca en DB por token UUID
//   2. Verifica que expiresAt > now()
//   3. Verifica que revokedAt == null
//   4. Lanza RuntimeException en cualquier fallo → 401
```

---

## Logout

```
POST /api/auth/logout
Authorization: Bearer <accessToken>  (opcional — JWT ya expirado igual funciona)
Body: { "refreshToken": "<UUID>" }
```

El logout revoca el refresh token en DB. El access token JWT no se invalida (sin blocklist) — expira naturalmente en ≤ 15 minutos. Diseño consciente: mantener sistema stateless. Para revocación inmediata de acceso, reducir TTL de access token o implementar blocklist Redis (ver [future-improvements.md](./future-improvements.md)).

---

## Cambio de contraseña

```
POST /api/auth/change-password
Authorization: Bearer <accessToken>
Rate limit: 5 requests / 300 segundos por IP

Body:
{
  "contrasenaActual": "...",
  "nuevaContrasena": "...",   // mín 8 chars, 1 mayúscula, 1 dígito
  "refreshToken": "<UUID>"
}
```

**Seguridad:**
- Verifica contraseña actual antes de cambiar
- Nueva contraseña: `esContrasenaValida()` → ≥8 chars + ≥1 mayúscula + ≥1 dígito
- Revoca el refresh token provisto (fuerza re-login en dispositivos)
- Log: `PASSWORD_CHANGED / LOW`

---

## Recuperación de contraseña (3 pasos)

**Paso 1** — `POST /api/auth/forgot-password` (5/60s rate limit)
- Envía OTP al email si el usuario existe
- Respuesta idéntica si el email no existe (anti-enumeración)
- Log: `PASSWORD_RESET_REQUEST / LOW`

**Paso 2** — `POST /api/auth/verify-code`  
- Valida el OTP de 6 dígitos enviado por email
- Marca el OTP como `consumido`
- Ventana: 10 minutos

**Paso 3** — `POST /api/auth/reset-password`
- Verifica que existe un OTP consumido en los últimos 10 minutos
- Valida política de contraseña
- BCrypt encode + persistir
- Resetea `intentosFallidos` y `bloqueadoHasta`
- Log: `PASSWORD_RESET_SUCCESS / LOW`

---

## Request ID y trazabilidad

`MdcRequestIdFilter` (prioridad máxima) asigna un UUID de 12 caracteres a cada request:

```java
String requestId = UUID.randomUUID().toString().replace("-", "").substring(0, 12);
MDC.put("requestId", requestId);
response.setHeader("X-Request-Id", requestId);
```

Todos los logs del request incluyen `[requestId]` en su formato. Esto permite correlacionar todos los eventos de un mismo request en los logs de Render.

---

## Enumeración de usuarios — protección

Todos los endpoints de auth retornan el **mismo mensaje** para usuario inexistente y contraseña incorrecta:

```json
{ "success": false, "message": "Credenciales inválidas" }
```

La **única diferencia** está en los logs internos (reason: `user_not_found` vs `wrong_password`), nunca expuesta al cliente.

El test `nonExistentEmail_sameResponseAsWrongPassword` en `AuthSecurityHardeningTest.java` verifica este comportamiento automáticamente.

---

## Diagrama completo de estados de autenticación

```
[Visitante]
    │
    ├── Login exitoso, sin 2FA, sin multi-empresa
    │       └── [AUTENTICADO] ─ AccessToken 15min + RefreshToken 30d
    │
    ├── Login exitoso, con 2FA
    │       └── [TEMP_2FA] ─ TempToken 5min
    │               ├── 2FA verificado → [AUTENTICADO]
    │               └── TempToken expirado → volver a [Visitante]
    │
    ├── Login exitoso, sin 2FA, multi-empresa
    │       └── [SELECCION_EMPRESA] ─ EmpresaSelectionToken 10min
    │               ├── Empresa seleccionada → [AUTENTICADO con empresaId]
    │               └── Token expirado → volver a [Visitante]
    │
    └── Login fallido repetido
            └── [BLOQUEADO 30min] → email de recuperación enviado
                    └── Reset de contraseña → [Visitante]

[AUTENTICADO]
    ├── AccessToken expirado (15min)
    │       └── POST /refresh → nuevo AccessToken (si refreshToken válido)
    └── Logout
            └── RefreshToken revocado → [Visitante]
```
