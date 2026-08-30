import type { Id } from '@/types/api'

export type EmpresaLista = {
  id: Id
  nombreEmpresa?: string
  nombreComercial?: string
  correoEmpresa?: string
  telefonoEmpresa?: string
  slug?: string
  plan?: string
  planSaas?: string
  estadoEmpresa?: string
  visibilidadPublica?: boolean
  fechaRegistro?: string
  fechaAprobacion?: string
  logoUrl?: string | null
}

export type EmpresaDetalle = EmpresaLista & {
  totalUsuarios?: number
  totalProductos?: number
  totalPedidos?: number
  totalVentas?: number
}

export type EmpresaProductoTab = {
  id: Id
  nombre?: string
  precio?: number
  stock: number
  imagenUrl?: string | null
  visibleCatalogo?: boolean
  categoria?: string | null
}

export type EmpresaPedidoTab = {
  id: Id
  fecha?: string
  total?: number
  estado?: string
  cliente?: string
  metodoPago?: string
}

export type EmpresaMiembroTab = {
  id: Id
  nombre: string
  correo?: string
  telefono?: string
  rol?: string
  fechaIngreso?: string
  estado?: number
}

export type FiltrosEmpresas = {
  search: string
  filtroEstado: string
  filtroPlan: string
}

export const PLANES = ['EMPRENDEDOR', 'PYME', 'NEGOCIO_PLUS']
export const ESTADOS = ['ACTIVO', 'SUSPENDIDO', 'INACTIVO']
export const PLANES_PRO = new Set(['PYME', 'NEGOCIO_PLUS'])

export const ESTADO_LABEL_USUARIO: Record<number, string> = { 1: 'Activo', 2: 'Inactivo', 3: 'Eliminado', 4: 'Suspendido' }
export const ESTADO_COLOR_USUARIO: Record<number, string> = {
  1: 'bg-green-500/15 text-green-400',
  2: 'bg-gray-500/15 text-gray-400',
  3: 'bg-red-500/15 text-red-400',
  4: 'bg-yellow-500/15 text-yellow-400',
}

export const ESTADO_PEDIDO_STYLE: Record<string, { bg: string; text: string }> = {
  PENDIENTE: { bg: 'rgba(212,177,6,0.15)', text: '#d4b106' },
  PAGADO: { bg: 'rgba(23,71,168,0.14)', text: 'var(--hc-accent)' },
  EN_PREPARACION: { bg: 'rgba(245,158,11,0.14)', text: '#f59e0b' },
  ENVIADO: { bg: 'rgba(96,165,250,0.14)', text: '#6490EA' },
  ENTREGADO: { bg: 'rgba(74,222,128,0.14)', text: '#4ade80' },
  COMPLETADO: { bg: 'rgba(63,108,222,0.14)', text: 'var(--hc-blue-400)' },
  CANCELADO: { bg: 'rgba(248,113,113,0.14)', text: '#f87171' },
}

export const ROL_CONFIG: Record<string, { label: string; color: string }> = {
  PROPIETARIO: { label: 'Propietario', color: 'bg-amber-500/15 text-amber-400' },
  ADMIN: { label: 'Admin', color: 'bg-[var(--hc-blue-500)]/15 text-[var(--hc-blue-400)]' },
  EDITOR: { label: 'Editor', color: 'bg-blue-500/15 text-blue-400' },
  LECTOR: { label: 'Lector', color: 'bg-gray-500/15 text-gray-400' },
}

export const PLAN_COLOR: Record<string, string> = {
  EMPRENDEDOR: 'bg-gray-500/15 text-gray-400',
  PYME: 'bg-[var(--hc-blue-500)]/15 text-[var(--hc-blue-400)]',
  NEGOCIO_PLUS: 'bg-amber-500/15 text-amber-400',
}

export const ESTADO_COLOR: Record<string, string> = {
  ACTIVO: 'bg-green-500/15 text-green-400',
  SUSPENDIDO: 'bg-red-500/15 text-red-400',
  INACTIVO: 'bg-gray-500/15 text-gray-400',
}

export const PAGE_SIZE = 10
export const COLUMNAS_TABLA = ['Empresa', 'Slug', 'Plan', 'Estado', 'Visible', 'Registro', 'Acciones']

export function listaEmpresasDesdeRespuesta(data: unknown): EmpresaLista[] {
  if (Array.isArray(data)) return data as EmpresaLista[]
  const inner = (data as { data?: EmpresaLista[] } | null)?.data
  return inner ?? []
}

export function detalleEmpresaDesdeRespuesta(data: unknown): EmpresaDetalle {
  const cuerpo = data as EmpresaDetalle & { data?: EmpresaDetalle }
  return cuerpo?.id ? cuerpo : (cuerpo?.data ?? cuerpo)
}

export function listaTabDesdeRespuesta(data: unknown): unknown[] {
  return Array.isArray(data) ? data : []
}

export function formatNumero(n?: number | null): string {
  if (n == null) return '—'
  return new Intl.NumberFormat('es-CR').format(n)
}

export function nombreVisibleEmpresa(emp: Pick<EmpresaLista, 'nombreComercial' | 'nombreEmpresa'>): string | undefined {
  return emp.nombreComercial || emp.nombreEmpresa
}

export function filtrarEmpresas(empresas: EmpresaLista[], { search, filtroEstado, filtroPlan }: FiltrosEmpresas): EmpresaLista[] {
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

export function kpisEmpresas(empresas: EmpresaLista[]): {
  total: number
  activas: number
  suspendidas: number
  pro: number
} {
  return {
    total: empresas.length,
    activas: empresas.filter((e) => e.estadoEmpresa === 'ACTIVO').length,
    suspendidas: empresas.filter((e) => e.estadoEmpresa === 'SUSPENDIDO').length,
    pro: empresas.filter((e) => PLANES_PRO.has(e.plan ?? '')).length,
  }
}

export function tabsDetalle(detail: EmpresaDetalle | null): { id: string; label: string }[] {
  const n = (v: number | undefined) => (detail ? ` (${v ?? 0})` : '')
  return [
    { id: 'resumen', label: 'Resumen' },
    { id: 'productos', label: `Productos${n(detail?.totalProductos)}` },
    { id: 'pedidos', label: `Pedidos${n(detail?.totalPedidos)}` },
    { id: 'equipo', label: `Equipo${n(detail?.totalUsuarios)}` },
  ]
}

export function indicesPagina(page: number, totalPages: number, maxVisible = 7): number[] {
  return Array.from({ length: Math.min(totalPages, maxVisible) }, (_, i) => {
    if (totalPages <= maxVisible) return i
    return Math.max(0, Math.min(page - 3, totalPages - maxVisible)) + i
  })
}
