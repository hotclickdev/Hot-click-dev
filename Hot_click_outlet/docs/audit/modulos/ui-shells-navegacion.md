# Auditoría estática — UI Shells / Navegación (READ-ONLY)

Mapa canónico declarado en `AppRoutes`: home `/` = marketplace producción; Figma Visitante en `/visitante/*`; `/prototipo/*` redirige a prefijos por rol.

```138:151:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\src\app\AppRoutes.tsx
/**
 * Home `/` = marketplace de producción (Compra · Vende · Emprende).
 * Figma Visitante vive en `/visitante/*`. `/prototipo/*` redirige a prefijos por rol.
 */
export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/visitante/*" element={<VisitanteRoutes />} />
      <Route path="/emprendedor/*" element={<EmprendedorArea />} />
      <Route path="/pyme/*" element={<PymeArea />} />
      <Route path="/negocio-plus/*" element={<NegocioPlusArea />} />
      <Route path="/prototipo" element={<PrototipoRedirect />} />
      <Route path="/prototipo/*" element={<PrototipoRedirect />} />
```

---

## 1. Qué shell usa cada rol

| Rol / superficie | Prefijo URL | Shell | Gate |
|---|---|---|---|
| **ADMIN** (plataforma) | `/admin/*` | `AdminLayout` (`hc-superadmin-theme`) | `AdminRoleSwitch` + `ITOnlyGuard` / `PermisoGuard` / `SuperAdminGuard` |
| **EMPRENDEDOR / PROPIETARIO / EDITOR / LECTOR** (vendedor “Sistema”) | `/emprendedor`, `/pyme` o `/negocio-plus` según plan | `EmprendedorShell` o `SellerShell` | `PlanPathGate` |
| **CAJERO / GERENTE / SUPERVISOR** | `/admin/pos/*` (panel limitado en `/admin` para gerente) | `POSShell` en POS; `AdminLayout` fuera de POS | `AdminRoleSwitch` |
| **USUARIO_FINAL / anónimo** | `/`, `/productos`, `/carrito`, … | `MainLayout` (por página) | — |
| **Visitante Figma** (cualquiera con URL) | `/visitante/*` | `VisitanteShell` | Sin auth; `noindex` |
| **Tienda tenant** | `/tienda/:slug` | `TiendaLayout` | Pública por slug |
| **Pago POS QR** | `/pos/pago/:token` | Sin shell admin (página suelta) | — |

Fuente de roles:

```4:22:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\src\utils\sistemaUser.ts
export const ROLES_VENDEDOR = new Set<string>([
  'EMPRENDEDOR',
  'PROPIETARIO',
  'EDITOR',
  'LECTOR',
])
/** Caja: POSShell en `/admin/pos`. No entran al shell Figma vendedor. */
export const ROLES_POS = new Set<string>(['CAJERO', 'GERENTE', 'SUPERVISOR'])
export const ADMIN_ROLES = new Set<string>(['ADMIN', ...ROLES_VENDEDOR])
```

**AdminRoleSwitch** (núcleo del split):

```24:70:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\src\app\AdminRoleSwitch.tsx
/**
 * `/admin/*`: Super Admin (plataforma) en AdminLayout.
 * El vendedor va al prefijo de su plan, salvo POS / config / billing / copilot.
 * ADMIN no opera rutas de tienda propia (POS, catálogo, finanzas…).
 */
export default function AdminRoleSwitch() {
  // ...
  if (esStaffPlataforma(rol) && esRutaTenantOpsParaAdmin(pathname)) {
    return <Navigate to="/admin" replace />
  }
  if (pathname.startsWith('/admin/pos')) {
    return ( /* POSShell + Outlet */ )
  }
  if (esUsuarioSistema(rol) && !vendedorSeQuedaEnAdmin(pathname)) {
    // → adminAVendedor → /emprendedor|/pyme|/negocio-plus
  }
  return ( /* AdminLayout + Outlet */ )
}
```

Escapes donde el vendedor **sí** se queda en `/admin` (`vendedorSeQuedaEnAdmin`):

```44:54:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\src\utils\planPaths.ts
export function vendedorSeQuedaEnAdmin(pathname: string): boolean {
  return (
    pathname.startsWith('/admin/pos')
    || pathname.startsWith('/admin/configuracion')
    || pathname.startsWith('/admin/billing')
    || pathname.startsWith('/admin/copilot')
    || pathname.startsWith('/admin/mi-empresa')
    || pathname.startsWith('/admin/ayuda')
  )
}
```

Prefijo vendedor por plan:

```15:20:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\src\utils\planPaths.ts
export function prefijoPorPlan(planNombre: string | null | undefined): string {
  const plan = (planNombre ?? '').toUpperCase()
  if (plan === 'PYME') return RUTA_PYME
  if (plan === 'NEGOCIO_PLUS') return RUTA_NEGOCIO_PLUS
  return RUTA_EMPRENDEDOR
}
```

---

## 2. Duplicación funcional (admin vs prototipo)

### POSIBLE DUPLICACIÓN — tres árboles de “misma job”

| Job | Árbol A (canónico vendedor) | Árbol B (legacy Sistema en `/admin`) | Árbol C (IT / admin clásico) |
|---|---|---|---|
| Inicio | `MenuPage` Figma | `SistemaInicio` vía `AdminHomeRoute` | `AdminDashboard` |
| Productos | `prototipo/.../ProductosPage` + API | `SistemaProductos` | `AdminProducts` |
| Pedidos | `PedidosPage` Figma + API | `SistemaVentasPedidos` | `AdminOrders` |
| Reportes | `ReportesPage` Figma + API | `SistemaReportes` | `AdminReportes` / `AdminFinanzas` |
| Preview tienda | `TiendaPublicaPage` (**mock**) | — | `/tienda/:slug` real |

Switch A/B en guards (pensado para montar Sistema* cuando el dueño está en `/admin`):

```83:107:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\src\app\routeGuards.tsx
export function AdminHomeRoute() {
  const userRole = useAuthStore((s) => s.userRole)
  return esUsuarioSistema(userRole) ? <SistemaInicio /> : <AdminDashboard />
}
export function AdminPedidosRoute() {
  return esUsuarioSistema(userRole) ? <SistemaVentasPedidos /> : <AdminOrders />
}
// ... AdminReportesRoute, AdminProductosRoute igual
```

**RUTA HUÉRFANA / LEGACY:** con el remap de `AdminRoleSwitch`, el dueño casi nunca renderiza `Sistema*` en productos/pedidos/reportes/inicio: salta a Figma. Esas páginas quedan cableadas solo si alguien se queda en `/admin` sin remap (hoy, no en esas rutas).

**CÓDIGO MUERTO — puente no cableado:** `sellerAdminRoutes.tsx` montaría `AdminHomeRoute` / `AdminProductosRoute` / etc. dentro del shell Figma vía `SellerPagePad`. **Ningún import externo** lo usa; solo se define a sí mismo. El árbol vivo es `SellerRoutes` / `EmprendedorRoutes` con páginas Figma.

### POSIBLE DUPLICACIÓN — Emprendedor vs PYME/Plus

- Emprendedor: páginas bajo `prototipo/emprendedor/pages/*` + `EmprendedorShell`.
- PYME / Negocio Plus: páginas bajo `prototipo/compartido/*` + `SellerShell` (mismo bottom-nav conceptual).
- Jobs solapadas (productos, pedidos, reportes, bodegas, cobro, ayuda) con implementaciones paralelas.

### POSIBLE DUPLICACIÓN — marketplace comprador

| Superficie | Shell | SEO |
|---|---|---|
| `/` + `/productos` + `/carrito` | `MainLayout` | Indexable (producción) |
| `/visitante/*` | `VisitanteShell` | `noindex,nofollow` (`VisitanteShell` L33–35) |
| `/tienda/:slug` | `TiendaLayout` | Tienda del tenant |

Visitante shop usa API real; index/nav siguen helpers de `visitanteMock`. Checkout visitante reusa `CheckoutPage` sin `MainLayout`.

### POSIBLE DUPLICACIÓN — preview tienda vendedor

`TiendaPublicaPage` (compartido) usa `PRODUCTOS` mock (`mock`) y copy fijo “Tienda QA2 Emprendedor”.  
`AccesoTiendaPublica` / ModeSelector “Ver mi tienda” apuntan a `/tienda/:slug` real.  
**FALSO PREVIEW** en tab “Tienda” del shell Figma vs tienda canónica.

### POSIBLE DUPLICACIÓN — POS

Menú Figma → `/admin/pos` (único POS real). Alias `/{plan}/pos` → `/admin/pos` en `SellerRoutes` / `EmprendedorRoutes`.

---

## 3. Redirects, aliases y rutas muertas

### `/prototipo` → producción por rol

```116:131:C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\src\utils\planPaths.ts
const MAPA_PROTOTIPO = [
  ['/prototipo/visitante', VISITANTE_BASE],
  ['/prototipo/emprendedor', RUTA_EMPRENDEDOR],
  ['/prototipo/pyme', RUTA_PYME],
  ['/prototipo/negocio-plus', RUTA_NEGOCIO_PLUS],
  ['/prototipo/admin', ADMIN_BASE],
]
// /prototipo solo → /visitante
```

### Aliases largos bajo `/admin/*` (`AppRoutes` ~201–311)

Ejemplos: `tiendas`→`empresas`, `moderacion`→`aprobaciones`, `config/*`→`configuracion`/`categorias`/`pagos`, `carga-masiva`→productos, `herramientas/*`→destinos reales, `tienda`/`opciones`→home/config, `planes`→`billing/planes`.

### `RedirectSiSistema` (dueño no ve páginas IT legacy)

Si el dueño **llegara** a quedarse en `/admin/finanzas`, `/admin/bodegas`, etc., redirige a otra ruta `/admin/...` que **luego** `AdminRoleSwitch` remapea al prefijo Figma. Doble hop. Algunos segmentos (`finanzas`) no tienen ruta hermana en Emprendedor/Seller → **RIESGO RUTA MUERTA** si el mapa `mapearSegmentoAdmin` deja pasar `finanzas` tal cual (`planPaths` L107 `return limpio`).

### ADMIN plataforma expulsado de ops de tenant

`esRutaTenantOpsParaAdmin` + lista `PREFIJOS_TENANT_OPS` (`adminItJobs.ts` L228–257): ADMIN en `/admin/productos`, `/admin/pos`, etc. → `/admin`. Excepciones: carga masiva, inventarios captura/paquetes, offline.

### Emprendedor: paths planos → anidados

`/emprendedor/bodegas` → `opciones/bodegas`, perfil/plan/ayuda/cobro igual (`EmprendedorRoutes` L70–80). PYME/Plus usan paths planos nativos.

### Sidebar Sistema aún apunta a `/admin/*`

`buildSistemaLinks` (`adminSidebarLinks.ts` L18–37) sigue con `/admin/pedidos`, `/admin/productos`, etc. Solo aplica si el dueño está en `AdminLayout` (escapes). Cada click dispara remap → Figma. **ALIAS VIVO + DEUDA** (menú desalineado del prefijo canónico).

---

## 4. ModeSelector y `/seleccionar-negocio`

| Ruta | Rol | Qué hace |
|---|---|---|
| `/mode-select` | Post-login multi-modo | `ModeSelector`: Sistema/Admin, POS, Seguridad (solo ADMIN), Ver tienda |
| `/seleccionar-negocio` | Multi-empresa | `EmpresaSelectionPage` + `tempToken`; luego `rutaPanelPorRol` |

Login (`useLoginFlow.ts` L105–247):

1. `requiresEmpresaSelection` → `/seleccionar-negocio`
2. Un solo modo → path directo
3. Preferencia `hotclick-mode-pref` (salvo rol `EMPRENDEDOR`, que **siempre** ve el selector)
4. Si no → `/mode-select`

Modos (`modes.ts` L26–78):

- Dueño: path = `prefijoPorPlan` (no `/admin`)
- POS: siempre `/admin/pos`
- Store: `/tienda/${slug}` o `/`

`EmpresaSelectionPage` no pasa por ModeSelector; va directo al panel del rol.

---

## 5. Complejidad de navegación

Factores de complejidad (alta):

1. **Dos mundos admin:** consola IT (`AdminLayout`) vs dueño Figma (`SellerShell` / `EmprendedorShell`), unidos por remap en un solo árbol `/admin/*`.
2. **Tres prefijos vendedor** + `PlanPathGate` que corrige plan ≠ URL.
3. **Cuatro shells comprador** potenciales: MainLayout, Visitante, TiendaLayout, checkout sin chrome.
4. **Convenciones distintas:** Emp anida `opciones/*`; PYME/Plus planos; admin usa query `?seccion=`.
5. **POS anclado en `/admin`** aunque el resto del dueño sea Figma (modo híbrido consciente).
6. **Capas de redirect:** alias URL + `RedirectSiSistema` + `AdminRoleSwitch` + `PlanPathGate` + `destinoPrototipo`.
7. **Chrome global excluido** en muchos prefijos (`AppChrome` L21): FAB/chat marketplace no en shells Figma/admin/tienda.

Bottom navs independientes (misma UX, código distinto): `EmprendedorBottomNav`, `SellerBottomNav`, `VisitanteBottomNav`, `AdminBottomNav` (solo superadmin móvil), `TiendaBottomNav`, `MainLayout` `BottomNav`.

---

## 6. Canónico vs legacy

### CANÓNICO (producción / destino post-login)

| Superficie | Evidencia |
|---|---|
| Marketplace HotClick | `/` + `MainLayout` |
| Panel dueño | `/emprendedor\|pyme\|negocio-plus` + shells Figma + APIs en productos/pedidos/reportes |
| Consola plataforma | `/admin` + `AdminLayout` + guards IT |
| Caja | `/admin/pos` + `POSShell` |
| Tienda pública tenant | `/tienda/:slug` + `TiendaLayout` |
| Onboarding modos | `/mode-select`, `/seleccionar-negocio` |
| Alias prototipo | `/prototipo/*` → prefijos vivos |

### LEGACY / TRANSICIÓN / HUÉRFANO

| Ítem | Etiqueta |
|---|---|
| `SistemaInicio` / `SistemaProductos` / `SistemaVentasPedidos` / `SistemaReportes` (y hermanos) bajo remap actual | **LEGACY / RUTA HUÉRFANA** para dueño |
| `sellerAdminRoutes.tsx` + `SellerPagePad` | **CÓDIGO MUERTO** (puente no wired) |
| `buildSistemaLinks` → `/admin/...` | **DEUDA** (sidebar del escape AdminLayout) |
| Docenas de `Navigate`/`RedirectSiSistema` en `/admin` | **ALIASES LEGACY** (Figma/admin viejo) |
| `TiendaPublicaPage` mock en tab Tienda | **FALSO PREVIEW / LEGACY DISEÑO** |
| `/visitante/*` | **PARALELO / EXPERIMENTAL** (API en shop, `noindex`; no reemplaza `/`) |
| Páginas duplicadas Emp vs `compartido` | **POSIBLE DUPLICACIÓN** de implementación |
| `AdminFinanzas` / `AdminNewSale` / wizard `AdminNuevoProducto` para dueño | **REDIRIGIDOS** hacia reportes/pedidos/nuevo Figma vía cadena de redirects |

### Híbrido consciente (no legacy)

- Dueño usa Figma para día a día; **POS, billing, configuracion, copilot, ayuda** siguen en `/admin` + `AdminLayout`/`POSShell`.
- Checkout visitante reusa motor de pago marketplace.

---

## Diagrama mental (convivencia)

```
Login
  ├─ USUARIO_FINAL → MainLayout (/)
  ├─ multi-empresa → /seleccionar-negocio → rutaPanelPorRol
  └─ staff/vendedor → /mode-select?
        ├─ admin (IT)     → AdminLayout /admin
        ├─ admin (dueño)  → /emprendedor|pyme|negocio-plus + Figma shell
        ├─ pos            → POSShell /admin/pos
        └─ store          → TiendaLayout /tienda/:slug

/admin/* (cualquiera autenticado ADMIN|vendedor|POS)
  ├─ ADMIN + tenant-ops → bounce /admin
  ├─ /admin/pos*        → POSShell
  ├─ vendedor + !escape → remap a prefijo plan
  └─ else               → AdminLayout

/prototipo/* → destinoPrototipo
/visitante/* → VisitanteShell (paralelo a MainLayout)
```

---

## Hallazgos prioritarios (solo auditoría)

1. **Canónico dueño = Figma shells**; `/admin` para dueño es escape + POS + IT-adjacent.
2. **Sistema* de catálogo/ventas/reportes** y **`sellerAdminRoutes`** parecen el plan “páginas reales en shell Figma” que **no se cableó**; hoy hay dos UIs de la misma job y una casi inalcanzable.
3. **Marketplace doble:** MainLayout (SEO) vs Visitante (móvil Figma, noindex).
4. **Tab Tienda del seller** no es la tienda real (`/tienda/:slug`).
5. **Complejidad alta** por capas de redirect y tres convenciones de path (admin / emp anidado / pyme plano).

Sin cambios de código; solo lectura estática del frontend bajo `Hot_click_outlet/frontend/src`.