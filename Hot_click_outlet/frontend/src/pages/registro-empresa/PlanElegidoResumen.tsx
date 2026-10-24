import { useEffect, useState } from 'react'
import { billingService } from '@/services/billingService'
import { mapApiPlanToUi, type PlanApiTuPlan, type PlanUi } from '@/prototipo/compartido/planesPageHelpers'
import { planIdToNombreBackend, type PlanQueryId } from './planQueryParam'

/** Precio vigente (USD, config registro-planes) y beneficios reales del plan elegido, desde GET /api/billing/planes. */
export default function PlanElegidoResumen({ plan }: Readonly<{ plan: PlanQueryId }>) {
  const [datos, setDatos] = useState<PlanUi | null>(null)

  useEffect(() => {
    let vivo = true
    const nombre = planIdToNombreBackend(plan)
    billingService.getPlanes()
      .then(({ data }) => {
        const p = (Array.isArray(data) ? (data as PlanApiTuPlan[]) : []).find((x) => x.nombre === nombre)
        if (vivo) setDatos(p ? mapApiPlanToUi(p) : null)
      })
      .catch(() => { if (vivo) setDatos(null) })
    return () => { vivo = false }
  }, [plan])

  if (!datos) return null
  return (
    <div className="mt-3 rounded-xl px-4 py-3 text-left text-xs" style={{ background: 'var(--hc-surface)', border: '1px solid var(--hc-border)', color: 'var(--hc-muted)' }}>
      <p className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{datos.nombre} · {datos.precio}</p>
      <ul className="mt-1 list-disc space-y-0.5 pl-4">
        {datos.beneficios.map((b) => <li key={b}>{b}</li>)}
      </ul>
    </div>
  )
}
