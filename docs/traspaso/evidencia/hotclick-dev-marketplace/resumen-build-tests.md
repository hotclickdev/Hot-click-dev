# Resumen de build y tests (HotClick Dev Marketplace, 26-oct-2026)

| PR | Head | Verificación local | CI GitHub |
|---|---|---|---|
| #326 | 5b54bb5b | build front + gate-spa OK | verde, mergeado |
| #334 | f2c5bc27 | tsc OK, vitest 24/24, build + gate-spa OK | verde, mergeado |
| #337 | 0e1a40da | tests backend afectados OK (suite completa no corrida; box sin inodos) | verde, mergeado |
| #341 | 9cdc5d39 | 2 tests nuevos + 13 clases POS/stock/turnos, 117 tests OK | verde, mergeado |
| #349 | e05c0824 | 96 tests backend relacionados OK (suite completa no corrida) | verde, abierto |

Patches cortos de esta carpeta: `reg01-` y `cmp01-spec-quitar-testfail.patch` quitan el test-fail
inicial (rojo intencional) de las specs E2E-REG-01 y E2E-CMP-01 una vez aplicado el fix.
Los logs completos no se suben por tamaño.
