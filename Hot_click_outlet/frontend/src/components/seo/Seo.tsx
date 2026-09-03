import { Helmet } from 'react-helmet-async'
import { isBrowser } from '@/utils/browser'

const SITE_NAME = 'HOTCLICK'
const SITE_URL = 'https://hotclick.lat'
const DEFAULT_IMAGE = '/og-image.png'

export type SeoProps = {
  title: string
  description: string
  image?: string
  url?: string
  type?: string
  noindex?: boolean
}

export default function Seo({ title, description, image, url, type = 'website', noindex = false }: SeoProps) {
  const fullImage = image || DEFAULT_IMAGE
  const fullUrl = url || (isBrowser ? globalThis.location.href : '')
  const canonical = url || fullUrl
  const isAbsolute = fullImage.startsWith('http')
  const secureImage = isAbsolute ? fullImage : `${SITE_URL}${fullImage}`

  return (
    <Helmet>
      <title>{title}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={canonical} />
      {noindex && <meta name="robots" content="noindex, follow" />}

      <link rel="alternate" hrefLang="es-CR" href={canonical} />
      <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/`} />

      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={secureImage} />
      <meta property="og:image:secure_url" content={secureImage} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:image:alt" content={title} />
      <meta property="og:type" content={type} />
      <meta property="og:url" content={fullUrl} />
      <meta property="og:locale" content="es_CR" />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:site" content="@hotclickcr" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={secureImage} />
      <meta name="twitter:image:alt" content={title} />
    </Helmet>
  )
}
