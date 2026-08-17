import { motion, AnimatePresence } from 'framer-motion'
import MainLayout from '@/layouts/MainLayout'
import QuickViewModal from '@/components/ui/QuickViewModal'
import useLazyLoad from '@/hooks/useLazyLoad'
import ProductsAssistantPanel from '@/components/ai/ProductsAssistantPanel'
import CatalogFilterBar from './catalogo/CatalogFilterBar'
import CategorySidebar from './catalogo/CategorySidebar'
import BrandShowcase from './catalogo/BrandShowcase'
import SubcategoryGrid from './catalogo/SubcategoryGrid'
import OfertasView from './catalogo/OfertasView'
import EmprendimientosView from './catalogo/EmprendimientosView'
import CartMiniBar from './catalogo/CartMiniBar'
import CatalogViewTabs from './catalogo/CatalogViewTabs'
import CatalogHero from './catalogo/CatalogHero'
import ActiveFilterChips from './catalogo/ActiveFilterChips'
import CatalogProductGrid from './catalogo/CatalogProductGrid'
import CatalogSeoHelmet from './catalogo/CatalogSeoHelmet'
import { useCatalogoPage } from './catalogo/useCatalogoPage'

export default function ProductsPage() {
  const catalogo = useCatalogoPage()
  const [productGridRef, shouldRenderGrid] = useLazyLoad({ threshold: 0.1, rootMargin: '200px' })

  const {
    products, categories, marcas, loading, page, viewMode, setViewMode, convenios,
    search, setSearch, category, setCategory, marcasFilter, sort, setSort,
    filterStock, setFilterStock, filterCond, setFilterCond, filterTalla, setFilterTalla,
    priceMin, setPriceMin, priceMax, setPriceMax, quickView, setQuickView,
    aiPanelOpen, setAiPanelOpen, sidebarOpen, setSidebarOpen,
    filterViewPage, setFilterViewPage, aiQuery,
    toggleMarca, clearMarcas, clearFilters, filtered,
    productCountByCat, categoryTotalCount, marcasCountInScope, marcasForCategoryScope,
    selectedParentNode, hasFilters, flatGrid, showSubcatGrid,
    filteredPages, filteredSlice, activeCatName, gridAnimKey, convenioMarcaNames,
    selectCategoryFromAi,
  } = catalogo

  return (
    <>
      <ProductsAssistantPanel
        isOpen={aiPanelOpen}
        onClose={() => setAiPanelOpen(false)}
        initialQuery={aiQuery}
        onCategoryFilter={selectCategoryFromAi}
      />

      <button
        onClick={() => setAiPanelOpen((v) => !v)}
        className="fixed left-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center gap-1.5 py-4 px-1.5 rounded-r-2xl shadow-xl transition-all hover:scale-105 active:scale-95"
        style={{
          background: aiPanelOpen ? 'rgba(255,255,255,0.12)' : 'var(--hc-accent)',
          color: '#fff',
          border: aiPanelOpen ? '1px solid rgba(255,255,255,0.2)' : 'none',
          backdropFilter: aiPanelOpen ? 'blur(8px)' : 'none',
        }}
        aria-label={aiPanelOpen ? 'Cerrar asistente IA' : 'Abrir asistente IA'}
      >
        <span style={{ fontSize: 14, animation: aiPanelOpen ? 'none' : 'hc-fab-pulse 2s ease-in-out infinite' }}>✦</span>
        <span style={{
          writingMode: 'vertical-lr',
          transform: 'rotate(180deg)',
          fontSize: 9,
          fontWeight: 700,
          letterSpacing: 1.5,
          textTransform: 'uppercase',
        }}>¿DUDAS?</span>
        <style>{`@keyframes hc-fab-pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.7;transform:scale(1.15)}}`}</style>
      </button>

      <MainLayout>
        <CatalogSeoHelmet
          viewMode={viewMode}
          activeCatName={activeCatName}
          marcas={marcas}
          marcasFilter={marcasFilter}
          hasFilters={hasFilters}
          category={category}
          filtered={filtered}
          products={products}
        />

        <CatalogViewTabs
          viewMode={viewMode}
          onSelect={(id) => { setViewMode(id); clearFilters() }}
        />

        <AnimatePresence mode="wait">
          {viewMode === 'ofertas' && (
            <OfertasView key="v-ofertas" products={filtered} loading={loading} />
          )}
          {viewMode === 'emprendimientos' && (
            <EmprendimientosView
              key="v-emp"
              products={filtered}
              convenios={convenios}
              loading={loading}
              onBack={() => setViewMode('all')}
            />
          )}
          {viewMode === 'all' && (
            <motion.div
              key="v-all"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="min-h-screen"
              style={{ background: 'var(--hc-bg)' }}
            >
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
                        title={category ? 'Marcas en esta categoría' : 'Compra por Marca'}
                      />
                    )}

                    {showSubcatGrid && (
                      <SubcategoryGrid
                        subcats={selectedParentNode.children}
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

                <AnimatePresence>
                  {sidebarOpen && (
                    <>
                      <motion.div
                        key="sidebar-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        onClick={() => setSidebarOpen(false)}
                        className="fixed inset-0 z-40 lg:hidden"
                        style={{ background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(2px)' }}
                      />
                      <motion.aside
                        key="sidebar-drawer"
                        initial={{ x: '-100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '-100%' }}
                        transition={{ type: 'spring', damping: 26, stiffness: 260 }}
                        className="hc-drawer-surface fixed left-0 top-0 bottom-0 z-50 overflow-y-auto lg:hidden"
                        style={{
                          width: 'min(300px, 90vw)',
                          background: 'var(--hc-surface)',
                          borderRight: '1px solid var(--hc-border)',
                          boxShadow: '8px 0 48px rgba(0,0,0,0.14)',
                        }}
                      >
                        <div
                          className="flex items-center justify-between px-5 py-4"
                          style={{ borderBottom: '1px solid var(--hc-border)' }}
                        >
                          <p className="font-bold text-sm" style={{ color: 'var(--hc-text)' }}>Filtrar catálogo</p>
                          <button
                            onClick={() => setSidebarOpen(false)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center transition-opacity hover:opacity-60"
                            style={{ color: 'var(--hc-muted)' }}
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                          </button>
                        </div>
                        <div className="p-5">
                          <CategorySidebar
                            categories={categories}
                            category={category}
                            setCategory={setCategory}
                            categoryTotalCount={categoryTotalCount}
                            onCategorySelect={() => setSidebarOpen(false)}
                          />
                        </div>
                      </motion.aside>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {quickView && <QuickViewModal product={quickView} onClose={() => setQuickView(null)} />}
        </AnimatePresence>

        <CartMiniBar />
      </MainLayout>
    </>
  )
}
