import CatalogFilterBar from './CatalogFilterBar'
import CategorySidebar from './CategorySidebar'
import BrandShowcase from './BrandShowcase'
import SubcategoryGrid from './SubcategoryGrid'
import CatalogHero from './CatalogHero'
import ActiveFilterChips from './ActiveFilterChips'
import CatalogProductGrid from './CatalogProductGrid'
import CatalogMobileSidebar from './CatalogMobileSidebar'
import { RetryBanner } from '@/components/ui/RetryBanner'
import { useTranslation } from 'react-i18next'
import { useMemo } from 'react'
import Chip from '@/components/comprador/Chip'
import HojaInferior from '@/components/comprador/HojaInferior'
import EntendiChips from './EntendiChips'
import FiltrosPanel from './FiltrosPanel'
import { busquedasRelacionadas, chipsEntendi, tiendasDelCatalogo, type ChipEntendi } from './buscarExplorar'
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
    products, categories, marcas, loading, error, retry, page, setViewMode,
    search, setSearch, category, setCategory, marcasFilter, sort, setSort,
    filterStock, setFilterStock, filterCond, setFilterCond, filterTalla, setFilterTalla,
    priceMin, setPriceMin, priceMax, setPriceMax, setQuickView,
    sidebarOpen, setSidebarOpen, filterViewPage, setFilterViewPage,
    toggleMarca, clearMarcas, clearFilters, filtered,
    productCountByCat, categoryTotalCount, marcasCountInScope, marcasForCategoryScope,
    selectedParentNode, hasFilters, flatGrid, showSubcatGrid,
    filteredPages, filteredSlice, activeCatName, gridAnimKey, convenioMarcaNames,
    tieneGustos, extras, setExtras, filtrosAbiertos, setFiltrosAbiertos,
  } = catalogo

  const tiendas = useMemo(() => tiendasDelCatalogo(products), [products])
  const hayRetiro = useMemo(() => products.some((p) => p.bodegaPermiteRetiro === true), [products])
  const chips = chipsEntendi({ search, categoriaNombre: activeCatName ?? null, priceMin, priceMax, extra: extras })
  const relacionadas = search && filtered.length > 0 ? busquedasRelacionadas(search, filtered) : []

  const quitarChip = (chip: ChipEntendi) => {
    if (chip.tipo === 'busqueda') setSearch('')
    else if (chip.tipo === 'categoria') setCategory('')
    else if (chip.tipo === 'precio') { setPriceMin(''); setPriceMax('') }
    else if (chip.tipo === 'tienda') setExtras((prev) => ({ ...prev, tiendas: new Set([...prev.tiendas].filter((x) => x !== chip.valor)) }))
    else if (chip.tipo === 'pedido') setExtras((prev) => ({ ...prev, hechoAPedido: false }))
    else setExtras((prev) => ({ ...prev, retiroEnTienda: false }))
  }

  const panelFiltros = (
    <FiltrosPanel
      priceMin={priceMin} priceMax={priceMax} setPriceMin={setPriceMin} setPriceMax={setPriceMax}
      categories={categories} categoryTotalCount={categoryTotalCount} category={category} setCategory={setCategory}
      tiendas={tiendas} extras={extras} setExtras={setExtras}
      soloConStock={filterStock === 'ok'} setSoloConStock={(v) => setFilterStock(v ? 'ok' : '')}
      hayRetiro={hayRetiro}
    />
  )

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
            <div className="mt-4 rounded-[14px] border border-hc-n-200 bg-hc-n-0 px-4">
              <h2 className="pb-1 pt-4 font-display text-[16px] font-bold text-hc-n-900">{t('products.filter')}</h2>
              {panelFiltros}
            </div>
          </aside>

          <div className="flex-1 min-w-0 space-y-4">
            <EntendiChips chips={chips} onQuitar={quitarChip} onAbrirFiltros={() => setFiltrosAbiertos(true)} />
            <ActiveFilterChips
              marcas={marcas}
              marcasFilter={marcasFilter}
              toggleMarca={toggleMarca}
              filterCond={filterCond}
              setFilterCond={setFilterCond}
              filterStock=""
              setFilterStock={setFilterStock}
              filterTalla={filterTalla}
              setFilterTalla={setFilterTalla}
              priceMin=""
              priceMax=""
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

            {error ? (
              <RetryBanner
                message="No pudimos cargar los productos. Verificá tu conexión."
                onRetry={retry}
              />
            ) : (
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
                needsGustos={sort === 'para_vos' && !tieneGustos}
              />
            )}

            {relacionadas.length > 0 && (
              <section className="flex flex-col gap-[10px] pb-6 pt-[18px]">
                <h2 className="text-[13px] font-semibold text-hc-n-600">{t('products.relatedSearches')}</h2>
                <div className="flex flex-wrap gap-2">
                  {relacionadas.map((r) => <Chip key={r} texto={r} onClick={() => setSearch(r)} />)}
                </div>
              </section>
            )}
          </div>
        </div>

        <HojaInferior
          abierta={filtrosAbiertos}
          onCerrar={() => setFiltrosAbiertos(false)}
          titulo={(
            <div className="flex items-center justify-between">
              <span className="font-display text-[18px] font-bold text-hc-n-900">{t('products.filter')}</span>
              <button type="button" onClick={clearFilters} className="text-[13px] font-semibold text-hc-blue-600">{t('products.clearAll')}</button>
            </div>
          )}
        >
          {panelFiltros}
          <button
            type="button"
            onClick={() => setFiltrosAbiertos(false)}
            className="rounded-[12px] bg-hc-red-500 px-4 py-[14px] text-[15px] font-semibold text-hc-n-0"
          >
            {t('products.viewResults', { count: filtered.length })}
          </button>
        </HojaInferior>

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
