import type { ChangeEvent, ClipboardEvent, KeyboardEvent, RefObject } from 'react'

type TwoFaCodeInputsProps = {
  code2FA: string[]
  refs2FA: RefObject<(HTMLInputElement | null)[]>
  onChange: (digits: string[]) => void
  disabled?: boolean
  etiqueta?: string
}

/**
 * Seis casillas de un dígito para códigos 2FA (correo y app): Figma `44:1673`, 56 px de alto, esquinas de 12
 * y borde azul en la casilla activa.
 */
export default function TwoFaCodeInputs({ code2FA, refs2FA, onChange, disabled, etiqueta }: TwoFaCodeInputsProps) {
  const handleDigit = (idx: number, val: string) => {
    const digit = val.replace(/\D/, '').slice(-1)
    const next = [...code2FA]
    next[idx] = digit
    onChange(next)
    if (digit && idx < 5) refs2FA.current[idx + 1]?.focus()
  }

  const handleKey = (idx: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !code2FA[idx] && idx > 0) refs2FA.current[idx - 1]?.focus()
  }

  const handlePaste = (e: ClipboardEvent<HTMLDivElement>) => {
    const text = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6)
    if (text.length === 6) {
      onChange(text.split(''))
      refs2FA.current[5]?.focus()
    }
  }

  return (
    <div className="flex items-center gap-2" role="group" aria-label={etiqueta} onPaste={handlePaste}>
      {code2FA.map((digit, i) => (
        <input key={i}
          ref={el => { refs2FA.current[i] = el }}
          type="text" inputMode="numeric" autoComplete={i === 0 ? 'one-time-code' : 'off'} maxLength={1} value={digit}
          autoFocus={i === 0}
          aria-label={`${i + 1}`}
          onChange={(e: ChangeEvent<HTMLInputElement>) => handleDigit(i, e.target.value)}
          onKeyDown={e => handleKey(i, e)}
          disabled={disabled}
          className="hc-input-libre h-14 min-w-0 flex-1 rounded-[12px] border border-hc-n-200 bg-hc-n-0 p-0 text-center font-display text-[20px] font-bold text-hc-n-900 focus:border-2 focus:border-hc-blue-600 focus:outline-none"
        />
      ))}
    </div>
  )
}
