export default function KpiCard({ label, value, color = 'text-hc-text' }: {
  label: string
  value?: number | string | null
  color?: string
}) {
  return (
    <div className="bg-hc-surface border border-hc-border rounded-xl p-4">
      <p className="text-hc-muted text-xs mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value ?? '—'}</p>
    </div>
  )
}
