# Plan — no contemplado / indispensable / recomendado

Enfoque: digitalización de inventario en campo (ADMIN) → paquete → asignar empresa → productos.
Fecha: 2026-09-17. Base: implementación actual + QA ciclo 1.

## Veredicto previo

**Proceder con cambios** (análisis 4 agentes, 2026-09-17):
- I1,I2,I4,I5,I6,I7,I8 → ACCEPT / must-now
- I3 → **SHRINK**: `GlobalExceptionHandler` ya mapea IAE/ISE→400; falta helper FE `ResponseDTO.message`
- R2,R6 → ahora si no bloquean; R1,R3,R4,R5 → later
- Fuera: oferta, xlsx server, roles nuevos

Prioridad: conflicto editable, assign vacío, race barcode, sync captura, reabrir.

---

## A. Indispensables (deben hacerse ahora)

| ID | Qué | Por qué es indispensable | Dónde |
|----|-----|--------------------------|-------|
| I1 | UI editar línea en detalle tablet (nombre, precios, stock, estado LISTO/CONFLICTO, notas) | Assign bloquea CONFLICTO; sin UI no se puede resolver antes de cerrar | `AdminInventarioPaqueteDetalle` + `actualizarLinea` |
| I2 | Bloquear assign si 0 líneas LISTO (paquete vacío o solo omitidas) | Evita ASIGNADO sin productos | `InventarioPaqueteService.asignar` |
| I3 | Mapear `IllegalArgumentException` / `IllegalStateException` de inventario a HTTP 400 con mensaje | Hoy pueden ser 500; FE muestra basura | Controller advice o `@ExceptionHandler` local / global existente |
| I4 | `agregarLinea` ante unique violation → reintentar sumar stock (no 500) | Carrera pistola/doble tap | Service + test |
| I5 | Normalizar barcode backend (trim + mismas reglas que `barcodeHid`) en lookup/agregar/actualizar | Lookup falla si FE y BE discrepan | Service util |
| I6 | Auto-sync cola captura al volver online (+ contador visible en captura) | Offline sin sync automático pierde el valor del flujo | `capturaSyncService` + hook `useOffline` + Captura UI |
| I7 | Reabrir paquete CERRADO → ABIERTO (solo si no ASIGNADO) | Error de cierre prematuro; editar conflictos | API `POST .../reabrir` + botón FE |
| I8 | Tests: assign OK (crea/reusa), vacío falla, CONFLICTO falla, reabrir, unique race graceful | Regresión del enfoque | `InventarioPaqueteServiceTest` + security smoke |

## B. Recomendados (alta valor, segunda prioridad si cabe)

| ID | Qué | Nota |
|----|-----|------|
| R1 | Marcar CONFLICTO automático si EN_EMPRESA y nombre/precio difieren al confirmar captura | Mejora calidad; no bloquea MVP si I1 existe |
| R2 | Botón “Descargar plantilla Excel” (columnas alineadas al import) | UX; FE puede generar vacío sin BE |
| R3 | Filtro lista paquetes por estado + búsqueda código | Escala operativa |
| R4 | `garantiaDias` opcional en línea → Producto al materializar | Ya existe en ProductoRequestDTO |
| R5 | Auditoría admin al asignar (cuántos creados/reusados) | Operaciones / soporte |
| R6 | Captura: borrar línea desde mobile (usa DELETE ya existente) | Simetría con tablet |

## C. Explicitamente fuera (no hacer en este ciclo)

- Endpoint export xlsx server (FE ya exporta)
- `crear_oferta` / descuentos al asignar
- Nuevos roles JWT (capturista/asignador)
- Claude/IA en import Excel

## D. Criterio de “verde”

1. Tests Java del área + SecurityEndpoints inventario PASS  
2. Vitest inventario + adminItJobs PASS  
3. `pnpm typecheck` PASS  
4. Checklist flujo: captura → editar/conflicto → cerrar → reabrir si hace falta → asignar → productos  
5. Doc `qa-inventario-pendientes.md` actualizado (solo lo diferido restante)

## E. Oleada propuesta

1. **4 agentes análisis** — validan I1–I8 vs código; recortan o amplían.  
2. **Desarrollo paralelo** por franjas I1…I8 + R2/R6 si hay capacidad.  
3. **Audit + test + fix loop** hasta verde.
