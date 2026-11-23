# Alta de negocios por fases (ONVO)

Decisión de Andrés (2026-11-23). Un negocio nuevo se registra en borrador y solo se publica y vende en línea cuando
su cuenta conectada de ONVO está ACTIVA y HotClick lo aprueba.

## Fases (derivadas, no se guardan)

| # | Fase | Cuándo |
|---|------|--------|
| 1 | Registro | El dueño creó el negocio (`estado_empresa = PENDIENTE_APROBACION`, no público). |
| 2 | Productos y configuración | Aún no tiene productos activos. Ya puede crear productos y configurar. |
| 3 | ONVO | Tiene productos y la cuenta ONVO no está ACTIVA. Botón «Ir a ONVO…». |
| 4 | Revisión HotClick | La cuenta ONVO quedó ACTIVA. Se avisa al admin (una vez). |
| 5 | Publicada | El admin aprobó (`estado_empresa = ACTIVO`) y la cuenta sigue ACTIVA. |

Reutiliza lo que ya existía: `estado_empresa` (PENDIENTE_APROBACION → ACTIVO por `EmpresaAprobacionService`,
RECHAZADO con motivo), `EmpresaCuentaOnvo` y sus estados, `CuentaOnvoPoller` (ONVO no manda webhook) y la cola de
aprobación (`/api/admin/solicitudes-aprobacion`). No hay un estado «pendiente» paralelo.

## Columnas nuevas (V244 / V245)

- `hot_click_empresa_tb.alta_por_fases` (default FALSE): negocio nuevo bajo el flujo. Lo marca el código al registrar.
- `hot_click_empresa_tb.venta_online_habilitada` (default TRUE): **predicado único** de «puede publicarse y cobrar en
  línea». Para un negocio por fases arranca FALSE y solo sube con la cuenta ACTIVA. Lo mantiene `AltaFasesService`
  (en la misma transacción que actualiza la cuenta).
- Seguimiento en `hot_click_empresa_cuenta_onvo_tb`: `activada_en`, `revision_aviso_en`, `perdida_desde`,
  `avisos_perdida`, `ultimo_aviso_perdida_en`, `recuperada_aviso_pendiente`.
- `hot_click_pago_tb`: `destino_dinero` (SUBCUENTA | PLATAFORMA), `destino_cuenta_onvo`, `reintegro_estado`
  (NULL | NO_REINTEGRADO | REINTEGRADO), `reintegrado_por`, `reintegrado_en`, `reintegro_nota`.

Regla de `venta_online_habilitada`: cuenta ACTIVA ⇒ TRUE. Sin cuenta ACTIVA: negocio por fases ⇒ FALSE; negocio
existente ⇒ TRUE salvo que alguna vez estuvo ACTIVA y la perdió (entonces FALSE).

## Dónde se aplica el fail-closed

El predicado se exige en **todas** las consultas públicas: `ProductoRepository` (catálogo, búsqueda, feed Merchant/RSS,
sitemap, `esPublicable`), `EmpresaRepository` (sitemap/SEO de tiendas), `CategoriaRepository`, `MarcaRepository`,
`CatalogoPublicoGate` (SQL del chat/RAG y fichas), `ContactoTextoPublico`, `SlugTenantInterceptor` (`/api/tienda/{slug}`),
`SpaController` (meta SSR), `StockReservationService.esPublicableEnMemoria`, `ProductoCatalogQueries`,
`EmpresaService.obtenerIdPorSlug` y `TelegramCompradorService.tiendaPublica`. Un test estructural
(`AltaFasesVisibilidadFailClosedTest`) falla si una consulta con `visibilidad_publica` no lo incluye.

Cobro en línea: `AltaFasesService.exigirCobroEnLinea` corta el checkout (web, Telegram comprador, encargos) en
`PaymentService.checkout` y `OnvoPaymentProvider.crearSesion`, el SINPE por ONVO del marketplace
(`SinpeOnvoMarketplaceService`) y el SINPE por ONVO del POS (`PosSinpeOnvoService`). Para un negocio por fases exige
además `estado_empresa = ACTIVO` y la cuenta ACTIVA consultada en vivo (no solo el predicado). El POS en efectivo y la
gestión interna (productos, inventario, equipo) no pasan por esos puntos y siguen funcionando.

Aprobar: `EmpresaAprobacionService.aprobarYPublicar` lanza 409 `ALTA_CUENTA_ONVO_NO_ACTIVA` si un negocio por fases no
tiene la cuenta ACTIVA (también al reactivar desde el cambio de estado del admin).

## Flag y comportamiento

`hotclick.alta-fases.enabled` (env `HOTCLICK_ALTA_FASES_ENABLED`, **por defecto true**):

| | flag = true (defecto) | flag = false |
|---|---|---|
| Negocio **nuevo** | borrador por fases: no público, no cobra, aprobar exige cuenta ACTIVA | como antes de V244 (aprobación manual, sin exigir ONVO) |
| Negocio **existente** | sin cambios | sin cambios |
| Pérdida de cuenta ACTIVA (cualquier negocio) | pausa cobros y publicación, alerta y recordatorios | igual (es protección de dinero, no depende del flag) |

Migrar los existentes es otro flag, `hotclick.alta-fases.migrar-existentes` (**false** por defecto; ver `MIGRACION_NEGOCIOS_EXISTENTES.md`).

Los negocios existentes **no se tocan** al desplegar: V244 los deja `alta_por_fases=FALSE` y
`venta_online_habilitada=TRUE`. Llevarlos al flujo nuevo es una decisión aparte: ver
[`MIGRACION_NEGOCIOS_EXISTENTES.md`](MIGRACION_NEGOCIOS_EXISTENTES.md).

## Avisos

| Evento | Admin (correo `adminit.email` + Telegram ops) | Dueño |
|---|---|---|
| Cuenta ONVO ACTIVA en un negocio por fases pendiente | **una vez** (claim atómico en BD, `revision_aviso_en`) | aviso en el panel (fase 4) |
| Cuenta ACTIVA → suspendida/inactiva/otra | primer aviso al detectarlo + recordatorios | panel en rojo + correo + Telegram vinculado, con el enlace de ONVO |
| Cuenta vuelve a ACTIVA | **una vez** «cobros reanudados» | **una vez** (correo + Telegram) |

Sin PII: solo id y nombre comercial del negocio y enlaces al panel. Nunca cédula, teléfono, correo ni cuenta bancaria.

**Cadencia de recordatorios** (corre en el mismo ciclo del poller, con ShedLock): el primer aviso sale en el ciclo en
que se detecta la pérdida; luego uno cada `hotclick.alta-fases.recordatorio-intervalo` (**24 h**, `PT24H`) hasta
`hotclick.alta-fases.recordatorio-max` avisos en total (**7** = el primero + 6 recordatorios ≈ una semana). Cada aviso
se reclama con un `UPDATE` condicional (intervalo y tope en la misma sentencia): ciclos repetidos o varios pods no
duplican. El contador se reinicia al recuperar la cuenta. Intervalo del poller: `onvo.cuentas.poller.intervalo-ms`
(10 min).

## Qué expone ONVO (lo que se puede vigilar)

La API de cuentas conectadas (`GET /v1/connected-accounts/{id}`) devuelve solo `id`, `mode`, `status`,
`businessName`, `marketplaceAppFee`, `createdAt` (y `onboardingUrl` al crear). **No** devuelve `requirements`,
estado de payouts ni datos bancarios. La pérdida de datos bancarios solo se puede inferir por `status`
(`temporally_suspended`, `permanently_suspended`, `restricted` → SUSPENDIDA; `inactive`, `deleted` → INACTIVA). Si ONVO
agrega esos campos, se suman en `CuentaOnvoService.mapear`.

Enlace «para corregir»: se regenera con `POST /onboarding-link`; ONVO responde 409 si el onboarding ya se completó
(caso típico de cuenta suspendida). En ese caso el aviso lleva el enlace al panel y el dueño debe escribir a soporte.

## Destino del dinero y saldo por reintegrar

Cada pago ONVO guarda `destino_dinero`: SUBCUENTA (con `onBehalfOf`) o PLATAFORMA (cuenta principal, sin split).
Un cobro que cae a PLATAFORMA de un negocio queda `NO_REINTEGRADO`. Admin: `GET /api/admin/reintegros` (por negocio y
moneda, con pedidos) y `POST /api/admin/reintegros/pagos/{id}/reintegrado` o `/negocios/{id}/reintegrado`
(idempotente, auditado con quién y cuándo, nota opcional). Solo `ROLE_ADMIN`. El SINPE por ONVO del marketplace
también cae a la cuenta de HotClick y se registra como PLATAFORMA. El SINPE del POS no crea `Pago` (sesión QR): no se
registra destino (ver decisiones pendientes).
