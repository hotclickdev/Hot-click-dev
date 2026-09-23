import type { Metadata } from 'next';
import { AgentRegistry } from '@/components/AgentRegistry';
import { StatusBadge } from '@/components/StatusBadge';
import { loadCatalog, loadInspections } from '@/lib/data';
import type { InspectStatus } from '@/lib/types';

export const metadata: Metadata = { title: 'Registro' };
export const dynamic = 'force-dynamic';

export default function AgentesPage() {
  const catalog = loadCatalog();
  const inspections = loadInspections();
  const latest = inspections.runs[0];
  const statusById: Record<string, InspectStatus> = {};
  for (const row of latest?.agents ?? []) statusById[row.id] = row.status;

  return (
    <main>
      <h2>Registro</h2>
      <p className="lede">
        Cada fila sale de los docs reales de olas 1–7 (PRs #55–#61). S13 no está asignado: I1 lo marca <em>activar</em>.
      </p>
      <div className="legend" aria-label="Leyenda de estados">
        <StatusBadge status="al_dia" />
        <StatusBadge status="activar" />
        <StatusBadge status="actualizar" />
        <StatusBadge status="mejorar" />
      </div>
      <AgentRegistry agents={catalog.agents} statusById={statusById} />
    </main>
  );
}
