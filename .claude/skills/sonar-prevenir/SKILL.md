---
name: sonar-prevenir
description: |
  Evita issues de SonarCloud que ya tumbaron el Quality Gate de Hot-click-dev
  al escribir Java, JSX o JS. Usar al implementar backend/admin, antes de un
  PR, o cuando el usuario dice “evitar sonar”, “quality gate”, “no rompas
  Sonar” o “prevenir issues de calidad”.
---

# Prevenir issues de Sonar al desarrollar

Checklist de las reglas que **ya nos tumbaron el gate**. No es un tratado de
Sonar. Complejidad y funciones chicas: `.cursor/rules/codigo-limpio.mdc`.
Si la tarea limpia **y** toca Sonar: `codigo-limpio-sonar` (orden en el archivo;
no rehacer a11y ni extraer mezclado con UI). Click vs teclado: skill
`accesibilidad-basica`. Verificar al final: `fable-verificar`. Informe del
dashboard: `sonar-revisar`.

## Checklist

**Aleatoriedad**
- Shuffle/animación/delay de UI: `Math.random()` + `// NOSONAR — solo para UI`
  (mismo patrón que `useSocialProof.js`).
- ID temporal de borrador: `crypto.randomUUID()` (no `Date.now()+Math.random`).
- Crypto, OTP, IV, tokens: `SecureRandom` de **campo de instancia**, nunca
  `new SecureRandom()` por llamada.
- Sorteo de premios / no crypto: `ThreadLocalRandom.current()`, no `new Random()`.

**Hilos**
- `catch (InterruptedException e)` (o `Exception` que trague interrupt):
  `Thread.currentThread().interrupt()` antes de loguear/seguir.
- `ExecutorService` / `ScheduledExecutorService`: campo + `@PreDestroy` con
  `shutdown()`. Hilo daemon no alcanza para Sonar (`S2095`).

**Fechas**
- `Duration.between(a, b)`: **mismo tipo** en ambos lados. Si Sonar `S8700`
  marca naive vs zona: convertí **los dos** a `ZonedDateTime` con
  `Constants.ZONA_CR` (`createdAt.atZone(...)` y `ZonedDateTime.now(...)`).
  No mezclar `LocalDateTime` naive con `Instant`/`ZonedDateTime`.

**UI**
- Acción → `<button>`. Navegación → `<a href>`. Nunca `<div onClick>`.
- Hooks (`useX`) solo en componentes o en funciones `use*`. No dentro de
  `initFoo()` suelto.

**Regex Java**
- `Pattern.CASE_INSENSITIVE` va con `Pattern.UNICODE_CASE`.
- Alternación `|` agrupada con paréntesis: `(foo|bar)` no `foo|bar` ambiguo.

**Config**
- Ignore en `sonar-project.properties`: una línea de **por qué** + glob
  preciso. No apagar `S3776` ni `S1082` (a11y real).
- `S2201` (`size()` ignorado): no inventar un uso falso; Won't Fix si es
  lazy-load Hibernate.

Si el cambio toca Java: `.\maven\bin\mvn test` del módulo (codigo-limpio).
