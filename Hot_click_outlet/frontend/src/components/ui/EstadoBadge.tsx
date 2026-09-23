export type EstadoTono = 'success' | 'warning' | 'danger' | 'info' | 'muted'

const TONO_ESTILO: Record<EstadoTono, { bg: string; text: string; border: string }> = {
  success: { bg: 'var(--hc-success-bg)', text: 'var(--hc-success)', border: 'var(--hc-success)' },
  warning: { bg: 'var(--hc-warning-bg)', text: 'var(--hc-warning)', border: 'var(--hc-warning)' },
  danger: { bg: 'var(--hc-danger-bg)', text: 'var(--hc-danger)', border: 'var(--hc-danger)' },
  info: { bg: 'var(--hc-info-bg)', text: 'var(--hc-info)', border: 'var(--hc-info)' },
  muted: { bg: 'var(--hc-surface-2)', text: 'var(--hc-muted)', border: 'var(--hc-border)' },
}

/** Badge de estado compartido: un solo mapa de colores por tono, siempre sobre tokens --hc-*. */
export default function EstadoBadge({ label, tono = 'muted', className = '' }: {
  label: string
  tono?: EstadoTono
  className?: string
}) {
  const s = TONO_ESTILO[tono]
  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${className}`}
      style={{ backgroundColor: s.bg, color: s.text, border: `1px solid color-mix(in srgb, ${s.border} 35%, transparent)` }}
    >
      {label}
    </span>
  )
}
