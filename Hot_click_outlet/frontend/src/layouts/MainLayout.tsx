import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import HeaderComprador from '@/components/comprador/header/HeaderComprador'
import BarraInferior from '@/components/comprador/BarraInferior'
import FooterComprador from '@/components/comprador/FooterComprador'
import SearchPanel from '@/components/ui/SearchPanel'
import MiniCartDrawer from '@/components/ui/MiniCartDrawer'
import ExitIntentModal from '@/components/ui/ExitIntentModal'
import PromoWelcomePopup from '@/components/ui/PromoWelcomePopup'
import ReturnVisitorBanner from '@/components/ui/ReturnVisitorBanner'

/** Hasta que exista la pantalla de búsqueda por foto, la foto se pide en Servicios HOT. */
const RUTA_BUSCAR_CON_FOTO = '/servicios'

export default function MainLayout({ children }: { children?: ReactNode }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-hc-n-50">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-[100] focus:rounded-lg focus:bg-hc-blue-600 focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-hc-n-0"
      >
        {t('nav.saltarContenido')}
      </a>
      <HeaderComprador onBuscarConFoto={() => navigate(RUTA_BUSCAR_CON_FOTO)} />
      <main id="main-content" className="flex-1" tabIndex={-1}>
        <ReturnVisitorBanner />
        {children}
      </main>
      <FooterComprador />
      <div className="h-[72px] lg:hidden" aria-hidden="true" />
      <BarraInferior />
      <SearchPanel />
      <MiniCartDrawer />
      <ExitIntentModal />
      <PromoWelcomePopup />
    </div>
  )
}
