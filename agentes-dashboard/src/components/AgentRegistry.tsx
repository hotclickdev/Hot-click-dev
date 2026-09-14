'use client';

import { useMemo, useState } from 'react';
import { CADENCE_LABEL, GITHUB, docUrl, workflowUrl } from '@/lib/labels';
import type { AgentRecord, InspectStatus } from '@/lib/types';
import { StatusBadge } from './StatusBadge';

type Props = {
  agents: AgentRecord[];
  statusById: Record<string, InspectStatus>;
};

const CADENCES = ['all', 'daily', 'weekly', 'event'] as const;

export function AgentRegistry({ agents, statusById }: Props) {
  const [cadence, setCadence] = useState<(typeof CADENCES)[number]>('all');
  const [ola, setOla] = useState<number | 'all'>('all');
  const [q, setQ] = useState('');

  const olas = useMemo(() => [...new Set(agents.map((a) => a.ola))].sort((a, b) => a - b), [agents]);

  const rows = useMemo(() => {
    const query = q.trim().toLowerCase();
    return agents.filter((a) => {
      if (cadence !== 'all' && a.cadence !== cadence) return false;
      if (ola !== 'all' && a.ola !== ola) return false;
      if (!query) return true;
      return `${a.id} ${a.name} ${a.workflow ?? ''}`.toLowerCase().includes(query);
    });
  }, [agents, cadence, ola, q]);

  return (
    <>
      <div className="toolbar" role="toolbar" aria-label="Filtros del registro">
        {CADENCES.map((c) => (
          <button
            key={c}
            type="button"
            className="chip"
            aria-pressed={cadence === c}
            onClick={() => setCadence(c)}
          >
            {c === 'all' ? 'Todas las cadencias' : CADENCE_LABEL[c]}
          </button>
        ))}
        <button type="button" className="chip" aria-pressed={ola === 'all'} onClick={() => setOla('all')}>
          Todas las olas
        </button>
        {olas.map((n) => (
          <button key={n} type="button" className="chip" aria-pressed={ola === n} onClick={() => setOla(n)}>
            {n === 0 ? 'I1' : `Ola ${n}`}
          </button>
        ))}
        <input
          className="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar ID, nombre o workflow"
          aria-label="Buscar agentes"
        />
      </div>
      <p className="fine">
        {rows.length} agentes · estado I1 según la última corrida · catálogo semilla de{' '}
        <a href={`${GITHUB}/tree/master/docs`}>docs/AGENTES_*.md</a>
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Nombre</th>
              <th>Cadencia</th>
              <th>Workflow</th>
              <th>Ola</th>
              <th>Estado I1</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((a) => {
              const href = workflowUrl(a.workflow);
              const doc = docUrl(a.doc);
              const status = statusById[a.id] ?? 'activar';
              return (
                <tr key={a.id}>
                  <td className="id-cell">{a.id}</td>
                  <td>
                    <div>{a.name}</div>
                    <div className="fine">
                      {a.triggerHint}
                      {doc ? (
                        <>
                          {' · '}
                          <a href={doc}>doc</a>
                        </>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    <span className={`badge ${a.cadence}`}>{CADENCE_LABEL[a.cadence]}</span>
                  </td>
                  <td>
                    {href && a.workflow ? (
                      <a href={href}>{a.workflow}</a>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{a.ola === 0 ? 'I1' : a.ola}</td>
                  <td>
                    <StatusBadge status={status} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
