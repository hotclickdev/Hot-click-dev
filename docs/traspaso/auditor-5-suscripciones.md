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

## Correcciones al README

Revisión de `docs/traspaso/README.md` en `b9f241d8`, hecha en solo lectura por Auditor 5 Suscripciones.

### (a) Errores o datos viejos
- **Fila de Auditor 5 (línea 135):** dice "informe en hotclick-reportes/auditoria/". Esa carpeta está en el box de la cuenta vieja y no en el repo, así que la cuenta nueva no la va a ver. Hay que apuntar a `docs/traspaso/evidencia/auditor-5-suscripciones/fase1-suscripciones.md`, si CI/CD la subió.
- **Línea 174:** describe las suscripciones por ONVO billing con renovación, gracia, suspensión y reactivación como si funcionaran. En master `fb9ef78e`, `/checkout` y `/cambiar-plan` respondían "cobro no disponible" por el "TODO: ONVO", y el flujo de cambio de plan por ONVO no lo llamaba ningún endpoint. No verifiqué si #333, #339, #342 o #344 lo resolvieron. La línea debería decir "verificar" hasta que haya un QA sobre el hash actual.
- **Línea 210 (estado del área 5):** no menciona los ALTO S-01 a S-04 de mi auditoría. Hay que agregar cuáles cubren los PR mergeados y cuáles siguen abiertos.

### (b) Lo que le falta a mi reemplazo
- **Hallazgos ALTO que hay que confirmar sobre el master actual:**
  - S-01: el plan baja sin que el negocio tenga forma de pagar.
  - S-02: el webhook de billing activa el plan sin volver a consultar a ONVO ni validar `mode`, monto, moneda o estado, y confía en `plan_id` y `empresa_id` de la metadata.
  - S-03: la cancelación con `cancelarAlVencer` nunca baja de plan.
  - S-04: la clave de idempotencia de `renewal.failed` es fija por suscripción.
- **Pendientes sin verificar:**
  - Si ONVO usa un secret de webhook distinto para test y para live.
  - Cómo aplica los límites el `PlanGate` del frontend.
  - `BillingPreferenciasController`, que no exige ser dueño.
- **Variables, solo por nombre:** `PAYMENTS_ONVO_PERMITIR_LLAVE_TEST`, `ONVO_SECRET_KEY` y la del secret del webhook de ONVO (confirmar su nombre exacto en `application*.yml`).
- **Trampa:** gitleaks no está instalado en el box viejo. Hay que instalarlo antes de cualquier push.
- **Trampa:** con la decisión 11 (piloto gratis por unos 4 meses), el job de vencimiento no debe bajar ni suspender a las tiendas del piloto. Hay que confirmar que el piloto lo contempla.

### (c) Mejoras
- Agregar al README la lista de los ALTO por área con su PR o estado, para que cada reemplazo vea qué falta re-auditar.
- Indicar en cada fila de auditor el hash sobre el que se hizo la auditoría. La mía es sobre `fb9ef78e`.
