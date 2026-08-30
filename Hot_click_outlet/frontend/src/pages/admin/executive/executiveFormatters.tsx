import type { ReactNode } from 'react'

export const fmt = (n: number | null | undefined) => new Intl.NumberFormat('es-CR').format(Math.round(n ?? 0))

export function fmtPct(n: number | null | undefined): ReactNode {
  const v = Number(n ?? 0)
  const sign = v > 0 ? '+' : ''
  return <span style={{ color: colorPct(v) }}>{sign}{v.toFixed(1)}%</span>
}

function colorPct(v: number) {
  if (v > 0) return '#34d399'
  if (v < 0) return '#f87171'
  return 'var(--hc-muted)'
}
