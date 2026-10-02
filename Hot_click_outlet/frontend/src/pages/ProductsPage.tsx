import MainLayout from '@/layouts/MainLayout'
import useLazyLoad from '@/hooks/useLazyLoad'
import CatalogSeoHelmet from './catalogo/CatalogSeoHelmet'
import CatalogAllView from './catalogo/CatalogAllView'
import { useCatalogoPage } from './catalogo/useCatalogoPage'

/** Catálogo: en móvil la pantalla dibuja su propio encabezado (Figma `26:722`, `43:1530`), por eso `variante="propia"`. */
export default function ProductsPage() {
  const catalogo = useCatalogoPage()
  const [productGridRef, shouldRenderGrid] = useLazyLoad({ threshold: 0.1, rootMargin: '200px' })

  const { marcas, category, marcasFilter, hasFilters, activeCatName, products } = catalogo

  return (
    <MainLayout variante="propia">
      <CatalogSeoHelmet
        activeCatName={activeCatName}
        marcas={marcas}
        marcasFilter={marcasFilter}
        hasFilters={hasFilters}
        category={category}
        products={products}
      />
      <CatalogAllView
        catalogo={catalogo}
        productGridRef={productGridRef}
        shouldRenderGrid={shouldRenderGrid}
      />
    </MainLayout>
  )
}
