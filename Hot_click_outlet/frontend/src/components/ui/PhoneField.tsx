import { PhoneInput } from 'react-international-phone'
import 'react-international-phone/style.css'
import { PHONE_FIELD_COUNTRIES } from './phoneFieldCountries'
import './PhoneField.css'
import { useId, type CSSProperties, type ReactNode } from 'react'

/** Tamaño del número por variable de la librería (no en línea) para que la regla móvil de 16 px de `index.css` lo alcance. */
const ESTILO_CONTENEDOR = { display: 'flex', width: '100%', alignItems: 'stretch', '--react-international-phone-font-size': '14px' } as CSSProperties

export type PhoneFieldProps = {
  /** id del campo del número, para enlazarlo con una etiqueta externa (`htmlFor`). */
  id?: string
  label?: ReactNode
  value?: string
  onChange?: (phone: string) => void
  required?: boolean
  hint?: ReactNode
  error?: ReactNode
  defaultCountry?: string
  disabled?: boolean
}

export default function PhoneField({
  id,
  label,
  value,
  onChange,
  required = false,
  hint,
  error,
  defaultCountry = 'cr',
  disabled = false,
}: PhoneFieldProps) {
  const idGenerado = useId()
  const idCampo = id ?? idGenerado
  const border = `1.5px solid ${error ? '#ef4444' : 'var(--hc-border)'}`
  return (
    <div className="hc-phone-field space-y-1.5">
      {label && (
        <div className="flex items-baseline justify-between">
          <label htmlFor={idCampo} className="text-sm font-semibold" style={{ color: 'var(--hc-text)' }}>
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
        inputProps={{ id: idCampo, 'aria-required': required || undefined, 'aria-invalid': error ? true : undefined }}
        inputStyle={{
          backgroundColor: 'var(--hc-surface-2)',
          border,
          borderLeft: 'none',
          color: 'var(--hc-text)',
          borderRadius: '0 10px 10px 0',
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
        style={ESTILO_CONTENEDOR}
      />

      {error && (
        <p className="text-xs" style={{ color: '#ef4444' }}>{error}</p>
      )}
    </div>
  )
}
