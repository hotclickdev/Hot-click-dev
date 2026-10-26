# Traspaso — HotClick CI/CD

Fecha: 26-oct-2026, ~14:50 (hora de Costa Rica, UTC-6). Repo: hotclickdev/Hot-click-dev.

## Rol
Preparo, verifico y mergeo PRs a master y mantengo el staging LOCAL del box. Solo hablo con Grok Bot (nunca directamente con humanos).

## Reglas vigentes (decisiones de Andrés)
- Merge solo con **CI verde + APTO de Seguridad sobre el hash exacto**, con `gh pr merge N --merge --match-head-commit <sha>`, **de a uno**, **sin deploy**.
- Requieren OK explícito de Andrés: deploy, gastar dinero, cuentas nuevas, borrar datos de prod, llave live, piloto.
- **Sin servidores** (ni staging ni backup, ni AWS ni otro proveedor): orden del 26-oct 12:17. Backups solo locales y cifrados.
- Prohibido `--no-verify`, force push y rebase en ramas compartidas. Las ramas se actualizan con **merge de master**.
- Maven: `MAVEN_OPTS=-Xmx2g flock /workspace/.mvn-suite.lock mvn -B test -DforkCount=1`.
- Antes de mergear una migración: reconfirmar que su número `V` sigue libre en master.
- Tope de 2–3 PRs abiertos por bot; cada fix con su test de regresión.
- Etiqueta `skip-scale-gate` (falsos positivos SCALE1): solo surte efecto con un push nuevo.
- Conflictos en `static/`: tomar la versión de master y reconstruir el front.
- Sin secretos ni IPs en el repo; gitleaks antes de cada push.

## PRs mergeados hoy (26-oct)
#333, #341, #339, #340, #342, #325, #337, #346, #334, #345 (master tras #345: 1b1fece8; tras #346: 7e9e2b27).

## Cola de merges (estado al cierre)
Scripts en el box: `/workspace/automerge7.sh` (en ejecución), luego `am8.sh`, `am9.sh` y `am10.sh`; logs en `/workspace/automerge*.log`. Plantilla saneada: `evidencia/hotclick-ci-cd/automerge.sh`.
Ojo: no encadenar con `pgrep -f` (se matchea a sí mismo); esperar por un PID concreto.

| Orden | PR | Head con APTO | Estado |
|---|---|---|---|
| 1 | #344 fix/visibilidad-impago | 0372c25f | APTO; esperando CI (automerge7) |
| 2 | #332 fix/comisiones-por-plan | 3abfc68d | APTO; esperando CI (automerge7) |
| 3 | #338 fix/telegram-antiabuso-dedup | c710d9b3 | APTO; verificar V199 libre en master (am8.sh) |
| 4 | #347 fix/login-reenviar-verificacion | 3f7e8f05 | APTO (am9.sh) |
| — | #343 fix/checkout-lock-expiracion-pedido-manual | 75f93a25 | APTO + `skip-scale-gate`, **HOLD**: Andrés debe decidir la excepción ENTREGADO con pago externo. No mergear. |
| — | #348 fix/roles-admin-billing-wallet | 45534a84 | Tests Java en rojo; con Bugs. Prioridad alta cuando vuelva. |
| — | #349 fix/marketplace-reqa-area3 | e05c0824 | Espera APTO (el anterior fue NO APTO por sobreventa: el webhook ONVO hace rollback tras capturar el pago, devuelve 500 y el pedido queda colgado). am10.sh está preparado: NO correrlo sin APTO. |
| — | #336 fix/checkout-bodega-default-front | f6e655e6 | Espera CI y APTO. |
| — | #329 feat/sentry-opcional | 3e1c837d | Actualizado con master (worktree /workspace/infra-sentry, rama local merge-329); necesita APTO nuevo. |

## Pendientes
- PR E2E (`feat/e2e-playwright-ci`) e **INF-04** (health-pager.yml, real-health.yml y keep-alive.yml todavía caen a onrender si falta HEALTH_URL): necesitan un token con scope `workflow`. El push del E2E fue rechazado por eso; el workflow está copiado en `evidencia/hotclick-ci-cd/e2e-workflow.md`.
- La CSP todavía incluye tilopay y clerk.
- BAJOs de Seguridad abiertos sobre #345 (y el BAJO de #329: el patrón BASIC redacta de más).
- Avisar a Dev Pagos y QA 8 (vía Grok Bot) para la prueba rápida de suscripción ONVO en modo test en el staging (#346 ya está en master), y a QA Cliente que el staging usa Mailpit.

## Staging local (en el box, NO es un servidor)
- Carpeta: `/workspace/staging-43188186` (worktree en master).
- Backend :8081 → `run-backend.sh` (jar `target/hot-click-outlet-1.0.0.jar`, JDK 21 en `/workspace/tools/jdk21`, perfil dev, `.env` local no versionado; `MAIL_PROVIDER=smtp`, `SPRING_MAIL_HOST=localhost`, `SPRING_MAIL_PORT=1025`).
- Front :3000 → `run-front.sh` (Vite con `VITE_API_PROXY=http://localhost:8081` y `CHOKIDAR_USEPOLLING=1`). PIDs en `backend.pid` y `front.pid`. Reiniciar con los scripts; **nunca con `pkill -n`**.
- Node 22: `/workspace/tools/node22/bin/node` (el Node del sistema es v20 y corepack está roto). pnpm 11.1.2 en `~/.local/pnpm11` (requiere Node 22 o más).
- Postgres en Docker (contenedor `stg-pg-43188186`); Mailpit en Docker (`stg-mailpit`, SMTP 1025, UI 8025).
- Para pararlo: `stop-staging.sh`. El puerto **8080 es de otro bot**: no tocarlo.
- Los inodos del box andan en ~89%: limpiezas ajenas ya borraron `node_modules`; reinstalar con pnpm 11 + Node 22.
- Copias saneadas: `docs/traspaso/evidencia/hotclick-ci-cd/run-*.sh` y `stop-staging.sh`.

## Mis ramas
- `feat/e2e-playwright-ci` (head 550e54181): solo local; push rechazado por falta del scope workflow.
- `fix/mail-provider-selector`: ya en origin, mergeada como #345.
- `merge-329` (local) = `feat/sentry-opcional` en origin (3e1c837d), sin commits pendientes.

## Evidencia
`docs/traspaso/evidencia/hotclick-ci-cd/`: scripts saneados, `e2e-workflow.md` y `cola-merges-logs.md`. Los logs completos quedan en `/workspace/automerge*.log` del box.

## Correcciones al README
(a) Errores o datos viejos (estado verificado con `gh pr view` y `git ls-remote` el 26-oct 15:38 CR):
- master ya no está en 1f54e30f: va en c48cb9ea o más nuevo.
- Hoy se mergearon #333, #341, #339, #340, #342, #325, #337, #346, #334, #345, #344, #338, #347, #349 y además #353 (15:26 CR, a96c77f7), #352 (15:29 CR, d985cba7), #348 (15:30 CR, d8f239be) y #343 (15:36 CR, 7c9ea22c). El paso 4 de "PARA EL BOT" los lista como abiertos: sacarlos; #343 ya no está en rojo.
- Siguen abiertos con APTO, en cola: #329 (3e1c837d), #332 (3abfc68d), #336 (fb1818da), #351 (E2E Playwright, 788e02e9) y #350 (e68039dc).
- Mi fila: la columna de estado dice que #351/#352 "ya pueden ir"; #352 ya entró y #351 está pusheado con APTO en cola. En "Mis ramas", `feat/e2e-playwright-ci` ya está en origin (head 788e02e9), no solo local. Inodos: ahora ~92 %, no ~89 %.
- Mis instrucciones dicen que nunca ejecuto merge/push: en la práctica corro la cola automerge y los push con OK de Andrés vía Grok Bot por cada PR (CI verde + APTO sobre el head exacto, sin deploy).

(b) Lo que le falta al reemplazo:
- Flyway en master quedó con `baseline-on-migrate` y `out-of-order` en false: confirmar `flyway_schema_history` en prod antes de cualquier deploy (lo hace Andrés).
- `HOTCLICK_NUMEROS_PROHIBIDOS` ya se pasa en ci.yml (#353), pero el test se omite hasta que el dueño cree el secret.
- La etiqueta `skip-scale-gate` solo aplica con un push nuevo al PR.
- El merge script usa `gh pr merge --match-head-commit <sha>`; al encadenar corridas, esperar por PID (`wait`/`kill -0`), no con `pgrep -f`, que se matchea a sí mismo.
- Conflictos en `static/`: tomar la versión de master y recompilar.
- pnpm 11 necesita Node 22 (`/workspace/tools/node22`); corepack está roto.
- Box con load alto: no lanzar builds pesados en paralelo. Puerto 8080 de otro bot.
- GitHub a veces da timeout de TLS: reintentar el merge (con el mismo `--match-head-commit`).

(c) Mejoras (le tocan a Andrés):
- Fijar por SHA las actions de los demás workflows (en #351 ya está pnpm/action-setup).
- Hacer obligatorio el check E2E en la protección de master cuando entre #351.
