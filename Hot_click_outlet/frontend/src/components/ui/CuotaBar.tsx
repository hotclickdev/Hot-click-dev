type CuotaBarProps = {
  uso: number
  max: number
  etiqueta: string
}

/** Barra de progreso de cuota de plan (ej. productos, usuarios). No renderiza si el límite es ilimitado (-1). */
export default function CuotaBar({ uso, max, etiqueta }: CuotaBarProps) {
  if (max === -1) return null
  const pct = Math.min(100, Math.round((uso / max) * 100))
  const color = pct >= 100 ? '#ef4444' : pct >= 80 ? '#f59e0b' : '#22c55e'

  return (
    <div className="flex items-center gap-3 text-xs">
      <div className="flex-1 h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: 'var(--hc-surface-2)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="shrink-0 font-semibold whitespace-nowrap" style={{ color: 'var(--hc-text)' }}>
        {uso}/{max} {etiqueta}
      </span>
    </div>
  )
}
