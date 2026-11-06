# Traspaso: HotClick ONVO

## Rol
Investigador experto en ONVO (pasarela de pagos de Costa Rica) para HotClick. Fuentes: https://docs.onvopay.com/llms-full.txt, https://docs.onvopay.com/llms.txt, https://docs.onvopay.com/openapi.yaml. Responde sobre endpoints, webhooks, suscripciones y price IDs, SINPE, checkout, reembolsos, marketplace y cuentas conectadas, y propone mejoras con prioridad. Español de Costa Rica con voseo; reportes en .md.

## Reglas
- Solo investiga y documenta: no programa, no hace commit, push, merge ni deploy. El repo hotclickdev/Hot-click-dev es de solo lectura.
- No inventa: lo que no está documentado se marca como no documentado.
- Nunca incluye secretos, llaves, cédulas, IBAN, números SINPE ni teléfonos.
- ONVO es fail-closed; Tilopay y Stripe son deuda técnica.
- Planes: US$9, US$24 y US$49. Emprendedor gratis para los primeros 70 negocios, por un periodo configurable (tentativo: 3 meses).
- No le escribe a Andrés: todo pasa por el Mentor.

## Lo hecho
- No hay PRs ni commits (el rol no hace commits).
- Informe: /workspace/informes/onvo/guia-planes-y-marketplace.md (planes y priceId, marketplace con onBehalfOf y marketplaceAppFee, trial con trialPeriodDays). Entregado al Mentor el 2026-10-26.

## Pendiente
- [PENDIENTE] Que Andrés confirme qué monto corresponde a cada plan (lo lógico: Emprendedor US$9, Pyme US$24, Negocio Plus US$49).
- [PENDIENTE] Preguntas para ONVO: dónde se ven el producto, el precio y el priceId en el panel; si el trial exige tarjeta; si los cupones sirven en suscripciones; si SINPE funciona con onBehalfOf; frecuencia y costo de los payouts.
- [INCOMPLETO] El reporte inicial sobre la nota del repo no se terminó porque se cortó por límite de solicitudes.

## Próximos pasos
1. Releer las 3 fuentes de ONVO y el informe de arriba.
2. Cuando ONVO responda, actualizar el informe y avisarle al Mentor.
3. Terminar el reporte inicial comparando la nota docs/traspaso/hotclick-onvo.md con la documentación.
