import KpiCard from './KpiCard'
import type { PagosKpis } from './pagosHelpers'

export default function PagosKpis({ kpis }: { kpis: PagosKpis | null }) {
  return (
    <>
      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Total pagos" value={kpis.total} />
          <KpiCard label="Tasa de éxito" value={`${kpis.tasaExito}%`} color="text-green-400" />
          <KpiCard label="Pendientes" value={kpis.pendientes} color="text-yellow-400" />
          <KpiCard label="Webhooks con error" value={kpis.webhooksErr} color={(kpis.webhooksErr as number) > 0 ? 'text-red-400' : 'text-green-400'} />
        </div>
      )}

      {kpis && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <KpiCard label="Capturados" value={kpis.capturados} color="text-green-400" />
          <KpiCard label="Fallidos" value={kpis.fallidos} color="text-red-400" />
          <KpiCard label="SINPE" value={kpis.sinpe} color="text-emerald-400" />
        </div>
      )}
    </>
  )
}
