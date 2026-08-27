import VisitanteMain, { VisitanteBackHeader, VisitanteBoton } from './VisitantePiezas'
import { DIRECCIONES_VISITANTE, visitanteRuta } from './visitanteMock'

/**
 * Direcciones Visitante (Figma 155:306).
 */
export default function VisitanteDireccionesPage() {
  return (
    <VisitanteMain conNav={false}>
      <VisitanteBackHeader titulo="Direcciones de envío" to={visitanteRuta('cuenta')} />
      <ul className="mb-4 flex flex-col gap-3">
        {DIRECCIONES_VISITANTE.map((dir) => (
          <li key={dir.id} className="rounded-[14px] border border-hc-border p-3.5">
            <div className="flex items-start justify-between">
              <p className="text-[13px] font-bold">{dir.alias}</p>
              {dir.principal ? (
                <span className="rounded-full bg-[var(--hc-blue-50)] px-2 py-0.5 text-[8px] font-medium text-hc-accent">
                  Principal
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-hc-muted">{dir.linea}</p>
          </li>
        ))}
      </ul>
      <VisitanteBoton variant="ghost" className="text-[13px] font-medium">
        Agregar dirección
      </VisitanteBoton>
    </VisitanteMain>
  )
}
