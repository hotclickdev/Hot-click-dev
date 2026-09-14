# Agentes de ingeniería — PR gates (ola 1)

> **DISABLED 2026-09-14 — awaiting reorg.**  
> Todos los workflows de esta suite son `workflow_dispatch` only (no `pull_request` / `schedule` / `push` / `workflow_run`). Cómo reactivar: [`AGENTES_DISABLED.md`](./AGENTES_DISABLED.md).

Dashboard I1: **en el admin** [`/admin/agentes`](../Hot_click_outlet/frontend/src/pages/admin/AdminAgentes.tsx) (Spring sirve la SPA; catálogo de solo lectura mientras está pausado). Espejo opcional Next/Vercel: [`agentes-dashboard/README.md`](../agentes-dashboard/README.md). Inspector local: `npm run inspect` en `agentes-dashboard/`. El workflow [`inspect-agents.yml`](../.github/workflows/inspect-agents.yml) está pausado (solo `workflow_dispatch`). El JSON también vive en `Hot_click_outlet/src/main/resources/agentes/`.

Checks de GitHub Actions que corren **al lado** de `ci.yml`, `security.yml`, `sonarcloud.yml`, `backup.yml` y `keep-alive.yml`. No tocan schedulers de negocio (DataRetention, Hacienda, wallet, RAG) ni lógica de pago/auth.

Los scripts viven en `scripts/eng-gates/` (Node 22, sin dependencias). Tests: `node --test scripts/eng-gates/eng-gates.test.mjs`.

## Resumen

| ID | Workflow | Trigger | Qué hace | Skip label |
| --- | --- | --- | --- | --- |
| E1 | `gate-flyway.yml` | PR a `master` si cambian entidades `**/model/**` (o `**/entity/**`), migraciones o `Actualizado.sql` | Falla si el diff de JPA parece cambio de esquema y **no** hay `V*__.sql` nuevo/actualizado. Recuerda sincronizar `Actualizado.sql` si existe. **No aplica SQL a prod.** | `skip-flyway-gate` |
| E2 | `gate-tenant.yml` | PR que toca `controller` / `service` / `repository` Java | Escanea el **diff**: `findById(` de ids de cliente, `@Async`/threads que pierden `TenantContext`, `SET`/`LISTEN`/`pg_advisory_*` (PgBouncer). Comenta el PR con líneas. Falla en riesgos altos de endpoint/infra. | `skip-tenant-gate` |
| E3 | `gate-spa.yml` | PR que toca `Hot_click_outlet/frontend/src/**` o `static/` | Si `frontend/src` cambió y `static/` también → PASS. Si `static/` no vino en el PR → `pnpm build` y FAIL si el bundle queda stale. Docker **no** buildea React. | `skip-spa-gate` |
| E6 | `dependabot-triage.yml` | Todo PR a `master` (no-op si no es Dependabot) | Auto-label. Patch/minor no críticos → `automerge-candidate`. Majors de `spring-boot*`, `jjwt-*`, `stripe-java` y **cualquier Spring Boot 4.x** → `needs-human`, corta auto-merge, comenta riesgo. | `skip-dependabot-gate` |
| E11 | `gate-sensitive.yml` | PR que toca `Payment*` / `Auth*` / `Pos*` / `Sinpe*` / `Wallet*` en `src/main/java` | Liviano: exige que exista un test nominal (`*Payment*Test*.java`, etc.). No corre Maven. | `skip-sensitive-gate` |
| DOC1 | `docs-stack.yml` | Semanal (lunes) + `workflow_dispatch` | Regenera `docs/GENERATED_STACK.md` (Java/Flyway/React/módulos), artifact, issue semanal, PR si el fingerprint cambió. Parches seguros de README/ESTADO_ACTUAL solo con `--apply-safe-docs`. | — |
| SCALE1 | `gate-scale.yml` | PR Java/TS/static + semanal | Diff: `findAll`/listas sin Pageable, N+1, I/O bloqueante en controllers (FAIL P1); `@Transactional` gordo / imports pesados (WARN). Semanal: issue de hotspots por tamaño + `findAll`. | `skip-scale-gate` |
| D5 | `backup.yml` → job `verify-backup` | Schedule / `workflow_dispatch` (igual que el dump) | Tras el artifact de `pg_dump`, falla si el dump no existe o pesa &lt; 1 KB. Abre/comenta issue `[D5] Backup diario…`. | — |
| — | `eng-gates-selftest.yml` | PR que toca scripts/workflows de gates | `node --test` de los gates | — |

## Cómo saltear un gate

Solo con **label intencional** en el PR (ver tabla). El skip queda en el log del job. No uses skip para “ya lo revisé a ojo” en un `findById` nuevo o un major de Spring Boot.

E6 opt-in de squash: además de `automerge-candidate`, un humano pone `safe-to-automerge`. El workflow habilita `gh pr merge --squash --auto` **solo** entonces (y nunca si hay `needs-human`). CI de `ci.yml` sigue siendo el que tiene que pasar para que GitHub mergee.

## Labels que crea/usa E6

| Label | Uso |
| --- | --- |
| `dependabot` | PR de Dependabot |
| `semver-patch` / `semver-minor` / `semver-major` | Tipo de bump parseado del título |
| `automerge-candidate` | Patch/minor no crítico — **no** se mergea solo |
| `safe-to-automerge` | Opt-in humano para squash auto-merge |
| `needs-human` | Major, Spring Boot minor/major, o título sin semver |
| `spring-boot-major` | Destino Spring Boot 4+ |

## Secretos

Estos gates **no piden secretos nuevos**. `GITHUB_TOKEN` (automático) alcanza para comentarios, labels, issues y el PR semanal de DOC1 (`docs/generated-stack`).

Secretos que **ya** usa el repo y siguen igual:

| Secreto | Workflow | Notas |
| --- | --- | --- |
| `GITHUB_TOKEN` | todos | Automático. Comentarios de PR / issues D5 / labels |
| `SUPABASE_BACKUP_URL` | `backup.yml` | URL de `pg_dump`. D5 no inventa credenciales: si falta, el dump (y D5) fallan |
| `SUPABASE_DB_PASSWORD` | `backup.yml` | `PGPASSWORD` del dump |
| `SONAR_TOKEN` | `sonarcloud.yml` | Sin esto Sonar no publica; no lo usan los gates ola 1. El job reintenta 1 vez si sonarcloud.io responde 503 |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | `ci.yml` | Notificaciones de CI; no los usan los gates |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` | app / `ci.yml` | El gate E3 pone `VITE_SENTRY_DSN=""` a propósito (bundle determinista). No commitear el DSN |

No hay `SENTRY_TOKEN` en estos workflows. Si más adelante se suben sourcemaps, iría como secreto de repo — no en git.

## Branch protection (recomendado)

En `master`, marcar como required cuando quieras bloquear merge:

- `E1 Flyway vs entidades JPA`
- `E2 Tenant / IDOR / PgBouncer`
- `E3 Artefactos static/ vs frontend/src`
- `E11 Tests nominales Payment/Auth/Pos/Sinpe/Wallet`
- `E6 Labels y bloqueo de majors críticos` (este job siempre reporta: PASS en PRs no-Dependabot)
- `SCALE1 Diff review`

Los workflows E1/E2/E3/E11 usan *path filters*. Un check required que **no llega a correr** puede quedar en pending. Si eso molesta, quitá el `paths:` del YAML (los scripts ya hacen no-op si el diff no aplica) o usá “required only when the workflow runs” según la UI de GitHub.

## Corrida local

```bash
export BASE_SHA=<sha-de-master> HEAD_SHA=HEAD
# opcional: PR_LABELS=skip-flyway-gate
node scripts/eng-gates/gate-flyway.mjs
node scripts/eng-gates/gate-tenant.mjs
node scripts/eng-gates/gate-spa.mjs
node scripts/eng-gates/gate-sensitive.mjs

PR_TITLE='Bump axios from 1.7.0 to 1.7.1' node scripts/eng-gates/dependabot-triage.mjs

# D5 contra un directorio con un .sql.gz de prueba
bash scripts/eng-gates/verify-backup.sh /tmp/backup-artifact 1024

node --test scripts/eng-gates/eng-gates.test.mjs

# DOC1
scripts/generate-stack-docs.sh
scripts/generate-stack-docs.sh --apply-safe-docs

# SCALE1 (mismo BASE_SHA/HEAD_SHA)
node scripts/eng-gates/gate-scale.mjs
```

E2 y E1 comentan el PR solo si hay `GH_TOKEN`, `GITHUB_REPOSITORY` y `PR_NUMBER`.

## Olas siguientes (detalle en su doc)

| Ola | Doc | IDs | Estado |
| --- | --- | --- | --- |
| 2 (PR #56) | [AGENTES_OLA2.md](AGENTES_OLA2.md) | D2, S1, S3, E10, S8 | `master` |
| 3 (PR #57) | [AGENTES_OLA3.md](AGENTES_OLA3.md) | D1, D3, D4+E8, S2, E4, E7, E9 | `master` |
| 4 (PR #58) | [AGENTES_OLA4.md](AGENTES_OLA4.md) | D6, D7, D8, D11, S4, E5 | `master` |
| 5 (PR #59) | [AGENTES_OLA5.md](AGENTES_OLA5.md) | D9, D10, S5, S7, E12, E14, E18 | `master` |
| 6 (PR #60) | [AGENTES_OLA6.md](AGENTES_OLA6.md) | S6, S9, S10, S11, S12, E13, E15, E17 | `master` (`cf787a62`) |
| 7 (PR #61) | [AGENTES_OLA7.md](AGENTES_OLA7.md) | D12, S14, E16 | `master` (`366dd505`) |

La ola 3 **no** reimplementa E1/E3/E6: D1/D3/S2 son heartbeats diarios/semanales sobre el mismo tema.
La ola 4 **no** reimplementa E7/D2/S3/Gitleaks: D6/S4/E5/D8 son hunters o subsets al lado.
La ola 5 complementa olas 1–4 (D9/D10/S5/S7/E12/E14/E18). Gitleaks en PRs usa rango `base..head` + árbol HEAD (`gitleaks-scan.sh`), no `--all`.
La ola 6 complementa olas 1–5 (S6 k6/Hikari, S9 lint:ci+bundle, S10 god-class, S11 Hacienda XML, S12 RAG lag, E13 push SPA, E15 spike de Issue, E17 i18n PR vs D7).
La ola 7 no reimplementa ola 6. Cierra D12/S14/E16. I1 (inspector + dashboard) no es un gate: mira el catálogo y escribe `agentes-dashboard/data/inspections.json`.

## Cobertura del catálogo (eng gates)

Checklist del menú original vs `master`. El tablero UI es I1 (`agentes-dashboard/`).

| ID | Qué | Dónde | Estado |
| --- | --- | --- | --- |
| E1 | Flyway vs JPA (PR) | `gate-flyway.yml` | master (ola 1) |
| E2 | Tenant / IDOR / PgBouncer (PR Java) | `gate-tenant.yml` | master (ola 1) |
| E3 | SPA `static/` vs `frontend/src` | `gate-spa.yml` | master (ola 1) |
| E4 | Commit-gate (debug/secretos/tests) | `commit-gate.yml` | master (ola 3) |
| E5 | Playwright area (PR, dry-run) | `playwright-area.yml` | master (ola 4) |
| E6 | Dependabot triage | `dependabot-triage.yml` | master (ola 1) |
| E7 | CI red → comentario PR | `ci-red-diagnose.yml` | master (ola 3) |
| E8 | Sentry prod-errors (con D4) | `sentry-digest.yml` | master (ola 3) |
| E9 | Health status-only pager | `health-pager.yml` | master (ola 3) |
| E10 | Authz catch-all vs mappings | `gate-authz.yml` | master (ola 2) |
| E11 | Tests nominales Payment/Auth/Pos | `gate-sensitive.yml` | master (ola 1) |
| E12 | Seller QA remap | `seller-qa-remap.yml` | master (ola 5) |
| E13 | SPA reminder en push a master | `spa-push-reminder.yml` | master (ola 6) |
| E14 | Hotfix gate + gitleaks | `hotfix-gate.yml` | master (ola 5) |
| E15 | Spike en issues bug/pago/pos | `product-issue-spike.yml` | master (ola 6) |
| E16 | Runtime Payment/Webhook/Factura → Issue | `runtime-endpoint-issue.yml` | master (ola 7, PR #61) |
| E17 | i18n keys en el PR | `i18n-pr-gate.yml` | master (ola 6) |
| E18 | PgBouncer en `V*.sql` | `pgbouncer-migration.yml` | master (ola 5) |
| D1 | Flyway↔JPA diario | `flyway-jpa-drift.yml` | master (ola 3) |
| D2 | Hunter IDOR diario | `hunter-idor.yml` | master (ola 2) |
| D3 | SPA stale diario | `spa-stale.yml` | master (ola 3) |
| D4 | Sentry digest | `sentry-digest.yml` | master (ola 3) |
| D5 | Backup dump no vacío | `backup.yml` `verify-backup` | master (ola 1) |
| D6 | Flake hunter CI | `flake-hunter.yml` | master (ola 4) |
| D7 | i18n ES/EN/PT diario | `i18n-drift.yml` | master (ola 4) |
| D8 | Secrets en docs | `secrets-in-docs.yml` | master (ola 4) |
| D9 | AI quota 80% | `ai-quota-alert.yml` | master (ola 5) |
| D10 | Hygiene issues/PRs | `issues-hygiene.yml` | master (ola 5) |
| D11 | Contrato API FE↔BE | `api-contract-drift.yml` | master (ola 4) |
| D12 | Health real (cuerpo, no keep-alive) | `real-health.yml` | master (ola 7, PR #61) |
| S1 | Sonar batch semanal | `sonar-batch.yml` | master (ola 2) |
| S2 | Dependabot weekly | `dependabot-weekly.yml` | master (ola 3) |
| S3 | E2E gap map | `e2e-gap-map.yml` | master (ola 2) |
| S4 | IDOR suite gaps | `idor-suite-gap.yml` | master (ola 4) |
| S5 | Design tokens drift | `design-tokens-drift.yml` | master (ola 5) |
| S6 | k6 / Hikari | `k6-hikari-regression.yml` | master (ola 6) |
| S7 | Ley 8968 checklist | `ley8968-checklist.yml` | master (ola 5) |
| S8 | Restore drill | `restore-drill.yml` | master (ola 2) |
| S9 | lint:ci vs bundle | `bundle-lint-ci.yml` | master (ola 6) |
| S10 | God-class extract proposal | `god-class-extract.yml` | master (ola 6) |
| S11 | Hacienda XML drift | `hacienda-xml-drift.yml` | master (ola 6) |
| S12 | RAG embeddings lag | `rag-embeddings-lag.yml` | master (ola 6) |
| S14 | a11y + POS keyboard | `a11y-pos-keyboard.yml` | master (ola 7, PR #61) |
| DOC1 | Stack docs | `docs-stack.yml` | master (ola 1) |
| SCALE1 | Listas / N+1 | `gate-scale.yml` | master (ola 1) |
| I1 `/agentes` | Tablero + inspector | `agentes-dashboard/` + `inspect-agents.yml` | **este PR** (dashboard durable) |

S13 no está en ninguna ola (el cierre de catálogo saltó S13). No reabrir pago/auth ni schedulers de negocio.
