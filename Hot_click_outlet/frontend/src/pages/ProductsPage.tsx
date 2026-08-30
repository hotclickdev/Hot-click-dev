import { motion, AnimatePresence } from 'framer-motion'
import MainLayout from '@/layouts/MainLayout'
import QuickViewModal from '@/components/ui/QuickViewModal'
import useLazyLoad from '@/hooks/useLazyLoad'
import OfertasView from './catalogo/OfertasView'
import EmprendimientosView from './catalogo/EmprendimientosView'
import CartMiniBar from './catalogo/CartMiniBar'
import CatalogViewTabs from './catalogo/CatalogViewTabs'
import CatalogSeoHelmet from './catalogo/CatalogSeoHelmet'
import CatalogAiFab from './catalogo/CatalogAiFab'
import CatalogAllView from './catalogo/CatalogAllView'
import { useCatalogoPage } from './catalogo/useCatalogoPage'

export default function ProductsPage() {
  const catalogo = useCatalogoPage()
  const [productGridRef, shouldRenderGrid] = useLazyLoad({ threshold: 0.1, rootMargin: '200px' })

  const {
    products, marcas, loading, viewMode, setViewMode, convenios,
    category, marcasFilter, quickView, setQuickView,
    clearFilters, filtered, hasFilters, activeCatName,
  } = catalogo

  return (
    <>
      <CatalogAiFab />

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
              <CatalogAllView
                catalogo={catalogo}
                productGridRef={productGridRef}
                shouldRenderGrid={shouldRenderGrid}
              />
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
