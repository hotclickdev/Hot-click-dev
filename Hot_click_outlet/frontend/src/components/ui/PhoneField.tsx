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
  /**
   * `figma`: caja de cuenta de Figma `28:1183` (fondo blanco, borde `hc-n-200`, radio 12, alto 48, texto 15).
   * Solo la usa el registro de comprador (visitante); el resto de formularios sigue con la variante clásica.
   */
  variante?: 'clasica' | 'figma'
  /** No deja borrar el código de país (se cambia con el selector). */
  forceDialCode?: boolean
  autoComplete?: string
  enterKeyHint?: 'enter' | 'done' | 'go' | 'next' | 'previous' | 'search' | 'send'
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
  variante = 'clasica',
  forceDialCode = false,
  autoComplete,
  enterKeyHint,
}: PhoneFieldProps) {
  const idGenerado = useId()
  const idCampo = id ?? idGenerado
  const figma = variante === 'figma'
  const border = figma
    ? `1px solid ${error ? 'var(--hc-danger)' : 'var(--hc-n-200)'}`
    : `1.5px solid ${error ? '#ef4444' : 'var(--hc-border)'}`
  const fondo = figma ? 'var(--hc-n-0)' : 'var(--hc-surface-2)'
  const radio = figma ? 12 : 10
  const alto = figma ? 48 : 44
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
        forceDialCode={forceDialCode}
        inputProps={{
          id: idCampo,
          autoComplete,
          enterKeyHint,
          'aria-required': required || undefined,
          'aria-invalid': error ? true : undefined,
        }}
        inputStyle={{
          backgroundColor: fondo,
          border,
          borderLeft: 'none',
          color: figma ? 'var(--hc-n-900)' : 'var(--hc-text)',
          borderRadius: `0 ${radio}px ${radio}px 0`,
          padding: '10px 14px',
          height: alto,
          fontSize: figma ? 15 : undefined,
          flex: '1 1 0',
          minWidth: 0,
          width: '100%',
          boxSizing: 'border-box',
        }}
        countrySelectorStyleProps={{
          buttonStyle: {
            backgroundColor: fondo,
            border,
            borderRight: 'none',
            borderRadius: `${radio}px 0 0 ${radio}px`,
            paddingLeft: figma ? 14 : 10,
            paddingRight: 8,
            height: alto,
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
