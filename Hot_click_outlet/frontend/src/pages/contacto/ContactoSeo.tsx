import { Helmet } from 'react-helmet-async'
import { SITE_URL, contactPageJsonLd } from './contactoHelpers'

export default function ContactoSeo() {
  return (
    <Helmet>
      <title>Contacto — HotClick Marketplace Costa Rica</title>
      <meta name="description" content="Contactá al equipo de HotClick por WhatsApp al +506 8666-7888, por email o formulario. Atención Lun–Sáb 8:00–19:00." />
      <link rel="canonical" href={`${SITE_URL}/contacto`} />
      <link rel="alternate" hrefLang="es-CR" href={`${SITE_URL}/contacto`} />
      <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/`} />
      <meta property="og:type" content="website" />
      <meta property="og:title" content="Contacto HotClick — Soporte al cliente en Costa Rica" />
      <meta property="og:description" content="Escribinos por WhatsApp, email o formulario. Te respondemos el mismo día." />
      <meta property="og:url" content={`${SITE_URL}/contacto`} />
      <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
      <meta property="og:locale" content="es_CR" />
      <meta property="og:site_name" content="HotClick" />
      <script type="application/ld+json">{JSON.stringify(contactPageJsonLd)}</script>
    </Helmet>
  )
}
