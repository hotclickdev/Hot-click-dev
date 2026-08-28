import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import { SITE_URL, returnPolicyJsonLd } from './devoluciones/devolucionesData'
import DevolucionesHero from './devoluciones/DevolucionesHero'
import DevolucionesBadges from './devoluciones/DevolucionesBadges'
import DevolucionesSections from './devoluciones/DevolucionesSections'
import DevolucionesCta from './devoluciones/DevolucionesCta'

export default function DevolucionesPage() {
  return (
    <MainLayout>
      <Helmet>
        <title>Política de devoluciones — HotClick Costa Rica</title>
        <meta name="description" content="Tenés 7 días hábiles para devolver cualquier producto. Conocé el proceso de devolución y cambio de HotClick Marketplace Costa Rica." />
        <link rel="canonical" href={`${SITE_URL}/devoluciones`} />
        <link rel="alternate" hrefLang="es-CR" href={`${SITE_URL}/devoluciones`} />
        <link rel="alternate" hrefLang="es" href={`${SITE_URL}/devoluciones`} />
        <link rel="alternate" hrefLang="x-default" href={`${SITE_URL}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Política de devoluciones — HotClick Costa Rica" />
        <meta property="og:description" content="7 días hábiles para cambios y devoluciones. Sin costo para el comprador." />
        <meta property="og:url" content={`${SITE_URL}/devoluciones`} />
        <meta property="og:image" content={`${SITE_URL}/og-image.png`} />
        <meta property="og:locale" content="es_CR" />
        <meta property="og:site_name" content="HotClick" />
        <script type="application/ld+json">{JSON.stringify(returnPolicyJsonLd)}</script>
      </Helmet>
      <div style={{ background: 'var(--hc-bg)', minHeight: '100vh', paddingBottom: '4rem' }}>
        <DevolucionesHero />
        <div style={{ maxWidth: 760, margin: '0 auto', padding: '2rem 1.5rem 0' }}>
          <DevolucionesBadges />
          <DevolucionesSections />
          <DevolucionesCta />
        </div>
      </div>
    </MainLayout>
  )
}
