# Security Roadmap — Estratégico

## Estado actual (Mayo 2026)

```
Security Maturity Level: 3 / 5
  ● Fundamentos sólidos implementados
  ● MFA funcional con múltiples métodos
  ● Security Operations Center (básico) operativo
  ● Detección de ataques en tiempo real
  ○ Sin alertas proactivas externas
  ○ Sin distribución de controles (in-memory)
  ○ Sin compliance formal documentado
```

---

## Hitos de seguridad alcanzados

| Fecha | Hito |
|---|---|
| Inicial | JWT auth + BCrypt passwords |
| V6 | 2FA TOTP básico |
| V8 | RBAC multi-rol + multi-tenant |
| V9 | Tenant isolation CompanyScope |
| V16 | Multi-empresa con selección |
| V19 | 2FA multi-método (TOTP + Email OTP) + AES-256-GCM + replay protection |
| Mayo 2026 | Security Operations: audit log (32 eventos), attack detection (5 tipos), Security Center UI |

---

## Fase 1 — Quick Wins (Q2 2026 · 2-4 semanas)

**Objetivo:** Cerrar brechas de alta visibilidad con bajo esfuerzo.

| Acción | Esfuerzo | Impacto |
|---|---|---|
| Deshabilitar Swagger en producción | 30 min | MEDIUM |
| Alertas por email para HIGH/CRITICAL | 4h | HIGH |
| Dependency audit en CI/CD (Dependabot) | 2h | MEDIUM |
| Avisos de seguridad al usuario (cambio de contraseña) | 4h | MEDIUM |
| Documentación de seguridad completa | ✅ Done | INSTITUTIONAL |

**Criterio de completitud:** Todas las alertas CRITICAL generan notificación automática. Swagger no accesible sin autenticación.

---

## Fase 2 — Hardening Operacional (Q3 2026 · 1-2 meses)

**Objetivo:** Pasar de detección en una instancia a detección distribuida y resiliente.

| Acción | Esfuerzo | Impacto |
|---|---|---|
| Redis para SecurityDetectionService | 2 días | HIGH |
| Session inventory (ver/revocar sesiones) | 1 día | MEDIUM |
| Retención automática de audit logs | 2h | LOW |
| Recovery codes — aviso al agotarse | 2h | LOW |
| JWT TTL más corto (5 min) o JWT blocklist | 4h | MEDIUM |

**Criterio de completitud:** SecurityDetectionService funciona correctamente con múltiples instancias. Usuarios pueden ver y gestionar sus sesiones activas.

---

## Fase 3 — Madurez de Seguridad (Q4 2026 · 2-3 meses)

**Objetivo:** Alcanzar Level 4 de madurez con controles proactivos y compliance.

| Acción | Esfuerzo | Impacto |
|---|---|---|
| CSP sin 'unsafe-inline' (nonces) | 1 día | HIGH |
| Geo-anomaly detection básica (GeoLite2) | 3 días | MEDIUM |
| Penetration test externo | 1-2 semanas | ALTO VALOR |
| Política de seguridad documentada para usuarios | 1 día | COMPLIANCE |
| Revisión de Row Level Security en Supabase | 2 días | DEFENSE IN DEPTH |
| Rate limiting en endpoints GET sensibles | 4h | MEDIUM |

**Criterio de completitud:** Score A en securityheaders.com. Pen test sin hallazgos críticos o altos sin remediar.

---

## Fase 4 — Enterprise Security (2027+)

**Objetivo:** Capacidades enterprise para escalar la plataforma.

| Capacidad | Descripción |
|---|---|
| SIEM Integration | Envío de eventos a Elastic/Datadog para análisis avanzado |
| Behavioral Analytics | ML para detección de anomalías de comportamiento |
| Device Trust | Fingerprinting de dispositivos conocidos |
| RS256 JWT | Claves asimétricas para arquitectura de microservicios |
| SOC 2 Type II | Certificación de compliance para clientes enterprise |
| Bug Bounty Program | Programa público de reporte de vulnerabilidades |

---

## Amenazas a monitorear en el horizonte

| Amenaza | Probabilidad | Preparación actual |
|---|---|---|
| Credential stuffing a gran escala (botnet) | ALTA | Rate limit por IP, detection en memoria |
| Vulnerabilidad en Spring Boot / JJWT | MEDIA | Actualización manual, sin automatizar |
| Compromiso de cuenta ADMIN_IT | BAJA | 2FA disponible, account locking |
| Ataque a Supabase Storage | BAJA | Validación en backend, no en Storage |
| Social engineering contra equipo | MEDIA | Documentación + awareness |
| AI-assisted credential stuffing | CRECIENTE | Detección pattern-based, no ML |

---

## Métricas de seguridad a trackear

Para medir el progreso de la postura de seguridad:

| Métrica | Objetivo | Herramienta |
|---|---|---|
| Adopción de 2FA | ≥ 80% usuarios activos | Security Center dashboard |
| Tiempo de detección de ataque | ≤ 15 min para HIGH/CRITICAL | Alertas por email (Fase 1) |
| Tiempo de resolución de incidente | ≤ 4h para P1 | Post-mortem tracking |
| CVEs críticos sin parchear | 0 | Dependabot |
| Alertas sin resolver > 7 días | 0 | Security Center |
| Logins fallidos / día | Baseline + alertar en 2x | Security Center |

---

## Decisiones de arquitectura de seguridad (ADR)

### ADR-001: JWT HS256 vs RS256

**Decisión:** HS256  
**Razón:** Sistema de una sola aplicación sin microservicios. HS256 es más simple y suficiente.  
**Revisión:** Si se agregan microservicios en 2027, migrar a RS256.

### ADR-002: Rate limiting en memoria vs Redis

**Decisión:** En memoria (actual)  
**Razón:** Render free/starter con una sola instancia. Redis agrega complejidad y costo.  
**Revisión:** Si la app escala a múltiples instancias, migrar a Redis (Fase 2).

### ADR-003: 2FA obligatorio vs opcional

**Decisión:** Opcional para todos los roles actuales  
**Razón:** UX — forzar 2FA para pequeños emprendedores puede ser barrera de adopción.  
**Revisión:** Si se agregan clientes enterprise, 2FA obligatorio para ADMIN_IT y EMPRENDEDOR.

### ADR-004: Access token TTL 15 minutos

**Decisión:** 15 minutos  
**Razón:** Balance entre seguridad (ventana de compromiso) y UX (frecuencia de refresh).  
**Revisión:** Si se implementa JWT blocklist en Redis, reducir a 5 minutos.

### ADR-005: Audit logs sin purga automática

**Decisión:** Sin purga  
**Razón:** Volumen de tráfico bajo. Supabase free tier tiene espacio suficiente por ahora.  
**Revisión:** Implementar purga de eventos LOW/MEDIUM > 90 días en Q4 2026.
