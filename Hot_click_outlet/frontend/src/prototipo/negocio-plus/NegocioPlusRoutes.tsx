import { Route } from 'react-router-dom'
import { PLAN_NEGOCIO_PLUS } from '../compartido/plan'
import { SellerPlanProvider } from '../compartido/SellerPlanContext'
import SellerRoutes from '../compartido/SellerRoutes'
import SucursalesPage from './SucursalesPage'

/**
 * Prototipo Negocio Plus (Figma page 60:171).
 */
export default function NegocioPlusRoutes() {
  return (
    <SellerPlanProvider plan={PLAN_NEGOCIO_PLUS}>
      <SellerRoutes extra={<Route path="sucursales" element={<SucursalesPage />} />} />
    </SellerPlanProvider>
  )
}
