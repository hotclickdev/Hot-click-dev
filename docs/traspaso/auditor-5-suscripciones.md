# Traspaso: Auditor 5 Suscripciones

## Rol y descripción (para recrearlo)
Auditor del área 5 de HotClick: suscripciones, planes, período de gracia e impago con ONVO. Solo audita y reporta hallazgos (ALTO, MEDIO, BAJO) con evidencia y archivo:línea. No toca código ni hace commit, push, merge ni deploy. Repo hotclickdev/Hot-click-dev. Siempre indica el hash de master auditado. Nunca muestra secretos ni datos sensibles. Escribe en español de Costa Rica con voseo. Reporta a Grok Bot o al Mentor; no habla con humanos fuera de su chat.

## Reglas
- Solo lectura y tests dirigidos (mvn -o -Dfrontend.skip=true -Dtest=...), nunca la suite completa salvo pedido.
- Si saca código, usa git archive a /tmp y lo borra al terminar.
- La evidencia de QA (/workspace/qa/a5/) sirve de referencia, no de base.
- Reglas de negocio: Pyme y Negocio Plus se activan solo con pago confirmado por ONVO. Emprendedor incluye POS. Al terminar la gracia la tienda se pausa (las ventas existentes se mantienen; desde el día siguiente los productos salen agotados u ocultos, junto con las redes y el botón de compartir). Tilopay se elimina.

## Historial (S/ = Hot_click_outlet/src/main/java/com/hotclick/service/suscripcion/)
- Fase 1 sobre fb9ef78e: S-01 a S-04, todos ALTO (docs/traspaso/evidencia/auditor-5-suscripciones/fase1-suscripciones.md).
- fb432103: S-01 y S-03 corregidos; S-02 y S-04 abiertos. El #300 nunca entró.
- 649387e7: detalle de S-02 y S-04 entregado a HotClick Dev Pagos 2.
- c5b9bb06 (#371): S-02 y S-04 cerrados. Nuevo A5-01 ALTO: no se reconsultaba a ONVO antes de la baja.
- 3c7dfaea (#381 + #374): A5-01 cerrado. Queda un ALTO porque falta #388 (moneda USD contra el price del plan). Con 7bb6cf47 (#388, fix b87b45d79) no quedó ningún ALTO. Tests: 122 OK en 3c7dfaea y 154 OK en 7bb6cf47.
- 2026-10-30: aportes al plan de la Fase 2 (/workspace/hotclick/plan-fase2-pruebas-seguridad.md) enviados al Mentor.

## Pendientes
- [PENDIENTE] Re-QA y reauditoría del área 5 sobre un hash que incluya #388.
- [PENDIENTE] MEDIO: los rechazos permanentes del webhook solo dejan log [ALERTA-PAGO]; falta un canal de alerta y un procedimiento manual.
- [PENDIENTE] MEDIO: PLANES_MONEDA y *_PRECIO_MENSUAL_USD no se validan al arrancar (OnvoArranqueProdGuard). Hay que revisarlos en staging y prod.
- [PENDIENTE] MEDIO: el job de PAST_DUE no genera cobro y el ledger queda en "crc". Un cupón o prorrateo se rechaza como pago_parcial.
- [PENDIENTE] BAJO: la clave de falla no usa attemptCount (handler L321-327); empresa.estadoPlan no se sincroniza (RenovacionesTilopayService L70-72); sigue el código muerto de Stripe/Tilopay.
- [PENDIENTE] Las pruebas del área 5 en la Fase 2, cuando Andrés dé el OK.

## Próximos pasos
1. Obtener el hash actual de master y confirmar que incluye b87b45d79.
2. Reauditar S/OnvoBillingWebhookHandler, OnvoBillingVerificador, OnvoRenovacionReconsulta, RenovacionesTilopayService, SuscripcionRenewalService y PrecioPlanOnvo con tests dirigidos.
3. Reportar los ALTO abiertos con su hash.

## Secretos
No hay ninguno aquí. Las variables ONVO_* y la configuración de planes están en el entorno del servidor y en los secretos del repo; nunca se copian.
