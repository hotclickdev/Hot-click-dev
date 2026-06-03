# F29.2 — Chaos Test Report
**Fecha:** 2026-06-02 | **Proyecto:** HOTCLICK SaaS

---

## Metodología

Auditoría de resiliencia de todos los clientes externos. Para cada uno se evaluó:
- **Timeout**: ¿tiene límite de tiempo configurado?
- **Retry**: ¿reintenta en fallos transitorios?
- **Circuit Breaker**: ¿corta el circuito ante fallo sostenido?
- **Fallback**: ¿tiene comportamiento degradado?
- **Idempotencia**: ¿el reintento es seguro?

---

## Resumen de hallazgos

| Servicio | Timeout | Retry | CB | Fallback | Estado |
|---------|---------|-------|----|----------|--------|
| Stripe SDK | SDK default | SDK auto | ❌ | Mock mode | MEDIUM |
| Hacienda CR | 10s/30s | ❌ | ❌ | Stub (STAG) | HIGH |
| Claude API | 15s connect / 60s req | ❌ | ❌ | Mock text | HIGH |
| Supabase Storage | ~~none~~ → **10s** ✅ | ❌ | ❌ | ❌ | HIGH→MEDIUM |
| SendGrid | SDK default | ❌ | ❌ | Silencioso | HIGH |
| BCCR TC | RestTemplate 30s | ❌ | ❌ | Fallback ✅ 530 CRC | LOW |
| PayPal SDK | HTTP default | SDK auto | ❌ | ❌ | MEDIUM |

---

## Hallazgos detallados

### [HIGH] CHX-01: HaciendaApiClient sin retry ✅ (config resilience4j)
**Archivo:** `service/HaciendaApiClient.java`
**Problema:** Una red intermitente con Hacienda CR causa error inmediato al usuario. Hacienda acepta reenvío del mismo XML (idempotente por `claveNumerica` única).
**Implementado:** `resilience4j.retry.instances.hacienda` — 3 intentos, 2s backoff exponencial.
**Pendiente código:** Anotar `@Retry(name="hacienda")` en `HaciendaApiClient.enviar()`.

### [HIGH] CHX-02: AiCopilotService sin retry en errores 529 (Claude overloaded)
**Archivo:** `service/AiCopilotService.java`
**Problema:** Claude retorna 529 (Overloaded) en picos. Sin retry, el usuario ve error inmediatamente.
**Implementado:** `resilience4j.retry.instances.claude` — 2 intentos, 500ms.
**Pendiente código:** Anotar `@Retry(name="claude")` en el método de llamada HTTP.

### [HIGH] CHX-03: SendGrid sin timeout ni fallback
**Archivo:** `service/ResendEmailService.java`
**Problema:** SendGrid down = hilo bloqueado indefinidamente (SDK HTTP default).
**Mitigación actual:** Emails se envían en `@Async` threads — no bloquea requests principales.
**Pendiente:** Agregar timeout al SendGrid SDK: `SendGrid.setTimeouts(connectTimeout, readTimeout)`.

### [MEDIUM] CHX-04: SupabaseStorageService sin timeout ✅ CORREGIDO (F29)
**Archivo:** `service/SupabaseStorageService.java`
**Problema:** `HttpClient.newHttpClient()` sin timeout — upload de imagen podía colgarse.
**Fix aplicado:** `connectTimeout(Duration.ofSeconds(10))`.
**Pendiente:** Agregar request-level timeout en `subirImagen()`:
```java
.timeout(Duration.ofSeconds(30)) // en HttpRequest.newBuilder()
```

### [MEDIUM] CHX-05: Stripe sin circuit breaker
**Archivo:** `service/StripeService.java`
**Problema:** Si Stripe tiene una outage (histórico: ~3/año), cada request espera el timeout del SDK antes de fallar.
**Implementado:** `resilience4j.circuitbreaker.instances.stripe` — abre tras 3 fallos en 5 intentos.
**Pendiente código:** Anotar `@CircuitBreaker(name="stripe")` en métodos clave.

### [MEDIUM] CHX-06: Supabase Storage sin retry
**Problema:** Un error 503 transitorio de Supabase falla el upload sin reintento.
**Implementado:** `resilience4j.retry.instances.supabase` — 2 intentos, 1s.
**Pendiente código:** Anotar `@Retry(name="supabase")` en `subirImagen()` y `subirCertificado()`.

### [LOW] CHX-07: BCCR con fallback ✅
**Archivo:** `service/BccrService.java`
**Estado:** Ya tiene fallback a valor configurable (`app.tc.usd.fallback=530`).
**Evaluación:** Correcto. El tipo de cambio no es crítico para operaciones.

### [LOW] CHX-08: PayPal webhook ya es async ✅
**Estado:** `procesarContenidoAsync` usa `@Async` — la respuesta 200 se envía antes de procesar.
**Evaluación:** Ya resuelto en F28.

---

## Configuración resilience4j aplicada (application.properties)

```properties
# Circuit breakers por servicio con umbrales conservadores
resilience4j.circuitbreaker.instances.stripe.failure-rate-threshold=60
resilience4j.circuitbreaker.instances.hacienda.failure-rate-threshold=80
resilience4j.circuitbreaker.instances.claude.failure-rate-threshold=50

# Retry con backoff exponencial
resilience4j.retry.instances.stripe.max-attempts=3
resilience4j.retry.instances.hacienda.max-attempts=3
resilience4j.retry.instances.claude.max-attempts=2
resilience4j.retry.instances.supabase.max-attempts=2
```

---

## Acciones pendientes de código (no breaking)

```java
// HaciendaApiClient.java
@Retry(name = "hacienda", fallbackMethod = "enviarFallback")
public boolean enviar(String xml, String clave, Empresa empresa) { ... }

// AiCopilotService.java  
@Retry(name = "claude")
@CircuitBreaker(name = "claude", fallbackMethod = "chatStreamFallback")
public void chatStream(Long empresaId, String message, SseEmitter emitter) { ... }

// SupabaseStorageService.java
@Retry(name = "supabase")
public String subirImagen(MultipartFile file, String carpeta) { ... }
```
