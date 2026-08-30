export default function Row({ label, value, mono }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div className="flex justify-between gap-4 text-sm">
      <span style={{ color: 'var(--hc-muted)' }}>{label}</span>
      <span className={mono ? 'font-mono text-xs' : ''} style={{ color: 'var(--hc-text)' }}>{value}</span>
    </div>
  )
}
