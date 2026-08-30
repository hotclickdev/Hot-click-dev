import { ESTADO_META } from './comprasHelpers'

export default function ComprasEstadoBadge({ estado }: { estado?: string }) {
  const m = ESTADO_META[estado ?? ''] ?? { label: estado, bg: 'rgba(255,255,255,0.06)', text: 'var(--hc-muted)' }
  return (
    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold"
      style={{ backgroundColor: m.bg, color: m.text }}>{m.label}</span>
  )
}
