---
name: sonar-revisar
description: |
  Revisa SonarCloud de Hot-click-dev por API (sin copiar/pegar el dashboard),
  agrupa issues por área y propone un slice accionable. Usar cuando el usuario
  pide sonar, SonarCloud, quality gate, análisis de calidad, “qué issues hay”
  o un informe de bugs/vulns/smells del proyecto.
---

# Revisar SonarCloud (rápido)

No pedir que el usuario copie el dashboard. El proyecto es público.

1. Leer [sonar-project.properties](../../../sonar-project.properties) (project key, ignores).
2. Consultar la API — detalle en [reference.md](reference.md). **Nunca paginar los miles de smells.**
3. Contrastar 5–10 hallazgos puntuales (bugs/vulns/código nuevo) con el archivo **local**: el scan suele ir atrasado.
4. Entregar backlog por área + un slice recomendado. No un dump de 1000 filas.

## Decisiones

| Acción | Cuándo |
|--------|--------|
| **Fix** | Bug real, a11y real (`S1082`), interrupt, timezone, hook mal usado |
| **NOSONAR** | Falso positivo puntual (p.ej. `Math.random` de UI). Misma frase que `useSocialProof.js` |
| **Ignore en properties** | Falso positivo de regla + glob, con un comentario de por qué |
| **Won't Fix en Cloud** | Patrón intencional (p.ej. `collection.size()` para lazy load Hibernate, `S2201`) |

No inventar números si la API falla. No bajar el Quality Gate para “pasar”. No proponer un sprint de 1000 smells: boy scout al tocar el archivo (ver `gestionar-deuda-tecnica` y `.cursor/rules/codigo-limpio.mdc`).

Para **escribir código nuevo** que no vuelva a tumbar el gate, usar `sonar-prevenir`.
