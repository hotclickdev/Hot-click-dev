# Auditoría estática READ-ONLY — AUTH / ROLES / TENANT

**Alcance:** `C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet` · Sin modificaciones  
**Complejidad global:** **CRÍTICA**

Etiquetas: `[CONFIRMADO]` código leído · `[CÓDIGO MUERTO]` sin uso efectivo · `[RIESGO]` comportamiento peligroso o inconsistente · `[LEGACY]` migrado/inactivo

---

## 1. Roles reales (nombre, origen, permisos, rutas)

| Rol JWT / Spring | Origen | Estado BD | Permisos | Rutas FE típicas | Tenant |
|---|---|---|---|---|---|
| **ADMIN** | `Constants.ROL_ADMIN`; V89 renombra `ADMIN_IT→ADMIN`; V119 sin `fk_id_empresa` | Activo | Todos los de V8 vía `HOT_CLICK_ROL_PERMISO_TB` incl. `global.*` | `/admin/**`, IT (`empresas`, `payouts`, `aprobaciones`, security…) | Sin tenant; bypass `CompanyScope` |
| **EMPRENDEDOR** | V8 id 4; V89 migra `ADMIN_CLIENTE` | Activo | Permisos no-`global.*` (V8) | Prefijo plan `/emprendedor` \| `/pyme` \| `/negocio-plus` o `/admin` (shell mixto) | `empresaId` en JWT |
| **USUARIO_FINAL** | Seed baseline | Activo | Ninguno de panel | `/`, checkout, `/mis-pedidos` | Sin negocio (salvo upgrade) |
| **SUPPORT / FINANCE / TRUST** | V126 | **Inactivos V132**; usuarios remap → ADMIN | Matriz `global.*` borrada | — | `[CÓDIGO MUERTO]` constantes/comentarios viven |
| **CAJERO…SOPORTE (POS)** | Pre-V89 | Inactivos V89+V132 | — | `ROLES_POS` / `modes.ts` aún los nombran | `[LEGACY]` FE |
| **PROPIETARIO / EDITOR / LECTOR** | `miembro_empresa.rol_en_empresa` | Activos en membresía | **No** llegan al JWT: `RolMembresia` colapsa a `EMPRENDEDOR` | `ROLES_VENDEDOR` en FE | `[RIESGO]` least-privilege de equipo anulado en Spring |

```47:61:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\utils\Constants.java
    public static final String ROL_ADMIN        = "ADMIN";
    public static final String ROL_EMPRENDEDOR  = "EMPRENDEDOR";
    public static final String ROL_USUARIO_FINAL = "USUARIO_FINAL";
    /** Staff plataforma: tickets / ver tiendas (sin bypass CompanyScope). */
    public static final String ROL_SUPPORT = "SUPPORT";
    // ...
    public static final String PERM_GLOBAL_COMPANIES = "global.companies";
```

```7:28:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\security\PlatformStaff.java
 * Roles sin tenant de plataforma. Tras V132 solo queda ADMIN
    public static final Set<String> ROLES = Set.of();
    public static final Set<String> ROLES_SIN_TENANT = Set.of(Constants.ROL_ADMIN);
    public static final String[][] PERMISO_A_ROLES = {};
    public static boolean esStaff(String rol) {
        return rol != null && ROLES.contains(rol);
    }
```

```15:19:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\src\utils\sistemaUser.ts
/** Staff de plataforma (sin bypass CompanyScope; menú por global.*). V132: vacío. */
export const ROLES_STAFF = new Set<string>([])
/** Operadores de la consola de plataforma (ADMIN). */
export const ROLES_PLATAFORMA = new Set<string>(['ADMIN'])
```

**`global.*` (V8):** `global.companies`, `global.approvals`, `global.metrics` — ADMIN los tiene; staff intermedio eliminado en V132. Matchers BE/FE siguen aceptando el permiso **o** `ROLE_ADMIN`.

**Planes (no son roles):** EMPRENDEDOR / PYME / NEGOCIO_PLUS (V89) → `PlanGate` + `planPaths`.

---

## 2. Flujos

### Login JWT (credenciales)
`AuthController` → `AuthCredentialLoginHandler` (`AuthController.java:88-90`, `AuthCredentialLoginHandler.java:49-80`):

1. Turnstile → usuario → bloqueo / password / estado (PENDIENTE→403 verificar; INACTIVO/SUSPENDIDO→403; ELIMINADO→401 genérico).
2. Si **ADMIN** con credenciales WebAuthn → `requiresWebauthn` + `tempToken` 5 min (`:70-74`, `:123-130`).
3. Si 2FA → `requires2fa` + métodos TOTP/EMAIL_OTP (`:75-77`, `:133-157`).
4. Si >1 membresía activa → `requiresEmpresaSelection` + token 10 min (`:159-179`).
5. Sino → `AuthSupport.buildAuthResponse` (JWT 15 min + refresh + permisos).

FE: `LoginPage` / `useLoginFlow` (`useLoginFlow.ts:79-112`).

### Login Clerk (SSO)
`POST /api/auth/clerk-sync` (`ClerkSyncController.java:29-72`): verifica JWT Clerk → `ClerkSyncService.sync` → `buildAuthResponse`.  
Nuevo usuario → `USUARIO_FINAL` (`ClerkSyncService.java:88-89`).  
Merge a cuenta **ADMIN/EMPRENDEDOR** sin `clerkUserId` → **403** (`:56-63`) `[CONFIRMADO]`.

Upgrade vender: `POST /api/auth/upgrade-emprendedor` (`AuthController.java:37-41`).

### Registro
- Comprador: `RegisterPage` → verify OTP → `USUARIO_FINAL`.
- `?intencion=vender` → `/registro-empresa` (`RegisterPage.tsx:19-21`).
- Empresa: `POST /api/auth/registro-empresa`; segundo negocio: `/nuevo-negocio`.

### WebAuthn
- Login: público `login/start|finish` (`WebAuthnController.java:72-113`); FE `WebAuthnStep`.
- Registro llave: `@PreAuthorize("hasRole('ADMIN')")` + `@RequestAttribute("authenticatedEmail")` (`:41-68`, `:117-122`).

`[RIESGO]` **No hay ningún `setAttribute("authenticatedEmail")` en el repo** — registro/listado WebAuthn probablemente rompe en runtime (MissingServletRequestAttribute).

`[RIESGO]` `login/finish` **no exige** el `tempToken` del password step; basta email + aserción WebAuthn (aceptable como factor único, pero el tempToken del login es decorativo).

### Impersonación
1. `POST /api/admin/empresas/{id}/impersonar` `@PreAuthorize ADMIN` (`EmpresaController.java:124-127`).
2. JWT 30 min: subject=admin, `rol=EMPRENDEDOR`, `impersonando=true`, `empresaId` (`JwtUtil.java:174-185`; `ImpersonacionService.java:48-50`).
3. Authorities en filter = solo `ROLE_EMPRENDEDOR` (`JwtRequestFilter.java:85-89`).
4. Salida: FE restaura `adminOriginal`; BE `POST /api/impersonacion/{id}/finalizar` (fuera de `/api/admin/**`) (`ImpersonacionController.java:14-28`). Refresh anulado en FE (`authStore.ts:170-172`).

### Selección / cambio de empresa
- Post-login: `/seleccionar-empresa` + temp token (`AuthTenantSwitchHandler.java:93-126`).
- Sesión viva: `/cambiar-negocio`, `/mis-negocios` (`:39-90`).
- Rol JWT: `RolMembresia.paraJwt` — ADMIN global se preserva; resto con membresía → **EMPRENDEDOR** (`RolMembresia.java:16-26`).

`[RIESGO]` `cambiarNegocio` / `seleccionarEmpresa` usan `generateToken` **sin claim `permisos`** (`AuthTenantSwitchHandler.java:54`, `:115`) → FE `permissions: []` tras switch.

`[RIESGO]` `AuthRefreshHandler` regenera JWT con `usuario.getEmpresaId()` de BD y `roles.get(0)` (`AuthRefreshHandler.java:37-42`) → **pierde empresa seleccionada** y puede degradar prioridad de rol vs `PlatformStaff.rolPrincipal`.

---

## 3. Tenant isolation — `CompanyScope`

```37:103:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\src\main\java\com\hotclick\security\CompanyScope.java
    public Long getCurrentEmpresaId() {
        // ...
        if (isImpersonating()) {
            return extractEmpresaIdFromJwt();
        }
        if (isAdminIT(user) || isPlatformStaff(user)) return null;
        Long fromJwt = extractEmpresaIdFromJwt();
        return fromJwt != null ? fromJwt : user.getEmpresaId();
    }
    public void assertCanAccess(Long resourceEmpresaId) {
        if (isImpersonating()) { /* solo ese tenant */ }
        if (isAdminIT()) return;  // bypass
        // scopeId debe == resourceEmpresaId
    }
```

| Actor | `getCurrentEmpresaId` | Bypass `assertCanAccess` |
|---|---|---|
| ADMIN | `null` (sin impersonar) | **Sí** |
| ADMIN impersonando | JWT empresa | **No** (acotado) |
| EMPRENDEDOR | JWT → else BD | No |
| Staff SUPPORT… | Tras V132: `esStaff` siempre false → actúa como tenant user | No (`CompanyScopeAccessTest.java:100-109`) |
| API key (principal String) | `TenantContext` | vía TenantFilter |

`TenantFilter` escribe `empresaId` del JWT en `TenantContext` (`TenantFilter.java:40-42`).  
`getCurrentEmpresaIdOrOwn`: ADMIN/staff → `null` (no crean en negocio ajeno) (`CompanyScope.java:173-181`).

---

## 4. Guards frontend vs backend — inconsistencias

| Tema | Frontend | Backend | Veredicto |
|---|---|---|---|
| Acceso `/admin` | `ADMIN_ROLES` = ADMIN + vendedor (+ legacy PROPIETARIO…) (`sistemaUser.ts:21-22`, `routeGuards.tsx:50-52`) | `/api/admin/**` ADMIN\|EMPRENDEDOR (`SecurityAuthorizationRules.java:217-218`) | Alineado en lo gordo |
| IT / empresas | `ITOnlyGuard` = solo ADMIN (`esStaffPlataforma`); `PermisoGuard` ADMIN \|\| `global.*` (`routeGuards.tsx:60-74`, `AppRoutes.tsx:252-270`) | `hasAnyAuthority(ROLE_ADMIN, global.*)` (`SecurityAuthorizationRules.java:202-208`) | Staff muerto: solo ADMIN pasa `[CÓDIGO MUERTO]` rama permiso |
| Superadmin | `userRole === 'ADMIN'` | Muchas rutas `hasRole(ADMIN)` | OK |
| Plan features | `PlanGate` → `tenantStore.hasFeature` | Límites en servicios/plan | **Fail-open FE**: si no carga tenant, renderiza children (`PlanGate.tsx:37-49`) `[RIESGO]` |
| Sesión expirada | `ProtectedRoute` / `isTokenAlive` sin refresh (`authToken.ts:5-12`) | JWT 15 min; interceptor axios sí refresca en 401 (`api.ts:49-73`) | Guard puede echar antes de refresh `[RIESGO]` |
| Equipo EDITOR/LECTOR | UI trata como vendedor | JWT = EMPRENDEDOR → mismos `hasRole` que dueño | Privilegio de equipo colapsado `[RIESGO]` |
| Impersonación | Banner + restore local | Finalizar no invalida JWT (solo auditoría) (`ImpersonacionService.java:70-72`) | Token usable hasta exp 30 min |
| WebAuthn register | Admin UI | Attribute `authenticatedEmail` inexistente | FE/BE rotos en registro llave `[RIESGO]` |
| POS roles | `modes.ts` CAJERO/GERENTE… | Roles inactivos V132 | Dead paths FE `[LEGACY]` |

---

## 5. Matriz rol × funcionalidad clave

| Funcionalidad | ADMIN | EMPRENDEDOR | USUARIO_FINAL | Staff legacy |
|---|:---:|:---:|:---:|:---:|
| Catálogo público GET | ✓ | ✓ | ✓ | — |
| CRUD productos | ✓* | ✓ (su tenant) | ✗ | — |
| Pedidos admin | ✓* | ✓ | propios /auth | — |
| Panel `/admin` UI | ✓ | ✓ (Sistema) | ✗ | — |
| Empresas / payouts / aprobaciones | ✓ (`global.*`) | ✗ (ITOnly) | ✗ | muerto |
| Impersonar negocio | ✓ | ✗ | ✗ | — |
| WebAuthn login | ✓ (si tiene llave) | — | — | — |
| 2FA | opcional | opcional | opcional | — |
| Clerk SSO | merge bloqueado si elevado sin link | idem | crear/login | — |
| PlanGate (AI, compras…) | bypass si `planNombre==='ADMIN'` | según plan | N/A | — |
| CompanyScope bypass | ✓ | ✗ | N/A | ✗ |

\*ADMIN sin impersonar: APIs admin globales; creación tenant vía `OrOwn` → null.

---

## 6. Escenarios cubiertos / no cubiertos

| Escenario | Cubierto | Notas |
|---|---|---|
| Password incorrecto / user inexistente | Sí | 401 genérico + audit/detection |
| Cuenta bloqueada | Sí | 403 mensaje bloqueo |
| Email no verificado | Sí | 403 verificar |
| 2FA TOTP / email / recovery | Sí | tempToken no autentica pleno (`JwtRequestFilter.java:76-78`) |
| Multi-empresa al login | Sí | selección + membership check |
| Refresh access | Parcial | no preserva `empresaId` de sesión multi-negocio |
| Sesión expirada SPA | Parcial | guard estricto vs refresh en API |
| Sin permiso IT | Sí FE | redirect `/admin` |
| Cross-tenant recurso | Sí | `TenantAccessDeniedException` si controller llama `assertCanAccess` |
| Controllers sin `CompanyScope` | **No garantizado** en esta auditoría estática de módulo | depender del área |
| Impersonación sin propietario | Sí | IllegalState |
| Logout / revoke refresh | Sí | |
| Clerk elevated merge | Sí | 403 |
| WebAuthn enroll | **No** | attribute faltante |
| Fail PlanGate sin tenant load | **No** (fail-open) | muestra feature |
| Tokens impersonación post-salir | **No** invalidación server-side | |
| Roles POS vivos | No | inactivos BD |

---

## 7. Posibles errores / código muerto

1. **`PlatformStaff.ROLES` / `ROLES_STAFF` vacíos** — intencional V132; comentarios y `Constants.ROL_SUPPORT|FINANCE|TRUST` + matchers `global.*` quedan como dead matrix `[CÓDIGO MUERTO]` / `[CONFIRMADO]`.
2. **`PERMISO_A_ROLES = {}`** — matriz staff vacía (`PlatformStaff.java:22`).
3. **`authenticatedEmail` WebAuthn** — nunca poblado `[RIESGO]`.
4. **Refresh vs multi-empresa** — drift de tenant `[RIESGO]`.
5. **Switch empresa sin permisos en JWT** — UI `hasPermission` vacía `[RIESGO]`.
6. **`RolMembresia` → siempre EMPRENDEDOR** — EDITOR/LECTOR sin efecto en `hasRole` `[RIESGO]`.
7. **`isAuthenticated: () => !!token`** sin `exp` (`authStore.ts:81`) vs `isTokenAlive` en guards — dos nociones de sesión.
8. **SecurityAuthorizationRules L212-215** (`seleccionar-empresa` etc.) redundantes tras `/api/auth/**` permitAll L34 `[CÓDIGO MUERTO]`.
9. **V8 rol id 2** (antes ADMIN_CLIENTE) aún recibe subset permisos en INSERT histórico; rol inactivo V89 — datos huérfanos posibles `[LEGACY]`.
10. **PlanGate fail-open** si `loadTenantInfo` falla (`PlanGate.tsx:49`) `[RIESGO]`.

---

## 8. Complejidad

| Capa | Nivel | Por qué |
|---|---|---|
| Modelo de roles vivo | **MEDIA** | Solo 3 roles JWT claros post-V132 |
| Flujos auth (JWT+Clerk+2FA+WebAuthn+multi-empresa+impersonación) | **CRÍTICA** | Muchos tokens de propósito especial y caminos FE |
| Tenant (`CompanyScope` + JWT + TenantContext + API keys) | **ALTA** | Correcto en núcleo; depende de uso consistente en controllers |
| Staff / `global.*` | **BAJA** hoy | Simplificado a ADMIN; deuda de código legacy |
| Alineación FE/BE | **ALTA** | Varias inconsistencias operativas (refresh, PlanGate, WebAuthn, equipo) |

**Veredicto módulo: CRÍTICA** — no por cantidad de roles vivos, sino por superficie de autenticación, aislamiento multi-tenant sensible a bugs de refresh/impersonación, y deuda staff/equipo que puede confundir auditoría y futuro desarrollo.

---

### Migraciones (evidencia)

| Migración | Rol |
|---|---|
| `V8__saas_empresa_y_roles.sql` | Empresa, EMPRENDEDOR, permisos + `global.*`, ADMIN=todos, EMPRENDEDOR sin global |
| `V89__restructura_roles_planes.sql` | ADMIN_IT→ADMIN; ADMIN_CLIENTE→EMPRENDEDOR; POS ocultos; planes |
| `V126__roles_staff_plataforma.sql` | SUPPORT/FINANCE/TRUST + matriz global |
| `V132__limpiar_roles_muertos.sql` | Inactiva staff, remap a ADMIN, limpia permisos; JWT vivos: ADMIN, EMPRENDEDOR, USUARIO_FINAL |