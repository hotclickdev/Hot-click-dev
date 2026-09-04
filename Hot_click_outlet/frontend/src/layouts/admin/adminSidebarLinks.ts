import { esUsuarioSistema, ROLES_STAFF } from '@/utils/sistemaUser'
import {
  buildAdminItLinks,
  filtrarLinksPorPermiso,
  SISTEMA_SECCION,
  ADMIN_IT_SECCION,
  type SidebarLink,
} from './adminItJobs'
import type { TFunction } from 'i18next'

/**
 * Sidebar simplificado del "Sistema" para el dueño de negocio (rol
 * EMPRENDEDOR) — reemplaza el panel admin completo de ~30 ítems por los
 * que de verdad usa a diario, siguiendo el rediseño de
 * `Front para cliente EPN/Sistema - Inicio.dc.html`.
 * @param {Function} t i18n translate
 */
export function buildSistemaLinks(t: TFunction): SidebarLink[] {
  return [
    { to: '/admin', label: t('admin.sidebar.inicio'), icon: 'home', exact: true },
    { section: SISTEMA_SECCION.VENDER },
    { to: '/admin/pedidos', label: t('admin.sidebar.ventasYPedidos'), icon: 'clipboard' },
    { to: '/admin/encargos', label: 'Encargos', icon: 'clipboard' },
    { section: SISTEMA_SECCION.CATALOGO },
    { to: '/admin/productos', label: t('admin.sidebar.productos'), icon: 'box' },
    { to: '/admin/ofertas', label: t('admin.sidebar.promociones'), icon: 'tag' },
    { section: SISTEMA_SECCION.MI_NEGOCIO },
    { to: '/admin/clientes', label: t('admin.sidebar.clientes'), icon: 'users' },
    { to: '/admin/gift-cards', label: t('admin.sidebar.giftCards'), icon: 'card', feature: 'giftCards' },
    { to: '/admin/blog', label: t('admin.sidebar.posts'), icon: 'blog' },
    { to: '/admin/reportes', label: t('admin.sidebar.reportes'), icon: 'bar', feature: 'reportes' },
    { to: '/admin/copilot', label: t('admin.sidebar.consultasConHot'), icon: 'copilot' },
    { section: SISTEMA_SECCION.MAS },
    { to: '/admin/offline/cola', label: t('admin.sidebar.colaOffline'), icon: 'sync' },
    { to: '/admin/configuracion', label: t('admin.sidebar.configuracion'), icon: 'config' },
    { to: '/admin/ayuda', label: t('admin.sidebar.ayuda'), icon: 'help' },
  ]
}

function linksPos(t: TFunction): SidebarLink[] {
  return [
    { to: '/admin/pos', label: t('admin.sidebar.cajaRegistradora'), icon: 'pos' },
    { to: '/admin/pos/caja', label: t('admin.sidebar.cuadreCaja'), icon: 'chart' },
    { to: '/admin/pos/historial', label: t('admin.sidebar.historialVentas'), icon: 'clipboard' },
  ]
}

/**
 * Devuelve los links del sidebar con secciones según el rol activo.
 * @param {Function} t i18n translate
 * @param {string} userRole
 * @param {string[]} permissions permisos del JWT (staff)
 */
export function buildSidebarLinks(
  t: TFunction,
  userRole?: string | null,
  permissions: string[] = [],
): SidebarLink[] {
  if (userRole === 'ADMIN' || ROLES_STAFF.has(userRole ?? '')) {
    return filtrarLinksPorPermiso(buildAdminItLinks(t), permissions, userRole)
  }

  // Dueño (planes EMPRENDEDOR / PYME / NEGOCIO_PLUS): menú Sistema.
  if (esUsuarioSistema(userRole)) {
    return buildSistemaLinks(t)
  }

  if (userRole === 'CAJERO') {
    return [
      { section: SISTEMA_SECCION.POS },
      ...linksPos(t),
    ]
  }

  if (userRole === 'GERENTE' || userRole === 'SUPERVISOR') {
    return [
      { to: '/admin', label: t('admin.sidebar.inicio'), icon: 'home', exact: true },
      { section: SISTEMA_SECCION.POS },
      ...linksPos(t),
      { section: ADMIN_IT_SECCION.VENTAS },
      { to: '/admin/pedidos', label: t('admin.sidebar.pedidos'), icon: 'clipboard' },
      { to: '/admin/finanzas', label: t('admin.sidebar.finanzas'), icon: 'chart' },
      { section: ADMIN_IT_SECCION.CATALOGO },
      { to: '/admin/productos', label: t('admin.sidebar.productos'), icon: 'box' },
      { to: '/admin/bodegas', label: t('admin.sidebar.bodegas'), icon: 'building' },
    ]
  }

  // AdminRoleSwitch ya redirige a '/' cualquier rol fuera de ADMIN_ROLES ∪ ROLES_POS
  // (los únicos con acceso a AdminLayout), y esos roles están todos cubiertos arriba —
  // no hay caso borde real que llegue hasta acá.
  return buildSistemaLinks(t)
}
