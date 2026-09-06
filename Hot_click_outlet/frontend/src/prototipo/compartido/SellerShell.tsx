import { Outlet } from 'react-router-dom'
import VendedorAvisos from '@/app/VendedorAvisos'
import MentalModelCoach from '@/components/ui/mentalModel/MentalModelCoach'
import ThemeToggle from '@/components/ui/ThemeToggle'
import NegocioPertenenciaChip from './NegocioPertenenciaChip'
import SellerBottomNav from './SellerBottomNav'
import SellerSidebar from './SellerSidebar'

type Props = {
  sinNav?: boolean
}

/**
 * Shell PYME / Negocio Plus: móvil bottom nav; desktop sidebar.
 * `.hc-seller-theme` sigue html.dark (tokens semánticos).
 */
export default function SellerShell({ sinNav = false }: Props) {
  return (
    <div
      className="hc-seller-theme min-h-dvh bg-hc-bg text-hc-text"
      style={{ backgroundColor: 'var(--hc-bg)' }}
    >
      <div className="md:flex md:min-h-dvh">
        <SellerSidebar />
        <div className={`min-w-0 flex-1 ${sinNav ? '' : 'pb-16 md:pb-0'}`}>
          <div className="mx-auto max-w-md md:mx-0 md:max-w-none">
            <div className="flex items-center gap-2 px-4 pt-3 md:hidden">
              <div className="min-w-0 flex-1">
                <NegocioPertenenciaChip variante="card" />
              </div>
              <ThemeToggle className="min-h-11 min-w-11 flex shrink-0 items-center justify-center" />
            </div>
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
