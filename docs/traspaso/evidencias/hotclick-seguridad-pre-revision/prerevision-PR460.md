# Pre-revisión de seguridad — PR #460 (NO es APTO)
**PR:** hotclickdev/Hot-click-dev#460 "fix(pagos): LOWs de Seguridad sobre #459 (cancelación parcial, reintento sobre reembolso)" — base `master`
**Head exacto:** `75ce0566becea85d0601d8245bd6f7156749d19a`
**Fecha:** 30-oct-2026, 11:50 p. m. (hora CR). Revisión solo lectura (sin comentarios, aprobaciones ni pushes).
**CI al momento:** todo verde salvo `Tests Java` y `Build React` en *pending*. Gitleaks pass. No vi secretos en el diff.

> Esto NO es un APTO. El APTO lo da HotClick Seguridad sobre el hash exacto de arriba (y con `Tests Java` en verde).

## Archivos tocados (5)
- `Hot_click_outlet/src/main/java/com/hotclick/repository/PagoRepository.java` (+11): `estadoPagoEnBase` con hint `org.hibernate.flushMode=COMMIT` (L30-32).
- `Hot_click_outlet/src/main/java/com/hotclick/repository/PedidoRepository.java` (+8): `marcarRevisionSiCancelado` (UPDATE condicional CANCELADO→REVISION_SOBREVENTA, L42-44).
- `Hot_click_outlet/src/main/java/com/hotclick/service/payment/PaymentOrderConfirmationService.java` (+38): chequeo de reembolso en base al inicio (L80-81), `revisarCanceladosEnCobroParcial` (L142, L247-254), `estadoReembolsoEnBase` / `reintentoSobreReembolso` (L257-272).
- `Hot_click_outlet/src/test/java/com/hotclick/service/payment/CobroSobreGrupoCanceladoTest.java` (+83): 4 tests nuevos (unitarios con mocks).
- `docs/security/amenazas-activas.md` (+1): fila nueva; justifica no agregar `@Version`.

## Riesgos
### ALTO
- Ninguno encontrado.

### MEDIO (a confirmar por Seguridad)
1. **La protección del reintento depende de que el proveedor NO haya hecho flush antes.** `estadoPagoEnBase` (PagoRepository L30-32) solo evita el flush de *esta* consulta. Tilopay `aplicarAprobado` (TilopayConfirmacionService.java ~L229-234), Stripe (StripePaymentProvider.java ~L141-145) y ONVO (OnvoCapturaService.java ~L82-88) hacen `pagoRepository.save(pago)` en CAPTURADO antes de `confirmarPedido`. `save` no hace flush, pero cualquier consulta JPQL intermedia con flush AUTO (p. ej. `findTopByPedidoIdForUpdate` va antes; revisar si hay otra entre `save` y `confirmarPedido`, como `marcarSiEsPrueba` en ONVO L87) escribiría CAPTURADO en la base y la lectura vería CAPTURADO → se pierde la protección. **El test es con mocks (`when(pagoRepository.estadoPagoEnBase…)`), no prueba la semántica real de Hibernate/Postgres.** Pedir test de integración (H2/Postgres) con el flujo real de Tilopay/Stripe/ONVO sobre un pago REEMBOLSO_PENDIENTE.
2. **Cobro parcial: dinero del paquete cancelado queda capturado sin reembolso registrado.** `revisarCanceladosEnCobroParcial` (L247-254) deja el pago completo en CAPTURADO y solo marca el paquete en REVISION_SOBREVENTA + alerta. No hay monto parcial pendiente de reembolso ligado (₡/US$). Depende del ADMIN vía `POST /api/admin/sobreventa/pedidos/{id}/resolver`. Confirmar que la resolución de un paquete con pago CAPTURADO compartido no pone el pago **entero** en REEMBOLSO_PENDIENTE/REEMBOLSADO (eso bloquearía el despacho de lo confirmado o sobre-reembolsaría). Revisar `SobreventaResolucionService` para ese caso.

### BAJO
3. **Semántica sobrecargada de `Resultado.SOBREVENTA`** (L272): el reintento sobre reembolso devuelve SOBREVENTA; en ONVO (`OnvoCapturaService` L88-101) y SINPE (`SinpeOnvoMarketplaceService` L171-174) eso genera de nuevo `log.error("[ALERTA-PAGO] … sin stock…")` y marca el evento como "sin stock" → re-alerta en log/Sentry y mensaje engañoso (no llama `onSobreventa`, eso sí está bien). Sugerir un resultado propio (p. ej. `YA_EN_REEMBOLSO`).
4. **`onSobreventa(pago, String.valueOf(perdidos))`** (L253): pasa IDs internos `[2, 5]` como "número de pedido", e incluye perdidos que no se marcaron (confirmados por otro proceso). Usar números de pedido de los que realmente se marcaron.
5. **UPDATE masivo JPQL** (`marcarRevisionSiCancelado`) no sincroniza entidades ya cargadas en la sesión; si algo posterior (`publicarCompraPagada`, L143) lee el hermano en memoria, verá CANCELADO viejo. Verificar `clearAutomatically` o que no se use después.
6. **Lectura sin lock en Stripe:** confirmar que el pago en `StripePaymentProvider` se cargó FOR UPDATE antes de L145 (Tilopay sí usa `findTopByPedidoIdForUpdate`/`findByMerchantTokenForUpdate`); si no, la lectura de estado en base tiene carrera con la resolución del ADMIN.
7. `@Version` no se agrega (decisión documentada); aceptable si los FOR UPDATE cubren todas las rutas, pero queda como riesgo residual.
8. Tilopay sigue vivo en el código (`TilopayConfirmacionService`, `/api/payments/tilopay/*`, `/api/webhooks/tilopay`); A1 pidió P0 "grep sin restos de Tilopay". Fuera del alcance de este PR, pero anotar.

## Lo que parece correcto
- Montos/moneda: el PR no toca cálculo de montos, redondeo ni ₡/US$; no hay validación de monto debilitada.
- Webhooks ONVO: no toca autenticación (`X-Webhook-Secret`), idempotencia ni reconsulta GET.
- IDOR/tenants: los nuevos queries operan sobre IDs del propio grupo de pago (internos), no sobre entrada del usuario. Sin endpoints nuevos.
- Auth/roles: sin cambios. Sin endpoints destructivos nuevos.
- UPDATE condicional `… AND estadoPedido='CANCELADO'` es idempotente y no revive cancelados ni pisa confirmados.
- Logs: solo `pago.getId()` e IDs de paquetes; sin PII ni secretos.
- Tests de regresión: 4 nuevos cubren reintento Tilopay sobre REEMBOLSO_PENDIENTE, copia CAPTURADO vs base REEMBOLSADO, cancelación parcial → revisión + alerta, perdido por otra confirmación sin alerta (mocks; ver MEDIO 1).
- Documentación de amenazas actualizada.

## Pedidos sugeridos antes del APTO
- `Tests Java` en verde sobre `75ce056…`.
- Test de integración real para MEDIO 1; aclarar MEDIO 2 (resolución de paquete en pago compartido).
