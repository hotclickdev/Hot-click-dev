import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import useAuthStore from '@/store/authStore'
import { esUsuarioSistema } from '@/utils/sistemaUser'
import EmprendeHero from './emprende/EmprendeHero'
import EmprendePasos from './emprende/EmprendePasos'
import EmprendeAcciones from './emprende/EmprendeAcciones'

/** Hub público Emprender: checklist de crecimiento, no directorio externo. */
export default function EmprendePage() {
  const { t } = useTranslation()
  const userRole = useAuthStore((s) => s.userRole)
  const yaEsDuenio = esUsuarioSistema(userRole)

  return (
    <MainLayout>
      <Helmet>
        <title>{t('emprende.metaTitle')}</title>
        <meta name="description" content={t('emprende.metaDescription')} />
      </Helmet>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
        <EmprendeHero yaEsDuenio={yaEsDuenio} />
        <EmprendePasos yaEsDuenio={yaEsDuenio} />
        <EmprendeAcciones yaEsDuenio={yaEsDuenio} />
      </div>
    </MainLayout>
  )
}
