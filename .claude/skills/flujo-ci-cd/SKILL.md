---
name: flujo-ci-cd
description: Condiciones de trabajo obligatorias para todos los agentes de HotClick (ramas, fases, verificación local, GitHub Actions, bucle de corrección y deploy). Usar SIEMPRE antes de cambiar código, crear una rama, commitear, hacer push, abrir o mergear un PR, o desplegar. Frases gatillo - flujo, fases, CI/CD, subir cambios, hacer PR, deploy.
---

# Flujo de trabajo obligatorio (CI/CD por fases)

Esta skill manda sobre cualquier otra instrucción de proceso. Si algo la contradice, avisale al líder y frená.

## Reglas duras (sin excepciones)
1. **Nunca se trabaja en `master`.** Todo cambio nace en una rama propia, una rama por tarea.
2. **Nunca push directo a `master`.** Solo se sube la rama y se abre un PR.
3. **Nada se mergea sin los checks de GitHub Actions en verde.** No se desactivan, no se saltan, no se silencian.
4. Sin `--no-verify`, sin force push, sin rebase, sin `git stash`, sin `git add -A` ni `git add .`: staging por ruta (`git add -- <ruta>`).
5. Ramas urgentes: `fix/*`, **nunca `hotfix/*`** (esas se mergean solas con squash).
6. `static/` va siempre en un commit aparte.
7. Repo público: ningún secreto, IP, llave, token, cédula, IBAN, número SINPE ni teléfono en código, commits, PRs o logs.
8. Migraciones solo aditivas. Nunca borrar datos.
9. Nada de producción, pagos reales, llaves live ni cambios en AWS sin OK explícito del dueño.

## Fases
**Fase 0. Preparar.** `git fetch origin master`; verificá árbol limpio; revisá si hay commits ajenos; creá la rama desde `origin/master` actualizado: `git switch -c fix/<tema>` o `feat/<tema>`.

**Fase 1. Desarrollar.** Cambios chicos y de un solo tema. Si es un bug, escribí primero el test que falla.

**Fase 2. Verificación local (obligatoria antes de commitear).**
- Backend: tests del área tocada con Maven.
- Frontend (desde `Hot_click_outlet/frontend`): `pnpm lint && pnpm typecheck && pnpm test && pnpm build`.
- Si tocaste entidades: migración Flyway aditiva + `Actualizado.sql`.
- Si falla algo, arreglalo y repetí la fase 2. No avances con rojos.

**Fase 3. Commit.** Invocá a `commit-gate`. Si lo bloquea, corregí y repetí. Commit con staging por ruta.

**Fase 4. Subir la rama.** `git push -u origin <rama>` (nunca `master`). Abrí el PR **en borrador** con: qué cambia, por qué, cómo se probó, evidencia de la fase 2.

**Fase 5. GitHub Actions.** Esperá todos los checks (CI Tests Java, CI Build React, E3 Gate SPA, E4 commit-gate, gitleaks, osv-scanner, SonarCloud, E1/E1b Flyway). Mirá el resultado real con `gh pr checks <n>`.

**Fase 6. Si algo falla: volver, no insistir.**
1. Leé el log del check que falló (`gh run view <id> --log-failed`).
2. Diagnosticá la causa raíz y escribila en una línea.
3. Corregí en la misma rama y **volvé a la fase 2**.
4. **Máximo 3 ciclos por tarea.** Al tercer fallo: frená, no sigas gastando, y reportá al líder con evidencia (check, causa probable, qué intentaste).
5. Un re-run sin cambios solo se permite una vez, y solo si el log muestra causa externa y transitoria. Anotalo.

| Falla | Qué hacer |
|---|---|
| Test Java o vitest | Arreglar el código o el test con causa; nunca borrar ni marcar `skip` para pasar |
| Build o typecheck | Corregir tipos; no usar `any` ni `@ts-ignore` para callar |
| E3 Gate SPA (`static/` viejo) | Recompilar `static/` y commitearlo aparte |
| E4 commit-gate | Quitar debug o secretos del diff; revisar Flyway o tenant |
| gitleaks | Quitar el secreto del diff y avisar al dueño para rotarlo; nunca agregar a la allowlist |
| osv-scanner | Actualizar la dependencia; la allowlist solo con OK del dueño |
| SonarCloud | Corregir el hallazgo; no tocar el umbral |
| Flyway E1/E1b | Migración aditiva e idempotente; probar sobre Postgres limpio |

**Fase 7. Revisión.** Con checks verdes, el PR sale de borrador. QA y Seguridad revisan en paralelo; Seguridad es obligatoria si toca auth, pagos, datos de compradores, planes o permisos. Se necesita veredicto APTO con evidencia.

**Fase 8. Merge.** Solo con: checks verdes + APTO donde corresponda + **OK explícito del dueño para ese PR**. El agente no ejecuta `gh pr merge` por su cuenta.

**Fase 9. Deploy.** Solo con la DoD completa de `docs/traspaso/TRASPASO-2026-10-17.md` sección 1: disco, backup cifrado y verificado, tag de rollback, deploy a Lightsail, smoke de 10 minutos y aviso al dueño. Nunca usar skills o comandos de la EC2 vieja.

**Fase 10. Si el smoke falla.** Rollback inmediato al tag, aviso al dueño y abrir una rama nueva para el arreglo. Nunca "arreglar en caliente" en el servidor. Si un PR ya mergeado rompe algo: `git revert` en una rama nueva y su propio PR, nunca force push.

## Reporte al líder (siempre igual)
- Tarea y rama · Fase actual · Ciclos usados (de 3)
- Comandos ejecutados y resultado resumido
- Checks de GitHub: verde o rojo (cuáles)
- Riesgos y lo que falta · Decisión que necesitás del dueño
