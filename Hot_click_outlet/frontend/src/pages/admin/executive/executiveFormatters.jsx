export const fmt = (n) => new Intl.NumberFormat('es-CR').format(Math.round(n ?? 0))

export function fmtPct(n) {
  const v = Number(n ?? 0)
  const sign = v > 0 ? '+' : ''
  const color = v > 0 ? '#34d399' : v < 0 ? '#f87171' : 'var(--hc-muted)'
  return <span style={{ color }}>{sign}{v.toFixed(1)}%</span>
}
