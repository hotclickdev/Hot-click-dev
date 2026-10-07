# Excepciones de una regla

Instrucción obligatoria. Se enfoca en cómo callar un aviso que no aplica, sin apagar la regla en todo el repo. No se apaga una regla en todo el proyecto para esconder un fallo. Si el motivo no se puede escribir en una línea, la excepción no se hace y se corrige el código.

Si no se entiende la regla que se quiere exceptuar, leerla en https://rules.sonarsource.com/ antes de tocarla.

El archivo que Sonar lee es `sonar-project.properties`, en la raíz.

Cada excepción suma un id (`e11`, `e12`…) a `sonar.issue.ignore.multicriteria` y lleva tres líneas:

- `ruleKey`: la regla, por ejemplo `java:S1313`.
- `resourceKey`: el glob de un archivo, por ejemplo `**/ClientIpResolver.java`.
- Un comentario arriba que diga por qué.

No se apaga la regla para todo el proyecto. No se apagan `S3776` (complejidad) ni `S1082` (un clic sin teclado).

Una IP fija solo entra aquí si es un rango de proxy, una lista que bloquea URLs internas, o un ejemplo dentro de un test.
