import { SEG_META } from './clienteDetailHelpers'

export function SegmentoBadge({ seg }) {
  const m = SEG_META[seg] ?? SEG_META.NUEVO
  return (
    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ backgroundColor: m.bg, color: m.text }}>{seg ?? 'NUEVO'}</span>
  )
}
