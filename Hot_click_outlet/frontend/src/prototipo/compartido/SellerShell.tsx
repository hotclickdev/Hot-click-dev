import { Outlet } from 'react-router-dom'
import VendedorAvisos from '@/app/VendedorAvisos'
import ImpersonacionBanner from '@/components/ImpersonacionBanner'
import MentalModelCoach from '@/components/ui/mentalModel/MentalModelCoach'
import PanelBarraInferior from './PanelBarraInferior'
import PanelCabeceraMovil from './PanelCabeceraMovil'
import { mapSellerPlanIdToApi } from './planesPageHelpers'
import { useSellerPlan } from './SellerPlanContext'
import SellerSidebar from './SellerSidebar'

type Props = {
  sinNav?: boolean
}

/**
 * Shell PYME / Negocio Plus: móvil cabecera + barra inferior; desktop sidebar.
 * `.hc-seller-theme` sigue html.dark (tokens semánticos).
 */
export default function SellerShell({ sinNav = false }: Props) {
  const plan = useSellerPlan()
  const planApi = mapSellerPlanIdToApi(plan.id)
  return (
    <div
      className="hc-seller-theme min-h-dvh bg-hc-bg text-hc-text"
      style={{ backgroundColor: 'var(--hc-bg)' }}
    >
      <ImpersonacionBanner />
      <div className="md:flex md:min-h-dvh">
        <SellerSidebar />
        <div className={`min-w-0 flex-1 ${sinNav ? '' : 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0'}`}>
          <div className="mx-auto max-w-md md:mx-0 md:max-w-none">
            <PanelCabeceraMovil base={plan.basePath} planApi={planApi} interna={sinNav} />
            <VendedorAvisos />
            <Outlet />
          </div>
        </div>
      </div>
      {sinNav ? null : (
        <div className="md:hidden">
          <PanelBarraInferior base={plan.basePath} planApi={planApi} ariaLabel="Navegación del vendedor" />
        </div>
      )}
      <MentalModelCoach />
    </div>
  )
}
