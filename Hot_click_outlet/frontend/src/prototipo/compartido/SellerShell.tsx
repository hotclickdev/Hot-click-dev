import { Outlet } from 'react-router-dom'
import VendedorAvisos from '@/app/VendedorAvisos'
import ImpersonacionBanner from '@/components/ImpersonacionBanner'
import MentalModelCoach from '@/components/ui/mentalModel/MentalModelCoach'
import PanelCabeceraMovil from './PanelCabeceraMovil'
import { mapSellerPlanIdToApi } from './planesPageHelpers'
import SellerBottomNav from './SellerBottomNav'
import { useSellerPlan } from './SellerPlanContext'
import SellerSidebar from './SellerSidebar'

type Props = {
  sinNav?: boolean
}

/**
 * Shell PYME / Negocio Plus: móvil bottom nav; desktop sidebar.
 * `.hc-seller-theme` sigue html.dark (tokens semánticos).
 */
export default function SellerShell({ sinNav = false }: Props) {
  const plan = useSellerPlan()
  return (
    <div
      className="hc-seller-theme min-h-dvh bg-hc-bg text-hc-text"
      style={{ backgroundColor: 'var(--hc-bg)' }}
    >
      <ImpersonacionBanner />
      <div className="md:flex md:min-h-dvh">
        <SellerSidebar />
        <div className={`min-w-0 flex-1 ${sinNav ? '' : 'pb-16 md:pb-0'}`}>
          <div className="mx-auto max-w-md md:mx-0 md:max-w-none">
            <PanelCabeceraMovil base={plan.basePath} planApi={mapSellerPlanIdToApi(plan.id)} interna={sinNav} />
            <VendedorAvisos />
            <Outlet />
          </div>
        </div>
      </div>
      {sinNav ? null : (
        <div className="md:hidden">
          <SellerBottomNav />
        </div>
      )}
      <MentalModelCoach />
    </div>
  )
}
