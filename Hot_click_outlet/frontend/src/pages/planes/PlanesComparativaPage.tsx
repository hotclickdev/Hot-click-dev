import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import { PLANES_DIRECTORIO } from '@/components/comprador/negocios/negociosPublicos'
import TarjetaPlanPublico from './TarjetaPlanPublico'

/**
 * Los tres planes en una sola página (no hay frame en Figma: se arma con las tarjetas del directorio `29:1159`
 * y los tokens del manual). Cada tarjeta entra a la landing de ese plan o al alta con `?plan=`.
 */
export default function PlanesComparativaPage() {
  const { t } = useTranslation()

  return (
    <MainLayout>
      <Helmet>
        <title>{t('planesPublicos.metaTitle')}</title>
        <meta name="description" content={t('planesPublicos.metaDescription')} />
      </Helmet>
      <div className="bg-hc-n-50">
        <div className="mx-auto flex max-w-[1100px] flex-col gap-6 px-4 py-8 lg:px-8 lg:py-12">
          <header className="flex max-w-2xl flex-col gap-2">
            <h1 className="font-display text-[22px] font-bold leading-7 text-hc-n-900 lg:text-[28px] lg:leading-9">
              {t('planesPublicos.titulo')}
            </h1>
            <p className="text-sm leading-[21px] text-hc-n-600">{t('planesPublicos.intro')}</p>
          </header>
          <div className="grid gap-3 lg:grid-cols-3">
            {PLANES_DIRECTORIO.map((plan) => (
              <TarjetaPlanPublico key={plan.alias} alias={plan.alias} />
            ))}
          </div>
        </div>
      </div>
    </MainLayout>
  )
}
