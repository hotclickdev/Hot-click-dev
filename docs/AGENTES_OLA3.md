# Agentes de ingeniería — ola 3

Checks de GitHub Actions **independientes** de la ola 1 (PR #55: E1/E2/E3/E6/E11/D5 + DOC1 + SCALE1) y la ola 2 (PR #56: D2/S1/S3/E10/S8). Complementan; **no** reimplementan esos gates.

No toca lógica de pago/auth ni schedulers de negocio (`DataRetentionScheduler`, Hacienda, wallet, RAG). **Nunca** aplica SQL a producción ni hace `git push` para despertar Render.

Scripts: `scripts/eng-gates/` (`flyway-jpa-drift`, `spa-stale`, `sentry-digest`, `dependabot-weekly`, `commit-gate`, `ci-red-diagnose`, `health-pager`, `ola3-lib`). Tests: `node --test scripts/eng-gates/ola3.test.mjs` o `bash scripts/eng-gates/ola3-selftest.sh`.

## Resumen

| ID | Workflow | Trigger | Qué hace | Skip |
| --- | --- | --- | --- | --- |
| **D1** | `flyway-jpa-drift.yml` | Cron diario **02:00 America/Costa_Rica** (08:00 UTC) + `workflow_dispatch` | Diff `@Entity`/`@Table`/`@Column`/`@JoinColumn` en `com.hotclick.model` vs `db/migration/V*__.sql` (+ `Actualizado.sql`). Abre/actualiza Issue `schema-drift` con `V{N+1}__…sql` sugerido y columnas/tablas faltantes. **No ejecuta SQL.** | `skip-flyway-drift` |
| **D3** | `spa-stale.yml` | Diario 02:15 CR (08:15 UTC) + dispatch | Compara SHA/mtime de commit y tree hash de `frontend/src` vs `static/`. Issue `spa-stale` si React cambió sin evidencia de rebuild. Complementa E3 (PR + `pnpm build`). | `skip-spa-stale` |
| **D4 + E8** | `sentry-digest.yml` | Diario 03:00 CR (09:00 UTC) + dispatch | Si hay `SENTRY_TOKEN`: tira unresolved de Sentry y abre Issues dedup (`sentry` / `prod-errors`) con endpoint + release/SHA. Documenta `SentryWebhookService` (`POST /api/webhooks/sentry`). Si **no** hay token: el job corre, declara el skip y, si keep-alive falló ≥2 veces, Issue liviano. **No inventa tokens.** | `skip-sentry-digest` |
| **S2** | `dependabot-weekly.yml` | Lunes 09:00 CR (15:00 UTC) + dispatch | Clasifica PRs Dependabot abiertos (reusa `evaluateDependabot` de E6). Patch/minor con CI verde → comentario + `automerge-candidate`. Majors `spring-boot*`, `jjwt-*`, `stripe-java` → Issue `needs-human`. **No mergea majors** ni quita labels de E6. | `skip-deps-weekly` |
| **E4** | `commit-gate.yml` | `pull_request` a `master` + dispatch | Espíritu de `.cursor/skills/commit-gate`: bloquea debug/secretos/`.env`; evalúa E1/E2/E3/E11 en el diff; `pnpm test` si tocó `frontend/src`; `mvn -Dtest=` de clases `*Test` tocadas (máx 8). Comenta `VEREDICTO: LISTO\|BLOQUEADO`. Timeouts 8/10 min. Sin E2E. | `skip-commit-gate` |
| **E7** | `ci-red-diagnose.yml` | `workflow_run` de `CI — Tests y Build` en failure (+ dispatch) | Comenta el PR (sticky `hotclick-e7-ci-red`) con job fallido + últimas ~30 líneas + hint flake vs regresión vs master. Dedup. | `skip-ci-red` |
| **E9** | `health-pager.yml` (+ `keep-alive.yml`) | Cada 10 min + dispatch | Ping a `/api/health` (o `HEALTH_URL`). Dos ≠200 seguidos → Issue `outage` + Telegram si `TELEGRAM_*` existen. `keep-alive.yml` sigue pineando Render. **No git push.** | `skip-health-pager` |
| — | `ola3-selftest.yml` | PR que toca estos scripts/workflows | `bash scripts/eng-gates/ola3-selftest.sh` | — |

## Relación con olas 1 y 2 (no duplicar)

| Ya en master | Ola 3 |
| --- | --- |
| **E1** Flyway en el **diff del PR** | **D1** drift **diario** árbol JPA ↔ `V*__.sql` → Issue |
| **E3** SPA en el PR (`pnpm build` si falta `static/`) | **D3** heartbeat diario hash/mtime `static/` vs `frontend/src` |
| **E6** triage al abrir un PR Dependabot | **S2** barrido **semanal** de PRs abiertos; mismas labels |
| `SentryWebhookService` inbound → Telegram | **D4/E8** pull API → Issues; skip claro sin token |
| `ci.yml` notify-failure Telegram | **E7** comentario en el PR con log recortado |
| `keep-alive.yml` ping cada 10 min | **E9** racha de 2 fallos → Issue outage |
| **D2** hunter IDOR diario | sin cambio (no se reimplementa) |

Ola 4 (D6/D7/D8/D11/S4/E5): [AGENTES_OLA4.md](AGENTES_OLA4.md). No reimplementa D1–D4/E4/E7/E9.

Ola 5 (D9/D10/S5/S7/E12/E14/E18): [AGENTES_OLA5.md](AGENTES_OLA5.md).

## Secretos

Ningún secreto va en git. `GITHUB_TOKEN` automático alcanza para Issues/comentarios.

| Secreto / var | ¿Ola 3 lo pide? | Notas |
| --- | --- | --- |
| `GITHUB_TOKEN` | Sí (automático) | Issues D1/D3/D4/S2/E9, comentarios E4/E7/S2 |
| `SENTRY_TOKEN` | Opcional D4/E8 | Auth token Sentry (`event:read`). Si falta, el workflow **pasa** y declara “Sentry omitido”. No usar el DSN de la app. |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Opcional (Actions **variables**) | Default `hotclick` / `hot-click-dev`. Ajustar si el slug real es otro. |
| `SENTRY_DSN` / `VITE_SENTRY_DSN` / `SENTRY_WEBHOOK_SECRET` | No | Siguen en la app / `ci.yml`. El webhook inbound no se reemplaza. |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Opcional E9 | Ya los usa `ci.yml`. Si faltan, E9 solo abre Issue. |
| `HEALTH_URL` | Opcional E9 / keep-alive | Override del ping. Default `https://hot-click-dev.onrender.com/api/health`. |
| `SONAR_TOKEN`, `SUPABASE_*` | No | Siguen en ola 1/2 |

## Labels

| Label | Uso |
| --- | --- |
| `schema-drift` | Issue D1 |
| `spa-stale` | Issue D3 |
| `sentry` / `prod-errors` | Issues D4/E8 |
| `outage` | Issue E9 |
| `automerge-candidate` / `needs-human` / `dependabot` | S2, mismas que E6 — no se quitan |
| `eng-agent` | Issues de agentes |
| `skip-flyway-drift` / `skip-spa-stale` / `skip-sentry-digest` / `skip-deps-weekly` / `skip-commit-gate` / `skip-ci-red` / `skip-health-pager` | Skip intencional |

## Corrida local

```bash
# D1
node scripts/eng-gates/flyway-jpa-drift.mjs

# D3
node scripts/eng-gates/spa-stale.mjs

# D4 (sin token → skip declarado)
node scripts/eng-gates/sentry-digest.mjs

# S2 (lista PRs si hay gh)
node scripts/eng-gates/dependabot-weekly.mjs

# E4 (como en un PR)
export BASE_SHA=<sha-master> HEAD_SHA=HEAD
node scripts/eng-gates/commit-gate.mjs

# E9 (no pega prod si pasás runner/status)
HEALTH_STATUS=200 HEALTH_STATE_FILE=/tmp/health-state.json node scripts/eng-gates/health-pager.mjs

bash scripts/eng-gates/ola3-selftest.sh
```

Issues solo se upsertan con `GH_TOKEN` + `GITHUB_REPOSITORY`.
