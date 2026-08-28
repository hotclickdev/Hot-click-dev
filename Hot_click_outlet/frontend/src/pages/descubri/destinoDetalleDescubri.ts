import type { Producto } from '@/types/producto'

export type DirSwipeDescubri = 'like' | 'skip'

export type CartaEspecialDescubri = {
  _tipo: 'info' | 'empresa'
  id: string
  slug?: string | null
  nombre?: string | null
  variante?: string
}

export type CartaProductoDescubri = Producto & {
  _tipo?: undefined
  _base?: number
}

export type CartaDescubri = CartaEspecialDescubri | CartaProductoDescubri

export type DescubriDeckApi = {
  status: string
  remaining: CartaDescubri[]
  liked: CartaProductoDescubri[]
  total: number
  seen: number
  canUndo: boolean
  swipe: (dir: DirSwipeDescubri) => void
  undo: () => void
  restart: () => void
}

/**
 * Detalle de Descubrí: producto o empresa → PDP en HotClick, no un sitio ajeno.
 */
export function destinoDetalleDescubri(top: CartaDescubri | undefined, remaining: CartaDescubri[] = []) {
  if (!top) return '/productos'
  if (top._tipo === 'info') return '/nosotros'
  if (top._tipo === 'empresa') {
    const producto = remaining.find((p) => !p._tipo && p.empresaSlug === top.slug)
    return producto ? `/productos/${producto.id}` : '/productos'
  }
  return `/productos/${top.id}`
}
