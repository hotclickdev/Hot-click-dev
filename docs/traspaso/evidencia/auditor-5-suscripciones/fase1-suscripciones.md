# Fase 1: auditoría de Suscripciones (solo lectura)

- Commit: master `fb9ef78e` (clon local `/workspace/hc-pagos-fb9`, sin cambios). Fecha: 25-oct-2026.
- Método: lectura de código, más la documentación pública de ONVO (copia local en `/workspace/onvo-docs/llms-full.txt` y `openapi.yaml`, de docs.onvopay.com). No corrí suites ni toqué prod.
- Rutas: `B/` = `Hot_click_outlet/src/main/java/com/hotclick/`.
- Etiquetas: **verificado** quiere decir que lo leí en el código o en la doc. **Deducido, falta reproducir** quiere decir que sale del código y no lo probé.
- Conteo: CORRECCIONES 9 (4 ALTO, 3 MEDIO, 2 BAJO). MEJORAS 5.

## Hallazgo de contexto (no es un defecto, pero define la severidad)
En master **no se puede pagar ni renovar ningún plan de pago**. `SuscripcionTilopayService.iniciarCambioPlan` (`B/service/suscripcion/SuscripcionTilopayService.java:74-78`) siempre lanza `CobroPlanNoDisponibleException` ("TODO: cobro por ONVO"). `confirmar` (:116-120) y `pendiente` (:188-191) también bloquean. Los dos endpoints, `/api/billing/checkout/{planId}` (`B/controller/SuscripcionController.java:115-123`) y `/api/billing/cambiar-plan/{planId}` (:179-197), llaman a ese servicio. El flujo ONVO ya armado, `SuscripcionOnvoChangeService.cambiarPlan` (`B/service/suscripcion/SuscripcionOnvoChangeService.java:98`), **no lo llama ningún controlador**: `SuscripcionService.cambiarPlanOnvo` no tiene llamadores (verificado con grep). En cambio, el webhook de billing ONVO **sí está activo** (`B/controller/OnvoWebhookController.java:92`).

## CORRECCIONES

### S-01: ALTO. Los negocios que pagan pasan a PAST_DUE y bajan de plan sin forma de pagar
- Archivo: `B/service/suscripcion/RenovacionesTilopayService.java:42-50` (no genera el cobro, pero sí marca PAST_DUE). `B/service/suscripcion/SuscripcionRenewalService.java:42-53` (degrada a los 7 días de gracia). `SuscripcionTilopayService.java:188-191` (no deja pagar).
- Riesgo: todo PYME o NEGOCIO_PLUS con `fecha_fin <= hoy` pasa a PAST_DUE en el job de las 3:00 a. m. (`B/scheduler/BillingRenewalScheduler.java:33-40`). Siete días después baja a plan base y pierde límites y funciones. Mientras tanto la UI no tiene ninguna forma de cobrarle. En el lanzamiento, los planes de pago terminan solos al primer vencimiento.
- Reproducir (deducido, falta reproducir en staging): suscripción ACTIVA PYME con `fecha_fin` = ayer, correr `procesarRenovaciones()`. Queda PAST_DUE, sin cobro, y `GET /api/billing/tilopay/pendiente` da error. Con `fecha_fin` hace más de 8 días, queda degradada.
- Corrección: hasta que exista el cobro ONVO, no pasar a PAST_DUE ni degradar a quien no tiene cómo pagar (interruptor `hotclick.billing.renovacion-activa=false`, o saltar si no hay pasarela). Otra opción es cablear el cobro recurrente ONVO (ver S-02 a S-04) antes de habilitar el job.
- Criterio: C1 (flujo de cobro) y C6.
- Evidencia: el código citado. El comentario en :43 dice "Cobro de planes por Tilopay prohibido: no se genera cobro de renovación (TODO: ONVO)".

### S-02: ALTO. El webhook de billing ONVO activa planes con lo que dice el cuerpo, sin reconsultar a ONVO ni revisar `mode`, monto ni estado
- Archivo: `B/service/suscripcion/OnvoBillingWebhookHandler.java:73-114` (`despachar` / `activarDesdeData`) y `B/service/suscripcion/SuscripcionOnvoChangeService.java:297-328` (`procesarPagoOnvoExitoso`).
- Riesgo: el comentario del controlador dice que "el cuerpo nunca confirma nada" (`OnvoWebhookController.java:29`), y para pedidos sí se reconsulta por GET. Billing en cambio:
  - toma `empresa_id` y `plan_id` de `data.metadata` y activa el plan por un mes;
  - no revisa `data.mode` (el payload de ONVO trae `"mode":"test"|"live"`), ni `status` (`paid` / `succeeded`), ni `total` o `amount` contra el precio del plan, ni `currency` CRC;
  - un `payment-intent.succeeded` con esas dos claves de metadata también activa el plan (:78-81, :124-126).

  Es el mismo patrón que el C9 de Auditor 1 (acepta `mode` o `id` ausentes) y el mismo riesgo que su C2: un evento de modo test que llegue a prod activa un plan real. Si se filtra el secret del webhook, cualquiera se regala NEGOCIO_PLUS.
- Reproducir (deducido, falta reproducir en staging con llave test): `POST /api/webhooks/onvo` con el `X-Webhook-Secret` válido y el cuerpo `{"type":"subscription.renewal.succeeded","data":{"mode":"test","subscriptionId":"<sub de la empresa>","total":1}}`. La empresa queda ACTIVA con el plan de `sub.plan` y `fecha_fin` = hoy + 1 mes. Con `payment-intent.succeeded` y `metadata.empresa_id`/`plan_id` de otra empresa sin suscripción, se activa por `findActivaByEmpresaId` (:299-303).
- Corrección: igual que en pedidos, el cuerpo solo dispara la verificación. Hay que hacer GET a ONVO de la renovación, el PaymentIntent o `GET /v1/subscriptions/{id}`, y exigir `mode` presente e igual a live en prod (test solo en dev/test), estado pagado, monto igual al precio del plan del `priceId` guardado y moneda CRC. El plan sale del `priceId` confirmado por ONVO, no de `metadata.plan_id`. Hay que rechazar (con 4xx o 409 para que ONVO reintente) si falta `mode` o el id. Conviene reutilizar el verificador endurecido de Auditor 1 cuando cierre C9.
- Criterio: C3 (sin cobros de prueba en prod) y C1.
- Evidencia: el handler citado. La doc de ONVO ("Webhooks > Payloads por evento") muestra `mode`, `status`, `total` y `subscriptionId` en `subscription.renewal.succeeded`, y recomienda "Verificá el origen del evento con el secret" y "Procesá el evento de forma idempotente".

### S-03: ALTO. Una suscripción ONVO cancelada "al vencer" nunca baja de plan, y una ACTIVA sin renovación nunca vence
- Archivo: `B/service/suscripcion/OnvoBillingWebhookHandler.java:90-96` (espera `subscription.deleted` o `subscription.canceled`). `B/service/suscripcion/RenovacionesTilopayService.java:81-87` (`vence()` excluye `cancelarAlVencer=true`). `B/repository/SuscripcionRepository.java:42,58-65` (solo vence PAST_DUE).
- Riesgo: según la doc de ONVO, la lista de eventos soportados es `payment-intent.succeeded`, `payment-intent.failed`, `payment-intent.deferred`, `subscription.renewal.succeeded`, `subscription.renewal.failed`, `checkout-session.succeeded` y `mobile-transfer.received`. **No existen** `subscription.deleted`, `subscription.canceled` ni `invoice.*`. Después de `cancelAtPeriodEnd` (`SuscripcionOnvoChangeService.java:143-160`), nada pasa la suscripción a CANCELADO: el job la ignora por `cancelarAlVencer` y no llega ningún evento. El negocio conserva el plan de pago para siempre. Lo mismo pasa con una ACTIVA cuyo webhook de renovación se pierde, si el job de Tilopay se apaga (S-01).
- Reproducir (deducido, falta reproducir): suscripción ACTIVA PYME con `cancelar_al_vencer=true` y `fecha_fin` en el pasado, correr el job. Sigue ACTIVA y la empresa sigue en PYME.
- Corrección: en el job diario, degradar las suscripciones con `cancelarAlVencer=true` y `fecha_fin < hoy`. Para ACTIVA vencida con id ONVO, reconsultar `GET /v1/subscriptions/{id}` (status / currentPeriodEnd) y sincronizar. Quitar los nombres de eventos que ONVO no emite o dejarlos solo como compatibilidad.
- Criterio: C1 y C6.
- Evidencia: la tabla "Eventos soportados" en `onvo-docs/llms-full.txt` (aprox. líneas 2787-2800) y el código citado.

### S-04: ALTO. La idempotencia del webhook ONVO usa una clave que bloquea las renovaciones fallidas de los meses siguientes
- Archivo: `B/service/suscripcion/OnvoBillingWebhookHandler.java:163-170`, con `B/controller/OnvoWebhookController.java:89`.
- Riesgo: el payload de ONVO es `{type, data}` y no trae `id` arriba (doc "Formato del payload"), así que `eventIdRaw` siempre es null. Para `subscription.renewal.failed`, `data` tampoco trae `id` (ejemplo de la doc), y la clave queda `onvo_subscription.renewal.failed_<subscriptionId>`, igual para todos los períodos y reintentos. Después de la primera falla marcada OK, toda falla posterior de esa suscripción, por ejemplo la del mes siguiente, se descarta como "ya procesado" (:43-46). La suscripción sigue ACTIVA aunque ONVO la tenga `past_due`.
- Reproducir (deducido, falta reproducir): enviar dos `subscription.renewal.failed` con el mismo `subscriptionId` e `invoicePeriodStart` distinto. El segundo responde 200 "billing" sin cambiar el estado. Hay que regresar la suscripción a ACTIVO entre los dos (por ejemplo con un `renewal.succeeded`) para ver el efecto.
- Corrección: armar la clave con `paymentIntentId` + `attemptCount` (o `invoicePeriodStart`) en las fallas, y con `data.id` (id de la renovación) en los éxitos. Agregar una prueba con dos períodos.
- Criterio: C6 (y C2: falta una prueba de regresión).
- Evidencia: el ejemplo `subscription.renewal.failed` de la doc (sin `data.id`; trae `paymentIntentId` y `attemptCount`) y el código citado.

### S-05: MEDIO. Crear la suscripción ONVO con @Retry y sin protección contra duplicados
- Archivo: `B/service/onvo/OnvoBillingClient.java:173-191` (`@Retry` sobre `POST /subscriptions`) y :154 (`POST /customers`).
- Riesgo: si ONVO crea la suscripción y la respuesta se pierde (timeout), el reintento crea otra. Quedan dos suscripciones y dos cobros recurrentes para un mismo negocio. La API pública de ONVO no documenta un header de idempotencia (busqué "idempot" en `openapi.yaml` y no hay resultados), así que la protección tiene que ser local. Hoy el camino no se puede usar (ver contexto), pero queda listo para cuando se cablee.
- Reproducir (deducido, falta reproducir): simular un timeout después de que ONVO responde 201 (WireMock con delay mayor al read-timeout). Resilience4j reintenta el POST.
- Corrección: no reintentar POST que crean recursos. Antes de crear, buscar la suscripción del customer (`GET /v1/subscriptions?customerId=`), y guardar un registro local "alta en curso" con lock por empresa.
- Criterio: C1 y C6.
- Evidencia: las anotaciones citadas y la ausencia de idempotencia en el OpenAPI de ONVO.

### S-06: MEDIO. El cambio de plan ONVO marca el plan destino en la suscripción antes de que se pague, y lo aplica en la próxima renovación sin validar el monto
- Archivo: `B/service/suscripcion/SuscripcionOnvoChangeService.java:162-176` y :240-247 (`guardarOnvoPricePendiente` hace `sub.setPlan(planDestino)`), más :305-307 (la renovación usa `sub.getPlan()`).
- Riesgo: al subir de PYME a NEGOCIO_PLUS, el siguiente `renewal.succeeded` activa Plus aunque ONVO haya cobrado el precio viejo (por ejemplo, si el PATCH del item falló a medias o la renovación es del período anterior). Al bajar de plan pasa lo contrario. El admin ve en `sub.plan` un plan que no se pagó. Camino hoy inalcanzable (ver contexto).
- Reproducir (deducido, falta reproducir): con `cambiarPlanExistente` a Plus, enviar `renewal.succeeded` con `total` = precio PYME. Activa Plus.
- Corrección: guardar el plan pendiente aparte (`planPendienteId`) y aplicarlo solo si el monto o el priceId confirmados por ONVO coinciden (se cubre con S-02).
- Criterio: C1.
- Evidencia: el código citado.

### S-07: MEDIO. El trial asigna un plan cualquiera
- Archivo: `B/service/suscripcion/SuscripcionBillingService.java:55-58`.
- Riesgo: busca el plan "PRO", que ya no existe (los planes sembrados son EMPRENDEDOR, PYME y NEGOCIO_PLUS, en `B/config/DataSeeder.java:76-87`). Cae al primer plan distinto de FREE que devuelva `findAll()`, sin orden garantizado. Según el orden de la BD, el trial puede dar 14 días de NEGOCIO_PLUS o de EMPRENDEDOR.
- Reproducir (deducido, falta reproducir): `POST /api/billing/trial` con una empresa nueva y revisar `empresa.plan`.
- Corrección: definir el plan del trial por configuración (por ejemplo PYME), o quitar el endpoint si el trial ya no forma parte de la oferta.
- Criterio: C1.
- Evidencia: el código citado.

### S-08: BAJO. El período se calcula con "hoy + 1 mes" en lugar del período de ONVO
- Archivo: `B/service/suscripcion/SuscripcionOnvoChangeService.java:283` y :316.
- Riesgo: si el webhook llega tarde o se reintenta días después, `fecha_fin` se corre y se desalinea con `periodEnd` de ONVO. Eso da días gratis o una degradación antes de tiempo.
- Corrección: usar `data.periodEnd` / `currentPeriodEnd` del objeto reconsultado en ONVO.
- Criterio: C6. Evidencia: el código y el payload `subscription.renewal.succeeded` de la doc (`periodStart` / `periodEnd`). Deducido.

### S-09: BAJO. Los límites y las funciones dejan pasar todo cuando la empresa no tiene plan
- Archivo: `B/service/tenant/TenantLimitChecker.java:85` y :130 (`if (empresa == null || empresa.getPlan() == null) return;`).
- Riesgo: una empresa sin `plan` (dato incompleto o backfill fallido) no tiene tope de productos, bodegas ni usuarios, y pasa las verificaciones de funciones (`giftCards`, `sucursales`). `DataSeeder.backfillSinPlan` lo mitiga al arrancar.
- Corrección: si no hay plan, aplicar los límites de EMPRENDEDOR (fail-closed).
- Criterio: C5. Evidencia: el código. Deducido.

### Herencia de los hallazgos de Auditor 1
- C2 (la llave test confirma pedidos reales): **en el cliente no se hereda**. `OnvoBillingClient.validarLlaveAlArrancar` (:78-91) aborta el arranque con `onvo_test_` fuera de dev/test, salvo con el opt-in, que deshabilita billing (:94-96). **En el webhook sí se hereda** por otro camino: no se revisa `mode` (S-02).
- C6 (lock de fila): el handler bloquea la fila del evento (`findByIdForUpdate`, :44) pero no la de la suscripción, y si la fila del evento no existe no hay lock (dos entregas concurrentes compiten por el insert; la segunda falla con PK y ONVO reintenta). Es aceptable, aunque conviene `SELECT ... FOR UPDATE` de la suscripción al aplicar el plan. Lo incluyo en S-02.
- C9 (verificador acepta `mode` o `id` ausentes): **se hereda y es peor**, porque billing ni siquiera usa el verificador (S-02).
- Roles: el cambio de plan y la cancelación están protegidos por `propietarioGuard` (`SuscripcionController.java:120,162,185`), así que el A2 de Auditor 2 (todo miembro es EMPRENDEDOR) **no** aplica al cambio de plan. `BillingPreferenciasController` (`@PreAuthorize EMPRENDEDOR`, :23) no tiene ese guard. No lo revisé a fondo.
- Aislamiento entre tenants: los endpoints de billing toman `empresaId` de `TenantContext` y no del request (verificado). El único cruce posible es por la metadata del webhook (S-02).

## MEJORAS

| # | Impacto | Esfuerzo | Archivos | Cambio propuesto |
|---|---|---|---|---|
| M-1 | Alto | Medio | `SuscripcionController`, `SuscripcionOnvoChangeService` | Decidir y cablear una sola pasarela (ONVO) en `/cambiar-plan` y `/checkout`, y borrar los caminos Stripe y Tilopay de planes (`BillingWebhookController`, `SuscripcionTilopayService`, `RenovacionesTilopayService`) cuando ONVO esté listo. |
| M-2 | Alto | Bajo | `OnvoBillingWebhookHandler` | Alerta `[ALERTA-PAGO]` y métrica por cada evento de billing rechazado, no verificado o con tipo desconocido (C6). |
| M-3 | Medio | Medio | tests de billing | Pruebas con los payloads exactos de la doc ONVO (renewal ok/failed en dos períodos, mode test en perfil prod, monto distinto), para C2. |
| M-4 | Medio | Bajo | `BillingRenewalScheduler` | Job de reconciliación: comparar las suscripciones locales con `GET /v1/subscriptions/{id}` (status, currentPeriodEnd, cancelAtPeriodEnd). |
| M-5 | Bajo | Bajo | `OnvoBillingClient` | Validar al arrancar que `onvo.price-id.pyme` y `onvo.price-id.negocio-plus` existan en ONVO y que su monto coincida con `plan.precio_mensual`. |

## No verificado o fuera de alcance
- Si ONVO usa un secret de webhook distinto por modo (test o live). La doc no lo aclara, y eso define qué tan explotable es S-02 sin que el secret se filtre.
- La aplicación de los límites en el frontend (`PlanGate`, `PlanPathGate`) no la revisé en detalle. El backend sí aplica productos, bodegas, usuarios, CRM y compras; POS va en todos los planes por decisión del dueño.
