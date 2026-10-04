import { Campo } from './ui'

type Props = Readonly<{
  etiqueta: string
  value: string
  onChange: (v: string) => void
}>

/** Precio en colones: ₡ fijo, teclado decimal, sin montos de ejemplo. */
export default function CampoPrecioColon({ etiqueta, value, onChange }: Props) {
  return (
    <Campo
      etiqueta={etiqueta}
      value={value}
      onChange={onChange}
      inputMode="decimal"
      prefijo="₡"
      estado={value.trim() ? 'ok' : 'idle'}
    />
  )
}
