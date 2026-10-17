# Contrato S6-18 · Tablero de comisión cobrada por plan

## GET /api/admin/finanzas/comision-por-plan

- **Auth:** JWT de ADMIN de plataforma (`hasRole('ADMIN')`). Hoy no existe un rol «Finanzas» en el backend; Finanzas entra con una cuenta admin hasta que se cree ese rol.
- **Query (opcionales, ISO `YYYY-MM-DD`, hora CR):**
  - `desde`: por defecto `hasta` menos 8 semanas.
  - `hasta`: inclusivo, por defecto hoy.
  - Rango máximo: 366 días.
- **Fuente:** solo movimientos reales del ledger del wallet (`CREDITO_VENTA`). No estima ni proyecta. El plan es el **actual** del negocio (`plan.nombre`, o `planSaas` si no tiene plan estructurado, o `SIN_PLAN`).
- **Semana:** lunes a domingo; `semana` es el lunes.

### 200
```json
{
  "success": true,
  "message": "Comisión por plan",
  "data": {
    "desde": "2026-08-21",
    "hasta": "2026-10-16",
    "moneda": "CRC",
    "filas": [
      {
        "semana": "2026-10-05",
        "plan": "PYME",
        "ventas": 2,
        "totalBruto": 14000,
        "comisionSaas": 700,
        "comisionPasarela": 420
      }
    ]
  }
}
```
Montos en colones enteros. `filas` viene ordenado por semana y luego por plan; vacío si no hubo ventas.

### Errores
| Código | Cuándo |
|---|---|
| 400 | `hasta` anterior a `desde`, rango mayor a 366 días o fecha mal formada |
| 401 | sin token o token inválido |
| 403 | usuario autenticado que no es ADMIN (vendedor, cliente) |
