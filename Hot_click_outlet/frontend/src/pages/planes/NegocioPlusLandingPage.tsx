import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import PlanLanding from './PlanLanding'

export default function NegocioPlusLandingPage() {
  const { t } = useTranslation()
  return (
    <MainLayout>
      <Helmet>
        <title>{`${t('planes.landing.planLabel')} Negocio Plus | HotClick`}</title>
        <meta name="description" content={t('planes.landing.metaPlus')} />
      </Helmet>
      <PlanLanding plan="negocioPlus" />
    </MainLayout>
  )
}
