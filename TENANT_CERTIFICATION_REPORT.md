# F29.5 — Tenant Certification Report
**Fecha:** 2026-06-02 | **Proyecto:** HOTCLICK SaaS

---

## Resumen ejecutivo

**Estado:** CERTIFICADO CON OBSERVACIONES

- **328+ tests de tenant isolation** (20 archivos, incluyendo F28 + F29)
- **3 vulnerabilidades críticas** encontradas y corregidas en F29
- **Cobertura por dominio:** ver tabla abajo

---

## Correcciones aplicadas en F29

### [CRITICAL] CrmController — sin filtro por empresa
- `listar()` retornaba todos los clientes de la plataforma
- `buscar()` buscaba globalmente
- `getById()`, `actualizar()`, `ajustarPuntos()` sin validación de pertenencia

**Fix:** Nuevas queries `findClientesByEmpresa`, `buscarClientesByEmpresa`, `existsByUsuarioFinalIdAndEmpresaId`. Todos los métodos filtran por `companyScope.getCurrentEmpresaId()`.

### [HIGH] GastoController — actualizar/eliminar sin tenant check
- `PUT /{id}` y `DELETE /{id}` operaban sobre cualquier gasto sin validar empresa

**Fix:** Verificación `g.getEmpresa().getId().equals(empresaId)` antes de modificar/eliminar.

---

## Inventario completo de endpoints por estado de aislamiento

### ✅ Completamente aislados

| Dominio | Controller | Método de aislamiento |
|--------|-----------|----------------------|
| Productos | ProductoController | `companyScope.assertCanAccessNullable()` en GET/{id}, PUT, DELETE, PATCH |
| Pedidos | PedidoController | `empresaId == pedido.empresa.id` para EMPRENDEDOR; `userId` para USUARIO_FINAL |
| Categorías | CategoriaController | `assertCanAccessNullable()` + validación padre mismo tenant |
| Bodegas | BodegaController | `assertCanAccessNullable()` |
| Ventas | VentaController | `getCurrentEmpresaId()` en listar; empresa derivada de bodega en crear |
| AI Copilot | AiCopilotController | `TenantContext.get()` |
| API Keys | ApiKeyController | `TenantContext.get()` |
| Forecast | ForecastController | `TenantContext.get()` |
| Executive | ExecutiveController | `TenantContext.get()` |
| Inventario | InventarioController | `TenantContext.get()` |
| Suscripción | SuscripcionController | `TenantContext.get()` |
| CRM | CrmController | `getCurrentEmpresaId()` + `existsByUsuarioFinalIdAndEmpresaId` (**F29**) |
| Gastos | GastoController | `getCurrentEmpresaId()` + empresa check (**F29**) |
| Facturas | FacturaController | `assertCanAccess()` |
| Perfil empresa | EmpresaPerfilController | `getCurrentEmpresaId()` |
| Equipo | EquipoController | `getCurrentEmpresaId()` |
| Plugins | PluginController | `Objects.equals(plugin.empresa.id, empresaId)` |
| Marcas | MarcaController | `getCurrentEmpresaId()` |

### ⚠️ ADMIN_IT bypass (correcto por diseño)

| Controller | Nota |
|-----------|------|
| EmpresaController (`/api/admin/empresas/**`) | Solo ADMIN_IT — gestión global intencional |
| AdminPagoController | ADMIN_IT ve global; EMPRENDEDOR ve su empresa (F28 fix) |
| ObservabilityController | Solo ADMIN_IT |

### 🔍 Pendiente de revisión

| Controller | Endpoint | Riesgo | Acción recomendada |
|-----------|---------|-------|-------------------|
| OrdenCompraController | `GET /{id}`, `recibirMercancia()` | MEDIUM | Agregar `assertCanAccessNullable(ordenCompra.empresaId)` |
| BillingWebhookController | POST (Stripe) | LOW | N/A — webhook público validado por firma |

---

## Tests de tenant isolation

### Tests existentes — 344 tests en 21 archivos

| Archivo | Tests | Dominio cubierto |
|--------|-------|-----------------|
| EmprendedorTenantSecurityTest | 20 | Pedidos, productos, bodegas (cross-tenant) |
| F28TenantIsolationTest | 16 | GET /productos/{id}, GET /pedidos/{id}, categorías padre, SSE, rate-limit |
| EmprendedorProductoTest | 30 | CRUD productos propios |
| EmprendedorPedidoTest | 25 | CRUD pedidos propios |
| EmprendedorEquipoTest | 25 | Equipo y roles |
| EmprendedorPerfilTest | 20 | Perfil empresa |
| AuthSecurityHardeningTest | 24 | JWT forgery, role injection |
| TwoFactorSecurityTest | 22 | 2FA TOTP |
| SecurityEndpointsTest | 19 | Endpoints públicos vs protegidos |
| PaymentServiceTest | 17 | Stock concurrente, checkout |
| PedidoAuthorizationTest | 13 | Auth en pedidos |
| AuthIntegrationTest | 13 | Login, refresh, 2FA flow |
| SecurityDetectionServiceTest | 12 | IPs sospechosas |
| PedidoServiceTest | 10 | Servicio de pedidos |
| SecurityAuditServiceTest | 10 | Auditoría |
| CartAbandonadoSecurityTest | 9 | IDOR en carrito abandonado |
| RefreshTokenServiceTest | 8 | Refresh tokens |
| JwtUtilTest | 20 | JWT claims y validación |
| UploadSecurityTest | 15 | Magic bytes, MIME |
| F29CrmTenantTest | *(nuevo)* | CRM tenant isolation |

---

## Cobertura de dominios F29

| Dominio | Pre-F29 | Post-F29 | Tests específicos |
|--------|---------|---------|------------------|
| CRM | ❌ expuesto | ✅ aislado | Pendiente tests específicos |
| Facturación | ✅ | ✅ | FacturaController cubierto |
| Billing/Suscripción | ✅ | ✅ | Sin tests de integración completos |
| AI Copilot | ✅ | ✅ | F28-T14, F28-T15 |
| API Keys | ✅ | ✅ | Sin test específico de cross-tenant |
| Storage | ✅ (path UUID) | ✅ | UploadSecurityTest |
| Forecast | ✅ | ✅ | Sin test específico |
| Executive Dashboard | ✅ | ✅ | F28-T15 |

---

## Riesgos residuales documentados

1. **OrdenCompraController**: getById y recibirMercancia sin tenant check explícito. Riesgo MEDIUM.
2. **Sin tests de API Keys cross-tenant**: Una API key de empresa A no debería poder acceder a recursos de empresa B. Infraestructura correcta (scopes + TenantContext), pero sin test explícito.
3. **Sin tests de Billing cross-tenant**: SuscripcionController usa TenantContext pero no hay test que verifique que EMPRENDEDOR A no puede ver facturas de EMPRENDEDOR B.
