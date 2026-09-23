# Agentes de ingeniería — ola 7 (cierre de catálogo)

Checks de GitHub Actions **independientes** de las olas 1–6 ya en `master` (ola 6 = PR #60 mergeado en `cf787a62`: S6/S9–S12/E13/E15/E17). Complementan; **no** las reimplementan.

Cierra los huecos restantes del menú de eng-gates: **D12**, **S14**, **E16**. El tablero UI `/agentes` queda **fuera de alcance**.

No toca lógica de pago/auth ni schedulers de negocio (`DataRetentionScheduler`, Hacienda, wallet, RAG). **Nunca** aplica SQL a producción ni hace `git push` para despertar Render.

Scripts: `scripts/eng-gates/` (`ola7-lib`, `real-health`, `a11y-pos-keyboard`, `runtime-endpoint-issue`). Tests: `node --test scripts/eng-gates/ola7.test.mjs` o `bash scripts/eng-gates/ola7-selftest.sh`.

## Resumen

| ID | Workflow | Trigger | Qué hace | Skip |
| --- | --- | --- | --- | --- |
| **D12** | `real-health.yml` | Cron **7,22,37,52 * * * *** (offset vs E9 `*/10`) + dispatch | Ping a `/api/health` **con cuerpo**. Falla real = HTTP ≠200, cuerpo vacío, HTML de parking, o JSON `status` distinto de UP. Dos fallos seguidos → Issue `outage` con snippet redactado. Telegram si `TELEGRAM_*` existen. Path secundario **solo** si `HEALTH_SECONDARY_URL` está seteado; `application.properties` documenta que actuator **no** está instalado — no se inventa `/actuator/**`. **No git push.** | `skip-real-health` |
| **S14** | `a11y-pos-keyboard.yml` | Jueves 09:00 CR (15:00 UTC) + dispatch | Dry-run: cruza `pos-atajos.spec.ts` / keyboard vs `test:e2e:ci`, axe en `package.json`, dialogos POS/wizard vs `useFocusTrap`. Issue semanal de huecos (`/admin/pos`, wizard seller). Smoke Playwright **opt-in** (`run_smoke`) y **solo** specs ya en CI (no `pos-atajos`, para no flakear). | `skip-a11y-pos` |
| **E16** | `runtime-endpoint-issue.yml` | Diario 04:15 CR (10:15 UTC) + dispatch | Si hay `SENTRY_TOKEN`: tira unresolved de `PaymentController` / `WebhookController` / `FacturaController`. Issue dedup por fingerprint con hints de idempotencia (`StripeEvento.stripe_event_id`, txn id) y enlace al scheduler (`FacturacionContingenciaScheduler` / `consultarPendientes`) **sin modificarlo**. Sin token: **cron skip honesto**; `workflow_dispatch` acepta `fingerprint_json` pegado y abre Issue. | `skip-runtime-endpoint` |
| — | `ola7-selftest.yml` | PR que toca estos scripts/workflows | `bash scripts/eng-gates/ola7-selftest.sh` + parseo YAML | — |

## Relación con olas 1–6 (no duplicar)

| Ya en master | Ola 7 |
| --- | --- |
| **E9** pager status-only (`curl -o /dev/null`) | **D12** mismo endpoint, pero cuerpo + HTML 200 = fallo. Marker propio `hotclick-d12-real-health` |
| `keep-alive.yml` ping cosmético anti-sleep | D12 **no** lo reemplaza; no hace `git push` |
| **S3** mapa E2E de rutas | **S14** a11y/teclado POS + focus trap (Issue, no suite nueva) |
| **E5** Playwright area en el PR | S14 es semanal; smoke opt-in reusa specs de `test:e2e:ci` |
| **D4/E8** digest Sentry general | **E16** recorte Payment/Webhook/Factura + stub JSON si no hay token |
| Ola 6 (S6, S9–S12, E13, E15, E17) | No se reimplementa |

## Secretos

Ningún secreto va en git. Tests sin placeholders tipo `sk_live` / `whsec`. Gitleaks de PRs sigue acotado (`gitleaks-scan.sh`).

| Secreto / var | ¿Ola 7 lo pide? | Notas |
| --- | --- | --- |
| `GITHUB_TOKEN` | Sí (automático) | Issues D12/S14/E16 |
| `HEALTH_URL` | Opcional D12 | Default `https://hot-click-dev.onrender.com/api/health` |
| `HEALTH_SECONDARY_URL` | Opcional D12 | Solo si existe. **No** se usa `/actuator/health` por default |
| `TELEGRAM_BOT_TOKEN` / `TELEGRAM_CHAT_ID` | Opcional D12 | Ya los usa `ci.yml` / E9. Si faltan, solo Issue |
| `SENTRY_TOKEN` | Opcional E16 | Si falta: cron pasa y declara skip. No usar el DSN de la app |
| `SENTRY_ORG` / `SENTRY_PROJECT` | Opcional (variables) | Default `hotclick` / `hot-click-dev` |

## Labels

| Label | Uso |
| --- | --- |
| `outage` | Issue D12 (misma etiqueta que E9; marker distinto) |
| `a11y` | Issue S14 |
| `prod-errors` | Issue E16 |
| `eng-agent` | Issues de agentes |
| `skip-real-health` / `skip-a11y-pos` / `skip-runtime-endpoint` | Skip intencional |

## Stub E16 (`workflow_dispatch`)

```json
{
  "fingerprint": "PaymentController.timeout",
  "culprit": "PaymentController",
  "title": "timeout en checkout",
  "txnId": "txn-ci-1",
  "stripeEventId": "evt-ci-1"
}
```

Sin API keys. Dedup: `<!-- hotclick-e16-paymentcontroller.timeout -->`.

## Corrida local

```bash
# D12 (no pega prod si inyectás status/cuerpo)
HEALTH_STATUS=200 HEALTH_BODY='{"status":"UP"}' HEALTH_STATE_FILE=/tmp/d12.json \
  node scripts/eng-gates/real-health.mjs

# S14 dry-run
node scripts/eng-gates/a11y-pos-keyboard.mjs

# E16 (sin token → skip; o JSON pegado)
FINGERPRINT_JSON='{"fingerprint":"FacturaController.emitir","culprit":"FacturaController","title":"hacienda 503"}' \
  GITHUB_EVENT_NAME=workflow_dispatch \
  node scripts/eng-gates/runtime-endpoint-issue.mjs

bash scripts/eng-gates/ola7-selftest.sh
```

Issues solo se upsertan con `GH_TOKEN` + `GITHUB_REPOSITORY`.
