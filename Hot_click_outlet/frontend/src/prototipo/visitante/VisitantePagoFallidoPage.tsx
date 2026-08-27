import { IconoAlerta } from './VisitanteIcons'
import VisitanteMain, { VisitanteBoton } from './VisitantePiezas'
import { visitanteRuta } from './visitanteMock'

/**
 * Pago fallido Visitante (Figma 131:328).
 */
export default function VisitantePagoFallidoPage() {
  return (
    <VisitanteMain conNav={false} className="flex flex-col items-center !pt-[140px] text-center">
      <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-[var(--hc-danger-bg)] text-hc-danger">
        <IconoAlerta className="size-10" />
      </div>
      <h1 className="font-display text-lg font-bold">No pudimos procesar tu pago</h1>
      <p className="mb-6 mt-2 text-[13px] text-hc-muted">
        Tu tarjeta fue rechazada. Verificá los datos o probá con otro método de pago.
      </p>
      <VisitanteBoton to={visitanteRuta('checkout')} variant="danger" className="text-sm">
        Reintentar pago
      </VisitanteBoton>
      <VisitanteBoton to={visitanteRuta('checkout')} variant="ghost" className="mt-3 border-0 text-[13px] text-hc-muted">
        Cambiar método de pago
      </VisitanteBoton>
    </VisitanteMain>
  )
}
