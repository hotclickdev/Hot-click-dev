# ONVO billing: consultas de prechequeo antes del deploy (solo lectura)

Contexto: `OnvoBillingWebhookHandler` verifica por GET a ONVO que la suscripción local pertenezca al mismo
`customerId`. Una fila con `onvo_subscription_id` pero sin `onvo_customer_id` (heredada) solo se acepta si la
metadata de la suscripción en ONVO lleva el `empresa_id` de la misma empresa; si no, el evento se rechaza
(rechazo permanente `customer`, responde 200 y queda en el ledger como `rechazo:customer`).

Estas consultas son **de solo lectura** (SELECT). No ejecutarlas contra producción sin la aprobación de quien
opera el deploy; correrlas con un usuario de solo lectura. No devuelven datos personales (ni correo ni nombre).

```sql
-- 1) Cuántas filas están en el caso heredado (sub de ONVO sin customer local)
SELECT COUNT(*) AS filas_sin_customer
FROM hot_click_suscripcion_tb
WHERE onvo_subscription_id IS NOT NULL
  AND (onvo_customer_id IS NULL OR BTRIM(onvo_customer_id) = '');

-- 2) Desglose por estado (para ver si alguna está ACTIVO/PAST_DUE y recibiría renovaciones)
SELECT estado, COUNT(*) AS filas
FROM hot_click_suscripcion_tb
WHERE onvo_subscription_id IS NOT NULL
  AND (onvo_customer_id IS NULL OR BTRIM(onvo_customer_id) = '')
GROUP BY estado
ORDER BY filas DESC;

-- 3) Eventos de billing rechazados por customer desde el deploy (ledger de idempotencia)
SELECT COUNT(*) AS rechazos_customer
FROM hot_click_stripe_evento_tb
WHERE stripe_event_id LIKE 'onvo\_%'
  AND procesado_ok = FALSE
  AND error = 'rechazo:customer';
```

Interpretación: si (1) es 0, el camino heredado no se usa. Si es mayor que 0, esas empresas solo renuevan si la
metadata de ONVO coincide; las demás quedan rechazadas hasta corregir la fila (decisión de Seguridad/Pagos, fuera de
este PR: no se hace backfill automático).
