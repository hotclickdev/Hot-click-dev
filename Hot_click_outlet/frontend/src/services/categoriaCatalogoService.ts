import api from './api'

export interface CategoriaConProductos {
  id: number
  nombre: string
  cantidad: number
  fotoUrl: string | null
}

function esCategoriaConProductos(valor: unknown): valor is CategoriaConProductos {
  if (!valor || typeof valor !== 'object') return false
  const fila = valor as Record<string, unknown>
  return typeof fila.id === 'number' && typeof fila.nombre === 'string' && typeof fila.cantidad === 'number'
}

export function leerCategoriasConProductos(data: unknown): CategoriaConProductos[] {
  if (!Array.isArray(data)) return []
  return data.filter(esCategoriaConProductos).map((fila) => ({ ...fila, fotoUrl: fila.fotoUrl ?? null }))
}

/** Categorías con productos visibles en el catálogo público, de la más poblada a la menos. */
export const categoriaCatalogoService = {
  conProductos: () =>
    api.get('/categorias/publicas/con-productos').then((r) => leerCategoriasConProductos(r.data)),
}
