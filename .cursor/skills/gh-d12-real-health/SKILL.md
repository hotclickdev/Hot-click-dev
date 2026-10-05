---
name: gh-d12-real-health
description: Atiende D12 cuando /api/health responde HTML, cuerpo vacío o un status distinto de UP. Usar cuando se abra un issue outage por salud real.
disable-model-invocation: true
---

# D12 /api/health real

Workflow: `.github/workflows/real-health.yml`
Check: `D12 /api/health real`

## Cuándo corre

Varias veces por hora, desfasado de E9. Dos fallos seguidos abren issue. No hace git push. No inventa /actuator.

## Qué hacer para que no salga en rojo

1. Un HTTP 200 con HTML de parking cuenta como fallo. Hay que ver el cuerpo, no solo el código.
2. E9 mira el status. D12 mira el cuerpo. keep-alive solo evita que Render duerma.
3. No agregues actuator al pom para contentar este check.

## Label de skip

Label `skip-real-health` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
