import { PhoneInput } from 'react-international-phone'
import 'react-international-phone/style.css'
import { PHONE_FIELD_COUNTRIES } from './phoneFieldCountries'

function emojiFlag(iso2) {
  if (!iso2) return '🌐'
  return String.fromCodePoint(
    ...iso2.toUpperCase().split('').map(c => 0x1F1A5 + c.codePointAt(0))
  )
}

function FlagEmoji({ iso2 }) {
  return (
    <span style={{ fontSize: 18, lineHeight: 1, userSelect: 'none' }}>
      {emojiFlag(iso2)}
    </span>
  )
}

export default function PhoneField({
  label,
  value,
  onChange,
  required = false,
  hint,
  error,
  defaultCountry = 'cr',
  disabled = false,
}) {
  const border = `1.5px solid ${error ? '#ef4444' : 'var(--hc-border)'}`
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-baseline justify-between">
          <label className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
            {label}
            {required && <span className="ml-1" style={{ color: 'var(--hc-accent)' }}>*</span>}
          </label>
          {hint && <span className="text-xs" style={{ color: 'var(--hc-muted)' }}>{hint}</span>}
        </div>
      )}

      <PhoneInput
        defaultCountry={defaultCountry}
        countries={PHONE_FIELD_COUNTRIES}
        value={value}
        onChange={onChange}
        disabled={disabled}
        FlagComponent={FlagEmoji}
        inputStyle={{
          backgroundColor: 'var(--hc-surface-2)',
          border,
          borderLeft: 'none',
          color: 'var(--hc-text)',
          borderRadius: '0 10px 10px 0',
          outline: 'none',
          fontSize: 14,
          padding: '10px 14px',
          height: 44,
          flex: '1 1 0',
          minWidth: 0,
          width: '100%',
          boxSizing: 'border-box',
        }}
        countrySelectorStyleProps={{
          buttonStyle: {
            backgroundColor: 'var(--hc-surface-2)',
            border,
            borderRight: 'none',
            borderRadius: '10px 0 0 10px',
            paddingLeft: 10,
            paddingRight: 8,
            height: 44,
            flexShrink: 0,
          },
        }}
        style={{ display: 'flex', width: '100%', alignItems: 'stretch' }}
      />

      {error && (
        <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
      )}
    </div>
  )
}
