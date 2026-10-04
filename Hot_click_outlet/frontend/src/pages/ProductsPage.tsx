import MainLayout from '@/layouts/MainLayout'
import useLazyLoad from '@/hooks/useLazyLoad'
import CatalogSeoHelmet from './catalogo/CatalogSeoHelmet'
import CatalogAllView from './catalogo/CatalogAllView'
import { useCatalogoPage } from './catalogo/useCatalogoPage'
import { useSlugsSector } from './seo/useSlugsSector'

/** Catálogo: en móvil la pantalla dibuja su propio encabezado (Figma `26:722`, `43:1530`), por eso `variante="propia"`. */
export default function ProductsPage() {
  const catalogo = useCatalogoPage()
  const [productGridRef, shouldRenderGrid] = useLazyLoad({ threshold: 0.1, rootMargin: '200px' })
  const slugsSector = useSlugsSector()
  const {
    marcas, category, marcasFilter, hasFilters, activeCatName, products, categories,
    search, priceMin, priceMax, filterStock, filterCond, filterTalla,
  } = catalogo
  const catActiva = categories.find(c => String(c.id) === String(category))
  const stockPorDefecto = !filterStock || filterStock === 'ok'
  const soloCategoria = !!category && marcasFilter.size === 0
    && !search && !priceMin && !priceMax && stockPorDefecto && !filterCond && !filterTalla

  return (
    <MainLayout variante="propia">
      <CatalogSeoHelmet
        activeCatName={activeCatName}
        marcas={marcas}
        marcasFilter={marcasFilter}
        hasFilters={hasFilters}
        category={category}
        products={products}
        categorySlug={catActiva?.slug}
        sectorIndexable={!!catActiva?.slug && slugsSector.has(catActiva.slug)}
        soloCategoria={soloCategoria}
      />
      <CatalogAllView
        catalogo={catalogo}
        productGridRef={productGridRef}
        shouldRenderGrid={shouldRenderGrid}
      />
    </MainLayout>
  )
}
