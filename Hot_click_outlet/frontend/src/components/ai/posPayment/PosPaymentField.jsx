/**
 * Campo de texto del checkout embebido en el chat.
 */
export default function PosPaymentField({ label, value, onChange, placeholder, type = 'text', required }) {
  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium" style={{ color: 'var(--hc-muted)' }}>
        {label}{required && <span style={{ color: 'var(--hc-accent)' }}> *</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl text-sm outline-none"
        style={{
          background: 'var(--hc-surface-2)',
          border: '1px solid var(--hc-border)',
          color: 'var(--hc-text)',
        }}
        onFocus={e => { e.target.style.borderColor = 'var(--hc-accent)' }}
        onBlur={e => { e.target.style.borderColor = 'var(--hc-border)' }}
      />
    </div>
  )
}
