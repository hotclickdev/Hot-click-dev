# Auditoría estática — SAAS Billing / Planes (READ-ONLY)

Módulo dual: **self-serve tenant** (`/api/billing`) + **consola plataforma** (`/api/admin/billing`). Cobro SaaS actual = **ONVO**; Stripe sigue como path legado.

---

## 1. Planes y features

Fuente canónica: filas en `hot_click_plan_tb` (seed V89/V105) + ajustes V114/V115/V121/V91.

| | EMPRENDEDOR | PYME | NEGOCIO_PLUS |
|---|---|---|---|
| Precio/mes | ₡0 | ₡9.900 | ₡24.900 |
| Comisión venta | 8% (mín. ₡400) | 4% | 4% |
| Usuarios | 2 | 5 | -1 (ilimitado) |
| Productos | 50 | 500 | -1 |
| Bodegas / cajas | 1 / 1 | 2 / 2 | -1 / -1 |
| POS | no | sí | sí |
| CRM | no | no | sí |
| Compras | no | sí | sí |
| Reportes | sí (V105) | sí | sí |
| AI (`tiene_ai`) | no* | sí | sí |
| API keys | no | no | no |
| Gift cards | no | sí (V121) | sí |
| Créditos AI | 10 (V91) | 80 | -1 |

\*EMPRENDEDOR tiene `max_creditos_ai=10` pero `tiene_ai=false`; el gate de UI usa `features.ai` → solo plan o flag `ai_copilot`.

```10:27:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\resources\db\migration\V105__seed_planes_saas_demos.sql
    ('EMPRENDEDOR', ... 2, 50, 1, 1, false, false, false, true, false, false, 0, true),
    ('PYME', ... 5, 500, 2, 2, true, false, true, true, true, false, 80, true),
    ('NEGOCIO_PLUS', ... -1, -1, -1, -1, true, true, true, true, true, false, -1, true)
```

```1:19:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\resources\db\migration\V115__comisiones_planes_onvo.sql
-- Emprendedor: 8% ... PYME / Negocio Plus: 4% + mensualidad.
UPDATE ... SET comision_porcentaje = 8.00 ... WHERE nombre = 'EMPRENDEDOR';
UPDATE ... SET comision_porcentaje = 4.00, precio_mensual = 9900 ... WHERE nombre = 'PYME';
UPDATE ... SET comision_porcentaje = 4.00, precio_mensual = 24900 ... WHERE nombre = 'NEGOCIO_PLUS';
```

**Enforcement FE:** `PlanGate` → `tenantStore.hasFeature` (datos de `TenantInfoBuilder`). Usos en rutas: `giftCards`, `ai`, `reportes`, `compras` (`AppRoutes.tsx`). POS/CRM no van por `PlanGate` en rutas.

**Desfase marketing vs DB:** copy seller dice “hasta 20 productos” / “productos ilimitados” en PYME (`planesPageHelpers.ts`); DB = 50 / 500.

---

## 2. Upgrade / downgrade flows

### Self-serve ONVO (path principal)

```
AdminPlanes / seller PlanesPage
  → useCambiarPlan
  → POST /api/billing/cambiar-plan/{planId}
  → SuscripcionOnvoChangeService.cambiarPlan
```

Estados de respuesta:
- `requiere_pago` → embed ONVO (`OnvoSuscripcionEmbed`) con `subscriptionId` + publishable key
- `actualizando` → cambio de price en sub existente; activa en webhook
- `activado` → mock mode o downgrade sin ONVO
- `pendiente_ciclo` → baja a EMPRENDEDOR al vencer

```85:160:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\service\suscripcion\SuscripcionOnvoChangeService.java
if (PLAN_GRATIS.equalsIgnoreCase(planDestino.getNombre())) {
    return bajarAGratis(empresaId, sub);
}
// ... sub ONVO existente → cambiarPrecioSuscripcion
// ... alta → crearSuscripcionIncompleta + metadata empresa_id/plan_id
```

Price IDs: `onvo.price-id.pyme` / `onvo.price-id.negocio-plus`. Sin secret → **mock** (activa al instante).

### Stripe (legado)

`POST /checkout/{planId}`, `/portal`, `/cancelar` → `SuscripcionBillingService` + webhooks en `SuscripcionWebhookService`. Cambio a ONVO **bloqueado** si hay Stripe real activo.

### Trial

`POST /billing/trial` busca plan `"PRO"` (legado); no alinea con EMPRENDEDOR/PYME.

### Scheduler

`BillingRenewalScheduler` 03:00 + ShedLock: expira TRIAL y PAST_DUE → `degradarPlanBatchConCache` hacia plan `"FREE"`.

---

## 3. Billing ledger (V125)

```3:25:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\resources\db\migration\V125__billing_ledger_plataforma.sql
CREATE TABLE IF NOT EXISTS hot_click_billing_ledger_tb (
    ... tipo, proveedor, referencia_externa, monto_centavos, moneda, detalle, fecha_evento
);
-- UNIQUE (referencia_externa, tipo) WHERE ref IS NOT NULL
```

| Tipo | Quién escribe | Monto |
|---|---|---|
| `COBRO_OK` | ONVO + Stripe webhooks | Stripe sí; ONVO `null` |
| `COBRO_FALLIDO` | ONVO + Stripe | opcional |
| `CANCELACION` | ONVO + Stripe | — |
| `PLAN_ACTIVADO` | **definido, nunca escrito** | — |

Idempotencia: `BillingLedgerWriter` + índice único. Consola: `AdminBillingController` → `AdminBillingService.detalleEmpresa` (ledger + facturas SaaS + fallos combinados).

ONVO idempotencia de eventos: tabla `hot_click_stripe_evento_tb` con prefijo `onvo_`.

---

## 4. Escenarios

| # | Escenario | Resultado esperado |
|---|---|---|
| A | EMPRENDEDOR → PYME (ONVO live) | Sub incompleta → pago SDK → webhook → `ACTIVO`, plan+venc +1 mes, ledger `COBRO_OK` |
| B | PYME → NEGOCIO_PLUS (sub ONVO) | PATCH price; UI `actualizando`; webhook confirma |
| C | Plus → EMPRENDEDOR | `cancelAtPeriodEnd`; local `cancelarAlVencer`; baja al vencer/delete |
| D | Renovación fallida | `PAST_DUE` + ledger; scheduler al pasar `fecha_fin` degrada a FREE |
| E | Stripe activo + cambiar ONVO | 400: cancelar Stripe primero |
| F | Mock (`onvo.secret-key` vacío) | Activa sin cobro real |
| G | Trial 14d | Depende de plan `PRO` existente — frágil |
| H | Super-admin consolas | Lista tenants + KPIs pastDue/alerta/Onvo/Stripe; detalle con ledger |

V114: columnas `onvo_*` + unique parcial en `onvo_subscription_id`.

---

## 5. Riesgos (prioridad)

1. **Degradación a `FREE` vs plan vivo `EMPRENDEDOR`** — `SuscripcionPlanSupport.degradarAFree` busca `"FREE"` (inactivo desde V89). Si no existe, **no degrada**; en ONVO delete luego fuerza EMPRENDEDOR, pero batch trial/PAST_DUE puede no tocar `plan_saas`. Riesgo de features/comisión incorrectas.

2. **Trial legado (`PRO`)** — `iniciarTrial` no usa PYME/NEGOCIO_PLUS; puede fallar o asignar plan incorrecto.

3. **Dual Stripe + ONVO** — paths paralelos, portal/cancel Stripe vs ONVO; UI `AdminSuscripcion` aún orientada a Stripe (`crearPortal` / `cancelar`).

4. **`PlanGate` fail-open** — si `loadTenantInfo` falla (`!loaded && !loading`), renderiza `children` sin gate.

5. **Copy ≠ límites DB** — 20 vs 50 productos; PYME “ilimitados” vs 500; confunde upgrade.

6. **Ledger ONVO sin monto** — KPIs de ingresos SaaS no reconstruibles solo con ledger ONVO.

7. **`PLAN_ACTIVADO` muerto** — activaciones mock/local no dejan traza de tipo dedicado.

8. **`AdminBillingService.listarConsola`** carga **todas** las empresas en memoria y pagina en Java — escala mal.

9. **Alta ONVO pre-pago** — `guardarAltaOnvo` guarda `sub.plan` destino y `onvo_subscription_id` antes del cobro (empresa aún no ACTIVO); abandono deja sub huérfana.

10. **`tiene_api=false` en todos** — feature API solo por feature flag.

11. **Cancelar** solo `hasRole('EMPRENDEDOR')` — ADMIN no puede cancelar vía API aunque sí cambiar plan.

---

## 6. Mapa de componentes (citas)

| Pieza | Rol |
|---|---|
| `SuscripcionController` | API tenant: planes, sub, facturas, trial, Stripe, `cambiar-plan` |
| `AdminBillingController` | Solo ADMIN; lista/detalle plataforma |
| `BillingRenewalScheduler` | Expiración diaria TRIAL/PAST_DUE |
| `PlanGate` | Gate FE por feature + UpgradePrompt |
| `AdminPlanes` / `useCambiarPlan` | UI upgrade ONVO |
| `AdminSuscripcion` | Estado + portal/cancel Stripe |
| `AdminBillingPlataforma` / `AdminBillingEmpresa` | Consola super-admin |
| V114 / V115 / V125 | Schema ONVO, precios/comisiones, ledger |

---

**Veredicto:** modelo comercial EMPRENDEDOR/PYME/NEGOCIO_PLUS + ONVO self-serve está coherente en el happy path; la deuda crítica es la **degradación a FREE inactivo**, el **trial PRO**, y el **desfase marketing/DB** junto con ledger ONVO incompleto en montos.