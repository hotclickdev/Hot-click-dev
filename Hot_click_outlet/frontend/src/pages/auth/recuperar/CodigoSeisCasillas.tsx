import { useEffect, useRef, type ClipboardEvent, type KeyboardEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { CODIGO_LARGO, normalizarCodigo } from './recuperarHelpers'

type Props = {
  valor: string
  onCambio: (codigo: string) => void
  disabled?: boolean
}

/**
 * Seis casillas del código (Figma 44:1597): 56px de alto, radio 12, borde azul 2px
 * en la casilla activa. Acepta pegar el código completo en cualquier casilla.
 */
export default function CodigoSeisCasillas({ valor, onCambio, disabled }: Props) {
  const { t } = useTranslation()
  const refs = useRef<(HTMLInputElement | null)[]>([])
  // Valor más reciente, actualizado al instante: con pulsaciones muy rápidas el `valor` del render aún no llegó.
  const valorRef = useRef(valor)
  useEffect(() => { valorRef.current = valor }, [valor])
  const digitos = Array.from({ length: CODIGO_LARGO }, (_, i) => valor[i] ?? '')

  const enfocar = (i: number) => refs.current[Math.min(Math.max(i, 0), CODIGO_LARGO - 1)]?.focus()

  const escribir = (i: number, texto: string) => {
    const nuevos = normalizarCodigo(texto)
    if (!nuevos) return
    const siguiente = (valorRef.current.slice(0, i) + nuevos).slice(0, CODIGO_LARGO)
    valorRef.current = siguiente
    onCambio(siguiente)
    enfocar(siguiente.length)
  }

  const teclear = (i: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      e.preventDefault()
      const hasta = digitos[i] ? i : i - 1
      if (hasta < 0) return
      valorRef.current = valorRef.current.slice(0, hasta)
      onCambio(valorRef.current)
      enfocar(hasta)
    } else if (e.key === 'ArrowLeft') {
      enfocar(i - 1)
    } else if (e.key === 'ArrowRight') {
      enfocar(i + 1)
    }
  }

  const pegar = (i: number, e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    escribir(i, e.clipboardData.getData('text'))
  }

  return (
    <fieldset className="flex w-full items-center gap-2" disabled={disabled}>
      <legend className="sr-only">{t('forgot.codeLabel')}</legend>
      {digitos.map((d, i) => (
        <input key={i}
          ref={el => { refs.current[i] = el }}
          value={d}
          // Siempre se escribe en la primera casilla libre: el código no puede quedar con huecos.
          onFocus={() => { if (i > valorRef.current.length) enfocar(valorRef.current.length) }}
          onChange={e => {
            // Si la casilla ya tenía un dígito, el nuevo lo reemplaza (desde ahí se reescribe).
            const texto = d && e.target.value.length > 1 ? e.target.value.replace(d, '') : e.target.value
            escribir(Math.min(i, valorRef.current.length), texto)
          }}
          onKeyDown={e => teclear(i, e)}
          onPaste={e => pegar(Math.min(i, valorRef.current.length), e)}
          type="text" inputMode="numeric" pattern="[0-9]*" maxLength={CODIGO_LARGO}
          autoComplete={i === 0 ? 'one-time-code' : 'off'}
          aria-label={t('forgot.digitLabel', { n: i + 1 })}
          className="hc-input-libre h-14 w-full min-w-0 flex-1 rounded-[12px] border border-hc-n-200 bg-hc-n-0 text-center font-display text-[22px] font-bold text-hc-n-900
            caret-transparent outline-none focus:border-2 focus:border-hc-blue-600"
        />
      ))}
    </fieldset>
  )
}
