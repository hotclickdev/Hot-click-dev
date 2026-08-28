export default function CharCounter({ current, max, min = 0 }: { current: number; max: number; min?: number }) {
  return <span className="text-xs tabular-nums" style={{ color: colorConteo(current, min, max) }}>{current}/{max}</span>
}

function colorConteo(current: number, min: number, max: number) {
  if (current === 0) return 'var(--hc-muted)'
  if (current < min) return '#8a5a00'
  if (current > max) return '#a8291f'
  return '#1E7F4F'
}
