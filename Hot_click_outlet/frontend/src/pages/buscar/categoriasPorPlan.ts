import type { CategoriaConProductos } from '@/services/categoriaCatalogoService'
import type { AliasPlan } from '@/components/comprador/negocios/negociosPublicos'

/** Tope de `GET /api/public/negocios` (`DirectorioNegociosService.LIMITE_MAXIMO`). */
export const LIMITE_DIRECTORIO_PLAN = 200

/** El listado público recorta la página a 50 (`ProductoCatalogHandler.MAX_PAGE_SIZE_PUBLIC`). */
export const TAMANO_PAGINA_PUBLICA = 50

export const TOPE_PAGINAS_CATALOGO = 10

/** Producto del catálogo público, reducido a lo que hace falta para contar por plan. */
export type ProductoDePlan = {
  categoriaId: number
  empresaSlug: string
}

/** Chip de /categorias. Todos no lleva query; el alias es el que acepta `?plan=` del directorio. */
export function rutaCategoriasPlan(alias: AliasPlan | null): string {
  return alias ? `/categorias?plan=${alias}` : '/categorias'
}

export function productoDePlan(valor: unknown): ProductoDePlan | null {
  if (!valor || typeof valor !== 'object') return null
  const fila = valor as { categoriaId?: unknown; empresaSlug?: unknown }
  const slug = typeof fila.empresaSlug === 'string' ? fila.empresaSlug.trim() : ''
  const categoriaId = idCategoria(fila.categoriaId)
  if (!slug || categoriaId == null) return null
  return { categoriaId, empresaSlug: slug }
}

export function metaPagina(data: unknown): { items: unknown[]; totalPages: number } {
  if (Array.isArray(data)) return { items: data, totalPages: 1 }
  if (!data || typeof data !== 'object') return { items: [], totalPages: 1 }
  const pagina = data as { content?: unknown; totalPages?: unknown }
  const items = Array.isArray(pagina.content) ? pagina.content : []
  const total = typeof pagina.totalPages === 'number' && pagina.totalPages > 0 ? pagina.totalPages : 1
  return { items, totalPages: total }
}

/**
 * Categorías del catálogo que tienen productos de las tiendas del plan.
 * El conteo reemplaza al global; en cero no se muestran.
 */
export function categoriasDelPlan(
  categorias: CategoriaConProductos[],
  productos: ProductoDePlan[],
  slugs: ReadonlySet<string>,
): CategoriaConProductos[] {
  if (slugs.size === 0) return []
  const conteo = new Map<number, number>()
  for (const producto of productos) {
    if (!slugs.has(producto.empresaSlug)) continue
    conteo.set(producto.categoriaId, (conteo.get(producto.categoriaId) ?? 0) + 1)
  }
  return categorias
    .map((categoria) => ({ ...categoria, cantidad: conteo.get(categoria.id) ?? 0 }))
    .filter((categoria) => categoria.cantidad > 0)
    .sort((a, b) => b.cantidad - a.cantidad || a.nombre.localeCompare(b.nombre, 'es'))
}

function idCategoria(valor: unknown): number | null {
  if (typeof valor === 'number' && Number.isInteger(valor) && valor > 0) return valor
  if (typeof valor === 'string' && /^\d+$/.test(valor)) return Number(valor)
  return null
}
