---
name: codigo-limpio-sonar
description: |
  Orquesta las 4 reglas de código limpio y SonarCloud para que se complementen
  en el mismo archivo, sin pases que se pisen ni extraer mezclado con cambio de
  UI. Usar con “4 reglas”, codigo limpio, Sonar, quality gate, “no se pisen”,
  boy scout en archivo tocado, o al limpiar y corregir smells a la vez.
---

# Código limpio y Sonar (complemento)

No es un tercer estilo. Es quién manda cuando ambos aplican. Checklists:
`.cursor/rules/codigo-limpio.mdc`, `sonar-prevenir`, `sonar-revisar`.
Todo el repo (lotes, no olas): `campana-limpio-sonar`.

## Roles

- **4 reglas:** estructura y lectura (tamaño, nesting, dueño de regla, nombres). Comportamiento igual.
- **Sonar gate:** bugs reales (interrupt, timezone, regex, hook, a11y `S1082`, NPE). Eso no se “limpia después”.
- **Sonar smells:** boy scout **solo** en el archivo que ya se toca; no sprint de 1000.

## Orden en un archivo

1. Anotar comportamiento visible (texto UI, orden de llamadas en auth/pago).
2. **Estructura primero** (4 reglas): early return y extraer con nombre. Eso suele matar S3776 y ternarios anidados **sin** NOSONAR.
3. **Lo que queda del gate:** solo bugs que la estructura no cubrió. Si la a11y ya es `<button>` / teclado, **no** cambiar el patrón.
4. Smells residuales: constantes, `Number.parseInt`, unused — sin cambiar UI.
5. Auth / pago / 2FA / POS / wizard / security: extract = **solo mover**. Gate bug = commit o hunk aparte. Nunca ambos en el mismo diff.

## Empate

| Choque | Quién manda |
|--------|-------------|
| Nested ternary / complejidad | Extraer helper con nombre (4 reglas). No apagar `S3776`. |
| Strings duplicados | 3.ª copia o misma regla de negocio → extraer (p.ej. `EmpresaNombre`). 2 copias locales → constante del archivo si S1192 en **este** archivo. No `Constantes.java`. |
| Catch vacío | Log o toast (4 reglas). Comentario solo si el vacío es intencional y no hay usuario que deba ver el fallo. |
| `div onClick` | `<button>` (Sonar + a11y). No rehacer Escape vs overlay si ya hay botón real. |
| `Math.random` UI | Patrón existente / ignore `e7`. No extraer un helper falso. |
| Extract que cambia lo que se ve | Revertir el cambio de UI; el extract se queda. |

## Prohibido

- Mismo hunk: extraer **y** borrar label/KPI/texto.
- Segundo parche de a11y sobre el primero (p.ej. quitar `onKeyDown` Escape para poner otro overlay).
- Partir login/2FA en el mismo pase que constantes/audit.
- NOSONAR para complejidad o para “la función es larga”.

## Verificar

- Diff: cada hunk es estructura **o** gate, no los dos mezclados con UI.
- Java: `.\maven\bin\mvn test` del módulo tocado.
- Frontend: el texto que había sigue.
