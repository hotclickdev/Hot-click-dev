import { useOutletContext } from 'react-router-dom'
import AgentesStatusBadge from './AgentesStatusBadge'
import { formatCr, INSPECT_WORKFLOW_URL } from './agentesLabels'
import type { AgentesDashboardState } from './useAgentesDashboard'
import type { InspectionSummary } from '@/types/agentes'

const SUMMARY_KEYS: Array<keyof InspectionSummary> = ['al_dia', 'activar', 'actualizar', 'mejorar']

/** Historial I1 — /admin/agentes/inspecciones */
export default function AgentesInspeccionesPage() {
  const { data, correrI1, inspeccionando, flash } = useOutletContext<AgentesDashboardState>()
  const runs = data.inspecciones.runs ?? []
  const latest = runs[0]

  return (
    <div className="space-y-5">
      <p className="text-sm text-hc-muted">
        El inspector mira workflows y docs por cada ID. En CI corre los lunes 08:15 America/Costa_Rica.
        El botón llama <code className="text-xs">POST /api/admin/agentes/inspecciones</code>.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => { void correrI1() }}
          disabled={inspeccionando}
          className="rounded-lg bg-[var(--hc-primary)] px-3 py-1.5 text-sm font-medium text-white hover:bg-[var(--hc-primary-hover)] disabled:opacity-40"
        >
          {inspeccionando ? 'Inspeccionando…' : 'Correr inspector I1'}
        </button>
        <a
          className="rounded-lg border border-hc-border px-3 py-1.5 text-sm text-hc-muted hover:bg-[var(--hc-surface-2)]"
          href={INSPECT_WORKFLOW_URL}
        >
          Workflow semanal
        </a>
      </div>
      {!data.liveInspectAvailable ? (
        <p className="text-xs text-hc-muted">
          En producción Docker no viaja el árbol git completo. El botón declara el límite;
          la corrida durable es el Action de los lunes o <code>npm run inspect</code> en el clone.
        </p>
      ) : null}
      {flash ? <p className="text-sm text-hc-text">{flash}</p> : null}
      {latest ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SUMMARY_KEYS.map((k) => (
            <div key={k} className="rounded-2xl border border-hc-border bg-hc-surface p-4">
              <p className="text-2xl font-bold text-hc-text">{latest.summary[k]}</p>
              <AgentesStatusBadge status={k} />
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-hc-muted">Todavía no hay corridas empaquetadas.</p>
      )}
      {runs.map((run) => (
        <article key={run.id} className="rounded-2xl border border-hc-border bg-hc-surface p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-hc-muted">{run.source}</p>
          <h3 className="text-lg font-semibold text-hc-text">{formatCr(run.ranAt)}</h3>
          <p className="font-mono text-xs text-hc-muted">{run.id}</p>
          <div className="mt-3 overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-xs uppercase text-hc-muted">
                <tr>
                  <th className="py-1 pr-3">ID</th>
                  <th className="py-1 pr-3">Estado</th>
                  <th className="py-1 pr-3">Workflow</th>
                  <th className="py-1">Notas</th>
                </tr>
              </thead>
              <tbody>
                {run.agents.filter((a) => a.status !== 'al_dia').map((a) => (
                  <tr key={a.id} className="border-t border-hc-border">
                    <td className="py-2 pr-3 font-mono text-xs font-semibold">{a.id}</td>
                    <td className="py-2 pr-3"><AgentesStatusBadge status={a.status} /></td>
                    <td className="py-2 pr-3 text-hc-muted">{a.workflowFile ?? '—'}</td>
                    <td className="py-2 text-xs text-hc-muted">{a.notes.join(' · ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ))}
    </div>
  )
}
