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
`actual` es `null` mientras el negocio no haya elegido. **Decisión del dueño (2026-10-16): no hay frecuencia por defecto.** El negocio elige `QUINCENAL` o `MENSUAL` y es obligatorio (cada liquidación cuesta US$3; ese cobro no se implementa en este PR). El backend nunca rellena un valor: ni en código, ni en configuración, ni con `DEFAULT` en V183; las filas existentes quedan en `null`. El front debe quitar su respaldo `QUINCENAL`.

## PUT /api/negocio/onvo/frecuencia
Body `{ "frecuencia": "QUINCENAL" | "MENSUAL" }` (texto, sin distinguir mayúsculas ni espacios alrededor). **Obligatorio.** Respuesta: mismo cuerpo que el GET.
- Sin body, sin `frecuencia`, `null`, vacío, solo espacios, un número/arreglo u otro valor → 400 `FRECUENCIA_INVALIDA` y no se guarda nada.
- Sin cuenta creada en ONVO: la elección queda como `actual`.
- Con cuenta en ONVO: queda como `pendiente` hasta que el admin la aplique a mano en ONVO (la API de ONVO no permite fijarla). Volver a elegir la `actual` borra el pendiente.

## PUT /api/admin/empresas/{id}/cobros-pausados  (existente, ampliado)
Body `{ "cobrosPausados": true, "motivo": "texto" }`. `motivo` opcional, 3 a 300 caracteres; se guarda al pausar, se borra al reanudar y queda en la auditoría.

## Errores
| Código | Cuándo |
|---|---|
| 400 `{success:false, code:"FRECUENCIA_INVALIDA", message}` | frecuencia ausente, vacía, no textual o distinta de QUINCENAL/MENSUAL (mismo código que Frontend #170) |
| 400 | `motivo` de pausa con menos de 3 o más de 300 caracteres |
| 401 | sin token |
| 403 `{success:false, code:"SOLO_PROPIETARIO", message}` | personal del negocio (o sesión de soporte) en `/api/negocio/onvo/*` |
| 403 | comprador, o vendedor llamando el endpoint de admin |

## Fuera de este PR (dependen de ONVO o del dueño)
- `POST /activar`, `/enlace`, `/reenviar-enlace`: necesitan `OnvoMarketplaceClient` (S2-13) y llaves sandbox (S2-01).
- `frecuenciaLiquidacion` obligatoria en el alta del negocio: el registro es del Desarrollador. Debe validar con `CuentaOnvoNegocioService.exigirFrecuencia(valor)` y responder 400 `FRECUENCIA_INVALIDA` (constante `CODIGO_FRECUENCIA_INVALIDA`).
- Valor por defecto heredado en master, fuera de este PR: `hot_click_empresa_tb.frecuencia_payout` (V168, `NOT NULL DEFAULT 'QUINCENAL'`), el inicializador `Empresa.frecuenciaPayout = "QUINCENAL"` y el respaldo `orElse("QUINCENAL")` de `LiquidacionWalletScheduler`. Quitarlo exige una migración no aditiva (`DROP DEFAULT` / `DROP NOT NULL`) y decidir qué hace el scheduler sin frecuencia; queda para decidir aparte.
- Lista de admin ONVO (punto 3 del pedido de Frontend): queda para un PR siguiente; la tabla V183 ya trae `pct_comision`, `frecuencia_pendiente` y `onvo_account_id`.

## Migración V183 (aditiva)
Tabla `hot_click_negocio_onvo_cuenta_tb` (único por negocio + proveedor + modo; `pct_comision` y `tarifa_semanal_crc` NULL hasta que el admin los fije; sin onboardingUrl/IBAN/KYC) y columnas `cobros_pausa_motivo` (VARCHAR 300) y `cobros_pausados_el` (**TIMESTAMPTZ**, instante absoluto; se devuelve como `pausadaEl` en hora de Costa Rica con offset) en `hot_click_empresa_tb`.

## Frecuencia obligatoria en toda alta de negocio (decisión del dueño, 16-oct-2026)

Campo JSON único en **todos** los caminos de alta: **`frecuenciaLiquidacion`**, valores `QUINCENAL` o `MENSUAL`
(se normaliza con trim y mayúsculas, así que `"mensual"` vale). Alias aceptado por compatibilidad: `frecuenciaPayout`.
No hay valor por defecto.

| Camino | Endpoint | Campo |
| --- | --- | --- |
| Registro público | `POST /api/auth/registro-empresa` | `frecuenciaLiquidacion` |
| Cuenta existente (login social) | `POST /api/auth/upgrade-emprendedor` | `frecuenciaLiquidacion` |
| «Crear otro negocio» | `POST /api/auth/nuevo-negocio` | `frecuenciaLiquidacion` |
| Tienda rápida del admin | el admin la crea sin frecuencia (`POST /api/admin/consola/tiendas-rapidas`); la elige el dueño al aceptar en `POST /api/public/tienda-rapida/{token}` | `frecuenciaLiquidacion` |
| Cambio posterior | `PUT /api/negocio/onvo/frecuencia` (`frecuencia`, también acepta `frecuenciaLiquidacion`) y `PUT /api/negocio/billing-preferencias` (`frecuenciaPayout`) | — |

Si falta o no es válida → **400**, nada se crea:

```json
{ "success": false, "code": "FRECUENCIA_INVALIDA", "message": "Elegí cómo querés recibir tus pagos: QUINCENAL o MENSUAL.", "data": { "codigo": "FRECUENCIA_INVALIDA" } }
```

- Base de datos (V183): `frecuencia_payout` sin `DEFAULT` y sin `NOT NULL`; las filas existentes conservan su valor.
  NULL = el negocio no eligió (p. ej. tienda rápida todavía sin aceptar).
- Scheduler: sin frecuencia no asume ninguna; omite el payout de tarjeta de ese negocio y deja un WARN con su id.
- Admin: `GET /api/admin/empresas` y `GET /api/admin/empresas/{id}` trae `frecuenciaLiquidacion` (o `null`) y `faltaFrecuencia: true|false`
  para mostrar «Falta frecuencia».
- **Despliegue:** sale junto con el PR de Frontend que manda `frecuenciaLiquidacion` en el alta; sin él, todo registro daría 400.
