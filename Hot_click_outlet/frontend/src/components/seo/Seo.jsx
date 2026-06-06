import { Helmet } from 'react-helmet-async'

const SITE_NAME = 'HOTCLICK'
const DEFAULT_IMAGE = '/assets/og-default.png'

export default function Seo({ title, description, image, url, type = 'website' }) {
  const fullImage = image || DEFAULT_IMAGE
  const fullUrl = url || (typeof window !== 'undefined' ? window.location.href : '')

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={fullImage} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={fullImage} />
    </Helmet>
  )
}
