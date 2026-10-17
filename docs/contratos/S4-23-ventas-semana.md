# Contrato S4-23 · Ventas de la semana del negocio (Frontend #180)

## GET /api/negocio/ventas/semana?desde=YYYY-MM-DD
- **Auth:** `EMPRENDEDOR`; el negocio sale del token. Un `empresaId` en la query **se ignora** (no hay forma de pedir otra empresa; por eso no hay 403 por «otra empresa», sino que siempre se ven las propias). Comprador → 403.
- `desde` opcional (por defecto hoy); se lleva al lunes de esa semana. `hasta` = domingo.
```json
{ "success": true, "data": {
  "desde": "2026-10-12", "hasta": "2026-10-18", "porcentaje": 5.00, "minimoComision": 700,
  "ventas": [ { "id": 81, "fecha": "2026-10-14T09:00", "producto": "Venta pedido ORD-…", "bruto": 4000,
                "comisionPorcentaje": 200, "minimoAplicado": true, "comision": 800, "neto": 3200 } ],
  "totales": { "bruto": 24000, "comision": 1800, "neto": 22200, "conMinimo": 1, "cantidad": 2 } } }
```
| Campo | Origen |
|---|---|
| `bruto`, `comision` | lo que el ledger registró en la venta (`CREDITO_VENTA`: `total_bruto`, `comision_saas + comision_gw`). No se recalcula |
| `neto` | `bruto - comision` |
| `porcentaje`, `minimoComision` | `plan.comisionPorcentaje` y `plan.comisionMinimaCrc` guardados; `null` sin plan (o mínimo 0) |
| `comisionPorcentaje` | `bruto × porcentaje` redondeado, solo informativo; `null` sin plan |
| `minimoAplicado` | el % daba menos que el mínimo y la comisión SaaS registrada llegó al mínimo |
| `producto` | **desviación:** la descripción del movimiento del ledger (no el nombre del producto, que el ledger no guarda por venta) |
| `id` | id del movimiento del ledger |

## Errores
| Código | Cuándo |
|---|---|
| 400 | `desde` mal formada |
| 401 | sin token |
| 403 | usuario sin negocio |

**Pendiente:** el ajuste semanal del mínimo de ₡700 con ONVO (S4-09) depende de S4-01; aquí solo se muestra lo ya registrado.
