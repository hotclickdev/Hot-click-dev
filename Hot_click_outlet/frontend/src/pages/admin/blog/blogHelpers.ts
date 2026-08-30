import type { Id } from '@/types/api'

export const EMPTY_BLOG_FORM = { titulo: '', resumen: '', contenido: '', imagenUrl: '', publicado: false }

export type BlogForm = {
  id?: Id
  titulo?: string
  resumen?: string
  contenido?: string
  imagenUrl?: string
  publicado?: boolean
  fechaPublicacion?: string
  fechaCreacion?: string
}

export type ProductoSugerido = {
  id?: Id
  nombre?: string
  ingreso?: number
  imagenUrl?: string
}

type ProductoAcumulado = {
  id: Id
  nombre: string
  ingreso: number
  imagenUrl: string
}

const MS_DIA = 86_400_000
const DIAS_TOP_PRODUCTO = 30
const ESTADOS_VENTA = new Set(['COMPLETADO', 'ENTREGADO', 'PAGADO'])

export function postSugeridoDeVentas(ventas: unknown[]): ProductoSugerido | null {
  const corte = Date.now() - DIAS_TOP_PRODUCTO * MS_DIA
  const map: Record<string, ProductoAcumulado> = {}
  ventas.forEach((v) => {
    if (!v || typeof v !== 'object') return
    const venta = v as { estado?: string; fechaCreacion?: string; items?: unknown[] }
    if (!ESTADOS_VENTA.has(venta.estado ?? '')) return
    if (new Date(venta.fechaCreacion ?? 0).getTime() < corte) return
    acumularItemsPost(map, venta.items ?? [])
  })
  return Object.values(map).sort((a, b) => b.ingreso - a.ingreso)[0] ?? null
}

function acumularItemsPost(map: Record<string, ProductoAcumulado>, items: unknown[]) {
  items.forEach((item) => {
    if (!item || typeof item !== 'object') return
    const row = item as {
      producto?: { id?: Id; nombreProducto?: string; imagenPrincipalUrl?: string }
      productoId?: Id
      nombreProducto?: string
      imagenUrl?: string
      subtotalItem?: number
      cantidad?: number
      precioUnitarioMomento?: number
    }
    const id = row.producto?.id ?? row.productoId
    if (!id) return
    const nombre = row.producto?.nombreProducto ?? row.nombreProducto ?? `#${id}`
    const actual = map[String(id)] ?? {
      id,
      nombre,
      ingreso: 0,
      imagenUrl: row.producto?.imagenPrincipalUrl ?? row.imagenUrl ?? '',
    }
    actual.ingreso += row.subtotalItem ?? ((row.cantidad ?? 1) * (row.precioUnitarioMomento ?? 0))
    map[String(id)] = actual
  })
}

export function formPostSugerido(producto: ProductoSugerido): BlogForm {
  return {
    titulo: `${producto.nombre}: lo más pedido este mes`,
    resumen: `${producto.nombre} es lo que más te están pidiendo. Publicá para que más gente lo vea.`,
    contenido: `${producto.nombre} está entre lo más pedido de tu negocio este mes. Disponible en tu tienda HotClick.`,
    imagenUrl: producto.imagenUrl ?? '',
    publicado: false,
  }
}

export function fmtDate(d: string | null | undefined) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('es-CR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function listaBlogDesdeRespuesta(data: unknown): BlogForm[] {
  const envelope = data as { data?: BlogForm[] } | null | undefined
  return envelope?.data ?? []
}

export function ventasDesdeRespuesta(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  const content = (data as { content?: unknown[] } | null | undefined)?.content
  return content ?? []
}
