# Inventario LIGERO — módulos secundarios (`Hot_click_outlet`)
Auditoría estática READ-ONLY. Rutas en `frontend/src/app/AppRoutes.tsx`; APIs en `src/main/java/com/hotclick/controller/`.

---

## Parte A — Comercial

### CRM
**BE:** `CrmController` → `/api/crm/clientes` (listar/CRUD/buscar, `POST …/puntos`, `POST …/wa`, `GET …/wa/historial`) — plan NEGOCIO_PLUS.  
**FE:** `/admin/clientes` vía `AdminClientesRoute` → `AdminClientes` | `SistemaClientes`; también tab CRM en `AdminUsers` (`CrmTab`); POS `ClienteSelector`; detalle con `ajustarPuntos`.  
**Flujo:** Alta/lista de clientes de tienda, puntos y búsqueda para venta/POS; no es pipeline de leads. Sin máquina de estados (cliente activo por uso).  
**Posible muerto:** endpoints WA del CRM sin callers en `frontend/src`. UI CRM duplicada (Clientes + tab Usuarios).

### Cotizaciones
**BE:** `CotizacionController` `/api/cotizaciones` + `CotizacionClienteController` `/api/cotizaciones/clientes`.  
**FE:** `/admin/cotizaciones`, `/nueva`, `/:id`; público `/cotizacion/:token` (`CotizacionPublicaPage`).  
**Estados:** `BORRADOR` → `ENVIADA` → `APROBADA` | `RECHAZADA` (`Cotizacion.java`).  
**Flujo:** Admin crea/edita, cambia estado, duplica, comparte link/WA; cliente ve cotización por token.  
**Posible muerto/huérfano:** sin ítem en sidebars; vendedor remapea `/admin/cotizaciones` → prefijo seller sin ruta equivalente; ADMIN plataforma sale de tenant-ops (`esRutaTenantOpsParaAdmin`).

### Gift cards
**BE:** `GiftCardController` — admin list/create/delete + `GET /gift-cards/validar`.  
**FE:** `/admin/gift-cards` (`PlanGate giftCards` PYME); checkout `ejecutarValidarGiftCard`.  
**Estados:** `ACTIVA` | `AGOTADA` | `VENCIDA` | `CANCELADA`.  
**Flujo:** Emitir/cancelar en admin; validar y descontar saldo en checkout.  
**Posible huérfano:** link en `buildSistemaLinks` apunta a `/admin/…` pero vendedor suele remapease fuera de AdminLayout sin ruta seller.

### Cupones
**BE:** `CuponController` `/api/cupones` (solicitar/validar/listar/stats ADMIN); `TiendaCuponController` `/api/tienda/cupones/validar` (tenant slug/JWT).  
**FE:** `/admin/cupones` (IT marketplace); checkout usa `/cupones/validar`.  
**Estados:** flags `usado` / `usosActuales` vs `maxUsos` (no enum).  
**Flujo:** popup bienvenida → email código → validar en checkout; admin ve stats/filtro usado.  
**Posible muerto:** `TiendaCuponController` sin callers FE.

### Ofertas / promociones
**BE:** sin controller propio — `ProductoController` (`PATCH …/oferta`, oferta por categoría, `en-oferta`); aprobación en `SolicitudAprobacionController` `/ofertas` + `MisSolicitudesController`.  
**FE:** `/admin/ofertas` → `AdminOfertas` | `SistemaPromociones`; catálogo `OfertasView`; bandeja `OfertasPendientes`.  
**Estados solicitud:** `PENDIENTE` → aprobar/rechazar. Producto: flag `enOferta` + `%`.  
**Flujo:** tenant aplica % a productos; platform revisa ofertas pendientes; dueño ve insights en Sistema.

---

## Parte B — Operación

### Compras / OrdenCompra
**BE:** `OrdenCompraController` `/api/compras` — list/get/crear/`recibir`/`cancelar` (feature `compras` PYME).  
**FE:** `/admin/compras`, `/compras/nueva`.  
**Estados:** `PENDIENTE` → `PARCIAL` | `RECIBIDA` | `CANCELADA`.  
**Flujo:** crear OC con ítems → recibir mercancía (parcial/total) o cancelar.  
**Posible muerto UX:** `RedirectSiSistema` (vendedor→config) **y** ADMIN fuera de tenant-ops → inaccesible por UI normal.

### Proveedores
**BE:** `ProveedorController` `/api/proveedores` — CRUD + soft delete + historial costos.  
**FE:** `/admin/proveedores`.  
**Estados:** `estado` int ACTIVO/INACTIVO.  
**Flujo:** CRUD proveedores ligados a OC; historial de costos por proveedor.  
**Misma colisión de guards** que Compras.

### Gastos
**BE:** `GastoController` `/api/gastos` CRUD + filtro fechas.  
**FE:** **sin página propia** — embebido en `AdminFinanzas` (`EgresosTab`, `GastoModal` + `gastoService`). `/admin/finanzas` redirige vendedor a reportes.  
**Estados:** ninguno explícito (registro contable).  
**Flujo:** listar/crear/editar/borrar egresos por período junto a pedidos ENTREGADO.

### Reportes
**Ventas/negocio:** `AdminReportes` | `SistemaReportes` en `/admin/reportes` (datos ventas/POS/`feature reportes`); `AdminReporteContador` + `FinanzasReporteController` `/admin/finanzas/reporte-iva`.  
**Moderación:** `ReporteProductoController` — público POST + admin list/resolver; UI `/admin/reportes-producto`.  
**Estados reporte producto:** `PENDIENTE` | `RESUELTO` | `DESCARTADO`.  
**Flujo:** KPIs/ventas por plan; contador exporta IVA CSV; staff resuelve denuncias de producto.

### Forecast
**BE:** `ForecastController` `/api/admin/forecast` dashboard + generar.  
**FE:** `/admin/forecast` (`PlanGate ai` PYME) → `AdminForecast`.  
**Flujo:** historial semanal → generar pronóstico ingresos/unidades (mín. ~4 semanas).  
**Posible muerto UX:** vendedor→`/admin/copilot`; ADMIN→fuera tenant-ops.

### Executive
**BE:** `ExecutiveController` — dashboard, SSE `ai-summary`, guardar-resumen (`feature reportes`).  
**FE:** `/admin/executive` → `AdminExecutive` (KPIs, AI summary, print, historial reportes).  
**Misma colisión de guards** que Forecast/Compras.

### Multipaís
**BE:** `MultipaisController` `/api/admin/multipais` — paises/tasas/config GET/PUT.  
**FE:** `/admin/multipais` (sidebar IT SISTEMA).  
**Flujo:** config país/moneda/locale/tax + tasas de cambio. Sin workflow de estados.

---

## Parte C — Contenido público

### Blog
**BE:** `BlogController` `/api/blog` — público list/slug; admin CRUD.  
**FE:** `/blog`, `/blog/:slug`; admin `/admin/blog` → `AdminBlog` | `SistemaPosts`.  
**Estados:** `estado` int (1 activo típico). Incluido en sitemap.

### Legales
**FE:** `/terminos`, `/privacidad`, `/devoluciones`, `/envios`, `/nosotros`; pie `LegalMasLinks`.  
**SEO:** `noindex,follow` en términos/privacidad. Sin controllers de negocio (páginas estáticas).

### Servicios HOT
**BE:** `SolicitudServicioController` `/api/servicios` — fotos, crear, mis-solicitudes, admin list/estado/delete.  
**FE:** público `/servicios` (`ServiciosHotPage`); admin `/admin/servicios` (`AdminSolicitudesServicio`, permiso `global.companies`).  
**Estados:** `PENDIENTE` | `EN_BUSQUEDA` | `ENCONTRADO` | `NO_ENCONTRADO` | `CANCELADO`.  
**Flujo:** cliente solicita búsqueda de producto + fotos → staff cambia estado / WA.

### Emprende
**BE:** `EmprendePublicController` `/api/public/emprende/cupos`.  
**FE:** `/emprende` → landing (`EmprendeLanding`) o hub dueño (`EmprendeHub`); registro emprendedor separado.  
**Flujo:** marketing + cupos; dueño logueado ve checklist Sistema.

### SEO / sitemap
**BE:** `ProductoFeedController` — `GET /sitemap.xml` (home, productos, emprende, blog+slugs, etc.) + feed Merchant `/api/public/feed/shopping.xml`.  
**FE/static:** `frontend/public/robots.txt` → `Sitemap: https://hotclick.lat/sitemap.xml`; componente `Seo.tsx` + helmets por página.  
Sin página admin de SEO (solo campos producto `PasoSeo` / `BloqueSeo`).

### Homepage config
**BE:** `HomepageConfigController` `/api/homepage` — `/publico`, GET/PUT admin; entidad fila id=1 (`hero_sections`, `visible_categoria_ids`, `max_categorias`).  
**FE:** `/admin/homepage` (IT marketplace); home consume config pública.  
**Flujo:** elegir secciones del hero rotator + categorías visibles del marketplace.

---

## Posible código muerto / UX huérfana (resumen)

| Señal | Módulos |
|--------|---------|
| Guards cruzados (vendedor redirigido + ADMIN fuera tenant-ops) | Compras, Proveedores, Forecast, Executive |
| Ruta admin sin nav / remap seller sin ruta | Cotizaciones; Gift cards (link Sistema frágil) |
| API sin caller FE | CRM `…/wa*`; `TiendaCuponController` |
| UI duplicada | CRM: `AdminClientes` / `SistemaClientes` / `CrmTab` |
| Solo embebido | Gastos (solo Finanzas) |

Citas clave: rutas `AppRoutes.tsx` (~184–311), guards `routeGuards.tsx` / `AdminRoleSwitch.tsx`, tenant-ops `adminItJobs.ts` `PREFIJOS_TENANT_OPS`, sidebars `adminSidebarLinks.ts`.