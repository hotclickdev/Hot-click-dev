export default function Field({ label, required, hint, children }) {
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between">
        <label className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
          {label}{required && <span className="ml-1" style={{ color: 'var(--hc-accent)' }}>*</span>}
        </label>
        {hint && <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}
