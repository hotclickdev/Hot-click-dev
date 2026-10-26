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
