import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import PlanLanding from './PlanLanding'

export default function PymeLandingPage() {
  const { t } = useTranslation()
  return (
    <MainLayout>
      <Helmet>
        <title>{`${t('planes.landing.planLabel')} Pyme | HotClick`}</title>
        <meta name="description" content={t('planes.landing.metaPyme')} />
      </Helmet>
      <PlanLanding plan="pyme" />
    </MainLayout>
  )
}
