import { useEffect } from 'react'
import useAuthStore from '@/store/authStore'
import useTenantStore from '@/store/tenantStore'
import { PLAN_LABELS } from '@/layouts/admin/adminSidebarTheme'

type Props = {
  /** compact = una línea; card = nombre + slug + plan */
  variante?: 'compact' | 'card'
  className?: string
}

/**
 * Chip visible: a qué negocio pertenece el vendedor autenticado.
 */
export default function NegocioPertenenciaChip({ variante = 'compact', className = '' }: Props) {
  const empresaId = useAuthStore((s) => s.empresaId)
  const empresaNombre = useAuthStore((s) => s.empresaNombre)
  const empresaSlug = useAuthStore((s) => s.empresaSlug)
  const planNombre = useTenantStore((s) => s.planNombre)
  const loadTenantInfo = useTenantStore((s) => s.loadTenantInfo)
  const planLabel = PLAN_LABELS[planNombre] ?? planNombre

  useEffect(() => {
    if (empresaId) loadTenantInfo()
  }, [empresaId, loadTenantInfo])

  if (!empresaNombre) return null

  if (variante === 'card') {
    return (
      <div
        className={`rounded-xl border border-hc-border bg-hc-surface px-3 py-2.5 ${className}`.trim()}
        data-mm="negocio-pertenencia"
      >
        <p className="text-[10px] font-semibold uppercase tracking-wider text-hc-muted">Tu negocio</p>
        <p className="truncate text-sm font-semibold text-hc-text">{empresaNombre}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-2">
          {empresaSlug ? (
            <span className="truncate font-mono text-[11px] text-hc-muted">/{empresaSlug}</span>
          ) : null}
          {planNombre ? (
            <span className="rounded-full bg-[var(--hc-blue-50)] px-2 py-0.5 text-[10px] font-semibold text-[var(--hc-link)]">
              {planLabel}
            </span>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div
      className={`min-w-0 ${className}`.trim()}
      data-mm="negocio-pertenencia"
      title={empresaSlug ? `${empresaNombre} (/${empresaSlug})` : empresaNombre}
    >
      <p className="truncate text-[11px] font-semibold text-hc-text">{empresaNombre}</p>
      <p className="truncate text-[10px] text-hc-muted">
        {empresaSlug ? `/${empresaSlug}` : 'Tu negocio'}
        {planNombre ? ` · ${planLabel}` : ''}
      </p>
    </div>
  )
}
