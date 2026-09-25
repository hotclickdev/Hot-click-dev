# Inventario módulos secundarios

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