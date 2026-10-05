---
name: gh-gitleaks
description: Saca secretos del diff para que gitleaks detect no falle. Usar antes de commit o pull request, y cuando el check de secretos salga en rojo.
disable-model-invocation: true
---

# gitleaks detect

Workflow: `.github/workflows/security.yml`
Check: `gitleaks detect`

## Cuándo corre

Push y pull request a master. Escanea el rango base..head y el árbol, no todo el historial.

## Qué hacer para que no salga en rojo

1. Una API key, password, PEM o DSN va a .env (gitignore) y a .env.example sin valor. Nunca al fuente.
2. Si gitleaks marca un falso positivo conocido, va al allowlist de .gitleaks.toml con motivo. No se apaga el job.
3. Si el secreto ya se commiteó, se rota en el servicio origen. Borrarlo del último commit no alcanza si ya se pusheó.

## Label de skip

No tiene label de skip. El check tiene que pasar de verdad.
