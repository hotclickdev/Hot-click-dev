import { useState } from 'react'
import { Campo } from './ui'
import type { TipoMetodoCobro } from './metodosCobroDatos'

type Props = Readonly<{
  tipo: TipoMetodoCobro
  value: string
  onChange: (valor: string) => void
}>

/**
 * El número se escribe oculto. En el paso siguiente se muestra solo la máscara.
 */
export default function CampoDatoCobro({ tipo, value, onChange }: Props) {
  const [visible, setVisible] = useState(false)
  return (
    <div>
      <Campo
        etiqueta={etiquetaDato(tipo)}
        value={value}
        onChange={onChange}
        placeholder={placeholderDato(tipo)}
        type={visible ? 'text' : 'password'}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="mt-1 text-[12px] font-medium text-[var(--hc-info)]"
      >
        {visible ? 'Ocultar dato' : 'Mostrar dato'}
      </button>
      <p className="mt-1 text-[12px] text-hc-muted">
        El número queda oculto. En el siguiente paso ves una máscara (••••-0000).
      </p>
    </div>
  )
}

function etiquetaDato(tipo: TipoMetodoCobro): string {
  if (tipo === 'sinpe') return 'Número SINPE'
  if (tipo === 'iban') return 'IBAN'
  return 'Número de tarjeta (referencia)'
}

function placeholderDato(tipo: TipoMetodoCobro): string {
  if (tipo === 'sinpe') return '8888-0000'
  if (tipo === 'iban') return 'CR21 0000…'
  return '•••• 4412'
}
