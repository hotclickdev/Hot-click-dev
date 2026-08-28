import VisitanteMain, { VisitanteBackHeader, VisitanteEmptyState } from './VisitantePiezas'
import { visitanteRuta } from './visitanteMock'

/**
 * Direcciones: sin direcciones de maqueta.
 */
export default function VisitanteDireccionesPage() {
  return (
    <VisitanteMain conNav={false}>
      <VisitanteBackHeader titulo="Direcciones de envío" to={visitanteRuta('cuenta')} />
      <VisitanteEmptyState
        titulo="No hay direcciones guardadas"
        detalle="Las cargás al pagar en el checkout."
      />
    </VisitanteMain>
  )
}
