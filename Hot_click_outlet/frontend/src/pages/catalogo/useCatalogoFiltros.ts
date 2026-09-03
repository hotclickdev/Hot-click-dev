import { useState, useEffect, useCallback } from 'react'
import type { SetURLSearchParams } from 'react-router-dom'
import { hasGustos } from '@/utils/gustos'
import { useGustosPerfil } from '@/hooks/useGustosPerfil'
import {
  parsePageFromSearchParams,
  parseCategoryFromSearchParams,
  parseMarcasFilterFromSearchParams,
  catalogoSearchParamsFromState,
} from './catalogoFiltros'

function mismosIds(actual: Set<string>, siguiente: Set<string>): boolean {
  if (actual.size !== siguiente.size) return false
  for (const id of actual) {
    if (!siguiente.has(id)) return false
  }
  return true
}

/**
 * Estado de filtros del catálogo y sync URL ↔ filtros.
 */
export function useCatalogoFiltros(searchParams: URLSearchParams, setSearchParams: SetURLSearchParams) {
  const [page, setPage] = useState(() => parsePageFromSearchParams(searchParams))
  const [search, setSearch] = useState(() => searchParams.get('search') ?? '')
  const [category, setCategory] = useState(() => parseCategoryFromSearchParams(searchParams))
  const [marcasFilter, setMarcasFilter] = useState(() => parseMarcasFilterFromSearchParams(searchParams))
  const [sort, setSort] = useState(
    () => searchParams.get('sort') ?? localStorage.getItem('hc-products-sort') ?? 'default',
  )
  const { perfil: gustosPerfilHook, loading: gustosLoading } = useGustosPerfil(sort === 'para_vos')
  const gustosPerfil = sort === 'para_vos' ? gustosPerfilHook : null
  const gustosScores = gustosPerfil?.scores ?? null
  const tieneGustos = sort === 'para_vos' && !gustosLoading && hasGustos(gustosPerfil ?? undefined)
  const [filterStock, setFilterStock] = useState('ok')
  const [filterCond, setFilterCond] = useState('')
  const [filterTalla, setFilterTalla] = useState('')
  const [priceMin, setPriceMin] = useState('')
  const [priceMax, setPriceMax] = useState('')
  const [filterViewPage, setFilterViewPage] = useState(0)
  const query = searchParams.toString()

  useEffect(() => {
    const params = new URLSearchParams(query)
    const catUrl = parseCategoryFromSearchParams(params)
    const searchUrl = params.get('search') ?? ''
    const pageUrl = parsePageFromSearchParams(params)
    const marcasUrl = parseMarcasFilterFromSearchParams(params)
    // eslint-disable-next-line react-hooks/set-state-in-effect -- click del menú cambia la URL sin remount
    setCategory((prev) => (prev === catUrl ? prev : catUrl))
    setSearch((prev) => (prev === searchUrl ? prev : searchUrl))
    setPage((prev) => (prev === pageUrl ? prev : pageUrl))
    setMarcasFilter((prev) => (mismosIds(prev, marcasUrl) ? prev : marcasUrl))
  }, [query])

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

  const toggleMarca = useCallback((id: string) => {
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
    gustosPerfil,
    tieneGustos,
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
