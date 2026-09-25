# Inventario — pendientes intencionales / diferidos

Items conscientemente fuera de alcance en ciclo 2 (I1–I8, R2, R3, R6 en implementación):

- **`crear_oferta` al asignar paquete** — diferido; asignación solo importa catálogo.
- **Detección automática CONFLICTO (R1, maestro vs oferta)** — diferido; conflicto manual vía `notasConflicto` + UI editar línea (I1).
- **`garantiaDias` en línea → Producto (R4)** — diferido; campo existe en `ProductoRequestDTO`, sin mapeo en materialización.
- **Auditoría admin al asignar (R5)** — diferido; cuántos creados/reusados, ops/soporte.
- **Export xlsx server-side** — no hay endpoint; el FE usa `exportExcel` en cliente. OK.
