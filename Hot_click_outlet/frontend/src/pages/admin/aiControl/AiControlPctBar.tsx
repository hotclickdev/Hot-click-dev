export default function AiControlPctBar({ pct, limite }: { pct: number; limite: number }) {
  const midColor = pct >= 70 ? '#fbbf24' : '#34d399'
  const color = pct >= 90 ? '#f87171' : midColor
  if (limite === 0) return <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>N/A</span>
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-1.5 rounded-full" style={{ backgroundColor: 'rgba(255,255,255,0.1)' }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs font-mono" style={{ color }}>{pct}%</span>
    </div>
  )
}
