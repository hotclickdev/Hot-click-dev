import type { ReactNode } from 'react'

export default function ErrMsg({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-xs"
      style={{ background: 'color-mix(in srgb, var(--hc-danger) 7%, transparent)', border: '1px solid color-mix(in srgb, var(--hc-danger) 22%, transparent)', color: 'var(--hc-danger)' }}>
      <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
      {children}
    </div>
  )
}
