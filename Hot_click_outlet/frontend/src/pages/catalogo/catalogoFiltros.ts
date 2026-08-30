import type { Producto } from '@/types/producto'



export const PAGE_SIZE = 24



export type FiltroOption = { value: string; labelKey: string }



export const SORT_OPTIONS: FiltroOption[] = [

  { value: 'default',    labelKey: 'products.sortRelevance' },

  { value: 'para_vos',   labelKey: 'products.sortForYou' },

  { value: 'featured',   labelKey: 'products.featured' },

  { value: 'price_asc',  labelKey: 'products.sortPriceAsc' },

  { value: 'price_desc', labelKey: 'products.sortPriceDesc' },

  { value: 'name',       labelKey: 'products.nameAsc' },

]



export const STOCK_OPTIONS: FiltroOption[] = [

  { value: '',    labelKey: 'products.all' },

  { value: 'ok',  labelKey: 'products.inStock' },

  { value: 'low', labelKey: 'products.lowStockLabel' },

  { value: 'out', labelKey: 'products.outOfStock' },

]



export const COND_OPTIONS: FiltroOption[] = [

  { value: '',           labelKey: 'products.allConditions' },

  { value: 'NUEVO',      labelKey: 'products.condNuevo' },

  { value: 'COMO_NUEVO', labelKey: 'products.condComoNuevo' },

  { value: 'USADO',      labelKey: 'products.condUsado' },

]



type CategoryScopeInput = string | number | boolean | null | undefined



type FiltrarCatalogoArgs = {

  products: Producto[]

  viewMode: string

  convenioMarcaNames: Set<string>

  search: string

  categoryScope: Set<string> | null

  marcasFilter: Set<string>

  filterStock: string

  filterCond: string

  filterTalla: string

  minPrice: number | null

  maxPrice: number | null

}



/**

 * IDs de la categoría seleccionada y todos sus descendientes (BFS).

 */

export function categoryScopeIds(

  category: CategoryScopeInput,

  categories: { id?: unknown; padreId?: unknown }[],

): Set<string> | null {

  if (!category) return null

  const ids = new Set([String(category)])

  const queue = [String(category)]

  while (queue.length > 0) {

    const pid = queue.shift()

    categories

      .filter(c => String(c.padreId ?? '') === pid)

      .forEach(c => { ids.add(String(c.id)); queue.push(String(c.id)) })

  }

  return ids

}



/**

 * Aplica los filtros del catálogo (sin ordenar).

 */

export function filtrarCatalogo({

  products, viewMode, convenioMarcaNames, search, categoryScope,

  marcasFilter, filterStock, filterCond, filterTalla, minPrice, maxPrice,

}: FiltrarCatalogoArgs): Producto[] {

  return products

    .filter(p => viewMode !== 'ofertas' || p.enOferta)

    .filter(p => viewMode !== 'emprendimientos' || convenioMarcaNames.has(p.marcaNombre?.toLowerCase()))

    .filter(p => !search || p.nombre?.toLowerCase().includes(search.toLowerCase()) || p.marcaNombre?.toLowerCase().includes(search.toLowerCase()))

    .filter(p => !categoryScope || categoryScope.has(String(p.categoriaId)))

    .filter(p => marcasFilter.size === 0 || marcasFilter.has(String(p.marcaId)))

    .filter(p => {

      if (filterStock === 'ok')  return p.stock > 3

      if (filterStock === 'low') return p.stock > 0 && p.stock <= 3

      if (filterStock === 'out') return p.stock === 0

      return true

    })

    .filter(p => !filterCond  || p.condicion === filterCond)

    .filter(p => !filterTalla || p.talla    === filterTalla)

    .filter(p => (minPrice === null || p.precio >= minPrice) && (maxPrice === null || p.precio <= maxPrice))

}



/**

 * Ordena la lista filtrada. `affinityOf` se inyecta para no acoplar gustos aquí.

 */

export function sortCatalogo(

  lista: Producto[],

  sort: string,

  gustosScores: Map<string, number> | null,

  affinityOf: (producto: Producto, scores: Map<string, number>) => number,

): Producto[] {

  return lista.sort((a, b) => {

    if (sort === 'para_vos' && gustosScores)

      return affinityOf(b, gustosScores) - affinityOf(a, gustosScores)

    if (sort === 'featured')   return (b.destacado ? 1 : 0) - (a.destacado ? 1 : 0)

    if (sort === 'price_asc')  return a.precio - b.precio

    if (sort === 'price_desc') return b.precio - a.precio

    if (sort === 'name')       return a.nombre?.localeCompare(b.nombre)

    return 0

  })

}



/** `cat` es el param canónico; `categoria` queda como alias del menú / chips viejos. */
export function parseCategoryFromSearchParams(searchParams: URLSearchParams): string {
  return searchParams.get('cat') ?? searchParams.get('categoria') ?? ''
}

export function parsePageFromSearchParams(searchParams: URLSearchParams): number {

  const p = Number.parseInt(searchParams.get('page') ?? '0', 10)

  return Number.isNaN(p) || p < 0 ? 0 : p

}



export function parseMarcasFilterFromSearchParams(searchParams: URLSearchParams): Set<string> {

  const raw = searchParams.get('marcas') ?? searchParams.get('marcaId') ?? ''

  return new Set(raw ? raw.split(',').filter(Boolean) : [])

}



export function catalogoSearchParamsFromState({

  search, category, marcasFilter, page, sort,

}: {

  search: string

  category: string

  marcasFilter: Set<string>

  page: number

  sort: string

}): Record<string, string> {

  const params: Record<string, string> = {}

  if (search) params.search = search

  if (category) params.cat = category

  if (marcasFilter.size) params.marcas = [...marcasFilter].join(',')

  if (page > 0) params.page = String(page)

  if (sort && sort !== 'default') params.sort = sort

  return params

}

