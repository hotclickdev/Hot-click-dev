import { Helmet } from 'react-helmet-async'
import { useTranslation } from 'react-i18next'
import MainLayout from '@/layouts/MainLayout'
import useAuthStore from '@/store/authStore'
import { esUsuarioSistema } from '@/utils/sistemaUser'
import EmprendeHub from './emprende/EmprendeHub'
import EmprendeLanding from './emprende/EmprendeLanding'

/** Visitante ve la landing; dueño ya logueado ve el checklist de Sistema. */
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
      {yaEsDuenio ? <EmprendeHub /> : <EmprendeLanding />}
    </MainLayout>
  )
}
