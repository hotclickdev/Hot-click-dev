import { Link } from 'react-router-dom'
import { IconoAlerta } from './VisitanteIcons'
import useCartStore from '@/store/cartStore'
import VisitanteMain, { VisitanteBackHeader, VisitanteEmptyState } from './VisitantePiezas'
import { visitanteRuta } from './visitanteMock'

/**
 * Avisos Visitante: solo hechos reales (carrito), nunca pedido mock.
 */
export default function VisitanteNotificacionesPage() {
  const hayCarrito = useCartStore((s) => s.items.length > 0)

  return (
    <VisitanteMain>
      <VisitanteBackHeader titulo="Notificaciones" to={visitanteRuta('cuenta')} />
      {hayCarrito ? <AvisoCarrito /> : (
        <VisitanteEmptyState
          titulo="No tenés avisos"
          detalle="Cuando haya un pedido o un carrito guardado, va a aparecer acá."
        />
      )}
    </VisitanteMain>
  )
}

function AvisoCarrito() {
  return (
    <Link to={visitanteRuta('carrito')} className="flex gap-3 border-b border-hc-border py-3">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[var(--hc-warning-bg)] text-hc-warning">
        <IconoAlerta className="size-4" />
      </div>
      <div>
        <p className="text-[13px] font-bold">Tu carrito te espera</p>
        <p className="text-[11px] text-hc-muted">Tenés productos guardados. Continuá para pagar.</p>
      </div>
    </Link>
  )
}
