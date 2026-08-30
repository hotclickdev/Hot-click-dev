import { esUsuarioSistema } from '@/utils/sistemaUser'
import {
  buildAdminItLinks,
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
    { section: SISTEMA_SECCION.CATALOGO },
    { to: '/admin/productos', label: t('admin.sidebar.productos'), icon: 'box' },
    { to: '/admin/ofertas', label: t('admin.sidebar.promociones'), icon: 'tag' },
    { section: SISTEMA_SECCION.MI_NEGOCIO },
    { to: '/admin/clientes', label: t('admin.sidebar.clientes'), icon: 'users' },
    { to: '/admin/blog', label: t('admin.sidebar.posts'), icon: 'blog' },
    { to: '/admin/reportes', label: t('admin.sidebar.reportes'), icon: 'bar', feature: 'reportes' },
    { to: '/admin/copilot', label: t('admin.sidebar.consultasConHot'), icon: 'copilot' },
    { section: SISTEMA_SECCION.MAS },
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
 */
export function buildSidebarLinks(t: TFunction, userRole?: string | null): SidebarLink[] {
  if (userRole === 'ADMIN') {
    return buildAdminItLinks(t)
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

  // EMPRENDEDOR
  return [
    { to: '/admin', label: t('admin.sidebar.inicio'), icon: 'home', exact: true },
    { section: SISTEMA_SECCION.PUNTO_VENTA },
    ...linksPos(t),
    // { to: '/admin/mesas', label: 'Mesas / QR', icon: 'qr' },  // futuro
    { section: SISTEMA_SECCION.CATALOGO_INVENTARIO },
    { to: '/admin/productos', label: t('admin.sidebar.productos'), icon: 'box' },
    { to: '/admin/productos/carga-masiva', label: t('admin.sidebar.cargaMasiva'), icon: 'upload' },
    { to: '/admin/productos/importar', label: t('admin.sidebar.importarCatalogoIA'), icon: 'import' },
    { to: '/admin/nuevo-producto', label: t('admin.sidebar.generarProductoRapido'), icon: 'camera' },
    { to: '/admin/categorias', label: t('admin.sidebar.categorias'), icon: 'tag' },
    { to: '/admin/marcas', label: t('admin.sidebar.marcas'), icon: 'marca' },
    { to: '/admin/bodegas', label: t('admin.sidebar.bodegas'), icon: 'building' },
    { to: '/admin/inventario', label: t('admin.sidebar.inventarioIa'), icon: 'ai' },
    { to: '/admin/compras', label: t('admin.sidebar.compras'), icon: 'compra' },
    { to: '/admin/proveedores', label: t('admin.sidebar.proveedores'), icon: 'proveedor' },
    { section: ADMIN_IT_SECCION.VENTAS },
    { to: '/admin/pedidos', label: t('admin.sidebar.pedidos'), icon: 'clipboard' },
    { to: '/admin/ventas', label: t('admin.sidebar.nuevaVenta'), icon: 'plus' },
    { to: '/admin/asignar-compra', label: t('admin.sidebar.registrarCompraExterna'), icon: 'assign' },
    { to: '/admin/finanzas', label: t('admin.sidebar.finanzas'), icon: 'chart' },
    { to: '/admin/billetera', label: t('admin.sidebar.miBilletera'), icon: 'wallet' },
    { to: '/admin/reportes', label: t('admin.sidebar.reportes'), icon: 'bar' },
    { section: ADMIN_IT_SECCION.MARKETING },
    { to: '/admin/ofertas', label: t('admin.sidebar.ofertas'), icon: 'tag' },
    { to: '/admin/blog', label: t('admin.sidebar.blog'), icon: 'blog' },
    { section: SISTEMA_SECCION.MI_NEGOCIO },
    { to: '/admin/mi-empresa', label: t('admin.sidebar.miNegocio'), icon: 'empresa' },
    { to: '/admin/configuracion', label: t('admin.sidebar.configuracion'), icon: 'config' },
  ]
}
