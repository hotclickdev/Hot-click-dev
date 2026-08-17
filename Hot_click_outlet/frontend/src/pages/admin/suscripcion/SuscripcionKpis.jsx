import { EstadoBadge, KpiCard } from './suscripcionUi'
import { fmtFechaSuscripcion } from './suscripcionHelpers'

export default function SuscripcionKpis({ planNombre, estado, esTrial, sub }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
      <KpiCard label="Plan" value={planNombre} />
      <KpiCard label="Estado" value={<EstadoBadge estado={estado} />} />
      {esTrial
        ? <KpiCard label="Trial vence" value={fmtFechaSuscripcion(sub?.trialEnd)} />
        : <KpiCard label="Próxima renovación" value={fmtFechaSuscripcion(sub?.fechaFin)}
            sub={sub?.cancelarAlVencer ? 'Se cancela al vencer' : undefined} />
      }
    </div>
  )
}
