# Agentes de ingeniería — PR gates (ola 1)

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
