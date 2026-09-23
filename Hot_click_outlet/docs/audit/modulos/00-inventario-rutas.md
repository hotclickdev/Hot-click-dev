# Auditoría estática de rutas frontend — Hot_click_outlet

**Alcance:** READ-ONLY. Árbol único de rutas: `App.tsx` → `BrowserRouter` → `AppRoutes` (`frontend/src/app/AppRoutes.tsx:142-325`). Sub-árboles anidados: `VisitanteRoutes`, `EmprendedorRoutes`, `SellerRoutes` (PYME/Plus).

**Layouts por zona (HECHO OBSERVADO):**
| Zona | Layout / shell |
|------|----------------|
| Marketplace público | `MainLayout` (por página, no en router) |
| Auth login/registro | `LoginPageLayout` / opcional `ClerkShell` |
| `/admin/*` (no POS) | `AdminLayout` vía `AdminRoleSwitch` |
| `/admin/pos/*` | `POSShell` |
| `/visitante/*` | `VisitanteShell` |
| `/emprendedor/*` | `EmprendedorShell` (+/sin nav) |
| `/pyme/*`, `/negocio-plus/*` | `SellerShell` (+/sin nav) |
| `/tienda/:slug/*` | `TiendaLayout` |

---

## 1. Rutas públicas (marketplace + auth + legales)

| URL | Componente | Layout | Guard | Rol | Params |
|-----|------------|--------|-------|-----|--------|
| `/` | `HomePage` | MainLayout | — | público | — |
| `/productos` | `ProductsPage` | MainLayout | — | público | — |
| `/productos/:id` | `ProductDetailPage` | MainLayout | — | público | `id` |
| `/descubri` | `DescubriPage` | MainLayout | — | público | — |
| `/carrito` | `CartPage` | MainLayout | — | público | — |
| `/checkout` | `CheckoutPage` | CheckoutChrome→MainLayout* | — | público† | — |
| `/wishlist` | `WishlistPage` | MainLayout | — | público | — |
| `/perfil` | `ProfilePage` | MainLayout | `ProtectedRoute` | sesión | — |
| `/mis-pedidos` | `MisPedidosPage` | MainLayout | `ProtectedRoute` | sesión | — |
| `/pago/exito` | `PaymentStatusPage` | MainLayout (subvistas) | — | público | — |
| `/pago/cancelado` | `PaymentStatusPage` | idem | — | público | — |
| `/pago/tilopay/respuesta` | `TilopayRespuestaPage` | MainLayout | — | público | — |
| `/login` | `LoginPage` | LoginPageLayout (+ClerkShell si env) | — | público | — |
| `/registro` | `RegisterPage` | (auth) | — | público | — |
| `/sso-callback` | `SSOCallback` | ClerkShell | solo si `VITE_CLERK_PUBLISHABLE_KEY` | — | — |
| `/sso-complete` | `SSOComplete` | ClerkShell | idem | — | — |
| `/registro-empresa` | `RegistroEmpresaPage` | propio | — | público | — |
| `/registrar-negocio` | `RegistrarNegocioPage` | propio | `ProtectedRoute` | sesión | — |
| `/mode-select` | `ModeSelector` | propio | guard en página (`token`→login) | sesión | — |
| `/seleccionar-negocio` | `EmpresaSelectionPage` | propio | `Navigate→/login` si no hay `tempToken` | post-login | — |
| `/nosotros` | `NosotrosPage` | MainLayout | — | público | — |
| `/contacto` | `ContactoPage` | MainLayout | — | público | — |
| `/informacion` | `InformacionPage` | MainLayout | — | público | — |
| `/privacidad` | `PrivacidadPage` | MainLayout | — | público | — |
| `/terminos` | `TerminosPage` | MainLayout | — | público | — |
| `/devoluciones` | `DevolucionesPage` | MainLayout | — | público | — |
| `/envios` | `EnviosPage` | MainLayout | — | público | — |
| `/acuerdo-vendedores` | `AcuerdoVendedoresPage` | MainLayout | — | público | — |
| `/cookies` | `CookiesPage` | MainLayout | — | público | — |
| `/recuperar-carrito/:token` | `RecuperarCarritoPage` | MainLayout | — | público | `token` |
| `/cotizacion/:token` | `CotizacionPublicaPage` | (página) | — | público | `token` |
| `/encargo/:token` | `EncargoPublicPage` | MainLayout | — | público | `token` |
| `/servicios` | `ServiciosHotPage` | MainLayout | — | público | — |
| `/blog` | `BlogPage` | MainLayout | — | público | — |
| `/blog/:slug` | `BlogPostPage` | MainLayout | — | público | `slug` |
| `/emprende` | `EmprendePage` | MainLayout | — | público | — |
| `/emprendimientos` | `EmprendimientosPage` | MainLayout | — | público | — |
| `/pos/pago/:token` | `POSPagoPage` | propio | — | público (pago QR) | `token` |
| `/404` | `NotFoundPage` | MainLayout | — | público | — |
| `*` | `NotFoundPage` | MainLayout | catch-all | — | — |

Evidencia: `C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\src\app\AppRoutes.tsx:145-197`, `:314-323`.

† Checkout sin `ProtectedRoute` en router — ❓ REQUIERE VALIDACIÓN auth en página.  
\* Checkout bajo `/visitante/*` omite MainLayout (comentario en `CheckoutPage`).

---

## 2. Rutas `/admin/*`

**Gate raíz:** `AdminRoleSwitch` (`C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\src\app\AdminRoleSwitch.tsx:29-70`) — token vivo; rol ∈ `ADMIN_ROLES` ∪ `ROLES_POS`; staff fuera de tenant-ops; POS → `POSShell`; vendedor remap a prefijo plan salvo excepciones.

### 2.1 Redirects / aliases (Navigate)

| Path | Destino | Evidencia |
|------|---------|-----------|
| `dashboard` | `/admin` | `AppRoutes.tsx:201` |
| `tiendas` | `/admin/empresas` | `:202` |
| `tiendas/:id` | `/admin/empresas/:id` (`RedirectTiendaAEmpresa`) | `:203`, `routeGuards.tsx:141-144` |
| `tiendas/:id/preview` | `/admin/empresas` | `:204` |
| `tiendas/:id/suspender` | `/admin/empresas` | `:205` |
| `moderacion` | `/admin/aprobaciones` | `:206` |
| `moderacion/aprobado` | `/admin/aprobaciones` | `:207` |
| `moderacion/rechazar` | `/admin/aprobaciones` | `:208` |
| `config` | `/admin/configuracion` | `:209` |
| `config/categorias` | `/admin/categorias` | `:210` |
| `config/categorias/nueva` | `/admin/categorias` | `:211` |
| `config/politica` | `/admin/configuracion` | `:212` |
| `config/pagos` | `/admin/pagos` | `:213` |
| `config/notificaciones` | `/admin/configuracion` | `:214` |
| `cerrar-sesion` | `/admin` | `:215` |
| `carga-masiva` | `/admin/productos/carga-masiva` | `:216` |
| `carga-masiva/revisar` | `/admin/productos/carga-masiva` | `:217` |
| `carga-masiva/completada` | `/admin/productos` | `:218` |
| `herramientas/marcas` | `/admin/marcas` | `:220` |
| `herramientas/garantias` | `/admin/garantias` | `:221` |
| `herramientas/clientes` | `/admin/clientes` | `:222` |
| `herramientas/auditorias` | `/admin/auditorias` | `:223` |
| `herramientas/servicios` | `/admin/servicios` | `:224` |
| `herramientas/aprobaciones` | `/admin/aprobaciones` | `:225` |
| `proximamente` | `/admin` | `:226` |
| `tienda` | `/admin` | `:248` |
| `tienda/*` | `/admin` | `:249` |
| `opciones` | `/admin/configuracion` | `:250` |
| `opciones/*` | `/admin/configuracion` | `:251` |
| `planes` | `/admin/billing/planes` | `:293` |
| `usuarios/:id` | `/admin/usuarios` | `:273` |
| `usuarios/:id/suspender` | `/admin/usuarios` | `:274` |

### 2.2 Rutas “vivas” (componente o switch Sistema/Admin)

| Path | Componente / switch | Extra guard | PlanGate |
|------|---------------------|-------------|----------|
| index | `AdminHomeRoute` → SistemaInicio \| AdminDashboard | — | — |
| `herramientas` | `AdminMasHerramientas` | — | — |
| `productos` | `AdminProductosRoute` | — | — |
| `productos/nuevo` | `SistemaProductoFormRoute` | solo vendedor Sistema; nuevo → seller | — |
| `productos/:id/editar` | `SistemaProductoFormRoute` | solo vendedor Sistema | — |
| `pedidos` | `AdminPedidosRoute` | — | — |
| `encargos` | `AdminEncargos` | — | — |
| `bodegas` | `AdminWarehouses` | `RedirectSiSistema→config?bodega` | — |
| `ventas` | `AdminNewSale` | `RedirectSiSistema→pedidos` | — |
| `clientes` | `AdminClientesRoute` | — | — |
| `finanzas` | `AdminFinanzas` | `RedirectSiSistema→reportes` | — |
| `finanzas/reporte-contador` | `AdminReporteContador` | `RedirectSiSistema→reportes` | — |
| `billetera` | `AdminBilletera` | `RedirectSiSistema→reportes` | — |
| `reportes` | `AdminReportesRoute` | — | — |
| `nuevo-producto` | `AdminNuevoProducto` | `RedirectSiSistema→productos/nuevo` | — |
| `productos/carga-masiva` | `AdminCargaMasiva` | `RedirectSiSistema→productos` | — |
| `productos/importar` | `AdminImportar` | `RedirectSiSistema→productos` | — |
| `marcas` | `AdminMarcas` | `RedirectSiSistema→config?marca` | — |
| `configuracion` | `AdminConfiguracion` | — (vendedor puede quedarse) | — |
| `garantias` | `AdminSolicitudesGarantia` | `RedirectSiSistema→ayuda` | — |
| `equipo` | `AdminEquipo` | `RedirectSiSistema→config` | — |
| `mi-empresa` | `AdminMiEmpresa` | `RedirectSiSistema→config?marca` | — |
| `categorias` | `AdminCategories` | — | — |
| `billing/planes` | `AdminPlanes` | queda en admin si vendedor | — |
| `billing/suscripcion` | `AdminSuscripcion` | queda en admin si vendedor | — |
| `offline/cola` | `AdminOfflineCola` | — | — |
| `gift-cards` | `AdminGiftCards` | — | `giftCards` / PYME |
| `inventario` | `AdminInventario` | `RedirectSiSistema→copilot` | `ai` / PYME |
| `copilot` | `AdminCopilotRoute` | — | — |
| `ayuda` | `AdminAyuda` | — | — |
| `forecast` | `AdminForecast` | →copilot + PlanGate ai | PYME |
| `executive` | `AdminExecutive` | →reportes + PlanGate reportes | PYME |
| `asignar-compra` | `AdminAsignarProducto` | →pedidos | — |
| `ofertas` | `AdminPromocionesRoute` | — | — |
| `blog` | `AdminBlogRoute` | — | — |
| `pos` | `AdminPOS` | **POSShell** | — |
| `pos/caja` | `AdminPOSCaja` | **POSShell** | — |
| `pos/historial` | `AdminPOSHistorial` | **POSShell** | — |
| `compras` | `AdminCompras` | →config + PlanGate compras | PYME |
| `compras/nueva` | `AdminNuevaCompra` | →config + PlanGate compras | PYME |
| `proveedores` | `AdminProveedores` | →config | — |

### 2.3 Bajo `ITOnlyGuard` (`esStaffPlataforma` = rol `ADMIN`)

| Permiso | Paths |
|---------|-------|
| `global.companies` | `empresas`, `empresas/:id`, `servicios`, `recolecciones` |
| `global.metrics` | `pagos`, `payouts`, `facturas`, `config-fiscal`, `saas-billing`, `saas-billing/:id` |
| `global.approvals` | `aprobaciones`, `reportes-producto` |
| `SuperAdminGuard` (rol === `ADMIN`) | `usuarios`, `cotizaciones`, `cotizaciones/nueva`, `cotizaciones/:id`, `security`, `superadmin`, `observabilidad`, `auditorias`, `soporte`, `ai-control`, `homepage`, `cupones`, `publicaciones`, `multipais`, `inventario/captura`, `inventario/paquetes`, `inventario/paquetes/:id` |

Evidencia: `AppRoutes.tsx:252-291`, `routeGuards.tsx:60-80`.

**Nota:** `ADMIN` pasa `PermisoGuard` siempre (`routeGuards.tsx:72`). `ROLES_STAFF` está vacío (`sistemaUser.ts:16`) — ❓ REQUIERE VALIDACIÓN: staff no-ADMIN vía `permissions` solo si el JWT lo trae.

---

## 3. Prefijos rol / prototipo / tienda

### 3.1 `/visitante/*` — público, sin auth en router

Layout: `VisitanteShell`. Evidencia: `C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\src\prototipo\visitante\VisitanteRoutes.tsx:26-53`, montaje `AppRoutes.tsx:146`.

| Path relativo | Componente |
|---------------|------------|
| index | VisitanteIndexPage |
| `shop` | VisitanteShopPage |
| `shop/sin-resultados` | VisitanteShopPage (prop `sinResultados`) |
| `discover` | VisitanteDiscoverPage |
| `carrito` | VisitanteCarritoPage |
| `carrito/vacio` | VisitanteCarritoPage (prop `vacio`) |
| `cuenta` | VisitanteCuentaPage |
| `asistente` | VisitanteAsistentePage |
| `producto/:id` | VisitanteProductoPage |
| `asesor-ia` | VisitanteAsesorIaPage |
| `checkout` | VisitanteCheckoutPage |
| `compra-confirmada` | VisitanteConfirmadaPage |
| `pago-fallido` | VisitantePagoFallidoPage |
| `recomendados` | VisitanteRecomendadosPage |
| `negocio/:id` | VisitanteNegocioPage |
| `favoritos` | VisitanteFavoritosPage |
| `notificaciones` | VisitanteNotificacionesPage |
| `pedidos` | VisitantePedidosPage |
| `direcciones` | VisitanteDireccionesPage |
| `metodos-pago` | VisitanteMetodosPagoPage |
| `ayuda` | VisitanteAyudaPage |

`noindex` en Helmet (`VisitanteShell.tsx:33-35`).

### 3.2 `/emprendedor/*` — `EmprendedorArea` = `PlanPathGate` + `EmprendedorRoutes`

Gate: sesión + `esUsuarioSistema` + plan → prefijo `/emprendedor`; staff→`/admin`; POS no-vendedor→`/admin/pos` (`PlanPathGate.tsx:40-54`).

**Redirects planos → opciones** (`EmprendedorRoutes.tsx:66-79`):  
`login`→`/login`, `registro`→`/registro`, `pos`/`pos/*`→`/admin/pos`, `bodegas`→`opciones/bodegas`, `bodegas/nueva`→`opciones/bodegas/nueva`, `negocio`→`opciones/negocio`, `plan`→`opciones/plan`, `plan/actualizado`→`opciones/plan/actualizado`, `ayuda`→`opciones/ayuda`, `consultas`→`opciones/consultas`, `perfil`→`opciones/perfil`, `cobro`→`opciones/cobro`, `cobro/nuevo`→`opciones/cobro/nuevo`, `telegram`→`opciones/telegram`.

**Con nav** (`EmprendedorShell conNav`):

| Path | Componente |
|------|------------|
| index | MenuPage |
| `productos` | ProductosPage |
| `encargos` | EncargosPage |
| `recoleccion` | RecoleccionPage |
| `productos/vacio` | ProductosVacioPage |
| `productos/nuevo` | ElegirTipoProductoPage |
| `productos/nuevo/catalogo` | AgregarProductoPage |
| `productos/nuevo/personalizado` | AgregarProductoPage (`personalizado`) |
| `tienda` | TiendaPublicaPage |
| `reportes` | ReportesPage |
| `opciones` | OpcionesPage |

**Sin nav:**

| Path | Componente / Navigate |
|------|----------------------|
| `productos/:id/editar` | EditarProductoPage |
| `productos/:id/eliminar` | ConfirmarEliminacionPage |
| `tienda/carrito` | CarritoPage |
| `tienda/compra-confirmada` | CompraConfirmadaPage |
| `tienda/:id` | DetalleProductoPage |
| `opciones/perfil` | PerfilPage |
| `opciones/notificaciones` | NotificacionesPage |
| `opciones/telegram` | TelegramPage |
| `opciones/cobro` | CobroPage |
| `opciones/cobro/nuevo` | AgregarMetodoCobroPage |
| `opciones/ayuda` | AyudaPage |
| `opciones/consultas` | ConsultasHotPage |
| `opciones/bodegas` | BodegasPage |
| `opciones/bodegas/nueva` | NuevaBodegaPage |
| `opciones/negocio` | DatosNegocioPage |
| `opciones/plan` | PlanesPage |
| `opciones/plan/actualizado` | PlanActualizadoPage |
| `proximamente/pedidos` | → `/emprendedor/pedidos` |
| `proximamente/bodegas` | → `/emprendedor/opciones/bodegas` |
| `proximamente/productos` | → `/emprendedor/productos` |
| `proximamente/reportes` | → `/emprendedor/reportes` |
| `proximamente/negocio` | → `/emprendedor/opciones/negocio` |
| `proximamente` | ProximamentePage |
| `pedidos` | PedidosPage |
| `pedidos/:id` | DetallePedidoPage |

### 3.3 `/pyme/*` y `/negocio-plus/*`

Misma base `SellerRoutes` (`C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\src\prototipo\compartido\SellerRoutes.tsx:60-103`) + `PlanPathGate` con prefijo plan.

| Extra | PYME | Negocio Plus |
|-------|------|--------------|
| | `equipo` → EquipoPage (`PymeRoutes.tsx:15`) | `sucursales` → SucursalesPage (`NegocioPlusRoutes.tsx:16`) |

**Con nav (`SellerShell`):**

| Path | Componente |
|------|------------|
| index | MenuPage |
| `productos` | ProductosPage |
| `productos/nuevo` | ElegirTipoProductoPage |
| `productos/nuevo/catalogo` | ProductoFormPage |
| `productos/nuevo/personalizado` | ProductoFormPage (`personalizado`) |
| `reportes` | ReportesPage |
| `tienda` | TiendaPublicaPage |
| `opciones` | OpcionesPage |
| `recoleccion` | RecoleccionSellerPage |
| `encargos` | EncargosSellerPage |

**Redirects externos:** `login`→`/login`, `registro`→`/registro`, `pos`/`pos/*`→`/admin/pos`.

**Sin nav (`SellerShell sinNav`):**

| Path | Componente |
|------|------------|
| `productos/:id` | ProductoDetallePage |
| `productos/:id/editar` | ProductoFormPage |
| `productos/:id/eliminar` | EliminarProductoPage |
| `carrito` | CarritoPage |
| `compra-ok` | CompraOkPage |
| `perfil` | PerfilPage |
| `notificaciones` | NotificacionesPage |
| `telegram` | TelegramVincularPage |
| `cobro` | CobroPage |
| `cobro/nuevo` | AgregarMetodoCobroPage |
| `ayuda` | AyudaPage |
| `consultas` | ConsultasPage |
| `proximamente` | ProximamentePage |
| `bodegas` | BodegasPage |
| `bodegas/nueva` | NuevaBodegaPage |
| `negocio` | DatosNegocioPage |
| `plan` | CompararPlanesPage |
| `plan/actualizado` | PlanActualizadoPage |
| `pedidos` | PedidosPage |
| `pedidos/:id` | PedidoDetallePage |
| `equipo` (solo PYME) | EquipoPage |
| `sucursales` (solo Plus) | SucursalesPage |

### 3.4 `/tienda/:slug/*`

| Path | Componente | Guard |
|------|------------|-------|
| index | TiendaHomePage | público (carga API) |
| `producto/:productoId` | TiendaProductoPage | — |
| `carrito` | TiendaCarritoPage | — |
| `checkout` | TiendaCheckoutPage | — |
| `checkout/exito` | TiendaSuccessPage | — |

`AppRoutes.tsx:315-321`, layout `TiendaLayout.tsx`. Params: `slug`, `productoId`.

### 3.5 `/prototipo` → destinos (`PrototipoRedirect` + `destinoPrototipo`)

| Origen | Destino |
|--------|---------|
| `/prototipo`, `/prototipo/` | `/visitante` |
| `/prototipo/visitante/*` | `/visitante/*` |
| `/prototipo/emprendedor/*` | `/emprendedor/*` |
| `/prototipo/pyme/*` | `/pyme/*` |
| `/prototipo/negocio-plus/*` | `/negocio-plus/*` |
| `/prototipo/admin/*` | `/admin/*` |
| otro `/prototipo/...` | `/visitante` |

Evidencia: `C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\src\utils\planPaths.ts:116-131`, `PrototipoRedirect.tsx:5-8`, `AppRoutes.tsx:150-151`.

---

## 4. Guards — matriz

| Guard | Exige | Fallo → |
|-------|-------|---------|
| `ProtectedRoute` | JWT vivo | login + retorno |
| `AdminRoleSwitch` | JWT + ADMIN_ROLES o ROLES_POS | `/` o login |
| `ITOnlyGuard` | `esStaffPlataforma` (ADMIN) | `/admin` |
| `PermisoGuard(p)` | ADMIN **o** `permissions` ⊇ p | `/admin` |
| `SuperAdminGuard` | `userRole === 'ADMIN'` | `/admin` |
| `PlanPathGate(prefijo)` | sesión + vendedor + plan=prefijo | login /admin /admin/pos / remap |
| `PlanGate(feature)` | `hasFeature(feature)` tenant | UpgradePrompt (no Navigate) |
| `RedirectSiSistema` | si vendedor → Navigate `to`; si no → children | — |
| `SistemaProductoFormRoute` | solo vendedor; nuevo remapea a seller | `/admin/productos` |
| `Admin*Route` switches | `esUsuarioSistema` → páginas Sistema* vs Admin* | — |
| `AdminRoute` | JWT + ADMIN_ROLES (+ itOnly) | **definido, no montado** |

Roles (`C:\Cursor-test-hot\Hot-click-dev\Hot_click_outlet\frontend\src\utils\sistemaUser.ts:5-22`):
- Vendedor: `EMPRENDEDOR|PROPIETARIO|EDITOR|LECTOR`
- POS: `CAJERO|GERENTE|SUPERVISOR`
- Plataforma: `ADMIN`
- Plan URL: `PYME`→`/pyme`, `NEGOCIO_PLUS`→`/negocio-plus`, default→`/emprendedor` (`planPaths.ts:15-19`)

Vendedor se queda en `/admin` solo si path: pos, configuracion, billing, copilot, mi-empresa, ayuda (`planPaths.ts:45-53`).

---

## 5. Duplicados / aliases / huérfanas / redirects

| Hallazgo | Etiqueta | Evidencia |
|----------|----------|-----------|
| `sellerAdminRoutes.tsx` exporta `rutasSeller*` y **ningún import** en el repo | ❓ HUÉRFANO / código muerto | Grep solo define el archivo |
| `AdminRoute` exportado, nunca usado en Routes | ❓ HUÉRFANO | `routeGuards.tsx:44` |
| Marketplace `/` vs prototipo `/visitante` (ambos “compra”) | POSIBLE DUPLICACIÓN | diseño intencional (`AppRoutes.tsx:138-141`) |
| `/carrito` vs `/visitante/carrito` vs `/tienda/:slug/carrito` vs seller `carrito` | POSIBLE DUPLICACIÓN | shells distintos |
| `/emprende` vs `/emprendimientos` vs `/emprendedor` | POSIBLE confusión de naming | paths distintos |
| `/admin/tienda` → `/admin` vs seller `…/tienda` preview | HECHO OBSERVADO | `AppRoutes.tsx:248-249` |
| `/admin/blog` (CMS admin) vs `/blog` público | HECHO OBSERVADO | no son alias |
| `/admin/inventario` (PlanGate PYME) vs `/admin/inventario/captura\|paquetes` (SuperAdmin) | HECHO OBSERVADO | scopes distintos |
| Alias legacy `tiendas`/`moderacion`/`config`/`herramientas/*` | HECHO OBSERVADO | §2.1 |
| Emprendedor paths planos (`/emprendedor/bodegas`) → `opciones/bodegas`; PYME usa paths planos reales | HECHO OBSERVADO | asimetría Emp vs PYME |
| Remap admin→seller en `rutaSellerDesdeAdmin` | HECHO OBSERVADO | `planPaths.ts:56-108` |
| Roles POS pueden entrar a `/admin/*` no-POS con `AdminLayout` | ❓ REQUIERE VALIDACIÓN | `AdminRoleSwitch.tsx:38-40` |
| `RedirectSiSistema` en rutas que AdminRoleSwitch ya remapea vendedores | POSIBLE defensa en profundidad | `AppRoutes` + `AdminRoleSwitch` |
| Clerk SSO routes solo si env key | HECHO OBSERVADO | `AppRoutes.tsx:24-27,164-176` |

---

## 6. Citas clave (archivo:línea)

```145:151:frontend/src/app/AppRoutes.tsx
      <Route path="/" element={<HomePage />} />
      <Route path="/visitante/*" element={<VisitanteRoutes />} />
      <Route path="/emprendedor/*" element={<EmprendedorArea />} />
      <Route path="/pyme/*" element={<PymeArea />} />
      <Route path="/negocio-plus/*" element={<NegocioPlusArea />} />
      <Route path="/prototipo" element={<PrototipoRedirect />} />
      <Route path="/prototipo/*" element={<PrototipoRedirect />} />
```

```199:201:frontend/src/app/AppRoutes.tsx
      <Route path="/admin/*" element={<AdminRoleSwitch />}>
        <Route index element={<AdminHomeRoute />} />
        <Route path="dashboard" element={<Navigate to="/admin" replace />} />
```

```33:80:frontend/src/app/routeGuards.tsx
export function ProtectedRoute({ children }: ConHijos) { ... }
export function ITOnlyGuard() { ... }
export function PermisoGuard({ permiso }: { permiso: string }) { ... }
export function SuperAdminGuard() { ... }
```

```29:70:frontend/src/app/AdminRoleSwitch.tsx
export default function AdminRoleSwitch() {
  // token → login; ADMIN_ROLES|ROLES_POS; staff vs tenant-ops;
  // /admin/pos → POSShell; vendedor → adminAVendedor; else AdminLayout
}
```

```28:55:frontend/src/app/PlanPathGate.tsx
// sesión; staff→/admin; POS→/admin/pos; !vendedor→/; plan≠prefijo→remap
```

```116:131:frontend/src/utils/planPaths.ts
const MAPA_PROTOTIPO = [ visitante, emprendedor, pyme, negocio-plus, admin ]
export function destinoPrototipo(...) { ... }
```

```7:29:frontend/src/app/FigmaSellerGate.tsx
export function PymeArea / NegocioPlusArea / EmprendedorArea // PlanPathGate + *Routes
```

---

**Conteo aproximado (HECHO OBSERVADO):** ~45 rutas marketplace/auth; ~90 entradas `/admin` (vivas+redirects); ~20 `/visitante`; ~35 `/emprendedor`; ~30 PYME/Plus (base + 1 extra c/u); 5 `/tienda/:slug`; 2 `/prototipo*`.