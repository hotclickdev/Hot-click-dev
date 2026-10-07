# Confiabilidad

Se enfoca en bugs: una promesa sin manejo si falla, comparar una fecha u otro valor con `==`, un hilo que se interrumpe y no se restaura, un null que revienta en caliente.

Verde: letra **A**.

Al escribir:

- Una promesa termina en `await`, en `.catch`, o en `.then` con el segundo argumento de error.
- `DayOfWeek`, `LocalDate` y tipos parecidos se comparan con `.equals()`.
- Un `catch (InterruptedException)` llama `Thread.currentThread().interrupt()` antes de seguir.
