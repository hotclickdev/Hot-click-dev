# QA digitalización inventario — ciclo completo

Fecha: 2026-09-17

## Catálogo

- `docs/qa-inventario-1200-casos.txt` — 1200 casos combinatorios (SEC / API / FE / EDGE)

## Oleadas de agentes

- Oleada 1: ~14 agentes (backend, FE, roles, identidad, offline/excel, franjas SEC/API/FE/EDGE, checklist, security-review)
- Fix wave 1: bugs críticos de assign/barcode/delete/routes/DataSeeder
- Oleada 2: sync continue, security HTTP tests, adminItJobs, pendientes diferidos
- Re-audit + UI borrar línea

## Gate final (verde)

| Suite | Resultado |
|-------|-----------|
| InventarioPaqueteServiceTest | PASS |
| PlatformStaffTest | PASS |
| CompanyScopeTest | PASS |
| ProductoDtoMapperBarcodeTest | PASS |
| SecurityEndpointsTest (incl. /api/inventario) | PASS |
| vitest barcodeHid + adminItJobs | 7/7 PASS |
| pnpm typecheck | PASS (wave 2) |

## Fixes aplicados en el ciclo

- Assign bloquea CONFLICTO y empresa mismatch
- actualizarLinea rechaza barcode duplicado
- DELETE línea + botón en detalle (ABIERTO)
- Reactivar producto inactivo al materializar
- Stock nuevo vía ajustarEntrada
- previewImport exige ABIERTO; confirm usa ResponseDTO.error
- Rutas captura/paquetes bajo SuperAdminGuard
- ADMIN plataforma puede usar /admin/offline/cola
- DataSeeder ya no siembra SUPPORT/FINANCE/TRUST
- Sync offline continúa tras error; tope 5 intentos

## Pendientes diferidos (intencionales)

Ver `docs/qa-inventario-pendientes.md`

## Ciclo 2 plan gaps

En implementación (ver `docs/plan-inventario-no-contemplado.md`):

- **I1–I8** — editar línea tablet, assign ≥1 LISTO, FE mensajes 400, race unique, barcode BE, auto-sync captura, reabrir CERRADO, tests regresión.
- **R2, R3, R6** — plantilla Excel FE, filtro lista paquetes, borrar línea en mobile.

Sigue diferido: `crear_oferta` on assign, auto CONFLICTO (R1), `garantiaDias` línea (R4), auditoría assign (R5), export xlsx server-side.

## Listo para

Prueba manual en tablet/móvil con ADMIN: captura → cerrar → asignar → verificar productos en empresa.
