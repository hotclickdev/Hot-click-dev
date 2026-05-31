# Security Center

## Descripción

El Security Center es el panel de operaciones de seguridad integrado en la plataforma. Permite a los operadores ADMIN_IT visualizar eventos de seguridad, gestionar alertas y monitorear la postura de seguridad del sistema en tiempo real.

**Acceso:** Solo `ADMIN_IT`  
**Ruta frontend:** `/admin/security`  
**API backend:** `/api/security/**`

---

## Componentes

### Backend

**Archivo:** `controller/SecurityController.java`

```java
@RestController
@RequestMapping("/api/security")
@PreAuthorize("hasRole('ADMIN_IT')")
public class SecurityController {
    // Doble protección:
    // 1. SecurityConfig: .requestMatchers("/api/security/**").hasRole("ADMIN_IT")
    // 2. @PreAuthorize en el controller
}
```

### Frontend

**Archivo:** `frontend/src/pages/admin/AdminSecurityCenter.jsx`  
**Servicio:** `frontend/src/services/securityService.js`  
**Menú:** "Security Center" en sidebar ADMIN_IT (sección "Sistema")

---

## API del Security Center

### GET /api/security/dashboard

Retorna el dashboard principal con KPIs y eventos recientes.

**Query params:**
- `period`: `1h` | `24h` | `7d` | `30d` | `90d` (default: `24h`)

**Respuesta:**
```json
{
  "summary": {
    "totalEvents":     142,
    "criticalEvents":  0,
    "highEvents":      3,
    "failedLogins":    18,
    "rateLimitEvents": 7,
    "tokenRejections": 2,
    "activeAlerts":    2,
    "criticalAlerts":  0,
    "highAlerts":      2,
    "period":          "24h"
  },
  "twoFactorAdoption": {
    "total":           45,
    "enabled":         12,
    "adoptionPercent": 26.7
  },
  "eventsByType": {
    "LOGIN_SUCCESS":         89,
    "LOGIN_FAILED":          18,
    "RATE_LIMIT_TRIGGERED":   7
  },
  "eventsBySeverity": {
    "LOW":    112,
    "MEDIUM":  27,
    "HIGH":     3
  },
  "failedLoginsByIp": {
    "203.0.113.5": 12,
    "198.51.100.1": 6
  },
  "recentEvents":  [...],    // últimos 50 eventos
  "activeAlerts":  [...]     // top 10 alertas sin resolver
}
```

### GET /api/security/events

Paginación de eventos de seguridad con filtros.

**Query params:**
- `page`: número de página (default: 0)
- `size`: eventos por página (default: 20, máx: 100)
- `type`: filtro por tipo de evento (ej: `LOGIN_FAILED`)
- `severity`: filtro por severidad (`LOW` | `MEDIUM` | `HIGH` | `CRITICAL`)
- `period`: `7d` | `30d` | etc. (default: `7d`)

**Respuesta:**
```json
{
  "content":       [...],
  "totalElements": 312,
  "totalPages":    16,
  "page":          0,
  "size":          20
}
```

Cada elemento de `content` es un `SecurityAuditLog`:
```json
{
  "id":         123,
  "timestamp":  "2026-05-30T14:23:01",
  "eventType":  "LOGIN_FAILED",
  "severity":   "MEDIUM",
  "userId":     null,
  "email":      "victim@test.com",
  "ipAddress":  "203.0.113.5",
  "userAgent":  "Mozilla/5.0...",
  "endpoint":   "/api/auth/login",
  "metadata":   "{\"reason\":\"wrong_password\"}"
}
```

### GET /api/security/alerts

Lista de alertas (activas o resueltas).

**Query params:**
- `resolved`: `true` | `false` (default: `false`)

**Respuesta:** Lista de `SecurityAlert`:
```json
[
  {
    "id":         42,
    "alertType":  "BRUTE_FORCE",
    "severity":   "HIGH",
    "userId":     null,
    "ipAddress":  "203.0.113.5",
    "message":    "Brute force detectado desde IP 203.0.113.5",
    "details":    "7 intentos fallidos en 10 min desde 203.0.113.5",
    "resolved":   false,
    "createdAt":  "2026-05-30T14:20:00",
    "resolvedAt": null
  }
]
```

### PUT /api/security/alerts/{id}/resolve

Marca una alerta como resuelta.

**Respuesta:**
```json
{ "success": true, "message": "Alerta resuelta" }
```

---

## UI — Pestañas y funcionalidades

### Pestaña Dashboard

**KPI cards (fila superior):**
- Eventos totales en el período
- Logins fallidos (con acento naranja si > 0)
- Tokens rechazados
- Rate limit triggers
- Alertas activas (rojo si > 0)

**Widget de adopción 2FA:**
- Porcentaje con barra de progreso
- Cantidad habilitados / total usuarios activos

**Widget de severidad:**
- Conteo por cada nivel: CRITICAL, HIGH, MEDIUM, LOW

**Widget de top eventos:**
- Top 6 tipos de eventos más frecuentes

**Banner de alertas activas (si existen):**
- Cada alerta con severidad, tipo, IP, mensaje, tiempo
- Botón "Resolver" por alerta

**Feed de eventos recientes:**
- Últimos 50 eventos en tabla con: tiempo relativo, severidad, tipo, IP, email, endpoint
- Scroll horizontal para tablas anchas

### Pestaña Eventos

**Filtros:**
- Selector de tipo de evento (dropdown con labels en español)
- Selector de severidad
- Botón "Filtrar"

**Tabla paginada:**
- Columnas: Timestamp, Tipo, Severidad, IP, Email, Endpoint
- Paginación: Anterior / Siguiente
- Contador: "312 eventos · pág 1 de 16"

### Pestaña Alertas

**Toggle:**
- "Activas" / "Resueltas"

**Lista de alertas:**
- Severidad badge coloreado (CRITICAL=rojo, HIGH=naranja, MEDIUM=amarillo, LOW=verde)
- Tipo de alerta en mono
- Mensaje legible
- Detalles (count, ventana)
- IP y userId si aplican
- Tiempo relativo de creación
- Botón "Resolver" para activas
- Timestamp de resolución para resueltas

---

## Filtro de período

El dashboard permite filtrar por períodos:
- **1h** — última hora (para incidentes activos)
- **24h** — últimas 24 horas (default)
- **7 días** — semana
- **30 días** — mes

Los botones de período están en la parte superior derecha del dashboard.

---

## Etiquetas de eventos en español

El frontend mantiene un diccionario de labels:
```javascript
const EVENT_LABEL = {
  LOGIN_SUCCESS:               'Login exitoso',
  LOGIN_FAILED:                'Login fallido',
  LOGIN_BLOCKED:               'Login bloqueado',
  TWO_FA_FAILED:               '2FA fallido',
  TOKEN_REJECTED:              'Token rechazado',
  RATE_LIMIT_TRIGGERED:        'Rate limit',
  BRUTE_FORCE_DETECTED:        'Brute force',
  CREDENTIAL_STUFFING_DETECTED:'Credential stuffing',
  // ...
}
```

---

## Acceso y restricciones

El Security Center está restringido a `ADMIN_IT` en tres niveles:
1. **Ruta SPA:** `AdminRoute itOnly` en `App.jsx`
2. **SecurityConfig:** `.requestMatchers("/api/security/**").hasRole("ADMIN_IT")`
3. **Controller:** `@PreAuthorize("hasRole('ADMIN_IT')")`

No hay forma de acceder a los datos del Security Center sin tener el rol `ADMIN_IT` en el JWT, verificado por el servidor en cada request.

---

## Operación normal del Security Center

**Revisión diaria recomendada (5-10 minutos):**
1. Abrir `/admin/security`
2. Revisar KPIs del día (24h)
3. Verificar alertas activas — resolver las investigadas
4. Revisar top IPs con logins fallidos
5. Verificar adopción 2FA — contactar usuarios sin 2FA

**Ante spike de alertas:**
1. Cambiar período a "1h"
2. Ver feed de eventos recientes
3. Filtrar por `LOGIN_FAILED` o `TOKEN_REJECTED`
4. Identificar IPs atacantes
5. Seguir runbook en [incident-response.md](./incident-response.md)
