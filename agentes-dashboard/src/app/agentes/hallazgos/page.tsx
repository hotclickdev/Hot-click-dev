import type { Metadata } from 'next';
import { GITHUB } from '@/lib/labels';

export const metadata: Metadata = { title: 'Hallazgos' };

const GROUPS = [
  {
    label: 'eng-agent',
    hint: 'Issues abiertos por los agentes (dedup diario/semanal)',
    q: 'is:issue label:eng-agent',
  },
  {
    label: 'flake',
    hint: 'D6 — specs que fallaron ≥2 veces y pasaron en otro run',
    q: 'is:issue label:flake',
  },
  {
    label: 'api-drift',
    hint: 'D11 — contrato Java vs frontend/src/services',
    q: 'is:issue label:api-drift',
  },
  {
    label: 'idor / idor-gap',
    hint: 'D2 hunter findById · S4 huecos de suite',
    q: 'is:issue label:idor,idor-gap',
  },
  {
    label: 'schema-drift',
    hint: 'D1 JPA vs V*__.sql',
    q: 'is:issue label:schema-drift',
  },
  {
    label: 'spa-stale',
    hint: 'D3 frontend/src vs static/',
    q: 'is:issue label:spa-stale',
  },
  {
    label: 'prod-errors / sentry / outage',
    hint: 'D4/E8 Sentry · E9 health pager',
    q: 'is:issue label:prod-errors,sentry,outage',
  },
  {
    label: 'a11y',
    hint: 'S14 — teclado POS / focus trap vs specs en CI',
    q: 'is:issue label:a11y',
  },
];

export default function HallazgosPage() {
  return (
    <main>
      <h2>Hallazgos</h2>
      <p className="lede">
        Stub: atajos a Issues de GitHub. Este dashboard no llama la API de GitHub (cero secretos).
        Los agentes escriben labels; acá solo se enlaza.
      </p>
      <div className="hallazgos">
        {GROUPS.map((g) => (
          <a
            key={g.label}
            className="card"
            href={`${GITHUB}/issues?q=${encodeURIComponent(g.q)}`}
          >
            <p className="kicker">label</p>
            <h3>{g.label}</h3>
            <p className="fine">{g.hint}</p>
          </a>
        ))}
      </div>
    </main>
  );
}
