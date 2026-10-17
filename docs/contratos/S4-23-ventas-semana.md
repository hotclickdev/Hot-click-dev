# Contrato S4-23 · Ventas de la semana del negocio (Frontend #180)

## GET /api/negocio/ventas/semana?desde=YYYY-MM-DD
- **Auth:** `EMPRENDEDOR`; el negocio sale del token. Un `empresaId` en la query **se ignora** (no hay forma de pedir otra empresa; por eso no hay 403 por «otra empresa», sino que siempre se ven las propias). Comprador → 403.
- `desde` opcional (por defecto hoy); se lleva al lunes de esa semana. `hasta` = domingo.
```json
{ "success": true, "data": {
  "desde": "2026-10-12", "hasta": "2026-10-18", "porcentaje": 5.00, "minimoComision": 700,
  "ventas": [ { "id": 81, "fecha": "2026-10-14T09:00", "producto": "Café de altura y 1 más", "bruto": 4000,
                "comisionPorcentaje": 200, "minimoAplicado": true, "comision": 800, "neto": 3200 } ],
  "totales": { "bruto": 24000, "comision": 1800, "neto": 22200, "conMinimo": 1, "cantidad": 2 } } }
```
| Campo | Origen |
|---|---|
| `bruto`, `comision` | lo que el ledger registró en la venta (`CREDITO_VENTA`: `total_bruto`, `comision_saas + comision_gw`). No se recalcula |
| `neto` | `bruto - comision` |
| `porcentaje` | `plan.comisionPorcentaje`; `null` sin plan |
| `minimoComision` | `plan.comisionMinimaCrc`, la configuración del plan en la base. **Decisión del dueño: ₡700 por venta en todos los planes**, ya cargado en V168 para los planes vigentes, así que hoy devuelve `700`. No está fijo en el código. Es `null` solo si el negocio no tiene plan o si a su plan le falta el valor (columna en 0, el default de V168); nunca se devuelve `0` |
| `comisionPorcentaje` | `bruto × porcentaje` redondeado, solo informativo; `null` sin plan |
| `minimoAplicado` | el % daba menos que el mínimo y la comisión SaaS registrada llegó al mínimo |
| `producto` | nombre del producto del pedido de la venta (`referencia_tipo = PEDIDO`). Si el pedido tiene varios productos: «Primero y N más». Es `null` si el movimiento no apunta a un pedido o el pedido no tiene ítems. Nunca es la descripción del ledger |
| `id` | id del movimiento del ledger |

## Errores
| Código | Cuándo |
|---|---|
| 400 | `desde` mal formada |
| 401 | sin token |
| 403 | usuario sin negocio |

**Pendiente:** ONVO todavía tiene que confirmar cómo se aplica el mínimo de ₡700 (por venta, o ajustado por semana: S4-09 / S4-01). Este endpoint solo muestra el mínimo del plan y lo que el ledger ya registró; no cobra ni ajusta nada.
