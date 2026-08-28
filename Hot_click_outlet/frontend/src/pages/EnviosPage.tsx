import { Helmet } from 'react-helmet-async'
import MainLayout from '@/layouts/MainLayout'
import { SITE_URL, shippingJsonLd } from './envios/enviosHelpers'
import EnviosPageStyles from './envios/EnviosPageStyles'
import EnviosHero from './envios/EnviosHero'
import EnviosServiceCards from './envios/EnviosServiceCards'
import EnviosUrgentBanner from './envios/EnviosUrgentBanner'
import EnviosFaq from './envios/EnviosFaq'
import EnviosCta from './envios/EnviosCta'

export default function EnviosPage() {
  return (
    <MainLayout>
      <Helmet>
        <title>Envíos a todo Costa Rica — HotClick</title>
        <meta name="description" content="Enviamos a todas las provincias de Costa Rica. Conocé los métodos de envío, tarifas estimadas y zonas de cobertura de HotClick." />
        <link rel="canonical" href={`${SITE_URL}/envios`} />
        <script type="application/ld+json">{JSON.stringify(shippingJsonLd)}</script>
      </Helmet>

      <EnviosPageStyles />

      <div className="envios-page">
        <EnviosHero />
        <div className="envios-body">
          <EnviosServiceCards />
          <EnviosUrgentBanner />
          <EnviosFaq />
          <EnviosCta />
        </div>
      </div>
    </MainLayout>
  )
}
