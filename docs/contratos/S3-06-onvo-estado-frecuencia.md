# Contrato S3-06 / S3-11 / S3-15 · Estado de cobros ONVO y frecuencia de liquidación

Ruta unificada: **`/api/negocio/onvo/*`** y su alias **`/api/empresa/onvo/*`** (mismo controlador, mismo contrato; S2-25 y S6-20 pueden usar cualquiera).

**Auth:** JWT de negocio (`EMPRENDEDOR`) y **solo el propietario** del negocio; el personal recibe 403. El negocio sale del token (no se acepta `empresaId`). Nunca devuelve IBAN, KYC ni enlaces de onboarding.

## GET /api/negocio/onvo/estado  (alias /api/empresa/onvo/estado)
```json
{ "success": true, "message": "Cuenta ONVO",
  "data": { "estado": "PAUSADA", "frecuencia": "QUINCENAL", "pausadaEl": "2026-10-16T20:10:00-06:00", "motivoPausa": "Revisión de documentos" } }
```
- `estado`: `SIN_CUENTA` | `ONBOARDING_PENDIENTE` | `EN_REVISION` | `ACTIVA` | `PAUSADA` | `SUSPENDIDA`. Hoy, sin el cliente de ONVO (S2-13/S3-07/S3-12), solo se ven `SIN_CUENTA` o `PAUSADA`; los demás los escribirá la sincronización.
- `PAUSADA` = `empresa.cobrosPausados` (pausa de HotClick, #154). `pausadaEl` (ISO con zona CR) y `motivoPausa` solo vienen con `PAUSADA`; si no, `null`.
- `frecuencia`: `QUINCENAL` | `MENSUAL` | `null` si el negocio aún no eligió.

## GET /api/negocio/onvo/frecuencia
```json
{ "success": true, "data": { "actual": "MENSUAL", "pendiente": null } }
```
`actual` puede ser `null` (sin elección). **Desviación:** el front asume `QUINCENAL` por defecto; el backend no inventa un valor, devuelve `null` hasta que el dueño de HotClick decida el valor por defecto.

## PUT /api/negocio/onvo/frecuencia
Body `{ "frecuencia": "QUINCENAL" | "MENSUAL" }` (sin distinguir mayúsculas). Respuesta: mismo cuerpo que el GET.
- Sin cuenta creada en ONVO: la elección queda como `actual`.
- Con cuenta en ONVO: queda como `pendiente` hasta que el admin la aplique a mano en ONVO (la API de ONVO no permite fijarla). Volver a elegir la `actual` borra el pendiente.

## PUT /api/admin/empresas/{id}/cobros-pausados  (existente, ampliado)
Body `{ "cobrosPausados": true, "motivo": "texto" }`. `motivo` opcional, 3 a 300 caracteres; se guarda al pausar, se borra al reanudar y queda en la auditoría.

## Errores
| Código | Cuándo |
|---|---|
| 400 `{success:false, code:"FRECUENCIA_INVALIDA", message}` | frecuencia ausente o distinta de QUINCENAL/MENSUAL |
| 400 | `motivo` de pausa con menos de 3 o más de 300 caracteres |
| 401 | sin token |
| 403 | personal del negocio, comprador, o vendedor llamando el endpoint de admin |

## Fuera de este PR (dependen de ONVO o del dueño)
- `POST /activar`, `/enlace`, `/reenviar-enlace`: necesitan `OnvoMarketplaceClient` (S2-13) y llaves sandbox (S2-01).
- `frecuenciaLiquidacion` en el alta del negocio: el registro es del Desarrollador.
- Lista de admin ONVO (punto 3 del pedido de Frontend): queda para un PR siguiente; la tabla V183 ya trae `pct_comision`, `frecuencia_pendiente` y `onvo_account_id`.

## Migración V183 (aditiva)
Tabla `hot_click_negocio_onvo_cuenta_tb` (único por negocio + proveedor + modo; `pct_comision` y `tarifa_semanal_crc` NULL hasta que el admin los fije; sin onboardingUrl/IBAN/KYC) y columnas `cobros_pausa_motivo`, `cobros_pausados_el` en `hot_click_empresa_tb`.
