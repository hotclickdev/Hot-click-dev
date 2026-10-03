import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { PLAN_NEGOCIO_PLUS } from '../compartido/plan'
import { SellerPlanProvider } from '../compartido/SellerPlanContext'
import SellerRoutes from '../compartido/SellerRoutes'

const SucursalesPage = lazy(() => import('./SucursalesPage'))
// Decisión 3.3 A (3-oct-2026): Negocio Plus también gestiona su equipo con la pantalla de Pyme.
const EquipoPage = lazy(() => import('../pyme/EquipoPage'))

/**
 * Negocio Plus (Figma Planes — Negocio Plus / 305:636+).
 * Reusa SellerShell; diferencial: Sucursales.
 */
export default function NegocioPlusRoutes() {
  return (
    <SellerPlanProvider plan={PLAN_NEGOCIO_PLUS}>
      <SellerRoutes
        extra={(
          <>
            <Route path="sucursales" element={<SucursalesPage />} />
            <Route path="equipo" element={<EquipoPage />} />
          </>
        )}
      />
    </SellerPlanProvider>
  )
}
