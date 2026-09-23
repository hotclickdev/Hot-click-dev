# Ciclo 2 — plan gaps → desarrollo → verde

## Plan
`docs/plan-inventario-no-contemplado.md` — indispensables I1–I8 + recomendados R2/R3/R6.

## Análisis (4 agentes)
Veredicto: **PROCEED_WITH_CHANGES** — I3 solo FE (`GlobalExceptionHandler` ya mapea 400).

## Desarrollo (~18 agentes + fixes locales)
I1 edit línea · I2 assign vacío · I3 mensajeErrorApi · I4 race barcode · I5 BarcodeNormalizer · I6 sync captura · I7 reabrir · I8 tests · R2 plantilla · R3 filtro · R6 borrar captura + cámara HID.

## Gate final VERDE
| Suite | Resultado |
|-------|-----------|
| InventarioPaqueteServiceTest | 11 PASS |
| BarcodeNormalizerTest | 3 PASS |
| SecurityEndpointsTest | 28 PASS (incl. reabrir 401/403) |
| vitest (mensajeErrorApi, capturaOffline, barcodeHid, adminItJobs) | 18 PASS |
| pnpm tsc --noEmit | PASS |

## Diferido
`docs/qa-inventario-pendientes.md` — oferta, auto-CONFLICTO, garantiaDias, auditoría assign, xlsx server.
