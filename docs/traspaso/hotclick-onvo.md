# Traspaso: HotClick ONVO

**Rol:** investigador de la documentación de ONVO para HotClick. Solo investiga y documenta, nunca hace commits ni push. No tiene ramas ni PRs.

**En qué quedé:** terminé la verificación de `status` y `paymentStatus` en las sesiones de checkout. No tengo nada pendiente.

**Reportes (en /workspace/hotclick-reportes/):**
- HotClick-ONVO-analisis-2026-10-23.md
- HotClick-ONVO-profundizacion.md: cuentas conectadas, price IDs y cupo gratuito
- HotClick-ONVO-oportunidades.md: 12 mejoras priorizadas de P0 a P2
- HotClick-ONVO-diseno-automatizacion.md: estados, tablas Flyway, jobs y fases
- HotClick-ONVO-verificacion-auditoria-pagos.md
- HotClick-ONVO-sinpe-numero-onvo.md: PR #279, quitar el número SINPE fijo en checkoutHelpers.ts

**Decisiones de Andrés que conozco:**
- ONVO maneja SINPE con su propio número.
- ONVO es fail-closed y Tilopay está descartado.
- Planes: US$9, US$24 y US$49, con comisiones de 9 %, 7,5 % y 6 %.
- El plan Emprendedor es gratis para los primeros 70 negocios.

**Conclusiones clave:**
- Un pago de checkout cuenta como pagado cuando `paymentStatus` es `paid` y la sesión no expiró. Además hay que consultar el cobro con un GET y confirmar el modo, el monto y la moneda. No hay que exigir `status=complete`.
- La primera factura puede venir prorrateada.
- El webhook responde 2xx ante rechazos o duplicados, 401 si el secreto es inválido y 5xx solo ante fallos transitorios.

**Pendientes (decisiones de Andrés):**
- Si el POS o el QR usan el número SINPE de ONVO.
- Las reglas del cupo gratuito: si se libera cuando un negocio se va, si es permanente o temporal, y qué pasa al subir de plan.

## Correcciones al README

Revisado sobre docs/traspaso/README.md en b9f241d8 (rama docs/traspaso-cuenta-nueva).

### (a) Errores o datos viejos
1. **Fila de HotClick ONVO (línea 110):** dice "Especialista en la integración con ONVO". El bot es un investigador de la documentación de ONVO. Solo lee y documenta: no programa, no hace commit ni push y no toca los repos salvo para leer. Conviene corregirlo para que el bot nuevo no le asigne trabajo de código.
2. **Línea 172:** dice que Stripe y Tilopay "siguen como heredados o secundarios". Eso contradice la línea 36 y la tabla de lo que ya no se usa (líneas 54 y 55), donde ONVO es el único procesador. Hay que dejar claro que están en el código solo como deuda técnica a eliminar (punto 6) y que no son procesadores secundarios.
3. **`ONVO_SINPE_DESTINO` (línea 688):** se lista como variable de producción, pero en la revisión del PR #279 (head a93f4454) no se usaba en el código. Además, el número SINPE estaba fijo en `checkoutHelpers.ts`. Hay que verificarlo contra master antes de documentarla como necesaria.

### (b) Lo que le falta al reemplazo
1. **Price ID del plan Emprendedor:** solo aparecen `ONVO_PRICE_ID_PYME` y `ONVO_PRICE_ID_NEGOCIO_PLUS`. El Emprendedor cuesta US$9 después de los primeros 70 negocios gratis. Hay que confirmar con un `rg` en el repo cómo se cobra, si con un price ID o por configuración, y documentarlo.
2. **Fuentes oficiales de ONVO:** https://docs.onvopay.com/llms-full.txt, https://docs.onvopay.com/llms.txt y https://docs.onvopay.com/openapi.yaml.
3. **Trampas de ONVO (documentadas en los reportes HotClick-ONVO-*.md):**
   - **Checkout pagado:** la condición es `paymentStatus=paid` y `status` distinto de `expired`. No hay que exigir `status=complete`. Además hay que confirmar con un GET al payment intent que salió `succeeded`, en el modo correcto y por el monto y la moneda esperados. Se deduplica por `paymentIntentId`, porque llegan tanto `checkout-session.succeeded` como `payment-intent.succeeded`.
   - **Webhooks:** usan `X-Webhook-Secret`, sin HMAC y sin id de evento. Los reintentos no están documentados y los eventos pueden llegar fuera de orden. Se responde 2xx ante duplicados o rechazos ya registrados, 401 si el secreto es inválido y 5xx solo ante fallos transitorios.
   - **Modo test o live:** no siempre viene en los datos del evento (falta en `subscription.renewal.failed` y en `payment-intent.failed`), así que hay que verificarlo con un GET.
   - **Primera factura:** puede venir prorrateada por `billingCycleAnchor`, así que no hay que exigir el monto exacto del plan.
   - **Cancelación de suscripciones:** no hay evento de cancelación. La idempotencia de `renewal.failed` se hace por `subscriptionId` + `invoicePeriodStart`.
   - **Teléfono SINPE en `mobileNumber`:** va en formato +506 con 12 caracteres. `identificationType` acepta 0, 1, 2, 3, 4, 5 o 9.
4. **Reportes de evidencia:** están en /workspace/hotclick-reportes/HotClick-ONVO-*.md. `profundizacion` y `oportunidades` ya no están en disco.

### (c) Mejoras
1. **Decisiones pendientes de Andrés:** agregar a la lista de "Solo Andrés" (línea 14) si el POS o el QR usan el número SINPE de ONVO, y las reglas del cupo gratuito de los 70 negocios (si se libera cuando un negocio se va, si es permanente o temporal, y qué pasa al subir de plan).
2. **Comisiones:** anotar junto a los precios los porcentajes vigentes (9 %, 7,5 % y 6 %, sin mínimo por venta) y que el mínimo viejo de ₡700 está retirado.
