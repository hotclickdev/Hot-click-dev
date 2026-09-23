import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { normalizarCodigoBarras } from './barcodeHid'

type Props = {
  onScan: (codigo: string) => void
  disabled?: boolean
  placeholder?: string
  autoFocus?: boolean
}

/**
 * Input pensado para pistola HID (Bluetooth/USB): escribe el GTIN y manda Enter.
 * También acepta tipeo manual + Enter.
 */
export default function BarcodeHidInput({
  onScan,
  disabled = false,
  placeholder = 'Escaneá o escribí el código de barras',
  autoFocus = true,
}: Props) {
  const [valor, setValor] = useState('')
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (autoFocus && !disabled) ref.current?.focus()
  }, [autoFocus, disabled])

  function emitir(raw: string) {
    const codigo = normalizarCodigoBarras(raw)
    if (!codigo) return
    onScan(codigo)
    setValor('')
    requestAnimationFrame(() => ref.current?.focus())
  }

  function onKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    emitir(valor)
  }

  return (
    <input
      ref={ref}
      type="text"
      inputMode="numeric"
      autoComplete="off"
      disabled={disabled}
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onKeyDown={onKeyDown}
      placeholder={placeholder}
      className="w-full rounded-xl px-4 py-3 text-base font-mono outline-none"
      style={{
        backgroundColor: 'var(--hc-surface)',
        border: '1px solid var(--hc-border)',
        color: 'var(--hc-text)',
      }}
      aria-label="Código de barras"
    />
  )
}
