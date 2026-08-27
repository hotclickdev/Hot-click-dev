import { IconoAlerta, IconoCheck, IconoInfo } from './VisitanteIcons'
import VisitanteMain, { VisitanteBackHeader } from './VisitantePiezas'
import { NOTIFICACIONES_VISITANTE, visitanteRuta, type NotificacionVisitante } from './visitanteMock'

/**
 * Notificaciones Visitante (Figma 151:317).
 */
export default function VisitanteNotificacionesPage() {
  return (
    <VisitanteMain>
      <VisitanteBackHeader titulo="Notificaciones" to={visitanteRuta('cuenta')} />
      <ul>
        {NOTIFICACIONES_VISITANTE.map((item) => (
          <li key={item.id} className="flex gap-3 border-b border-hc-border py-3">
            <TonoIcono tono={item.tono} />
            <div>
              <p className="text-[13px] font-bold">{item.titulo}</p>
              <p className="text-[11px] text-hc-muted">{item.detalle}</p>
              <p className="mt-0.5 text-[10px] text-hc-muted">{item.cuando}</p>
            </div>
          </li>
        ))}
      </ul>
    </VisitanteMain>
  )
}

function TonoIcono({ tono }: { tono: NotificacionVisitante['tono'] }) {
  const mapa = {
    ok: { cls: 'bg-[var(--hc-success-bg)] text-hc-success', icono: <IconoCheck className="size-4" /> },
    info: { cls: 'bg-[var(--hc-blue-50)] text-hc-accent', icono: <IconoInfo className="size-4" /> },
    aviso: { cls: 'bg-[var(--hc-warning-bg)] text-hc-warning', icono: <IconoAlerta className="size-4" /> },
  }
  const item = mapa[tono]
  return (
    <div className={`flex size-9 shrink-0 items-center justify-center rounded-full ${item.cls}`}>{item.icono}</div>
  )
}
