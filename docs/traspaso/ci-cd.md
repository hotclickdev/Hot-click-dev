# Traspaso — Área 10 CI/CD (HotClick)

Fecha: 30-oct-2026, mediodía (hora de Costa Rica, UTC-6). Repo: hotclickdev/Hot-click-dev.
Este archivo es la nota vigente. `hotclick-ci-cd.md` (26-oct) queda como historia y apunta acá; el perfil del área 10 pide ese nombre, así que leé los dos.

## Rol
Área 10 CI/CD: verificás y mergeás PRs a master, cuidás que master quede verde y abrís PRs chicos de CI/higiene. No hacés deploy.

## Reglas de merge
- Solo con `gh pr merge <n> --merge --match-head-commit <sha>`.
- CI completo en verde **y** APTO de HotClick Seguridad dado directamente sobre ese hash exacto. Un APTO reenviado por otro bot no cuenta. Si el APTO es condicional (p. ej. "cuando pase Tests Java"), esperá la condición.
- Cualquier push nuevo anula el APTO. Un NO APTO posterior sobre el mismo hash también lo anula.
- El head tiene que contener el master actual: `gh api repos/hotclickdev/Hot-click-dev/compare/master...<head> --jq .behind_by` debe dar `0`. Si no, el autor mergea master (nunca rebase) y pide APTO nuevo.
- Si master está en rojo, solo se mergea el PR que lo arregla.
- PRs que tocan `static/` chocan entre sí: mergeá uno; el otro mergea master y reconstruye `static/`.
- Prohibido: force, `--no-verify`, rebase, `git stash`, `pkill`, deploy, gastos, cuentas o servidores nuevos (un PR que crea servidores es NO APTO). Staging y Sentry solo en código y apagados por defecto. Nada de secretos ni IPs en chat o repo. Worktree propio.
- Suites completas en el box solo con `flock /workspace/hotclick/.suite-completa.lock <cmd>`; si no, tests puntuales.
- Reporte de cada merge al Mentor y al bot autor, formato: Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso.

## Automatización
- Rutina `merge-pr-hotclick-con-ci-verde-y-apto` cada 30 min: revisa PRs con CI verde + APTO exacto + `behind_by=0` y mergea.
- Scripts `wait<N>.sh` en `/workspace/hotclick` (plantilla: `wait428.sh` / `wait435.sh`, se copian con `sed` cambiando PR y hash). Sondean cada 20 s hasta 90 veces; salen si el PR ya no está abierto, si cambia el head o si un check falla (FAILURE/CANCELLED/TIMED_OUT); con todo verde chequean `behind_by=0` y mergean con `--match-head-commit`.

## Merges recientes
| PR | Commit de merge |
|---|---|
| #422 | 500c43c6 |
| #425 | dce78073 |
| #426 | 1323c027 |
| #427 | 264f4edb |
| #428 | b3d558c1 |
| #429 | d36f3816 |
| #430 | 650da142 |
| #432 | 7dd0a11d |
| #431 | 07592b27 |
| #433 | da481550 |
| #434 | 02fd6fdd |
| #435 | b8ab9a06 |
| #436 | 270236e3 |

## Trabajo abierto
- **#439** `ci/area10-gitleaksignore`: 2 falsos positivos históricos de `RedaccionLogTest` en `.gitleaksignore`. Necesita CI verde + APTO.
- **#437** `ci/area10-mail-allowlist`: noop de correo solo con perfil dev|test|local (fail-closed sin perfil) y `mail.provider=noop` rechazado en prod. Necesita CI verde + APTO.
- BAJOs de #430: tope a `ONVO_WEBHOOK_401_VENTANA_MIN` (o guardar máx. umbral+1 timestamps); agrupación en Sentry porque el conteo es por pod; loguear "secret no configurado" aparte de "secret inválido".
- BAJOs de #434: filas viejas quedan como memoria global mezclada; la clave sigue siendo el visitorId de la cookie; `empresa_id` sin FK; el reason del 404 llega al cliente.
- PII en asuntos de correo (el modo noop los loguea en claro): `SolicitudEspecialController` y `ContactoController` meten el nombre de la persona en el asunto; otros llevan nombre de negocio/producto. Ninguno lleva correo ni teléfono. Detalle en el cuerpo de #437.

## Pendiente de decisión de Andrés
- INF-01/02 respaldos: solo locales y cifrados; nada en AWS ni servidores nuevos. Falta decidir dónde va la copia fuera del server, el cron, el restore drill, pg_dump antes de deploy y la prueba de `rollback.sh`.
- Rotar la key de SendGrid que entró en el commit `1b6f466ac` (ya removida del árbol). Lo plantea el Mentor; no la rotés vos.
- `ONVO_WEBHOOK_401_UMBRAL` en el `.env` de prod (0 = apagado).
- `gate-spa.yml` / #351 y `backup.yml`: necesitan el scope `workflow`.
- #363 sigue en draft.
- Dependabot #309–#317: no se mergean (SonarCloud falla).
- Excepción de zod en el allowlist de osv: vence el 6-nov-2026.

## Cómo seguir
1. `gh auth status`: confirmá cuenta y si el token tiene scope `workflow` (hoy no; sin él no se pushea nada en `.github/workflows`).
2. `/workspace/hotclick-mt` tiene el fetch roto: usá la API compare de GitHub en vez de fetch ahí.
3. Siguiente migración Flyway libre: **V211** (master llega a V210; reconfirmalo antes de mergear cualquier migración).
4. Revisá PRs abiertos, mensajes de Seguridad y el estado de #437 y #439; seguí con las reglas de arriba.
