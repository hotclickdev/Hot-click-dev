export const PAGE_SIZE = 24

export const SORT_OPTIONS = [
  { value: 'default',    label: 'Relevancia' },
  { value: 'para_vos',   label: 'Según tus gustos' },
  { value: 'featured',   label: 'Destacados' },
  { value: 'price_asc',  label: 'Menor precio' },
  { value: 'price_desc', label: 'Mayor precio' },
  { value: 'name',       label: 'A–Z' },
]

export const STOCK_OPTIONS = [
  { value: '',    label: 'Todos' },
  { value: 'ok',  label: 'En stock' },
  { value: 'low', label: 'Bajo stock' },
  { value: 'out', label: 'Agotado' },
]

export const COND_OPTIONS = [
  { value: '',          label: 'Todas' },
  { value: 'NUEVO',     label: 'Nuevo' },
  { value: 'COMO_NUEVO', label: 'Como nuevo' },
  { value: 'USADO',     label: 'Usado' },
]

/**
 * IDs de la categoría seleccionada y todos sus descendientes (BFS).
 * @param {string|number} category
 * @param {Array<{id: unknown, padreId?: unknown}>} categories
 * @returns {Set<string>|null}
 */
export function categoryScopeIds(category, categories) {
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
 * @param {object} args
 * @param {Array} args.products
 * @param {string} args.viewMode
 * @param {Set<string>} args.convenioMarcaNames
 * @param {string} args.search
 * @param {Set<string>|null} args.categoryScope
 * @param {Set<string>} args.marcasFilter
 * @param {string} args.filterStock
 * @param {string} args.filterCond
 * @param {string} args.filterTalla
 * @param {number|null} args.minPrice
 * @param {number|null} args.maxPrice
 * @returns {Array}
 */
export function filtrarCatalogo({
  products, viewMode, convenioMarcaNames, search, categoryScope,
  marcasFilter, filterStock, filterCond, filterTalla, minPrice, maxPrice,
}) {
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
 * @param {Array} lista
 * @param {string} sort
 * @param {object|null} gustosScores
 * @param {(producto: object, scores: object) => number} affinityOf
 * @returns {Array}
 */
export function sortCatalogo(lista, sort, gustosScores, affinityOf) {
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
