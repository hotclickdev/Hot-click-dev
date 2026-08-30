import { formatMontoPos } from './posHelpers'

export default function StatBox({ label, value, color }: { label: string; value?: number | null; color?: string }) {
  return (
    <div className="rounded-xl p-4" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <p className="text-xs" style={{ color: 'var(--hc-muted)' }}>{label}</p>
      <p className="text-xl font-bold mt-1" style={{ color: color ?? 'var(--hc-text)' }}>₡{formatMontoPos(value)}</p>
    </div>
  )
}
