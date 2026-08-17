export default function CharCounter({ current, max, min = 0 }) {
  const color = current === 0 ? 'var(--hc-muted)' : current < min ? '#8a5a00' : current > max ? '#a8291f' : '#1E7F4F'
  return <span className="text-xs tabular-nums" style={{ color }}>{current}/{max}</span>
}
