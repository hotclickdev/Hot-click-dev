# Agentes de ingeniería — ola 5

Checks de GitHub Actions **independientes** de la ola 4 (PR #58: D6/D7/D8/D11/S4/E5, **abierto — no mergear ni depender de esos archivos**). Complementan olas 1–3 en `master`.

No toca lógica de pago/auth ni schedulers de negocio (`DataRetentionScheduler`, Hacienda, wallet, RAG). **Nunca** aplica SQL de escritura a producción.

Scripts: `scripts/eng-gates/` (`ola5-lib`, `ai-quota-alert`, `issues-hygiene`, `design-tokens-drift`, `ley8968-checklist`, `seller-qa-remap`, `hotfix-gate`, `pgbouncer-migration`). Tests: `node --test scripts/eng-gates/ola5.test.mjs` o `bash scripts/eng-gates/ola5-selftest.sh`.

## Resumen

| ID | Workflow | Trigger | Qué hace | Skip |
| --- | --- | --- | --- | --- |
| **D9** | `ai-quota-alert.yml` | Diario **05:00 America/Costa_Rica** (11:00 UTC) + dispatch | Si no hay URL de DB (`AI_USAGE_DATABASE_URL` / `DATABASE_URL` / `SUPABASE_*`): **skip honesto**. Si hay: `SELECT` a `hot_click_ai_uso_tb` (mismo criterio 80% que `AiControlController`). Issue + Telegram si tenant o plataforma ≥80%. Heurística de `AiQuotaService` si no hay live usage. **No inventa credenciales. No escribe en prod.** | `skip-ai-quota` |
| **D10** | `issues-hygiene.yml` | Diario 06:30 CR (12:30 UTC) + dispatch | PRs Dependabot: labels `deps-major` / `deps-patch` / `stale`. Comentario won't-merge si Spring Boot 4 / jjwt major / stripe major van **sin** label de bloqueo. Issues `eng-agent` stale: **comenta primero**; cierra solo tras ping + N días. **No** mass-close de `bug` / `outage` / `prod-errors`. | `skip-issues-hygiene` |
| **S5** | `design-tokens-drift.yml` | Lunes 08:30 CR (14:30 UTC) + dispatch | Hex y `style={{` en `frontend/src` fuera de `hotclick-tokens.css`. Respeta `.hc-superadmin-theme`. Issue `design-drift` + sugerencia de codemod. **No** PR de rewrite masivo. | `skip-design-tokens` |
| **S7** | `ley8968-checklist.yml` | Martes 08:00 CR (14:00 UTC) + dispatch | Heurística FE+BE: `/privacidad`, checkbox checkout, consentimiento vendedor, `POST /api/consentimiento` + IP, ARCO. Issue si falta. | `skip-ley8968` |
| **E12** | `seller-qa-remap.yml` | PR que toca `frontend/src/prototipo/**` / wizard seller + dispatch | Dry-run del mapa de specs de `.cursor/skills/hotclick-seller-qa`. Comenta si se rompe `/emprendedor`·`/pyme`·`/negocio-plus`. Smoke Playwright **opt-in** (`run_smoke`). CI acotado. | `skip-seller-qa` |
| **E14** | `hotfix-gate.yml` **y** job extra en `ci.yml` | PR a `master` (+ el job de CI siempre, no-op si no es hotfix) | En `hotfix/**`: Issue ligado con `outage`/`prod-errors` (o label) **y** gitleaks verde. Quita `safe-to-automerge` / `automerge-candidate` si falta. `ci.yml` `auto-merge` ahora `needs: [backend, frontend, hotfix-gate]` — el job **no se salta** en PRs normales (PASS no-op) para no romper el auto-merge en silencio. | `skip-hotfix-gate` |
| **E18** | `pgbouncer-migration.yml` | PR que agrega/cambia `V*.sql` | FAIL si `pg_advisory_lock`, `SET` de sesión, `LISTEN`/`NOTIFY`, `PREPARE` persistente. Recuerda `IF NOT EXISTS`. Comentario `file:line`. `UPDATE … SET` / `SET NOT NULL` no cuentan. | `skip-pgbouncer-migration` |
| — | `ola5-selftest.yml` | PR que toca estos scripts/workflows | `bash scripts/eng-gates/ola5-selftest.sh` + parseo YAML | — |

## Relación con olas 1–4 (no duplicar)

| Ya en master / #58 | Ola 5 |
| --- | --- |
| **E6** triage al abrir un PR Dependabot | **D10** barrido **diario** de abiertos + stale; labels extra `deps-*` |
| **S2** weekly Dependabot | D10 no mergea; no quita `needs-human` |
| **E2** PgBouncer en **Java** del diff | **E18** PgBouncer en **V*.sql** del PR |
| **E9** health → Issue `outage` | **E14** hotfix exige ese Issue/label + gitleaks |
| `ci.yml` auto-merge hotfix si backend+frontend verdes | E14 es check extra en el mismo workflow (`needs`) |
| Ola 4 **E5** Playwright por área (#58, no mergeado) | **E12** solo seller remap; dry-run propio (no importa `playwright-area.mjs`) |

## Secretos

Ningún secreto va en git. Tests sin placeholders de API keys de pago (evita gitleaks / E4).
En PRs, `security.yml` corre `scripts/eng-gates/gitleaks-scan.sh`: rango `base..head` **más** el árbol HEAD (`gitleaks dir`). No escanea historial de otras ramas abiertas (ola 4 / `35eb364`). Push a `master`: historial de HEAD, sin `--all`. Las reglas default no se relajan.

| Secreto / var | ¿Ola 5 lo pide? | Notas |
| --- | --- | --- |
| `GITHUB_TOKEN` | Sí (automático) | Issues D9/D10/S5/S7, comentarios E12/E14/E18, labels D10 |
| `AI_USAGE_DATABASE_URL` / `DATABASE_URL` / `SUPABASE_DB_URL` / `SUPABASE_BACKUP_URL` | Opcional D9 | Si **todos** faltan: el job **pasa** y declara skip. SELECT only. **Nunca se inventan.** `SUPABASE_BACKUP_URL` es el mismo del dump diario; D9 no lo usa como destino de restore. |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Opcional D9 | Ya los usa `ci.yml`. Si faltan, D9 solo abre Issue. |
| `SONAR_TOKEN`, `SENTRY_*` | No | Siguen en otras olas |

## Labels

| Label | Uso |
| --- | --- |
| `eng-agent` | Issues de agentes |
| `ai-quota` / `cost-alert` | Issue D9 |
| `design-drift` | Issue S5 |
| `compliance` | Issue S7 |
| `deps-major` / `deps-patch` / `stale` | PRs Dependabot (D10) |
| `outage` / `prod-errors` | E14 acepta estos en el PR o en el Issue ligado |
| `skip-ai-quota` / `skip-issues-hygiene` / `skip-design-tokens` / `skip-ley8968` / `skip-seller-qa` / `skip-hotfix-gate` / `skip-pgbouncer-migration` | Skip intencional |

## Corrida local

```bash
# D9 (sin URL → skip declarado)
node scripts/eng-gates/ai-quota-alert.mjs

# D10 (lista PRs/issues si hay gh)
node scripts/eng-gates/issues-hygiene.mjs

# S5 / S7
node scripts/eng-gates/design-tokens-drift.mjs
node scripts/eng-gates/ley8968-checklist.mjs

# E12 (como en un PR)
export BASE_SHA=<sha-master> HEAD_SHA=HEAD
node scripts/eng-gates/seller-qa-remap.mjs

# E14 (no-op si PR_HEAD_REF no es hotfix/)
PR_HEAD_REF=hotfix/x GITLEAKS_CONCLUSION=success PR_LABELS=outage node scripts/eng-gates/hotfix-gate.mjs

# E18
export BASE_SHA=<sha-master> HEAD_SHA=HEAD
node scripts/eng-gates/pgbouncer-migration.mjs

bash scripts/eng-gates/ola5-selftest.sh
```

Issues solo se upsertan con `GH_TOKEN` + `GITHUB_REPOSITORY`.
