# Las Reglas de Oro del Backend de HOTCLICK

> Bienvenido al equipo. Antes de tocar un controller, lee esto completo.
>
> HOTCLICK es un SaaS multi-tenant: en la misma base de datos conviven los datos de decenas de negocios distintos. La única barrera entre "ver mi inventario" y "ver el inventario del competidor" es el código que tú vas a escribir hoy. No hay una capa mágica de infraestructura que te salve si te equivocas — la salva eres tú, leyendo este documento y aplicándolo sin excepciones.
>
> Esto no es una guía de estilo. Es una lista de formas concretas en las que este backend se ha roto, o se rompería, si alguien escribe el código "obvio" en lugar del código correcto. Tómatelo en serio.

---

## 1. La Regla de Oro del Tenant

### Cómo funciona `TenantContext.get()`

`TenantContext` ([`com.hotclick.security.TenantContext`](Hot_click_outlet/src/main/java/com/hotclick/security/TenantContext.java)) es, literalmente, un `ThreadLocal<Long>` que guarda el `empresaId` del tenant activo:

```java
public final class TenantContext {
    private static final ThreadLocal<Long> EMPRESA_ID = new ThreadLocal<>();

    public static Long get()           { return EMPRESA_ID.get(); }
    public static void set(Long id)    { EMPRESA_ID.set(id); }
    public static void clear()         { EMPRESA_ID.remove(); }
}
```

`TenantFilter` lo llena al principio de cada request (leyendo el claim `empresaId` del JWT o la API key) y lo limpia en su `finally` antes de devolver el thread al pool de Tomcat. Mientras tu código está procesando ese request, `TenantContext.get()` te dice de forma confiable: **"este request pertenece a esta empresa, y a ninguna otra"**.

**¿Por qué un `ThreadLocal` y no, por ejemplo, una variable de sesión de PostgreSQL (`SET app.tenant_id = ...`)?** Porque Supabase corre PgBouncer en *transaction mode*: la conexión física vuelve al pool al terminar cada transacción, y con ella se pierde cualquier `SET` o `set_config()`. Si intentas resolver el aislamiento de tenant a nivel de sesión de base de datos, te va a funcionar perfecto en local y va a fallar de forma intermitente y aterradora en producción. El `ThreadLocal` en la JVM es la única pieza de estado que sí persiste de forma confiable durante el ciclo de vida de un request — por eso es la pieza central de todo el aislamiento.

Eso también explica por qué existe `CompanyScope` ([`com.hotclick.security.CompanyScope`](Hot_click_outlet/src/main/java/com/hotclick/security/CompanyScope.java)): es la fachada que decide *de dónde* sacar el `empresaId` correcto (JWT, `TenantContext`, o `null` si es `ADMIN_IT`) y expone `assertCanAccess(resourceEmpresaId)` para verificar, de forma explícita, que el recurso que estás devolviendo le pertenece al usuario que lo está pidiendo.

### Por qué `findById()` a secas es una vulnerabilidad, no un atajo

Esto es lo más importante que vas a leer en este documento: **`findById()` no sabe qué es un tenant.** Es un método genérico de Spring Data que busca por clave primaria en toda la tabla, sin importar a qué empresa pertenece la fila. Si tu endpoint recibe un `id` por path variable y lo pasas directo a `repository.findById(id)`, estás confiando en que el `id` que llegó por la URL pertenece a la empresa del usuario autenticado — y un atacante (o simplemente un usuario curioso cambiando el número en la URL) puede mandar el `id` de **cualquier otra empresa**.

Esto no es teórico: ya existe en el código un caso donde se hace `findById()` puro y luego se valida el tenant *después*, en una línea aparte ([`PaymentService.java`](Hot_click_outlet/src/main/java/com/hotclick/service/PaymentService.java), checkout de bodega). Funciona porque alguien se acordó de poner el `if` de validación a mano. La próxima persona que copie ese patrón y se olvide del `if` — porque está apurada, porque es su primera semana, porque el code review no lo agarró — abre una fuga de datos entre empresas. **No dependas de la memoria de nadie. Haz que sea imposible escribir la consulta incorrecta.**

La forma correcta es que el filtro de tenant viva **dentro de la consulta**, no como una validación posterior. `CarritoRepository` ya tiene el patrón correcto:

```java
Optional<Carrito> findByIdAndEmpresaId(Long id, Long empresaId);
```

Si la fila no pertenece a esa empresa, el `Optional` viene vacío — no hay ninguna forma de que el dato de otra empresa llegue a tus manos, porque nunca salió de la base de datos.

### Código prohibido vs. código permitido

```java
// ❌ PROHIBIDO — el id viene del cliente, la empresa nunca se valida
@GetMapping("/api/bodegas/{id}")
public ResponseEntity<BodegaDTO> getBodega(@PathVariable Long id) {
    Bodega bodega = bodegaRepository.findById(id)
        .orElseThrow(() -> new RuntimeException("No encontrada"));
    return ResponseEntity.ok(toDTO(bodega));
    // Cualquier empresa autenticada puede leer la bodega de cualquier otra
    // con solo cambiar el número en la URL.
}
```

```java
// ✅ PERMITIDO — el filtro de tenant vive dentro de la consulta
@GetMapping("/api/bodegas/{id}")
public ResponseEntity<BodegaDTO> getBodega(@PathVariable Long id) {
    Long empresaId = companyScope.getCurrentEmpresaId();
    Bodega bodega = bodegaRepository.findByIdAndEmpresaId(id, empresaId)
        .orElseThrow(() -> new TenantNotFoundException("Bodega no encontrada"));
    return ResponseEntity.ok(toDTO(bodega));
}
```

Si el repositorio todavía no tiene la variante compuesta, **créala tú antes de escribir el endpoint**. No es trabajo extra opcional, es el método que vas a necesitar de todas formas. Y si por alguna razón legítima necesitas un `findById()` plano (por ejemplo, dentro de un proceso que ya validó el tenant por otra vía, como el `SecurityException` manual de `PaymentService`), **deja un comentario explicando por qué es seguro ahí**, igual que se hizo ahí — para que la próxima persona no copie el patrón a un lugar donde ya no lo es.

---

## 2. El Peligro de los Hilos (`@Async`)

### El `ThreadLocal` no cruza threads. Nunca.

Esta es la trampa silenciosa: `TenantContext` funciona porque vive en el thread del request. En cuanto tu código salta a otro thread — y `@Async` literalmente significa "ejecuta esto en otro thread" — ese `ThreadLocal` está vacío. No lanza una excepción, no te avisa, simplemente `TenantContext.get()` devuelve `null` en el hilo nuevo.

```
Thread del request:  TenantContext = 42L
                            │
                            │  @Async sin decorator
                            ▼
Thread del pool:     TenantContext = null    ← bug silencioso
```

Esto es peor que un crash. Un `null` no truena tu build, no aparece en un test que olvidaste escribir: aparece en producción como "el email de confirmación no se envió", "el dashboard ejecutivo de la empresa X está vacío", o, en el peor escenario, como un código que al no encontrar `empresaId` cae en una rama por defecto que no filtra por tenant. Un junior que ve ese `null` intermitente en logs y no entiende `ThreadLocal` puede pasarse un día entero debuggeando algo que no es un bug de lógica, sino un problema de qué thread está corriendo el código.

### Por qué este proyecto nunca usa `@Async` "a pelo"

Para resolver esto, `AsyncConfig` ([`com.hotclick.config.AsyncConfig`](Hot_click_outlet/src/main/java/com/hotclick/config/AsyncConfig.java)) registra `TenantAwareTaskDecorator` en **todos** los executors del proyecto. Ese decorator es el puente: captura el `empresaId` del thread padre antes de que la tarea se encole, y lo vuelve a setear dentro del thread hijo antes de ejecutar tu código — y lo limpia al terminar, para no filtrar el tenant equivocado a la siguiente tarea que reutilice ese thread del pool.

```java
public class TenantAwareTaskDecorator implements TaskDecorator {
    public Runnable decorate(Runnable runnable) {
        Long empresaId = TenantContext.get();          // capturado en el thread padre
        return () -> {
            try {
                if (empresaId != null) TenantContext.set(empresaId);  // restaurado en el hijo
                runnable.run();
            } finally {
                TenantContext.clear();                  // limpiado siempre
            }
        };
    }
}
```

Hay **tres** executors configurados, cada uno con un propósito distinto, y los tres llevan el decorator:

| Executor | Para qué | Tamaño |
|---|---|---|
| `taskExecutor` | Trabajo async genérico (emails, facturación) | 2–5 threads, cola 100 |
| `sseExecutor` | Streams SSE (copilot IA, dashboard ejecutivo, chat público) | 5–20 threads |
| `stockEventExecutor` | Eventos de stock / broadcast SSE de inventario | hilo virtual por evento |

El problema real no es "olvidar poner `@Async("stockEventExecutor")`" en un método que ya tiene `@Async` simple — Spring resuelve `@Async` sin nombre al bean `taskExecutor` por convención, y ese también lleva el decorator, así que no pierdes el tenant por eso. El peligro de verdad es más sutil y más fácil de cometer:

- **Definir tu propio `Executor` sin `setTaskDecorator(new TenantAwareTaskDecorator())`** porque el pool de `taskExecutor` (5 threads máx.) te parece insuficiente para tu caso de uso. Acabas de crear un agujero.
- **Usar `CompletableFuture.runAsync(...)` o `CompletableFuture.supplyAsync(...)` sin pasar un executor explícito.** Por defecto caen en `ForkJoinPool.commonPool()` — un pool global de la JVM que ningún `TaskDecorator` de Spring toca jamás. El tenant se pierde de forma garantizada.
- **Lanzar un `new Thread(() -> ...).start()` a mano** "porque es rápido para esta una cosita". Mismo problema, multiplicado.
- **Usar `stockEventExecutor` para algo que no es un evento de stock**, asumiendo que "es un hilo virtual, da igual". Lo importante no es el tipo de hilo, es que el executor que elijas exista en `AsyncConfig` y lleve el decorator — si necesitas un cuarto executor para un caso de uso nuevo, créalo ahí, con su `TaskDecorator`, no improvises uno suelto en tu servicio.

### Código prohibido vs. código permitido

```java
// ❌ PROHIBIDO — executor ad-hoc sin TenantAwareTaskDecorator
@Service
public class ReporteService {
    private final Executor miExecutor = Executors.newFixedThreadPool(4);

    public void generarReporteAsync(Long pedidoId) {
        miExecutor.execute(() -> {
            // TenantContext.get() es null aquí. Si el query de abajo
            // usa ese null como fallback "sin filtro", acabas de
            // mezclar datos de todas las empresas en un solo reporte.
            Long empresaId = TenantContext.get();
            reporteRepository.generar(pedidoId, empresaId);
        });
    }
}
```

```java
// ✅ PERMITIDO — usa un executor de AsyncConfig, el tenant viaja con la tarea
@Service
public class ReporteService {

    @Async("taskExecutor")
    public void generarReporteAsync(Long pedidoId) {
        // TenantAwareTaskDecorator ya restauró el empresaId del thread padre.
        Long empresaId = TenantContext.get();
        reporteRepository.generar(pedidoId, empresaId);
    }
}
```

Regla práctica: si vas a ejecutar algo fuera del thread del request — `@Async`, `CompletableFuture`, un `Thread` manual, un `ScheduledExecutorService` propio — pregúntate primero "¿este código necesita saber quién es el tenant?". Si la respuesta es sí (y casi siempre lo es), tiene que pasar por uno de los tres executors de `AsyncConfig`. Si crees que necesitas un executor nuevo, ese executor se define en `AsyncConfig` con su `TaskDecorator`, no se inventa dentro de un `@Service`.

---

## 3. Código Prohibido vs. Código Permitido: Manejo de Excepciones

### El antipatrón del junior: tragarse el error

```java
// ❌ PROHIBIDO
public void procesarPago(Pedido pedido) {
    try {
        stripeClient.cobrar(pedido);
        pedido.setEstado("PAGADO");
        pedidoRepository.save(pedido);
    } catch (Exception ignored) {
        // "ya, no importa, que siga"
    }
}
```

Este código tiene tres problemas, y los tres son graves:

1. **`catch (Exception ...)` genérico** atrapa absolutamente todo — desde un timeout de red razonable hasta un `NullPointerException` que revela un bug real en tu propio código. Tratas un error de red igual que un bug de programación.
2. **No hay log.** Cuando un cliente reclame que pagó y el pedido sigue en "PENDIENTE", no va a haber ni una línea en ningún lado que explique qué pasó. Vas a estar debuggeando a ciegas.
3. **El nombre `ignored` es una confesión.** Estás documentando, en el propio código, que decidiste no enterarte de los errores. Eso no es manejo de excepciones, es ocultarlos.

### El estándar del proyecto: excepciones tipadas + logging estructurado

Este backend tiene una jerarquía de excepciones de dominio (`PlanLimitException`, `StockInsuficienteException`, `TenantAccessDeniedException`, `IntegracionExternaException`, …) capturadas centralmente en [`GlobalExceptionHandler`](Hot_click_outlet/src/main/java/com/hotclick/config/GlobalExceptionHandler.java). Cada una sabe su propio HTTP status y lleva los datos de contexto que importan para diagnosticar el problema, no solo un `String` de mensaje:

```java
@ResponseStatus(HttpStatus.FORBIDDEN)
public class PlanLimitException extends RuntimeException {
    private final String entidad;   // "productos", "bodegas", "usuarios", "ai"
    private final String upgrade;   // acción sugerida para el usuario
    // ...
}
```

Y el manejador no solo responde al cliente — deja rastro con un **tag de subsistema** entre corchetes y los parámetros que un humano necesita para reconstruir qué pasó, sin imprimir un stacktrace completo cuando no aporta nada nuevo:

```java
@ExceptionHandler(PlanLimitException.class)
public ResponseEntity<Object> handlePlanLimit(PlanLimitException ex) {
    log.warn("[plan-limit] entidad={} msg={}", ex.getEntidad(), ex.getMessage());
    // ...
}

@ExceptionHandler(IntegracionExternaException.class)
public ResponseEntity<Object> handleIntegracionExterna(IntegracionExternaException ex) {
    log.error("[integracion-externa] integracion={} tipo={} tenantId={} msg={}",
        ex.getIntegracion(), ex.getTipo(), ex.getTenantId(), ex.getMessage(), ex);
    // ...
}
```

El mismo patrón se repite en los servicios: cuando hay algo que sí es seguro ignorar (no fallar el flujo principal por un email que no salió), **igual se loguea antes**:

```java
catch (Exception e) {
    log.error("No se pudo enviar email de confirmación para pedido {}: {}",
        pedido.getNumeroPedido(), e.getMessage());
}
```

### Código prohibido vs. código permitido, lado a lado

```java
// ❌ PROHIBIDO — genérico, mudo, sin contexto
public void procesarPago(Pedido pedido) {
    try {
        stripeClient.cobrar(pedido);
    } catch (Exception ignored) {
    }
}
```

```java
// ✅ PERMITIDO — excepción tipada, log estructurado, contexto suficiente
// para reconstruir el incidente sin tener que reproducirlo
public void procesarPago(Pedido pedido) {
    try {
        stripeClient.cobrar(pedido);
        pedido.setEstado("PAGADO");
        pedidoRepository.save(pedido);
    } catch (StripeException e) {
        log.error("[checkout] Cobro fallido pedido={} empresaId={} motivo={}",
            pedido.getNumeroPedido(), pedido.getEmpresa().getId(), e.getMessage(), e);
        throw new IntegracionExternaException(
            "stripe", IntegracionExternaException.Tipo.FALLO, pedido.getEmpresa().getId(), e.getMessage());
    }
}
```

Antes de escribir un `catch`, hazte estas tres preguntas:

1. **¿Qué tipo de excepción es realmente posible aquí?** Captura esa, no `Exception` a secas.
2. **¿Qué necesitaría saber alguien a las 3 a.m. para entender qué pasó?** Pon ese dato en el log — `empresaId`, `pedidoId`, lo que sea relevante al subsistema — con un tag `[subsistema]` consistente.
3. **¿Este error debe propagarse o es seguro absorberlo?** Si debe propagarse, usa o crea una excepción tipada y déjasela a `GlobalExceptionHandler`. Si es seguro absorberlo (como un email que falla sin bloquear el pedido), absórbelo — pero nunca en silencio.

---

## Resumen — antes de hacer commit, pregúntate:

- [ ] ¿Esta consulta filtra por `empresaId` *dentro* del repositorio (`findByIdAndEmpresaId`, `findByEmpresaIdAnd...`), o estoy confiando en un `if` que alguien podría borrar después?
- [ ] ¿Este código que corre fuera del thread del request pasa por un executor de `AsyncConfig` (con `TenantAwareTaskDecorator`), o inventé un `Executor`/`Thread`/`CompletableFuture` suelto?
- [ ] ¿Mi `catch` atrapa un tipo específico, deja un log con tag y contexto, y decide explícitamente si absorbe o relanza — o es un `catch (Exception ignored)` con otro nombre?

Si las tres respuestas te dejan tranquilo, tu PR está listo para review. Si no, ya sabes qué arreglar antes de pedirle a alguien que lo revise.
