import { motion } from 'framer-motion'
import MainLayout from '@/layouts/MainLayout'
import useLazyLoad from '@/hooks/useLazyLoad'
import CartMiniBar from './catalogo/CartMiniBar'
import CatalogSeoHelmet from './catalogo/CatalogSeoHelmet'
import CatalogAiFab from './catalogo/CatalogAiFab'
import CatalogAllView from './catalogo/CatalogAllView'
import { useCatalogoPage } from './catalogo/useCatalogoPage'

export default function ProductsPage() {
  const catalogo = useCatalogoPage()
  const [productGridRef, shouldRenderGrid] = useLazyLoad({ threshold: 0.1, rootMargin: '200px' })

  const { marcas, category, marcasFilter, hasFilters, activeCatName, products } = catalogo

  return (
    <>
      <CatalogAiFab />

      <MainLayout>
        <CatalogSeoHelmet
          activeCatName={activeCatName}
          marcas={marcas}
          marcasFilter={marcasFilter}
          hasFilters={hasFilters}
          category={category}
          products={products}
        />

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
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

        <CartMiniBar />
      </MainLayout>
    </>
  )
}
