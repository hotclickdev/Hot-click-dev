# Agentes de ingeniería — ola 4

Checks de GitHub Actions **independientes** de la ola 1 (E1/E2/E3/E6/E11/D5 + DOC1 + SCALE1), ola 2 (D2/S1/S3/E10/S8) y ola 3 (D1/D3/D4+E8/S2/E4/E7/E9). Complementan; **no** reimplementan esos gates.

No toca lógica de pago/auth ni schedulers de negocio (`DataRetentionScheduler`, Hacienda, wallet, RAG). **Nunca** aplica SQL a producción ni hace `git push` para despertar Render.

Scripts: `scripts/eng-gates/` (`flake-hunter`, `i18n-drift`, `secrets-in-docs`, `api-contract-drift`, `idor-suite-gap`, `playwright-area`, `ola4-lib`). Tests: `node --test scripts/eng-gates/ola4.test.mjs` o `bash scripts/eng-gates/ola4-selftest.sh`.

## Resumen

| ID | Workflow | Trigger | Qué hace | Skip |
| --- | --- | --- | --- | --- |
| **D6** | `flake-hunter.yml` | Cron **03:30 America/Costa_Rica** (09:30 UTC) + `workflow_dispatch` | Lee runs de `ci.yml` (últimas 24–48 h) via `gh api`. Tabla de specs Java/TS que **fallaron ≥2 veces y pasaron en otro run**. Upsert Issue `flake` + `eng-agent`. Solo `GITHUB_TOKEN`. | `skip-flake-hunter` |
| **D7** | `i18n-drift.yml` | Diario 02:45 CR (08:45 UTC) + lunes 08:00 CR + dispatch | Diff de keys `es.json` / `en.json` / `pt.json`. Issue con faltantes (están en ES) y huérfanas (no están en ES), agrupadas por namespace (`home`, `checkout`, `pos` primero). | `skip-i18n-drift` |
| **D8** | `secrets-in-docs.yml` | Diario 03:15 CR (09:15 UTC) + dispatch | Escanea `*.md`, `docs/`, `txt/`, `api_cloud_google` (narrativa) buscando password / PEM / DSN / token. Issue **P0** si hay hallazgos. **Nunca reimprime el valor** (redact). Complementa Gitleaks. | `skip-secrets-docs` |
| **D11** | `api-contract-drift.yml` | Diario 04:15 CR + martes 08:15 CR + dispatch | Compara `@RequestMapping` / `@GetMapping` Java vs `frontend/src/services` (axios `baseURL: /api`). Issue `api-drift` con 404s heurísticos (`/api/sinpe`, `/api/pos`, `/api/auth`, …). | `skip-api-drift` |
| **S4** | `idor-suite-gap.yml` | Miércoles 08:30 CR (14:30 UTC) + dispatch | Endpoints path-id (`@GetMapping("/{id}")` y PUT/PATCH/DELETE). Cruza con `*TenantIsolation*` / `*IDOR*`. Issue `idor-gap`. Stubs `@Disabled` en `com.hotclick.pending` (no flakean CI). | `skip-idor-gap` |
| **E5** | `playwright-area.yml` | PR que toca `frontend/**` + dispatch | Selecciona specs `pos-*` / `seller-*` / `checkout-*` por path prefix. Default: dry-run + comentario (no instala browsers). Dispatch `run_smoke=true` corre `test:e2e:smoke`; fallo → artifact screenshots + comentario soft. | `skip-playwright-area` |
| — | `ola4-selftest.yml` | PR que toca estos scripts/workflows | `bash scripts/eng-gates/ola4-selftest.sh` | — |

## Relación con olas 1–3 (no duplicar)

| Ya en master | Ola 4 |
| --- | --- |
| **E7** comentario CI rojo en el PR | **D6** hunter **diario** de flakes (fail≥2 + pass en otro run) → Issue |
| **S3** mapa E2E de rutas vs specs | **E5** selección de subset Playwright **en el PR** (dry-run / smoke) |
| **D2** hunter `findById` diario | **S4** huecos de la **suite** anti-IDOR (tests faltantes), no el scan de `findById` |
| `security.yml` Gitleaks (git history) | **D8** prosa de docs / `txt/` / `api_cloud_google` (redact) |
| — | **D7** i18n ES/EN/PT · **D11** contrato API FE↔BE |

Ola 5 (D9/D10/S5/S7/E12/E14/E18): [AGENTES_OLA5.md](AGENTES_OLA5.md). En PRs, Gitleaks usa `gitleaks-scan.sh` (`base..head` + árbol HEAD, no `--all`).
Ola 6 (S6/S9/S10/S11/S12/E13/E15/E17): [AGENTES_OLA6.md](AGENTES_OLA6.md).

## Secretos

Ningún secreto va en git. `GITHUB_TOKEN` automático alcanza.

| Secreto / var | ¿Ola 4 lo pide? | Notas |
| --- | --- | --- |
| `GITHUB_TOKEN` | Sí (automático) | Issues D6/D7/D8/D11/S4, comentarios E5, `gh api` de runs (D6) |
| `SENTRY_*` / `TELEGRAM_*` / `SONAR_TOKEN` / `SUPABASE_*` | No | Siguen en olas 1–3 |
| Playwright browsers | No en el default de E5 | Solo si dispatch `run_smoke=true` |

D8 **no** imprime valores. El Issue muestra `path:línea`, tipo y redact (`abc…xy` / `***`).

## Labels

| Label | Uso |
| --- | --- |
| `flake` | Issue D6 |
| `i18n-drift` | Issue D7 |
| `secrets-docs` / `p0` | Issue D8 (p0 solo si hay hallazgos) |
| `api-drift` | Issue D11 |
| `idor-gap` | Issue S4 |
| `eng-agent` | Issues de agentes |
| `skip-flake-hunter` / `skip-i18n-drift` / `skip-secrets-docs` / `skip-api-drift` / `skip-idor-gap` / `skip-playwright-area` | Skip intencional |

## Stubs S4

| Archivo | Motivo |
| --- | --- |
| `Hot_click_outlet/src/test/java/com/hotclick/pending/IdorSuiteGapStubsTest.java` | Huecos path-id sin test TenantIsolation/IDOR |

Clase con `@Disabled("S4 pending IDOR stubs — fuera de CI hasta implementar")`. Surefire la reporta skipped. **No** quitar `@Disabled` en este PR.

Regenerar local: `S4_WRITE_STUBS=1 node scripts/eng-gates/idor-suite-gap.mjs` (también intenta upsert Issue si hay `GH_TOKEN`).

## Corrida local

```bash
# D6 (sin gh → 0 runs; con GH_TOKEN lista ci.yml)
node scripts/eng-gates/flake-hunter.mjs

# D7
node scripts/eng-gates/i18n-drift.mjs

# D8 (stdout redactado)
node scripts/eng-gates/secrets-in-docs.mjs

# D11
node scripts/eng-gates/api-contract-drift.mjs

# S4
node scripts/eng-gates/idor-suite-gap.mjs

# E5 (como en un PR)
export BASE_SHA=<sha-master> HEAD_SHA=HEAD
node scripts/eng-gates/playwright-area.mjs

bash scripts/eng-gates/ola4-selftest.sh
```

Issues solo se upsertan con `GH_TOKEN` + `GITHUB_REPOSITORY`.

Ola 6 (S6/S9–S12/E13/E15/E17): [AGENTES_OLA6.md](AGENTES_OLA6.md).
Ola 7 (D12/S14/E16): [AGENTES_OLA7.md](AGENTES_OLA7.md). Checklist de catálogo: [AGENTES_ENG_GATES.md](AGENTES_ENG_GATES.md).
