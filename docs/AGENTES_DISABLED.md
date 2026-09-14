# Agentes de ingeniería — pausados (2026-09-14)

> **DISABLED 2026-09-14 — awaiting reorg.**  
> Toda la suite de agentes (olas 1–7) está detenida. No corre en `schedule`, `pull_request`, `push`, `workflow_run` ni `issues`. Los YAML y scripts **siguen en el repo** para reorganizarlos desde cero.

Motivo: la suite no aporta productividad ahora. Se apaga todo; se vuelve a armar después.

## Cómo reactivar un workflow

1. Abrí `.github/workflows/<archivo>.yml`.
2. Buscá el bloque comentado `# ORIGINAL TRIGGERS (restore to re-enable):`.
3. Restauré ese `on:` (descomentá) y quitá el `on: workflow_dispatch` de pausa (o dejalo **además** si querés trigger manual).
4. Borrá el comentario `# DISABLED 2026-09-14 — awaiting reorg`.
5. Si el job tiene `if: github.event_name == 'pull_request'` / `schedule`, no hace falta tocarlo: vuelve a aplicar con el trigger original.

Los scripts en `scripts/eng-gates/` no se tocaron. Tests locales: `node --test scripts/eng-gates/*.test.mjs`.

## UI `/admin/agentes`

El producto canónico es el admin Spring (`/admin/agentes`, PR #63). Páginas intactas + banner *Pausado — reorganización*. Catálogo de solo lectura. El espejo Next (`agentes-dashboard/`, rutas `/agentes`) lleva el mismo aviso. El inspector I1 local (`npm run inspect`) sigue pudiendo correr a mano; el Action semanal no.

## Qué quedó pausado (inerte, no borrado)

`on:` de cada archivo = solo `workflow_dispatch` (manual).

| Archivo | ID / nombre |
| --- | --- |
| `gate-flyway.yml` | E1 Flyway |
| `gate-tenant.yml` | E2 Tenant / IDOR |
| `gate-spa.yml` | E3 SPA static |
| `commit-gate.yml` | E4 Commit-gate |
| `dependabot-triage.yml` | E6 Dependabot triage |
| `ci-red-diagnose.yml` | E7 CI red |
| `health-pager.yml` | E9 Health pager |
| `gate-sensitive.yml` | E11 Sensitive tests |
| `seller-qa-remap.yml` | E12 Seller QA |
| `hotfix-gate.yml` | E14 Hotfix extra check |
| `product-issue-spike.yml` | E15 Issue spike |
| `runtime-endpoint-issue.yml` | E16 Runtime endpoint |
| `a11y-pos-keyboard.yml` | S14 a11y POS |
| `pgbouncer-migration.yml` | E18 PgBouncer SQL |
| `gate-authz.yml` | Authz gate |
| `gate-scale.yml` | SCALE1 |
| `docs-stack.yml` | DOC1 |
| `eng-gates-selftest.yml` | Ola 1 selftest |
| `hunter-idor.yml` | Hunter IDOR |
| `sonar-batch.yml` | Sonar batch |
| `e2e-gap-map.yml` | E2E gap |
| `restore-drill.yml` | Restore drill |
| `flyway-jpa-drift.yml` | Flyway↔JPA drift |
| `spa-stale.yml` | SPA stale |
| `sentry-digest.yml` | Sentry digest |
| `dependabot-weekly.yml` | Dependabot weekly |
| `flake-hunter.yml` | Flake hunter |
| `i18n-drift.yml` | i18n drift |
| `secrets-in-docs.yml` | Secrets in docs |
| `api-contract-drift.yml` | API contract |
| `idor-suite-gap.yml` | IDOR suite gap |
| `playwright-area.yml` | Playwright area |
| `ai-quota-alert.yml` | D9 AI quota |
| `issues-hygiene.yml` | D10 Issues hygiene |
| `design-tokens-drift.yml` | S5 Design tokens |
| `ley8968-checklist.yml` | S7 Ley 8968 |
| `k6-hikari-regression.yml` | k6 / Hikari |
| `bundle-lint-ci.yml` | Lint bundle |
| `god-class-extract.yml` | God class |
| `hacienda-xml-drift.yml` | Hacienda XML |
| `rag-embeddings-lag.yml` | RAG lag |
| `spa-push-reminder.yml` | SPA push reminder |
| `i18n-pr-gate.yml` | i18n PR gate |
| `real-health.yml` | D12 Real health |
| `inspect-agents.yml` | I1 Inspect |
| `ola2-selftest.yml` | Ola 2 selftest |
| `ola3-selftest.yml` | Ola 3 selftest |
| `ola4-selftest.yml` | Ola 4 selftest |
| `ola5-selftest.yml` | Ola 5 selftest |
| `ola6-selftest.yml` | Ola 6 selftest |
| `ola7-selftest.yml` | Ola 7 selftest |

Jobs extra (no se apagó el workflow entero):

| Dónde | Qué se pausó |
| --- | --- |
| `backup.yml` job `verify-backup` | D5 — `if: false`. El dump diario **sigue**. |
| `ci.yml` job `hotfix-gate` | E14 — **quitado**. Auto-merge hotfix vuelve a `needs: [backend, frontend]`. |
| `keep-alive.yml` | Ping **sigue**. Se quitó el texto de E9 pager. |

`.github/dependabot.yml` **no** se tocó (config de Dependabot GitHub). Solo se pausó `dependabot-triage.yml`.

## Qué sigue activo

| Workflow / job | Trigger |
| --- | --- |
| `ci.yml` — Tests Java | push / PR a `master` |
| `ci.yml` — Build React (Vitest + Playwright + `pnpm build`) | push / PR a `master` |
| `ci.yml` — Telegram notify on failure | si Java o React fallan |
| `ci.yml` — Auto-merge hotfix | si CI pasa y la rama es `hotfix/*` (como **antes** de los agentes) |
| `security.yml` — gitleaks | push / PR a `master` (`scripts/eng-gates/gitleaks-scan.sh` se deja: el scan de secretos tiene que seguir andando) |
| `sonarcloud.yml` | push / PR a `master` |
| `backup.yml` — job `backup` (pg_dump) | cron diario 06:00 UTC + dispatch |
| `keep-alive.yml` — ping Render | cada 10 min + dispatch |

No se tocó lógica de pago/auth, ni schedulers de negocio Spring (`DataRetentionScheduler`, Hacienda, wallet, RAG).

## Relacionado

- Catálogo histórico: [`AGENTES_ENG_GATES.md`](./AGENTES_ENG_GATES.md) (también marcado DISABLED).
- Olas: `docs/AGENTES_OLA2.md` … `AGENTES_OLA7.md` (docs; los workflows ya no disparan).
- Dashboard: [`agentes-dashboard/README.md`](../agentes-dashboard/README.md).
