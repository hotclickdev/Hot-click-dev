---
name: gh-scale1-hotspots
description: Lee el issue semanal de hotspots SCALE1 (tamaño y findAll) sin abrir un refactor masivo. Usar cuando el job SCALE1 Hotspots semanales falle o abra issue.
disable-model-invocation: true
---

# SCALE1 Hotspots semanales

Workflow: `.github/workflows/gate-scale.yml`
Check: `SCALE1 Hotspots semanales`

## Cuándo corre

Job semanal del workflow SCALE1. En un PR normal suele quedar skipped. No es la X del diff review.

## Qué hacer para que no salga en rojo

1. No conviertas el issue semanal en un PR que reescribe media aplicación.
2. Si el issue nombra un findAll o un archivo enorme que estás por tocar, paginá o extraé solo ese caso.
3. El fallo de este job no se arregla commiteando static/.

## Label de skip

Label `skip-scale-gate` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
