import { useMemo, useState } from 'react'
import { CADENCE_LABEL, GITHUB, docUrl, workflowUrl } from './agentesLabels'
import { filtrarAgentes, olasPresentes } from './agentesFilters'
import AgentesStatusBadge from './AgentesStatusBadge'
import type { AgentRecord, InspectStatus } from '@/types/agentes'

const CADENCES = ['all', 'daily', 'weekly', 'event'] as const

type Props = {
  agents: AgentRecord[]
  statusById: Record<string, InspectStatus>
}

function Chip({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean
  onClick: () => void
  children: string
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className="rounded-full border px-3 py-1 text-xs font-medium"
      style={{
        borderColor: pressed ? 'var(--hc-link)' : 'var(--hc-border)',
        color: pressed ? 'var(--hc-link)' : 'var(--hc-muted)',
        backgroundColor: pressed ? 'var(--hc-blue-50)' : 'var(--hc-surface)',
      }}
    >
      {children}
    </button>
  )
}

/** Tabla filtrable del registro I1. */
export default function AgentesRegistryTable({ agents, statusById }: Props) {
  const [cadence, setCadence] = useState<(typeof CADENCES)[number]>('all')
  const [ola, setOla] = useState<number | 'all'>('all')
  const [q, setQ] = useState('')
  const olas = useMemo(() => olasPresentes(agents), [agents])
  const rows = useMemo(() => filtrarAgentes(agents, cadence, ola, q), [agents, cadence, ola, q])

  return (
    <>
      <div className="flex flex-wrap items-center gap-2" role="toolbar" aria-label="Filtros del registro">
        {CADENCES.map((c) => (
          <Chip key={c} pressed={cadence === c} onClick={() => setCadence(c)}>
            {c === 'all' ? 'Todas las cadencias' : CADENCE_LABEL[c]}
          </Chip>
        ))}
        <Chip pressed={ola === 'all'} onClick={() => setOla('all')}>Todas las olas</Chip>
        {olas.map((n) => (
          <Chip key={n} pressed={ola === n} onClick={() => setOla(n)}>
            {n === 0 ? 'I1' : `Ola ${n}`}
          </Chip>
        ))}
        <input
          className="min-w-[12rem] flex-1 rounded-xl border border-hc-border bg-hc-surface px-3 py-1.5 text-sm text-hc-text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar ID, nombre o workflow"
          aria-label="Buscar agentes"
        />
      </div>
      <p className="text-xs text-hc-muted">
        {rows.length} agentes · estado I1 según la última corrida · catálogo de{' '}
        <a className="text-[var(--hc-link)] underline" href={`${GITHUB}/tree/master/docs`}>docs/AGENTES_*.md</a>
      </p>
      <div className="overflow-x-auto rounded-2xl border border-hc-border">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-[var(--hc-surface-2)] text-xs uppercase tracking-wide text-hc-muted">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Nombre</th>
              <th className="px-3 py-2">Cadencia</th>
              <th className="px-3 py-2">Workflow</th>
              <th className="px-3 py-2">Ola</th>
              <th className="px-3 py-2">Estado I1</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => (
              <AgentRow key={a.id} agent={a} status={statusById[a.id] ?? 'activar'} />
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function AgentRow({ agent, status }: { agent: AgentRecord; status: InspectStatus }) {
  const href = workflowUrl(agent.workflow)
  const doc = docUrl(agent.doc)
  return (
    <tr className="border-t border-hc-border">
      <td className="px-3 py-2 font-mono text-xs font-semibold text-hc-text">{agent.id}</td>
      <td className="px-3 py-2">
        <div className="text-hc-text">{agent.name}</div>
        <div className="text-xs text-hc-muted">
          {agent.triggerHint}
          {doc ? (
            <>
              {' · '}
              <a className="text-[var(--hc-link)] underline" href={doc}>doc</a>
            </>
          ) : null}
        </div>
      </td>
      <td className="px-3 py-2">
        <span className="rounded-full bg-[var(--hc-surface-2)] px-2 py-0.5 text-xs text-hc-muted">
          {CADENCE_LABEL[agent.cadence]}
        </span>
      </td>
      <td className="px-3 py-2">
        {href && agent.workflow ? (
          <a className="text-[var(--hc-link)] underline" href={href}>{agent.workflow}</a>
        ) : (
          <span className="text-hc-muted">—</span>
        )}
      </td>
      <td className="px-3 py-2 text-hc-muted">{agent.ola === 0 ? 'I1' : agent.ola}</td>
      <td className="px-3 py-2"><AgentesStatusBadge status={status} /></td>
    </tr>
  )
}
