import type { Metadata } from 'next';
import { InspectButton } from '@/components/InspectButton';
import { StatusBadge } from '@/components/StatusBadge';
import { loadInspections } from '@/lib/data';
import { formatCr } from '@/lib/labels';

export const metadata: Metadata = { title: 'Inspecciones I1' };
export const dynamic = 'force-dynamic';

function repoFilesPresent(): boolean {
  return process.env.VERCEL !== '1';
}

export default function InspeccionesPage() {
  const file = loadInspections();
  const runs = file.runs;
  const latest = runs[0];
  return (
    <main>
      <h2>Historial I1</h2>
      <p className="lede">
        El inspector (`scripts/inspect-agents.mjs`) mira workflows y docs por cada ID. Escribe
        `data/inspections.json`. El Action semanal está pausado (2026-09-14); corrida local a mano.
      </p>
      <InspectButton canRunLocal={repoFilesPresent()} />
      {latest ? (
        <div className="kpi">
          {(Object.entries(latest.summary) as [string, number][]).map(([k, n]) => (
            <div key={k}>
              <b>{n}</b>
              <StatusBadge status={k} />
            </div>
          ))}
        </div>
      ) : (
        <p className="fine">Todavía no hay corridas. `npm run inspect` o el botón de arriba.</p>
      )}
      {runs.map((run) => (
        <article key={run.id} className="run">
          <p className="kicker">{run.source}</p>
          <h3>{formatCr(run.ranAt)}</h3>
          <p className="fine">{run.id}</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Estado</th>
                  <th>Workflow</th>
                  <th>Notas</th>
                </tr>
              </thead>
              <tbody>
                {run.agents
                  .filter((a) => a.status !== 'al_dia')
                  .map((a) => (
                    <tr key={a.id}>
                      <td className="id-cell">{a.id}</td>
                      <td>
                        <StatusBadge status={a.status} />
                      </td>
                      <td>{a.workflowFile ?? '—'}</td>
                      <td className="fine">{a.notes.join(' · ')}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </article>
      ))}
    </main>
  );
}
