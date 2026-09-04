import { SellerPlanProvider } from '@/prototipo/compartido/SellerPlanContext'
import CompararPlanesPage from '@/prototipo/compartido/CompararPlanesPage'
import { PLAN_EMPRENDEDOR } from '@/prototipo/compartido/plan'

/**
 * Tu Plan Emp — thin wrapper sobre CompararPlanesPage (paths flat → redirect opciones/*).
 */
export default function PlanesPage() {
  return (
    <SellerPlanProvider plan={PLAN_EMPRENDEDOR}>
      <CompararPlanesPage />
    </SellerPlanProvider>
  )
}
