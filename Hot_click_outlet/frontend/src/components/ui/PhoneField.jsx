import { PhoneInput } from 'react-international-phone'
import 'react-international-phone/style.css'
import { PHONE_FIELD_COUNTRIES } from './phoneFieldCountries'
import './PhoneField.css'

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
    <div className="hc-phone-field space-y-1.5">
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
          flagStyle: { display: 'none' },
          dropdownStyleProps: {
            listItemFlagStyle: { display: 'none' },
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
