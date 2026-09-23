# Fase 2 — Validación P0/P1 y plan de remediación

**Fecha:** 2026-09-22 (actualizado tras PR-A)  
**Alcance:** confirmar o matizar hallazgos de [APP_AUDIT_MAP.md](APP_AUDIT_MAP.md) con relectura de código.  
**Método:** validación estática reforzada. Runtime (prod `.env`, curl) marcado `⏳ RUNTIME`.

Leyenda de estado:

| Símbolo | Significado |
|---------|-------------|
| ✅ CONFIRMADO | Bug/deuda reproducible en código |
| ⚠️ MATIZADO | Hallazgo parcial; impacto distinto al resumen Fase 1 |
| ⏳ RUNTIME | Falta probar en entorno real |
| ❌ DESCARTADO | No aplica / falso positivo |
| ✅ FIX PR-A | Remedado en código (pendiente merge / runtime) |

---

## 1. Resumen ejecutivo

| ID | Hallazgo | Severidad | Estado | Acción siguiente |
|----|----------|-----------|--------|------------------|
| P0-1 | Webhook Tilopay sin autenticación | Alta | ⏳ WIP Tilopay | Gate secret en WC; merge con stack Tilopay |
| P0-2 | SINPE sin `pedido.empresa` → wallet/TTL | Crítica | ✅ FIX PR-A | Commiteado |
| P0-3 | Comentario TTL vs query real | Media | ✅ FIX PR-A | Commiteado |
| P0-4 | `guest/cancel` sin auth | Alta | ✅ FIX PR-A | Commiteado |
| P0-5 | Tilopay confirmar/reintentar públicos | Media-Alta | ✅ FIX | Rate-limit 10/60s en `RateLimitingFilter` |
| P0-6 | POS `cerrarTurno` sin tenant/dueño | Crítica | ✅ FIX PR-B | CompanyScope + dueño |
| P0-7 | POS precios/descuento del cliente | Alta | ✅ FIX PR-B | `precioEfectivo` + `pos.descuento` |
| P1-1 | Retención webhook `created_at` inexistente | Alta (job roto) | ✅ FIX PR-C | `fecha_recepcion` |
| P1-2 | `PlanGate` fail-open | Media | ✅ FIX PR-D | Fail-closed |
| P1-3 | Feed/sitemap sin gate empresa | Alta | ✅ FIX PR-E | JOIN empresa aprobada |
| P1-4 | Admin webhooks sin filtro tenant | Alta (impersonación) | ✅ FIX PR-F | `@PreAuthorize ADMIN` |
| P1-5 | Degradación a plan `"FREE"` | Media | ✅ FIX PR-G | Degradar a EMPRENDEDOR |
| — | Tilopay MOCK en prod | Crítica si mal config | ⏳ RUNTIME | Checklist ops §4 |

---

## 2. Validaciones P0 (pagos)

### P0-1 — Webhook Tilopay sin secret — ✅ CONFIRMADO

**Evidencia:** [`TilopayWebhookController.java`](../../src/main/java/com/hotclick/controller/TilopayWebhookController.java) L24–36: `POST /api/webhooks/tilopay` acepta body opcional, sin header secret; siempre responde 200.

**Mitigación parcial existente:** `TilopayConfirmacionService` reconsulta API (no confía en el payload). Abuso: spam/DoS de logs y carga a Tilopay API.

**Fix sugerido:** HMAC/secret compartido + RateLimit; opcional OrderHash cuando Tilopay lo documente.

### P0-2 — SINPE sin `empresa` — ✅ CONFIRMADO

**Evidencia:**

- [`SinpeCheckoutService.java`](../../src/main/java/com/hotclick/service/sinpe/SinpeCheckoutService.java) L98–124: crea `Pedido` con bodega/usuario; **no** llama `pedido.setEmpresa(...)`.
- [`CheckoutOrderFactory.java`](../../src/main/java/com/hotclick/service/payment/CheckoutOrderFactory.java) L53: el path tarjeta **sí** hace `pedido.setEmpresa(bodega.getEmpresa())`.

**Impacto:**

1. `AggregatorService` / wallet no puede acreditar venta (empresa null).
2. TTL cleanup itera por empresa y usa `findExpiradosPendientesByEmpresa` → **estos pagos SINPE no entran** al cleanup (huérfanos `PENDIENTE`).

**Fix sugerido:** `pedido.setEmpresa(bodega.getEmpresa())` + test de regresión wallet SINPE.

### P0-3 — TTL vs SINPE — ⚠️ MATIZADO

**Fase 1 decía:** TTL cancela SINPE a los 30 min.  
**Código real:**

- Cleanup: [`PaymentExpirationCleanupService`](../../src/main/java/com/hotclick/service/payment/PaymentExpirationCleanupService.java) L36–76 + query `pedido.empresa.id = :empresaId`.
- Solo cancela **pedido** si estado es `PENDIENTE` (L71), no `PENDIENTE_COMPROBANTE`.
- Comentario en SinpeCheckoutService L152–153 (“TTL filtra por proveedor SINPE”) es **falso**: la query no filtra por proveedor.

**Conclusión:**

| Caso | Qué pasa |
|------|----------|
| SINPE sin empresa (hoy) | Pago nunca entra al job → no se cancela por TTL |
| SINPE con empresa (tras fix P0-2) | Pago sí entra; a 30 min → `PAGO_CANCELADO` pero pedido puede quedar en `PENDIENTE_COMPROBANTE` + stock reservado |

**Fix sugerido:** excluir `PROVEEDOR_SINPE` (y EFECTIVO si aplica) del cleanup; o usar `fechaExpiracion` + estados pedido SINPE.

### P0-4 — Guest cancel — ✅ CONFIRMADO

**Evidencia:**

- [`PaymentController.java`](../../src/main/java/com/hotclick/controller/PaymentController.java) L77–87 → `cancelarAnon`.
- [`PaymentUserCancellationService.java`](../../src/main/java/com/hotclick/service/payment/PaymentUserCancellationService.java) L50–66: **no** valida correo ni token; basta conocer `numeroPedido`.
- PermitAll en `SecurityAuthorizationRules` (guest cancel).

**Mitigación parcial:** solo funciona si pedido está en `PENDIENTE` (no SINPE `PENDIENTE_COMPROBANTE`). Afecta sobre todo Tilopay/card.

**Fix sugerido:** cancel token firmado en respuesta checkout (TTL corto) o exigir guest email + hash.

### P0-5 — Tilopay confirmar/reintentar públicos — ✅ CONFIRMADO

Endpoints públicos; confirmación reconsulta API (idempotente si ya CAPTURADO). Riesgo menor que cancel, pero reintentar sin ownership puede crear merchant tokens `-R{n}`.

**Fix sugerido:** rate-limit estricto; reintentar solo con cookie/session del checkout o firma.

---

## 3. Validaciones P0 (POS / tenant)

### P0-6 — IDOR cierre de turno — ✅ CONFIRMADO

**Evidencia:**

- [`TurnoCajaController.java`](../../src/main/java/com/hotclick/controller/TurnoCajaController.java) L43–50: `cerrar(id)` no pasa JWT user/empresa.
- [`TurnoCajaService.cerrarTurno`](../../src/main/java/com/hotclick/service/TurnoCajaService.java) L48–67: `findById` + cierra; sin `CompanyScope.assertCanAccess` ni check de dueño.

Cualquier JWT con `pos.caja.cerrar` o rol ADMIN/EMPRENDEDOR que adivine/ida un `id` de otro tenant puede cerrar el turno.

**Fix sugerido:** `assertCanAccess(turno.getEmpresa().getId())` + opcional `turno.usuario.id == jwt.userId` (salvo GERENTE futuro).

### P0-7 — Precios desde cliente — ✅ CONFIRMADO (código Fase 1)

`PosVentaService` / `PosQrPedidoFactory` aceptan `precioUnitario` y descuentos del body. Permiso BD `pos.descuento` no enforced.

**Fix sugerido:** siempre tomar precio de `Producto` (o lista precio); descuento solo si `hasAuthority('pos.descuento')`.

---

## 4. Validaciones P1

### P1-1 — Retención webhook — ✅ CONFIRMADO

`DataRetentionScheduler` DELETE usa `created_at`; entidad `WebhookEvent` columna `fecha_recepcion`. Job fallará o no borrará nada útil.

**Fix:** `AND fecha_recepcion < ?`.

### P1-2 — PlanGate fail-open — ✅ CONFIRMADO

[`PlanGate.tsx`](../../frontend/src/components/ui/PlanGate.tsx) L37–49: si `!loaded` y ya intentó y no loading → **renderiza `children`**.

**Fix:** fail-closed → UpgradePrompt o error.

### P1-3 — Feed / sitemap — ✅ CONFIRMADO

`findParaFeed` / `findActivosVisibles`: `estado=1` + `visibleCatalogo` **sin** JOIN empresa ACTIVO+visibilidad_publica.

**Fix:** misma cláusula que `findByEstadoAndEmpresaAprobada`.

### P1-4 — Listar webhooks — ✅ CONFIRMADO

[`AdminPagoController.java`](../../src/main/java/com/hotclick/controller/AdminPagoController.java) L60–69: `buscarWebhooks` global; PreAuthorize incluye EMPRENDEDOR → visible en impersonación.

**Fix:** `@PreAuthorize("hasRole('ADMIN')")` o filtrar por empresa si aplica.

### P1-5 — Plan FREE — ✅ CONFIRMADO

[`SuscripcionPlanSupport.degradarAFree`](../../src/main/java/com/hotclick/service/suscripcion/SuscripcionPlanSupport.java) busca `"FREE"`. Planes vivos = EMPRENDEDOR/PYME/NEGOCIO_PLUS (FREE inactivo post-V89). Si `findByNombre("FREE")` vacío → **no degrada**.

**Fix:** degradar a `EMPRENDEDOR` activo.

### Tilopay MOCK — ⏳ RUNTIME

`TilopayService` entra en mock si faltan credenciales. Checklist ops:

```text
[ ] En EC2 .env: TILOPAY_API_USER / PASSWORD / KEY no vacíos
[ ] Logs arranque: NO debe aparecer "modo MOCK activo"
[ ] Un pago test real captura y acredita wallet
```

---

## 5. Orden de remediación (PRs sugeridos)

No implementar aún; cuando digas “implementá PR-A”, se hace en Agent mode con tests + commit-gate.

| PR | Título | Incluye | Tests mínimos | Riesgo merge |
|----|--------|---------|---------------|--------------|
| **PR-A** | fix(pagos): SINPE empresa + guest cancel + TTL | P0-2…P0-4 | ✅ mergeado en rama | Alto |
| **PR-B** | fix(pos): tenant en cierre turno + precios server-side | P0-6, P0-7 | ✅ tests TurnoCaja/PosVenta | Alto |
| **PR-C** | fix(ops): retención webhook `fecha_recepcion` | P1-1 | ✅ | Bajo |
| **PR-D** | fix(fe): PlanGate fail-closed | P1-2 | ✅ | Bajo |
| **PR-E** | fix(catalogo): feed/sitemap gate empresa | P1-3 | ✅ | Medio |
| **PR-F** | fix(admin): webhooks solo ADMIN | P1-4 | ✅ | Bajo |
| **PR-G** | fix(billing): degradar a EMPRENDEDOR | P1-5 | ✅ test | Medio |
| **P0-5** | rate-limit Tilopay confirmar/reintentar | P0-5 | ✅ RateLimitingFilter | Medio |

**Orden de merge recomendado:** A → B → C → E → F → G → D (D puede ir en paralelo).

---

## 6. Checklist runtime (antes de merge PR-A a prod)

Ejecutar en staging o con cuidado en prod:

1. Checkout Tilopay happy path + webhook (si hay secret de prueba).
2. Checkout SINPE → verificar en BD `pedido.fk_id_empresa` NOT NULL (tras fix).
3. Tras pago SINPE aprobado → wallet acreditado.
4. `POST /api/payments/guest/cancel/{numero}` de pedido ajeno → 401/403 (tras fix).
5. Abrir turno empresa A; con JWT empresa B intentar cerrar → 403 (tras fix PR-B).
6. Logs: retención nocturna sin error de columna `created_at` (tras PR-C).

---

## 7. Qué NO entra en Fase 2 P0

Dejar para Fase 3 (producto / deuda):

- Unificar shells Figma vs `/admin`
- Eliminar `sellerAdminRoutes` / roles staff muertos / sidecar NVIDIA
- FSM completa de pedidos (se puede un mini-whitelist en PR separado post-A)
- Compras/forecast guards cruzados
- IA pública cuota

---

## 8. Criterio de “Fase 2 completada”

- [x] Documento de validación con estados ✅/⚠️/⏳
- [x] Orden de PRs definido
- [ ] Runtime checklist ejecutado (humano / ops)
- [x] PR-A commiteado
- [x] PR-B…G + P0-5 implementados (pendiente commit/push)
- [ ] P0-1 webhook Tilopay mergeado con stack Tilopay

**Ops post-deploy:** setear `TILOPAY_WEBHOOK_SECRET` en EC2 cuando el stack Tilopay + gate se mergeen.
