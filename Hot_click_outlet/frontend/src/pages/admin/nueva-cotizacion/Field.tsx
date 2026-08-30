import type { ReactNode } from 'react'

export default function Field({ label, children }: {
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{label}</label>
      {children}
    </div>
  )
}
