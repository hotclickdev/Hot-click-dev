export const PLANES = ['EMPRENDEDOR', 'PYME', 'NEGOCIO_PLUS']
export const ESTADOS = ['ACTIVO', 'SUSPENDIDO', 'INACTIVO']
export const PLANES_PRO = new Set(['PYME', 'NEGOCIO_PLUS'])

export const ESTADO_LABEL_USUARIO = { 1: 'Activo', 2: 'Inactivo', 3: 'Eliminado', 4: 'Suspendido' }
export const ESTADO_COLOR_USUARIO = {
  1: 'bg-green-500/15 text-green-400',
  2: 'bg-gray-500/15 text-gray-400',
  3: 'bg-red-500/15 text-red-400',
  4: 'bg-yellow-500/15 text-yellow-400',
}

export const ESTADO_PEDIDO_STYLE = {
  PENDIENTE: { bg: 'rgba(212,177,6,0.15)', text: '#d4b106' },
  PAGADO: { bg: 'rgba(23,71,168,0.14)', text: 'var(--hc-accent)' },
  EN_PREPARACION: { bg: 'rgba(245,158,11,0.14)', text: '#f59e0b' },
  ENVIADO: { bg: 'rgba(96,165,250,0.14)', text: '#6490EA' },
  ENTREGADO: { bg: 'rgba(74,222,128,0.14)', text: '#4ade80' },
  COMPLETADO: { bg: 'rgba(63,108,222,0.14)', text: 'var(--hc-blue-400)' },
  CANCELADO: { bg: 'rgba(248,113,113,0.14)', text: '#f87171' },
}

export const ROL_CONFIG = {
  PROPIETARIO: { label: 'Propietario', color: 'bg-amber-500/15 text-amber-400' },
  ADMIN: { label: 'Admin', color: 'bg-[var(--hc-blue-500)]/15 text-[var(--hc-blue-400)]' },
  EDITOR: { label: 'Editor', color: 'bg-blue-500/15 text-blue-400' },
  LECTOR: { label: 'Lector', color: 'bg-gray-500/15 text-gray-400' },
}

export const PLAN_COLOR = {
  EMPRENDEDOR: 'bg-gray-500/15 text-gray-400',
  PYME: 'bg-[var(--hc-blue-500)]/15 text-[var(--hc-blue-400)]',
  NEGOCIO_PLUS: 'bg-amber-500/15 text-amber-400',
}

export const ESTADO_COLOR = {
  ACTIVO: 'bg-green-500/15 text-green-400',
  SUSPENDIDO: 'bg-red-500/15 text-red-400',
  INACTIVO: 'bg-gray-500/15 text-gray-400',
}

export const PAGE_SIZE = 10
export const COLUMNAS_TABLA = ['Empresa', 'Slug', 'Plan', 'Estado', 'Visible', 'Registro', 'Acciones']

/**
 * @param {unknown} data
 * @returns {object[]}
 */
export function listaEmpresasDesdeRespuesta(data) {
  return Array.isArray(data) ? data : (data?.data ?? [])
}

/**
 * @param {unknown} data
 * @returns {object}
 */
export function detalleEmpresaDesdeRespuesta(data) {
  return data?.id ? data : (data?.data ?? data)
}

/**
 * @param {unknown} data
 * @returns {object[]}
 */
export function listaTabDesdeRespuesta(data) {
  return Array.isArray(data) ? data : []
}

/**
 * @param {number|null|undefined} n
 * @returns {string}
 */
export function formatNumero(n) {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-CR').format(n)
}

/**
 * @param {{ nombreComercial?: string, nombreEmpresa?: string }} emp
 * @returns {string}
 */
export function nombreVisibleEmpresa(emp) {
  return emp.nombreComercial || emp.nombreEmpresa
}

/**
 * @param {object[]} empresas
 * @param {{ search: string, filtroEstado: string, filtroPlan: string }} filtros
 * @returns {object[]}
 */
export function filtrarEmpresas(empresas, { search, filtroEstado, filtroPlan }) {
  const q = search.toLowerCase()
  return empresas.filter((e) => {
    const matchQ = !q
      || e.nombreEmpresa?.toLowerCase().includes(q)
      || e.slug?.toLowerCase().includes(q)
      || e.correoEmpresa?.toLowerCase().includes(q)
    const matchE = filtroEstado === 'ALL' || e.estadoEmpresa === filtroEstado
    const matchP = filtroPlan === 'ALL' || e.plan === filtroPlan
    return matchQ && matchE && matchP
  })
}

/**
 * @param {object[]} empresas
 * @returns {{ total: number, activas: number, suspendidas: number, pro: number }}
 */
export function kpisEmpresas(empresas) {
  return {
    total: empresas.length,
    activas: empresas.filter((e) => e.estadoEmpresa === 'ACTIVO').length,
    suspendidas: empresas.filter((e) => e.estadoEmpresa === 'SUSPENDIDO').length,
    pro: empresas.filter((e) => PLANES_PRO.has(e.plan)).length,
  }
}

/**
 * @param {object|null} detail
 * @returns {{ id: string, label: string }[]}
 */
export function tabsDetalle(detail) {
  const n = (v) => (detail ? ` (${v ?? 0})` : '')
  return [
    { id: 'resumen', label: 'Resumen' },
    { id: 'productos', label: `Productos${n(detail?.totalProductos)}` },
    { id: 'pedidos', label: `Pedidos${n(detail?.totalPedidos)}` },
    { id: 'equipo', label: `Equipo${n(detail?.totalUsuarios)}` },
  ]
}

/**
 * @param {number} page
 * @param {number} totalPages
 * @param {number} [maxVisible]
 * @returns {number[]}
 */
export function indicesPagina(page, totalPages, maxVisible = 7) {
  return Array.from({ length: Math.min(totalPages, maxVisible) }, (_, i) => {
    if (totalPages <= maxVisible) return i
    return Math.max(0, Math.min(page - 3, totalPages - maxVisible)) + i
  })
}
