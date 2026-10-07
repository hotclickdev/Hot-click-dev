# Confiabilidad

Instrucción obligatoria. Se enfoca en bugs: una promesa sin manejo si falla, comparar una fecha u otro valor con `==`, un hilo que se interrumpe y no se restaura, un null que reviente en caliente. No se entrega un bug nuevo de confiabilidad.

Si la regla no se entiende, buscarla en https://rules.sonarsource.com/ antes de seguir.

Verde: letra **A**.

Al escribir:

- Una promesa termina en `await`, en `.catch`, o en `.then` con el segundo argumento de error.
- `DayOfWeek`, `LocalDate` y tipos parecidos se comparan con `.equals()`.
- Un `catch (InterruptedException)` llama `Thread.currentThread().interrupt()` antes de seguir.
