import type { AgentRecord, InspectStatus, InspectionRun } from '@/types/agentes'

export type CadenceFilter = 'all' | 'daily' | 'weekly' | 'event'
export type OlaFilter = number | 'all'

export function statusByIdDesdeRuns(runs: InspectionRun[]): Record<string, InspectStatus> {
  const latest = runs[0]
  const map: Record<string, InspectStatus> = {}
  for (const row of latest?.agents ?? []) map[row.id] = row.status
  return map
}

export function filtrarAgentes(
  agents: AgentRecord[],
  cadence: CadenceFilter,
  ola: OlaFilter,
  q: string,
): AgentRecord[] {
  const query = q.trim().toLowerCase()
  return agents.filter((a) => {
    if (cadence !== 'all' && a.cadence !== cadence) return false
    if (ola !== 'all' && a.ola !== ola) return false
    if (!query) return true
    return `${a.id} ${a.name} ${a.workflow ?? ''}`.toLowerCase().includes(query)
  })
}

export function olasPresentes(agents: AgentRecord[]): number[] {
  return [...new Set(agents.map((a) => a.ola))].sort((a, b) => a - b)
}
