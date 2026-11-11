# Gate fail-closed antes de cancelar un pago ONVO en línea: cobertura y límite

Rama `fix/limpieza-pago-capturado-onvo` (MEDIO limpieza: cobro capturado en ONVO y pedido cancelado por el TTL).

## Regla

Un pago ONVO en línea (checkout hospedado) solo se cancela, se marca FALLIDO o libera stock si ONVO confirma **por GET**
que su payment intent **no cobró y ya no se puede pagar**: `canceled`, o `requires_payment_method` /
`requires_confirmation` con la sesión `expired` (o inexistente, decidiendo el intent guardado), siempre sin
`receivedAmount`, con el mismo `id` y el mismo `mode` que la llave. Lo decide `OnvoPaymentProvider#revisarCobro`
(resultado `SIN_COBRO`). Con la sesión todavía abierta el resultado es `SIN_COBRO_SESION_ABIERTA` (fix2): solo autoriza
a expirar primero y volver a leer, nunca a liberar.

- Intent `succeeded` con monto, moneda, modo e id iguales:
  - **Expiración automática** (limpieza TTL, respaldo, rechazo): captura idempotente existente
    (`OnvoCapturaService#capturarVerificado`: dedupe por sesión + `SELECT FOR UPDATE` del pago). Confirma si hay stock; sin
    stock o con el pedido ya cancelado queda `REEMBOLSO_PENDIENTE` con aviso al admin.
  - **Cancelación explícita** del comprador, invitado o panel (fix2): el gate corre con `capturar=false` y devuelve
    `COBRADO_SIN_CAPTURAR`. Nunca se confirma la venta: con el pago bloqueado se registra la intención (V238), se
    cancela el pedido, la reserva se libera una sola vez (`stockReservadoEn`) y el pago queda `REEMBOLSO_PENDIENTE` con
    aviso (`OnvoCapturaService#registrarCobroSobreCancelacionExplicita`, `MANDATORY`, en la transacción de quien llama).
  - **Venta ya confirmada** (pago `CAPTURADO` al bloquear): 409, revisión del admin. Sin devolución automática ni
    reversión de stock inferida.
- Error, timeout, respuesta vacía, otro id/modo, estado intermedio (`processing`, `requires_action`,
  `requires_capture`, desconocido) o monto distinto: `EN_DUDA` / `DATOS_DISTINTOS`. No se toca nada; se reintenta en la
  próxima vuelta.
- **Sesión inexistente (404) no prueba que el intent no cobró.** Se usa el intent guardado en el pago
  (`hot_click_pago_tb.onvo_payment_intent_id`, V237, aditiva), que se guarda la primera vez que un GET de la sesión lo
  muestra (verificación del webhook, retorno, respaldo, limpieza o cancelación). Sin intent guardado: `EN_DUDA`, alerta
  `[ALERTA-PAGO]` y revisión manual. El pago queda PENDIENTE con su reserva de stock.
- Solo GET a ONVO. No hay escrituras nuevas a ONVO ni Idempotency-Key. Las escrituras que ya existían (`/expire` de la
  sesión y el cancel del intent SINPE del marketplace) no cambian.
- Modo simulado explícito (`OnvoService#isMockMode`, solo con perfil dev/test sin llave): `SIN_COBRO` como antes, porque
  no hay sesión ni intent reales.

## Vías revisadas (estado en fix2)

| Vía | Qué hace ahora |
|---|---|
| `PaymentExpirationCleanupService` NO_PAGADO | gate antes del rechazo/expire (acepta `SIN_COBRO_SESION_ABIERTA` solo para expirar); expire; última lectura exige `SIN_COBRO` |
| `PaymentExpirationCleanupService` NO_ENCONTRADO (404) | gate con el intent guardado; sin intent no cancela |
| `ReservaSospechosaLiberador` (anti-bot) | **no libera pagos ONVO en línea** (no expira la sesión y no se agregan escrituras a ONVO; la sesión podía seguir pagable). Los cierra la limpieza TTL. Sin llamadas a ONVO |
| `PaymentUserCancellationService` (comprador, invitado, panel) | expire + gate `capturar=false`. `SIN_COBRO`: revalida el pago con `FOR UPDATE` y cancela. Cobrado: REEMBOLSO_PENDIENTE (arriba). En duda / datos distintos / sesión abierta: 409 y la intención queda registrada (commit sin rollback: `noRollbackFor`) |
| `OnvoRechazoService#cerrarSiRechazado` | intent rechazado + expire + última lectura `SIN_COBRO` antes de FALLIDO |
| `OnvoPendientesReconsultaService` pendientes | NO_PAGADO/NO_ENCONTRADO → gate (si cobró, confirma o REEMBOLSO_PENDIENTE si se pidió cancelar); rechazo con `SIN_COBRO` o sesión abierta (el rechazo expira y relee) |
| `OnvoPendientesReconsultaService` cerrados (FALLIDO/CANCELADO) | **conciliación durable sin corte por antigüedad** (abajo) |
| Webhook `checkout-session.succeeded` / `payment-intent.succeeded` | captura idempotente; respeta la intención registrada (cobro → pedido cancelado + REEMBOLSO_PENDIENTE) |
| `ReservaTiendaVencidaService` | sin cambio (solo pedidos sin `Pago`) |
| `SinpeOnvoMarketplaceService` (SINPE por intent) | sin cambio; su propia ventana `sinpe.onvo.cerrados-ventana-horas` (24 h) queda fuera de este alcance |

## Intención explícita de cancelar (V238)

`hot_click_pago_tb.cancelacion_solicitada_en` / `_origen` (USUARIO, INVITADO, PANEL). Se escribe con un UPDATE
condicional (la primera gana; columna `updatable=false` en la entidad para que un save obsoleto no la pise) cuando el
comprador o el panel pide cancelar un pago ONVO con sesión, solo si el pago sigue `PENDIENTE`. La captura la relee de
la base: con la intención registrada un cobro nunca confirma la venta.

**Intención antes de red (fix2, alcance confirmado por Grok Bot):** la intención se guarda ANTES de la primera llamada a
ONVO (`/expire` o GET). Sin locks tomados (comprador, invitado y la fase previa del panel) va en su propia transacción
confirmada (`CancelacionIntencionService`, `REQUIRES_NEW`): sobrevive a un fallo de red, a un reinicio o a un rollback
posterior. Si el `/expire` falla con la intención guardada, la respuesta es el 409 de «cancelación registrada» (veraz:
un cobro posterior va a reembolso, no confirma). Si la intención no se puede guardar, no se llama a ONVO ni se cancela
(409, reintentar).

- La transacción propia aplica `lock_timeout` (`hotclick.billing.lock-timeout-ms`, 5000 ms; solo PostgreSQL) antes del
  UPDATE: si una captura tiene el pago bloqueado, falla a los ~5 s con 409 y sin red (no se cuelga).
- Si el UPDATE no aplica (`false`): se relee el estado en la base. Sigue `PENDIENTE` (o no se puede leer) → 409 sin red.
  Cobrado o en reembolso → 409 «venta confirmada», sin red.
- Los wrappers no revierten la intención: `PaymentService#cancelarPorUsuario/cancelarAnon` con
  `noRollbackFor = CancelacionPendienteOnvoException`; `TelegramFlujoService#cambiarEstadoPedidoTx` (`REQUIRES_NEW`) con
  `noRollbackFor = CancelacionSolicitadaRegistradaException`. Igual, la intención va en `REQUIRES_NEW` y ya está
  confirmada antes de la red; un rollback de quien llama no la borra.
- Comprador/invitado con cobro sin capturar: la cancelación termina con el pedido cancelado y el pago
  `REEMBOLSO_PENDIENTE` y **retorna**; ya no se llama a `marcarFallido` (pisaba `REEMBOLSO_PENDIENTE`).

## Locks y orden

- Comprador/invitado: GET a ONVO sin locks → `FOR UPDATE` del pago (refresh) → pedidos/productos. Mismo orden que la
  captura del webhook (pago → pedidos → productos).
- Panel (fix2): `PedidoService#cambiarEstado` con `CANCELADO` corre primero una fase SIN locks
  (`cerrarPagoOnvoAntesDeCancelarSinLocks`): lee el pedido sin bloquear y valida la transición; intención en
  transacción propia; `/expire` + GET sin locks; después `FOR UPDATE` del pago (y, si hubo cobro, la captura bloquea los
  pedidos). Recién entonces `FOR UPDATE` del pedido (flush + refresh para decidir con el estado actual). Orden
  pago → pedido, igual que el webhook: ya no hay cruce panel/webhook. Ningún lock se mantiene durante la red.
  Respaldo con el pedido YA bloqueado (la fase previa no corrió o el pedido cambió en medio): **no** se llama a ONVO ni
  se captura bajo ese lock (invertiría el orden pedido → pago). Sin pago, sigue; con pago, 409 reintentable
  («El pedido cambió mientras se cancelaba…»); el reintento entra por la fase sin locks.
- EntityManager obligatorio (`@PersistenceContext`, sin fallback): si falta `EntityManagerFactory` la app no arranca
  (`CacheEvictEmpresaSinIdTest#sinJpaNoArranca`). El bloqueo del pago usa `findByIdForUpdate(...).orElseThrow()` + flush
  + refresh; ya no hay `orElse(pago)` (fail-closed: sin fila bloqueada no se decide).
- Prueba (H2): durante el `/expire` simulado, otra conexión ve la intención confirmada y toma `FOR UPDATE` de pedido y
  pago sin esperar (`AdminCancelarExpiraOnvoTest#intencionConfirmadaYSinLocksDuranteRed`).
- PostgreSQL real: `PagoOnvoCancelacionLocksPostgresTest` (12 casos: wrappers comprador/panel(Telegram)/captura,
  intención con timeout sin red, rollback, captura vs liberación, SKIP LOCKED, lease entre dos instancias, backoff tras
  reinicio, fairness con 5000 históricos) y `PagoConciliacionFlywayPostgresTest` (Flyway desde esquema vacío con V236
  sintético → V237/V238, validate, segundo migrate sin reaplicar, nullable/índices). Corren en el job `onvo-alta-pg` con
  gate fail-on-skip (`scripts/ci/fix2-pg-surefire.py`). **No ejecutados todavía**: no hay PostgreSQL local; hasta CI no
  hay evidencia PG real. H2 no es equivalente.

## Conciliación durable de cerrados (V238)

- Sin corte de 24 h. Reclamo: FALLIDO/CANCELADO ONVO con sesión, `conciliacion_resuelta_en IS NULL` y
  `conciliacion_proxima_en` vencida o NULL, `FOR UPDATE SKIP LOCKED`, por lotes.
- Dentro del reclamo, ANTES de llamar a ONVO, se agenda la próxima reconsulta: backoff `base * 2^(intentos-1)` con tope
  (por defecto 2 min y 1440 min). Tras un reinicio cada pago vuelve a salir cuando le toca; nada vive en memoria.
- Resuelto con cobro: la captura sobre el pedido cancelado deja el pago `REEMBOLSO_PENDIENTE` (sale de la consulta).
- Resuelto sin cobro: solo intent `canceled` (ONVO no lo reutiliza) → `conciliacion_resuelta_en`.
- `requires_payment_method` / `requires_confirmation` con la sesión expirada **no** se dan por resueltos: se siguen
  reconsultando con el tope. A los N intentos (por defecto 30) queda UNA alerta `[ALERTA-PAGO]` para revisión manual.
- Sesión 404 sin intent guardado (p. ej. pagos anteriores a V237): no se puede resolver por GET; queda marcado
  (`conciliacion_sin_referencia_en`) y pasa directo al tope de backoff, sin contar otro intento (`reagendarSinContar`:
  ya se contó al reclamarlo). Sin backfill.
- `canceled` es el único terminal sin cobro. `requires_payment_method` queda en reconsulta indefinida con el tope diario:
  no se inventa otro terminal ni se hace POST a ONVO.
- `guardarIntentId` solo escribe si no había intent (`... AND onvo_payment_intent_id IS NULL`). Si la sesión trae un
  intent distinto del guardado: `[ALERTA-PAGO]` y el gate devuelve EN_DUDA; nunca se reemplaza la referencia.
- `agendarEnDuda` (pendientes) nunca adelanta una próxima reconsulta ya agendada más lejos (`GREATEST`).

## Control de tormenta de consultas y alertas (fix2, persistente)

Todo vive en columnas de `hot_click_pago_tb` (V238), salvo la ventana de la alerta de backlog (ver abajo); un reinicio no
repite la tormenta de consultas.

- **Fairness recientes/históricos (lotes):** tres reclamos disjuntos con `FOR UPDATE SKIP LOCKED` por corrida:
  1. recientes (`fecha_creacion >= ahora - conciliacion-reciente-horas`), hasta la mitad del lote;
  2. históricos con reintento vencido, hasta la mitad de lo que queda;
  3. históricos nunca agendados (de los más nuevos a los más viejos) con el resto;
  4. relleno con más recientes si los históricos no usaron su parte.
  Cada fila reclamada se agenda en la misma transacción antes de llamar a ONVO (lease): otra instancia o el relleno no la
  vuelven a tomar. La edad solo da prioridad; nadie se descarta. Con 5000+ históricos, los recientes salen en la primera
  corrida y los históricos avanzan en todas (prueba PG `fairnessBacklogCincoMilHistoricosYRecientes`).
- **Backlog:** al final de cada corrida se cuentan los cerrados vencidos o nunca agendados; si superan
  `conciliacion-backlog-alerta` sale UNA `[ALERTA-PAGO]` por ventana de `conciliacion-backlog-alerta-cada-minutos`.
  Esa ventana vive en memoria **por instancia** (residual: con N instancias, hasta N alertas por ventana; un reinicio
  puede repetirla una vez).
- **Pendientes en duda (backoff):** el respaldo de pendientes y la limpieza TTL reagendan con el mismo backoff los
  pagos `PENDIENTE` que quedan en duda (404 sin referencia, intent en proceso, ONVO caído, datos distintos); no vuelven
  a consultarse hasta su `conciliacion_proxima_en`. Capturados y rechazados no se reagendan.
- **404 sin referencia (dedupe):** la primera vez se marca con un UPDATE condicional; solo esa vez sale el log: si el
  pago sigue `PENDIENTE` (reserva tomada) como `[ALERTA-PAGO]`, si ya estaba cerrado como WARN. La conciliación de
  cerrados deja además UNA alerta resumen por corrida con la cantidad de nuevos sin referencia. Las vueltas siguientes
  solo registran DEBUG.
- **Alerta de intentos:** UNA `[ALERTA-PAGO]` cuando `conciliacion_intentos` llega al umbral (no en cada vuelta).
- **Sin abandono por edad:** ninguna regla descarta un pago por antigüedad; solo se espacia hasta el tope (1 consulta
  por día por pago con los valores por defecto). Dejar de reconsultar es una decisión pendiente (abajo).

### Parámetros técnicos (provisionales; valores por defecto en `application.properties`)

| Propiedad (`hotclick.pagos.onvo.respaldo.*`) | Variable de entorno | Defecto | Efecto |
|---|---|---|---|
| `cerrados-habilitado` | `HOTCLICK_PAGOS_ONVO_RESPALDO_CERRADOS_HABILITADO` | `true` | Activa la conciliación de cerrados |
| `conciliacion-backoff-base-minutos` | `HOTCLICK_PAGOS_ONVO_CONCILIACION_BACKOFF_BASE_MINUTOS` | 2 | Espera del 1.er reintento; luego `base*2^(n-1)` |
| `conciliacion-backoff-max-minutos` | `HOTCLICK_PAGOS_ONVO_CONCILIACION_BACKOFF_MAX_MINUTOS` | 1440 | Tope de espera (y espera fija de sin referencia) |
| `conciliacion-alerta-intentos` | `HOTCLICK_PAGOS_ONVO_CONCILIACION_ALERTA_INTENTOS` | 30 | Intento en que sale la única alerta por pago |
| `conciliacion-lote` | `HOTCLICK_PAGOS_ONVO_CONCILIACION_LOTE` | 10 (1..`lote-max`) | Cerrados por corrida (cuotas recientes/históricos arriba) |
| `conciliacion-reciente-horas` | `HOTCLICK_PAGOS_ONVO_CONCILIACION_RECIENTE_HORAS` | 72 (> 0) | Edad que separa recientes de históricos (solo prioridad) |
| `conciliacion-backlog-alerta` | `HOTCLICK_PAGOS_ONVO_CONCILIACION_BACKLOG_ALERTA` | 1000 (> 0) | Umbral de la alerta de backlog |
| `conciliacion-backlog-alerta-cada-minutos` | `HOTCLICK_PAGOS_ONVO_CONCILIACION_BACKLOG_ALERTA_CADA_MINUTOS` | 60 (> 0) | Ventana de la alerta (en memoria, por instancia) |
| `lote` / `lote-max` | `HOTCLICK_PAGOS_ONVO_RESPALDO_LOTE` / `_LOTE_MAX` | 20 / 200 | Pendientes por corrida y tope validado |
| `antiguedad-min-minutos` | `HOTCLICK_PAGOS_ONVO_RESPALDO_ANTIGUEDAD_MIN_MINUTOS` | 5 | Antigüedad mínima para reconsultar un pendiente |
| `intervalo-ms` | `HOTCLICK_PAGOS_ONVO_RESPALDO_INTERVALO_MS` | 120000 | Frecuencia del job de respaldo |

Cota de consultas a ONVO por corrida del respaldo: `lote` pendientes + `conciliacion-lote` cerrados (cada uno hasta 2
GET). Con los valores por defecto: hasta 30 pagos cada 2 min. Con el backoff, un pago sin resolver baja a 1 vuelta
diaria tras ~11 intentos (~1,4 días).

## Límite: el último GET no es atómico

ONVO no ofrece un «cancelá solo si no cobró» atómico, y no se agregan escrituras a ONVO. Entre el último GET y el commit
local que cancela, el intent puede pasar a `succeeded`. La ventana es la latencia de las llamadas HTTP a ONVO más la
transacción local (no «milisegundos»: incluye timeouts de red). Mitigaciones:

1. En la limpieza TTL, el rechazo y la cancelación explícita la sesión se expira antes en ONVO (`/expire`, camino
   existente). El anti-bot **no** expira: por eso ya no libera pagos ONVO. El respaldo de pendientes no expira y solo
   cancela por el rechazo, que sí expira.
2. El gate se corre otra vez justo antes del cierre (limpieza, rechazo) y la cancelación explícita revalida el pago con
   `FOR UPDATE` después del GET.
3. **Compensación del cobro tardío:** la captura sobre un pedido cancelado o con la cancelación pedida nunca lo resucita:
   `REEMBOLSO_PENDIENTE` + aviso. Si el webhook se pierde, la conciliación durable de cerrados lo encuentra sin límite de
   edad. El stock ya liberado no se vuelve a descontar; el reembolso lo resuelve el admin.

## Otros residuales

- 404 sin intent guardado: el pago queda PENDIENTE con la reserva hasta revisión manual (una alerta por pago y
  reconsulta diaria).
- Intención antes de red: si el comprador cancela, el `/expire` falla y después igual paga el link, ese cobro va a
  `REEMBOLSO_PENDIENTE` (no confirma). Es la consecuencia del alcance confirmado; el mensaje se lo advierte.
- Carrera: si la captura confirma justo después de guardar la intención y antes del GET, la captura respeta la
  intención (reembolso); el panel puede responder «ya está pagado» con el estado leído. Cubierto por las pruebas PG
  (no ejecutadas aún).
- Alerta de backlog deduplicada en memoria por instancia (no persistente).
- `StockReservationService` (fuera del diff de fix2) todavía usa `entityManager != null` antes de `refresh`; con
  `@PersistenceContext` el EntityManager no es nulo en runtime, pero el patrón queda anotado para revisión.
- Si ONVO no copia la metadata del checkout al intent, `payment-intent.succeeded` de una venta en línea solo se resuelve
  por el intent guardado; la limpieza y la conciliación siguen cubriendo el caso.
- Un intent `succeeded` con la sesión expired/unpaid o 404 se confirma (expiración automática) solo con la verificación
  del intent. Relaja el «paid+expired nunca ACEPTAR» de `OnvoCobroVerificador#decidir`, que no cambió para el webhook.
- El anti-bot ya no acorta la reserva de pagos ONVO: un bot retiene stock hasta el TTL de la pasarela (30 min).

## Decisiones pendientes (no aprobadas; no se eligieron aquí)

1. Horizonte de la conciliación: hoy no se abandona nunca (tope diario). ¿Cuándo pasa a manual y deja de reconsultar?
2. Pagos cerrados anteriores a V238: sin backfill; ahora se escalonan por la cuota de nuevos (técnico). ¿Excluirlos o
   pasarlos a manual?
3. Valores de backoff, lote, horizonte de «reciente», umbral y ventana de alerta de backlog (tabla de arriba; técnicos y
   provisionales).
4. ~~¿Registrar la intención cuando el `/expire` falla?~~ Grok Bot confirmó el alcance «intención antes de red»
   (implementado). Andrés no respondió directamente.
5. Anti-bot para ONVO: ¿aceptar que la reserva dure el TTL completo, o autorizar otro mecanismo?
6. Mensajes al comprador/panel en los nuevos 409 y en la cancelación con cobro (hoy responde «Pedido cancelado»).
