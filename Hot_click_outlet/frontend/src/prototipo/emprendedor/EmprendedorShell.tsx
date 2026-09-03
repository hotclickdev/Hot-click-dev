import { Outlet } from 'react-router-dom'
import VendedorAvisos from '@/app/VendedorAvisos'
import MentalModelCoach from '@/components/ui/mentalModel/MentalModelCoach'
import ImpersonacionBanner from '@/prototipo/compartido/ImpersonacionBanner'
import NegocioPertenenciaChip from '@/prototipo/compartido/NegocioPertenenciaChip'
import EmprendedorBottomNav from './EmprendedorBottomNav'
import EmprendedorSidebar from './EmprendedorSidebar'

type Props = { conNav?: boolean }

/**
 * Shell Emprendedor: móvil max-w-md + bottom nav; desktop sidebar Figma (#F8F9FB).
 */
export default function EmprendedorShell({ conNav = false }: Props) {
  return (
    <div className="min-h-dvh bg-[#F8F9FB] text-hc-text">
      <ImpersonacionBanner />
      <div className="md:flex md:min-h-dvh">
        <EmprendedorSidebar />
        <div className={`min-w-0 flex-1 ${conNav ? 'pb-16 md:pb-0' : ''}`}>
          <div className="mx-auto max-w-md md:mx-0 md:max-w-none">
            <div className="px-4 pt-3 md:hidden">
              <NegocioPertenenciaChip variante="card" />
            </div>
            <VendedorAvisos />
            <Outlet />
          </div>
        </div>
      </div>
      {conNav ? (
        <div className="md:hidden">
          <EmprendedorBottomNav />
        </div>
      ) : null}
      <MentalModelCoach />
    </div>
  )
}
