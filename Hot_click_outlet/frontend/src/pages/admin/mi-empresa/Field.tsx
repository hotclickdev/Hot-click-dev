import type { ReactNode } from 'react'

export default function Field({ label, error, required, hint, children }: {
  label: string
  error?: string
  required?: boolean
  hint?: string
  children: ReactNode
}) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-[11px]" style={{ color: 'var(--hc-muted)', opacity: 0.7 }}>{hint}</p>}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
