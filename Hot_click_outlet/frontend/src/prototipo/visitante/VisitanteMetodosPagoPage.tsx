import VisitanteMain, { VisitanteBackHeader, VisitanteBoton } from './VisitantePiezas'
import { METODOS_PAGO_VISITANTE, visitanteRuta } from './visitanteMock'

/**
 * Métodos de pago Visitante (Figma 155:322).
 */
export default function VisitanteMetodosPagoPage() {
  return (
    <VisitanteMain conNav={false}>
      <VisitanteBackHeader titulo="Métodos de Pago" to={visitanteRuta('cuenta')} />
      <ul className="mb-4 flex flex-col gap-3">
        {METODOS_PAGO_VISITANTE.map((metodo) => (
          <li key={metodo.id} className="flex items-center gap-3 rounded-[14px] border border-hc-border p-3.5">
            <div className="flex size-10 items-center justify-center rounded-xl bg-[var(--hc-n-100)] text-sm font-bold text-hc-muted">
              {metodo.inicial}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium">{metodo.titulo}</p>
              <p className="text-[11px] text-hc-muted">{metodo.detalle}</p>
            </div>
            {metodo.principal ? (
              <span className="rounded-full bg-[var(--hc-success-bg)] px-2.5 py-1 text-[9px] font-medium text-hc-success">
                Principal
              </span>
            ) : null}
          </li>
        ))}
      </ul>
      <VisitanteBoton variant="ghost" className="text-[13px] font-medium">
        Agregar método
      </VisitanteBoton>
    </VisitanteMain>
  )
}
