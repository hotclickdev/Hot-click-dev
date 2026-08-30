import type { ReactNode } from 'react'

/** Etiqueta de sección del panel de accesibilidad. */
export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2"
      style={{ color: 'var(--hc-muted)' }}>
      {children}
    </p>
  )
}

interface ThemeBtnProps {
  active: boolean
  onClick: () => void
  label: string
  icon: ReactNode
}

export function ThemeBtn({ active, onClick, label, icon }: ThemeBtnProps) {
  return (
    <button type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all duration-150"
      style={{
        backgroundColor: active ? 'var(--hc-accent)' : 'var(--hc-surface-2)',
        color: active ? '#fff' : 'var(--hc-muted)',
        border: `1px solid ${active ? 'var(--hc-accent)' : 'var(--hc-border)'}`,
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
    </button>
  )
}

interface ToggleRowProps {
  label: string
  checked: boolean
  onChange: () => void
}

export function ToggleRow({ label, checked, onChange }: ToggleRowProps) {
  return (
    <div className="flex items-center justify-between py-2.5 px-3 rounded-xl"
      style={{ backgroundColor: 'var(--hc-surface-2)' }}>
      <p className="text-xs font-medium" style={{ color: 'var(--hc-text)' }}>{label}</p>
      <Toggle checked={checked} onChange={onChange} aria-label={label} />
    </div>
  )
}

interface ToggleProps {
  checked: boolean
  onChange: () => void
  'aria-label': string
}

function Toggle({ checked, onChange, 'aria-label': ariaLabel }: ToggleProps) {
  return (
    <button type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onChange}
      className="relative w-9 h-5 rounded-full transition-all duration-200 shrink-0"
      style={{ backgroundColor: checked ? 'var(--hc-accent)' : 'var(--hc-border)' }}
    >
      <span
        className="absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform duration-200"
        style={{ transform: checked ? 'translateX(16px)' : 'translateX(0)' }}
      />
    </button>
  )
}

export function A11yIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"
      strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="4" r="1.5"/>
      <path d="M12 7v6m0 0l-3 4m3-4l3 4"/>
      <path d="M9 10h6"/>
    </svg>
  )
}

export { default as CloseIcon } from '@/components/ui/CloseIcon'
