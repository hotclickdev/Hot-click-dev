import { Helmet } from 'react-helmet-async'
import Seo from '@/components/seo/Seo'
import { generateProductJsonLd, generateBreadcrumbJsonLd } from '@/utils/jsonLd'

/**
 * Meta SEO y JSON-LD de la ficha de producto.
 */
export default function ProductDetailSeo({ product, seoTitle, seoDescription }) {
  return (
    <>
      <Seo
        title={seoTitle}
        description={seoDescription}
        image={product.imagenUrl}
        url={`https://hotclick.lat/productos/${product.id}`}
        type="product"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(generateProductJsonLd(product, globalThis.location.origin))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(generateBreadcrumbJsonLd([
            { name: 'HotClick', url: `${globalThis.location.origin}/` },
            { name: 'Productos', url: `${globalThis.location.origin}/productos` },
            ...(product.marcaNombre ? [{ name: product.marcaNombre, url: `${globalThis.location.origin}/productos?marcaId=${product.marcaId}` }] : []),
            { name: product.titulo || product.nombre, url: globalThis.location.href },
          ]))}
        </script>
      </Helmet>
    </>
  )
}
