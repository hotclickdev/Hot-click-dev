---
name: gh-d9-ai-quota
description: Atiende la alerta de cuota de IA al 80% sin escribir en la base. Usar cuando D9 abra un issue o se salte por falta de URL de base.
disable-model-invocation: true
---

# D9 AI quota / cost

Workflow: `.github/workflows/ai-quota-alert.yml`
Check: `D9 AI quota / cost`

## Cuándo corre

Todos los días. Sin URL de base hace skip honesto. Con URL, lee hot_click_ai_uso_tb. No escribe en producción.

## Qué hacer para que no salga en rojo

1. Sin DATABASE_URL el skip es correcto. No pongas la URL de producción en el repo.
2. El issue es de cupo, no un permiso para cambiar precios o el scheduler.
3. No inventes filas de uso para que el porcentaje baje.

## Label de skip

Label `skip-ai-quota` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
