import { useOutletContext } from 'react-router-dom'
import AgentesRegistryTable from './AgentesRegistryTable'
import AgentesStatusBadge from './AgentesStatusBadge'
import { statusByIdDesdeRuns } from './agentesFilters'
import type { AgentesDashboardState } from './useAgentesDashboard'

/** Registro de agentes — /admin/agentes */
export default function AgentesRegistroPage() {
  const { data } = useOutletContext<AgentesDashboardState>()
  const statusById = statusByIdDesdeRuns(data.inspecciones.runs ?? [])

  return (
    <div className="space-y-4">
      <p className="text-sm text-hc-muted">
        Cada fila sale de los docs reales de olas 1–7 (PRs #55–#61). S13 no está asignado:
        I1 lo marca <em>activar</em>.
      </p>
      <div className="flex flex-wrap gap-2" aria-label="Leyenda de estados">
        <AgentesStatusBadge status="al_dia" />
        <AgentesStatusBadge status="activar" />
        <AgentesStatusBadge status="actualizar" />
        <AgentesStatusBadge status="mejorar" />
      </div>
      <AgentesRegistryTable agents={data.catalogo.agents ?? []} statusById={statusById} />
    </div>
  )
}
