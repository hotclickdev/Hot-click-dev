## Veredicto

Consola **ADMIN PLATAFORMA** gated por `ITOnlyGuard` + `PermisoGuard` (`global.*`) + `SuperAdminGuard`. Tras **V132** solo opera **ADMIN** (staff SUPPORT/FINANCE/TRUST inactivo); la matriz `global.*` queda como contrato residual. Impersonación bien acotada en tenant, con riesgos de **no-revocación JWT** y **datos sensibles bajo rol EMPRENDEDOR**.

---

## 1. Capacidades ADMIN (mapa)

| Área | Ruta FE | Gate FE | API / permiso BE |
|------|---------|---------|------------------|
| Tiendas | `/admin/empresas` | `global.companies` | `/api/admin/empresas/**` |
| Moderación | `/admin/aprobaciones`, reportes | `global.approvals` | `/api/admin/solicitudes-aprobacion/**`, reportes |
| Pagos / payouts / fiscal / SaaS billing | `/admin/pagos`, `payouts`, … | `global.metrics` | payouts + pagos con `global.metrics` |
| Usuarios, Security, SuperAdmin, Observabilidad, Auditorías, Soporte, AI, Homepage, Cupones, … | varias | **`SuperAdminGuard` = solo `ADMIN`** | la mayoría `hasRole('ADMIN')` |
| Impersonar | workspace empresa | solo ADMIN (`@PreAuthorize`) | `POST …/impersonar` |

Citas FE:

```252:291:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\src\app\AppRoutes.tsx
        <Route element={<ITOnlyGuard />}>
          <Route element={<PermisoGuard permiso="global.companies" />}>
            <Route path="empresas" element={<AdminEmpresas />} />
            ...
          </Route>
          <Route element={<PermisoGuard permiso="global.metrics" />}>
            <Route path="pagos" element={<AdminPagos />} />
            <Route path="payouts" element={<AdminPayouts />} />
            ...
          </Route>
          <Route element={<PermisoGuard permiso="global.approvals" />}>
            <Route path="aprobaciones" element={<AdminAprobaciones />} />
            ...
          </Route>
          <Route element={<SuperAdminGuard />}>
            <Route path="usuarios" element={<AdminUsers />} />
            <Route path="security" element={<AdminSecurityCenter />} />
            ...
            <Route path="soporte" element={<AdminSoporteTickets />} />
            <Route path="ai-control" element={<AdminAiControl />} />
            <Route path="homepage" element={<AdminHomepage />} />
            <Route path="cupones" element={<AdminCupones />} />
```

**Capacidades por módulo (lectura estática):**
- **AdminEmpresas**: listado + toggle visibilidad catálogo; workspace con equipo e impersonar.
- **Aprobaciones**: tabs empresas / productos (legacy) / ofertas / cuentas cobro + bandeja moderación.
- **Pagos / Payouts**: webhooks/pagos y retiros billetera (métricas financieras).
- **Security / SuperAdmin / Observabilidad / Auditorias**: solo ADMIN (API `hasRole('ADMIN')`).
- **Soporte / AiControl / Homepage / Cupones / Users**: UI bajo `SuperAdminGuard`.
- **Sidebar IT** (`adminItJobs.ts`): filtra por `global.*`; ítems sin `permiso` solo los ve ADMIN.

---

## 2. Permisos `global.*`

Solo tres constantes:

```59:61:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\utils\Constants.java
    public static final String PERM_GLOBAL_COMPANIES = "global.companies";
    public static final String PERM_GLOBAL_APPROVALS = "global.approvals";
    public static final String PERM_GLOBAL_METRICS   = "global.metrics";
```

| Permiso | Uso típico |
|---------|------------|
| `global.companies` | empresas, recolecciones, servicios; soporte en `@PreAuthorize` del controller |
| `global.approvals` | moderación, solicitudes, reportes producto |
| `global.metrics` | pagos, payouts (y fiscal/billing en FE) |

**Estado real post-V132:**

```7:22:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\security\PlatformStaff.java
 * Roles sin tenant de plataforma. Tras V132 solo queda ADMIN
 * (SUPPORT/FINANCE/TRUST inactivos).
...
    public static final Set<String> ROLES = Set.of();
    public static final Set<String> ROLES_SIN_TENANT = Set.of(Constants.ROL_ADMIN);
    public static final String[][] PERMISO_A_ROLES = {};
```

FE: `ROLES_STAFF = []`, `esStaffPlataforma` ≈ solo `ADMIN`.

**Guards:**

```60:80:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\src\app\routeGuards.tsx
export function ITOnlyGuard() {
  const userRole = useAuthStore((s) => s.userRole)
  if (!esStaffPlataforma(userRole)) return <Navigate to="/admin" replace />
  return <Outlet />
}
export function PermisoGuard({ permiso }: { permiso: string }) {
  ...
  if (userRole === 'ADMIN' || permissions.includes(permiso)) return <Outlet />
}
export function SuperAdminGuard() {
  ...
  if (userRole !== 'ADMIN') return <Navigate to="/admin" replace />
}
```

**Inconsistencia menor:** sidebar marca `/admin/soporte` con `global.companies`, pero la ruta está en `SuperAdminGuard`. BE: `SecurityAuthorizationRules` exige `ADMIN` en `/api/admin/soporte/**`, mientras `AdminTicketSoporteController` declara también `global.companies` — hoy irrelevante porque no hay staff.

---

## 3. Flujos de aprobación

### Empresa (gate principal)

1. Empresa en `PENDIENTE_APROBACION` → `GET /api/admin/solicitudes-aprobacion`.
2. `PUT …/{id}/aprobar` → `SolicitudEmpresaHandler` → `EmpresaAprobacionService.aprobarYPublicar`:
   - `ACTIVO` + `visibilidadPublica=true`
   - publica productos activos
   - cierra solicitudes `PRODUCTO` pendientes de esa empresa
   - email + Telegram
3. Rechazo → `estadoEmpresa=RECHAZADO` + notificaciones.

```35:49:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\service\EmpresaAprobacionService.java
    public Empresa aprobarYPublicar(Long empresaId) {
        ...
        e.setEstadoEmpresa("ACTIVO");
        e.setVisibilidadPublica(true);
        ...
        productoRepository.publicarProductosDeEmpresa(empresaId);
        solicitudAprobacionRepository.aprobarPendientesProductoDeEmpresa(empresaId, ahora);
        productoService.evictProductosPublicos();
```

Autorización handler: ADMIN o `global.approvals` (`SolicitudAdminGuard`).

### Producto

Marcado **LEGACY drain** — no se crean solicitudes nuevas; el gate es el negocio:

```18:21:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\controller\aprobacion\SolicitudProductoHandler.java
 * LEGACY drain only: lista/aprueba/rechaza filas {@code PRODUCTO} ya existentes en BD.
 * No crear nuevas solicitudes PRODUCTO — el gate es el negocio, no el producto.
```

Aprobar producto legacy: `visibleCatalogo=true`. Misma cola sirve **ofertas** y **métodos de cobro**.

---

## 4. Impersonación — diseño y riesgos

**Diseño (correcto en esencia):**
- Inicio: `POST /api/admin/empresas/{id}/impersonar` — solo `ADMIN`.
- JWT 30 min: identidad ADMIN, claim `rol=EMPRENDEDOR`, `empresaId`, `impersonando`, `adminOriginal*`.
- Authorities en filtro = solo `ROLE_EMPRENDEDOR` (sin bypass ADMIN).
- `CompanyScope`: en impersonación no hay bypass; solo el tenant del JWT.
- Fin: `POST /api/impersonacion/{id}/finalizar` (fuera de `/api/admin/**`).
- Auditoría `IMPERSONACION_INICIO` / `_FIN`.
- FE: guarda `adminOriginal` (incl. token ADMIN), `refreshToken=null` en soporte.

**Riesgos:**

1. **Sin revocación server-side** — `finalizar` solo audita; el JWT sigue válido hasta exp (~30 min).
2. **`finalizar` no valida** que `empresaId` del path coincida con el claim del token (auditoría puede mentir).
3. **`adminOriginal` en persistencia Zustand** (`hotclick-auth`) — token ADMIN en cliente durante la sesión de soporte (superficie XSS / dispositivo compartido).
4. **Rol EMPRENDEDOR amplio** — p.ej. `AdminPagoController` permite `EMPRENDEDOR`; `listarPagos` filtra por tenant, pero **`listarWebhooks` no filtra por empresa** → con impersonación (o cualquier EMPRENDEDOR) se pueden listar webhooks de plataforma:

```60:69:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\controller\AdminPagoController.java
    @GetMapping("/webhooks")
    public ResponseEntity<ResponseDTO> listarWebhooks(...) {
        ...
        Page<?> resultado = webhookEventRepository
            .buscarWebhooks(procesado, pageable)
```

5. Requiere propietario activo `PROPIETARIO`; sin él falla el inicio.

---

## 5. Resumen de riesgos (prioridad)

| P | Hallazgo |
|---|----------|
| Alta | Webhooks admin visibles a `EMPRENDEDOR` / token de impersonación sin filtro tenant |
| Media | JWT de impersonación no invalidable hasta TTL |
| Media | Sesión ADMIN completa en `localStorage` vía `adminOriginal` |
| Baja | Docs/tests/sidebar aún hablan de staff `global.*` tras V132 |
| Baja | Desalineación soporte FE (`SuperAdmin`) vs permiso sidebar/`@PreAuthorize` |
| Info | Aprobación producto = cola legacy; negocio = fuente de verdad |

---

*Auditoría estática READ-ONLY — sin cambios en el repo.*