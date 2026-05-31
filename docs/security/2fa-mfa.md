# Autenticación Multi-Factor (2FA / MFA)

## Métodos soportados

El sistema soporta tres métodos de segundo factor, todos opcionales pero altamente recomendados:

| Método | Tipo | Almacenamiento secreto | Resistencia replay |
|---|---|---|---|
| **TOTP** | Time-based OTP (Google Authenticator) | AES-256-GCM en DB | 90 segundos |
| **Email OTP** | Código 6 dígitos por email | BCrypt hash en DB | Expiración + uso único |
| **Recovery codes** | Códigos de emergencia (8 un) | BCrypt hash en DB | Un uso por código |

---

## TOTP — Time-based One-Time Password

### Estándar implementado

- **RFC 6238** (TOTP) sobre **RFC 4226** (HOTP)
- Algoritmo: HMAC-SHA1
- Dígitos: 6
- Período de tiempo: 30 segundos
- Tolerancia de reloj: ±1 período (±30 segundos → ventana total 90 segundos)
- Compatible con: Google Authenticator, Authy, 1Password, Bitwarden, etc.

### Secreto TOTP

```
Generación:
  - 32 bytes aleatorios via DefaultSecretGenerator (dev.samstevens.totp)
  - Codificados en Base32 para el QR code

Almacenamiento:
  - Cifrado con AES-256-GCM antes de persistir en hot_click_usuario_tb.two_factor_secret
  - Formato en DB: ENC:<base64(IV + ciphertext + auth_tag)>
    - IV: 12 bytes (96-bit, recomendado para GCM)
    - Auth tag: 128 bits (verificación de integridad)
  - Clave de cifrado: variable de entorno TOTP_ENCRYPTION_KEY (64 hex chars = 32 bytes)
  - Retrocompatibilidad: si el valor en DB no empieza con "ENC:", se trata como texto plano

QR URI para apps authenticator:
  otpauth://totp/HOTCLICK:user@email.com?secret=BASE32SECRET&issuer=HOTCLICK&algorithm=SHA1&digits=6&period=30
```

**Archivo:** `service/TotpSecretEncryptionService.java`

### Protección anti-replay

TOTP con tolerancia ±1 período tiene una ventana de 90 segundos donde el mismo código es válido. Sin protección adicional, un atacante que intercepta el código tiene esos 90 segundos para reutilizarlo.

```java
// TwoFactorService.verifyCodeWithReplayProtection(Usuario usuario, String code)

// 1. Verifica el código contra el período actual y adyacentes (DefaultCodeVerifier)
// 2. Si es válido, compara con usuario.totpLastUsedOtp:
//    - Si es el mismo código Y totpLastUsedAt está dentro de los últimos 90 segundos → REPLAY → rechazar
// 3. Si pasa, persiste código y timestamp usados:
//    usuarioRepository.updateTotpReplayProtection(userId, code, now)
```

Constante: `Constants.TOTP_REPLAY_WINDOW_SECONDS = 90L`

### Flujo de setup TOTP

```
1. POST /api/auth/2fa/setup
   ← Respuesta: { secret (Base32), qrUri (otpauth://...) }
   Estado: two_factor_enabled = false (pendiente verificación)

2. Usuario escanea QR con su app

3. POST /api/auth/2fa/enable
   Body: { code: "123456" }
   ← Verifica que el código es correcto
   ← Genera 8 recovery codes (SecureRandom, XXXXX-XXXXX format)
   ← BCrypt hash de cada recovery code, persiste JSON array
   ← two_factor_enabled = true, two_factor_methods = "TOTP"
   ← Respuesta: { recoveryCodes: ["XXXXX-XXXXX", ...] }
   IMPORTANTE: Los códigos de recuperación se muestran UNA SOLA VEZ
```

---

## Email OTP

### Generación y almacenamiento

```java
// OtpService.generarYEnviarOtp(...)
// 1. SecureRandom.nextInt(1_000_000) → String.format("%06d", n)
// 2. PasswordEncoder.encode(codigoPlano)  ← BCrypt hash
// 3. Guardar en hot_click_codigo_otp_tb con:
//    - tipo: "2FA_LOGIN"
//    - expiresAt: now + 5 minutos
//    - intentos: 0
//    - activo: true
// 4. Invalidar OTPs anteriores del mismo usuario y tipo
// 5. Enviar email HTML con el código en texto plano
// 6. El código plano NUNCA se almacena ni logea
```

### Límites de tasa (OTP específico)

```
Solicitar nuevo OTP:
  Máximo: 3 solicitudes por ventana de 10 minutos (por usuario, no por IP)
  Mensaje: "Demasiadas solicitudes. Esperá 10 minutos antes de pedir otro código."
  Constantes: OTP_MAX_REENVIOS = 3, OTP_VENTANA_REENVIO_MIN = 10

Verificar OTP:
  Máximo: 5 intentos por código generado
  Al 5to fallo: el código se invalida (activo = false)
  Mensaje progresivo: "Código incorrecto. 2 intento(s) restante(s)."
  Constante: OTP_MAX_INTENTOS = 5
```

**Adicionalmente**, el endpoint `/api/auth/2fa/email/send` tiene rate limit por IP: **3 requests cada 5 minutos** (controlado por `RateLimitingFilter`).

### Email de OTP

El email incluye protecciones anti-phishing:
- Texto explícito: "HOTCLICK nunca te pedirá este código fuera de esta pantalla"
- Recordatorio de expiración (5 minutos)
- Código en texto grande y visible (HTML + texto plano fallback)
- Asunto: "HOTCLICK — Tu código de verificación"

### Prevención de inyección de método

```java
// AuthController.java — /api/auth/2fa/verify
// El cliente envía qué método quiere usar (TOTP o EMAIL_OTP)
// El servidor VERIFICA que el usuario tiene ese método habilitado:

if (Constants.METODO_2FA_EMAIL_OTP.equals(method)) {
    if (!usuario.hasEmailOtpEnabled() && Boolean.TRUE.equals(usuario.getTwoFactorEnabled())) {
        // Retrocompat: si methods=null, no se permite EMAIL_OTP
        return ResponseEntity.status(400).body(ResponseDTO.error("Método EMAIL_OTP no habilitado"));
    }
    // ...
}
// Previene que un atacante elija un método más débil que no tiene configurado
```

---

## Recovery codes

### Generación

```java
// TwoFactorService.generateRecoveryCodes() → List<String>
// 8 códigos por habilitación de 2FA
// Formato: XXXXX-XXXXX (10 caracteres alfanuméricos + separador)
// Caracteres: A-Z + 0-9
// Randomness: SecureRandom (CSRNG)
// Normalización antes de verificar: trim + toUpperCase + remove '-'
```

### Almacenamiento y verificación

```java
// Almacenamiento en DB (hot_click_usuario_tb.recovery_codes):
// JSON array de BCrypt hashes: ["$2a$10$...", "$2a$10$...", ...]
// codesToJson(List<String> hashes) → "[\"$2a$...\",...]"

// Verificación durante login:
// 1. Deserializar JSON → List<String> hashes
// 2. BCryptPasswordEncoder.matches(normalizedCode, hash) para cada elemento
// 3. Si coincide: eliminar ese elemento de la lista → persistir lista reducida
// 4. Log: cuántos quedan

// El código usado se elimina permanentemente → no reutilizable
```

### Conteo y alerta

Cuando quedan pocos recovery codes, es responsabilidad del frontend notificar al usuario (actualmente no implementado automáticamente — ver [future-improvements.md](./future-improvements.md)).

---

## Multi-método 2FA

El sistema soporta que un usuario tenga **ambos** métodos habilitados simultáneamente (TOTP + EMAIL_OTP). En ese caso, al hacer login el frontend muestra un selector de método.

```java
// hot_click_usuario_tb.two_factor_methods
// Valores: "TOTP" | "EMAIL_OTP" | "TOTP,EMAIL_OTP" (lista separada por coma)

// Usuario.getActiveMethods() → List<String>
// Retrocompatibilidad:
//   - Si two_factor_methods == null y two_factor_enabled == true → asumir TOTP
//   - Si one method → no mostrar picker, indicar directamente
//   - Si multiple methods → mostrar picker al usuario
```

---

## Flujo de verificación 2FA (diagrama detallado)

```
POST /api/auth/2fa/verify
  ├── Validar TempToken (2fa_pending=true, no expirado)
  ├── Cargar usuario desde JWT subject
  ├── Verificar cuenta no bloqueada
  │
  ├── [recoveryCode presente]
  │     ├── normalizar (trim + upper + quitar '-')
  │     ├── buscar coincidencia BCrypt en lista almacenada
  │     ├── si no coincide → incrementarIntentos + log2FAFailed → 401
  │     └── si coincide → eliminar código + log2FASuccess → AccessToken + RefreshToken
  │
  ├── [method = EMAIL_OTP]
  │     ├── verificar que usuario.hasEmailOtpEnabled()
  │     ├── otpService.verificarOtp(usuario, "2FA_LOGIN", code)
  │     │     ├── buscar OTP activo y no expirado
  │     │     ├── incrementar intentos
  │     │     ├── BCrypt.matches(code, hash)
  │     │     └── si supera 5 intentos → invalidar OTP
  │     ├── si fallo → incrementarIntentos + log2FAFailed → 401
  │     └── si OK → marcarUsado + log2FASuccess → AccessToken + RefreshToken
  │
  └── [method = TOTP (default)]
        ├── TwoFactorService.verifyCodeWithReplayProtection(usuario, code)
        │     ├── descifrar secreto AES-256-GCM
        │     ├── DefaultCodeVerifier.isValidNow(secret, code, ±1 período)
        │     └── verificar no es replay (totpLastUsedOtp, últimos 90s)
        ├── si fallo → incrementarIntentos + log2FAFailed → 401
        └── si OK → persistir replay state + log2FASuccess → AccessToken + RefreshToken
```

---

## Adopción de 2FA

El Security Center muestra el porcentaje de usuarios activos con 2FA habilitado:

```sql
-- hot_click_usuario_tb
SELECT COUNT(*) FILTER (WHERE two_factor_enabled = true AND estado = 1) AS con_2fa,
       COUNT(*) FILTER (WHERE estado = 1) AS total_activos
FROM hot_click_usuario_tb;
```

Este dato está disponible en `/api/security/dashboard` y en `AdminSecurityCenter.jsx` en el widget "Adopción 2FA".

---

## Consideraciones de seguridad residuales

| Consideración | Estado | Mitigación |
|---|---|---|
| TOTP con HS1 (considerado débil) | Aceptado | Es el estándar del ecosistema de autenticadores. HS256 no está soportado en Google Authenticator |
| Email como canal 2FA (phishing-prone) | Aceptado | Mensajes anti-phishing, OTP de 5 min. TOTP es el método preferido |
| Recovery codes en texto plano al generarlos | Necesario | Solo se muestran una vez. El usuario es responsable de guardarlos |
| Sin verificación de fuerza del secreto TOTP | Aceptado | El proveedor (dev.samstevens.totp) genera 32 bytes aleatorios siempre |
