---
name: gh-d8-secrets-docs
description: Saca secretos de la documentación cuando D8 abre un issue P0. Usar al escribir docs, README o txt con credenciales.
disable-model-invocation: true
---

# D8 secrets in docs

Workflow: `.github/workflows/secrets-in-docs.yml`
Check: `D8 secrets in docs`

## Cuándo corre

Todos los días. Escanea markdown, docs y txt. Si encuentra password, PEM, DSN o token, abre un issue P0. No reimprime el valor.

## Qué hacer para que no salga en rojo

1. Sacá el secreto del documento y dejá un placeholder. Rotá la credencial en el servicio origen si llegó a git.
2. Complementa a gitleaks, no lo reemplaza. Un hallazgo en docs también hay que rotarlo.
3. No pegues el valor en el chat ni en el issue.

## Label de skip

Label `skip-secrets-docs` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
