import { Helmet } from 'react-helmet-async'
import { generateItemListJsonLd } from '@/utils/jsonLd'

const CANONICAL_URL = 'https://hotclick.lat/productos'

function tituloSeo({ viewMode, activeCatName, activeMarcaName }) {
  if (viewMode === 'ofertas') return 'Ofertas HOT — Mejores precios del día | HotClick'
  if (viewMode === 'emprendimientos') return 'Emprendimientos Costarricenses — Negocios locales CR | HotClick'
  if (activeCatName) return `${activeCatName} en Costa Rica — Compra online | HotClick`
  if (activeMarcaName) return `${activeMarcaName} en Costa Rica — Productos originales | HotClick`
  return 'Catálogo de productos — Compra online en Costa Rica | HotClick'
}

function descripcionSeo({ viewMode, activeCatName, activeMarcaName, filteredLength, productsLength }) {
  if (viewMode === 'ofertas') return `${filteredLength > 0 ? `${filteredLength} productos con ` : ''}Ofertas y descuentos especiales de emprendedores costarricenses. Precios directos, envío a todo Costa Rica.`
  if (viewMode === 'emprendimientos') return 'Apoyá el comercio local. Descubrí emprendimientos costarricenses y comprá productos únicos con envío a todo el país.'
  if (activeCatName) return `Explorá los mejores productos de ${activeCatName} de emprendedores en Costa Rica. Envío a todo el país, precios directos y pagos seguros.`
  if (activeMarcaName) return `Todos los productos de ${activeMarcaName} disponibles en HotClick Costa Rica. Entrega a domicilio, pagos con SINPE Móvil y tarjeta.`
  return `Explorá más de ${productsLength > 0 ? `${productsLength} ` : ''}productos únicos de emprendedores costarricenses. Tecnología, ropa, accesorios y más con envío a todo Costa Rica.`
}

export default function CatalogSeoHelmet({
  viewMode, activeCatName, marcas, marcasFilter, hasFilters, category, filtered, products,
}) {
  const activeMarcaName = marcasFilter.size === 1
    ? marcas.find(m => String(m.id) === [...marcasFilter][0])?.nombreMarca
    : null
  const seoTitle = tituloSeo({ viewMode, activeCatName, activeMarcaName })
  const seoDesc = descripcionSeo({
    viewMode, activeCatName, activeMarcaName,
    filteredLength: filtered.length, productsLength: products.length,
  })
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
          {JSON.stringify(generateItemListJsonLd(products.slice(0, 12), 'https://hotclick.lat'))}
        </script>
      )}
    </Helmet>
  )
}
