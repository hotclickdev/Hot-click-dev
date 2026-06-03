# F29.1 — Observability Audit
**Fecha:** 2026-06-02 | **Proyecto:** HOTCLICK SaaS

---

## Estado actual

### ✅ Implementado antes de F29

| Componente | Estado | Detalles |
|-----------|--------|---------|
| MDC Request ID | ✅ | `MdcRequestIdFilter` — genera UUID por request, propaga en header `X-Request-Id` |
| Logback pattern | ✅ | `[%X{requestId:--}]` en cada línea de log |
| Logging estructurado | ✅ parcial | Pattern de texto; falta JSON para ELK/Loki |
| Security Audit Log | ✅ | Tabla `hot_click_auditoria_admin_tb` — eventos JWT, rate-limit, 2FA |
| AI Usage metrics | ✅ | Tabla `hot_click_ai_uso_tb` — tokens/llamadas por empresa y mes |
| Observability dashboard | ✅ | `GET /api/admin/observabilidad` — 8 áreas de métricas |

### ✅ Implementado en F29

| Componente | Cambio | Impacto |
|-----------|--------|---------|
| Micrometer Core | Agregado a `pom.xml` | Habilita `@Timed`, `MeterRegistry`, timers |
| `ExternalCallMetricsService` | Nueva clase | Instrumenta llamadas a servicios externos con counters/timers |
| Resilience4j | Agregado a `pom.xml` + config | Circuit breaker + retry para Stripe, Hacienda, Claude, Supabase |
| SupabaseStorageService timeout | 10s connectTimeout | Antes colgaba indefinidamente |

---

## Métricas disponibles post-F29

### HTTP (via Spring Web)
- `http_server_requests_seconds` (Micrometer auto + actuator si se habilita)
- `http_req_duration` via k6 en load tests

### Servicios externos (via ExternalCallMetricsService)
```
external.call.total{service, operation, status}   # counter: success/failure
external.call.duration{service, operation}         # timer: latencia por llamada
```

Servicios instrumentados: claude, stripe, hacienda, supabase, sendgrid, bccr

### Base de datos (via ObservabilityController)
- Tamaño total: `pg_database_size(current_database())`
- Hikari pool stats: disponible en `spring.datasource.hikari.*`

### AI (tabla BD)
- `hot_click_ai_uso_tb`: tokens_entrada, tokens_salida, llamadas por empresa/mes

### Seguridad (tabla BD)
- `hot_click_auditoria_admin_tb`: eventos por tipo/severidad en últimas 24h

---

## Métricas faltantes y criticidad

| Métrica | Criticidad | Esfuerzo | Recomendación |
|---------|-----------|---------|--------------|
| HTTP latency percentiles (p50/p95/p99) | HIGH | Medio | Agregar `spring-boot-starter-actuator` con endpoint `/actuator/metrics` protegido por ADMIN_IT |
| Error rate por endpoint | HIGH | Medio | Requiere actuator o filtro custom de metrics |
| Hikari pool exhaustion alerts | HIGH | Bajo | `HikariDataSource.getHikariPoolMXBean()` en ObservabilityController |
| Circuit breaker state | MEDIUM | Bajo | Resilience4j expone estado; agregar al ObservabilityController |
| Stripe webhook latency | MEDIUM | Bajo | Instrumentar con ExternalCallMetricsService |
| SendGrid delivery rate | MEDIUM | Medio | Requiere webhook de SendGrid events |
| Hacienda API response time | MEDIUM | Bajo | Instrumentar con ExternalCallMetricsService |
| JVM heap / GC metrics | LOW | Medio | Requiere actuator con `jvm.*` metrics |
| Supabase storage usage | LOW | Medio | API de Supabase Management |

---

## Recomendación para productio mature

```yaml
# application.properties — agregar si se acepta el trade-off de seguridad:
spring.boot:
  starter:
    actuator: true

management:
  endpoints:
    web:
      exposure:
        include: health,metrics,prometheus
  endpoint:
    health:
      show-details: never
  metrics:
    export:
      prometheus:
        enabled: true
```

Proteger `/actuator/**` con `hasRole('ADMIN_IT')` ya existe en SecurityConfig.

---

## Trazabilidad entre servicios

- **Request ID**: cada request tiene UUID propagado en `X-Request-Id` (MDC + response header)
- **Correlación**: cuando AiCopilotService llama a Claude API, el requestId está en MDC del thread (TenantAwareTaskDecorator propaga el contexto)
- **Logs**: formato `[requestId] class - message` en todos los servicios
- **Missing**: no hay propagación del `X-Request-Id` hacia servicios externos (Stripe, Hacienda, Claude) como header de correlación
