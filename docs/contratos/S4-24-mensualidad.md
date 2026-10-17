# Contrato S4-24 · Mi plan y mensualidad (lectura) — Frontend #181

`/api/billing/suscripcion` y `/api/billing/checkout/{planId}` pasan por Tilopay, que se va a quitar; este endpoint no los usa ni los toca.

**Auth:** JWT de negocio (`EMPRENDEDOR`) y **solo el propietario**. El personal recibe 403 `SOLO_PROPIETARIO`, los compradores 403 y sin token 401. El negocio sale del token.

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

## POST /api/negocio/mensualidad/pago  (esqueleto fail-closed)
→ `{ "success": true, "data": { "url": "https://…" } }`, la URL del Checkout de ONVO por el precio del plan (`plan.precioMensual`, nunca otro monto). Solo se aceptan URLs https.
- **Hoy siempre responde 503 `ONVO_NO_CONFIGURADO`.** Para que funcione hacen falta las llaves sandbox de ONVO (S2-01) y la implementación real de `MensualidadCheckoutClient`. No hay modo simulado (PAG-6).
- 409 `PLAN_SIN_PRECIO` cuando no hay plan o el plan tiene precio `null` o `0`. Este chequeo va antes que el de ONVO.

## Errores
| Código | Cuándo |
|---|---|
| 401 | sin token |
| 403 `{success:false, code:"SOLO_PROPIETARIO", message}` | personal del negocio o sesión de soporte |
| 403 | comprador |
| 409 `{success:false, code:"PLAN_SIN_PRECIO", message}` | `POST /pago` sin precio que cobrar |
| 503 `{success:false, code:"ONVO_NO_CONFIGURADO", message}` | `POST /pago` sin llaves de ONVO (hoy, siempre) |

No hay 400: ningún endpoint recibe parámetros.

## Fuera de este PR
- El cobro real de `POST /pago`: necesita el cliente de ONVO y las llaves sandbox (S2-01).
- `EN_GRACIA` y los días de gracia: decisión del dueño.
