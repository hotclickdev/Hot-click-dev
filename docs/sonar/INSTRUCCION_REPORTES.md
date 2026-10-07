# Instrucción: reportes de SonarCloud

Proyecto `hotclickdev_Hot-click-dev`. Verde significa: quality gate **Passed** y las cuatro letras del tablero en **A** (seguridad, revisión de hotspots, confiabilidad, mantenibilidad).

El gate mira el código nuevo. Las letras miran todo el historial. Por eso el gate puede pasar y la seguridad seguir en D: basta un hallazgo alto viejo.

## Qué mide cada cuadro

| Cuadro | Se enfoca en | Verde |
|---|---|---|
| Quality gate | Si el cambio nuevo cumple las condiciones (bugs nuevos, seguridad nueva, deuda, duplicados, hotspots revisados) | Passed |
| Open issues | Cantidad abierta. No es una nota. Sube con el código aunque la letra siga en A | No se usa como semáforo |
| Duplications | Líneas repetidas | Bajo 3 % en código nuevo |
| Coverage | Líneas tocadas por pruebas. Hoy está excluida a propósito en `sonar-project.properties` (`sonar.coverage.exclusions=**/*`) para no frenar el gate | No bloquea |
| Security rating | Fallos que un atacante podría usar (entidad JPA en el body, secretos, inyección) | A = ningún hallazgo de seguridad, ni bajo |
| Security issues | El conteo detrás de esa letra. Alto tumba a D. Bajo tumba a B | 0 |
| Security hotspots | Sitios sospechosos que una persona tiene que marcar como seguros (no son fallos todavía) | Revisión A y 0 sin revisar |
| Reliability | Bugs: promesas sueltas, `==` en fechas, hilos, null | A |
| Maintainability | Deuda de lectura (funciones largas, duplicados, nombres). La A se mantiene si la deuda es menos del 5 % del código | A |

## Cómo se configura

1. El archivo que Sonar lee en cada análisis es [`sonar-project.properties`](../../sonar-project.properties), en la raíz del repo.
2. Una excepción va en `sonar.issue.ignore.multicriteria` con un id nuevo (`e11`, `e12`…), la regla (`java:S1313`) y un glob de **un archivo**, más una línea que diga por qué.
3. No se apaga una regla en todo el repo para esconder un fallo real. No se apagan `S3776` (complejidad) ni `S1082` (clic sin teclado).
4. Una entidad JPA no entra en `@RequestBody`. El body es un DTO (`BlogEntradaDatos` es el ejemplo). Id, estado y fechas los pone el servidor.
5. Una IP fija solo se exceptúa si es un rango de proxy, una blocklist o un ejemplo de test. El glob apunta a ese archivo.

Esta instrucción la toma el agente cuando el mensaje habla de Sonar, el quality gate o el tablero de salud del proyecto.
