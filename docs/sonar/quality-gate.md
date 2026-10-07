# Quality gate

Instrucción obligatoria. Se enfoca en el cambio nuevo: si este commit cumple las condiciones antes de darlo por bueno. No se entrega si el gate queda en Failed.

Si esta condición no se entiende, leer https://docs.sonarsource.com/sonarqube-cloud/standards/managing-quality-gates/ antes de seguir.

Verde: **Passed**. Todas las condiciones en OK.

Condiciones de este proyecto:

- Confiabilidad del código nuevo en A.
- Seguridad del código nuevo en A.
- Mantenibilidad del código nuevo en A.
- Líneas duplicadas nuevas bajo 3 %.
- Hotspots de seguridad nuevos revisados al 100 %.

El gate no mira la letra histórica. Puede pasar y la seguridad del tablero seguir en D si el hallazgo alto es viejo.
