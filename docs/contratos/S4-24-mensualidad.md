# Contrato S4-24 · Mi plan y mensualidad (lectura) — Frontend #181

`/api/billing/suscripcion` y `/api/billing/checkout/{planId}` pasan por Tilopay, que se va a quitar; este endpoint no los usa ni los toca.

**Auth:** JWT de negocio (`EMPRENDEDOR`) y **solo el propietario**. El personal y los compradores reciben 403; sin token, 401. El negocio sale del token.

## GET /api/negocio/mensualidad
```json
{ "success": true, "message": "Mensualidad",
  "data": { "plan": "PYME", "estado": "ACTIVO", "monto": 15000, "fecha": "2026-11-28",
            "porcentaje": 6.5, "minimoComision": 300 } }
```
- `plan`: nombre del plan (si la empresa no tiene plan asignado, el `planSaas` heredado o `null`).
- `estado`:
  - `ACTIVO`: el caso normal, incluido `TRIAL`.
  - `PENDIENTE_PAGO`: plan `VENCIDO` o `PAST_DUE`, o tienda pausada (`empresa.tiendaPausada`, pausa por mensualidad, #182).
  - `EN_GRACIA`: está en el enum pero **todavía no se devuelve**, porque los días de gracia son decisión del dueño.
- `monto`: `plan.precioMensual` (₡). `porcentaje` y `minimoComision`: `plan.comisionPorcentaje` y `plan.comisionMinimaCrc`. Sin plan, los tres van en `null`; nunca se inventan.
- `fecha` (YYYY-MM-DD): `empresa.fechaVencPlan`. Con `ACTIVO` es el próximo vencimiento; con `PENDIENTE_PAGO`, la fecha en que venció. Si no está cargada, `null`. No se calcula a partir de `diaCobro`.

## Errores
| Código | Cuándo |
|---|---|
| 401 | sin token |
| 403 | personal del negocio o comprador |

No hay 400: el endpoint no recibe parámetros.

## Fuera de este PR
- `POST /api/negocio/mensualidad/pago` → `{ url }` (Checkout de ONVO, 409 `PLAN_SIN_PRECIO`): necesita el cliente de ONVO y las llaves sandbox (S2-01). Hoy esa ruta no existe y responde 4xx.
- `EN_GRACIA` y los días de gracia: decisión del dueño.
