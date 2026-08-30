import CatalogFilterBar from './CatalogFilterBar'
import CategorySidebar from './CategorySidebar'
import BrandShowcase from './BrandShowcase'
import SubcategoryGrid from './SubcategoryGrid'
import CatalogHero from './CatalogHero'
import ActiveFilterChips from './ActiveFilterChips'
import CatalogProductGrid from './CatalogProductGrid'
import CatalogMobileSidebar from './CatalogMobileSidebar'
import { useTranslation } from 'react-i18next'
import type { CatalogoPageModel } from './useCatalogoPage'
import type { RefObject } from 'react'

/**
 * Vista "todos" del catálogo: hero, filtros, marcas, grilla y drawer móvil.
 */
export default function CatalogAllView({
  catalogo, productGridRef, shouldRenderGrid,
}: {
  catalogo: CatalogoPageModel
  productGridRef: RefObject<Element | null>
  shouldRenderGrid: boolean
}) {
  const { t } = useTranslation()
  const {
    products, categories, marcas, loading, page, setViewMode,
    search, setSearch, category, setCategory, marcasFilter, sort, setSort,
    filterStock, setFilterStock, filterCond, setFilterCond, filterTalla, setFilterTalla,
    priceMin, setPriceMin, priceMax, setPriceMax, setQuickView,
    sidebarOpen, setSidebarOpen, filterViewPage, setFilterViewPage,
    toggleMarca, clearMarcas, clearFilters, filtered,
    productCountByCat, categoryTotalCount, marcasCountInScope, marcasForCategoryScope,
    selectedParentNode, hasFilters, flatGrid, showSubcatGrid,
    filteredPages, filteredSlice, activeCatName, gridAnimKey, convenioMarcaNames,
  } = catalogo

  return (
    <>
      <CatalogHero
        activeCatName={activeCatName}
        filteredCount={filtered.length}
        onClearCategory={() => setCategory('')}
      />

      <CatalogFilterBar
        search={search}
        setSearch={setSearch}
        sort={sort}
        setSort={setSort}
        categories={categories}
        categoryTotalCount={categoryTotalCount}
        category={category}
        setCategory={setCategory}
        hasFilters={hasFilters}
        clearFilters={clearFilters}
        onOpenSidebar={() => setSidebarOpen(true)}
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5">
        <div className="flex items-start gap-6">
          <aside
            className="hidden lg:block shrink-0 sticky"
            style={{ width: 252, top: 72, alignSelf: 'flex-start' }}
          >
            <div
              className="rounded-2xl p-4"
              style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}
            >
              <CategorySidebar
                categories={categories}
                category={category}
                setCategory={setCategory}
                categoryTotalCount={categoryTotalCount}
              />
            </div>
          </aside>

          <div className="flex-1 min-w-0 space-y-4">
            <ActiveFilterChips
              marcas={marcas}
              marcasFilter={marcasFilter}
              toggleMarca={toggleMarca}
              filterCond={filterCond}
              setFilterCond={setFilterCond}
              filterStock={filterStock}
              setFilterStock={setFilterStock}
              filterTalla={filterTalla}
              setFilterTalla={setFilterTalla}
              priceMin={priceMin}
              priceMax={priceMax}
              setPriceMin={setPriceMin}
              setPriceMax={setPriceMax}
              clearFilters={clearFilters}
            />

            {!loading && marcas.length > 0 && (
              <BrandShowcase
                marcas={marcas}
                visibleMarcaIds={marcasForCategoryScope}
                marcasCountInScope={marcasCountInScope}
                marcasFilter={marcasFilter}
                toggleMarca={toggleMarca}
                clearMarcas={clearMarcas}
                title={category ? t('products.brandsInCategory') : t('products.shopByBrand')}
              />
            )}

            {showSubcatGrid && (
              <SubcategoryGrid
                subcats={selectedParentNode?.children}
                onSelect={(id) => { setCategory(id); globalThis.scrollTo({ top: 0, behavior: 'smooth' }) }}
                productCountByCat={productCountByCat}
              />
            )}

            <CatalogProductGrid
              gridRef={productGridRef}
              shouldRender={shouldRenderGrid}
              loading={loading}
              filtered={filtered}
              filteredSlice={filteredSlice}
              filteredPages={filteredPages}
              filterViewPage={filterViewPage}
              onPageChange={setFilterViewPage}
              hasFilters={hasFilters}
              onClearFilters={clearFilters}
              flatGrid={flatGrid}
              animKey={gridAnimKey}
              search={search}
              products={products}
              categories={categories}
              convenioMarcaNames={convenioMarcaNames}
              onVerMas={(catId) => { setCategory(String(catId)); globalThis.scrollTo({ top: 0, behavior: 'smooth' }) }}
              onVerEmprendimientos={() => { setViewMode('emprendimientos'); clearFilters() }}
              onQuickView={setQuickView}
              page={page}
            />
          </div>
        </div>

        <CatalogMobileSidebar
          sidebarOpen={sidebarOpen}
          setSidebarOpen={setSidebarOpen}
          categories={categories}
          category={category}
          setCategory={setCategory}
          categoryTotalCount={categoryTotalCount}
        />
      </div>
    </>
  )
}
