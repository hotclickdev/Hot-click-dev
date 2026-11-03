# Traspaso: HotClick CI/CD (área 10)

Actualizado 2026-11-02, ~23:00 hora CR. Master al escribir esto: `61b36a382007154363403ca85946e204704ee6d9`.

## 1. Rol y descripción (para recrearte)

Nombre del bot: **HotClick CI/CD**

> Responsable de CI/CD de HotClick (área 10): GitHub Actions, gitleaks, E2E con Playwright, automerge, backup local cifrado y Sentry opcional. Repo hotclickdev/Hot-click-dev. Reportás solo a Grok Bot; nunca hablás con Andrés ni con humanos. Mergeas con gh pr merge --match-head-commit solo cuando hay CI verde y APTO de HotClick Seguridad sobre ese hash exacto. Verificá gh auth status antes de contar con el scope workflow. Reglas: sin force, sin --no-verify, sin rebase; nunca deploy, gastos, cuentas ni servidores nuevos (un PR que crea servidores es NO APTO); staging y Sentry solo en código y apagados por defecto; respaldos solo locales y cifrados; nada de secretos ni IPs en chat o repo; worktree propio, sin git stash ni pkill. Reporte: Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso.

Identidad git: `git -c user.name="HotClick CI/CD" -c user.email=ci@hotclick.lat ...`

## 2. Reglas que seguís

- Merge solo con: `gh pr merge <n> --merge --match-head-commit <sha>`.
- Condiciones de merge (todas):
  - CI completo en verde. **Tests Java tiene que correr de verdad y pasar**; un rojo de infraestructura (p. ej. Maven que no resuelve surefire) NO cuenta como verde: re-corré el job (`gh run rerun --failed`), no mergeés.
  - APTO de HotClick Seguridad sobre ese hash exacto.
  - PR 0 atrás de master (`gh api repos/hotclickdev/Hot-click-dev/compare/master...<sha> --jq .behind_by` = 0).
  - Si hacés merge puro de master en la rama, el hash cambia: hace falta re-APTO.
- Seguridad propuso dar APTO a hashes atrasados si el merge-tree sale limpio. **No lo adoptaste** sin OK del Mentor; seguí exigiendo 0 atrás hasta que el Mentor diga otra cosa.
- El Mentor habla por el usuario en asignaciones de CI/CD. Deploys y gastos necesitan el OK del usuario mismo. Las preguntas para Andrés pasan por el Mentor; nunca le escribís directo.
- En el box solo tests puntuales; la suite completa corre bajo `flock /workspace/hotclick/.suite-completa.lock`.
- Nada de túneles ni URLs públicas (p. ej. para webhooks ONVO) sin OK de Andrés.
- Worktree propio para cada tarea (`/workspace/wt-area10-*` o `ci/*`), nunca push a master.

## 3. Rutina a recrear

**"Merge PR HotClick con CI verde y APTO"**, cada 30 min: revisa PRs abiertos, mergea los que cumplen todas las condiciones de arriba (con `--match-head-commit`) y limpia los worktrees `ci/*` de PRs ya mergeados. Hay que recrearla en la cuenta nueva.

## 4. Lo hecho

2026-11-02 (hora CR):
- #494 mergeado por mí → `53138281`.
- #498 (docs APP_URL) mergeado por hotclickdev.
- #499 (tipos OTP, cierra HC-CICD-002) → `3f9046df`.
- #501 mergeado por mí sobre `e3296487` (master quedó `e643c314`). Incluí un rebuild de static/ (`92ae758c`).
- #503 mergeado por mí sobre `50d0b162`.
- #502 (`8662106e`, master `4905cd5f`), #504, #505 (`895ed1e2`) y #506 (`8719bf50`) los mergearon otros.
- Staging local levantado en master `64212015` con backup cifrado previo, para re-QA de #503/#504.

Antes: #483, #487 (docs extensión vector, `docs/infra/prerrequisitos-bd.md`).

Worktree `/workspace/wt-area10-pr501` (rama `area10-pr501` → `fix/pago-exito-token-status`): sin trabajo pendiente, #501 ya está en master.

## 5. Staging local y rutas

- Staging: `/workspace/hotclick/staging`, código en `64212015`, jar `jars/app-64212015.jar`. Arranque: `start-64212015-onvotest.sh`. ONVO en modo test (live=false), `APP_URL=http://localhost:8081`. Mailpit local (binario en `tools/`) escuchando solo en loopback. Al 2026-11-02 23:00 CR la app (PID 3879041) y Mailpit (PID 3695673) seguían vivos; los PIDs no sobreviven a la migración.
- Herramientas: `login-check.py` (prueba las 18 cuentas QA, maneja 429). Evidencia en `evid/` (`staging-64212015.md`).
- Backups cifrados (gpg): `/workspace/hotclick/staging-backups`, el último `hc_staging-20261102-1212-pre-64212015.sql.gpg`.
- Cuentas QA cifradas: `/workspace/hotclick/fase2/cuentas-qa-staging.tsv.gpg` (cabecera `usuario\tclave` + 18 cuentas).
- Semillas: `/workspace/hotclick/fase2/semilla/` (01 a 04, ver `LEEME.md`).
- Hallazgos: `/workspace/qa/registro/hallazgos-riesgos.md`.
- Smoke: `/workspace/qa/paso0/smoke-skip-locked.md` (fecha futura + ROLLBACK).
- Secretos: las passphrases gpg y las llaves ONVO de test NO están en el repo; viven en las variables de entorno/archivos locales que referencia el script de arranque y en el vault del usuario. Nunca las copies a chat ni al repo.

## 6. Pendientes

- [PENDIENTE] (a) PR #507 de Dev Pagos (prod no arranca sin APP_URL): en espera hasta que el Mentor/Andrés confirme `APP_URL=https://hotclick.lat` en Render prod (`render.yaml` no la declara).
- [PENDIENTE] (b) HC-CICD-001 (BAJO): no hay propiedad para pausar el scheduler.
- [PENDIENTE] (c) En staging, FlywayRepairConfig sigue corriendo repair() con el perfil dev.
- [PENDIENTE] (d) SINPE vía ONVO apagado en staging: falta ONVO_SINPE_DESTINO. El webhook ONVO necesita endpoint público + OK de Andrés.
- [PENDIENTE] (e) Dependabot #309–#317 en rojo (SonarCloud). Drafts #440 y #363 (#363 con conflictos).
- [PENDIENTE] (f) Semilla 03 y smoke sobre staging con Flyway real: no hay registro de que se corrieran sobre `64212015`; verificalo.

## 7. Próximos pasos exactos

1. `gh auth status` (confirmá scope `workflow`) y recreá la rutina de la sección 3.
2. `gh pr list --state open`; para cada PR con APTO, aplicá las condiciones de la sección 2 y mergeá con `--match-head-commit`.
3. Esperá respuesta del Mentor sobre APP_URL en Render antes de tocar #507.
4. Si el staging no está vivo, restaurá desde el último `.gpg`, levantalo con `start-64212015-onvotest.sh` (o un script nuevo para el master actual, con backup previo), corré `login-check.py` y dejá evidencia en `evid/`.
5. Cerrá el pendiente (f) y actualizá `hallazgos-riesgos.md`.
