/**
 * @param {{ label: string, error?: string, children: import('react').ReactNode }} props
 */
export default function EquipoField({ label, error, children }) {
  return (
    <div className="space-y-1">
      <label className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{label}</label>
      {children}
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  )
}
