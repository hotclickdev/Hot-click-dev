import { GITHUB, githubIssuesUrl } from './agentesLabels'

const GROUPS = [
  { label: 'eng-agent', hint: 'Issues abiertos por los agentes (dedup diario/semanal)', q: 'is:issue label:eng-agent' },
  { label: 'flake', hint: 'D6 — specs que fallaron ≥2 veces y pasaron en otro run', q: 'is:issue label:flake' },
  { label: 'api-drift', hint: 'D11 — contrato Java vs frontend/src/services', q: 'is:issue label:api-drift' },
  { label: 'idor / idor-gap', hint: 'D2 hunter findById · S4 huecos de suite', q: 'is:issue label:idor,idor-gap' },
  { label: 'schema-drift', hint: 'D1 JPA vs V*__.sql', q: 'is:issue label:schema-drift' },
  { label: 'spa-stale', hint: 'D3 frontend/src vs static/', q: 'is:issue label:spa-stale' },
  { label: 'prod-errors / sentry / outage', hint: 'D4/E8 Sentry · E9 health pager', q: 'is:issue label:prod-errors,sentry,outage' },
  { label: 'a11y', hint: 'S14 — teclado POS / focus trap vs specs en CI', q: 'is:issue label:a11y' },
] as const

/** Atajos a Issues de GitHub — /admin/agentes/hallazgos */
export default function AgentesHallazgosPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-hc-muted">
        Atajos a Issues de GitHub. Este panel no llama la API de GitHub (cero secretos).
        Los agentes escriben labels; acá solo se enlaza.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {GROUPS.map((g) => (
          <a
            key={g.label}
            className="rounded-2xl border border-hc-border bg-hc-surface p-4 hover:border-[var(--hc-link)]"
            href={githubIssuesUrl(g.q)}
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-hc-muted">label</p>
            <h3 className="mt-1 font-semibold text-hc-text">{g.label}</h3>
            <p className="mt-1 text-xs text-hc-muted">{g.hint}</p>
          </a>
        ))}
      </div>
      <p className="text-xs text-hc-muted">
        Repo:{' '}
        <a className="text-[var(--hc-link)] underline" href={GITHUB}>{GITHUB.replace('https://', '')}</a>
      </p>
    </div>
  )
}
