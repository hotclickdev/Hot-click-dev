# Agentes de ingeniería — ola 2

Checks de GitHub Actions **independientes** de la ola 1 (PR #55: E1/E2/E3/E6/E11/D5 + DOC1 + SCALE1). Este paquete vive en `master` sin importar scripts de #55, para poder mergear solo.

No toca lógica de pago/auth ni schedulers de negocio (`DataRetentionScheduler`, Hacienda, wallet, RAG).

Scripts: `scripts/eng-gates/` (`hunter-idor`, `sonar-batch`, `e2e-gap-map`, `gate-authz`, `restore-drill*`). Tests: `node --test scripts/eng-gates/ola2.test.mjs`.

## Resumen

| ID | Workflow | Trigger | Qué hace | Skip |
| --- | --- | --- | --- | --- |
| **D2** | `hunter-idor.yml` | Cron diario 10:00 UTC (**04:00 America/Costa_Rica**) + `workflow_dispatch` | Escanea Java de controllers/services (`findById(`) de las últimas 24 h, o el árbol completo si no hubo cambios. Abre/actualiza un Issue `idor` + `eng-agent` con muestras `archivo:línea`. Dedup diario (mismo marker). No imprime secretos. | `skip-idor-hunter` (dispatch / labels de PR; el cron no se salta solo) |
| **S1** | `sonar-batch.yml` | Lunes 14:00 UTC (**08:00 CR**) + dispatch | Issue-only: lote de ~8 archivos ≥200 LOC **fuera** de `Payment*` / `Auth*` / `Pos*` / `Sinpe*` / `Wallet*`. Si hay `SONAR_TOKEN`, consulta un recorte de issues; si falta, lista por LOC y declara que la API se omitió. **No** abre un PR de refactor masivo. | `skip-sonar-batch` |
| **S3** | `e2e-gap-map.yml` | Martes 14:00 UTC + dispatch | Mapa `/checkout`, `/admin/pos`, `/admin/finanzas`, 2FA, SINPE, wallet, Hacienda vs `*.spec.ts`. Issue semanal. Stubs SKIP en `frontend/tests/pending/` (no están en `test:e2e:ci`). | `skip-e2e-gap` |
| **E10** | `gate-authz.yml` | PR a `master` | Si el PR agrega `@RestController` o mappings `/api` nuevos, falla cuando el path no tiene `requestMatchers` explícito en `SecurityAuthorizationRules` (el catch-all `/api/**` no alcanza). También falla si se borra el catch-all o `SecurityAuthorizationRulesCatchAllTest`. Comenta el path faltante. | `skip-authz-gate` |
| **S8** | `restore-drill.yml` | Domingo 07:00 UTC (**01:00 CR**, después del backup 06:00 UTC) + dispatch | Baja el último artifact de `Daily DB Backup` y lo restaura en un **Postgres de servicio throwaway**. Nunca usa `SUPABASE_*` como destino. Si el restore falla → Issue **P0**. Si no hay artifact / secretos de backup, el job **falla en claro** (no inventa credenciales). Dispatch `use_fixture=true` prueba solo el mecanismo con SQL sintético. | `skip-restore-drill` (no implementado en cron; el job P0 sí corre si falla) |
| — | `ola2-selftest.yml` | PR que toca estos scripts/workflows | `node --test scripts/eng-gates/ola2.test.mjs` | — |

## Relación con ola 1 (no duplicar)

| Ola 1 (PR #55, no mergeado por este trabajo) | Ola 2 |
| --- | --- |
| **E2** reviewer de tenant en el **diff del PR** | **D2** hunter **diario** del árbol / 24 h → Issue |
| **D5** verifica que el dump exista y pese ≥ 1 KB | **S8** **restaura** ese dump en Postgres local |
| `docs/AGENTES_ENG_GATES.md` (solo en #55) | `docs/AGENTES_OLA2.md` (este archivo) |
| `scripts/eng-gates/lib.mjs`, `github.mjs`, `gate-*.mjs` | Nombres distintos (`ola2-*`, `hunter-idor`, `gate-authz`, …) |

Cuando #55 aterrice, se pueden unificar docs; **no** hace falta rebase de esta rama sobre `cursor/eng-ola1-pr-gates-780d`.

Ola 3 (D1/D3/D4+E8/S2/E4/E7/E9): [AGENTES_OLA3.md](AGENTES_OLA3.md). No reimplementa D2/S1/S3/E10/S8.

Ola 4 (D6/D7/D8/D11/S4/E5): [AGENTES_OLA4.md](AGENTES_OLA4.md).

Ola 5 (D9/D10/S5/S7/E12/E14/E18): [AGENTES_OLA5.md](AGENTES_OLA5.md).

## Secretos

| Secreto | ¿Lo pide ola 2? | Notas |
| --- | --- | --- |
| `GITHUB_TOKEN` | Sí (automático) | Issues D2/S1/S3/S8, comentario E10, download de artifacts S8 |
| `SONAR_TOKEN` | Opcional para S1 | Sin él, S1 igual abre el Issue por LOC y anota “API Sonar omitida”. Sigue siendo obligatorio para `sonarcloud.yml` |
| `SUPABASE_BACKUP_URL` / `SUPABASE_DB_PASSWORD` | **No los usa S8 como destino** | Los necesita `backup.yml` para generar el artifact. Si faltan, el dump diario falla y S8 falla en claro al no hallar artifact. **Nunca se inventan.** |
| `TELEGRAM_*`, `SENTRY_*` | No | Siguen en CI / app |

No hay credenciales nuevas commiteadas. S8 fija `DATABASE_URL` a `127.0.0.1` del service container.

## Stubs E2E (S3)

| Archivo | Motivo |
| --- | --- |
| `Hot_click_outlet/frontend/tests/pending/sinpe-flujo.spec.ts` | SINPE guest + comprobante |
| `Hot_click_outlet/frontend/tests/pending/auth-2fa.spec.ts` | Login 2FA |
| `Hot_click_outlet/frontend/tests/pending/tenant-isolation-ui.spec.ts` | Aislamiento tenant en UI |

Usan `test.describe.skip`. **No** agregar a `package.json` → `test:e2e:ci` hasta que dejen de ser skip y no flakeen.

## Corrida local

```bash
# D2 (auto: 24h o full)
SCAN_MODE=full node scripts/eng-gates/hunter-idor.mjs

# S1 (sin token → Issue/stdout por LOC)
node scripts/eng-gates/sonar-batch.mjs

# S3
node scripts/eng-gates/e2e-gap-map.mjs

# E10 (como en un PR)
export BASE_SHA=<sha-master> HEAD_SHA=HEAD
node scripts/eng-gates/gate-authz.mjs

# S8 contra fixture (hace falta psql + postgres local)
gzip -c scripts/eng-gates/fixtures/restore-drill-sample.sql > /tmp/drill.sql.gz
export DATABASE_URL=postgresql://drill:drill@127.0.0.1:5432/restore_drill
export DRILL_ALLOW_RESTORE=1
bash scripts/eng-gates/restore-drill.sh verify /tmp/drill.sql.gz
bash scripts/eng-gates/restore-drill.sh refuse-prod

node --test scripts/eng-gates/ola2.test.mjs
```

Issues D2/S1/S3/S8 solo se upsertan si hay `GH_TOKEN` + `GITHUB_REPOSITORY`.
