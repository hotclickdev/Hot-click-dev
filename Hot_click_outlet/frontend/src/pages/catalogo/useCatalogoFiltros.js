import { useState, useEffect, useCallback, useMemo } from 'react'
import { loadGustos } from '@/utils/gustos'
import {
  parsePageFromSearchParams,
  parseMarcasFilterFromSearchParams,
  catalogoSearchParamsFromState,
} from './catalogoFiltros'

/**
 * Estado de filtros del catálogo y sync URL ↔ filtros.
 */
export function useCatalogoFiltros(searchParams, setSearchParams) {
  const [page, setPage] = useState(() => parsePageFromSearchParams(searchParams))
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [category, setCategory] = useState(() => searchParams.get('cat') ?? '')
  const [marcasFilter, setMarcasFilter] = useState(() => parseMarcasFilterFromSearchParams(searchParams))
  const [sort, setSort] = useState(
    () => searchParams.get('sort') ?? localStorage.getItem('hc-products-sort') ?? 'default',
  )
  const gustosScores = useMemo(
    () => (sort === 'para_vos' ? loadGustos().scores : null),
    [sort],
  )
  const [filterStock, setFilterStock] = useState('')
  const [filterCond, setFilterCond] = useState('')
  const [filterTalla, setFilterTalla] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [filterViewPage, setFilterViewPage] = useState(0)

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- nueva búsqueda arranca en página 0
    setFilterViewPage(0)
  }, [search, category, marcasFilter, filterStock, filterCond, filterTalla, priceMin, priceMax, sort])

  useEffect(() => {
    setSearchParams(
      catalogoSearchParamsFromState({ search, category, marcasFilter, page, sort }),
      { replace: true },
    )
  }, [search, category, marcasFilter, page, sort, setSearchParams])

  const toggleMarca = useCallback((id) => {
    setMarcasFilter((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const clearMarcas = useCallback(() => setMarcasFilter(new Set()), [])

  const clearFilters = useCallback(() => {
    setCategory('')
    clearMarcas()
    setFilterStock('')
    setFilterCond('')
    setFilterTalla('')
    setSearch('')
    setPriceMin('')
    setPriceMax('')
  }, [clearMarcas])

  return {
    page,
    setPage,
    search,
    setSearch,
    category,
    setCategory,
    marcasFilter,
    sort,
    setSort,
    gustosScores,
    filterStock,
    setFilterStock,
    filterCond,
    setFilterCond,
    filterTalla,
    setFilterTalla,
    priceMin,
    setPriceMin,
    priceMax,
    setPriceMax,
    filterViewPage,
    setFilterViewPage,
    toggleMarca,
    clearMarcas,
    clearFilters,
  }
}
