import type { CategoriaProducto, EstadoProducto } from './mock'

/** Ítem de listado Mis Productos (Emp + Seller). */
export type ProductoListaItem = {
  id: string
  nombre: string
  categoria: CategoriaProducto
  precio: number
  estado: EstadoProducto
  reciente: boolean
  imagenUrl?: string
  esPersonalizado?: boolean
  modoPrecioPersonalizado?: string
  precioPersonalizadoMin?: number
  precioPersonalizadoMax?: number
}

export type FiltroProductos = 'Todos' | 'Recién agregados' | CategoriaProducto

export const FILTROS_PRODUCTOS = ['Todos', 'Recién agregados', 'Tecnología', 'Ropa'] as const

export type GrupoProductos = {
  titulo: string
  items: ProductoListaItem[]
}

export function filtrarProductos(
  productos: ProductoListaItem[],
  filtro: string,
): ProductoListaItem[] {
  if (filtro === 'Todos') return productos
  if (filtro === 'Recién agregados') return productos.filter((p) => p.reciente)
  return productos.filter((p) => p.categoria === filtro)
}

export function gruposProductosVisibles(
  productos: ProductoListaItem[],
  filtro: string,
): GrupoProductos[] {
  if (filtro !== 'Todos') return [{ titulo: filtro, items: productos }]
  return [
    { titulo: 'Recién agregados', items: productos.filter((p) => p.reciente) },
    {
      titulo: 'Tecnología',
      items: productos.filter((p) => p.categoria === 'Tecnología' && !p.reciente),
    },
    {
      titulo: 'Ropa',
      items: productos.filter((p) => p.categoria === 'Ropa' && !p.reciente),
    },
  ].filter((grupo) => grupo.items.length > 0)
}

export function aProductoListaItem(p: {
  id: string
  nombre: string
  categoria: CategoriaProducto
  precio: number
  estado: EstadoProducto
  reciente?: boolean
  recienAgregado?: boolean
  imagenUrl?: string
  esPersonalizado?: boolean
  modoPrecioPersonalizado?: string
  precioPersonalizadoMin?: number
  precioPersonalizadoMax?: number
}): ProductoListaItem {
  return {
    id: p.id,
    nombre: p.nombre,
    categoria: p.categoria,
    precio: p.precio,
    estado: p.estado,
    reciente: p.reciente ?? p.recienAgregado === true,
    imagenUrl: p.imagenUrl,
    esPersonalizado: p.esPersonalizado,
    modoPrecioPersonalizado: p.modoPrecioPersonalizado,
    precioPersonalizadoMin: p.precioPersonalizadoMin,
    precioPersonalizadoMax: p.precioPersonalizadoMax,
  }
}
