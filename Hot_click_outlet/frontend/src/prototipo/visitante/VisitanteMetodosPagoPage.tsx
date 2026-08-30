import VisitanteMain, { VisitanteBackHeader, VisitanteEmptyState } from './VisitantePiezas'
import { visitanteRuta } from './visitanteMock'

/**
 * Métodos de pago: sin tarjetas de maqueta.
 */
export default function VisitanteMetodosPagoPage() {
  return (
    <VisitanteMain conNav={false}>
      <VisitanteBackHeader titulo="Métodos de Pago" to={visitanteRuta('cuenta')} />
      <VisitanteEmptyState
        titulo="No hay métodos guardados"
        detalle="Elegís el pago en el checkout, no desde acá."
      />
    </VisitanteMain>
  )
}
