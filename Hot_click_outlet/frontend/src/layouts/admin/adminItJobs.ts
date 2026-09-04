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
  /** Permiso global.* requerido para staff (ADMIN ve todo). */
  permiso?: string
}

/**
 * Jobs del sidebar Admin IT (operador de plataforma).
 * No mezclar con Sistema (EMPRENDEDOR) ni con ops de tienda propia.
 */
export const ADMIN_IT_SECCION = {
  OPERAR: 'operarPlataforma',
  MARKETPLACE: 'marketplaceCms',
  SISTEMA: 'sistemaPlataforma',
  /** Legacy IDs — se migran en leerSeccionesColapsadas. */
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
  'Operar plataforma': 'operarPlataforma',
  'Marketplace': 'marketplaceCms',
}

/** Secciones secundarias colapsadas por defecto. */
export const ADMIN_IT_SECCIONES_COLAPSADAS_POR_DEFECTO = [
  ADMIN_IT_SECCION.MARKETPLACE,
  ADMIN_IT_SECCION.SISTEMA,
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
 * colapsa Marketplace CMS y Sistema; el núcleo y Operar quedan abiertos.
 */
export function leerSeccionesColapsadas(userRole?: string | null): Set<string> {
  try {
    const raw = localStorage.getItem(CLAVE_SIDEBAR_COLAPSADO)
    if (raw == null) {
      return new Set<string>(
        userRole === 'ADMIN'
          ? ADMIN_IT_SECCIONES_COLAPSADAS_POR_DEFECTO
          : [],
      )
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

function seccionOperarPlataforma(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.OPERAR },
    { to: '/admin/payouts', label: t('admin.sidebar.retirosBilletera'), icon: 'card', permiso: 'global.metrics' },
    { to: '/admin/saas-billing', label: t('admin.sidebar.billingPlataforma'), icon: 'card', permiso: 'global.metrics' },
    { to: '/admin/pagos', label: t('admin.sidebar.pagosWebhooks'), icon: 'card', permiso: 'global.metrics' },
    { to: '/admin/recolecciones', label: t('admin.sidebar.recoleccionEntrega'), icon: 'clipboard', permiso: 'global.companies' },
    { to: '/admin/reportes-producto', label: t('admin.sidebar.productosReportados'), icon: 'shield', permiso: 'global.approvals' },
    { to: '/admin/servicios', label: t('admin.sidebar.serviciosHot'), icon: 'wrench', permiso: 'global.companies' },
    { to: '/admin/facturas', label: t('admin.sidebar.comprobantesElectronicos'), icon: 'clipboard', permiso: 'global.metrics' },
    { to: '/admin/config-fiscal', label: t('admin.sidebar.configFiscal'), icon: 'config', permiso: 'global.metrics' },
  ]
}

function seccionMarketplaceCms(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.MARKETPLACE },
    { to: '/admin/homepage', label: t('admin.sidebar.homepageCarousel'), icon: 'home' },
    { to: '/admin/categorias', label: t('admin.sidebar.categorias'), icon: 'tag' },
    { to: '/admin/marcas', label: t('admin.sidebar.marcas'), icon: 'marca' },
    { to: '/admin/cupones', label: t('admin.sidebar.descuentos'), icon: 'coupon' },
  ]
}

function seccionSistemaPlataforma(t: TFunction): SidebarLink[] {
  return [
    { section: ADMIN_IT_SECCION.SISTEMA },
    { to: '/admin/security', label: t('admin.sidebar.securityCenter'), icon: 'shield' },
    { to: '/admin/superadmin', label: t('admin.sidebar.featureFlags'), icon: 'config' },
    { to: '/admin/observabilidad', label: t('admin.sidebar.observabilidad'), icon: 'chart' },
    { to: '/admin/ai-control', label: t('admin.sidebar.controlIa'), icon: 'ai' },
    { to: '/admin/multipais', label: t('admin.sidebar.multipais'), icon: 'globe' },
  ]
}

/**
 * Núcleo Figma Super Admin:
 * Inicio · Tiendas · Usuarios · Moderación · Config · Más herramientas.
 */
function seccionNucleoFigma(t: TFunction): SidebarLink[] {
  return [
    { to: '/admin', label: t('admin.sidebar.inicio'), icon: 'home', exact: true },
    { to: '/admin/empresas', label: t('admin.sidebar.tiendas'), icon: 'empresa', permiso: 'global.companies' },
    { to: '/admin/usuarios', label: t('admin.sidebar.usuarios'), icon: 'users' },
    { to: '/admin/aprobaciones', label: t('admin.sidebar.moderacion'), icon: 'check', permiso: 'global.approvals' },
    { to: '/admin/configuracion', label: t('admin.sidebar.config'), icon: 'config' },
    { to: '/admin/herramientas', label: t('admin.sidebar.masHerramientas'), icon: 'wrench' },
  ]
}

/**
 * Sidebar Admin IT: operador de plataforma (sin ops de tienda propia).
 * Staff se filtra con {@link filtrarLinksPorPermiso}.
 */
export function buildAdminItLinks(t: TFunction): SidebarLink[] {
  return [
    ...seccionNucleoFigma(t),
    ...seccionOperarPlataforma(t),
    ...seccionMarketplaceCms(t),
    ...seccionSistemaPlataforma(t),
  ]
}

/**
 * Filtra el menú Admin IT por permisos del JWT.
 * ADMIN ve todo. Staff solo ítems con su global.* (+ Inicio siempre).
 */
export function filtrarLinksPorPermiso(
  links: SidebarLink[],
  permissions: string[],
  userRole?: string | null,
): SidebarLink[] {
  if (userRole === 'ADMIN') return links
  const tiene = (p?: string) => p != null && permissions.includes(p)
  const out: SidebarLink[] = []
  let pendienteSeccion: SidebarLink | null = null

  for (const link of links) {
    if (link.section != null && link.to == null) {
      pendienteSeccion = link
      continue
    }
    const esInicio = link.to === '/admin' && link.exact === true
    if (!esInicio && !tiene(link.permiso)) continue
    if (pendienteSeccion != null) {
      out.push(pendienteSeccion)
      pendienteSeccion = null
    }
    out.push(link)
  }
  return out
}

/**
 * Rutas de ops de un negocio (POS, catálogo, finanzas, etc.).
 * El rol ADMIN de plataforma no debe operarlas como si fueran su tienda.
 */
const PREFIJOS_TENANT_OPS = [
  '/admin/pos',
  '/admin/productos',
  '/admin/nuevo-producto',
  '/admin/finanzas',
  '/admin/mi-empresa',
  '/admin/bodegas',
  '/admin/compras',
  '/admin/proveedores',
  '/admin/ventas',
  '/admin/gift-cards',
  '/admin/cotizaciones',
  '/admin/clientes',
  '/admin/asignar-compra',
  '/admin/encargos',
  '/admin/billetera',
  '/admin/reportes',
  '/admin/forecast',
  '/admin/executive',
  '/admin/inventario',
  '/admin/copilot',
  '/admin/equipo',
  '/admin/billing',
  '/admin/blog',
  '/admin/publicaciones',
  '/admin/ofertas',
  '/admin/offline',
  '/admin/garantias',
  '/admin/ayuda',
] as const

/** True si un ADMIN de plataforma no debe quedarse en esta ruta. */
export function esRutaTenantOpsParaAdmin(pathname: string): boolean {
  if (pathname.startsWith('/admin/reportes-producto')) return false
  return PREFIJOS_TENANT_OPS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
}
