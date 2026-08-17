export default function Info({ label, value, mono }) {
  return (
    <div className="flex gap-2">
      <span className="shrink-0" style={{ color: 'var(--hc-muted)' }}>{label}:</span>
      <span className={`truncate ${mono ? 'font-mono text-xs' : ''}`} style={{ color: 'var(--hc-text)' }}>{value}</span>
    </div>
  )
}
