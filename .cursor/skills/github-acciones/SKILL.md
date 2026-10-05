---
name: github-acciones
description: Elige y aplica la skill del check de GitHub Actions que el diff puede poner en rojo (E1 a E18, D1 a D12, S1 a S14, CI, Sonar, gitleaks, osv-scanner, SCALE1, static y pnpm build). Usar antes de git commit o de un pull request, al tocar frontend/src, y cuando un check de GitHub salga con X roja.
---

# Acciones de GitHub

Antes de `git commit` o de abrir un pull request a master:

1. Listá los archivos del diff.
2. Abrí cada skill de las tablas cuya columna "Si el diff" coincida, y hacé esos pasos.
3. Un E4 en verde no reemplaza el `pnpm build` de E3. Docker no compila React.
4. No uses un label `skip-*` para saltarte el paso. El label es para un falso positivo dicho en el PR.

La X roja de un commit ya mergeado no se apaga. El arreglo es un commit nuevo que cumpla la skill del check.

## Pull request y push a master

| Check | Si el diff | Skill |
| --- | --- | --- |
| E3 Artefactos static/ vs frontend/src | Cambia Hot_click_outlet/frontend/src/** | `.cursor/skills/gh-e3-static/SKILL.md` |
| E1 Flyway vs entidades JPA | Cambia entidades JPA, migraciones o Actualizado.sql | `.cursor/skills/gh-e1-flyway/SKILL.md` |
| E1b Boot perfil dev (Postgres 18 vacío) | Cambia migraciones, dev-bootstrap, application-dev o FlywayRepairConfig | `.cursor/skills/gh-e1b-flyway-fresh/SKILL.md` |
| E2 Tenant / IDOR / PgBouncer | Cambia controller, service o repository Java | `.cursor/skills/gh-e2-tenant/SKILL.md` |
| E4 Commit-gate VEREDICTO | Cualquier pull request a master | `.cursor/skills/gh-e4-commit-gate/SKILL.md` |
| E5 Playwright area | Cambia Hot_click_outlet/frontend/** | `.cursor/skills/gh-e5-playwright/SKILL.md` |
| E6 Labels y bloqueo de majors críticos | Pull request de Dependabot | `.cursor/skills/gh-e6-dependabot/SKILL.md` |
| E10 Authz catch-all | Agrega @RestController o un mapping /api | `.cursor/skills/gh-e10-authz/SKILL.md` |
| E11 Tests nominales Payment/Auth/Pos/Sinpe/Wallet | Cambia Payment, Auth, Pos, Sinpe o Wallet en src/main/java | `.cursor/skills/gh-e11-sensitive/SKILL.md` |
| E12 Seller QA remap | Cambia prototipo seller o el wizard | `.cursor/skills/gh-e12-seller-qa/SKILL.md` |
| E14 Hotfix extra check | Rama hotfix/** | `.cursor/skills/gh-e14-hotfix/SKILL.md` |
| E17 i18n keys es/en/pt | Cambia locales o JSX con texto nuevo | `.cursor/skills/gh-e17-i18n/SKILL.md` |
| E18 PgBouncer V*.sql | Agrega o cambia una migración V*.sql | `.cursor/skills/gh-e18-pgbouncer/SKILL.md` |
| SCALE1 Diff review | Cambia Java, TypeScript o static de un listado | `.cursor/skills/gh-scale1-diff/SKILL.md` |
| Tests Java | Cualquier pull request o push a master | `.cursor/skills/gh-ci-tests-java/SKILL.md` |
| Build React | Cualquier pull request o push a master | `.cursor/skills/gh-ci-build-react/SKILL.md` |
| Auto-merge si CI pasa (hotfix) | Rama hotfix/** con Tests Java, Build React y E14 en verde | `.cursor/skills/gh-ci-auto-merge/SKILL.md` |
| gitleaks detect | Cualquier pull request o push a master | `.cursor/skills/gh-gitleaks/SKILL.md` |
| osv-scanner (HIGH/CRITICAL) | Cambia pom.xml o pnpm-lock.yaml | `.cursor/skills/gh-osv-scanner/SKILL.md` |
| Escaneo SonarCloud | Pull request o push a master | `.cursor/skills/gh-sonarcloud/SKILL.md` |
| node --test scripts/eng-gates | Cambia scripts/eng-gates o un workflow de gates | `.cursor/skills/gh-eng-gates-selftest/SKILL.md` |
| node --test ola 2 | Cambia scripts o el workflow de la ola 2 | `.cursor/skills/gh-ola2-selftest/SKILL.md` |
| node --test ola 3 | Cambia scripts o el workflow de la ola 3 | `.cursor/skills/gh-ola3-selftest/SKILL.md` |
| node --test ola 4 | Cambia scripts o el workflow de la ola 4 | `.cursor/skills/gh-ola4-selftest/SKILL.md` |
| node --test ola 5 | Cambia scripts o el workflow de la ola 5 | `.cursor/skills/gh-ola5-selftest/SKILL.md` |
| node --test ola 6 | Cambia scripts o el workflow de la ola 6 | `.cursor/skills/gh-ola6-selftest/SKILL.md` |
| node --test ola 7 | Cambia scripts o el workflow de la ola 7 | `.cursor/skills/gh-ola7-selftest/SKILL.md` |

## Cron, push recordatorio e issues

Estos no pintan la X de un PR de producto. Si fallan, seguí la skill. No los silencies editando el workflow.

| Check | Si el diff | Skill |
| --- | --- | --- |
| SCALE1 Hotspots semanales | No corre en el PR; es el job semanal del mismo workflow | `.cursor/skills/gh-scale1-hotspots/SKILL.md` |
| Notificar fallo en Telegram | No se corrige en el diff; avisa cuando Tests Java o Build React fallan | `.cursor/skills/gh-ci-telegram/SKILL.md` |
| E7 Diagnóstico CI rojo | Cuando CI — Tests y Build falla | `.cursor/skills/gh-e7-ci-red/SKILL.md` |
| E9 /api/health pager | Cron de salud; no es un check de PR | `.cursor/skills/gh-e9-health/SKILL.md` |
| E13 static vs frontend hash | Push a master que toca frontend o static | `.cursor/skills/gh-e13-spa-push/SKILL.md` |
| E15 spike comment | Issue nuevo con label bug, pago o pos | `.cursor/skills/gh-e15-spike/SKILL.md` |
| E16 Payment/Webhook/Factura | Cron diario; abre issue si Sentry tiene errores de esos controllers | `.cursor/skills/gh-e16-runtime/SKILL.md` |
| D1 schema-drift | Cron diario; issue si JPA y V*.sql no coinciden | `.cursor/skills/gh-d1-flyway-drift/SKILL.md` |
| D2 IDOR hunter | Cron diario sobre findById en Java | `.cursor/skills/gh-d2-idor-hunter/SKILL.md` |
| D3 spa-stale | Cron diario; issue si frontend/src es más nuevo que static/ | `.cursor/skills/gh-d3-spa-stale/SKILL.md` |
| D4 Sentry / E8 prod-errors | Cron diario de errores de Sentry | `.cursor/skills/gh-d4-sentry/SKILL.md` |
| D5 — Dump presente y no vacío | Cron de backup; falla si el dump no existe o pesa menos de 1 KB | `.cursor/skills/gh-d5-backup/SKILL.md` |
| D6 flake hunter | Cron diario sobre runs de CI | `.cursor/skills/gh-d6-flake/SKILL.md` |
| D7 i18n drift | Cron diario del árbol de locales, no del PR | `.cursor/skills/gh-d7-i18n-drift/SKILL.md` |
| D8 secrets in docs | Cron diario sobre markdown y docs | `.cursor/skills/gh-d8-secrets-docs/SKILL.md` |
| D9 AI quota / cost | Cron diario de cuota de IA | `.cursor/skills/gh-d9-ai-quota/SKILL.md` |
| D10 hygiene | Cron diario de issues y PRs abiertos | `.cursor/skills/gh-d10-hygiene/SKILL.md` |
| D11 api-drift | Cron diario que cruza mappings Java con services del frontend | `.cursor/skills/gh-d11-api-drift/SKILL.md` |
| D12 /api/health real | Cron; falla si el cuerpo de /api/health no está UP | `.cursor/skills/gh-d12-real-health/SKILL.md` |
| S1 Sonar batch (Issue) | Cron semanal; issue de archivos grandes, no un PR | `.cursor/skills/gh-s1-sonar-batch/SKILL.md` |
| S2 Dependabot weekly | Cron semanal de PRs de Dependabot abiertos | `.cursor/skills/gh-s2-dependabot-weekly/SKILL.md` |
| S3 E2E gap map | Cron semanal de huecos e2e | `.cursor/skills/gh-s3-e2e-gap/SKILL.md` |
| S4 IDOR suite gap | Cron semanal de tests de aislamiento faltantes | `.cursor/skills/gh-s4-idor-gap/SKILL.md` |
| S5 design-drift | Cron semanal de hex y style inline fuera de tokens | `.cursor/skills/gh-s5-design-tokens/SKILL.md` |
| S6 k6 / Hikari | Cron semanal de umbrales k6; no pega a producción | `.cursor/skills/gh-s6-k6/SKILL.md` |
| S7 Ley 8968 | Cron semanal del checklist de datos personales | `.cursor/skills/gh-s7-ley8968/SKILL.md` |
| S8 Restore throwaway Postgres | Cron semanal; restaura el dump en Postgres desechable | `.cursor/skills/gh-s8-restore/SKILL.md` |
| S9 bundle / lint:ci | Cron semanal de lint:ci y tamaño de chunks | `.cursor/skills/gh-s9-bundle-lint/SKILL.md` |
| S10 god-class candidates | Cron semanal; propone un extract, no lo hace | `.cursor/skills/gh-s10-god-class/SKILL.md` |
| S11 Hacienda XML | Cron semanal del XML de factura contra los builders | `.cursor/skills/gh-s11-hacienda/SKILL.md` |
| S12 RAG lag | Cron semanal; cuenta productos sin embedding | `.cursor/skills/gh-s12-rag/SKILL.md` |
| S14 a11y / POS keyboard | Cron semanal de teclado y focus trap en POS | `.cursor/skills/gh-s14-a11y/SKILL.md` |
| Regenerar GENERATED_STACK.md | Cron semanal que regenera el doc de stack | `.cursor/skills/gh-doc1-stack/SKILL.md` |
| I1 escanear workflows + docs | Cron semanal del tablero de agentes | `.cursor/skills/gh-i1-inspect/SKILL.md` |
| Keep Render Alive | Cron cada 10 minutos; ping a Render | `.cursor/skills/gh-keep-alive/SKILL.md` |

Catálogo humano: `docs/AGENTES_ENG_GATES.md` y `docs/AGENTES_OLA2.md` … `AGENTES_OLA7.md`.
