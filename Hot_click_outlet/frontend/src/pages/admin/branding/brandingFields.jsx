export function ColorField({ label, value, onChange, fieldId }) {
  const textId = fieldId ? `${fieldId}-hex` : undefined
  const pickerId = fieldId ? `${fieldId}-picker` : undefined
  return (
    <div className="space-y-1.5">
      <label htmlFor={textId} className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{label}</label>
      <div className="flex items-center gap-2">
        <input id={pickerId} type="color" value={value || '#000000'}
          aria-label={label}
          onChange={e => onChange(e.target.value)}
          className="w-10 h-10 rounded-lg border-0 cursor-pointer bg-transparent p-0.5"
          style={{ border: '1px solid var(--hc-border)' }} />
        <input id={textId} type="text" value={value || ''}
          onChange={e => onChange(e.target.value)}
          maxLength={7}
          placeholder="#4F7CFF"
          className="flex-1 px-3 py-2 rounded-xl text-sm font-mono outline-none"
          style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
      </div>
    </div>
  )
}

export function TextField({ label, value, onChange, placeholder, multiline, fieldId }) {
  const Tag = multiline ? 'textarea' : 'input'
  return (
    <div className="space-y-1.5">
      <label htmlFor={fieldId} className="text-xs font-medium" style={{ color: 'var(--hc-muted)' }}>{label}</label>
      <Tag id={fieldId} rows={multiline ? 3 : undefined}
        value={value || ''}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 rounded-xl text-sm outline-none resize-none"
        style={{ backgroundColor: 'var(--hc-bg)', border: '1px solid var(--hc-border)', color: 'var(--hc-text)' }} />
    </div>
  )
}
