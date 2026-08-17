import { Helmet } from 'react-helmet-async'
import Seo from '@/components/seo/Seo'
import { generateWebsiteJsonLd, generateOrganizationJsonLd, generateFAQJsonLd, generateItemListJsonLd } from '@/utils/jsonLd'

/**
 * SEO y JSON-LD de la home. Recibe destacados para el ItemList.
 * @param {{ destacados?: object[] }} props
 */
export default function HomeSeo({ destacados = [] }) {
  return (
    <>
      <Seo
        title="HotClick — Marketplace de emprendedores en Costa Rica"
        description="Marketplace de emprendedores costarricenses. Productos únicos con envío a todo Costa Rica, pagos seguros y soporte local."
        type="website"
      />
      <Helmet>
        <script type="application/ld+json">
          {JSON.stringify(generateWebsiteJsonLd(globalThis.location.origin))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(generateOrganizationJsonLd(globalThis.location.origin, [
            'https://www.facebook.com/hotclickcr',
            'https://www.instagram.com/hotclickcr',
            'https://wa.me/50686667888',
            'https://www.tiktok.com/@hotclickcr',
          ]))}
        </script>
        <script type="application/ld+json">
          {JSON.stringify(generateFAQJsonLd())}
        </script>
        {destacados.length > 0 && (
          <script type="application/ld+json">
            {JSON.stringify(generateItemListJsonLd(destacados, globalThis.location.origin))}
          </script>
        )}
      </Helmet>
    </>
  )
}
