import type { TFunction } from 'i18next'

export type SidebarLink = {
  to?: string
  label?: string
  icon?: string
  exact?: boolean
  /** Stable section ID (not a display label). */
  section?: string
  feature?: string
  /** Contador opcional (ej. pendientes de moderación). */
  badge?: number
}

/**
 * Jobs del sidebar Admin IT. No mezclar con Sistema (EMPRENDEDOR).
 * Valores = IDs estables (localStorage / colores); labels vía i18n.
 * IA y Fiscal arrancan colapsados (disclosure progresivo).
 */
export const ADMIN_IT_SECCION = {
  CATALOGO: 'catalogo',
  VENTAS: 'ventas',
  ABASTECIMIENTO: 'abastecimiento',
  POS: 'pos',
  FINANZAS: 'finanzas',
  MARKETING: 'marketing',
  PLATAFORMA: 'plataforma',
  IA: 'ia',
  FISCAL: 'fiscal',
} as const

export type AdminItSeccionId = (typeof ADMIN_IT_SECCION)[keyof typeof ADMIN_IT_SECCION]

/** Secciones Sistema / roles — IDs estables fuera de ADMIN_IT_SECCION. */
export const SISTEMA_SECCION = {
  VENDER: 'vender',
  CATALOGO: 'catalogo',
  MI_NEGOCIO: 'miNegocio',
  MAS: 'mas',
  POS: 'pos',
  VENTAS: 'ventas',
  PUNTO_VENTA: 'puntoVenta',
  CATALOGO_INVENTARIO: 'catalogoInventario',
} as const

/**
 * Nombres en español que se guardaban en `hc-sidebar-collapsed` antes
 * de separar ID vs label. Se migran al leer.
 */
export const LEGACY_SECTION_ID: Record<string, string> = {
  'Catálogo': 'catalogo',
  'Ventas': 'ventas',
  'Abastecimiento': 'abastecimiento',
  'Punto de Venta': 'pos',
  'POS': 'pos',
  'Finanzas': 'finanzas',
  'Marketing': 'marketing',
  'Plataforma': 'plataforma',
  'IA': 'ia',
  'Fiscal': 'fiscal',
  'Vender': 'vender',
  'Mi negocio': 'miNegocio',
  'Más': 'mas',
  'Catálogo e inventario': 'catalogoInventario',
  'Sistema': 'sistema',
}

export const ADMIN_IT_SECCIONES_COLAPSADAS_POR_DEFECTO = [
  ADMIN_IT_SECCION.IA,
  ADMIN_IT_SECCION.FISCAL,
]

export const CLAVE_SIDEBAR_COLAPSADO = 'hc-sidebar-collapsed'

export function getSectionLabel(t: TFunction, sectionId: string): string {
  return t(`admin.sidebar.section.${sectionId}`)
}

function migrarIdsSeccion(raw: string): string[] {
  if (raw === 'Punto de Venta') return ['pos', 'puntoVenta']
  const mapped = LEGACY_SECTION_ID[raw]
  return mapped != null ? [mapped] : [raw]
}

/**
 * Preferencia de secciones colapsadas. Sin valor guardado, Admin IT
 * oculta IA y Fiscal; Sistema y el resto arrancan abiertos.
 * Migra IDs legacy en español → IDs estables y reescribe localStorage.
 */
export function leerSeccionesColapsadas(userRole?: string | null): Set<string> {
  try {
    const raw = localStorage.getItem(CLAVE_SIDEBAR_COLAPSADO)
    if (raw == null) {
      return new Set<string>(userRole === 'ADMIN' ? ADMIN_IT_SECCIONES_COLAPSADAS_POR_DEFECTO : [])
    }
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set<string>()
    const strings = parsed.filter((x): x is string => typeof x === 'string')
    const next = new Set(strings.flatMap(migrarIdsSeccion))
    const needsRewrite = strings.some(
      (x) => x === 'Punto de Venta' || LEGACY_SECTION_ID[x] != null,
    )
    if (needsRewrite) {
      try {
        localStorage.setItem(CLAVE_SIDEBAR_COLAPSADO, JSON.stringify([...next]))
      } catch { /* quota or private mode */ }
    }
    return next
  } catch {
    return new Set<string>()
  }
}

function seccionCatalogo(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.CATALOGO },
    { to: '/admin/productos', label: t('admin.sidebar.productos'), icon: 'box' },
    { to: '/admin/productos/carga-masiva', label: t('admin.sidebar.cargaMasiva'), icon: 'upload' },
    { to: '/admin/productos/importar', label: t('admin.sidebar.importarCatalogoIA'), icon: 'import' },
    { to: '/admin/categorias', label: t('admin.sidebar.categorias'), icon: 'tag' },
    { to: '/admin/marcas', label: t('admin.sidebar.marcas'), icon: 'marca' },
    { to: '/admin/garantias', label: t('admin.sidebar.garantias'), icon: 'shield' },
  ]
}

function seccionVentas(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.VENTAS },
    { to: '/admin/pedidos', label: t('admin.sidebar.pedidos'), icon: 'clipboard' },
    { to: '/admin/ventas', label: t('admin.sidebar.nuevaVenta'), icon: 'plus' },
    { to: '/admin/clientes', label: t('admin.sidebar.misClientes'), icon: 'users' },
    { to: '/admin/asignar-compra', label: t('admin.sidebar.registrarCompraExterna'), icon: 'assign' },
    { to: '/admin/recolecciones', label: t('admin.sidebar.recoleccionEntrega'), icon: 'clipboard' },
    { to: '/admin/cotizaciones', label: t('admin.sidebar.cotizacionesB2B'), icon: 'doc' },
    { to: '/admin/gift-cards', label: t('admin.sidebar.giftCards'), icon: 'gift' },
  ]
}

function seccionAbastecimiento(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.ABASTECIMIENTO },
    { to: '/admin/bodegas', label: t('admin.sidebar.bodegas'), icon: 'building' },
    { to: '/admin/compras', label: t('admin.sidebar.compras'), icon: 'compra' },
    { to: '/admin/proveedores', label: t('admin.sidebar.proveedores'), icon: 'proveedor' },
  ]
}

function seccionPos(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.POS },
    { to: '/admin/pos', label: t('admin.sidebar.cajaRegistradora'), icon: 'pos' },
    { to: '/admin/pos/caja', label: t('admin.sidebar.cuadreCaja'), icon: 'chart' },
    { to: '/admin/pos/historial', label: t('admin.sidebar.historialVentas'), icon: 'clipboard' },
  ]
}

function seccionFinanzas(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.FINANZAS },
    { to: '/admin/finanzas', label: t('admin.sidebar.finanzas'), icon: 'chart' },
    { to: '/admin/payouts', label: 'Retiros billetera', icon: 'card' },
    { to: '/admin/reportes', label: t('admin.sidebar.reportes'), icon: 'bar' },
  ]
}

function seccionMarketing(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.MARKETING },
    { to: '/admin/ofertas', label: t('admin.sidebar.ofertas'), icon: 'tag' },
    { to: '/admin/cupones', label: t('admin.sidebar.descuentos'), icon: 'coupon' },
    { to: '/admin/nuevo-producto', label: t('admin.sidebar.crearIA'), icon: 'camera' },
    { to: '/admin/publicaciones', label: t('admin.sidebar.publicarFB'), icon: 'share' },
    { to: '/admin/blog', label: t('admin.sidebar.blog'), icon: 'blog' },
    { to: '/admin/convenios', label: t('admin.sidebar.emprendimientos'), icon: 'heart' },
    { to: '/admin/servicios', label: t('admin.sidebar.serviciosHot'), icon: 'wrench' },
    { to: '/admin/testimonios', label: t('admin.sidebar.testimonios'), icon: 'star' },
  ]
}

function seccionPlataforma(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.PLATAFORMA },
    { to: '/admin/homepage', label: t('admin.sidebar.homepageCarousel'), icon: 'home' },
    { to: '/admin/branding', label: t('admin.sidebar.branding'), icon: 'brand' },
    { to: '/admin/multipais', label: t('admin.sidebar.multipais'), icon: 'globe' },
    { to: '/admin/plugins', label: t('admin.sidebar.plugins'), icon: 'plugin' },
    { to: '/admin/pagos', label: t('admin.sidebar.pagosWebhooks'), icon: 'card' },
    { to: '/admin/usuarios', label: t('admin.sidebar.usuarios'), icon: 'users' },
    { to: '/admin/empresas', label: t('admin.sidebar.empresas'), icon: 'empresa' },
    { to: '/admin/aprobaciones', label: t('admin.sidebar.aprobaciones'), icon: 'check' },
    { to: '/admin/security', label: t('admin.sidebar.securityCenter'), icon: 'shield' },
    { to: '/admin/observabilidad', label: t('admin.sidebar.observabilidad'), icon: 'chart' },
    { to: '/admin/superadmin', label: t('admin.sidebar.featureFlags'), icon: 'config' },
    { to: '/admin/billing/planes', label: t('admin.sidebar.planesBilling'), icon: 'card' },
    { to: '/admin/configuracion', label: t('admin.sidebar.configuracion'), icon: 'config' },
  ]
}

function seccionIa(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.IA },
    { to: '/admin/inventario', label: t('admin.sidebar.aiInventario'), icon: 'ai' },
    { to: '/admin/copilot', label: t('admin.sidebar.aiCopilot'), icon: 'copilot' },
    { to: '/admin/forecast', label: t('admin.sidebar.aiForecast'), icon: 'forecast' },
    { to: '/admin/executive', label: t('admin.sidebar.executiveBi'), icon: 'exec' },
    { to: '/admin/ai-control', label: t('admin.sidebar.controlIa'), icon: 'ai' },
  ]
}

function seccionFiscal(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.FISCAL },
    { to: '/admin/facturas', label: t('admin.sidebar.comprobantesElectronicos'), icon: 'card' },
    { to: '/admin/config-fiscal', label: t('admin.sidebar.configFiscal'), icon: 'config' },
  ]
}

/**
 * Núcleo Figma Super Admin (41:128 / bottom nav 43:150):
 * Inicio · Tiendas · Usuarios · Moderación · Config.
 * El resto de jobs IT va debajo en "Más herramientas".
 */
function seccionNucleoFigma(t: TFunction): SidebarLink[] {
  return [
    { to: '/admin', label: t('admin.sidebar.inicio'), icon: 'home', exact: true },
    { to: '/admin/empresas', label: t('admin.sidebar.tiendas'), icon: 'empresa' },
    { to: '/admin/usuarios', label: t('admin.sidebar.usuarios'), icon: 'users' },
    { to: '/admin/aprobaciones', label: t('admin.sidebar.moderacion'), icon: 'check' },
    { to: '/admin/configuracion', label: t('admin.sidebar.config'), icon: 'config' },
    { to: '/admin/herramientas', label: t('admin.sidebar.masHerramientas'), icon: 'wrench' },
  ]
}

/**
 * Sidebar Admin IT: primero los 4 destinos Figma, luego jobs IT restantes.
 * @param {Function} t i18n translate
 */
export function buildAdminItLinks(t: TFunction): SidebarLink[] {
  const nucleo = new Set(['/admin', '/admin/empresas', '/admin/usuarios', '/admin/aprobaciones', '/admin/configuracion', '/admin/herramientas'])
  const resto = [
    ...seccionCatalogo(t),
    ...seccionVentas(t),
    ...seccionAbastecimiento(t),
    ...seccionPos(t),
    ...seccionFinanzas(t),
    ...seccionMarketing(t),
    ...seccionPlataforma(t).filter((l) => !l.to || !nucleo.has(l.to)),
    ...seccionIa(t),
    ...seccionFiscal(t),
  ]
  return [...seccionNucleoFigma(t), ...resto]
}
