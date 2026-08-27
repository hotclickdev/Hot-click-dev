import { IconoCheck } from './VisitanteIcons'
import VisitanteMain, { VisitanteBoton } from './VisitantePiezas'
import { visitanteRuta } from './visitanteMock'

/**
 * Compra confirmada Visitante (Figma 131:320).
 */
export default function VisitanteConfirmadaPage() {
  return (
    <VisitanteMain conNav={false} className="flex flex-col items-center !pt-[140px] text-center">
      <div className="mb-4 flex size-20 items-center justify-center rounded-full bg-[var(--hc-success-bg)] text-hc-success">
        <IconoCheck className="size-10" />
      </div>
      <h1 className="font-display text-[19px] font-bold">¡Compra realizada!</h1>
      <p className="mb-6 mt-2 text-[13px] text-hc-muted">
        Tu pedido #4021 fue confirmado. Te avisaremos cuando el vendedor lo despache.
      </p>
      <VisitanteBoton to={visitanteRuta('shop')} className="text-sm">
        Seguir comprando
      </VisitanteBoton>
      <VisitanteBoton to={visitanteRuta('pedidos')} variant="ghost" className="mt-3 border-0 text-[13px] text-hc-accent">
        Ver mi pedido
      </VisitanteBoton>
    </VisitanteMain>
  )
}
