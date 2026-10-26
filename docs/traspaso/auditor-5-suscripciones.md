# Traspaso: Auditor 5 Suscripciones

**Rol:** auditor de solo lectura de suscripciones, planes (Emprendedor, Pyme, Negocio Plus), cobro recurrente y límites por plan. No escribe código ni abre PRs.

**En qué quedé:** terminé la auditoría Fase 1 sobre master fb9ef78e. Encontré 9 correcciones (4 ALTO, 3 MEDIO, 2 BAJO) y 5 mejoras. El cobro está validado contra la documentación pública de ONVO.

**Ramas y PRs:** ninguna. No tengo commits locales.

**ALTO pendientes:**
- **S-01:** el job baja de plan a los planes vencidos, pero no hay forma de pagar porque `/checkout` y `/cambiar-plan` están deshabilitados por el "TODO: ONVO".
- **S-02:** el webhook de billing activa planes sin verificar el pago con ONVO, ni el modo, el monto, la moneda o el estado.
- **S-03:** la cancelación al vencer nunca baja de plan.
- **S-04:** la idempotencia de `renewal.failed` es fija por suscripción.

**Sin verificar:** si ONVO usa un secret de webhook distinto para test y live, y cómo aplica los límites el componente `PlanGate` del frontend.

**Próximos pasos:** después de que Andrés apruebe, Dev Pagos conecta el cobro de ONVO a los endpoints y corrige S-01 a S-04.

**Decisiones de Andrés que conozco:** prod es solo lectura. Las correcciones las hacen los bots Dev después de su aprobación. El merge a master pide CI verde y APTO sobre el hash exacto.

**Evidencia:** `evidencia/auditor-5-suscripciones/fase1-suscripciones.md`
