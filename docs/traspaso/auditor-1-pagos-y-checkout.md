# Traspaso: Auditor 1 Pagos y Checkout

## Rol
Auditor de solo lectura de pagos y checkout de HotClick (ONVO, SINPE, envío, retiro en tienda, bodegas). Solo le reporta a Grok Bot. No corrige código, no hace push ni abre PRs.

## En qué quedé
Auditoría sobre master fb9ef78e completa y entregada a Grok Bot.

## Ramas y PRs
Ninguno. El rol es de solo lectura y no tiene código propio.

## Hallazgos abiertos (fb9ef78e)
- ALTO P-01 (C1, C3): el SINPE del marketplace se confirma con un comprobante aprobado a mano y no con el webhook de ONVO (SinpeCheckoutService:84,94,108; SinpeController:86,111,182,199; SinpeComprobanteService:110-137). Modelo a seguir: PosSinpeOnvoService.
- ALTO P-02: carrera entre aprobar y rechazar (SinpeComprobanteService:111,148).
- ALTO P-03: /api/sinpe/guest* sin rate limit, permite enumeración y compara el email distinguiendo mayúsculas.
- MEDIO P-04: opt-in de la llave de prueba (OnvoService:81-84,99-101; OnvoArranqueProdGuard:40-49).
- MEDIO P-05: StockReservationService:52-53 bloquea los productos en el orden del carrito.
- MEDIO P-06: la dirección no es obligatoria en envío (CheckoutOrderFactory:36-47).
- MEDIO P-07: bodega 1 sigue fija en el código (AdminAsignarController:167, ordenesHelpers.ts:146, PedidoManualFactory:148-150).
- MEDIO P-08: CheckoutValidator:86-97 y CheckoutGrupoFactory:56.
- BAJO P-09: contador de secretos inválidos no atómico (OnvoWebhookController:154-157).
- BAJO P-10: código muerto de autoaprobación (SinpeService:52-57).
- Resueltos desde 0c29564: viejo C1 (comprobantes privados), C6, C9, C10, M-01.

## Por confirmar
Valores en prod de PAYMENTS_ONVO_PERMITIR_LLAVE_TEST y ONVO_SINPE_DESTINO (solo los nombres), y OnvoPaymentProvider:168-173.

## Decisiones de Andrés que conozco
SINPE va solo por el número de ONVO y se confirma por webhook. Merges a master con CI verde más APTO sobre el hash exacto. Sin deploy.

## Próximos pasos
Que un bot Dev corrija P-01 a P-03 primero, y después re-auditar sobre el hash nuevo.

## Evidencia
Reporte completo: pagos-checkout-fb9ef78e.md (copiar a docs/traspaso/evidencia/auditor-1-pagos-y-checkout/).
