# Traspaso: HotClick Dev Marketplace (ciclo áreas 2 y 3)

> Complementa a [`hotclick-dev-marketplace.md`](hotclick-dev-marketplace.md), que tiene el traspaso anterior: PRs del 26-oct, M-08, cómo se buildea `static/` y las decisiones de Andrés. Esta nota cubre el ciclo de las áreas 2 y 3. Sin secretos ni datos personales.

## Rol y áreas
- Dev full stack en `hotclickdev/Hot-click-dev` (Spring Boot 3 / Java 21 en `Hot_click_outlet/`, React + Vite + pnpm, Postgres + Flyway).
- Áreas a cargo: **2 (cuentas y roles)** y **3 (marketplace)**.
- Las áreas 6 y 9 se las pasé a **Dev Marketplace 2**.
- El Mentor habla por Andrés en estas áreas: push, PRs y merge con CI verde más el APTO de Seguridad. Deploy y gastos siguen prohibidos.

## Reglas
- Push y PRs propios, con un máximo de 3 abiertos. Nada de force, `--no-verify` ni rebase.
- Merge solo con CI verde y el APTO de Seguridad sobre el hash exacto:
  `gh pr merge N -R hotclickdev/Hot-click-dev --merge --match-head-commit <hash>`.
- Cualquier push nuevo invalida el APTO, así que tenés que pedirlo otra vez sobre el hash nuevo.
- Conflictos con master: se arreglan con un `git merge origin/master` puro.
- Nunca deploy, gastos, cuentas ni servidores nuevos.
- ONVO es fail-closed y el único procesador. Tilopay y Stripe son deuda técnica.
- Flyway solo aditivo y numerado después de V200.
- Cada fix lleva su test de regresión.
- Los commits de `static/` van aparte. Se buildea con `env -i` (solo HOME y PATH), sin `VITE_*`, y después revisás que no tenga `pk_test_placeholder` ni `ci-spa-gate`.
- Tests locales solo targeted (`-Dtest=...`), bajo `flock /workspace/hotclick/.suite-completa.lock`. La suite completa corre en CI.
- Los inodos del box están casi llenos. Reusá worktrees en vez de crear nuevos. Sin `git stash` ni `pkill`.
- `gitleaks protect --staged` antes de cada commit.

## Estado
PRs mergeados en este ciclo (verificar con `gh pr view N --json state,mergeCommit`):

| PR | Tema | Merge |
|---|---|---|
| #376 | Roles admin, `SoloPropietarioNegocioInterceptor` | 523768f0 |
| #385 | Gift cards y generar-ia solo propietario; empresaId null falla cerrado | 13d76c49 |
| #387 | 2FA con contraseña, rate limit por usuario, secreto pendiente (V203) | 0c85eb2d |
| #390 | Gift cards: rate limit en validar, códigos de 8 a 30, monto validado | 98a7a85c |
| #392 | A-1: la importación masiva pasa por `ProductoAltaService.crearSaneado` | 9a9afe8f |
| #396 | BAJOs B1/B3/B4 de gift card y 2FA, enmascarado, static/ limpio | 94c1ad09 |
| #402 | `BodegaTenantGuard`, import saneado, `crearYPublicar` atómico | 72eb8add |
| #405 | Telegram usa crearYPublicar, ErrorPublico en el 500 del import | 5061c30b |
| #408 | Lockout por usuario+IP, bloqueo temporal, scheduler de limpieza, IPv6 /64 | e8a07b89 |
| #410 | Mensajes públicos en el import y en el alta de productos | 96cf7a10 |
| #412 | ErrorPublico como allowlist por origen (`MensajePublicoSeguro`) | db591d1f |
| #414 | Liberación de contadores en desbloqueos, WebAuthn, NAT64 | 6e83820b |
| #415 | ErrorPublico más estricto (causa, primer frame, URLs, hosts, rutas) | cd1f9592 |
| #417 | LOWs de #414: limpieza afterCommit/REQUIRES_NEW, WebAuthn sin tokens huérfanos | 128a6637 |
| #420 | LOWs de #415 y #417 (`LiberadorFallos`, TLDs, tope en `pareceInterno`) | 271440ea |

PRs propios abiertos: **ninguno**. #421, #422, #424 y #363 son de otros agentes. Confirmalo con `gh pr list -R hotclickdev/Hot-click-dev`.

## Pendientes
a. **Área 3**: espera la decisión **A-2** de Andrés.
b. **B2**: las cuentas sin contraseña local no pueden activar 2FA. Espera a Andrés, no lo toqués.
c. LOWs de Seguridad en #420:
   - El denylist de TLDs de ErrorPublico está incompleto (`.ai .us .tech .site .online .store .tv`) y no cubre hosts como `hotclick-db` o `postgres`.
   - El comentario de `WebAuthnController:100-101` quedó desactualizado.
   - Falta una métrica para cuando falla `LiberadorFallos` (el bucket dura hasta 30 min y falla hacia disponibilidad).
d. Convenciones:
   - No relanzar con `new IllegalStateException(e.getMessage())` sin pasar la causa.
   - Los tests de Mockito que revisan el texto usan `doAnswer` en vez de `doThrow(new ...)`.
e. Pasado a otros:
   - Datos en `RecursoNoEncontradoException` y `CorreoYaRegistradoException` (L3/L4): **Mentor**.
   - Oráculo de bodega en `VentaService` y `PosVentaService`: **Dev Pagos**.
   - URI codificada en `RateLimitingFilter`: **Bugs**.
   - `xlsx` está suprimido en el allowlist de osv hasta el 2026-12-31, pero parsea archivos subidos. Lo mitiga `sanitizarFilaImportada`.
   - El gate E3 es inconsistente porque compara contra un build con placeholders: **CI/CD**.

## Cómo continuar
1. Cargá la skill `hot-click-dev-workflow`.
2. `git fetch` y reusá un worktree existente.
3. Arrancá un PR de seguimiento con los LOWs del punto (c), con su test de regresión.
4. Pedí el APTO a Seguridad sobre el hash exacto y mergeá con `--match-head-commit`.
5. Formato de reporte: **Tarea | Estado | Hecho | Evidencia | Archivos | Riesgos | Bloqueos | Siguiente paso**.
