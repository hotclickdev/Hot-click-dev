import type { ReactNode } from 'react'

type StatCardProps = {
  label: string
  value: ReactNode
  sub?: string
  color?: string
}

/** Tarjeta de métrica compartida (reportes, pagos, etc.). `color` es un valor CSS (token o hex), no una clase Tailwind. */
export default function StatCard({ label, value, sub, color }: StatCardProps) {
  return (
    <div className="rounded-2xl p-4" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <p className="text-xs mb-1" style={{ color: 'var(--hc-muted)' }}>{label}</p>
      <p className="text-xl font-bold" style={{ fontFamily: 'var(--font-display)', color: color ?? 'var(--hc-text)' }}>{value}</p>
      {sub && <p className="text-xs mt-1" style={{ color: 'var(--hc-muted)' }}>{sub}</p>}
    </div>
  )
}
