# Agentes de ingeniería — ola 6

Checks de GitHub Actions **independientes** de las olas 1–5 (ya en `master`). Complementan; **no** las reimplementan.

No toca lógica de pago/auth ni schedulers de negocio (`DataRetentionScheduler`, Hacienda, wallet, RAG / `EmbeddingIndexerService`). **Nunca** escribe en producción ni fuerza deploy.

Scripts: `scripts/eng-gates/` (`ola6-lib`, `k6-hikari-regression`, `bundle-lint-ci`, `god-class-extract`, `hacienda-xml-drift`, `rag-embeddings-lag`, `spa-push-reminder`, `product-issue-spike`, `i18n-pr-gate`). Tests: `node --test scripts/eng-gates/ola6.test.mjs` o `bash scripts/eng-gates/ola6-selftest.sh`.

## Resumen

| ID | Workflow | Trigger | Qué hace | Skip |
| --- | --- | --- | --- | --- |
| **S6** | `k6-hikari-regression.yml` | Lunes 09:00 CR (15:00 UTC) + dispatch | Parsea umbrales p95/`http_req_failed` de `loadtest/` y `performance/k6/` (F29). Smoke **mínimo** contra mock local, o contra `K6_BASE_URL` de staging si el secreto existe. Issue si no hay URL (instrucciones + baseline) o si p95/error superan `scripts/eng-gates/baselines/k6-hikari.json`. **No pega `hotclick.lat` / `18.227.68.15`** salvo `K6_ALLOW_PRODUCTION=1`. Hikari: lee pool size + campos F29; no llama `/api/admin/observabilidad` (pide JWT admin). | `skip-k6-hikari` |
| **S9** | `bundle-lint-ci.yml` | Lunes 09:15 CR + dispatch | Corre **`pnpm lint:ci`** (allowlist chico) vs `pnpm lint` (`eslint .`). Mide chunks JS en `static/assets`. Issue con cobertura del allowlist y chunks sobre umbral. **No** mass-enable eslint. | `skip-bundle-lint` |
| **S10** | `god-class-extract.yml` | Miércoles 09:00 CR + dispatch | Top ~15 archivos por LOC (Java main + `frontend/src`). Propone **un** extract move-only fuera de `Payment*`/`Auth*`/`Pos*`. Issue con paths + LOC. **No** PR de refactor masivo. | `skip-god-class` |
| **S11** | `hacienda-xml-drift.yml` | Jueves 08:00 CR + dispatch | Diff `factura-muestra.xml` + XSD subset vs `XmlFacturaBuilder` / `FacturacionService`. Issue si faltan campos XSD requeridos. Heurística de tags. No pega Hacienda. | `skip-hacienda-xml` |
| **S12** | `rag-embeddings-lag.yml` | Viernes 08:00 CR + dispatch | Si no hay URL de DB: **skip honesto**. Si hay: `SELECT COUNT` de productos visibles sin embedding (`hot_click_producto_embedding_tb`, V62/V64, modelo `voyage-3-lite`). Issue si lag > N (default 50). **No escribe. No corre el indexer.** | `skip-rag-lag` |
| **E13** | `spa-push-reminder.yml` | Push a `master` en `frontend/**` o `static/**` + dispatch | Comenta el **commit/SHA** con tree hashes frontend vs static y recuerda `pnpm build`. Complementa E3 (PR) y D3 (Issue diario). **No force deploy.** | `skip-spa-push` |
| **E15** | `product-issue-spike.yml` | Issue `opened`/`labeled`/`reopened` (labels `bug`/`pago`/`pos` o keywords en el título) | Comentario spike: `PedidoService`, `CheckoutPage`, `PosController` + test sugerido. Dedup por marker. **No implementa el fix.** | `skip-product-spike` |
| **E17** | `i18n-pr-gate.yml` | PR que toca `locales/*.json` o JSX | Exige la **misma key nueva** en `es`/`en`/`pt`. Comenta faltantes y FAIL el check. No re-litiga el backlog: eso es **D7** (Issue diario). Strings JSX hardcoded = aviso, no FAIL. | `skip-i18n-pr` |
| — | `ola6-selftest.yml` | PR que toca estos scripts/workflows | `bash scripts/eng-gates/ola6-selftest.sh` + YAML | — |

## Relación con olas 1–5 (no duplicar)

| Ya en master | Ola 6 |
| --- | --- |
| **E3** SPA en el PR (`pnpm build` si falta `static/`) · **D3** heartbeat diario | **E13** recordatorio en el **push a master** (comentario al SHA) |
| **D7** i18n drift **diario** → Issue del árbol | **E17** gate del **diff del PR** |
| **S1** lote Sonar ≥200 LOC · **SCALE1** findAll semanal | **S10** top LOC + **una** propuesta move-only |
| **S3** mapa E2E · F29 `performance/k6/` + `loadtest/` | **S6** smoke k6/Hikari vs **baseline commiteado** |
| `ci.yml` no corre `lint:ci` como awareness de cobertura | **S9** lint:ci real + tamaño de chunks |
| **D9** cuota AI (SELECT, skip sin DB) | **S12** lag embeddings (mismo patrón de secretos, otra query) |
| Gitleaks PR-scoped (`gitleaks-scan.sh`) | Sin keys `sk_*` ni placeholders de alta entropía en tests/baseline |

## Secretos

Ningún secreto va en git. `GITHUB_TOKEN` automático alcanza para Issues/comentarios.

| Secreto / var | ¿Ola 6 lo pide? | Notas |
| --- | --- | --- |
| `GITHUB_TOKEN` | Sí (automático) | Issues S6/S9/S10/S11/S12, comentario commit E13, Issue E15, PR E17 |
| `K6_BASE_URL` / `K6_STAGING_URL` | Opcional S6 | Staging (p. ej. Render). Si **faltan**: mock local + Issue con instrucciones. **Nunca se inventa prod.** |
| `K6_ALLOW_PRODUCTION` | Opcional S6 | Solo `1` autoriza un `K6_BASE_URL` que parezca `hotclick.lat` / `18.227.68.15`. Default: refuse. |
| `AI_USAGE_DATABASE_URL` / `DATABASE_URL` / `SUPABASE_DB_URL` / `SUPABASE_BACKUP_URL` | Opcional S12 | Igual que D9. Si **todos** faltan: skip honesto. SELECT only. |
| `SONAR_TOKEN` / `SENTRY_*` / `TELEGRAM_*` | No | Siguen en otras olas |

## Labels

| Label | Uso |
| --- | --- |
| `eng-agent` | Issues de agentes |
| `perf` | Issue S6 |
| `frontend` | Issue S9 |
| `refactor` | Issue S10 |
| `hacienda` | Issue S11 |
| `rag` | Issue S12 |
| `skip-k6-hikari` / `skip-bundle-lint` / `skip-god-class` / `skip-hacienda-xml` / `skip-rag-lag` / `skip-spa-push` / `skip-product-spike` / `skip-i18n-pr` | Skip intencional |

## Baseline k6

`scripts/eng-gates/baselines/k6-hikari.json` (p95 1500 ms, error_rate 0.02 — alineado a `loadtest/k6-pos-checkout.js`). F29 `checkout-concurrente.js` es más estricto (500 ms / 1%) y queda documentado; el smoke CI no usa ese bar porque corre 1 VU contra mock/health.

Smoke: `scripts/eng-gates/fixtures/k6-smoke.js` (GET `/api/health`, sin JWT).

## Corrida local

```bash
# S6 (mock; no pega prod)
node scripts/eng-gates/k6-hikari-regression.mjs

# S9 / S10 / S11
node scripts/eng-gates/bundle-lint-ci.mjs
node scripts/eng-gates/god-class-extract.mjs
node scripts/eng-gates/hacienda-xml-drift.mjs

# S12 (sin URL → skip declarado)
node scripts/eng-gates/rag-embeddings-lag.mjs

# E13 / E15 / E17
HEAD_SHA=$(git rev-parse HEAD) node scripts/eng-gates/spa-push-reminder.mjs
ISSUE_TITLE='POS no cobra' ISSUE_LABELS=pos ISSUE_NUMBER=1 node scripts/eng-gates/product-issue-spike.mjs
export BASE_SHA=<sha-master> HEAD_SHA=HEAD
node scripts/eng-gates/i18n-pr-gate.mjs

bash scripts/eng-gates/ola6-selftest.sh
```

Issues solo se upsertan con `GH_TOKEN` + `GITHUB_REPOSITORY`.

Ola 7 (D12/S14/E16): [AGENTES_OLA7.md](AGENTES_OLA7.md). Checklist: [AGENTES_ENG_GATES.md](AGENTES_ENG_GATES.md#cobertura-del-catálogo-eng-gates).
