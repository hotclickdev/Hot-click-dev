import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import { generateItemListJsonLd } from '@/utils/jsonLd'
import { hrefCanonicalCatalogo } from '@/pages/seo/canonicalCatalogo'
import type { Producto } from '@/types/producto'
import type { CatalogMarca } from './catalogoTipos'

type SeoArgs = {
  activeCatName?: string | null
  activeMarcaName?: string | null
  productsLength: number
  t: (key: string, opts?: Record<string, string | number>) => string
}

function tituloSeo({ activeCatName, activeMarcaName, t }: SeoArgs) {
  if (activeCatName) return t('products.seoTitleCat', { name: activeCatName })
  if (activeMarcaName) return t('products.seoTitleBrand', { name: activeMarcaName })
  return t('products.seoTitleDefault')
}

function descripcionSeo({
  activeCatName, activeMarcaName, productsLength, t,
}: SeoArgs) {
  if (activeCatName) return t('products.seoDescCat', { name: activeCatName })
  if (activeMarcaName) return t('products.seoDescBrand', { name: activeMarcaName })
  if (productsLength > 0) return t('products.seoDescDefault', { count: productsLength })
  return t('products.seoDescDefaultEmpty')
}

export default function CatalogSeoHelmet({
  activeCatName, marcas, marcasFilter, hasFilters, category, products,
  categorySlug, sectorIndexable = false, soloCategoria = false,
}: {
  activeCatName?: string | null
  marcas: CatalogMarca[]
  marcasFilter: Set<string>
  hasFilters: boolean
  category: string
  products: Producto[]
  categorySlug?: string | null
  sectorIndexable?: boolean
  soloCategoria?: boolean
}) {
  const { t } = useTranslation()
  const activeMarcaName = marcasFilter.size === 1
    ? marcas.find(m => String(m.id) === [...marcasFilter][0])?.nombreMarca
    : null
  const seoArgs: SeoArgs = {
    activeCatName, activeMarcaName, productsLength: products.length, t,
  }
  const seoTitle = tituloSeo(seoArgs)
  const seoDesc = descripcionSeo(seoArgs)
  const canonicalUrl = hrefCanonicalCatalogo(soloCategoria, categorySlug ?? undefined, sectorIndexable)
  const shouldNoIndex = hasFilters && (marcasFilter.size > 1 || (marcasFilter.size > 0 && !!category))

  return (
    <Helmet>
      <title>{seoTitle}</title>
      <meta name="description" content={seoDesc} />
      <link rel="canonical" href={canonicalUrl} />
      <link rel="alternate" hrefLang="es-CR" href={canonicalUrl} />
      <link rel="alternate" hrefLang="es"    href={canonicalUrl} />
      <link rel="alternate" hrefLang="x-default" href="https://hotclick.lat/" />
      {shouldNoIndex && <meta name="robots" content="noindex, follow" />}
      <meta property="og:title" content={seoTitle} />
      <meta property="og:description" content={seoDesc} />
      <meta property="og:type" content="website" />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:image" content="https://hotclick.lat/og-image.png" />
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={seoTitle} />
      <meta name="twitter:description" content={seoDesc} />
      {products.length > 0 && (
        <script type="application/ld+json">
          {JSON.stringify(generateItemListJsonLd(products.slice(0, 12) as { id: number; nombre: string }[], 'https://hotclick.lat'))}
        </script>
      )}
    </Helmet>
  )
}
