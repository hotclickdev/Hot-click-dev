---
name: gh-e17-i18n
description: Copia cada key i18n nueva a es, en y pt para que E17 i18n keys es/en/pt no falle. Usar al editar locales JSON o texto de interfaz.
disable-model-invocation: true
---

# E17 i18n keys es/en/pt

Workflow: `.github/workflows/i18n-pr-gate.yml`
Check: `E17 i18n keys es/en/pt`

## Cuándo corre

Pull request que toca locales/*.json o JSX.

## Qué hacer para que no salga en rojo

1. Una key nueva en es.json va también en en.json y pt.json, con el mismo camino.
2. El gate falla por keys faltantes. Un string JSX hardcoded es aviso, no fallo: igual preferí la key.
3. El backlog de keys viejas es D7 (issue diario). Este check solo mira el diff del PR.

## Label de skip

Label `skip-i18n-pr` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
