import { STATUS_LABEL } from './agentesLabels'
import type { InspectStatus } from '@/types/agentes'

const TONO: Record<string, string> = {
  al_dia: 'bg-[var(--hc-success-bg)] text-[var(--hc-success)]',
  activar: 'bg-[var(--hc-warning-bg)] text-[var(--hc-warning)]',
  actualizar: 'bg-[var(--hc-info-bg)] text-[var(--hc-info)]',
  mejorar: 'bg-[var(--hc-blue-50)] text-[var(--hc-blue-600)]',
}

/** Badge de estado I1 (al día / activar / actualizar / mejorar). */
export default function AgentesStatusBadge({ status }: { status: InspectStatus | string }) {
  const tono = TONO[status] ?? 'bg-[var(--hc-surface-2)] text-[var(--hc-muted)]'
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${tono}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}
