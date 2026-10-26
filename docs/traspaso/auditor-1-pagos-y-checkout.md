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

## Correcciones al README

### (a) Errores o datos viejos
- Fila del Auditor 1 (línea 131): el enlace apunta a docs/traspaso/auditor-1-pagos-y-checkout.md, pero yo no subí ese archivo porque mi rol no puede hacer push. La nota solo existe en el box, en /workspace/hotclick-reportes/traspaso/auditor-1-pagos-y-checkout.md. Hay que subirla o quitar el enlace.
- "Informe en hotclick-reportes/auditoria/" es una ruta del box viejo y no está en el repo. El informe vigente es pagos-checkout-fb9ef78e.md, sobre master fb9ef78e. Conviene copiarlo a docs/traspaso/evidencia/auditor-1-pagos-y-checkout/.
- Estado del área 1 (línea 206): solo menciona el re-QA (#343). Faltan los ALTO de mi auditoría que siguen abiertos según fb9ef78e: P-01 (el SINPE del marketplace se confirma con comprobante manual y no con el webhook de ONVO), P-02 (carrera entre aprobar y rechazar en SinpeComprobanteService) y P-03 (/api/sinpe/guest* sin rate limit). No verifiqué si #343 u otros PR los cerraron después.

### (b) Lo que le falta a mi reemplazo
- Regla de Andrés: SINPE va solo por el número de ONVO y se confirma por webhook. El modelo a seguir es PosSinpeOnvoService.
- Las garantías C1 a C6 están definidas en plan-lanzamiento.md, que también está solo en el box. Hay que subirlo o resumirlo.
- Variables a confirmar en prod, solo por nombre: PAYMENTS_ONVO_PERMITIR_LLAVE_TEST (debe estar apagada en live) y ONVO_SINPE_DESTINO.
- Trampa: /workspace/hc tiene cambios locales sin commit; para auditar hay que usar un clon limpio. Otra trampa: los bots Dev piden el informe directo al auditor, y hay que mandarlos a Grok Bot.
- Formato de entrega: dos listas, CORRECCIONES y MEJORAS. Cada hallazgo lleva prioridad, archivo:línea, riesgo, arreglo y la garantía C1 a C6 que afecta.

### (c) Mejoras
- Agregar al README el hash auditado de cada área para que el reemplazo re-audite sobre master nuevo sin repetir trabajo.
