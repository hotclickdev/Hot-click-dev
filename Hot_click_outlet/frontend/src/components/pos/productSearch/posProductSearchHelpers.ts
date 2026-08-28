import type { Id } from '@/types/api'
import type { Producto } from '@/types/producto'

export const fmt = (n: number | null | undefined) => new Intl.NumberFormat('es-CR').format(n ?? 0)

export const CAT_COLORS = [
  { bg: 'rgba(23,71,168,0.15)',  border: 'rgba(23,71,168,0.35)',  text: '#7aa3ff' },
  { bg: 'rgba(52,211,153,0.15)', border: 'rgba(52,211,153,0.35)', text: '#34d399' },
  { bg: 'rgba(251,191,36,0.15)', border: 'rgba(251,191,36,0.35)', text: '#fbbf24' },
  { bg: 'rgba(239,68,68,0.15)',  border: 'rgba(239,68,68,0.35)',  text: '#f87171' },
  { bg: 'rgba(100,144,234,0.15)', border: 'rgba(100,144,234,0.35)', text: 'var(--hc-blue-400)' },
  { bg: 'rgba(229,169,61,0.15)', border: 'rgba(229,169,61,0.35)', text: '#E5A93D' },
  { bg: 'rgba(20,184,166,0.15)', border: 'rgba(20,184,166,0.35)', text: '#14b8a6' },
  { bg: 'rgba(236,72,153,0.15)', border: 'rgba(236,72,153,0.35)', text: '#ec4899' },
]

export type CategoriaPos = {
  id: Id
  nombreCategoria?: string
}

/** Producto en grilla POS: canónico más campos crudos del endpoint POS. */
export type ProductoPos = Producto & {
  idProducto?: Id
  precioEfectivo?: number
  stockMinimo?: number
}

export function CatColor(idx: number) { return CAT_COLORS[idx % CAT_COLORS.length] }

/** Lista de un GET que puede venir cruda o envuelta en ResponseDTO. */
export function listaDesdeRespuesta<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') {
    const obj = data as { data?: unknown; content?: unknown }
    if (Array.isArray(obj.data)) return obj.data as T[]
    if (Array.isArray(obj.content)) return obj.content as T[]
  }
  return []
}
