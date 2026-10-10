import type { DataProvider } from '@refinedev/core'
import api from '@/services/api'
import { formatPrice } from '@/utils/format'

/** Recursos del CRM sobre `/api/admin/crm/**` (solo ADMIN en el backend). */
export const RECURSOS_CRM = ['compras', 'compradores', 'negocios'] as const

export type LineaCompra = {
  productoId: number | null
  nombre: string | null
  descripcion: string | null
  imagenUrl: string | null
  cantidad: number | null
  precioUnitario: number | null
  subtotal: number | null
}

export type Compra = {
  id: number
  numeroPedido: string | null
  fecha: string | null
  estado: string | null
  origen: string | null
  metodoPago: string | null
  total: number | null
  comprador?: { id: number; nombre: string | null }
  negocio?: { id: number; nombre: string | null; logoUrl: string | null }
  lineas: LineaCompra[]
}

export type PaginaCompras = {
  content: Compra[]
  page: number
  size: number
  totalElements: number
  totalPages: number
}

export type Resumen = {
  pedidos: number
  pedidosPagados: number
  totalPagado: number | null
  primeraCompra: string | null
  ultimaCompra: string | null
  compradoresDistintos?: number
}

export type FichaComprador = {
  id: number
  nombre: string | null
  correo: string | null
  telefono: string | null
  fechaRegistro: string | null
  resumen: Resumen
  compras: PaginaCompras
}

export type FichaNegocio = {
  id: number
  nombre: string | null
  slug: string | null
  logoUrl: string | null
  estado: string | null
  plan: string | null
  fechaRegistro: string | null
  productosActivos: number | null
  resumen: Resumen
  compras: PaginaCompras
}

function soloLectura(): never {
  throw new Error('El CRM es de solo lectura')
}

function paginaVacia(): PaginaCompras {
  return { content: [], page: 0, size: 0, totalElements: 0, totalPages: 0 }
}

/** Data provider de Refine sobre nuestra API (axios con JWT y refresh). Sin escrituras. */
export const crmDataProvider: DataProvider = {
  getApiUrl: () => '/api/admin/crm',
  getList: async ({ resource, pagination, filters }) => {
    if (resource !== 'compras') soloLectura()
    const params: Record<string, unknown> = {
      page: Math.max(0, (pagination?.currentPage ?? 1) - 1),
      size: pagination?.pageSize ?? 20,
    }
    for (const f of filters ?? []) {
      if ('field' in f && (f.field === 'empresaId' || f.field === 'compradorId') && f.value != null) {
        params[f.field] = f.value
      }
    }
    const r = await api.get('/admin/crm/compras', { params })
    const pagina = (r.data as PaginaCompras | undefined) ?? paginaVacia()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { data: (pagina.content ?? []) as any, total: pagina.totalElements ?? 0 }
  },
  getOne: async ({ resource, id, meta }) => {
    if (resource !== 'compradores' && resource !== 'negocios') soloLectura()
    const r = await api.get(`/admin/crm/${resource}/${encodeURIComponent(String(id))}`, {
      params: { page: Math.max(0, Number(meta?.page ?? 0)), size: 10 },
    })
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return { data: r.data as any }
  },
  create: soloLectura,
  update: soloLectura,
  deleteOne: soloLectura,
}

/** Sin dato → «—». Nunca un 0 o un monto inventado. */
export const GUION = '—'

export function montoOGuion(valor: number | null | undefined): string {
  return typeof valor === 'number' && Number.isFinite(valor) ? formatPrice(valor) : GUION
}

export function numeroOGuion(valor: number | null | undefined): string {
  return typeof valor === 'number' && Number.isFinite(valor) ? String(valor) : GUION
}

export function textoOGuion(valor: string | null | undefined): string {
  return typeof valor === 'string' && valor.trim() ? valor : GUION
}

export function fechaOGuion(valor: string | null | undefined): string {
  if (!valor) return GUION
  const d = new Date(valor)
  if (Number.isNaN(d.getTime())) return GUION
  return d.toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}

const ESTADOS_OK = new Set(['PAGADO', 'CONFIRMADO', 'ENTREGADO', 'COMPLETADO', 'ENVIADO', 'LISTO_RETIRO', 'PREPARANDO', 'EN_PREPARACION'])
const ESTADOS_ALERTA = new Set(['CANCELADO', 'RECHAZADO', 'PAGO_FALLIDO', 'DEVUELTO'])

export function tonoEstado(estado: string | null | undefined): 'ok' | 'alerta' | 'neutro' {
  if (!estado) return 'neutro'
  if (ESTADOS_OK.has(estado)) return 'ok'
  if (ESTADOS_ALERTA.has(estado)) return 'alerta'
  return 'neutro'
}

export function etiquetaEstado(estado: string | null | undefined): string {
  if (!estado) return GUION
  const t = estado.replaceAll('_', ' ').toLowerCase()
  return t.charAt(0).toUpperCase() + t.slice(1)
}
