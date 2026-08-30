export default function Info({ label, value, mono }: {
  label: string
  value?: string | number | null
  mono?: boolean
}) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0" style={{ color: 'var(--hc-muted)' }}>{label}:</span>
      <span className={`truncate ${mono ? 'font-mono text-xs' : ''}`} style={{ color: 'var(--hc-text)' }}>{value}</span>
    </div>
  )
}
