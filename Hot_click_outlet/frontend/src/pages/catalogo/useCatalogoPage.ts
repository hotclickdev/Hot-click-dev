import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useToast } from '@/components/ui/Toast'
import { useCatalogoFiltros } from './useCatalogoFiltros'
import { useCatalogoFetch } from './useCatalogoFetch'
import { useCatalogoDerived } from './useCatalogoDerived'
import type { Producto } from '@/types/producto'
import type { CatalogViewMode } from './catalogoTipos'

/**
 * Estado, sync URL ↔ filtros, fetch y derivados del catálogo.
 */
export function useCatalogoPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const toast = useToast()

  const [viewMode, setViewMode] = useState<CatalogViewMode>('all')
  const [quickView, setQuickView] = useState<Producto | null>(null)
  const [aiPanelOpen, setAiPanelOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const aiQuery = searchParams.get('q') || ''

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- abrir panel IA / tab desde query
    if (searchParams.get('ai') === '1') setAiPanelOpen(true)
    if (searchParams.get('vista') === 'emprendimientos') setViewMode('emprendimientos')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filtros = useCatalogoFiltros(searchParams, setSearchParams)
  const data = useCatalogoFetch(toast, filtros.page, filtros.setPage)
  const derived = useCatalogoDerived({ ...data, ...filtros, viewMode })
  const { categories } = data
  const { setCategory } = filtros

  const selectCategoryFromAi = useCallback((nombre: string) => {
    const match = categories.find((c) =>
      (c.nombreCategoria ?? c.nombre ?? '').toLowerCase().includes(nombre.toLowerCase()),
    )
    if (match) {
      setCategory(String(match.id))
      setAiPanelOpen(false)
    }
  }, [categories, setCategory])

  return {
    products: data.products,
    categories: data.categories,
    marcas: data.marcas,
    loading: data.loading,
    page: filtros.page,
    viewMode,
    setViewMode,
    convenios: data.convenios,
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
    quickView,
    setQuickView,
    aiPanelOpen,
    setAiPanelOpen,
    sidebarOpen,
    setSidebarOpen,
    filterViewPage: filtros.filterViewPage,
    setFilterViewPage: filtros.setFilterViewPage,
    aiQuery,
    toggleMarca: filtros.toggleMarca,
    clearMarcas: filtros.clearMarcas,
    clearFilters: filtros.clearFilters,
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
    convenioMarcaNames: derived.convenioMarcaNames,
    selectCategoryFromAi,
  }
}

export type CatalogoPageModel = ReturnType<typeof useCatalogoPage>
