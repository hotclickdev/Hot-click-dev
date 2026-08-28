import type { ReactNode } from 'react'

export default function SectionCard({ title, children }: {
  title: string
  children: ReactNode
}) {
  return (
    <div className="rounded-2xl border p-5 space-y-4"
      style={{ background: 'var(--hc-card)', borderColor: 'var(--hc-border)' }}>
      <h2 className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--hc-muted)' }}>{title}</h2>
      {children}
    </div>
  )
}
