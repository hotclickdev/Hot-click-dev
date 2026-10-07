# Seguridad

Instrucción obligatoria. Se enfoca en fallos que un atacante podría usar: una entidad de base de datos en el cuerpo del request, un secreto en el código, inyección, una ruta que escapa del directorio. No se entrega código que deje esta letra por debajo de A.

Si esta regla no se entiende, buscarla en https://rules.sonarsource.com/ antes de seguir.

Verde: letra **A**. Cero avisos de seguridad, también los bajos. Un aviso bajo deja la letra en B. Un aviso alto la deja en D.

Al escribir:

- El `@RequestBody` es un DTO. `BlogEntradaDatos` es el ejemplo. El id, el estado y las fechas los pone el servidor.
- No se guarda el objeto que llegó del cliente si ese objeto es una entidad JPA.
