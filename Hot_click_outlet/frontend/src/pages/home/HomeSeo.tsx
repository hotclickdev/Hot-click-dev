import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import Seo from '@/components/seo/Seo'
import { generateWebsiteJsonLd, generateOrganizationJsonLd, generateFAQJsonLd, generateItemListJsonLd } from '@/utils/jsonLd'
import type { Producto } from '@/types/producto'

/**
 * SEO y JSON-LD de la home. Recibe destacados para el ItemList.
 */
export default function HomeSeo({ destacados = [] }: { destacados?: Producto[] }) {
  const { t } = useTranslation()
  return (
    <>
      <Seo
        title={t('home.seoTitle')}
        description={t('home.seoDescription')}
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
            {JSON.stringify(generateItemListJsonLd(destacados as { id: number | string; nombre?: string }[], globalThis.location.origin))}
          </script>
        )}
      </Helmet>
    </>
  )
}
