---
name: gh-scale1-diff
description: Evita findAll sin paginar y N+1 en el diff para que SCALE1 Diff review no falle. Usar al listar entidades, agregar endpoints o consultas.
disable-model-invocation: true
---

# SCALE1 Diff review

Workflow: `.github/workflows/gate-scale.yml`
Check: `SCALE1 Diff review`

## Cuándo corre

Pull request que toca Java, TypeScript o static/. Falla en P0/P1: findAll o listas sin Pageable, N+1, I/O bloqueante en un controller.

## Qué hacer para que no salga en rojo

1. Un listado de cara al usuario o al admin va paginado (Pageable), no findAll() de la tabla entera.
2. No hagas una consulta por fila dentro del loop. Cargá en lote.
3. El controller no hace I/O lento (HTTP externo, archivos) en el hilo del request. Eso vive en un service, y si es largo, fuera de la transacción.
4. @Transactional gordo es aviso. Igual mantené la transacción corta, sin llamadas externas adentro.

## Label de skip

Label `skip-scale-gate` solo si el caso es un falso positivo y lo decís en el PR. No la uses para ahorrarte el paso.
