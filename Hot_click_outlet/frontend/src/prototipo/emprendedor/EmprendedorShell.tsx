import { Outlet } from 'react-router-dom'
import VendedorAvisos from '@/app/VendedorAvisos'
import ImpersonacionBanner from '@/components/ImpersonacionBanner'
import MentalModelCoach from '@/components/ui/mentalModel/MentalModelCoach'
import ThemeToggle from '@/components/ui/ThemeToggle'
import NegocioPertenenciaChip from '@/prototipo/compartido/NegocioPertenenciaChip'
import TourCoachmark from '@/prototipo/compartido/TourCoachmark'
import EmprendedorBottomNav from './EmprendedorBottomNav'
import EmprendedorSidebar from './EmprendedorSidebar'

type Props = {
  conNav?: boolean
  /** Pantallas de tarea con barra propia (p. ej. Despachar paquete `37:1780`) no llevan la tarjeta del negocio. */
  sinCabecera?: boolean
}

/**
 * Shell Emprendedor: móvil max-w-md + bottom nav; desktop sidebar.
 * `.hc-seller-theme` sigue html.dark (tokens semánticos).
 */
export default function EmprendedorShell({ conNav = false, sinCabecera = false }: Props) {
  return (
    <div
      className="hc-seller-theme min-h-dvh bg-hc-bg text-hc-text"
      style={{ backgroundColor: 'var(--hc-bg)' }}
    >
      <ImpersonacionBanner />
      <div className="md:flex md:min-h-dvh">
        <EmprendedorSidebar />
        <div className={`min-w-0 flex-1 ${conNav ? 'pb-16 md:pb-0' : ''}`}>
          <div className="mx-auto max-w-md md:mx-0 md:max-w-none">
            {sinCabecera ? null : (
              <div className="flex items-center gap-2 px-4 pt-3 md:hidden">
                <div className="min-w-0 flex-1">
                  <NegocioPertenenciaChip variante="card" />
                </div>
                <ThemeToggle className="min-h-11 min-w-11 flex shrink-0 items-center justify-center" />
              </div>
            )}
            <VendedorAvisos />
            <TourCoachmark />
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
