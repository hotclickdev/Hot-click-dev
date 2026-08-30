import type { ReactNode } from 'react'

export default function Label({ children, required }: { children: ReactNode; required?: boolean }) {
  return (
    <label className="text-xs block mb-1.5" style={{ color: 'var(--hc-muted)' }}>
      {children}{required && <span className="ml-0.5" style={{ color: '#a8291f' }}>*</span>}
    </label>
  )
}
