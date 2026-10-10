import { Outlet } from 'react-router-dom'
import VendedorAvisos from '@/app/VendedorAvisos'
import ImpersonacionBanner from '@/components/ImpersonacionBanner'
import MentalModelCoach from '@/components/ui/mentalModel/MentalModelCoach'
import PanelBarraInferior from '@/prototipo/compartido/PanelBarraInferior'
import PanelCabeceraMovil from '@/prototipo/compartido/PanelCabeceraMovil'
import { RUTA_EMPRENDEDOR } from './constants'
import EmprendedorSidebar from './EmprendedorSidebar'

type Props = { conNav?: boolean; sinCabecera?: boolean }

/**
 * Shell Emprendedor: móvil max-w-md + cabecera y barra inferior; desktop sidebar.
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
        <div className={`min-w-0 flex-1 ${conNav ? 'pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-0' : ''}`}>
          <div className="mx-auto max-w-md md:mx-0 md:max-w-none">
            {sinCabecera ? null : (
              <PanelCabeceraMovil base={RUTA_EMPRENDEDOR} planApi="EMPRENDEDOR" interna={!conNav} />
            )}
            <VendedorAvisos />
            <Outlet />
          </div>
        </div>
      </div>
      {conNav ? (
        <div className="md:hidden">
          <PanelBarraInferior base={RUTA_EMPRENDEDOR} planApi="EMPRENDEDOR" ariaLabel="Navegación emprendedor" />
        </div>
      ) : null}
      <MentalModelCoach />
    </div>
  )
}
