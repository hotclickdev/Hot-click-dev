import type { Id } from '@/types/api'

export type ProductoMuestraCategoria = {
  id?: number | string
  categoriaId?: Id | ''
  /** Viene del producto: las categorías propias de un negocio no están en /categorias/publicas. */
  categoriaNombre?: string | null
  imagenUrl?: string
  nombre?: string | null
}

export type CategoriaBrowse = {
  id?: number | string
  idCategoria?: number | string
  nombreCategoria?: string
  nombre?: string
}

export type GrupoCategoria = {
  products: ProductoMuestraCategoria[]
  catId: string
  nombre: string
}

/** Agrupa productos por categoría; descarta las que no tienen nombre en vez de mostrar "Sin nombre". */
export function agruparPorCategoria(
  products: ProductoMuestraCategoria[],
  categories: CategoriaBrowse[],
  visibleCategoryIds: string[] | undefined,
  maxCategories: number,
): GrupoCategoria[] {
  const porId = new Map<string, ProductoMuestraCategoria[]>()
  for (const p of products) {
    const catId = String(p.categoriaId ?? '')
    if (!catId) continue
    const lista = porId.get(catId) ?? []
    lista.push(p)
    porId.set(catId, lista)
  }

  const fijadas = visibleCategoryIds && visibleCategoryIds.length > 0 ? new Set(visibleCategoryIds) : null
  return [...porId.entries()]
    .map(([catId, productos]) => {
      const cat = categories.find((c) => String(c.id ?? c.idCategoria) === catId)
      const nombreDelProducto = productos.find((p) => p.categoriaNombre)?.categoriaNombre
      const nombre = (cat?.nombreCategoria ?? cat?.nombre ?? nombreDelProducto ?? '').trim()
      return { catId, products: productos, nombre }
    })
    .filter((g) => g.nombre !== '' && (!fijadas || fijadas.has(g.catId)))
    .sort((a, b) => b.products.length - a.products.length)
    .slice(0, maxCategories)
}
