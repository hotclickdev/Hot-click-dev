import { describe, expect, it } from 'vitest'
import { filtrarAgentes, olasPresentes, statusByIdDesdeRuns } from './agentesFilters'
import type { AgentRecord, InspectionRun } from '@/types/agentes'

function agent(partial: Partial<AgentRecord> & Pick<AgentRecord, 'id'>): AgentRecord {
  return {
    name: partial.name ?? partial.id,
    cadence: partial.cadence ?? 'daily',
    ola: partial.ola ?? 1,
    workflow: partial.workflow ?? null,
    script: null,
    doc: null,
    triggerHint: '',
    skipLabel: null,
    ...partial,
  }
}

describe('filtrarAgentes', () => {
  const agents = [
    agent({ id: 'D1', name: 'Flyway', cadence: 'daily', ola: 3, workflow: 'flyway.yml' }),
    agent({ id: 'S13', name: 'No asignado', cadence: 'weekly', ola: 7 }),
    agent({ id: 'I1', name: 'Inspector', cadence: 'weekly', ola: 0, workflow: 'inspect-agents.yml' }),
  ]

  it('filtra por cadencia y texto', () => {
    expect(filtrarAgentes(agents, 'weekly', 'all', '').map((a) => a.id)).toEqual(['S13', 'I1'])
    expect(filtrarAgentes(agents, 'all', 0, '').map((a) => a.id)).toEqual(['I1'])
    expect(filtrarAgentes(agents, 'all', 'all', 'flyway').map((a) => a.id)).toEqual(['D1'])
  })
})

describe('statusByIdDesdeRuns', () => {
  it('usa la corrida más reciente', () => {
    const run = {
      id: 'i1-1',
      ranAt: '2026-09-14T00:00:00Z',
      source: 'test',
      repoRoot: '.',
      summary: { al_dia: 1, activar: 1, actualizar: 0, mejorar: 0 },
      agents: [
        { id: 'D1', status: 'al_dia', workflowFound: true, workflowFile: 'a.yml', docsFound: true, scriptFound: true, cadenceMatch: true, notes: [] },
        { id: 'S13', status: 'activar', workflowFound: false, workflowFile: null, docsFound: false, scriptFound: false, cadenceMatch: false, notes: [] },
      ],
    } satisfies InspectionRun
    expect(statusByIdDesdeRuns([run])).toEqual({ D1: 'al_dia', S13: 'activar' })
    expect(statusByIdDesdeRuns([])).toEqual({})
  })
})

describe('olasPresentes', () => {
  it('ordena y deduplica', () => {
    expect(olasPresentes([
      agent({ id: 'I1', ola: 0 }),
      agent({ id: 'D1', ola: 3 }),
      agent({ id: 'D2', ola: 3 }),
    ])).toEqual([0, 3])
  })
})
