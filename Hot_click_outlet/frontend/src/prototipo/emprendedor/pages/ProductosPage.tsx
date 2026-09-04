import { SellerPlanProvider } from '@/prototipo/compartido/SellerPlanContext'
import ProductosPageCompartido from '@/prototipo/compartido/ProductosPage'
import { PLAN_EMPRENDEDOR } from '@/prototipo/compartido/plan'

/**
 * Mis Productos Emp — thin wrapper sobre listado compartido (API + filtros).
 * Redirects flat `productos/nuevo` viven en EmprendedorRoutes.
 */
export default function ProductosPage() {
  return (
    <SellerPlanProvider plan={PLAN_EMPRENDEDOR}>
      <ProductosPageCompartido />
    </SellerPlanProvider>
  )
}
