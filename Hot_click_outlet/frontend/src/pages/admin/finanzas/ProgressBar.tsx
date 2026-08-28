type ProgressBarProps = {
  value: number
  total: number
  color: string
}

export default function ProgressBar({ value, total, color }: ProgressBarProps) {
  const pct = total > 0 ? Math.min(100, (value / total) * 100) : 0
  return (
    <div className="w-full h-2 rounded-full overflow-hidden" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  )
}
