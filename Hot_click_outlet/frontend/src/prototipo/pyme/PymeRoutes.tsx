import { lazy } from 'react'
import { Route } from 'react-router-dom'
import { PLAN_PYME } from '../compartido/plan'
import { SellerPlanProvider } from '../compartido/SellerPlanContext'
import SellerRoutes from '../compartido/SellerRoutes'

const EquipoPage = lazy(() => import('./EquipoPage'))

/**
 * Prototipo PLAN PYME (Figma page 60:128).
 */
export default function PymeRoutes() {
  return (
    <SellerPlanProvider plan={PLAN_PYME}>
      <SellerRoutes extra={<Route path="equipo" element={<EquipoPage />} />} />
    </SellerPlanProvider>
  )
}
