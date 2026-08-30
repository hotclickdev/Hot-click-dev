import type { TFunction } from 'i18next'

export type SidebarLink = {
  to?: string
  label?: string
  icon?: string
  exact?: boolean
  section?: string
  feature?: string
}

/**
 * Jobs del sidebar Admin IT. No mezclar con Sistema (EMPRENDEDOR).
 * IA y Fiscal arrancan colapsados (disclosure progresivo).
 */
export const ADMIN_IT_SECCION = {
  CATALOGO: 'Catálogo',
  VENTAS: 'Ventas',
  ABASTECIMIENTO: 'Abastecimiento',
  POS: 'Punto de Venta',
  FINANZAS: 'Finanzas',
  MARKETING: 'Marketing',
  PLATAFORMA: 'Plataforma',
  IA: 'IA',
  FISCAL: 'Fiscal',
}

export const ADMIN_IT_SECCIONES_COLAPSADAS_POR_DEFECTO = [
  ADMIN_IT_SECCION.IA,
  ADMIN_IT_SECCION.FISCAL,
]

export const CLAVE_SIDEBAR_COLAPSADO = 'hc-sidebar-collapsed'

/**
 * Preferencia de secciones colapsadas. Sin valor guardado, Admin IT
 * oculta IA y Fiscal; Sistema y el resto arrancan abiertos.
 * @param {string} userRole
 */
export function leerSeccionesColapsadas(userRole?: string | null): Set<string> {
  try {
    const raw = localStorage.getItem(CLAVE_SIDEBAR_COLAPSADO)
    if (raw == null) {
      return new Set<string>(userRole === 'ADMIN' ? ADMIN_IT_SECCIONES_COLAPSADAS_POR_DEFECTO : [])
    }
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? new Set(parsed.filter((x): x is string => typeof x === 'string')) : new Set<string>()
  } catch {
    return new Set<string>()
  }
}

function seccionCatalogo(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.CATALOGO },
    { to: '/admin/productos', label: t('admin.sidebar.productos'), icon: 'box' },
    { to: '/admin/productos/carga-masiva', label: 'Carga masiva', icon: 'upload' },
    { to: '/admin/productos/importar', label: 'Importar catálogo IA', icon: 'import' },
    { to: '/admin/categorias', label: t('admin.sidebar.categorias'), icon: 'tag' },
    { to: '/admin/marcas', label: 'Marcas', icon: 'marca' },
    { to: '/admin/garantias', label: 'Garantías', icon: 'shield' },
  ]
}

function seccionVentas(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.VENTAS },
    { to: '/admin/pedidos', label: t('admin.sidebar.pedidos'), icon: 'clipboard' },
    { to: '/admin/ventas', label: t('admin.sidebar.nuevaVenta'), icon: 'plus' },
    { to: '/admin/clientes', label: 'Mis Clientes', icon: 'users' },
    { to: '/admin/asignar-compra', label: 'Registrar compra externa', icon: 'assign' },
    { to: '/admin/cotizaciones', label: 'Cotizaciones B2B', icon: 'doc' },
    { to: '/admin/gift-cards', label: 'Gift Cards', icon: 'gift' },
  ]
}

function seccionAbastecimiento(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.ABASTECIMIENTO },
    { to: '/admin/bodegas', label: t('admin.sidebar.bodegas'), icon: 'building' },
    { to: '/admin/compras', label: 'Compras', icon: 'compra' },
    { to: '/admin/proveedores', label: 'Proveedores', icon: 'proveedor' },
  ]
}

function seccionPos(): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.POS },
    { to: '/admin/pos', label: 'Caja registradora', icon: 'pos' },
    { to: '/admin/pos/caja', label: 'Cuadre de caja', icon: 'chart' },
    { to: '/admin/pos/historial', label: 'Historial ventas', icon: 'clipboard' },
  ]
}

function seccionFinanzas(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.FINANZAS },
    { to: '/admin/finanzas', label: t('admin.sidebar.finanzas'), icon: 'chart' },
    { to: '/admin/reportes', label: t('admin.sidebar.reportes'), icon: 'bar' },
  ]
}

function seccionMarketing(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.MARKETING },
    { to: '/admin/ofertas', label: 'Ofertas', icon: 'tag' },
    { to: '/admin/cupones', label: 'Descuentos', icon: 'coupon' },
    { to: '/admin/nuevo-producto', label: t('admin.sidebar.crearIA'), icon: 'camera' },
    { to: '/admin/publicaciones', label: t('admin.sidebar.publicarFB'), icon: 'share' },
    { to: '/admin/blog', label: 'Blog', icon: 'blog' },
    { to: '/admin/convenios', label: 'Emprendimientos', icon: 'heart' },
    { to: '/admin/servicios', label: 'Servicios HOT', icon: 'wrench' },
    { to: '/admin/testimonios', label: 'Testimonios', icon: 'star' },
  ]
}

function seccionPlataforma(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.PLATAFORMA },
    { to: '/admin/homepage', label: 'Homepage / Carousel', icon: 'home' },
    { to: '/admin/branding', label: 'Branding / White Label', icon: 'brand' },
    { to: '/admin/multipais', label: 'LATAM Multi-país', icon: 'globe' },
    { to: '/admin/plugins', label: 'Plugins / Integraciones', icon: 'plugin' },
    { to: '/admin/pagos', label: 'Pagos / Webhooks', icon: 'card' },
    { to: '/admin/usuarios', label: t('admin.sidebar.usuarios'), icon: 'users' },
    { to: '/admin/empresas', label: 'Empresas', icon: 'empresa' },
    { to: '/admin/aprobaciones', label: 'Aprobaciones', icon: 'check' },
    { to: '/admin/security', label: 'Security Center', icon: 'shield' },
    { to: '/admin/observabilidad', label: 'Observabilidad', icon: 'chart' },
    { to: '/admin/superadmin', label: 'Feature Flags / SaaS', icon: 'config' },
    { to: '/admin/billing/planes', label: 'Planes / Billing', icon: 'card' },
    { to: '/admin/configuracion', label: 'Configuración', icon: 'config' },
  ]
}

function seccionIa(): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.IA },
    { to: '/admin/inventario', label: 'AI Inventario', icon: 'ai' },
    { to: '/admin/copilot', label: 'AI Copilot', icon: 'copilot' },
    { to: '/admin/forecast', label: 'AI Forecast', icon: 'forecast' },
    { to: '/admin/executive', label: 'Executive BI', icon: 'exec' },
    { to: '/admin/ai-control', label: 'Control IA', icon: 'ai' },
  ]
}

function seccionFiscal(): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.FISCAL },
    { to: '/admin/facturas', label: 'Comprobantes Electrónicos', icon: 'card' },
    { to: '/admin/config-fiscal', label: 'Config. Fiscal', icon: 'config' },
  ]
}

/**
 * Sidebar Admin IT agrupado por job. Mismas rutas que antes; otro agrupado.
 * @param {Function} t i18n translate
 */
export function buildAdminItLinks(t: TFunction): SidebarLink[] {
  return [
    { to: '/admin', label: 'Inicio', icon: 'home', exact: true },
    ...seccionCatalogo(t),
    ...seccionVentas(t),
    ...seccionAbastecimiento(t),
    ...seccionPos(),
    ...seccionFinanzas(t),
    ...seccionMarketing(t),
    ...seccionPlataforma(t),
    ...seccionIa(),
    ...seccionFiscal(),
  ]
}
