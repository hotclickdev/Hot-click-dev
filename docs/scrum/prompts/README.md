# Prompts de los agentes: uso en Git Bash

Cada archivo `.md` de esta carpeta es el primer mensaje de la sesión de un agente. `lider.md` es el de la sesión principal.

## Copiar un prompt al portapapeles (Git Bash en Windows)
```bash
cd /c/ruta/a/Hot-click-dev
cat docs/scrum/prompts/lider.md | clip
cat docs/scrum/prompts/dev-backend.md | clip
```
Después pegalo con Ctrl+V en la sesión del agente.

## Ver el prompt en pantalla
```bash
cat docs/scrum/prompts/sec-infra.md
```

## Historias de un agente, desde la terminal
```bash
grep ',dev-frontend,' docs/scrum/asignacion-historias.csv
grep ',dev-frontend,1,' docs/scrum/asignacion-historias.csv   # solo Sprint 1
```

## Orden recomendado de hoy
1. Pegá `lider.md` en la sesión principal. El Líder lanza el Paso 0 de los demás en paralelo.
2. Si preferís abrir una sesión aparte por agente, empezá por `bug-triage`, `sec-infra`, `dev-backend` y `dev-frontend`.

## Regla de oro
Ningún agente hace commit, push, merge ni deploy sin tu OK. Los informes sensibles van a `reportes-privados/`, nunca a `docs/`.
