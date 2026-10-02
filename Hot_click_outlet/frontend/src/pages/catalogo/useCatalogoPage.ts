import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import useChatStore from '@/store/chatStore'
import { useCatalogoFiltros } from './useCatalogoFiltros'
import { useCatalogoFetch } from './useCatalogoFetch'
import { useCatalogoDerived } from './useCatalogoDerived'
import { FILTROS_EXTRA_VACIOS, type FiltrosExtra } from './buscarExplorar'

/**
 * Estado, sync URL ↔ filtros, fetch y derivados del catálogo.
 */
export function useCatalogoPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()

  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    // abrir el chat desde la query (?ai=1); ?vista= ya no existe y cae en la vista normal
    if (searchParams.get('ai') === '1') {
      useChatStore.getState().open(searchParams.get('q') || null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [extras, setExtras] = useState<FiltrosExtra>(FILTROS_EXTRA_VACIOS)
  const [filtrosAbiertos, setFiltrosAbiertos] = useState(false)
  const filtros = useCatalogoFiltros(searchParams, setSearchParams)
  const data = useCatalogoFetch(toast, filtros.page, filtros.setPage, filtros.sort)
  const derived = useCatalogoDerived({ ...data, ...filtros, extras })
  const limpiarFiltrosBase = filtros.clearFilters
  const clearFilters = useCallback(() => {
    limpiarFiltrosBase()
    setExtras(FILTROS_EXTRA_VACIOS)
  }, [limpiarFiltrosBase])
  const { categories } = data
  const { setCategory } = filtros

  const selectCategoryFromAi = useCallback((nombre: string) => {
    const match = categories.find((c) =>
      (c.nombreCategoria ?? c.nombre ?? '').toLowerCase().includes(nombre.toLowerCase()),
    )
    if (match) {
      setCategory(String(match.id))
      useChatStore.getState().close()
    }
  }, [categories, setCategory])

  return {
    products: data.products,
    categories: data.categories,
    marcas: data.marcas,
    loading: data.loading,
    error: data.error,
    retry: data.retry,
    page: filtros.page,
    search: filtros.search,
    setSearch: filtros.setSearch,
    category: filtros.category,
    setCategory: filtros.setCategory,
    marcasFilter: filtros.marcasFilter,
    sort: filtros.sort,
    setSort: filtros.setSort,
    filterStock: filtros.filterStock,
    setFilterStock: filtros.setFilterStock,
    filterCond: filtros.filterCond,
    setFilterCond: filtros.setFilterCond,
    filterTalla: filtros.filterTalla,
    setFilterTalla: filtros.setFilterTalla,
    priceMin: filtros.priceMin,
    setPriceMin: filtros.setPriceMin,
    priceMax: filtros.priceMax,
    setPriceMax: filtros.setPriceMax,
    sidebarOpen,
    setSidebarOpen,
    filterViewPage: filtros.filterViewPage,
    setFilterViewPage: filtros.setFilterViewPage,
    toggleMarca: filtros.toggleMarca,
    clearMarcas: filtros.clearMarcas,
    clearFilters,
    extras,
    setExtras,
    filtrosAbiertos,
    setFiltrosAbiertos,
    filtered: derived.filtered,
    productCountByCat: derived.productCountByCat,
    categoryTotalCount: derived.categoryTotalCount,
    marcasCountInScope: derived.marcasCountInScope,
    marcasForCategoryScope: derived.marcasForCategoryScope,
    selectedParentNode: derived.selectedParentNode,
    hasFilters: derived.hasFilters,
    flatGrid: derived.flatGrid,
    showSubcatGrid: derived.showSubcatGrid,
    filteredPages: derived.filteredPages,
    filteredSlice: derived.filteredSlice,
    activeCatName: derived.activeCatName,
    gridAnimKey: derived.gridAnimKey,
    tieneGustos: filtros.tieneGustos,
    selectCategoryFromAi,
  }
}

export type CatalogoPageModel = ReturnType<typeof useCatalogoPage>
