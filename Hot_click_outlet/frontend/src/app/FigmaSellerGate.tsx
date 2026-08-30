import PlanPathGate from '@/app/PlanPathGate'
import EmprendedorRoutes from '@/prototipo/emprendedor/EmprendedorRoutes'
import PymeRoutes from '@/prototipo/pyme/PymeRoutes'
import NegocioPlusRoutes from '@/prototipo/negocio-plus/NegocioPlusRoutes'
import { EMPRENDEDOR_BASE, NEGOCIO_PLUS_BASE, PYME_BASE } from '@/app/rolPaths'

export function PymeArea() {
  return (
    <PlanPathGate prefijo={PYME_BASE}>
      <PymeRoutes />
    </PlanPathGate>
  )
}

export function NegocioPlusArea() {
  return (
    <PlanPathGate prefijo={NEGOCIO_PLUS_BASE}>
      <NegocioPlusRoutes />
    </PlanPathGate>
  )
}

/** Shell Figma Emprendedor; PlanPathGate corrige PYME / Plus. */
export function EmprendedorArea() {
  return (
    <PlanPathGate prefijo={EMPRENDEDOR_BASE}>
      <EmprendedorRoutes />
    </PlanPathGate>
  )
}

export default EmprendedorArea
