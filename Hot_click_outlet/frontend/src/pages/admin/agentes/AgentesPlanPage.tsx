import { useOutletContext } from 'react-router-dom'
import { GITHUB } from './agentesLabels'
import type { AgentesDashboardState } from './useAgentesDashboard'

/** Plan de olas 1–7 — /admin/agentes/plan */
export default function AgentesPlanPage() {
  const { data } = useOutletContext<AgentesDashboardState>()
  const plan = data.olas

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-hc-text">{plan.headline || 'Plan de olas'}</h2>
        <p className="mt-1 text-sm text-hc-muted">{plan.note}</p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Kpi valor={`${plan.onMaster}/${plan.totalOlas}`} etiqueta="olas en master" />
        <Kpi valor="PRs 55–61" etiqueta="olas 1 a 7 mergeadas" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {(plan.olas ?? []).map((ola) => (
          <article
            key={ola.n}
            className="rounded-2xl border border-hc-border bg-hc-surface p-4"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-hc-muted">
              {ola.status === 'en_master' ? 'en master' : 'pendiente'}
            </p>
            <h3 className="mt-1 text-lg font-semibold text-hc-text">
              Ola {ola.n}
              {ola.pr ? (
                <>
                  {' '}
                  <a className="text-[var(--hc-link)] underline" href={`${GITHUB}/pull/${ola.pr}`}>
                    #{ola.pr}
                  </a>
                </>
              ) : null}
            </h3>
            <p className="mt-1 text-sm text-hc-text">{ola.title}</p>
            <p className="mt-1 text-xs text-hc-muted">{ola.summary}</p>
            {ola.doc ? (
              <p className="mt-2 text-xs">
                <a className="text-[var(--hc-link)] underline" href={`${GITHUB}/blob/master/${ola.doc}`}>
                  {ola.doc}
                </a>
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-1">
              {(ola.ids ?? []).map((id) => (
                <span key={id} className="rounded-full bg-[var(--hc-surface-2)] px-2 py-0.5 font-mono text-[11px] text-hc-muted">
                  {id}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}

function Kpi({ valor, etiqueta }: { valor: string; etiqueta: string }) {
  return (
    <div className="rounded-2xl border border-hc-border bg-hc-surface p-4">
      <p className="text-2xl font-bold text-hc-text">{valor}</p>
      <p className="text-xs text-hc-muted">{etiqueta}</p>
    </div>
  )
}
