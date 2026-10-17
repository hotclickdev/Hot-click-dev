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

/** Chips de filtro: Todos, Recién agregados y las categorías reales del catálogo. */
export function filtrosProductos(productos: ProductoListaItem[]): string[] {
  return ['Todos', 'Recién agregados', ...categoriasEnOrden(productos.filter((p) => !p.esPersonalizado))]
}

function categoriasEnOrden(productos: ProductoListaItem[]): string[] {
  return [...new Set(productos.map((p) => p.categoria))]
}

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

/** En Todos, personalizados y el resto de categorías salen en su grupo. Nada queda fuera. */
export function gruposProductosVisibles(
  productos: ProductoListaItem[],
  filtro: string,
): GrupoProductos[] {
  if (filtro !== 'Todos') return [{ titulo: filtro, items: productos }]
  const personalizados = productos.filter((p) => p.esPersonalizado)
  const catalogo = productos.filter((p) => !p.esPersonalizado)
  const grupos: GrupoProductos[] = [
    { titulo: 'Personalizados', items: personalizados },
    { titulo: 'Recién agregados', items: catalogo.filter((p) => p.reciente) },
    ...categoriasEnOrden(catalogo).map((cat) => ({
      titulo: cat,
      items: catalogo.filter((p) => p.categoria === cat && !p.reciente),
    })),
  ]
  return grupos.filter((grupo) => grupo.items.length > 0)
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
