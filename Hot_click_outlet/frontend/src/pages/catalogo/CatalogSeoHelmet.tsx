import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { generateItemListJsonLd } from '@/utils/jsonLd'
import type { Producto } from '@/types/producto'
import type { CatalogMarca, CatalogViewMode } from './catalogoTipos'

const CANONICAL_URL = 'https://hotclick.lat/productos'

type SeoArgs = {
  viewMode: CatalogViewMode | string
  activeCatName?: string | null
  activeMarcaName?: string | null
  filteredLength: number
  productsLength: number
  t: (key: string, opts?: Record<string, string | number>) => string
}

function tituloSeo({ viewMode, activeCatName, activeMarcaName, t }: SeoArgs) {
  if (viewMode === 'ofertas') return t('products.seoTitleOfertas')
  if (viewMode === 'emprendimientos') return t('products.seoTitleEmp')
  if (activeCatName) return t('products.seoTitleCat', { name: activeCatName })
  if (activeMarcaName) return t('products.seoTitleBrand', { name: activeMarcaName })
  return t('products.seoTitleDefault')
}

function descripcionSeo({
  viewMode, activeCatName, activeMarcaName, filteredLength, productsLength, t,
}: SeoArgs) {
  if (viewMode === 'ofertas') {
    const prefix = filteredLength > 0
      ? t('products.seoDescOfertasPrefix', { count: filteredLength })
      : ''
    return t('products.seoDescOfertas', { prefix })
  }
  if (viewMode === 'emprendimientos') return t('products.seoDescEmp')
  if (activeCatName) return t('products.seoDescCat', { name: activeCatName })
  if (activeMarcaName) return t('products.seoDescBrand', { name: activeMarcaName })
  if (productsLength > 0) return t('products.seoDescDefault', { count: productsLength })
  return t('products.seoDescDefaultEmpty')
}

export default function CatalogSeoHelmet({
  viewMode, activeCatName, marcas, marcasFilter, hasFilters, category, filtered, products,
}: {
  viewMode: CatalogViewMode | string
  activeCatName?: string | null
  marcas: CatalogMarca[]
  marcasFilter: Set<string>
  hasFilters: boolean
  category: string
  filtered: Producto[]
  products: Producto[]
}) {
  const { t } = useTranslation()
  const activeMarcaName = marcasFilter.size === 1
    ? marcas.find(m => String(m.id) === [...marcasFilter][0])?.nombreMarca
    : null
  const seoArgs: SeoArgs = {
    viewMode, activeCatName, activeMarcaName,
    filteredLength: filtered.length, productsLength: products.length, t,
  }
  const seoTitle = tituloSeo(seoArgs)
  const seoDesc = descripcionSeo(seoArgs)
  const shouldNoIndex = hasFilters && (marcasFilter.size > 1 || (marcasFilter.size > 0 && !!category))

  return (
    <Helmet>
      <title>{seoTitle}</title>
      <meta name="description" content={seoDesc} />
      <link rel="canonical" href={CANONICAL_URL} />
      <link rel="alternate" hrefLang="es-CR" href={CANONICAL_URL} />
      <link rel="alternate" hrefLang="es"    href={CANONICAL_URL} />
      <link rel="alternate" hrefLang="x-default" href="https://hotclick.lat/" />
      {shouldNoIndex && <meta name="robots" content="noindex, follow" />}
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDesc} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={CANONICAL_URL} />
      <meta property="og:image" content="https://hotclick.lat/og-image.png" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDesc} />
      {products.length > 0 && viewMode === 'all' && (
        <script type="application/ld+json">
          {JSON.stringify(generateItemListJsonLd(products.slice(0, 12) as { id: number; nombre: string }[], 'https://hotclick.lat'))}
        </script>
      )}
    </Helmet>
  )
}
