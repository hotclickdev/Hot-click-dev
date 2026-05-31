# Incident Response — Runbooks

## Niveles de incidente

| Nivel | Descripción | Tiempo de respuesta | Escalación |
|---|---|---|---|
| **P1 — Critical** | Compromiso de cuenta admin, exfiltración de datos, sistema inaccesible | Inmediato | Fundador + equipo técnico |
| **P2 — High** | Brute force activo, credential stuffing, fallo de pagos | < 1 hora | Equipo técnico |
| **P3 — Medium** | Picos de OTP abuse, JWT scanning, alertas repetidas | < 4 horas | Developer de guardia |
| **P4 — Low** | Alertas aisladas, rate limit esporádico | Próximo día hábil | Revisión en Security Center |

---

## Runbook 1 — Brute Force / Credential Stuffing

### Síntomas
- Alerta `BRUTE_FORCE` o `CREDENTIAL_STUFFING` en Security Center
- Múltiples eventos `LOGIN_FAILED` desde la misma IP
- Cuentas de usuarios bloqueadas inesperadamente

### Diagnóstico

1. Abrir Security Center → `/admin/security`
2. Cambiar período a "1h"
3. Revisar "Top IPs con logins fallidos"
4. En pestaña "Eventos": filtrar por `LOGIN_FAILED`, revisar IP atacante
5. En pestaña "Alertas": ver mensaje con conteo exacto

### Acciones inmediatas

```
Si el ataque es activo (IP reconocible y continúa):
  1. Si hay WAF/proxy: bloquear IP a nivel de infraestructura
     (Render no tiene WAF integrado en free tier)
  
  2. Si el rate limiter está dejando pasar: la cuenta del usuario
     se bloqueará automáticamente en el 5to intento en esa cuenta
  
  3. Notificar a usuarios afectados (si hay cuentas bloqueadas legítimamente)
     → Pedir que usen "Olvidé mi contraseña"
  
  4. Resolver alerta en Security Center una vez investigada
```

### Mitigación posterior

```
  5. Revisar si las cuentas atacadas tienen 2FA habilitado
     → Si no → contactar a los usuarios para activarlo
  
  6. Si el ataque fue exitoso (algún login exitoso seguido de fallo de 2FA):
     → Ver runbook 5: Compromiso de cuenta
```

---

## Runbook 2 — Password Spray

### Síntomas
- Alerta `PASSWORD_SPRAY` en Security Center
- Logins fallidos a múltiples cuentas distintas desde la misma IP

### Diagnóstico

1. Security Center → "Eventos" → filtrar `LOGIN_FAILED` por período 1h
2. Agrupar por IP (visible en columna IP)
3. Contar cuentas únicas atacadas

### Acciones

```
  1. Identificar qué cuentas fueron intentadas (ver columna email en eventos)
  
  2. Verificar si algún intento tuvo éxito:
     Filtrar LOGIN_SUCCESS de la misma IP en el mismo período
  
  3. Si hubo logins exitosos sin 2FA → ver runbook 5
  
  4. Notificar a los usuarios de las cuentas atacadas
  
  5. Si el patrón continúa: considerar regla de firewall temporal
```

---

## Runbook 3 — OTP Abuse / Email Flooding

### Síntomas
- Alerta `OTP_FLOOD` en Security Center
- Usuarios reportan recibir muchos emails de OTP que no solicitaron
- Proveedor de email (SendGrid) reporta anomalías de envío

### Diagnóstico

1. Security Center → Alertas → buscar `OTP_FLOOD`
2. Identificar userId afectado
3. Security Center → Eventos → filtrar `OTP_SENT` para ese userId

### Acciones

```
  1. Si es un usuario real siendo acosado:
     → El rate limiter de OTP (3/10min) debería estar limitando
     → Verificar que el límite de RateLimitingFilter aplica
       (endpoint /api/auth/2fa/email/send: 3 req / 300s)
  
  2. Si es un atacante tratando de saturar el email de una víctima:
     → Los OTPs tienen 5 minutos de expiración
     → El usuario puede ignorar los emails y esperar que pare
  
  3. Si SendGrid envía alerta de reputación:
     → Revisar volumen en SendGrid Dashboard
     → Temporalmente bloquear el userId en DB si es necesario
```

---

## Runbook 4 — JWT Scanning / Token Tampering

### Síntomas
- Alerta `JWT_SCANNING_DETECTED` en Security Center
- Muchos eventos `TOKEN_REJECTED` desde la misma IP
- IP enviando JWTs malformados o con firmas inválidas

### Diagnóstico

1. Security Center → Eventos → filtrar `TOKEN_REJECTED`
2. Ordenar por IP
3. Verificar metadata del evento → campo `reason` (SignatureException, MalformedJwtException)

### Acciones

```
  1. JWT scanning sin éxito:
     → El atacante no puede forjar tokens válidos sin JWT_SECRET
     → El sistema detecta y alerta automáticamente
     → Resolver alerta y continuar monitoreando
  
  2. Si los TOKEN_REJECTED van seguidos de LOGIN_SUCCESS desde la misma IP:
     → El atacante podría estar haciendo reconocimiento después de tener credenciales
     → Ver runbook 5: Compromiso de cuenta
  
  3. Si el volumen es muy alto y afecta performance:
     → El RateLimitingFilter debería mitigar (las requests rechazan sin tocar DB)
     → Si persiste: considerar WAF a nivel de infraestructura
```

---

## Runbook 5 — Compromiso de cuenta (Account Takeover)

### Síntomas
- Login exitoso desde IP o ubicación inusual
- Usuario reporta acceso no autorizado
- Cambios en configuración de cuenta que el usuario no realizó

### Diagnóstico

```
1. Buscar en Security Center → Eventos → filtrar LOGIN_SUCCESS del userId afectado
2. Revisar IPs de los logins recientes — ¿hay IP inusual?
3. Verificar si el usuario tiene 2FA:
   → En DB: SELECT two_factor_enabled FROM hot_click_usuario_tb WHERE id_usuario = ?
4. Verificar cambios de configuración en audit log
```

### Acciones inmediatas

```sql
-- 1. Bloquear cuenta inmediatamente
UPDATE hot_click_usuario_tb
SET bloqueado_hasta = NOW() + INTERVAL '30 days',
    estado = 3  -- SUSPENDIDO
WHERE id_usuario = <userId>;

-- 2. Revocar todos los refresh tokens del usuario
UPDATE hot_click_refresh_token_tb
SET revoked_at = NOW()
WHERE fk_id_usuario = <userId> AND revoked_at IS NULL;
```

```
3. Notificar al usuario por email (canal fuera de banda)
4. Revisar qué acciones realizó el atacante:
   → Pedidos creados, datos cambiados, productos modificados
5. Revertir cambios si es posible
6. Pedir al usuario que cambie contraseña
7. Activar 2FA obligatorio para el usuario
8. Considerar alertar a otros usuarios si hubo exfiltración de datos
```

---

## Runbook 6 — Compromiso del JWT_SECRET

### Síntomas
- Accesos con JWTs válidos pero no emitidos por el sistema
- Logins sin registro en audit log
- JWT_SECRET expuesto en logs, código o repositorio

### Acciones (URGENTE)

```
1. Generar nuevo JWT_SECRET:
   openssl rand -base64 64

2. Actualizar en Render → Environment → JWT_SECRET

3. Redeploy INMEDIATO (invalida todos los tokens existentes)
   → Todos los usuarios deberán re-loguearse (access tokens inválidos en <15min)
   → Los refresh tokens en DB siguen siendo válidos pero necesitan
     nuevo JWT_SECRET para emitir access tokens → re-login requerido

4. Revisar cómo se filtró el secret:
   → ¿Estaba en logs? → Revisar configuración de logging
   → ¿En código? → Buscar en git history: git log -S "JWT_SECRET"
   → ¿En repositorio? → Verificar .gitignore y environment variables

5. Auditar accesos con el secret comprometido:
   → Revisar Security Center por logins exitosos anómalos
   → Identificar qué recursos fueron accedidos

6. Notificar a usuarios si hubo compromiso de datos
```

---

## Runbook 7 — Fallo de sistema de pagos

### Síntomas
- Webhooks de PayPal fallando (4xx/5xx en logs)
- Pedidos en estado `PAGADO` sin correspondencia en PayPal
- `PAYPAL_WEBHOOK_ID` incorrecto o expirado

### Diagnóstico

```
1. Revisar logs de Render → buscar errores en /api/webhooks/paypal
2. Verificar PAYPAL_WEBHOOK_ID en Render Environment
3. Verificar estado del webhook en PayPal Developer Dashboard
4. Verificar PAYPAL_SSL_SKIP_VERIFY = false en producción
```

### Acciones

```
1. Si el webhook no verifica firmas:
   → Los pagos legítimos de PayPal no actualizarán estados en DB
   → Temporalmente: procesar actualizaciones de estado manualmente
   → Actualizar PAYPAL_WEBHOOK_ID en Render y redeploy

2. Si hay pedidos pagados doble:
   → Revisar idempotency keys de PayPal en PaymentLog tabla
   → No procesar el mismo webhook_id dos veces
```

---

## Runbook 8 — Spike de alertas inesperado

### Síntomas
- Security Center muestra decenas de alertas en minutos
- El sistema parece bajo ataque coordinado

### Evaluación rápida

```
1. ¿Las alertas son de una sola IP o múltiples?
   → Una sola IP → Posible bot · Ver runbooks 1-4
   → Múltiples IPs → Posible ataque distribuido (botnet)

2. ¿El tráfico está superando el rate limiter?
   → Ver eventos RATE_LIMIT_TRIGGERED en Security Center
   → Si sí → el rate limiter está funcionando

3. ¿Hay degradación de servicio?
   → Verificar /api/health
   → Verificar tiempos de respuesta en Render
```

### Si es botnet distribuido

```
Sin WAF disponible (Render free/starter):
  → El rate limiter por IP funciona — cada IP tiene su propio contador
  → La base de datos de Supabase puede saturarse con muchas conexiones
  → Opción: reducir pool de Supabase temporalmente durante el ataque

Con WAF (si se implementa a futuro):
  → Aplicar rate limit a nivel de infraestructura por User-Agent o ASN
```

---

## Contactos de escalación

| Situación | Contacto |
|---|---|
| Cualquier incidente P1 | Fundador HOTCLICK directamente |
| Incidente de pagos | Canal de soporte PayPal + Render support |
| Incidente de DB/Storage | Supabase support (pro tier) |
| Brecha de datos de CR | Cumplimiento con PRODHAB (Ley 8968) si aplica |

---

## Post-mortem template

Completar dentro de 48h de resolver un incidente P1/P2:

```markdown
## Post-mortem — [Fecha] — [Tipo de incidente]

### Resumen
[1-2 oraciones]

### Timeline
- HH:MM — Se detectó X
- HH:MM — Se tomó acción Y
- HH:MM — Resuelto

### Causa raíz
[Causa técnica específica]

### Impacto
- Usuarios afectados: N
- Datos expuestos: Sí/No — descripción
- Tiempo de impacto: X minutos/horas

### Acciones tomadas
[Lista de acciones]

### Acciones preventivas
[Para que no vuelva a ocurrir]

### Lecciones aprendidas
[Para el equipo]
```
