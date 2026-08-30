import type { ReactNode } from 'react'

export default function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="rounded-xl p-5 space-y-4" style={{ backgroundColor: 'var(--hc-surface)', border: '1px solid var(--hc-border)' }}>
      <h2 className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>{title}</h2>
      {children}
    </div>
  )
}
