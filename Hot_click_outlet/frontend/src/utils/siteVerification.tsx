import { Helmet } from 'react-helmet-async'

/**
 * Metas de verificación para navegación SPA. El HTML inicial las inyecta Vite
 * (vite.config.ts) para que Google/Bing las vean sin ejecutar JS.
 */
export default function SiteVerification() {
  const google = import.meta.env.VITE_GOOGLE_SITE_VERIFICATION?.trim()
  const bing = import.meta.env.VITE_BING_SITE_VERIFICATION?.trim()
  if (!google && !bing) return null
  return (
    <Helmet>
      {google ? <meta name="google-site-verification" content={google} /> : null}
      {bing ? <meta name="msvalidate.01" content={bing} /> : null}
    </Helmet>
  )
}
